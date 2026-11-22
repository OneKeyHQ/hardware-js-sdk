"""Byte pipe for proto_link. USB and tests both supply read/write."""

import time

from .codec import (BUTTON_ACK, BUTTON_REQUEST, CANCEL, DEVICE_SESSION_ASK_PASSPHRASE,
                    DEVICE_SESSION_ASK_PIN, GET_ADDRESS, GET_PUBLIC_KEY, SIGN_TX, TX_ACK, TX_REQUEST)
from .frame import PACKET_TYPE_ACK, RX_BUFFER_SIZE, SeqCounter, decode, encode_message, pop_frame, split_message


class LinkError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


class Link:
    def __init__(self, read, write, close=None):
        self._read = read
        self._write = write
        self._close = close or (lambda: None)
        self._seq = SeqCounter()
        self._buffer = bytearray()
        self._closed = False
        self._pending = False
        self._last_response_seq = None

    def exchange(self, msg_type, payload, *, deadline, cancelled):
        if self._closed:
            raise LinkError("STALE")
        try:
            self._check(deadline, cancelled)
            self._pending = msg_type in (DEVICE_SESSION_ASK_PIN, DEVICE_SESSION_ASK_PASSPHRASE,
                                         GET_PUBLIC_KEY, GET_ADDRESS, SIGN_TX, TX_ACK, BUTTON_ACK)
            request_seq = self._seq.next()
            self._write(encode_message(msg_type, payload, seq=request_seq))
            return self._receive(deadline, cancelled, request_seq)
        except LinkError as error:
            if self._pending and error.code in ("CANCELLED", "TIMEOUT"):
                # Interrupt only user requests, never protocol probes. This is
                # one-way cancellation, not a retry of the original request.
                try:
                    self._write(encode_message(CANCEL, b"", seq=self._seq.next()))
                except Exception:
                    pass
            try:
                self.close()
            except Exception:
                pass
            raise

    def _receive(self, deadline, cancelled, request_seq):
        while True:
            self._check(deadline, cancelled)
            frame = pop_frame(self._buffer)
            if frame is None:
                remaining = max(1, int((deadline - time.monotonic()) * 1000))
                chunk = self._read(RX_BUFFER_SIZE, min(200, remaining))
                if not chunk:
                    continue
                if len(chunk) > RX_BUFFER_SIZE:
                    raise LinkError("PROTOCOL")
                self._buffer.extend(chunk)
                continue
            try:
                decoded = decode(frame)
            except ValueError:
                raise LinkError("PROTOCOL") from None
            # USB command replies must stay on this link's route and source.
            if decoded.channel != 0 or decoded.packet_src != 0:
                raise LinkError("PROTOCOL")
            if decoded.packet_type == PACKET_TYPE_ACK:
                if decoded.seq != request_seq:
                    raise LinkError("PROTOCOL")
                continue
            # Device TX is global across routes: allow gaps and wrap, but not
            # consecutive duplicate business replies. ACKs use the host cursor.
            if decoded.seq == self._last_response_seq:
                raise LinkError("PROTOCOL")
            try:
                message = split_message(decoded.payload)
                self._last_response_seq = decoded.seq
                self._pending = message[0] in (BUTTON_REQUEST, TX_REQUEST)
                return message
            except ValueError:
                raise LinkError("PROTOCOL") from None

    def close(self):
        if not self._closed:
            self._closed = True
            self._buffer.clear()
            self._pending = False
            self._close()

    @staticmethod
    def _check(deadline, cancelled):
        if cancelled is not None and cancelled.is_set():
            raise LinkError("CANCELLED")
        if time.monotonic() >= deadline:
            raise LinkError("TIMEOUT")
