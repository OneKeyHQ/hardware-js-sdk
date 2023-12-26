import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'debugLinkDecision',
    description: 'debugLinkDecision',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'debugLinkEraseSdCard',
    description: 'debugLinkEraseSdCard',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'debugLinkFlashErase',
    description: 'debugLinkFlashErase',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'debugLinkGetState',
    description: 'debugLinkGetState',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'debugLinkMemoryRead',
    description: 'debugLinkMemoryRead',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'debugLinkMemoryWrite',
    description: 'debugLinkMemoryWrite',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'debugLinkRecordScreen',
    description: 'debugLinkRecordScreen',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'debugLinkReseedRandom',
    description: 'debugLinkReseedRandom',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'debugLinkStop',
    description: 'debugLinkStop',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
  {
    method: 'debugLinkWatchLayout',
    description: 'debugLinkWatchLayout',
    noDeviceIdReq: true,
    expect: {
      common: {
        normal: {
          unknownMessage: true,
        },
      },
    },
  },
];

export default api;
