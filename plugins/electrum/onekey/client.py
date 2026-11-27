import threading
from contextlib import contextmanager
from types import SimpleNamespace

from electrum import constants
from electrum.bip32 import BIP32Node, convert_bip32_strpath_to_intpath
from electrum.hw_wallet import HardwareClientBase
from electrum.i18n import _
from electrum.plugin import runs_in_hwd_thread
from electrum.storage import get_derivation_used_for_hw_device_encryption
from electrum.util import UserCancelled, UserFacingException

from .ipc import HelperError, SDK_VERSION
from .validate import SLIP44_BITCOIN, SLIP44_TESTNET, firmware_account_allowed, validate_binding


LIBRARY_VERSION = SDK_VERSION
MODELS = {"pro2": "OneKey Pro 2", "neo": "OneKey Neo"}
INPUT_SCRIPT_TYPES = {"standard": "SPENDADDRESS", "p2pkh": "SPENDADDRESS",
                      "p2wpkh-p2sh": "SPENDP2SHWITNESS", "p2wpkh": "SPENDWITNESS",
                      "p2sh": "SPENDMULTISIG", "p2wsh": "SPENDWITNESS", "p2wsh-p2sh": "SPENDP2SHWITNESS"}
OUTPUT_SCRIPT_TYPES = {"p2pkh": "PAYTOADDRESS", "p2wpkh-p2sh": "PAYTOP2SHWITNESS", "p2wpkh": "PAYTOWITNESS",
                       "p2sh": "PAYTOMULTISIG", "p2wsh": "PAYTOWITNESS", "p2wsh-p2sh": "PAYTOP2SHWITNESS"}
MULTISIG_TXIN_TYPES = ("p2sh", "p2wsh", "p2wsh-p2sh")


def coin_name():
    if constants.net is constants.BitcoinMainnet:
        return "Bitcoin"
    if constants.net is constants.BitcoinTestnet:
        return "Testnet"
    raise UserFacingException(_("This OneKey plugin supports Bitcoin and Testnet only."))


def check_binding(value):
    try:
        return validate_binding(value)
    except ValueError:
        raise UserFacingException(_("Invalid OneKey wallet binding. Reconnect using the wallet wizard.")) from None


ACCOUNT_XTYPES = ("standard", "p2pkh", "p2wpkh-p2sh", "p2wpkh", "p2sh", "p2wsh", "p2wsh-p2sh")


def account_path(path, xtype):
    """Accept any account prefix whose addresses the firmware can show and sign.

    Standard BIP44/49/84/48/45 paths sign silently. Another path the firmware
    keychain allows (for example a BIP44 purpose on a SegWit wallet) signs after
    the device shows its non-standard path warning. Anything else is refused
    here, because the device would export its xpub but never sign with it.
    """
    try:
        path = convert_bip32_strpath_to_intpath(path) if isinstance(path, str) else list(path)
    except Exception:
        path = None
    slip44 = SLIP44_TESTNET if coin_name() == "Testnet" else SLIP44_BITCOIN
    if xtype not in ACCOUNT_XTYPES or path is None or not firmware_account_allowed(path, slip44):
        if slip44 == SLIP44_TESTNET:
            raise UserFacingException(_(
                "OneKey cannot sign from this derivation path. Use a BIP44, BIP48, BIP49 "
                "or BIP84 style Testnet account path (purpose'/1'/account'[/script']). "
                "For legacy multisig, use m/48'/1'/0'/0'."))
        raise UserFacingException(_(
            "OneKey cannot sign from this derivation path. Use a BIP44, BIP45, BIP48, BIP49 "
            "or BIP84 style account path (purpose'/coin'/account'[/script'])."))
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
    def __init__(self, path, handler, plugin, *, cancelled=None):
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
        self._unlock_selection = False
        self._requested_mode = None
        self._firmware_cancelled = False
        self._fatal_error = False
        # One-shot proof that bind_keystore() just compared the live xpub. Only the
        # operation that requested the bind may take it (take_bind_token()).
        self._bind_token = None
        self._taken_bind_token = None
        try:
            state = self._call("state", {"connectId": path}, cancelled=cancelled)
            self._check_state(state)
            self.device_id = state["deviceId"]
            self.serial = state["serialNo"]
            self.model = MODELS[state["model"]]
            self.passphrase_enabled = state.get("passphraseEnabled")
            self.attach_pin_enabled = state.get("attachPinEnabled")
            if self.cancelled.is_set() or (cancelled is not None and cancelled.is_set()):
                raise UserCancelled()
            retain = getattr(self.plugin, "retain_client", None)
            if retain is not None:
                retain(self)
        except BaseException:
            if self.cancelled.is_set() or (cancelled is not None and cancelled.is_set()):
                # No client was retained yet. Drop this claim without sweeping
                # other clients or erasing a resumable wallet after cancellation.
                self.closed = self._released = True
                self.helper.release(path, keep_wallet=True)
            else:
                self.close()
            raise

    def attached(self):
        return not self.closed and self.helper.generation == self.generation

    @staticmethod
    def _check_state(state):
        if (type(state) is not dict
                or not {"deviceId", "serialNo", "model"}.issubset(state)
                or not set(state).issubset({"deviceId", "serialNo", "model", "passphraseEnabled",
                                            "attachPinEnabled"})
                or state["model"] not in MODELS
                or type(state["serialNo"]) is not str or not state["serialNo"]):
            raise UserFacingException(_("Unsupported or incomplete OneKey device state."))
        if state["deviceId"] is not None and (type(state["deviceId"]) is not str or not state["deviceId"]):
            raise UserFacingException(_("Unsupported or incomplete OneKey device state."))
        for key in ("passphraseEnabled", "attachPinEnabled"):
            if state.get(key) is not None and type(state[key]) is not bool:
                raise UserFacingException(_("Unsupported or incomplete OneKey device state."))

    def _call(self, op, params, *, cancelled=None):
        if self.closed:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        call_cancelled = self.cancelled
        if cancelled is not None:
            dialog_cancelled = self.cancelled
            call_cancelled = SimpleNamespace(is_set=lambda: dialog_cancelled.is_set() or cancelled.is_set())
        try:
            return self.helper.call(op, params, generation=self.generation,
                                    cancelled=call_cancelled,
                                    on_ui=self._ui)
        except HelperError as error:
            # flow() closes the client when this call belongs to the open wallet.
            # A storage-unlock cancel passes close_on_error=False and must keep it.
            if error.code == "FIRMWARE_CANCELLED":
                self._firmware_cancelled = True
                raise UserCancelled() from None
            if error.code == "CANCELLED":
                self._firmware_cancelled = False
                raise UserCancelled() from None
            if error.code == "PASSPHRASE_DISABLED":
                raise UserFacingException(_(
                    "Passphrase is disabled on this OneKey. Enable passphrase in device settings first."
                )) from None
            if error.code == "ATTACH_PIN_DISABLED":
                raise UserFacingException(_(
                    "No Attach PIN is set on this OneKey. Set one up on the device, or choose another wallet."
                )) from None
            if error.link_failed or error.code in ("DEVICE_MISMATCH", "STALE", "UNSUPPORTED",
                                                   "USB_UNAVAILABLE", "TIMEOUT", "PROTOCOL"):
                self._fatal_error = True
            raise UserFacingException(str(error)) from None

    def _ui(self, event):
        text = {"pin": _("Enter the PIN on your OneKey."),
                "passphrase": _("Enter the passphrase on your OneKey."),
                "passphrase-select": _("Select the hidden wallet on your OneKey. Enter its passphrase on the device."),
                "button": _("Check and confirm on your OneKey.")}.get(event)
        if text and self.handler:
            self.handler.show_message(text, on_cancel=self.cancelled.set)

    @contextmanager
    def flow(self, *, close_on_error=True):
        if self.handler is None:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        previous = self.cancelled
        self.cancelled = threading.Event()
        self._firmware_cancelled = False
        self._fatal_error = False
        try:
            self.handler.show_message(_("Check your OneKey device to continue."), on_cancel=self.cancelled.set)
            yield
        except BaseException as error:
            self._clear_bind_tokens()
            if self._fatal_error or not self.attached():
                self.close()
            elif close_on_error:
                if not self._kept_after_firmware_cancel(error):
                    # Keep the logical client paired in Electrum's DeviceMgr on
                    # recoverable business errors or host/wizard cancellation so
                    # retrying in the wizard never hits "Client for hardware
                    # device was unpaired." Release the USB claim on host cancel
                    # and clear session bindings so nothing leaks across retries.
                    self._reset_session(release_usb=isinstance(error, UserCancelled))
            raise
        finally:
            self._firmware_cancelled = False
            self._fatal_error = False
            self.cancelled = previous
            self.handler.finished()

    def _reset_session(self, *, release_usb=False):
        self.binding = None
        self.account = None
        self._clear_bind_tokens()
        if release_usb and getattr(self.helper, "generation", None) == self.generation:
            release = getattr(self.helper, "release", None)
            if callable(release):
                release(self.connect_id)

    def _kept_after_firmware_cancel(self, error):
        # Only a device-side SESSION_CANCELLED keeps the claimed USB link open.
        # Host/wizard cancellations must release the client and its USB claim.
        return isinstance(error, UserCancelled) and self._firmware_cancelled and self.attached()

    def request_wallet_mode(self, mode):
        # The next open uses this. Unset means the standard wallet; "current" (storage unlock) follows the open session.
        if mode not in ("standard", "current", "attach", "select-hidden"):
            raise UserFacingException(_("Invalid OneKey wallet binding. Reconnect using the wallet wizard."))
        self._requested_mode = mode

    def _select_wallet(self):
        if self.binding is not None:
            return
        self.handler.finished()
        mode = self._requested_mode or "standard"
        self._requested_mode = None
        if mode not in ("standard", "current", "attach", "select-hidden"):
            raise UserCancelled()
        self.binding = check_binding(self._call("open", {"connectId": self.connect_id, "mode": mode}))
        if self.binding["serialNo"] != self.serial:
            self._fatal_error = True
            raise UserFacingException(_("OneKey device identity changed."))
        if self.device_id is None:
            self.device_id = self.binding["deviceId"]
        elif self.binding["deviceId"] != self.device_id:
            self._fatal_error = True
            raise UserFacingException(_("OneKey device identity changed."))

    def _xpub(self, path, xtype, *, account=True, binding=None):
        active_binding = self.binding if binding is None else binding
        response = self._call("xpub", dict(connectId=self.connect_id, binding=active_binding,
                                          coin=coin_name(), path=path, scriptType=INPUT_SCRIPT_TYPES[xtype]))
        if type(response) is not dict or set(response) != {"xpub", "rootFingerprint"} or type(response["xpub"]) is not str:
            raise UserFacingException(_("Invalid OneKey public key response."))
        fingerprint = response["rootFingerprint"]
        if fingerprint is not None and (type(fingerprint) is not int or not 0 <= fingerprint <= 0xffffffff):
            raise UserFacingException(_("Invalid OneKey root fingerprint."))
        # Storage-encryption xpubs are not the open account. Leave its fingerprint alone.
        if account:
            self.root_fingerprint = None if fingerprint is None else fingerprint.to_bytes(4, "big").hex()
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

    def begin_storage_unlock_selection(self):
        # One-shot. The next wallet-file decryption asks again and then restores the account binding.
        if self.closed:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        self._unlock_selection = True

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
            actual = self._xpub(path, xtype, binding=saved)
            if actual != expected:
                raise UserFacingException(_("OneKey account does not match this Electrum wallet."))
            if self.device_id is None:
                self.device_id = saved["deviceId"]
            # Commit binding and account together only after live xpub verification succeeds.
            self.binding = saved
            # Persist only the public wallet identity, never the firmware session or secrets.
            keystore.onekey_binding = dict(self.binding)
            self.account = (path, xtype, expected)
            self._bind_token = object()

    def matches_keystore(self, keystore):
        try:
            if self.closed or self.account is None or type(self.binding) is not dict:
                return False
            saved = check_binding(keystore.onekey_binding)
            if saved != self.binding or saved["serialNo"] != self.serial:
                return False
            xtype = BIP32Node.from_xkey(keystore.xpub).xtype
            path = account_path(keystore.get_derivation_prefix(), xtype)
            return self.account == (path, xtype, normalized_xpub(keystore.xpub, xtype))
        except Exception:
            return False

    def _clear_bind_tokens(self):
        self._bind_token = None
        self._taken_bind_token = None

    def discard_bind_token(self):
        self._clear_bind_tokens()

    def take_bind_token(self):
        """Hand the proof of the bind that just ran to the operation that requested it.

        Anything else that runs first (another lookup, a storage unlock, an error)
        discards the proof, so a later direct call repeats the live xpub check.
        """
        token, self._bind_token = self._bind_token, None
        self._taken_bind_token = token
        return token

    def _verify_account(self, bind_token=None):
        if self.account is None:
            raise UserFacingException(_("Verify the OneKey account before displaying or signing."))
        taken, self._taken_bind_token = self._taken_bind_token, None
        if bind_token is not None and bind_token is taken:
            return
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

    def _release_helper_ref(self, *, scanning=False):
        if self._released:
            return
        self._released = True
        release = getattr(self.plugin, "release_helper", None)
        if release is not None:
            if scanning:
                release(self, scanning=True)
            else:
                release(self)
        elif not scanning and getattr(self.helper, "generation", None) == self.generation:
            shutdown = getattr(self.helper, "shutdown", None)
            if shutdown is not None:
                shutdown()

    @runs_in_hwd_thread
    def close(self):
        self.closed = True
        self.binding = None
        self.account = None
        self._clear_bind_tokens()
        self._drop_device_cache()
        self._release_helper_ref()

    def _detach_without_cache_drop(self):
        # DeviceMgr is iterating clients. Popping that dict raises RuntimeError.
        self.closed = True
        self.binding = None
        self.account = None
        self._clear_bind_tokens()
        self._release_helper_ref(scanning=True)

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
    def has_usable_connection_with_device(self, *, cancelled=None):
        try:
            state = self._call("state", {"connectId": self.connect_id}, cancelled=cancelled)
            self._check_state(state)
            if state["serialNo"] != self.serial:
                self._detach_without_cache_drop()
                return False
            if self.device_id is not None and state["deviceId"] not in (None, self.device_id):
                self._detach_without_cache_drop()
                return False
            self.passphrase_enabled = state.get("passphraseEnabled")
            self.attach_pin_enabled = state.get("attachPinEnabled")
            return True
        except UserCancelled:
            # An abandoned wizard probe is not a lost device. Keep the client paired.
            if cancelled is not None and cancelled.is_set():
                return False
            self._detach_without_cache_drop()
            return False
        except Exception:
            self._detach_without_cache_drop()
            return False

    def _storage_encryption_xpub(self, path):
        # Account encryption keeps the wallet just selected. Opening an encrypted file asks again,
        # and that answer is not stored on the client used by another wallet.
        # A storage unlock is not the operation a pending bind was made for.
        self._clear_bind_tokens()
        force = self._unlock_selection
        self._unlock_selection = False
        saved = (self.binding, self.account, self.device_id, self.root_fingerprint)
        try:
            with self.flow(close_on_error=not force):
                if force:
                    self.binding = None
                    self.account = None
                self._select_wallet()
                return self._xpub(path, "standard", account=False)
        except BaseException:
            if force and self.closed:
                self.close()
            raise
        finally:
            if force and not self.closed:
                self.binding, self.account, self.device_id, self.root_fingerprint = saved
                self._clear_bind_tokens()

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
            if not getattr(self.plugin, "_allow_user_interaction", True):
                if not self.matches_keystore(expected):
                    raise UserCancelled()
                if self.account[:2] != (path, xtype):
                    raise UserCancelled()
                return self.account[2]
            self.bind_keystore(expected)
            if self.account[:2] != (path, xtype):
                self._reset_session(release_usb=False)
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
    def show_address(self, path, script_type, expected_address, multisig=None, *, bind_token=None):
        with self.flow():
            self._verify_account(bind_token)
            request = dict(connectId=self.connect_id, binding=self.binding,
                           coin=coin_name(), path=path, scriptType=INPUT_SCRIPT_TYPES[script_type])
            if multisig is not None:
                request["multisig"] = multisig
            response = self._call("address", request)
            if type(response) is not dict or response != {"address": expected_address}:
                raise UserFacingException(_("OneKey returned a different address. Check the selected wallet."))

    @runs_in_hwd_thread
    def sign_tx(self, inputs, outputs, prev_txes, *, version, lock_time, bind_token=None):
        with self.flow():
            self._verify_account(bind_token)
            response = self._call("sign", dict(connectId=self.connect_id, binding=self.binding,
                                               coin=coin_name(), inputs=inputs, outputs=outputs,
                                               refTxs=list(prev_txes.values()), version=version, locktime=lock_time))
            if type(response) is not dict or set(response) != {"signatures"}:
                raise UserFacingException(_("Invalid OneKey signatures response."))
            return response["signatures"]

    @runs_in_hwd_thread
    def sign_message(self, path, script_type, message, expected_address, *, bind_token=None):
        with self.flow():
            self._verify_account(bind_token)
            response = self._call("sign-message", dict(
                connectId=self.connect_id, binding=self.binding, coin=coin_name(), path=path,
                scriptType=INPUT_SCRIPT_TYPES[script_type], message=message.hex()))
            if (type(response) is not dict or set(response) != {"address", "signature"}
                    or response["address"] != expected_address or type(response["signature"]) is not str):
                raise UserFacingException(_("OneKey returned a different address. Check the selected wallet."))
            try:
                signature = bytes.fromhex(response["signature"])
            except ValueError:
                raise UserFacingException(_("Invalid OneKey signature encoding.")) from None
            if len(signature) != 65:
                raise UserFacingException(_("Invalid OneKey signature encoding."))
            return signature
