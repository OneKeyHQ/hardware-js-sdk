import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'debugLinkDecision',
    description: 'debugLinkDecision',
    noDeviceIdReq: true,
  },
  {
    method: 'debugLinkEraseSdCard',
    description: 'debugLinkEraseSdCard',
    noDeviceIdReq: true,
  },
  {
    method: 'debugLinkFlashErase',
    description: 'debugLinkFlashErase',
    noDeviceIdReq: true,
  },
  {
    method: 'debugLinkGetState',
    description: 'debugLinkGetState',
    noDeviceIdReq: true,
  },
  {
    method: 'debugLinkMemoryRead',
    description: 'debugLinkMemoryRead',
    noDeviceIdReq: true,
  },
  {
    method: 'debugLinkMemoryWrite',
    description: 'debugLinkMemoryWrite',
    noDeviceIdReq: true,
  },
  {
    method: 'debugLinkRecordScreen',
    description: 'debugLinkRecordScreen',
    noDeviceIdReq: true,
  },
  {
    method: 'debugLinkReseedRandom',
    description: 'debugLinkReseedRandom',
    noDeviceIdReq: true,
  },
  {
    method: 'debugLinkStop',
    description: 'debugLinkStop',
    noDeviceIdReq: true,
  },
  {
    method: 'debugLinkWatchLayout',
    description: 'debugLinkWatchLayout',
    noDeviceIdReq: true,
  },
];

export default api;
