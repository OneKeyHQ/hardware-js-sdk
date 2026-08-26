import {
  CryptoKeypath,
  DataItem,
  PathComponent,
  RegistryItem,
  RegistryType,
  RegistryTypes,
  extend,
} from '@keystonehq/bc-ur-registry';

import type { DataItemMap } from '@keystonehq/bc-ur-registry';

const { decodeToDataItem } = extend;

/**
 * `@keystonehq/keystone-sdk`'s own bundled `sdk.tron` module builds TRON
 * requests through a completely different, gzip-compressed protobuf
 * envelope (`KeystoneSignRequest`/`KeystoneSignResult`, registry type
 * `keystone-sign-result`) — no bare signature field, response semantics
 * unverified against real hardware. `packages/qr-wallet-sdk` (OneKey's own
 * production QR-wallet integration, in the separate app-monorepo — proven
 * against real Keystone devices) does NOT use that module at all: it rolls
 * its own minimal CBOR-native UR pair, `tron-sign-request`/`tron-signature`,
 * built directly on the same `@keystonehq/bc-ur-registry` primitives the
 * eth/sol sign-request classes use — same shape as everywhere else, with a
 * genuine bare `signature` field (see `TronSignature.ts`). This class is a
 * direct port of that proven implementation (registry type 5201 matches
 * exactly), not the public SDK's own (unverified) tron module.
 */
const TRON_SIGN_REQUEST_TYPE = new RegistryType('tron-sign-request', 5201);

enum RequestKeys {
  requestId = 1,
  signData,
  derivationPath,
  address,
  origin,
  signType,
}

export enum TronSignType {
  Transaction = 0,
  SignMessage = 1,
  SignMessageV2 = 2,
}

interface TronSignRequestProps {
  requestId?: Buffer;
  signData: Buffer;
  signType: TronSignType;
  derivationPath: CryptoKeypath;
  address?: Buffer;
  origin?: string;
}

export class TronSignRequest extends RegistryItem {
  private readonly requestId?: Buffer;

  private readonly signData: Buffer;

  private readonly signType: TronSignType;

  private readonly derivationPath: CryptoKeypath;

  private readonly address?: Buffer;

  private readonly origin?: string;

  getRegistryType = (): RegistryType => TRON_SIGN_REQUEST_TYPE;

  constructor(args: TronSignRequestProps) {
    super();
    this.requestId = args.requestId;
    this.signData = args.signData;
    this.derivationPath = args.derivationPath;
    this.address = args.address;
    this.origin = args.origin;
    this.signType = args.signType;
  }

  getRequestId = (): Buffer | undefined => this.requestId;

  getSignData = (): Buffer => this.signData;

  getSignType = (): TronSignType => this.signType;

  getDerivationPath = (): string => this.derivationPath.getPath();

  toDataItem = (): DataItem => {
    const map: DataItemMap = {};
    if (this.requestId) {
      map[RequestKeys.requestId] = new DataItem(this.requestId, RegistryTypes.UUID.getTag());
    }
    if (this.address) map[RequestKeys.address] = this.address;
    if (this.origin) map[RequestKeys.origin] = this.origin;
    map[RequestKeys.signData] = this.signData;
    map[RequestKeys.signType] = this.signType;
    const keyPath = this.derivationPath.toDataItem();
    keyPath.setTag(this.derivationPath.getRegistryType().getTag());
    map[RequestKeys.derivationPath] = keyPath;
    return new DataItem(map);
  };

  static fromDataItem(dataItem: DataItem): TronSignRequest {
    const map = dataItem.getData() as Record<number, unknown>;
    const signData = map[RequestKeys.signData] as Buffer;
    const derivationPath = CryptoKeypath.fromDataItem(map[RequestKeys.derivationPath] as DataItem);
    const address = map[RequestKeys.address] as Buffer | undefined;
    const requestIdItem = map[RequestKeys.requestId] as DataItem | undefined;
    const requestId = requestIdItem?.getData() as Buffer | undefined;
    const origin = map[RequestKeys.origin] as string | undefined;
    const signType = map[RequestKeys.signType] as TronSignType;
    return new TronSignRequest({ requestId, signData, derivationPath, address, origin, signType });
  }

  static fromCBOR(cborPayload: Buffer): TronSignRequest {
    return TronSignRequest.fromDataItem(decodeToDataItem(cborPayload));
  }

  static parsePath(path: string, xfp: string): CryptoKeypath {
    const segments = path.replace(/^[mM]\//, '').split('/');
    const components = segments.map(segment => {
      const hardened = segment.endsWith("'");
      return new PathComponent({
        index: parseInt(hardened ? segment.slice(0, -1) : segment, 10),
        hardened,
      });
    });
    return new CryptoKeypath(components, Buffer.from(xfp, 'hex'));
  }
}
