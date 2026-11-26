# This file is part of the OneKey Python library.
#
# Copyright (C) OneKey
#
# This library is free software: you can redistribute it and/or modify
# it under the terms of the GNU Lesser General Public License version 3
# as published by the Free Software Foundation.

"""OneKey Protocol V2 (proto_link) USB Bulk transport for Pro 2 and Neo."""

from __future__ import annotations

import atexit
import logging
import struct
import threading
import time
import typing as t

from contextlib import suppress

from ..models import V2_MODELS, OneKeyModel
from . import DeviceIsBusy, Timeout, Transport, TransportException

LOG = logging.getLogger(__name__)

try:
    import usb1

    USB_IMPORTED = True
except Exception as e:
    LOG.warning("ProtoLink USB transport is disabled: %s", e)
    USB_IMPORTED = False

FRAME_MAGIC = 0x5A
HEAD_SIZE = 8
MAX_FRAME_LENGTH = 4200
USB_READ_SIZE = 4096
USB_WRITE_TIMEOUT_MS = 5000
USB_POLL_TIMEOUT_MS = 200


def crc8(data: bytes | bytearray) -> int:
    crc = 0x30
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (0x8C if crc & 1 else 0)
    return crc


def encode_frame(wire_type: int, payload: bytes, sequence: int) -> bytes:
    length = len(payload) + 10
    if length > MAX_FRAME_LENGTH:
        raise ValueError("OneKey proto_link frame too large")
    seq = sequence & 0xFF
    if seq == 0:
        raise ValueError("OneKey proto_link sequence cannot be 0")
    header = struct.pack("<BH", FRAME_MAGIC, length)
    frame = header + bytes([crc8(header), 0, 0, seq])
    frame += struct.pack("<H", wire_type) + payload
    return frame + bytes([crc8(frame)])


def dev_to_str(dev: "usb1.USBDevice") -> str:
    return f"{dev.getBusNumber()}:{dev.getDeviceAddress()}"


class ProtoLinkTransport(Transport):
    """USB Bulk transport implementing OneKey Protocol V2 (proto_link) framing."""

    PATH_PREFIX = "onekey"
    CHUNK_SIZE = None
    ENABLED = USB_IMPORTED
    context: "usb1.USBContext | None" = None

    def __init__(self, device: "usb1.USBDevice") -> None:
        self.device = device
        self.handle: "usb1.USBDeviceHandle | None" = None
        self.interface: int | None = None
        self.ep_in: int | None = None
        self.ep_out: int | None = None
        self._buffer = bytearray()
        self._sequence = 0
        self._last_response_seq: int | None = None
        # Sequences written on the current link whose ACK has not been seen yet.
        # Cancel may be written while another request is pending, so ACKs are
        # matched against this set rather than only the latest request.
        self._unacked: set[int] = set()
        self._write_lock = threading.Lock()
        # Incremented on every successful open so clients can detect a replaced link.
        self.generation = 0
        super().__init__()

    @classmethod
    def enumerate(
        cls, models: t.Iterable[OneKeyModel] | None = None
    ) -> t.Iterable["ProtoLinkTransport"]:
        if not cls.ENABLED:
            return []
        if cls.context is None:
            cls.context = usb1.USBContext()
            cls.context.open()
            atexit.register(cls.context.close)

        if models is None:
            models = V2_MODELS
        usb_ids = {usb_id for m in models if m.protocol_version == 2 for usb_id in m.usb_ids}
        if not usb_ids:
            return []

        devices: list[ProtoLinkTransport] = []
        for dev in cls.context.getDeviceIterator(skip_on_error=True):
            if (dev.getVendorID(), dev.getProductID()) not in usb_ids:
                continue
            if cls._find_bulk_interface(dev) is None:
                continue
            devices.append(cls(dev))
        return devices

    @staticmethod
    def _find_bulk_interface(dev: "usb1.USBDevice") -> tuple[int, int, int] | None:
        for setting in dev.iterSettings():
            if setting.getClass() != 0xFF or setting.getAlternateSetting() != 0:
                continue
            endpoints = [
                ep.getAddress()
                for ep in setting.iterEndpoints()
                if (ep.getAttributes() & 3) == usb1.TRANSFER_TYPE_BULK
            ]
            incoming = [ep for ep in endpoints if ep & 0x80]
            outgoing = [ep for ep in endpoints if not (ep & 0x80)]
            if len(incoming) == 1 and len(outgoing) == 1:
                return setting.getNumber(), incoming[0], outgoing[0]
        return None

    def get_path(self) -> str:
        return f"{self.PATH_PREFIX}:{dev_to_str(self.device)}"

    def is_open(self) -> bool:
        return self.handle is not None

    def _open(self) -> None:
        usb_ids = {usb_id for m in V2_MODELS for usb_id in m.usb_ids}
        if (self.device.getVendorID(), self.device.getProductID()) not in usb_ids:
            raise TransportException("USB device is not a supported OneKey V2 device")
        endpoints = self._find_bulk_interface(self.device)
        if endpoints is None:
            raise TransportException("OneKey proto_link bulk interface not found")
        interface, ep_in, ep_out = endpoints
        try:
            handle = self.device.open()
        except Exception as e:
            raise TransportException(f"Cannot open OneKey USB device: {e}") from e
        try:
            handle.claimInterface(interface)
        except usb1.USBErrorBusy as e:
            handle.close()
            raise DeviceIsBusy(f"OneKey USB interface is busy: {e}") from e
        except Exception as e:
            handle.close()
            raise TransportException(f"Cannot claim OneKey USB interface: {e}") from e

        self.handle = handle
        self.interface = interface
        self.ep_in = ep_in
        self.ep_out = ep_out
        self._buffer.clear()
        self._last_response_seq = None
        self._unacked.clear()
        try:
            self._drain()
        except BaseException:
            self._close()
            raise
        self.generation += 1

    def _drain(self) -> None:
        assert self.handle is not None and self.ep_in is not None
        deadline = time.monotonic() + 1.0
        while time.monotonic() < deadline:
            try:
                self.handle.bulkRead(self.ep_in, USB_READ_SIZE, timeout=50)
            except usb1.USBErrorTimeout:
                return
        raise DeviceIsBusy("OneKey USB connection is busy")

    def _close(self) -> None:
        try:
            if self.handle is not None:
                try:
                    if self.interface is not None:
                        self.handle.releaseInterface(self.interface)
                finally:
                    self.handle.close()
        finally:
            self.handle = None
            self.interface = None
            self.ep_in = None
            self.ep_out = None
            self._buffer.clear()
            self._last_response_seq = None
            self._unacked.clear()

    def _close_after_link_error(self) -> None:
        # Preserve the original link error even if releasing the dead handle fails.
        with suppress(Exception):
            self.close()

    def write_chunk(self, chunk: bytes, /) -> None:
        if self.handle is None or self.ep_out is None:
            raise TransportException("OneKey USB transport is not open")
        try:
            written = self.handle.bulkWrite(self.ep_out, chunk, timeout=USB_WRITE_TIMEOUT_MS)
        except Exception as e:
            self._close_after_link_error()
            raise TransportException(f"OneKey USB write failed: {e}") from e
        if written != len(chunk):
            self._close_after_link_error()
            raise TransportException("Incomplete OneKey USB write")

    def read_chunk(self, *, timeout: float | None = None) -> bytes:
        if self.handle is None or self.ep_in is None:
            raise TransportException("OneKey USB transport is not open")
        timeout_ms = USB_POLL_TIMEOUT_MS if timeout is None else max(1, int(timeout * 1000))
        try:
            return bytes(self.handle.bulkRead(self.ep_in, USB_READ_SIZE, timeout=timeout_ms))
        except usb1.USBErrorTimeout as e:
            raise Timeout("OneKey USB read timed out") from e
        except Exception as e:
            self._close_after_link_error()
            raise TransportException(f"OneKey USB read failed: {e}") from e

    def write_message(self, wire_type: int, payload: bytes) -> int:
        # Serialized separately from the client's request lock so that a host
        # Cancel can reach the device while a request waits for confirmation.
        with self._write_lock:
            self._sequence = (self._sequence % 255) + 1
            seq = self._sequence
            frame = encode_frame(wire_type, payload, seq)
            self._unacked.add(seq)
            try:
                self.write_chunk(frame)
            except BaseException:
                self._unacked.discard(seq)
                raise
            return seq

    def read_message(
        self,
        *,
        timeout: float | None = 120.0,
        cancelled: t.Callable[[], bool] | None = None,
        expected_ack_seq: int | None = None,
    ) -> tuple[int, bytes]:
        deadline = None if timeout is None else time.monotonic() + timeout
        try:
            while True:
                if cancelled is not None and cancelled():
                    raise TransportException("Cancelled by host")
                if len(self._buffer) >= 1 and self._buffer[0] != FRAME_MAGIC:
                    raise TransportException("Invalid OneKey proto_link SOF")
                if len(self._buffer) >= 3:
                    length = int.from_bytes(self._buffer[1:3], "little")
                    if length > MAX_FRAME_LENGTH:
                        raise TransportException("OneKey proto_link frame too large")
                    if length < HEAD_SIZE:
                        raise TransportException("Invalid OneKey proto_link frame length")
                if len(self._buffer) >= 4:
                    if crc8(self._buffer[:3]) != self._buffer[3]:
                        raise TransportException("Invalid OneKey proto_link frame header")
                    length = int.from_bytes(self._buffer[1:3], "little")
                    if len(self._buffer) >= length:
                        frame = bytes(self._buffer[:length])
                        del self._buffer[:length]
                        if crc8(frame[:-1]) != frame[-1]:
                            raise TransportException("Invalid OneKey proto_link frame checksum")
                        if frame[4] != 0 or (frame[5] >> 2) != 0:
                            raise TransportException("Unexpected OneKey proto_link channel")
                        seq = frame[6]
                        if seq == 0:
                            raise TransportException("Invalid OneKey proto_link sequence")
                        packet_type = frame[5] & 3
                        if packet_type == 1:
                            if length != HEAD_SIZE:
                                raise TransportException("Invalid OneKey proto_link ACK length")
                            with self._write_lock:
                                acked = seq in self._unacked
                                self._unacked.discard(seq)
                            if not acked and (expected_ack_seq is None or seq != expected_ack_seq):
                                raise TransportException("Mismatched OneKey proto_link ACK sequence")
                            continue
                        if packet_type != 0 or length < 10:
                            raise TransportException("Invalid OneKey proto_link data frame")
                        if self._last_response_seq is not None and seq == self._last_response_seq:
                            raise TransportException("Duplicate OneKey proto_link response sequence")
                        self._last_response_seq = seq
                        wire_type = int.from_bytes(frame[7:9], "little")
                        return wire_type, frame[9:-1]
                if deadline is not None and time.monotonic() >= deadline:
                    raise Timeout("OneKey USB request timed out")
                try:
                    chunk = self.read_chunk(timeout=USB_POLL_TIMEOUT_MS / 1000.0)
                    self._buffer.extend(chunk)
                except Timeout:
                    continue
        except (TransportException, Timeout):
            self._close_after_link_error()
            raise
