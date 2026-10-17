import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import ZcashSignPczt from '../src/api/zcash/ZcashSignPczt';
import ZcashGetAddress from '../src/api/zcash/ZcashGetAddress';

import type { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const hex = (byte: number, length: number) => byte.toString(16).padStart(2, '0').repeat(length);

const createSignMethod = (pczt: string) =>
  new ZcashSignPczt({ id: 1, payload: { method: 'zcashSignPczt', pczt } });

const attachDevice = (method: ZcashSignPczt | ZcashGetAddress, typedCall: jest.Mock) => {
  const commands = { typedCall };
  method.device = {
    commands,
    getCommands: () => commands,
    toMessageObject: () => ({}),
  } as unknown as Device;
  method.postMessage = jest.fn();
};

describe('ZcashSignPczt', () => {
  test('uploads device-sized chunks and downloads host-sized chunks', async () => {
    // 2500 bytes: initial 1024, then device asks 1000 + 476.
    const pczt = hex(0xab, 2500);
    const signed = Buffer.alloc(1500, 0xcd);
    const method = createSignMethod(pczt);
    method.init();

    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'ZcashPcztChunkRequest', message: { chunk_length: 1000 } })
      .mockResolvedValueOnce({ type: 'ZcashPcztChunkRequest', message: { chunk_length: 476 } })
      .mockResolvedValueOnce({
        type: 'ZcashSignedPczt',
        message: {
          pczt_length: signed.length,
          pczt_initial_chunk: signed.subarray(0, 1024).toString('hex'),
        },
      })
      .mockResolvedValueOnce({
        type: 'ZcashPcztChunkAck',
        message: { data_chunk: signed.subarray(1024).toString('hex') },
      });
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({ pczt: signed.toString('hex') });

    expect(typedCall.mock.calls[0]).toEqual([
      'ZcashSignPczt',
      ['ZcashSignedPczt', 'ZcashPcztChunkRequest'],
      { pczt_length: 2500, pczt_initial_chunk: hex(0xab, 1024) },
    ]);
    expect(typedCall.mock.calls[1]).toEqual([
      'ZcashPcztChunkAck',
      ['ZcashSignedPczt', 'ZcashPcztChunkRequest'],
      { data_chunk: hex(0xab, 1000) },
    ]);
    expect(typedCall.mock.calls[2][2]).toEqual({ data_chunk: hex(0xab, 476) });
    expect(typedCall.mock.calls[3]).toEqual([
      'ZcashSignedPcztChunkRequest',
      'ZcashPcztChunkAck',
      { chunk_length: 476 },
    ]);
    expect(typedCall).toHaveBeenCalledTimes(4);
  });

  test('single-message round trip when both sides fit in the initial chunk', async () => {
    const method = createSignMethod(hex(0x01, 100));
    method.init();
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'ZcashSignedPczt',
      message: { pczt_length: 80, pczt_initial_chunk: hex(0x02, 80) },
    });
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({ pczt: hex(0x02, 80) });
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('rejects a device chunk request past the end of the pczt', async () => {
    const method = createSignMethod(hex(0x01, 1100));
    method.init();
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'ZcashPcztChunkRequest', message: { chunk_length: 200 } });
    attachDevice(method, typedCall);

    await expect(method.run()).rejects.toThrow('device requested 200 bytes at offset 1024');
  });

  test('rejects completion before the entire input has been uploaded', async () => {
    const method = createSignMethod(hex(0x01, 1100));
    method.init();
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'ZcashSignedPczt',
      message: { pczt_length: 80, pczt_initial_chunk: hex(0x02, 80) },
    });
    attachDevice(method, typedCall);
    await expect(method.run()).rejects.toThrow('before receiving the whole pczt');
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('rejects an initial signed chunk larger than its announced total', async () => {
    const method = createSignMethod(hex(0x01, 100));
    method.init();
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'ZcashSignedPczt',
      message: { pczt_length: 80, pczt_initial_chunk: hex(0x02, 81) },
    });
    attachDevice(method, typedCall);
    await expect(method.run()).rejects.toThrow('more initial pczt bytes than announced');
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('rejects an announced signed length that is not a sane positive size', async () => {
    for (const total of [0, 1.5, 16 * 1024 * 1024 + 1]) {
      const method = createSignMethod(hex(0x01, 100));
      method.init();
      const typedCall = jest.fn().mockResolvedValueOnce({
        type: 'ZcashSignedPczt',
        message: { pczt_length: total, pczt_initial_chunk: '' },
      });
      attachDevice(method, typedCall);
      await expect(method.run()).rejects.toThrow('invalid signed pczt length');
    }
  });

  test('rejects empty input and leaves size limits to the device', () => {
    expect(() => createSignMethod('').init()).toThrow('pczt is empty');
    const method = createSignMethod(hex(0x00, 64 * 1024));
    expect(() => method.init()).not.toThrow();
    expect(method.params.pczt_length).toBe(64 * 1024);
  });
});

describe('ZcashSignPczt protocol edge cases', () => {
  const signedMessage = (signed: Buffer, initialLength = 1024) => ({
    type: 'ZcashSignedPczt',
    message: {
      pczt_length: signed.length,
      pczt_initial_chunk: signed.subarray(0, initialLength).toString('hex'),
    },
  });

  const runWith = (pczt: string, typedCall: jest.Mock) => {
    const method = createSignMethod(pczt);
    method.init();
    attachDevice(method, typedCall);
    return method.run();
  };

  test.each([
    { name: 'short', data: hex(0xcd, 100) },
    { name: 'empty', data: '' },
    { name: 'missing', data: undefined },
  ])('rejects a $name download chunk', async ({ data }) => {
    const signed = Buffer.alloc(1500, 0xcd);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce(signedMessage(signed))
      .mockResolvedValueOnce({ type: 'ZcashPcztChunkAck', message: { data_chunk: data } });

    await expect(runWith(hex(0x01, 100), typedCall)).rejects.toThrow(
      'requested bytes at offset 1024 of 1500'
    );
    expect(typedCall).toHaveBeenCalledTimes(2);
  });

  test('rejects a download chunk longer than requested', async () => {
    const signed = Buffer.alloc(1500, 0xcd);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce(signedMessage(signed))
      .mockResolvedValueOnce({
        type: 'ZcashPcztChunkAck',
        message: { data_chunk: hex(0xcd, 477) },
      });

    await expect(runWith(hex(0x01, 100), typedCall)).rejects.toThrow(
      'device returned 477 of 476 requested bytes'
    );
  });

  test.each([0, -1, 1.5, Number.NaN])(
    'rejects a device upload request for chunk length %s',
    async chunkLength => {
      const typedCall = jest.fn().mockResolvedValueOnce({
        type: 'ZcashPcztChunkRequest',
        message: { chunk_length: chunkLength },
      });

      await expect(runWith(hex(0x01, 2000), typedCall)).rejects.toThrow(
        `device requested ${chunkLength} bytes at offset 1024`
      );
      expect(typedCall).toHaveBeenCalledTimes(1);
    }
  );

  test('propagates a device Failure in the middle of upload', async () => {
    const failure = ERRORS.TypedError(
      HardwareErrorCode.ActionCancelled,
      'Action cancelled by user'
    );
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'ZcashPcztChunkRequest', message: { chunk_length: 500 } })
      .mockRejectedValueOnce(failure);

    await expect(runWith(hex(0x01, 2000), typedCall)).rejects.toBe(failure);
    expect(typedCall).toHaveBeenCalledTimes(2);
  });

  test('propagates a device Failure in the middle of download', async () => {
    const failure = ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Firmware error');
    const signed = Buffer.alloc(3000, 0xcd);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce(signedMessage(signed))
      .mockResolvedValueOnce({
        type: 'ZcashPcztChunkAck',
        message: { data_chunk: signed.subarray(1024, 2048).toString('hex') },
      })
      .mockRejectedValueOnce(failure);

    await expect(runWith(hex(0x01, 100), typedCall)).rejects.toBe(failure);
    expect(typedCall).toHaveBeenCalledTimes(3);
  });

  test('exactly 1024 bytes in both directions needs no extra chunks', async () => {
    const signed = Buffer.alloc(1024, 0xcd);
    const typedCall = jest.fn().mockResolvedValueOnce(signedMessage(signed));

    await expect(runWith(hex(0xab, 1024), typedCall)).resolves.toEqual({
      pczt: signed.toString('hex'),
    });
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall.mock.calls[0][2]).toEqual({
      pczt_length: 1024,
      pczt_initial_chunk: hex(0xab, 1024),
    });
  });

  test('1025 bytes in both directions splits into 1024 + 1', async () => {
    const pczt = `${hex(0xab, 1024)}ef`;
    const signed = Buffer.concat([Buffer.alloc(1024, 0xcd), Buffer.from([0x99])]);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'ZcashPcztChunkRequest', message: { chunk_length: 1 } })
      .mockResolvedValueOnce(signedMessage(signed))
      .mockResolvedValueOnce({ type: 'ZcashPcztChunkAck', message: { data_chunk: '99' } });

    await expect(runWith(pczt, typedCall)).resolves.toEqual({ pczt: signed.toString('hex') });
    expect(typedCall.mock.calls[0][2]).toEqual({
      pczt_length: 1025,
      pczt_initial_chunk: hex(0xab, 1024),
    });
    expect(typedCall.mock.calls[1][2]).toEqual({ data_chunk: 'ef' });
    expect(typedCall.mock.calls[2][2]).toEqual({ chunk_length: 1 });
  });

  test('2048 bytes in both directions uses one full 1024-byte chunk each way', async () => {
    const signed = Buffer.alloc(2048, 0xcd);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'ZcashPcztChunkRequest', message: { chunk_length: 1024 } })
      .mockResolvedValueOnce(signedMessage(signed))
      .mockResolvedValueOnce({
        type: 'ZcashPcztChunkAck',
        message: { data_chunk: signed.subarray(1024).toString('hex') },
      });

    await expect(runWith(hex(0xab, 2048), typedCall)).resolves.toEqual({
      pczt: signed.toString('hex'),
    });
    expect(typedCall.mock.calls[1][2]).toEqual({ data_chunk: hex(0xab, 1024) });
    expect(typedCall.mock.calls[2][2]).toEqual({ chunk_length: 1024 });
    expect(typedCall).toHaveBeenCalledTimes(3);
  });

  test.each(['abc', '0xabc', 'a'])('rejects odd-length hex %s', pczt => {
    expect(() => createSignMethod(pczt).init()).toThrow('pczt hex must have an even length');
  });

  test.each(['zz', '0xgg', 'ab cd'])('rejects non-hex input %s', pczt => {
    expect(() => createSignMethod(pczt).init()).toThrow('should be [hexString]');
  });

  test('accepts a 0x-prefixed even-length hex string', () => {
    const method = createSignMethod('0xABcd');
    method.init();
    expect(method.params).toEqual({ pczt_length: 2, pczt_initial_chunk: 'abcd' });
  });
});

describe('ZcashGetAddress', () => {
  test('maps params and response', async () => {
    const method = new ZcashGetAddress({
      id: 1,
      payload: {
        method: 'zcashGetAddress',
        path: "m/32'/133'/0'",
        showOnOneKey: false,
        includeUfvk: true,
        includeSeedFingerprint: true,
      },
    });
    method.init();
    const typedCall = jest.fn().mockResolvedValue({
      message: { address: 'u1abc', ufvk: 'uview1abc', seed_fingerprint: hex(0x0f, 32) },
    });
    attachDevice(method, typedCall);

    await expect(method.run()).resolves.toEqual({
      path: "m/32'/133'/0'",
      address: 'u1abc',
      ufvk: 'uview1abc',
      seedFingerprint: hex(0x0f, 32),
    });
    expect(typedCall).toHaveBeenCalledWith('ZcashGetAddress', 'ZcashAddress', {
      address_n: [2147483680, 2147483781, 2147483648],
      address_type: 0,
      scope: 0,
      diversifier_index: 0,
      show_display: false,
      include_ufvk: true,
      include_seed_fingerprint: true,
    });
  });
});

describe('Zcash address protocol selection', () => {
  const createAddress = (params: Record<string, unknown> = {}) =>
    new ZcashGetAddress({
      id: 1,
      payload: { method: 'zcashGetAddress', path: "m/32'/133'/0'", ...params },
    });
  test('supports only Pro2 and protocol V2', () => {
    for (const method of [createAddress(), createSignMethod(hex(1, 1))]) {
      method.init();
      expect(method.supportsProtocol('V1')).toBe(false);
      expect(method.supportsProtocol('V2')).toBe(true);
      expect(method.strictCheckDeviceSupport).toBe(true);
      expect(Object.keys(method.getVersionRange())).toEqual(['model_pro2']);
    }
  });
  test.each([0, 1, 2])('maps address type %s with internal scope and index', async addressType => {
    const method = createAddress({ addressType, scope: 1, diversifierIndex: 37 });
    method.init();
    const typedCall = jest.fn().mockResolvedValue({ message: { address: 'device-address' } });
    attachDevice(method, typedCall);
    await method.run();
    expect(typedCall).toHaveBeenCalledWith(
      'ZcashGetAddress',
      'ZcashAddress',
      expect.objectContaining({
        address_type: addressType,
        scope: 1,
        diversifier_index: 37,
        show_display: true,
      })
    );
  });
  test.each([
    { addressType: 3 },
    { scope: 2 },
    { diversifierIndex: -1 },
    { diversifierIndex: 1.5 },
    { diversifierIndex: 0x80000000 },
    { addressType: 2, diversifierIndex: 0x100000000 },
    { path: "m/44'/133'/0'" },
    { path: "m/32'/133'/0'/0/0" },
  ])('rejects invalid address requests %j', params => {
    expect(() => createAddress(params).init()).toThrow();
  });
  test('accepts the uint32 limit only for an Orchard-only address', () => {
    expect(() =>
      createAddress({ addressType: 2, diversifierIndex: 0xffffffff }).init()
    ).not.toThrow();
  });
});
