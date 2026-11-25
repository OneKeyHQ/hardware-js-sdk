# This file is part of the OneKey Python library, derived from the Trezor project.
#
# Copyright (C) SatoshiLabs and contributors
# Modifications Copyright (C) OneKey
# Modifications Copyright (C) OneKey
#
# Licensed under the GNU Lesser General Public License version 3 (LGPL-3.0).

from enum import IntEnum
from typing import Sequence, Optional

from . import protobuf



class MessageType(IntEnum):
    Initialize = 0
    Ping = 1
    Success = 2
    Failure = 3
    WipeDevice = 5
    ResetDevice = 14
    Features = 17
    PinMatrixRequest = 18
    PinMatrixAck = 19
    Cancel = 20
    LockDevice = 24
    ButtonRequest = 26
    ButtonAck = 27
    ApplyFlags = 28
    PaymentRequest = 37
    PassphraseRequest = 41
    PassphraseAck = 42
    WordRequest = 46
    WordAck = 47
    GetFeatures = 55
    EndSession = 83
    DoPreauthorized = 84
    PreauthorizedRequest = 85
    UnlockPath = 93
    UnlockedPathRequest = 94
    GetPublicKey = 11
    PublicKey = 12
    SignTx = 15
    TxRequest = 21
    TxAck = 22
    GetAddress = 29
    Address = 30
    SignMessage = 38
    VerifyMessage = 39
    MessageSignature = 40
    GetOwnershipId = 43
    OwnershipId = 44
    GetOwnershipProof = 49
    OwnershipProof = 50
    AuthorizeCoinJoin = 51
    DebugLinkState = 102
    ProtocolInfoRequest = 60200
    ProtocolInfo = 60201
    V2Ping = 60206
    V2Success = 60207
    V2Failure = 60208
    DeviceInfoGet = 60600
    DeviceInfo = 60601
    DeviceStatusGet = 60602
    DeviceStatus = 60603
    DeviceSessionGet = 61200
    DeviceSession = 61201
    DeviceSessionAskPin = 61202
    DeviceSessionAskPassphrase = 61203

class FailureType(IntEnum):
    UnexpectedMessage = 1
    ButtonExpected = 2
    DataError = 3
    ActionCancelled = 4
    PinExpected = 5
    PinCancelled = 6
    PinInvalid = 7
    InvalidSignature = 8
    ProcessError = 9
    NotEnoughFunds = 10
    NotInitialized = 11
    PinMismatch = 12
    WipeCodeMismatch = 13
    InvalidSession = 14
    Busy = 15
    ThpUnallocatedSession = 16
    InvalidProtocol = 17
    InProgress = 19
    FirmwareError = 99

class ButtonRequestType(IntEnum):
    Other = 1
    FeeOverThreshold = 2
    ConfirmOutput = 3
    ResetDevice = 4
    ConfirmWord = 5
    WipeDevice = 6
    ProtectCall = 7
    SignTx = 8
    FirmwareCheck = 9
    Address = 10
    PublicKey = 11
    MnemonicWordCount = 12
    MnemonicInput = 13
    _Deprecated_ButtonRequest_PassphraseType = 14
    UnknownDerivationPath = 15
    RecoveryHomepage = 16
    Success = 17
    Warning = 18
    PassphraseEntry = 19
    PinEntry = 20

class PinMatrixRequestType(IntEnum):
    Current = 1
    NewFirst = 2
    NewSecond = 3
    WipeCodeFirst = 4
    WipeCodeSecond = 5

class InputScriptType(IntEnum):
    SPENDADDRESS = 0
    SPENDMULTISIG = 1
    EXTERNAL = 2
    SPENDWITNESS = 3
    SPENDP2SHWITNESS = 4
    SPENDTAPROOT = 5

class OutputScriptType(IntEnum):
    PAYTOADDRESS = 0
    PAYTOSCRIPTHASH = 1
    PAYTOMULTISIG = 2
    PAYTOOPRETURN = 3
    PAYTOWITNESS = 4
    PAYTOP2SHWITNESS = 5
    PAYTOTAPROOT = 6

class DecredStakingSpendType(IntEnum):
    SSGen = 0
    SSRTX = 1

class AmountUnit(IntEnum):
    BITCOIN = 0
    MILLIBITCOIN = 1
    MICROBITCOIN = 2
    SATOSHI = 3

class MultisigPubkeysOrder(IntEnum):
    PRESERVED = 0
    LEXICOGRAPHIC = 1

class RequestType(IntEnum):
    TXINPUT = 0
    TXOUTPUT = 1
    TXMETA = 2
    TXFINISHED = 3
    TXEXTRADATA = 4
    TXORIGINPUT = 5
    TXORIGOUTPUT = 6
    TXPAYMENTREQ = 7

class BackupType(IntEnum):
    Bip39 = 0
    Slip39_Basic = 1
    Slip39_Advanced = 2
    Slip39_Single_Extendable = 3
    Slip39_Basic_Extendable = 4
    Slip39_Advanced_Extendable = 5

class BackupMethod(IntEnum):
    Display = 0
    N4W1 = 1

class SafetyCheckLevel(IntEnum):
    Strict = 0
    PromptAlways = 1
    PromptTemporarily = 2

class DisplayRotation(IntEnum):
    North = 0
    East = 90
    South = 180
    West = 270

class HomescreenFormat(IntEnum):
    Toif = 1
    Jpeg = 2
    ToiG = 3

class RecoveryType(IntEnum):
    NormalRecovery = 0
    DryRun = 1
    UnlockRepeatedBackup = 2

class BackupAvailability(IntEnum):
    NotAvailable = 0
    Required = 1
    Available = 2

class RecoveryStatus(IntEnum):
    Nothing = 0
    Recovery = 1
    Backup = 2

class Capability(IntEnum):
    Bitcoin = 1
    Bitcoin_like = 2
    Binance = 3
    Cardano = 4
    Crypto = 5
    EOS = 6
    Ethereum = 7
    Lisk = 8
    Monero = 9
    NEM = 10
    Ripple = 11
    Stellar = 12
    Tezos = 13
    U2F = 14
    Shamir = 15
    ShamirGroups = 16
    PassphraseEntry = 17
    Solana = 18
    Translations = 19
    Brightness = 20
    Haptic = 21
    BLE = 22
    NFC = 23
    Tron = 24
    N4W1 = 25
    TouchWakeup = 26

class WordRequestType(IntEnum):
    Plain = 0
    Matrix9 = 1
    Matrix6 = 2

class Success(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 2
    FIELDS = {
        1: protobuf.Field("message", "string", repeated=False, required=False, default=''),
    }

    def __init__(
        self,
        *,
        message: Optional["str"] = '',
    ) -> None:
        self.message = message

class Failure(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 3
    FIELDS = {
        1: protobuf.Field("code", "FailureType", repeated=False, required=False, default=None),
        2: protobuf.Field("message", "string", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        code: Optional["FailureType"] = None,
        message: Optional["str"] = None,
    ) -> None:
        self.code = code
        self.message = message

class ButtonRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 26
    FIELDS = {
        1: protobuf.Field("code", "ButtonRequestType", repeated=False, required=False, default=None),
        2: protobuf.Field("pages", "uint32", repeated=False, required=False, default=None),
        4: protobuf.Field("name", "string", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        code: Optional["ButtonRequestType"] = None,
        pages: Optional["int"] = None,
        name: Optional["str"] = None,
    ) -> None:
        self.code = code
        self.pages = pages
        self.name = name

class ButtonAck(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 27

class PinMatrixRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 18
    FIELDS = {
        1: protobuf.Field("type", "PinMatrixRequestType", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        type: Optional["PinMatrixRequestType"] = None,
    ) -> None:
        self.type = type

class PinMatrixAck(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 19
    FIELDS = {
        1: protobuf.Field("pin", "string", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        pin: "str",
    ) -> None:
        self.pin = pin

class PassphraseRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 41

class PassphraseAck(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 42
    FIELDS = {
        1: protobuf.Field("passphrase", "string", repeated=False, required=False, default=None),
        3: protobuf.Field("on_device", "bool", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        passphrase: Optional["str"] = None,
        on_device: Optional["bool"] = None,
    ) -> None:
        self.passphrase = passphrase
        self.on_device = on_device

class HDNodeType(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("depth", "uint32", repeated=False, required=True),
        2: protobuf.Field("fingerprint", "uint32", repeated=False, required=True),
        3: protobuf.Field("child_num", "uint32", repeated=False, required=True),
        4: protobuf.Field("chain_code", "bytes", repeated=False, required=True),
        5: protobuf.Field("private_key", "bytes", repeated=False, required=False, default=None),
        6: protobuf.Field("public_key", "bytes", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        depth: "int",
        fingerprint: "int",
        child_num: "int",
        chain_code: "bytes",
        public_key: "bytes",
        private_key: Optional["bytes"] = None,
    ) -> None:
        self.depth = depth
        self.fingerprint = fingerprint
        self.child_num = child_num
        self.chain_code = chain_code
        self.public_key = public_key
        self.private_key = private_key

class PaymentRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 37
    FIELDS = {
        1: protobuf.Field("nonce", "bytes", repeated=False, required=False, default=None),
        2: protobuf.Field("recipient_name", "string", repeated=False, required=True),
        3: protobuf.Field("memos", "PaymentRequestMemo", repeated=True, required=False, default=None),
        6: protobuf.Field("amount", "bytes", repeated=False, required=False, default=None),
        5: protobuf.Field("signature", "bytes", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        recipient_name: "str",
        signature: "bytes",
        memos: Optional[Sequence["PaymentRequestMemo"]] = None,
        nonce: Optional["bytes"] = None,
        amount: Optional["bytes"] = None,
    ) -> None:
        self.memos: Sequence["PaymentRequestMemo"] = memos if memos is not None else []
        self.recipient_name = recipient_name
        self.signature = signature
        self.nonce = nonce
        self.amount = amount

class PaymentRequestMemo(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("text_memo", "TextMemo", repeated=False, required=False, default=None),
        2: protobuf.Field("refund_memo", "RefundMemo", repeated=False, required=False, default=None),
        3: protobuf.Field("coin_purchase_memo", "CoinPurchaseMemo", repeated=False, required=False, default=None),
        4: protobuf.Field("text_details_memo", "TextDetailsMemo", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        text_memo: Optional["TextMemo"] = None,
        refund_memo: Optional["RefundMemo"] = None,
        coin_purchase_memo: Optional["CoinPurchaseMemo"] = None,
        text_details_memo: Optional["TextDetailsMemo"] = None,
    ) -> None:
        self.text_memo = text_memo
        self.refund_memo = refund_memo
        self.coin_purchase_memo = coin_purchase_memo
        self.text_details_memo = text_details_memo

class TextMemo(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("text", "string", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        text: "str",
    ) -> None:
        self.text = text

class TextDetailsMemo(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("title", "string", repeated=False, required=True),
        2: protobuf.Field("text", "string", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        title: "str",
        text: "str",
    ) -> None:
        self.title = title
        self.text = text

class RefundMemo(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("address", "string", repeated=False, required=True),
        2: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        3: protobuf.Field("mac", "bytes", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        address: "str",
        mac: "bytes",
        address_n: Optional[Sequence["int"]] = None,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.address = address
        self.mac = mac

class CoinPurchaseMemo(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("coin_type", "uint32", repeated=False, required=True),
        2: protobuf.Field("amount", "string", repeated=False, required=True),
        3: protobuf.Field("address", "string", repeated=False, required=True),
        4: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        5: protobuf.Field("mac", "bytes", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        coin_type: "int",
        amount: "str",
        address: "str",
        mac: "bytes",
        address_n: Optional[Sequence["int"]] = None,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.coin_type = coin_type
        self.amount = amount
        self.address = address
        self.mac = mac

class MultisigRedeemScriptType(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("pubkeys", "HDNodePathType", repeated=True, required=False, default=None),
        2: protobuf.Field("signatures", "bytes", repeated=True, required=False, default=None),
        3: protobuf.Field("m", "uint32", repeated=False, required=True),
        4: protobuf.Field("nodes", "HDNodeType", repeated=True, required=False, default=None),
        5: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        6: protobuf.Field("pubkeys_order", "MultisigPubkeysOrder", repeated=False, required=False, default=MultisigPubkeysOrder.PRESERVED),
    }

    def __init__(
        self,
        *,
        m: "int",
        pubkeys: Optional[Sequence["HDNodePathType"]] = None,
        signatures: Optional[Sequence["bytes"]] = None,
        nodes: Optional[Sequence["HDNodeType"]] = None,
        address_n: Optional[Sequence["int"]] = None,
        pubkeys_order: Optional["MultisigPubkeysOrder"] = MultisigPubkeysOrder.PRESERVED,
    ) -> None:
        self.pubkeys: Sequence["HDNodePathType"] = pubkeys if pubkeys is not None else []
        self.signatures: Sequence["bytes"] = signatures if signatures is not None else []
        self.nodes: Sequence["HDNodeType"] = nodes if nodes is not None else []
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.m = m
        self.pubkeys_order = pubkeys_order

class GetPublicKey(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 11
    FIELDS = {
        1: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        2: protobuf.Field("ecdsa_curve_name", "string", repeated=False, required=False, default=None),
        3: protobuf.Field("show_display", "bool", repeated=False, required=False, default=None),
        4: protobuf.Field("coin_name", "string", repeated=False, required=False, default='Bitcoin'),
        5: protobuf.Field("script_type", "InputScriptType", repeated=False, required=False, default=InputScriptType.SPENDADDRESS),
        6: protobuf.Field("ignore_xpub_magic", "bool", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        address_n: Optional[Sequence["int"]] = None,
        ecdsa_curve_name: Optional["str"] = None,
        show_display: Optional["bool"] = None,
        coin_name: Optional["str"] = 'Bitcoin',
        script_type: Optional["InputScriptType"] = InputScriptType.SPENDADDRESS,
        ignore_xpub_magic: Optional["bool"] = None,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.ecdsa_curve_name = ecdsa_curve_name
        self.show_display = show_display
        self.coin_name = coin_name
        self.script_type = script_type
        self.ignore_xpub_magic = ignore_xpub_magic

class PublicKey(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 12
    FIELDS = {
        1: protobuf.Field("node", "HDNodeType", repeated=False, required=True),
        2: protobuf.Field("xpub", "string", repeated=False, required=True),
        3: protobuf.Field("root_fingerprint", "uint32", repeated=False, required=False, default=None),
        4: protobuf.Field("descriptor", "string", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        node: "HDNodeType",
        xpub: "str",
        root_fingerprint: Optional["int"] = None,
        descriptor: Optional["str"] = None,
    ) -> None:
        self.node = node
        self.xpub = xpub
        self.root_fingerprint = root_fingerprint
        self.descriptor = descriptor

class GetAddress(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 29
    FIELDS = {
        1: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        2: protobuf.Field("coin_name", "string", repeated=False, required=False, default='Bitcoin'),
        3: protobuf.Field("show_display", "bool", repeated=False, required=False, default=None),
        4: protobuf.Field("multisig", "MultisigRedeemScriptType", repeated=False, required=False, default=None),
        5: protobuf.Field("script_type", "InputScriptType", repeated=False, required=False, default=InputScriptType.SPENDADDRESS),
        6: protobuf.Field("ignore_xpub_magic", "bool", repeated=False, required=False, default=None),
        7: protobuf.Field("chunkify", "bool", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        address_n: Optional[Sequence["int"]] = None,
        coin_name: Optional["str"] = 'Bitcoin',
        show_display: Optional["bool"] = None,
        multisig: Optional["MultisigRedeemScriptType"] = None,
        script_type: Optional["InputScriptType"] = InputScriptType.SPENDADDRESS,
        ignore_xpub_magic: Optional["bool"] = None,
        chunkify: Optional["bool"] = None,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.coin_name = coin_name
        self.show_display = show_display
        self.multisig = multisig
        self.script_type = script_type
        self.ignore_xpub_magic = ignore_xpub_magic
        self.chunkify = chunkify

class Address(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 30
    FIELDS = {
        1: protobuf.Field("address", "string", repeated=False, required=True),
        2: protobuf.Field("mac", "bytes", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        address: "str",
        mac: Optional["bytes"] = None,
    ) -> None:
        self.address = address
        self.mac = mac

class GetOwnershipId(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 43
    FIELDS = {
        1: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        2: protobuf.Field("coin_name", "string", repeated=False, required=False, default='Bitcoin'),
        3: protobuf.Field("multisig", "MultisigRedeemScriptType", repeated=False, required=False, default=None),
        4: protobuf.Field("script_type", "InputScriptType", repeated=False, required=False, default=InputScriptType.SPENDADDRESS),
    }

    def __init__(
        self,
        *,
        address_n: Optional[Sequence["int"]] = None,
        coin_name: Optional["str"] = 'Bitcoin',
        multisig: Optional["MultisigRedeemScriptType"] = None,
        script_type: Optional["InputScriptType"] = InputScriptType.SPENDADDRESS,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.coin_name = coin_name
        self.multisig = multisig
        self.script_type = script_type

class OwnershipId(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 44
    FIELDS = {
        1: protobuf.Field("ownership_id", "bytes", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        ownership_id: "bytes",
    ) -> None:
        self.ownership_id = ownership_id

class SignMessage(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 38
    FIELDS = {
        1: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        2: protobuf.Field("message", "bytes", repeated=False, required=True),
        3: protobuf.Field("coin_name", "string", repeated=False, required=False, default='Bitcoin'),
        4: protobuf.Field("script_type", "InputScriptType", repeated=False, required=False, default=InputScriptType.SPENDADDRESS),
        5: protobuf.Field("no_script_type", "bool", repeated=False, required=False, default=None),
        6: protobuf.Field("chunkify", "bool", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        message: "bytes",
        address_n: Optional[Sequence["int"]] = None,
        coin_name: Optional["str"] = 'Bitcoin',
        script_type: Optional["InputScriptType"] = InputScriptType.SPENDADDRESS,
        no_script_type: Optional["bool"] = None,
        chunkify: Optional["bool"] = None,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.message = message
        self.coin_name = coin_name
        self.script_type = script_type
        self.no_script_type = no_script_type
        self.chunkify = chunkify

class MessageSignature(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 40
    FIELDS = {
        1: protobuf.Field("address", "string", repeated=False, required=True),
        2: protobuf.Field("signature", "bytes", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        address: "str",
        signature: "bytes",
    ) -> None:
        self.address = address
        self.signature = signature

class VerifyMessage(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 39
    FIELDS = {
        1: protobuf.Field("address", "string", repeated=False, required=True),
        2: protobuf.Field("signature", "bytes", repeated=False, required=True),
        3: protobuf.Field("message", "bytes", repeated=False, required=True),
        4: protobuf.Field("coin_name", "string", repeated=False, required=False, default='Bitcoin'),
        5: protobuf.Field("chunkify", "bool", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        address: "str",
        signature: "bytes",
        message: "bytes",
        coin_name: Optional["str"] = 'Bitcoin',
        chunkify: Optional["bool"] = None,
    ) -> None:
        self.address = address
        self.signature = signature
        self.message = message
        self.coin_name = coin_name
        self.chunkify = chunkify

class SignTx(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 15
    FIELDS = {
        1: protobuf.Field("outputs_count", "uint32", repeated=False, required=True),
        2: protobuf.Field("inputs_count", "uint32", repeated=False, required=True),
        3: protobuf.Field("coin_name", "string", repeated=False, required=False, default='Bitcoin'),
        4: protobuf.Field("version", "uint32", repeated=False, required=False, default=1),
        5: protobuf.Field("lock_time", "uint32", repeated=False, required=False, default=0),
        6: protobuf.Field("expiry", "uint32", repeated=False, required=False, default=None),
        7: protobuf.Field("overwintered", "bool", repeated=False, required=False, default=None),
        8: protobuf.Field("version_group_id", "uint32", repeated=False, required=False, default=None),
        9: protobuf.Field("timestamp", "uint32", repeated=False, required=False, default=None),
        10: protobuf.Field("branch_id", "uint32", repeated=False, required=False, default=None),
        11: protobuf.Field("amount_unit", "AmountUnit", repeated=False, required=False, default=AmountUnit.BITCOIN),
        12: protobuf.Field("decred_staking_ticket", "bool", repeated=False, required=False, default=False),
        13: protobuf.Field("serialize", "bool", repeated=False, required=False, default=True),
        14: protobuf.Field("coinjoin_request", "CoinJoinRequest", repeated=False, required=False, default=None),
        15: protobuf.Field("chunkify", "bool", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        outputs_count: "int",
        inputs_count: "int",
        coin_name: Optional["str"] = 'Bitcoin',
        version: Optional["int"] = 1,
        lock_time: Optional["int"] = 0,
        expiry: Optional["int"] = None,
        overwintered: Optional["bool"] = None,
        version_group_id: Optional["int"] = None,
        timestamp: Optional["int"] = None,
        branch_id: Optional["int"] = None,
        amount_unit: Optional["AmountUnit"] = AmountUnit.BITCOIN,
        decred_staking_ticket: Optional["bool"] = False,
        serialize: Optional["bool"] = True,
        coinjoin_request: Optional["CoinJoinRequest"] = None,
        chunkify: Optional["bool"] = None,
    ) -> None:
        self.outputs_count = outputs_count
        self.inputs_count = inputs_count
        self.coin_name = coin_name
        self.version = version
        self.lock_time = lock_time
        self.expiry = expiry
        self.overwintered = overwintered
        self.version_group_id = version_group_id
        self.timestamp = timestamp
        self.branch_id = branch_id
        self.amount_unit = amount_unit
        self.decred_staking_ticket = decred_staking_ticket
        self.serialize = serialize
        self.coinjoin_request = coinjoin_request
        self.chunkify = chunkify

class TxRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 21
    FIELDS = {
        1: protobuf.Field("request_type", "RequestType", repeated=False, required=False, default=None),
        2: protobuf.Field("details", "TxRequestDetailsType", repeated=False, required=False, default=None),
        3: protobuf.Field("serialized", "TxRequestSerializedType", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        request_type: Optional["RequestType"] = None,
        details: Optional["TxRequestDetailsType"] = None,
        serialized: Optional["TxRequestSerializedType"] = None,
    ) -> None:
        self.request_type = request_type
        self.details = details
        self.serialized = serialized

class TxAck(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 22
    FIELDS = {
        1: protobuf.Field("tx", "TransactionType", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        tx: Optional["TransactionType"] = None,
    ) -> None:
        self.tx = tx

class TxInput(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        2: protobuf.Field("prev_hash", "bytes", repeated=False, required=True),
        3: protobuf.Field("prev_index", "uint32", repeated=False, required=True),
        4: protobuf.Field("script_sig", "bytes", repeated=False, required=False, default=None),
        5: protobuf.Field("sequence", "uint32", repeated=False, required=False, default=4294967295),
        6: protobuf.Field("script_type", "InputScriptType", repeated=False, required=False, default=InputScriptType.SPENDADDRESS),
        7: protobuf.Field("multisig", "MultisigRedeemScriptType", repeated=False, required=False, default=None),
        8: protobuf.Field("amount", "uint64", repeated=False, required=True),
        9: protobuf.Field("decred_tree", "uint32", repeated=False, required=False, default=None),
        13: protobuf.Field("witness", "bytes", repeated=False, required=False, default=None),
        14: protobuf.Field("ownership_proof", "bytes", repeated=False, required=False, default=None),
        15: protobuf.Field("commitment_data", "bytes", repeated=False, required=False, default=None),
        16: protobuf.Field("orig_hash", "bytes", repeated=False, required=False, default=None),
        17: protobuf.Field("orig_index", "uint32", repeated=False, required=False, default=None),
        18: protobuf.Field("decred_staking_spend", "DecredStakingSpendType", repeated=False, required=False, default=None),
        19: protobuf.Field("script_pubkey", "bytes", repeated=False, required=False, default=None),
        20: protobuf.Field("coinjoin_flags", "uint32", repeated=False, required=False, default=0),
    }

    def __init__(
        self,
        *,
        prev_hash: "bytes",
        prev_index: "int",
        amount: "int",
        address_n: Optional[Sequence["int"]] = None,
        script_sig: Optional["bytes"] = None,
        sequence: Optional["int"] = 4294967295,
        script_type: Optional["InputScriptType"] = InputScriptType.SPENDADDRESS,
        multisig: Optional["MultisigRedeemScriptType"] = None,
        decred_tree: Optional["int"] = None,
        witness: Optional["bytes"] = None,
        ownership_proof: Optional["bytes"] = None,
        commitment_data: Optional["bytes"] = None,
        orig_hash: Optional["bytes"] = None,
        orig_index: Optional["int"] = None,
        decred_staking_spend: Optional["DecredStakingSpendType"] = None,
        script_pubkey: Optional["bytes"] = None,
        coinjoin_flags: Optional["int"] = 0,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.prev_hash = prev_hash
        self.prev_index = prev_index
        self.amount = amount
        self.script_sig = script_sig
        self.sequence = sequence
        self.script_type = script_type
        self.multisig = multisig
        self.decred_tree = decred_tree
        self.witness = witness
        self.ownership_proof = ownership_proof
        self.commitment_data = commitment_data
        self.orig_hash = orig_hash
        self.orig_index = orig_index
        self.decred_staking_spend = decred_staking_spend
        self.script_pubkey = script_pubkey
        self.coinjoin_flags = coinjoin_flags

class TxOutput(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("address", "string", repeated=False, required=False, default=None),
        2: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        3: protobuf.Field("amount", "uint64", repeated=False, required=True),
        4: protobuf.Field("script_type", "OutputScriptType", repeated=False, required=False, default=OutputScriptType.PAYTOADDRESS),
        5: protobuf.Field("multisig", "MultisigRedeemScriptType", repeated=False, required=False, default=None),
        6: protobuf.Field("op_return_data", "bytes", repeated=False, required=False, default=None),
        10: protobuf.Field("orig_hash", "bytes", repeated=False, required=False, default=None),
        11: protobuf.Field("orig_index", "uint32", repeated=False, required=False, default=None),
        12: protobuf.Field("payment_req_index", "uint32", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        amount: "int",
        address_n: Optional[Sequence["int"]] = None,
        address: Optional["str"] = None,
        script_type: Optional["OutputScriptType"] = OutputScriptType.PAYTOADDRESS,
        multisig: Optional["MultisigRedeemScriptType"] = None,
        op_return_data: Optional["bytes"] = None,
        orig_hash: Optional["bytes"] = None,
        orig_index: Optional["int"] = None,
        payment_req_index: Optional["int"] = None,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.amount = amount
        self.address = address
        self.script_type = script_type
        self.multisig = multisig
        self.op_return_data = op_return_data
        self.orig_hash = orig_hash
        self.orig_index = orig_index
        self.payment_req_index = payment_req_index

class PrevTx(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("version", "uint32", repeated=False, required=True),
        4: protobuf.Field("lock_time", "uint32", repeated=False, required=True),
        6: protobuf.Field("inputs_count", "uint32", repeated=False, required=True),
        7: protobuf.Field("outputs_count", "uint32", repeated=False, required=True),
        9: protobuf.Field("extra_data_len", "uint32", repeated=False, required=False, default=0),
        10: protobuf.Field("expiry", "uint32", repeated=False, required=False, default=None),
        12: protobuf.Field("version_group_id", "uint32", repeated=False, required=False, default=None),
        13: protobuf.Field("timestamp", "uint32", repeated=False, required=False, default=None),
        14: protobuf.Field("branch_id", "uint32", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        version: "int",
        lock_time: "int",
        inputs_count: "int",
        outputs_count: "int",
        extra_data_len: Optional["int"] = 0,
        expiry: Optional["int"] = None,
        version_group_id: Optional["int"] = None,
        timestamp: Optional["int"] = None,
        branch_id: Optional["int"] = None,
    ) -> None:
        self.version = version
        self.lock_time = lock_time
        self.inputs_count = inputs_count
        self.outputs_count = outputs_count
        self.extra_data_len = extra_data_len
        self.expiry = expiry
        self.version_group_id = version_group_id
        self.timestamp = timestamp
        self.branch_id = branch_id

class PrevInput(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        2: protobuf.Field("prev_hash", "bytes", repeated=False, required=True),
        3: protobuf.Field("prev_index", "uint32", repeated=False, required=True),
        4: protobuf.Field("script_sig", "bytes", repeated=False, required=True),
        5: protobuf.Field("sequence", "uint32", repeated=False, required=True),
        9: protobuf.Field("decred_tree", "uint32", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        prev_hash: "bytes",
        prev_index: "int",
        script_sig: "bytes",
        sequence: "int",
        decred_tree: Optional["int"] = None,
    ) -> None:
        self.prev_hash = prev_hash
        self.prev_index = prev_index
        self.script_sig = script_sig
        self.sequence = sequence
        self.decred_tree = decred_tree

class PrevOutput(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("amount", "uint64", repeated=False, required=True),
        2: protobuf.Field("script_pubkey", "bytes", repeated=False, required=True),
        3: protobuf.Field("decred_script_version", "uint32", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        amount: "int",
        script_pubkey: "bytes",
        decred_script_version: Optional["int"] = None,
    ) -> None:
        self.amount = amount
        self.script_pubkey = script_pubkey
        self.decred_script_version = decred_script_version

class TxAckInput(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 22
    FIELDS = {
        1: protobuf.Field("tx", "TxAckInputWrapper", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        tx: "TxAckInputWrapper",
    ) -> None:
        self.tx = tx

class TxAckOutput(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 22
    FIELDS = {
        1: protobuf.Field("tx", "TxAckOutputWrapper", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        tx: "TxAckOutputWrapper",
    ) -> None:
        self.tx = tx

class TxAckPrevMeta(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 22
    FIELDS = {
        1: protobuf.Field("tx", "PrevTx", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        tx: "PrevTx",
    ) -> None:
        self.tx = tx

class TxAckPrevInput(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 22
    FIELDS = {
        1: protobuf.Field("tx", "TxAckPrevInputWrapper", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        tx: "TxAckPrevInputWrapper",
    ) -> None:
        self.tx = tx

class TxAckPrevOutput(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 22
    FIELDS = {
        1: protobuf.Field("tx", "TxAckPrevOutputWrapper", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        tx: "TxAckPrevOutputWrapper",
    ) -> None:
        self.tx = tx

class TxAckPrevExtraData(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 22
    FIELDS = {
        1: protobuf.Field("tx", "TxAckPrevExtraDataWrapper", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        tx: "TxAckPrevExtraDataWrapper",
    ) -> None:
        self.tx = tx

class GetOwnershipProof(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 49
    FIELDS = {
        1: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        2: protobuf.Field("coin_name", "string", repeated=False, required=False, default='Bitcoin'),
        3: protobuf.Field("script_type", "InputScriptType", repeated=False, required=False, default=InputScriptType.SPENDWITNESS),
        4: protobuf.Field("multisig", "MultisigRedeemScriptType", repeated=False, required=False, default=None),
        5: protobuf.Field("user_confirmation", "bool", repeated=False, required=False, default=False),
        6: protobuf.Field("ownership_ids", "bytes", repeated=True, required=False, default=None),
        7: protobuf.Field("commitment_data", "bytes", repeated=False, required=False, default=b''),
    }

    def __init__(
        self,
        *,
        address_n: Optional[Sequence["int"]] = None,
        ownership_ids: Optional[Sequence["bytes"]] = None,
        coin_name: Optional["str"] = 'Bitcoin',
        script_type: Optional["InputScriptType"] = InputScriptType.SPENDWITNESS,
        multisig: Optional["MultisigRedeemScriptType"] = None,
        user_confirmation: Optional["bool"] = False,
        commitment_data: Optional["bytes"] = b'',
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.ownership_ids: Sequence["bytes"] = ownership_ids if ownership_ids is not None else []
        self.coin_name = coin_name
        self.script_type = script_type
        self.multisig = multisig
        self.user_confirmation = user_confirmation
        self.commitment_data = commitment_data

class OwnershipProof(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 50
    FIELDS = {
        1: protobuf.Field("ownership_proof", "bytes", repeated=False, required=True),
        2: protobuf.Field("signature", "bytes", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        ownership_proof: "bytes",
        signature: "bytes",
    ) -> None:
        self.ownership_proof = ownership_proof
        self.signature = signature

class AuthorizeCoinJoin(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 51
    FIELDS = {
        1: protobuf.Field("coordinator", "string", repeated=False, required=True),
        2: protobuf.Field("max_rounds", "uint64", repeated=False, required=True),
        3: protobuf.Field("max_coordinator_fee_rate", "uint32", repeated=False, required=True),
        4: protobuf.Field("max_fee_per_kvbyte", "uint32", repeated=False, required=True),
        5: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        6: protobuf.Field("coin_name", "string", repeated=False, required=False, default='Bitcoin'),
        7: protobuf.Field("script_type", "InputScriptType", repeated=False, required=False, default=InputScriptType.SPENDADDRESS),
        8: protobuf.Field("amount_unit", "AmountUnit", repeated=False, required=False, default=AmountUnit.BITCOIN),
    }

    def __init__(
        self,
        *,
        coordinator: "str",
        max_rounds: "int",
        max_coordinator_fee_rate: "int",
        max_fee_per_kvbyte: "int",
        address_n: Optional[Sequence["int"]] = None,
        coin_name: Optional["str"] = 'Bitcoin',
        script_type: Optional["InputScriptType"] = InputScriptType.SPENDADDRESS,
        amount_unit: Optional["AmountUnit"] = AmountUnit.BITCOIN,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.coordinator = coordinator
        self.max_rounds = max_rounds
        self.max_coordinator_fee_rate = max_coordinator_fee_rate
        self.max_fee_per_kvbyte = max_fee_per_kvbyte
        self.coin_name = coin_name
        self.script_type = script_type
        self.amount_unit = amount_unit

class HDNodePathType(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("node", "HDNodeType", repeated=False, required=True),
        2: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
    }

    def __init__(
        self,
        *,
        node: "HDNodeType",
        address_n: Optional[Sequence["int"]] = None,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.node = node

class CoinJoinRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("fee_rate", "uint32", repeated=False, required=True),
        2: protobuf.Field("no_fee_threshold", "uint64", repeated=False, required=True),
        3: protobuf.Field("min_registrable_amount", "uint64", repeated=False, required=True),
        4: protobuf.Field("mask_public_key", "bytes", repeated=False, required=False, default=None),
        5: protobuf.Field("signature", "bytes", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        fee_rate: "int",
        no_fee_threshold: "int",
        min_registrable_amount: "int",
        mask_public_key: Optional["bytes"] = None,
        signature: Optional["bytes"] = None,
    ) -> None:
        self.fee_rate = fee_rate
        self.no_fee_threshold = no_fee_threshold
        self.min_registrable_amount = min_registrable_amount
        self.mask_public_key = mask_public_key
        self.signature = signature

class TxRequestDetailsType(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("request_index", "uint32", repeated=False, required=False, default=None),
        2: protobuf.Field("tx_hash", "bytes", repeated=False, required=False, default=None),
        3: protobuf.Field("extra_data_len", "uint32", repeated=False, required=False, default=None),
        4: protobuf.Field("extra_data_offset", "uint32", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        request_index: Optional["int"] = None,
        tx_hash: Optional["bytes"] = None,
        extra_data_len: Optional["int"] = None,
        extra_data_offset: Optional["int"] = None,
    ) -> None:
        self.request_index = request_index
        self.tx_hash = tx_hash
        self.extra_data_len = extra_data_len
        self.extra_data_offset = extra_data_offset

class TxRequestSerializedType(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("signature_index", "uint32", repeated=False, required=False, default=None),
        2: protobuf.Field("signature", "bytes", repeated=False, required=False, default=None),
        3: protobuf.Field("serialized_tx", "bytes", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        signature_index: Optional["int"] = None,
        signature: Optional["bytes"] = None,
        serialized_tx: Optional["bytes"] = None,
    ) -> None:
        self.signature_index = signature_index
        self.signature = signature
        self.serialized_tx = serialized_tx

class TransactionType(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("version", "uint32", repeated=False, required=False, default=None),
        2: protobuf.Field("inputs", "TxInputType", repeated=True, required=False, default=None),
        3: protobuf.Field("bin_outputs", "TxOutputBinType", repeated=True, required=False, default=None),
        4: protobuf.Field("lock_time", "uint32", repeated=False, required=False, default=None),
        5: protobuf.Field("outputs", "TxOutputType", repeated=True, required=False, default=None),
        6: protobuf.Field("inputs_cnt", "uint32", repeated=False, required=False, default=None),
        7: protobuf.Field("outputs_cnt", "uint32", repeated=False, required=False, default=None),
        8: protobuf.Field("extra_data", "bytes", repeated=False, required=False, default=None),
        9: protobuf.Field("extra_data_len", "uint32", repeated=False, required=False, default=None),
        10: protobuf.Field("expiry", "uint32", repeated=False, required=False, default=None),
        11: protobuf.Field("overwintered", "bool", repeated=False, required=False, default=None),
        12: protobuf.Field("version_group_id", "uint32", repeated=False, required=False, default=None),
        13: protobuf.Field("timestamp", "uint32", repeated=False, required=False, default=None),
        14: protobuf.Field("branch_id", "uint32", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        inputs: Optional[Sequence["TxInputType"]] = None,
        bin_outputs: Optional[Sequence["TxOutputBinType"]] = None,
        outputs: Optional[Sequence["TxOutputType"]] = None,
        version: Optional["int"] = None,
        lock_time: Optional["int"] = None,
        inputs_cnt: Optional["int"] = None,
        outputs_cnt: Optional["int"] = None,
        extra_data: Optional["bytes"] = None,
        extra_data_len: Optional["int"] = None,
        expiry: Optional["int"] = None,
        overwintered: Optional["bool"] = None,
        version_group_id: Optional["int"] = None,
        timestamp: Optional["int"] = None,
        branch_id: Optional["int"] = None,
    ) -> None:
        self.inputs: Sequence["TxInputType"] = inputs if inputs is not None else []
        self.bin_outputs: Sequence["TxOutputBinType"] = bin_outputs if bin_outputs is not None else []
        self.outputs: Sequence["TxOutputType"] = outputs if outputs is not None else []
        self.version = version
        self.lock_time = lock_time
        self.inputs_cnt = inputs_cnt
        self.outputs_cnt = outputs_cnt
        self.extra_data = extra_data
        self.extra_data_len = extra_data_len
        self.expiry = expiry
        self.overwintered = overwintered
        self.version_group_id = version_group_id
        self.timestamp = timestamp
        self.branch_id = branch_id

class TxInputType(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        2: protobuf.Field("prev_hash", "bytes", repeated=False, required=True),
        3: protobuf.Field("prev_index", "uint32", repeated=False, required=True),
        4: protobuf.Field("script_sig", "bytes", repeated=False, required=False, default=None),
        5: protobuf.Field("sequence", "uint32", repeated=False, required=False, default=4294967295),
        6: protobuf.Field("script_type", "InputScriptType", repeated=False, required=False, default=InputScriptType.SPENDADDRESS),
        7: protobuf.Field("multisig", "MultisigRedeemScriptType", repeated=False, required=False, default=None),
        8: protobuf.Field("amount", "uint64", repeated=False, required=False, default=None),
        9: protobuf.Field("decred_tree", "uint32", repeated=False, required=False, default=None),
        13: protobuf.Field("witness", "bytes", repeated=False, required=False, default=None),
        14: protobuf.Field("ownership_proof", "bytes", repeated=False, required=False, default=None),
        15: protobuf.Field("commitment_data", "bytes", repeated=False, required=False, default=None),
        16: protobuf.Field("orig_hash", "bytes", repeated=False, required=False, default=None),
        17: protobuf.Field("orig_index", "uint32", repeated=False, required=False, default=None),
        18: protobuf.Field("decred_staking_spend", "DecredStakingSpendType", repeated=False, required=False, default=None),
        19: protobuf.Field("script_pubkey", "bytes", repeated=False, required=False, default=None),
        20: protobuf.Field("coinjoin_flags", "uint32", repeated=False, required=False, default=0),
    }

    def __init__(
        self,
        *,
        prev_hash: "bytes",
        prev_index: "int",
        address_n: Optional[Sequence["int"]] = None,
        script_sig: Optional["bytes"] = None,
        sequence: Optional["int"] = 4294967295,
        script_type: Optional["InputScriptType"] = InputScriptType.SPENDADDRESS,
        multisig: Optional["MultisigRedeemScriptType"] = None,
        amount: Optional["int"] = None,
        decred_tree: Optional["int"] = None,
        witness: Optional["bytes"] = None,
        ownership_proof: Optional["bytes"] = None,
        commitment_data: Optional["bytes"] = None,
        orig_hash: Optional["bytes"] = None,
        orig_index: Optional["int"] = None,
        decred_staking_spend: Optional["DecredStakingSpendType"] = None,
        script_pubkey: Optional["bytes"] = None,
        coinjoin_flags: Optional["int"] = 0,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.prev_hash = prev_hash
        self.prev_index = prev_index
        self.script_sig = script_sig
        self.sequence = sequence
        self.script_type = script_type
        self.multisig = multisig
        self.amount = amount
        self.decred_tree = decred_tree
        self.witness = witness
        self.ownership_proof = ownership_proof
        self.commitment_data = commitment_data
        self.orig_hash = orig_hash
        self.orig_index = orig_index
        self.decred_staking_spend = decred_staking_spend
        self.script_pubkey = script_pubkey
        self.coinjoin_flags = coinjoin_flags

class TxOutputBinType(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("amount", "uint64", repeated=False, required=True),
        2: protobuf.Field("script_pubkey", "bytes", repeated=False, required=True),
        3: protobuf.Field("decred_script_version", "uint32", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        amount: "int",
        script_pubkey: "bytes",
        decred_script_version: Optional["int"] = None,
    ) -> None:
        self.amount = amount
        self.script_pubkey = script_pubkey
        self.decred_script_version = decred_script_version

class TxOutputType(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        1: protobuf.Field("address", "string", repeated=False, required=False, default=None),
        2: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        3: protobuf.Field("amount", "uint64", repeated=False, required=True),
        4: protobuf.Field("script_type", "OutputScriptType", repeated=False, required=False, default=OutputScriptType.PAYTOADDRESS),
        5: protobuf.Field("multisig", "MultisigRedeemScriptType", repeated=False, required=False, default=None),
        6: protobuf.Field("op_return_data", "bytes", repeated=False, required=False, default=None),
        10: protobuf.Field("orig_hash", "bytes", repeated=False, required=False, default=None),
        11: protobuf.Field("orig_index", "uint32", repeated=False, required=False, default=None),
        12: protobuf.Field("payment_req_index", "uint32", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        amount: "int",
        address_n: Optional[Sequence["int"]] = None,
        address: Optional["str"] = None,
        script_type: Optional["OutputScriptType"] = OutputScriptType.PAYTOADDRESS,
        multisig: Optional["MultisigRedeemScriptType"] = None,
        op_return_data: Optional["bytes"] = None,
        orig_hash: Optional["bytes"] = None,
        orig_index: Optional["int"] = None,
        payment_req_index: Optional["int"] = None,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.amount = amount
        self.address = address
        self.script_type = script_type
        self.multisig = multisig
        self.op_return_data = op_return_data
        self.orig_hash = orig_hash
        self.orig_index = orig_index
        self.payment_req_index = payment_req_index

class TxAckInputWrapper(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        2: protobuf.Field("input", "TxInput", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        input: "TxInput",
    ) -> None:
        self.input = input

class TxAckOutputWrapper(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        5: protobuf.Field("output", "TxOutput", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        output: "TxOutput",
    ) -> None:
        self.output = output

class TxAckPrevInputWrapper(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        2: protobuf.Field("input", "PrevInput", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        input: "PrevInput",
    ) -> None:
        self.input = input

class TxAckPrevOutputWrapper(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        3: protobuf.Field("output", "PrevOutput", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        output: "PrevOutput",
    ) -> None:
        self.output = output

class TxAckPrevExtraDataWrapper(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = None
    FIELDS = {
        8: protobuf.Field("extra_data_chunk", "bytes", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        extra_data_chunk: "bytes",
    ) -> None:
        self.extra_data_chunk = extra_data_chunk

class Initialize(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 0
    FIELDS = {
        1: protobuf.Field("session_id", "bytes", repeated=False, required=False, default=None),
        2: protobuf.Field("_skip_passphrase", "bool", repeated=False, required=False, default=None),
        3: protobuf.Field("derive_cardano", "bool", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        session_id: Optional["bytes"] = None,
        _skip_passphrase: Optional["bool"] = None,
        derive_cardano: Optional["bool"] = None,
    ) -> None:
        self.session_id = session_id
        self._skip_passphrase = _skip_passphrase
        self.derive_cardano = derive_cardano

class GetFeatures(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 55

class Features(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 17
    FIELDS = {
        1: protobuf.Field("vendor", "string", repeated=False, required=False, default=None),
        2: protobuf.Field("major_version", "uint32", repeated=False, required=True),
        3: protobuf.Field("minor_version", "uint32", repeated=False, required=True),
        4: protobuf.Field("patch_version", "uint32", repeated=False, required=True),
        61: protobuf.Field("build_version", "uint32", repeated=False, required=False, default=None),
        5: protobuf.Field("bootloader_mode", "bool", repeated=False, required=False, default=None),
        6: protobuf.Field("device_id", "string", repeated=False, required=False, default=None),
        7: protobuf.Field("pin_protection", "bool", repeated=False, required=False, default=None),
        8: protobuf.Field("passphrase_protection", "bool", repeated=False, required=False, default=None),
        9: protobuf.Field("language", "string", repeated=False, required=False, default=None),
        10: protobuf.Field("label", "string", repeated=False, required=False, default=None),
        12: protobuf.Field("initialized", "bool", repeated=False, required=False, default=None),
        13: protobuf.Field("revision", "bytes", repeated=False, required=False, default=None),
        14: protobuf.Field("bootloader_hash", "bytes", repeated=False, required=False, default=None),
        15: protobuf.Field("imported", "bool", repeated=False, required=False, default=None),
        16: protobuf.Field("unlocked", "bool", repeated=False, required=False, default=None),
        17: protobuf.Field("_passphrase_cached", "bool", repeated=False, required=False, default=None),
        18: protobuf.Field("firmware_present", "bool", repeated=False, required=False, default=None),
        19: protobuf.Field("backup_availability", "BackupAvailability", repeated=False, required=False, default=None),
        20: protobuf.Field("flags", "uint32", repeated=False, required=False, default=None),
        21: protobuf.Field("model", "string", repeated=False, required=False, default=None),
        22: protobuf.Field("fw_major", "uint32", repeated=False, required=False, default=None),
        23: protobuf.Field("fw_minor", "uint32", repeated=False, required=False, default=None),
        24: protobuf.Field("fw_patch", "uint32", repeated=False, required=False, default=None),
        62: protobuf.Field("fw_build", "uint32", repeated=False, required=False, default=None),
        25: protobuf.Field("fw_vendor", "string", repeated=False, required=False, default=None),
        27: protobuf.Field("unfinished_backup", "bool", repeated=False, required=False, default=None),
        28: protobuf.Field("no_backup", "bool", repeated=False, required=False, default=None),
        29: protobuf.Field("recovery_status", "RecoveryStatus", repeated=False, required=False, default=None),
        30: protobuf.Field("capabilities", "Capability", repeated=True, required=False, default=None),
        31: protobuf.Field("backup_type", "BackupType", repeated=False, required=False, default=None),
        32: protobuf.Field("sd_card_present", "bool", repeated=False, required=False, default=None),
        33: protobuf.Field("sd_protection", "bool", repeated=False, required=False, default=None),
        34: protobuf.Field("wipe_code_protection", "bool", repeated=False, required=False, default=None),
        35: protobuf.Field("session_id", "bytes", repeated=False, required=False, default=None),
        36: protobuf.Field("passphrase_always_on_device", "bool", repeated=False, required=False, default=None),
        37: protobuf.Field("safety_checks", "SafetyCheckLevel", repeated=False, required=False, default=None),
        38: protobuf.Field("auto_lock_delay_ms", "uint32", repeated=False, required=False, default=None),
        39: protobuf.Field("display_rotation", "DisplayRotation", repeated=False, required=False, default=None),
        40: protobuf.Field("experimental_features", "bool", repeated=False, required=False, default=None),
        41: protobuf.Field("busy", "bool", repeated=False, required=False, default=None),
        42: protobuf.Field("homescreen_format", "HomescreenFormat", repeated=False, required=False, default=None),
        43: protobuf.Field("hide_passphrase_from_host", "bool", repeated=False, required=False, default=None),
        44: protobuf.Field("internal_model", "string", repeated=False, required=False, default=None),
        45: protobuf.Field("unit_color", "uint32", repeated=False, required=False, default=None),
        46: protobuf.Field("unit_btconly", "bool", repeated=False, required=False, default=None),
        47: protobuf.Field("homescreen_width", "uint32", repeated=False, required=False, default=None),
        48: protobuf.Field("homescreen_height", "uint32", repeated=False, required=False, default=None),
        49: protobuf.Field("bootloader_locked", "bool", repeated=False, required=False, default=None),
        50: protobuf.Field("language_version_matches", "bool", repeated=False, required=False, default=True),
        51: protobuf.Field("unit_packaging", "uint32", repeated=False, required=False, default=None),
        52: protobuf.Field("haptic_feedback", "bool", repeated=False, required=False, default=None),
        53: protobuf.Field("recovery_type", "RecoveryType", repeated=False, required=False, default=None),
        54: protobuf.Field("optiga_sec", "uint32", repeated=False, required=False, default=None),
        55: protobuf.Field("soc", "uint32", repeated=False, required=False, default=None),
        56: protobuf.Field("firmware_corrupted", "bool", repeated=False, required=False, default=None),
        57: protobuf.Field("auto_lock_delay_battery_ms", "uint32", repeated=False, required=False, default=None),
        58: protobuf.Field("led", "bool", repeated=False, required=False, default=None),
        59: protobuf.Field("usb_connected", "bool", repeated=False, required=False, default=None),
        60: protobuf.Field("wireless_connected", "bool", repeated=False, required=False, default=None),
        63: protobuf.Field("tap_to_wake", "bool", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        major_version: "int",
        minor_version: "int",
        patch_version: "int",
        capabilities: Optional[Sequence["Capability"]] = None,
        vendor: Optional["str"] = None,
        build_version: Optional["int"] = None,
        bootloader_mode: Optional["bool"] = None,
        device_id: Optional["str"] = None,
        pin_protection: Optional["bool"] = None,
        passphrase_protection: Optional["bool"] = None,
        language: Optional["str"] = None,
        label: Optional["str"] = None,
        initialized: Optional["bool"] = None,
        revision: Optional["bytes"] = None,
        bootloader_hash: Optional["bytes"] = None,
        imported: Optional["bool"] = None,
        unlocked: Optional["bool"] = None,
        _passphrase_cached: Optional["bool"] = None,
        firmware_present: Optional["bool"] = None,
        backup_availability: Optional["BackupAvailability"] = None,
        flags: Optional["int"] = None,
        model: Optional["str"] = None,
        fw_major: Optional["int"] = None,
        fw_minor: Optional["int"] = None,
        fw_patch: Optional["int"] = None,
        fw_build: Optional["int"] = None,
        fw_vendor: Optional["str"] = None,
        unfinished_backup: Optional["bool"] = None,
        no_backup: Optional["bool"] = None,
        recovery_status: Optional["RecoveryStatus"] = None,
        backup_type: Optional["BackupType"] = None,
        sd_card_present: Optional["bool"] = None,
        sd_protection: Optional["bool"] = None,
        wipe_code_protection: Optional["bool"] = None,
        session_id: Optional["bytes"] = None,
        passphrase_always_on_device: Optional["bool"] = None,
        safety_checks: Optional["SafetyCheckLevel"] = None,
        auto_lock_delay_ms: Optional["int"] = None,
        display_rotation: Optional["DisplayRotation"] = None,
        experimental_features: Optional["bool"] = None,
        busy: Optional["bool"] = None,
        homescreen_format: Optional["HomescreenFormat"] = None,
        hide_passphrase_from_host: Optional["bool"] = None,
        internal_model: Optional["str"] = None,
        unit_color: Optional["int"] = None,
        unit_btconly: Optional["bool"] = None,
        homescreen_width: Optional["int"] = None,
        homescreen_height: Optional["int"] = None,
        bootloader_locked: Optional["bool"] = None,
        language_version_matches: Optional["bool"] = True,
        unit_packaging: Optional["int"] = None,
        haptic_feedback: Optional["bool"] = None,
        recovery_type: Optional["RecoveryType"] = None,
        optiga_sec: Optional["int"] = None,
        soc: Optional["int"] = None,
        firmware_corrupted: Optional["bool"] = None,
        auto_lock_delay_battery_ms: Optional["int"] = None,
        led: Optional["bool"] = None,
        usb_connected: Optional["bool"] = None,
        wireless_connected: Optional["bool"] = None,
        tap_to_wake: Optional["bool"] = None,
    ) -> None:
        self.capabilities: Sequence["Capability"] = capabilities if capabilities is not None else []
        self.major_version = major_version
        self.minor_version = minor_version
        self.patch_version = patch_version
        self.vendor = vendor
        self.build_version = build_version
        self.bootloader_mode = bootloader_mode
        self.device_id = device_id
        self.pin_protection = pin_protection
        self.passphrase_protection = passphrase_protection
        self.language = language
        self.label = label
        self.initialized = initialized
        self.revision = revision
        self.bootloader_hash = bootloader_hash
        self.imported = imported
        self.unlocked = unlocked
        self._passphrase_cached = _passphrase_cached
        self.firmware_present = firmware_present
        self.backup_availability = backup_availability
        self.flags = flags
        self.model = model
        self.fw_major = fw_major
        self.fw_minor = fw_minor
        self.fw_patch = fw_patch
        self.fw_build = fw_build
        self.fw_vendor = fw_vendor
        self.unfinished_backup = unfinished_backup
        self.no_backup = no_backup
        self.recovery_status = recovery_status
        self.backup_type = backup_type
        self.sd_card_present = sd_card_present
        self.sd_protection = sd_protection
        self.wipe_code_protection = wipe_code_protection
        self.session_id = session_id
        self.passphrase_always_on_device = passphrase_always_on_device
        self.safety_checks = safety_checks
        self.auto_lock_delay_ms = auto_lock_delay_ms
        self.display_rotation = display_rotation
        self.experimental_features = experimental_features
        self.busy = busy
        self.homescreen_format = homescreen_format
        self.hide_passphrase_from_host = hide_passphrase_from_host
        self.internal_model = internal_model
        self.unit_color = unit_color
        self.unit_btconly = unit_btconly
        self.homescreen_width = homescreen_width
        self.homescreen_height = homescreen_height
        self.bootloader_locked = bootloader_locked
        self.language_version_matches = language_version_matches
        self.unit_packaging = unit_packaging
        self.haptic_feedback = haptic_feedback
        self.recovery_type = recovery_type
        self.optiga_sec = optiga_sec
        self.soc = soc
        self.firmware_corrupted = firmware_corrupted
        self.auto_lock_delay_battery_ms = auto_lock_delay_battery_ms
        self.led = led
        self.usb_connected = usb_connected
        self.wireless_connected = wireless_connected
        self.tap_to_wake = tap_to_wake

class LockDevice(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 24

class EndSession(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 83

class ApplyFlags(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 28
    FIELDS = {
        1: protobuf.Field("flags", "uint32", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        flags: "int",
    ) -> None:
        self.flags = flags

class Ping(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 1
    FIELDS = {
        1: protobuf.Field("message", "string", repeated=False, required=False, default=''),
        2: protobuf.Field("button_protection", "bool", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        message: Optional["str"] = '',
        button_protection: Optional["bool"] = None,
    ) -> None:
        self.message = message
        self.button_protection = button_protection

class Cancel(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 20

class WipeDevice(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 5

class ResetDevice(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 14
    FIELDS = {
        2: protobuf.Field("strength", "uint32", repeated=False, required=False, default=256),
        3: protobuf.Field("passphrase_protection", "bool", repeated=False, required=False, default=None),
        4: protobuf.Field("pin_protection", "bool", repeated=False, required=False, default=None),
        5: protobuf.Field("language", "string", repeated=False, required=False, default=None),
        6: protobuf.Field("label", "string", repeated=False, required=False, default=None),
        7: protobuf.Field("u2f_counter", "uint32", repeated=False, required=False, default=None),
        8: protobuf.Field("skip_backup", "bool", repeated=False, required=False, default=None),
        9: protobuf.Field("no_backup", "bool", repeated=False, required=False, default=None),
        10: protobuf.Field("backup_type", "BackupType", repeated=False, required=False, default=BackupType.Bip39),
        11: protobuf.Field("entropy_check", "bool", repeated=False, required=False, default=None),
        12: protobuf.Field("backup_method", "BackupMethod", repeated=False, required=False, default=BackupMethod.Display),
    }

    def __init__(
        self,
        *,
        strength: Optional["int"] = 256,
        passphrase_protection: Optional["bool"] = None,
        pin_protection: Optional["bool"] = None,
        language: Optional["str"] = None,
        label: Optional["str"] = None,
        u2f_counter: Optional["int"] = None,
        skip_backup: Optional["bool"] = None,
        no_backup: Optional["bool"] = None,
        backup_type: Optional["BackupType"] = BackupType.Bip39,
        entropy_check: Optional["bool"] = None,
        backup_method: Optional["BackupMethod"] = BackupMethod.Display,
    ) -> None:
        self.strength = strength
        self.passphrase_protection = passphrase_protection
        self.pin_protection = pin_protection
        self.language = language
        self.label = label
        self.u2f_counter = u2f_counter
        self.skip_backup = skip_backup
        self.no_backup = no_backup
        self.backup_type = backup_type
        self.entropy_check = entropy_check
        self.backup_method = backup_method

class WordRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 46
    FIELDS = {
        1: protobuf.Field("type", "WordRequestType", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        type: "WordRequestType",
    ) -> None:
        self.type = type

class WordAck(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 47
    FIELDS = {
        1: protobuf.Field("word", "string", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        word: "str",
    ) -> None:
        self.word = word

class DoPreauthorized(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 84

class PreauthorizedRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 85

class UnlockPath(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 93
    FIELDS = {
        1: protobuf.Field("address_n", "uint32", repeated=True, required=False, default=None),
        2: protobuf.Field("mac", "bytes", repeated=False, required=False, default=None),
    }

    def __init__(
        self,
        *,
        address_n: Optional[Sequence["int"]] = None,
        mac: Optional["bytes"] = None,
    ) -> None:
        self.address_n: Sequence["int"] = address_n if address_n is not None else []
        self.mac = mac

class UnlockedPathRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 94
    FIELDS = {
        1: protobuf.Field("mac", "bytes", repeated=False, required=True),
    }

    def __init__(
        self,
        *,
        mac: "bytes",
    ) -> None:
        self.mac = mac

class DebugLinkState(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 102
    FIELDS = {
        1: protobuf.Field("layout", "bytes", repeated=False, required=False, default=None),
        2: protobuf.Field("pin", "string", repeated=False, required=False, default=None),
        3: protobuf.Field("matrix", "string", repeated=False, required=False, default=None),
        4: protobuf.Field("mnemonic_secret", "bytes", repeated=False, required=False, default=None),
        5: protobuf.Field("node", "HDNodeType", repeated=False, required=False, default=None),
        6: protobuf.Field("passphrase_protection", "bool", repeated=False, required=False, default=None),
        7: protobuf.Field("reset_word", "string", repeated=False, required=False, default=None),
        8: protobuf.Field("reset_entropy", "bytes", repeated=False, required=False, default=None),
        9: protobuf.Field("recovery_fake_word", "string", repeated=False, required=False, default=None),
        10: protobuf.Field("recovery_word_pos", "uint32", repeated=False, required=False, default=None),
        11: protobuf.Field("reset_word_pos", "uint32", repeated=False, required=False, default=None),
        12: protobuf.Field("mnemonic_type", "BackupType", repeated=False, required=False, default=None),
        13: protobuf.Field("tokens", "string", repeated=True, required=False, default=None),
    }

    def __init__(
        self,
        *,
        tokens: Optional[Sequence["str"]] = None,
        layout: Optional["bytes"] = None,
        pin: Optional["str"] = None,
        matrix: Optional["str"] = None,
        mnemonic_secret: Optional["bytes"] = None,
        node: Optional["HDNodeType"] = None,
        passphrase_protection: Optional["bool"] = None,
        reset_word: Optional["str"] = None,
        reset_entropy: Optional["bytes"] = None,
        recovery_fake_word: Optional["str"] = None,
        recovery_word_pos: Optional["int"] = None,
        reset_word_pos: Optional["int"] = None,
        mnemonic_type: Optional["BackupType"] = None,
    ) -> None:
        self.tokens: Sequence["str"] = tokens if tokens is not None else []
        self.layout = layout
        self.pin = pin
        self.matrix = matrix
        self.mnemonic_secret = mnemonic_secret
        self.node = node
        self.passphrase_protection = passphrase_protection
        self.reset_word = reset_word
        self.reset_entropy = reset_entropy
        self.recovery_fake_word = recovery_fake_word
        self.recovery_word_pos = recovery_word_pos
        self.reset_word_pos = reset_word_pos
        self.mnemonic_type = mnemonic_type


# ==== OneKey Protocol V2 management messages (Pro 2 / Neo) ====


class OneKeyPinType(IntEnum):
    ANY = 1
    MAIN = 2
    ATTACH_TO_PIN = 3


class ProtocolInfoRequest(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 60200
    FIELDS = {
        1: protobuf.Field("eventless_wallet_session", "bool"),
    }


class ProtocolInfo(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 60201
    FIELDS = {
        1: protobuf.Field("version", "uint32", required=True),
        2: protobuf.Field("build_fingerprint", "string", required=True),
        3: protobuf.Field("supported_messages", "uint32", repeated=True),
    }


class V2Ping(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 60206
    FIELDS = {
        1: protobuf.Field("message", "string"),
    }


class V2Success(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 60207
    FIELDS = {
        1: protobuf.Field("message", "string"),
    }


class V2Failure(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 60208
    FIELDS = {
        1: protobuf.Field("code", "uint32", required=True),
        2: protobuf.Field("subcode", "uint32"),
        3: protobuf.Field("message", "string"),
    }


class DeviceInfoTargets(protobuf.MessageType):
    FIELDS = {
        100: protobuf.Field("hw", "bool"),
    }


class DeviceInfoTypes(protobuf.MessageType):
    FIELDS = {
        40: protobuf.Field("specific", "bool"),
    }


class DeviceHardwareInfo(protobuf.MessageType):
    FIELDS = {
        10: protobuf.Field("device_type", "uint32"),
        20: protobuf.Field("serial_no", "string"),
    }


class DeviceInfoGet(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 60600
    FIELDS = {
        1: protobuf.Field("targets", "DeviceInfoTargets"),
        2: protobuf.Field("types", "DeviceInfoTypes"),
    }


class DeviceInfo(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 60601
    FIELDS = {
        1: protobuf.Field("protocol_version", "uint32", required=True),
        100: protobuf.Field("hw", "DeviceHardwareInfo"),
    }


class DeviceStatusGet(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 60602
    FIELDS = {}


class DeviceStatus(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 60603
    FIELDS = {
        1: protobuf.Field("device_id", "string"),
        2: protobuf.Field("unlocked", "bool"),
        3: protobuf.Field("init_states", "bool"),
        10: protobuf.Field("passphrase_enabled", "bool"),
        12: protobuf.Field("unlocked_by_attach_to_pin", "bool"),
    }


class DeviceSessionGet(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 61200
    FIELDS = {
        1: protobuf.Field("session_id", "bytes"),
        2: protobuf.Field("btc_test_address", "string"),
    }


class DeviceSession(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 61201
    FIELDS = {
        1: protobuf.Field("session_id", "bytes"),
        2: protobuf.Field("btc_test_address", "string"),
        3: protobuf.Field("seed_domains", "uint32", repeated=True),
    }


class DeviceSessionAskPin(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 61202
    FIELDS = {
        1: protobuf.Field("type", "uint32"),
    }


class DeviceSessionAskPassphrase(protobuf.MessageType):
    MESSAGE_WIRE_TYPE = 61203
    FIELDS = {
        1: protobuf.Field("passphrase", "string"),
        2: protobuf.Field("on_device", "bool", required=True),
        3: protobuf.Field("seed_domains", "uint32", repeated=True),
    }
