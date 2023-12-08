// 100% sure which networks are supported
enum Networks {
  Polkadot = 'polkadot',
  Westend = 'westend',
  Kusama = 'kusama',
  Astar = 'astar',
  JoyStream = 'joystream',
}

const networkVersionRange = {
  // All polkadot networks are included in no special case
  [Networks.Polkadot]: {
    model_mini: {
      min: '3.0.0',
    },
    model_touch: {
      min: '4.3.0',
    },
  },
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
export const PolkadotVersionRange = networkVersionRange;
