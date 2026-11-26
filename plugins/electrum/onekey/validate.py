"""Shared pure-Python validation helpers for Protocol V2 and Electrum adapters.

This module intentionally has zero Electrum or Qt dependencies so it can be
reused by any Python client speaking OneKey Protocol V2.
"""

SECP256K1_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
BINDING_KEYS = frozenset({"serialNo", "deviceId", "walletType", "passphraseState"})


def is_valid_text(value, max_len=256):
    return (
        type(value) is str
        and 0 < len(value) <= max_len
        and not any(ord(ch) < 32 or ord(ch) == 127 for ch in value)
    )


def validate_binding(value):
    """Validate public OneKey wallet binding metadata and return a shallow copy."""
    if type(value) is not dict or set(value) != BINDING_KEYS:
        raise ValueError("invalid binding structure")
    if not is_valid_text(value["serialNo"]) or not is_valid_text(value["deviceId"]):
        raise ValueError("invalid device identity")
    wallet_type = value["walletType"]
    passphrase_state = value["passphraseState"]
    if wallet_type == "standard":
        if passphrase_state is not None:
            raise ValueError("standard binding must not carry passphraseState")
    elif wallet_type == "hidden":
        if not is_valid_text(passphrase_state):
            raise ValueError("hidden binding requires passphraseState")
    else:
        raise ValueError("unsupported walletType")
    return dict(value)


def validate_der_signature(signature, *, low_s=False):
    """Validate canonical ASN.1 DER ECDSA signature bytes (without sighash byte)."""
    if (type(signature) is not bytes or len(signature) < 8
            or signature[0] != 0x30 or signature[1] != len(signature) - 2):
        raise ValueError("invalid DER envelope")
    offset = 2
    for index in range(2):
        if offset + 1 >= len(signature) or signature[offset] != 2:
            raise ValueError("missing DER integer tag")
        size = signature[offset + 1]
        offset += 2
        number = signature[offset:offset + size]
        if not 1 <= size <= 33 or len(number) != size or number[0] & 0x80:
            raise ValueError("invalid DER integer")
        if size > 1 and number[0] == 0 and not number[1] & 0x80:
            raise ValueError("non-minimal DER integer")
        scalar = int.from_bytes(number, "big")
        if not 0 < scalar < SECP256K1_ORDER:
            raise ValueError("DER scalar out of curve order")
        if low_s and index == 1 and scalar > SECP256K1_ORDER // 2:
            raise ValueError("non-canonical high-S signature")
        offset += size
    if offset != len(signature):
        raise ValueError("trailing DER bytes")
    return signature


def parse_der_signature_hex(value, *, low_s=True):
    """Decode lowercase hex DER signature and validate canonical encoding."""
    if type(value) is not str or not 16 <= len(value) <= 144:
        raise ValueError("invalid DER hex length")
    signature = bytes.fromhex(value)
    if signature.hex() != value:
        raise ValueError("non-canonical DER hex")
    return validate_der_signature(signature, low_s=low_s)
