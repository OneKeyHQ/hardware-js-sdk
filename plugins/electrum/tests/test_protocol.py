import concurrent.futures
import unittest
from unittest import mock

from onekey import codec
from onekey.device import Session, SessionError
from onekey.frame import SeqCounter, decode, encode, pop_frame
from onekey.ipc import Helper, HelperError
from onekey.link import Link, LinkError


ACCOUNT = [0x80000000 + 84, 0x80000000, 0x80000000]
STORAGE = [0x80000000 + 4541509, 0x80000000 + 1112098098]
ADDRESS_PATH = ACCOUNT + [0, 0]
TXID = bytes(range(32)).hex()
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
        self.pins = []
        self.locks = 0
        self.unlocked_by_attach = False
        self.attach_to_pin_enabled = False
        self.order = []
        self.session_queries = []
        self.session_id = None
        self.session_address = None
        self.session_serial = 0
        self.hidden_xpub = None
        self.passphrase_address = None
        self.broken = False
        self.steps = [codec.TX_INPUT, codec.TX_OUTPUT, codec.TX_META, codec.TX_FINISHED]
        self.message_signature = None
        self.signed_message = None
        self.pending_button = None
        self.acks = []

    def install_session(self, address):
        self.session_serial += 1
        self.session_id = bytes([self.session_serial]) + bytes(31)
        self.session_address = address

    def status(self):
        device_id = None if self.locked else self.device_id
        if self.material and self.mismatch == "omit":
            device_id = None
        elif self.material and self.mismatch == "other":
            device_id = "other-device"
        return codec.DEVICE_STATUS, codec.encode_status(
            device_id, unlocked=not self.locked, init_states=True,
            passphrase_enabled=self.passphrase_enabled,
            attach_to_pin_enabled=self.attach_to_pin_enabled,
            unlocked_by_attach_to_pin=self.unlocked_by_attach and not self.locked)

    def handle(self, kind, payload):
        if self.broken:
            raise LinkError("PROTOCOL")
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
        if kind == codec.LOCK_DEVICE:
            self.locks += 1
            self.locked = True
            self.unlocked_by_attach = False
            self.session_id = self.session_address = None
            return codec.SUCCESS, b""
        if kind == codec.DEVICE_SESSION_ASK_PIN:
            self.pins.append(codec.decode_ask_pin(payload))
            self.locked = False
            self.device_id = "synthetic-device"
            self.unlocked_by_attach = (
                self.pins[-1] == codec.PIN_ATTACH
                or (self.pins[-1] == codec.PIN_ANY and getattr(self, "pin_any_as_attach", False))
            )
            # Main PIN unlocks the device and clears SE sessions. Attach PIN loads
            # the bound passphrase, which an empty Get then reads.
            if self.unlocked_by_attach:
                self.install_session(self.hidden)
            else:
                self.session_id = None
                self.session_address = None
            return codec.SUCCESS, b""
        if kind == codec.DEVICE_SESSION_ASK_PASSPHRASE:
            passphrase, on_device, _domains = codec.decode_ask_passphrase(payload)
            self.on_device.append((on_device, passphrase))
            if on_device:
                self.install_session(self.passphrase_address or self.hidden)
            elif passphrase == "":
                self.install_session("standard-wallet")
            return codec.SUCCESS, b""
        if kind == codec.DEVICE_SESSION_GET:
            session_id, address = codec.decode_session_get(payload)
            self.session_queries.append((session_id, address))
            if session_id:
                if session_id != self.session_id or (address and address != self.session_address):
                    return codec.FAILURE, codec.enc_uint(1, 5) + codec.enc_uint(2, codec.SESSION_INVALID)
                return codec.DEVICE_SESSION, codec.encode_session(self.session_address, self.session_id)
            if address:
                if address != self.session_address:
                    # Firmware treats the address as a hint and starts a new session.
                    self.install_session("replaced-wallet")
                return codec.DEVICE_SESSION, codec.encode_session(self.session_address, self.session_id)
            if self.session_id is None:
                if self.unlocked_by_attach or (self.on_device and self.on_device[-1][0]):
                    self.install_session(self.hidden)
                else:
                    self.install_session("standard-wallet")
            return codec.DEVICE_SESSION, codec.encode_session(self.session_address, self.session_id)
        if kind == codec.GET_PUBLIC_KEY:
            self.material = True
            xpub = self.hidden_xpub if self.session_address == self.hidden and self.hidden_xpub else self.xpub
            return codec.PUBLIC_KEY, codec.encode_public_key(xpub, 0x01020304)
        if kind == codec.GET_ADDRESS:
            self.material = True
            return codec.ADDRESS, codec.encode_address(self.address)
        if kind in (codec.SIGN_TX, codec.TX_ACK):
            if kind == codec.TX_ACK:
                self.acks.append(payload)
            step = self.steps[len(self.order)]
            self.order.append(step)
            if step == codec.TX_META:
                return codec.TX_REQUEST, codec.encode_tx_request(step, tx_hash=bytes.fromhex(TXID))
            if step == codec.TX_FINISHED:
                self.material = True
                return codec.TX_REQUEST, codec.encode_tx_request(step, signature=SIGNATURE, signature_index=0)
            return codec.TX_REQUEST, codec.encode_tx_request(step, index=0)
        if kind == codec.SIGN_MESSAGE:
            self.signed_message = codec.decode_sign_message(payload)
            if self.message_signature is None:
                raise AssertionError("message signature")
            self.pending_button = (codec.MESSAGE_SIGNATURE, codec.encode_message_signature(self.address, self.message_signature))
            return codec.BUTTON_REQUEST, b""
        if kind == codec.BUTTON_ACK:
            if self.pending_button is not None:
                reply = self.pending_button
                self.pending_button = None
                self.material = True
                return reply
            return codec.SUCCESS, b""
        raise AssertionError(kind)


def pipe_link(device, on_close=None):
    pipe = bytearray()
    incoming = bytearray()

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

    def read(size, _timeout):
        if not incoming:
            return b""
        chunk = bytes(incoming[:size])
        del incoming[:size]
        return chunk

    return Link(read, write, on_close)


def helper_for(device=None):
    device = device or Scripted()
    helper = Helper(ports={"usb1": pipe_link(device)})
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
        attached = codec.decode_status(codec.encode_status(
            "abc", attach_to_pin_enabled=True, unlocked_by_attach_to_pin=True))
        self.assertIs(True, attached["attach_to_pin_enabled"])
        self.assertIs(True, attached["unlocked_by_attach_to_pin"])
        self.assertEqual(codec.PIN_ATTACH, codec.decode_ask_pin(codec.encode_ask_pin(codec.PIN_ATTACH)))
        self.assertIs(True, codec.decode_protocol_info_request(codec.encode_protocol_info_request(True)))
        session_id = bytes(range(32))
        self.assertEqual((session_id, "addr"), codec.decode_session_get(codec.encode_session_get("addr", session_id)))
        self.assertEqual(("addr", session_id), codec.decode_session(codec.encode_session("addr", session_id)))
        self.assertEqual(codec.SESSION_INVALID, codec.decode_failure(codec.enc_uint(1, 5) + codec.enc_uint(2, 2))[1])
        signed = codec.decode_sign_message(codec.encode_sign_message(
            ADDRESS_PATH, b"OneKey", "Bitcoin", "SPENDWITNESS", True))
        self.assertEqual(ADDRESS_PATH, signed["address_n"])
        self.assertEqual(b"OneKey", signed["message"])
        self.assertEqual("Bitcoin", signed["coin_name"])
        self.assertEqual(3, signed["script_type"])
        self.assertIs(True, signed["no_script_type"])
        self.assertIsNone(signed["is_bip322_simple"])
        self.assertEqual(("bc1qexample", SIGNATURE), codec.decode_message_signature(
            codec.encode_message_signature("bc1qexample", SIGNATURE)))
        singlesig_address = codec._path(ADDRESS_PATH) + codec.enc_str(2, "Bitcoin") + codec.enc_bool(3, True) + codec.enc_uint(5, 3)
        self.assertEqual(singlesig_address, codec.encode_get_address(ADDRESS_PATH, "Bitcoin", "SPENDWITNESS", True))
        node = {"depth": 4, "fingerprint": 0x01020304, "child_num": 0x80000002,
                "chain_code": "ab" * 32, "public_key": "02" + "11" * 32, "address_n": [0, 1]}
        multisig = {"m": 2, "pubkeys": [node, {**node, "public_key": "03" + "22" * 32}]}
        decoded = codec.decode_multisig(codec.encode_multisig(multisig))
        self.assertEqual(2, decoded["m"])
        self.assertEqual((), decoded["signatures"])
        self.assertEqual(bytes.fromhex(node["public_key"]), decoded["pubkeys"][0]["public_key"])
        self.assertEqual(bytes.fromhex(node["chain_code"]), decoded["pubkeys"][0]["chain_code"])
        self.assertEqual([0, 1], decoded["pubkeys"][0]["address_n"])
        self.assertEqual(0x80000002, decoded["pubkeys"][0]["child_num"])
        self.assertNotIn(4, codec.decode_fields(codec.encode_get_address(ADDRESS_PATH, "Bitcoin", "SPENDWITNESS", True)))
        with_multisig = codec.decode_fields(codec.encode_get_address(
            ADDRESS_PATH, "Bitcoin", "SPENDWITNESS", True, multisig))
        self.assertEqual(3, codec.opt_uint(with_multisig, 5))
        self.assertEqual(2, codec.decode_multisig(codec._last(with_multisig, 4, 2))["m"])
        plain = dict(prev_hash=TXID, prev_index=1, sequence=2, amount="9",
                     address_n=ADDRESS_PATH, script_type="SPENDWITNESS")
        self.assertNotIn(7, codec.decode_fields(codec._input(plain, prev=False)))
        signed_input = dict(plain, address_n=[0x80000030, 0x80000000, 0x80000000, 0x80000002, 0, 1], multisig=multisig)
        signed_fields = codec.decode_fields(codec._input(signed_input, prev=False))
        self.assertEqual(multisig["m"], codec.decode_multisig(codec._last(signed_fields, 7, 2))["m"])
        self.assertEqual(9, codec.opt_uint(signed_fields, 8))
        change = dict(amount="4", address_n=signed_input["address_n"], script_type="PAYTOWITNESS", multisig=multisig)
        change_fields = codec.decode_fields(codec._output(change))
        self.assertEqual([0, 1], codec.decode_multisig(codec._last(change_fields, 5, 2))["pubkeys"][0]["address_n"])
        self.assertNotIn(7, codec.decode_fields(codec._input(dict(plain, script_sig=""), prev=True)))


class TestDeviceSession(unittest.TestCase):
    def test_operations_stay_in_process(self):
        with mock.patch("subprocess.Popen") as popen:
            helper, device = helper_for()
            opened = call(helper, "open", {"connectId": "usb1", "mode": "standard"})
            self.assertEqual("standard", opened["walletType"])
            self.assertIsNone(opened["passphraseState"])
            self.assertEqual([codec.PIN_MAIN], device.pins)
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
            self.assertEqual([(True, None)], locked.on_device)
            self.assertEqual([(None, None), (None, None)], locked.session_queries)
            self.assertEqual(locked.hidden, locked.session_address)
            address = call(helper, "address", {"connectId": "usb1", "binding": binding, "coin": "Bitcoin",
                                               "path": ADDRESS_PATH, "scriptType": "SPENDWITNESS"})
            self.assertEqual("bc1qexample", address["address"])
            self.assertEqual([codec.PIN_ANY], locked.pins)
            self.assertEqual([(True, None)], locked.on_device)
            self.assertEqual((locked.session_id, locked.hidden), locked.session_queries[-1])
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

    def test_pin_any_unlock_follows_attach_pin_session_without_separate_mode(self):
        # Storage unlock ("current") with Attach PIN (PIN_ANY): bound directly as the hidden session.
        device = Scripted()
        device.pin_any_as_attach = True
        helper, device = helper_for(device)
        opened = call(helper, "open", {"connectId": "usb1", "mode": "current"})
        self.assertEqual("hidden", opened["walletType"])
        self.assertEqual(device.hidden, opened["passphraseState"])
        self.assertEqual([codec.PIN_ANY], device.pins)
        self.assertEqual([], device.on_device)
        device.pins.clear()
        binding = dict(deviceId=opened["deviceId"], serialNo=opened["serialNo"],
                       walletType="hidden", passphraseState=opened["passphraseState"])
        result = call(helper, "xpub", {"connectId": "usb1", "binding": binding, "coin": "Bitcoin",
                                       "path": ACCOUNT, "scriptType": "SPENDWITNESS"})
        self.assertEqual("xpub-test", result["xpub"])
        self.assertEqual([], device.pins)
        self.assertEqual([], device.on_device)

        # After lock, PIN_ANY lets the user enter Attach PIN and match the session directly.
        locked = Scripted()
        locked.pin_any_as_attach = True
        helper, locked = helper_for(locked)
        call(helper, "xpub", {"connectId": "usb1", "binding": binding, "coin": "Bitcoin",
                              "path": ACCOUNT, "scriptType": "SPENDWITNESS"})
        self.assertEqual([codec.PIN_ANY], locked.pins)
        self.assertEqual([], locked.on_device)
        self.assertEqual([(None, None)], locked.session_queries)

        # Already unlocked via Attach PIN: matches immediately without PIN or passphrase prompts.
        current = Scripted()
        current.locked = False
        current.device_id = "synthetic-device"
        current.unlocked_by_attach = True
        helper, current = helper_for(current)
        call(helper, "xpub", {"connectId": "usb1", "binding": binding, "coin": "Bitcoin",
                              "path": ACCOUNT, "scriptType": "SPENDWITNESS"})
        self.assertEqual([], current.pins)
        self.assertEqual([], current.on_device)

    def test_cached_standard_wallet_does_not_follow_an_attach_pin_unlock(self):
        device = Scripted()
        helper, device = helper_for(device)
        opened = call(helper, "open", {"connectId": "usb1", "mode": "standard"})
        binding = dict(deviceId=opened["deviceId"], serialNo=opened["serialNo"],
                       walletType="standard", passphraseState=None)
        device.hidden_xpub = "xpub-attach"
        device.unlocked_by_attach = True
        device.install_session(device.hidden)
        with self.assertRaises(HelperError) as raised:
            call(helper, "xpub", {"connectId": "usb1", "binding": binding, "coin": "Bitcoin",
                                  "path": ACCOUNT, "scriptType": "SPENDWITNESS"})
        self.assertEqual("WALLET_MISMATCH", raised.exception.code)
        self.assertEqual(0, device.locks)

    def test_hidden_restore_rejects_a_different_passphrase_without_a_hint_session(self):
        device = Scripted()
        device.passphrase_address = "other-wallet"
        helper, device = helper_for(device)
        binding = dict(deviceId="synthetic-device", serialNo="synthetic-serial",
                       walletType="hidden", passphraseState=device.hidden)
        with self.assertRaises(HelperError) as raised:
            call(helper, "xpub", {"connectId": "usb1", "binding": binding, "coin": "Bitcoin",
                                  "path": ACCOUNT, "scriptType": "SPENDWITNESS"})
        # Correct PIN, but the on-device passphrase opened another hidden wallet.
        self.assertEqual("PASSPHRASE_MISMATCH", raised.exception.code)
        self.assertIn("passphrase", str(raised.exception))
        self.assertEqual([(True, None)], device.on_device)
        self.assertEqual([(None, None), (None, None)], device.session_queries)
        self.assertEqual("other-wallet", device.session_address)
        self.assertIsNotNone(helper.generation)

    def test_usb_interface_stays_open_across_wallet_calls(self):
        device = Scripted()
        closed = []
        def new_link(_path):
            return pipe_link(device, lambda: closed.append(True))

        with mock.patch("onekey.ipc.list_paths", return_value=["001:1"]), \
                mock.patch("onekey.ipc.open_path", side_effect=new_link) as open_path:
            helper = Helper()
            call(helper, "search", {})
            self.assertEqual(1, open_path.call_count)
            self.assertEqual([True], closed)
            closed.clear()
            call(helper, "state", {"connectId": "001:1"})
            call(helper, "state", {"connectId": "001:1"})
            call(helper, "search", {})
            self.assertEqual(2, open_path.call_count)
            self.assertEqual([], closed)
            generation = helper.generation
            with self.assertRaises(HelperError) as raised:
                call(helper, "open", {"connectId": "001:1", "mode": "nope"})
            self.assertEqual("INVALID_REQUEST", raised.exception.code)
            self.assertEqual([], closed)
            self.assertEqual(generation, helper.generation)
            call(helper, "state", {"connectId": "001:1"})
            self.assertEqual(2, open_path.call_count)
            device.broken = True
            with self.assertRaises(HelperError) as raised:
                call(helper, "state", {"connectId": "001:1"})
            self.assertEqual("PROTOCOL", raised.exception.code)
            self.assertEqual([True], closed)
            self.assertEqual(generation, helper.generation)
            closed.clear()
            device.broken = False
            call(helper, "state", {"connectId": "001:1"})
            self.assertEqual(3, open_path.call_count)
            self.assertEqual([], closed)
            helper.shutdown()
            self.assertEqual([True], closed)

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

    def test_sign_message_uses_core_recovery_byte(self):
        try:
            from electrum.bip32 import BIP32Node
            from electrum.bitcoin import ecdsa_sign_usermessage, pubkey_to_address, verify_usermessage_with_address
        except ModuleNotFoundError:
            self.skipTest("requires electrum")
        node = BIP32Node.from_rootseed(b"\x11" * 32, xtype="p2wpkh").subkey_at_private_derivation("m/84'/0'/0'/0/0")
        message = "OneKey"
        signature = ecdsa_sign_usermessage(node.eckey, message, is_compressed=True)
        address = pubkey_to_address("p2wpkh", node.eckey.get_public_key_hex(compressed=True))
        device = Scripted()
        device.address = address
        device.message_signature = signature
        helper, device = helper_for(device)
        binding = call(helper, "open", {"connectId": "usb1", "mode": "standard"})
        result = call(helper, "sign-message", dict(
            connectId="usb1", binding=binding, coin="Bitcoin", path=ADDRESS_PATH,
            scriptType="SPENDWITNESS", message=message.encode().hex()))
        self.assertEqual(address, result["address"])
        self.assertEqual(signature.hex(), result["signature"])
        self.assertTrue(verify_usermessage_with_address(address, signature, message.encode()))
        self.assertEqual(b"OneKey", device.signed_message["message"])
        self.assertIs(True, device.signed_message["no_script_type"])
        self.assertIsNone(device.signed_message["is_bip322_simple"])
        self.assertEqual(3, device.signed_message["script_type"])
        for bad in ("", "abc", "AA", "0" * 2050):
            with self.subTest(message=bad[:8]), self.assertRaises(HelperError) as raised:
                call(helper, "sign-message", dict(
                    connectId="usb1", binding=binding, coin="Bitcoin", path=ADDRESS_PATH,
                    scriptType="SPENDWITNESS", message=bad))
            self.assertEqual("INVALID_REQUEST", raised.exception.code)
        self.assertEqual(b"OneKey", device.signed_message["message"])

    def test_bip48_native_segwit_is_accepted_and_other_multisig_paths_are_not(self):
        helper, device = helper_for()
        binding = call(helper, "open", {"connectId": "usb1", "mode": "standard"})
        account = [0x80000000 + 48, 0x80000000, 0x80000000, 0x80000000 + 2]
        opened = call(helper, "xpub", dict(connectId="usb1", binding=binding, coin="Bitcoin",
                                           path=account, scriptType="SPENDWITNESS"))
        self.assertEqual("xpub-test", opened["xpub"])
        node = {"depth": 4, "fingerprint": 1, "child_num": 0x80000002, "chain_code": "cd" * 32,
                "public_key": "02" + "44" * 32, "address_n": [1, 2]}
        multisig = {"m": 1, "pubkeys": [node, {**node, "public_key": "03" + "55" * 32, "address_n": [1, 2]}]}
        path = account + [1, 2]
        previous = dict(hash=TXID, version=1, lock_time=0,
                        inputs=[dict(prev_hash="22" * 32, prev_index=0, script_sig="", sequence=0xFFFFFFFF)],
                        bin_outputs=[dict(amount="1000", script_pubkey="0014" + "33" * 20)])
        call(helper, "sign", dict(
            connectId="usb1", binding=binding, coin="Bitcoin", version=2, locktime=0, refTxs=[previous],
            inputs=[dict(prev_hash=TXID, prev_index=0, amount="1000", sequence=0xFFFFFFFF,
                         address_n=path, script_type="SPENDWITNESS", multisig=multisig)],
            outputs=[dict(amount="900", address_n=path, script_type="PAYTOWITNESS", multisig=multisig)]))
        self.assertEqual(codec.TX_FINISHED, device.order[-1])
        input_tx = codec.decode_fields(codec._last(codec.decode_fields(device.acks[0]), 1, 2))
        output_tx = codec.decode_fields(codec._last(codec.decode_fields(device.acks[1]), 1, 2))
        signed_input = codec.decode_fields(codec._last(input_tx, 2, 2))
        signed_output = codec.decode_fields(codec._last(output_tx, 5, 2))
        self.assertEqual(1, codec.decode_multisig(codec._last(signed_input, 7, 2))["m"])
        self.assertEqual(path[-2:], codec.decode_multisig(codec._last(signed_output, 5, 2))["pubkeys"][0]["address_n"])
        self.assertEqual(bytes.fromhex(node["public_key"]),
                         codec.decode_multisig(codec._last(signed_input, 7, 2))["pubkeys"][0]["public_key"])
        rejected = (
            dict(path=account + [0, 0], scriptType="SPENDWITNESS"),
            dict(path=ADDRESS_PATH, scriptType="SPENDWITNESS", multisig=multisig),
            dict(path=[0x80000000 + 45, 0x80000000, 0, 0], scriptType="SPENDWITNESS", multisig=multisig),
            dict(path=account + [0, 0], scriptType="SPENDWITNESS", multisig={**multisig, "m": 0}),
            dict(path=[0x80000000 + 48, 0x80000000, 0x80000000, 0x80000000 + 1, 0, 0],
                 scriptType="SPENDWITNESS", multisig=multisig),
        )
        for params in rejected:
            device.order.clear()
            with self.subTest(path=params["path"][0]), self.assertRaises(HelperError) as raised:
                call(helper, "sign", dict(
                    connectId="usb1", binding=binding, coin="Bitcoin", version=2, locktime=0, refTxs=[],
                    inputs=[dict(prev_hash=TXID, prev_index=0, amount="1000", sequence=1,
                                 address_n=params["path"], script_type=params["scriptType"],
                                 **({"multisig": params["multisig"]} if "multisig" in params else {}))],
                    outputs=[dict(amount="1", address="bc1qexample", script_type="PAYTOADDRESS")]))
            self.assertEqual("INVALID_REQUEST", raised.exception.code)
            self.assertEqual([], device.order)

    def test_bip48_nested_segwit_is_accepted_and_the_native_script_type_is_not(self):
        helper, device = helper_for()
        binding = call(helper, "open", {"connectId": "usb1", "mode": "standard"})
        account = [0x80000000 + 48, 0x80000000, 0x80000000, 0x80000000 + 1]
        opened = call(helper, "xpub", dict(connectId="usb1", binding=binding, coin="Bitcoin",
                                           path=account, scriptType="SPENDP2SHWITNESS"))
        self.assertEqual("xpub-test", opened["xpub"])
        node = {"depth": 4, "fingerprint": 1, "child_num": 0x80000001, "chain_code": "cd" * 32,
                "public_key": "02" + "44" * 32, "address_n": [0, 1]}
        multisig = {"m": 1, "pubkeys": [node, {**node, "public_key": "03" + "55" * 32, "address_n": [0, 1]}]}
        path = account + [0, 1]
        device.address = "3nested"
        shown = call(helper, "address", dict(
            connectId="usb1", binding=binding, coin="Bitcoin", path=path,
            scriptType="SPENDP2SHWITNESS", multisig=multisig))
        self.assertEqual("3nested", shown["address"])
        previous = dict(hash=TXID, version=1, lock_time=0,
                        inputs=[dict(prev_hash="22" * 32, prev_index=0, script_sig="", sequence=0xFFFFFFFF)],
                        bin_outputs=[dict(amount="1000", script_pubkey="a914" + "33" * 20 + "87")])
        call(helper, "sign", dict(
            connectId="usb1", binding=binding, coin="Bitcoin", version=2, locktime=0, refTxs=[previous],
            inputs=[dict(prev_hash=TXID, prev_index=0, amount="1000", sequence=0xFFFFFFFF,
                         address_n=path, script_type="SPENDP2SHWITNESS", multisig=multisig)],
            outputs=[dict(amount="900", address_n=path, script_type="PAYTOP2SHWITNESS", multisig=multisig)]))
        input_tx = codec.decode_fields(codec._last(codec.decode_fields(device.acks[0]), 1, 2))
        output_tx = codec.decode_fields(codec._last(codec.decode_fields(device.acks[1]), 1, 2))
        signed_input = codec.decode_fields(codec._last(input_tx, 2, 2))
        signed_output = codec.decode_fields(codec._last(output_tx, 5, 2))
        self.assertEqual(4, codec.opt_uint(signed_input, 6))
        self.assertEqual(5, codec.opt_uint(signed_output, 4))
        self.assertEqual(0x80000001, codec.decode_multisig(codec._last(signed_input, 7, 2))["pubkeys"][0]["child_num"])
        rejected = (
            dict(path=path, scriptType="SPENDP2SHWITNESS"),
            dict(path=account + [0, 0], scriptType="SPENDWITNESS", multisig=multisig),
            dict(path=[0x80000000 + 49, 0x80000000, 0x80000000, 0, 0],
                 scriptType="SPENDP2SHWITNESS", multisig=multisig),
        )
        for params in rejected:
            device.order.clear()
            with self.subTest(path=params["path"][0]), self.assertRaises(HelperError) as raised:
                call(helper, "sign", dict(
                    connectId="usb1", binding=binding, coin="Bitcoin", version=2, locktime=0, refTxs=[],
                    inputs=[dict(prev_hash=TXID, prev_index=0, amount="1000", sequence=1,
                                 address_n=params["path"], script_type=params["scriptType"],
                                 **({"multisig": params["multisig"]} if "multisig" in params else {}))],
                    outputs=[dict(amount="1", address="3example", script_type="PAYTOADDRESS")]))
            self.assertEqual("INVALID_REQUEST", raised.exception.code)
            self.assertEqual([], device.order)

    def test_depth_zero_master_is_accepted_and_a_parent_fingerprint_is_not(self):
        helper, device = helper_for()
        binding = call(helper, "open", {"connectId": "usb1", "mode": "standard"})
        account = [0x80000000 + 48, 0x80000000, 0x80000000, 0x80000000 + 2]
        node = {"depth": 0, "fingerprint": 0, "child_num": 0, "chain_code": "cd" * 32,
                "public_key": "02" + "44" * 32, "address_n": [0, 0]}
        other = {**node, "public_key": "03" + "55" * 32, "depth": 4, "fingerprint": 1, "child_num": 0x80000002}
        multisig = {"m": 1, "pubkeys": [node, other]}
        path = account + [0, 0]
        previous = dict(hash=TXID, version=1, lock_time=0,
                        inputs=[dict(prev_hash="22" * 32, prev_index=0, script_sig="", sequence=0xFFFFFFFF)],
                        bin_outputs=[dict(amount="1000", script_pubkey="0014" + "33" * 20)])
        call(helper, "sign", dict(
            connectId="usb1", binding=binding, coin="Bitcoin", version=2, locktime=0, refTxs=[previous],
            inputs=[dict(prev_hash=TXID, prev_index=0, amount="1000", sequence=0xFFFFFFFF,
                         address_n=path, script_type="SPENDWITNESS", multisig=multisig)],
            outputs=[dict(amount="900", address_n=path, script_type="PAYTOWITNESS", multisig=multisig)]))
        self.assertEqual(codec.TX_FINISHED, device.order[-1])
        for script_index, script_type, output_type in ((1, "SPENDP2SHWITNESS", "PAYTOP2SHWITNESS"),):
            nested = [0x80000000 + 48, 0x80000000, 0x80000000, 0x80000000 + script_index]
            device.order.clear()
            call(helper, "sign", dict(
                connectId="usb1", binding=binding, coin="Bitcoin", version=2, locktime=0, refTxs=[previous],
                inputs=[dict(prev_hash=TXID, prev_index=0, amount="1000", sequence=0xFFFFFFFF,
                             address_n=nested + [0, 0], script_type=script_type, multisig=multisig)],
                outputs=[dict(amount="900", address_n=nested + [0, 0], script_type=output_type, multisig=multisig)]))
            self.assertEqual(codec.TX_FINISHED, device.order[-1])
        for fingerprint, child_num in ((1, 0), (0, 1)):
            device.order.clear()
            rejected = {**node, "fingerprint": fingerprint, "child_num": child_num}
            with self.subTest(fingerprint=fingerprint, child_num=child_num), self.assertRaises(HelperError) as raised:
                call(helper, "sign", dict(
                    connectId="usb1", binding=binding, coin="Bitcoin", version=2, locktime=0, refTxs=[previous],
                    inputs=[dict(prev_hash=TXID, prev_index=0, amount="1000", sequence=0xFFFFFFFF,
                                 address_n=path, script_type="SPENDWITNESS",
                                 multisig={"m": 1, "pubkeys": [rejected, other]})],
                    outputs=[dict(amount="900", address="bc1qexample", script_type="PAYTOADDRESS")]))
            self.assertEqual("INVALID_REQUEST", raised.exception.code)
            self.assertEqual([], device.order)

    def test_previous_output_larger_than_one_frame_is_rejected_before_sign_tx(self):
        helper, device = helper_for()
        binding = call(helper, "open", {"connectId": "usb1", "mode": "standard"})
        previous = dict(hash=TXID, version=1, lock_time=0,
                        inputs=[dict(prev_hash="22" * 32, prev_index=0, script_sig="", sequence=0xFFFFFFFF)],
                        bin_outputs=[dict(amount="1000", script_pubkey="00" * 4200)])
        device.order.clear()
        pins = list(device.pins)
        with self.assertRaises(HelperError) as raised:
            call(helper, "sign", dict(
                connectId="usb1", binding=binding, coin="Bitcoin", version=2, locktime=0, refTxs=[previous],
                inputs=[dict(prev_hash=TXID, prev_index=0, amount="1000", sequence=0xFFFFFFFF,
                             address_n=ADDRESS_PATH, script_type="SPENDWITNESS")],
                outputs=[dict(amount="900", address="bc1qexample", script_type="PAYTOADDRESS")]))
        self.assertEqual("INVALID_REQUEST", raised.exception.code)
        self.assertEqual([], device.order)
        self.assertEqual(pins, device.pins)

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


class TestFailureRequestFamily(unittest.TestCase):
    """V2 Failure subcodes are decoded against the request that produced them."""

    @staticmethod
    def failure(subcode=None, message=None):
        body = codec.enc_uint(1, 5)
        if subcode is not None:
            body += codec.enc_uint(2, subcode)
        if message is not None:
            body += codec.enc_str(3, message)
        return body

    def run_call(self, msg_type, body, *, button_first=False):
        replies = ([(codec.BUTTON_REQUEST, b"")] if button_first else []) + [(codec.FAILURE, body)]

        class Link:
            def exchange(self, _msg_type, _payload, **_kwargs):
                return replies.pop(0)

        session = Session(Link(), deadline=None, cancelled=None, on_ui=None, cache={}, connect_id="usb1")
        with self.assertRaises(SessionError) as raised:
            session._call(msg_type, b"", codec.SUCCESS)
        return raised.exception.code

    def test_subcode_free_process_error_is_a_failure_not_a_cancel(self):
        for message in ("Not enough funds", "device locked", None):
            with self.subTest(message=message):
                self.assertEqual("SDK_FAILED", self.run_call(codec.SIGN_TX, self.failure(message=message)))
                self.assertEqual("SDK_FAILED", self.run_call(codec.DEVICE_STATUS_GET, self.failure(message=message)))

    def test_legacy_cancel_messages_without_subcode_are_cancellation(self):
        for message in ("Cancelled", "cancelled on device", "User cancelled", "Confirm dismissed"):
            with self.subTest(message=message):
                self.assertEqual("FIRMWARE_CANCELLED", self.run_call(codec.SIGN_TX, self.failure(message=message)))

    def test_cancel_subcode_is_scoped_to_wallet_and_session_requests(self):
        cancelled = self.failure(codec.SESSION_CANCELLED, "Busy")
        self.assertEqual("FIRMWARE_CANCELLED", self.run_call(codec.DEVICE_SESSION_ASK_PIN, cancelled))
        self.assertEqual("FIRMWARE_CANCELLED", self.run_call(codec.SIGN_TX, cancelled, button_first=True))
        for msg_type in (codec.PING, codec.DEVICE_STATUS_GET, codec.DEVICE_INFO_GET, codec.PROTOCOL_INFO_REQUEST):
            with self.subTest(msg_type=msg_type):
                self.assertEqual("SDK_FAILED", self.run_call(msg_type, cancelled))

    def test_invalid_session_subcode_only_for_session_requests(self):
        invalid = self.failure(codec.SESSION_INVALID)
        self.assertEqual("WALLET_SESSION_INVALID", self.run_call(codec.DEVICE_SESSION_GET, invalid))
        self.assertEqual("SDK_FAILED", self.run_call(codec.SIGN_TX, invalid))


class TestInteractiveDeadline(unittest.TestCase):
    def test_each_user_confirmation_gets_its_own_window(self):
        seen = []
        replies = [(codec.BUTTON_REQUEST, b""), (codec.SUCCESS, b""), (codec.DEVICE_STATUS, b"")]

        class FakeLink:
            def exchange(self, msg_type, _payload, *, deadline, cancelled):
                seen.append((msg_type, deadline))
                return replies.pop(0)

        with mock.patch("onekey.device.time.monotonic", side_effect=[1000.0, 1500.0]):
            session = Session(FakeLink(), deadline=130.0, cancelled=None, on_ui=None, cache={}, connect_id="usb1")
            session._call(codec.DEVICE_SESSION_ASK_PIN, b"", codec.SUCCESS)
            session._call(codec.DEVICE_STATUS_GET, b"", codec.DEVICE_STATUS)
        self.assertEqual([(codec.DEVICE_SESSION_ASK_PIN, 1120.0), (codec.BUTTON_ACK, 1620.0),
                          (codec.DEVICE_STATUS_GET, 1620.0)], seen)
