import unittest
from unittest import mock

from onekeylib import btc, client, exceptions, messages, models
from onekeylib.mapping import DEFAULT_MAPPING
from onekeylib.protocol_v2 import OneKeyClientV2
from onekeylib.transport.protolink import ProtoLinkTransport

SUPPORTED_V2 = [60200, 60600, 60602, 61200, 61202, 61203]


class FakeProtoLinkTransport(ProtoLinkTransport):
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []
        self._opened = 0
        self.closed = False

    def get_path(self) -> str:
        return "onekey:1:1"

    def _open(self) -> None:
        self.closed = False

    def _close(self) -> None:
        self.closed = True

    def write_message(self, wire_type: int, payload: bytes) -> None:
        self.requests.append(DEFAULT_MAPPING.decode(wire_type, payload))

    def read_message(self, *, timeout=120.0, cancelled=None):
        return DEFAULT_MAPPING.encode(self.responses.pop(0))


def make_status(**kwargs):
    fields = dict(
        device_id="pro2-dev-1",
        init_states=True,
        unlocked=True,
        passphrase_enabled=False,
        unlocked_by_attach_to_pin=False,
    )
    fields.update(kwargs)
    return messages.DeviceStatus(**fields)


def make_session_msg(**kwargs):
    fields = dict(
        session_id=b"s" * 32,
        btc_test_address="1OneKeyTestWalletAddr",
        seed_domains=[1],
    )
    fields.update(kwargs)
    return messages.DeviceSession(**fields)


class TestProtocolV2(unittest.TestCase):
    def make_client(self, extra_responses=(), *, device_type=7, status=None):
        responses = [
            messages.V2Success(message="handshake"),
            messages.ProtocolInfo(
                version=1,
                build_fingerprint="app__pro2",
                supported_messages=SUPPORTED_V2,
            ),
            messages.DeviceInfo(
                protocol_version=1,
                hw=messages.DeviceHardwareInfo(device_type=device_type, serial_no="P2D34J0018B"),
            ),
            status or make_status(),
            *extra_responses,
        ]
        transport = FakeProtoLinkTransport(responses)
        app = client.AppManifest(app_name="test")
        c = client.get_client(app, transport)
        self.assertIsInstance(c, OneKeyClientV2)
        return c, transport

    def test_pro2_and_neo_features(self):
        for dev_type, expected_model in ((7, models.PRO_2), (8, models.NEO)):
            with self.subTest(device_type=dev_type):
                c, transport = self.make_client(device_type=dev_type)
                features = c.refresh_features()
                self.assertEqual(expected_model, c.model)
                self.assertEqual("onekey.so", features.vendor)
                self.assertEqual("pro2-dev-1", features.device_id)
                self.assertTrue(features.initialized)
                self.assertEqual("P2D34J0018B", c.serial_no)

    def test_attach_pin_unlock_via_pin_any(self):
        c, transport = self.make_client(
            extra_responses=[
                make_status(unlocked=False, passphrase_enabled=None, unlocked_by_attach_to_pin=None),
                messages.V2Success(),
                make_status(unlocked=True, passphrase_enabled=True, unlocked_by_attach_to_pin=True),
                make_session_msg(),
            ]
        )
        sess = c.get_session(passphrase=client.PassphraseSetting.AUTO)
        self.assertTrue(sess.attach_pin)
        self.assertEqual(b"s" * 32, sess.id)
        ask_pins = [r for r in transport.requests if isinstance(r, messages.DeviceSessionAskPin)]
        self.assertEqual(1, len(ask_pins))
        self.assertEqual(int(messages.OneKeyPinType.ANY), ask_pins[0].type)
        # Attach PIN must not send AskPassphrase
        self.assertFalse(any(isinstance(r, messages.DeviceSessionAskPassphrase) for r in transport.requests))

    def test_btc_get_address_and_device_cancel_preserves_link(self):
        c, transport = self.make_client(
            extra_responses=[
                make_status(),
                make_session_msg(),
                # btc.get_address call
                make_status(),
                messages.ButtonRequest(),
                messages.Address(address="bc1qonekeytestaddress"),
                # Second call cancelled on device
                make_status(),
                messages.V2Failure(code=5, subcode=1, message="User cancelled"),
            ]
        )
        sess = c.get_session(passphrase=client.PassphraseSetting.STANDARD_WALLET)
        addr = btc.get_address(
            sess,
            "Bitcoin",
            [0x80000054, 0x80000000, 0x80000000, 0, 0],
            show_display=True,
            script_type=messages.InputScriptType.SPENDWITNESS,
        )
        self.assertEqual("bc1qonekeytestaddress", addr)
        self.assertTrue(any(isinstance(r, messages.ButtonAck) for r in transport.requests))

        with self.assertRaises(exceptions.Cancelled):
            btc.get_address(
                sess,
                "Bitcoin",
                [0x80000054, 0x80000000, 0x80000000, 0, 1],
                show_display=True,
                script_type=messages.InputScriptType.SPENDWITNESS,
            )
        # Device-side cancel should NOT send Cancel back
        self.assertFalse(any(isinstance(r, messages.Cancel) for r in transport.requests))
