# This file is part of the OneKey Python library.
#
# Copyright (C) OneKey
#
# This library is free software: you can redistribute it and/or modify
# it under the terms of the GNU Lesser General Public License version 3
# as published by the Free Software Foundation.

"""OneKey Protocol V2 client and session for Pro 2 and Neo."""

from __future__ import annotations

import logging
import re
import threading
import typing as t
import unicodedata
import uuid
from contextlib import suppress

from . import client, exceptions, mapping as mapping_mod, messages, models
from .tools import enter_context

if t.TYPE_CHECKING:
    from .mapping import ProtobufMapping
    from .protobuf import MessageType
    from .transport.protolink import ProtoLinkTransport

LOG = logging.getLogger(__name__)

MT = t.TypeVar("MT", bound="MessageType")

REQUIRED_V2_MESSAGES = frozenset({
    messages.DeviceInfoGet.MESSAGE_WIRE_TYPE,
    messages.DeviceStatusGet.MESSAGE_WIRE_TYPE,
    messages.DeviceSessionGet.MESSAGE_WIRE_TYPE,
    messages.DeviceSessionAskPin.MESSAGE_WIRE_TYPE,
    messages.DeviceSessionAskPassphrase.MESSAGE_WIRE_TYPE,
})

# Messages sent mid-workflow (e.g. during SignTx) that must not be interrupted
# by management status/session queries.
_MID_WORKFLOW_MESSAGES = (messages.TxAck, messages.PaymentRequest, messages.ButtonAck)

# Management requests. Their Failure subcodes are not wallet-session subcodes,
# so subcode 1 does not mean cancellation for them.
_MANAGEMENT_REQUESTS = (
    messages.V2Ping,
    messages.ProtocolInfoRequest,
    messages.DeviceInfoGet,
    messages.DeviceStatusGet,
)
_SESSION_REQUESTS = (
    messages.DeviceSessionGet,
    messages.DeviceSessionAskPin,
    messages.DeviceSessionAskPassphrase,
)
# Messages a seedless session may send: nothing here reaches a wallet seed.
_SEEDLESS_MESSAGES = (messages.Cancel, messages.LockDevice, *_MANAGEMENT_REQUESTS)

_FAILURE_PROCESS_ERROR = 5
# firmware-pro2: DeviceSessionErrorCode (session requests) and
# app/utils/protocol.py SUBCODE_USER_CANCELLED (wallet requests) both use 1.
_SUBCODE_USER_CANCELLED = 1
_SUBCODE_INVALID_SESSION = 2

# Older Protocol V2 firmware may omit the cancellation subcode. Keep the same
# narrow message fallback as packages/core DeviceCommands.ts.
_LEGACY_CANCEL_MESSAGE = re.compile(
    r"^(?:cancel(?:led|ed)(?: on device)?|confirm dismissed|update cancel(?:led|ed)"
    r"|user cancel(?:led|ed)(?:\s+.*)?)$",
    re.IGNORECASE,
)


def _is_cancel_failure(request: MessageType, failure: messages.V2Failure) -> bool:
    if failure.code != _FAILURE_PROCESS_ERROR:
        return False
    if failure.subcode is None:
        return bool(_LEGACY_CANCEL_MESSAGE.match((failure.message or "").strip()))
    if failure.subcode == _SUBCODE_USER_CANCELLED:
        return not isinstance(request, _MANAGEMENT_REQUESTS)
    return False


class SessionV2(client.Session["OneKeyClientV2", t.Optional[str]]):
    """Protocol V2 wallet session compatible with `onekeylib.btc` workflows.

    Exposes an opaque local correlation ID (`session.id`); raw firmware
    session identifiers stay internal to the client.
    """

    def __init__(
        self,
        client: "OneKeyClientV2",
        *,
        firmware_session_id: bytes | None,
        btc_test_address: str | None = None,
        attach_pin: bool = False,
        root_fingerprint: bytes | None = None,
    ) -> None:
        opaque_id = uuid.uuid4().hex if firmware_session_id is not None else None
        super().__init__(client, opaque_id, root_fingerprint=root_fingerprint)
        self._firmware_session_id = firmware_session_id
        self._btc_test_address = btc_test_address
        self.attach_pin = attach_pin

    @property
    def seedless(self) -> bool:
        return self._firmware_session_id is None

    def close(self) -> None:
        self.client._retire_session(self)


class OneKeyClientV2(client.OneKeyClient[SessionV2]):
    """Client for OneKey Pro 2 and Neo over Protocol V2 (`proto_link`)."""

    transport: "ProtoLinkTransport"

    def __init__(
        self,
        app: client.AppManifest,
        transport: "ProtoLinkTransport",
        *,
        model: models.OneKeyModel | None = None,
        mapping: ProtobufMapping | None = None,
    ) -> None:
        super().__init__(
            app=app,
            transport=transport,
            model=model,
            mapping=mapping,
        )
        self._lock = threading.RLock()
        self._handshaked = False
        self._eventless = False
        # Transport generation the handshake/eventless negotiation belongs to.
        self._negotiated_generation: int | None = None
        self._device_status: messages.DeviceStatus | None = None
        self._device_info: messages.DeviceInfo | None = None
        self._active_session: SessionV2 | None = None
        # Session whose multi-message workflow (e.g. SignTx/TxAck) is in progress.
        self._workflow_session: SessionV2 | None = None
        self._workflow_generation: int | None = None
        self._sessions: dict[str, SessionV2] = {}

    def _reset_link_state(self) -> None:
        self._handshaked = False
        self._eventless = False
        self._negotiated_generation = None
        self._active_session = None
        self._end_workflow()

    def _link_generation(self) -> int:
        return getattr(self.transport, "generation", 0)

    def _retire_session(self, session: SessionV2) -> None:
        session.is_invalid = True
        with self._lock:
            if session.id is not None and self._sessions.get(session.id) is session:
                del self._sessions[session.id]
            if self._active_session is session:
                self._active_session = None
            if self._workflow_session is session:
                self._end_workflow()

    def _end_workflow(self) -> None:
        self._workflow_session = None
        self._workflow_generation = None

    def _check_workflow_owner(self, session: SessionV2 | None) -> None:
        owner = self._workflow_session
        if owner is not None and owner is not session:
            raise exceptions.OneKeyException(
                "Another OneKey wallet session has a workflow in progress"
            )

    def _raw_write(self, msg: MessageType) -> int:
        active_mapping = self._mapping or mapping_mod.DEFAULT_MAPPING
        wire_type, payload = active_mapping.encode(msg)
        return self.transport.write_message(wire_type, payload)

    def _raw_read(
        self,
        timeout: float | None = None,
        *,
        expected_ack_seq: int | None = None,
    ) -> MessageType:
        active_mapping = self._mapping or mapping_mod.DEFAULT_MAPPING
        wire_type, payload = self.transport.read_message(
            timeout=timeout,
            expected_ack_seq=expected_ack_seq,
        )
        return active_mapping.decode(wire_type, payload)

    def _v2_call(
        self,
        msg: MessageType,
        *,
        expect: type[MT],
        timeout: float | None = 120.0,
    ) -> MT:
        with self._lock:
            seq = self._raw_write(msg)
            while True:
                resp = self._raw_read(timeout=timeout, expected_ack_seq=seq)
                if isinstance(resp, messages.V2Failure):
                    # Decode against the originating request: a ButtonAck relay
                    # still answers the request that started this exchange.
                    if _is_cancel_failure(msg, resp):
                        raise exceptions.Cancelled(resp.message or "Cancelled on device")
                    if (
                        isinstance(msg, _SESSION_REQUESTS)
                        and resp.code == _FAILURE_PROCESS_ERROR
                        and resp.subcode == _SUBCODE_INVALID_SESSION
                    ):
                        raise exceptions.InvalidSessionError(None)
                    raise exceptions.OneKeyFailure(
                        messages.Failure(
                            code=messages.FailureType.ProcessError,
                            message=resp.message or f"OneKey V2 failure ({resp.code}:{resp.subcode})",
                        )
                    )
                if isinstance(resp, messages.Failure):
                    if resp.code == messages.FailureType.ActionCancelled:
                        raise exceptions.Cancelled(resp.message or "Cancelled on device")
                    raise exceptions.OneKeyFailure(resp)
                if isinstance(resp, messages.ButtonRequest):
                    self.app._callback_button(resp)
                    seq = self._raw_write(messages.ButtonAck())
                    continue
                if expect is messages.Success and isinstance(resp, messages.V2Success):
                    return messages.Success(message=resp.message)  # type: ignore[return-value]
                if not isinstance(resp, expect):
                    raise exceptions.UnexpectedMessageError(expect, resp)
                return resp

    def _ensure_handshake(self) -> None:
        generation = self._link_generation()
        if not self.transport.is_open() or self._negotiated_generation != generation:
            # A replaced link must renegotiate; state from the old link is void.
            self._reset_link_state()
        if not self._handshaked:
            self._v2_call(messages.V2Ping(message="handshake"), expect=messages.V2Success, timeout=5.0)
            self._handshaked = True
        if not self._eventless:
            proto = self._v2_call(
                messages.ProtocolInfoRequest(eventless_wallet_session=True),
                expect=messages.ProtocolInfo,
                timeout=5.0,
            )
            if proto.version != 1 or not REQUIRED_V2_MESSAGES.issubset(proto.supported_messages):
                raise exceptions.OneKeyException(
                    "Unsupported OneKey Protocol V2 firmware"
                )
            self._eventless = True
        self._negotiated_generation = generation

    def _get_features(self) -> messages.Features:
        return self.refresh_features()

    @enter_context
    def ping(
        self,
        message: str,
        button_protection: bool | None = None,
        timeout: float | None = None,
    ) -> str:
        if button_protection:
            raise exceptions.OneKeyException(
                "Protocol V2 ping cannot request on-device confirmation"
            )
        with self._lock:
            self._ensure_handshake()
            resp = self._v2_call(
                messages.V2Ping(message=message),
                expect=messages.V2Success,
                timeout=5.0 if timeout is None else timeout,
            )
            return resp.message or ""

    @enter_context
    def refresh_features(self) -> messages.Features:
        with self._lock:
            self._ensure_handshake()
            info = self._v2_call(
                messages.DeviceInfoGet(
                    targets=messages.DeviceInfoTargets(hw=True),
                    types=messages.DeviceInfoTypes(specific=True),
                ),
                expect=messages.DeviceInfo,
                timeout=5.0,
            )
            if info.protocol_version != 1 or info.hw is None:
                raise exceptions.OneKeyException("Incomplete OneKey V2 device info")
            detected_model = models.by_device_type(info.hw.device_type)
            if detected_model is None:
                raise exceptions.OneKeyException(
                    f"Unsupported OneKey V2 device type: {info.hw.device_type}"
                )
            status = self._v2_call(
                messages.DeviceStatusGet(),
                expect=messages.DeviceStatus,
                timeout=5.0,
            )
            self._device_info = info
            self._device_status = status
            self._model = detected_model

            capabilities = [messages.Capability.Bitcoin]
            if status.passphrase_enabled:
                capabilities.append(messages.Capability.PassphraseEntry)

            self._features = messages.Features(
                vendor="onekey.so",
                major_version=info.protocol_version,
                minor_version=0,
                patch_version=0,
                device_id=status.device_id or "",
                initialized=bool(status.init_states),
                unlocked=status.unlocked,
                passphrase_protection=status.passphrase_enabled,
                model=detected_model.name,
                internal_model=detected_model.internal_name,
                label=f"{detected_model.name} ({info.hw.serial_no or status.device_id or ''})",
                capabilities=capabilities,
            )
            return self._features

    @property
    def serial_no(self) -> str | None:
        if self._device_info is None or self._device_info.hw is None:
            return None
        return self._device_info.hw.serial_no

    @enter_context
    def ensure_unlocked(self, *, _use_session: SessionV2 | None = None) -> None:
        del _use_session
        with self._lock:
            self._ensure_handshake()
            status = self._v2_call(
                messages.DeviceStatusGet(),
                expect=messages.DeviceStatus,
                timeout=5.0,
            )
            unlocked_now = False
            if status.unlocked is not True:
                self._v2_call(
                    messages.DeviceSessionAskPin(type=int(messages.OneKeyPinType.ANY)),
                    expect=messages.V2Success,
                    timeout=120.0,
                )
                status = self._v2_call(
                    messages.DeviceStatusGet(),
                    expect=messages.DeviceStatus,
                    timeout=5.0,
                )
                unlocked_now = True
            if status.unlocked is not True:
                raise exceptions.DeviceLockedError("OneKey device is locked")
            self._device_status = status
            if unlocked_now or self._features is None:
                # Refresh cached features so passphrase_protection reflects unlocked state.
                self.refresh_features()

    @enter_context
    def get_session(
        self,
        passphrase: str | client.PassphraseSetting = client.PassphraseSetting.AUTO,
        *,
        derive_cardano: bool = False,
        session_ref: str | None = None,
    ) -> SessionV2:
        del derive_cardano
        if session_ref is not None and passphrase is not client.PassphraseSetting.AUTO:
            # A session reference already names one wallet; an explicit wallet
            # selector could silently resolve to a different one.
            raise ValueError("session_ref cannot be combined with an explicit passphrase setting")
        with self._lock:
            self._check_workflow_owner(None)
            self._ensure_handshake()
            if self._features is None:
                self.refresh_features()

            if passphrase is client.PassphraseSetting.NONE:
                return SessionV2(self, firmware_session_id=None)

            self.ensure_unlocked()
            assert self._device_status is not None
            status = self._device_status

            if session_ref is not None:
                existing = self._sessions.get(session_ref)
                if existing is None or existing.is_invalid or existing.seedless:
                    raise exceptions.InvalidSessionError(None)
                self._resume_firmware_session(existing, status)
                self._active_session = existing
                return existing

            attach_pin = status.unlocked_by_attach_to_pin is True
            if passphrase is client.PassphraseSetting.STANDARD_WALLET:
                if attach_pin:
                    raise exceptions.OneKeyException(
                        "Device is unlocked with Attach PIN; lock and unlock with Main PIN for the standard wallet."
                    )
                if status.passphrase_enabled:
                    self._v2_call(
                        messages.DeviceSessionAskPassphrase(
                            passphrase="",
                            on_device=False,
                            seed_domains=[1],
                        ),
                        expect=messages.V2Success,
                        timeout=30.0,
                    )
            elif passphrase is client.PassphraseSetting.ON_DEVICE:
                if attach_pin or not status.passphrase_enabled:
                    raise exceptions.OneKeyException(
                        "On-device passphrase entry requires Main PIN unlock with passphrase protection enabled."
                    )
                self._v2_call(
                    messages.DeviceSessionAskPassphrase(
                        on_device=True,
                        seed_domains=[1],
                    ),
                    expect=messages.V2Success,
                    timeout=120.0,
                )
            elif isinstance(passphrase, str):
                normalized = unicodedata.normalize("NFKD", passphrase)
                if attach_pin:
                    raise exceptions.OneKeyException(
                        "Cannot supply a passphrase while unlocked with Attach PIN."
                    )
                if normalized and not status.passphrase_enabled:
                    raise exceptions.OneKeyException(
                        "Passphrase protection is disabled on this device."
                    )
                if status.passphrase_enabled:
                    self._v2_call(
                        messages.DeviceSessionAskPassphrase(
                            passphrase=normalized,
                            on_device=False,
                            seed_domains=[1],
                        ),
                        expect=messages.V2Success,
                        timeout=30.0,
                    )
            elif passphrase is client.PassphraseSetting.AUTO:
                if not attach_pin and status.passphrase_enabled:
                    self._v2_call(
                        messages.DeviceSessionAskPassphrase(
                            on_device=True,
                            seed_domains=[1],
                        ),
                        expect=messages.V2Success,
                        timeout=120.0,
                    )

            opened = self._v2_call(
                messages.DeviceSessionGet(),
                expect=messages.DeviceSession,
                timeout=10.0,
            )
            if not opened.session_id or not opened.btc_test_address or 1 not in opened.seed_domains:
                raise exceptions.OneKeyException("Incomplete OneKey V2 wallet session")

            sess = SessionV2(
                self,
                firmware_session_id=opened.session_id,
                btc_test_address=opened.btc_test_address,
                attach_pin=attach_pin,
            )
            assert sess.id is not None
            self._sessions[sess.id] = sess
            self._active_session = sess
            return sess

    def _resume_firmware_session(self, session: SessionV2, status: messages.DeviceStatus) -> None:
        if status.unlocked is not True:
            raise exceptions.DeviceLockedError("OneKey was locked")
        if (status.unlocked_by_attach_to_pin is True) != session.attach_pin:
            self._retire_session(session)
            raise exceptions.InvalidSessionError(None)
        try:
            resumed = self._v2_call(
                messages.DeviceSessionGet(
                    session_id=session._firmware_session_id,
                    btc_test_address=session._btc_test_address,
                ),
                expect=messages.DeviceSession,
                timeout=10.0,
            )
        except exceptions.InvalidSessionError:
            self._retire_session(session)
            raise
        if (
            not resumed.session_id
            or resumed.session_id != session._firmware_session_id
            or resumed.btc_test_address != session._btc_test_address
            or 1 not in resumed.seed_domains
        ):
            self._retire_session(session)
            raise exceptions.InvalidSessionError(None)

    def get_seedless_session(self) -> SessionV2:
        return SessionV2(self, firmware_session_id=None)

    def _get_any_session(self) -> SessionV2:
        return self._active_session or self.get_seedless_session()

    def _get_session(
        self,
        passphrase: str | None = None,
        *,
        on_device: bool = False,
        derive_cardano: bool = False,
    ) -> SessionV2:
        if on_device:
            setting: str | client.PassphraseSetting = client.PassphraseSetting.ON_DEVICE
        elif passphrase is None:
            setting = client.PassphraseSetting.NONE
        elif passphrase == "":
            setting = client.PassphraseSetting.STANDARD_WALLET
        else:
            setting = passphrase
        return self.get_session(passphrase=setting, derive_cardano=derive_cardano)

    def _check_seedless(self, session: SessionV2, msg: MessageType) -> None:
        if session.seedless and not isinstance(msg, _SEEDLESS_MESSAGES):
            raise exceptions.OneKeyException(
                "Wallet operations are not available on a seedless session"
            )

    def _write(self, session: SessionV2, msg: MessageType) -> None:
        if isinstance(msg, messages.Cancel):
            # Host Cancel is flow control: it must reach the device while another
            # thread holds the request lock waiting for user confirmation. The
            # transport serializes the USB write and tracks the extra ACK.
            self.transport.write_message(
                *(self._mapping or mapping_mod.DEFAULT_MAPPING).encode(msg)
            )
            return
        self._check_seedless(session, msg)
        with self._lock:
            self._raw_write(msg)

    def _read(self, session: SessionV2, timeout: float | None = None) -> MessageType:
        del session
        with self._lock:
            return self._raw_read(timeout=timeout)

    def _call_raw(
        self,
        session: SessionV2,
        msg: MessageType,
        timeout: float | None = None,
    ) -> MessageType:
        self._check_seedless(session, msg)
        with self._lock:
            seq = self._raw_write(msg)
            return self._raw_read(timeout=timeout, expected_ack_seq=seq)

    def cancel(self) -> None:
        """Send a host Cancel, interrupting the current device workflow."""
        with self._get_any_session() as session:
            session.cancel()
        # A cancelled workflow can no longer be continued; release the wallet even
        # if no thread is waiting for its response.
        self._end_workflow()

    def _call(
        self,
        session: SessionV2,
        msg: MessageType,
        *,
        expect: type[MT] = messages.protobuf.MessageType,  # type: ignore[assignment]
        timeout: float | None = None,
    ) -> MT:
        self._check_seedless(session, msg)
        with self._lock:
            mid_workflow = isinstance(msg, _MID_WORKFLOW_MESSAGES)
            if mid_workflow:
                # Continuations must stay on the wallet and link that started the
                # workflow; another session or a reconnect voids it.
                if (
                    self._workflow_session is not session
                    or self._active_session is not session
                    or self._workflow_generation != self._link_generation()
                    or not self.transport.is_open()
                ):
                    raise exceptions.InvalidSessionError(None)
            else:
                self._check_workflow_owner(session)
                self._end_workflow()
                if not session.seedless:
                    # Restore and verify the exact wallet session before top-level commands.
                    self._ensure_handshake()
                    status = self._v2_call(
                        messages.DeviceStatusGet(),
                        expect=messages.DeviceStatus,
                        timeout=5.0,
                    )
                    self._resume_firmware_session(session, status)
                    self._active_session = session
            try:
                resp = self._v2_call(msg, expect=expect, timeout=timeout or 120.0)
            except (exceptions.Cancelled, exceptions.OneKeyFailure):
                # The device returned a complete response; the link stays usable.
                self._end_workflow()
                raise
            except BaseException:
                self._end_workflow()
                with suppress(Exception):
                    self._raw_write(messages.Cancel())
                with suppress(Exception):
                    self.transport.close()
                self._reset_link_state()
                raise
            if (
                isinstance(resp, messages.TxRequest)
                and resp.request_type != messages.RequestType.TXFINISHED
                and not session.seedless
            ):
                # Keep this wallet reserved until the signing exchange finishes.
                self._workflow_session = session
                self._workflow_generation = self._link_generation()
            else:
                self._end_workflow()
            return resp
