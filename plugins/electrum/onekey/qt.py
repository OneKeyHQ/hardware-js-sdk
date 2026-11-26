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
    passphrase_status_signal = pyqtSignal(object, bool)

    def __init__(self, parent, wizard):
        super().__init__(parent, wizard)
        self.passphrase_status_signal.connect(self._on_passphrase_status)

    @runs_in_hwd_thread
    def _passphrase_known_disabled(self):
        hw = self.wizard.current_cosigner(self.wizard_data).get("hardware_device")
        if not hw or not isinstance(hw, (tuple, list)) or len(hw) < 2:
            return False
        manager = _device_manager(self)
        if manager is None:
            return False
        info = hw[1]
        try:
            client = manager.client_by_id(info.device.id_, scan_now=False)
        except Exception:
            return False
        return (client is not None and client.has_usable_connection_with_device()
                and client.passphrase_enabled is False)

    def on_ready(self):
        super().on_ready()
        if getattr(self, "hidden_cb", None) is None:
            self.hidden_cb = QCheckBox(_("Use a hidden wallet. Enter its passphrase on the device."))
            self.hidden_cb.toggled.connect(lambda _checked: self.validate())
            self.layout().insertWidget(self.layout().count() - 2, self.hidden_cb)
        # Keep hidden-wallet choices available until an unlocked device confirms otherwise.
        self.hidden_cb.setVisible(True)
        self.hidden_cb.setChecked(
            self.wizard.current_cosigner(self.wizard_data).get("onekey_wallet_mode") == "select-hidden")
        self.apply()
        request = self._passphrase_request = object()

        def refresh():
            disabled = self._passphrase_known_disabled()
            self.passphrase_status_signal.emit(request, disabled)

        _hwd_comms_executor.submit(refresh)

    @pyqtSlot(object, bool)
    def _on_passphrase_status(self, request, disabled):
        if request is not self._passphrase_request:
            return
        if disabled:
            self.hidden_cb.setChecked(False)
            self.hidden_cb.setVisible(False)
        else:
            self.hidden_cb.setVisible(True)
        self.apply()

    def apply(self):
        super().apply()
        hidden = getattr(self, "hidden_cb", None)
        self.wizard.current_cosigner(self.wizard_data)["onekey_wallet_mode"] = (
            "select-hidden" if hidden is not None and hidden.isVisible() and hidden.isChecked() else "standard")


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
        if mode not in ("standard", "select-hidden"):
            mode = "standard"
        client.request_wallet_mode(mode)
        # DeviceMgr keeps one client per serial. A new wallet must not inherit the previous choice.
        client.begin_new_wallet_selection()
        return super().get_xpub_from_client(client, derivation, xtype)
