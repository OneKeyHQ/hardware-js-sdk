import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import threading
import time
import sys
import tempfile
import unittest
import zipfile
from types import SimpleNamespace
from unittest import mock

from electrum import bitcoin, constants, descriptor
from electrum.bip32 import BIP32Node, convert_bip32_strpath_to_intpath
from electrum.keystore import load_keystore, register_keystore
from electrum.plugin import DeviceUnpairableError, run_in_hwd_thread
from electrum.storage import WalletStorage, get_derivation_used_for_hw_device_encryption
from electrum.transaction import PartialTransaction, PartialTxInput, PartialTxOutput, Transaction, TxOutpoint, Sighash
from electrum.util import UserCancelled, UserFacingException
from electrum.wallet_db import WalletDB
from electrum.wizard import NewWalletWizard
from electrum.zip_importer import MemoryZipImporter

from onekey.client import OneKeyClient, account_path, coin_name, check_binding, normalized_xpub
from onekey.onekey import OneKeyKeyStore, OneKeyPlugin
from onekey.ipc import Helper, HelperError
from onekey.link import LinkError
from test_protocol import Scripted, pipe_link
from onekey.validate import firmware_account_allowed, firmware_path_allowed
from build import build


STATE = dict(deviceId="synthetic-device", serialNo="synthetic-serial", model="pro2")
BINDING = dict(deviceId=STATE["deviceId"], serialNo=STATE["serialNo"], walletType="hidden",
               passphraseState="synthetic-public-wallet-identity")


class TestOneKeyPackaging(unittest.TestCase):
    def test_external_zip_first_load_has_adapter_but_no_python_usb_or_runtime(self):
        root_name = "onekey_zip_test.onekey"
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        import shutil
        shutil.copytree(Path(__file__).parents[1] / "onekey", root / "onekey")
        archive = build(root)
        with zipfile.ZipFile(archive) as zipped:
            self.assertIsNone(zipped.testzip())
            names = zipped.namelist()
            for name in ("manifest.json", "qt.py", "ipc.py", "onekey.svg", "LICENCE"):
                self.assertIn("onekey/" + name, names)
            for suffix in ("messages.py", "transport.py", "entry.cjs", "node"):
                self.assertNotIn("onekey/" + suffix, names)
            self.assertFalse(any("runtime/" in name or "__pycache__" in name for name in names))
            # Electrum reads the whole external plugin zip into memory and rejects files over 10 MB.
            self.assertLess(archive.stat().st_size, 10_000_000)
        importer = MemoryZipImporter(archive.read_bytes(), root_name=root_name,
                                     prefix="onekey", archive_path=str(archive)).install()
        try:
            for name in (root_name, root_name + ".onekey", root_name + ".client"):
                spec = importer.find_spec(name)
                module = importlib.util.module_from_spec(spec)
                sys.modules[name] = module
                spec.loader.exec_module(module)
            self.assertIn(root_name + ".ipc", sys.modules)
        finally:
            sys.meta_path.remove(importer)
            for name in list(sys.modules):
                if name == root_name or name.startswith(root_name + "."):
                    del sys.modules[name]


class TestOneKeyClient(unittest.TestCase):
    def make_client(self):
        helper = mock.Mock(generation="generation-one")
        helper.call.return_value = dict(STATE)
        handler = mock.Mock()
        handler.choose_wallet.side_effect = AssertionError("wallet dialog")
        plugin = SimpleNamespace(helper=helper, SUPPORTED_XTYPES=OneKeyPlugin.SUPPORTED_XTYPES,
                                 remember_wallet_binding=mock.Mock())
        client = run_in_hwd_thread(lambda: OneKeyClient("usb1", handler, plugin))
        return client, helper, handler

    def public_key(self):
        # Synthetic test material only; no device or real-wallet secrets.
        root = BIP32Node.from_rootseed(os.urandom(32), xtype="p2wpkh")
        return root.subkey_at_private_derivation("m/84'/0'/0'").to_xpub()

    def test_selection_and_public_binding_resume_never_open_hidden_again(self):
        client, helper, handler = self.make_client()
        xpub = self.public_key()
        helper.call.side_effect = [BINDING, dict(xpub=xpub, rootFingerprint=0x01020304)]
        client.request_wallet_mode("select-hidden")
        self.assertEqual(xpub, client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        self.assertEqual("01020304", client.request_root_fingerprint_from_device())
        self.assertEqual("select-hidden", helper.call.call_args_list[-2].args[1]["mode"])
        keystore = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'", onekey_binding=BINDING))
        helper.call.side_effect = None
        helper.call.return_value = dict(xpub=xpub, rootFingerprint=None)
        client.bind_keystore(keystore)
        handler.choose_wallet.assert_not_called()
        self.assertEqual(BINDING, helper.call.call_args.args[1]["binding"])
        self.assertEqual(BINDING, keystore.dump()["onekey_binding"])
        self.assertFalse(any(call.args[0] == "open" for call in helper.call.call_args_list[-1:]))

    def test_pairing_callback_uses_saved_hidden_wallet_without_new_selection(self):
        client, helper, handler = self.make_client()
        xpub = self.public_key()
        keystore = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'", onekey_binding=BINDING))
        client.plugin._expected_keystore = keystore
        helper.call.return_value = dict(xpub=xpub, rootFingerprint=None)
        self.assertEqual(xpub, client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        handler.choose_wallet.assert_not_called()
        self.assertFalse(any(call.args[0] == "open" for call in helper.call.call_args_list))
        self.assertEqual(BINDING, helper.call.call_args.args[1]["binding"])

    def test_old_client_close_does_not_kill_new_helper_generation(self):
        client, helper, _ = self.make_client()
        helper.generation = "new-generation"
        client.close()
        helper.shutdown.assert_not_called()

    def test_locked_device_state_is_accepted_and_open_sets_the_device_id(self):
        helper = mock.Mock(generation="generation-one")
        helper.call.return_value = dict(deviceId=None, serialNo="synthetic-serial", model="pro2")
        handler = mock.Mock()
        plugin = SimpleNamespace(helper=helper, SUPPORTED_XTYPES=OneKeyPlugin.SUPPORTED_XTYPES,
                                 remember_wallet_binding=mock.Mock())
        client = run_in_hwd_thread(lambda: OneKeyClient("usb1", handler, plugin))
        self.assertIsNone(client.device_id)
        opened = dict(deviceId="synthetic-device", serialNo="synthetic-serial",
                      walletType="standard", passphraseState=None)
        xpub = self.public_key()
        helper.call.side_effect = [opened, dict(xpub=xpub, rootFingerprint=None)]
        self.assertEqual(xpub, client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        self.assertEqual("synthetic-device", client.device_id)
        self.assertEqual("open", helper.call.call_args_list[-2].args[0])

    def test_saved_wallet_on_a_locked_device_restores_without_opening(self):
        cases = [
            dict(deviceId=STATE["deviceId"], serialNo=STATE["serialNo"],
                 walletType="standard", passphraseState=None),
            dict(BINDING),
        ]
        for saved in cases:
            helper = mock.Mock(generation="generation-one")
            helper.call.return_value = dict(deviceId=None, serialNo=STATE["serialNo"], model="pro2")
            plugin = SimpleNamespace(helper=helper, SUPPORTED_XTYPES=OneKeyPlugin.SUPPORTED_XTYPES,
                                     remember_wallet_binding=mock.Mock())
            client = run_in_hwd_thread(lambda helper=helper, plugin=plugin: OneKeyClient("usb1", mock.Mock(), plugin))
            xpub = self.public_key()
            keystore = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'", onekey_binding=saved))
            helper.call.side_effect = [dict(xpub=xpub, rootFingerprint=None)]
            client.bind_keystore(keystore)
            self.assertEqual(["state", "xpub"], [call.args[0] for call in helper.call.call_args_list])
            self.assertEqual(saved, helper.call.call_args.args[1]["binding"])
            self.assertEqual(saved["deviceId"], client.device_id)
            self.assertNotIn("select-hidden", json.dumps([call.args for call in helper.call.call_args_list]))

    def test_new_wallet_fetch_does_not_reuse_the_previous_selection(self):
        client, helper, handler = self.make_client()
        client.binding = dict(BINDING)
        client.account = ("previous",)
        client.begin_new_wallet_selection()
        client.request_wallet_mode("select-hidden")
        xpub = self.public_key()
        helper.call.side_effect = [BINDING, dict(xpub=xpub, rootFingerprint=None)]
        self.assertEqual(xpub, client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        handler.choose_wallet.assert_not_called()
        self.assertEqual("select-hidden", helper.call.call_args_list[-2].args[1]["mode"])
        self.assertEqual(BINDING["passphraseState"], client.binding["passphraseState"])

    def test_closing_one_client_leaves_the_other_helper_running(self):
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin._live_clients = set()
        plugin.helper = mock.Mock(generation="generation-one")
        plugin.helper.call.return_value = dict(STATE)
        plugin.retain_client = OneKeyPlugin.retain_client.__get__(plugin)
        plugin.release_helper = OneKeyPlugin.release_helper.__get__(plugin)
        handler = mock.Mock()
        first = run_in_hwd_thread(lambda: OneKeyClient("usb1", handler, plugin))
        second = run_in_hwd_thread(lambda: OneKeyClient("usb2", handler, plugin))
        first.close()
        plugin.helper.shutdown.assert_not_called()
        self.assertTrue(second.attached())
        second.close()
        plugin.helper.shutdown.assert_called_once()

    def test_close_removes_the_cached_client_before_the_next_request(self):
        client, _, _ = self.make_client()
        manager = SimpleNamespace(lock=threading.Lock(), clients={client: "synthetic-serial"})
        client.plugin.device_manager = lambda: manager
        client.close()
        self.assertNotIn(client, manager.clients)

    def test_connection_check_refreshes_passphrase_availability_on_every_success(self):
        client, helper, _ = self.make_client()
        for enabled in (False, True, None, False):
            with self.subTest(enabled=enabled):
                helper.call.return_value = dict(STATE, passphraseEnabled=enabled)
                self.assertTrue(client.has_usable_connection_with_device())
                self.assertIs(enabled, client.passphrase_enabled)

    def test_sdk_failure_evicts_only_when_the_helper_loses_the_link(self):
        from onekey import codec
        from onekey.ipc import Helper
        from onekey.link import LinkError
        from test_protocol import ACCOUNT, Scripted, pipe_link

        for failure in ("firmware", "closed", "SDK_FAILED", "USB_UNAVAILABLE", "TIMEOUT", "PROTOCOL", "unexpected"):
            with self.subTest(failure=failure):
                device = Scripted()
                link = pipe_link(device)
                helper = Helper()
                self.addCleanup(helper.shutdown)
                manager = SimpleNamespace(clients={}, lock=threading.RLock())
                plugin = OneKeyPlugin.__new__(OneKeyPlugin)
                plugin.helper, plugin._live_clients = helper, set()
                plugin.device_manager = lambda: manager
                with mock.patch("onekey.ipc.open_path", return_value=link):
                    run_in_hwd_thread(lambda: helper.call("hello", {}))
                    client = run_in_hwd_thread(lambda: OneKeyClient("usb1", mock.Mock(), plugin))
                    manager.clients[client] = client.serial
                    client.binding = run_in_hwd_thread(lambda: client._call("open", dict(connectId="usb1", mode="standard")))
                    client.account = ("synthetic-account",)
                    generation = helper.generation
                    self.assertIn("usb1", helper._wallets)
                    original = device.handle

                    def handle(kind, payload):
                        if kind != codec.GET_PUBLIC_KEY:
                            return original(kind, payload)
                        if failure in ("firmware", "closed"):
                            if failure == "closed":
                                link.close()
                            return codec.FAILURE, codec.enc_uint(1, 1)
                        if failure == "unexpected":
                            raise RuntimeError("synthetic helper failure")
                        raise LinkError(failure)

                    device.handle = handle

                    def invoke():
                        with client.flow():
                            client._call("xpub", dict(connectId="usb1", binding=client.binding, coin="Bitcoin",
                                                      path=ACCOUNT, scriptType="SPENDWITNESS"))

                    with self.assertRaises(UserFacingException):
                        run_in_hwd_thread(invoke)
                    self.assertIsNone(client.binding)
                    self.assertIsNone(client.account)
                    self.assertNotIn("usb1", helper._wallets)
                    if failure == "firmware":
                        self.assertFalse(client.closed)
                        self.assertIn(client, manager.clients)
                        self.assertIs(link, helper._links["usb1"])
                        self.assertFalse(link._closed)
                        self.assertEqual(generation, helper.generation)
                        self.assertTrue(client.has_usable_connection_with_device())
                    else:
                        self.assertTrue(client.closed)
                        self.assertNotIn(client, manager.clients)
                        self.assertNotIn("usb1", helper._links)
                        self.assertTrue(link._closed)

    def test_health_check_failure_does_not_change_the_client_dict(self):
        client, helper, _ = self.make_client()
        manager = SimpleNamespace(lock=threading.RLock(), clients={client: client.serial})
        client.plugin.device_manager = lambda: manager
        client.plugin.release_helper = mock.Mock()
        helper.call.side_effect = RuntimeError("gone")
        usable = []
        for cached, _id in manager.clients.items():
            usable.append(cached.has_usable_connection_with_device())
        self.assertEqual([False], usable)
        self.assertEqual([client], list(manager.clients))
        client.plugin.release_helper.assert_called_once_with(client, scanning=True)

    def test_unplugged_client_is_released_when_the_last_wallet_closes(self):
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin._live_clients = set()
        plugin.helper = mock.Mock(generation="generation-one")
        plugin.helper.call.return_value = dict(STATE)
        plugin.retain_client = OneKeyPlugin.retain_client.__get__(plugin)
        plugin.release_helper = OneKeyPlugin.release_helper.__get__(plugin)
        plugin._sweep_unplugged = OneKeyPlugin._sweep_unplugged.__get__(plugin)
        plugin._connected_clients = OneKeyPlugin._connected_clients.__get__(plugin)
        handler = mock.Mock()
        first = run_in_hwd_thread(lambda: OneKeyClient("usb1", handler, plugin))
        second = run_in_hwd_thread(lambda: OneKeyClient("usb2", handler, plugin))
        manager = SimpleNamespace(clients={first: first.serial, second: second.serial})
        plugin.device_manager = lambda: manager
        del manager.clients[first]
        second.close()
        plugin.helper.shutdown.assert_called_once()
        self.assertTrue(first.closed)
        self.assertNotIn(first, plugin._live_clients)
        self.assertNotIn(second, plugin._live_clients)

    def test_next_enumerate_releases_a_client_the_scan_already_dropped(self):
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin._live_clients = set()
        plugin.helper = mock.Mock(generation="generation-one")
        plugin.helper.call.side_effect = [dict(STATE), []]
        plugin.retain_client = OneKeyPlugin.retain_client.__get__(plugin)
        plugin.release_helper = OneKeyPlugin.release_helper.__get__(plugin)
        plugin._sweep_unplugged = OneKeyPlugin._sweep_unplugged.__get__(plugin)
        plugin._connected_clients = OneKeyPlugin._connected_clients.__get__(plugin)
        client = run_in_hwd_thread(lambda: OneKeyClient("usb1", mock.Mock(), plugin))
        plugin.device_manager = lambda: SimpleNamespace(clients={})
        self.assertEqual([], OneKeyPlugin.enumerate(plugin))
        plugin.helper.shutdown.assert_not_called()
        plugin.helper.release.assert_called_once_with("usb1")
        self.assertTrue(client.closed)
        self.assertNotIn(client, plugin._live_clients)

    def test_get_client_replaces_a_closed_client_before_bind(self):
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        closed = mock.Mock()
        closed.attached.return_value = False
        fresh = mock.Mock()
        fresh.attached.return_value = True
        keystore = mock.Mock()
        with mock.patch("electrum.hw_wallet.plugin.HW_PluginBase.get_client", side_effect=[closed, fresh]):
            result = OneKeyPlugin.get_client(plugin, keystore)
        closed.close.assert_called_once()
        fresh.bind_keystore.assert_called_once_with(keystore)
        self.assertIs(result, fresh)

    def test_search_accepts_a_locked_device_without_device_id(self):
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin.helper = mock.Mock()
        plugin.helper.call.return_value = [dict(connectId="usb1", serialNo="synthetic-serial",
                                                 deviceId=None, model="pro2")]
        devices = OneKeyPlugin.enumerate(plugin)
        self.assertEqual("synthetic-serial", devices[0].id_)
        plugin.helper.call.return_value = [dict(connectId="usb1", serialNo="synthetic-serial",
                                                 deviceId="", model="pro2")]
        with self.assertRaises(UserFacingException):
            OneKeyPlugin.enumerate(plugin)

    def test_wizard_binding_is_copied_into_keystore_dump(self):
        xpub = self.public_key()
        plugin = SimpleNamespace(_new_wallet_bindings={xpub: dict(BINDING)})
        with mock.patch.object(OneKeyKeyStore, "plugin", plugin, create=True):
            preview = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'"))
            stored = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'"))
            self.assertEqual(BINDING, preview.onekey_binding)
            self.assertEqual(BINDING, stored.onekey_binding)
            self.assertEqual({xpub: BINDING}, plugin._new_wallet_bindings)
            self.assertEqual(BINDING, stored.dump()["onekey_binding"])
            self.assertEqual({}, plugin._new_wallet_bindings)
            self.assertEqual(BINDING, preview.dump()["onekey_binding"])

    def test_wizard_persists_binding_across_preview_and_storage_keystore(self):
        xpub = self.public_key()
        plugin = SimpleNamespace(_new_wallet_bindings={})
        previous = getattr(OneKeyKeyStore, "plugin", None)
        OneKeyPlugin.remember_wallet_binding(plugin, xpub, BINDING)
        OneKeyKeyStore.plugin = plugin
        register_keystore("onekey", OneKeyKeyStore)
        data = {
            "wallet_type": "standard",
            "keystore_type": "hardware",
            "hw_type": "onekey",
            "derivation_path": "m/84'/0'/0'",
            "root_fingerprint": "01020304",
            "master_key": xpub,
            "label": "synthetic",
            "soft_device_id": STATE["deviceId"],
            "password": "",
            "encrypt": False,
        }
        wizard = NewWalletWizard.__new__(NewWalletWizard)
        wizard._logger = mock.Mock()
        try:
            wizard.maybe_master_pubkey(data)
            self.assertEqual(xpub, data["multisig_master_pubkey"])
            self.assertIn(xpub, plugin._new_wallet_bindings)
            with tempfile.TemporaryDirectory() as directory:
                path = os.path.join(directory, "wallet")
                wizard.create_storage(path, data)
                self.assertNotIn(xpub, plugin._new_wallet_bindings)
                storage = WalletStorage(path)
                db = WalletDB(storage.read(), storage=storage, upgrade=True)
                loaded = load_keystore(db, "keystore")
                self.assertEqual(BINDING, loaded.onekey_binding)
                self.assertEqual(BINDING, loaded.dump()["onekey_binding"])
        finally:
            OneKeyKeyStore.plugin = previous

    def encryption_xpub(self):
        root = BIP32Node.from_rootseed(os.urandom(32), xtype="standard")
        return root.subkey_at_private_derivation(get_derivation_used_for_hw_device_encryption()).to_xpub()

    def test_storage_encryption_xpub_keeps_the_selected_account(self):
        client, helper, handler = self.make_client()
        account_xpub = self.public_key()
        client.binding = dict(BINDING)
        client.account = ([0x80000054, 0x80000000, 0x80000000], "p2wpkh", account_xpub)
        encryption_xpub = self.encryption_xpub()
        helper.call.return_value = dict(xpub=encryption_xpub, rootFingerprint=None)
        path = get_derivation_used_for_hw_device_encryption()
        self.assertEqual(encryption_xpub, client.get_xpub(path, "standard"))
        self.assertEqual(account_xpub, client.account[2])
        self.assertEqual("p2wpkh", client.account[1])
        handler.choose_wallet.assert_not_called()
        client.plugin.remember_wallet_binding.assert_not_called()
        sent = helper.call.call_args.args[1]
        self.assertEqual(convert_bip32_strpath_to_intpath(path), sent["path"])
        self.assertEqual("SPENDADDRESS", sent["scriptType"])
        self.assertEqual(BINDING, sent["binding"])

    def test_storage_unlock_asks_again_without_replacing_the_open_wallet(self):
        client, helper, handler = self.make_client()
        account_xpub = self.public_key()
        standard = dict(deviceId=STATE["deviceId"], serialNo=STATE["serialNo"],
                        walletType="standard", passphraseState=None)
        client.binding = dict(standard)
        client.account = ([0x80000054, 0x80000000, 0x80000000], "p2wpkh", account_xpub)
        client.device_id = STATE["deviceId"]
        client.root_fingerprint = "01020304"
        encryption_xpub = self.encryption_xpub()
        helper.call.side_effect = [
            dict(BINDING), dict(xpub=encryption_xpub, rootFingerprint=0xAABBCCDD),
            dict(xpub=encryption_xpub, rootFingerprint=None),
        ]
        client.begin_storage_unlock_selection()
        path = get_derivation_used_for_hw_device_encryption()
        self.assertEqual(encryption_xpub, client.get_xpub(path, "standard"))
        self.assertEqual(encryption_xpub, client.get_xpub(path, "standard"))
        handler.choose_wallet.assert_not_called()
        self.assertEqual("standard", helper.call.call_args_list[1].args[1]["mode"])
        self.assertEqual(["state", "open", "xpub", "xpub"], [call.args[0] for call in helper.call.call_args_list])
        self.assertEqual(BINDING, helper.call.call_args_list[2].args[1]["binding"])
        self.assertEqual(standard, helper.call.call_args_list[3].args[1]["binding"])
        self.assertEqual(standard, client.binding)
        self.assertEqual(account_xpub, client.account[2])
        self.assertEqual(STATE["deviceId"], client.device_id)
        self.assertEqual("01020304", client.root_fingerprint)
        self.assertFalse(client._unlock_selection)
        client.plugin.remember_wallet_binding.assert_not_called()

    def test_storage_unlock_opens_standard_without_asking(self):
        client, helper, handler = self.make_client()
        standard = dict(deviceId=STATE["deviceId"], serialNo=STATE["serialNo"],
                        walletType="standard", passphraseState=None)
        account = ([0x80000054, 0x80000000, 0x80000000], "p2wpkh", self.public_key())
        client.binding = dict(standard)
        client.account = account
        client.device_id = STATE["deviceId"]
        handler.choose_wallet.side_effect = AssertionError("wallet dialog")
        encryption_xpub = self.encryption_xpub()
        helper.call.side_effect = [dict(standard), dict(xpub=encryption_xpub, rootFingerprint=None)]
        client.begin_storage_unlock_selection()
        self.assertEqual(encryption_xpub, client.get_xpub(get_derivation_used_for_hw_device_encryption(), "standard"))
        self.assertEqual("standard", helper.call.call_args_list[-2].args[1]["mode"])
        self.assertEqual(standard, client.binding)
        self.assertEqual(account, client.account)
        self.assertFalse(client.closed)
        self.assertFalse(client._unlock_selection)
        handler.choose_wallet.assert_not_called()
        helper.shutdown.assert_not_called()

    def test_cancelled_device_prompt_during_storage_unlock_keeps_the_open_wallet(self):
        client, helper, handler = self.make_client()
        standard = dict(deviceId=STATE["deviceId"], serialNo=STATE["serialNo"],
                        walletType="standard", passphraseState=None)
        account = ([0x80000054, 0x80000000, 0x80000000], "p2wpkh", self.public_key())
        client.binding = dict(standard)
        client.account = account
        client.device_id = STATE["deviceId"]
        helper.call.side_effect = HelperError("CANCELLED")
        client.begin_storage_unlock_selection()
        with self.assertRaises(UserCancelled):
            client.get_xpub(get_derivation_used_for_hw_device_encryption(), "standard")
        self.assertEqual(standard, client.binding)
        self.assertEqual(account, client.account)
        self.assertEqual(STATE["deviceId"], client.device_id)
        self.assertFalse(client.closed)
        self.assertFalse(client._unlock_selection)
        helper.shutdown.assert_not_called()

    def test_storage_encryption_can_select_a_wallet_without_becoming_the_account(self):
        client, helper, handler = self.make_client()
        encryption_xpub = self.encryption_xpub()
        helper.call.side_effect = [BINDING, dict(xpub=encryption_xpub, rootFingerprint=None)]
        path = get_derivation_used_for_hw_device_encryption()
        self.assertEqual(encryption_xpub, client.get_xpub(path, "standard"))
        self.assertIsNone(client.account)
        handler.choose_wallet.assert_not_called()
        client.plugin.remember_wallet_binding.assert_not_called()
        self.assertEqual("open", helper.call.call_args_list[-2].args[0])
        self.assertEqual("standard", helper.call.call_args_list[-2].args[1]["mode"])

    def test_storage_encryption_path_is_not_a_general_account_exception(self):
        client, helper, _ = self.make_client()
        path = get_derivation_used_for_hw_device_encryption()
        for requested, xtype in ((path + "/0'", "standard"), ("m/4541509'/0'", "standard"), (path, "p2wpkh"),
                                 ("m/0'/0'", "p2wpkh")):
            with self.subTest(path=requested, xtype=xtype), self.assertRaises(UserFacingException):
                client.get_xpub(requested, xtype)
        self.assertEqual(1, helper.call.call_count)

    def test_unspecified_selection_opens_the_standard_wallet(self):
        client, helper, handler = self.make_client()
        handler.choose_wallet.side_effect = AssertionError("wallet dialog")
        opened = dict(deviceId=STATE["deviceId"], serialNo=STATE["serialNo"],
                      walletType="standard", passphraseState=None)
        xpub = self.public_key()
        helper.call.side_effect = [opened, dict(xpub=xpub, rootFingerprint=None)]
        self.assertEqual(xpub, client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        self.assertEqual("standard", helper.call.call_args_list[-2].args[1]["mode"])
        handler.choose_wallet.assert_not_called()
        helper.shutdown.assert_not_called()

    def test_request_wallet_mode_rejects_separate_attach_pin_mode(self):
        client, _helper, _handler = self.make_client()
        with self.assertRaises(UserFacingException):
            client.request_wallet_mode("select-attach-pin")

    def test_account_xpub_omitting_fingerprint_clears_the_cache(self):
        client, helper, _handler = self.make_client()
        xpub = self.public_key()
        client.root_fingerprint = "01020304"
        helper.call.side_effect = [
            BINDING, dict(xpub=xpub, rootFingerprint=0x01020304),
            dict(xpub=xpub, rootFingerprint=None),
        ]
        self.assertEqual(xpub, client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        self.assertEqual("01020304", client.root_fingerprint)
        self.assertEqual(xpub, client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        self.assertIsNone(client.root_fingerprint)

    def test_silent_lookup_reuses_a_matched_account_without_a_prompt(self):
        client, helper, handler = self.make_client()
        xpub = self.public_key()
        keystore = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'", onekey_binding=BINDING))
        client.binding = dict(BINDING)
        client.account = (account_path("m/84'/0'/0'", "p2wpkh"), "p2wpkh", normalized_xpub(xpub, "p2wpkh"))
        client.plugin._expected_keystore = keystore
        client.plugin._allow_user_interaction = False
        calls = helper.call.call_count
        self.assertEqual(normalized_xpub(xpub, "p2wpkh"), client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        self.assertEqual(calls, helper.call.call_count)
        handler.show_message.assert_not_called()
        handler.choose_wallet.assert_not_called()

    def test_silent_lookup_does_not_open_a_prompt_for_another_account(self):
        client, helper, handler = self.make_client()
        xpub = self.public_key()
        keystore = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'", onekey_binding=BINDING))
        client.plugin._expected_keystore = keystore
        client.plugin._allow_user_interaction = False
        with self.assertRaises(UserCancelled):
            client.get_xpub("m/84'/0'/0'", "p2wpkh")
        handler.show_message.assert_not_called()
        handler.choose_wallet.assert_not_called()
        self.assertFalse(any(call.args[0] == "open" for call in helper.call.call_args_list))

    def test_silent_get_client_skips_bind_unless_the_account_is_already_open(self):
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        keystore = mock.Mock()
        unbound = mock.Mock()
        unbound.attached.return_value = True
        unbound.matches_keystore.return_value = False
        with mock.patch("electrum.hw_wallet.plugin.HW_PluginBase.get_client", return_value=unbound):
            self.assertIsNone(OneKeyPlugin.get_client(plugin, keystore, allow_user_interaction=False))
        unbound.bind_keystore.assert_not_called()
        matched = mock.Mock()
        matched.attached.return_value = True
        matched.matches_keystore.return_value = True
        with mock.patch("electrum.hw_wallet.plugin.HW_PluginBase.get_client", return_value=matched):
            self.assertIs(matched, OneKeyPlugin.get_client(plugin, keystore, allow_user_interaction=False))
        matched.bind_keystore.assert_not_called()

    def test_silent_get_client_returns_none_when_pairing_cannot_prompt(self):
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        with mock.patch("electrum.hw_wallet.plugin.HW_PluginBase.get_client",
                        side_effect=DeviceUnpairableError("unpairable")):
            self.assertIsNone(OneKeyPlugin.get_client(plugin, mock.Mock(), allow_user_interaction=False))
        with mock.patch("electrum.hw_wallet.plugin.HW_PluginBase.get_client",
                        side_effect=DeviceUnpairableError("unpairable")):
            with self.assertRaises(DeviceUnpairableError):
                OneKeyPlugin.get_client(plugin, mock.Mock())

    def test_closed_device_asks_to_reconnect_before_a_transaction(self):
        keystore, tx, _node = TestOneKeySigning().make_transaction()
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin.get_client = mock.Mock(return_value=None)
        with self.assertRaisesRegex(UserFacingException, "Reconnect OneKey"):
            plugin.sign_transaction(keystore, tx)

    def test_closed_device_asks_to_reconnect_before_an_address(self):
        keystore, tx, _node = TestOneKeySigning().make_transaction()
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin.get_client = mock.Mock(return_value=None)
        plugin.show_address_helper = lambda *_args: True
        wallet = mock.Mock(txin_type="p2wpkh")
        wallet.get_address_index.return_value = (0, 1)
        with self.assertRaisesRegex(UserFacingException, "Reconnect OneKey"):
            plugin.show_address(wallet, tx.outputs()[0].address, keystore)
        plugin.get_client.assert_called_once_with(keystore)

    def test_identity_wallet_or_xpub_mismatch_stops_before_side_effect(self):
        for field in ("deviceId", "serialNo", "passphraseState", "xpub"):
            client, helper, _ = self.make_client()
            xpub = self.public_key()
            client.binding = dict(BINDING)
            client.account = ([0x80000054, 0x80000000, 0x80000000], "p2wpkh", xpub)
            binding = dict(BINDING)
            if field != "xpub":
                binding[field] = "different"
            key = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'", onekey_binding=binding))
            other = BIP32Node.from_rootseed(os.urandom(32), xtype="p2wpkh").subkey_at_private_derivation("m/84'/0'/0'").to_xpub()
            helper.call.return_value = dict(xpub=other, rootFingerprint=None)
            with self.subTest(field=field), self.assertRaises(UserFacingException):
                client.bind_keystore(key)
            self.assertFalse(any(call.args[0] in ("address", "sign") for call in helper.call.call_args_list))
            self.assertIsNone(client.binding)
            self.assertIsNone(client.account)
            self.assertTrue(client.attached())
            helper.shutdown.assert_not_called()
            helper.release.assert_not_called()

    def test_bound_account_is_checked_before_address_and_address_is_compared(self):
        client, helper, _ = self.make_client()
        xpub = self.public_key()
        client.binding = dict(BINDING)
        client.account = ([0x80000054, 0x80000000, 0x80000000], "p2wpkh", xpub)
        helper.call.side_effect = [dict(xpub=xpub, rootFingerprint=None), {"address": "different-address"}]
        with self.assertRaisesRegex(UserFacingException, "different address"):
            client.show_address(client.account[0] + [0, 0], "p2wpkh", "expected-address")
        self.assertEqual(["xpub", "address"], [call.args[0] for call in helper.call.call_args_list[-2:]])
        self.assertIsNone(client.binding)
        self.assertIsNone(client.account)
        self.assertTrue(client.attached())
        helper.shutdown.assert_not_called()
        helper.release.assert_not_called()

    def test_missing_binding_invalid_binding_and_stale_child_fail_closed(self):
        client, helper, _ = self.make_client()
        key = OneKeyKeyStore(dict(xpub=self.public_key(), derivation="m/84'/0'/0'"))
        with self.assertRaisesRegex(UserFacingException, "no OneKey device binding"):
            client.bind_keystore(key)
        # Builds that saved "attach-pin" keep pairing; the value is read as "hidden".
        legacy = check_binding({**BINDING, "walletType": "attach-pin"})
        self.assertEqual({**BINDING, "walletType": "hidden"}, legacy)
        for bad in ({**BINDING, "walletType": "standard"}, {**BINDING, "passphraseState": None},
                    {**BINDING, "sessionId": "forbidden"}, {**BINDING, "walletType": "attach"}):
            with self.assertRaises(UserFacingException):
                check_binding(bad)
        client, helper, _ = self.make_client()
        helper.call.side_effect = HelperError("STALE")
        self.assertFalse(client.has_usable_connection_with_device())
        self.assertTrue(client.closed)

    def test_cancelled_health_probe_keeps_the_client_paired(self):
        client, helper, _ = self.make_client()
        token = threading.Event()
        token.set()
        helper.call.side_effect = HelperError("CANCELLED")
        self.assertFalse(client.has_usable_connection_with_device(cancelled=token))
        self.assertTrue(helper.call.call_args.kwargs["cancelled"].is_set())
        self.assertFalse(client.closed)
        # A cancel that this probe did not request still means the link is gone.
        self.assertFalse(client.has_usable_connection_with_device())
        self.assertTrue(client.closed)

    def test_mislabeled_but_signable_derivation_fails_the_live_xpub_check(self):
        client, helper, _ = self.make_client()
        stored = self.public_key()  # an m/84'/0'/0' account
        live = BIP32Node.from_rootseed(os.urandom(32), xtype="p2wpkh").subkey_at_private_derivation(
            "m/49'/0'/0'").to_xpub()
        keystore = OneKeyKeyStore(dict(xpub=stored, derivation="m/49'/0'/0'", onekey_binding=BINDING))
        helper.call.side_effect = None
        helper.call.return_value = dict(xpub=live, rootFingerprint=None)
        with self.assertRaisesRegex(UserFacingException, "does not match this Electrum wallet"):
            client.bind_keystore(keystore)
        self.assertEqual([0x80000031, 0x80000000, 0x80000000], helper.call.call_args.args[1]["path"])
        self.assertIsNone(client.account)

    def test_mainnet_testnet_and_unsupported_account_paths(self):
        self.assertEqual("Bitcoin", coin_name())
        with mock.patch.object(constants, "net", constants.BitcoinTestnet):
            self.assertEqual("Testnet", coin_name())
        client, helper, _ = self.make_client()
        for path, xtype in (("m/0'/0'", "p2wpkh"), ("m/84'/1'/0'", "p2wpkh"), ("m/84'/0'", "p2wpkh")):
            with self.assertRaises(UserFacingException):
                client.get_xpub(path, xtype)
        self.assertEqual(1, helper.call.call_count)


class TestOneKeySigning(unittest.TestCase):
    def make_transaction(self, script_type="p2wpkh"):
        xtype = "standard" if script_type == "p2pkh" else script_type
        root = BIP32Node.from_rootseed(os.urandom(32), xtype=xtype)
        purpose = {"p2pkh": 44, "p2wpkh-p2sh": 49, "p2wpkh": 84}[script_type]
        coin = 1 if constants.net.TESTNET else 0
        prefix = f"m/{purpose}'/{coin}'/0'"
        account = root.subkey_at_private_derivation(prefix)
        fingerprint = root.calc_fingerprint_of_this_node()
        keystore = OneKeyKeyStore(dict(xpub=account.to_xpub(), derivation=prefix,
                                      root_fingerprint=fingerprint.hex(), onekey_binding=BINDING))

        def make_output(branch, index, value):
            node = account.subkey_at_private_derivation([branch, index])
            pubkey = node.eckey.get_public_key_bytes(compressed=True)
            desc = descriptor.get_singlesig_descriptor_from_legacy_leaf(pubkey=pubkey.hex(), script_type=script_type)
            output = PartialTxOutput(scriptpubkey=desc.expand().output_script, value=value)
            output.script_descriptor = desc
            output.bip32_paths[pubkey] = (fingerprint, convert_bip32_strpath_to_intpath(prefix) + [branch, index])
            return output, node

        funding_output, input_node = make_output(0, 0, 100000)
        raw = (bytes.fromhex("0200000001") + bytes(32) + bytes.fromhex("ffffffff0100ffffffff01")
               + (100000).to_bytes(8, "little") + bytes([len(funding_output.scriptpubkey)])
               + funding_output.scriptpubkey + bytes(4))
        funding = Transaction(raw.hex())
        txin = PartialTxInput(prevout=TxOutpoint(txid=bytes.fromhex(funding.txid()), out_idx=0))
        txin.utxo = funding
        txin.script_descriptor = funding_output.script_descriptor
        txin.bip32_paths = funding_output.bip32_paths
        txin.is_mine = True
        recipient, _ = make_output(0, 1, 60000)
        change, _ = make_output(1, 2, 39000)
        change.is_mine = change.is_change = True
        tx = PartialTransaction.from_io(inputs=[txin], outputs=[recipient, change],
                                        version=2, locktime=123, BIP69_sort=False)
        return keystore, tx, input_node

    def plugin(self, signature):
        client = mock.Mock()
        client.sign_tx.return_value = [dict(index=0, signature=signature.hex())]
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin.get_client = mock.Mock(return_value=client)
        return plugin, client

    def test_signing_original_transaction_all_scripts_both_networks(self):
        for network in (constants.BitcoinMainnet, constants.BitcoinTestnet):
            for script_type in ("p2pkh", "p2wpkh-p2sh", "p2wpkh"):
                with self.subTest(network=network, script=script_type), mock.patch.object(constants, "net", network):
                    keystore, tx, node = self.make_transaction(script_type)
                    signature = tx.sign_txin(0, node.eckey.get_secret_bytes())[:-1]
                    plugin, client = self.plugin(signature)
                    plugin.sign_transaction(keystore, tx)
                    self.assertTrue(tx.is_complete())
                    inputs, outputs, previous = client.sign_tx.call_args.args
                    self.assertEqual("100000", inputs[0]["amount"])
                    self.assertEqual("60000", outputs[0]["amount"])
                    self.assertIn("address", outputs[0])
                    self.assertEqual(1, outputs[1]["address_n"][-2])
                    self.assertEqual("100000", previous[inputs[0]["prev_hash"]]["bin_outputs"][0]["amount"])
                    kwargs = dict(client.sign_tx.call_args.kwargs)
                    self.assertIs(client.take_bind_token.return_value, kwargs.pop("bind_token"))
                    self.assertEqual(dict(version=2, lock_time=123), kwargs)

    def test_foreign_input_nondefault_sighash_missing_prev_and_bad_change_rejected(self):
        for mode in ("foreign", "sighash", "previous", "input-path", "change-path", "change-script"):
            keystore, tx, _ = self.make_transaction()
            txin, change = tx.inputs()[0], tx.outputs()[1]
            if mode == "foreign": txin.is_mine = False
            if mode == "sighash": txin.sighash = Sighash.NONE
            if mode == "previous":
                # Assigning utxo = None does not clear a previous transaction Electrum already stored.
                bare = PartialTxInput(prevout=txin.prevout)
                bare.script_descriptor = txin.script_descriptor
                bare.bip32_paths = dict(txin.bip32_paths)
                bare.is_mine = True
                bare.nsequence = txin.nsequence
                tx._inputs[0] = bare
            if mode == "input-path":
                pubkey = next(iter(txin.bip32_paths))
                fp, path = txin.bip32_paths[pubkey]
                txin.bip32_paths[pubkey] = (fp, path[:-1] + [5])
            if mode == "change-path":
                pubkey = next(iter(change.bip32_paths))
                fp, path = change.bip32_paths[pubkey]
                change.bip32_paths[pubkey] = (fp, path[:-2] + [0, path[-1]])
            if mode == "change-script": change.scriptpubkey = tx.outputs()[0].scriptpubkey
            plugin, _ = self.plugin(b"")
            with self.subTest(mode=mode):
                if mode == "previous":
                    with self.assertRaisesRegex(UserFacingException, "previous transaction"):
                        plugin.sign_transaction(keystore, tx)
                else:
                    with self.assertRaises(UserFacingException):
                        plugin.sign_transaction(keystore, tx)
                plugin.get_client.assert_not_called()

    def test_signature_count_index_encoding_and_original_transaction_verification(self):
        for mode in ("missing", "index", "duplicate", "encoding", "foreign-signature", "changed-transaction"):
            keystore, tx, node = self.make_transaction()
            signature = tx.sign_txin(0, node.eckey.get_secret_bytes())[:-1]
            plugin, client = self.plugin(signature)
            if mode == "missing": client.sign_tx.return_value = []
            if mode == "index": client.sign_tx.return_value[0]["index"] = 1
            if mode == "duplicate": client.sign_tx.return_value *= 2
            if mode == "encoding": client.sign_tx.return_value[0]["signature"] += "01"
            if mode == "foreign-signature": client.sign_tx.return_value[0]["signature"] = "3006020101020101"
            if mode == "changed-transaction": tx.locktime += 1
            before = tx.serialize()
            with self.subTest(mode=mode), self.assertRaises(Exception):
                plugin.sign_transaction(keystore, tx)
            self.assertEqual(before, tx.serialize())
            self.assertFalse(tx.is_complete())

    def test_der_encoding_rejects_noncanonical_and_wrong_sighash_suffix(self):
        for value in ("00", "300602010102010101", "300702020001020101", "3006020180020101", "3006020100020101"):
            with self.assertRaises(UserFacingException):
                OneKeyPlugin._signature(value)


class TestOneKeyMessage(unittest.TestCase):
    def test_sign_message_returns_bytes_electrum_can_verify(self):
        signer = TestOneKeySigning()
        for network in (constants.BitcoinMainnet, constants.BitcoinTestnet):
            for script_type in ("p2pkh", "p2wpkh-p2sh", "p2wpkh"):
                with self.subTest(network=network, script=script_type), mock.patch.object(constants, "net", network):
                    keystore, _tx, node = signer.make_transaction(script_type)
                    message = "OneKey"
                    signature = bitcoin.ecdsa_sign_usermessage(node.eckey, message, is_compressed=True)
                    pubkey = node.eckey.get_public_key_bytes(compressed=True).hex()
                    script = descriptor.get_singlesig_descriptor_from_legacy_leaf(
                        pubkey=pubkey, script_type=script_type).expand().output_script
                    address = PartialTxOutput(scriptpubkey=script, value=0).address
                    plugin = OneKeyPlugin.__new__(OneKeyPlugin)
                    client = mock.Mock()
                    client.sign_message.return_value = signature
                    plugin.get_client = mock.Mock(return_value=client)
                    keystore.plugin = plugin
                    result = keystore.sign_message((0, 0), message, None, script_type=script_type)
                    self.assertEqual(signature, result)
                    self.assertTrue(bitcoin.verify_usermessage_with_address(address, result, message.encode()))
                    path, asked, raw, expected = client.sign_message.call_args.args
                    self.assertEqual(script_type, asked)
                    self.assertEqual(message.encode(), raw)
                    self.assertEqual(address, expected)
                    self.assertEqual([0, 0], path[-2:])

    def test_sign_message_rejects_unsupported_input_before_the_device(self):
        keystore, _tx, _node = TestOneKeySigning().make_transaction()
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin.get_client = mock.Mock()
        keystore.plugin = plugin
        cases = (
            ("", "p2wpkh", (0, 0)),
            ("a" * 1025, "p2wpkh", (0, 0)),
            ("ok", "p2tr", (0, 0)),
            ("ok", None, (0, 0)),
            ("ok", "p2wpkh", (2, 0)),
            ("ok", "p2pkh", (0, 0)),
        )
        for message, script_type, sequence in cases:
            with self.subTest(script=script_type, size=len(message)), self.assertRaises(UserFacingException):
                keystore.sign_message(sequence, message, None, script_type=script_type)
        plugin.get_client.assert_not_called()
        with self.assertRaises(UserFacingException):
            keystore.decrypt_message((0, 0), "cipher", None)
        plugin.get_client.assert_not_called()
        client = mock.Mock()
        client.sign_message.return_value = b"\x1f" + b"\x11" * 64
        plugin.get_client = mock.Mock(return_value=client)
        with self.assertRaisesRegex(UserFacingException, "signature encoding"):
            keystore.sign_message((0, 0), "a" * 1024, None, script_type="p2wpkh")
        self.assertEqual(1024, len(client.sign_message.call_args.args[2]))


class TestOneKeyMultisig(unittest.TestCase):
    def make_wallet(self, thresh=2, script_type="p2wsh", input_count=1, master_cosigner=False):
        coin = 1 if constants.net.TESTNET else 0
        if script_type == "p2sh":
            # Electrum's legacy multisig default is BIP45; Testnet has no BIP45, so use BIP48 raw.
            prefix = "m/48'/1'/0'/0'" if coin else "m/45'/0"
        else:
            script_index = {"p2wsh": 2, "p2wsh-p2sh": 1}[script_type]
            prefix = f"m/48'/{coin}'/0'/{script_index}'"
        accounts = []
        roots = []
        for seed in (b"\x11" * 32, b"\x22" * 32, b"\x33" * 32):
            root = BIP32Node.from_rootseed(seed, xtype="standard" if script_type == "p2sh" else script_type)
            roots.append(root)
            accounts.append(root.subkey_at_private_derivation(prefix))
        fingerprint = roots[0].calc_fingerprint_of_this_node()
        keystore = OneKeyKeyStore(dict(xpub=accounts[0].to_xpub(), derivation=prefix,
                                      root_fingerprint=fingerprint.hex(), onekey_binding=BINDING))

        def make_output(change, addr_index, value):
            keys = []
            providers = []
            for index, account in enumerate(accounts):
                source = roots[index] if master_cosigner and index == len(accounts) - 1 else account
                keys.append(source.subkey_at_private_derivation([change, addr_index]))
                public = source.convert_to_public()._replace(xtype="standard").to_xpub()
                providers.append(descriptor.PubkeyProvider(None, public, f"/{change}/{addr_index}"))
            multi = descriptor.MultisigDescriptor(providers, thresh, True)
            if script_type == "p2sh":
                desc = descriptor.SHDescriptor(multi)
            else:
                desc = descriptor.WSHDescriptor(multi)
                if script_type == "p2wsh-p2sh":
                    desc = descriptor.SHDescriptor(desc)
            output = PartialTxOutput(scriptpubkey=desc.expand().output_script, value=value)
            output.script_descriptor = desc
            pubkey = keys[0].eckey.get_public_key_bytes(compressed=True)
            output.bip32_paths[pubkey] = (fingerprint, convert_bip32_strpath_to_intpath(prefix) + [change, addr_index])
            return output, keys

        inputs = []
        groups = []
        for index in range(input_count):
            funding_output, input_keys = make_output(0, index, 100000)
            script = funding_output.scriptpubkey
            raw = (bytes.fromhex("0200000001") + bytes(32) + bytes.fromhex("ffffffff0100ffffffff01")
                   + (100000).to_bytes(8, "little") + bytes([len(script)]) + script + bytes(4))
            funding = Transaction(raw.hex())
            txin = PartialTxInput(prevout=TxOutpoint(txid=bytes.fromhex(funding.txid()), out_idx=0))
            txin.utxo = funding
            txin.script_descriptor = funding_output.script_descriptor
            txin.bip32_paths = dict(funding_output.bip32_paths)
            txin.is_mine = True
            inputs.append(txin)
            groups.append(input_keys)
        recipient, _keys = make_output(0, input_count, 60000)
        recipient.is_mine = True
        change, _keys = make_output(1, 2, 39000)
        change.is_mine = change.is_change = True
        tx = PartialTransaction.from_io(inputs=inputs, outputs=[recipient, change],
                                        version=2, locktime=123, BIP69_sort=False)
        if input_count == 1:
            return keystore, tx, groups[0]
        return keystore, tx, groups

    def test_partial_legacy_p2sh_signature_is_kept(self):
        for network in (constants.BitcoinMainnet, constants.BitcoinTestnet):
            with self.subTest(network=network), mock.patch.object(constants, "net", network):
                keystore, tx, keys = self.make_wallet(script_type="p2sh")
                signature = tx.sign_txin(0, keys[0].eckey.get_secret_bytes())[:-1]
                plugin, client = TestOneKeySigning().plugin(signature)
                plugin.sign_transaction(keystore, tx)
                txin = tx.inputs()[0]
                self.assertIn(keys[0].eckey.get_public_key_bytes(compressed=True), txin.sigs_ecdsa)
                self.assertFalse(tx.is_complete())
                self.assertEqual((1, 2), txin.get_satisfaction_progress())
                signed, outputs, previous = client.sign_tx.call_args.args
                self.assertEqual("SPENDMULTISIG", signed[0]["script_type"])
                self.assertEqual(2, signed[0]["multisig"]["m"])
                self.assertEqual(3, len(signed[0]["multisig"]["pubkeys"]))
                self.assertEqual([0, 0], signed[0]["address_n"][-2:])
                self.assertEqual("PAYTOMULTISIG", outputs[1]["script_type"])
                self.assertEqual([1, 2], outputs[1]["address_n"][-2:])
                # Legacy inputs always carry the full previous transaction.
                self.assertEqual([signed[0]["prev_hash"]], list(previous))

    def test_partial_native_segwit_signature_is_kept(self):
        for network in (constants.BitcoinMainnet, constants.BitcoinTestnet):
            with self.subTest(network=network), mock.patch.object(constants, "net", network):
                keystore, tx, keys = self.make_wallet()
                signature = tx.sign_txin(0, keys[0].eckey.get_secret_bytes())[:-1]
                plugin, client = TestOneKeySigning().plugin(signature)
                plugin.sign_transaction(keystore, tx)
                txin = tx.inputs()[0]
                our_pubkey = keys[0].eckey.get_public_key_bytes(compressed=True)
                self.assertIn(our_pubkey, txin.sigs_ecdsa)
                self.assertEqual(1, len(txin.sigs_ecdsa))
                self.assertFalse(tx.is_complete())
                self.assertEqual((1, 2), txin.get_satisfaction_progress())
                signed, outputs, _previous = client.sign_tx.call_args.args
                self.assertEqual("SPENDWITNESS", signed[0]["script_type"])
                self.assertEqual(6, len(signed[0]["address_n"]))
                self.assertEqual([0, 0], signed[0]["address_n"][-2:])
                multisig = signed[0]["multisig"]
                self.assertEqual(2, multisig["m"])
                self.assertEqual(3, len(multisig["pubkeys"]))
                providers = txin.script_descriptor.get_simple_multisig().pubkeys
                self.assertEqual([provider.extkey.eckey.get_public_key_bytes(compressed=True).hex()
                                  for provider in providers],
                                 [node["public_key"] for node in multisig["pubkeys"]])
                self.assertEqual(sorted(provider.get_pubkey_bytes() for provider in providers),
                                 [provider.get_pubkey_bytes() for provider in providers])
                self.assertEqual([0, 0], multisig["pubkeys"][0]["address_n"])
                self.assertEqual(0x80000002, multisig["pubkeys"][0]["child_num"])
                self.assertNotIn("multisig", outputs[0])
                self.assertIn("address", outputs[0])
                self.assertEqual("PAYTOWITNESS", outputs[1]["script_type"])
                self.assertEqual([1, 2], outputs[1]["address_n"][-2:])
                self.assertEqual(2, outputs[1]["multisig"]["m"])

    def test_partial_nested_segwit_signature_is_kept(self):
        for network in (constants.BitcoinMainnet, constants.BitcoinTestnet):
            with self.subTest(network=network), mock.patch.object(constants, "net", network):
                keystore, tx, keys = self.make_wallet(script_type="p2wsh-p2sh")
                signature = tx.sign_txin(0, keys[0].eckey.get_secret_bytes())[:-1]
                plugin, client = TestOneKeySigning().plugin(signature)
                plugin.sign_transaction(keystore, tx)
                txin = tx.inputs()[0]
                our_pubkey = keys[0].eckey.get_public_key_bytes(compressed=True)
                self.assertIn(our_pubkey, txin.sigs_ecdsa)
                self.assertEqual(1, len(txin.sigs_ecdsa))
                self.assertFalse(tx.is_complete())
                self.assertEqual((1, 2), txin.get_satisfaction_progress())
                self.assertEqual(23, len(txin.utxo.outputs()[0].scriptpubkey))
                signed, outputs, _previous = client.sign_tx.call_args.args
                self.assertEqual("SPENDP2SHWITNESS", signed[0]["script_type"])
                self.assertEqual([0x80000000 + 48, 0x80000000 + (1 if network.TESTNET else 0),
                                  0x80000000, 0x80000000 + 1, 0, 0], signed[0]["address_n"])
                self.assertEqual(0x80000001, signed[0]["multisig"]["pubkeys"][0]["child_num"])
                self.assertNotIn("multisig", outputs[0])
                self.assertTrue(outputs[0]["address"].startswith("2" if network.TESTNET else "3"))
                self.assertEqual("PAYTOP2SHWITNESS", outputs[1]["script_type"])
                self.assertEqual([1, 2], outputs[1]["address_n"][-2:])
                self.assertEqual(2, outputs[1]["multisig"]["m"])

    def test_one_valid_signature_can_finish_when_the_threshold_is_met(self):
        keystore, tx, keys = self.make_wallet()
        other = keys[1].eckey.get_public_key_bytes(compressed=True)
        other_sig = tx.sign_txin(0, keys[1].eckey.get_secret_bytes())
        tx.inputs()[0].sigs_ecdsa[other] = other_sig
        signature = tx.sign_txin(0, keys[0].eckey.get_secret_bytes())[:-1]
        plugin, _client = TestOneKeySigning().plugin(signature)
        plugin.sign_transaction(keystore, tx)
        txin = tx.inputs()[0]
        our = keys[0].eckey.get_public_key_bytes(compressed=True)
        self.assertEqual(other_sig, txin.sigs_ecdsa[other])
        self.assertIn(our, txin.sigs_ecdsa)
        self.assertTrue(txin.is_complete())

    def test_wrong_or_invalid_signature_leaves_other_cosigners_in_place(self):
        keystore, tx, keys = self.make_wallet()
        other_only = tx.sign_txin(0, keys[1].eckey.get_secret_bytes())
        plugin, _client = TestOneKeySigning().plugin(other_only[:-1])
        with self.assertRaises(UserFacingException):
            plugin.sign_transaction(keystore, tx)
        self.assertEqual({}, tx.inputs()[0].sigs_ecdsa)
        other = keys[1].eckey.get_public_key_bytes(compressed=True)
        other_sig = other_only
        tx.inputs()[0].sigs_ecdsa[other] = other_sig
        plugin, client = TestOneKeySigning().plugin(other_sig[:-1])
        with self.assertRaises(UserFacingException):
            plugin.sign_transaction(keystore, tx)
        self.assertEqual({other: other_sig}, tx.inputs()[0].sigs_ecdsa)
        client.sign_tx.return_value = [dict(index=0, signature="00")]
        with self.assertRaises(UserFacingException):
            plugin.sign_transaction(keystore, tx)
        self.assertEqual({other: other_sig}, tx.inputs()[0].sigs_ecdsa)

    def test_previous_partial_sig_is_not_treated_as_this_result(self):
        keystore, tx, keys = self.make_wallet()
        our = keys[0].eckey.get_public_key_bytes(compressed=True)
        old = tx.sign_txin(0, keys[0].eckey.get_secret_bytes())
        tx.inputs()[0].sigs_ecdsa[our] = old
        plugin, _client = TestOneKeySigning().plugin(bytes.fromhex("3006020101020102"))
        with self.assertRaises(UserFacingException):
            plugin.sign_transaction(keystore, tx)
        self.assertEqual({our: old}, tx.inputs()[0].sigs_ecdsa)

    def test_same_partial_sig_can_be_returned_again(self):
        keystore, tx, keys = self.make_wallet()
        full = tx.sign_txin(0, keys[0].eckey.get_secret_bytes())
        our = keys[0].eckey.get_public_key_bytes(compressed=True)
        tx.inputs()[0].sigs_ecdsa[our] = full
        plugin, _client = TestOneKeySigning().plugin(full[:-1])
        plugin.sign_transaction(keystore, tx)
        self.assertEqual(full, tx.inputs()[0].sigs_ecdsa[our])

    def test_other_multisig_kinds_are_rejected_before_the_device(self):
        keystore, tx, _keys = self.make_wallet()
        multi = tx.inputs()[0].script_descriptor.get_simple_multisig()
        cases = {
            "p2sh": descriptor.SHDescriptor(multi),
            "nested": descriptor.SHDescriptor(descriptor.WSHDescriptor(multi)),
            "unsorted": descriptor.WSHDescriptor(descriptor.MultisigDescriptor(list(multi.pubkeys), 2, False)),
        }
        for name, desc in cases.items():
            keystore, tx, _keys = self.make_wallet()
            tx.inputs()[0].script_descriptor = desc
            plugin, _client = TestOneKeySigning().plugin(b"")
            with self.subTest(kind=name), self.assertRaises(UserFacingException):
                plugin.sign_transaction(keystore, tx)
            plugin.get_client.assert_not_called()
        # Paths the firmware cannot sign from stop before the device. A mislabeled
        # path it can sign from (m/45'/0, m/48'/0'/0'/1') is caught by the live xpub
        # comparison in bind_keystore instead; see
        # test_mislabeled_but_signable_derivation_fails_the_live_xpub_check.
        for derivation in ("m/48'/0'/0'/2'/0/0", "m/1'/0'/0'/2'", "m/48'/1'/0'/2'"):
            keystore, tx, _keys = self.make_wallet()
            keystore = OneKeyKeyStore(dict(xpub=keystore.xpub, derivation=derivation,
                                          root_fingerprint=keystore.get_root_fingerprint(), onekey_binding=BINDING))
            plugin, _client = TestOneKeySigning().plugin(b"")
            with self.subTest(path=derivation), self.assertRaises(UserFacingException):
                plugin.sign_transaction(keystore, tx)
            plugin.get_client.assert_not_called()

    def test_account_path_accepts_what_the_firmware_keychain_can_sign(self):
        h = 0x80000000
        accepted = (
            ("m/48'/0'/0'/2'", "p2wsh"), ("m/48'/0'/0'/1'", "p2wsh-p2sh"), ("m/48'/0'/7'/0'", "p2sh"),
            ("m/45'/0", "p2sh"), ("m/45'/0'/0'", "p2sh"),
            ("m/44'/0'/0'", "standard"), ("m/49'/0'/0'", "p2wpkh-p2sh"), ("m/84'/0'/5'", "p2wpkh"),
            # Another script type's schema: the device signs after its path warning.
            ("m/44'/0'/0'", "p2wpkh"), ("m/84'/0'/0'", "standard"), ("m/48'/0'/0'/1'", "p2wsh"),
            ("m/84'/0'/0'", "p2wsh"), ("m/86'/0'/0'", "p2wpkh"), ("m/44'/0'/0'/1", "p2wpkh"),
            ("m/49/0/0", "p2wpkh-p2sh"),
        )
        for path, xtype in accepted:
            with self.subTest(path=path, xtype=xtype):
                self.assertEqual(convert_bip32_strpath_to_intpath(path), account_path(path, xtype))
        self.assertEqual([h + 48, h + 1, h + 3, h + 2], [x for x in self._testnet(account_path, "m/48'/1'/3'/2'", "p2wsh")])
        rejected = (
            ("m/0'/0'", "p2wpkh"), ("m", "standard"), ("m/84'/0'", "p2wpkh"), ("m/1'/0'/0'/2'", "p2wsh"),
            ("m/48'/1'/0'/2'", "p2wsh"), ("m/84'/1'/0'", "p2wpkh"),  # Testnet coin type on mainnet
            ("m/48'/0'/0'/2'/0/0", "p2wsh"), ("m/84'/0'/0'/0/0", "p2wpkh"),  # address paths, not accounts
            ("m/45'/101", "p2sh"), ("m/84'/0'/0'", "p2tr"),
        )
        for path, xtype in rejected:
            with self.subTest(path=path, xtype=xtype), self.assertRaises(UserFacingException):
                account_path(path, xtype)
        for path, xtype in (("m/48'/0'/0'/2'", "p2wsh"), ("m/45'/0", "p2sh")):
            # Mainnet coin type and BIP45 (no coin_type field) are not Testnet accounts.
            with self.subTest(testnet=path), self.assertRaises(UserFacingException):
                self._testnet(account_path, path, xtype)

    def test_bip44_account_addresses_must_fit_the_ten_component_limit(self):
        prefix = convert_bip32_strpath_to_intpath("m/44'/0'/0'/0/0/0/0/0")
        self.assertTrue(firmware_account_allowed(prefix, 0))
        self.assertEqual(prefix, account_path(prefix, "standard"))
        self.assertTrue(firmware_path_allowed(prefix + [1, 0x7fffffff], 0))
        too_long = prefix + [0]
        self.assertTrue(firmware_path_allowed(too_long, 0))
        self.assertTrue(firmware_path_allowed(too_long + [0], 0))
        self.assertFalse(firmware_path_allowed(too_long + [0, 0], 0))
        self.assertFalse(firmware_account_allowed(too_long, 0))
        with self.assertRaises(UserFacingException):
            account_path("m/44'/0'/0'/0/0/0/0/0/0", "standard")

    @staticmethod
    def _testnet(fn, *args):
        with mock.patch.object(constants, "net", constants.BitcoinTestnet):
            return fn(*args)

    def test_depth_zero_master_cosigner_uses_the_same_suffix(self):
        for script_type in ("p2wsh", "p2wsh-p2sh"):
            keystore, tx, keys = self.make_wallet(script_type=script_type, master_cosigner=True)
            signature = tx.sign_txin(0, keys[0].eckey.get_secret_bytes())[:-1]
            plugin, client = TestOneKeySigning().plugin(signature)
            with self.subTest(script=script_type):
                plugin.sign_transaction(keystore, tx)
                nodes = client.sign_tx.call_args.args[0][0]["multisig"]["pubkeys"]
                masters = [node for node in nodes if node["depth"] == 0]
                self.assertEqual([dict(depth=0, fingerprint=0, child_num=0, address_n=[0, 0])],
                                 [{key: node[key] for key in ("depth", "fingerprint", "child_num", "address_n")}
                                  for node in masters])
                self.assertEqual([0x80000000 + 48], client.sign_tx.call_args.args[0][0]["address_n"][:1])

    def test_depth_zero_cosigner_with_a_parent_or_child_is_rejected(self):
        for fingerprint, child_number in ((b"\x00\x00\x00\x01", b"\x00\x00\x00\x00"),
                                          (b"\x00\x00\x00\x00", b"\x00\x00\x00\x01")):
            keystore, tx, _keys = self.make_wallet()
            provider = tx.inputs()[0].script_descriptor.get_simple_multisig().pubkeys[-1]
            provider.extkey = provider.extkey._replace(depth=0, fingerprint=fingerprint, child_number=child_number)
            plugin, _client = TestOneKeySigning().plugin(b"")
            with self.subTest(fingerprint=fingerprint, child=child_number), self.assertRaises(UserFacingException):
                plugin.sign_transaction(keystore, tx)
            plugin.get_client.assert_not_called()

    def test_closed_device_asks_to_reconnect_before_a_multisig_address(self):
        keystore, tx, _keys = self.make_wallet()
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin.get_client = mock.Mock(return_value=None)
        plugin.show_address_helper = lambda *_args: True
        wallet = mock.Mock(txin_type="p2wsh")
        wallet.get_address_index.return_value = (0, 1)
        wallet.get_script_descriptor_for_address.return_value = tx.outputs()[0].script_descriptor
        with self.assertRaisesRegex(UserFacingException, "Reconnect OneKey"):
            plugin.show_address(wallet, tx.outputs()[0].address, keystore)
        plugin.get_client.assert_called_once_with(keystore)

    def test_show_address_sends_the_redeem_script_and_compares_it(self):
        keystore, tx, _keys = self.make_wallet()
        desc = tx.inputs()[0].script_descriptor
        address = PartialTxOutput(scriptpubkey=desc.expand().output_script, value=0).address
        wallet = SimpleNamespace(
            txin_type="p2wsh", is_mine=lambda _address: True, get_address_index=lambda _address: (0, 0),
            get_script_descriptor_for_address=lambda _address: desc, get_keystore=lambda: keystore)
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        client = mock.Mock()
        plugin.get_client = mock.Mock(return_value=client)
        plugin.show_address(wallet, address, keystore)
        path, script_type, expected, payload = client.show_address.call_args.args
        self.assertEqual("p2wsh", script_type)
        self.assertEqual(address, expected)
        self.assertEqual([0x80000000 + 48, 0x80000000, 0x80000000, 0x80000000 + 2, 0, 0], path)
        self.assertEqual(2, payload["m"])
        self.assertEqual(3, len(payload["pubkeys"]))
        plugin.get_client.reset_mock()
        other_address = PartialTxOutput(scriptpubkey=tx.outputs()[0].scriptpubkey, value=0).address
        self.assertNotEqual(address, other_address)
        with self.assertRaises(UserFacingException):
            plugin.show_address(wallet, other_address, keystore)
        plugin.get_client.assert_not_called()

    def test_show_nested_address_sends_the_redeem_script_and_compares_it(self):
        keystore, tx, _keys = self.make_wallet(script_type="p2wsh-p2sh")
        desc = tx.inputs()[0].script_descriptor
        address = PartialTxOutput(scriptpubkey=desc.expand().output_script, value=0).address
        wallet = SimpleNamespace(
            txin_type="p2wsh-p2sh", is_mine=lambda _address: True, get_address_index=lambda _address: (0, 0),
            get_script_descriptor_for_address=lambda _address: desc, get_keystore=lambda: keystore)
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        client = mock.Mock()
        plugin.get_client = mock.Mock(return_value=client)
        plugin.show_address(wallet, address, keystore)
        path, script_type, expected, payload = client.show_address.call_args.args
        self.assertEqual("p2wsh-p2sh", script_type)
        self.assertEqual(address, expected)
        self.assertTrue(address.startswith("3"))
        self.assertEqual([0x80000000 + 48, 0x80000000, 0x80000000, 0x80000000 + 1, 0, 0], path)
        self.assertEqual(2, payload["m"])
        self.assertEqual(0x80000001, payload["pubkeys"][0]["child_num"])

    def test_zpub_from_the_device_is_stored_as_a_multisig_xpub(self):
        stored_xpub = ("Zpub74TUVGDvS4dpUWHB9vKGfah4NfMBw7nfNdbMycrp7zmA6HyQhEVEYDK83jrWPnQNbDuKRVXXJGLhCddTUyNgdbcQ7"
                       "Jm9eC3u6edjoRjZA5X")
        device_xpub = ("zpub6sZPN2VUs75T3w7oDFrHqWMFesJvim754Mwh4MbGkDvkU7QVvq6xT6TCF2u2qMBUMkqLYuXQR3xC5U1hBkDjV7Vj"
                       "GqekEnauCvMsDWEP8vC")
        stored_node = BIP32Node.from_xkey(stored_xpub)
        device_node = BIP32Node.from_xkey(device_xpub)
        self.assertEqual(4, stored_node.depth)
        self.assertEqual((0x80000002).to_bytes(4, "big"), stored_node.child_number)
        self.assertEqual(device_node.chaincode, stored_node.chaincode)
        self.assertEqual(device_node.eckey.get_public_key_bytes(compressed=True),
                         stored_node.eckey.get_public_key_bytes(compressed=True))
        client, helper, _handler = TestOneKeyClient().make_client()
        helper.call.side_effect = [BINDING, dict(xpub=device_xpub, rootFingerprint=None)]
        stored = client.get_xpub("m/48'/0'/0'/2'", "p2wsh")
        self.assertTrue(device_xpub.startswith("zpub"))
        self.assertEqual(stored_xpub, stored)
        self.assertTrue(stored.startswith("Zpub"))
        sent = helper.call.call_args.args[1]
        self.assertEqual("SPENDWITNESS", sent["scriptType"])
        self.assertEqual(4, len(sent["path"]))
        self.assertEqual(0x80000002, sent["path"][-1])
        with self.assertRaises(UserFacingException):
            client.get_xpub("m/1'/0'/0'/2'", "p2wsh")

    def test_ypub_from_the_device_is_stored_as_a_nested_multisig_xpub(self):
        stored_xpub = ("Ypub6jdDBbZ1HP6Lbi2gW5BCddjJDTye9oyDz4P4qCz14AvPfp2WxXjLyHzirjy73LgNwC2g8qrB83wEde6rWR868Q2Q"
                       "frWA65enEAgjtYgnrZA")
        device_xpub = ("ypub6Yj84MpZiRXyB8sJZQiDoZPVVfwNwTHdfnjPuwiTgQ5z3dTcC8M4tB8o431dUuTUhixhGFr4EqYjWUV6DBy8yuuj"
                       "qPPkggBnLSQsJaxHysa")
        stored_node = BIP32Node.from_xkey(stored_xpub)
        device_node = BIP32Node.from_xkey(device_xpub)
        self.assertEqual(4, stored_node.depth)
        self.assertEqual((0x80000001).to_bytes(4, "big"), stored_node.child_number)
        self.assertEqual(device_node.chaincode, stored_node.chaincode)
        self.assertEqual(device_node.eckey.get_public_key_bytes(compressed=True),
                         stored_node.eckey.get_public_key_bytes(compressed=True))
        client, helper, _handler = TestOneKeyClient().make_client()
        helper.call.side_effect = [BINDING, dict(xpub=device_xpub, rootFingerprint=None)]
        stored = client.get_xpub("m/48'/0'/0'/1'", "p2wsh-p2sh")
        self.assertTrue(device_xpub.startswith("ypub"))
        self.assertEqual(stored_xpub, stored)
        self.assertTrue(stored.startswith("Ypub"))
        sent = helper.call.call_args.args[1]
        self.assertEqual("SPENDP2SHWITNESS", sent["scriptType"])
        self.assertEqual(4, len(sent["path"]))
        self.assertEqual(0x80000001, sent["path"][-1])
        with self.assertRaises(UserFacingException):
            client.get_xpub("m/1'/0'/0'/1'", "p2wsh-p2sh")

    def test_finished_multisig_input_keeps_its_witness(self):
        keystore, tx, groups = self.make_wallet(input_count=2)
        finished = tx.inputs()[0]
        for key in groups[0][:2]:
            pubkey = key.eckey.get_public_key_bytes(compressed=True)
            finished.sigs_ecdsa[pubkey] = tx.sign_txin(0, key.eckey.get_secret_bytes())
        self.assertTrue(finished.is_complete())
        saved_paths = dict(finished.bip32_paths)
        saved_descriptor = finished.script_descriptor
        finished.finalize()
        original_script = finished.script_sig
        original_witness = finished.witness
        self.assertIsNotNone(original_script)
        self.assertTrue(original_witness)
        finished.bip32_paths = saved_paths
        finished.script_descriptor = saved_descriptor
        finished.is_mine = True
        our = groups[1][0]
        signature = tx.sign_txin(1, our.eckey.get_secret_bytes())[:-1]
        client = mock.Mock()
        client.sign_tx.return_value = [
            dict(index=0, signature="00"),
            dict(index=1, signature=signature.hex()),
        ]
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin.get_client = mock.Mock(return_value=client)
        plugin.sign_transaction(keystore, tx)
        self.assertEqual(original_script, tx.inputs()[0].script_sig)
        self.assertEqual(original_witness, tx.inputs()[0].witness)
        self.assertTrue(tx.inputs()[0].is_complete())
        our_pubkey = our.eckey.get_public_key_bytes(compressed=True)
        self.assertIn(our_pubkey, tx.inputs()[1].sigs_ecdsa)
        signed = client.sign_tx.call_args.args[0]
        self.assertEqual(2, len(signed))
        self.assertTrue(all("multisig" in item for item in signed))

    def test_multisig_wizard_takes_p2sh_and_segwit_but_not_singlesig_scripts(self):
        try:
            from PyQt6 import QtWidgets  # noqa: F401
        except ImportError as exc:
            self.skipTest(f"PyQt6 is unavailable: {exc}")
        from onekey.qt import WCOneKeyXPub
        step = WCOneKeyXPub.__new__(WCOneKeyXPub)
        step.wizard = NewWalletWizard.__new__(NewWalletWizard)
        client = mock.Mock()
        step.wizard_data = {"wallet_type": "multisig"}
        for xtype in ("p2wpkh", "p2wpkh-p2sh"):
            client.reset_mock()
            with self.subTest(xtype=xtype), self.assertRaisesRegex(UserFacingException, "p2sh, p2wsh and p2wsh-p2sh"):
                WCOneKeyXPub.get_xpub_from_client(step, client, "m/44'/0'/0'", xtype)
            client.begin_new_wallet_selection.assert_not_called()
            client.request_wallet_mode.assert_not_called()
        for xtype, path in (("p2wsh", "m/48'/0'/0'/2'"), ("p2wsh-p2sh", "m/48'/0'/0'/1'"), ("standard", "m/45'/0")):
            client.reset_mock()
            with mock.patch("electrum.gui.qt.wizard.wallet.WCHWXPub.get_xpub_from_client", return_value="xpub") as parent:
                self.assertEqual("xpub", WCOneKeyXPub.get_xpub_from_client(step, client, path, xtype))
            client.begin_new_wallet_selection.assert_called_once()
            client.request_wallet_mode.assert_called_once_with("standard")
            parent.assert_called_once_with(client, path, xtype)
        step.wizard_data = {"wallet_type": "standard"}
        client.reset_mock()
        with mock.patch("electrum.gui.qt.wizard.wallet.WCHWXPub.get_xpub_from_client", return_value="xpub") as parent:
            self.assertEqual("xpub", WCOneKeyXPub.get_xpub_from_client(step, client, "m/44'/0'/0'", "standard"))
        client.begin_new_wallet_selection.assert_called_once()
        client.request_wallet_mode.assert_called_once_with("standard")
        parent.assert_called_once()
        step.wizard_data = {"wallet_type": "standard", "onekey_wallet_mode": "select-hidden"}
        client.reset_mock()
        with mock.patch("electrum.gui.qt.wizard.wallet.WCHWXPub.get_xpub_from_client", return_value="xpub"):
            self.assertEqual("xpub", WCOneKeyXPub.get_xpub_from_client(step, client, "m/84'/0'/0'", "p2wpkh"))
        client.request_wallet_mode.assert_called_once_with("select-hidden")
        step.wizard_data = {"wallet_type": "imported"}
        client.reset_mock()
        with self.assertRaisesRegex(UserFacingException, "Only standard and multisig"):
            WCOneKeyXPub.get_xpub_from_client(step, client, "m/84'/0'/0'", "p2wpkh")
        client.begin_new_wallet_selection.assert_not_called()
        client.request_wallet_mode.assert_not_called()

    def test_singlesig_still_has_to_be_complete(self):
        signer = TestOneKeySigning()
        keystore, tx, node = signer.make_transaction()
        signature = tx.sign_txin(0, node.eckey.get_secret_bytes())[:-1]
        plugin, client = signer.plugin(signature)
        plugin.sign_transaction(keystore, tx)
        self.assertTrue(tx.is_complete())
        self.assertNotIn("multisig", client.sign_tx.call_args.args[0][0])

    def test_wizard_returns_to_the_next_cosigner(self):
        class Wizard:
            single = True

            def wallet_password_view(self, _data):
                return "wallet_password"

            def maybe_master_pubkey(self, *_args):
                return None

            def is_single_password(self):
                return self.single

            def last_cosigner(self, data):
                return data["last"]

            def navmap_merge(self, mapping):
                self.nav = mapping

        wizard = Wizard()
        OneKeyPlugin.extend_wizard(OneKeyPlugin.__new__(OneKeyPlugin), wizard)
        step = wizard.nav["onekey_xpub"]
        self.assertEqual("wallet_password", step["next"]({"last": True}))
        self.assertEqual("multisig_cosigner_keystore", step["next"]({"last": False}))
        self.assertTrue(step["last"]({"last": True}))
        wizard.single = False
        self.assertFalse(step["last"]({"last": True}))


class TestOneKeyWizardRepairs(unittest.TestCase):
    def setUp(self):
        from onekey import qt
        self.qt = qt

    def wizard_component(self, plugin, manager, data=None):
        wizard = SimpleNamespace(plugins=SimpleNamespace(device_manager=manager, get_plugin=lambda _: plugin))
        wizard.current_cosigner = NewWalletWizard.current_cosigner.__get__(wizard)
        return SimpleNamespace(wizard=wizard, wizard_data=data or {})

    def recovery_devices(self):
        from electrum.plugin import DeviceMgr

        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin._live_clients = set()
        helper = plugin.helper = Helper()
        self.addCleanup(helper.shutdown)
        manager = SimpleNamespace(clients={}, lock=threading.RLock(), logger=mock.Mock())
        manager._client_by_id = lambda serial: next((c for c, id_ in manager.clients.items() if id_ == serial), None)
        manager.client_by_id = mock.Mock(side_effect=lambda serial, **_: manager._client_by_id(serial))
        manager.create_client = DeviceMgr.create_client.__get__(manager)
        plugin.device_manager = lambda: manager
        peers = {path: Scripted() for path in ("healthy", "stuck", "selected")}
        for path, peer in peers.items():
            peer.serial = path
        links = {path: pipe_link(peer) for path, peer in peers.items()}

        def open_link(path):
            if links[path]._closed:
                links[path] = pipe_link(peers[path])
            return links[path]

        self.enterContext(mock.patch("onekey.ipc.open_path", side_effect=open_link))
        paths = self.enterContext(mock.patch("onekey.ipc.list_paths", return_value=list(peers)))
        run_in_hwd_thread(lambda: helper.call("hello", {}))
        healthy = run_in_hwd_thread(lambda: plugin.create_client(
            SimpleNamespace(path="healthy", id_="healthy"), mock.Mock()))
        manager.clients[healthy] = healthy.serial
        run_in_hwd_thread(lambda: helper.call("open", dict(connectId="healthy", mode="standard")))
        run_in_hwd_thread(lambda: helper.call("state", dict(connectId="stuck")))
        component = self.wizard_component(plugin, manager)
        info = SimpleNamespace(device=SimpleNamespace(id_="selected"), plugin_name="onekey")
        return plugin, manager, component, info, healthy, links, paths

    def test_recovery_isolates_a_stuck_retained_peer_in_either_scan_order(self):
        for selected_first in (False, True):
            with self.subTest(selected_first=selected_first):
                plugin, manager, component, info, healthy, links, paths = self.recovery_devices()
                helper = plugin.helper
                generation = helper.generation
                resume = helper._wallets["healthy"]
                paths.return_value = (["healthy", "selected", "stuck"] if selected_first
                                      else ["healthy", "stuck", "selected"])

                # The real Link receive loop must obey the candidate's deadline.
                def stalled_read(*_args):
                    time.sleep(.002)
                    return b""

                with mock.patch.object(links["stuck"], "_read", side_effect=stalled_read) as stalled, \
                        mock.patch.object(helper, "close", wraps=helper.close) as close, \
                        mock.patch.object(helper, "shutdown", wraps=helper.shutdown) as shutdown:
                    started = time.monotonic()
                    client = self.qt._ensure_wizard_client(component, info, mock.Mock())
                    self.assertLess(time.monotonic() - started, 2)
                    self.assertIsNotNone(client)
                    self.assertEqual("selected", client.serial)
                    self.assertEqual("selected", manager.clients[client])
                    close.assert_not_called()
                    shutdown.assert_not_called()
                    if selected_first:
                        stalled.assert_not_called()
                self.assertEqual(generation, helper.generation)
                self.assertTrue(healthy.attached())
                self.assertIs(resume, helper._wallets["healthy"])
                self.assertFalse(links["healthy"]._closed)

    def test_recovery_global_deadline_keeps_the_helper_and_other_wallets(self):
        plugin, manager, component, info, healthy, links, _ = self.recovery_devices()
        helper = plugin.helper
        generation = helper.generation
        resume = helper._wallets["healthy"]
        clock = [time.monotonic()]

        def expired(*_args, **_kwargs):
            clock[0] += 31
            raise LinkError("TIMEOUT")

        with mock.patch("onekey.ipc.time.monotonic", side_effect=lambda: clock[0]), \
                mock.patch.object(links["stuck"], "exchange", side_effect=expired), \
                mock.patch.object(helper, "close", wraps=helper.close) as close, \
                mock.patch.object(helper, "shutdown", wraps=helper.shutdown) as shutdown:
            self.assertIsNone(self.qt._ensure_wizard_client(component, info, mock.Mock()))
            close.assert_not_called()
            shutdown.assert_not_called()
        self.assertEqual(generation, helper.generation)
        self.assertIs(resume, helper._wallets["healthy"])
        self.assertEqual({healthy: "healthy"}, manager.clients)
        self.assertFalse(links["healthy"]._closed)

    def test_recovery_decoded_match_survives_deadline_but_honors_cancel(self):
        from onekey.device import Session

        for cancel in (False, True):
            with self.subTest(cancel=cancel):
                plugin, manager, _, _, healthy, links, paths = self.recovery_devices()
                helper = plugin.helper
                run_in_hwd_thread(lambda: helper.call("open", dict(connectId="selected", mode="standard")))
                generation, wallets = helper.generation, dict(helper._wallets)
                paths.return_value = ["selected"]
                token = threading.Event()
                clock = [time.monotonic()]
                original = Session.state

                def decoded(session):
                    state = original(session)
                    clock[0] += 31
                    if cancel:
                        token.set()
                    return state

                with mock.patch("onekey.ipc.time.monotonic", side_effect=lambda: clock[0]), \
                        mock.patch.object(Session, "state", decoded):
                    def search():
                        return helper.call("search", {"serialNo": "selected"}, timeout=30, cancelled=token)

                    if cancel:
                        with self.assertRaisesRegex(HelperError, "CANCELLED"):
                            run_in_hwd_thread(search)
                    else:
                        found = run_in_hwd_thread(search)
                        self.assertEqual(["selected"], [device["connectId"] for device in found])
                        self.assertFalse(links["selected"]._closed)
                self.assertEqual(generation, helper.generation)
                self.assertEqual(wallets, helper._wallets)
                self.assertEqual({healthy: "healthy"}, manager.clients)
                self.assertFalse(links["healthy"]._closed)

    def test_dialog_cancel_interrupts_recovery_creation_with_page_token(self):
        from electrum.plugin import _hwd_comms_executor

        plugin, manager, component, info, healthy, links, paths = self.recovery_devices()
        helper = plugin.helper
        generation = helper.generation
        resume = helper._wallets["healthy"]
        paths.return_value = ["selected"]
        token, entered = threading.Event(), threading.Event()
        handler = mock.Mock()
        original = helper._dispatch

        def dispatch(op, params, deadline, cancelled, on_ui):
            if op == "state":
                on_ui("button")
                active = helper._acquire("selected")
                active._read = lambda *_: (entered.set(), time.sleep(.002), b"")[-1]
            return original(op, params, deadline, cancelled, on_ui)

        with mock.patch.object(helper, "_dispatch", side_effect=dispatch), \
                mock.patch.object(helper, "close", wraps=helper.close) as close, \
                mock.patch.object(helper, "shutdown", wraps=helper.shutdown) as shutdown:
            future = _hwd_comms_executor.submit(
                self.qt._ensure_wizard_client, component, info, handler, cancelled=token)
            try:
                self.assertTrue(entered.wait(1))
                handler.show_message.call_args.kwargs["on_cancel"]()
                self.assertIsNone(future.result(timeout=1))
                self.assertFalse(token.is_set())
            finally:
                token.set()
                future.result(timeout=1)
            _hwd_comms_executor.submit(lambda: None).result(timeout=1)
            close.assert_not_called()
            shutdown.assert_not_called()
        self.assertTrue(links["selected"]._closed)
        self.assertEqual(generation, helper.generation)
        self.assertIs(resume, helper._wallets["healthy"])
        self.assertEqual({healthy: "healthy"}, manager.clients)
        self.assertTrue(healthy.attached())
        self.assertFalse(links["healthy"]._closed)
        self.assertIsNone(getattr(plugin, "_creation_cancelled", None))

    def test_dialog_cancel_during_init_preserves_wallets_without_retained_clients(self):
        from electrum.plugin import _hwd_comms_executor

        for state_complete in (False, True):
            with self.subTest(state_complete=state_complete):
                plugin = OneKeyPlugin.__new__(OneKeyPlugin)
                plugin._live_clients = set()
                helper = plugin.helper = Helper()
                self.addCleanup(helper.shutdown)
                peers = {path: Scripted() for path in ("selected", "unrelated")}
                links = {path: pipe_link(peer) for path, peer in peers.items()}
                token, entered = threading.Event(), threading.Event()
                handler = mock.Mock()
                clients = []
                original = helper._dispatch

                def dispatch(op, params, deadline, cancelled, on_ui):
                    if op == "state":
                        clients.append(on_ui.__self__)
                        on_ui("button")
                        if not state_complete:
                            active = helper._acquire("selected")
                            active._read = lambda *_: (entered.set(), time.sleep(.002), b"")[-1]
                    result = original(op, params, deadline, cancelled, on_ui)
                    if op == "state" and state_complete:
                        handler.show_message.call_args.kwargs["on_cancel"]()
                        entered.set()
                    return result

                with mock.patch("onekey.ipc.open_path", side_effect=links.__getitem__):
                    run_in_hwd_thread(lambda: helper.call("hello", {}))
                    for path in peers:
                        run_in_hwd_thread(lambda: helper.call("open", dict(connectId=path, mode="standard")))
                    generation, wallets = helper.generation, dict(helper._wallets)
                    self.assertEqual(set(peers), set(wallets))
                    self.assertFalse(plugin._live_clients)
                    with mock.patch.object(helper, "_dispatch", side_effect=dispatch), \
                            mock.patch.object(helper, "release", wraps=helper.release) as release, \
                            mock.patch.object(helper, "shutdown", wraps=helper.shutdown) as shutdown, \
                            mock.patch.object(plugin, "release_helper", wraps=plugin.release_helper) as release_helper, \
                            mock.patch.object(plugin, "retain_client", wraps=plugin.retain_client) as retain:
                        future = _hwd_comms_executor.submit(
                            OneKeyClient, "selected", handler, plugin, cancelled=token)
                        try:
                            self.assertTrue(entered.wait(1))
                            handler.show_message.call_args.kwargs["on_cancel"]()
                            with self.assertRaises(UserCancelled):
                                future.result(timeout=1)
                            self.assertFalse(token.is_set())
                        finally:
                            token.set()
                            _hwd_comms_executor.submit(lambda: None).result(timeout=1)
                        retain.assert_not_called()
                        release_helper.assert_not_called()
                        shutdown.assert_not_called()
                        release.assert_called_once_with("selected", keep_wallet=True)
                    self.assertTrue(clients[0].closed)
                    self.assertTrue(clients[0]._released)
                    self.assertFalse(plugin._live_clients)
                    self.assertEqual(generation, helper.generation)
                    self.assertEqual(wallets, helper._wallets)
                    self.assertTrue(links["selected"]._closed)
                    self.assertFalse(links["unrelated"]._closed)

    def test_page_cancel_interrupts_recovery_discovery_and_creation(self):
        from electrum.plugin import _hwd_comms_executor

        for phase in ("discovery", "creation"):
            with self.subTest(phase=phase):
                plugin, manager, component, info, healthy, links, paths = self.recovery_devices()
                helper = plugin.helper
                active_path = "stuck" if phase == "discovery" else "selected"
                run_in_hwd_thread(lambda: helper.call("open", dict(connectId=active_path, mode="standard")))
                if phase == "creation":
                    # Model a resume entry left by an earlier interrupted status read.
                    run_in_hwd_thread(lambda: helper._drop(active_path))
                generation = helper.generation
                wallets = dict(helper._wallets)
                token, entered = threading.Event(), threading.Event()
                paths.return_value = ["stuck"] if phase == "discovery" else ["selected"]
                original = helper._dispatch

                def dispatch(op, params, deadline, cancelled, on_ui):
                    if op == ("search" if phase == "discovery" else "state"):
                        self.assertFalse(cancelled.is_set())
                        # Block the actual USB read, not a mock discovery/create result.
                        active = helper._acquire(active_path)
                        active._read = lambda *_: (entered.set(), time.sleep(.002), b"")[-1]
                    return original(op, params, deadline, cancelled, on_ui)

                component.wizard_data = dict(hardware_device=("onekey", info))
                with mock.patch.object(helper, "_dispatch", side_effect=dispatch), \
                        mock.patch.object(helper, "close", wraps=helper.close) as close, \
                        mock.patch.object(helper, "shutdown", wraps=helper.shutdown) as shutdown:
                    future = _hwd_comms_executor.submit(
                        self.qt.WCOneKeyScript._wallet_options_known_off, component, token, mock.Mock())
                    try:
                        self.assertTrue(entered.wait(1))
                    finally:
                        token.set()
                    self.assertEqual((None, None), future.result(timeout=1))
                    _hwd_comms_executor.submit(lambda: None).result(timeout=1)
                    close.assert_not_called()
                    shutdown.assert_not_called()
                self.assertTrue(links[active_path]._closed)
                self.assertEqual(generation, helper.generation)
                self.assertEqual(wallets, helper._wallets)
                self.assertIsNone(getattr(plugin, "_creation_cancelled", None))
                self.assertEqual({healthy: "healthy"}, manager.clients)
                self.assertTrue(healthy.attached())
                self.assertFalse(links["healthy"]._closed)

    def test_legacy_multisig_wizard_uses_a_signable_network_default(self):
        from PyQt6.QtWidgets import QApplication

        app = QApplication.instance() or QApplication([])  # noqa: F841 (keep alive)
        base_ready = self.qt.WCScriptAndDerivation.on_ready
        replacement = "m/48'/1'/0'/0'"
        custom = "m/48'/1'/4'/0'"
        cases = ((constants.BitcoinMainnet, False, None, "m/45h/0"),
                 (constants.BitcoinTestnet, False, None, replacement),
                 (constants.BitcoinTestnet, True, None, replacement),
                 (constants.BitcoinTestnet, True, "m/45h/0", replacement),
                 (constants.BitcoinTestnet, True, custom, custom))
        for network, later_cosigner, prefill, expected in cases:
            with self.subTest(network=network, later=later_cosigner, prefill=prefill):
                data = dict(wallet_type="multisig")
                if later_cosigner:
                    data.update(multisig_current_cosigner=2, multisig_cosigner_data={"2": {}})
                component = self.wizard_component(mock.Mock(), mock.Mock(), data)
                component.wizard.keystore_from_data = mock.Mock()
                component.wizard.check_multisig_constraints = lambda _data: (True, "")
                step = self.qt.WCOneKeyScript(None, component.wizard)
                step.wizard_data = data

                def ready(page):
                    base_ready(page)
                    if prefill is not None:
                        page.derivation_path_edit.setText(prefill)

                try:
                    with mock.patch.object(constants, "net", network), \
                            mock.patch("electrum.gui.qt.wizard.wallet.xpub_type", return_value="standard"), \
                            mock.patch.object(self.qt.WCScriptAndDerivation, "on_ready", ready), \
                            mock.patch.object(step, "_start_passphrase_probe"):
                        step.on_ready()
                        legacy = next(c for c in step.choice_w.choices if c.key == "standard")
                        self.assertEqual(replacement if network is constants.BitcoinTestnet else "m/45h/0",
                                         legacy.extra_data)
                        if not later_cosigner:
                            step.choice_w.select("standard")
                        self.assertEqual(expected, step.derivation_path_edit.text())
                        step.apply()
                        submitted = component.wizard.current_cosigner(data)["derivation_path"]
                        self.assertEqual(expected, submitted)
                        self.assertEqual(convert_bip32_strpath_to_intpath(expected), account_path(submitted, "standard"))
                        if network is constants.BitcoinTestnet:
                            with self.assertRaises(UserFacingException) as error:
                                account_path("m/45'/0", "standard")
                            self.assertNotIn("BIP45", str(error.exception))
                finally:
                    step.close()

    def test_wallet_warning_refresh_preserves_choice_and_unblocks_next(self):
        from PyQt6.QtWidgets import QApplication
        from electrum.plugin import _hwd_comms_executor

        app = QApplication.instance() or QApplication([])
        for mode, passphrase, attach, warning in (("select-hidden", False, True, "Passphrase is disabled"),
                                                 ("attach", False, True, "Passphrase is disabled"),
                                                 ("attach", True, False, "No Attach PIN")):
            with self.subTest(mode=mode, warning=warning):
                client = mock.Mock(passphrase_enabled=passphrase, attach_pin_enabled=attach)
                client.has_usable_connection_with_device.return_value = True
                manager = mock.Mock()
                manager.client_by_id.return_value = client
                info = SimpleNamespace(device=SimpleNamespace(id_=STATE["serialNo"]))
                component = self.wizard_component(mock.Mock(), manager, dict(
                    wallet_type="standard", keystore_type="hardware", hardware_device=("onekey", info),
                    onekey_wallet_mode="standard"))
                component.wizard.check_multisig_constraints = lambda _data: (True, "")
                step = self.qt.WCOneKeyScript(None, component.wizard)
                step.wizard_data = component.wizard_data
                try:
                    step.on_ready()
                    choice = step.hidden_cb if mode == "select-hidden" else step.attach_cb
                    choice.setChecked(True)
                    _hwd_comms_executor.submit(lambda: None).result(timeout=2)
                    app.processEvents()
                    self.assertTrue(choice.isChecked())
                    self.assertFalse(step.valid)
                    self.assertIn(warning, step.warn_label.label.text())
                    self.assertFalse(step.refresh_button.isHidden())
                    self.assertTrue(step.refresh_button.isEnabled())
                    client.passphrase_enabled = client.attach_pin_enabled = True
                    step.refresh_button.click()
                    self.assertTrue(choice.isChecked())
                    self.assertFalse(step.valid)
                    self.assertFalse(step.refresh_button.isEnabled())
                    _hwd_comms_executor.submit(lambda: None).result(timeout=2)
                    app.processEvents()
                    self.assertEqual(2, client.has_usable_connection_with_device.call_count)
                    self.assertTrue(choice.isChecked())
                    self.assertFalse(choice.isHidden())
                    self.assertEqual(mode, step.wizard_data["onekey_wallet_mode"])
                    self.assertTrue(step.valid)
                    self.assertEqual("", step.warn_label.label.text())
                    self.assertTrue(step.refresh_button.isHidden())
                finally:
                    step.close()

    def test_wallet_warning_refresh_unavailable_preserves_block_until_enabled(self):
        from PyQt6.QtWidgets import QApplication
        from electrum.plugin import _hwd_comms_executor

        app = QApplication.instance() or QApplication([])
        for mode, passphrase, attach, warning in (("select-hidden", False, True, "Passphrase is disabled"),
                                                 ("attach", False, True, "Passphrase is disabled"),
                                                 ("attach", True, False, "No Attach PIN")):
            for unavailable in ("connection", "exception", "lookup", "missing-client", "unknown-status"):
                with self.subTest(mode=mode, warning=warning, unavailable=unavailable):
                    client = mock.Mock(passphrase_enabled=passphrase, attach_pin_enabled=attach)
                    client.has_usable_connection_with_device.return_value = True
                    manager = mock.Mock()
                    manager.client_by_id.return_value = client
                    info = SimpleNamespace(device=SimpleNamespace(id_=STATE["serialNo"]))
                    component = self.wizard_component(mock.Mock(), manager, dict(
                        wallet_type="standard", keystore_type="hardware", hardware_device=("onekey", info),
                        onekey_wallet_mode="standard"))
                    component.wizard.check_multisig_constraints = lambda _data: (True, "")
                    step = self.qt.WCOneKeyScript(None, component.wizard)
                    step.wizard_data = component.wizard_data
                    try:
                        step.on_ready()
                        choice = step.hidden_cb if mode == "select-hidden" else step.attach_cb
                        choice.setChecked(True)
                        _hwd_comms_executor.submit(lambda: None).result(timeout=2)
                        app.processEvents()
                        self.assertFalse(step.valid)
                        self.assertIn(warning, step.warn_label.label.text())

                        if unavailable == "connection":
                            client.has_usable_connection_with_device.return_value = False
                        elif unavailable == "exception":
                            client.has_usable_connection_with_device.side_effect = RuntimeError("unavailable")
                        elif unavailable == "lookup":
                            manager.client_by_id.side_effect = RuntimeError("unavailable")
                        elif unavailable == "missing-client":
                            manager.client_by_id.return_value = None
                        else:
                            client.passphrase_enabled = client.attach_pin_enabled = None
                        step.refresh_button.click()
                        self.assertFalse(step.valid)
                        self.assertFalse(step.refresh_button.isEnabled())
                        _hwd_comms_executor.submit(lambda: None).result(timeout=2)
                        app.processEvents()
                        self.assertTrue(choice.isChecked())
                        self.assertFalse(choice.isHidden())
                        self.assertEqual(mode, step.wizard_data["onekey_wallet_mode"])
                        self.assertFalse(step.valid)
                        self.assertIn(warning, step.warn_label.label.text())
                        self.assertFalse(step.refresh_button.isHidden())
                        self.assertTrue(step.refresh_button.isEnabled())

                        manager.client_by_id.side_effect = None
                        manager.client_by_id.return_value = client
                        client.has_usable_connection_with_device.side_effect = None
                        client.has_usable_connection_with_device.return_value = True
                        client.passphrase_enabled = client.attach_pin_enabled = True
                        step.refresh_button.click()
                        _hwd_comms_executor.submit(lambda: None).result(timeout=2)
                        app.processEvents()
                        self.assertTrue(choice.isChecked())
                        self.assertEqual(mode, step.wizard_data["onekey_wallet_mode"])
                        self.assertTrue(step.valid)
                        self.assertEqual("", step.warn_label.label.text())
                        self.assertTrue(step.refresh_button.isHidden())
                    finally:
                        step.close()

    def test_refresh_repairs_a_client_closed_by_unplug(self):
        from PyQt6.QtWidgets import QApplication
        from electrum.plugin import _hwd_comms_executor

        app = QApplication.instance() or QApplication([])
        for mode, warning in (("select-hidden", "Passphrase is disabled"), ("attach", "No Attach PIN")):
            with self.subTest(mode=mode):
                old = mock.Mock(passphrase_enabled=mode != "select-hidden", attach_pin_enabled=False)
                old.attached.return_value = True
                old.has_usable_connection_with_device.return_value = True
                manager = mock.Mock()
                manager.client_by_id.side_effect = lambda *_a, **_k: old
                plugin = mock.Mock()
                gui = threading.current_thread()
                handler_threads = []
                plugin.create_handler.side_effect = lambda _w: handler_threads.append(threading.current_thread()) \
                    or mock.Mock(name="handler")
                plugin.enumerate_for_recovery.return_value = []
                info = SimpleNamespace(device=SimpleNamespace(id_=STATE["serialNo"]), plugin_name="onekey")
                component = self.wizard_component(plugin, manager, dict(
                    wallet_type="standard", keystore_type="hardware", hardware_device=("onekey", info),
                    onekey_wallet_mode="standard"))
                component.wizard.check_multisig_constraints = lambda _data: (True, "")
                step = self.qt.WCOneKeyScript(None, component.wizard)
                step.wizard_data = component.wizard_data

                def settle():
                    _hwd_comms_executor.submit(lambda: None).result(timeout=2)
                    app.processEvents()

                try:
                    step.on_ready()
                    choice = step.hidden_cb if mode == "select-hidden" else step.attach_cb
                    choice.setChecked(True)
                    settle()
                    self.assertFalse(step.valid)

                    def unplugged(**_kwargs):
                        # The failed read closes the cached client, as OneKeyClient does.
                        old.attached.return_value = False
                        return False

                    old.has_usable_connection_with_device.side_effect = unplugged
                    step.refresh_button.click()
                    settle()
                    # Still unplugged: Refresh finds no device and keeps the block.
                    step.refresh_button.click()
                    settle()
                    plugin.enumerate_for_recovery.assert_called()
                    manager.create_client.assert_not_called()
                    self.assertFalse(step.valid)
                    self.assertIn(warning, step.warn_label.label.text())

                    # Replugged with the setting enabled: Refresh re-pairs the same serial.
                    new = mock.Mock(passphrase_enabled=True, attach_pin_enabled=True)
                    new.has_usable_connection_with_device.return_value = True
                    device = SimpleNamespace(id_=STATE["serialNo"])
                    plugin.enumerate_for_recovery.return_value = [SimpleNamespace(id_="other"), device]
                    manager.create_client.return_value = new
                    step.refresh_button.click()
                    settle()
                    manager.create_client.assert_called_once()
                    self.assertIs(device, manager.create_client.call_args.args[0])
                    new.has_usable_connection_with_device.assert_called()
                    self.assertEqual([gui], handler_threads, "the Qt handler is built once, on the GUI thread")
                    self.assertTrue(choice.isChecked())
                    self.assertEqual(mode, step.wizard_data["onekey_wallet_mode"])
                    self.assertTrue(step.valid)
                    self.assertTrue(step.refresh_button.isHidden())
                finally:
                    step.close()

    def test_cache_miss_recreates_on_worker_and_registers_before_queued_sweep(self):
        from electrum.plugin import DeviceMgr, _hwd_comms_executor
        plugin = OneKeyPlugin.__new__(OneKeyPlugin)
        plugin._live_clients = set()
        plugin.helper = mock.Mock(generation="generation-one")
        plugin.helper.call.return_value = dict(STATE)
        manager = SimpleNamespace(clients={}, lock=threading.RLock(), logger=mock.Mock())
        manager._client_by_id = lambda serial: next((c for c, id_ in manager.clients.items() if id_ == serial), None)
        manager.client_by_id = mock.Mock(side_effect=lambda serial, **_: manager._client_by_id(serial))
        manager.create_client = DeviceMgr.create_client.__get__(manager)
        plugin.device_manager = lambda: manager
        selected = SimpleNamespace(path="new-usb-port", id_=STATE["serialNo"])
        info = SimpleNamespace(device=selected, plugin_name="onekey")
        plugin.enumerate_for_recovery = mock.Mock(return_value=[selected])
        plugin.create_handler = mock.Mock(return_value=mock.Mock())
        original_create = OneKeyPlugin.create_client.__get__(plugin)
        queued = []

        def create(device, handler):
            self.assertTrue(threading.current_thread().name.startswith("hwd_comms_thread"))
            client = original_create(device, handler)
            # Runs as soon as creation's hardware operation returns to its caller.
            queued.append(_hwd_comms_executor.submit(plugin._sweep_unplugged))
            return client

        plugin.create_client = create
        component = self.wizard_component(plugin, manager)
        client = self.qt._ensure_wizard_client(component, info)
        for task in queued:
            task.result(timeout=2)
        self.assertIsNotNone(client)
        self.assertFalse(client.closed)
        self.assertEqual({client: selected.id_}, manager.clients)
        self.assertEqual("new-usb-port", client.connect_id)
        self.assertTrue(all(call.kwargs == {"scan_now": False} for call in manager.client_by_id.call_args_list))
        plugin.enumerate_for_recovery.assert_called_once_with(selected.id_, cancelled=None)
        plugin.helper.release.assert_not_called()
        self.assertIs(client, self.qt._ensure_wizard_client(component, info))
        plugin.create_handler.assert_called_once_with(component.wizard)

    def test_reopened_device_must_match_selected_serial_before_registration(self):
        from electrum.plugin import DeviceMgr
        for serial in (STATE["serialNo"], "different-synthetic-serial"):
            with self.subTest(serial=serial):
                plugin = OneKeyPlugin.__new__(OneKeyPlugin)
                plugin._live_clients = set()
                plugin.helper = mock.Mock(generation="generation-one")
                plugin.helper.call.return_value = dict(STATE, serialNo=serial)
                manager = SimpleNamespace(clients={}, lock=threading.RLock(), logger=mock.Mock())
                manager._client_by_id = lambda _: None
                plugin.device_manager = lambda: manager
                device = SimpleNamespace(path="reused-usb-port", id_=STATE["serialNo"])
                if serial == device.id_:
                    client = DeviceMgr.create_client(manager, device, mock.Mock(), plugin)
                    self.assertEqual({client: device.id_}, manager.clients)
                else:
                    with self.assertRaisesRegex(UserFacingException, "identity changed"):
                        DeviceMgr.create_client(manager, device, mock.Mock(), plugin)
                    self.assertEqual({}, manager.clients)
                    self.assertEqual(set(), plugin._live_clients)
                    plugin.helper.release.assert_called_once_with(device.path)

    def test_current_cosigner_features_and_mode_are_used_on_both_pages(self):
        first = SimpleNamespace(device=SimpleNamespace(id_="first"))
        second = SimpleNamespace(device=SimpleNamespace(id_="second"))
        clients = {"first": mock.Mock(passphrase_enabled=False), "second": mock.Mock(passphrase_enabled=True)}
        manager = mock.Mock()
        manager.client_by_id.side_effect = lambda serial, **_: clients[serial]
        data = dict(wallet_type="multisig", hardware_device=("onekey", first),
                    onekey_wallet_mode="standard", multisig_current_cosigner=2,
                    multisig_cosigner_data={"2": dict(hardware_device=("onekey", second),
                                                     onekey_wallet_mode="select-hidden")})
        step = self.wizard_component(mock.Mock(), manager, data)
        self.assertFalse(self.qt.WCOneKeyScript._passphrase_known_disabled(step))
        manager.client_by_id.assert_called_once_with("second", scan_now=False)
        clients["second"].has_usable_connection_with_device.assert_called_once()
        xpub_step = self.qt.WCOneKeyXPub.__new__(self.qt.WCOneKeyXPub)
        xpub_step.wizard, xpub_step.wizard_data = step.wizard, data
        with mock.patch.object(self.qt, "_ensure_wizard_client") as ensure, \
                mock.patch.object(self.qt.WCHWXPub, "on_ready"):
            xpub_step.on_ready()
        ensure.assert_called_once_with(xpub_step, second)
        with mock.patch.object(self.qt.WCHWXPub, "get_xpub_from_client", return_value="xpub"):
            xpub_step.get_xpub_from_client(clients["second"], "m/48'/0'/0'/2'", "p2wsh")
        clients["second"].request_wallet_mode.assert_called_once_with("select-hidden")
        script_step = self.qt.WCOneKeyScript.__new__(self.qt.WCOneKeyScript)
        script_step.wizard, script_step.wizard_data = step.wizard, data
        script_step.hidden_cb = mock.Mock()
        script_step.hidden_cb.isVisible.return_value = True
        script_step.hidden_cb.isChecked.return_value = False
        with mock.patch.object(self.qt.WCScriptAndDerivation, "apply"):
            script_step.apply()
        self.assertEqual("standard", data["multisig_cosigner_data"]["2"]["onekey_wallet_mode"])
        self.assertEqual("standard", data["onekey_wallet_mode"])

    def test_script_page_refreshes_disabled_features_and_preserves_unknown_choice(self):
        client = mock.Mock(passphrase_enabled=False)
        manager = mock.Mock()
        manager.client_by_id.return_value = client
        info = SimpleNamespace(device=SimpleNamespace(id_=STATE["serialNo"]))
        step = self.wizard_component(mock.Mock(), manager, dict(hardware_device=("onekey", info)))
        for current in (True, False, None):
            def refresh():
                self.assertTrue(threading.current_thread().name.startswith("hwd_comms_thread"))
                client.passphrase_enabled = current
                return True
            client.has_usable_connection_with_device.side_effect = refresh
            self.assertEqual(current is False, self.qt.WCOneKeyScript._passphrase_known_disabled(step))
        client.has_usable_connection_with_device.return_value = False
        client.has_usable_connection_with_device.side_effect = None
        client.passphrase_enabled = False
        self.assertFalse(self.qt.WCOneKeyScript._passphrase_known_disabled(step))

    def test_script_page_returns_while_probe_waits_and_updates_via_qt_signal(self):
        from PyQt6.QtWidgets import QApplication
        from electrum.plugin import _hwd_comms_executor

        app = QApplication.instance() or QApplication([])
        for enabled, usable in ((False, True), (True, True), (None, True), (False, False)):
            with self.subTest(enabled=enabled, usable=usable):
                entered, release, finished = threading.Event(), threading.Event(), threading.Event()
                client = mock.Mock(passphrase_enabled=False)

                def refresh(**_kwargs):
                    self.assertTrue(threading.current_thread().name.startswith("hwd_comms_thread"))
                    entered.set()
                    try:
                        release.wait(1)
                        client.passphrase_enabled = enabled
                        return usable
                    finally:
                        finished.set()

                client.has_usable_connection_with_device.side_effect = refresh
                manager = mock.Mock()
                manager.client_by_id.return_value = client
                info = SimpleNamespace(device=SimpleNamespace(id_=STATE["serialNo"]))
                component = self.wizard_component(mock.Mock(), manager, dict(
                    hardware_device=("onekey", info), onekey_wallet_mode="select-hidden"))
                step = self.qt.WCOneKeyScript(None, component.wizard)
                step.wizard_data = component.wizard_data
                applied_on = []
                step.apply = mock.Mock(side_effect=lambda: applied_on.append(threading.current_thread()))
                step.validate = mock.Mock()
                try:
                    with mock.patch.object(self.qt.WCScriptAndDerivation, "on_ready"):
                        step.on_ready()
                    self.assertTrue(entered.wait(1))
                    self.assertFalse(finished.is_set(), "on_ready waited for hardware I/O")
                    self.assertFalse(step.hidden_cb.isHidden())
                    self.assertTrue(step.hidden_cb.isChecked())
                    release.set()
                    _hwd_comms_executor.submit(lambda: None).result(timeout=2)
                    # The hardware task must queue the UI update, not touch the widget itself.
                    self.assertFalse(step.hidden_cb.isHidden())
                    app.processEvents()
                    disabled = enabled is False and usable
                    # A ticked hidden choice is never cleared behind the user's back.
                    self.assertFalse(step.hidden_cb.isHidden())
                    self.assertTrue(step.hidden_cb.isChecked())
                    self.assertEqual(disabled, step._passphrase_disabled)
                    self.assertEqual(disabled, step.attach_cb.isHidden())
                    self.assertEqual([threading.main_thread()] * 2, applied_on)
                finally:
                    release.set()
                    _hwd_comms_executor.submit(lambda: None).result(timeout=2)
                    app.processEvents()
                    step.close()

    def test_hidden_choice_waits_for_probe_and_leaving_cancels_it(self):
        from PyQt6.QtGui import QHideEvent, QShowEvent
        from PyQt6.QtWidgets import QApplication
        from electrum.plugin import _hwd_comms_executor

        app = QApplication.instance() or QApplication([])
        entered, tokens = threading.Event(), []
        client = mock.Mock(passphrase_enabled=False)

        def refresh(*, cancelled):
            tokens.append(cancelled)
            entered.set()
            cancelled.wait(2)
            return False

        client.has_usable_connection_with_device.side_effect = refresh
        manager = mock.Mock()
        manager.client_by_id.return_value = client
        info = SimpleNamespace(device=SimpleNamespace(id_=STATE["serialNo"]))
        component = self.wizard_component(mock.Mock(), manager, dict(
            hardware_device=("onekey", info), onekey_wallet_mode="select-hidden"))
        step = self.qt.WCOneKeyScript(None, component.wizard)
        step.wizard_data = component.wizard_data
        step.apply = mock.Mock()
        valid_after_base = []

        def base_validate(page):
            page.valid = True
            valid_after_base.append(True)

        try:
            with mock.patch.object(self.qt.WCScriptAndDerivation, "on_ready"), \
                    mock.patch.object(self.qt.WCScriptAndDerivation, "validate", base_validate):
                step.on_ready()
                self.assertTrue(entered.wait(1))
                # Checked hidden choice stays blocked while the status request runs.
                self.assertTrue(step.hidden_cb.isChecked())
                self.assertFalse(step.valid)
                step.hidden_cb.setChecked(False)
                self.assertTrue(step.valid)
                step.hidden_cb.setChecked(True)
                self.assertFalse(step.valid)
                # Leaving the page cancels the device request.
                step.hideEvent(QHideEvent())
                self.assertTrue(tokens[0].is_set())
                _hwd_comms_executor.submit(lambda: None).result(timeout=2)
                app.processEvents()
                self.assertTrue(step.valid)
                # Coming back starts a fresh probe with a new token.
                entered.clear()
                step.showEvent(QShowEvent())
                self.assertTrue(entered.wait(1))
                self.assertEqual(2, len(tokens))
                self.assertFalse(tokens[1].is_set())
                self.assertFalse(step.valid)
        finally:
            for token in tokens:
                token.set()
            _hwd_comms_executor.submit(lambda: None).result(timeout=2)
            app.processEvents()
            step.close()

    def test_disabled_passphrase_keeps_choice_and_drops_queued_result(self):
        from PyQt6.QtGui import QHideEvent
        from PyQt6.QtWidgets import QApplication, QLabel

        app = QApplication.instance() or QApplication([])  # noqa: F841 (keep alive)
        info = SimpleNamespace(device=SimpleNamespace(id_=STATE["serialNo"]))
        component = self.wizard_component(mock.Mock(), mock.Mock(), dict(
            hardware_device=("onekey", info), onekey_wallet_mode="attach"))
        step = self.qt.WCOneKeyScript(None, component.wizard)
        step.wizard_data = component.wizard_data
        step.warn_label = QLabel()

        def base_validate(page):
            # Electrum's WCScriptAndDerivation.validate() applies the page first.
            page.apply()
            page.valid = True

        try:
            with mock.patch.object(self.qt.WCScriptAndDerivation, "on_ready"), \
                    mock.patch.object(self.qt.WCScriptAndDerivation, "apply"), \
                    mock.patch.object(self.qt.WCScriptAndDerivation, "validate", base_validate), \
                    mock.patch.object(self.qt, "_hwd_comms_executor"):
                step.on_ready()
                self.assertTrue(step.attach_cb.isChecked())
                self.assertEqual("attach", step.wizard_data["onekey_wallet_mode"])
                # Choices are exclusive.
                step.hidden_cb.setChecked(True)
                self.assertFalse(step.attach_cb.isChecked())
                self.assertEqual("select-hidden", step.wizard_data["onekey_wallet_mode"])
                # Disabled passphrase keeps the ticked choice and blocks Next with a reason.
                step._on_passphrase_status(step._passphrase_request, True)
                self.assertTrue(step.hidden_cb.isChecked())
                self.assertFalse(step.hidden_cb.isHidden())
                self.assertTrue(step.attach_cb.isHidden())
                self.assertFalse(step.valid)
                self.assertIn("Passphrase is disabled", step.warn_label.text())
                self.assertEqual("select-hidden", step.wizard_data["onekey_wallet_mode"])
                # Unticking is the user's explicit switch to the standard wallet.
                step.hidden_cb.setChecked(False)
                self.assertTrue(step.valid)
                self.assertTrue(step.hidden_cb.isHidden())
                self.assertEqual("standard", step.wizard_data["onekey_wallet_mode"])
                # A result queued before the page was left is discarded.
                step.on_ready()
                queued = step._passphrase_request
                step.hideEvent(QHideEvent())
                step._on_passphrase_status(queued, True)
                self.assertFalse(step._passphrase_disabled)
                self.assertFalse(step.attach_cb.isHidden())
        finally:
            step.close()

    def test_missing_attach_pin_gates_only_the_attach_choice(self):
        from PyQt6.QtWidgets import QApplication, QLabel

        app = QApplication.instance() or QApplication([])  # noqa: F841 (keep alive)
        client = mock.Mock(passphrase_enabled=True, attach_pin_enabled=False)
        client.has_usable_connection_with_device.return_value = True
        manager = mock.Mock()
        manager.client_by_id.return_value = client
        info = SimpleNamespace(device=SimpleNamespace(id_=STATE["serialNo"]))
        for mode in ("attach", "standard"):
            with self.subTest(mode=mode):
                component = self.wizard_component(mock.Mock(), manager, dict(
                    hardware_device=("onekey", info), onekey_wallet_mode=mode))
                step = self.qt.WCOneKeyScript(None, component.wizard)
                step.wizard_data = component.wizard_data
                step.warn_label = QLabel()

                def base_validate(page):
                    page.apply()
                    page.valid = True

                try:
                    with mock.patch.object(self.qt.WCScriptAndDerivation, "on_ready"), \
                            mock.patch.object(self.qt.WCScriptAndDerivation, "apply"), \
                            mock.patch.object(self.qt.WCScriptAndDerivation, "validate", base_validate), \
                            mock.patch.object(self.qt, "_hwd_comms_executor"):
                        step.on_ready()
                        self.assertEqual((False, True), run_in_hwd_thread(
                            lambda: self.qt.WCOneKeyScript._wallet_options_known_off(step)))
                        step._on_passphrase_status(step._passphrase_request, False, True)
                        self.assertFalse(step.hidden_cb.isHidden())
                        if mode == "attach":
                            # The ticked choice stays and Next explains the missing Attach PIN.
                            self.assertFalse(step.attach_cb.isHidden())
                            self.assertFalse(step.valid)
                            self.assertIn("No Attach PIN", step.warn_label.text())
                            step.attach_cb.setChecked(False)
                            self.assertTrue(step.attach_cb.isHidden())
                        else:
                            self.assertTrue(step.attach_cb.isHidden())
                        self.assertTrue(step.valid)
                        step.hidden_cb.setChecked(True)
                        self.assertTrue(step.valid)
                        self.assertEqual("select-hidden", step.wizard_data["onekey_wallet_mode"])
                finally:
                    step.close()

    def test_unlock_refreshes_features_and_retries_new_attach_pin_session(self):
        factory = TestOneKeyClient()
        client, helper, handler = factory.make_client()
        client.passphrase_enabled = False
        standard = dict(BINDING, walletType="standard", passphraseState=None)
        active = [standard]
        encryption_xpub = factory.encryption_xpub()
        bindings = []

        def dispatch(op, params, **_kwargs):
            if op == "state":
                return dict(STATE, passphraseEnabled=True)
            if op == "open":
                self.assertEqual("current", params["mode"])
                return dict(active[0])
            if op == "xpub":
                bindings.append(dict(params["binding"]))
                return dict(xpub=encryption_xpub, rootFingerprint=None)
            self.fail(op)

        helper.call.side_effect = dispatch

        def switch_pin(**kwargs):
            self.assertEqual({"allow_hidden": True}, kwargs)
            active[0] = BINDING
            return "current"

        handler.choose_passphrase_retry.side_effect = switch_pin
        step = SimpleNamespace(_password_decrypts=mock.Mock(side_effect=[False, True]))
        step._encryption_password = self.qt.WCOneKeyUnlock._encryption_password.__get__(step)
        password = self.qt.WCOneKeyUnlock._unlock_password(step, client)
        self.assertIsNotNone(password)
        self.assertEqual([standard, BINDING], bindings)
        self.assertFalse(client.closed)
        helper.shutdown.assert_not_called()

    def test_unlock_can_retry_hidden_wallet_or_cancel_with_refreshed_availability(self):
        for enabled, mode, expected in ((True, "select-hidden", "hidden-key"), (False, None, None),
                                        (None, "current", "current-key")):
            with self.subTest(enabled=enabled, mode=mode):
                client = mock.Mock(passphrase_enabled=False)
                def refresh():
                    client.passphrase_enabled = enabled
                    return True
                client.has_usable_connection_with_device.side_effect = refresh
                client.handler.choose_passphrase_retry.return_value = mode
                step = SimpleNamespace(_encryption_password=mock.Mock(side_effect=["wrong-key", expected]),
                                       _password_decrypts=mock.Mock(side_effect=[False, True]))
                self.assertEqual(expected, self.qt.WCOneKeyUnlock._unlock_password(step, client))
                client.handler.choose_passphrase_retry.assert_called_once_with(allow_hidden=enabled is not False)
                self.assertEqual(1 if mode is None else 2, step._encryption_password.call_count)

    def test_wallet_retry_dialog_offers_current_wallet_even_when_hidden_disabled(self):
        for enabled, choice in ((False, "current"), (True, "hidden"), (True, "cancel")):
            with self.subTest(enabled=enabled, choice=choice):
                current, hidden, cancel = object(), object(), object()
                box = mock.Mock()
                box.addButton.side_effect = [current, hidden, cancel] if enabled else [current, cancel]
                box.clickedButton.return_value = {"current": current, "hidden": hidden, "cancel": cancel}[choice]
                handler = SimpleNamespace(top_level_window=lambda: None, _allow_hidden_retry=enabled,
                                          _wallet_choice=None, _wallet_choice_done=threading.Event())
                with mock.patch.object(self.qt, "QMessageBox", return_value=box):
                    self.qt.OneKeyQtHandler._choose_passphrase_retry(handler)
                self.assertEqual({"current": "current", "hidden": "select-hidden", "cancel": None}[choice],
                                 handler._wallet_choice)
                self.assertTrue(handler._wallet_choice_done.is_set())
                self.assertEqual(3 if enabled else 2, box.addButton.call_count)
