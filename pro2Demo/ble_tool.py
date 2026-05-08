#!/usr/bin/env python3
"""BLE Tool - An nRF Connect-like BLE utility built with PyQt5 and bleak."""

import sys
import asyncio
import signal
import platform
import time
from datetime import datetime

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QTreeWidget, QTreeWidgetItem, QSplitter, QLabel,
    QHeaderView, QTextEdit, QLineEdit, QComboBox, QGroupBox,
    QMessageBox, QDialog, QDialogButtonBox, QMenu, QAction,
    QInputDialog, QSpinBox, QFileDialog, QProgressBar, QTabWidget,
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QObject
from PyQt5.QtGui import QColor, QFont

from bleak import BleakScanner, BleakClient
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData

# Check if we're on Linux for dbus support
IS_LINUX = platform.system() == 'Linux'

if IS_LINUX:
    try:
        import dbus
        import dbus.service
        import dbus.mainloop.glib
        HAS_DBUS = True
    except ImportError:
        HAS_DBUS = False
        print("Warning: dbus not available. Pairing features disabled.")
else:
    HAS_DBUS = False


# ---------------------------------------------------------------------------
# Async helper – run coroutines from Qt without qasync
# ---------------------------------------------------------------------------
class AsyncBridge(QObject):
    """Runs an asyncio event loop continuously in a dedicated background thread."""

    def __init__(self):
        super().__init__()
        self._loop = asyncio.new_event_loop()
        import threading
        def _run():
            asyncio.set_event_loop(self._loop)
            self._loop.run_forever()
        self._thread = threading.Thread(target=_run, daemon=True)
        self._thread.start()

    def run(self, coro):
        return asyncio.run_coroutine_threadsafe(coro, self._loop)

    def stop(self):
        self._loop.call_soon_threadsafe(self._loop.stop)


# ---------------------------------------------------------------------------
# Scan result item
# ---------------------------------------------------------------------------
class DeviceItem:
    def __init__(self, device: BLEDevice, adv: AdvertisementData):
        self.device = device
        self.adv = adv
        self.rssi = adv.rssi
        self.name = device.name or "N/A"
        self.address = device.address


# ---------------------------------------------------------------------------
# Protocol V0 – frame building and minimal protobuf helpers
# (same algorithm as webusb_upgrade.html)
# ---------------------------------------------------------------------------

_CRC8_TABLE = bytes([
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

_PROTO_HEAD_SOF       = 0x5A
_PROTO_HEAD_CRC_SIZE  = 8      # 7 header bytes + 1 tail CRC
_PROTO_DATA_TYPE_PKT  = 0
_CRC8_INIT            = 0x30

_PB_MSG_TYPE_PING      = 60206
_PB_MSG_TYPE_SUCCESS   = 60207
_PB_MSG_TYPE_FAILURE   = 60208
_PB_MSG_TYPE_FILE      = 60803
_PB_MSG_TYPE_FILEWRITE = 60805
_PB_MSG_NAMES = {
    60206: "Ping", 60207: "Success", 60208: "Failure",
    60803: "File", 60805: "FileWrite",
}

_proto_seq = 0


def _crc8(data: bytes | bytearray, length: int) -> int:
    crc = _CRC8_INIT
    for i in range(length):
        crc = _CRC8_TABLE[crc ^ data[i]]
    return crc


def _encode_varint(value: int) -> bytes:
    result = []
    while value > 0x7F:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    result.append(value & 0x7F)
    return bytes(result)


def _decode_varint(data: bytes | bytearray, offset: int) -> tuple[int, int]:
    value, shift = 0, 0
    while offset < len(data):
        byte = data[offset]; offset += 1
        value |= (byte & 0x7F) << shift
        if not (byte & 0x80):
            break
        shift += 7
    return value, offset


def _calc_max_chunk(mtu: int, device_path: str) -> int:
    """Compute max data bytes that fit in one MTU-sized Proto V0 + FileWrite frame.

    Frame layout (bytes):
      Proto V0:   SOF(1) len(2) pre-CRC(1) router(1) attr(1) seq(1) <payload> tail-CRC(1)  → 8 B
      msg_type:   2 B (uint16 LE prefix inside payload)
      FileWrite:  tag+len for embedded File message(4 B) + overwrite(2 B) + append(2 B)    → 8 B
      File fixed: path tag+len+bytes  offset tag+varint(5)  total_size tag+varint(5)
                  data tag(1) data len_varint(3)
    """
    path_bytes = device_path.encode("utf-8")
    path_len = len(path_bytes)
    # File message fixed overhead (no data content)
    file_fixed = (
        1 + len(_encode_varint(path_len)) + path_len   # field 1 path
        + 1 + 5                                         # field 2 offset (worst-case 5-byte varint)
        + 1 + 5                                         # field 3 total_size (worst-case 5-byte varint)
        + 1 + 3                                         # field 4 data tag + len prefix (up to 64 KB)
    )
    # FileWrite overhead wrapping the File message
    file_write = 1 + 3 + 2 + 2                         # tag+len(file msg) + overwrite + append
    overhead = 8 + 2 + file_fixed + file_write          # proto_v0 + msg_type + file_fixed + file_write
    return max(mtu - overhead, 16)


def _encode_pb_string(field_num: int, s: str) -> bytes:
    if not s:
        return b""
    encoded = s.encode("utf-8")
    tag = _encode_varint((field_num << 3) | 2)
    return tag + _encode_varint(len(encoded)) + encoded


def pb_encode_ping(message: str = "") -> bytes:
    """Encode  Ping { optional string message = 1; }"""
    return _encode_pb_string(1, message)


def pb_decode_success(pb: bytes) -> str:
    """Decode  Success { optional string message = 1; }"""
    offset, msg = 0, ""
    while offset < len(pb):
        tag, offset = _decode_varint(pb, offset)
        fn, wt = tag >> 3, tag & 0x7
        if fn == 1 and wt == 2:
            ln, offset = _decode_varint(pb, offset)
            msg = pb[offset:offset + ln].decode("utf-8", errors="replace")
            offset += ln
        else:
            break
    return msg


def pb_decode_failure(pb: bytes) -> tuple[int, str]:
    """Decode  Failure { optional FailureType code = 1; optional string message = 2; }"""
    offset, code, msg = 0, 0, ""
    while offset < len(pb):
        tag, offset = _decode_varint(pb, offset)
        fn, wt = tag >> 3, tag & 0x7
        if fn == 1 and wt == 0:
            code, offset = _decode_varint(pb, offset)
        elif fn == 2 and wt == 2:
            ln, offset = _decode_varint(pb, offset)
            msg = pb[offset:offset + ln].decode("utf-8", errors="replace")
            offset += ln
        else:
            break
    return code, msg


def build_proto_frame(payload: bytes, packet_src: int = 0, router: int = 0) -> bytes:
    """Wrap payload in a Proto V0 frame (SOF + len + pre-CRC + attr + seq + payload + tail-CRC)."""
    global _proto_seq
    payload_len = len(payload)
    frame_len   = payload_len + _PROTO_HEAD_CRC_SIZE
    frame       = bytearray(frame_len)

    _proto_seq  = (_proto_seq % 255) + 1   # cycles 1–255

    frame[0] = _PROTO_HEAD_SOF
    frame[1] = frame_len & 0xFF
    frame[2] = (frame_len >> 8) & 0xFF
    frame[3] = 0                                                              # pre-head CRC placeholder
    frame[4] = router & 0xFF
    frame[5] = ((packet_src & 0x0F) << 2) | (_PROTO_DATA_TYPE_PKT & 0x03)   # attr
    frame[6] = _proto_seq
    frame[3] = _crc8(frame, 3)                                               # pre-head CRC (bytes 0-2)
    frame[7:7 + payload_len] = payload
    frame[frame_len - 1] = _crc8(frame, frame_len - 1)                       # tail CRC
    return bytes(frame)


def build_pb_frame(msg_type: int, pb_payload: bytes,
                   packet_src: int = 0, router: int = 0) -> bytes:
    """Build a Proto V0 frame carrying  msg_type (2-byte LE) + protobuf payload."""
    payload = bytes([msg_type & 0xFF, (msg_type >> 8) & 0xFF]) + pb_payload
    return build_proto_frame(payload, packet_src, router)


def parse_proto_frame(frame: bytes) -> bytes | None:
    """Extract the inner payload from a Proto V0 frame, or None if malformed."""
    if len(frame) < _PROTO_HEAD_CRC_SIZE or frame[0] != _PROTO_HEAD_SOF:
        return None
    frame_len = frame[1] | (frame[2] << 8)
    if frame_len > len(frame):
        return None
    return bytes(frame[7:frame_len - 1])


def parse_pb_response(payload: bytes) -> tuple[int, bytes] | None:
    """Split payload into (msg_type, pb_bytes), or None if too short."""
    if len(payload) < 2:
        return None
    return payload[0] | (payload[1] << 8), bytes(payload[2:])


# ---------------------------------------------------------------------------
# File protocol helpers
# ---------------------------------------------------------------------------

def _encode_pb_uint32(field_num: int, value: int, required: bool = False) -> bytes:
    if value == 0 and not required:
        return b""
    tag = _encode_varint((field_num << 3) | 0)
    return tag + _encode_varint(value)


def _encode_pb_bool(field_num: int, value: bool) -> bytes:
    tag = _encode_varint((field_num << 3) | 0)
    return tag + bytes([1 if value else 0])


def _encode_pb_bytes(field_num: int, data: bytes) -> bytes:
    if not data:
        return b""
    tag = _encode_varint((field_num << 3) | 2)
    return tag + _encode_varint(len(data)) + data


def _encode_pb_message(field_num: int, msg: bytes) -> bytes:
    tag = _encode_varint((field_num << 3) | 2)
    return tag + _encode_varint(len(msg)) + msg


def pb_encode_file(path: str, offset: int, total_size: int,
                   data: bytes | None = None) -> bytes:
    """Encode  File { path=1, offset=2, total_size=3, data=4 }"""
    result = (
        _encode_pb_string(1, path)
        + _encode_pb_uint32(2, offset, required=True)
        + _encode_pb_uint32(3, total_size, required=True)
    )
    if data:
        result += _encode_pb_bytes(4, data)
    return result


def pb_encode_file_write(file_bytes: bytes, overwrite: bool, append: bool) -> bytes:
    """Encode  FileWrite { file=1, overwrite=2, append=3 }"""
    return (
        _encode_pb_message(1, file_bytes)
        + _encode_pb_bool(2, overwrite)
        + _encode_pb_bool(3, append)
    )



def pb_decode_file(pb: bytes) -> dict:
    """Decode  File { path=1, offset=2, total_size=3, data=4, processed_byte=6 }"""
    result = {"path": "", "offset": 0, "total_size": 0, "data": None, "processed_byte": None}
    offset = 0
    while offset < len(pb):
        tag, offset = _decode_varint(pb, offset)
        fn, wt = tag >> 3, tag & 0x7
        if wt == 0:
            val, offset = _decode_varint(pb, offset)
            if fn == 2:   result["offset"] = val
            elif fn == 3: result["total_size"] = val
            elif fn == 6: result["processed_byte"] = val
        elif wt == 2:
            ln, offset = _decode_varint(pb, offset)
            chunk = pb[offset:offset + ln]; offset += ln
            if fn == 1:   result["path"] = chunk.decode("utf-8", errors="replace")
            elif fn == 4: result["data"] = bytes(chunk)
        else:
            break
    return result


# ---------------------------------------------------------------------------
# BlueZ Pairing Agent (D-Bus) - Linux only
# ---------------------------------------------------------------------------
if HAS_DBUS:
    AGENT_PATH = "/com/ble_tool/agent"
    AGENT_INTERFACE = "org.bluez.Agent1"
    AGENT_MANAGER_INTERFACE = "org.bluez.AgentManager1"

    class PairingAgent(dbus.service.Object):
        """BlueZ Agent that handles pairing, especially numerical comparison."""

        # Signal to request UI confirmation (passkey, device_path)
        confirm_request_callback = None  # set by BLEToolWindow

        def __init__(self, bus, path):
            super().__init__(bus, path)

        @dbus.service.method(AGENT_INTERFACE, in_signature="", out_signature="")
        def Release(self):
            pass

        @dbus.service.method(AGENT_INTERFACE, in_signature="os", out_signature="")
        def AuthorizeService(self, device, uuid):
            pass

        @dbus.service.method(AGENT_INTERFACE, in_signature="o", out_signature="s")
        def RequestPinCode(self, device):
            return ""

        @dbus.service.method(AGENT_INTERFACE, in_signature="o", out_signature="u")
        def RequestPasskey(self, device):
            return dbus.UInt32(0)

        @dbus.service.method(AGENT_INTERFACE, in_signature="ouq", out_signature="")
        def DisplayPasskey(self, device, passkey, entered):
            if self.confirm_request_callback:
                self.confirm_request_callback(device, passkey, "display")

        @dbus.service.method(AGENT_INTERFACE, in_signature="ou", out_signature="")
        def RequestConfirmation(self, device, passkey):
            """Numerical Comparison: user must confirm the passkey matches."""
            if self.confirm_request_callback:
                accepted = self.confirm_request_callback(device, passkey, "confirm")
                if not accepted:
                    raise dbus.exceptions.DBusException(
                        "org.bluez.Error.Rejected", "Pairing rejected by user"
                    )
            # If no callback or accepted, return normally (accept)

        @dbus.service.method(AGENT_INTERFACE, in_signature="o", out_signature="")
        def RequestAuthorization(self, device):
            pass

        @dbus.service.method(AGENT_INTERFACE, in_signature="", out_signature="")
        def Cancel(self):
            pass


def register_pairing_agent():
    """Register our pairing agent with BlueZ (Linux only)."""
    if not HAS_DBUS:
        return None

    try:
        dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
        bus = dbus.SystemBus()
        agent = PairingAgent(bus, AGENT_PATH)

        manager = dbus.Interface(
            bus.get_object("org.bluez", "/org/bluez"),
            AGENT_MANAGER_INTERFACE
        )
        manager.RegisterAgent(AGENT_PATH, "KeyboardDisplay")
        manager.RequestDefaultAgent(AGENT_PATH)
        return agent
    except Exception as e:
        print(f"Warning: Could not register pairing agent: {e}")
        print("Pairing features may not work. Try running with sudo or adding user to 'bluetooth' group.")
        return None


# ---------------------------------------------------------------------------
# Main Window
# ---------------------------------------------------------------------------
class BLEToolWindow(QMainWindow):
    # Signals for thread-safe UI updates
    device_found = pyqtSignal(object, object)  # BLEDevice, AdvertisementData
    log_signal = pyqtSignal(str)
    connection_done = pyqtSignal(bool, str)  # success, message
    disconnected_signal = pyqtSignal(str)   # reason string (unexpected disconnect)
    services_discovered = pyqtSignal(object)  # list of BleakGATTService
    char_value_read = pyqtSignal(str, object)  # uuid, bytes value
    char_notify_received = pyqtSignal(str, object)  # uuid, bytes value
    pairing_request = pyqtSignal(str, int, str)  # device_path, passkey, mode
    ping_result_signal = pyqtSignal(bool, str)     # success, result_text
    fw_progress_signal = pyqtSignal(int, str)      # percent 0-100, status text

    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"BLE Tool (nRF Connect Style) - {platform.system()}")
        self.resize(1100, 700)

        self._async = AsyncBridge()
        self._scanning = False
        self._devices: dict[str, DeviceItem] = {}  # address -> DeviceItem
        self._scanner = None
        self._client: BleakClient | None = None
        self._connected_address: str | None = None
        self._notifying: set[str] = set()  # UUIDs currently subscribed
        self._pairing_result: bool | None = None
        self._fw_file_data: bytes | None = None   # local file to upload
        self._fw_abort = False
        self._negotiated_mtu: int = 0             # MTU from last successful connect

        self._init_ui()
        self._connect_signals()
        self._setup_pairing_agent()
        self.disconnected_signal.connect(self._on_unexpected_disconnect)

    # ---- UI setup ---------------------------------------------------------

    def _init_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QHBoxLayout(central)
        main_layout.setContentsMargins(6, 6, 6, 6)

        splitter = QSplitter(Qt.Horizontal)
        main_layout.addWidget(splitter)

        # --- Left panel: scan ---
        left = QWidget()
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(4, 4, 4, 4)
        left_layout.setSpacing(6)

        # Scan controls
        scan_bar = QHBoxLayout()
        self.btn_scan = QPushButton("Start Scan")
        self.btn_scan.setMinimumHeight(36)
        scan_bar.addWidget(self.btn_scan)
        self.btn_clear = QPushButton("Clear")
        self.btn_clear.setMinimumHeight(36)
        scan_bar.addWidget(self.btn_clear)
        left_layout.addLayout(scan_bar)

        # Filter
        filter_bar = QHBoxLayout()
        filter_bar.addWidget(QLabel("Filter:"))
        self.filter_edit = QLineEdit()
        self.filter_edit.setPlaceholderText("Name or Address...")
        filter_bar.addWidget(self.filter_edit)
        left_layout.addLayout(filter_bar)

        # RSSI filter
        rssi_bar = QHBoxLayout()
        rssi_bar.addWidget(QLabel("RSSI ≥"))
        self.rssi_filter = QSpinBox()
        self.rssi_filter.setRange(-120, 0)
        self.rssi_filter.setValue(-60)
        self.rssi_filter.setSuffix(" dBm")
        self.rssi_filter.setToolTip("Only show devices with RSSI above this threshold")
        rssi_bar.addWidget(self.rssi_filter)
        rssi_bar.addStretch()
        left_layout.addLayout(rssi_bar)

        # Device list
        self.device_tree = QTreeWidget()
        self.device_tree.setHeaderLabels(["Name", "Address", "RSSI"])
        self.device_tree.header().setSectionResizeMode(0, QHeaderView.Stretch)
        self.device_tree.setColumnWidth(1, 160)
        self.device_tree.setColumnWidth(2, 60)
        self.device_tree.setSortingEnabled(False)  # we sort manually
        left_layout.addWidget(self.device_tree)

        self.lbl_count = QLabel("Devices: 0")
        left_layout.addWidget(self.lbl_count)

        splitter.addWidget(left)

        # --- Right panel: connection / services ---
        right = QWidget()
        right_layout = QVBoxLayout(right)
        right_layout.setContentsMargins(4, 4, 4, 4)
        right_layout.setSpacing(4)

        # Connection info
        conn_group = QGroupBox("Connection")
        conn_layout = QVBoxLayout(conn_group)
        conn_layout.setContentsMargins(8, 4, 8, 6)
        conn_layout.setSpacing(4)
        self.lbl_conn = QLabel("Not connected")
        self.lbl_conn.setFont(QFont("sans-serif", 10, QFont.Bold))
        conn_layout.addWidget(self.lbl_conn)
        conn_btns = QHBoxLayout()
        self.btn_connect = QPushButton("Connect")
        self.btn_connect.setMinimumHeight(36)
        self.btn_disconnect = QPushButton("Disconnect")
        self.btn_disconnect.setMinimumHeight(36)
        self.btn_disconnect.setEnabled(False)
        self.btn_pair = QPushButton("Pair")
        self.btn_pair.setMinimumHeight(36)
        self.btn_pair.setEnabled(False)

        # Disable pairing on Windows
        if not HAS_DBUS:
            self.btn_pair.setToolTip("Pairing not supported on Windows")

        conn_btns.addWidget(self.btn_connect)
        conn_btns.addWidget(self.btn_disconnect)
        conn_btns.addWidget(self.btn_pair)
        conn_layout.addLayout(conn_btns)
        right_layout.addWidget(conn_group)

        # Services & Characteristics
        svc_group = QGroupBox("Services & Characteristics")
        svc_layout = QVBoxLayout(svc_group)
        svc_layout.setContentsMargins(8, 12, 8, 8)
        svc_layout.setSpacing(8)
        self.service_tree = QTreeWidget()
        self.service_tree.setHeaderLabels(["UUID", "Properties", "Value"])
        self.service_tree.header().setSectionResizeMode(0, QHeaderView.Stretch)
        self.service_tree.setColumnWidth(1, 140)
        self.service_tree.setColumnWidth(2, 200)
        self.service_tree.setIndentation(20)
        svc_layout.addWidget(self.service_tree)

        # Characteristic operation bar
        op_bar = QHBoxLayout()
        op_bar.setSpacing(4)
        self.btn_read = QPushButton("Read")
        self.btn_write = QPushButton("Write")
        self.btn_notify = QPushButton("Notify")
        self.btn_indicate = QPushButton("Indicate")
        for btn in (self.btn_read, self.btn_write, self.btn_notify, self.btn_indicate):
            btn.setMinimumHeight(28)
            btn.setEnabled(False)
            op_bar.addWidget(btn)
        svc_layout.addLayout(op_bar)

        # Write input
        write_bar = QHBoxLayout()
        write_bar.addWidget(QLabel("Data (hex):"))
        self.write_input = QLineEdit()
        self.write_input.setPlaceholderText("e.g. 01 02 FF or 0102FF")
        write_bar.addWidget(self.write_input)
        self.combo_write_type = QComboBox()
        self.combo_write_type.addItems(["Write Request", "Write Command"])
        write_bar.addWidget(self.combo_write_type)
        svc_layout.addLayout(write_bar)

        right_layout.addWidget(svc_group, 3)

        # Protocol V0 (tabbed: Ping | File Write)
        proto_group = QGroupBox("Protocol V0")
        proto_layout = QVBoxLayout(proto_group)
        proto_layout.setContentsMargins(8, 8, 8, 4)
        proto_layout.setSpacing(4)

        # Shared write characteristic selector
        char_bar = QHBoxLayout()
        char_bar.addWidget(QLabel("Write Char:"))
        self.write_char_combo = QComboBox()
        self.write_char_combo.setPlaceholderText("Connect and discover services first")
        char_bar.addWidget(self.write_char_combo, 1)
        proto_layout.addLayout(char_bar)

        self.proto_tabs = QTabWidget()
        self.proto_tabs.setDocumentMode(True)

        # -- Ping tab --
        ping_tab = QWidget()
        ping_lay = QVBoxLayout(ping_tab)
        ping_lay.setContentsMargins(4, 8, 4, 4)
        ping_lay.setSpacing(4)

        msg_bar = QHBoxLayout()
        msg_bar.addWidget(QLabel("Message:"))
        self.ping_message = QLineEdit()
        self.ping_message.setPlaceholderText("optional string payload")
        self.ping_message.setText("Hello from BLE!")
        msg_bar.addWidget(self.ping_message)
        self.btn_ping = QPushButton("Send Ping")
        self.btn_ping.setMinimumHeight(28)
        self.btn_ping.setEnabled(False)
        msg_bar.addWidget(self.btn_ping)
        ping_lay.addLayout(msg_bar)

        self.lbl_ping_result = QLabel("")
        self.lbl_ping_result.setWordWrap(True)
        ping_lay.addWidget(self.lbl_ping_result)
        ping_lay.addStretch()

        self.proto_tabs.addTab(ping_tab, "Ping")

        # -- File Write tab --
        fw_tab = QWidget()
        fw_lay = QVBoxLayout(fw_tab)
        fw_lay.setContentsMargins(4, 8, 4, 4)
        fw_lay.setSpacing(4)

        path_bar = QHBoxLayout()
        path_bar.addWidget(QLabel("Device path:"))
        self.fio_device_path = QLineEdit("vol0:test.bin")
        path_bar.addWidget(self.fio_device_path, 1)
        fw_lay.addLayout(path_bar)

        fw_file_bar = QHBoxLayout()
        self.btn_fw_browse = QPushButton("Browse...")
        self.btn_fw_browse.setMinimumHeight(26)
        fw_file_bar.addWidget(self.btn_fw_browse)
        fw_file_bar.addStretch()
        fw_lay.addLayout(fw_file_bar)

        self.fw_file_info = QTextEdit()
        self.fw_file_info.setReadOnly(True)
        self.fw_file_info.setFixedHeight(54)
        self.fw_file_info.setPlaceholderText("No file selected")
        self.fw_file_info.setStyleSheet(
            "QTextEdit { background: #1a1a1a; color: #aaa; "
            "border: 1px solid #444; border-radius: 4px; "
            "font-family: monospace; font-size: 11px; }")
        fw_lay.addWidget(self.fw_file_info)

        fw_chunk_bar = QHBoxLayout()
        fw_chunk_bar.addWidget(QLabel("Chunk:"))
        self.fw_chunk_spin = QSpinBox()
        self.fw_chunk_spin.setRange(16, 2048)
        self.fw_chunk_spin.setSingleStep(64)
        self.fw_chunk_spin.setValue(2048)
        self.fw_chunk_spin.setSuffix(" B")
        self.fw_chunk_spin.setToolTip("Auto-set to MTU-derived max after connection")
        fw_chunk_bar.addWidget(self.fw_chunk_spin)
        self.lbl_chunk_mtu = QLabel("(connect to auto-set)")
        self.lbl_chunk_mtu.setStyleSheet("color: #888; font-size: 11px;")
        fw_chunk_bar.addWidget(self.lbl_chunk_mtu)
        fw_chunk_bar.addStretch()
        self.btn_fw_send = QPushButton("Upload")
        self.btn_fw_send.setMinimumHeight(26)
        self.btn_fw_send.setEnabled(False)
        self.btn_fw_abort = QPushButton("Abort")
        self.btn_fw_abort.setMinimumHeight(26)
        self.btn_fw_abort.setEnabled(False)
        fw_chunk_bar.addWidget(self.btn_fw_send)
        fw_chunk_bar.addWidget(self.btn_fw_abort)
        fw_lay.addLayout(fw_chunk_bar)

        self.fw_progress = QProgressBar()
        self.fw_progress.setRange(0, 100)
        self.fw_progress.setValue(0)
        self.fw_progress.setTextVisible(True)
        self.fw_progress.setVisible(False)
        fw_lay.addWidget(self.fw_progress)

        self.lbl_fw_status = QLabel("")
        self.lbl_fw_status.setWordWrap(True)
        fw_lay.addWidget(self.lbl_fw_status)

        self.proto_tabs.addTab(fw_tab, "File Write")

        proto_layout.addWidget(self.proto_tabs)
        right_layout.addWidget(proto_group)

        # Log
        log_group = QGroupBox("Log")
        log_layout = QVBoxLayout(log_group)
        log_layout.setContentsMargins(4, 6, 4, 4)
        log_layout.setSpacing(0)
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setFont(QFont("Consolas", 9))
        self.log_text.document().setDefaultStyleSheet(
            "p { margin: 0px; padding: 0px; line-height: 1.2; }")
        log_layout.addWidget(self.log_text)
        right_layout.addWidget(log_group, 1)

        splitter.addWidget(right)
        splitter.setSizes([350, 750])

    def _connect_signals(self):
        self.btn_scan.clicked.connect(self._toggle_scan)
        self.btn_clear.clicked.connect(self._clear_devices)
        self.btn_connect.clicked.connect(self._on_connect)
        self.btn_disconnect.clicked.connect(self._on_disconnect)
        self.device_found.connect(self._on_device_found)
        self.log_signal.connect(self._append_log)
        self.connection_done.connect(self._on_connection_done)
        self.filter_edit.textChanged.connect(self._apply_filter)
        self.rssi_filter.valueChanged.connect(self._apply_filter)
        self.device_tree.itemDoubleClicked.connect(self._on_connect)
        self.services_discovered.connect(self._on_services_discovered)
        self.service_tree.setContextMenuPolicy(Qt.CustomContextMenu)
        self.service_tree.customContextMenuRequested.connect(self._char_context_menu)
        self.char_value_read.connect(self._on_char_value_read)
        self.char_notify_received.connect(self._on_notify_received)
        self.service_tree.currentItemChanged.connect(self._on_char_selected)
        self.btn_pair.clicked.connect(self._on_pair)
        self.btn_read.clicked.connect(self._on_char_read)
        self.btn_write.clicked.connect(self._on_char_write)
        self.btn_notify.clicked.connect(self._on_char_notify)
        self.btn_indicate.clicked.connect(self._on_char_indicate)
        self.btn_ping.clicked.connect(self._on_ping)
        self.ping_result_signal.connect(self._on_ping_result)
        self.btn_fw_browse.clicked.connect(self._on_fw_browse)
        self.btn_fw_send.clicked.connect(self._on_fw_send)
        self.btn_fw_abort.clicked.connect(self._on_fw_abort)
        self.fw_progress_signal.connect(self._on_fw_progress)
        self.fio_device_path.textChanged.connect(self._update_chunk_from_mtu)

    # ---- Logging ----------------------------------------------------------

    def _log(self, msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        self.log_signal.emit(f"[{ts}] {msg}")

    def _append_log(self, msg: str):
        self.log_text.append(msg)

    # ---- Scanning ---------------------------------------------------------

    def _toggle_scan(self):
        if self._scanning:
            self._stop_scan()
        else:
            self._start_scan()

    def _start_scan(self):
        self._scanning = True
        self.btn_scan.setText("Stop Scan")
        self._log("Scanning started...")

        def detection_callback(device: BLEDevice, adv: AdvertisementData):
            self.device_found.emit(device, adv)

        async def _scan():
            try:
                self._scanner = BleakScanner(detection_callback=detection_callback)
                await self._scanner.start()
            except Exception as e:
                self.log_signal.emit(f"Scan error: {e}")
                self._scanning = False
                # Use QTimer to update UI safely from async context
                QTimer.singleShot(0, lambda: self.btn_scan.setText("Start Scan"))

        self._async.run(_scan())

    def _stop_scan(self):
        self._scanning = False
        self.btn_scan.setText("Start Scan")
        self._log("Scanning stopped.")

        async def _stop():
            if self._scanner:
                try:
                    await self._scanner.stop()
                except Exception as e:
                    self.log_signal.emit(f"Stop scan error: {e}")
                self._scanner = None

        self._async.run(_stop())

    def _on_device_found(self, device: BLEDevice, adv: AdvertisementData):
        item = DeviceItem(device, adv)
        self._devices[device.address] = item
        self._refresh_device_list()

    def _clear_devices(self):
        self._devices.clear()
        self.device_tree.clear()
        self.lbl_count.setText("Devices: 0")

    def _refresh_device_list(self):
        """Rebuild device tree sorted by RSSI (strongest first)."""
        self.device_tree.clear()
        sorted_devices = sorted(self._devices.values(), key=lambda d: d.rssi, reverse=True)
        filter_text = self.filter_edit.text().lower()

        rssi_threshold = self.rssi_filter.value()
        count = 0
        for dev in sorted_devices:
            if dev.rssi < rssi_threshold:
                continue
            if filter_text:
                if filter_text not in dev.name.lower() and filter_text not in dev.address.lower():
                    continue

            tw = QTreeWidgetItem([dev.name, dev.address, str(dev.rssi)])
            # Color code RSSI
            rssi = dev.rssi
            if rssi > -50:
                tw.setForeground(2, QColor("#2ecc71"))  # green - excellent
            elif rssi > -70:
                tw.setForeground(2, QColor("#f39c12"))  # orange - good
            else:
                tw.setForeground(2, QColor("#e74c3c"))  # red - weak

            tw.setData(0, Qt.UserRole, dev.address)
            self.device_tree.addTopLevelItem(tw)
            count += 1

        self.lbl_count.setText(f"Devices: {count}")

    def _apply_filter(self):
        self._refresh_device_list()

    # ---- Connection & Service Discovery ------------------------------------

    def _on_connect(self):
        selected = self.device_tree.currentItem()
        if not selected:
            self._log("No device selected.")
            return
        address = selected.data(0, Qt.UserRole)
        name = selected.text(0)
        # Use the BLEDevice object if available so BleakClient skips the
        # internal re-scan (find_device_by_address) that runs when only an
        # address string is supplied.
        dev_item = self._devices.get(address)
        ble_device = dev_item.device if dev_item else address
        self._log(f"Connecting to {name} ({address})...")
        self.btn_connect.setEnabled(False)

        async def _connect():
            # Stop scanner first: concurrent scanning and GATT service
            # discovery on Windows WinRT share the radio and cause incomplete
            # service enumeration on reconnect.
            if self._scanner:
                try:
                    await self._scanner.stop()
                except Exception:
                    pass
                self._scanner = None

            # Force-disconnect any previous client so the Windows BLE
            # stack releases all handles and clears the GATT cache.
            if self._client:
                old = self._client
                self._client = None
                try:
                    if old.is_connected:
                        self.log_signal.emit("Disconnecting previous session...")
                        await asyncio.wait_for(old.disconnect(), timeout=5.0)
                except Exception:
                    pass
                del old
                # Give Windows time to fully release the BLE radio handle
                # and flush the GATT cache before creating a new session.
                await asyncio.sleep(1.0)

            try:
                def _disconnected_cb(client: BleakClient):
                    if self._client is not client:
                        return
                    self.disconnected_signal.emit(f"Device disconnected: {name} ({address})")

                self._client = BleakClient(
                    ble_device,
                    disconnected_callback=_disconnected_cb,
                    winrt={"use_cached_services": False},
                )
                # Set retry flag on the WinRT *backend* so that when
                # services_changed events fire during reconnect, service
                # discovery is restarted until the list stabilises.
                if hasattr(self._client, '_backend'):
                    self._client._backend._retry_on_services_changed = True
                await self._client.connect()
                self._connected_address = address

                # ---- Connection tuning (WinRT) ----
                backend = getattr(self._client, '_backend', None)
                if backend:
                    # Try to request shortest connection interval
                    requester = getattr(backend, '_requester', None)
                    if requester:
                        try:
                            from winrt.windows.devices.bluetooth import (
                                BluetoothLEPreferredConnectionParameters,
                            )
                            params = BluetoothLEPreferredConnectionParameters.throughput_optimized
                            await requester.request_preferred_connection_parameters(params)
                            self.log_signal.emit("Requested ThroughputOptimized connection parameters")
                        except Exception:
                            pass  # API not available on this Windows build

                        # Log actual connection parameters
                        try:
                            cp = requester.get_connection_parameters()
                            self.log_signal.emit(
                                f"Connection params: interval={cp.connection_interval:.1f}ms  "
                                f"latency={cp.connection_latency}  "
                                f"timeout={cp.link_timeout}ms")
                        except Exception:
                            pass

                mtu = self._client.mtu_size
                self.connection_done.emit(True, f"Connected to {name} ({address})  MTU={mtu}")
                services = self._client.services
                self.services_discovered.emit(services)
                self.log_signal.emit(f"MTU negotiated: {mtu}")
                QTimer.singleShot(0, lambda m=mtu: self._apply_mtu(m))
            except Exception as e:
                self.connection_done.emit(False, f"Connection failed: {e}")

        self._async.run(_connect())

    def _apply_mtu(self, mtu: int):
        """Store negotiated MTU and update the chunk-size UI hint."""
        self._negotiated_mtu = mtu
        self._update_chunk_from_mtu()

    def _update_chunk_from_mtu(self):
        """Update the chunk-size UI label with current MTU info."""
        mtu = self._negotiated_mtu
        if mtu <= 0:
            return
        self.fw_chunk_spin.setRange(16, 2048)
        self.fw_chunk_spin.setSingleStep(64)
        self.fw_chunk_spin.setValue(2048)
        self.lbl_chunk_mtu.setText(f"(MTU {mtu}, chunk max 2048 B)")

    def _on_connection_done(self, success: bool, msg: str):
        self._log(msg)
        if success:
            self.lbl_conn.setText(msg)
            self.btn_connect.setEnabled(False)   # keep disabled while connected
            self.btn_disconnect.setEnabled(True)
            self.btn_ping.setEnabled(True)
            self.btn_fw_send.setEnabled(True)
            if HAS_DBUS:
                self.btn_pair.setEnabled(True)
        else:
            self.btn_connect.setEnabled(True)    # re-enable only on failure

    def _on_services_discovered(self, services):
        """Populate the service tree with discovered GATT services."""
        self.service_tree.clear()
        self._log(f"Discovered {len(services.services)} service(s)")

        for service in services:
            # Service node
            svc_item = QTreeWidgetItem([
                f"Service: {service.uuid}",
                f"Handle: 0x{service.handle:04X}",
                service.description or ""
            ])
            svc_item.setFont(0, QFont("sans-serif", 9, QFont.Bold))
            svc_item.setExpanded(True)
            self.service_tree.addTopLevelItem(svc_item)

            for char in service.characteristics:
                # Build properties string
                props = ", ".join(char.properties)

                char_item = QTreeWidgetItem([
                    f"  Char: {char.uuid}",
                    props,
                    char.description or ""
                ])
                char_item.setData(0, Qt.UserRole, char.uuid)
                char_item.setData(0, Qt.UserRole + 1, "characteristic")
                char_item.setData(0, Qt.UserRole + 2, char.handle)
                svc_item.addChild(char_item)

                # Descriptors
                for desc in char.descriptors:
                    desc_item = QTreeWidgetItem([
                        f"    Desc: {desc.uuid}",
                        "",
                        desc.description or ""
                    ])
                    desc_item.setData(0, Qt.UserRole, desc.uuid)
                    desc_item.setData(0, Qt.UserRole + 1, "descriptor")
                    desc_item.setData(0, Qt.UserRole + 2, desc.handle)
                    char_item.addChild(desc_item)

        self.service_tree.expandAll()

        # Populate shared write characteristic combo
        self.write_char_combo.clear()
        for service in services:
            for char in service.characteristics:
                props = char.properties  # list[str]
                if "write" in props or "write-without-response" in props:
                    label = char.uuid
                    if char.description:
                        label = f"{char.description}  ({char.uuid})"
                    props_note = []
                    if "write" in props:
                        props_note.append("write")
                    if "write-without-response" in props:
                        props_note.append("write-no-resp")
                    if "notify" in props:
                        props_note.append("notify")
                    label += f"  [{', '.join(props_note)}]"
                    self.write_char_combo.addItem(label, char.uuid)

    # ---- Characteristic Operations ------------------------------------------

    def _get_selected_char(self):
        """Return (uuid, properties_text) of the selected characteristic, or None."""
        item = self.service_tree.currentItem()
        if not item:
            return None
        if item.data(0, Qt.UserRole + 1) != "characteristic":
            return None
        return item.data(0, Qt.UserRole), item.text(1)

    def _on_char_selected(self, current, previous):
        """Enable/disable operation buttons based on selected characteristic."""
        self.btn_read.setEnabled(False)
        self.btn_write.setEnabled(False)
        self.btn_notify.setEnabled(False)
        self.btn_indicate.setEnabled(False)

        if not current or not self._client:
            return
        if current.data(0, Qt.UserRole + 1) != "characteristic":
            return

        props = current.text(1).lower()
        self.btn_read.setEnabled("read" in props)
        self.btn_write.setEnabled("write" in props)
        uuid = current.data(0, Qt.UserRole)
        if "notify" in props:
            self.btn_notify.setEnabled(True)
            self.btn_notify.setText("Stop Notify" if uuid in self._notifying else "Notify")
        if "indicate" in props:
            self.btn_indicate.setEnabled(True)
            self.btn_indicate.setText("Stop Indicate" if uuid in self._notifying else "Indicate")

    def _char_context_menu(self, pos):
        """Right-click context menu on characteristic items."""
        item = self.service_tree.itemAt(pos)
        if not item or item.data(0, Qt.UserRole + 1) != "characteristic":
            return
        if not self._client:
            return

        props = item.text(1).lower()
        uuid = item.data(0, Qt.UserRole)
        menu = QMenu(self)

        if "read" in props:
            menu.addAction("Read").triggered.connect(self._on_char_read)
        if "write" in props:
            menu.addAction("Write").triggered.connect(self._on_char_write)
        if "notify" in props:
            label = "Stop Notify" if uuid in self._notifying else "Start Notify"
            menu.addAction(label).triggered.connect(self._on_char_notify)
        if "indicate" in props:
            label = "Stop Indicate" if uuid in self._notifying else "Start Indicate"
            menu.addAction(label).triggered.connect(self._on_char_indicate)

        menu.exec_(self.service_tree.viewport().mapToGlobal(pos))

    def _on_char_read(self):
        info = self._get_selected_char()
        if not info or not self._client:
            return
        uuid, _ = info
        self._log(f"Reading {uuid}...")

        async def _read():
            try:
                value = await self._client.read_gatt_char(uuid)
                self.char_value_read.emit(uuid, value)
            except Exception as e:
                self.log_signal.emit(f"Read error: {e}")

        self._async.run(_read())

    def _on_char_value_read(self, uuid: str, value: bytes):
        hex_str = value.hex(" ")
        text_str = value.decode("utf-8", errors="replace")
        self._log(f"Read [{uuid}]: hex={hex_str}  text=\"{text_str}\"")
        # Update the value column in the tree
        self._update_char_value_in_tree(uuid, hex_str)

    def _on_char_write(self):
        info = self._get_selected_char()
        if not info or not self._client:
            return
        uuid, _ = info
        hex_text = self.write_input.text().strip()
        if not hex_text:
            self._log("Write error: no data entered.")
            return

        try:
            data = bytes.fromhex(hex_text.replace(" ", ""))
        except ValueError:
            self._log("Write error: invalid hex string.")
            return

        write_with_response = self.combo_write_type.currentIndex() == 0
        self._log(f"Writing {data.hex(' ')} to {uuid} ({'request' if write_with_response else 'command'})...")

        async def _write():
            try:
                await self._client.write_gatt_char(uuid, data, response=write_with_response)
                self.log_signal.emit(f"Write to [{uuid}] OK")
            except Exception as e:
                self.log_signal.emit(f"Write error: {e}")

        self._async.run(_write())

    def _on_char_notify(self):
        self._toggle_notification("notify")

    def _on_char_indicate(self):
        self._toggle_notification("indicate")

    def _toggle_notification(self, mode: str):
        info = self._get_selected_char()
        if not info or not self._client:
            return
        uuid, _ = info

        if uuid in self._notifying:
            # Stop
            self._log(f"Stopping {mode} on {uuid}...")

            async def _stop():
                try:
                    await self._client.stop_notify(uuid)
                    self._notifying.discard(uuid)
                    self.log_signal.emit(f"Stopped {mode} on [{uuid}]")
                except Exception as e:
                    self.log_signal.emit(f"Stop {mode} error: {e}")

            self._async.run(_stop())
        else:
            # Start
            self._log(f"Starting {mode} on {uuid}...")

            def _callback(handle, data):
                self.char_notify_received.emit(uuid, data)

            async def _start():
                try:
                    await self._client.start_notify(uuid, _callback)
                    self._notifying.add(uuid)
                    self.log_signal.emit(f"Started {mode} on [{uuid}]")
                except Exception as e:
                    self.log_signal.emit(f"Start {mode} error: {e}")

            self._async.run(_start())

        # Update button text
        QTimer.singleShot(500, lambda: self._on_char_selected(
            self.service_tree.currentItem(), None))

    def _on_notify_received(self, uuid: str, value: bytes):
        hex_str = value.hex(" ")
        text_str = value.decode("utf-8", errors="replace")
        self._log(f"Notify [{uuid}]: hex={hex_str}  text=\"{text_str}\"")
        self._update_char_value_in_tree(uuid, hex_str)

    def _update_char_value_in_tree(self, uuid: str, value_str: str):
        """Find the characteristic item by UUID and update its value column."""
        for i in range(self.service_tree.topLevelItemCount()):
            svc = self.service_tree.topLevelItem(i)
            for j in range(svc.childCount()):
                char = svc.child(j)
                if char.data(0, Qt.UserRole) == uuid:
                    char.setText(2, value_str)
                    return

    # ---- Ping (Proto V0) --------------------------------------------------

    def _on_ping(self):
        if not self._client:
            self._log("Ping: not connected.")
            return

        uuid = self.write_char_combo.currentData()
        if not uuid:
            self._log("Ping: no write characteristic selected.")
            return

        # Find a notify-capable characteristic in the same service
        notify_uuid = self._fio_find_notify_uuid(uuid)

        message = self.ping_message.text()
        pb_payload = pb_encode_ping(message)
        frame = build_pb_frame(_PB_MSG_TYPE_PING, pb_payload, router=1)

        self._log(f"Ping TX → {uuid}  ({len(frame)}B): {frame.hex(' ')}")
        self.lbl_ping_result.setText("Waiting for response…")
        self.btn_ping.setEnabled(False)

        loop = self._async._loop

        async def _ping():
            response_queue: asyncio.Queue[bytes] = asyncio.Queue()

            def _notify_cb(handle, data: bytearray):
                loop.call_soon_threadsafe(response_queue.put_nowait, bytes(data))

            try:
                if notify_uuid:
                    await self._client.start_notify(notify_uuid, _notify_cb)

                await self._client.write_gatt_char(uuid, frame, response=False)

                if not notify_uuid:
                    self.log_signal.emit("Ping sent (no notify characteristic in service — response skipped).")
                    self.ping_result_signal.emit(True, "Sent (no notify)")
                    return

                try:
                    rx_data = await asyncio.wait_for(response_queue.get(), timeout=5.0)
                except asyncio.TimeoutError:
                    self.log_signal.emit("Ping: timeout — no response received.")
                    self.ping_result_signal.emit(False, "Timeout")
                    return

                self.log_signal.emit(f"Ping RX ({len(rx_data)}B): {rx_data.hex(' ')}")

                payload = parse_proto_frame(rx_data)
                if payload is None:
                    self.log_signal.emit("Ping: malformed Proto V0 frame in response.")
                    self.ping_result_signal.emit(False, "Bad frame")
                    return

                parsed = parse_pb_response(payload)
                if parsed is None:
                    self.log_signal.emit("Ping: response payload too short.")
                    self.ping_result_signal.emit(False, "Bad payload")
                    return

                msg_type, pb = parsed
                msg_name = _PB_MSG_NAMES.get(msg_type, f"Unknown({msg_type})")
                if msg_type == _PB_MSG_TYPE_SUCCESS:
                    decoded = pb_decode_success(pb)
                    self.log_signal.emit(f"Ping OK  msg_type={msg_type} ({msg_name})  response=\"{decoded}\"")
                    self.ping_result_signal.emit(True, f"Success: \"{decoded}\"")
                elif msg_type == _PB_MSG_TYPE_FAILURE:
                    code, decoded = pb_decode_failure(pb)
                    self.log_signal.emit(f"Ping FAIL  msg_type={msg_type} ({msg_name})  code={code}  \"{decoded}\"")
                    self.ping_result_signal.emit(False, f"Failure code={code}: \"{decoded}\"")
                else:
                    self.log_signal.emit(f"Ping unexpected msg_type={msg_type} ({msg_name})")
                    self.ping_result_signal.emit(False, f"Unexpected msg_type={msg_type} ({msg_name})")

            except Exception as exc:
                self.log_signal.emit(f"Ping error: {exc}")
                self.ping_result_signal.emit(False, f"Error: {exc}")
            finally:
                if notify_uuid:
                    try:
                        await self._client.stop_notify(notify_uuid)
                    except Exception:
                        pass

        self._async.run(_ping())

    def _on_ping_result(self, success: bool, text: str):
        color = "#2ecc71" if success else "#e74c3c"
        self.lbl_ping_result.setText(f'<span style="color:{color}">{text}</span>')
        self.btn_ping.setEnabled(True)

    # ---- File I/O (Proto V0) ------------------------------------------------

    def _fio_uuid(self) -> str | None:
        uuid = self.write_char_combo.currentData()
        if not uuid:
            self._log("File I/O: no write characteristic selected.")
        return uuid

    def _fio_char_props(self, uuid: str) -> set[str]:
        for svc in self._client.services:
            for char in svc.characteristics:
                if char.uuid == uuid:
                    return set(char.properties)
        return set()

    def _fio_find_notify_uuid(self, write_uuid: str) -> str | None:
        """Find a notify-capable characteristic in the same service as *write_uuid*.
        Returns *write_uuid* itself if it supports notify, otherwise looks for
        a sibling characteristic with notify."""
        for svc in self._client.services:
            has_write = False
            notify_uuid = None
            for char in svc.characteristics:
                if char.uuid == write_uuid:
                    has_write = True
                    if "notify" in char.properties:
                        return write_uuid  # same char has both
                if "notify" in char.properties:
                    notify_uuid = char.uuid
            if has_write and notify_uuid:
                return notify_uuid
        return None

    async def _fio_transact(self, char, frame: bytes,
                            queue: asyncio.Queue, timeout: float = 3.0,
                            *, frag_size: int = 244,
                            long_write: bool = False) -> bytes:
        """Send *frame* via BLE write, then wait for one notify ACK.

        When *long_write* is True the entire frame is sent in a single
        write_gatt_char(response=True) call.  WinRT handles ATT Long
        Write (Prepare Write + Execute Write) in one async operation,
        eliminating per-fragment Python-level await overhead (~13 ms each
        on a typical BLE connection interval).
        """
        if long_write:
            await self._client.write_gatt_char(char, frame, response=True)
        elif len(frame) <= frag_size:
            await self._client.write_gatt_char(char, frame, response=False)
        else:
            for i in range(0, len(frame), frag_size):
                await self._client.write_gatt_char(
                    char, frame[i:i + frag_size], response=False)
        return await asyncio.wait_for(queue.get(), timeout=timeout)

    def _fio_parse_response(self, rx: bytes) -> tuple[int, bytes] | None:
        payload = parse_proto_frame(rx)
        if payload is None:
            return None
        return parse_pb_response(payload)

    # ---- Upload (Write) -----------------------------------------------------

    def _on_fw_browse(self):
        path, _ = QFileDialog.getOpenFileName(
            self, "Select file to upload", "", "All Files (*)",
            options=QFileDialog.DontUseNativeDialog)
        if not path:
            return
        from pathlib import Path
        try:
            data = Path(path).read_bytes()
        except Exception as e:
            self._log(f"File read error: {e}")
            return
        self._fw_file_data = data
        from pathlib import Path as _Path
        p = _Path(path)
        self.fw_file_info.setStyleSheet(
            "QTextEdit { background: #1a1a1a; color: #00d4aa; "
            "border: 1px solid #00d4aa; border-radius: 4px; font-family: monospace; }")
        self.fw_file_info.setPlainText(
            f"Name : {p.name}\n"
            f"Path : {p.parent}\n"
            f"Size : {len(data):,} B  ({len(data)/1024:.1f} KB)"
        )

    def _on_fw_abort(self):
        self._fw_abort = True

    def _on_fw_send(self):
        if not self._client:
            self._log("File write: not connected."); return
        uuid = self._fio_uuid()
        if not uuid: return
        if not self._fw_file_data:
            self._log("File write: no file selected."); return
        device_path = self.fio_device_path.text().strip()
        if not device_path:
            self._log("File write: device path is empty."); return

        data       = self._fw_file_data
        total      = len(data)
        chunk_size = self.fw_chunk_spin.value()
        notify_uuid = self._fio_find_notify_uuid(uuid)
        if not notify_uuid:
            self._log("File write: no notify characteristic found in the same "
                      "service — cannot receive ACK. Aborting.")
            return
        loop       = self._async._loop
        self._fw_abort = False

        self.btn_fw_send.setEnabled(False)
        self.btn_fw_abort.setEnabled(True)
        self.fw_progress.setVisible(True)
        self.fw_progress.setValue(0)
        self.fw_progress_signal.emit(0, f"0 / {total:,} B")

        async def _upload():
            queue: asyncio.Queue[bytes] = asyncio.Queue()

            def _notify_cb(handle, raw: bytearray):
                loop.call_soon_threadsafe(queue.put_nowait, bytes(raw))

            try:
                await self._client.start_notify(notify_uuid, _notify_cb)

                # Pre-compute fragment size once for the entire upload
                frag_size = max(self._client.mtu_size - 3, 20)

                # Pre-resolve characteristic object (skips per-write UUID lookup)
                write_char = None
                for svc in self._client.services:
                    for c in svc.characteristics:
                        if c.uuid == uuid:
                            write_char = c
                            break
                    if write_char:
                        break
                # ATT Long Write: send entire frame in one async op instead
                # of N per-fragment awaits (~13 ms each).  Requires the
                # characteristic to support Write With Response ("write").
                long_write = (write_char is not None
                              and "write" in write_char.properties)

                offset = 0
                overwrite = True
                t_start = time.perf_counter()
                rtt_sum = 0.0
                rtt_count = 0
                while offset < total:
                    if self._fw_abort:
                        self.fw_progress_signal.emit(
                            int(offset * 100 / total), "Aborted")
                        return

                    chunk = data[offset:offset + chunk_size]
                    file_pb  = pb_encode_file(device_path, offset, total, chunk)
                    write_pb = pb_encode_file_write(file_pb, overwrite, False)
                    frame    = build_pb_frame(_PB_MSG_TYPE_FILEWRITE, write_pb, router=1)

                    # Send frame and wait for ACK
                    t_req = time.perf_counter()
                    try:
                        rx = await self._fio_transact(
                            write_char or uuid, frame, queue,
                            timeout=3.0, frag_size=frag_size,
                            long_write=long_write)
                    except asyncio.TimeoutError:
                        raise
                    except Exception:
                        if long_write:
                            long_write = False
                            self.log_signal.emit(
                                "ATT Long Write unsupported, "
                                "falling back to fragmentation")
                            rx = await self._fio_transact(
                                write_char or uuid, frame, queue,
                                timeout=3.0, frag_size=frag_size,
                                long_write=False)
                        else:
                            raise
                    t_ack = time.perf_counter()
                    rtt_sum += (t_ack - t_req)
                    rtt_count += 1

                    parsed = self._fio_parse_response(rx)
                    if parsed is None:
                        raise RuntimeError("Bad proto frame in response")
                    msg_type, pb = parsed
                    if msg_type == _PB_MSG_TYPE_FAILURE:
                        code, msg = pb_decode_failure(pb)
                        raise RuntimeError(f"Device error code={code}: {msg}")
                    if msg_type == _PB_MSG_TYPE_FILE:
                        dec = pb_decode_file(pb)
                        processed = dec.get("processed_byte")
                        if processed is not None:
                            offset = processed
                        else:
                            offset += len(chunk)
                    else:
                        offset += len(chunk)

                    # Progress updates only after ACK confirms
                    overwrite = False
                    elapsed = t_ack - t_start
                    speed = offset / elapsed if elapsed > 0 else 0
                    avg_rtt = rtt_sum / rtt_count * 1000  # ms
                    pct = min(int(offset * 100 / total), 100)
                    self.fw_progress_signal.emit(
                        pct,
                        f"{offset:,}/{total:,} B  "
                        f"{speed/1024:.1f} KB/s  "
                        f"RTT {avg_rtt:.0f}ms")

                elapsed = time.perf_counter() - t_start
                speed = total / elapsed if elapsed > 0 else 0
                avg_rtt = rtt_sum / rtt_count * 1000 if rtt_count else 0
                self.fw_progress_signal.emit(100,
                    f"Done {total:,} B  "
                    f"{speed/1024:.1f} KB/s  "
                    f"RTT {avg_rtt:.0f}ms  "
                    f"{elapsed:.1f}s")
                self.log_signal.emit(
                    f"File upload complete: {device_path}  {total:,} B  "
                    f"avg {speed/1024:.1f} KB/s  "
                    f"avg RTT {avg_rtt:.0f} ms  "
                    f"total {elapsed:.1f} s  "
                    f"({rtt_count} packets)")

            except Exception as exc:
                self.fw_progress_signal.emit(-1, f"Error: {exc}")
                self.log_signal.emit(f"File upload error: {exc}")
            finally:
                try:
                    await self._client.stop_notify(notify_uuid)
                except Exception:
                    pass
                self.fw_progress_signal.emit(-2, "")   # sentinel: re-enable buttons

        self._async.run(_upload())

    def _on_fw_progress(self, pct: int, text: str):
        if pct == -2:
            self.btn_fw_send.setEnabled(True)
            self.btn_fw_abort.setEnabled(False)
            return
        if pct >= 0:
            self.fw_progress.setValue(pct)
            self.fw_progress.setFormat(f"{text}  ({pct}%)")
        color = "#2ecc71" if pct == 100 else ("#e74c3c" if pct == -1 else "#eee")
        self.lbl_fw_status.setText(f'<span style="color:{color}">{text}</span>')

    def _on_pair(self):
        """Initiate pairing (Linux only)."""
        if not HAS_DBUS:
            self._log("Pairing is not supported on Windows. Use Windows Bluetooth settings.")
            QMessageBox.information(self, "Pairing",
                "Pairing is not supported directly on Windows.\n\n"
                "Please use Windows Bluetooth settings to pair devices:\n"
                "1. Open Windows Settings > Bluetooth & devices\n"
                "2. Click 'Add device'\n"
                "3. Select your BLE device from the list")
            return

        if not self._client or not self._connected_address:
            self._log("Not connected.")
            return
        self._log("Initiating pairing...")

        async def _pair():
            try:
                await self._client.pair()
                self.log_signal.emit("Pairing successful!")
            except Exception as e:
                self.log_signal.emit(f"Pairing failed: {e}")

        self._async.run(_pair())

    def _reset_connection_ui(self):
        """Reset all UI state to disconnected. Safe to call from any context."""
        self.lbl_conn.setText("Not connected")
        # Sync scan button in case the scanner was stopped internally during connect
        if not self._scanning:
            self.btn_scan.setText("Start Scan")
        self.btn_connect.setEnabled(True)
        self.btn_disconnect.setEnabled(False)
        self.btn_pair.setEnabled(False)
        self.btn_ping.setEnabled(False)
        self.lbl_ping_result.setText("")
        self.write_char_combo.clear()
        self.btn_fw_send.setEnabled(False)
        self.fw_progress.setVisible(False)
        self.lbl_fw_status.setText("")
        self.fw_file_info.clear()
        self.service_tree.clear()
        self._notifying.clear()
        self.btn_read.setEnabled(False)
        self.btn_write.setEnabled(False)
        self.btn_notify.setEnabled(False)
        self.btn_indicate.setEnabled(False)

    def _on_unexpected_disconnect(self, reason: str):
        """Handle device-initiated disconnect (via disconnected_callback)."""
        self._log(f"[!] {reason}")
        self._client = None
        self._connected_address = None
        self._reset_connection_ui()

    def _on_disconnect(self):
        if not self._client:
            return
        self._log("Disconnecting...")
        client = self._client
        self._client = None
        self._connected_address = None
        self._reset_connection_ui()
        # Keep Connect disabled until the old client is fully closed so a
        # new connect() does not race with the ongoing disconnect.
        self.btn_connect.setEnabled(False)

        async def _disconnect():
            try:
                await asyncio.wait_for(client.disconnect(), timeout=5.0)
                self.log_signal.emit("Disconnected.")
            except asyncio.TimeoutError:
                self.log_signal.emit("Disconnect timed out — forcing cleanup.")
            except Exception as e:
                self.log_signal.emit(f"Disconnect error: {e}")
            QTimer.singleShot(0, lambda: self.btn_connect.setEnabled(True))

        self._async.run(_disconnect())

    # ---- Pairing Agent (Linux only) --------------------------------------------

    def _setup_pairing_agent(self):
        """Register the BlueZ pairing agent for numerical comparison (Linux only)."""
        if not HAS_DBUS:
            self._log(f"Platform: {platform.system()} - Pairing via tool not supported")
            return

        self._agent = register_pairing_agent()
        if self._agent:
            self._agent.confirm_request_callback = self._handle_pairing_request
            self._log("Pairing agent registered (numerical comparison supported)")
        else:
            self._log("Pairing agent not available (run with appropriate permissions)")

        self.pairing_request.connect(self._show_pairing_dialog)

    def _handle_pairing_request(self, device_path, passkey, mode):
        """Called from D-Bus thread — emit signal for thread-safe UI dialog."""
        if not HAS_DBUS:
            return False

        import threading
        if mode == "display":
            self.log_signal.emit(f"Passkey display: {passkey:06d} for {device_path}")
            return True

        # For confirmation, we need to block until the user responds
        self._pairing_result = None
        event = threading.Event()

        def _on_result(dev, pk, m):
            # This runs in the main thread via signal
            pass

        # Use a blocking approach: emit signal and wait
        self.pairing_request.emit(str(device_path), int(passkey), mode)

        # Wait for user response (the dialog sets self._pairing_result)
        for _ in range(600):  # 60 second timeout
            if self._pairing_result is not None:
                break
            import time
            time.sleep(0.1)

        return self._pairing_result or False

    def _show_pairing_dialog(self, device_path: str, passkey: int, mode: str):
        """Show a dialog asking the user to confirm numerical comparison."""
        device_name = device_path.split("/")[-1] if "/" in device_path else device_path

        if mode == "confirm":
            msg = (
                f"Pairing request from:\n{device_name}\n\n"
                f"Confirm passkey matches:\n\n"
                f"  {passkey:06d}\n\n"
                f"Does this number match the one shown on the device?"
            )
            reply = QMessageBox.question(
                self, "Numerical Comparison - Pairing",
                msg,
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.No
            )
            self._pairing_result = (reply == QMessageBox.Yes)
            if self._pairing_result:
                self._log(f"Pairing confirmed for {device_name} (passkey: {passkey:06d})")
            else:
                self._log(f"Pairing rejected for {device_name}")
        elif mode == "display":
            self._log(f"Display passkey: {passkey:06d} for {device_name}")
            self._pairing_result = True

    # ---- Cleanup ----------------------------------------------------------

    def closeEvent(self, event):
        if self._scanning:
            self._stop_scan()
        if self._client:
            self._async.run(self._client.disconnect())
        self._async.stop()
        event.accept()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    signal.signal(signal.SIGINT, signal.SIG_DFL)  # allow Ctrl+C
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    window = BLEToolWindow()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()