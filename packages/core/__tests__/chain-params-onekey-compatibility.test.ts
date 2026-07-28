import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import BenfenGetAddress from '../src/api/benfen/BenfenGetAddress';
import ConfluxSignTransaction from '../src/api/conflux/ConfluxSignTransaction';
import EVMSignTransaction from '../src/api/evm/EVMSignTransaction';
import EVMSignMessageEIP712 from '../src/api/evm/EVMSignMessageEIP712';
import KaspaSignTransaction from '../src/api/kaspa/KaspaSignTransaction';
import XrpSignTransaction from '../src/api/xrp/XrpSignTransaction';

import type { Device } from '../src/device/Device';

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

  it('keeps validating the Kaspa legacy input amount', () => {
    const payload = buildKaspaPayload();
    const method = new KaspaSignTransaction({
      id: 1,
      payload: {
        ...payload,
        sigHashType: 0x41,
        inputs: [
          {
            ...payload.inputs[0],
            output: { script: KASPA_SCRIPT },
          },
        ],
      },
    });

    expect(() => method.init()).toThrow('Missing required parameter: satoshis');
  });

  it('keeps the deprecated EIP-712 method callable on existing Protocol V1 devices', async () => {
    const method = new EVMSignMessageEIP712({
      id: 1,
      payload: {
        method: 'evmSignMessageEIP712',
        path: "m/44'/60'/0'/0/0",
        domainHash: `0x${'11'.repeat(32)}`,
        messageHash: `0x${'22'.repeat(32)}`,
      },
    });
    method.init();

    const typedCall = jest.fn().mockResolvedValue({
      message: {
        address: '0x1234',
        signature: 'abcd',
      },
    });
    method.device = {
      commands: { typedCall },
      getCurrentFirmwareVersionString: jest.fn(() => '4.10.0'),
      getCurrentMethodVersionRange: jest.fn(() => undefined),
      getCurrentFirmwareType: jest.fn(() => EFirmwareType.Universal),
      getProtocol: jest.fn(() => 'V1'),
    } as unknown as Device;

    await expect(method.run()).resolves.toEqual({
      address: '0x1234',
      signature: 'abcd',
    });
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  it('rejects a Benfen response that omits the address', async () => {
    const method = new BenfenGetAddress({
      id: 1,
      payload: {
        method: 'benfenGetAddress',
        path: "m/44'/728'/0'/0'/0'",
        showOnOneKey: false,
      },
    });
    method.init();
    method.device = {
      commands: {
        typedCall: jest.fn().mockResolvedValue({ message: {} }),
      },
      getCurrentFirmwareVersionString: jest.fn(() => '1.0.0'),
      getCurrentDeviceType: jest.fn(() => EDeviceType.Classic),
      isProtocolV2: jest.fn(() => false),
    } as unknown as Device;

    await expect(method.run()).rejects.toThrow(/address/i);
  });
});
