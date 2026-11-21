"""Byte pipe for proto_link. USB and tests both supply read/write."""

import time

from .frame import PACKET_TYPE_PACKET, RX_BUFFER_SIZE, SeqCounter, decode, encode_message, pop_frame, split_message


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

    def exchange(self, msg_type, payload, *, deadline, cancelled):
        self._check(deadline, cancelled)
        self._write(encode_message(msg_type, payload, seq=self._seq.next()))
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
            if decoded.packet_type != PACKET_TYPE_PACKET:
                continue
            try:
                return split_message(decoded.payload)
            except ValueError:
                raise LinkError("PROTOCOL") from None

    def close(self):
        self._close()

    @staticmethod
    def _check(deadline, cancelled):
        if cancelled is not None and cancelled.is_set():
            raise LinkError("CANCELLED")
        if time.monotonic() >= deadline:
            raise LinkError("TIMEOUT")
