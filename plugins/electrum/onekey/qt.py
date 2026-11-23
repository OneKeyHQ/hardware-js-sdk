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
    alternate_wallet_signal = pyqtSignal(bool)

    def __init__(self, window):
        super().__init__(window, "OneKey")
        self._wallet_choice_done = threading.Event()
        self._wallet_choice = None
        self.alternate_wallet_signal.connect(self._choose_alternate_wallet)

    def choose_alternate_wallet(self, attach):
        if threading.current_thread() is threading.main_thread():
            raise UserFacingException(_("OneKey wallet selection must run on the hardware thread."))
        self._wallet_choice = None
        self._wallet_choice_done.clear()
        self.alternate_wallet_signal.emit(bool(attach))
        self._wallet_choice_done.wait()
        return self._wallet_choice

    @pyqtSlot(bool)
    def _choose_alternate_wallet(self, attach):
        try:
            box = QMessageBox(self.top_level_window())
            box.setIcon(QMessageBox.Icon.Question)
            box.setWindowTitle("OneKey")
            text = _("This OneKey wallet did not encrypt this file. "
                     "A hidden wallet asks for the passphrase on the device.")
            if attach:
                text += " " + _("Attach PIN opens the wallet bound to that PIN.")
            box.setText(text)
            hidden = box.addButton(_("Hidden wallet"), QMessageBox.ButtonRole.AcceptRole)
            attach_button = None
            if attach:
                attach_button = box.addButton(_("Attach PIN wallet"), QMessageBox.ButtonRole.ActionRole)
            box.addButton(QMessageBox.StandardButton.Cancel)
            box.setDefaultButton(hidden)
            box.exec()
            clicked = box.clickedButton()
            if clicked is hidden:
                self._wallet_choice = "select-hidden"
            elif attach_button is not None and clicked is attach_button:
                self._wallet_choice = "select-attach-pin"
        finally:
            self._wallet_choice_done.set()


class WCOneKeyScript(WCScriptAndDerivation):
    def on_ready(self):
        super().on_ready()
        if getattr(self, "hidden_cb", None) is not None:
            return
        self.hidden_cb = QCheckBox(_("Use a hidden wallet. Enter its passphrase on the device."))
        self.hidden_cb.setChecked(self.wizard_data.get("onekey_wallet_mode") == "select-hidden")
        self.hidden_cb.toggled.connect(lambda _checked: self.validate())
        self.layout().insertWidget(self.layout().count() - 2, self.hidden_cb)
        self.apply()

    def apply(self):
        super().apply()
        hidden = getattr(self, "hidden_cb", None)
        self.wizard_data["onekey_wallet_mode"] = (
            "select-hidden" if hidden is not None and hidden.isChecked() else "standard")


class WCOneKeyUnlock(WCHWUnlock):
    def on_ready(self):
        _name, info = self.wizard_data["hardware_device"]
        self.plugin = self.plugins.get_plugin(info.plugin_name)
        self.title = _("Unlocking {} ({})").format(info.model_name, info.label)
        client = self.plugins.device_manager.client_by_id(info.device.id_, scan_now=False)
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
        # The wallet type is inside the encrypted file, so the first try is the standard wallet.
        password = self._encryption_password(client, "standard")
        if self._password_decrypts(password):
            return password
        mode = client.handler.choose_alternate_wallet(client.attach_pin_enabled())
        if mode not in ("select-hidden", "select-attach-pin"):
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
