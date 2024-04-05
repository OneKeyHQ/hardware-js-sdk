import { DataItemMap } from '../../types';
import { RegistryItem } from '../common/RegistryItem';
import { RegistryTypes } from '../common/RegistryType';
import { DataItem, decodeToDataItem } from '../../thirdparty/cbor-sync';

enum Keys {
  chainId = 1,
  contractAddress = 2,
  contractName,
  name,
  mediaData,
}

type NFTProps = {
  chainId: number;
  contractAddress: string;
  contractName: string;
  name: string;
  mediaData: string;
};

export class ETHNFTItem extends RegistryItem {
  private chainId: number;

  private name: string;

  private contractAddress: string;

  private contractName: string;

  private mediaData: string;

  getRegistryType = () => RegistryTypes.ETH_NFT_ITEM;

  constructor(args: NFTProps) {
    super();
    this.chainId = args.chainId;
    this.name = args.name;
    this.contractAddress = args.contractAddress;
    this.contractName = args.contractName;
    this.mediaData = args.mediaData; // remove the data perfix for android usage
  }

  public getChainId = () => this.chainId;

  public getName = () => this.name;

  public getmediaData = () => this.mediaData;

  public getContractAddress = () => this.contractAddress;

  public getContractName = () => this.contractName;

  public toDataItem = () => {
    const map: DataItemMap = {};
    map[Keys.chainId] = this.chainId;
    map[Keys.name] = this.name;
    map[Keys.contractAddress] = this.contractAddress;
    map[Keys.contractName] = this.contractName;
    map[Keys.mediaData] = this.mediaData;

    return new DataItem(map);
  };

  public static fromDataItem = (dataItem: DataItem) => {
    const map = dataItem.getData();
    const chainId = map[Keys.chainId];
    const name = map[Keys.name];
    const mediaData = map[Keys.mediaData];
    const contractAddress = map[Keys.contractAddress];
    const contractName = map[Keys.contractName];

    return new ETHNFTItem({
      chainId,
      name,
      contractAddress,
      contractName,
      mediaData,
    });
  };

  public static fromCBOR = (_cborPayload: Buffer) => {
    const dataItem = decodeToDataItem(_cborPayload);
    return ETHNFTItem.fromDataItem(dataItem);
  };

  public static constructETHNFTItem(
    chainId: number,
    contractAddress: string,
    contractName: string,
    name: string,
    mediaData: string
  ) {
    return new ETHNFTItem({
      chainId,
      contractAddress,
      contractName,
      mediaData,
      name,
    });
  }
}
