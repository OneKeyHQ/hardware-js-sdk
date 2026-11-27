"""Shared pure-Python validation helpers for Protocol V2 and Electrum adapters.

This module intentionally has zero Electrum or Qt dependencies so it can be
reused by any Python client speaking OneKey Protocol V2.
"""

SECP256K1_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
BINDING_KEYS = frozenset({"serialNo", "deviceId", "walletType", "passphraseState"})
HARDENED = 0x80000000
SLIP44_BITCOIN = 0
SLIP44_TESTNET = 1


def _firmware_path_schemas(slip44):
    """Bitcoin keychain schemas of firmware-pro2 (app/bitcoin/keychain.py).

    GetAddress and SignTx reject a single-signature path outside these, even with
    safety checks relaxed, and strict safety checks reject multisig paths too.
    A path that fits a schema of another script type is still signed after the
    device shows its non-standard path warning. GetPublicKey accepts any path,
    so an xpub alone does not prove that the account can sign.
    Each entry is (components, trailing); a component is an inclusive (low, high).
    """
    h = HARDENED
    coin_h, coin = (h + slip44, h + slip44), (slip44, slip44)
    account_h, account = (h, 0xFFFFFFFF), (0, h - 1)
    change, index, any_unhardened = (0, 1), (0, h - 1), (0, h - 1)

    def hard(value):
        return (h + value, h + value)

    schemas = [
        ([hard(44), coin_h, account_h, change], any_unhardened),  # BIP44 ".../change/*"
        ([hard(48), coin_h, account_h, hard(0), change, index], None),  # BIP48 raw
        ([hard(48), coin_h, account_h, hard(1), change, index], None),  # BIP48 p2sh-segwit
        ([hard(48), coin_h, account_h, hard(2), change, index], None),  # BIP48 segwit
        ([hard(49), coin_h, account_h, change, index], None),
        ([hard(84), coin_h, account_h, change, index], None),
        ([hard(86), coin_h, account_h, change, index], None),
        # Compatibility patterns for "Bitcoin", "Testnet" and "Regtest".
        ([(49, 49), coin, account, change, index], None),  # Casa
        ([hard(45), coin_h, account_h, (0, 1000000), change, index], None),  # Unchained
        ([hard(45), coin, account, (0, 1000000), change, index], None),
        ([hard(45), coin_h, account_h, (0, 1000000), index], None),  # Unchained, deprecated
    ]
    if slip44 == SLIP44_BITCOIN:
        # BIP45 has no coin_type field, so the firmware allows it only for Bitcoin.
        schemas.append(([hard(45), (0, 100), change, index], None))
    return schemas


def firmware_path_allowed(path, slip44):
    """True when firmware-pro2 can show an address or sign at this full path."""
    if (type(path) not in (list, tuple) or not 1 <= len(path) <= 10
            or any(type(item) is not int or not 0 <= item <= 0xFFFFFFFF for item in path)):
        return False
    for components, trailing in _firmware_path_schemas(slip44):
        if len(path) < len(components) or (trailing is None and len(path) != len(components)):
            continue
        if (all(low <= value <= high for value, (low, high) in zip(path, components))
                and all(trailing[0] <= value <= trailing[1] for value in path[len(components):])):
            return True
    return False


def firmware_account_allowed(prefix, slip44):
    """True when every Electrum address under prefix (prefix/change/index) can sign."""
    if type(prefix) not in (list, tuple):
        return False
    prefix = list(prefix)
    return all(firmware_path_allowed(prefix + [change, index], slip44)
               for change in (0, 1) for index in (0, HARDENED - 1))


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
    elif wallet_type in ("hidden", "attach-pin"):
        if not is_valid_text(passphrase_state):
            raise ValueError("hidden binding requires passphraseState")
    else:
        raise ValueError("unsupported walletType")
    result = dict(value)
    if wallet_type == "attach-pin":
        # Earlier builds saved Attach PIN wallets as "attach-pin". It is the same
        # public identity as "hidden"; the live xpub check still proves the account.
        result["walletType"] = "hidden"
    return result


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
