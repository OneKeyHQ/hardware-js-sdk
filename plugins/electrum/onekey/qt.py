import threading

from PyQt6.QtCore import pyqtSignal, pyqtSlot
from PyQt6.QtWidgets import QCheckBox, QMessageBox

from electrum.gui.qt.wizard.wallet import WCScriptAndDerivation, WCHWXPub, WCHWUnlock, WCHWUninitialized
from electrum.hw_wallet.qt import QtHandlerBase, QtPluginBase
from electrum.hw_wallet.plugin import only_hook_if_libraries_available
from electrum.i18n import _
from electrum.plugin import _hwd_comms_executor, hook, runs_in_hwd_thread
from electrum.storage import WalletStorage
from electrum.util import InvalidPassword, UserCancelled, UserFacingException
from electrum.wallet import Multisig_Wallet, Standard_Wallet

from .onekey import OneKeyPlugin


class Plugin(OneKeyPlugin, QtPluginBase):
    icon_unpaired = "onekey.svg"
    icon_paired = "onekey.svg"

    def create_handler(self, window):
        return OneKeyQtHandler(window)

    @only_hook_if_libraries_available
    @hook
    def receive_menu(self, menu, addrs, wallet):
        if len(addrs) == 1 and type(wallet) in (Standard_Wallet, Multisig_Wallet):
            self._add_menu_action(menu, addrs[0], wallet)

    @only_hook_if_libraries_available
    @hook
    def transaction_dialog_address_menu(self, menu, addr, wallet):
        if type(wallet) in (Standard_Wallet, Multisig_Wallet):
            self._add_menu_action(menu, addr, wallet)

    def extend_wizard(self, wizard):
        super().extend_wizard(wizard)
        wizard.navmap_merge({
            "onekey_start": {"gui": WCOneKeyScript},
            "onekey_xpub": {"gui": WCOneKeyXPub},
            "onekey_not_initialized": {"gui": WCHWUninitialized},
            "onekey_unlock": {"gui": WCOneKeyUnlock},
        })


class OneKeyQtHandler(QtHandlerBase):
    passphrase_retry_signal = pyqtSignal()

    def __init__(self, window):
        super().__init__(window, "OneKey")
        self._wallet_choice_done = threading.Event()
        self._wallet_choice = None
        self.passphrase_retry_signal.connect(self._choose_passphrase_retry)

    def choose_passphrase_retry(self, *, allow_hidden=True):
        if threading.current_thread() is threading.main_thread():
            raise UserFacingException(_("OneKey wallet selection must run on the hardware thread."))
        self._wallet_choice = None
        self._allow_hidden_retry = allow_hidden
        self._wallet_choice_done.clear()
        self.passphrase_retry_signal.emit()
        self._wallet_choice_done.wait()
        return self._wallet_choice

    @pyqtSlot()
    def _choose_passphrase_retry(self):
        try:
            box = QMessageBox(self.top_level_window())
            box.setIcon(QMessageBox.Icon.Question)
            box.setWindowTitle("OneKey")
            box.setText(_(
                "The current OneKey wallet did not encrypt this file. "
                "Unlock the matching wallet on your OneKey and retry."
            ))
            current = box.addButton(_("Retry current wallet"), QMessageBox.ButtonRole.AcceptRole)
            hidden = (box.addButton(_("Enter passphrase on device"), QMessageBox.ButtonRole.AcceptRole)
                      if self._allow_hidden_retry else None)
            box.addButton(QMessageBox.StandardButton.Cancel)
            box.setDefaultButton(current)
            box.exec()
            if box.clickedButton() is current:
                self._wallet_choice = "current"
            elif hidden is not None and box.clickedButton() is hidden:
                self._wallet_choice = "select-hidden"
        finally:
            self._wallet_choice_done.set()


def _device_manager(component):
    plugins = getattr(component, "plugins", None) or getattr(getattr(component, "wizard", None), "plugins", None)
    return getattr(plugins, "device_manager", None)


def _ensure_wizard_client(component, info):
    """Return a paired client for info.device.id_, re-pairing if it was dropped."""
    manager = _device_manager(component)
    if manager is None:
        return None
    client = manager.client_by_id(info.device.id_, scan_now=False)
    if client is not None and getattr(client, "attached", lambda: True)():
        return client
    # DeviceMgr.scan_devices() does not call create_client() for an unpaired device.
    # Re-create and register the client if the physical device is still attached.
    plugins = getattr(component, "plugins", None) or getattr(getattr(component, "wizard", None), "plugins", None)
    plugin = plugins.get_plugin(info.plugin_name) if plugins is not None else None
    if plugin is None or not hasattr(plugin, "create_client"):
        return None
    # Qt handlers must be constructed on the GUI thread.
    handler = plugin.create_handler(getattr(component, "wizard", None))

    @runs_in_hwd_thread
    def restore():
        client = manager.client_by_id(info.device.id_, scan_now=False)
        if client is not None:
            if client.attached():
                return client
            client.close()
        devices = plugin.enumerate()
        matched = next((dev for dev in devices if dev.id_ == info.device.id_), None)
        if matched is None:
            return None
        # Creation and registration must finish before a queued lookup can sweep.
        return manager.create_client(matched, handler, plugin)

    try:
        return restore()
    except Exception:
        return None


class WCOneKeyScript(WCScriptAndDerivation):
    passphrase_status_signal = pyqtSignal(object, bool, bool)

    def __init__(self, parent, wizard):
        super().__init__(parent, wizard)
        self.passphrase_status_signal.connect(self._on_passphrase_status)

    @runs_in_hwd_thread
    def _wallet_options_known_off(self, cancelled=None):
        """(passphrase off, Attach PIN off), each True only when an unlocked device said so."""
        hw = self.wizard.current_cosigner(self.wizard_data).get("hardware_device")
        if not hw or not isinstance(hw, (tuple, list)) or len(hw) < 2:
            return False, False
        manager = _device_manager(self)
        if manager is None:
            return False, False
        info = hw[1]
        try:
            client = manager.client_by_id(info.device.id_, scan_now=False)
        except Exception:
            return False, False
        if client is None or (cancelled is not None and cancelled.is_set()):
            return False, False
        kwargs = {} if cancelled is None else {"cancelled": cancelled}
        if not client.has_usable_connection_with_device(**kwargs):
            return False, False
        return (client.passphrase_enabled is False,
                getattr(client, "attach_pin_enabled", None) is False)

    def _passphrase_known_disabled(self, cancelled=None):
        return WCOneKeyScript._wallet_options_known_off(self, cancelled=cancelled)[0]

    def on_ready(self):
        super().on_ready()
        if getattr(self, "hidden_cb", None) is None:
            self.hidden_cb = QCheckBox(_("Use a hidden wallet. Enter its passphrase on the device."))
            self.attach_cb = QCheckBox(_("Use the Attach PIN wallet. Enter the Attach PIN on the device."))
            self.hidden_cb.toggled.connect(lambda checked: self._on_choice_toggled(self.hidden_cb, "select-hidden", checked))
            self.attach_cb.toggled.connect(lambda checked: self._on_choice_toggled(self.attach_cb, "attach", checked))
            self.layout().insertWidget(self.layout().count() - 2, self.hidden_cb)
            self.layout().insertWidget(self.layout().count() - 2, self.attach_cb)
        # Keep passphrase-based choices available until an unlocked device confirms otherwise.
        self._passphrase_disabled = False
        self._attach_disabled = False
        mode = self.wizard.current_cosigner(self.wizard_data).get("onekey_wallet_mode")
        for box, value in self._choices():
            box.setVisible(True)
            box.setChecked(mode == value)
        self.apply()
        self._start_passphrase_probe()

    def _choices(self):
        # vars(): a page built without QWidget.__init__ (tests) must not touch Qt attributes.
        state = vars(self)
        return [(box, value) for box, value in ((state.get("hidden_cb"), "select-hidden"),
                                                (state.get("attach_cb"), "attach"))
                if box is not None]

    def _selected_choice(self):
        for box, value in self._choices():
            if not box.isHidden() and box.isChecked():
                return value
        return None

    def _on_choice_toggled(self, source, value, checked):
        if checked:
            for box, _value in self._choices():
                if box is not source:
                    box.setChecked(False)
        elif self._blocked_reason(value):
            # The device cannot open this wallet: an unticked choice can go away now.
            source.setVisible(False)
        self.validate()

    def _blocked_reason(self, value):
        if getattr(self, "_passphrase_disabled", False):
            return _("Passphrase is disabled on this OneKey. Enable it on the device, "
                     "or untick the hidden or Attach PIN wallet option to continue "
                     "with the standard wallet.")
        if value == "attach" and getattr(self, "_attach_disabled", False):
            return _("No Attach PIN is set on this OneKey. Set one up on the device, "
                     "or untick the Attach PIN wallet option to choose another wallet.")
        return None

    def _start_passphrase_probe(self):
        previous = getattr(self, "_passphrase_cancel", None)
        if previous is not None:
            previous.set()
        request = self._passphrase_request = object()
        cancel = self._passphrase_cancel = threading.Event()
        self._passphrase_pending = True
        self._passphrase_interrupted = False
        # A checked hidden-wallet choice cannot advance until the probe answers.
        self.validate()

        def refresh():
            disabled = attach_disabled = False
            try:
                if not cancel.is_set():
                    disabled, attach_disabled = self._wallet_options_known_off(cancelled=cancel)
            finally:
                if not cancel.is_set():
                    try:
                        self.passphrase_status_signal.emit(request, disabled, attach_disabled)
                    except RuntimeError:
                        pass  # The page was deleted while the probe ran.

        _hwd_comms_executor.submit(refresh)

    def _stop_passphrase_probe(self):
        cancel = getattr(self, "_passphrase_cancel", None)
        if cancel is not None and getattr(self, "_passphrase_pending", False):
            cancel.set()
            # A result already queued on the Qt loop no longer matches and is dropped.
            self._passphrase_request = None
            self._passphrase_pending = False
            self._passphrase_interrupted = True
            self.validate()

    def hideEvent(self, event):
        # Back, Next and closing the wizard all hide this page. Stop the probe so
        # it does not hold Electrum's only hardware worker.
        if not event.spontaneous():
            self._stop_passphrase_probe()
        super().hideEvent(event)

    def showEvent(self, event):
        super().showEvent(event)
        if not event.spontaneous() and getattr(self, "_passphrase_interrupted", False):
            self._start_passphrase_probe()

    def validate(self):
        super().validate()
        selected = self._selected_choice()
        if selected is None:
            return
        if getattr(self, "_passphrase_pending", False):
            # A passphrase-based choice cannot advance until the probe answers.
            self.valid = False
            return
        reason = self._blocked_reason(selected)
        if reason:
            # Never swap the user's choice for another wallet. Ask them to change it.
            self.valid = False
            warn = getattr(self, "warn_label", None)
            if warn is not None:
                warn.setText(reason)

    @pyqtSlot(object, bool, bool)
    def _on_passphrase_status(self, request, disabled, attach_disabled=False):
        if request is None or request is not self._passphrase_request:
            return
        self._passphrase_pending = False
        self._passphrase_disabled = disabled
        self._attach_disabled = attach_disabled
        for box, value in self._choices():
            # A ticked choice stays visible so the user sees why Next is blocked.
            box.setVisible(self._blocked_reason(value) is None or box.isChecked())
        self.apply()
        self.validate()

    def apply(self):
        super().apply()
        self.wizard.current_cosigner(self.wizard_data)["onekey_wallet_mode"] = self._selected_choice() or "standard"


class WCOneKeyUnlock(WCHWUnlock):
    def on_ready(self):
        _name, info = self.wizard_data["hardware_device"]
        self.plugin = self.plugins.get_plugin(info.plugin_name)
        self.title = _("Unlocking {} ({})").format(info.model_name, info.label)
        client = _ensure_wizard_client(self, info)
        if client is None:
            self.error = _("Client for hardware device was unpaired.")
            self.busy = False
            self.validate()
            return
        client.handler = self.plugin.create_handler(self.wizard)

        def unlock_task():
            try:
                self.password = self._unlock_password(client)
            except UserCancelled as exc:
                self.error = repr(exc)
            except Exception as exc:
                self.error = repr(exc)
                self.logger.exception(repr(exc))
            self.busy = False
            self.validate()

        self.busy = True
        threading.Thread(target=unlock_task, daemon=True).start()

    def _unlock_password(self, client):
        # Try the active device session first (PIN_ANY accepts both Main PIN and Attach PIN).
        mode = "current"
        while True:
            password = self._encryption_password(client, mode)
            if self._password_decrypts(password):
                return password
            if not client.has_usable_connection_with_device():
                raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
            mode = client.handler.choose_passphrase_retry(allow_hidden=client.passphrase_enabled is not False)
            if mode not in ("current", "select-hidden"):
                self.error = _("This OneKey wallet did not encrypt this file.")
                return None

    def _encryption_password(self, client, mode):
        # Decrypting an existing file must not reuse a wallet already open on this device.
        client.request_wallet_mode(mode)
        client.begin_storage_unlock_selection()
        return client.get_password_for_storage_encryption()

    def _password_decrypts(self, password):
        storage = WalletStorage(self.wizard_data["wallet_name"])
        if not storage.is_encrypted_with_hw_device():
            return True
        try:
            storage.decrypt(password)
        except InvalidPassword:
            return False
        return True


class WCOneKeyXPub(WCHWXPub):
    def on_ready(self):
        hw = self.wizard.current_cosigner(self.wizard_data).get("hardware_device")
        if hw and isinstance(hw, (tuple, list)) and len(hw) >= 2:
            _ensure_wizard_client(self, hw[1])
        super().on_ready()

    def get_xpub_from_client(self, client, derivation, xtype):
        if self.wizard_data["wallet_type"] not in ("standard", "multisig"):
            raise UserFacingException(_("Only standard and multisig OneKey wallets are supported."))
        if self.wizard_data["wallet_type"] == "multisig" and xtype not in ("p2wsh", "p2wsh-p2sh"):
            raise UserFacingException(_("OneKey supports only BIP48 segwit multisig wallets."))
        mode = self.wizard.current_cosigner(self.wizard_data).get("onekey_wallet_mode") or "standard"
        if mode not in ("standard", "attach", "select-hidden"):
            mode = "standard"
        client.request_wallet_mode(mode)
        # DeviceMgr keeps one client per serial. A new wallet must not inherit the previous choice.
        client.begin_new_wallet_selection()
        return super().get_xpub_from_client(client, derivation, xtype)
