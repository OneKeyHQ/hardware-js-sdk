import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import threading
import sys
import tempfile
import unittest
import zipfile
from types import SimpleNamespace
from unittest import mock

from electrum import constants, descriptor
from electrum.bip32 import BIP32Node, convert_bip32_strpath_to_intpath
from electrum.keystore import load_keystore, register_keystore
from electrum.plugin import run_in_hwd_thread
from electrum.storage import WalletStorage, get_derivation_used_for_hw_device_encryption
from electrum.transaction import PartialTransaction, PartialTxInput, PartialTxOutput, Transaction, TxOutpoint, Sighash
from electrum.util import UserCancelled, UserFacingException
from electrum.wallet_db import WalletDB
from electrum.wizard import NewWalletWizard
from electrum.zip_importer import MemoryZipImporter

from onekey.client import OneKeyClient, coin_name, check_binding
from onekey.onekey import OneKeyKeyStore, OneKeyPlugin
from onekey.ipc import HelperError
from build import build, build_distribution
from build_runtime import extract_node, node_license_member, write_shared_license
from install_runtime import install, parse_install_args, plugins_dir


STATE = dict(deviceId="synthetic-device", serialNo="synthetic-serial", model="pro2")
BINDING = dict(deviceId=STATE["deviceId"], serialNo=STATE["serialNo"], walletType="hidden",
               passphraseState="synthetic-public-wallet-identity")


class TestOneKeyPackaging(unittest.TestCase):
    def test_external_zip_first_load_has_adapter_but_no_python_usb_or_runtime(self):
        root_name = "onekey_zip_test.onekey"
        archive = build()
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

    def test_installer_puts_runtime_beside_the_plugin_zip(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "package"
            runtime = source / "onekey-runtime"
            (runtime / "nodes").mkdir(parents=True)
            (runtime / "runtime.json").write_text("{}\n")
            (source / "onekey-0.1.0.zip").write_bytes(b"plugin")
            (source / "onekey-electrum-0.1.0.zip").write_bytes(b"outer")
            destination = Path(temporary) / "plugins"
            plugin, installed, replaced = install(source, destination)
            self.assertEqual(plugin.read_bytes(), b"plugin")
            self.assertEqual((installed / "runtime.json").read_text(), "{}\n")
            self.assertFalse(replaced)
            (source / "onekey-0.1.0.zip").write_bytes(b"updated")
            plugin, installed, replaced = install(source, destination)
            self.assertTrue(replaced)
            self.assertEqual(plugin.read_bytes(), b"updated")

    def test_failed_copy_keeps_the_installed_runtime_and_old_zip(self):
        with tempfile.TemporaryDirectory() as temporary:
            temporary = Path(temporary)
            source, destination = self._package(temporary, '{"generation":1}\n', b"plugin")
            install(source, destination)
            self._named_zip(destination / "onekey-0.0.9.zip", "onekey")
            (source / "onekey-runtime" / "runtime.json").write_text('{"generation":2}\n')
            (source / "onekey-0.1.0.zip").write_bytes(b"updated")
            with mock.patch("install_runtime.shutil.copytree", side_effect=OSError("full")):
                with self.assertRaises(OSError):
                    install(source, destination)
            self.assertEqual((destination / "onekey-runtime" / "runtime.json").read_text(), '{"generation":1}\n')
            self.assertEqual((destination / "onekey-0.1.0.zip").read_bytes(), b"plugin")
            self.assertTrue((destination / "onekey-0.0.9.zip").is_file())

    def test_failed_zip_replace_restores_the_previous_runtime(self):
        with tempfile.TemporaryDirectory() as temporary:
            temporary = Path(temporary)
            source, destination = self._package(temporary, '{"generation":1}\n', b"plugin")
            install(source, destination)
            (source / "onekey-runtime" / "runtime.json").write_text('{"generation":2}\n')
            (source / "onekey-0.1.0.zip").write_bytes(b"updated")
            with mock.patch("install_runtime._replace_file", side_effect=OSError("zip")):
                with self.assertRaises(OSError):
                    install(source, destination)
            self.assertEqual((destination / "onekey-runtime" / "runtime.json").read_text(), '{"generation":1}\n')
            self.assertEqual((destination / "onekey-0.1.0.zip").read_bytes(), b"plugin")
            self.assertFalse((destination / ".onekey-runtime.backup").exists())
            self.assertFalse((destination / ".onekey-runtime.incoming").exists())

    def test_installer_removes_other_onekey_zips_after_the_new_one_is_in_place(self):
        with tempfile.TemporaryDirectory() as temporary:
            temporary = Path(temporary)
            source, destination = self._package(temporary, "{}\n", b"unused")
            self._named_zip(source / "onekey-0.1.0.zip", "onekey")
            destination.mkdir()
            self._named_zip(destination / "onekey-0.0.9.zip", "onekey")
            self._named_zip(destination / "other-1.0.0.zip", "other")
            (destination / "onekey-0.0.1.zip.disabled").write_bytes(b"disabled")
            install(source, destination)
            self.assertTrue((destination / "onekey-0.1.0.zip").is_file())
            self.assertFalse((destination / "onekey-0.0.9.zip").exists())
            self.assertTrue((destination / "other-1.0.0.zip").is_file())
            self.assertEqual((destination / "onekey-0.0.1.zip.disabled").read_bytes(), b"disabled")

    def test_testnet_flag_changes_only_the_default_destination(self):
        with mock.patch.dict(os.environ, {"ELECTRUMDIR": "/tmp/electrum-root"}):
            self.assertEqual(plugins_dir(), Path("/tmp/electrum-root/plugins"))
            self.assertEqual(plugins_dir(testnet=True), Path("/tmp/electrum-root/testnet/plugins"))
            _source, destination = parse_install_args(["--testnet"])
            self.assertEqual(destination, Path("/tmp/electrum-root/testnet/plugins"))
            _source, destination = parse_install_args(["/pkg", "/explicit", "--testnet"])
            self.assertEqual(_source, Path("/pkg"))
            self.assertEqual(destination, Path("/explicit"))
            _source, destination = parse_install_args([])
            self.assertEqual(destination, Path("/tmp/electrum-root/plugins"))

    def test_node_license_is_packaged_outside_the_platform_directory(self):
        text = "Node.js is licensed for use as follows:\nCopyright Node.js contributors. All rights reserved.\n"
        with tempfile.TemporaryDirectory() as temporary:
            temporary = Path(temporary)
            archive_path = temporary / "node-v22.21.1-darwin-arm64.tar.gz"
            with tarfile.open(archive_path, "w:gz") as tar:
                payload = text.encode()
                info = tarfile.TarInfo("node-v22.21.1-darwin-arm64/LICENSE")
                info.size = len(payload)
                tar.addfile(info, io.BytesIO(payload))
                binary = b"node-binary"
                info = tarfile.TarInfo("node-v22.21.1-darwin-arm64/bin/node")
                info.size = len(binary)
                tar.addfile(info, io.BytesIO(binary))
            bundle = temporary / "bundle"
            node = bundle / "nodes" / "darwin-arm64" / "node"
            extract_node(archive_path, "node-v22.21.1-darwin-arm64/bin/node", node)
            write_shared_license(bundle, archive_path, node_license_member(archive_path.name))
            self.assertEqual([path.name for path in node.parent.iterdir()], ["node"])
            self.assertEqual((bundle / "LICENSE").read_text(), text)
            win = temporary / "node-v22.21.1-win-x64.zip"
            with zipfile.ZipFile(win, "w") as archive:
                archive.writestr("node-v22.21.1-win-x64/LICENSE", text)
                archive.writestr("node-v22.21.1-win-x64/node.exe", b"node")
            write_shared_license(bundle, win, node_license_member(win.name))
            self.assertEqual((bundle / "LICENSE").read_text(), text)
            root = temporary / "plugin"
            (root / "onekey").mkdir(parents=True)
            (root / "onekey" / "manifest.json").write_text('{"version":"0.1.0"}\n')
            (root / "install_runtime.py").write_text("# installer\n")
            runtime = root / "dist" / "onekey-runtime"
            (runtime / "nodes" / "darwin-arm64").mkdir(parents=True)
            (runtime / "runtime.json").write_text("{}\n")
            (runtime / "LICENSE").write_text(text)
            (runtime / "nodes" / "darwin-arm64" / "node").write_bytes(b"node")
            with zipfile.ZipFile(build_distribution(root)) as archive:
                self.assertEqual(archive.read("onekey-runtime/LICENSE").decode(), text)
                self.assertFalse(any(name.startswith("onekey-runtime/nodes/") and name.endswith("LICENSE")
                                     for name in archive.namelist()))
                with zipfile.ZipFile(io.BytesIO(archive.read("onekey-0.1.0.zip"))) as plugin:
                    pin = plugin.read("onekey/runtime_pin.txt").decode().strip()
            self.assertEqual(pin, hashlib.sha256(b"{}\n").hexdigest())

    @staticmethod
    def _package(root, runtime_text, plugin_bytes):
        source = Path(root) / "package"
        runtime = source / "onekey-runtime"
        runtime.mkdir(parents=True)
        (runtime / "runtime.json").write_text(runtime_text)
        (source / "onekey-0.1.0.zip").write_bytes(plugin_bytes)
        (source / "onekey-electrum-0.1.0.zip").write_bytes(b"outer")
        return source, Path(root) / "plugins"

    @staticmethod
    def _named_zip(path, name):
        path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("onekey/manifest.json", json.dumps({"name": name}))


class TestOneKeyClient(unittest.TestCase):
    def make_client(self):
        helper = mock.Mock(generation="generation-one")
        helper.call.return_value = dict(STATE)
        handler = mock.Mock()
        handler.choose_wallet.return_value = "select-hidden"
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
        self.assertEqual(xpub, client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        self.assertEqual("01020304", client.request_root_fingerprint_from_device())
        self.assertEqual("select-hidden", helper.call.call_args_list[-2].args[1]["mode"])
        keystore = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'", onekey_binding=BINDING))
        helper.call.side_effect = None
        helper.call.return_value = dict(xpub=xpub, rootFingerprint=None)
        client.bind_keystore(keystore)
        handler.choose_wallet.assert_called_once()
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
        handler.choose_wallet.return_value = "standard"
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
        xpub = self.public_key()
        helper.call.side_effect = [BINDING, dict(xpub=xpub, rootFingerprint=None)]
        self.assertEqual(xpub, client.get_xpub("m/84'/0'/0'", "p2wpkh"))
        handler.choose_wallet.assert_called_once()
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
        client.plugin.release_helper.assert_called_once_with(client)

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
        plugin.helper.shutdown.assert_called_once()
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

    def test_storage_encryption_can_select_a_wallet_without_becoming_the_account(self):
        client, helper, handler = self.make_client()
        encryption_xpub = self.encryption_xpub()
        helper.call.side_effect = [BINDING, dict(xpub=encryption_xpub, rootFingerprint=None)]
        path = get_derivation_used_for_hw_device_encryption()
        self.assertEqual(encryption_xpub, client.get_xpub(path, "standard"))
        self.assertIsNone(client.account)
        handler.choose_wallet.assert_called_once()
        client.plugin.remember_wallet_binding.assert_not_called()
        self.assertEqual("open", helper.call.call_args_list[-2].args[0])

    def test_storage_encryption_path_is_not_a_general_account_exception(self):
        client, helper, _ = self.make_client()
        path = get_derivation_used_for_hw_device_encryption()
        for requested, xtype in ((path + "/0'", "standard"), ("m/4541509'/0'", "standard"), (path, "p2wpkh"),
                                 ("m/86'/0'/0'", "p2wpkh")):
            with self.subTest(path=requested, xtype=xtype), self.assertRaises(UserFacingException):
                client.get_xpub(requested, xtype)
        self.assertEqual(1, helper.call.call_count)

    def test_cancelled_selection_does_not_open_standard_wallet(self):
        client, helper, handler = self.make_client()
        handler.choose_wallet.side_effect = UserCancelled()
        with self.assertRaises(UserCancelled):
            client.get_xpub("m/84'/0'/0'", "p2wpkh")
        self.assertFalse(any(call.args[0] == "open" for call in helper.call.call_args_list))
        helper.shutdown.assert_called_once()

    def test_identity_wallet_or_xpub_mismatch_stops_before_side_effect(self):
        for field in ("deviceId", "serialNo", "passphraseState", "xpub"):
            client, helper, _ = self.make_client()
            xpub = self.public_key()
            client.binding = dict(BINDING)
            binding = dict(BINDING)
            if field != "xpub":
                binding[field] = "different"
            key = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'", onekey_binding=binding))
            other = BIP32Node.from_rootseed(os.urandom(32), xtype="p2wpkh").subkey_at_private_derivation("m/84'/0'/0'").to_xpub()
            helper.call.return_value = dict(xpub=other, rootFingerprint=None)
            with self.subTest(field=field), self.assertRaises(UserFacingException):
                client.bind_keystore(key)
            self.assertFalse(any(call.args[0] in ("address", "sign") for call in helper.call.call_args_list))
            helper.shutdown.assert_called_once()

    def test_bound_account_is_checked_before_address_and_address_is_compared(self):
        client, helper, _ = self.make_client()
        xpub = self.public_key()
        client.binding = dict(BINDING)
        client.account = ([0x80000054, 0x80000000, 0x80000000], "p2wpkh", xpub)
        helper.call.side_effect = [dict(xpub=xpub, rootFingerprint=None), {"address": "different-address"}]
        with self.assertRaisesRegex(UserFacingException, "different address"):
            client.show_address(client.account[0] + [0, 0], "p2wpkh", "expected-address")
        self.assertEqual(["xpub", "address"], [call.args[0] for call in helper.call.call_args_list[-2:]])
        helper.shutdown.assert_called_once()

    def test_missing_binding_invalid_binding_and_stale_child_fail_closed(self):
        client, helper, _ = self.make_client()
        key = OneKeyKeyStore(dict(xpub=self.public_key(), derivation="m/84'/0'/0'"))
        with self.assertRaisesRegex(UserFacingException, "no OneKey device binding"):
            client.bind_keystore(key)
        for bad in ({**BINDING, "walletType": "standard"}, {**BINDING, "passphraseState": None},
                    {**BINDING, "sessionId": "forbidden"}):
            with self.assertRaises(UserFacingException):
                check_binding(bad)
        client, helper, _ = self.make_client()
        helper.call.side_effect = HelperError("STALE")
        self.assertFalse(client.has_usable_connection_with_device())
        self.assertTrue(client.closed)

    def test_mainnet_testnet_and_unsupported_account_paths(self):
        self.assertEqual("Bitcoin", coin_name())
        with mock.patch.object(constants, "net", constants.BitcoinTestnet):
            self.assertEqual("Testnet", coin_name())
        client, helper, _ = self.make_client()
        for path, xtype in (("m/86'/0'/0'", "p2wpkh"), ("m/84'/1'/0'", "p2wpkh"), ("m/84'/0'", "p2wpkh")):
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
                    self.assertEqual(dict(version=2, lock_time=123), client.sign_tx.call_args.kwargs)

    def test_foreign_input_nondefault_sighash_missing_prev_and_bad_change_rejected(self):
        for mode in ("foreign", "sighash", "previous", "input-path", "change-path", "change-script"):
            keystore, tx, _ = self.make_transaction()
            txin, change = tx.inputs()[0], tx.outputs()[1]
            if mode == "foreign": txin.is_mine = False
            if mode == "sighash": txin.sighash = Sighash.NONE
            if mode == "previous": txin.utxo = None
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
            with self.subTest(mode=mode), self.assertRaises(UserFacingException):
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
