import ConfluxSignTransaction from '../src/api/conflux/ConfluxSignTransaction';
import EVMSignTransaction from '../src/api/evm/EVMSignTransaction';
import KaspaSignTransaction from '../src/api/kaspa/KaspaSignTransaction';
import XrpSignTransaction from '../src/api/xrp/XrpSignTransaction';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../src/data-manager/TransportManager', () => ({
  getProtocolV1MessageSchema: jest.fn(() => 'v1CurrentSchema'),
}));

jest.mock('../src/device/Device', () => ({
  Device: jest.fn(),
}));

const KASPA_PATH = "m/44'/111111'/0'/0/0";
const KASPA_SCRIPT = `20${'ab'.repeat(32)}ac`;
const KASPA_ADDRESS = 'kaspa:qr0lr4ml9fn3chekrqmjdkergxl93l4wrk3dankcgvjq776s9wn9jkdskewva';

const buildKaspaPayload = () => ({
  method: 'kaspaSignTransaction',
  version: 0,
  lockTime: 0,
  inputs: [
    {
      path: KASPA_PATH,
      prevTxId: 'aa'.repeat(32),
      outputIndex: 0,
      sequenceNumber: 0,
      output: { satoshis: 200000, script: KASPA_SCRIPT },
    },
  ],
  outputs: [{ satoshis: 100000, script: KASPA_SCRIPT, scriptVersion: 0 }],
});

describe('onekey public-chain parameter compatibility', () => {
  it('keeps the historical EVM contract-deployment representation', () => {
    const transaction = {
      to: '',
      value: '0x0',
      gasPrice: '0x1',
      gasLimit: '0x5208',
      nonce: '0x0',
      chainId: 1,
      data: '0x6000',
    };

    const method = new EVMSignTransaction({
      id: 1,
      payload: {
        method: 'evmSignTransaction',
        path: "m/44'/60'/0'/0/0",
        transaction,
      },
    });

    expect(() => method.init()).not.toThrow();

    const { to: _to, ...transactionWithoutTo } = transaction;
    const missingTo = new EVMSignTransaction({
      id: 2,
      payload: {
        method: 'evmSignTransaction',
        path: "m/44'/60'/0'/0/0",
        transaction: transactionWithoutTo,
      },
    });

    expect(() => missingTo.init()).toThrow('Missing required parameter: to');
  });

  it('keeps Conflux to validation aligned with onekey', () => {
    const method = new ConfluxSignTransaction({
      id: 1,
      payload: {
        method: 'confluxSignTransaction',
        path: "m/44'/503'/0'/0/0",
        transaction: {
          to: 'cfx:aak2rra2njvd77ezwjvx04kkds9fzagfe6d5r8e957',
          value: '0x0',
          gasLimit: '0x5208',
          gasPrice: '0x1',
          nonce: '0x0',
          epochHeight: '0x1',
          storageLimit: '0x0',
          chainId: 1029,
        },
      },
    });

    expect(() => method.init()).toThrow('should be [hexString]');
  });

  it('keeps XRP payment amount as the historical number input', () => {
    const createMethod = (amount: number | string) =>
      new XrpSignTransaction({
        id: 1,
        payload: {
          method: 'xrpSignTransaction',
          path: "m/44'/144'/0'/0/0",
          transaction: {
            payment: {
              amount,
              destination: 'rG1QQv2nh2gr7RCZ1P8YYcBUKCCN633jCn',
            },
          },
        },
      });

    expect(() => createMethod(1).init()).not.toThrow();
    expect(() => createMethod('1').init()).toThrow('should be [number]');
  });

  it('keeps the Kaspa legacy schema while allowing the additive streaming shape', () => {
    const legacyWithoutSigHash = new KaspaSignTransaction({
      id: 1,
      payload: buildKaspaPayload(),
    });
    expect(() => legacyWithoutSigHash.init()).toThrow('Missing required parameter: sigHashType');

    const legacyWithoutScript = new KaspaSignTransaction({
      id: 2,
      payload: {
        ...buildKaspaPayload(),
        sigHashType: 0x41,
        outputs: [{ satoshis: 100000, scriptVersion: 0 }],
      },
    });
    expect(() => legacyWithoutScript.init()).toThrow('Missing required parameter: script');

    const streaming = new KaspaSignTransaction({
      id: 3,
      payload: {
        ...buildKaspaPayload(),
        inputs: [
          {
            ...buildKaspaPayload().inputs[0],
            output: { satoshis: 200000 },
          },
        ],
        outputs: [{ satoshis: 100000, address: KASPA_ADDRESS }],
      },
    });
    expect(() => streaming.init()).not.toThrow();
  });
});
