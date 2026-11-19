import threading

from PyQt6.QtCore import pyqtSignal, pyqtSlot
from PyQt6.QtWidgets import QMessageBox

from electrum.gui.qt.wizard.wallet import WCScriptAndDerivation, WCHWXPub, WCHWUnlock, WCHWUninitialized
from electrum.hw_wallet.qt import QtHandlerBase, QtPluginBase
from electrum.hw_wallet.plugin import only_hook_if_libraries_available
from electrum.i18n import _
from electrum.plugin import hook
from electrum.util import UserCancelled, UserFacingException
from electrum.wallet import Standard_Wallet

from .onekey import OneKeyPlugin


class Plugin(OneKeyPlugin, QtPluginBase):
    icon_unpaired = "onekey.svg"
    icon_paired = "onekey.svg"

    def create_handler(self, window):
        return OneKeyQtHandler(window)

    @only_hook_if_libraries_available
    @hook
    def receive_menu(self, menu, addrs, wallet):
        if len(addrs) == 1 and type(wallet) is Standard_Wallet:
            self._add_menu_action(menu, addrs[0], wallet)

    @only_hook_if_libraries_available
    @hook
    def transaction_dialog_address_menu(self, menu, addr, wallet):
        if type(wallet) is Standard_Wallet:
            self._add_menu_action(menu, addr, wallet)

    def extend_wizard(self, wizard):
        super().extend_wizard(wizard)
        wizard.navmap_merge({
            "onekey_start": {"gui": WCScriptAndDerivation},
            "onekey_xpub": {"gui": WCOneKeyXPub},
            "onekey_not_initialized": {"gui": WCHWUninitialized},
            "onekey_unlock": {"gui": WCHWUnlock},
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
            buttons = QMessageBox.StandardButton
            result = QMessageBox.question(
                self.top_level_window(), "OneKey",
                _("Open a hidden OneKey wallet? Yes: hidden wallet. No: standard wallet. "
                  "Cancel: stop without selecting a wallet."),
                buttons.Yes | buttons.No | buttons.Cancel, buttons.Cancel,
            )
            if result == buttons.Yes:
                self._wallet_choice = "select-hidden"
            elif result == buttons.No:
                self._wallet_choice = "standard"
        finally:
            self._wallet_choice_done.set()


class WCOneKeyXPub(WCHWXPub):
    def get_xpub_from_client(self, client, derivation, xtype):
        if self.wizard_data["wallet_type"] != "standard":
            raise UserFacingException(_("Only single-signature OneKey wallets are supported."))
        return super().get_xpub_from_client(client, derivation, xtype)
