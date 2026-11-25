import threading

from PyQt6.QtCore import pyqtSignal, pyqtSlot
from PyQt6.QtWidgets import QCheckBox, QMessageBox

from electrum.gui.qt.wizard.wallet import WCScriptAndDerivation, WCHWXPub, WCHWUnlock, WCHWUninitialized
from electrum.hw_wallet.qt import QtHandlerBase, QtPluginBase
from electrum.hw_wallet.plugin import only_hook_if_libraries_available
from electrum.i18n import _
from electrum.plugin import hook
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

    def choose_passphrase_retry(self):
        if threading.current_thread() is threading.main_thread():
            raise UserFacingException(_("OneKey wallet selection must run on the hardware thread."))
        self._wallet_choice = None
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
                "Enter a passphrase on your OneKey to try a hidden wallet?"
            ))
            hidden = box.addButton(_("Enter passphrase on device"), QMessageBox.ButtonRole.AcceptRole)
            box.addButton(QMessageBox.StandardButton.Cancel)
            box.setDefaultButton(hidden)
            box.exec()
            if box.clickedButton() is hidden:
                self._wallet_choice = "select-hidden"
        finally:
            self._wallet_choice_done.set()


class WCOneKeyScript(WCScriptAndDerivation):
    def _passphrase_known_disabled(self):
        hw = self.wizard_data.get("hardware_device")
        if not hw or not isinstance(hw, (tuple, list)) or len(hw) < 2:
            return False
        info = hw[1]
        client = self.plugins.device_manager.client_by_id(info.device.id_, scan_now=False)
        return client is not None and getattr(client, "passphrase_enabled", None) is False

    def on_ready(self):
        super().on_ready()
        if getattr(self, "hidden_cb", None) is None:
            self.hidden_cb = QCheckBox(_("Use a hidden wallet. Enter its passphrase on the device."))
            self.hidden_cb.toggled.connect(lambda _checked: self.validate())
            self.layout().insertWidget(self.layout().count() - 2, self.hidden_cb)
        if self._passphrase_known_disabled():
            self.hidden_cb.setChecked(False)
            self.hidden_cb.setVisible(False)
        else:
            self.hidden_cb.setVisible(True)
            self.hidden_cb.setChecked(self.wizard_data.get("onekey_wallet_mode") == "select-hidden")
        self.apply()

    def apply(self):
        super().apply()
        hidden = getattr(self, "hidden_cb", None)
        self.wizard_data["onekey_wallet_mode"] = (
            "select-hidden" if hidden is not None and hidden.isVisible() and hidden.isChecked() else "standard")


class WCOneKeyUnlock(WCHWUnlock):
    def on_ready(self):
        _name, info = self.wizard_data["hardware_device"]
        self.plugin = self.plugins.get_plugin(info.plugin_name)
        self.title = _("Unlocking {} ({})").format(info.model_name, info.label)
        client = self.plugins.device_manager.client_by_id(info.device.id_, scan_now=False)
        if client is None:
            client = self.plugins.device_manager.client_by_id(info.device.id_, scan_now=True)
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
        password = self._encryption_password(client, "standard")
        if self._password_decrypts(password):
            return password
        if getattr(client, "passphrase_enabled", None) is False:
            self.error = _("The current OneKey wallet did not encrypt this file. "
                           "Unlock the matching wallet on your OneKey and retry.")
            return None
        mode = client.handler.choose_passphrase_retry()
        if mode != "select-hidden":
            self.error = _("This OneKey wallet did not encrypt this file.")
            return None
        password = self._encryption_password(client, mode)
        if not self._password_decrypts(password):
            self.error = _("This OneKey wallet did not encrypt this file.")
            return None
        return password

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
        hw = self.wizard_data.get("hardware_device")
        if hw and isinstance(hw, (tuple, list)) and len(hw) >= 2:
            info = hw[1]
            if self.plugins.device_manager.client_by_id(info.device.id_, scan_now=False) is None:
                self.plugins.device_manager.client_by_id(info.device.id_, scan_now=True)
        super().on_ready()

    def get_xpub_from_client(self, client, derivation, xtype):
        if self.wizard_data["wallet_type"] not in ("standard", "multisig"):
            raise UserFacingException(_("Only standard and multisig OneKey wallets are supported."))
        if self.wizard_data["wallet_type"] == "multisig" and xtype not in ("p2wsh", "p2wsh-p2sh"):
            raise UserFacingException(_("OneKey supports only BIP48 segwit multisig wallets."))
        mode = self.wizard_data.get("onekey_wallet_mode") or "standard"
        if mode not in ("standard", "select-hidden"):
            mode = "standard"
        client.request_wallet_mode(mode)
        # DeviceMgr keeps one client per serial. A new wallet must not inherit the previous choice.
        client.begin_new_wallet_selection()
        return super().get_xpub_from_client(client, derivation, xtype)
