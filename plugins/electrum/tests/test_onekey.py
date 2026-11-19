import importlib.util
import os
import sys
import unittest
import zipfile
from types import SimpleNamespace
from unittest import mock

from electrum import constants, descriptor
from electrum.bip32 import BIP32Node, convert_bip32_strpath_to_intpath
from electrum.plugin import run_in_hwd_thread
from electrum.transaction import PartialTransaction, PartialTxInput, PartialTxOutput, Transaction, TxOutpoint, Sighash
from electrum.util import UserCancelled, UserFacingException
from electrum.zip_importer import MemoryZipImporter

from onekey.client import OneKeyClient, coin_name, check_binding
from onekey.onekey import OneKeyKeyStore, OneKeyPlugin
from onekey.ipc import HelperError
from build import build


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
            self.assertFalse(any("__pycache__" in name for name in names))
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

    def test_wizard_binding_is_copied_into_keystore_dump(self):
        xpub = self.public_key()
        plugin = SimpleNamespace(_new_wallet_bindings={xpub: dict(BINDING)})
        with mock.patch.object(OneKeyKeyStore, "plugin", plugin, create=True):
            keystore = OneKeyKeyStore(dict(xpub=xpub, derivation="m/84'/0'/0'"))
            self.assertEqual(BINDING, keystore.dump()["onekey_binding"])
            self.assertEqual({}, plugin._new_wallet_bindings)

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
