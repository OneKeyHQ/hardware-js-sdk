import threading

from PyQt6.QtCore import pyqtSignal, pyqtSlot
from PyQt6.QtWidgets import QMessageBox

from electrum.gui.qt.wizard.wallet import WCScriptAndDerivation, WCHWXPub, WCHWUnlock, WCHWUninitialized
from electrum.hw_wallet.qt import QtHandlerBase, QtPluginBase
from electrum.hw_wallet.plugin import only_hook_if_libraries_available
from electrum.i18n import _
from electrum.plugin import hook
from electrum.util import UserCancelled, UserFacingException
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
            "onekey_start": {"gui": WCScriptAndDerivation},
            "onekey_xpub": {"gui": WCOneKeyXPub},
            "onekey_not_initialized": {"gui": WCHWUninitialized},
            "onekey_unlock": {"gui": WCOneKeyUnlock},
        })


class OneKeyQtHandler(QtHandlerBase):
    wallet_choice_signal = pyqtSignal()

    def __init__(self, window):
        super().__init__(window, "OneKey")
        self._wallet_choice_done = threading.Event()
        self._wallet_choice = None
        self.wallet_choice_signal.connect(self._choose_wallet)

    def choose_wallet(self):
        if threading.current_thread() is threading.main_thread():
            raise UserFacingException(_("OneKey wallet selection must run on the hardware thread."))
        self._wallet_choice = None
        self._wallet_choice_done.clear()
        self.wallet_choice_signal.emit()
        self._wallet_choice_done.wait()
        if self._wallet_choice is None:
            raise UserCancelled()
        return self._wallet_choice

    @pyqtSlot()
    def _choose_wallet(self):
        try:
            box = QMessageBox(self.top_level_window())
            box.setIcon(QMessageBox.Icon.Question)
            box.setWindowTitle("OneKey")
            box.setText(_(
                "Choose the OneKey wallet. Standard uses the main PIN. "
                "Hidden asks for the passphrase on the device. "
                "Attach PIN uses the device attach PIN. Cancel stops without a choice."
            ))
            standard = box.addButton(_("Standard"), QMessageBox.ButtonRole.AcceptRole)
            hidden = box.addButton(_("Hidden"), QMessageBox.ButtonRole.ActionRole)
            attach = box.addButton(_("Attach PIN"), QMessageBox.ButtonRole.ActionRole)
            cancel = box.addButton(QMessageBox.StandardButton.Cancel)
            box.setDefaultButton(cancel)
            box.exec()
            clicked = box.clickedButton()
            if clicked is standard:
                self._wallet_choice = "standard"
            elif clicked is hidden:
                self._wallet_choice = "select-hidden"
            elif clicked is attach:
                self._wallet_choice = "select-attach-pin"
        finally:
            self._wallet_choice_done.set()


class WCOneKeyUnlock(WCHWUnlock):
    def on_ready(self):
        # Decrypting an existing file must not reuse a wallet already open on this device.
        _name, info = self.wizard_data["hardware_device"]
        client = self.plugins.device_manager.client_by_id(info.device.id_, scan_now=False)
        if client is not None:
            client.begin_storage_unlock_selection()
        super().on_ready()


class WCOneKeyXPub(WCHWXPub):
    def get_xpub_from_client(self, client, derivation, xtype):
        if self.wizard_data["wallet_type"] not in ("standard", "multisig"):
            raise UserFacingException(_("Only single-signature OneKey wallets are supported."))
        if self.wizard_data["wallet_type"] == "multisig" and xtype not in ("p2wsh", "p2wsh-p2sh"):
            raise UserFacingException(_("OneKey supports only BIP48 segwit multisig wallets."))
        # DeviceMgr keeps one client per serial. A new wallet must not inherit the previous choice.
        client.begin_new_wallet_selection()
        return super().get_xpub_from_client(client, derivation, xtype)
