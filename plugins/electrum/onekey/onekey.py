import copy

from electrum import descriptor
from electrum.bip32 import BIP32Node
from electrum.hw_wallet import HW_PluginBase
from electrum.hw_wallet.plugin import trezor_validate_op_return_output_and_get_data
from electrum.i18n import _
from electrum.keystore import Hardware_KeyStore
from electrum.plugin import Device, runs_in_hwd_thread
from electrum.transaction import PartialTransaction, PartialTxOutput, Sighash
from electrum.util import UserFacingException

from .ipc import Helper, HelperError, SDK_VERSION


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
        raise UserFacingException(_("Message signing is not supported by this OneKey plugin."))

    def sign_transaction(self, tx, password):
        if not tx.is_complete():
            self.plugin.sign_transaction(self, tx)


class OneKeyPlugin(HW_PluginBase):
    keystore_class = OneKeyKeyStore
    DEVICE_IDS = ("OneKey",)
    SUPPORTED_XTYPES = ("standard", "p2wpkh-p2sh", "p2wpkh")
    minimum_library = (1, 2, 10)
    maximum_library = (1, 2, 11)
    libraries_URL = "https://github.com/OneKeyHQ/hardware-js-sdk/tree/feat/electrum-plugin/plugins/electrum"

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
            self.helper.close()
            raise UserFacingException(str(error)) from None

    @runs_in_hwd_thread
    def create_client(self, device, handler):
        from .client import OneKeyClient
        return OneKeyClient(device.path, handler, self)

    @runs_in_hwd_thread
    def get_client(self, keystore, *args, **kwargs):
        previous = getattr(self, "_expected_keystore", None)
        self._expected_keystore = keystore
        self._sweep_unplugged()
        try:
            # DeviceMgr may request an xpub while pairing. Supply the saved wallet intent
            # before that callback, so reconnect cannot enter the wallet-selection flow.
            client = super().get_client(keystore, *args, **kwargs)
            if client is not None and not client.attached():
                # Cancel/IPC failure leaves Electrum's per-serial cache pointing at a dead client.
                client.close()
                client = super().get_client(keystore, *args, **kwargs)
            if client is not None and not client.attached():
                client.close()
                return None
            if client is not None:
                client.bind_keystore(keystore)
            return client
        finally:
            self._expected_keystore = previous

    @runs_in_hwd_thread
    def show_address(self, wallet, address, keystore=None):
        keystore = keystore or wallet.get_keystore()
        if not self.show_address_helper(wallet, address, keystore):
            return
        if wallet.txin_type not in ("p2pkh", "p2wpkh-p2sh", "p2wpkh"):
            raise UserFacingException(_("Only single-signature legacy and SegWit wallets are supported."))
        from .client import account_path
        path = account_path(keystore.get_derivation_prefix(), wallet.txin_type)
        suffix = list(wallet.get_address_index(address))
        pubkey = BIP32Node.from_xkey(keystore.xpub).subkey_at_public_derivation(suffix).eckey.get_public_key_bytes(compressed=True)
        script = descriptor.get_singlesig_descriptor_from_legacy_leaf(
            pubkey=pubkey.hex(), script_type=wallet.txin_type).expand().output_script
        expected = PartialTxOutput(scriptpubkey=script, value=0).address
        if expected != address:
            raise UserFacingException(_("Electrum address does not match the OneKey account."))
        self.get_client(keystore).show_address(path + suffix, wallet.txin_type, address)

    @staticmethod
    def _owned_path(keystore, item, script_type, *, change=False):
        from .client import account_path
        prefix = account_path(keystore.get_derivation_prefix(), script_type)
        if BIP32Node.from_xkey(keystore.xpub).xtype != {"p2pkh": "standard"}.get(script_type, script_type):
            raise UserFacingException(_("Script type does not match the OneKey account."))
        pubkey, path = keystore.find_my_pubkey_in_txinout(item)
        if (not path or len(path) != len(prefix) + 2 or list(path[:3]) != prefix
                or type(path[3]) is not int or path[3] not in (0, 1)
                or type(path[4]) is not int or not 0 <= path[4] < 0x80000000
                or (change and path[3] != 1)):
            raise UserFacingException(_("Input or change does not belong to this OneKey account."))
        derived = BIP32Node.from_xkey(keystore.xpub).subkey_at_public_derivation(path[3:]).eckey.get_public_key_bytes(compressed=True)
        if pubkey != derived:
            raise UserFacingException(_("OneKey account public key mismatch."))
        expected_script = descriptor.get_singlesig_descriptor_from_legacy_leaf(
            pubkey=derived.hex(), script_type=script_type).expand().output_script
        desc = item.script_descriptor
        if desc is None or desc.get_simple_multisig() or desc.expand().output_script != expected_script:
            raise UserFacingException(_("OneKey ownership script mismatch."))
        return list(path), expected_script

    @runs_in_hwd_thread
    def sign_transaction(self, keystore, tx: PartialTransaction):
        from .client import INPUT_SCRIPT_TYPES, OUTPUT_SCRIPT_TYPES
        inputs, previous = [], {}
        for txin in tx.inputs():
            desc = txin.script_descriptor
            if not txin.is_mine or desc is None or desc.get_simple_multisig():
                raise UserFacingException(_("Only single-signature inputs from this OneKey wallet are supported."))
            script_type = desc.to_legacy_electrum_script_type()
            if script_type not in OUTPUT_SCRIPT_TYPES:
                raise UserFacingException(_("Unsupported OneKey input script type."))
            if txin.sighash not in (None, Sighash.ALL):
                raise UserFacingException(_("OneKey requires SIGHASH_ALL."))
            path, script = self._owned_path(keystore, txin, script_type)
            prev = txin.utxo
            index = txin.prevout.out_idx
            if (prev is None or prev.txid() != txin.prevout.txid.hex()
                    or not 0 <= index < len(prev.outputs())
                    or prev.outputs()[index].scriptpubkey != script
                    or prev.outputs()[index].value != txin.value_sats()):
                raise UserFacingException(_("Missing or mismatched full previous transaction."))
            previous[txin.prevout.txid.hex()] = self._previous_transaction(prev)
            inputs.append(dict(prev_hash=txin.prevout.txid.hex(), prev_index=index,
                               amount=str(txin.value_sats()), sequence=txin.nsequence,
                               address_n=path, script_type=INPUT_SCRIPT_TYPES[script_type]))

        outputs = []
        for txout in tx.outputs():
            if txout.is_change:
                desc = txout.script_descriptor
                if not txout.is_mine or desc is None or desc.get_simple_multisig():
                    raise UserFacingException(_("Unsupported OneKey change script."))
                script_type = desc.to_legacy_electrum_script_type()
                if script_type not in OUTPUT_SCRIPT_TYPES:
                    raise UserFacingException(_("Unsupported OneKey change script."))
                path, script = self._owned_path(keystore, txout, script_type, change=True)
                if script != txout.scriptpubkey:
                    raise UserFacingException(_("OneKey change script does not match its derivation."))
                outputs.append(dict(amount=str(txout.value), address_n=path,
                                    script_type=OUTPUT_SCRIPT_TYPES[script_type]))
            elif txout.address:
                outputs.append(dict(amount=str(txout.value), address=txout.address, script_type="PAYTOADDRESS"))
            else:
                outputs.append(dict(amount=str(txout.value), script_type="PAYTOOPRETURN",
                                    op_return_data=trezor_validate_op_return_output_and_get_data(txout).hex()))

        client = self.get_client(keystore)
        try:
            signatures = client.sign_tx(
                inputs, outputs, previous, version=tx.version, lock_time=tx.locktime,
            )
            if type(signatures) is not list or len(signatures) != len(inputs):
                raise UserFacingException(_("OneKey did not sign all inputs."))
            checked = []
            for index, entry in enumerate(signatures):
                if (type(entry) is not dict or set(entry) != {"index", "signature"}
                        or type(entry["index"]) is not int or entry["index"] != index):
                    raise UserFacingException(_("Invalid OneKey signature index."))
                checked.append(self._signature(entry["signature"]) + Sighash.to_sigbytes(Sighash.ALL))
            # Electrum recovers/verifies against each ORIGINAL transaction input. Test a copy first
            # so a partial, reordered, or foreign signature cannot mutate the user's transaction.
            candidate = copy.deepcopy(tx)
            candidate.update_signatures(checked)
            if not candidate.is_complete():
                raise UserFacingException(_("OneKey returned invalid transaction signatures."))
            tx.update_signatures(checked)
            if not tx.is_complete():
                raise UserFacingException(_("OneKey returned invalid transaction signatures."))
        except BaseException:
            client.close()
            raise

    @staticmethod
    def _signature(value):
        if type(value) is not str or not 16 <= len(value) <= 144:
            raise UserFacingException(_("Invalid OneKey signature encoding."))
        try:
            signature = bytes.fromhex(value)
            if signature.hex() != value or signature[0] != 0x30 or signature[1] != len(signature) - 2:
                raise ValueError()
            offset = 2
            order = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141
            for i in range(2):
                if signature[offset] != 2:
                    raise ValueError()
                size = signature[offset + 1]
                offset += 2
                number = signature[offset:offset + size]
                if (not 1 <= size <= 33 or len(number) != size or number[0] & 0x80
                        or (size > 1 and number[0] == 0 and not number[1] & 0x80)
                        or not 0 < int.from_bytes(number, "big") < order
                        or (i == 1 and int.from_bytes(number, "big") > order // 2)):
                    raise ValueError()
                offset += size
            if offset != len(signature):
                raise ValueError()
            return signature
        except (ValueError, IndexError):
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
                "next": lambda d: wizard.wallet_password_view(d),
                "accept": wizard.maybe_master_pubkey,
                "last": lambda d: wizard.is_single_password(),
            },
            "onekey_not_initialized": {},
            "onekey_unlock": {"last": True},
        })
