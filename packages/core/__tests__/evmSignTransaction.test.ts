import EVMSignTransaction from '../src/api/evm/EVMSignTransaction';
import TransportManager from '../src/data-manager/TransportManager';

import type { EVMTransactionEIP7702 } from '../src/types';

// Mock the config module to avoid package.json resolution issues
jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

// Mock the device and transport manager
jest.mock('../src/data-manager/TransportManager', () => ({
  getProtocolV1MessageSchema: jest.fn(() => 'v1CurrentSchema'),
}));

jest.mock('../src/device/Device', () => ({
  Device: jest.fn(),
}));

const mockTransportManager = jest.mocked(TransportManager);

describe('EVMSignTransaction EIP-7702', () => {
  let mockDevice: any;
  let mockTypedCall: jest.Mock;

  beforeEach(() => {
    mockTransportManager.getProtocolV1MessageSchema.mockReturnValue('v1CurrentSchema');
    mockTypedCall = jest.fn();
    mockDevice = {
      isProtocolV2: jest.fn(() => false),
      commands: {
        typedCall: {
          bind: jest.fn(() => mockTypedCall),
        },
      },
    };
  });

  describe('Protocol-specific schema routing', () => {
    const transaction: EVMTransactionEIP7702 = {
      to: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
      value: '0x0',
      gasLimit: '0x5208',
      nonce: '0x0',
      chainId: 1,
      maxFeePerGas: '0xbebc200',
      maxPriorityFeePerGas: '0x9502f900',
      authorizationList: [
        {
          chainId: 1,
          address: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
          nonce: '0x1',
        },
      ],
    };

    const createTransactionMethod = () => {
      const method = new EVMSignTransaction({
        id: 1,
        payload: {
          method: 'evmSignTransaction',
          path: "m/44'/60'/0'/0/0",
          transaction,
        },
      });
      method.device = mockDevice;
      method.init();
      return method;
    };

    it('keeps Protocol V2 on current OneKey messages after a legacy V1 device', async () => {
      mockTransportManager.getProtocolV1MessageSchema.mockReturnValue('v1LegacySchema');
      mockDevice.isProtocolV2.mockReturnValue(true);
      mockTypedCall.mockResolvedValue({
        message: {
          signature_v: 27,
          signature_r: '01',
          signature_s: '02',
          authorization_signatures: [],
        },
      });

      await expect(createTransactionMethod().run()).resolves.toMatchObject({
        v: '0x1b',
      });
      expect(mockTypedCall).toHaveBeenCalledWith(
        'EthereumSignTxEIP7702OneKey',
        'EthereumTxRequestOneKey',
        expect.any(Object)
      );
    });

    it('continues to use legacy messages for a Protocol V1 legacy device', async () => {
      mockTransportManager.getProtocolV1MessageSchema.mockReturnValue('v1LegacySchema');

      await expect(createTransactionMethod().run()).rejects.toThrow(
        'EIP7702 not supported by Trezor'
      );
      expect(mockTypedCall).not.toHaveBeenCalled();
    });
  });

  describe('EIP-7702 Transaction Detection', () => {
    it('should detect EIP-7702 transaction with authorization list', () => {
      const transaction: EVMTransactionEIP7702 = {
        to: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
        value: '0x0',
        gasLimit: '0x5208',
        nonce: '0x0',
        chainId: 1,
        maxFeePerGas: '0xbebc200',
        maxPriorityFeePerGas: '0x9502f900',
        authorizationList: [
          {
            chainId: 1,
            address: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
            nonce: '0x1',
          },
        ],
      };

      const method = new EVMSignTransaction({
        id: 1,
        payload: {
          method: 'evmSignTransaction',
          path: "m/44'/60'/0'/0/0",
          transaction,
        },
      });
      method.device = mockDevice;
      method.init();

      expect(method.isEIP7702).toBe(true);
      expect(method.isEIP1559).toBe(false);
    });

    it('should not detect EIP-7702 when authorization list is empty', () => {
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        gasLimit: '0x5208',
        nonce: '0x0',
        chainId: 1,
        maxFeePerGas: '0x77359400',
        maxPriorityFeePerGas: '0x77359400',
        authorizationList: [],
      };

      const method = new EVMSignTransaction({
        id: 1,
        payload: {
          method: 'evmSignTransaction',
          path: "m/44'/60'/0'/0/0",
          transaction,
        },
      });
      method.device = mockDevice;
      method.init();

      expect(method.isEIP7702).toBe(false);
      expect(method.isEIP1559).toBe(true);
    });
  });

  describe('EIP-7702 Signature Processing', () => {
    it('should return flattened r,s,v structure for authorization signatures', async () => {
      const mockAuthSignatures = [
        {
          y_parity: 0,
          r: 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
          s: 'efab5678901234567890abcdef1234567890abcdef1234567890abcdef123456',
        },
        {
          y_parity: 1,
          r: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          s: '567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
        },
      ];

      mockTypedCall.mockResolvedValue({
        message: {
          signature_v: 27,
          signature_r: 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef123456',
          signature_s: 'cafebabe567890abcdef1234567890abcdef1234567890abcdef1234567890',
          authorization_signatures: mockAuthSignatures,
        },
      });

      const transaction: EVMTransactionEIP7702 = {
        to: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
        value: '0x0',
        gasLimit: '0x5208',
        nonce: '0x0',
        chainId: 1,
        maxFeePerGas: '0xbebc200',
        maxPriorityFeePerGas: '0x9502f900',
        authorizationList: [
          {
            chainId: 1,
            address: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
            nonce: '0x1',
          },
        ],
      };

      const method = new EVMSignTransaction({
        id: 1,
        payload: {
          method: 'evmSignTransaction',
          path: "m/44'/60'/0'/0/0",
          transaction,
        },
      });
      method.device = mockDevice;
      method.init();

      const result = await method.run();

      expect(result).toEqual({
        v: '0x1b',
        r: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        s: '0xcafebabe567890abcdef1234567890abcdef1234567890abcdef1234567890',
        authorizationSignatures: [
          {
            yParity: 0,
            r: 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
            s: 'efab5678901234567890abcdef1234567890abcdef1234567890abcdef123456',
          },
          {
            yParity: 1,
            r: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
          },
        ],
      });
    });

    it('should handle transaction without authorization signatures', async () => {
      mockTypedCall.mockResolvedValue({
        message: {
          signature_v: 28,
          signature_r: 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef123456',
          signature_s: 'cafebabe567890abcdef1234567890abcdef1234567890abcdef1234567890',
          authorization_signatures: [],
        },
      });

      const transaction: EVMTransactionEIP7702 = {
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        gasLimit: '0x5208',
        nonce: '0x0',
        chainId: 1,
        maxFeePerGas: '0x77359400',
        maxPriorityFeePerGas: '0x77359400',
        authorizationList: [
          {
            chainId: 1,
            address: '0x1234567890123456789012345678901234567890',
            nonce: '0x0',
          },
        ],
      };

      const method = new EVMSignTransaction({
        id: 1,
        payload: {
          method: 'evmSignTransaction',
          path: "m/44'/60'/0'/0/0",
          transaction,
        },
      });
      method.device = mockDevice;
      method.init();

      const result = await method.run();

      expect(result).toEqual({
        v: '0x1c',
        r: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        s: '0xcafebabe567890abcdef1234567890abcdef1234567890abcdef1234567890',
      });
    });
  });

  describe('EIP-7702 Validation', () => {
    it('should require authorization list for EIP-7702 transactions', () => {
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        gasLimit: '0x5208',
        nonce: '0x0',
        chainId: 1,
        maxFeePerGas: '0x77359400',
        maxPriorityFeePerGas: '0x77359400',
        authorizationList: [], // Empty authorization list should trigger EIP1559 detection, not EIP7702
      };

      // This should not throw because empty authorizationList means it's EIP1559, not EIP7702
      expect(() => {
        const method = new EVMSignTransaction({
          id: 1,
          payload: {
            method: 'evmSignTransaction',
            path: "m/44'/60'/0'/0/0",
            transaction,
          },
        });
        method.device = mockDevice;
        method.init();
      }).not.toThrow();
    });

    it('should require maxFeePerGas and maxPriorityFeePerGas for EIP-7702', () => {
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        gasLimit: '0x5208',
        nonce: '0x0',
        chainId: 1,
        authorizationList: [
          {
            chainId: 1,
            address: '0x1234567890123456789012345678901234567890',
            nonce: '0x0',
          },
        ],
        // Missing maxFeePerGas and maxPriorityFeePerGas
      };

      expect(() => {
        const method = new EVMSignTransaction({
          id: 1,
          payload: {
            method: 'evmSignTransaction',
            path: "m/44'/60'/0'/0/0",
            transaction,
          },
        });
        method.device = mockDevice;
        method.init();
      }).toThrow();
    });
  });

  describe('Version Range', () => {
    it('should return correct version range for EIP-7702', () => {
      const transaction: EVMTransactionEIP7702 = {
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        gasLimit: '0x5208',
        nonce: '0x0',
        chainId: 1,
        maxFeePerGas: '0x77359400',
        maxPriorityFeePerGas: '0x77359400',
        authorizationList: [
          {
            chainId: 1,
            address: '0x1234567890123456789012345678901234567890',
            nonce: '0x0',
          },
        ],
      };

      const method = new EVMSignTransaction({
        id: 1,
        payload: {
          method: 'evmSignTransaction',
          path: "m/44'/60'/0'/0/0",
          transaction,
        },
      });
      method.device = mockDevice;
      method.init();

      const versionRange = method.getVersionRange();

      expect(versionRange).toEqual({
        model_classic1s: {
          min: '3.13.0',
        },
        pro: {
          min: '4.16.0',
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle authorization with existing signature', async () => {
      const mockAuthSignatures = [
        {
          y_parity: 1,
          r: 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
          s: 'efab5678901234567890abcdef1234567890abcdef1234567890abcdef123456',
        },
      ];

      mockTypedCall.mockResolvedValue({
        message: {
          signature_v: 27,
          signature_r: 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef123456',
          signature_s: 'cafebabe567890abcdef1234567890abcdef1234567890abcdef1234567890',
          authorization_signatures: mockAuthSignatures,
        },
      });

      const transaction: EVMTransactionEIP7702 = {
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        gasLimit: '0x5208',
        nonce: '0x0',
        chainId: 1,
        maxFeePerGas: '0x77359400',
        maxPriorityFeePerGas: '0x77359400',
        authorizationList: [
          {
            chainId: 1,
            address: '0x1234567890123456789012345678901234567890',
            nonce: '0x0',
            yParity: 0,
            r: 'existing_r_value_1234567890abcdef1234567890abcdef1234567890abcdef',
            s: 'existing_s_value_567890abcdef1234567890abcdef1234567890abcdef1234',
          },
        ],
      };

      const method = new EVMSignTransaction({
        id: 1,
        payload: {
          method: 'evmSignTransaction',
          path: "m/44'/60'/0'/0/0",
          transaction,
        },
      });
      method.device = mockDevice;
      method.init();

      const result = await method.run();

      expect(result.authorizationSignatures).toHaveLength(1);
      expect(result.authorizationSignatures?.[0]).toEqual({
        yParity: 1,
        r: 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        s: 'efab5678901234567890abcdef1234567890abcdef1234567890abcdef123456',
      });
    });
  });
});
