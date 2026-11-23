"""Protocol regressions using the actual adapter and an in-memory USB peer."""
import concurrent.futures
import threading
import time
import unittest
from types import SimpleNamespace
from unittest import mock

from electrum.plugin import run_in_hwd_thread
from electrum.util import UserCancelled, UserFacingException

from onekey import codec, usb
from onekey.client import OneKeyClient
from onekey.device import Session
from onekey.frame import decode, split_message
from onekey.ipc import Helper, HelperError
from onekey.link import Link, LinkError
from onekey.onekey import OneKeyPlugin
from test_protocol import ACCOUNT, ADDRESS_PATH, SIGNATURE, TXID, Scripted, call, encode_reply, helper_for, pipe_link


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

    def test_three_input_native_segwit_signing_completes_all_serialization_and_witness_rounds(self):
        self._three_input_segwit_signing('SPENDWITNESS', 84)

    def test_three_input_nested_segwit_signing_completes_all_serialization_and_witness_rounds(self):
        self._three_input_segwit_signing('SPENDP2SHWITNESS', 49)

    def _three_input_segwit_signing(self, script_type, purpose):
        helper, device = helper_for(Scripted())
        hashes = ['11' * 32, '22' * 32, '33' * 32]
        # Firmware steps 1-3: approve inputs/outputs, then verify each previous transaction.
        requests = [(codec.TX_INPUT, i, b'', None) for i in range(3)]
        requests += [(codec.TX_OUTPUT, i, b'', None) for i in range(2)]
        for i, txid in enumerate(hashes):
            requests += [(codec.TX_INPUT, i, b'', None)]
            requests += [(kind, 0, bytes.fromhex(txid), None) for kind in (codec.TX_META, codec.TX_INPUT, codec.TX_OUTPUT)]
        # Steps 4-7: serialize inputs/outputs, sign witnesses, then finish.
        requests += [(codec.TX_INPUT, i, b'', None) for i in range(3)]
        requests += [(codec.TX_OUTPUT, i, b'', None) for i in range(2)]
        # Each signature travels with the next request, including the last at TX_FINISHED.
        requests += [(codec.TX_INPUT, i, b'', i - 1 if i else None) for i in range(3)]
        requests += [(codec.TX_FINISHED, 0, b'', 2)]
        self.assertEqual(26, len(requests))
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
        path = [0x80000000 + purpose, 0x80000000, 0x80000000, 0, 0]
        inputs = [dict(prev_hash=h, prev_index=0, amount='1000', sequence=0xffffffff,
                       address_n=path, script_type=script_type) for h in hashes]
        outputs = [dict(amount='1400', address='synthetic-address', script_type='PAYTOADDRESS')] * 2
        previous = [dict(hash=h, version=1, lock_time=0, inputs=[dict(prev_hash='44'*32, prev_index=0,
                    script_sig='', sequence=0xffffffff)], bin_outputs=[dict(amount='1000', script_pubkey='00')]) for h in hashes]
        result = call(helper, 'sign', dict(connectId='usb1', binding=binding('standard'), coin='Bitcoin',
                       inputs=inputs, outputs=outputs, refTxs=previous, version=2, locktime=0))
        self.assertEqual(26, len(seen))
        self.assertEqual(codec.TX_FINISHED, seen[-1])
        self.assertEqual([dict(index=i, signature=SIGNATURE.hex()) for i in range(3)], result['signatures'])

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
        for failure in ('TIMEOUT', 'PROTOCOL', 'unexpected-ping', 'unsupported'):
            with self.subTest(failure=failure):
                device, legacy = Scripted(), Scripted()
                if failure == 'unexpected-ping':
                    legacy.handle = lambda *_: legacy.status()
                elif failure == 'unsupported':
                    legacy.status = lambda: (codec.DEVICE_STATUS, codec.encode_status(None, init_states=False))

                def open_link(path, **kwargs):
                    if path == 'legacy':
                        if failure in ('TIMEOUT', 'PROTOCOL'):
                            return Link(lambda *_: (_ for _ in ()).throw(LinkError(failure)), lambda _: None)
                        return pipe_link(legacy)
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

    def test_discovery_preserves_global_cancel_and_releases_failed_established_link(self):
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
            self.assertEqual([], call(helper, 'search', {}))
            self.assertEqual({}, helper._links)

    def test_discovery_never_returns_partial_results_after_global_cancel_or_deadline(self):
        for cancel, failure in ((cancel, failure) for cancel in (False, True)
                                for failure in ('link-error', 'unexpected-ping', 'framed-failure', 'final-state')):
            with self.subTest(cancel=cancel, failure=failure):
                first, second = Scripted(), Scripted()
                second_link = pipe_link(second)
                helper = Helper(ports={'usb1': pipe_link(first), 'usb2': second_link})
                self.addCleanup(helper.shutdown)
                cancelled = threading.Event()
                clock = [100.0]
                if failure == 'unexpected-ping':
                    second.handle = lambda *_: second.status()
                elif failure == 'framed-failure':
                    second.handle = lambda *_: (codec.FAILURE, codec.enc_uint(1, 1))
                exchange = second_link.exchange

                def fail_probe(*args, **kwargs):
                    reply = exchange(*args, **kwargs)
                    if failure == 'final-state' and args[0] != codec.DEVICE_INFO_GET:
                        return reply
                    # Abort after the framed reply arrives, before Session validates it.
                    if cancel:
                        cancelled.set()
                    else:
                        clock[0] = 102.0
                    if failure == 'link-error':
                        raise LinkError('PROTOCOL')
                    return reply

                second_link.exchange = fail_probe
                with mock.patch('onekey.ipc.time.monotonic', side_effect=lambda: clock[0]), \
                        concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    with self.assertRaisesRegex(HelperError, 'CANCELLED' if cancel else 'TIMEOUT'):
                        pool.submit(helper.call, 'search', {}, timeout=1, cancelled=cancelled).result(timeout=2)

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

    def test_device_open_error_is_usb_unavailable(self):
        device = mock.Mock()
        device.open.side_effect = OSError('gone')
        context = mock.Mock()
        context.getDeviceIterator.return_value = [device]
        with mock.patch.object(usb, '_usb1', return_value=SimpleNamespace(USBErrorTimeout=OSError)), \
                mock.patch.object(usb, '_context', return_value=context), \
                mock.patch.object(usb, '_path', return_value='usb1'), \
                mock.patch.object(usb, '_endpoints', return_value=(0, 129, 1)):
            with self.assertRaises(LinkError) as raised:
                usb.open_path('usb1')
        self.assertEqual('USB_UNAVAILABLE', raised.exception.code)

    def test_unclaimed_usb_failure_during_scan_keeps_a_claimed_device(self):
        for code in ('USB_UNAVAILABLE', 'SDK_FAILED'):
            with self.subTest(code=code):
                device = Scripted()

                def open_link(path, code=code):
                    if path == 'usb2':
                        raise LinkError(code)
                    return pipe_link(device)

                with mock.patch('onekey.ipc.list_paths', return_value=['usb1', 'usb2']), \
                        mock.patch('onekey.ipc.open_path', side_effect=open_link):
                    helper = Helper()
                    self.addCleanup(helper.shutdown)
                    call(helper, 'hello', {})
                    call(helper, 'state', dict(connectId='usb1'))
                    generation = helper.generation
                    plugin = OneKeyPlugin.__new__(OneKeyPlugin)
                    plugin.helper = helper
                    plugin._live_clients = set()
                    plugin.device_manager = lambda: SimpleNamespace(clients={})
                    with self.assertRaisesRegex(UserFacingException, code):
                        OneKeyPlugin.enumerate(plugin)
                    self.assertEqual(generation, helper.generation)
                    self.assertIn('usb1', helper._links)
                    call(helper, 'state', dict(connectId='usb1'))

    def test_cancel_during_probe_cleanup_does_not_open_the_next_candidate(self):
        cancelled = threading.Event()
        opened = []

        def open_link(path):
            opened.append(path)
            return pipe_link(Scripted(), lambda: cancelled.set())

        with mock.patch('onekey.ipc.list_paths', return_value=['usb1', 'usb2']), \
                mock.patch('onekey.ipc.open_path', side_effect=open_link):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            with concurrent.futures.ThreadPoolExecutor() as pool:
                with self.assertRaisesRegex(HelperError, 'CANCELLED'):
                    pool.submit(helper.call, 'search', {}, cancelled=cancelled).result(timeout=3)
        self.assertEqual(['usb1'], opened)

    def test_message_cancel_after_the_request_sends_wire_cancel(self):
        cancelled = threading.Event()
        written = []

        def read(*_args):
            cancelled.set()
            return b''

        link = Link(read, written.append)
        with self.assertRaisesRegex(LinkError, 'CANCELLED'):
            link.exchange(codec.SIGN_MESSAGE, b'', deadline=time.monotonic()+1, cancelled=cancelled)
        kinds = [split_message(decode(item).payload)[0] for item in written]
        self.assertEqual([codec.SIGN_MESSAGE, codec.CANCEL], kinds)

    def test_out_of_range_signing_index_is_protocol_and_keeps_the_other_device(self):
        first, second = Scripted(), Scripted()
        original = first.handle

        def handle(kind, payload):
            if kind == codec.SIGN_TX:
                return codec.TX_REQUEST, codec.encode_tx_request(codec.TX_INPUT, index=1)
            return original(kind, payload)

        first.handle = handle
        with mock.patch('onekey.ipc.open_path', side_effect=lambda path: pipe_link(first if path == 'usb1' else second)):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            for path in ('usb1', 'usb2'):
                call(helper, 'state', dict(connectId=path))
            generation = helper.generation
            opened = call(helper, 'open', dict(connectId='usb1', mode='standard'))
            previous = dict(hash=TXID, version=1, lock_time=0,
                            inputs=[dict(prev_hash='22' * 32, prev_index=0, script_sig='', sequence=0xFFFFFFFF)],
                            bin_outputs=[dict(amount='1000', script_pubkey='0014' + '33' * 20)])
            with self.assertRaises(HelperError) as raised:
                call(helper, 'sign', dict(
                    connectId='usb1', binding=opened, coin='Bitcoin', version=2, locktime=0, refTxs=[previous],
                    inputs=[dict(prev_hash=TXID, prev_index=0, amount='1000', sequence=0xFFFFFFFF,
                                 address_n=ADDRESS_PATH, script_type='SPENDWITNESS')],
                    outputs=[dict(amount='900', address='bc1qexample', script_type='PAYTOADDRESS')]))
            self.assertEqual('PROTOCOL', raised.exception.code)
            self.assertEqual(generation, helper.generation)
            self.assertNotIn('usb1', helper._links)
            self.assertIn('usb2', helper._links)
            call(helper, 'state', dict(connectId='usb2'))

    def _plugin(self, helper):
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin.helper = helper
        plugin._live_clients = set()
        plugin.retain_client = OneKeyPlugin.retain_client.__get__(plugin)
        plugin.release_helper = OneKeyPlugin.release_helper.__get__(plugin)
        plugin._sweep_unplugged = OneKeyPlugin._sweep_unplugged.__get__(plugin)
        plugin._connected_clients = OneKeyPlugin._connected_clients.__get__(plugin)
        plugin._release_device = OneKeyPlugin._release_device.__get__(plugin)
        manager = SimpleNamespace(clients={}, lock=threading.RLock())
        plugin.device_manager = lambda: manager
        return plugin, manager

    def test_firmware_cancel_keeps_the_open_client_and_the_other_device(self):
        first, second = Scripted(), Scripted()
        original = first.handle

        def handle(kind, payload):
            if kind == codec.DEVICE_SESSION_ASK_PASSPHRASE:
                return codec.FAILURE, codec.enc_uint(1, 5) + codec.enc_uint(2, codec.SESSION_CANCELLED)
            return original(kind, payload)

        first.handle = handle
        with mock.patch('onekey.ipc.open_path', side_effect=lambda path: pipe_link(first if path == 'usb1' else second)):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            plugin, manager = self._plugin(helper)
            client = run_in_hwd_thread(lambda: OneKeyClient('usb1', mock.Mock(), plugin))
            other = run_in_hwd_thread(lambda: OneKeyClient('usb2', mock.Mock(), plugin))
            manager.clients[client] = client.serial
            manager.clients[other] = other.serial
            client.handler.choose_wallet.return_value = 'select-hidden'
            generation = helper.generation
            with self.assertRaises(UserCancelled):
                client.get_xpub("m/84'/0'/0'", 'p2wpkh')
            self.assertFalse(client.closed)
            self.assertIn('usb1', helper._links)
            self.assertFalse(helper._links['usb1']._closed)
            self.assertEqual(generation, helper.generation)
            self.assertTrue(other.attached())
            call(helper, 'state', dict(connectId='usb2'))

    def test_host_cancel_during_passphrase_closes_that_client_only(self):
        first, second = Scripted(), Scripted()
        events = []
        sent = []

        def show_message(_text, on_cancel=None):
            events.append(on_cancel)

        def open_link(path):
            device = first if path == 'usb1' else second
            link = pipe_link(device)
            if path != 'usb1':
                return link
            write = link._write

            def wrapped(data):
                kind = split_message(decode(data).payload)[0]
                sent.append(kind)
                write(data)
                if kind == codec.DEVICE_SESSION_ASK_PASSPHRASE and events and events[-1] is not None:
                    events[-1]()

            link._write = wrapped
            return link

        with mock.patch('onekey.ipc.open_path', side_effect=open_link):
            helper = Helper()
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            plugin, manager = self._plugin(helper)
            handler = mock.Mock()
            handler.show_message.side_effect = show_message
            handler.choose_wallet.return_value = 'select-hidden'
            client = run_in_hwd_thread(lambda: OneKeyClient('usb1', handler, plugin))
            other = run_in_hwd_thread(lambda: OneKeyClient('usb2', mock.Mock(), plugin))
            manager.clients[client] = client.serial
            manager.clients[other] = other.serial
            generation = helper.generation
            with self.assertRaises(UserCancelled):
                client.get_xpub("m/84'/0'/0'", 'p2wpkh')
            self.assertTrue(client.closed)
            self.assertIn(codec.CANCEL, sent)
            self.assertNotIn('usb1', helper._links)
            self.assertEqual(generation, helper.generation)
            self.assertTrue(other.attached())
            call(helper, 'state', dict(connectId='usb2'))


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


class TestFrameSizeRepairs(unittest.TestCase):
    @staticmethod
    def wire_frame(total, seq=7):
        from onekey.crc8 import crc8
        # Build synthetic receive fixtures independently of the encoder's size guard.
        frame = bytearray((0x5a, total & 0xff, total >> 8, 0, 0, 0, seq))
        frame[3] = crc8(frame[:3])
        frame.extend(codec.SUCCESS.to_bytes(2, 'little'))
        frame.extend(bytes(total - 10))
        frame.append(crc8(frame))
        return bytes(frame)

    def link(self, chunks):
        read = mock.Mock(side_effect=[*chunks, AssertionError('Unexpected additional USB read')])
        write, close = mock.Mock(), mock.Mock()
        link = Link(read, write, close)
        self.addCleanup(link.close)
        return link, read, write, close

    @staticmethod
    def exchange(link):
        return link.exchange(codec.PING, b'', deadline=time.monotonic()+1, cancelled=None)

    def test_encoding_complete_frames_4097_through_4200(self):
        from onekey.frame import encode_message
        for total in range(4097, 4201):
            with self.subTest(total=total):
                frame = encode_message(codec.SUCCESS, bytes(total - 10), seq=7)
                self.assertEqual(total, len(frame))
                self.assertTrue(frame == self.wire_frame(total))
                self.assertEqual((codec.SUCCESS, bytes(total - 10)), split_message(decode(frame).payload))

    def test_receiving_complete_frames_4097_through_4200_over_usb_reads(self):
        for total in range(4097, 4201):
            with self.subTest(total=total):
                frame = self.wire_frame(total)
                link, read, write, close = self.link([frame[:4096], frame[4096:]])
                self.assertEqual((codec.SUCCESS, bytes(total - 10)), self.exchange(link))
                self.assertEqual([4096, 4096], [args[0] for args, _ in read.call_args_list])
                self.assertEqual(bytearray(), link._buffer)
                write.assert_called_once()
                close.assert_not_called()

    def test_previous_output_tx_ack_4111_bytes_is_written(self):
        payload = codec.encode_tx_ack(codec.TX_OUTPUT, dict(amount='1', script_pubkey='00' * 4090))
        self.assertEqual(4111, len(payload) + 10)
        link, _, write, close = self.link([self.wire_frame(10)])
        self.assertEqual((codec.SUCCESS, b''), link.exchange(
            codec.TX_ACK, payload, deadline=time.monotonic()+1, cancelled=None))
        write.assert_called_once()
        frame = write.call_args.args[0]
        self.assertEqual(4111, len(frame))
        self.assertTrue(split_message(decode(frame).payload) == (codec.TX_ACK, payload))
        close.assert_not_called()

    def test_oversized_frames_are_rejected_by_encoder_decoder_and_assembler(self):
        from onekey.frame import encode_message, pop_frame
        for total in (4201, 65535):
            frame = self.wire_frame(total)
            for operation in (lambda: encode_message(codec.SUCCESS, bytes(total - 10), seq=7),
                              lambda: decode(frame), lambda: pop_frame(bytearray(frame)),
                              lambda: pop_frame(bytearray(frame), limit=65535)):
                with self.subTest(total=total, operation=operation), self.assertRaisesRegex(ValueError, 'too large'):
                    operation()

    def test_oversized_headers_close_link_before_reading_body(self):
        for total in (4201, 65535):
            frame = self.wire_frame(total)
            for header_size in (3, 4, 8):
                with self.subTest(total=total, header_size=header_size):
                    link, read, write, close = self.link([frame[:header_size]])
                    with self.assertRaisesRegex(LinkError, 'PROTOCOL'):
                        self.exchange(link)
                    read.assert_called_once()
                    write.assert_called_once()
                    close.assert_called_once()
                    self.assertEqual(bytearray(), link._buffer)
                    with self.assertRaisesRegex(LinkError, 'STALE'):
                        self.exchange(link)
                    write.assert_called_once()

    def test_coalesced_maximum_frames_survive_multiple_usb_reads(self):
        incoming = self.wire_frame(4200, seq=7) + self.wire_frame(4200, seq=8)
        link, read, write, close = self.link([incoming[i:i+4096] for i in range(0, len(incoming), 4096)])
        for _ in range(2):
            self.assertEqual((codec.SUCCESS, bytes(4190)), self.exchange(link))
        self.assertEqual([4096] * 3, [args[0] for args, _ in read.call_args_list])
        self.assertEqual(2, write.call_count)
        self.assertEqual(bytearray(), link._buffer)
        close.assert_not_called()

    def test_usb_read_chunks_still_cannot_exceed_4096(self):
        link, read, write, close = self.link([self.wire_frame(4200)[:4097]])
        with self.assertRaisesRegex(LinkError, 'PROTOCOL'):
            self.exchange(link)
        self.assertEqual(4096, read.call_args.args[0])
        write.assert_called_once()
        close.assert_called_once()

    def test_large_frame_crc_corruption_remains_link_fatal(self):
        frame = self.wire_frame(4200)
        bad = frame[:-1] + bytes((frame[-1] ^ 0xff,))
        link, read, write, close = self.link([bad[:4096], bad[4096:]])
        with self.assertRaisesRegex(LinkError, 'PROTOCOL'):
            self.exchange(link)
        self.assertEqual(2, read.call_count)
        write.assert_called_once()
        close.assert_called_once()
