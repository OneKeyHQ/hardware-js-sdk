import {
  DataItem,
  RegistryItem,
  RegistryType,
  RegistryTypes,
  extend,
} from '@keystonehq/bc-ur-registry';

import type { DataItemMap } from '@keystonehq/bc-ur-registry';

const { decodeToDataItem } = extend;

/** See `TronSignRequest.ts`'s doc comment — same proven, CBOR-native pair (registry type 5202). */
const TRON_SIGNATURE_TYPE = new RegistryType('tron-signature', 5202);

enum SignatureKeys {
  requestId = 1,
  signature,
}

export class TronSignature extends RegistryItem {
  private readonly requestId?: Buffer;

  private readonly signatureBytes: Buffer;

  getRegistryType = (): RegistryType => TRON_SIGNATURE_TYPE;

  constructor(signature: Buffer, requestId?: Buffer) {
    super();
    this.signatureBytes = signature;
    this.requestId = requestId;
  }

  getRequestId = (): Buffer | undefined => this.requestId;

  getSignature = (): Buffer => this.signatureBytes;

  toDataItem = (): DataItem => {
    const map: DataItemMap = {};
    if (this.requestId) {
      map[SignatureKeys.requestId] = new DataItem(this.requestId, RegistryTypes.UUID.getTag());
    }
    map[SignatureKeys.signature] = this.signatureBytes;
    return new DataItem(map);
  };

  static fromDataItem(dataItem: DataItem): TronSignature {
    const map = dataItem.getData() as Record<number, unknown>;
    const signature = map[SignatureKeys.signature] as Buffer;
    const requestIdItem = map[SignatureKeys.requestId] as DataItem | undefined;
    const requestId = requestIdItem?.getData() as Buffer | undefined;
    return new TronSignature(signature, requestId);
  }

  static fromCBOR(cborPayload: Buffer): TronSignature {
    return TronSignature.fromDataItem(decodeToDataItem(cborPayload));
  }
}
