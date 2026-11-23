"""Protobuf for the Electrum subset of firmware-pro2 messages.

Bitcoin messages use the legacy field numbers. Device status and the wallet
session use the latest field numbers. Both ride the same proto_link frame.
"""


GET_PUBLIC_KEY = 11
PUBLIC_KEY = 12
SIGN_TX = 15
CANCEL = 20
TX_REQUEST = 21
TX_ACK = 22
LOCK_DEVICE = 24
BUTTON_REQUEST = 26
BUTTON_ACK = 27
GET_ADDRESS = 29
ADDRESS = 30
SIGN_MESSAGE = 38
MESSAGE_SIGNATURE = 40
PROTOCOL_INFO_REQUEST = 60200
PROTOCOL_INFO = 60201
PING = 60206
SUCCESS = 60207
FAILURE = 60208
DEVICE_INFO_GET = 60600
DEVICE_INFO = 60601
DEVICE_STATUS_GET = 60602
DEVICE_STATUS = 60603
DEVICE_SESSION_GET = 61200
DEVICE_SESSION = 61201
DEVICE_SESSION_ASK_PIN = 61202
DEVICE_SESSION_ASK_PASSPHRASE = 61203

PIN_ANY = 1
PIN_MAIN = 2
PIN_ATTACH = 3
SEED_STANDARD = 1
DEVICE_PRO2 = 0x07
DEVICE_NEO = 0x08
TX_INPUT = 0
TX_OUTPUT = 1
TX_META = 2
TX_FINISHED = 3

INPUT_SCRIPTS = {"SPENDADDRESS": 0, "SPENDWITNESS": 3, "SPENDP2SHWITNESS": 4}
OUTPUT_SCRIPTS = {"PAYTOADDRESS": 0, "PAYTOOPRETURN": 3, "PAYTOWITNESS": 4, "PAYTOP2SHWITNESS": 5}
MODELS = {DEVICE_PRO2: "pro2", DEVICE_NEO: "neo"}


def encode_varint(value):
    if value < 0:
        raise ValueError("negative varint")
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        out.append(byte | 0x80 if value else byte)
        if not value:
            return bytes(out)


def _read_varint(data, index):
    value = shift = 0
    while True:
        if index >= len(data) or shift > 63:
            raise ValueError("truncated varint")
        byte = data[index]
        index += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, index
        shift += 7


def decode_fields(payload):
    fields = {}
    index = 0
    while index < len(payload):
        key, index = _read_varint(payload, index)
        field, wire = key >> 3, key & 7
        if wire == 0:
            value, index = _read_varint(payload, index)
        elif wire == 2:
            length, index = _read_varint(payload, index)
            value = payload[index:index + length]
            if len(value) != length:
                raise ValueError("truncated bytes")
            index += length
        elif wire == 1:
            if index + 8 > len(payload):
                raise ValueError("truncated fixed64")
            value = int.from_bytes(payload[index:index + 8], "little")
            index += 8
        elif wire == 5:
            if index + 4 > len(payload):
                raise ValueError("truncated fixed32")
            value = int.from_bytes(payload[index:index + 4], "little")
            index += 4
        else:
            raise ValueError("unsupported wire type")
        fields.setdefault(field, []).append((wire, value))
    return fields


def _key(field, wire):
    return encode_varint((field << 3) | wire)


def enc_uint(field, value):
    return _key(field, 0) + encode_varint(value)


def enc_bool(field, value):
    return enc_uint(field, 1 if value else 0)


def enc_bytes(field, value):
    return _key(field, 2) + encode_varint(len(value)) + value


def enc_str(field, value):
    return enc_bytes(field, value.encode())


def enc_msg(field, value):
    return enc_bytes(field, value)


def _last(fields, field, wire):
    values = [value for item_wire, value in fields.get(field, ()) if item_wire == wire]
    return values[-1] if values else None


def opt_str(fields, field):
    raw = _last(fields, field, 2)
    if raw is None:
        return None
    return raw.decode()


def opt_bool(fields, field):
    value = _last(fields, field, 0)
    if value is None:
        return None
    return bool(value)


def opt_uint(fields, field):
    return _last(fields, field, 0)


def packed_uints(fields, field):
    raw = _last(fields, field, 2)
    if not raw:
        return []
    values = []
    index = 0
    while index < len(raw):
        value, index = _read_varint(raw, index)
        values.append(value)
    return values


def encode_protocol_info_request(eventless=True):
    return enc_bool(1, eventless)


def decode_protocol_info_request(payload):
    return opt_bool(decode_fields(payload), 1)


def encode_ping(message="handshake"):
    return enc_str(1, message)


def encode_device_info_get():
    return enc_msg(1, enc_bool(100, True))


def decode_device_info(payload):
    fields = decode_fields(payload)
    hardware = _last(fields, 100, 2) or b""
    nested = decode_fields(hardware)
    return {"model": MODELS.get(opt_uint(nested, 10)), "serial_no": opt_str(nested, 20)}


def encode_device_info(model, serial_no):
    kind = DEVICE_PRO2 if model == "pro2" else DEVICE_NEO
    hardware = enc_uint(10, kind) + enc_str(20, serial_no)
    return enc_uint(1, 1) + enc_msg(100, hardware)


def encode_status(device_id=None, *, unlocked=False, init_states=True, passphrase_enabled=False,
                  attach_to_pin_enabled=False, unlocked_by_attach_to_pin=False):
    body = b""
    if device_id is not None:
        body += enc_str(1, device_id)
    body += (enc_bool(2, unlocked) + enc_bool(3, init_states) + enc_bool(10, passphrase_enabled)
             + enc_bool(11, attach_to_pin_enabled) + enc_bool(12, unlocked_by_attach_to_pin))
    return body


def decode_status(payload):
    fields = decode_fields(payload)
    device_id = opt_str(fields, 1)
    return {
        "device_id": device_id or None,
        "unlocked": opt_bool(fields, 2),
        "init_states": opt_bool(fields, 3),
        "passphrase_enabled": opt_bool(fields, 10),
        "attach_to_pin_enabled": opt_bool(fields, 11),
        "unlocked_by_attach_to_pin": opt_bool(fields, 12),
    }


def encode_ask_pin(pin_type):
    return enc_uint(1, pin_type)


def decode_ask_pin(payload):
    return opt_uint(decode_fields(payload), 1)


def encode_ask_passphrase(passphrase=None, *, on_device, domains=(SEED_STANDARD,)):
    body = b"" if passphrase is None else enc_str(1, passphrase)
    packed = b"".join(encode_varint(item) for item in domains)
    return body + enc_bool(2, on_device) + enc_bytes(3, packed)


def decode_ask_passphrase(payload):
    fields = decode_fields(payload)
    return opt_str(fields, 1), opt_bool(fields, 2), packed_uints(fields, 3)


# DeviceSessionErrorCode. A resume that misses is InvalidSession and must not
# be treated as a new wallet. UserCancelled is the passphrase or PIN back-out.
SESSION_CANCELLED = 1
SESSION_INVALID = 2


def encode_session_get(btc_test_address=None, session_id=None):
    body = b""
    if session_id:
        body += enc_bytes(1, session_id)
    if btc_test_address:
        body += enc_str(2, btc_test_address)
    return body


def decode_session_get(payload):
    fields = decode_fields(payload)
    return _last(fields, 1, 2), opt_str(fields, 2)


def encode_session(btc_test_address, session_id=None):
    body = enc_bytes(1, session_id) if session_id else b""
    return body + enc_str(2, btc_test_address) + enc_bytes(3, encode_varint(SEED_STANDARD))


def decode_session(payload):
    fields = decode_fields(payload)
    return opt_str(fields, 2), _last(fields, 1, 2)


def decode_failure(payload):
    fields = decode_fields(payload)
    return opt_uint(fields, 1), opt_uint(fields, 2), opt_str(fields, 3)


def _path(address_n):
    return b"".join(enc_uint(1, item) for item in address_n)


def encode_get_public_key(address_n, coin, script_type, show_display):
    return _path(address_n) + enc_bool(3, show_display) + enc_str(4, coin) + enc_uint(5, INPUT_SCRIPTS[script_type])


def decode_get_public_key(payload):
    fields = decode_fields(payload)
    return {
        "address_n": [value for wire, value in fields.get(1, ()) if wire == 0],
        "show_display": opt_bool(fields, 3),
        "coin_name": opt_str(fields, 4),
        "script_type": opt_uint(fields, 5),
    }


def encode_public_key(xpub, root_fingerprint=None):
    node = enc_uint(1, 0) + enc_uint(2, 0) + enc_uint(3, 0) + enc_bytes(4, bytes(32)) + enc_bytes(6, bytes(33))
    body = enc_msg(1, node) + enc_str(2, xpub)
    if root_fingerprint is not None:
        body += enc_uint(3, root_fingerprint)
    return body


def decode_public_key(payload):
    fields = decode_fields(payload)
    return opt_str(fields, 2), opt_uint(fields, 3)


def encode_get_address(address_n, coin, script_type, show_display=True, multisig=None):
    # Field 4 is optional. Singlesig GetAddress stays path, coin, show, script type.
    body = _path(address_n) + enc_str(2, coin) + enc_bool(3, show_display)
    if multisig is not None:
        body += enc_msg(4, encode_multisig(multisig))
    return body + enc_uint(5, INPUT_SCRIPTS[script_type])


def encode_address(address):
    return enc_str(1, address)


def decode_address(payload):
    return opt_str(decode_fields(payload), 1)


def encode_sign_message(address_n, message, coin, script_type, no_script_type):
    # Legacy SignMessage. Field 10 (BIP-322) stays absent: Electrum verifies the
    # Bitcoin Core message, and no_script_type keeps the recovery byte in 27-34.
    body = _path(address_n) + enc_bytes(2, message) + enc_str(3, coin) + enc_uint(4, INPUT_SCRIPTS[script_type])
    if no_script_type:
        body += enc_bool(5, True)
    return body


def decode_sign_message(payload):
    fields = decode_fields(payload)
    return {
        "address_n": [value for wire, value in fields.get(1, ()) if wire == 0],
        "message": _last(fields, 2, 2),
        "coin_name": opt_str(fields, 3),
        "script_type": opt_uint(fields, 4),
        "no_script_type": opt_bool(fields, 5),
        "is_bip322_simple": opt_bool(fields, 10),
    }


def encode_message_signature(address, signature):
    return enc_str(1, address) + enc_bytes(2, signature)


def decode_message_signature(payload):
    fields = decode_fields(payload)
    return opt_str(fields, 1), _last(fields, 2, 2)


def encode_sign_tx(inputs_count, outputs_count, coin, version, lock_time):
    return enc_uint(1, outputs_count) + enc_uint(2, inputs_count) + enc_str(3, coin) + enc_uint(4, version) + enc_uint(5, lock_time)


def decode_sign_tx(payload):
    fields = decode_fields(payload)
    return {
        "outputs_count": opt_uint(fields, 1),
        "inputs_count": opt_uint(fields, 2),
        "coin_name": opt_str(fields, 3),
        "version": opt_uint(fields, 4),
        "lock_time": opt_uint(fields, 5),
    }


def decode_tx_request(payload):
    fields = decode_fields(payload)
    details = decode_fields(_last(fields, 2, 2) or b"")
    serialized = decode_fields(_last(fields, 3, 2) or b"")
    request_type = opt_uint(fields, 1)
    return {
        "request_type": 0 if request_type is None else request_type,
        "request_index": opt_uint(details, 1) or 0,
        "tx_hash": _last(details, 2, 2) or b"",
        "signature_index": opt_uint(serialized, 1),
        "signature": _last(serialized, 2, 2),
    }


def encode_tx_request(request_type, *, index=0, tx_hash=b"", signature=None, signature_index=None):
    body = enc_uint(1, request_type)
    details = enc_uint(1, index)
    if tx_hash:
        details += enc_bytes(2, tx_hash)
    body += enc_msg(2, details)
    if signature is not None:
        serialized = b""
        if signature_index is not None:
            serialized += enc_uint(1, signature_index)
        serialized += enc_bytes(2, signature)
        body += enc_msg(3, serialized)
    return body


def _hash(hex_value):
    return bytes.fromhex(hex_value)


def _hd_node(node):
    # HDNodeType has no private-key field. The node is the account xpub.
    return (enc_uint(1, node["depth"]) + enc_uint(2, node["fingerprint"]) + enc_uint(3, node["child_num"])
            + enc_bytes(4, bytes.fromhex(node["chain_code"])) + enc_bytes(6, bytes.fromhex(node["public_key"])))


def _hd_path(node):
    body = enc_msg(1, _hd_node(node))
    body += b"".join(enc_uint(2, step) for step in node["address_n"])
    return body


def encode_multisig(multisig):
    # Firmware writes the redeem script in this order and does not sort it.
    # Empty signature slots are omitted; the device pads them.
    body = b"".join(enc_msg(1, _hd_path(node)) for node in multisig["pubkeys"])
    return body + enc_uint(3, multisig["m"])


def decode_multisig(payload):
    fields = decode_fields(payload)
    pubkeys = []
    for wire, value in fields.get(1, ()):
        if wire != 2:
            continue
        node_fields = decode_fields(value)
        node = decode_fields(_last(node_fields, 1, 2) or b"")
        pubkeys.append({
            "depth": opt_uint(node, 1),
            "fingerprint": opt_uint(node, 2),
            "child_num": opt_uint(node, 3),
            "chain_code": _last(node, 4, 2),
            "public_key": _last(node, 6, 2),
            "address_n": [item for item_wire, item in node_fields.get(2, ()) if item_wire == 0],
        })
    return {"m": opt_uint(fields, 3), "pubkeys": pubkeys, "signatures": fields.get(2, ())}


def _input(item, *, prev):
    body = b"" if prev else _path(item["address_n"])
    body += enc_bytes(2, _hash(item["prev_hash"])) + enc_uint(3, item["prev_index"])
    if prev:
        body += enc_bytes(4, bytes.fromhex(item["script_sig"]))
    body += enc_uint(5, item["sequence"])
    if not prev:
        body += enc_uint(6, INPUT_SCRIPTS[item["script_type"]])
        if "multisig" in item:
            body += enc_msg(7, encode_multisig(item["multisig"]))
        body += enc_uint(8, int(item["amount"]))
    return body


def _output(item):
    body = b""
    if "address" in item:
        body += enc_str(1, item["address"])
    if "address_n" in item:
        body += b"".join(enc_uint(2, step) for step in item["address_n"])
    body += enc_uint(3, int(item["amount"])) + enc_uint(4, OUTPUT_SCRIPTS[item["script_type"]])
    if "multisig" in item:
        body += enc_msg(5, encode_multisig(item["multisig"]))
    if "op_return_data" in item:
        body += enc_bytes(6, bytes.fromhex(item["op_return_data"]))
    return body


def _bin_output(item):
    return enc_uint(1, int(item["amount"])) + enc_bytes(2, bytes.fromhex(item["script_pubkey"]))


def encode_tx_ack(kind, item=None, *, meta=None):
    if kind == TX_META:
        version, lock_time, inputs_count, outputs_count = meta
        tx = enc_uint(1, version) + enc_uint(4, lock_time) + enc_uint(6, inputs_count) + enc_uint(7, outputs_count)
    elif kind == TX_INPUT:
        tx = enc_msg(2, _input(item, prev=bool(item.get("script_sig") is not None and "address_n" not in item)))
    elif kind == TX_OUTPUT and "script_pubkey" in item:
        tx = enc_msg(3, _bin_output(item))
    else:
        tx = enc_msg(5, _output(item))
    return enc_msg(1, tx)
