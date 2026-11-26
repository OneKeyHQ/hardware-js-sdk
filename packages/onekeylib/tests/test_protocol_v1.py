import struct
import unittest

from onekeylib import btc, client, messages, models
from onekeylib.mapping import DEFAULT_MAPPING
from onekeylib.protocol_v1 import OneKeyClientV1
from onekeylib.transport import Transport


class FakeV1Transport(Transport):
    PATH_PREFIX = "fakev1"
    CHUNK_SIZE = 64
    ENABLED = True

    def __init__(self, responses):
        self._chunks = []
        for msg in responses:
            wire_type, payload = DEFAULT_MAPPING.encode(msg)
            raw = b"##" + struct.pack(">HL", wire_type, len(payload)) + payload
            for i in range(0, len(raw), 63):
                chunk = b"?" + raw[i : i + 63]
                self._chunks.append(chunk.ljust(64, b"\x00"))
        self.written = []
        self._opened = 0

    def get_path(self) -> str:
        return "fakev1:1"

    def is_open(self) -> bool:
        return self._opened > 0

    def _open(self) -> None:
        pass

    def _close(self) -> None:
        pass

    def write_chunk(self, chunk: bytes, /) -> None:
        self.written.append(chunk)

    def read_chunk(self, *, timeout=None) -> bytes:
        return self._chunks.pop(0)


class TestProtocolV1(unittest.TestCase):
    def test_v1_classic_features_and_btc_get_address(self):
        features = messages.Features(
            vendor="onekey.so",
            major_version=3,
            minor_version=10,
            patch_version=0,
            device_id="classic1s-dev",
            session_id=b"\x01" * 32,
            initialized=True,
            unlocked=True,
            passphrase_protection=False,
            model="Classic1S",
            internal_model="Classic1S",
            capabilities=[messages.Capability.Bitcoin],
        )
        root_pubkey = messages.PublicKey(
            node=messages.HDNodeType(
                depth=1,
                fingerprint=0x11223344,
                child_num=0x80000000,
                chain_code=b"\x00" * 32,
                public_key=b"\x02" + b"\x01" * 32,
            ),
            xpub="xpub6test",
        )
        transport = FakeV1Transport([
            features,
            features,
            root_pubkey,
            features,
            messages.Address(address="bc1qclassic1saddress"),
        ])
        app = client.AppManifest(app_name="test")
        c = client.get_client(app, transport)
        self.assertIsInstance(c, OneKeyClientV1)
        c.refresh_features()
        self.assertEqual(models.CLASSIC_1S, c.model)

        sess = c.get_session(passphrase=client.PassphraseSetting.STANDARD_WALLET)
        addr = btc.get_address(
            sess,
            "Bitcoin",
            [0x80000054, 0x80000000, 0x80000000, 0, 0],
            show_display=False,
            script_type=messages.InputScriptType.SPENDWITNESS,
        )
        self.assertEqual("bc1qclassic1saddress", addr)
