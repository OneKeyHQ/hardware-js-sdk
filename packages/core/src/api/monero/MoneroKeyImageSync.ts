import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';

import { BaseMethod } from '../BaseMethod';
import { hexToBytes, stripHexPrefix } from '../helpers/hexUtils';
import { validateStrictPath } from '../helpers/pathUtils';
import { invalidParameter, validateParams, validateResult } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';
import { getMoneroVersionRange, validateMoneroNetworkType } from './helpers';

import type { MoneroTransferDetails } from '@onekeyfe/hd-transport';
import type {
  MoneroEncryptedKeyImage,
  MoneroKeyImageSyncParams,
  MoneroKeyImageTransfer,
} from '../../types/api/moneroKeyImageSync';

// wallet2 (device_trezor::ki_sync) sends 10 transfers per step.
const STEP_SIZE = 10;
const UINT32_MAX = 0xffffffff;

type TransferDetails = Required<MoneroTransferDetails>;

type KeyImageSyncParams = {
  address_n: number[];
  network_type: number;
  tdis: TransferDetails[];
};

const parseKey = (value: unknown, name: string) => {
  const hex = typeof value === 'string' ? stripHexPrefix(value) : '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw invalidParameter(`${name} must be a 32-byte hex string`);
  }
  return hex.toLowerCase();
};

const parseUint = (value: unknown, name: string, max = Number.MAX_SAFE_INTEGER) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) {
    throw invalidParameter(`${name} must be an unsigned integer`);
  }
  return value;
};

const parseTransfer = (transfer: MoneroKeyImageTransfer, index: number): TransferDetails => {
  const name = `transfers[${index}]`;
  if (!transfer || typeof transfer !== 'object') {
    throw invalidParameter(`${name} must be an object`);
  }
  const additional = transfer.additionalTxPubKeys ?? [];
  if (!Array.isArray(additional)) {
    throw invalidParameter(`${name}.additionalTxPubKeys must be an array`);
  }

  return {
    out_key: parseKey(transfer.outKey, `${name}.outKey`),
    tx_pub_key: parseKey(transfer.txPubKey, `${name}.txPubKey`),
    additional_tx_pub_keys: additional.map((key, i) =>
      parseKey(key, `${name}.additionalTxPubKeys[${i}]`)
    ),
    internal_output_index: parseUint(transfer.internalOutputIndex, `${name}.internalOutputIndex`),
    sub_addr_major: parseUint(transfer.subAddrMajor ?? 0, `${name}.subAddrMajor`, UINT32_MAX),
    sub_addr_minor: parseUint(transfer.subAddrMinor ?? 0, `${name}.subAddrMinor`, UINT32_MAX),
  };
};

// Monero varint, as the firmware's dump_uvarint_b writes it. Arithmetic keeps
// indices above 2^31 exact.
const encodeUvarint = (value: number) => {
  const bytes: number[] = [];
  let n = value;
  while (n >= 0x80) {
    bytes.push((n % 0x80) + 0x80);
    n = Math.floor(n / 0x80);
  }
  bytes.push(n);
  return Uint8Array.from(bytes);
};

// keccak(H_0 || ... || H_n-1), H_i = keccak(out_key || tx_pub_key || additional || varint(index)).
// The device rehashes the steps and rejects Final on a mismatch.
const computeTransfersHash = (tdis: TransferDetails[]) => {
  const total = keccak_256.create();
  tdis.forEach(td => {
    const hash = keccak_256.create();
    hash.update(hexToBytes(td.out_key));
    hash.update(hexToBytes(td.tx_pub_key));
    td.additional_tx_pub_keys.forEach(key => hash.update(hexToBytes(key)));
    hash.update(encodeUvarint(td.internal_output_index));
    total.update(hash.digest());
  });
  return bytesToHex(total.digest());
};

export default class MoneroKeyImageSync extends BaseMethod<KeyImageSyncParams> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;

    const payload = this.payload as MoneroKeyImageSyncParams;
    validateParams(payload, [
      { name: 'path', required: true },
      { name: 'networkType', type: 'number' },
      { name: 'transfers', type: 'array', required: true },
    ]);
    if (!Array.isArray(payload.transfers) || payload.transfers.length === 0) {
      throw invalidParameter('transfers must be a non-empty array');
    }

    this.params = {
      address_n: validateStrictPath(payload.path, 3),
      network_type: validateMoneroNetworkType(payload.networkType),
      tdis: payload.transfers.map(parseTransfer),
    };
  }

  getVersionRange() {
    return getMoneroVersionRange();
  }

  async run() {
    const { address_n, network_type, tdis } = this.params;

    await this.device.commands.typedCall(
      'MoneroKeyImageExportInitRequest',
      'MoneroKeyImageExportInitAck',
      {
        num: tdis.length,
        hash: computeTransfersHash(tdis),
        address_n,
        network_type,
        subs: [],
      }
    );

    // Missing fields stay undefined so validateResult rejects them.
    const keyImages: Partial<MoneroEncryptedKeyImage>[] = [];
    for (let start = 0; start < tdis.length; start += STEP_SIZE) {
      const res = await this.device.commands.typedCall(
        'MoneroKeyImageSyncStepRequest',
        'MoneroKeyImageSyncStepAck',
        { tdis: tdis.slice(start, start + STEP_SIZE) }
      );
      res.message.kis.forEach(ki => keyImages.push({ iv: ki.iv, blob: ki.blob }));
    }

    const res = await this.device.commands.typedCall(
      'MoneroKeyImageSyncFinalRequest',
      'MoneroKeyImageSyncFinalAck',
      {}
    );
    const encKey = res.message.enc_key;

    validateResult(keyImages, ['iv', 'blob'], { expectedLength: tdis.length });
    validateResult({ encKey }, ['encKey']);

    return Promise.resolve({ encKey, keyImages });
  }
}
