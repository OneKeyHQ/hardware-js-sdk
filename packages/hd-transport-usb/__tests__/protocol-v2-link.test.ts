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
  let writeError: Error | undefined;
  let holdNextRead:
    | {
        markStarted: () => void;
        started: Promise<void>;
        callback?: (error?: Error, data?: Buffer) => void;
      }
    | undefined;

  const epIn = {
    direction: 'in',
    address: 0x81,
    timeout: 30_000,
    transfer: jest.fn((_length: number, callback: (error?: Error, data?: Buffer) => void) => {
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
    }),
  };

  const epOut = {
    direction: 'out',
    address: 0x01,
    timeout: 30_000,
    transfer: jest.fn((data: Buffer, callback: (error?: Error) => void) => {
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
    }),
  };

  const iface = {
    descriptor: { bInterfaceClass: 0xff, bInterfaceNumber: 0 },
    endpoints: [epIn, epOut],
    claim: jest.fn(),
    release: jest.fn((callback: () => void) => callback()),
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
  test('keeps seq across probe, call and reacquire', async () => {
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
    epOut.transfer.mockClear();
    harness.failNextWrite(new Error('LIBUSB_ERROR_IO'));

    await expect(transport.call(path, 'Ping', { message: 'write-failure' })).rejects.toThrow(
      'LIBUSB_ERROR_IO'
    );

    expect(epOut.transfer).toHaveBeenCalledTimes(1);
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
