/**
 * Pro2 Debug Page
 *
 * Direct WebUSB communication with OneKey Pro2 device using Proto V0 framing.
 * Independent of the main SDK flow — mirrors webusb_test.html but in React.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { PageLayout } from '../components/common/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Usb,
  Wifi,
  Terminal,
  FolderOpen,
  RefreshCw,
  Send,
  Download,
  Upload,
  Trash2,
  ChevronRight,
  FolderPlus,
  FolderMinus,
  FileMinus,
  Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// CRC8 (init=0x30) and Proto V0 frame building (mirrors hd-transport)
// ---------------------------------------------------------------------------
// CRC-8 lookup table (polynomial=0x5e, init=0x30) — extracted from OneKey Pro2 firmware
const CRC8_TABLE = new Uint8Array([
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
]);

function crc8(data: Uint8Array, len: number): number {
  let crc = 0x30;
  for (let i = 0; i < len; i++) crc = CRC8_TABLE[crc ^ data[i]];
  return crc;
}

let protoSeq = 0;
function buildProtoV0Frame(payload: Uint8Array | null, packetSrc = 0, router = 0): Uint8Array {
  const payloadLen = payload ? payload.length : 0;
  const frameLen = payloadLen + 8;
  const frame = new Uint8Array(frameLen);
  protoSeq = (protoSeq + 1) & 0xff;
  if (protoSeq === 0) protoSeq = 1;
  frame[0] = 0x5a;
  frame[1] = frameLen & 0xff;
  frame[2] = (frameLen >> 8) & 0xff;
  frame[4] = router & 0xff;
  frame[5] = ((packetSrc & 0x0f) << 2);
  frame[6] = protoSeq;
  frame[3] = crc8(frame, 3);
  if (payload && payloadLen > 0) frame.set(payload, 7);
  frame[frameLen - 1] = crc8(frame, frameLen - 1);
  return frame;
}

function buildPbFrame(msgType: number, pbPayload: Uint8Array): Uint8Array {
  const payload = new Uint8Array(2 + pbPayload.length);
  payload[0] = msgType & 0xff;
  payload[1] = (msgType >> 8) & 0xff;
  payload.set(pbPayload, 2);
  return buildProtoV0Frame(payload);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PID_PRO2 = 0x53c1;
const VENDOR_ID = 0x1209;

const PB_MSG_TYPE = {
  Ping: 60206,
  Success: 60207,
  Failure: 60208,
  Reboot: 60400,
  FixPermission: 60800,
  PathInfo: 60801,
  PathInfoQuery: 60802,
  File: 60803,
  FileRead: 60804,
  FileWrite: 60805,
  FileDelete: 60806,
  Dir: 60807,
  DirList: 60808,
  DirMake: 60809,
  DirRemove: 60810,
  FirmwareUpdate: 61000,
  FirmwareInstallProgress: 61001,
} as const;

const PB_MSG_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(PB_MSG_TYPE).map(([k, v]) => [v, k])
);

const REBOOT_TYPE = { 0: 'Normal', 1: 'Boardloader', 2: 'BootLoader' } as const;

// ---------------------------------------------------------------------------
// Minimal protobuf encoder/decoder (mirrors webusb_test.html)
// ---------------------------------------------------------------------------
function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return bytes;
}

function encodeString(fieldNum: number, str: string): number[] {
  if (!str || str.length === 0) return [];
  const strBytes = new TextEncoder().encode(str);
  const tag = (fieldNum << 3) | 2;
  return [...encodeVarint(tag), ...encodeVarint(strBytes.length), ...strBytes];
}

function encodeUint32(fieldNum: number, value: number, required = false): number[] {
  if (value === 0 && !required) return [];
  const tag = (fieldNum << 3) | 0;
  return [...encodeVarint(tag), ...encodeVarint(value)];
}

function encodeBool(fieldNum: number, value: boolean): number[] {
  const tag = (fieldNum << 3) | 0;
  return [...encodeVarint(tag), value ? 1 : 0];
}

function encodeBytes(fieldNum: number, bytes: Uint8Array): number[] {
  if (!bytes || bytes.length === 0) return [];
  const tag = (fieldNum << 3) | 2;
  return [...encodeVarint(tag), ...encodeVarint(bytes.length), ...bytes];
}

function encodePing(message: string): Uint8Array {
  return new Uint8Array(encodeString(1, message));
}

function encodePathInfoQuery(path: string): Uint8Array {
  return new Uint8Array(encodeString(1, path));
}

function encodeDirList(path: string): Uint8Array {
  return new Uint8Array(encodeString(1, path));
}

function encodeDirMake(path: string): Uint8Array {
  return new Uint8Array(encodeString(1, path));
}

function encodeDirRemove(path: string): Uint8Array {
  return new Uint8Array(encodeString(1, path));
}

function encodeFileDelete(path: string): Uint8Array {
  return new Uint8Array(encodeString(1, path));
}

function encodeFileMsg(path: string, offset: number, totalSize: number, data?: Uint8Array, dataHash?: number): number[] {
  const result: number[] = [];
  result.push(...encodeString(1, path));
  result.push(...encodeUint32(2, offset, true));
  result.push(...encodeUint32(3, totalSize, true));
  if (data && data.length > 0) result.push(...encodeBytes(4, data));
  if (dataHash !== undefined) result.push(...encodeUint32(5, dataHash));
  return result;
}

function encodeFileRead(path: string, offset: number, totalSize: number, chunkLen?: number): Uint8Array {
  const fileBytes = encodeFileMsg(path, offset, totalSize);
  const result: number[] = [];
  const tag1 = (1 << 3) | 2;
  result.push(...encodeVarint(tag1), ...encodeVarint(fileBytes.length), ...fileBytes);
  if (chunkLen != null) result.push(...encodeUint32(2, chunkLen));
  return new Uint8Array(result);
}

function encodeFileWrite(path: string, offset: number, totalSize: number, data: Uint8Array, overwrite: boolean, append: boolean): Uint8Array {
  const fileBytes = encodeFileMsg(path, offset, totalSize, data);
  const result: number[] = [];
  const tag1 = (1 << 3) | 2;
  result.push(...encodeVarint(tag1), ...encodeVarint(fileBytes.length), ...fileBytes);
  result.push(...encodeBool(2, overwrite));
  result.push(...encodeBool(3, append));
  return new Uint8Array(result);
}

function encodeFixPermission(): Uint8Array {
  return new Uint8Array([]);
}

// FirmwareTargetType enum
const FirmwareTargetType = {
  TARGET_MAIN_APP: 0,
  TARGET_MAIN_BOOT: 1,
  TARGET_BLE: 2,
  TARGET_SE1: 3,
  TARGET_SE2: 4,
  TARGET_SE3: 5,
  TARGET_SE4: 6,
  TARGET_RESOURCE: 10,
} as const;

const FW_TARGET_LABELS: Record<number, string> = {
  0: 'Main App',
  1: 'Main Boot',
  2: 'BLE',
  3: 'SE1',
  4: 'SE2',
  5: 'SE3',
  6: 'SE4',
  10: 'Resource',
};

// FirmwareTarget { required FirmwareTargetType target_id=1; required string path=2; }
function encodeFirmwareTarget(targetId: number, path: string): number[] {
  const result: number[] = [];
  result.push(...encodeUint32(1, targetId, true));
  result.push(...encodeString(2, path));
  return result;
}

// FirmwareUpdate { repeated FirmwareTarget targets=1; optional bool reboot_on_success=2; }
function encodeFirmwareUpdate(targets: Array<{ targetId: number; path: string }>, rebootOnSuccess: boolean | null = null): Uint8Array {
  const result: number[] = [];
  for (const target of targets) {
    const targetBytes = encodeFirmwareTarget(target.targetId, target.path);
    const tag1 = (1 << 3) | 2;
    result.push(...encodeVarint(tag1), ...encodeVarint(targetBytes.length), ...targetBytes);
  }
  if (rebootOnSuccess !== null) {
    result.push(...encodeBool(2, rebootOnSuccess));
  }
  return new Uint8Array(result);
}

function encodeReboot(rebootType: number): Uint8Array {
  return new Uint8Array(encodeUint32(1, rebootType, true));
}

// Decoder helpers
function decodeVarintAt(data: Uint8Array, offset: number): { value: number; offset: number } {
  let value = 0, shift = 0;
  while (offset < data.length) {
    const byte = data[offset++];
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return { value, offset };
}

function decodeStringSlice(data: Uint8Array, offset: number, len: number): string {
  return new TextDecoder().decode(data.slice(offset, offset + len));
}

interface DecodedSuccess { message: string }
interface DecodedFailure { code: number; message: string }
interface DecodedFile { path: string; offset: number; totalSize: number; data: Uint8Array | null; dataHash: number | null; processedByte: number | null }
interface DecodedPathInfo { exist: boolean; size: number; year: number; month: number; day: number; hour: number; minute: number; second: number; readonly: boolean; hidden: boolean; system: boolean; archive: boolean; directory: boolean }
interface DecodedDir { path: string; childDirs: string; childFiles: string }

function decodeSuccess(data: Uint8Array): DecodedSuccess {
  let offset = 0, message = '';
  while (offset < data.length) {
    const { value: tag, offset: off1 } = decodeVarintAt(data, offset);
    offset = off1;
    const fieldNum = tag >> 3, wireType = tag & 0x7;
    if (fieldNum === 1 && wireType === 2) {
      const { value: len, offset: off2 } = decodeVarintAt(data, offset);
      message = decodeStringSlice(data, off2, len);
      offset = off2 + len;
    } else break;
  }
  return { message };
}

function decodeFailure(data: Uint8Array): DecodedFailure {
  let offset = 0, code = 0, message = '';
  while (offset < data.length) {
    const { value: tag, offset: off1 } = decodeVarintAt(data, offset);
    offset = off1;
    const fieldNum = tag >> 3, wireType = tag & 0x7;
    if (fieldNum === 1 && wireType === 0) {
      const { value: val, offset: off2 } = decodeVarintAt(data, offset);
      code = val; offset = off2;
    } else if (fieldNum === 2 && wireType === 2) {
      const { value: len, offset: off2 } = decodeVarintAt(data, offset);
      message = decodeStringSlice(data, off2, len);
      offset = off2 + len;
    } else break;
  }
  return { code, message };
}

function decodeFile(data: Uint8Array): DecodedFile {
  let offset = 0;
  const result: DecodedFile = { path: '', offset: 0, totalSize: 0, data: null, dataHash: null, processedByte: null };
  while (offset < data.length) {
    const { value: tag, offset: off1 } = decodeVarintAt(data, offset);
    offset = off1;
    const fieldNum = tag >> 3, wireType = tag & 0x7;
    if (wireType === 0) {
      const { value: val, offset: off2 } = decodeVarintAt(data, offset);
      offset = off2;
      if (fieldNum === 2) result.offset = val;
      else if (fieldNum === 3) result.totalSize = val;
      else if (fieldNum === 5) result.dataHash = val;
      else if (fieldNum === 6) result.processedByte = val;
    } else if (wireType === 2) {
      const { value: len, offset: off2 } = decodeVarintAt(data, offset);
      if (fieldNum === 1) result.path = decodeStringSlice(data, off2, len);
      else if (fieldNum === 4) result.data = data.slice(off2, off2 + len);
      offset = off2 + len;
    } else break;
  }
  return result;
}

function decodePathInfo(data: Uint8Array): DecodedPathInfo {
  let offset = 0;
  const r: DecodedPathInfo = { exist: false, size: 0, year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0, readonly: false, hidden: false, system: false, archive: false, directory: false };
  while (offset < data.length) {
    const { value: tag, offset: off1 } = decodeVarintAt(data, offset);
    offset = off1;
    const fieldNum = tag >> 3, wireType = tag & 0x7;
    if (wireType === 0) {
      const { value: val, offset: off2 } = decodeVarintAt(data, offset);
      offset = off2;
      if (fieldNum === 1) r.exist = val !== 0;
      else if (fieldNum === 2) r.size = val;
      else if (fieldNum === 3) r.year = val;
      else if (fieldNum === 4) r.month = val;
      else if (fieldNum === 5) r.day = val;
      else if (fieldNum === 6) r.hour = val;
      else if (fieldNum === 7) r.minute = val;
      else if (fieldNum === 8) r.second = val;
      else if (fieldNum === 9) r.readonly = val !== 0;
      else if (fieldNum === 10) r.hidden = val !== 0;
      else if (fieldNum === 11) r.system = val !== 0;
      else if (fieldNum === 12) r.archive = val !== 0;
      else if (fieldNum === 13) r.directory = val !== 0;
    } else break;
  }
  return r;
}

function decodeDir(data: Uint8Array): DecodedDir {
  let offset = 0;
  const r: DecodedDir = { path: '', childDirs: '', childFiles: '' };
  while (offset < data.length) {
    const { value: tag, offset: off1 } = decodeVarintAt(data, offset);
    offset = off1;
    const fieldNum = tag >> 3, wireType = tag & 0x7;
    if (wireType === 2) {
      const { value: len, offset: off2 } = decodeVarintAt(data, offset);
      const str = decodeStringSlice(data, off2, len);
      if (fieldNum === 1) r.path = str;
      else if (fieldNum === 2) r.childDirs = str;
      else if (fieldNum === 3) r.childFiles = str;
      offset = off2 + len;
    } else break;
  }
  return r;
}

function parseProtoV0Response(data: Uint8Array): { msgType: number; pbPayload: Uint8Array } | null {
  if (data.length < 8 || data[0] !== 0x5a) return null;
  const frameLen = data[1] | (data[2] << 8);
  if (data.length < frameLen) return null;
  // payload starts at byte 7, ends at frameLen-1 (last byte is CRC)
  const payload = data.slice(7, frameLen - 1);
  if (payload.length < 2) return null;
  const msgType = payload[0] | (payload[1] << 8);
  return { msgType, pbPayload: payload.slice(2) };
}

// ---------------------------------------------------------------------------
// USB helpers
// ---------------------------------------------------------------------------
interface DeviceEndpoints {
  interfaceNumber: number;
  endpointIn: number;
  endpointOut: number;
}

function discoverEndpoints(device: USBDevice): DeviceEndpoints {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        if (alt.interfaceClass === 0xff) {
          let endpointIn = 1, endpointOut = 1;
          for (const ep of alt.endpoints) {
            if (ep.direction === 'in') endpointIn = ep.endpointNumber;
            else endpointOut = ep.endpointNumber;
          }
          return { interfaceNumber: iface.interfaceNumber, endpointIn, endpointOut };
        }
      }
    }
  }
  return { interfaceNumber: 0, endpointIn: 1, endpointOut: 1 };
}

// ---------------------------------------------------------------------------
// Log entry type
// ---------------------------------------------------------------------------
interface LogEntry {
  id: number;
  time: string;
  type: 'info' | 'success' | 'error' | 'tx' | 'rx';
  message: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Pro2DebugPage() {
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [endpoints, setEndpoints] = useState<DeviceEndpoints | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'ping' | 'fs' | 'firmware' | 'reboot'>('ping');

  // Ping
  const [pingMessage, setPingMessage] = useState('Hello from Playground!');
  const [pingSending, setPingSending] = useState(false);

  // File System
  const [fsPath, setFsPath] = useState('/');
  const [fsResult, setFsResult] = useState<string>('');
  const [fsBusy, setFsBusy] = useState(false);

  // File Read
  const [fileReadPath, setFileReadPath] = useState('');
  const [fileReadData, setFileReadData] = useState<Uint8Array | null>(null);
  const [fileReadBusy, setFileReadBusy] = useState(false);

  // File Write (upload)
  const [fileWriteTargetPath, setFileWriteTargetPath] = useState('vol1:test.bin');
  const [fileWriteChunkSize, setFileWriteChunkSize] = useState(512);
  const [fileWriteProgress, setFileWriteProgress] = useState<{ done: number; total: number } | null>(null);
  const [fileWriteBusy, setFileWriteBusy] = useState(false);
  const [fileWriteSelectedName, setFileWriteSelectedName] = useState<string>('');
  const fileWriteAbortRef = useRef(false);
  const fileWriteInputRef = useRef<HTMLInputElement>(null);

  // Firmware Update
  const [fwPath, setFwPath] = useState('vol1:firmware.bin');
  const [fwTargetId, setFwTargetId] = useState<number>(FirmwareTargetType.TARGET_MAIN_APP);
  const [fwRebootOnSuccess, setFwRebootOnSuccess] = useState(true);
  const [fwBusy, setFwBusy] = useState(false);

  // Dir / File manage
  const [dirMakePath, setDirMakePath] = useState('');
  const [fileDeletePath, setFileDeletePath] = useState('');

  const logIdRef = useRef(0);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const log = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs(prev => [...prev.slice(-199), { id: logIdRef.current++, time, type, message }]);
  }, []);

  useEffect(() => {
    // Scroll only the console container, not the whole page
    const el = logsContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  // ------------------------------------------------------------------
  // Connect / Disconnect
  // ------------------------------------------------------------------
  const connect = async () => {
    if (!navigator.usb) {
      log('WebUSB not supported in this browser', 'error');
      return;
    }
    setConnecting(true);
    try {
      const dev = await navigator.usb.requestDevice({
        filters: [{ vendorId: VENDOR_ID, productId: PID_PRO2 }],
      });
      await dev.open();
      if (dev.configuration == null) {
        await dev.selectConfiguration(1);
      }
      const eps = discoverEndpoints(dev);
      await dev.claimInterface(eps.interfaceNumber);
      setDevice(dev);
      setEndpoints(eps);
      setConnected(true);
      log(`Connected: ${dev.productName} (${dev.vendorId.toString(16)}:${dev.productId.toString(16)})`, 'success');
      log(`Endpoints: in=${eps.endpointIn} out=${eps.endpointOut} iface=${eps.interfaceNumber}`, 'info');
    } catch (e: unknown) {
      log(`Connect failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!device || !endpoints) return;
    try {
      await device.releaseInterface(endpoints.interfaceNumber);
      await device.close();
    } catch {
      // ignore
    }
    setDevice(null);
    setEndpoints(null);
    setConnected(false);
    log('Disconnected', 'info');
  };

  // ------------------------------------------------------------------
  // Core send/receive
  // ------------------------------------------------------------------
  const sendPbMessage = useCallback(async (msgType: number, pbPayload: Uint8Array, timeoutMs = 5000): Promise<{ msgType: number; pbPayload: Uint8Array }> => {
    if (!device || !endpoints) throw new Error('Not connected');

    const frame = buildPbFrame(msgType, pbPayload);
    log(`TX [${PB_MSG_NAME[msgType] ?? msgType}] ${frame.length}B payload=${Array.from(pbPayload.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`, 'tx');

    await device.transferOut(endpoints.endpointOut, frame);

    // Wait for response with timeout
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await device.transferIn(endpoints.endpointIn, 4096);
      if (result.status === 'ok' && result.data && result.data.byteLength > 0) {
        const data = new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
        const parsed = parseProtoV0Response(data);
        if (!parsed) throw new Error('Invalid proto frame');
        log(`RX [${PB_MSG_NAME[parsed.msgType] ?? parsed.msgType}] ${data.length}B`, 'rx');
        return parsed;
      }
    }
    throw new Error('Timeout waiting for response');
  }, [device, endpoints, log]);

  // ------------------------------------------------------------------
  // Ping
  // ------------------------------------------------------------------
  const sendPing = async () => {
    if (!connected) return;
    setPingSending(true);
    try {
      const payload = encodePing(pingMessage);
      const resp = await sendPbMessage(PB_MSG_TYPE.Ping, payload);
      if (resp.msgType === PB_MSG_TYPE.Success) {
        const decoded = decodeSuccess(resp.pbPayload);
        log(`Ping OK: "${decoded.message}"`, 'success');
      } else if (resp.msgType === PB_MSG_TYPE.Failure) {
        const decoded = decodeFailure(resp.pbPayload);
        log(`Ping Failure [${decoded.code}]: ${decoded.message}`, 'error');
      } else {
        log(`Ping unexpected response: msgType=${resp.msgType}`, 'error');
      }
    } catch (e: unknown) {
      log(`Ping error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setPingSending(false);
    }
  };

  // ------------------------------------------------------------------
  // Directory List
  // ------------------------------------------------------------------
  const sendDirList = async () => {
    if (!connected) return;
    setFsBusy(true);
    setFsResult('');
    try {
      const payload = encodeDirList(fsPath);
      const resp = await sendPbMessage(PB_MSG_TYPE.DirList, payload);
      if (resp.msgType === PB_MSG_TYPE.Dir) {
        const decoded = decodeDir(resp.pbPayload);
        const lines = [`Path: ${decoded.path || fsPath}`];
        if (decoded.childDirs) lines.push(`Dirs: ${decoded.childDirs}`);
        if (decoded.childFiles) lines.push(`Files: ${decoded.childFiles}`);
        setFsResult(lines.join('\n'));
        log(`DirList OK: ${decoded.childDirs.split(',').filter(Boolean).length} dirs, ${decoded.childFiles.split(',').filter(Boolean).length} files`, 'success');
      } else if (resp.msgType === PB_MSG_TYPE.Failure) {
        const decoded = decodeFailure(resp.pbPayload);
        log(`DirList Failure [${decoded.code}]: ${decoded.message}`, 'error');
        setFsResult(`Error [${decoded.code}]: ${decoded.message}`);
      }
    } catch (e: unknown) {
      log(`DirList error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setFsBusy(false);
    }
  };

  // ------------------------------------------------------------------
  // Path Info
  // ------------------------------------------------------------------
  const sendPathInfo = async () => {
    if (!connected) return;
    setFsBusy(true);
    setFsResult('');
    try {
      const payload = encodePathInfoQuery(fsPath);
      const resp = await sendPbMessage(PB_MSG_TYPE.PathInfoQuery, payload);
      if (resp.msgType === PB_MSG_TYPE.PathInfo) {
        const d = decodePathInfo(resp.pbPayload);
        const lines = [
          `Exists: ${d.exist}`,
          `Size: ${d.size} bytes`,
          `Type: ${d.directory ? 'Directory' : 'File'}`,
          `Date: ${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')} ${String(d.hour).padStart(2,'0')}:${String(d.minute).padStart(2,'0')}:${String(d.second).padStart(2,'0')}`,
          `Flags: readonly=${d.readonly} hidden=${d.hidden} system=${d.system} archive=${d.archive}`,
        ];
        setFsResult(lines.join('\n'));
        log(`PathInfo OK: ${d.exist ? (d.directory ? 'dir' : `file ${d.size}B`) : 'not found'}`, d.exist ? 'success' : 'error');
      } else if (resp.msgType === PB_MSG_TYPE.Failure) {
        const decoded = decodeFailure(resp.pbPayload);
        log(`PathInfo Failure [${decoded.code}]: ${decoded.message}`, 'error');
        setFsResult(`Error [${decoded.code}]: ${decoded.message}`);
      }
    } catch (e: unknown) {
      log(`PathInfo error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setFsBusy(false);
    }
  };

  // ------------------------------------------------------------------
  // Fix Permission
  // ------------------------------------------------------------------
  const sendFixPermission = async () => {
    if (!connected) return;
    setFsBusy(true);
    try {
      const payload = encodeFixPermission();
      const resp = await sendPbMessage(PB_MSG_TYPE.FixPermission, payload);
      if (resp.msgType === PB_MSG_TYPE.Success) {
        log('FixPermission OK', 'success');
      } else if (resp.msgType === PB_MSG_TYPE.Failure) {
        const decoded = decodeFailure(resp.pbPayload);
        log(`FixPermission Failure [${decoded.code}]: ${decoded.message}`, 'error');
      }
    } catch (e: unknown) {
      log(`FixPermission error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setFsBusy(false);
    }
  };

  // ------------------------------------------------------------------
  // File Read (simple single-chunk)
  // ------------------------------------------------------------------
  const sendFileRead = async () => {
    if (!connected || !fileReadPath) return;
    setFileReadBusy(true);
    setFileReadData(null);
    try {
      // First get file size via PathInfoQuery
      const infoResp = await sendPbMessage(PB_MSG_TYPE.PathInfoQuery, encodePathInfoQuery(fileReadPath));
      if (infoResp.msgType !== PB_MSG_TYPE.PathInfo) {
        throw new Error('PathInfo failed');
      }
      const info = decodePathInfo(infoResp.pbPayload);
      if (!info.exist) throw new Error('File not found');
      const totalSize = info.size;
      log(`Reading file: ${fileReadPath} (${totalSize} bytes)`, 'info');

      // Read in chunks
      const CHUNK = 1400;
      const allData: number[] = [];
      let offset = 0;
      while (offset < totalSize) {
        const readLen = Math.min(CHUNK, totalSize - offset);
        const payload = encodeFileRead(fileReadPath, offset, totalSize, readLen);
        const resp = await sendPbMessage(PB_MSG_TYPE.FileRead, payload, 10000);
        if (resp.msgType === PB_MSG_TYPE.File) {
          const f = decodeFile(resp.pbPayload);
          if (f.data) {
            allData.push(...f.data);
            offset += f.data.length;
            log(`Read ${offset}/${totalSize} bytes`, 'info');
          } else {
            throw new Error('No data in File response');
          }
        } else if (resp.msgType === PB_MSG_TYPE.Failure) {
          const d = decodeFailure(resp.pbPayload);
          throw new Error(`FileRead Failure [${d.code}]: ${d.message}`);
        } else {
          throw new Error(`Unexpected response: ${resp.msgType}`);
        }
      }
      const result = new Uint8Array(allData);
      setFileReadData(result);
      log(`FileRead complete: ${result.length} bytes`, 'success');
    } catch (e: unknown) {
      log(`FileRead error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setFileReadBusy(false);
    }
  };

  const downloadFileReadData = () => {
    if (!fileReadData) return;
    const blob = new Blob([fileReadData]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileReadPath.split('/').pop() || 'file.bin';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ------------------------------------------------------------------
  // File Write (upload)
  // ------------------------------------------------------------------
  const startFileWrite = async (file: File) => {
    if (!connected) return;
    const targetPath = fileWriteTargetPath.trim();
    if (!targetPath) { log('Enter target path', 'error'); return; }
    const chunkSize = Math.max(64, Math.min(2048, fileWriteChunkSize));

    let fileData: Uint8Array;
    try {
      fileData = new Uint8Array(await file.arrayBuffer());
    } catch (e: unknown) {
      log(`Failed to read file: ${e instanceof Error ? e.message : String(e)}`, 'error');
      return;
    }

    const totalLen = fileData.length;
    fileWriteAbortRef.current = false;
    setFileWriteBusy(true);
    setFileWriteProgress({ done: 0, total: totalLen });
    log(`Upload start: ${file.name} (${totalLen} B) → ${targetPath}`, 'info');

    const t0 = performance.now();
    let offset = 0;
    let isFirst = true;
    try {
      while (offset < totalLen && !fileWriteAbortRef.current) {
        const chunk = fileData.slice(offset, offset + chunkSize);
        const pbPayload = encodeFileWrite(targetPath, offset, totalLen, chunk, isFirst, false);
        const resp = await sendPbMessage(PB_MSG_TYPE.FileWrite, pbPayload, 10000);
        isFirst = false;

        if (resp.msgType === PB_MSG_TYPE.Failure) {
          const d = decodeFailure(resp.pbPayload);
          throw new Error(`FileWrite Failure [${d.code}]: ${d.message}`);
        }
        if (resp.msgType !== PB_MSG_TYPE.File) {
          throw new Error(`Unexpected response: ${resp.msgType}`);
        }
        const f = decodeFile(resp.pbPayload);
        offset = f.processedByte !== null ? f.processedByte : (offset + chunk.length);
        setFileWriteProgress({ done: offset, total: totalLen });
      }

      if (fileWriteAbortRef.current) {
        log('Upload aborted', 'info');
      } else {
        const elapsed = (performance.now() - t0) / 1000;
        const speed = totalLen / elapsed;
        log(`Upload complete: ${totalLen} B in ${elapsed.toFixed(2)}s (${Math.round(speed / 1024)} KB/s)`, 'success');
      }
    } catch (e: unknown) {
      log(`FileWrite error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setFileWriteBusy(false);
      setFileWriteProgress(null);
      setFileWriteSelectedName('');
      if (fileWriteInputRef.current) fileWriteInputRef.current.value = '';
    }
  };

  const stopFileWrite = () => {
    fileWriteAbortRef.current = true;
  };

  // ------------------------------------------------------------------
  // Dir / File manage
  // ------------------------------------------------------------------
  const sendDirMake = async () => {
    if (!connected || !dirMakePath) return;
    setFsBusy(true);
    try {
      const resp = await sendPbMessage(PB_MSG_TYPE.DirMake, encodeDirMake(dirMakePath));
      if (resp.msgType === PB_MSG_TYPE.Success) {
        log(`DirMake OK: ${dirMakePath}`, 'success');
      } else if (resp.msgType === PB_MSG_TYPE.Failure) {
        const d = decodeFailure(resp.pbPayload);
        log(`DirMake Failure [${d.code}]: ${d.message}`, 'error');
      }
    } catch (e: unknown) {
      log(`DirMake error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setFsBusy(false);
    }
  };

  const sendDirRemove = async (path?: string) => {
    const targetPath = path ?? dirMakePath;
    if (!connected || !targetPath) return;
    setFsBusy(true);
    try {
      const resp = await sendPbMessage(PB_MSG_TYPE.DirRemove, encodeDirRemove(targetPath));
      if (resp.msgType === PB_MSG_TYPE.Success) {
        log(`DirRemove OK: ${targetPath}`, 'success');
      } else if (resp.msgType === PB_MSG_TYPE.Failure) {
        const d = decodeFailure(resp.pbPayload);
        log(`DirRemove Failure [${d.code}]: ${d.message}`, 'error');
      }
    } catch (e: unknown) {
      log(`DirRemove error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setFsBusy(false);
    }
  };

  const sendFileDelete = async () => {
    if (!connected || !fileDeletePath) return;
    setFsBusy(true);
    try {
      const resp = await sendPbMessage(PB_MSG_TYPE.FileDelete, encodeFileDelete(fileDeletePath));
      if (resp.msgType === PB_MSG_TYPE.Success) {
        log(`FileDelete OK: ${fileDeletePath}`, 'success');
      } else if (resp.msgType === PB_MSG_TYPE.Failure) {
        const d = decodeFailure(resp.pbPayload);
        log(`FileDelete Failure [${d.code}]: ${d.message}`, 'error');
      }
    } catch (e: unknown) {
      log(`FileDelete error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setFsBusy(false);
    }
  };

  // ------------------------------------------------------------------
  // Firmware Update
  // ------------------------------------------------------------------
  const sendFirmwareUpdate = async () => {
    if (!connected || !fwPath) return;
    setFwBusy(true);
    try {
      const targets = [{ targetId: fwTargetId, path: fwPath }];
      const payload = encodeFirmwareUpdate(targets, fwRebootOnSuccess);
      log(`FirmwareUpdate: target=${FW_TARGET_LABELS[fwTargetId]} path=${fwPath} reboot=${fwRebootOnSuccess}`, 'info');
      const resp = await sendPbMessage(PB_MSG_TYPE.FirmwareUpdate, payload, 60000);
      if (resp.msgType === PB_MSG_TYPE.Success) {
        const decoded = decodeSuccess(resp.pbPayload);
        log(`FirmwareUpdate OK: "${decoded.message || 'Firmware updated'}"`, 'success');
      } else if (resp.msgType === PB_MSG_TYPE.Failure) {
        const decoded = decodeFailure(resp.pbPayload);
        log(`FirmwareUpdate Failure [${decoded.code}]: ${decoded.message}`, 'error');
      } else {
        log(`FirmwareUpdate unexpected response: msgType=${resp.msgType}`, 'error');
      }
    } catch (e: unknown) {
      log(`FirmwareUpdate error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setFwBusy(false);
    }
  };

  // ------------------------------------------------------------------
  // Reboot
  // ------------------------------------------------------------------
  const sendReboot = async (rebootType: number) => {
    if (!connected) return;
    try {
      const payload = encodeReboot(rebootType);
      log(`Rebooting: ${REBOOT_TYPE[rebootType as keyof typeof REBOOT_TYPE] ?? rebootType}`, 'info');
      await sendPbMessage(PB_MSG_TYPE.Reboot, payload);
      log('Reboot command sent', 'success');
      await disconnect();
    } catch (e: unknown) {
      log(`Reboot error: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const logTypeClass = {
    info: 'text-muted-foreground',
    success: 'text-green-500',
    error: 'text-red-500',
    tx: 'text-blue-400',
    rx: 'text-purple-400',
  } as const;

  return (
    <PageLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pro2 Debug</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Direct WebUSB communication with OneKey Pro2 (Proto V0 / 0x5A framing)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-sm ${connected ? 'text-green-500' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
              {connected ? `${device?.productName ?? 'Pro2'} connected` : 'Disconnected'}
            </div>
            {connected ? (
              <Button variant="outline" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={connect} disabled={connecting}>
                <Usb className="w-4 h-4 mr-2" />
                {connecting ? 'Connecting...' : 'Connect Pro2'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Operations */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(['ping', 'fs', 'firmware', 'reboot'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'ping' ? 'Ping' : tab === 'fs' ? 'File System' : tab === 'firmware' ? 'Firmware' : 'Reboot'}
                </button>
              ))}
            </div>

            {/* Ping Tab */}
            {activeTab === 'ping' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Ping (msgType=60206)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label htmlFor="pro2-ping-message" className="text-xs text-muted-foreground mb-1 block">Message</label>
                    <input
                      id="pro2-ping-message"
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                      value={pingMessage}
                      onChange={e => setPingMessage(e.target.value)}
                      placeholder="Ping message..."
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={sendPing}
                    disabled={!connected || pingSending}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {pingSending ? 'Sending...' : 'Send Ping'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* File System Tab */}
            {activeTab === 'fs' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      Directory & Path Operations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label htmlFor="pro2-fs-path" className="text-xs text-muted-foreground mb-1 block">Path</label>
                      <input
                        id="pro2-fs-path"
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-mono"
                        value={fsPath}
                        onChange={e => setFsPath(e.target.value)}
                        placeholder="/"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <Button size="sm" variant="outline" onClick={sendDirList} disabled={!connected || fsBusy} className="w-full">
                          <ChevronRight className="w-3 h-3 mr-1" />
                          DirList
                        </Button>
                        <p className="text-xs text-muted-foreground px-1">列出目录下的文件和子目录</p>
                      </div>
                      <div className="space-y-0.5">
                        <Button size="sm" variant="outline" onClick={sendPathInfo} disabled={!connected || fsBusy} className="w-full">
                          <Terminal className="w-3 h-3 mr-1" />
                          PathInfo
                        </Button>
                        <p className="text-xs text-muted-foreground px-1">查询路径的大小、日期、类型</p>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <Button size="sm" variant="outline" onClick={sendFixPermission} disabled={!connected || fsBusy} className="w-full">
                        FixPermission
                      </Button>
                      <p className="text-xs text-muted-foreground px-1">修复 eMMC 文件系统权限问题</p>
                    </div>
                    {/* DirMake */}
                    <div className="pt-1 border-t border-border">
                      <label htmlFor="pro2-dir-path" className="text-xs text-muted-foreground mb-1 block">DirMake / DirRemove path</label>
                      <div className="flex gap-2">
                        <input
                          id="pro2-dir-path"
                          className="flex-1 px-2 py-1.5 text-xs bg-background border border-border rounded-md font-mono"
                          value={dirMakePath}
                          onChange={e => setDirMakePath(e.target.value)}
                          placeholder="/path/to/dir"
                        />
                        <Button size="sm" variant="outline" onClick={sendDirMake} disabled={!connected || fsBusy || !dirMakePath}>
                          <FolderPlus className="w-3 h-3 mr-1" />
                          Make
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => sendDirRemove(dirMakePath)} disabled={!connected || fsBusy || !dirMakePath}>
                          <FolderMinus className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    {/* FileDelete */}
                    <div>
                      <label htmlFor="pro2-file-delete-path" className="text-xs text-muted-foreground mb-1 block">FileDelete path</label>
                      <div className="flex gap-2">
                        <input
                          id="pro2-file-delete-path"
                          className="flex-1 px-2 py-1.5 text-xs bg-background border border-border rounded-md font-mono"
                          value={fileDeletePath}
                          onChange={e => setFileDeletePath(e.target.value)}
                          placeholder="/path/to/file"
                        />
                        <Button size="sm" variant="outline" onClick={sendFileDelete} disabled={!connected || fsBusy || !fileDeletePath}>
                          <FileMinus className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    {fsResult && (
                      <pre className="text-xs bg-muted p-3 rounded-md font-mono overflow-x-auto whitespace-pre-wrap">
                        {fsResult}
                      </pre>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      File Read
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label htmlFor="pro2-file-read-path" className="text-xs text-muted-foreground mb-1 block">File Path</label>
                      <input
                        id="pro2-file-read-path"
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-mono"
                        value={fileReadPath}
                        onChange={e => setFileReadPath(e.target.value)}
                        placeholder="/path/to/file"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={sendFileRead} disabled={!connected || fileReadBusy || !fileReadPath} className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        {fileReadBusy ? 'Reading...' : 'Read File'}
                      </Button>
                      {fileReadData && (
                        <Button size="sm" variant="outline" onClick={downloadFileReadData}>
                          Save
                        </Button>
                      )}
                    </div>
                    {fileReadData && (
                      <div className="text-xs text-muted-foreground">
                        {fileReadData.length} bytes read •{' '}
                        <span className="font-mono">
                          {Array.from(fileReadData.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}
                          {fileReadData.length > 8 ? '...' : ''}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* File Write (Upload) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      File Write (Upload)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label htmlFor="fileWriteNativeInput" className="text-xs text-muted-foreground mb-1 block">Select file</label>
                      <input
                        ref={fileWriteInputRef}
                        type="file"
                        className="hidden"
                        disabled={fileWriteBusy}
                        id="fileWriteNativeInput"
                        onChange={e => setFileWriteSelectedName(e.target.files?.[0]?.name ?? '')}
                      />
                      <label
                        htmlFor="fileWriteNativeInput"
                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm border border-border rounded-md cursor-pointer hover:bg-muted transition-colors ${fileWriteBusy ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Upload className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-muted-foreground">
                          {fileWriteSelectedName || 'Choose file…'}
                        </span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="pro2-file-write-target" className="text-xs text-muted-foreground mb-1 block">Target path</label>
                        <input
                          id="pro2-file-write-target"
                          className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-md font-mono"
                          value={fileWriteTargetPath}
                          onChange={e => setFileWriteTargetPath(e.target.value)}
                          placeholder="vol1:filename.bin"
                          disabled={fileWriteBusy}
                        />
                      </div>
                      <div>
                        <label htmlFor="pro2-file-write-chunk-size" className="text-xs text-muted-foreground mb-1 block">Chunk size (64–2048)</label>
                        <input
                          id="pro2-file-write-chunk-size"
                          type="number"
                          className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-md"
                          value={fileWriteChunkSize}
                          onChange={e => setFileWriteChunkSize(Number(e.target.value))}
                          min={64}
                          max={2048}
                          disabled={fileWriteBusy}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const file = fileWriteInputRef.current?.files?.[0];
                          if (file) startFileWrite(file);
                          else log('Select a file first', 'error');
                        }}
                        disabled={!connected || fileWriteBusy}
                        className="flex-1"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {fileWriteBusy ? 'Uploading...' : 'Upload File'}
                      </Button>
                      {fileWriteBusy && (
                        <Button size="sm" variant="outline" onClick={stopFileWrite}>
                          Stop
                        </Button>
                      )}
                    </div>
                    {fileWriteProgress && (
                      <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.round((fileWriteProgress.done / fileWriteProgress.total) * 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fileWriteProgress.done} / {fileWriteProgress.total} bytes ({Math.round((fileWriteProgress.done / fileWriteProgress.total) * 100)}%)
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Firmware Tab */}
            {activeTab === 'firmware' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Firmware Update (msgType=61000)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      告诉设备从已上传到 eMMC 的固件文件安装固件。需先通过 File System → File Write 将固件上传到设备。
                    </p>
                    <div>
                      <label htmlFor="pro2-fw-path" className="text-xs text-muted-foreground mb-1 block">Firmware file path (on device)</label>
                      <input
                        id="pro2-fw-path"
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md font-mono"
                        value={fwPath}
                        onChange={e => setFwPath(e.target.value)}
                        placeholder="vol1:firmware.bin"
                        disabled={fwBusy}
                      />
                    </div>
                    <div>
                      <label htmlFor="pro2-fw-target" className="text-xs text-muted-foreground mb-1 block">Target</label>
                      <select
                        id="pro2-fw-target"
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                        value={fwTargetId}
                        onChange={e => setFwTargetId(Number(e.target.value))}
                        disabled={fwBusy}
                      >
                        {Object.entries(FW_TARGET_LABELS).map(([id, label]) => (
                          <option key={id} value={id}>{label} ({id})</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fwRebootOnSuccess}
                        onChange={e => setFwRebootOnSuccess(e.target.checked)}
                        disabled={fwBusy}
                        className="w-4 h-4"
                      />
                      Reboot on success
                    </label>
                    <Button
                      size="sm"
                      onClick={sendFirmwareUpdate}
                      disabled={!connected || fwBusy || !fwPath}
                      className="w-full"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {fwBusy ? 'Installing...' : 'Update Firmware'}
                    </Button>
                    <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-md p-3">
                      <div className="font-medium">升级流程：</div>
                      <div>1. File System → File Write → 将 .bin 上传到设备（如 vol1:firmware.bin）</div>
                      <div>2. 此处填写设备上的路径，点击 Update Firmware</div>
                      <div>3. 设备校验并安装固件，安装完成后可自动重启</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Reboot Tab */}
            {activeTab === 'reboot' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Reboot (msgType=60400)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Reboot the device. Connection will be lost after sending.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => sendReboot(0)} disabled={!connected}>
                      Normal
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendReboot(1)} disabled={!connected}>
                      Boardloader
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendReboot(2)} disabled={!connected}>
                      Bootloader
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Log console — sticky so it stays visible while scrolling the left panel */}
          <div className="sticky top-6 self-start">
            <Card className="flex flex-col">
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Console
                </CardTitle>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  ref={logsContainerRef}
                  className="h-[calc(100vh-180px)] min-h-[500px] overflow-y-auto bg-black/90 rounded-b-lg p-3 font-mono text-xs"
                >
                  {logs.length === 0 && (
                    <div className="text-gray-500 italic">Connect a Pro2 device to start debugging...</div>
                  )}
                  {logs.map(entry => (
                    <div key={entry.id} className={`flex gap-2 mb-1 ${logTypeClass[entry.type]}`}>
                      <span className="text-gray-600 shrink-0">{entry.time}</span>
                      <span className="break-all">{entry.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info card */}
        <Card className="bg-muted/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="font-medium mb-2">Proto V0 Frame Format</div>
              <div className="font-mono">
                [0x5A][lenL][lenH][headerCRC][router][attr][seq][msgTypeL][msgTypeH][...pb][frameCRC]
              </div>
              <div className="mt-2">
                Pro2 PID: <span className="font-mono">0x53C1</span> &nbsp;•&nbsp;
                VendorID: <span className="font-mono">0x1209</span> &nbsp;•&nbsp;
                Max frame: <span className="font-mono">2048 bytes</span> &nbsp;•&nbsp;
                CRC8 init: <span className="font-mono">0x30</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
