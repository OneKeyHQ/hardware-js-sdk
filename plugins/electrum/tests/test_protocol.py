import concurrent.futures
import unittest
from unittest import mock

from onekey import codec
from onekey.frame import SeqCounter, decode, encode, pop_frame
from onekey.ipc import Helper, HelperError
from onekey.link import Link


ACCOUNT = [0x80000000 + 84, 0x80000000, 0x80000000]
STORAGE = [0x80000000 + 4541509, 0x80000000 + 1112098098]
ADDRESS_PATH = ACCOUNT + [0, 0]
TXID = "11" * 32
SIGNATURE = bytes.fromhex("3006020101020102")


def call(helper, op, params):
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(helper.call, op, params).result(timeout=5)


class Scripted:
    def __init__(self):
        self.locked = True
        self.device_id = None
        self.serial = "synthetic-serial"
        self.passphrase_enabled = True
        self.hidden = "synthetic-public-wallet-identity"
        self.xpub = "xpub-test"
        self.address = "bc1qexample"
        self.mismatch = None
        self.material = False
        self.on_device = []
        self.order = []
        self.session_queries = []
        self.steps = [codec.TX_INPUT, codec.TX_OUTPUT, codec.TX_META, codec.TX_FINISHED]

    def status(self):
        device_id = None if self.locked else self.device_id
        if self.material and self.mismatch == "omit":
            device_id = None
        elif self.material and self.mismatch == "other":
            device_id = "other-device"
        return codec.DEVICE_STATUS, codec.encode_status(
            device_id, unlocked=not self.locked, init_states=True, passphrase_enabled=self.passphrase_enabled)

    def handle(self, kind, payload):
        if kind == codec.PING:
            return codec.SUCCESS, b""
        if kind == codec.DEVICE_STATUS_GET:
            return self.status()
        if kind == codec.DEVICE_INFO_GET:
            return codec.DEVICE_INFO, codec.encode_device_info("pro2", self.serial)
        if kind == codec.PROTOCOL_INFO_REQUEST:
            if codec.decode_protocol_info_request(payload) is not True:
                raise AssertionError("eventless_wallet_session")
            return codec.PROTOCOL_INFO, codec.enc_uint(1, 1) + codec.enc_str(2, "firmware-pro2")
        if kind == codec.DEVICE_SESSION_ASK_PIN:
            self.locked = False
            self.device_id = "synthetic-device"
            return codec.SUCCESS, b""
        if kind == codec.DEVICE_SESSION_ASK_PASSPHRASE:
            passphrase, on_device, _domains = codec.decode_ask_passphrase(payload)
            self.on_device.append((on_device, passphrase))
            return codec.SUCCESS, b""
        if kind == codec.DEVICE_SESSION_GET:
            query = codec.decode_session_get(payload)
            self.session_queries.append(query)
            if query:
                address = query
            elif self.on_device and self.on_device[-1][0]:
                address = self.hidden
            else:
                address = "standard-wallet"
            return codec.DEVICE_SESSION, codec.encode_session(address)
        if kind == codec.GET_PUBLIC_KEY:
            self.material = True
            return codec.PUBLIC_KEY, codec.encode_public_key(self.xpub, 0x01020304)
        if kind == codec.GET_ADDRESS:
            self.material = True
            return codec.ADDRESS, codec.encode_address(self.address)
        if kind in (codec.SIGN_TX, codec.TX_ACK):
            step = self.steps[len(self.order)]
            self.order.append(step)
            if step == codec.TX_META:
                return codec.TX_REQUEST, codec.encode_tx_request(step, tx_hash=bytes.fromhex(TXID)[::-1])
            if step == codec.TX_FINISHED:
                self.material = True
                return codec.TX_REQUEST, codec.encode_tx_request(step, signature=SIGNATURE, signature_index=0)
            return codec.TX_REQUEST, codec.encode_tx_request(step, index=0)
        if kind == codec.BUTTON_ACK:
            return codec.SUCCESS, b""
        raise AssertionError(kind)


def helper_for(device=None):
    device = device or Scripted()
    pipe = bytearray()

    def write(data):
        pipe.extend(data)
        while True:
            frame = pop_frame(pipe)
            if frame is None:
                return
            kind, payload = __import__("onekey.frame", fromlist=["split_message"]).split_message(decode(frame).payload)
            reply = device.handle(kind, payload)
            if reply is not None:
                incoming.extend(encode_reply(*reply))

    incoming = bytearray()

    def read(size, _timeout):
        if not incoming:
            return b""
        chunk = bytes(incoming[:size])
        del incoming[:size]
        return chunk

    link = Link(read, write)
    helper = Helper(ports={"usb1": link})
    call(helper, "search", {})
    device.material = False
    return helper, device


def encode_reply(kind, payload):
    from onekey.frame import SeqCounter, encode_message
    if not hasattr(encode_reply, "seq"):
        encode_reply.seq = SeqCounter()
    return encode_message(kind, payload, seq=encode_reply.seq.next())


class TestFrames(unittest.TestCase):
    def test_documented_frame_round_trip(self):
        payload = bytes((1, 2, 3))
        frame = encode(payload, seq=1, channel=1, packet_src=1)
        self.assertEqual(bytes.fromhex("5a0b00"), frame[:3])
        self.assertEqual(1, frame[4])
        self.assertEqual(0x04, frame[5])
        self.assertEqual(1, frame[6])
        self.assertEqual(payload, frame[7:10])
        self.assertEqual(payload, decode(frame).payload)
        self.assertEqual(frame, encode(payload, seq=1, channel=1, packet_src=1))

    def test_bad_sof_and_crc_are_rejected(self):
        frame = encode(b"\x01\x02\x03", seq=1)
        with self.assertRaises(ValueError):
            decode(b"\x00" + frame[1:])
        with self.assertRaises(ValueError):
            decode(frame[:-1] + bytes((frame[-1] ^ 0xFF,)))

    def test_sequence_skips_zero(self):
        counter = SeqCounter()
        self.assertEqual(1, counter.next())
        counter._seq = 255
        self.assertEqual(1, counter.next())
        self.assertTrue(all(counter.next() != 0 for _ in range(300)))

    def test_partial_usb_read_is_not_a_frame(self):
        frame = encode(b"\x11" * 600, seq=1)
        self.assertGreater(len(frame), 512)
        buf = bytearray(frame[:512])
        self.assertIsNone(pop_frame(buf))
        self.assertEqual(512, len(buf))
        buf.extend(frame[512:])
        self.assertEqual(frame, pop_frame(buf))

    def test_message_field_numbers(self):
        public = codec.decode_get_public_key(codec.encode_get_public_key(
            ACCOUNT, "Bitcoin", "SPENDADDRESS", False))
        self.assertEqual(ACCOUNT, public["address_n"])
        self.assertEqual("Bitcoin", public["coin_name"])
        self.assertEqual(0, public["script_type"])
        self.assertIs(False, public["show_display"])
        signed = codec.decode_sign_tx(codec.encode_sign_tx(1, 1, "Testnet", 2, 9))
        self.assertEqual(1, signed["inputs_count"])
        self.assertEqual(1, signed["outputs_count"])
        self.assertEqual("Testnet", signed["coin_name"])
        self.assertEqual(0, codec.decode_tx_request(codec.encode_tx_request(codec.TX_INPUT))["request_type"])
        self.assertIsNone(codec.decode_status(codec.encode_status(None))["device_id"])
        self.assertEqual("abc", codec.decode_status(codec.encode_status("abc"))["device_id"])
        self.assertIs(True, codec.decode_protocol_info_request(codec.encode_protocol_info_request(True)))


class TestDeviceSession(unittest.TestCase):
    def test_operations_stay_in_process(self):
        with mock.patch("subprocess.Popen") as popen:
            helper, device = helper_for()
            opened = call(helper, "open", {"connectId": "usb1", "mode": "standard"})
            self.assertEqual("standard", opened["walletType"])
            self.assertIsNone(opened["passphraseState"])
            self.assertIn((False, ""), device.on_device)
            hidden = Scripted()
            helper, hidden = helper_for(hidden)
            selected = call(helper, "open", {"connectId": "usb1", "mode": "select-hidden"})
            self.assertEqual("hidden", selected["walletType"])
            self.assertEqual(hidden.hidden, selected["passphraseState"])
            self.assertIn((True, None), hidden.on_device)
            binding = dict(deviceId="synthetic-device", serialNo="synthetic-serial",
                           walletType="hidden", passphraseState=hidden.hidden)
            locked = Scripted()
            helper, locked = helper_for(locked)
            result = call(helper, "xpub", {"connectId": "usb1", "binding": binding, "coin": "Bitcoin",
                                           "path": ACCOUNT, "scriptType": "SPENDWITNESS"})
            self.assertEqual("xpub-test", result["xpub"])
            self.assertFalse(any(on_device for on_device, _value in locked.on_device))
            self.assertEqual([locked.hidden], [item for item in locked.session_queries if item])
            address = call(helper, "address", {"connectId": "usb1", "binding": binding, "coin": "Bitcoin",
                                               "path": ADDRESS_PATH, "scriptType": "SPENDWITNESS"})
            self.assertEqual("bc1qexample", address["address"])
            signed = self.sign(helper, binding)
            self.assertEqual(SIGNATURE.hex(), signed["signatures"][0]["signature"])
            self.assertEqual([codec.TX_INPUT, codec.TX_OUTPUT, codec.TX_META, codec.TX_FINISHED], locked.order)
            long_device = Scripted()
            long_device.steps = [codec.TX_OUTPUT] * 9 + [codec.TX_FINISHED]
            helper, long_device = helper_for(long_device)
            signed = self.sign(helper, binding)
            self.assertEqual(10, len(long_device.order))
            self.assertEqual(SIGNATURE.hex(), signed["signatures"][0]["signature"])
            popen.assert_not_called()

    def test_post_call_identity_hides_material(self):
        for op, params, secret in (
            ("xpub", {"path": ACCOUNT, "scriptType": "SPENDWITNESS"}, "xpub-test"),
            ("address", {"path": ADDRESS_PATH, "scriptType": "SPENDWITNESS"}, "bc1qexample"),
            ("sign", None, SIGNATURE.hex()),
        ):
            with self.subTest(op=op):
                device = Scripted()
                device.mismatch = "omit"
                helper, device = helper_for(device)
                binding = dict(deviceId="synthetic-device", serialNo="synthetic-serial",
                               walletType="standard", passphraseState=None)
                with self.assertRaises(HelperError) as raised:
                    if op == "sign":
                        self.sign(helper, binding)
                    else:
                        call(helper, op, dict(connectId="usb1", binding=binding, coin="Bitcoin", **params))
                self.assertEqual("DEVICE_MISMATCH", raised.exception.code)
                self.assertNotIn(secret, str(raised.exception))

    def sign(self, helper, binding):
        previous = dict(hash=TXID, version=1, lock_time=0,
                        inputs=[dict(prev_hash="22" * 32, prev_index=0, script_sig="", sequence=0xFFFFFFFF)],
                        bin_outputs=[dict(amount="1000", script_pubkey="0014" + "33" * 20)])
        return call(helper, "sign", dict(
            connectId="usb1", binding=binding, coin="Bitcoin", version=2, locktime=0, refTxs=[previous],
            inputs=[dict(prev_hash=TXID, prev_index=0, amount="1000", sequence=0xFFFFFFFF,
                         address_n=ADDRESS_PATH, script_type="SPENDWITNESS")],
            outputs=[dict(amount="900", address="bc1qexample", script_type="PAYTOADDRESS")]))


if __name__ == "__main__":
    unittest.main()
