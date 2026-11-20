import threading
from contextlib import contextmanager

from electrum import constants
from electrum.bip32 import BIP32Node, convert_bip32_strpath_to_intpath
from electrum.hw_wallet import HardwareClientBase
from electrum.i18n import _
from electrum.plugin import runs_in_hwd_thread
from electrum.storage import get_derivation_used_for_hw_device_encryption
from electrum.util import UserCancelled, UserFacingException

from .ipc import HelperError, SDK_VERSION


LIBRARY_VERSION = SDK_VERSION
MODELS = {"pro2": "OneKey Pro 2", "neo": "OneKey Neo"}
INPUT_SCRIPT_TYPES = {"standard": "SPENDADDRESS", "p2pkh": "SPENDADDRESS",
                      "p2wpkh-p2sh": "SPENDP2SHWITNESS", "p2wpkh": "SPENDWITNESS"}
OUTPUT_SCRIPT_TYPES = {"p2pkh": "PAYTOADDRESS", "p2wpkh-p2sh": "PAYTOP2SHWITNESS", "p2wpkh": "PAYTOWITNESS"}


def coin_name():
    if constants.net is constants.BitcoinMainnet:
        return "Bitcoin"
    if constants.net is constants.BitcoinTestnet:
        return "Testnet"
    raise UserFacingException(_("This OneKey plugin supports Bitcoin and Testnet only."))


def check_binding(value):
    if (type(value) is not dict or set(value) != {"serialNo", "deviceId", "walletType", "passphraseState"}
            or any(type(value[k]) is not str or not value[k] or len(value[k]) > 256
                   for k in ("serialNo", "deviceId"))
            or not ((value["walletType"] == "standard" and value["passphraseState"] is None)
                    or (value["walletType"] == "hidden" and type(value["passphraseState"]) is str
                        and 0 < len(value["passphraseState"]) <= 256))):
        raise UserFacingException(_("Invalid OneKey wallet binding. Reconnect using the wallet wizard."))
    return dict(value)


def account_path(path, xtype):
    path = convert_bip32_strpath_to_intpath(path) if isinstance(path, str) else list(path)
    purpose = {"standard": 44, "p2pkh": 44, "p2wpkh-p2sh": 49, "p2wpkh": 84}.get(xtype)
    coin = 1 if coin_name() == "Testnet" else 0
    if (len(path) != 3 or purpose is None or path[0] != purpose + 0x80000000
            or path[1] != coin + 0x80000000 or type(path[2]) is not int
            or not 0x80000000 <= path[2] <= 0xffffffff):
        raise UserFacingException(_("OneKey requires the matching BIP44/49/84 account derivation."))
    return path


def storage_encryption_path(path, xtype):
    """Electrum's wallet-file key, m/4541509'/1112098098'. Not an account path."""
    if xtype != "standard":
        return None
    try:
        actual = convert_bip32_strpath_to_intpath(path) if isinstance(path, str) else list(path)
    except Exception:
        return None
    expected = convert_bip32_strpath_to_intpath(get_derivation_used_for_hw_device_encryption())
    if actual != expected:
        return None
    return actual


def normalized_xpub(xpub, xtype):
    node = BIP32Node.from_xkey(xpub)
    if xpub != node.to_xpub():
        raise UserFacingException(_("OneKey returned an invalid public key."))
    return node._replace(xtype=xtype).to_xpub()


class OneKeyClient(HardwareClientBase):
    def __init__(self, path, handler, plugin):
        super().__init__(plugin=plugin)
        self.handler = handler
        self.helper = plugin.helper
        self.generation = self.helper.generation
        self.connect_id = path
        self.cancelled = threading.Event()
        self.binding = None
        self.account = None
        self.root_fingerprint = None
        self.closed = False
        self._released = False
        self._fresh_selection = False
        try:
            state = self._call("state", {"connectId": path})
            self._check_state(state)
            self.device_id = state["deviceId"]
            self.serial = state["serialNo"]
            self.model = MODELS[state["model"]]
            retain = getattr(self.plugin, "retain_client", None)
            if retain is not None:
                retain(self)
        except BaseException:
            self.close()
            raise

    def attached(self):
        return not self.closed and self.helper.generation == self.generation

    @staticmethod
    def _check_state(state):
        if (type(state) is not dict or set(state) != {"deviceId", "serialNo", "model"}
                or state["model"] not in MODELS
                or type(state["serialNo"]) is not str or not state["serialNo"]):
            raise UserFacingException(_("Unsupported or incomplete OneKey device state."))
        if state["deviceId"] is not None and (type(state["deviceId"]) is not str or not state["deviceId"]):
            raise UserFacingException(_("Unsupported or incomplete OneKey device state."))

    def _call(self, op, params):
        if self.closed:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        try:
            return self.helper.call(op, params, generation=self.generation,
                                    cancelled=self.cancelled, on_ui=self._ui)
        except HelperError as error:
            self.closed = True
            if error.code == "CANCELLED":
                raise UserCancelled() from None
            raise UserFacingException(str(error)) from None

    def _ui(self, event):
        text = {"pin": _("Enter the PIN on your OneKey."),
                "passphrase": _("Enter the passphrase on your OneKey."),
                "passphrase-select": _("Select the hidden wallet on your OneKey. Enter its passphrase on the device."),
                "button": _("Check and confirm on your OneKey.")}.get(event)
        if text and self.handler:
            self.handler.show_message(text, on_cancel=self.cancelled.set)

    @contextmanager
    def flow(self):
        if self.handler is None:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        self.cancelled.clear()
        self.handler.show_message(_("Check your OneKey device to continue."), on_cancel=self.cancelled.set)
        try:
            yield
        except BaseException:
            self.close()
            raise
        finally:
            self.handler.finished()

    def _select_wallet(self):
        if self.binding is not None:
            return
        self.handler.finished()
        mode = self.handler.choose_wallet()
        if mode not in ("standard", "select-hidden"):
            raise UserCancelled()
        self.binding = check_binding(self._call("open", {"connectId": self.connect_id, "mode": mode}))
        if self.binding["serialNo"] != self.serial:
            raise UserFacingException(_("OneKey device identity changed."))
        if self.device_id is None:
            self.device_id = self.binding["deviceId"]
        elif self.binding["deviceId"] != self.device_id:
            raise UserFacingException(_("OneKey device identity changed."))

    def _xpub(self, path, xtype):
        response = self._call("xpub", dict(connectId=self.connect_id, binding=self.binding,
                                          coin=coin_name(), path=path, scriptType=INPUT_SCRIPT_TYPES[xtype]))
        if type(response) is not dict or set(response) != {"xpub", "rootFingerprint"} or type(response["xpub"]) is not str:
            raise UserFacingException(_("Invalid OneKey public key response."))
        fingerprint = response["rootFingerprint"]
        if fingerprint is not None:
            if type(fingerprint) is not int or not 0 <= fingerprint <= 0xffffffff:
                raise UserFacingException(_("Invalid OneKey root fingerprint."))
            self.root_fingerprint = fingerprint.to_bytes(4, "big").hex()
        xpub = normalized_xpub(response["xpub"], xtype)
        node = BIP32Node.from_xkey(xpub)
        if node.depth != len(path) or node.child_number != path[-1].to_bytes(4, "big"):
            raise UserFacingException(_("OneKey returned a public key at the wrong derivation."))
        return xpub

    def begin_new_wallet_selection(self):
        # Consumed by the next get_xpub on the hardware thread. Saved wallets never set this.
        if self.closed:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        self._fresh_selection = True

    @runs_in_hwd_thread
    def bind_keystore(self, keystore):
        xtype = BIP32Node.from_xkey(keystore.xpub).xtype
        path = account_path(keystore.get_derivation_prefix(), xtype)
        expected = normalized_xpub(keystore.xpub, xtype)
        with self.flow():
            saved = keystore.onekey_binding
            if saved is None:
                raise UserFacingException(_(
                    "This wallet has no OneKey device binding. Recreate it with the hardware wallet wizard."
                ))
            saved = check_binding(saved)
            if saved["serialNo"] != self.serial:
                raise UserFacingException(_("This Electrum wallet is bound to a different OneKey device."))
            # Locked firmware has no device_id yet. The saved binding is restored on
            # the xpub call. select-hidden would force a new wallet choice.
            if self.device_id is not None and saved["deviceId"] != self.device_id:
                raise UserFacingException(_("This Electrum wallet is bound to a different OneKey device."))
            if self.binding is not None and self.binding != saved:
                raise UserFacingException(_("OneKey wallet selection changed. Reconnect the device."))
            self.binding = saved
            actual = self._xpub(path, xtype)
            if actual != expected:
                raise UserFacingException(_("OneKey account does not match this Electrum wallet."))
            if self.device_id is None:
                self.device_id = saved["deviceId"]
            # Persist only the public wallet identity, never the firmware session or secrets.
            keystore.onekey_binding = dict(self.binding)
            self.account = (path, xtype, expected)

    def _verify_account(self):
        if self.account is None:
            raise UserFacingException(_("Verify the OneKey account before displaying or signing."))
        path, xtype, expected = self.account
        if self._xpub(path, xtype) != expected:
            raise UserFacingException(_("OneKey account changed. Reconnect the device."))

    def _drop_device_cache(self):
        get_manager = getattr(self.plugin, "device_manager", None)
        if not callable(get_manager):
            return
        try:
            manager = get_manager()
        except Exception:
            return
        clients = getattr(manager, "clients", None)
        if not isinstance(clients, dict):
            return
        lock = getattr(manager, "lock", None)
        if lock is not None:
            lock.acquire()
        try:
            clients.pop(self, None)
        finally:
            if lock is not None:
                lock.release()

    def _release_helper_ref(self):
        if self._released:
            return
        self._released = True
        release = getattr(self.plugin, "release_helper", None)
        if release is not None:
            release(self)
        elif getattr(self.helper, "generation", None) == self.generation:
            shutdown = getattr(self.helper, "shutdown", None)
            if shutdown is not None:
                shutdown()

    @runs_in_hwd_thread
    def close(self):
        self.closed = True
        self.binding = None
        self.account = None
        self._drop_device_cache()
        self._release_helper_ref()

    def _detach_without_cache_drop(self):
        # DeviceMgr is iterating clients. Popping that dict raises RuntimeError.
        self.closed = True
        self.binding = None
        self.account = None
        self._release_helper_ref()

    def is_pairable(self):
        return True

    def is_initialized(self):
        return not self.closed

    def label(self):
        return f"{self.model} ({self.serial})"

    def device_model_name(self):
        return self.model

    def get_soft_device_id(self):
        return self.device_id

    @runs_in_hwd_thread
    def has_usable_connection_with_device(self):
        try:
            state = self._call("state", {"connectId": self.connect_id})
            self._check_state(state)
            if state["serialNo"] != self.serial:
                self._detach_without_cache_drop()
                return False
            if self.device_id is not None and state["deviceId"] not in (None, self.device_id):
                self._detach_without_cache_drop()
                return False
            return True
        except Exception:
            self._detach_without_cache_drop()
            return False

    def _storage_encryption_xpub(self, path):
        # Same selected wallet, but this node must not replace the account or its binding.
        with self.flow():
            self._select_wallet()
            return self._xpub(path, "standard")

    @runs_in_hwd_thread
    def get_xpub(self, bip32_path, xtype):
        if self._fresh_selection:
            self._fresh_selection = False
            self.binding = None
            self.account = None
        encryption = storage_encryption_path(bip32_path, xtype)
        if encryption is not None:
            return self._storage_encryption_xpub(encryption)
        path = account_path(bip32_path, xtype)
        expected = getattr(self.plugin, "_expected_keystore", None)
        if expected is not None:
            self.bind_keystore(expected)
            if self.account[:2] != (path, xtype):
                self.close()
                raise UserFacingException(_("OneKey pairing requested a different account."))
            return self.account[2]
        with self.flow():
            self._select_wallet()
            xpub = self._xpub(path, xtype)
            if self.account is not None and self.account != (path, xtype, xpub):
                raise UserFacingException(_("OneKey account selection changed. Reconnect the device."))
            self.account = (path, xtype, xpub)
            self.plugin.remember_wallet_binding(xpub, self.binding)
            return xpub

    @runs_in_hwd_thread
    def request_root_fingerprint_from_device(self):
        # GetPublicKey already returned this public metadata for the selected account.
        return self.root_fingerprint

    @runs_in_hwd_thread
    def show_address(self, path, script_type, expected_address):
        with self.flow():
            self._verify_account()
            response = self._call("address", dict(connectId=self.connect_id, binding=self.binding,
                                                  coin=coin_name(), path=path,
                                                  scriptType=INPUT_SCRIPT_TYPES[script_type]))
            if type(response) is not dict or response != {"address": expected_address}:
                raise UserFacingException(_("OneKey returned a different address. Check the selected wallet."))

    @runs_in_hwd_thread
    def sign_tx(self, inputs, outputs, prev_txes, *, version, lock_time):
        with self.flow():
            self._verify_account()
            response = self._call("sign", dict(connectId=self.connect_id, binding=self.binding,
                                               coin=coin_name(), inputs=inputs, outputs=outputs,
                                               refTxs=list(prev_txes.values()), version=version, locktime=lock_time))
            if type(response) is not dict or set(response) != {"signatures"}:
                raise UserFacingException(_("Invalid OneKey signatures response."))
            return response["signatures"]
