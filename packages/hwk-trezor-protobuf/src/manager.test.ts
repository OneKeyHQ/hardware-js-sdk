import { DefaultDefinitions } from '../hwk';
import { protobufManager } from '.';

describe('protobufManager logging', () => {
  beforeAll(() => {
    protobufManager.load(DefaultDefinitions);
  });

  it('does not print protobuf payloads during normal encode/decode', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const encoded = protobufManager.encode('TronTransferContract', {
        owner_address: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
        to_address: '4141f82674a30ae1328745d08afe2d1a0a24195283',
        amount: '18123456',
      });
      protobufManager.decode('TronTransferContract', encoded.message);

      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[TREZOR_VERIFY]'),
        expect.anything(),
      );
    } finally {
      logSpy.mockRestore();
    }
  });
});
