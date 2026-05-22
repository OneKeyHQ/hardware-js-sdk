"""
OneKey Pro 2 WebUSB Upgrade Tool (Python)

Implements: ping, reboot, file_write, file_delete, fw_update, fw_status,
            path_info, disk_control, listen

fw_update prints FirmwareInstallProgress (msg 61001) frames the device pushes
during installation, plus any FirmwareUpdateStatus (msg 61003) frames.
`listen` is a standalone subcommand that prints incoming FirmwareInstallProgress
and FirmwareUpdateStatus frames.

Usage examples:
    python onekey_webusb.py ping --message "hello"
    python onekey_webusb.py reboot --type 0
    python onekey_webusb.py file_write --src ./firmware.bin --dst vol1:firmware.bin
    python onekey_webusb.py fw_update --target 0 --path vol1:firmware.bin --reboot
    python onekey_webusb.py fw_status
    python onekey_webusb.py path_info --path vol1:firmware.bin
    python onekey_webusb.py file_delete --path vol1:firmware.bin
    python onekey_webusb.py disk_control --enable 1   # 1 = enable MSC, 0 = disable
    python onekey_webusb.py listen --duration 60
"""

import argparse
import os
import struct
import sys
import time
from typing import Optional, Tuple

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import usb.core
import usb.util

try:
    import libusb_package
    _LIBUSB_BACKEND = libusb_package.get_libusb1_backend()
except Exception:
    _LIBUSB_BACKEND = None


VID = 0x1209
PID = 0x53C1

PROTO_HEAD_SOF = 0x5A
PROTO_HEAD_CRC_SIZE = 8
PROTO_DATA_TYPE_PACKET = 0
CRC8_INIT = 0x30

RX_BUFFER_SIZE = 4096
DEFAULT_TIMEOUT_MS = 5000


PB_MSG_TYPE = {
    "Ping": 60206,
    "Success": 60207,
    "Failure": 60208,
    "Reboot": 60400,
    "SyncFindmyToken": 60700,
    "FixPermission": 60800,
    "PathInfo": 60801,
    "PathInfoQuery": 60802,
    "File": 60803,
    "FileRead": 60804,
    "FileWrite": 60805,
    "FileDelete": 60806,
    "Dir": 60807,
    "DirList": 60808,
    "DirMake": 60809,
    "DirRemove": 60810,
    "FilesystemDiskControl": 60812,
    "FirmwareUpdate": 61000,
    "FirmwareInstallProgress": 61001,
    "GetFirmwareUpdateStatus": 61002,
    "FirmwareUpdateStatus": 61003,
}
PB_MSG_NAME = {v: k for k, v in PB_MSG_TYPE.items()}


FW_TARGET_NAME = {
    0: "Main App",
    1: "Main Bootloader",
    2: "BLE",
    3: "SE1",
    4: "SE2",
    5: "SE3",
    6: "SE4",
    10: "Resource",
}

REBOOT_TYPE_NAME = {0: "Normal", 1: "Boardloader", 2: "BootLoader"}

# FirmwareUpdateStatusEntry.status enum (matches webusb_upgrade_0330.html FW_STATUS_NAME).
FW_STATUS_NAME = {0: "finished", 1: "in_progress", 2: "failed"}

# FilesystemDiskControl.enable values (mirrors DISK_CTRL_NAME in webusb_upgrade_0330.html).
DISK_CTRL_NAME = {0: "Disable MSC", 1: "Enable MSC"}


CRC8_TABLE = bytes([
    0x00, 0x5e, 0xbc, 0xe2, 0x61, 0x3f, 0xdd, 0x83, 0xc2, 0x9c, 0x7e, 0x20, 0xa3, 0xfd, 0x1f, 0x41,
    0x9d, 0xc3, 0x21, 0x7f, 0xfc, 0xa2, 0x40, 0x1e, 0x5f, 0x01, 0xe3, 0xbd, 0x3e, 0x60, 0x82, 0xdc,
    0x23, 0x7d, 0x9f, 0xc1, 0x42, 0x1c, 0xfe, 0xa0, 0xe1, 0xbf, 0x5d, 0x03, 0x80, 0xde, 0x3c, 0x62,
    0xbe, 0xe0, 0x02, 0x5c, 0xdf, 0x81, 0x63, 0x3d, 0x7c, 0x22, 0xc0, 0x9e, 0x1d, 0x43, 0xa1, 0xff,
    0x46, 0x18, 0xfa, 0xa4, 0x27, 0x79, 0x9b, 0xc5, 0x84, 0xda, 0x38, 0x66, 0xe5, 0xbb, 0x59, 0x07,
    0xdb, 0x85, 0x67, 0x39, 0xba, 0xe4, 0x06, 0x58, 0x19, 0x47, 0xa5, 0xfb, 0x78, 0x26, 0xc4, 0x9a,
    0x65, 0x3b, 0xd9, 0x87, 0x04, 0x5a, 0xb8, 0xe6, 0xa7, 0xf9, 0x1b, 0x45, 0xc6, 0x98, 0x7a, 0x24,
    0xf8, 0xa6, 0x44, 0x1a, 0x99, 0xc7, 0x25, 0x7b, 0x3a, 0x64, 0x86, 0xd8, 0x5b, 0x05, 0xe7, 0xb9,
    0x8c, 0xd2, 0x30, 0x6e, 0xed, 0xb3, 0x51, 0x0f, 0x4e, 0x10, 0xf2, 0xac, 0x2f, 0x71, 0x93, 0xcd,
    0x11, 0x4f, 0xad, 0xf3, 0x70, 0x2e, 0xcc, 0x92, 0xd3, 0x8d, 0x6f, 0x31, 0xb2, 0xec, 0x0e, 0x50,
    0xaf, 0xf1, 0x13, 0x4d, 0xce, 0x90, 0x72, 0x2c, 0x6d, 0x33, 0xd1, 0x8f, 0x0c, 0x52, 0xb0, 0xee,
    0x32, 0x6c, 0x8e, 0xd0, 0x53, 0x0d, 0xef, 0xb1, 0xf0, 0xae, 0x4c, 0x12, 0x91, 0xcf, 0x2d, 0x73,
    0xca, 0x94, 0x76, 0x28, 0xab, 0xf5, 0x17, 0x49, 0x08, 0x56, 0xb4, 0xea, 0x69, 0x37, 0xd5, 0x8b,
    0x57, 0x09, 0xeb, 0xb5, 0x36, 0x68, 0x8a, 0xd4, 0x95, 0xcb, 0x29, 0x77, 0xf4, 0xaa, 0x48, 0x16,
    0xe9, 0xb7, 0x55, 0x0b, 0x88, 0xd6, 0x34, 0x6a, 0x2b, 0x75, 0x97, 0xc9, 0x4a, 0x14, 0xf6, 0xa8,
    0x74, 0x2a, 0xc8, 0x96, 0x15, 0x4b, 0xa9, 0xf7, 0xb6, 0xe8, 0x0a, 0x54, 0xd7, 0x89, 0x6b, 0x35,
])


def crc8(data: bytes, length: int) -> int:
    crc = CRC8_INIT
    for i in range(length):
        crc = CRC8_TABLE[crc ^ data[i]]
    return crc


def encode_varint(value: int) -> bytes:
    out = bytearray()
    while value > 0x7F:
        out.append((value & 0x7F) | 0x80)
        value >>= 7
    out.append(value & 0x7F)
    return bytes(out)


def decode_varint(data: bytes, offset: int) -> Tuple[int, int]:
    value, shift = 0, 0
    while offset < len(data):
        b = data[offset]
        offset += 1
        value |= (b & 0x7F) << shift
        if (b & 0x80) == 0:
            break
        shift += 7
    return value, offset


def pb_encode_string(field: int, s: str) -> bytes:
    if not s:
        return b""
    s_bytes = s.encode("utf-8")
    tag = (field << 3) | 2
    return encode_varint(tag) + encode_varint(len(s_bytes)) + s_bytes


def pb_encode_uint32(field: int, value: int, required: bool = False) -> bytes:
    if value == 0 and not required:
        return b""
    tag = (field << 3) | 0
    return encode_varint(tag) + encode_varint(value)


def pb_encode_bool(field: int, value: bool) -> bytes:
    tag = (field << 3) | 0
    return encode_varint(tag) + bytes([1 if value else 0])


def pb_encode_bytes(field: int, data: bytes) -> bytes:
    if not data:
        return b""
    tag = (field << 3) | 2
    return encode_varint(tag) + encode_varint(len(data)) + data


def pb_encode_message_field(field: int, msg_bytes: bytes) -> bytes:
    tag = (field << 3) | 2
    return encode_varint(tag) + encode_varint(len(msg_bytes)) + msg_bytes


def encode_ping(message: str) -> bytes:
    return pb_encode_string(1, message)


def encode_file(path: str, offset: int, total_size: int,
                data: Optional[bytes] = None, data_hash: Optional[int] = None) -> bytes:
    out = bytearray()
    out += pb_encode_string(1, path)
    out += pb_encode_uint32(2, offset, required=True)
    out += pb_encode_uint32(3, total_size, required=True)
    if data:
        out += pb_encode_bytes(4, data)
    if data_hash is not None:
        out += pb_encode_uint32(5, data_hash)
    return bytes(out)


def encode_file_write(file_bytes: bytes, overwrite: bool, append: bool,
                      ui_percentage: Optional[int] = None) -> bytes:
    out = bytearray()
    out += pb_encode_message_field(1, file_bytes)
    out += pb_encode_bool(2, overwrite)
    out += pb_encode_bool(3, append)
    if ui_percentage is not None:
        out += pb_encode_uint32(4, ui_percentage)
    return bytes(out)


def encode_path_info_query(path: str) -> bytes:
    return pb_encode_string(1, path)


def encode_file_delete(path: str) -> bytes:
    """FileDelete { required string path = 1; }"""
    return pb_encode_string(1, path)


def encode_reboot(reboot_type: int) -> bytes:
    return pb_encode_uint32(1, reboot_type, required=True)


def encode_disk_control(enable: int) -> bytes:
    """FilesystemDiskControl { required uint32 enable = 1; }  (0=disable MSC, 1=enable MSC)"""
    return pb_encode_uint32(1, enable, required=True)


def encode_firmware_target(target_id: int, path: str) -> bytes:
    out = bytearray()
    out += pb_encode_uint32(1, target_id, required=True)
    out += pb_encode_string(2, path)
    return bytes(out)


def encode_firmware_update(targets, reboot_on_success: Optional[bool] = None) -> bytes:
    out = bytearray()
    for t in targets:
        tb = encode_firmware_target(t["target_id"], t["path"])
        out += pb_encode_message_field(1, tb)
    if reboot_on_success is not None:
        out += pb_encode_bool(2, reboot_on_success)
    return bytes(out)


def encode_get_firmware_update_status() -> bytes:
    """GetFirmwareUpdateStatus has no fields; the body is empty."""
    return b""


def decode_success(data: bytes) -> dict:
    offset = 0
    message = ""
    while offset < len(data):
        tag, offset = decode_varint(data, offset)
        field = tag >> 3
        wire = tag & 0x7
        if field == 1 and wire == 2:
            length, offset = decode_varint(data, offset)
            message = data[offset:offset + length].decode("utf-8", errors="replace")
            offset += length
        else:
            break
    return {"message": message}


def decode_failure(data: bytes) -> dict:
    offset = 0
    code, message = 0, ""
    while offset < len(data):
        tag, offset = decode_varint(data, offset)
        field = tag >> 3
        wire = tag & 0x7
        if field == 1 and wire == 0:
            code, offset = decode_varint(data, offset)
        elif field == 2 and wire == 2:
            length, offset = decode_varint(data, offset)
            message = data[offset:offset + length].decode("utf-8", errors="replace")
            offset += length
        else:
            break
    return {"code": code, "message": message}


def decode_file(data: bytes) -> dict:
    offset = 0
    result = {
        "path": "", "offset": 0, "total_size": 0,
        "data": None, "data_hash": None, "processed_byte": None,
    }
    while offset < len(data):
        tag, offset = decode_varint(data, offset)
        field = tag >> 3
        wire = tag & 0x7
        if wire == 0:
            val, offset = decode_varint(data, offset)
            if field == 2:
                result["offset"] = val
            elif field == 3:
                result["total_size"] = val
            elif field == 5:
                result["data_hash"] = val
            elif field == 6:
                result["processed_byte"] = val
        elif wire == 2:
            length, offset = decode_varint(data, offset)
            if field == 1:
                result["path"] = data[offset:offset + length].decode("utf-8", errors="replace")
            elif field == 4:
                result["data"] = bytes(data[offset:offset + length])
            offset += length
        else:
            break
    return result


def decode_firmware_install_progress(data: bytes) -> dict:
    """FirmwareInstallProgress { required FirmwareTargetType target_id=1; required uint32 progress=2; optional string stage=3; }"""
    offset = 0
    result = {"target_id": 0, "progress": 0, "stage": ""}
    while offset < len(data):
        tag, offset = decode_varint(data, offset)
        field = tag >> 3
        wire = tag & 0x7
        if wire == 0:
            val, offset = decode_varint(data, offset)
            if field == 1:
                result["target_id"] = val
            elif field == 2:
                result["progress"] = val
        elif wire == 2:
            length, offset = decode_varint(data, offset)
            if field == 3:
                result["stage"] = data[offset:offset + length].decode("utf-8", errors="replace")
            offset += length
        else:
            break
    return result


def decode_firmware_update_status_entry(data: bytes) -> dict:
    """FirmwareUpdateStatusEntry { required FirmwareTargetType target_id=1; required uint32 status=2; }"""
    offset = 0
    entry = {"target_id": 0, "status": 0}
    while offset < len(data):
        tag, offset = decode_varint(data, offset)
        field = tag >> 3
        wire = tag & 0x7
        if wire == 0:
            val, offset = decode_varint(data, offset)
            if field == 1:
                entry["target_id"] = val
            elif field == 2:
                entry["status"] = val
        else:
            break
    return entry


def decode_firmware_update_status(data: bytes) -> dict:
    """FirmwareUpdateStatus { repeated FirmwareUpdateStatusEntry targets=1; }"""
    offset = 0
    result = {"targets": []}
    while offset < len(data):
        tag, offset = decode_varint(data, offset)
        field = tag >> 3
        wire = tag & 0x7
        if wire == 2 and field == 1:
            length, offset = decode_varint(data, offset)
            entry_bytes = data[offset:offset + length]
            result["targets"].append(decode_firmware_update_status_entry(entry_bytes))
            offset += length
        else:
            break
    return result


def decode_path_info(data: bytes) -> dict:
    offset = 0
    result = {
        "exist": False, "size": 0,
        "year": 0, "month": 0, "day": 0,
        "hour": 0, "minute": 0, "second": 0,
        "readonly": False, "hidden": False, "system": False,
        "archive": False, "directory": False,
    }
    while offset < len(data):
        tag, offset = decode_varint(data, offset)
        field = tag >> 3
        wire = tag & 0x7
        if wire == 0:
            val, offset = decode_varint(data, offset)
            mapping = {
                1: "exist", 2: "size", 3: "year", 4: "month", 5: "day",
                6: "hour", 7: "minute", 8: "second",
                9: "readonly", 10: "hidden", 11: "system",
                12: "archive", 13: "directory",
            }
            if field in mapping:
                key = mapping[field]
                if isinstance(result[key], bool):
                    result[key] = val != 0
                else:
                    result[key] = val
        else:
            break
    return result


class ProtoFramer:
    def __init__(self):
        self.seq = 0

    def build(self, payload: bytes, packet_src: int = 0, router: int = 0) -> bytes:
        payload_len = len(payload) if payload else 0
        frame_len = payload_len + PROTO_HEAD_CRC_SIZE

        self.seq = (self.seq + 1) & 0xFF
        if self.seq == 0:
            self.seq = 1

        frame = bytearray(frame_len)
        frame[0] = PROTO_HEAD_SOF
        frame[1] = frame_len & 0xFF
        frame[2] = (frame_len >> 8) & 0xFF
        frame[3] = 0
        frame[4] = router & 0xFF
        frame[5] = ((packet_src & 0x0F) << 2) | (PROTO_DATA_TYPE_PACKET & 0x03)
        frame[6] = self.seq
        frame[3] = crc8(bytes(frame), 3)

        if payload:
            frame[7:7 + payload_len] = payload

        frame[frame_len - 1] = crc8(bytes(frame), frame_len - 1)
        return bytes(frame)


def build_pb_frame(framer: ProtoFramer, msg_type: int, pb_payload: bytes) -> bytes:
    header = struct.pack("<H", msg_type)
    return framer.build(header + pb_payload)


class WebUsbDevice:
    def __init__(self, vid: int = VID, pid: Optional[int] = None):
        self.vid = vid
        self.pid = pid
        self.dev = None
        self.intf = None
        self.ep_in = None
        self.ep_out = None
        self.rx_buffer = bytearray()
        self.framer = ProtoFramer()
        # Callback invoked for frames that do not match the expected reply
        # (e.g. unsolicited FirmwareInstallProgress). Signature: (msg_type, pb_payload) -> None.
        self.on_unsolicited = None
        # Set of msg_types that send_and_recv should accept as "the reply" for the current call.
        # When set, replies whose msg_type isn't in this set are dispatched to on_unsolicited and
        # send_and_recv keeps waiting. Default empty = accept the first frame received (legacy behavior).
        self._expected_reply_types: set = set()

    def open(self):
        find_kw = {"idVendor": self.vid}
        if self.pid is not None:
            find_kw["idProduct"] = self.pid
        if _LIBUSB_BACKEND is not None:
            find_kw["backend"] = _LIBUSB_BACKEND
        self.dev = usb.core.find(**find_kw)
        if self.dev is None:
            raise RuntimeError(
                f"Device not found (VID=0x{self.vid:04x}"
                + (f", PID=0x{self.pid:04x}" if self.pid is not None else "")
                + "). On Windows, install WinUSB driver via Zadig."
            )

        try:
            if self.dev.is_kernel_driver_active(0):
                self.dev.detach_kernel_driver(0)
        except (NotImplementedError, usb.core.USBError):
            pass

        try:
            self.dev.set_configuration()
        except usb.core.USBError:
            pass

        cfg = self.dev.get_active_configuration()

        for intf in cfg:
            if intf.bInterfaceClass == 0xFF:
                self.intf = intf
                break
        if self.intf is None:
            raise RuntimeError("No vendor-specific interface (class 0xFF) found.")

        try:
            usb.util.claim_interface(self.dev, self.intf.bInterfaceNumber)
        except usb.core.USBError as e:
            raise RuntimeError(f"claim_interface failed: {e}")

        for ep in self.intf:
            direction = usb.util.endpoint_direction(ep.bEndpointAddress)
            if direction == usb.util.ENDPOINT_IN:
                self.ep_in = ep
            else:
                self.ep_out = ep

        if self.ep_in is None or self.ep_out is None:
            raise RuntimeError("Could not find IN/OUT endpoints.")

        # Some firmware reboots (e.g. Reboot type=1) leave the device's bulk endpoints
        # STALLed without removing the device from the USB bus. clear_halt alone is
        # racy in that case (the device re-stalls right after). A full USB-level
        # reset is the reliable way to recover: it re-issues SET_CONFIG and the
        # endpoints come back fresh. Then we still clear_halt for good measure and
        # drain any stale IN data so we don't read leftovers as the next reply.
        try:
            self.dev.reset()
        except usb.core.USBError as e:
            print(f"[!] usb reset failed (continuing): {e}")
        # After reset the underlying handle is re-issued by the OS; re-claim.
        try:
            usb.util.claim_interface(self.dev, self.intf.bInterfaceNumber)
        except usb.core.USBError:
            pass
        for ep in (self.ep_in, self.ep_out):
            try:
                self.dev.clear_halt(ep.bEndpointAddress)
            except usb.core.USBError:
                pass
        # Drain any pending IN data left over from a previous session.
        drained = 0
        while True:
            try:
                data = self.dev.read(self.ep_in.bEndpointAddress, RX_BUFFER_SIZE, timeout=50)
                drained += len(data)
            except usb.core.USBError:
                break
        if drained:
            print(f"[*] drained {drained} bytes of stale IN data on open()")

        print(
            f"[+] Connected: VID=0x{self.dev.idVendor:04x} PID=0x{self.dev.idProduct:04x}, "
            f"intf={self.intf.bInterfaceNumber}, EP IN=0x{self.ep_in.bEndpointAddress:02x}, "
            f"OUT=0x{self.ep_out.bEndpointAddress:02x}"
        )

    def close(self):
        if self.dev is not None and self.intf is not None:
            try:
                usb.util.release_interface(self.dev, self.intf.bInterfaceNumber)
            except Exception:
                pass
            try:
                usb.util.dispose_resources(self.dev)
            except Exception:
                pass
        self.dev = None
        self.intf = None
        self.ep_in = None
        self.ep_out = None

    def _read_once(self, timeout_ms: int) -> bytes:
        try:
            data = self.dev.read(
                self.ep_in.bEndpointAddress, RX_BUFFER_SIZE, timeout=timeout_ms
            )
            return bytes(data)
        except usb.core.USBError as e:
            if "timed out" in str(e).lower() or "timeout" in str(e).lower():
                return b""
            raise

    def _try_parse_frame(self) -> Optional[Tuple[int, bytes]]:
        while len(self.rx_buffer) > 0:
            try:
                sof_idx = self.rx_buffer.index(PROTO_HEAD_SOF)
            except ValueError:
                self.rx_buffer.clear()
                return None

            if sof_idx > 0:
                del self.rx_buffer[:sof_idx]

            if len(self.rx_buffer) < PROTO_HEAD_CRC_SIZE:
                return None

            frame_len = self.rx_buffer[1] | (self.rx_buffer[2] << 8)
            if frame_len < PROTO_HEAD_CRC_SIZE or frame_len > 8192:
                del self.rx_buffer[0]
                continue

            if len(self.rx_buffer) < frame_len:
                return None

            frame = bytes(self.rx_buffer[:frame_len])
            del self.rx_buffer[:frame_len]

            head_crc = crc8(frame, 3)
            if head_crc != frame[3]:
                print(f"[RX] head CRC mismatch: calc=0x{head_crc:02x} got=0x{frame[3]:02x}")
                continue
            data_crc = crc8(frame, frame_len - 1)
            if data_crc != frame[frame_len - 1]:
                print(f"[RX] data CRC mismatch: calc=0x{data_crc:02x} got=0x{frame[frame_len - 1]:02x}")
                continue

            payload = frame[7:frame_len - 1]
            if len(payload) < 2:
                continue
            msg_type = payload[0] | (payload[1] << 8)
            pb_payload = payload[2:]
            return msg_type, pb_payload
        return None

    def send_and_recv(self, msg_type: int, pb_payload: bytes,
                      timeout_ms: int = DEFAULT_TIMEOUT_MS,
                      expected_reply_types: Optional[set] = None) -> Tuple[int, bytes]:
        """Send a request and wait for the matching reply.

        If `expected_reply_types` is given, any frame whose msg_type is NOT in that set is treated
        as unsolicited and forwarded to `self.on_unsolicited` (if set); the call keeps waiting
        until a frame with a matching msg_type arrives or the timeout elapses.
        If `expected_reply_types` is None, the first frame received is returned (legacy behavior).
        """
        frame = build_pb_frame(self.framer, msg_type, pb_payload)
        self.dev.write(self.ep_out.bEndpointAddress, frame, timeout=timeout_ms)

        accept = expected_reply_types  # may be None
        deadline = time.monotonic() + timeout_ms / 1000.0
        while True:
            parsed = self._try_parse_frame()
            if parsed is not None:
                if accept is None or parsed[0] in accept:
                    return parsed
                if self.on_unsolicited is not None:
                    try:
                        self.on_unsolicited(parsed[0], parsed[1])
                    except Exception as e:
                        print(f"[RX] on_unsolicited error: {e}")
                continue
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError(f"Response timeout for msg_type={msg_type}")
            chunk = self._read_once(int(remaining * 1000) + 1)
            if chunk:
                self.rx_buffer.extend(chunk)

    def drain_unsolicited(self, duration_ms: int) -> None:
        """Read any pending frames for the given duration and dispatch them to on_unsolicited.
        Useful for collecting trailing FirmwareInstallProgress frames after the final reply."""
        deadline = time.monotonic() + duration_ms / 1000.0
        while time.monotonic() < deadline:
            parsed = self._try_parse_frame()
            if parsed is not None:
                if self.on_unsolicited is not None:
                    try:
                        self.on_unsolicited(parsed[0], parsed[1])
                    except Exception as e:
                        print(f"[RX] on_unsolicited error: {e}")
                continue
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            chunk = self._read_once(max(1, int(remaining * 1000)))
            if chunk:
                self.rx_buffer.extend(chunk)


def format_bytes(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.2f} KB"
    return f"{n / (1024 * 1024):.2f} MB"


def handle_resp_simple(name: str, resp: Tuple[int, bytes]) -> int:
    msg_type, pb_payload = resp
    if msg_type == PB_MSG_TYPE["Success"]:
        decoded = decode_success(pb_payload)
        print(f"[+] {name} Success: \"{decoded['message']}\"")
        return 0
    if msg_type == PB_MSG_TYPE["Failure"]:
        decoded = decode_failure(pb_payload)
        print(f"[-] {name} Failure: code={decoded['code']}, msg=\"{decoded['message']}\"")
        return decoded["code"] or 1
    print(f"[-] {name} Unexpected response: msg_type={msg_type} ({PB_MSG_NAME.get(msg_type, 'Unknown')})")
    return 1


def cmd_ping(dev: WebUsbDevice, args) -> int:
    payload = encode_ping(args.message)
    print(f"[*] Ping -> \"{args.message}\"")
    resp = dev.send_and_recv(PB_MSG_TYPE["Ping"], payload, timeout_ms=3000)
    return handle_resp_simple("Ping", resp)


def cmd_reboot(dev: WebUsbDevice, args) -> int:
    payload = encode_reboot(args.type)
    print(f"[*] Reboot -> type={REBOOT_TYPE_NAME.get(args.type, args.type)}")
    try:
        resp = dev.send_and_recv(PB_MSG_TYPE["Reboot"], payload, timeout_ms=DEFAULT_TIMEOUT_MS)
    except TimeoutError:
        print("[!] No response (device may have rebooted already).")
        return 0
    return handle_resp_simple("Reboot", resp)


def cmd_path_info(dev: WebUsbDevice, args) -> int:
    payload = encode_path_info_query(args.path)
    print(f"[*] PathInfo -> \"{args.path}\"")
    resp = dev.send_and_recv(PB_MSG_TYPE["PathInfoQuery"], payload, timeout_ms=DEFAULT_TIMEOUT_MS)
    msg_type, pb_payload = resp
    if msg_type == PB_MSG_TYPE["PathInfo"]:
        info = decode_path_info(pb_payload)
        attrs = []
        if info["readonly"]:
            attrs.append("ReadOnly")
        if info["hidden"]:
            attrs.append("Hidden")
        if info["system"]:
            attrs.append("System")
        if info["archive"]:
            attrs.append("Archive")
        print(f"    exist     : {info['exist']}")
        print(f"    size      : {info['size']} ({format_bytes(info['size'])})")
        print(f"    directory : {info['directory']}")
        print(
            f"    time      : {info['year']:04d}-{info['month']:02d}-{info['day']:02d} "
            f"{info['hour']:02d}:{info['minute']:02d}:{info['second']:02d}"
        )
        print(f"    attributes: {', '.join(attrs) if attrs else 'None'}")
        return 0
    if msg_type == PB_MSG_TYPE["Failure"]:
        decoded = decode_failure(pb_payload)
        print(f"[-] PathInfo Failure: code={decoded['code']}, msg=\"{decoded['message']}\"")
        return decoded["code"] or 1
    print(f"[-] PathInfo Unexpected response: msg_type={msg_type}")
    return 1


def cmd_file_delete(dev: WebUsbDevice, args) -> int:
    payload = encode_file_delete(args.path)
    print(f"[*] FileDelete -> \"{args.path}\"")
    resp = dev.send_and_recv(PB_MSG_TYPE["FileDelete"], payload, timeout_ms=DEFAULT_TIMEOUT_MS)
    return handle_resp_simple("FileDelete", resp)


def cmd_file_write(dev: WebUsbDevice, args) -> int:
    if not os.path.isfile(args.src):
        print(f"[-] Source file not found: {args.src}")
        return 2
    with open(args.src, "rb") as f:
        data = f.read()
    total_len = len(data)
    chunk_size = args.chunk
    if chunk_size < 64 or chunk_size > 4096:
        print("[-] chunk size must be in [64, 4096]")
        return 2

    print(
        f"[*] FileWrite: {args.src} ({format_bytes(total_len)}) -> {args.dst}, chunk={chunk_size}"
    )

    offset = 0
    is_first = True
    start = time.monotonic()
    last_print = start

    while offset < total_len:
        this_chunk = min(chunk_size, total_len - offset)
        chunk_data = data[offset:offset + this_chunk]
        file_bytes = encode_file(args.dst, offset, total_len, chunk_data)
        pb_payload = encode_file_write(file_bytes, overwrite=is_first, append=False)
        is_first = False

        resp_type, resp_payload = dev.send_and_recv(
            PB_MSG_TYPE["FileWrite"], pb_payload, timeout_ms=10000
        )

        if resp_type == PB_MSG_TYPE["Failure"]:
            decoded = decode_failure(resp_payload)
            print(
                f"[-] FileWrite Failure at offset={offset}: code={decoded['code']}, "
                f"msg=\"{decoded['message']}\""
            )
            return decoded["code"] or 1
        if resp_type != PB_MSG_TYPE["File"]:
            print(f"[-] FileWrite Unexpected response: msg_type={resp_type}")
            return 1

        decoded = decode_file(resp_payload)
        processed = decoded["processed_byte"] if decoded["processed_byte"] is not None else (offset + this_chunk)
        offset = processed

        now = time.monotonic()
        if now - last_print >= 0.2 or offset >= total_len:
            elapsed = now - start
            speed = offset / elapsed if elapsed > 0 else 0
            pct = offset * 100.0 / total_len if total_len else 100.0
            sys.stdout.write(
                f"\r    {pct:6.2f}%  {format_bytes(offset)} / {format_bytes(total_len)}  "
                f"{format_bytes(int(speed))}/s   "
            )
            sys.stdout.flush()
            last_print = now

    sys.stdout.write("\n")
    elapsed = time.monotonic() - start
    avg = total_len / elapsed if elapsed > 0 else 0
    print(f"[+] FileWrite done: {format_bytes(total_len)} in {elapsed:.2f}s ({format_bytes(int(avg))}/s)")
    return 0


def _print_progress(msg_type: int, pb_payload: bytes) -> None:
    if msg_type == PB_MSG_TYPE["FirmwareInstallProgress"]:
        p = decode_firmware_install_progress(pb_payload)
        target_label = FW_TARGET_NAME.get(p["target_id"], str(p["target_id"]))
        stage = f" [{p['stage']}]" if p["stage"] else ""
        print(f"[>] FirmwareInstallProgress: {target_label}: {p['progress']}%{stage}")
    elif msg_type == PB_MSG_TYPE["FirmwareUpdateStatus"]:
        s = decode_firmware_update_status(pb_payload)
        if not s["targets"]:
            print("[>] FirmwareUpdateStatus: (empty)")
        else:
            summary = ", ".join(
                f"{FW_TARGET_NAME.get(t['target_id'], t['target_id'])}="
                f"{FW_STATUS_NAME.get(t['status'], t['status'])}"
                for t in s["targets"]
            )
            print(f"[>] FirmwareUpdateStatus: {summary}")
    else:
        print(f"[RX] unsolicited msg_type={msg_type} ({PB_MSG_NAME.get(msg_type, 'Unknown')})")


def cmd_fw_update(dev: WebUsbDevice, args) -> int:
    targets = [{"target_id": args.target, "path": args.path}]
    payload = encode_firmware_update(targets, reboot_on_success=args.reboot)
    print(
        f"[*] FirmwareUpdate -> target={FW_TARGET_NAME.get(args.target, args.target)}, "
        f"path={args.path}, reboot_on_success={args.reboot}"
    )

    dev.on_unsolicited = _print_progress
    try:
        resp = dev.send_and_recv(
            PB_MSG_TYPE["FirmwareUpdate"], payload,
            timeout_ms=args.timeout * 1000,
            expected_reply_types={PB_MSG_TYPE["Success"], PB_MSG_TYPE["Failure"]},
        )
    except TimeoutError:
        if args.reboot:
            print("[!] No response (device may have rebooted).")
            return 0
        raise
    finally:
        # Pick up any trailing progress frames the device may still send right after the reply.
        try:
            dev.drain_unsolicited(500)
        except Exception:
            pass
        dev.on_unsolicited = None

    return handle_resp_simple("FirmwareUpdate", resp)


def cmd_fw_status(dev: WebUsbDevice, args) -> int:
    """Send GetFirmwareUpdateStatus and print the FirmwareUpdateStatus reply."""
    payload = encode_get_firmware_update_status()
    print("[*] GetFirmwareUpdateStatus")
    try:
        resp_type, resp_payload = dev.send_and_recv(
            PB_MSG_TYPE["GetFirmwareUpdateStatus"], payload,
            timeout_ms=args.timeout * 1000,
            expected_reply_types={
                PB_MSG_TYPE["FirmwareUpdateStatus"],
                PB_MSG_TYPE["Failure"],
            },
        )
    except TimeoutError:
        print("[-] FirmwareUpdateStatus timeout (no reply).")
        return 1

    if resp_type == PB_MSG_TYPE["FirmwareUpdateStatus"]:
        s = decode_firmware_update_status(resp_payload)
        if not s["targets"]:
            print("[+] FirmwareUpdateStatus: (no targets reported)")
            return 0
        print(f"[+] FirmwareUpdateStatus: {len(s['targets'])} target(s)")
        for t in s["targets"]:
            target_label = FW_TARGET_NAME.get(t["target_id"], str(t["target_id"]))
            status_label = FW_STATUS_NAME.get(t["status"], f"unknown({t['status']})")
            print(f"    {target_label:<16}  status={status_label}  (target_id={t['target_id']}, code={t['status']})")
        return 0
    if resp_type == PB_MSG_TYPE["Failure"]:
        decoded = decode_failure(resp_payload)
        print(f"[-] GetFirmwareUpdateStatus Failure: code={decoded['code']}, msg=\"{decoded['message']}\"")
        return decoded["code"] or 1
    print(f"[-] GetFirmwareUpdateStatus Unexpected response: msg_type={resp_type}")
    return 1


def cmd_disk_control(dev: WebUsbDevice, args) -> int:
    payload = encode_disk_control(args.enable)
    label = DISK_CTRL_NAME.get(args.enable, str(args.enable))
    print(f"[*] FilesystemDiskControl -> enable={args.enable} ({label})")
    resp = dev.send_and_recv(
        PB_MSG_TYPE["FilesystemDiskControl"], payload, timeout_ms=DEFAULT_TIMEOUT_MS,
    )
    return handle_resp_simple("FilesystemDiskControl", resp)


def cmd_listen_progress(dev: WebUsbDevice, args) -> int:
    """Passively listen for FirmwareInstallProgress / FirmwareUpdateStatus (and other unsolicited) frames."""
    print(f"[*] Listening for FirmwareInstallProgress/FirmwareUpdateStatus for {args.duration}s (Ctrl-C to stop)...")
    dev.on_unsolicited = _print_progress
    end = time.monotonic() + args.duration
    try:
        while time.monotonic() < end:
            remaining = end - time.monotonic()
            dev.drain_unsolicited(int(min(remaining, 1.0) * 1000))
    except KeyboardInterrupt:
        print("\n[!] Stopped by user.")
    finally:
        dev.on_unsolicited = None
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="onekey_webusb",
        description="OneKey Pro 2 WebUSB tool (ping/reboot/file_write/file_delete/fw_update/path_info)",
    )
    p.add_argument("--vid", type=lambda x: int(x, 0), default=VID, help="USB vendor id (default 0x1209)")
    p.add_argument("--pid", type=lambda x: int(x, 0), default=PID,
                   help="USB product id (default 0x53c1; pass 0 to match any PID under VID)")

    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("ping", help="Send Ping")
    sp.add_argument("--message", "-m", default="Hello from Python!", help="ping message")
    sp.set_defaults(func=cmd_ping)

    sp = sub.add_parser("reboot", help="Reboot device")
    sp.add_argument("--type", "-t", type=int, default=0, choices=[0, 1, 2],
                    help="0=Normal, 1=Boardloader, 2=BootLoader")
    sp.set_defaults(func=cmd_reboot)

    sp = sub.add_parser("file_write", help="Write a local file to device")
    sp.add_argument("--src", "-s", required=True, help="local source file")
    sp.add_argument("--dst", "-d", required=True, help="device target path, e.g. vol1:firmware.bin")
    sp.add_argument("--chunk", "-c", type=int, default=1024, help="chunk size in bytes (64-4096)")
    sp.set_defaults(func=cmd_file_write)

    sp = sub.add_parser("fw_update", help="Trigger firmware update from a file already on device")
    sp.add_argument("--target", "-t", type=int, default=0,
                    help="0=Main App, 1=Main Bootloader, 2=BLE, 3..6=SE1..SE4, 10=Resource")
    sp.add_argument("--path", "-p", required=True, help="firmware file path on device")
    sp.add_argument("--reboot", action="store_true", help="reboot on success")
    sp.add_argument("--timeout", type=int, default=30, help="response timeout in seconds (default 30)")
    sp.set_defaults(func=cmd_fw_update)

    sp = sub.add_parser("path_info", help="Query path info on device")
    sp.add_argument("--path", "-p", required=True, help="device path, e.g. vol1:firmware.bin")
    sp.set_defaults(func=cmd_path_info)

    sp = sub.add_parser("file_delete", help="Delete a file on device")
    sp.add_argument("--path", "-p", required=True, help="device path, e.g. vol1:firmware.bin")
    sp.set_defaults(func=cmd_file_delete)

    sp = sub.add_parser("fw_status", help="Query FirmwareUpdateStatus from device")
    sp.add_argument("--timeout", type=int, default=5,
                    help="response timeout in seconds (default 5)")
    sp.set_defaults(func=cmd_fw_status)

    sp = sub.add_parser("disk_control", help="Enable/disable MSC (FilesystemDiskControl)")
    sp.add_argument("--enable", "-e", type=int, required=True, choices=[0, 1],
                    help="0=Disable MSC, 1=Enable MSC")
    sp.set_defaults(func=cmd_disk_control)

    sp = sub.add_parser("listen", help="Passively listen for FirmwareInstallProgress / FirmwareUpdateStatus frames")
    sp.add_argument("--duration", "-d", type=int, default=120,
                    help="listen duration in seconds (default 120)")
    sp.set_defaults(func=cmd_listen_progress)

    return p


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    pid = args.pid if args.pid != 0 else None
    dev = WebUsbDevice(vid=args.vid, pid=pid)
    try:
        dev.open()
        return args.func(dev, args)
    except KeyboardInterrupt:
        print("\n[!] Interrupted.")
        return 130
    except Exception as e:
        print(f"[-] Error: {e}")
        return 1
    finally:
        dev.close()


if __name__ == "__main__":
    sys.exit(main())
