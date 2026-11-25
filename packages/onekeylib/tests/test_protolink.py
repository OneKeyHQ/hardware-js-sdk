import unittest
from unittest import mock

import usb1

from onekeylib.mapping import DEFAULT_MAPPING
from onekeylib.messages import ProtocolInfoRequest
from onekeylib.transport import Timeout, TransportException
from onekeylib.transport.protolink import ProtoLinkTransport, crc8, encode_frame


class TestProtoLinkTransport(unittest.TestCase):
    def make_transport(self, chunks=()):
        transport = ProtoLinkTransport.__new__(ProtoLinkTransport)
        transport.device = mock.Mock()
        transport.handle = mock.Mock()
        transport.handle.bulkRead.side_effect = list(chunks)
        transport.interface = 0
        transport.ep_in = 0x81
        transport.ep_out = 0x01
        transport._buffer = bytearray()
        transport._sequence = 0
        transport._last_response_seq = None
        transport._opened = 1
        return transport

    def test_crc8_and_protocol_info_golden_vector(self):
        self.assertEqual(0x76, crc8(b"123456789"))
        wire_type, payload = DEFAULT_MAPPING.encode(
            ProtocolInfoRequest(eventless_wallet_session=True)
        )
        self.assertEqual(
            bytes.fromhex("5a0c008200000128eb08018f"),
            encode_frame(wire_type, payload, 1),
        )

    def test_fragmented_and_coalesced_frames(self):
        first = encode_frame(60603, b"first", 1)
        second = encode_frame(61201, b"second", 2)
        transport = self.make_transport([first[:2], first[2:7], first[7:] + second])
        self.assertEqual((60603, b"first"), transport.read_message(timeout=1.0))
        self.assertEqual((61201, b"second"), transport.read_message(timeout=1.0))

    def test_ack_frame_is_skipped(self):
        ack = bytearray.fromhex("5a08000000010100")
        ack[3] = crc8(ack[:3])
        ack[-1] = crc8(ack[:-1])
        data = encode_frame(60603, b"status", 2)
        transport = self.make_transport([bytes(ack) + data])
        self.assertEqual((60603, b"status"), transport.read_message(timeout=1.0))

    def test_corrupt_frames_rejected(self):
        frame = encode_frame(60603, b"status", 1)
        for idx in (0, 3, -1):
            with self.subTest(index=idx):
                bad = bytearray(frame)
                bad[idx] ^= 1
                with self.assertRaises(TransportException):
                    self.make_transport([bytes(bad)]).read_message(timeout=1.0)

    def test_timeout_and_short_write(self):
        transport = self.make_transport()
        transport.handle.bulkRead.side_effect = usb1.USBErrorTimeout()
        with mock.patch("onekeylib.transport.protolink.time.monotonic", side_effect=[0, 0, 2]):
            with self.assertRaises(Timeout):
                transport.read_message(timeout=1.0)
        self.assertIsNone(transport.handle)

        transport2 = self.make_transport()
        transport2.handle.bulkWrite.return_value = 1
        with self.assertRaises(TransportException):
            transport2.write_message(15, b"sign")
        self.assertIsNone(transport2.handle)
