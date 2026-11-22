"""Pro 2 / Neo session used by the Electrum plugin.

The message order follows firmware-pro2: a proto_link Ping, then
ProtocolInfoRequest with eventless_wallet_session before a wallet session,
then the legacy Bitcoin messages.
"""

import importlib

# Electrum mounts this zip as electrum_external_plugins.onekey. A package-level
# "from . import codec" then looks up electrum_external_plugins, which is not a
# module. Importing the sibling by its full name stays inside the mounted package.
codec = importlib.import_module(__package__ + ".codec")


STORAGE_ENCRYPTION_PATH = (0x80000000 + 4541509, 0x80000000 + 1112098098)
_PURPOSES = {"SPENDADDRESS": 44, "SPENDP2SHWITNESS": 49, "SPENDWITNESS": 84,
             "PAYTOADDRESS": 44, "PAYTOP2SHWITNESS": 49, "PAYTOWITNESS": 84}


class SessionError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def _fail(code):
    raise SessionError(code)


def _session_id(value):
    return type(value) is bytes and len(value) == 32 and any(value)


def _text(value, max_len=256):
    if type(value) is not str or not value or len(value) > max_len or any(ord(ch) < 32 or ord(ch) == 127 for ch in value):
        _fail("INVALID_REQUEST")


def _uint(value, limit=0xFFFFFFFF):
    if type(value) is not int or value < 0 or value > limit:
        _fail("INVALID_REQUEST")


def _path(value, coin, script_type):
    if type(value) is not list or len(value) not in (3, 5):
        _fail("INVALID_REQUEST")
    for item in value:
        _uint(item)
    if any(item < 0x80000000 for item in value[:3]):
        _fail("INVALID_REQUEST")
    if len(value) == 5 and not (value[3] <= 1 and value[4] < 0x80000000):
        _fail("INVALID_REQUEST")
    purpose = _PURPOSES.get(script_type)
    if purpose is None or value[0] != 0x80000000 + purpose or value[1] != 0x80000000 + (0 if coin == "Bitcoin" else 1):
        _fail("INVALID_REQUEST")


def _binding(value):
    if type(value) is not dict or set(value) != {"serialNo", "deviceId", "walletType", "passphraseState"}:
        _fail("INVALID_REQUEST")
    _text(value["serialNo"])
    _text(value["deviceId"])
    if value["walletType"] == "standard":
        if value["passphraseState"] is not None:
            _fail("INVALID_REQUEST")
    elif value["walletType"] in ("hidden", "attach-pin"):
        _text(value["passphraseState"])
    else:
        _fail("INVALID_REQUEST")


def _sign_budget(inputs, outputs, ref_txs):
    refs = {}
    if type(ref_txs) is list:
        for item in ref_txs:
            if type(item) is dict and type(item.get("hash")) is str:
                refs[item["hash"]] = 1 + len(item.get("inputs") or []) + len(item.get("bin_outputs") or [])
    # One pass over the new transaction, the previous transaction again for
    # every input, then the inputs once more while signatures come back.
    steps = len(inputs) + len(outputs) + len(inputs) + 1
    for item in inputs:
        if type(item) is dict:
            steps += refs.get(item.get("prev_hash"), 0)
    # Legacy SIGHASH_ALL re-reads every input/output for each legacy input,
    # followed by the final output serialization pass.
    legacy = sum(item.get("script_type") == "SPENDADDRESS" for item in inputs)
    return steps + legacy * (len(inputs) + len(outputs)) + len(outputs) + 4


def _der(signature):
    if type(signature) is not bytes or len(signature) < 8 or signature[0] != 0x30 or signature[1] != len(signature) - 2:
        _fail("SDK_FAILED")
    offset = 2
    for _ in range(2):
        if offset >= len(signature) or signature[offset] != 2:
            _fail("SDK_FAILED")
        size = signature[offset + 1]
        offset += 2
        number = signature[offset:offset + size]
        if not 1 <= size <= 33 or len(number) != size or number[0] & 0x80 or not any(number):
            _fail("SDK_FAILED")
        if size > 1 and number[0] == 0 and not number[1] & 0x80:
            _fail("SDK_FAILED")
        offset += size
    if offset != len(signature):
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

    def handshake(self):
        self._call(codec.PING, codec.encode_ping("handshake"), codec.SUCCESS)

    def identity(self):
        status = codec.decode_status(self._call(codec.DEVICE_STATUS_GET, b"", codec.DEVICE_STATUS))
        info = codec.decode_device_info(self._call(codec.DEVICE_INFO_GET, codec.encode_device_info_get(), codec.DEVICE_INFO))
        if status.get("init_states") is not True or info["model"] not in ("pro2", "neo") or not info["serial_no"]:
            _fail("UNSUPPORTED")
        return status, info

    def state(self):
        status, info = self.identity()
        return {"deviceId": status["device_id"], "serialNo": info["serial_no"], "model": info["model"]}

    def open(self, mode):
        if mode not in ("standard", "select-hidden", "select-attach-pin"):
            _fail("INVALID_REQUEST")
        status, info = self.identity()
        self._eventless_session()
        if mode == "standard":
            status, info = self._main_pin(status, info)
            if status.get("passphrase_enabled"):
                self._passphrase("", on_device=False)
            _address, session_id = self._session()
            wallet_type, passphrase_state = "standard", None
        elif mode == "select-hidden":
            status, info = self._main_pin(status, info)
            self.on_ui("passphrase-select")
            self._passphrase(None, on_device=True)
            passphrase_state, session_id = self._session()
            wallet_type = "hidden"
        else:
            # An explicit selection must allow choosing another Attach PIN slot.
            if status.get("unlocked_by_attach_to_pin") is True:
                self._call(codec.LOCK_DEVICE, b"", codec.SUCCESS)
                status, info = self.identity()
                if status.get("unlocked") is not False:
                    _fail("WALLET_MISMATCH")
            status, info = self._attach_pin(status, info)
            passphrase_state, session_id = self._session()
            wallet_type = "attach-pin"
        status, info = self.identity()
        if not status["device_id"] or status.get("unlocked") is not True:
            _fail("DEVICE_MISMATCH")
        result = {"deviceId": status["device_id"], "serialNo": info["serial_no"],
                  "walletType": wallet_type, "passphraseState": passphrase_state}
        self._remember(wallet_type, passphrase_state, status["device_id"], session_id)
        return result

    def xpub(self, binding, coin, path, script_type):
        self._account(binding, coin, path, script_type, address=False)
        status, info = self._ready(binding)
        payload = self._call(codec.GET_PUBLIC_KEY, codec.encode_get_public_key(path, coin, script_type, False), codec.PUBLIC_KEY)
        xpub, fingerprint = codec.decode_public_key(payload)
        if type(xpub) is not str or not xpub or len(xpub) > 128:
            _fail("SDK_FAILED")
        if fingerprint is not None and not 0 <= fingerprint <= 0xFFFFFFFF:
            _fail("SDK_FAILED")
        self._confirm(binding)
        return {"xpub": xpub, "rootFingerprint": fingerprint}

    def address(self, binding, coin, path, script_type):
        self._account(binding, coin, path, script_type, address=True)
        self._ready(binding)
        text = codec.decode_address(self._call(
            codec.GET_ADDRESS, codec.encode_get_address(path, coin, script_type, True), codec.ADDRESS))
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
        self._ready(binding)
        self.on_ui("button")
        request = codec.decode_tx_request(self._call(codec.SIGN_TX, codec.encode_sign_tx(
            len(inputs), len(outputs), coin, version, lock_time), codec.TX_REQUEST))
        signatures = {}
        # Firmware walks the current transaction, then each previous transaction,
        # then the inputs again while it returns signatures. Bound the walk by
        # that shape so a normal payment is not cut off at a fixed count.
        for _ in range(_sign_budget(inputs, outputs, ref_txs)):
            if request["signature"] is not None and request["signature_index"] is not None:
                signatures[request["signature_index"]] = request["signature"]
            if request["request_type"] == codec.TX_FINISHED:
                break
            ack = self._ack(request, inputs, outputs, ref_txs, version, lock_time)
            request = codec.decode_tx_request(self._call(codec.TX_ACK, ack, codec.TX_REQUEST))
        else:
            _fail("SDK_FAILED")
        if len(signatures) != len(inputs):
            _fail("SDK_FAILED")
        result = []
        for index in range(len(inputs)):
            signature = signatures.get(index)
            _der(signature)
            result.append({"index": index, "signature": signature.hex()})
        self._confirm(binding)
        return {"signatures": result}

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
        kind = binding["walletType"]
        if kind == "standard":
            status, info = self._main_pin(status, info)
            if status.get("passphrase_enabled"):
                self._passphrase("", on_device=False)
            _address, session_id = self._session()
        elif kind == "hidden":
            if status.get("unlocked") is True:
                # Empty Get inspects the current wallet; an address-only hint can
                # select/create a different wallet and cannot prove ownership.
                restored, session_id = self._session()
                if restored == binding["passphraseState"]:
                    self._confirm(binding)
                    self._remember(kind, restored, binding["deviceId"], session_id)
                    return status, info
            if status.get("unlocked") is not True or status.get("unlocked_by_attach_to_pin") is True:
                self._pin(codec.PIN_MAIN)
                status, info = self.identity()
            if self._resume(binding, status):
                return status, info
            # Address-only Get is a hint. A miss calls SESSION_NEW and returns the
            # new wallet. Resume uses the in-memory session id; after lock the
            # passphrase has to be entered on the device again.
            self.on_ui("passphrase")
            self._passphrase(None, on_device=True)
            restored, session_id = self._session()
            if restored != binding["passphraseState"]:
                _fail("WALLET_MISMATCH")
        else:
            status, info = self._attach_pin(status, info)
            restored, session_id = self._session()
            if restored != binding["passphraseState"]:
                _fail("WALLET_MISMATCH")
        # PIN entry may change initialization identity. Check it before any
        # public key, address or signing command, as well as after the operation.
        self._confirm(binding)
        self._remember(kind, binding["passphraseState"], binding["deviceId"], session_id)
        return status, info

    def _resume(self, binding, status):
        cached = self.cache.get(self.connect_id)
        if type(cached) is not tuple or len(cached) != 4:
            return False
        wallet_type, passphrase_state, device_id, session_id = cached
        wanted = (binding["walletType"], binding["passphraseState"], binding["deviceId"])
        if (wallet_type, passphrase_state, device_id) != wanted or not _session_id(session_id):
            return False
        if status.get("unlocked") is not True or status.get("device_id") != binding["deviceId"]:
            return False
        attach = status.get("unlocked_by_attach_to_pin") is True
        if binding["walletType"] == "attach-pin":
            if not attach:
                return False
        elif attach:
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
        self._remember(wallet_type, passphrase_state, device_id, new_id or session_id)
        return True

    def _session(self, address=None, session_id=None):
        payload = self._call(codec.DEVICE_SESSION_GET, codec.encode_session_get(address, session_id), codec.DEVICE_SESSION)
        opened, new_id = codec.decode_session(payload)
        if not opened:
            _fail("WALLET_MISMATCH")
        return opened, new_id

    def _remember(self, wallet_type, passphrase_state, device_id, session_id):
        if not _session_id(session_id):
            session_id = None
        self.cache[self.connect_id] = (wallet_type, passphrase_state, device_id, session_id)

    def _main_pin(self, status, info):
        # Main PIN while attach-unlocked is the wrong unlock. Firmware relocks and
        # collects the main PIN. An already matching unlock is not prompted again.
        if status.get("unlocked") is True and status.get("unlocked_by_attach_to_pin") is not True:
            return status, info
        self._pin(codec.PIN_MAIN)
        return self.identity()

    def _attach_pin(self, status, info):
        if status.get("unlocked_by_attach_to_pin") is True:
            return status, info
        self._pin(codec.PIN_ATTACH)
        status, info = self.identity()
        if status.get("unlocked_by_attach_to_pin") is not True:
            _fail("WALLET_MISMATCH")
        return status, info

    def _confirm(self, binding):
        status, info = self.identity()
        if (status.get("unlocked") is not True or status["device_id"] != binding["deviceId"]
                or info["serial_no"] != binding["serialNo"]):
            self.cache.pop(self.connect_id, None)
            _fail("DEVICE_MISMATCH")

    def _eventless_session(self):
        if self._eventless:
            return
        self._call(codec.PROTOCOL_INFO_REQUEST, codec.encode_protocol_info_request(True), codec.PROTOCOL_INFO)
        self._eventless = True

    def _pin(self, pin_type):
        self.on_ui("attach-pin" if pin_type == codec.PIN_ATTACH else "pin")
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
            _code, subcode, _message = codec.decode_failure(body)
            if subcode == codec.SESSION_INVALID:
                _fail("WALLET_SESSION_INVALID")
            if subcode == codec.SESSION_CANCELLED:
                _fail("CANCELLED")
            _fail("SDK_FAILED")
        if kind != expect:
            _fail("PROTOCOL")
        return body

    def _ack(self, request, inputs, outputs, ref_txs, version, lock_time):
        kind = request["request_type"]
        index = request["request_index"]
        previous = self._previous(ref_txs, request["tx_hash"]) if request["tx_hash"] else None
        if kind == codec.TX_INPUT:
            item = previous["inputs"][index] if previous else inputs[index]
            return codec.encode_tx_ack(kind, item)
        if kind == codec.TX_OUTPUT:
            item = previous["bin_outputs"][index] if previous else outputs[index]
            return codec.encode_tx_ack(kind, item)
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
        if address and len(path) != 5:
            _fail("INVALID_REQUEST")
