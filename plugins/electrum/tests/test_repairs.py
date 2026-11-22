"""Protocol regressions using the actual adapter and an in-memory USB peer."""
import concurrent.futures
import threading
import time
import unittest
from types import SimpleNamespace
from unittest import mock

from onekey import codec, usb
from onekey.device import Session
from onekey.frame import decode, split_message
from onekey.ipc import Helper, HelperError
from onekey.link import Link, LinkError
from test_protocol import ACCOUNT, SIGNATURE, Scripted, call, encode_reply, helper_for, pipe_link


def binding(kind="hidden", address="synthetic-public-wallet-identity"):
    return dict(deviceId="synthetic-device", serialNo="synthetic-serial", walletType=kind,
                passphraseState=None if kind == "standard" else address)


def public_key(helper, expected):
    return call(helper, "xpub", dict(connectId="usb1", binding=expected, coin="Bitcoin",
                                     path=ACCOUNT, scriptType="SPENDWITNESS"))


class TestProtocolRepairs(unittest.TestCase):
    def test_tx_hashes_use_display_order_in_both_directions(self):
        txid = bytes(range(32)).hex()
        item = dict(prev_hash=txid, prev_index=1, amount="10", sequence=1,
                    address_n=ACCOUNT + [0, 0], script_type="SPENDWITNESS")
        tx = codec.decode_fields(codec._last(codec.decode_fields(codec.encode_tx_ack(codec.TX_INPUT, item)), 1, 2))
        encoded = codec._last(codec.decode_fields(codec._last(tx, 2, 2)), 2, 2)
        self.assertTrue(encoded == bytes.fromhex(txid), 'Input hash byte order differs from the SDK protobuf contract')
        reference = dict(hash=txid)
        self.assertIs(reference, Session._previous([reference], bytes.fromhex(txid)))

    def test_two_input_legacy_signing_completes_all_digest_and_serialization_rounds(self):
        device = Scripted()
        helper, device = helper_for(device)
        hashes = ['11' * 32, '22' * 32]
        requests = [(codec.TX_INPUT, i, b'', None) for i in range(2)]
        requests += [(codec.TX_OUTPUT, i, b'', None) for i in range(2)]
        for txid in hashes:
            requests += [(kind, 0, bytes.fromhex(txid), None) for kind in (codec.TX_META, codec.TX_INPUT, codec.TX_OUTPUT)]
        for _ in range(2):
            requests += [(codec.TX_INPUT, i, b'', None) for i in range(2)]
            requests += [(codec.TX_OUTPUT, i, b'', None) for i in range(2)]
        requests += [(codec.TX_INPUT, i, b'', i) for i in range(2)]
        requests += [(codec.TX_OUTPUT, i, b'', None) for i in range(2)]
        requests += [(codec.TX_FINISHED, 0, b'', None)]
        original = device.handle
        seen = []

        def handle(kind, payload):
            if kind in (codec.SIGN_TX, codec.TX_ACK):
                request, index, tx_hash, signature_index = requests[len(seen)]
                seen.append(request)
                return codec.TX_REQUEST, codec.encode_tx_request(request, index=index, tx_hash=tx_hash,
                    signature=SIGNATURE if signature_index is not None else None, signature_index=signature_index)
            return original(kind, payload)

        device.handle = handle
        path = [0x8000002c, 0x80000000, 0x80000000, 0, 0]
        inputs = [dict(prev_hash=h, prev_index=0, amount='1000', sequence=0xffffffff,
                       address_n=path, script_type='SPENDADDRESS') for h in hashes]
        outputs = [dict(amount='900', address='synthetic-address', script_type='PAYTOADDRESS')] * 2
        previous = [dict(hash=h, version=1, lock_time=0, inputs=[dict(prev_hash='33'*32, prev_index=0,
                    script_sig='', sequence=0xffffffff)], bin_outputs=[dict(amount='1000', script_pubkey='00')]) for h in hashes]
        result = call(helper, 'sign', dict(connectId='usb1', binding=binding('standard'), coin='Bitcoin',
                       inputs=inputs, outputs=outputs, refTxs=previous, version=2, locktime=0))
        self.assertEqual(23, len(seen))
        self.assertEqual([0, 1], [s['index'] for s in result['signatures']])

    def test_cold_matching_hidden_and_attach_wallet_do_not_prompt(self):
        for attached in (False, True):
            with self.subTest(attached=attached):
                device = Scripted()
                device.locked = False
                device.device_id = 'synthetic-device'
                device.unlocked_by_attach = attached
                device.install_session(device.hidden)
                helper, device = helper_for(device)
                public_key(helper, binding())
                self.assertEqual([], device.on_device)
                self.assertEqual([], device.pins)

    def test_explicit_attach_selection_can_choose_another_slot(self):
        device = Scripted()
        device.locked = False
        device.device_id = 'synthetic-device'
        device.unlocked_by_attach = True
        device.install_session('old-attach-wallet')
        device.hidden = 'target-attach-wallet'
        original = device.handle
        locks = []

        def handle(kind, payload):
            if kind == 24:
                locks.append(kind)
                device.locked = True
                device.unlocked_by_attach = False
                device.session_id = device.session_address = None
                return codec.SUCCESS, b''
            return original(kind, payload)

        device.handle = handle
        helper, device = helper_for(device)
        result = call(helper, 'open', dict(connectId='usb1', mode='select-attach-pin'))
        self.assertEqual('target-attach-wallet', result['passphraseState'])
        self.assertEqual([24], locks)
        self.assertEqual([codec.PIN_ATTACH], device.pins)

    def test_saved_attach_wallet_switches_from_another_attach_slot(self):
        for cached in (False, True):
            with self.subTest(cached=cached):
                helper, device = helper_for()
                self.addCleanup(helper.shutdown)
                expected = binding('attach-pin')
                if cached:
                    public_key(helper, expected)
                device.pins.clear()
                device.material = False
                device.locked = False
                device.device_id = 'synthetic-device'
                device.unlocked_by_attach = True
                device.install_session('other-attach-wallet')

                self.assertEqual('xpub-test', public_key(helper, expected)['xpub'])
                self.assertEqual(1, device.locks)
                self.assertEqual([codec.PIN_ATTACH], device.pins)
                self.assertEqual(expected['passphraseState'], device.session_address)
                self.assertEqual([], device.on_device)
                self.assertTrue(device.material)

    def test_saved_attach_wallet_retry_prompts_after_wrong_slot(self):
        device = Scripted()
        device.locked = False
        device.device_id = 'synthetic-device'
        device.unlocked_by_attach = True
        device.install_session('other-attach-wallet')
        expected = binding('attach-pin')
        device.hidden = 'wrong-attach-wallet'
        helper, device = helper_for(device)
        self.addCleanup(helper.shutdown)

        with self.assertRaises(HelperError) as raised:
            public_key(helper, expected)
        self.assertEqual('WALLET_MISMATCH', raised.exception.code)
        self.assertEqual(1, device.locks)
        self.assertEqual([codec.PIN_ATTACH], device.pins)
        self.assertFalse(device.material)

        device.hidden = expected['passphraseState']
        self.assertEqual('xpub-test', public_key(helper, expected)['xpub'])
        self.assertEqual(2, device.locks)
        self.assertEqual([codec.PIN_ATTACH, codec.PIN_ATTACH], device.pins)
        self.assertEqual(expected['passphraseState'], device.session_address)
        self.assertEqual([], device.on_device)

    def test_pin_switch_refreshes_identity_before_reading_material(self):
        device = Scripted()
        original = device.handle

        def handle(kind, payload):
            result = original(kind, payload)
            if kind == codec.DEVICE_SESSION_ASK_PIN:
                device.device_id = 'changed-initialization'
            return result

        device.handle = handle
        helper, device = helper_for(device)
        with self.assertRaises(HelperError):
            public_key(helper, binding('standard'))
        self.assertFalse(device.material)

    def test_post_operation_locked_status_rejects_even_a_present_old_id(self):
        device = Scripted()
        original = device.status
        device.status = lambda: (codec.DEVICE_STATUS, codec.encode_status('synthetic-device', unlocked=False)) if device.material else original()
        helper, device = helper_for(device)
        with self.assertRaises(HelperError):
            public_key(helper, binding('standard'))

    def test_cached_attach_binding_after_main_pin_requires_attach_pin_again(self):
        helper, device = helper_for()
        selected = call(helper, 'open', dict(connectId='usb1', mode='select-attach-pin'))
        device.unlocked_by_attach = False
        device.install_session('standard-wallet')
        public_key(helper, selected)
        self.assertEqual([codec.PIN_ATTACH, codec.PIN_ATTACH], device.pins)
        self.assertEqual(device.hidden, device.session_address)

    def test_failed_legacy_probe_does_not_hide_a_pro2(self):
        device = Scripted()

        def open_link(path, **kwargs):
            if path == 'legacy':
                return Link(lambda *_: (_ for _ in ()).throw(LinkError('TIMEOUT')), lambda _: None)
            return pipe_link(device)

        with mock.patch('onekey.ipc.list_paths', return_value=['legacy', 'usb1']), mock.patch('onekey.ipc.open_path', side_effect=open_link):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            self.assertEqual(['usb1'], [d['connectId'] for d in call(helper, 'search', {})])

    def test_host_cancel_sends_cancel_drops_claim_and_never_reuses_link(self):
        device = Scripted()
        cancelled = threading.Event()
        sent = []
        closed = []
        original = device.handle

        def handle(kind, payload):
            sent.append(kind)
            if kind == 20:
                return codec.SUCCESS, b''
            response = original(kind, payload)
            if kind == codec.DEVICE_SESSION_ASK_PIN:
                cancelled.set()
            return response

        device.handle = handle
        with mock.patch('onekey.ipc.open_path', side_effect=lambda path, **kwargs: pipe_link(device, lambda: closed.append(path))):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            with concurrent.futures.ThreadPoolExecutor() as pool:
                with self.assertRaisesRegex(HelperError, 'CANCELLED'):
                    pool.submit(helper.call, 'open', dict(connectId='usb1', mode='standard'), cancelled=cancelled).result(timeout=3)
            self.assertEqual([20], [kind for kind in sent if kind == 20])
            self.assertEqual(['usb1'], closed)
            call(helper, 'state', dict(connectId='usb1'))
            self.assertEqual(1, device.pins.count(codec.PIN_MAIN))

    def test_reconnect_continues_the_device_send_sequence(self):
        device = Scripted()
        sequences = []
        links = []

        def open_link(path, **kwargs):
            link = pipe_link(device)
            write = link._write
            link._write = lambda data: (sequences.append(decode(data).seq), write(data))[-1]
            links.append(link)
            return link

        with mock.patch('onekey.ipc.open_path', side_effect=open_link):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            call(helper, 'state', dict(connectId='usb1'))
            previous = sequences[-1]
            helper._drop('usb1')
            call(helper, 'state', dict(connectId='usb1'))
            self.assertEqual(previous + 1, sequences[-3])

    def test_release_one_device_keeps_the_other_claim_and_generation(self):
        device = Scripted()
        closed = []
        with mock.patch('onekey.ipc.open_path', side_effect=lambda path, **kwargs: pipe_link(device, lambda: closed.append(path))):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            for path in ('usb1', 'usb2'):
                call(helper, 'state', dict(connectId=path))
            generation = helper.generation
            helper.release('usb1')
            self.assertEqual(['usb1'], closed)
            self.assertEqual(generation, helper.generation)
            call(helper, 'state', dict(connectId='usb2'))

    def test_usb_reclaim_drains_old_replies_before_probe(self):
        class Timeout(Exception):
            pass
        incoming = [encode_reply(codec.DEVICE_STATUS, codec.encode_status('stale'))]
        handle = mock.Mock()

        def read(*_args):
            if incoming:
                return incoming.pop(0)
            raise Timeout()

        def write(_endpoint, data, _timeout):
            incoming.append(encode_reply(codec.SUCCESS, b''))
            return len(data)

        handle.bulkRead.side_effect = read
        handle.bulkWrite.side_effect = write
        handle.kernelDriverActive.return_value = False
        device = mock.Mock()
        device.open.return_value = handle
        context = mock.Mock()
        context.getDeviceIterator.return_value = [device]
        driver = SimpleNamespace(USBErrorTimeout=Timeout)
        with mock.patch.object(usb, '_usb1', return_value=driver), mock.patch.object(usb, '_context', return_value=context), \
                mock.patch.object(usb, '_path', return_value='usb1'), mock.patch.object(usb, '_endpoints', return_value=(0, 129, 1)):
            link = usb.open_path('usb1')
            try:
                session = Session(link, deadline=time.monotonic()+1, cancelled=None, on_ui=None, cache={}, connect_id='usb1')
                session.handshake()
            finally:
                link.close()

    def test_cancel_at_button_request_sends_only_cancel_and_releases_link(self):
        device = Scripted()
        cancelled = threading.Event()
        sent = []
        closed = []
        original = device.handle

        def handle(kind, payload):
            sent.append(kind)
            if kind == codec.DEVICE_SESSION_ASK_PIN:
                return codec.BUTTON_REQUEST, b''
            if kind == codec.CANCEL:
                return None
            return original(kind, payload)

        device.handle = handle
        with mock.patch('onekey.ipc.open_path', side_effect=lambda _: pipe_link(device, lambda: closed.append(True))):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            with concurrent.futures.ThreadPoolExecutor() as pool:
                with self.assertRaisesRegex(HelperError, 'CANCELLED'):
                    pool.submit(helper.call, 'open', dict(connectId='usb1', mode='standard'),
                                cancelled=cancelled, on_ui=lambda event: cancelled.set() if event == 'button' else None).result(timeout=2)
        self.assertEqual(codec.CANCEL, sent[-1])
        self.assertNotIn(codec.BUTTON_ACK, sent)
        self.assertEqual([True], closed)

    def test_timeout_invalidates_link_and_does_not_replay_request(self):
        written = []
        closed = []

        def read(*_args):
            time.sleep(.003)
            return b''

        link = Link(read, written.append, lambda: closed.append(True))
        with self.assertRaisesRegex(LinkError, 'TIMEOUT'):
            link.exchange(codec.DEVICE_SESSION_ASK_PIN, b'', deadline=time.monotonic()+.005, cancelled=None)
        with self.assertRaisesRegex(LinkError, 'STALE'):
            link.exchange(codec.DEVICE_SESSION_ASK_PIN, b'', deadline=time.monotonic()+1, cancelled=None)
        kinds = [split_message(decode(data).payload)[0] for data in written]
        self.assertEqual([codec.DEVICE_SESSION_ASK_PIN, codec.CANCEL], kinds)
        self.assertEqual([True], closed)

    def test_discovery_preserves_global_cancel_and_established_link_failures(self):
        cancelled = threading.Event()
        cancelled.set()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            helper = Helper(ports={})
            with self.assertRaisesRegex(HelperError, 'CANCELLED'):
                pool.submit(helper.call, 'search', {}, cancelled=cancelled).result(timeout=2)
        device = Scripted()
        with mock.patch('onekey.ipc.list_paths', return_value=['usb1']), \
                mock.patch('onekey.ipc.open_path', side_effect=lambda _: pipe_link(device)):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            call(helper, 'state', dict(connectId='usb1'))
            device.broken = True
            with self.assertRaisesRegex(HelperError, 'PROTOCOL'):
                call(helper, 'search', {})
            self.assertEqual({}, helper._links)

    def test_explicit_hidden_selection_exits_attach_unlock_before_passphrase(self):
        device = Scripted()
        device.locked = False
        device.device_id = 'synthetic-device'
        device.unlocked_by_attach = True
        device.install_session('previous-attach-wallet')
        helper, device = helper_for(device)
        selected = call(helper, 'open', dict(connectId='usb1', mode='select-hidden'))
        self.assertEqual([codec.PIN_MAIN], device.pins)
        self.assertEqual([(True, None)], device.on_device)
        self.assertEqual(device.hidden, selected['passphraseState'])

    def test_cancel_one_device_keeps_other_generation_and_releases_all_claims(self):
        first, second = Scripted(), Scripted()
        cancelled = threading.Event()
        closed = []
        original = first.handle

        def handle(kind, payload):
            if kind == codec.CANCEL:
                return None
            result = original(kind, payload)
            if kind == codec.DEVICE_SESSION_ASK_PIN:
                cancelled.set()
            return result

        first.handle = handle
        with mock.patch('onekey.ipc.open_path', side_effect=lambda path: pipe_link(
                first if path == 'usb1' else second, lambda: closed.append(path))):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            for path in ('usb1', 'usb2'):
                call(helper, 'state', dict(connectId=path))
            generation = helper.generation
            with concurrent.futures.ThreadPoolExecutor() as pool:
                with self.assertRaisesRegex(HelperError, 'CANCELLED'):
                    pool.submit(helper.call, 'open', dict(connectId='usb1', mode='standard'),
                                cancelled=cancelled).result(timeout=2)
            self.assertEqual(generation, helper.generation)
            call(helper, 'state', dict(connectId='usb2'))
            helper.release('usb2')
            self.assertEqual(['usb1', 'usb2'], closed)
            self.assertEqual({}, helper._links)

    def test_discovery_does_not_hide_usb_communication_or_access_failures(self):
        for code in ('SDK_FAILED', 'USB_UNAVAILABLE'):
            with self.subTest(code=code), mock.patch('onekey.ipc.list_paths', return_value=['usb1']), \
                    mock.patch('onekey.ipc.open_path', side_effect=LinkError(code)):
                helper = Helper()
                self.addCleanup(helper.shutdown)
                with self.assertRaisesRegex(HelperError, code):
                    call(helper, 'search', {})

    def test_cancelled_and_expired_queued_calls_never_start_usb_operations(self):
        for cancel in (False, True):
            with self.subTest(cancel=cancel):
                helper = Helper(ports={})
                call(helper, 'hello', {})
                cancelled = threading.Event()
                entered = threading.Event()

                def queued():
                    entered.set()
                    return helper.call('state', dict(connectId='usb1'), timeout=.002,
                                       cancelled=cancelled if cancel else None)

                with mock.patch('onekey.ipc.open_path') as opened, concurrent.futures.ThreadPoolExecutor() as pool:
                    helper._lock.acquire()
                    try:
                        future = pool.submit(queued)
                        self.assertTrue(entered.wait(1))
                        if cancel:
                            cancelled.set()
                        else:
                            time.sleep(.01)
                    finally:
                        helper._lock.release()
                    with self.assertRaisesRegex(HelperError, 'CANCELLED' if cancel else 'TIMEOUT'):
                        future.result(timeout=2)
                    opened.assert_not_called()

    def test_probe_timeout_never_sends_a_wire_cancel_to_an_unknown_device(self):
        written = []

        def read(*_args):
            time.sleep(.003)
            return b''

        link = Link(read, written.append)
        with self.assertRaisesRegex(LinkError, 'TIMEOUT'):
            link.exchange(codec.PING, b'', deadline=time.monotonic()+.005, cancelled=None)
        self.assertEqual([codec.PING], [split_message(decode(data).payload)[0] for data in written])


class TestReceiveFrames(unittest.TestCase):
    @staticmethod
    def response(seq, **kwargs):
        from onekey.frame import encode_message
        return encode_message(codec.SUCCESS, b'', seq=seq, **kwargs)

    def link(self, incoming):
        writes, closed = [], []
        chunks = iter(incoming)
        link = Link(lambda *_: next(chunks, b''), writes.append, lambda: closed.append(True))
        self.addCleanup(link.close)
        return link, writes, closed

    @staticmethod
    def exchange(link):
        return link.exchange(codec.PING, b'', deadline=time.monotonic()+1, cancelled=None)

    def rejected(self, link, writes, closed):
        with self.assertRaisesRegex(LinkError, 'PROTOCOL'):
            self.exchange(link)
        self.assertEqual([True], closed)
        count = len(writes)
        with self.assertRaisesRegex(LinkError, 'STALE'):
            self.exchange(link)
        self.assertEqual(count, len(writes))
        self.assertTrue(all(split_message(decode(frame).payload)[0] == codec.PING for frame in writes))

    def test_coalesced_duplicate_response_cannot_cross_exchanges(self):
        link, writes, closed = self.link([self.response(7) * 2])
        self.assertEqual((codec.SUCCESS, b''), self.exchange(link))
        self.rejected(link, writes, closed)
        self.assertEqual(2, len(writes))

    def test_packet_and_ack_require_usb_command_route(self):
        from onekey.frame import encode
        for channel, source in ((3, 0), (0, 2), (3, 2)):
            for ack in (False, True):
                with self.subTest(channel=channel, source=source, ack=ack):
                    bad = (encode(b'', seq=1, channel=channel, packet_src=source, packet_type=1)
                           if ack else self.response(7, channel=channel, packet_src=source))
                    link, writes, closed = self.link([bad + self.response(8)])
                    self.rejected(link, writes, closed)
                    self.assertEqual(1, len(writes))

    def test_ack_sequence_must_echo_the_current_request(self):
        from onekey.frame import encode
        link, writes, closed = self.link([encode(b'', seq=2, packet_type=1) + self.response(7)])
        self.rejected(link, writes, closed)

    def test_ack_for_previous_request_is_not_accepted_on_next_exchange(self):
        from onekey.frame import encode
        link, writes, closed = self.link([self.response(7), encode(b'', seq=1, packet_type=1) + self.response(8)])
        self.exchange(link)
        self.rejected(link, writes, closed)

    def test_receive_header_rejects_zero_sequence_bad_ack_length_and_unknown_type(self):
        from onekey.frame import encode
        for packet_type, seq, payload in ((0, 0, b'\x2f\xeb'), (1, 0, b''),
                                         (1, 1, b'\x00'), (2, 1, b''), (3, 1, b'')):
            with self.subTest(packet_type=packet_type, seq=seq, payload_size=len(payload)):
                bad = encode(payload, seq=seq, packet_type=packet_type)
                with self.assertRaises(ValueError):
                    decode(bad)
                link, writes, closed = self.link([bad + self.response(8)])
                self.rejected(link, writes, closed)

    def test_ack_does_not_reset_the_business_response_sequence(self):
        from onekey.frame import encode
        link, writes, closed = self.link([self.response(7), encode(b'', seq=2, packet_type=1) + self.response(7)])
        self.exchange(link)
        self.rejected(link, writes, closed)

    def test_valid_ack_optional_responses_gaps_wrap_and_nonconsecutive_reuse(self):
        from onekey.frame import encode
        sequences = (7, 200, 255, 1, 7)
        # Request and device send sequences are independent. ACKs echo the
        # request only, and do not consume the device business-response cursor.
        incoming = [encode(b'', seq=255, packet_type=1) * 2 + self.response(sequences[0])]
        incoming += [encode(b'', seq=1, packet_type=1) + self.response(sequences[1])]
        incoming += [self.response(seq) for seq in sequences[2:]]
        link, writes, closed = self.link(incoming)
        link._seq._seq = 254
        for _ in sequences:
            self.assertEqual((codec.SUCCESS, b''), self.exchange(link))
        self.assertEqual([255, 1, 2, 3, 4], [decode(frame).seq for frame in writes])
        self.assertEqual([], closed)

    def test_helper_drops_bad_receive_link_and_cache_without_replay(self):
        from onekey.frame import encode_message
        incoming, writes, closed = bytearray(), [], []

        def write(frame):
            kind, _ = split_message(decode(frame).payload)
            writes.append(kind)
            reply = {codec.PING: (codec.SUCCESS, b'', 7),
                     codec.DEVICE_STATUS_GET: (codec.DEVICE_STATUS, codec.encode_status(None), 7),
                     codec.DEVICE_INFO_GET: (codec.DEVICE_INFO, codec.encode_device_info('pro2', 'synthetic-serial'), 8)}
            msg, payload, seq = reply[kind]
            incoming.extend(encode_message(msg, payload, seq=seq))

        def read(*_args):
            data = bytes(incoming)
            incoming.clear()
            return data

        link = Link(read, write, lambda: closed.append(True))
        with mock.patch('onekey.ipc.open_path', return_value=link):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            generation = helper.generation
            helper._wallets['usb1'] = object()
            with self.assertRaisesRegex(HelperError, 'PROTOCOL'):
                call(helper, 'state', dict(connectId='usb1'))
            self.assertEqual({}, helper._links)
            self.assertEqual({}, helper._wallets)
            self.assertEqual(generation, helper.generation)
            self.assertEqual([codec.PING, codec.DEVICE_STATUS_GET], writes)
            self.assertEqual([True], closed)
