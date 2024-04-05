import { DataItemMap } from '../types';
import { decodeToDataItem, DataItem } from '../thirdparty/cbor-sync';
import { RegistryItem } from './common/RegistryItem';
import { RegistryTypes } from './common/RegistryType';
import { CryptoOutput } from './CryptoOutput';

enum Keys {
  masterFingerprint = 1,
  outputDescriptors,
}

export class CryptoAccount extends RegistryItem {
  getRegistryType = () => RegistryTypes.CRYPTO_ACCOUNT;

  constructor(private masterFingerprint: Buffer, private outputDescriptors: CryptoOutput[]) {
    super();
  }

  public getMasterFingerprint = () => this.masterFingerprint;

  public getOutputDescriptors = () => this.outputDescriptors;

  public toDataItem = () => {
    const map: DataItemMap = {};
    if (this.masterFingerprint) {
      map[Keys.masterFingerprint] = this.masterFingerprint.readUInt32BE(0);
    }
    if (this.outputDescriptors) {
      map[Keys.outputDescriptors] = this.outputDescriptors.map(item => item.toDataItem());
    }
    return new DataItem(map);
  };

  public static fromDataItem = (dataItem: DataItem) => {
    const map = dataItem.getData();
    const masterFingerprint = Buffer.alloc(4);
    const _masterFingerprint = map[Keys.masterFingerprint];
    if (_masterFingerprint) {
      masterFingerprint.writeUInt32BE(_masterFingerprint, 0);
    }
    const outputDescriptors = map[Keys.outputDescriptors] as DataItem[];
    const cryptoOutputs = outputDescriptors.map(item => CryptoOutput.fromDataItem(item));
    return new CryptoAccount(masterFingerprint, cryptoOutputs);
  };

  public static fromCBOR = (_cborPayload: Buffer) => {
    const dataItem = decodeToDataItem(_cborPayload);
    return CryptoAccount.fromDataItem(dataItem);
  };
}
