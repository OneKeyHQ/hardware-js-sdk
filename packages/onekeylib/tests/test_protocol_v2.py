import unittest
from unittest import mock

from onekeylib import btc, client, exceptions, messages, models, tools
from onekeylib.mapping import DEFAULT_MAPPING
from onekeylib.protocol_v2 import OneKeyClientV2
from onekeylib.transport import TransportException
from onekeylib.transport.protolink import ProtoLinkTransport
from onekeylib.transport.udp import UdpTransport

SUPPORTED_V2 = [60200, 60600, 60602, 61200, 61202, 61203]


class FakeProtoLinkTransport(ProtoLinkTransport):
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []
        self._opened = 0
        self.closed = False
        self._seq = 0

    def get_path(self) -> str:
        return "onekey:1:1"

    def is_open(self) -> bool:
        return not self.closed

    def _open(self) -> None:
        self.closed = False

    def _close(self) -> None:
        self.closed = True

    def write_message(self, wire_type: int, payload: bytes) -> int:
        self._seq = (self._seq % 255) + 1
        self.requests.append(DEFAULT_MAPPING.decode(wire_type, payload))
        return self._seq

    def read_message(self, *, timeout=120.0, cancelled=None, expected_ack_seq=None):
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

    def test_pro2_and_neo_features_and_v2_ping(self):
        for dev_type, expected_model in ((7, models.PRO_2), (8, models.NEO)):
            with self.subTest(device_type=dev_type):
                c, transport = self.make_client(
                    device_type=dev_type,
                    extra_responses=[messages.V2Success(message="pong")],
                )
                # Reading .features directly uses V2 _get_features() without V1 GetFeatures
                features = c.features
                self.assertEqual(expected_model, c.model)
                self.assertEqual("onekey.so", features.vendor)
                self.assertEqual("pro2-dev-1", features.device_id)
                self.assertTrue(features.initialized)
                self.assertEqual("P2D34J0018B", c.serial_no)
                self.assertEqual("pong", c.ping("hello"))

    def test_attach_pin_unlock_via_pin_any_and_explicit_standard_rejection(self):
        c, transport = self.make_client(
            extra_responses=[
                make_status(unlocked=False, passphrase_enabled=None, unlocked_by_attach_to_pin=None),
                messages.V2Success(),
                make_status(unlocked=True, passphrase_enabled=True, unlocked_by_attach_to_pin=True),
                # refresh_features() after unlock
                messages.DeviceInfo(
                    protocol_version=1,
                    hw=messages.DeviceHardwareInfo(device_type=7, serial_no="P2D34J0018B"),
                ),
                make_status(unlocked=True, passphrase_enabled=True, unlocked_by_attach_to_pin=True),
                make_session_msg(),
                # Explicit STANDARD_WALLET request while Attach PIN active
                make_status(unlocked=True, passphrase_enabled=True, unlocked_by_attach_to_pin=True),
            ]
        )
        sess = c.get_session(passphrase=client.PassphraseSetting.AUTO)
        self.assertTrue(sess.attach_pin)
        # Session exposes opaque local ID, not raw firmware bytes
        self.assertIsInstance(sess.id, str)
        ask_pins = [r for r in transport.requests if isinstance(r, messages.DeviceSessionAskPin)]
        self.assertEqual(1, len(ask_pins))
        self.assertEqual(int(messages.OneKeyPinType.ANY), ask_pins[0].type)
        self.assertFalse(any(isinstance(r, messages.DeviceSessionAskPassphrase) for r in transport.requests))

        with self.assertRaises(exceptions.OneKeyException):
            c.get_session(passphrase=client.PassphraseSetting.STANDARD_WALLET)

    def test_btc_get_address_resumes_session_and_device_cancel_preserves_link(self):
        c, transport = self.make_client(
            extra_responses=[
                make_status(),
                make_session_msg(),
                # btc.get_address call: status + DeviceSessionGet resume + ButtonRequest + Address
                make_status(),
                make_session_msg(),
                messages.ButtonRequest(),
                messages.Address(address="bc1qonekeytestaddress"),
                # Second call cancelled on device: status + resume + V2Failure cancel
                make_status(),
                make_session_msg(),
                messages.V2Failure(code=5, subcode=1, message="User cancelled"),
            ]
        )
        sess = c.get_session(passphrase=client.PassphraseSetting.STANDARD_WALLET)
        with sess:
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
            self.assertFalse(any(isinstance(r, messages.Cancel) for r in transport.requests))
            self.assertFalse(transport.closed)


class TestBtcToolsAndSecurityRegressions(unittest.TestCase):
    def test_from_json_preserves_exact_satoshis(self):
        tx = btc.from_json({
            "version": 2,
            "locktime": 0,
            "vin": [],
            "vout": [{"value": 0.29, "scriptPubKey": {"hex": "0014" + "11" * 20}}],
        })
        self.assertEqual(29000000, tx.bin_outputs[0].amount)

    def test_compress_pubkey_and_bc_address(self):
        uncompressed = b"\x04" + b"\x11" * 32 + b"\x22" * 32
        compressed = tools.compress_pubkey(uncompressed)
        self.assertEqual(33, len(compressed))
        self.assertEqual(0x02, compressed[0])
        self.assertEqual(
            tools.public_key_to_bc_address(compressed, 0, compress=False),
            tools.public_key_to_bc_address(uncompressed, 0, compress=True),
        )

    def test_udp_transport_rejects_non_loopback(self):
        udp = UdpTransport("192.0.2.1:21324")
        with self.assertRaises(TransportException):
            udp._open()


class TestProtocolV2ReviewRegressions(TestProtocolV2):
    def open_standard_session(self, extra_responses=()):
        c, transport = self.make_client(
            extra_responses=[make_status(), make_session_msg(), *extra_responses]
        )
        return c, transport, c.get_session(passphrase=client.PassphraseSetting.STANDARD_WALLET)

    def get_address(self, sess, index=0):
        return btc.get_address(
            sess,
            "Bitcoin",
            [0x80000054, 0x80000000, 0x80000000, 0, index],
            script_type=messages.InputScriptType.SPENDWITNESS,
        )

    def test_subcode_free_process_error_is_not_cancellation(self):
        c, transport, sess = self.open_standard_session([
            make_status(),
            make_session_msg(),
            messages.V2Failure(code=5, message="Not enough funds"),
        ])
        with sess:
            with self.assertRaises(exceptions.OneKeyFailure) as ctx:
                self.get_address(sess)
            # A complete failure response keeps the link open and sends no Cancel.
            self.assertFalse(transport.closed)
        self.assertNotIsInstance(ctx.exception, exceptions.Cancelled)
        self.assertEqual("Not enough funds", ctx.exception.message)
        self.assertFalse(any(isinstance(r, messages.Cancel) for r in transport.requests))

    def test_legacy_subcode_free_cancel_message_is_cancellation(self):
        c, transport, sess = self.open_standard_session([
            make_status(),
            make_session_msg(),
            messages.V2Failure(code=5, message="Cancelled"),
        ])
        with sess:
            with self.assertRaises(exceptions.Cancelled):
                self.get_address(sess)

    def test_management_subcode_one_is_not_cancellation(self):
        c, transport = self.make_client(
            extra_responses=[messages.V2Failure(code=5, subcode=1, message="Busy")]
        )
        c.features
        with self.assertRaises(exceptions.OneKeyFailure) as ctx:
            c.ping("hello")
        self.assertNotIsInstance(ctx.exception, exceptions.Cancelled)

    def test_ping_keeps_shared_signature(self):
        c, transport = self.make_client(extra_responses=[messages.V2Success(message="pong")])
        c.features
        self.assertEqual("pong", c.ping("hello", timeout=2.0))
        with self.assertRaises(exceptions.OneKeyException):
            c.ping("hello", button_protection=True)

    def test_session_ref_with_explicit_wallet_selector_is_rejected_before_io(self):
        c, transport, sess = self.open_standard_session()
        sent = len(transport.requests)
        with self.assertRaises(ValueError):
            c.get_session(passphrase=client.PassphraseSetting.STANDARD_WALLET, session_ref=sess.id)
        self.assertEqual(sent, len(transport.requests))

    def test_closed_session_is_retired(self):
        c, transport, sess = self.open_standard_session([make_status()])
        ref = sess.id
        sess.close()
        self.assertNotIn(ref, c._sessions)
        self.assertIsNone(c._active_session)
        sent = len(transport.requests)
        with self.assertRaises(exceptions.InvalidSessionError):
            c.get_session(session_ref=ref)
        self.assertFalse(
            any(isinstance(r, messages.DeviceSessionGet) for r in transport.requests[sent:])
        )

    def test_default_session_opens_attach_pin_wallet(self):
        attach = dict(unlocked=True, passphrase_enabled=True, unlocked_by_attach_to_pin=True)
        c, transport = self.make_client(
            extra_responses=[
                make_status(**attach),  # get_session -> ensure_unlocked
                make_session_msg(),
            ],
            status=make_status(**attach),
        )
        sess = client.get_default_session(c)
        self.assertTrue(sess.attach_pin)
        self.assertFalse(any(isinstance(r, messages.DeviceSessionAskPassphrase) for r in transport.requests))

    def test_seedless_session_cannot_send_wallet_commands(self):
        c, transport = self.make_client()
        c.features
        seedless = c.get_session(passphrase=client.PassphraseSetting.NONE)
        sent = len(transport.requests)
        with self.assertRaises(exceptions.OneKeyException):
            seedless.call(messages.GetAddress(address_n=[0], coin_name="Bitcoin"))
        with self.assertRaises(exceptions.OneKeyException):
            seedless.call_raw(messages.GetAddress(address_n=[0], coin_name="Bitcoin"))
        self.assertEqual(sent, len(transport.requests))

    def test_signing_exchange_reserves_the_validated_wallet(self):
        tx_input = messages.TxRequest(
            request_type=messages.RequestType.TXINPUT,
            details=messages.TxRequestDetailsType(request_index=0),
        )
        c, transport, sess = self.open_standard_session([
            make_status(),
            make_session_msg(),
            tx_input,
        ])
        with sess:
            res = sess.call(
                messages.SignTx(coin_name="Bitcoin", inputs_count=1, outputs_count=1),
                expect=messages.TxRequest,
            )
            self.assertEqual(messages.RequestType.TXINPUT, res.request_type)
            self.assertIs(sess, c._workflow_session)
            # Another wallet cannot be opened while the signing exchange is active.
            with self.assertRaises(exceptions.OneKeyException):
                c.get_session(passphrase=client.PassphraseSetting.STANDARD_WALLET)
            # A TxAck from a different session is refused without device I/O.
            other = c.get_seedless_session()
            other._firmware_session_id = b"o" * 32
            sent = len(transport.requests)
            with self.assertRaises(exceptions.InvalidSessionError):
                other.call(messages.TxAck(tx=messages.TransactionType()))
            self.assertEqual(sent, len(transport.requests))

    def test_tx_ack_after_link_replacement_is_refused(self):
        tx_input = messages.TxRequest(
            request_type=messages.RequestType.TXINPUT,
            details=messages.TxRequestDetailsType(request_index=0),
        )
        c, transport, sess = self.open_standard_session([make_status(), make_session_msg(), tx_input])
        with sess:
            sess.call(messages.SignTx(coin_name="Bitcoin", inputs_count=1, outputs_count=1))
            transport.generation = getattr(transport, "generation", 0) + 1
            with self.assertRaises(exceptions.InvalidSessionError):
                sess.call(messages.TxAck(tx=messages.TransactionType()))

    def test_replaced_link_renegotiates_before_first_request(self):
        c, transport, sess = self.open_standard_session([
            # after reconnect: handshake + protocol info, then status/resume/address
            messages.V2Success(message="handshake"),
            messages.ProtocolInfo(version=1, build_fingerprint="app__pro2", supported_messages=SUPPORTED_V2),
            make_status(),
            make_session_msg(),
            messages.Address(address="bc1qafterreconnect"),
        ])
        transport.generation = getattr(transport, "generation", 0) + 1
        sent = len(transport.requests)
        with sess:
            self.assertEqual("bc1qafterreconnect", self.get_address(sess))
        new_requests = transport.requests[sent:]
        self.assertIsInstance(new_requests[0], messages.V2Ping)
        self.assertIsInstance(new_requests[1], messages.ProtocolInfoRequest)

    def test_host_cancel_does_not_wait_for_request_lock(self):
        import threading

        c, transport, sess = self.open_standard_session()
        holding = threading.Event()
        release = threading.Event()

        def hold_lock():
            with c._lock:
                holding.set()
                release.wait(5)

        worker = threading.Thread(target=hold_lock)
        worker.start()
        try:
            self.assertTrue(holding.wait(5))
            canceller = threading.Thread(target=c.cancel)
            canceller.start()
            canceller.join(2)
            self.assertFalse(canceller.is_alive(), "Cancel blocked on the request lock")
            self.assertIsInstance(transport.requests[-1], messages.Cancel)
        finally:
            release.set()
            worker.join(5)


class TestReviewSecurityRegressions(unittest.TestCase):
    def test_from_json_rejects_fractional_satoshis(self):
        import json

        vout = json.loads('{"value": 0.00000003, "scriptPubKey": {"hex": "00"}}')
        tx = btc.from_json({"version": 2, "vin": [], "vout": [vout]})
        self.assertEqual(3, tx.bin_outputs[0].amount)
        with self.assertRaises(ValueError):
            btc.from_json({
                "version": 2,
                "vin": [],
                "vout": [{"value": "0.000000035", "scriptPubKey": {"hex": "00"}}],
            })

    def test_udp_is_not_auto_discovered_and_requires_loopback_peer(self):
        self.assertEqual([], list(UdpTransport.enumerate()))
        udp = UdpTransport("localhost:21324")
        with mock.patch(
            "onekeylib.transport.udp.socket.getaddrinfo",
            return_value=[(2, 2, 17, "", ("203.0.113.5", 21324))],
        ):
            with self.assertRaises(TransportException):
                udp._open()
        self.assertIsNone(udp.socket)
        ok = UdpTransport("localhost:21324")
        ok._open()
        try:
            self.assertTrue(ok._is_loopback(ok.socket.getpeername()[0]))
        finally:
            ok._close()

    def test_trezor_vendor_requires_onekey_fields(self):
        base = dict(vendor="trezor.io", major_version=4, minor_version=0, patch_version=0)
        self.assertFalse(models.is_onekey_features(messages.Features(**base)))
        self.assertTrue(models.is_onekey_features(messages.Features(**base, onekey_device_type=5)))
        self.assertTrue(models.is_onekey_features(
            messages.Features(vendor="onekey.so", major_version=4, minor_version=0, patch_version=0)
        ))

    def test_trezor_device_is_rejected_by_model_check(self):
        c = mock.Mock(spec=client.OneKeyClient)
        c._model = None
        c.features = messages.Features(
            vendor="trezor.io", major_version=2, minor_version=8, patch_version=0, model="T"
        )
        with self.assertRaises(exceptions.OneKeyException):
            client.OneKeyClient.model.fget(c)

    def test_exception_strings_omit_payloads_and_session_ids(self):
        secret = messages.PassphraseAck(passphrase="hunter2-secret")
        err = exceptions.UnexpectedMessageError(messages.Success, secret)
        self.assertNotIn("hunter2", str(err))
        self.assertIn("PassphraseAck", str(err))
        sid = b"\xaa" * 32
        self.assertNotIn(sid.hex(), str(exceptions.InvalidSessionError(sid)))
        self.assertNotIn(repr(sid), str(exceptions.InvalidSessionError(sid)))
