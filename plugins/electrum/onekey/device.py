"""Pro 2 / Neo session used by the Electrum plugin.

The message order follows firmware-pro2: a proto_link Ping, then
ProtocolInfoRequest with eventless_wallet_session before a wallet session,
then the legacy Bitcoin messages.
"""

import importlib
import re

# Electrum mounts this zip as electrum_external_plugins.onekey. A package-level
# "from . import codec" then looks up electrum_external_plugins, which is not a
# module. Importing the sibling by its full name stays inside the mounted package.
codec = importlib.import_module(__package__ + ".codec")
frame = importlib.import_module(__package__ + ".frame")
validate = importlib.import_module(__package__ + ".validate")


STORAGE_ENCRYPTION_PATH = (0x80000000 + 4541509, 0x80000000 + 1112098098)
_PURPOSES = {"SPENDADDRESS": 44, "SPENDP2SHWITNESS": 49, "SPENDWITNESS": 84,
             "PAYTOADDRESS": 44, "PAYTOP2SHWITNESS": 49, "PAYTOWITNESS": 84}
# BIP48 script-type index. 1 is nested p2wsh-p2sh, 2 is native p2wsh.
_BIP48_SCRIPT_INDEX = {"SPENDP2SHWITNESS": 1, "PAYTOP2SHWITNESS": 1,
                       "SPENDWITNESS": 2, "PAYTOWITNESS": 2}

# Failure subcodes belong to the originating request family (firmware-pro2):
# management requests never carry the wallet-session cancel subcode, and only
# DeviceSession* requests report an invalid session.
_MANAGEMENT_CALLS = frozenset((codec.PING, codec.PROTOCOL_INFO_REQUEST, codec.DEVICE_INFO_GET,
                               codec.DEVICE_STATUS_GET))
_SESSION_CALLS = frozenset((codec.DEVICE_SESSION_GET, codec.DEVICE_SESSION_ASK_PIN,
                            codec.DEVICE_SESSION_ASK_PASSPHRASE))
# Older firmware may omit the cancel subcode. Same narrow fallback as
# packages/core DeviceCommands.ts; any other subcode-free ProcessError is a real failure.
_LEGACY_CANCEL_MESSAGE = re.compile(
    r"^(?:cancel(?:led|ed)(?: on device)?|confirm dismissed|update cancel(?:led|ed)"
    r"|user cancel(?:led|ed)(?:\s+.*)?)$",
    re.IGNORECASE,
)


def _is_cancel_failure(msg_type, subcode, message):
    if subcode is None:
        return type(message) is str and bool(_LEGACY_CANCEL_MESSAGE.match(message.strip()))
    return subcode == codec.SESSION_CANCELLED and msg_type not in _MANAGEMENT_CALLS


class SessionError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def _fail(code):
    raise SessionError(code)


def _payload(decode, body):
    # A short or illegal protobuf body is this session failing, not every device.
    try:
        return decode(body)
    except ValueError:
        _fail("PROTOCOL")


def _session_id(value):
    return type(value) is bytes and len(value) == 32 and any(value)


def _text(value, max_len=256):
    if not validate.is_valid_text(value, max_len=max_len):
        _fail("INVALID_REQUEST")


def _uint(value, limit=0xFFFFFFFF):
    if type(value) is not int or value < 0 or value > limit:
        _fail("INVALID_REQUEST")


def _request_index(index, items):
    # bool is an int subclass. A request index has to be a real integer inside the list.
    if type(index) is not int or type(items) is not list or index < 0 or index >= len(items):
        _fail("PROTOCOL")


def _coin_index(coin):
    return 0 if coin == "Bitcoin" else 1


def _path(value, coin, script_type):
    if type(value) is not list or len(value) not in (3, 4, 5, 6):
        _fail("INVALID_REQUEST")
    for item in value:
        _uint(item)
    # m/48'/coin'/account'/script'[/change/index]. Index 1 is nested, index 2 is native.
    if len(value) in (4, 6):
        script_index = _BIP48_SCRIPT_INDEX.get(script_type)
        if (script_index is None or value[0] != 0x80000000 + 48
                or value[1] != 0x80000000 + _coin_index(coin) or value[2] < 0x80000000
                or value[3] != 0x80000000 + script_index
                or (len(value) == 6 and not (value[4] in (0, 1) and value[5] < 0x80000000))):
            _fail("INVALID_REQUEST")
        return
    if any(item < 0x80000000 for item in value[:3]):
        _fail("INVALID_REQUEST")
    if len(value) == 5 and not (value[3] <= 1 and value[4] < 0x80000000):
        _fail("INVALID_REQUEST")
    purpose = _PURPOSES.get(script_type)
    if purpose is None or value[0] != 0x80000000 + purpose or value[1] != 0x80000000 + _coin_index(coin):
        _fail("INVALID_REQUEST")


def _hex_bytes(value, size):
    if (type(value) is not str or len(value) != size * 2
            or any(character not in "0123456789abcdef" for character in value)):
        _fail("INVALID_REQUEST")
    return bytes.fromhex(value)


def _multisig(value, address_n):
    if type(value) is not dict or set(value) != {"m", "pubkeys"} or type(value["pubkeys"]) is not list:
        _fail("INVALID_REQUEST")
    pubkeys = value["pubkeys"]
    if not 1 <= len(pubkeys) <= 15:
        _fail("INVALID_REQUEST")
    _uint(value["m"])
    if not 1 <= value["m"] <= len(pubkeys):
        _fail("INVALID_REQUEST")
    suffix = address_n[-2:]
    seen = set()
    for node in pubkeys:
        if (type(node) is not dict or set(node) != {
                "depth", "fingerprint", "child_num", "chain_code", "public_key", "address_n"}):
            _fail("INVALID_REQUEST")
        _uint(node["depth"], 255)
        _uint(node["fingerprint"])
        _uint(node["child_num"])
        # A depth-0 node is the BIP32 master. Any parent fingerprint or child number means it is not.
        if node["depth"] == 0 and (node["fingerprint"] != 0 or node["child_num"] != 0):
            _fail("INVALID_REQUEST")
        _hex_bytes(node["chain_code"], 32)
        pubkey = _hex_bytes(node["public_key"], 33)
        if pubkey[0] not in (2, 3) or pubkey in seen:
            _fail("INVALID_REQUEST")
        seen.add(pubkey)
        steps = node["address_n"]
        if (type(steps) is not list or len(steps) != 2 or any(type(step) is not int for step in steps)
                or steps != list(suffix) or suffix[0] not in (0, 1) or suffix[1] >= 0x80000000):
            _fail("INVALID_REQUEST")


def _check_signing_items(coin, inputs, outputs):
    if type(inputs) is not list or type(outputs) is not list:
        _fail("INVALID_REQUEST")
    for item in inputs:
        _check_signing_item(coin, item, output=False)
    for item in outputs:
        _check_signing_item(coin, item, output=True)


def _check_signing_item(coin, item, *, output):
    if type(item) is not dict:
        _fail("INVALID_REQUEST")
    script_type = item.get("script_type")
    multisig = item.get("multisig")
    if "address_n" not in item:
        if not output or multisig is not None:
            _fail("INVALID_REQUEST")
        return
    address_n = item["address_n"]
    _path(address_n, coin, script_type)
    if output and "address" in item:
        _fail("INVALID_REQUEST")
    multisig_types = (("PAYTOWITNESS", "PAYTOP2SHWITNESS") if output
                      else ("SPENDWITNESS", "SPENDP2SHWITNESS"))
    if len(address_n) == 6:
        if script_type not in multisig_types or multisig is None:
            _fail("INVALID_REQUEST")
    elif len(address_n) == 5:
        if multisig is not None:
            _fail("INVALID_REQUEST")
    else:
        _fail("INVALID_REQUEST")
    if multisig is not None:
        if script_type not in multisig_types:
            _fail("INVALID_REQUEST")
        _multisig(multisig, address_n)


def _binding(value):
    try:
        validate.validate_binding(value)
    except ValueError:
        _fail("INVALID_REQUEST")


def _check_previous_frames(ref_txs):
    # Reject a previous transaction before SignTx. A later TxAck cannot exceed one frame.
    if type(ref_txs) is not list:
        _fail("INVALID_REQUEST")
    for item in ref_txs:
        if type(item) is not dict:
            _fail("INVALID_REQUEST")
        inputs = item.get("inputs")
        outputs = item.get("bin_outputs")
        if type(inputs) is not list or type(outputs) is not list:
            _fail("INVALID_REQUEST")
        try:
            payloads = [codec.encode_tx_ack(
                codec.TX_META, meta=(item["version"], item["lock_time"], len(inputs), len(outputs)))]
            payloads.extend(codec.encode_tx_ack(codec.TX_INPUT, txin) for txin in inputs)
            payloads.extend(codec.encode_tx_ack(codec.TX_OUTPUT, txout) for txout in outputs)
            for payload in payloads:
                frame.encode_message(codec.TX_ACK, payload, seq=1)
        except (ValueError, KeyError, TypeError):
            _fail("INVALID_REQUEST")


def _sign_budget(inputs, outputs, ref_txs):
    refs = {}
    if type(ref_txs) is list:
        for item in ref_txs:
            if type(item) is dict and type(item.get("hash")) is str:
                refs[item["hash"]] = 1 + len(item.get("inputs") or []) + len(item.get("bin_outputs") or [])
    # With serialization enabled, approve and verify every input, approve and
    # serialize every output, then process TX_FINISHED.
    steps = 2 * len(inputs) + 2 * len(outputs) + 1
    for item in inputs:
        if type(item) is dict:
            steps += refs.get(item.get("prev_hash"), 0)
    # Legacy SIGHASH_ALL re-reads every input/output for each legacy input.
    # SegWit inputs are requested again for serialization and witness signing.
    legacy = sum(item.get("script_type") == "SPENDADDRESS" for item in inputs)
    segwit = sum(item.get("script_type") in ("SPENDWITNESS", "SPENDP2SHWITNESS") for item in inputs)
    return steps + legacy * (len(inputs) + len(outputs)) + 2 * segwit


def _der(signature):
    try:
        validate.validate_der_signature(signature)
    except ValueError:
        _fail("SDK_FAILED")


class Session:
    def __init__(self, link, *, deadline, cancelled, on_ui, cache, connect_id):
        self.link = link
        self.deadline = deadline
        self.cancelled = cancelled
        self.on_ui = on_ui or (lambda _event: None)
        self.cache = cache
        self.connect_id = connect_id
        self._eventless = False

    def handshake(self, *, force=False):
        if not force and getattr(self.link, "handshaked", False):
            return
        self._call(codec.PING, codec.encode_ping("handshake"), codec.SUCCESS)
        if hasattr(self.link, "handshaked"):
            self.link.handshaked = True

    def identity(self):
        status_body = self._call(codec.DEVICE_STATUS_GET, b"", codec.DEVICE_STATUS)
        try:
            status = codec.decode_status(status_body)
        except ValueError:
            raise SessionError("PROTOCOL") from None
        info_body = self._call(codec.DEVICE_INFO_GET, codec.encode_device_info_get(), codec.DEVICE_INFO)
        try:
            info = codec.decode_device_info(info_body)
        except ValueError:
            raise SessionError("PROTOCOL") from None
        if status.get("init_states") is not True or info["model"] not in ("pro2", "neo") or not info["serial_no"]:
            _fail("UNSUPPORTED")
        return status, info

    def state(self):
        status, info = self.identity()
        return {"deviceId": status["device_id"], "serialNo": info["serial_no"], "model": info["model"]}

    def open(self, mode):
        if mode not in ("standard", "select-hidden"):
            _fail("INVALID_REQUEST")
        status, info = self.identity()
        self._eventless_session()
        if mode == "standard":
            # PIN_ANY accepts both Main PIN and Attach PIN natively on the device.
            # If the user unlocked via Attach PIN, follow that active session directly.
            if status.get("unlocked") is not True:
                self._pin(codec.PIN_ANY)
                status, info = self.identity()
            if status.get("unlocked_by_attach_to_pin") is True:
                passphrase_state, session_id = self._session()
                wallet_type = "hidden"
            else:
                if status.get("passphrase_enabled"):
                    self._passphrase("", on_device=False)
                _address, session_id = self._session()
                wallet_type, passphrase_state = "standard", None
        else:
            status, info = self._main_pin(status, info)
            self.on_ui("passphrase-select")
            self._passphrase(None, on_device=True)
            passphrase_state, session_id = self._session()
            wallet_type = "hidden"
        status, info = self.identity()
        if not status["device_id"] or status.get("unlocked") is not True:
            _fail("DEVICE_MISMATCH")
        result = {"deviceId": status["device_id"], "serialNo": info["serial_no"],
                  "walletType": wallet_type, "passphraseState": passphrase_state}
        self._remember(wallet_type, passphrase_state, status["device_id"], session_id,
                       status.get("unlocked_by_attach_to_pin") is True)
        return result

    def xpub(self, binding, coin, path, script_type):
        self._account(binding, coin, path, script_type, address=False)
        status, info = self._ready(binding)
        payload = self._call(codec.GET_PUBLIC_KEY, codec.encode_get_public_key(path, coin, script_type, False), codec.PUBLIC_KEY)
        xpub, fingerprint = _payload(codec.decode_public_key, payload)
        if type(xpub) is not str or not xpub or len(xpub) > 128:
            _fail("SDK_FAILED")
        if fingerprint is not None and not 0 <= fingerprint <= 0xFFFFFFFF:
            _fail("SDK_FAILED")
        self._confirm(binding)
        return {"xpub": xpub, "rootFingerprint": fingerprint}

    def address(self, binding, coin, path, script_type, multisig=None):
        self._account(binding, coin, path, script_type, address=True)
        if len(path) == 6 or multisig is not None:
            if multisig is None or script_type not in ("SPENDWITNESS", "SPENDP2SHWITNESS") or len(path) != 6:
                _fail("INVALID_REQUEST")
            _multisig(multisig, path)
        self._ready(binding)
        text = _payload(codec.decode_address, self._call(
            codec.GET_ADDRESS, codec.encode_get_address(path, coin, script_type, True, multisig), codec.ADDRESS))
        if type(text) is not str or not text or len(text) > 128:
            _fail("SDK_FAILED")
        self._confirm(binding)
        return {"address": text}

    def sign(self, binding, coin, inputs, outputs, ref_txs, version, lock_time):
        _binding(binding)
        if coin not in ("Bitcoin", "Testnet"):
            _fail("INVALID_REQUEST")
        _uint(version, 0x7FFFFFFF)
        _uint(lock_time)
        # Previous transactions are checked by the device as raw inputs. Only the
        # transaction being signed carries BIP48 paths and the redeem script.
        _check_signing_items(coin, inputs, outputs)
        _check_previous_frames(ref_txs)
        self._ready(binding)
        self.on_ui("button")
        signatures = {}
        finished = False
        try:
            request = _payload(codec.decode_tx_request, self._call(codec.SIGN_TX, codec.encode_sign_tx(
                len(inputs), len(outputs), coin, version, lock_time), codec.TX_REQUEST))
            # Firmware walks the current transaction, then each previous transaction,
            # then the inputs again while it returns signatures. Bound the walk by
            # that shape so a normal payment is not cut off at a fixed count.
            for _ in range(_sign_budget(inputs, outputs, ref_txs)):
                if request["signature"] is not None and request["signature_index"] is not None:
                    signatures[request["signature_index"]] = request["signature"]
                if request["request_type"] == codec.TX_FINISHED:
                    finished = True
                    break
                ack = self._ack(request, inputs, outputs, ref_txs, version, lock_time)
                request = _payload(codec.decode_tx_request, self._call(codec.TX_ACK, ack, codec.TX_REQUEST))
            else:
                _fail("SDK_FAILED")
        except BaseException:
            if not finished and getattr(self.link, "_pending", False):
                abort = getattr(self.link, "abort_pending", None)
                if callable(abort):
                    abort()
            raise
        if len(signatures) != len(inputs):
            _fail("SDK_FAILED")
        result = []
        for index in range(len(inputs)):
            signature = signatures.get(index)
            _der(signature)
            result.append({"index": index, "signature": signature.hex()})
        self._confirm(binding)
        return {"signatures": result}

    def sign_message(self, binding, coin, path, script_type, message):
        self._account(binding, coin, path, script_type, address=True)
        if (type(message) is not str or not message or len(message) > 2048 or len(message) % 2
                or any(character not in "0123456789abcdef" for character in message)):
            _fail("INVALID_REQUEST")
        raw = bytes.fromhex(message)
        # firmware-pro2 bitcoin validate_message: 1..1024 bytes. The host does not add the magic prefix.
        if not 1 <= len(raw) <= 1024:
            _fail("INVALID_REQUEST")
        self._ready(binding)
        address, signature = _payload(codec.decode_message_signature, self._call(
            codec.SIGN_MESSAGE, codec.encode_sign_message(path, raw, coin, script_type, True), codec.MESSAGE_SIGNATURE))
        if type(address) is not str or not address or len(address) > 128:
            _fail("SDK_FAILED")
        if type(signature) is not bytes or len(signature) != 65 or not 27 <= signature[0] <= 42:
            _fail("SDK_FAILED")
        self._confirm(binding)
        return {"address": address, "signature": signature.hex()}

    def _ready(self, binding):
        status, info = self.identity()
        if info["serial_no"] != binding["serialNo"]:
            _fail("DEVICE_MISMATCH")
        if status["device_id"] is not None and status["device_id"] != binding["deviceId"]:
            _fail("DEVICE_MISMATCH")
        self._eventless_session()
        # A cache hit is a live resume. Locking clears every SE session while the
        # USB interface stays claimed, and an on-device wallet change keeps the
        # same device_id. The tuple alone cannot prove which seed is loaded.
        if self._resume(binding, status):
            return status, info
        if status.get("unlocked") is not True:
            # PIN_ANY accepts both Main PIN and Attach PIN; the user unlocks
            # whichever wallet they intend and we verify session consistency below.
            self._pin(codec.PIN_ANY)
            status, info = self.identity()
            if self._resume(binding, status):
                return status, info
        kind = binding["walletType"]
        attach = status.get("unlocked_by_attach_to_pin") is True
        if kind == "standard":
            if attach:
                _fail("WALLET_MISMATCH")
            if status.get("passphrase_enabled"):
                self._passphrase("", on_device=False)
            _address, session_id = self._session()
        else:
            # Empty Get inspects the current wallet; an address-only hint can
            # select/create a different wallet and cannot prove ownership.
            restored, session_id = self._session()
            if restored == binding["passphraseState"]:
                self._confirm(binding)
                self._remember(kind, restored, binding["deviceId"], session_id, attach)
                return status, info
            if attach or not status.get("passphrase_enabled"):
                _fail("WALLET_MISMATCH")
            # Address-only Get is a hint. A miss calls SESSION_NEW and returns the
            # new wallet. Resume uses the in-memory session id; after lock the
            # passphrase has to be entered on the device again.
            self.on_ui("passphrase")
            self._passphrase(None, on_device=True)
            restored, session_id = self._session()
            if restored != binding["passphraseState"]:
                # The PIN was right; the passphrase typed on the device opened another wallet.
                _fail("PASSPHRASE_MISMATCH")
        # PIN entry may change initialization identity. Check it before any
        # public key, address or signing command, as well as after the operation.
        self._confirm(binding)
        self._remember(kind, binding["passphraseState"], binding["deviceId"], session_id, attach)
        return status, info

    def _resume(self, binding, status):
        cached = self.cache.get(self.connect_id)
        if type(cached) is not tuple or len(cached) != 5:
            return False
        wallet_type, passphrase_state, device_id, session_id, cached_attach = cached
        wanted = (binding["walletType"], binding["passphraseState"], binding["deviceId"])
        if (wallet_type, passphrase_state, device_id) != wanted or not _session_id(session_id):
            return False
        if status.get("unlocked") is not True or status.get("device_id") != binding["deviceId"]:
            return False
        attach = status.get("unlocked_by_attach_to_pin") is True
        if attach != cached_attach:
            return False
        if binding["walletType"] == "standard" and attach:
            return False
        address = None if binding["walletType"] == "standard" else binding["passphraseState"]
        try:
            opened, new_id = self._session(address, session_id)
        except SessionError as error:
            if error.code != "WALLET_SESSION_INVALID":
                raise
            self.cache.pop(self.connect_id, None)
            return False
        if binding["walletType"] != "standard" and opened != binding["passphraseState"]:
            self.cache.pop(self.connect_id, None)
            return False
        self._remember(wallet_type, passphrase_state, device_id, new_id or session_id, attach)
        return True

    def _session(self, address=None, session_id=None):
        payload = self._call(codec.DEVICE_SESSION_GET, codec.encode_session_get(address, session_id), codec.DEVICE_SESSION)
        opened, new_id = _payload(codec.decode_session, payload)
        if not opened:
            _fail("WALLET_MISMATCH")
        return opened, new_id

    def _remember(self, wallet_type, passphrase_state, device_id, session_id, attach=False):
        if not _session_id(session_id):
            session_id = None
        self.cache[self.connect_id] = (wallet_type, passphrase_state, device_id, session_id, bool(attach))

    def _main_pin(self, status, info):
        # Main PIN while attach-unlocked is the wrong unlock. Firmware relocks and
        # collects the main PIN. An already matching unlock is not prompted again.
        if status.get("unlocked") is True and status.get("unlocked_by_attach_to_pin") is not True:
            return status, info
        self._pin(codec.PIN_MAIN)
        return self.identity()

    def _confirm(self, binding):
        status, info = self.identity()
        if (status.get("unlocked") is not True or status["device_id"] != binding["deviceId"]
                or info["serial_no"] != binding["serialNo"]):
            self.cache.pop(self.connect_id, None)
            _fail("DEVICE_MISMATCH")

    def _eventless_session(self):
        if self._eventless or getattr(self.link, "eventless", False):
            self._eventless = True
            return
        self._call(codec.PROTOCOL_INFO_REQUEST, codec.encode_protocol_info_request(True), codec.PROTOCOL_INFO)
        self._eventless = True
        if hasattr(self.link, "eventless"):
            self.link.eventless = True

    def _pin(self, pin_type):
        self.on_ui("pin")
        self._call(codec.DEVICE_SESSION_ASK_PIN, codec.encode_ask_pin(pin_type), codec.SUCCESS)

    def _passphrase(self, passphrase, *, on_device):
        self._call(codec.DEVICE_SESSION_ASK_PASSPHRASE,
                   codec.encode_ask_passphrase(passphrase, on_device=on_device), codec.SUCCESS)

    def _call(self, msg_type, payload, expect):
        kind, body = self.link.exchange(msg_type, payload, deadline=self.deadline, cancelled=self.cancelled)
        while kind == codec.BUTTON_REQUEST:
            self.on_ui("button")
            kind, body = self.link.exchange(codec.BUTTON_ACK, b"", deadline=self.deadline, cancelled=self.cancelled)
        if kind == codec.FAILURE:
            try:
                code, subcode, message = codec.decode_failure(body)
            except ValueError:
                raise SessionError("PROTOCOL") from None
            if code == 5:
                # msg_type is still the originating request when a ButtonAck relayed the reply.
                if subcode == codec.SESSION_INVALID and msg_type in _SESSION_CALLS:
                    _fail("WALLET_SESSION_INVALID")
                if _is_cancel_failure(msg_type, subcode, message):
                    _fail("FIRMWARE_CANCELLED")
            _fail("SDK_FAILED")
        if kind != expect:
            _fail("PROTOCOL")
        return body

    def _ack(self, request, inputs, outputs, ref_txs, version, lock_time):
        kind = request["request_type"]
        index = request["request_index"]
        previous = self._previous(ref_txs, request["tx_hash"]) if request["tx_hash"] else None
        if kind == codec.TX_INPUT:
            items = inputs if previous is None else previous.get("inputs") if type(previous) is dict else None
            _request_index(index, items)
            return codec.encode_tx_ack(kind, items[index])
        if kind == codec.TX_OUTPUT:
            items = outputs if previous is None else previous.get("bin_outputs") if type(previous) is dict else None
            _request_index(index, items)
            return codec.encode_tx_ack(kind, items[index])
        if kind == codec.TX_META:
            if previous:
                meta = (previous["version"], previous["lock_time"], len(previous["inputs"]), len(previous["bin_outputs"]))
            else:
                meta = (version, lock_time, len(inputs), len(outputs))
            return codec.encode_tx_ack(kind, meta=meta)
        _fail("SDK_FAILED")

    @staticmethod
    def _previous(ref_txs, tx_hash):
        display = tx_hash.hex()
        for item in ref_txs:
            if item["hash"] == display:
                return item
        _fail("SDK_FAILED")

    @staticmethod
    def _account(binding, coin, path, script_type, *, address):
        _binding(binding)
        if coin not in ("Bitcoin", "Testnet"):
            _fail("INVALID_REQUEST")
        storage = tuple(path) == STORAGE_ENCRYPTION_PATH if type(path) is list else False
        if storage:
            if address or script_type != "SPENDADDRESS":
                _fail("INVALID_REQUEST")
            return
        _path(path, coin, script_type)
        if script_type not in codec.INPUT_SCRIPTS:
            _fail("INVALID_REQUEST")
        if address:
            if len(path) == 5 or (len(path) == 6 and script_type in ("SPENDWITNESS", "SPENDP2SHWITNESS")):
                return
        elif len(path) == 3 or (len(path) == 4 and script_type in ("SPENDWITNESS", "SPENDP2SHWITNESS")):
            return
        _fail("INVALID_REQUEST")
