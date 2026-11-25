import copy

from electrum import bitcoin, descriptor
from electrum.bip32 import BIP32Node
from electrum.hw_wallet import HW_PluginBase
from electrum.hw_wallet.plugin import trezor_validate_op_return_output_and_get_data
from electrum.i18n import _
from electrum.keystore import Hardware_KeyStore
from electrum.plugin import Device, DeviceUnpairableError, runs_in_hwd_thread
from electrum.transaction import PartialTransaction, PartialTxOutput, Sighash
from electrum.util import UserCancelled, UserFacingException

from .ipc import Helper, HelperError, SDK_VERSION
from .validate import parse_der_signature_hex


def _is_valid_suffix(suffix, *, change_only=False):
    return (
        type(suffix) in (tuple, list)
        and len(suffix) == 2
        and type(suffix[0]) is int
        and (suffix[0] == 1 if change_only else suffix[0] in (0, 1))
        and type(suffix[1]) is int
        and 0 <= suffix[1] < 0x80000000
    )


def _derive_pubkey(xpub, suffix):
    return BIP32Node.from_xkey(xpub).subkey_at_public_derivation(list(suffix)).eckey.get_public_key_bytes(compressed=True)


def _singlesig_script(pubkey, script_type):
    return descriptor.get_singlesig_descriptor_from_legacy_leaf(
        pubkey=pubkey.hex(), script_type=script_type).expand().output_script


def _script_address(script):
    return PartialTxOutput(scriptpubkey=script, value=0).address


class OneKeyKeyStore(Hardware_KeyStore):
    hw_type = "onekey"
    device = "OneKey"

    def __init__(self, data):
        super().__init__(data)
        self.onekey_binding = data.get("onekey_binding")
        # maybe_master_pubkey builds a preview keystore. create_storage builds another
        # and is the one Electrum writes. Copy until that persisted dump.
        self._onekey_binding_from_pending = False
        if self.onekey_binding is None:
            pending = getattr(getattr(self, "plugin", None), "_new_wallet_bindings", {})
            saved = pending.get(self.xpub) if isinstance(pending, dict) else None
            if saved is not None:
                self.onekey_binding = dict(saved)
                self._onekey_binding_from_pending = True

    def dump(self):
        data = super().dump()
        if self.onekey_binding is not None:
            data["onekey_binding"] = dict(self.onekey_binding)
        if self._onekey_binding_from_pending:
            pending = getattr(getattr(self, "plugin", None), "_new_wallet_bindings", None)
            if isinstance(pending, dict):
                pending.pop(self.xpub, None)
            self._onekey_binding_from_pending = False
        return data

    def decrypt_message(self, sequence, message, password):
        raise UserFacingException(_("Message decryption is not supported by this OneKey plugin."))

    def sign_message(self, sequence, message, password, *, script_type=None):
        # Same contract as Trezor and Ledger: raw 65-byte recoverable signature.
        # no_script_type is set on the wire so Electrum and Bitcoin Core can verify it.
        if script_type not in ("p2pkh", "p2wpkh-p2sh", "p2wpkh"):
            raise UserFacingException(_("Only single-signature legacy and SegWit wallets are supported."))
        if type(message) is not str:
            raise UserFacingException(_("OneKey can sign a Bitcoin message of 1 to 1024 bytes."))
        raw = message.encode("utf-8")
        if not 1 <= len(raw) <= 1024:
            raise UserFacingException(_("OneKey can sign a Bitcoin message of 1 to 1024 bytes."))
        if not _is_valid_suffix(sequence):
            raise UserFacingException(_("Input or change does not belong to this OneKey account."))
        if BIP32Node.from_xkey(self.xpub).xtype != {"p2pkh": "standard"}.get(script_type, script_type):
            raise UserFacingException(_("Script type does not match the OneKey account."))
        from .client import account_path
        path = account_path(self.get_derivation_prefix(), script_type) + list(sequence)
        expected = _script_address(_singlesig_script(_derive_pubkey(self.xpub, sequence), script_type))
        client = self.get_client()
        if client is None:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        signature = client.sign_message(path, script_type, raw, expected,
                                        bind_token=client.take_bind_token())
        if not bitcoin.verify_usermessage_with_address(expected, signature, raw):
            raise UserFacingException(_("Invalid OneKey signature encoding."))
        return signature

    def sign_transaction(self, tx, password):
        if not tx.is_complete():
            self.plugin.sign_transaction(self, tx)


class OneKeyPlugin(HW_PluginBase):
    keystore_class = OneKeyKeyStore
    DEVICE_IDS = ("OneKey",)
    SUPPORTED_XTYPES = ("standard", "p2wpkh-p2sh", "p2wpkh", "p2wsh", "p2wsh-p2sh")
    minimum_library = (1, 2, 10)
    maximum_library = (1, 2, 11)
    libraries_URL = "https://github.com/OneKeyHQ/hardware-js-sdk/tree/onekey/plugins/electrum"

    def __init__(self, parent, config, name):
        super().__init__(parent, config, name)
        self.helper = Helper()
        self._new_wallet_bindings = {}
        self._live_clients = set()
        self.libraries_available = self.check_libraries_available()
        if self.libraries_available:
            self.device_manager().register_enumerate_func(self.enumerate)

    def remember_wallet_binding(self, xpub, binding):
        # Kept until the keystore Electrum persists is dumped.
        self._new_wallet_bindings[xpub] = dict(binding)

    def retain_client(self, client):
        self._live_clients.add(client)

    def _connected_clients(self):
        get_manager = getattr(self, "device_manager", None)
        if not callable(get_manager):
            return None
        try:
            clients = getattr(get_manager(), "clients", None)
        except Exception:
            return None
        return clients if isinstance(clients, dict) else None

    def _sweep_unplugged(self, keep=None):
        # Scan replaces DeviceMgr.clients before unpair, so the removed client's
        # close() never runs. Drop those refs here. Do not pop the dict: scan
        # may still be iterating it.
        connected = self._connected_clients()
        if connected is None:
            return
        for live in list(self._live_clients):
            if live is keep or live in connected:
                continue
            live.closed = True
            live.binding = None
            live.account = None
            live._released = True
            self._live_clients.discard(live)
            self._release_device(live)
        # DeviceMgr may already have collected the next discovery result. Keep
        # its generation valid even when the last old client was removed.

    def _release_device(self, client):
        if (client.helper.generation == client.generation
                and not any(live.connect_id == client.connect_id and live.generation == client.generation
                            for live in self._live_clients)):
            client.helper.release(client.connect_id)

    def release_helper(self, client, *, scanning=False):
        self._sweep_unplugged(keep=client)
        self._live_clients.discard(client)
        self._release_device(client)
        if not scanning and not self._live_clients and client.helper.generation == client.generation:
            client.helper.shutdown()

    def get_library_version(self):
        from .usb import check_available
        check_available()
        return SDK_VERSION

    @runs_in_hwd_thread
    def enumerate(self):
        self._sweep_unplugged()
        try:
            found = self.helper.call("search", {}, timeout=30)
            if type(found) is not list or len(found) > 32:
                raise HelperError("PROTOCOL")
            result = []
            for device in found:
                if (type(device) is not dict or set(device) != {"connectId", "serialNo", "deviceId", "model"}
                        or device["model"] not in ("pro2", "neo")):
                    raise HelperError("PROTOCOL")
                for key in ("connectId", "serialNo", "model"):
                    if type(device[key]) is not str or not device[key] or len(device[key]) > 256:
                        raise HelperError("PROTOCOL")
                # Locked initialized firmware omits device_id. serialNo is enough to enter the wizard.
                if (device["deviceId"] is not None and (type(device["deviceId"]) is not str
                        or not device["deviceId"] or len(device["deviceId"]) > 256)):
                    raise HelperError("PROTOCOL")
                result.append(Device(path=device["connectId"], interface_number=-1,
                                     id_=device["serialNo"], product_key="OneKey", usage_page=0,
                                     transport_ui_string="USB"))
            return result
        except HelperError as error:
            # USB_UNAVAILABLE and SDK_FAILED can come from one unclaimed candidate.
            # Closing here would drop every device this scan already holds.
            if error.code not in ("USB_UNAVAILABLE", "SDK_FAILED"):
                self.helper.close()
            raise UserFacingException(str(error)) from None

    @runs_in_hwd_thread
    def create_client(self, device, handler):
        from .client import OneKeyClient
        client = OneKeyClient(device.path, handler, self)
        if client.serial != device.id_:
            client.close()
            raise UserFacingException(_("OneKey device identity changed. Select the device again."))
        return client

    @runs_in_hwd_thread
    def get_client(self, keystore, *args, allow_user_interaction=True, **kwargs):
        previous = getattr(self, "_expected_keystore", None)
        previous_interaction = getattr(self, "_allow_user_interaction", True)
        self._expected_keystore = keystore
        self._allow_user_interaction = allow_user_interaction
        self._sweep_unplugged()
        try:
            # DeviceMgr may request an xpub while pairing. Supply the saved wallet intent
            # before that callback, so reconnect cannot enter the wallet-selection flow.
            client = self._open_client(keystore, allow_user_interaction, *args, **kwargs)
            if client is not None and not client.attached():
                # Cancel/IPC failure leaves Electrum's per-serial cache pointing at a dead client.
                client.close()
                client = self._open_client(keystore, allow_user_interaction, *args, **kwargs)
            if client is not None and not client.attached():
                client.close()
                return None
            if client is None:
                return None
            # Only the bind made by this lookup may vouch for the next operation.
            client.discard_bind_token()
            if not allow_user_interaction:
                # A silent lookup must not prompt. An already open matching account can be reused,
                # but the caller's operation repeats the live xpub comparison.
                return client if client.matches_keystore(keystore) else None
            client.bind_keystore(keystore)
            return client
        finally:
            self._expected_keystore = previous
            self._allow_user_interaction = previous_interaction

    def _open_client(self, keystore, allow_user_interaction, *args, **kwargs):
        try:
            return super().get_client(keystore, *args, allow_user_interaction=allow_user_interaction, **kwargs)
        except DeviceUnpairableError:
            # force_pair turns a silent UserCancelled into this error. Background pairing
            # only catches UserCancelled, so a quiet lookup has to stop here.
            if allow_user_interaction:
                raise
            return None

    @runs_in_hwd_thread
    def show_address(self, wallet, address, keystore=None):
        keystore = keystore or wallet.get_keystore()
        if not self.show_address_helper(wallet, address, keystore):
            return
        if wallet.txin_type in ("p2wsh", "p2wsh-p2sh"):
            self._show_p2wsh_address(wallet, address, keystore)
            return
        if wallet.txin_type not in ("p2pkh", "p2wpkh-p2sh", "p2wpkh"):
            raise UserFacingException(_("Only single-signature legacy and SegWit wallets are supported."))
        from .client import account_path
        path = account_path(keystore.get_derivation_prefix(), wallet.txin_type)
        suffix = list(wallet.get_address_index(address))
        expected = _script_address(_singlesig_script(_derive_pubkey(keystore.xpub, suffix), wallet.txin_type))
        if expected != address:
            raise UserFacingException(_("Electrum address does not match the OneKey account."))
        client = self.get_client(keystore)
        if client is None:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        client.show_address(path + suffix, wallet.txin_type, address, bind_token=client.take_bind_token())

    def _show_p2wsh_address(self, wallet, address, keystore):
        from .client import account_path
        script_type = wallet.txin_type
        desc = wallet.get_script_descriptor_for_address(address)
        multi = desc.get_simple_multisig() if desc is not None else None
        if (script_type not in ("p2wsh", "p2wsh-p2sh") or desc is None or multi is None or not multi.is_sorted
                or desc.to_legacy_electrum_script_type() != script_type):
            raise UserFacingException(_("Only BIP48 segwit multisig from this OneKey wallet is supported."))
        if BIP32Node.from_xkey(keystore.xpub).xtype != script_type:
            raise UserFacingException(_("Script type does not match the OneKey account."))
        suffix = list(wallet.get_address_index(address))
        prefix = account_path(keystore.get_derivation_prefix(), script_type)
        pubkey = _derive_pubkey(keystore.xpub, suffix)
        payload = self._multisig_payload(multi, pubkey, suffix)
        expected = _script_address(desc.expand().output_script)
        if expected != address:
            raise UserFacingException(_("Electrum address does not match the OneKey account."))
        client = self.get_client(keystore)
        if client is None:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        client.show_address(prefix + suffix, script_type, address, payload, bind_token=client.take_bind_token())

    @staticmethod
    def _owned_path(keystore, item, script_type, *, change=False):
        from .client import account_path
        prefix = account_path(keystore.get_derivation_prefix(), script_type)
        if BIP32Node.from_xkey(keystore.xpub).xtype != {"p2pkh": "standard"}.get(script_type, script_type):
            raise UserFacingException(_("Script type does not match the OneKey account."))
        pubkey, path = keystore.find_my_pubkey_in_txinout(item)
        branch = len(prefix)
        if not path or len(path) != branch + 2 or list(path[:branch]) != list(prefix) or not _is_valid_suffix(path[branch:], change_only=change):
            raise UserFacingException(_("Input or change does not belong to this OneKey account."))
        suffix = list(path[branch:])
        derived = _derive_pubkey(keystore.xpub, suffix)
        if pubkey != derived:
            raise UserFacingException(_("OneKey account public key mismatch."))
        desc = item.script_descriptor
        multi = desc.get_simple_multisig() if desc is not None else None
        if multi is not None:
            if script_type not in ("p2wsh", "p2wsh-p2sh") or not multi.is_sorted or desc.to_legacy_electrum_script_type() != script_type:
                raise UserFacingException(_("Only BIP48 segwit multisig from this OneKey wallet is supported."))
            return list(path), desc.expand().output_script, OneKeyPlugin._multisig_payload(multi, derived, suffix)
        expected_script = _singlesig_script(derived, script_type)
        if desc is None or desc.expand().output_script != expected_script:
            raise UserFacingException(_("OneKey ownership script mismatch."))
        return list(path), expected_script, None

    @staticmethod
    def _u32(value):
        if type(value) is int:
            return value
        return int.from_bytes(value, "big")

    @staticmethod
    def _multisig_payload(multi, our_pubkey, suffix):
        if (multi.is_range() or not multi.is_sorted or not 1 <= multi.thresh <= len(multi.pubkeys) <= 15
                or not _is_valid_suffix(suffix)):
            raise UserFacingException(_("Only BIP48 segwit multisig from this OneKey wallet is supported."))
        nodes = []
        found = False
        seen = set()
        for provider in multi.pubkeys:
            node = provider.extkey
            if node is None or provider.is_range() or node.is_private():
                raise UserFacingException(_("Only BIP48 segwit multisig from this OneKey wallet is supported."))
            provider_suffix = list(provider.get_der_suffix_int_list())
            if provider_suffix != list(suffix):
                raise UserFacingException(_("Input or change does not belong to this OneKey account."))
            pubkey = node.eckey.get_public_key_bytes(compressed=True)
            chain = node.chaincode
            fingerprint = OneKeyPlugin._u32(node.fingerprint)
            child_num = OneKeyPlugin._u32(node.child_number)
            # Firmware derives a master (depth 0, parent fingerprint 0, child 0). Any other depth 0 is not a master.
            master = node.depth == 0 and fingerprint == 0 and child_num == 0
            if (type(node.depth) is not int or not 0 <= node.depth <= 255 or (node.depth == 0 and not master)
                    or len(chain) != 32 or len(pubkey) != 33 or pubkey[0] not in (2, 3) or pubkey in seen):
                raise UserFacingException(_("Only BIP48 segwit multisig from this OneKey wallet is supported."))
            seen.add(pubkey)
            child = node.subkey_at_public_derivation(provider_suffix).eckey.get_public_key_bytes(compressed=True)
            found = found or child == our_pubkey
            nodes.append({
                "depth": node.depth,
                "fingerprint": fingerprint,
                "child_num": child_num,
                "chain_code": chain.hex(),
                "public_key": pubkey.hex(),
                "address_n": provider_suffix,
            })
        if not found:
            raise UserFacingException(_("OneKey account public key mismatch."))
        return {"m": multi.thresh, "pubkeys": nodes}

    @runs_in_hwd_thread
    def sign_transaction(self, keystore, tx: PartialTransaction):
        from .client import INPUT_SCRIPT_TYPES, OUTPUT_SCRIPT_TYPES
        inputs, previous = [], {}
        for txin in tx.inputs():
            desc = txin.script_descriptor
            if not txin.is_mine or desc is None:
                raise UserFacingException(_("Only inputs from this OneKey wallet are supported."))
            if desc.get_simple_multisig() and desc.to_legacy_electrum_script_type() not in ("p2wsh", "p2wsh-p2sh"):
                raise UserFacingException(_("Only BIP48 segwit multisig from this OneKey wallet is supported."))
            script_type = desc.to_legacy_electrum_script_type()
            if script_type not in OUTPUT_SCRIPT_TYPES:
                raise UserFacingException(_("Unsupported OneKey input script type."))
            if txin.sighash not in (None, Sighash.ALL):
                raise UserFacingException(_("OneKey requires SIGHASH_ALL."))
            path, script, payload = self._owned_path(keystore, txin, script_type)
            prev = txin.utxo
            index = txin.prevout.out_idx
            if (prev is None or prev.txid() != txin.prevout.txid.hex()
                    or not 0 <= index < len(prev.outputs())
                    or prev.outputs()[index].scriptpubkey != script
                    or prev.outputs()[index].value != txin.value_sats()):
                raise UserFacingException(_("Missing or mismatched full previous transaction."))
            previous[txin.prevout.txid.hex()] = self._previous_transaction(prev)
            item = dict(prev_hash=txin.prevout.txid.hex(), prev_index=index,
                        amount=str(txin.value_sats()), sequence=txin.nsequence,
                        address_n=path, script_type=INPUT_SCRIPT_TYPES[script_type])
            if payload is not None:
                item["multisig"] = payload
            inputs.append(item)

        outputs = []
        for txout in tx.outputs():
            if txout.is_change:
                desc = txout.script_descriptor
                if not txout.is_mine or desc is None:
                    raise UserFacingException(_("Unsupported OneKey change script."))
                if desc.get_simple_multisig() and desc.to_legacy_electrum_script_type() not in ("p2wsh", "p2wsh-p2sh"):
                    raise UserFacingException(_("Only BIP48 segwit multisig from this OneKey wallet is supported."))
                script_type = desc.to_legacy_electrum_script_type()
                if script_type not in OUTPUT_SCRIPT_TYPES:
                    raise UserFacingException(_("Unsupported OneKey change script."))
                path, script, payload = self._owned_path(keystore, txout, script_type, change=True)
                if script != txout.scriptpubkey:
                    raise UserFacingException(_("OneKey change script does not match its derivation."))
                item = dict(amount=str(txout.value), address_n=path, script_type=OUTPUT_SCRIPT_TYPES[script_type])
                if payload is not None:
                    item["multisig"] = payload
                outputs.append(item)
            elif txout.address:
                outputs.append(dict(amount=str(txout.value), address=txout.address, script_type="PAYTOADDRESS"))
            else:
                outputs.append(dict(amount=str(txout.value), script_type="PAYTOOPRETURN",
                                    op_return_data=trezor_validate_op_return_output_and_get_data(txout).hex()))
        multisig = any("multisig" in item for item in inputs)
        change_multisig = ["multisig" in item for item in outputs if "address_n" in item]
        if (any("multisig" in item for item in inputs) != all("multisig" in item for item in inputs)
                or (multisig and not all(change_multisig)) or (not multisig and any(change_multisig))):
            raise UserFacingException(_("Only BIP48 segwit multisig from this OneKey wallet is supported."))

        client = self.get_client(keystore)
        if client is None:
            raise UserFacingException(_("Reconnect OneKey using the wallet wizard."))
        try:
            signatures = client.sign_tx(
                inputs, outputs, previous, version=tx.version, lock_time=tx.locktime,
                bind_token=client.take_bind_token(),
            )
            if type(signatures) is not list or len(signatures) != len(inputs):
                raise UserFacingException(_("OneKey did not sign all inputs."))
            # Every input is still sent. Applying a signature to one Electrum already
            # finalized clears that input's scriptSig and witness.
            already_complete = [txin.is_complete() for txin in tx.inputs()]
            checked = []
            for index, entry in enumerate(signatures):
                if (type(entry) is not dict or set(entry) != {"index", "signature"}
                        or type(entry["index"]) is not int or entry["index"] != index):
                    raise UserFacingException(_("Invalid OneKey signature index."))
                if already_complete[index]:
                    checked.append(None)
                else:
                    checked.append(self._signature(entry["signature"]) + Sighash.to_sigbytes(Sighash.ALL))
            # Electrum recovers/verifies against each ORIGINAL transaction input. Test a copy first
            # so a partial, reordered, or foreign signature cannot mutate the user's transaction.
            # One cosigner of an m-of-n script does not finish the transaction.
            # A singlesig signature still has to make every input complete.
            candidate = copy.deepcopy(tx)
            if multisig:
                # Clear any pre-existing partial signature under our pubkey on the
                # candidate copy so Electrum must freshly verify the device reply.
                for index, txin in enumerate(candidate.inputs()):
                    if not already_complete[index]:
                        pubkey, _path = keystore.find_my_pubkey_in_txinout(txin)
                        if pubkey is not None:
                            txin.sigs_ecdsa.pop(pubkey, None)
            for target in (candidate, tx):
                preserved = [(txin.script_sig, txin.witness) for txin in target.inputs()]
                target.update_signatures(checked)
                self._require_applied_signatures(
                    keystore, target, multisig, already_complete, preserved, checked)
        except BaseException as error:
            if not client.attached():
                client.close()
            elif not isinstance(error, UserCancelled):
                client._reset_session(release_usb=False)
            raise

    @staticmethod
    def _require_applied_signatures(keystore, tx, multisig, already_complete, preserved, checked):
        for index, txin in enumerate(tx.inputs()):
            if already_complete[index] and (
                    not txin.is_complete() or (txin.script_sig, txin.witness) != preserved[index]):
                raise UserFacingException(_("OneKey returned invalid transaction signatures."))
        if not multisig:
            if not tx.is_complete():
                raise UserFacingException(_("OneKey returned invalid transaction signatures."))
            return
        for index, txin in enumerate(tx.inputs()):
            if already_complete[index]:
                continue
            pubkey, _path = keystore.find_my_pubkey_in_txinout(txin)
            if pubkey is None or txin.sigs_ecdsa.get(pubkey) != checked[index]:
                raise UserFacingException(_("OneKey returned invalid transaction signatures."))
            have, need = txin.get_satisfaction_progress()
            if have >= need and not txin.is_complete():
                raise UserFacingException(_("OneKey returned invalid transaction signatures."))

    @staticmethod
    def _signature(value):
        try:
            return parse_der_signature_hex(value, low_s=True)
        except ValueError:
            raise UserFacingException(_("Invalid OneKey signature encoding.")) from None

    @staticmethod
    def _previous_transaction(tx):
        return dict(hash=tx.txid(), version=tx.version, lock_time=tx.locktime,
                    inputs=[dict(prev_hash=i.prevout.txid.hex(), prev_index=i.prevout.out_idx,
                                 script_sig=(i.script_sig or b"").hex(), sequence=i.nsequence) for i in tx.inputs()],
                    bin_outputs=[dict(amount=str(o.value), script_pubkey=o.scriptpubkey.hex()) for o in tx.outputs()])

    def wizard_entry_for_device(self, device_info, *, new_wallet=True):
        if not device_info.initialized:
            return "onekey_not_initialized"
        return "onekey_start" if new_wallet else "onekey_unlock"

    def extend_wizard(self, wizard):
        wizard.navmap_merge({
            "onekey_start": {"next": "onekey_xpub"},
            "onekey_xpub": {
                "next": lambda d: wizard.wallet_password_view(d) if wizard.last_cosigner(d) else "multisig_cosigner_keystore",
                "accept": wizard.maybe_master_pubkey,
                "last": lambda d: wizard.is_single_password() and wizard.last_cosigner(d),
            },
            "onekey_not_initialized": {},
            "onekey_unlock": {"last": True},
        })
