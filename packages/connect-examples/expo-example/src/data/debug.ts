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
  },
  {
    method: 'debugLinkFlashErase',
    description: 'debugLinkFlashErase',
  },
  {
    method: 'debugLinkGetState',
    description: 'debugLinkGetState',
  },
  {
    method: 'debugLinkMemoryRead',
    description: 'debugLinkMemoryRead',
  },
  {
    method: 'debugLinkMemoryWrite',
    description: 'debugLinkMemoryWrite',
  },
  {
    method: 'debugLinkRecordScreen',
    description: 'debugLinkRecordScreen',
  },
  {
    method: 'debugLinkReseedRandom',
    description: 'debugLinkReseedRandom',
  },
  {
    method: 'debugLinkStop',
    description: 'debugLinkStop',
  },
  {
    method: 'debugLinkWatchLayout',
    description: 'debugLinkWatchLayout',
  },
];

export default api;
