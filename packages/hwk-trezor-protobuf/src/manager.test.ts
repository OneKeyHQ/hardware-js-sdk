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
        expect.anything()
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('encodes and decodes the current streamed Trezor authenticity messages', () => {
    const request = protobufManager.encode('AuthenticateDevice', {
      challenge: 'ab'.repeat(32),
      stream: true,
    });
    expect(protobufManager.decode('AuthenticateDevice', request.message).message).toEqual({
      challenge: 'ab'.repeat(32),
      stream: true,
    });

    const sizes = protobufManager.encode('AuthenticityProofSizes', {
      optiga_certificates: [420],
      optiga_signature: 72,
      tropic_certificates: [410],
      tropic_signature: 64,
      mcu_certificates: [4067],
      mcu_signature: 2420,
    });
    expect(protobufManager.decode('AuthenticityProofSizes', sizes.message).message).toEqual({
      optiga_certificates: [420],
      optiga_signature: 72,
      tropic_certificates: [410],
      tropic_signature: 64,
      mcu_certificates: [4067],
      mcu_signature: 2420,
    });

    const chunkRequest = protobufManager.encode('GetAuthenticityProofChunk', {
      proof_type: 2,
      index: 0,
      offset: 500,
      size: 500,
    });
    expect(
      protobufManager.decode('GetAuthenticityProofChunk', chunkRequest.message).message
    ).toEqual({
      proof_type: 'MCU',
      index: 0,
      offset: 500,
      size: 500,
    });
  });
});
