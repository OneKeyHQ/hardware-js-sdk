"""Actual adapter lifecycle with host Electrum interfaces stubbed (no crypto claims)."""
import concurrent.futures
import importlib.util
from pathlib import Path
import sys
import threading
from types import ModuleType, SimpleNamespace
import unittest
from unittest import mock

from onekey import codec
from onekey.frame import PACKET_TYPE_ACK, encode
from onekey.ipc import Helper, HelperError
from onekey.link import LinkError
from test_protocol import Scripted, pipe_link, call


def load_adapters():
    names = ('electrum', 'electrum.bip32', 'electrum.hw_wallet', 'electrum.hw_wallet.plugin',
             'electrum.i18n', 'electrum.plugin', 'electrum.storage', 'electrum.util',
             'electrum.keystore', 'electrum.transaction')
    modules = {name: ModuleType(name) for name in names}
    modules['electrum'].constants = SimpleNamespace()
    modules['electrum'].descriptor = SimpleNamespace()
    bitcoin = ModuleType('electrum.bitcoin')
    bitcoin.verify_usermessage_with_address = lambda *_args, **_kwargs: None
    modules['electrum.bitcoin'] = bitcoin
    modules['electrum'].bitcoin = bitcoin
    modules['electrum.bip32'].BIP32Node = SimpleNamespace(from_xkey=lambda _: SimpleNamespace(xtype='p2wpkh'))
    modules['electrum.bip32'].convert_bip32_strpath_to_intpath = lambda _: [0x80000054, 0x80000000, 0x80000000]

    class ClientBase:
        def __init__(self, plugin):
            self.plugin = plugin

    modules['electrum.hw_wallet'].HardwareClientBase = ClientBase
    modules['electrum.hw_wallet'].HW_PluginBase = type('PluginBase', (), {})
    modules['electrum.hw_wallet.plugin'].trezor_validate_op_return_output_and_get_data = lambda _: None
    modules['electrum.i18n']._ = lambda text: text
    modules['electrum.plugin'].runs_in_hwd_thread = lambda method: method
    modules['electrum.plugin'].Device = SimpleNamespace
    modules['electrum.plugin'].DeviceUnpairableError = type('DeviceUnpairableError', (Exception,), {})
    modules['electrum.storage'].get_derivation_used_for_hw_device_encryption = lambda: 'storage'
    modules['electrum.util'].UserCancelled = type('UserCancelled', (Exception,), {})
    modules['electrum.util'].UserFacingException = type('UserFacingException', (Exception,), {})
    modules['electrum.keystore'].Hardware_KeyStore = type('KeyStore', (), {})
    for name in ('PartialTransaction', 'PartialTxOutput', 'Sighash'):
        setattr(modules['electrum.transaction'], name, type(name, (), {}))
    loaded = []
    with mock.patch.dict(sys.modules, modules):
        for source in ('client', 'onekey'):
            path = Path(__file__).parents[1] / 'onekey' / (source + '.py')
            spec = importlib.util.spec_from_file_location('onekey._lifecycle_' + source, path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            loaded.append(module)
    return loaded


client_module, plugin_module = load_adapters()
OneKeyClient, OneKeyPlugin = client_module.OneKeyClient, plugin_module.OneKeyPlugin
STATE = dict(deviceId='synthetic-device', serialNo='synthetic-serial', model='pro2')
BINDING = dict(deviceId=STATE['deviceId'], serialNo=STATE['serialNo'], walletType='hidden', passphraseState='public-wallet-A')


class TestLifecycleRepairs(unittest.TestCase):
    def make_plugin(self):
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin._live_clients = set()
        plugin.helper = mock.Mock(generation='generation-one')
        plugin.helper.call.return_value = dict(STATE)
        manager = SimpleNamespace(clients={}, lock=threading.RLock())
        plugin.device_manager = lambda: manager
        return plugin, manager

    def client(self, plugin, manager, path='usb1'):
        client = OneKeyClient(path, mock.Mock(), plugin)
        manager.clients[client] = client.serial
        return client

    def test_cancelled_storage_flow_cannot_poison_health_or_late_cancel_next_flow(self):
        plugin, manager = self.make_plugin()
        client = self.client(plugin, manager)
        idle = client.cancelled
        with self.assertRaises(client_module.UserCancelled):
            with client.flow(close_on_error=False):
                cancel = client.handler.show_message.call_args.kwargs['on_cancel']
                cancel()
                raise client_module.UserCancelled()
        self.assertFalse(client.cancelled.is_set())
        self.assertIs(idle, client.cancelled)
        with client.flow(close_on_error=False):
            cancel()  # A closed Qt dialog can deliver its callback late.
            self.assertFalse(client.cancelled.is_set())
        self.assertTrue(client.has_usable_connection_with_device())
        self.assertFalse(plugin.helper.call.call_args.kwargs['cancelled'].is_set())
        self.assertFalse(client.closed)

    def test_scan_detaching_last_cached_client_keeps_discovery_generation(self):
        plugin, manager = self.make_plugin()
        client = self.client(plugin, manager)
        generation = plugin.helper.generation
        # The device list was already collected; health now detects the old client.
        plugin.helper.call.side_effect = HelperError('SDK_FAILED')
        self.assertFalse(client.has_usable_connection_with_device())
        plugin.helper.shutdown.assert_not_called()
        plugin.helper.release.assert_called_once_with('usb1')
        self.assertEqual(generation, plugin.helper.generation)
        self.assertIn(client, manager.clients)

    def test_two_devices_release_only_the_closed_device(self):
        plugin, manager = self.make_plugin()
        first = self.client(plugin, manager)
        second = self.client(plugin, manager, 'usb2')
        first.close()
        plugin.helper.release.assert_called_once_with('usb1')
        plugin.helper.shutdown.assert_not_called()
        self.assertTrue(second.attached())

    def test_second_wallet_binding_is_verified_without_closing_shared_client(self):
        plugin, manager = self.make_plugin()
        client = self.client(plugin, manager)
        client.binding = dict(BINDING)
        saved = dict(BINDING, passphraseState='public-wallet-B')
        store = SimpleNamespace(xpub='expected-account-B', onekey_binding=saved, get_derivation_prefix=lambda: 'account')
        with mock.patch.object(client_module, 'account_path', return_value=[1, 2, 3]), \
                mock.patch.object(client_module, 'normalized_xpub', side_effect=lambda value, _: value), \
                mock.patch.object(client, '_xpub', return_value=store.xpub) as xpub:
            client.bind_keystore(store)
        self.assertFalse(client.closed)
        self.assertEqual(saved, client.binding)
        xpub.assert_called_once()
        self.assertEqual(store.xpub, client.account[2])

    def test_library_check_refuses_missing_python_or_native_usb(self):
        plugin, _ = self.make_plugin()
        with mock.patch('onekey.usb._usb1', side_effect=ImportError):
            with self.assertRaises(ImportError):
                plugin.get_library_version()

    def test_real_helper_scan_can_create_second_device_after_first_identity_changes(self):
        plugin, manager = self.make_plugin()
        first, second = Scripted(), Scripted()
        for device in (first, second):
            device.locked = False
            device.device_id = 'synthetic-device'
        second.serial = 'second-synthetic-serial'
        helper = Helper(ports={'usb1': pipe_link(first), 'usb2': pipe_link(second)})
        plugin.helper = helper
        self.addCleanup(helper.shutdown)
        call(helper, 'search', {})
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            client = pool.submit(self.client, plugin, manager).result(timeout=2)
            first.device_id = 'new-initialization'
            discovered = call(helper, 'search', {})
            self.assertFalse(pool.submit(client.has_usable_connection_with_device).result(timeout=2))
            other = pool.submit(self.client, plugin, manager, discovered[1]['connectId']).result(timeout=2)
            self.assertTrue(other.attached())
            self.assertEqual(second.serial, other.serial)

    def test_enumerate_keeps_other_claim_after_held_probe_disconnect_or_bad_ack(self):
        for failure in ('disconnect', 'bad-ack', 'unexpected-ping', 'framed-failure',
                        'truncated-status', 'malformed-failure', 'malformed-info'):
            with self.subTest(failure=failure):
                plugin, manager = self.make_plugin()
                first, second = Scripted(), Scripted()
                second.serial = 'second-synthetic-serial'
                closed = []
                links = {path: pipe_link(device, lambda path=path: closed.append(path))
                         for path, device in (('usb1', first), ('usb2', second))}
                helper = Helper()
                plugin.helper = helper
                self.addCleanup(helper.shutdown)
                with mock.patch('onekey.ipc.list_paths', return_value=list(links)), \
                        mock.patch('onekey.ipc.open_path', side_effect=links.__getitem__), \
                        concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    call(helper, 'hello', {})
                    clients = [pool.submit(self.client, plugin, manager, path).result(timeout=2)
                               for path in links]
                    generation = helper.generation
                    self.assertEqual(links, helper._links)

                    def failed_read(*_args):
                        if failure == 'disconnect':
                            raise LinkError('SDK_FAILED')
                        ack = encode(b'', seq=links['usb1']._seq._seq, packet_type=PACKET_TYPE_ACK)
                        return ack[:-1] + bytes((ack[-1] ^ 0xff,))

                    def malformed_reply(kind, payload):
                        if failure == 'truncated-status' and kind == codec.DEVICE_STATUS_GET:
                            return codec.DEVICE_STATUS, b'\x08\x80'
                        if failure == 'malformed-failure' and kind == codec.PING:
                            return codec.FAILURE, b'\x08\x80'
                        if failure == 'malformed-info' and kind == codec.DEVICE_INFO_GET:
                            return codec.DEVICE_INFO, codec.enc_msg(100, b'\x08\x80')
                        return peer_handle(kind, payload)

                    peer_handle = first.handle

                    with mock.patch.object(links['usb1'], '_read', wraps=links['usb1']._read) as read, \
                            mock.patch.object(first, 'handle', wraps=first.handle) as handle:
                        if failure == 'unexpected-ping':
                            handle.return_value = first.status()
                        elif failure == 'framed-failure':
                            handle.return_value = (codec.FAILURE, codec.enc_uint(1, 1))
                        elif failure in ('truncated-status', 'malformed-failure', 'malformed-info'):
                            handle.side_effect = malformed_reply
                        else:
                            read.side_effect = failed_read
                        found = pool.submit(plugin.enumerate).result(timeout=2)
                    self.assertEqual(['usb2'], [device.path for device in found])
                    self.assertEqual(['usb1'], closed)
                    self.assertEqual({'usb2': links['usb2']}, helper._links)
                    self.assertFalse(links['usb2']._closed)
                    self.assertEqual(generation, helper.generation)
                    self.assertTrue(clients[1].attached())
                    self.assertEqual(second.serial, call(helper, 'state', dict(connectId='usb2'))['serialNo'])

    def test_actual_storage_unlock_restores_binding_and_allows_real_health_check_after_cancel(self):
        plugin, manager = self.make_plugin()
        device = Scripted()
        helper = Helper(ports={'usb1': pipe_link(device)})
        plugin.helper = helper
        self.addCleanup(helper.shutdown)
        call(helper, 'search', {})
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            client = pool.submit(self.client, plugin, manager).result(timeout=2)
            client.binding = dict(BINDING)
            client.account = ('saved-account',)
            client.begin_storage_unlock_selection()

            def cancel_selection():
                client.handler.show_message.call_args.kwargs['on_cancel']()
                client._call('state', {'connectId': 'usb1'})

            with mock.patch.object(client, '_select_wallet', side_effect=cancel_selection):
                with self.assertRaises(client_module.UserCancelled):
                    pool.submit(client._storage_encryption_xpub, [1, 2]).result(timeout=2)
            self.assertEqual(BINDING, client.binding)
            self.assertEqual(('saved-account',), client.account)
            self.assertTrue(pool.submit(client.has_usable_connection_with_device).result(timeout=2))
            self.assertFalse(client.closed)

    def test_library_check_catches_missing_native_library_and_closes_a_good_context(self):
        plugin, _ = self.make_plugin()
        driver = mock.Mock()
        driver.USBContext.side_effect = OSError('native library unavailable')
        with mock.patch('onekey.usb._usb1', return_value=driver):
            with self.assertRaises(ImportError):
                plugin.get_library_version()
        driver.USBContext.side_effect = None
        with mock.patch('onekey.usb._usb1', return_value=driver):
            plugin.get_library_version()
        driver.USBContext.return_value.close.assert_called_once()

    def test_switching_wallets_still_rejects_an_incorrect_account_xpub(self):
        plugin, manager = self.make_plugin()
        client = self.client(plugin, manager)
        client.binding = dict(BINDING)
        store = SimpleNamespace(xpub='account-B', onekey_binding=dict(BINDING, passphraseState='wallet-B'),
                                get_derivation_prefix=lambda: 'account')
        with mock.patch.object(client_module, 'account_path', return_value=[1, 2, 3]), \
                mock.patch.object(client_module, 'normalized_xpub', side_effect=lambda value, _: value), \
                mock.patch.object(client, '_xpub', return_value='wrong-account'):
            with self.assertRaises(client_module.UserFacingException):
                client.bind_keystore(store)
        self.assertTrue(client.closed)
        self.assertIsNone(client.account)

    def test_wizard_cancel_releases_usb_claim_instead_of_treating_as_firmware_cancel(self):
        plugin, manager = self.make_plugin()
        device = Scripted()
        closed = []
        link = pipe_link(device, lambda: closed.append('usb1'))
        with mock.patch('onekey.ipc.open_path', return_value=link):
            helper = Helper()
            plugin.helper = helper
            self.addCleanup(helper.shutdown)
            call(helper, 'hello', {})
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                client = pool.submit(self.client, plugin, manager).result(timeout=2)
                with self.assertRaises(client_module.UserCancelled):
                    with client.flow():
                        raise client_module.UserCancelled()
            self.assertTrue(client.closed)
            self.assertEqual(['usb1'], closed)
            self.assertNotIn('usb1', helper._links)

    def test_matches_keystore_rejects_different_device_id_with_same_serial_and_xpub(self):
        plugin, manager = self.make_plugin()
        client = self.client(plugin, manager)
        client.binding = dict(BINDING)
        client.account = ([1, 2, 3], 'p2wpkh', 'expected-xpub')
        reinit_binding = dict(BINDING, deviceId='reinitialized-device-id')
        store = SimpleNamespace(xpub='expected-xpub', onekey_binding=reinit_binding,
                                get_derivation_prefix=lambda: 'account')
        with mock.patch.object(client_module, 'account_path', return_value=[1, 2, 3]), \
                mock.patch.object(client_module, 'normalized_xpub', side_effect=lambda value, _: value):
            self.assertFalse(client.matches_keystore(store))
            same_store = SimpleNamespace(xpub='expected-xpub', onekey_binding=dict(BINDING),
                                         get_derivation_prefix=lambda: 'account')
            self.assertTrue(client.matches_keystore(same_store))

    def test_verify_account_consumes_fresh_bind_once_then_rechecks_on_direct_call(self):
        plugin, manager = self.make_plugin()
        client = self.client(plugin, manager)
        store = SimpleNamespace(xpub='expected-account', onekey_binding=dict(BINDING),
                                get_derivation_prefix=lambda: 'account')
        with mock.patch.object(client_module, 'account_path', return_value=[1, 2, 3]), \
                mock.patch.object(client_module, 'normalized_xpub', side_effect=lambda value, _: value), \
                mock.patch.object(client, '_xpub', return_value=store.xpub) as xpub:
            client.bind_keystore(store)
            self.assertEqual(1, xpub.call_count)
            client._verify_account()
            self.assertEqual(1, xpub.call_count)
            client._verify_account()
            self.assertEqual(2, xpub.call_count)
