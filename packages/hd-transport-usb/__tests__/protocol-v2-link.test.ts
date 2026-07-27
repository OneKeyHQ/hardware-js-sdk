import transportPackage, { PROTOCOL_V2_CHANNEL_USB, ProtocolV2 } from '@onekeyfe/hd-transport';

import NodeUsbTransport from '../src';

let mockUsbDevices: any[] = [];

jest.mock('usb', () => ({
  getDeviceList: jest.fn(() => mockUsbDevices),
}));

const { parseConfigure } = transportPackage;

const protocolV1Schema = {
  nested: {
    Initialize: { fields: {} },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    MessageType: {
      values: {
        MessageType_Initialize: 1,
        MessageType_Success: 2,
      },
    },
  },
};

const protocolV2Schema = {
  nested: {
    Ping: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    MessageType: {
      values: {
        MessageType_Ping: 60206,
        MessageType_Success: 60207,
      },
    },
  },
};

const schemas = {
  protocolV1: parseConfigure(protocolV1Schema),
  protocolV2: parseConfigure(protocolV2Schema),
};

type PendingRead = {
  started: Promise<void>;
  fail: (error?: Error) => void;
};

const createHarness = () => {
  const path = '6136';
  const responseQueue: Buffer[] = [];
  const sentSeqs: number[] = [];
  let cancelledTransferCount = 0;
  let writeError: Error | undefined;
  let holdNextRead:
    | {
        markStarted: () => void;
        started: Promise<void>;
        callback?: (error?: Error, data?: Buffer) => void;
      }
    | undefined;

  const performInTransfer = (callback: (error?: Error, data?: Buffer) => void) => {
    if (epIn.timeout === 50) {
      callback(new Error('LIBUSB_TRANSFER_TIMED_OUT'));
      return;
    }
    if (holdNextRead) {
      const pending = holdNextRead;
      holdNextRead = undefined;
      pending.callback = callback;
      pending.markStarted();
      return;
    }
    const response = responseQueue.shift();
    if (!response) {
      callback(new Error('LIBUSB_TRANSFER_TIMED_OUT'));
      return;
    }
    callback(undefined, response);
  };

  const epIn = {
    direction: 'in',
    address: 0x81,
    timeout: 30_000,
    transfer: jest.fn((_length: number, callback: (error?: Error, data?: Buffer) => void) => {
      performInTransfer(callback);
    }),
    makeTransfer: jest.fn(
      (
        _timeout: number,
        callback: (error: Error | undefined, data: Buffer, actualLength: number) => void
      ) => {
        let settled = false;
        const finish = (error?: Error, data = Buffer.alloc(0)) => {
          if (settled) return;
          settled = true;
          callback(error, data, data.length);
        };
        return {
          submit: jest.fn((buffer: Buffer) => {
            performInTransfer((error, data) => {
              if (error) {
                finish(error);
                return;
              }
              data?.copy(buffer);
              finish(undefined, buffer.subarray(0, data?.length ?? 0));
            });
          }),
          cancel: jest.fn(() => {
            cancelledTransferCount += 1;
            finish(new Error('LIBUSB_TRANSFER_CANCELLED'));
          }),
        };
      }
    ),
  };

  const performOutTransfer = (data: Buffer, callback: (error?: Error) => void) => {
    const seq = data[6];
    sentSeqs.push(seq);
    if (writeError) {
      const error = writeError;
      writeError = undefined;
      callback(error);
      return;
    }
    responseQueue.push(
      Buffer.from(
        ProtocolV2.encodeFrame(
          schemas,
          'Success',
          { message: 'ok' },
          { router: PROTOCOL_V2_CHANNEL_USB, seq }
        )
      )
    );
    callback();
  };

  const epOut = {
    direction: 'out',
    address: 0x01,
    timeout: 30_000,
    transfer: jest.fn((data: Buffer, callback: (error?: Error) => void) => {
      performOutTransfer(data, callback);
    }),
    makeTransfer: jest.fn(
      (
        _timeout: number,
        callback: (error: Error | undefined, data: Buffer, actualLength: number) => void
      ) => {
        let settled = false;
        const finish = (error: Error | undefined, data: Buffer) => {
          if (settled) return;
          settled = true;
          callback(error, data, data.length);
        };
        return {
          submit: jest.fn((data: Buffer) => {
            performOutTransfer(data, error => finish(error, data));
          }),
          cancel: jest.fn(() => {
            cancelledTransferCount += 1;
            finish(new Error('LIBUSB_TRANSFER_CANCELLED'), Buffer.alloc(0));
          }),
        };
      }
    ),
  };

  const iface = {
    descriptor: { bInterfaceClass: 0xff, bInterfaceNumber: 0 },
    endpoints: [epIn, epOut],
    claim: jest.fn(),
    release: jest.fn((closeEndpointsOrCallback: boolean | (() => void), callback?: () => void) => {
      if (typeof closeEndpointsOrCallback === 'function') closeEndpointsOrCallback();
      else callback?.();
    }),
    isKernelDriverActive: jest.fn(() => false),
    detachKernelDriver: jest.fn(),
  };

  const device = {
    busNumber: 1,
    deviceAddress: 2,
    timeout: 30_000,
    deviceDescriptor: {
      idVendor: 0x1209,
      idProduct: 0x4f4a,
      iSerialNumber: 1,
    },
    interfaces: [iface],
    open: jest.fn(),
    close: jest.fn(),
    getStringDescriptor: jest.fn(
      (_index: number, callback: (error?: Error, value?: string) => void) =>
        callback(undefined, path)
    ),
  };

  mockUsbDevices = [device];
  const transport = new NodeUsbTransport();
  transport.init({ debug: jest.fn(), error: jest.fn() });
  transport.configure(protocolV1Schema);
  transport.configureProtocolV2(protocolV2Schema);

  return {
    transport,
    path,
    device,
    iface,
    epIn,
    epOut,
    sentSeqs,
    getCancelledTransferCount: () => cancelledTransferCount,
    async acquire() {
      await transport.enumerate();
      await transport.acquire({ path, expectedProtocol: 'V2' });
    },
    failNextWrite(error: Error) {
      writeError = error;
    },
    holdRead(): PendingRead {
      let markStarted: () => void = () => undefined;
      const started = new Promise<void>(resolve => {
        markStarted = resolve;
      });
      const pending = { markStarted, started, callback: undefined };
      holdNextRead = pending;
      return {
        started,
        fail(error = new Error('read released after test')) {
          pending.callback?.(error);
        },
      };
    },
  };
};

describe('NodeUsbTransport Protocol V2 link lifecycle', () => {
  test('does not retry a native transfer cancelled by probe cleanup', () => {
    const { transport } = createHarness();

    expect((transport as any).isRetryableError(new Error('LIBUSB_TRANSFER_CANCELLED'))).toBe(false);
  });

  test('cancels pending native transfers before closing a timed-out protocol probe', async () => {
    const harness = createHarness();
    const { transport, path } = harness;
    await harness.acquire();
    const cancelActiveTransfers = jest.spyOn(transport as any, 'cancelActiveTransfers');
    const closeOpenDevice = jest.spyOn(transport as any, 'closeOpenDevice');

    await (transport as any).resetConnectionAfterProbe(path);

    expect(cancelActiveTransfers).toHaveBeenCalledWith(path);
    expect(closeOpenDevice).toHaveBeenCalledWith(path);
    expect(cancelActiveTransfers.mock.invocationCallOrder[0]).toBeLessThan(
      closeOpenDevice.mock.invocationCallOrder[0]
    );
  });

  test('stop releases an acquired USB interface even before a Protocol V2 call', async () => {
    const harness = createHarness();
    const { transport, path, device, iface } = harness;
    await transport.enumerate();
    await transport.acquire({ path, expectedProtocol: 'V2' });
    device.close.mockClear();
    iface.release.mockClear();

    await transport.stop();

    expect(iface.release).toHaveBeenCalledTimes(1);
    expect(device.close).toHaveBeenCalledTimes(1);
    expect(transport.getProtocolType(path)).toBeUndefined();
  });

  test('actively probes explicit Protocol V2 during bootloader reconnect', async () => {
    const harness = createHarness();
    const { transport, path, epOut } = harness;

    await transport.enumerate();
    await transport.acquire({ path, expectedProtocol: 'V2' });

    expect(epOut.makeTransfer).toHaveBeenCalledTimes(1);
    expect(transport.getProtocolType(path)).toBe('V2');
    await transport.release(path);
  });

  test('keeps seq across calls and actively probed reacquire', async () => {
    const harness = createHarness();
    const { transport, path, sentSeqs } = harness;

    await harness.acquire();
    await transport.call(path, 'Ping', { message: 'first' });
    await transport.release(path);
    await harness.acquire();
    await transport.call(path, 'Ping', { message: 'second' });

    expect(sentSeqs).toEqual([1, 2, 3, 4]);
    await transport.release(path);
  });

  test('does not resend a Protocol V2 frame after transferOut fails', async () => {
    const harness = createHarness();
    const { transport, path, epOut } = harness;
    await harness.acquire();
    epOut.makeTransfer.mockClear();
    harness.failNextWrite(new Error('LIBUSB_ERROR_IO'));

    await expect(transport.call(path, 'Ping', { message: 'write-failure' })).rejects.toThrow(
      'LIBUSB_ERROR_IO'
    );

    expect(epOut.makeTransfer).toHaveBeenCalledTimes(1);
  });

  test('rejects a pending read when release invalidates the link', async () => {
    const harness = createHarness();
    const { transport, path } = harness;
    await harness.acquire();
    const pendingRead = harness.holdRead();

    const call = transport.call(path, 'Ping', { message: 'pending' }, { timeoutMs: 5000 });
    const outcome = call.then(
      () => 'resolved',
      error => error.message
    );
    await pendingRead.started;
    await transport.release(path);
    const settled = await Promise.race([
      outcome,
      new Promise<string>(resolve => {
        setTimeout(() => resolve('still pending'), 50);
      }),
    ]);
    pendingRead.fail();

    expect(settled).not.toBe('still pending');
  });

  test('stop cancels an in-flight native USB transfer before releasing the interface', async () => {
    const harness = createHarness();
    const { transport, path } = harness;
    await harness.acquire();
    const pendingRead = harness.holdRead();

    const call = transport.call(path, 'Ping', { message: 'pending' }, { timeoutMs: 5000 });
    await pendingRead.started;
    await transport.stop();

    await expect(call).rejects.toThrow();
    expect(harness.getCancelledTransferCount()).toBe(1);
  });

  test('keeps the cursor after a response timeout rebuilds the USB connection', async () => {
    const harness = createHarness();
    const { transport, path, sentSeqs } = harness;
    await harness.acquire();
    const pendingRead = harness.holdRead();

    await expect(
      transport.call(path, 'Ping', { message: 'timeout' }, { timeoutMs: 20 })
    ).rejects.toThrow('20ms');
    pendingRead.fail();
    await harness.acquire();
    await transport.call(path, 'Ping', { message: 'after-timeout' });

    expect(sentSeqs).toEqual([1, 2, 3, 4]);
    await transport.release(path);
  });
});
