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
import typing as t
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


class SessionV2(client.Session["OneKeyClientV2", t.Optional[bytes]]):
    """Protocol V2 wallet session compatible with `onekeylib.btc` workflows."""

    def __init__(
        self,
        client: "OneKeyClientV2",
        session_id: bytes | None,
        *,
        btc_test_address: str | None = None,
        attach_pin: bool = False,
        root_fingerprint: bytes | None = None,
    ) -> None:
        super().__init__(client, session_id, root_fingerprint=root_fingerprint)
        self.btc_test_address = btc_test_address
        self.attach_pin = attach_pin

    def close(self) -> None:
        self.is_invalid = True


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
        self._handshaked = False
        self._eventless = False
        self._device_status: messages.DeviceStatus | None = None
        self._device_info: messages.DeviceInfo | None = None
        self._active_session: SessionV2 | None = None

    def _raw_write(self, msg: MessageType) -> None:
        active_mapping = self._mapping or mapping_mod.DEFAULT_MAPPING
        wire_type, payload = active_mapping.encode(msg)
        self.transport.write_message(wire_type, payload)

    def _raw_read(self, timeout: float | None = None) -> MessageType:
        active_mapping = self._mapping or mapping_mod.DEFAULT_MAPPING
        wire_type, payload = self.transport.read_message(timeout=timeout)
        return active_mapping.decode(wire_type, payload)

    def _v2_call(
        self,
        msg: MessageType,
        *,
        expect: type[MT],
        timeout: float | None = 120.0,
    ) -> MT:
        self._raw_write(msg)
        while True:
            resp = self._raw_read(timeout=timeout)
            if isinstance(resp, messages.V2Failure):
                if resp.code == 5 and resp.subcode == 1:
                    raise exceptions.Cancelled(resp.message or "Cancelled on device")
                raise exceptions.OneKeyFailure(
                    messages.Failure(
                        code=messages.FailureType.ActionCancelled
                        if resp.code == 5 and resp.subcode == 1
                        else messages.FailureType.ProcessError,
                        message=resp.message or f"OneKey V2 failure ({resp.code}:{resp.subcode})",
                    )
                )
            if isinstance(resp, messages.Failure):
                if resp.code == messages.FailureType.ActionCancelled:
                    raise exceptions.Cancelled(resp.message or "Cancelled on device")
                raise exceptions.OneKeyFailure(resp)
            if isinstance(resp, messages.ButtonRequest):
                self.app._callback_button(resp)
                self._raw_write(messages.ButtonAck())
                continue
            if not isinstance(resp, expect):
                raise exceptions.UnexpectedMessageError(expect, resp)
            return resp

    def _ensure_handshake(self) -> None:
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

    @enter_context
    def refresh_features(self) -> messages.Features:
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
        self._ensure_handshake()
        status = self._v2_call(
            messages.DeviceStatusGet(),
            expect=messages.DeviceStatus,
            timeout=5.0,
        )
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
        if status.unlocked is not True:
            raise exceptions.DeviceLockedError("OneKey device is locked")
        self._device_status = status

    @enter_context
    def get_session(
        self,
        passphrase: str | client.PassphraseSetting = client.PassphraseSetting.AUTO,
        *,
        derive_cardano: bool = False,
        session_id: bytes | None = None,
        btc_test_address: str | None = None,
    ) -> SessionV2:
        del derive_cardano
        self._ensure_handshake()
        if self._features is None:
            self.refresh_features()

        if passphrase is client.PassphraseSetting.NONE:
            return SessionV2(self, None)

        self.ensure_unlocked()
        assert self._device_status is not None
        status = self._device_status

        if session_id is not None:
            resumed = self._v2_call(
                messages.DeviceSessionGet(
                    session_id=session_id,
                    btc_test_address=btc_test_address,
                ),
                expect=messages.DeviceSession,
                timeout=10.0,
            )
            if (
                not resumed.session_id
                or resumed.session_id != session_id
                or (btc_test_address is not None and resumed.btc_test_address != btc_test_address)
                or 1 not in resumed.seed_domains
            ):
                raise exceptions.InvalidSessionError(session_id)
            sess = SessionV2(
                self,
                resumed.session_id,
                btc_test_address=resumed.btc_test_address,
                attach_pin=status.unlocked_by_attach_to_pin is True,
            )
            self._active_session = sess
            return sess

        attach_pin = status.unlocked_by_attach_to_pin is True
        if not attach_pin and status.passphrase_enabled:
            if passphrase is client.PassphraseSetting.STANDARD_WALLET:
                self._v2_call(
                    messages.DeviceSessionAskPassphrase(
                        passphrase="",
                        on_device=False,
                        seed_domains=[1],
                    ),
                    expect=messages.V2Success,
                    timeout=30.0,
                )
            elif passphrase in (client.PassphraseSetting.ON_DEVICE, client.PassphraseSetting.AUTO):
                self._v2_call(
                    messages.DeviceSessionAskPassphrase(
                        on_device=True,
                        seed_domains=[1],
                    ),
                    expect=messages.V2Success,
                    timeout=120.0,
                )
            elif isinstance(passphrase, str):
                self._v2_call(
                    messages.DeviceSessionAskPassphrase(
                        passphrase=passphrase,
                        on_device=False,
                        seed_domains=[1],
                    ),
                    expect=messages.V2Success,
                    timeout=30.0,
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
            opened.session_id,
            btc_test_address=opened.btc_test_address,
            attach_pin=attach_pin,
        )
        self._active_session = sess
        return sess

    def get_seedless_session(self) -> SessionV2:
        return SessionV2(self, None)

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

    def _write(self, session: SessionV2, msg: MessageType) -> None:
        del session
        self._raw_write(msg)

    def _read(self, session: SessionV2, timeout: float | None = None) -> MessageType:
        del session
        return self._raw_read(timeout=timeout)

    def _call_raw(
        self,
        session: SessionV2,
        msg: MessageType,
        timeout: float | None = None,
    ) -> MessageType:
        self._write(session, msg)
        return self._read(session, timeout=timeout)

    def _call(
        self,
        session: SessionV2,
        msg: MessageType,
        *,
        expect: type[MT] = messages.protobuf.MessageType,  # type: ignore[assignment]
        timeout: float | None = None,
    ) -> MT:
        if session.id is not None:
            # Verify live session before Bitcoin/wallet calls
            status = self._v2_call(
                messages.DeviceStatusGet(),
                expect=messages.DeviceStatus,
                timeout=5.0,
            )
            if status.unlocked is not True:
                raise exceptions.DeviceLockedError("OneKey was locked")
            if (status.unlocked_by_attach_to_pin is True) != session.attach_pin:
                raise exceptions.InvalidSessionError(session.id)
        try:
            return self._v2_call(msg, expect=expect, timeout=timeout or 120.0)
        except exceptions.Cancelled:
            # Device-side cancel leaves USB link intact; do not tear down transport.
            raise
        except BaseException:
            with suppress(Exception):
                self._raw_write(messages.Cancel())
            raise
