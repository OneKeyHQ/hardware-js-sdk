import { DataItemMap } from '../../types';
import { RegistryItem } from '../common/RegistryItem';
import { RegistryTypes } from '../common/RegistryType';
import { DataItem, decodeToDataItem } from '../../thirdparty/cbor-sync';

enum Keys {
  requestId = 1,
  signature,
  origin,
}

export class ETHSignature extends RegistryItem {
  private requestId?: Buffer;

  private origin?: string;

  private signature: Buffer;

  getRegistryType = () => RegistryTypes.ETH_SIGNATURE;

  constructor(signature: Buffer, requestId?: Buffer, origin?: string) {
    super();
    this.signature = signature;
    this.requestId = requestId;
    this.origin = origin;
  }

  public getRequestId = () => this.requestId;

  public getSignature = () => this.signature;

  public getOrigin = () => this.origin;

  public toDataItem = () => {
    const map: DataItemMap = {};
    if (this.requestId) {
      map[Keys.requestId] = new DataItem(this.requestId, RegistryTypes.UUID.getTag());
    }
    if (this.origin) map[Keys.origin] = this.origin;
    map[Keys.signature] = this.signature;
    return new DataItem(map);
  };

  public static fromDataItem = (dataItem: DataItem) => {
    const map = dataItem.getData();
    const signature = map[Keys.signature];
    const requestId = map[Keys.requestId] ? map[Keys.requestId].getData() : undefined;
    return new ETHSignature(signature, requestId, map[Keys.origin]);
  };

  public static fromCBOR = (_cborPayload: Buffer) => {
    const dataItem = decodeToDataItem(_cborPayload);
    return ETHSignature.fromDataItem(dataItem);
  };
}
