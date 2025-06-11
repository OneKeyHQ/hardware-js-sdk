import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "basic",
  name: "Basic",
  description: "Basic operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  color: "#6B7280",
  category: "basic" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'searchDevices',
    description: 'Search for devices',
    noConnIdReq: true,
    noDeviceIdReq: true,
  },
  {
    method: 'getFeatures',
    description: 'Get features of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'getOnekeyFeatures',
    description: 'Get features of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'getPassphraseState',
    description: 'Get passphrase state of a device',
    noDeviceIdReq: true,
  },
  {
    method: 'cancel',
    description: 'Cancel a request',
    noDeviceIdReq: true,
  },
  // {
  //   method: 'checkBridgeStatus',
  //   description: 'Check bridge status of a device',
  //   noConnIdReq: true,
  //   noDeviceIdReq: true,
  // },
  // {
  //   method: 'checkBridgeRelease',
  //   description: 'Check bridge release of a device',
  //   noDeviceIdReq: true,
  // },
  // {
  //   method: 'getLogs',
  //   description: 'get logs',
  //   noDeviceIdReq: true,
  //   noConnIdReq: true,
  // },
];


// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
