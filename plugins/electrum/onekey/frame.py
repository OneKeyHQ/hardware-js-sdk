"""proto_link framing, matching firmware-pro2 sys/frame_codec/proto_link.

A USB read is not a frame. Bytes are kept until the little-endian length
field is satisfied, up to the complete-frame protocol limit.
"""

from .crc8 import crc8


SOF = 0x5A
HEAD_SIZE = 8
RX_BUFFER_SIZE = 4096
FRAME_MAX_SIZE = 4200
PACKET_TYPE_PACKET = 0
PACKET_TYPE_ACK = 1


class Frame:
    def __init__(self, channel, packet_src, packet_type, seq, payload):
        self.channel = channel
        self.packet_src = packet_src
        self.packet_type = packet_type
        self.seq = seq
        self.payload = payload


class SeqCounter:
    """Sequence 0 is reserved by the device, so the counter skips it."""

    def __init__(self):
        self._seq = 0

    def next(self):
        self._seq = (self._seq + 1) & 0xFF
        if self._seq == 0:
            self._seq = 1
        return self._seq


def encode(payload, *, seq, channel=0, packet_src=0, packet_type=PACKET_TYPE_PACKET):
    total = len(payload) + HEAD_SIZE
    if total > FRAME_MAX_SIZE:
        raise ValueError("frame too large")
    frame = bytearray(total)
    frame[0] = SOF
    frame[1] = total & 0xFF
    frame[2] = (total >> 8) & 0xFF
    frame[3] = crc8(frame[:3])
    frame[4] = channel & 0xFF
    frame[5] = ((packet_src & 0x0F) << 2) | (packet_type & 0x03)
    frame[6] = seq & 0xFF
    frame[7:7 + len(payload)] = payload
    frame[-1] = crc8(frame[:-1])
    return bytes(frame)


def decode(buf):
    if len(buf) < HEAD_SIZE or buf[0] != SOF:
        raise ValueError("invalid SOF")
    total = buf[1] | (buf[2] << 8)
    if total > FRAME_MAX_SIZE:
        raise ValueError("frame too large")
    if total != len(buf):
        raise ValueError("length mismatch")
    if crc8(buf[:3]) != buf[3] or crc8(buf[:-1]) != buf[-1]:
        raise ValueError("bad CRC")
    attr = buf[5]
    packet_type = attr & 0x03
    if buf[6] == 0 or packet_type not in (PACKET_TYPE_PACKET, PACKET_TYPE_ACK):
        raise ValueError("invalid sequence or packet type")
    if packet_type == PACKET_TYPE_ACK and total != HEAD_SIZE:
        raise ValueError("invalid ACK length")
    return Frame(buf[4], (attr >> 2) & 0x0F, packet_type, buf[6], bytes(buf[7:-1]))


def encode_message(msg_type, payload, *, seq, channel=0, packet_src=0):
    body = bytes((msg_type & 0xFF, (msg_type >> 8) & 0xFF)) + payload
    return encode(body, seq=seq, channel=channel, packet_src=packet_src)


def split_message(payload):
    if len(payload) < 2:
        raise ValueError("short payload")
    return payload[0] | (payload[1] << 8), payload[2:]


def pop_frame(buf, limit=FRAME_MAX_SIZE):
    """Remove one complete frame from buf, or return None if more bytes are required."""
    if not buf:
        return None
    if buf[0] != SOF:
        raise ValueError("invalid SOF")
    if len(buf) < 4:
        return None
    total = buf[1] | (buf[2] << 8)
    if total < HEAD_SIZE or total > min(limit, FRAME_MAX_SIZE):
        raise ValueError("invalid frame length")
    if crc8(buf[:3]) != buf[3]:
        raise ValueError("bad header CRC")
    if len(buf) < total:
        return None
    frame = bytes(buf[:total])
    del buf[:total]
    return frame
