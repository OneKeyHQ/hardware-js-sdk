"""CRC-8 used by firmware-pro2 proto_link. Init byte is 0x30."""

CRC8_INIT = 0x30

_CRC8_TABLE = bytes.fromhex(
    "005ebce2613fdd83c29c7e20a3fd1f41"
    "9dc3217ffca2401e5f01e3bd3e6082dc"
    "237d9fc1421cfea0e1bf5d0380de3c62"
    "bee0025cdf81633d7c22c09e1d43a1ff"
    "4618faa427799bc584da3866e5bb5907"
    "db856739bae406581947a5fb7826c49a"
    "653bd987045ab8e6a7f91b45c6987a24"
    "f8a6441a99c7257b3a6486d85b05e7b9"
    "8cd2306eedb3510f4e10f2ac2f7193cd"
    "114fadf3702ecc92d38d6f31b2ec0e50"
    "aff1134dce90722c6d33d18f0c52b0ee"
    "326c8ed0530defb1f0ae4c1291cf2d73"
    "ca947628abf517490856b4ea6937d58b"
    "5709ebb536688ad495cb2977f4aa4816"
    "e9b7550b88d6346a2b7597c94a14f6a8"
    "742ac896154ba9f7b6e80a54d7896b35"
)


def crc8(data, init=CRC8_INIT):
    value = init
    for byte in data:
        value = _CRC8_TABLE[value ^ byte]
    return value
