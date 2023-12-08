import type { DeviceFirmwareRange } from '../../types';

// 100% sure which networks are supported
enum Networks {
  Polkadot = 'polkadot',
  Westend = 'westend',
  Kusama = 'kusama',
  Astar = 'astar',
  JoyStream = 'joystream',
}

// All polkadot networks are included in no special case
const baseVersionRange = {
  model_mini: {
    min: '3.0.0',
  },
  model_touch: {
    min: '4.3.0',
  },
};

const specialVersionRange: Record<string, DeviceFirmwareRange> = {
  [Networks.JoyStream]: {
    model_mini: {
      min: '3.6.0',
    },
    model_touch: {
      min: '4.7.0',
    },
  },
};

export default Networks;

export function getPolkadotVersionRange(network: string) {
  return specialVersionRange[network] ?? baseVersionRange;
}

export function getPolkadotVersionRangeWithBundle(networks: string[]) {
  if (networks.includes(Networks.JoyStream)) {
    return specialVersionRange[Networks.JoyStream];
  }
  return baseVersionRange;
}
