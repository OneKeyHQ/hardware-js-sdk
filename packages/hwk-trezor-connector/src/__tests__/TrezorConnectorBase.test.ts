import {
  DEVICE,
  EConnectorInteraction,
  HardwareErrorCode,
  UI_REQUEST,
  UI_RESPONSE,
  rehydrateConnectorError,
} from '@onekeyfe/hwk-adapter-core';
import { protobufManager } from '@onekeyfe/hwk-trezor-protobuf';
import { DefaultDefinitions } from '@onekeyfe/hwk-trezor-protobuf/hwk';
import { v1 as protocolV1 } from '@onekeyfe/hwk-trezor-protocol';
import { buildMessage, createChunks, receiveAndParse } from '@onekeyfe/hwk-trezor-transport/hwk';

import { TrezorConnectorBase } from '../index';

import type {
  TrezorByteTransport,
  TrezorDeviceSession,
  TrezorThpSessionOptions,
} from '@onekeyfe/hwk-trezor-core';
import type { ConnectorDevice } from '@onekeyfe/hwk-adapter-core';

class MemoryByteTransport implements TrezorByteTransport {
  readonly writes: Buffer[] = [];

  private readonly reads: Buffer[];

  constructor(reads: Buffer[]) {
    this.reads = [...reads];
  }

  async write(chunk: Buffer) {
    this.writes.push(chunk);
  }

  async read() {
    const next = this.reads.shift();
    if (!next) throw new Error('No queued read');
    return next;
  }
}

class TestTrezorConnector extends TrezorConnectorBase {
  readonly createdTransports: MemoryByteTransport[] = [];

  private readonly testDevices: ConnectorDevice[];

  private readonly queuedReads: Buffer[][];

  constructor(devices: ConnectorDevice[], queuedReads: Buffer[][]) {
    super({ connectionType: 'ble' });
    this.testDevices = devices;
    this.queuedReads = queuedReads;
  }

  protected async enumerateDevices() {
    return this.testDevices;
  }

  protected async createByteTransport() {
    const transport = new MemoryByteTransport(this.queuedReads.shift() ?? []);
    this.createdTransports.push(transport);
    return transport;
  }
}

class FakeDeviceSession {
  readonly calls: Array<{ name: string; data: Record<string, unknown> }> = [];

  readonly deviceStateCalls: Array<{ deriveCardano?: boolean }> = [];

  constructor(
    readonly transport: TrezorByteTransport,
    readonly features: Record<string, unknown>,
    private readonly responses: Array<{ type: string; message: Record<string, unknown> }> = []
  ) {}

  async initialize() {
    return this.features;
  }

  async call(name: string, data: Record<string, unknown>) {
    this.calls.push({ name, data });
    const next = this.responses.shift();
    if (!next) throw new Error(`No fake response queued for ${name}`);
    return next;
  }

  async withDeviceState<T>(fn: () => Promise<T>, options: { deriveCardano?: boolean } = {}) {
    this.deviceStateCalls.push(options);
    return fn();
  }
}

class SessionBackedTestTrezorConnector extends TrezorConnectorBase {
  readonly fakeSessions: FakeDeviceSession[] = [];

  readonly createdTransports: MemoryByteTransport[] = [];

  constructor(
    private readonly testDevices: ConnectorDevice[],
    private readonly features: Record<string, unknown>,
    private readonly responses: Array<{ type: string; message: Record<string, unknown> }> = []
  ) {
    super({
      connectionType: 'ble',
      deviceSessionFactory: ({ transport }) => {
        const session = new FakeDeviceSession(transport, this.features, [...this.responses]);
        this.fakeSessions.push(session);
        return session as unknown as TrezorDeviceSession;
      },
    });
  }

  protected async enumerateDevices() {
    return this.testDevices;
  }

  protected async createByteTransport() {
    const transport = new MemoryByteTransport([]);
    this.createdTransports.push(transport);
    return transport;
  }
}

const trezorFeatures = (overrides: Record<string, unknown> = {}) => ({
  vendor: 'trezor.io',
  device_id: 'device-1',
  model: 'T3W1',
  ...overrides,
});

describe('TrezorConnectorBase device resolution', () => {
  it('throws DeviceNotFound when a requested connectId is not discovered', async () => {
    const connector = new TestTrezorConnector([], []);

    await expect(connector.connect('missing-connect-id')).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceNotFound,
      message: 'Trezor device not found: missing-connect-id',
    });
  });

  it('emits interaction-complete when Trezor core reports a button interaction completed', async () => {
    let capturedThpOptions: TrezorThpSessionOptions | undefined;
    class ButtonCompleteTestConnector extends TrezorConnectorBase {
      constructor() {
        super({
          connectionType: 'ble',
          deviceSessionFactory: ({ transport, thp }) => {
            capturedThpOptions = thp;
            return new FakeDeviceSession(
              transport,
              trezorFeatures()
            ) as unknown as TrezorDeviceSession;
          },
        });
      }

      protected async enumerateDevices() {
        return [{ connectId: 'safe-7', deviceId: 'safe-7', name: 'Trezor Safe 7', model: 'T3W1' }];
      }

      protected async createByteTransport() {
        return new MemoryByteTransport([]);
      }
    }
    const connector = new ButtonCompleteTestConnector();
    const events: unknown[] = [];
    connector.on('ui-event', event => {
      events.push(event);
    });

    await connector.connect('safe-7');
    await capturedThpOptions?.onButtonRequestComplete?.({
      responseType: 'Address',
    });

    expect(events).toEqual([
      {
        type: EConnectorInteraction.InteractionComplete,
        payload: {
          sessionId: 'safe-7',
        },
      },
    ]);
  });

  it('rejects a WebUSB-selected OneKey device after features identify the wrong vendor', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [
        {
          connectId: 'ambiguous-webusb',
          deviceId: 'ambiguous-webusb',
          name: 'USB Device',
        },
      ],
      {
        vendor: 'trezor.io',
        device_id: 'onekey-device',
        label: 'OneKey Classic 1S',
        model: '1',
        fw_vendor: 'OneKey',
        product: 'classic1s',
        onekey_version: '3.19.0',
        onekey_device_type: 'CLASSIC1S',
      }
    );

    await expect(connector.connect('ambiguous-webusb')).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceMismatch,
      message: 'Selected device is not a supported Trezor device.',
    });
  });
});

describe('TrezorConnectorBase device settings', () => {
  it('dispatches ApplySettings and refreshes features', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'safe-7', deviceId: 'safe-7', name: 'Trezor Safe 7', model: 'T3W1' }],
      trezorFeatures({ haptic_feedback: false }),
      [
        { type: 'Success', message: { message: 'Success' } },
        { type: 'Features', message: trezorFeatures({ haptic_feedback: true }) },
      ]
    );

    const session = await connector.connect('safe-7');
    const result = await callConnector(connector, session.sessionId, 'deviceSettings', {
      haptic_feedback: true,
      use_passphrase: false,
    });

    expect(result).toEqual({ message: 'Success' });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'ApplySettings',
        data: { haptic_feedback: true, use_passphrase: false },
      },
      { name: 'GetFeatures', data: {} },
    ]);
  });

  it('dispatches SetBrightness separately from ApplySettings', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'safe-7', deviceId: 'safe-7', name: 'Trezor Safe 7', model: 'T3W1' }],
      trezorFeatures(),
      [
        { type: 'Success', message: { message: 'Success' } },
        { type: 'Features', message: trezorFeatures() },
      ]
    );

    const session = await connector.connect('safe-7');
    const result = await callConnector(connector, session.sessionId, 'setBrightness', {
      value: 128,
    });

    expect(result).toEqual({ message: 'Success' });
    expect(connector.fakeSessions[0].calls).toEqual([
      { name: 'SetBrightness', data: { value: 128 } },
      { name: 'GetFeatures', data: {} },
    ]);
  });

  it('dispatches ChangePin and WipeDevice as dedicated management calls', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'safe-7', deviceId: 'safe-7', name: 'Trezor Safe 7', model: 'T3W1' }],
      trezorFeatures(),
      [
        { type: 'Success', message: { message: 'Success' } },
        { type: 'Success', message: { message: 'Success' } },
      ]
    );

    const session = await connector.connect('safe-7');
    await callConnector(connector, session.sessionId, 'changePin', {
      remove: true,
    });
    await callConnector(connector, session.sessionId, 'wipeDevice', {});

    expect(connector.fakeSessions[0].calls).toEqual([
      { name: 'ChangePin', data: { remove: true } },
      { name: 'WipeDevice', data: {} },
    ]);
  });

  it('keeps management calls out of device-state scope', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'safe-7', deviceId: 'safe-7', name: 'Trezor Safe 7', model: 'T3W1' }],
      trezorFeatures(),
      [
        { type: 'Success', message: { message: 'Success' } },
        { type: 'Features', message: trezorFeatures({ label: 'After Settings' }) },
      ]
    );

    const session = await connector.connect('safe-7');
    await callConnector(connector, session.sessionId, 'deviceSettings', {
      label: 'After Settings',
    });

    expect(connector.fakeSessions[0].deviceStateCalls).toEqual([]);
  });
});

describe('TrezorConnectorBase device authenticity streaming', () => {
  it('keeps the legacy single-response proof as a firmware fallback', async () => {
    const proof = {
      optiga_certificates: ['aabb'],
      optiga_signature: 'ccdd',
      tropic_certificates: [],
      mcu_certificates: [],
    };
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'safe-3', deviceId: 'safe-3', name: 'Trezor Safe 3', model: 'T2B1' }],
      trezorFeatures({ internal_model: 'T2B1' }),
      [{ type: 'AuthenticityProof', message: proof }]
    );

    const session = await connector.connect('safe-3');
    await expect(
      callConnector(connector, session.sessionId, 'authenticateDevice', {
        challenge: 'ab'.repeat(32),
      })
    ).resolves.toEqual(proof);
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'AuthenticateDevice',
        data: { challenge: 'ab'.repeat(32), stream: true },
      },
    ]);
  });

  it('assembles every Optiga, Tropic, and MCU proof part from streamed chunks', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'safe-7', deviceId: 'safe-7', name: 'Trezor Safe 7', model: 'T3W1' }],
      trezorFeatures({ internal_model: 'T3W1' }),
      [
        {
          type: 'AuthenticityProofSizes',
          message: {
            optiga_certificates: [2],
            optiga_signature: 2,
            tropic_certificates: [2],
            tropic_signature: 2,
            mcu_certificates: [2],
            mcu_signature: 2,
          },
        },
        { type: 'AuthenticityProofChunk', message: { chunk: 'aabb' } },
        { type: 'AuthenticityProofChunk', message: { chunk: 'ccdd' } },
        { type: 'AuthenticityProofChunk', message: { chunk: '1122' } },
        { type: 'AuthenticityProofChunk', message: { chunk: '3344' } },
        { type: 'AuthenticityProofChunk', message: { chunk: '5566' } },
        { type: 'AuthenticityProofChunk', message: { chunk: '7788' } },
        { type: 'Success', message: { message: 'Success' } },
      ]
    );

    const session = await connector.connect('safe-7');
    await expect(
      callConnector(connector, session.sessionId, 'authenticateDevice', {
        challenge: 'ab'.repeat(32),
      })
    ).resolves.toEqual({
      optiga_certificates: ['aabb'],
      optiga_signature: 'ccdd',
      tropic_certificates: ['1122'],
      tropic_signature: '3344',
      mcu_certificates: ['5566'],
      mcu_signature: '7788',
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'AuthenticateDevice',
        data: { challenge: 'ab'.repeat(32), stream: true },
      },
      {
        name: 'GetAuthenticityProofChunk',
        data: { proof_type: 0, index: 0, offset: 0, size: 2 },
      },
      {
        name: 'GetAuthenticityProofChunk',
        data: { proof_type: 0, offset: 0, size: 2 },
      },
      {
        name: 'GetAuthenticityProofChunk',
        data: { proof_type: 1, index: 0, offset: 0, size: 2 },
      },
      {
        name: 'GetAuthenticityProofChunk',
        data: { proof_type: 1, offset: 0, size: 2 },
      },
      {
        name: 'GetAuthenticityProofChunk',
        data: { proof_type: 2, index: 0, offset: 0, size: 2 },
      },
      {
        name: 'GetAuthenticityProofChunk',
        data: { proof_type: 2, offset: 0, size: 2 },
      },
      {
        name: 'GetAuthenticityProofChunk',
        data: { offset: 0, size: 0 },
      },
    ]);
  });

  it('rejects an oversized certificate chain before requesting proof chunks', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'safe-7', deviceId: 'safe-7', name: 'Trezor Safe 7', model: 'T3W1' }],
      trezorFeatures({ internal_model: 'T3W1' }),
      [
        {
          type: 'AuthenticityProofSizes',
          message: {
            optiga_certificates: [1, 1, 1, 1, 1],
          },
        },
        { type: 'Success', message: { message: 'Success' } },
      ]
    );

    const session = await connector.connect('safe-7');
    await expect(
      callConnector(connector, session.sessionId, 'authenticateDevice', {
        challenge: 'ab'.repeat(32),
      })
    ).rejects.toThrow('too many certificates');
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'AuthenticateDevice',
        data: { challenge: 'ab'.repeat(32), stream: true },
      },
      {
        name: 'GetAuthenticityProofChunk',
        data: { offset: 0, size: 0 },
      },
    ]);
  });
});

const tronCapableFeatures = () => trezorFeatures({ capabilities: ['Capability_Tron'] });

const numericTronCapableFeatures = () => trezorFeatures({ capabilities: [24] });

async function callConnector(
  connector: TrezorConnectorBase,
  sessionId: string,
  method: string,
  params: unknown
): Promise<unknown> {
  const result = await connector.call(sessionId, method, params);
  if (result.success) return result.payload;
  throw rehydrateConnectorError(result.error);
}

const featuresResponse = (overrides: Record<string, unknown> = {}) => {
  const responseBytes = buildMessage({
    name: 'Features',
    data: {
      vendor: 'trezor.io',
      major_version: 2,
      minor_version: 8,
      patch_version: 10,
      device_id: 'device-1',
      label: 'Trezor Safe 5',
      model: 'T3T1',
      ...overrides,
    },
    protocol: protocolV1,
  });
  const [, responseChunkHeader] = protocolV1.getHeaders(responseBytes);
  return createChunks(responseBytes, responseChunkHeader, 64);
};

const ethereumAddressResponse = (address: string) => {
  const responseBytes = buildMessage({
    name: 'EthereumAddress',
    data: { address },
    protocol: protocolV1,
  });
  const [, responseChunkHeader] = protocolV1.getHeaders(responseBytes);
  return createChunks(responseBytes, responseChunkHeader, 64);
};

describe('TrezorConnectorBase', () => {
  protobufManager.load(DefaultDefinitions);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('discovers devices from the runtime implementation', async () => {
    const connector = new TestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      []
    );

    const devices = await connector.searchDevices();

    expect(devices).toEqual([
      expect.objectContaining({
        connectId: 'device-1',
        deviceId: 'device-1',
        name: 'Trezor Safe 5',
        model: 'T3T1',
      }),
    ]);
  });

  test('connects with Initialize and serves getFeatures from the session', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        device_id: 'device-1',
        label: 'Trezor Safe 7',
        model: 'Safe 7',
        internal_model: 'T3W1',
      }
    );
    const onConnect = jest.fn();
    const onSupportFeatures = jest.fn();
    connector.on('device-connect', onConnect);
    connector.on(DEVICE.FEATURES, onSupportFeatures);

    const session = await connector.connect('device-1');
    const features = await callConnector(connector, session.sessionId, 'getFeatures', {});

    expect(session).toEqual({
      sessionId: 'device-1',
      deviceInfo: expect.objectContaining({
        vendor: 'trezor',
        connectId: 'device-1',
        deviceId: 'device-1',
        model: 'T3W1',
        firmwareVersion: '2.8.10',
        label: 'Trezor Safe 7',
        connectionType: 'ble',
      }),
    });
    expect(features).toEqual(
      expect.objectContaining({
        device_id: 'device-1',
        model: 'Safe 7',
        internal_model: 'T3W1',
      })
    );
    expect(connector.fakeSessions).toHaveLength(1);
    expect(onConnect).toHaveBeenCalledWith({
      device: expect.objectContaining({ connectId: 'device-1', deviceId: 'device-1' }),
    });
    expect(onSupportFeatures).toHaveBeenNthCalledWith(1, {
      device: expect.objectContaining({
        connectId: 'device-1',
        deviceId: 'device-1',
        features: expect.objectContaining({
          device_id: 'device-1',
          model: 'Safe 7',
          internal_model: 'T3W1',
        }),
      }),
    });
    expect(onSupportFeatures).toHaveBeenNthCalledWith(2, {
      device: expect.objectContaining({
        connectId: 'device-1',
        deviceId: 'device-1',
        features: expect.objectContaining({
          device_id: 'device-1',
          model: 'Safe 7',
          internal_model: 'T3W1',
        }),
      }),
    });
  });

  test('connect resolves a known runtime id without running the UI search path', async () => {
    class UnlistedDeviceConnector extends SessionBackedTestTrezorConnector {
      readonly enumerateDevicesMock = jest.fn(async () => []);

      protected async enumerateDevices() {
        return this.enumerateDevicesMock();
      }

      protected resolveUnlistedDevice(deviceId: string): ConnectorDevice | undefined {
        return {
          connectId: deviceId,
          deviceId,
          name: 'Trezor Safe 7',
          model: 'T3W1',
          capabilities: { persistentDeviceIdentity: true },
        };
      }
    }

    const connector = new UnlistedDeviceConnector([], {
      vendor: 'trezor.io',
      major_version: 2,
      minor_version: 8,
      patch_version: 10,
      device_id: 'device-1',
      label: 'Trezor Safe 7',
      model: 'T3W1',
    });

    const session = await connector.connect('device-1');

    expect(session.deviceInfo).toEqual(
      expect.objectContaining({
        connectId: 'device-1',
        deviceId: 'device-1',
      })
    );
    expect(connector.enumerateDevicesMock).not.toHaveBeenCalled();
  });

  test('does not promote scan deviceId as firmware identity when features lack device_id', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [
        {
          connectId: 'A37803C61D8DCB1542D7AEE7',
          deviceId: 'A37803C61D8DCB1542D7AEE7',
          name: 'Trezor Safe 7',
          model: 'T3W1',
        },
      ],
      {
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        label: 'Trezor Safe 7',
        model: 'T3W1',
      }
    );

    const session = await connector.connect('A37803C61D8DCB1542D7AEE7');

    expect(session.deviceInfo).toEqual(
      expect.objectContaining({
        connectId: 'A37803C61D8DCB1542D7AEE7',
        deviceId: '',
      })
    );
  });

  test('btcGetPublicKey: returns xpub + HDNode fields', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'PublicKey',
          message: {
            xpub: 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz',
            node: {
              depth: 3,
              fingerprint: 0xdeadbeef,
              child_num: 2147483648,
              chain_code: 'cd'.repeat(32),
              public_key: '02'.repeat(33),
            },
            root_fingerprint: 0xc0ffee01,
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const result = await callConnector(connector, session.sessionId, 'btcGetPublicKey', {
      path: "m/84'/0'/0'",
      coin: 'Bitcoin',
      showOnDevice: false,
    });

    expect(result).toEqual({
      xpub: 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz',
      publicKey: '02'.repeat(33),
      fingerprint: 0xdeadbeef,
      chainCode: 'cd'.repeat(32),
      depth: 3,
      path: "m/84'/0'/0'",
    });
    expect(connector.fakeSessions[0].deviceStateCalls).toEqual([]);
  });

  test('btcSignMessage: returns MessageSignature', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'MessageSignature',
          message: { address: 'bc1qexample', signature: `H${'a'.repeat(87)}` },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const sig = await callConnector(connector, session.sessionId, 'btcSignMessage', {
      path: "m/44'/0'/0'/0/0",
      message: 'Hello Bitcoin',
      coin: 'Bitcoin',
    });

    expect(sig).toEqual({
      signature: `H${'a'.repeat(87)}`,
      address: 'bc1qexample',
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'SignMessage',
        data: {
          address_n: [2147483692, 2147483648, 2147483648, 0, 0],
          message: '48656c6c6f20426974636f696e',
          coin_name: 'Bitcoin',
          script_type: 'SPENDADDRESS',
        },
      },
    ]);
  });

  test('btcSignMessage: forwards no_script_type for Electrum-style signatures', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [{ type: 'MessageSignature', message: { signature: 'cafebabe', address: 'bc1qabc' } }]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'btcSignMessage', {
      path: "m/84'/0'/0'/0/0",
      message: 'Hello Bitcoin',
      coin: 'Bitcoin',
      noScriptType: true,
    });

    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'SignMessage',
        data: {
          address_n: [2147483732, 2147483648, 2147483648, 0, 0],
          message: '48656c6c6f20426974636f696e',
          coin_name: 'Bitcoin',
          script_type: 'SPENDWITNESS',
          no_script_type: true,
        },
      },
    ]);
  });

  test('btcSignMessage: preserves caller-provided hex payloads', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [{ type: 'MessageSignature', message: { signature: 'cafebabe', address: 'bc1qabc' } }]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'btcSignMessage', {
      path: "m/84'/0'/0'/0/0",
      message: '0x48656c6c6f',
      coin: 'Bitcoin',
      hex: true,
    });

    expect(connector.fakeSessions[0].calls[0].data).toEqual({
      address_n: [2147483732, 2147483648, 2147483648, 0, 0],
      message: '48656c6c6f',
      coin_name: 'Bitcoin',
      script_type: 'SPENDWITNESS',
    });
  });

  test('btcGetMasterFingerprint: derives 8-hex string from root_fingerprint', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'PublicKey',
          message: {
            xpub: 'xpub-irrelevant',
            node: {
              depth: 3,
              fingerprint: 0,
              child_num: 0,
              chain_code: '00'.repeat(32),
              public_key: '02'.repeat(33),
            },
            root_fingerprint: 0x0a1b2c3d,
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const result = await callConnector(connector, session.sessionId, 'btcGetMasterFingerprint', {});

    expect(result).toEqual({ masterFingerprint: '0a1b2c3d' });
  });

  test('btcSignTransaction: segwit input drives the modern TxAck flow', async () => {
    // Native-segwit input carries its own amount, so the device never asks for
    // the previous tx — just inputs/outputs, then the per-input signature.
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        { type: 'TxRequest', message: { request_type: 'TXINPUT', details: { request_index: 0 } } },
        { type: 'TxRequest', message: { request_type: 'TXOUTPUT', details: { request_index: 0 } } },
        { type: 'TxRequest', message: { request_type: 'TXOUTPUT', details: { request_index: 1 } } },
        {
          type: 'TxRequest',
          message: {
            request_type: 'TXINPUT',
            details: { request_index: 0 },
            serialized: { signature_index: 0, signature: 'ab'.repeat(32), serialized_tx: 'aa' },
          },
        },
        {
          type: 'TxRequest',
          message: { request_type: 'TXFINISHED', details: {}, serialized: { serialized_tx: 'bb' } },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signed = await callConnector(connector, session.sessionId, 'btcSignTransaction', {
      coin: 'Bitcoin',
      inputs: [
        {
          path: "m/84'/0'/0'/0/0",
          prevHash: 'cc'.repeat(32),
          prevIndex: 1,
          amount: '120000',
          scriptType: 'p2wpkh',
        },
      ],
      outputs: [
        { address: 'bc1qrecipient', amount: '100000' },
        { path: "m/84'/0'/0'/1/0", amount: '19000', scriptType: 'p2wpkh' },
      ],
    });

    expect(signed).toEqual({ serializedTx: 'aabb', signatures: ['ab'.repeat(32)] });

    const { calls } = connector.fakeSessions[0];
    expect(calls.map(c => c.name)).toEqual([
      'SignTx',
      'TxAckInput',
      'TxAckOutput',
      'TxAckOutput',
      'TxAckInput',
    ]);
    expect(calls[0].data).toEqual({
      coin_name: 'Bitcoin',
      inputs_count: 1,
      outputs_count: 2,
      version: 1,
    });
    expect(calls[1].data).toEqual({
      tx: {
        input: {
          address_n: [2147483732, 2147483648, 2147483648, 0, 0],
          prev_hash: 'cc'.repeat(32),
          prev_index: 1,
          amount: '120000',
          script_type: 'SPENDWITNESS',
        },
      },
    });
    // External recipient output
    expect(calls[2].data).toEqual({
      tx: { output: { address: 'bc1qrecipient', amount: '100000', script_type: 'PAYTOADDRESS' } },
    });
    // Internal change output uses the PAYTO* enum + an address_n path
    expect(calls[3].data).toEqual({
      tx: {
        output: {
          address_n: [2147483732, 2147483648, 2147483648, 1, 0],
          amount: '19000',
          script_type: 'PAYTOWITNESS',
        },
      },
    });
  });

  test('btcSignTransaction: forwards current transaction fork fields in SignTx', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'TxRequest',
          message: { request_type: 'TXFINISHED', details: {}, serialized: { serialized_tx: 'aa' } },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'btcSignTransaction', {
      coin: 'Zcash',
      version: 4,
      locktime: 800001,
      timestamp: 123,
      expiry: 456,
      versionGroupId: 0x892f2085,
      branchId: 0xbb09b876,
      inputs: [
        {
          path: "m/44'/133'/0'/0/0",
          prevHash: 'cc'.repeat(32),
          prevIndex: 1,
          amount: '120000',
          scriptType: 'p2pkh',
        },
      ],
      outputs: [{ address: 't1recipient', amount: '100000' }],
    });

    expect(connector.fakeSessions[0].calls[0].data).toEqual({
      coin_name: 'Zcash',
      inputs_count: 1,
      outputs_count: 1,
      version: 4,
      lock_time: 800001,
      timestamp: 123,
      expiry: 456,
      version_group_id: 0x892f2085,
      branch_id: 0xbb09b876,
    });
  });

  test('btcSignTransaction maps OP_RETURN outputs for Trezor SignTx', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        { type: 'TxRequest', message: { request_type: 'TXINPUT', details: { request_index: 0 } } },
        { type: 'TxRequest', message: { request_type: 'TXOUTPUT', details: { request_index: 0 } } },
        { type: 'TxRequest', message: { request_type: 'TXOUTPUT', details: { request_index: 1 } } },
        {
          type: 'TxRequest',
          message: {
            request_type: 'TXFINISHED',
            details: {},
            serialized: { serialized_tx: 'aa' },
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'btcSignTransaction', {
      coin: 'Testnet',
      inputs: [
        {
          path: "m/84'/1'/0'/0/0",
          prevHash: 'cc'.repeat(32),
          prevIndex: 1,
          amount: '120000',
          scriptType: 'p2wpkh',
        },
      ],
      outputs: [
        { opReturnData: 'deadbeef', amount: '0' },
        { path: "m/84'/1'/0'/1/0", amount: '119000', scriptType: 'p2wpkh' },
      ],
    });

    expect(connector.fakeSessions[0].calls[2].data).toEqual({
      tx: {
        output: {
          op_return_data: 'deadbeef',
          amount: '0',
          script_type: 'PAYTOOPRETURN',
        },
      },
    });
  });

  test('btcSignTransaction: legacy input pulls prev-tx meta/inputs/outputs', async () => {
    // p2pkh (legacy) input → device verifies the amount by walking the full
    // previous transaction: TXMETA, then its inputs and outputs.
    const PREV_HASH = 'aabbccdd';
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        { type: 'TxRequest', message: { request_type: 'TXINPUT', details: { request_index: 0 } } },
        {
          type: 'TxRequest',
          message: { request_type: 'TXMETA', details: { request_index: 0, tx_hash: PREV_HASH } },
        },
        {
          type: 'TxRequest',
          message: { request_type: 'TXINPUT', details: { request_index: 0, tx_hash: PREV_HASH } },
        },
        {
          type: 'TxRequest',
          message: { request_type: 'TXOUTPUT', details: { request_index: 0, tx_hash: PREV_HASH } },
        },
        { type: 'TxRequest', message: { request_type: 'TXOUTPUT', details: { request_index: 0 } } },
        {
          type: 'TxRequest',
          message: {
            request_type: 'TXINPUT',
            details: { request_index: 0 },
            serialized: { signature_index: 0, signature: 'dd'.repeat(32), serialized_tx: '0100' },
          },
        },
        {
          type: 'TxRequest',
          message: {
            request_type: 'TXFINISHED',
            details: {},
            serialized: { serialized_tx: 'ffff' },
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signed = await callConnector(connector, session.sessionId, 'btcSignTransaction', {
      coin: 'Bitcoin',
      inputs: [
        {
          path: "m/44'/0'/0'/0/0",
          prevHash: PREV_HASH,
          prevIndex: 0,
          amount: '90000',
          scriptType: 'p2pkh',
        },
      ],
      outputs: [{ address: '1Recipient', amount: '80000' }],
      refTxs: [
        {
          hash: PREV_HASH,
          version: 1,
          inputs: [
            { prevHash: '11'.repeat(32), prevIndex: 0, script: 'deadbeef', sequence: 0xffffffff },
          ],
          outputs: [{ amount: '90000', scriptPubKey: `76a914${'00'.repeat(20)}88ac` }],
          locktime: 0,
        },
      ],
    });

    expect(signed).toEqual({ serializedTx: '0100ffff', signatures: ['dd'.repeat(32)] });

    const { calls } = connector.fakeSessions[0];
    expect(calls.map(c => c.name)).toEqual([
      'SignTx',
      'TxAckInput',
      'TxAckPrevMeta',
      'TxAckPrevInput',
      'TxAckPrevOutput',
      'TxAckOutput',
      'TxAckInput',
    ]);
    expect(calls[1].data).toEqual({
      tx: {
        input: {
          address_n: [2147483692, 2147483648, 2147483648, 0, 0],
          prev_hash: PREV_HASH,
          prev_index: 0,
          amount: '90000',
          script_type: 'SPENDADDRESS',
        },
      },
    });
    expect(calls[2].data).toEqual({
      tx: { version: 1, lock_time: 0, inputs_count: 1, outputs_count: 1 },
    });
    expect(calls[3].data).toEqual({
      tx: {
        input: {
          prev_hash: '11'.repeat(32),
          prev_index: 0,
          script_sig: 'deadbeef',
          sequence: 0xffffffff,
        },
      },
    });
    expect(calls[4].data).toEqual({
      tx: { output: { amount: '90000', script_pubkey: `76a914${'00'.repeat(20)}88ac` } },
    });
    expect(calls[5].data).toEqual({
      tx: { output: { address: '1Recipient', amount: '80000', script_type: 'PAYTOADDRESS' } },
    });
  });

  test('btcSignTransaction: replies with prev extra data chunks when requested', async () => {
    const PREV_HASH = 'ffeeccdd';
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'TxRequest',
          message: { request_type: 'TXMETA', details: { request_index: 0, tx_hash: PREV_HASH } },
        },
        {
          type: 'TxRequest',
          message: {
            request_type: 'TXEXTRADATA',
            details: {
              tx_hash: PREV_HASH,
              extra_data_offset: 1,
              extra_data_len: 3,
            },
          },
        },
        {
          type: 'TxRequest',
          message: { request_type: 'TXFINISHED', details: {}, serialized: { serialized_tx: 'aa' } },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'btcSignTransaction', {
      coin: 'Zcash',
      inputs: [
        {
          path: "m/44'/133'/0'/0/0",
          prevHash: PREV_HASH,
          prevIndex: 0,
          amount: '90000',
          scriptType: 'p2pkh',
        },
      ],
      outputs: [{ address: 't1Recipient', amount: '80000' }],
      refTxs: [
        {
          hash: PREV_HASH,
          version: 4,
          inputs: [
            { prevHash: '11'.repeat(32), prevIndex: 0, script: 'deadbeef', sequence: 0xffffffff },
          ],
          outputs: [{ amount: '90000', scriptPubKey: `76a914${'00'.repeat(20)}88ac` }],
          locktime: 0,
          extraData: '001122334455',
          timestamp: 123,
          expiry: 456,
          versionGroupId: 0x892f2085,
          branchId: 0xbb09b876,
        },
      ],
    });

    const { calls } = connector.fakeSessions[0];
    expect(calls[1]).toEqual({
      name: 'TxAckPrevMeta',
      data: {
        tx: {
          version: 4,
          lock_time: 0,
          inputs_count: 1,
          outputs_count: 1,
          extra_data_len: 6,
          timestamp: 123,
          expiry: 456,
          version_group_id: 0x892f2085,
          branch_id: 0xbb09b876,
        },
      },
    });
    expect(calls[2]).toEqual({
      name: 'TxAckPrevExtraData',
      data: {
        tx: {
          extra_data_chunk: '112233',
        },
      },
    });
  });

  test('btcSignTransaction: replies with SLIP-24 payment requests when requested', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        { type: 'TxRequest', message: { request_type: 'TXOUTPUT', details: { request_index: 0 } } },
        {
          type: 'TxRequest',
          message: { request_type: 'TXPAYMENTREQ', details: { request_index: 0 } },
        },
        {
          type: 'TxRequest',
          message: { request_type: 'TXFINISHED', details: {}, serialized: { serialized_tx: 'aa' } },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'btcSignTransaction', {
      coin: 'Bitcoin',
      inputs: [
        {
          path: "m/84'/0'/0'/0/0",
          prevHash: 'cc'.repeat(32),
          prevIndex: 1,
          amount: '120000',
          scriptType: 'p2wpkh',
        },
      ],
      outputs: [
        {
          address: 'bc1qrecipient',
          amount: '100000',
          paymentReqIndex: 0,
        },
      ],
      paymentRequests: [
        {
          nonce: 'nonce-1',
          recipientName: 'Merchant',
          amount: '100000',
          signature: 'ab'.repeat(64),
          memos: [{ textMemo: { text: 'order #1' } }],
        },
      ],
    });

    const { calls } = connector.fakeSessions[0];
    expect(calls[1]).toEqual({
      name: 'TxAckOutput',
      data: {
        tx: {
          output: {
            address: 'bc1qrecipient',
            amount: '100000',
            script_type: 'PAYTOADDRESS',
            payment_req_index: 0,
          },
        },
      },
    });
    expect(calls[2]).toEqual({
      name: 'PaymentRequest',
      data: {
        nonce: 'nonce-1',
        recipient_name: 'Merchant',
        amount: 'a086010000000000',
        signature: 'ab'.repeat(64),
        memos: [{ text_memo: { text: 'order #1' } }],
      },
    });
  });

  test('btcSignTransaction: replies with original transaction inputs and outputs for RBF verification', async () => {
    const ORIG_HASH = 'aa'.repeat(32);
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        { type: 'TxRequest', message: { request_type: 'TXINPUT', details: { request_index: 0 } } },
        { type: 'TxRequest', message: { request_type: 'TXOUTPUT', details: { request_index: 0 } } },
        {
          type: 'TxRequest',
          message: {
            request_type: 'TXORIGINPUT',
            details: { tx_hash: ORIG_HASH, request_index: 0 },
          },
        },
        {
          type: 'TxRequest',
          message: {
            request_type: 'TXORIGOUTPUT',
            details: { tx_hash: ORIG_HASH, request_index: 0 },
          },
        },
        {
          type: 'TxRequest',
          message: { request_type: 'TXFINISHED', details: {}, serialized: { serialized_tx: 'aa' } },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'btcSignTransaction', {
      coin: 'Bitcoin',
      inputs: [
        {
          path: "m/84'/0'/0'/0/0",
          prevHash: 'bb'.repeat(32),
          prevIndex: 1,
          amount: '120000',
          scriptType: 'p2wpkh',
          origHash: ORIG_HASH,
          origIndex: 0,
        },
      ],
      outputs: [
        {
          address: 'bc1qrecipient',
          amount: '100000',
          origHash: ORIG_HASH,
          origIndex: 0,
        },
      ],
      refTxs: [
        {
          hash: ORIG_HASH,
          version: 2,
          inputs: [],
          outputs: [],
          locktime: 0,
          origInputs: [
            {
              path: "m/84'/0'/0'/0/0",
              prevHash: 'cc'.repeat(32),
              prevIndex: 0,
              amount: '120000',
              sequence: 0xfffffffd,
              scriptType: 'p2wpkh',
              scriptSig: '00',
              witness: '11',
            },
          ],
          origOutputs: [
            {
              path: "m/84'/0'/0'/1/0",
              amount: '100000',
              scriptType: 'p2wpkh',
            },
          ],
        },
      ],
    });

    const { calls } = connector.fakeSessions[0];
    expect(calls[1].data).toEqual({
      tx: {
        input: expect.objectContaining({
          orig_hash: ORIG_HASH,
          orig_index: 0,
        }),
      },
    });
    expect(calls[2].data).toEqual({
      tx: {
        output: expect.objectContaining({
          orig_hash: ORIG_HASH,
          orig_index: 0,
        }),
      },
    });
    expect(calls[3]).toEqual({
      name: 'TxAckInput',
      data: {
        tx: {
          input: {
            address_n: [2147483732, 2147483648, 2147483648, 0, 0],
            prev_hash: 'cc'.repeat(32),
            prev_index: 0,
            amount: '120000',
            sequence: 0xfffffffd,
            script_type: 'SPENDWITNESS',
            script_sig: '00',
            witness: '11',
          },
        },
      },
    });
    expect(calls[4]).toEqual({
      name: 'TxAckOutput',
      data: {
        tx: {
          output: {
            address_n: [2147483732, 2147483648, 2147483648, 1, 0],
            amount: '100000',
            script_type: 'PAYTOWITNESS',
          },
        },
      },
    });
  });

  test('btcSignTransaction rejects malformed signature chunks from TxRequest', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'TxRequest',
          message: {
            request_type: 'TXINPUT',
            details: { request_index: 0 },
            serialized: { signature_index: 0 },
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'btcSignTransaction', {
        coin: 'Bitcoin',
        inputs: [
          {
            path: "m/84'/0'/0'/0/0",
            prevHash: 'cc'.repeat(32),
            prevIndex: 1,
            amount: '120000',
            scriptType: 'p2wpkh',
          },
        ],
        outputs: [{ address: 'bc1qrecipient', amount: '100000' }],
      })
    ).rejects.toThrow('Unexpected null in trezor:TxRequestSerialized signature');
  });

  test('btcSignPsbt: still surfaces MethodNotSupported (no Trezor SignPsbt message)', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      []
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'btcSignPsbt', { psbt: 'cHNidP8...' })
    ).rejects.toMatchObject({ code: 10004 });
    expect(connector.fakeSessions[0].deviceStateCalls).toEqual([]);
  });

  test('btcSignMessage: reports invalid params with HardwareErrorCode.InvalidParams', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      []
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'btcSignMessage', {
        path: "m/84'/0'/0'/0/0",
        message: 'not-hex',
        hex: true,
      })
    ).rejects.toMatchObject({ code: HardwareErrorCode.InvalidParams });
    expect(connector.fakeSessions[0].deviceStateCalls).toEqual([]);
  });

  test('tronGetAddress: returns TronAddress payload', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      tronCapableFeatures(),
      [{ type: 'TronAddress', message: { address: 'TXyZabcDefGhIjkLmnOpqRstUvWxYz1234' } }]
    );

    const session = await connector.connect('device-1');
    const address = await callConnector(connector, session.sessionId, 'tronGetAddress', {
      path: "m/44'/195'/0'/0/0",
      showOnDevice: true,
    });

    expect(address).toEqual({
      address: 'TXyZabcDefGhIjkLmnOpqRstUvWxYz1234',
      path: "m/44'/195'/0'/0/0",
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'TronGetAddress',
        data: {
          address_n: [2147483692, 2147483843, 2147483648, 0, 0],
          show_display: true,
        },
      },
    ]);
  });

  test('tronGetAddress: fails before device call when Capability_Tron is missing', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      trezorFeatures({ capabilities: ['Capability_Bitcoin', 'Capability_Ethereum'] }),
      [{ type: 'TronAddress', message: { address: 'TXyZabcDefGhIjkLmnOpqRstUvWxYz1234' } }]
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'tronGetAddress', {
        path: "m/44'/195'/0'/0/0",
        showOnDevice: false,
      })
    ).rejects.toMatchObject({ code: 10004 });
    expect(connector.fakeSessions[0].calls).toEqual([]);
  });

  test('tronGetAddress: accepts numeric Capability_Tron from protobuf decode', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      numericTronCapableFeatures(),
      [{ type: 'TronAddress', message: { address: 'TXyZabcDefGhIjkLmnOpqRstUvWxYz1234' } }]
    );

    const session = await connector.connect('device-1');
    const address = await callConnector(connector, session.sessionId, 'tronGetAddress', {
      path: "m/44'/195'/0'/0/0",
      showOnDevice: false,
    });

    expect(address).toEqual({
      address: 'TXyZabcDefGhIjkLmnOpqRstUvWxYz1234',
      path: "m/44'/195'/0'/0/0",
    });
    expect(connector.fakeSessions[0].calls).toHaveLength(1);
  });

  test('tronSignTransaction: two-step TransferContract flow', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      tronCapableFeatures(),
      [
        { type: 'TronContractRequest', message: {} },
        { type: 'TronSignature', message: { signature: 'ab'.repeat(65) } },
      ]
    );

    const session = await connector.connect('device-1');
    const signed = await callConnector(connector, session.sessionId, 'tronSignTransaction', {
      path: "m/44'/195'/0'/0/0",
      ownerAddress: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
      refBlockBytes: 'e942',
      refBlockHash: '6394747da9fee421',
      expiration: 1700000000000,
      timestamp: 1699999000000,
      feeLimit: 10000000,
      contract: {
        transferContract: {
          toAddress: '4141f82674a30ae1328745d08afe2d1a0a24195283',
          amount: '18123456',
        },
      },
    });

    expect((signed as { signature: string }).signature).toBe('ab'.repeat(65));
    // The host re-encodes raw_data from the signed fields; it must decode back
    // to the same block ref + a single contract (the signature covers exactly this).
    const reconstructed = (signed as { serializedTx?: string }).serializedTx;
    expect(typeof reconstructed).toBe('string');
    const decodedRaw = protobufManager.decode(
      'TronRawTransaction',
      Buffer.from(reconstructed as string, 'hex')
    ).message as { ref_block_bytes?: string; contract?: unknown[] };
    expect(decodedRaw.ref_block_bytes).toBe('e942');
    expect(decodedRaw.contract?.length).toBe(1);
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'TronSignTx',
        data: {
          address_n: [2147483692, 2147483843, 2147483648, 0, 0],
          ref_block_bytes: 'e942',
          ref_block_hash: '6394747da9fee421',
          expiration: 1700000000000,
          timestamp: 1699999000000,
          fee_limit: 10000000,
        },
      },
      {
        name: 'TronTransferContract',
        data: {
          owner_address: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
          to_address: '4141f82674a30ae1328745d08afe2d1a0a24195283',
          amount: '18123456',
        },
      },
    ]);
  });

  test('tronSignTransaction: returns signature when host-side raw_data reconstruction fails', async () => {
    const originalEncode = protobufManager.encode.bind(protobufManager);
    jest.spyOn(protobufManager, 'encode').mockImplementation((messageName, data) => {
      if (messageName === 'TronTransferContract') {
        throw new Error('Schema TronTransferContract not found');
      }
      return originalEncode(messageName, data);
    });

    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      tronCapableFeatures(),
      [
        { type: 'TronContractRequest', message: {} },
        { type: 'TronSignature', message: { signature: 'ab'.repeat(65) } },
      ]
    );

    const session = await connector.connect('device-1');
    const signed = await callConnector(connector, session.sessionId, 'tronSignTransaction', {
      path: "m/44'/195'/0'/0/0",
      ownerAddress: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
      refBlockBytes: 'e942',
      refBlockHash: '6394747da9fee421',
      expiration: 1700000000000,
      timestamp: 1699999000000,
      contract: {
        transferContract: {
          toAddress: '4141f82674a30ae1328745d08afe2d1a0a24195283',
          amount: '18123456',
        },
      },
    });

    expect(signed).toEqual({ signature: 'ab'.repeat(65) });
    expect(connector.fakeSessions[0].calls.map(call => call.name)).toEqual([
      'TronSignTx',
      'TronTransferContract',
    ]);
  });

  test('tronSignTransaction: coerces a numeric amount to a uint64 decimal string', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      tronCapableFeatures(),
      [
        { type: 'TronContractRequest', message: {} },
        { type: 'TronSignature', message: { signature: 'cd'.repeat(65) } },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'tronSignTransaction', {
      path: "m/44'/195'/0'/0/0",
      ownerAddress: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
      refBlockBytes: 'e942',
      refBlockHash: '6394747da9fee421',
      expiration: 1700000000000,
      timestamp: 1699999000000,
      contract: {
        transferContract: {
          toAddress: '4141f82674a30ae1328745d08afe2d1a0a24195283',
          amount: 18123456, // number in → string out (protobuf uint64 wants a string)
        },
      },
    });

    const contractCall = connector.fakeSessions[0].calls[1];
    expect(contractCall.name).toBe('TronTransferContract');
    expect(contractCall.data.amount).toBe('18123456');
  });

  test('tronSignTransaction: maps freeze resource into an encodable protobuf enum', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      tronCapableFeatures(),
      [
        { type: 'TronContractRequest', message: {} },
        { type: 'TronSignature', message: { signature: '12'.repeat(65) } },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'tronSignTransaction', {
      path: "m/44'/195'/0'/0/0",
      ownerAddress: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
      refBlockBytes: 'e942',
      refBlockHash: '6394747da9fee421',
      expiration: 1700000000000,
      timestamp: 1699999000000,
      contract: {
        freezeBalanceV2Contract: {
          balance: 1_000_000,
          resource: 'ENERGY',
        },
      },
    });

    const contractCall = connector.fakeSessions[0].calls[1];
    expect(contractCall).toEqual({
      name: 'TronFreezeBalanceV2Contract',
      data: {
        owner_address: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
        balance: 1_000_000,
        resource: 'ENERGY',
      },
    });
    expect(() =>
      protobufManager.encode('TronFreezeBalanceV2Contract', contractCall.data)
    ).not.toThrow();
  });

  test('tronSignTransaction: rejects an amount that overflows 2^53', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      tronCapableFeatures(),
      [{ type: 'TronContractRequest', message: {} }]
    );

    const session = await connector.connect('device-1');
    // 1e17 sun is a valid TRON amount but > Number.MAX_SAFE_INTEGER — must be a string.
    await expect(
      callConnector(connector, session.sessionId, 'tronSignTransaction', {
        path: "m/44'/195'/0'/0/0",
        ownerAddress: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
        refBlockBytes: 'e942',
        refBlockHash: '6394747da9fee421',
        expiration: 1700000000000,
        timestamp: 1699999000000,
        contract: {
          transferContract: {
            toAddress: '4141f82674a30ae1328745d08afe2d1a0a24195283',
            amount: 1e17,
          },
        },
      })
    ).rejects.toThrow(/safe integer|precision/i);

    // A big amount passed as a decimal string survives precisely.
    const connector2 = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      tronCapableFeatures(),
      [
        { type: 'TronContractRequest', message: {} },
        { type: 'TronSignature', message: { signature: 'ef'.repeat(65) } },
      ]
    );
    const session2 = await connector2.connect('device-1');
    await callConnector(connector2, session2.sessionId, 'tronSignTransaction', {
      path: "m/44'/195'/0'/0/0",
      ownerAddress: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
      refBlockBytes: 'e942',
      refBlockHash: '6394747da9fee421',
      expiration: 1700000000000,
      timestamp: 1699999000000,
      contract: {
        transferContract: {
          toAddress: '4141f82674a30ae1328745d08afe2d1a0a24195283',
          amount: '100000000000000000', // 1e17 as string — preserved exactly
        },
      },
    });
    expect(connector2.fakeSessions[0].calls[1].data.amount).toBe('100000000000000000');
  });

  test('tronSignMessage: surfaces MethodNotSupported (Trezor firmware lacks it)', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      []
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'tronSignMessage', {
        path: "m/44'/195'/0'/0/0",
        messageHex: 'deadbeef',
      })
    ).rejects.toMatchObject({ code: 10004 });
    await expect(
      callConnector(connector, session.sessionId, 'tronSignMessage', {
        path: "m/44'/195'/0'/0/0",
        messageHex: 'deadbeef',
      })
    ).rejects.toThrow(/only tronGetAddress and tronSignTransaction are available/i);
    expect(connector.fakeSessions[0].deviceStateCalls).toEqual([]);
  });

  test('tronSignTransaction: reports unsupported contracts with MethodNotSupported', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      tronCapableFeatures(),
      []
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'tronSignTransaction', {
        path: "m/44'/195'/0'/0/0",
        ownerAddress: '41f2cd810c48c401d392ead3c6e1e1cb9f57750a58',
        refBlockBytes: 'e942',
        refBlockHash: '6394747da9fee421',
        expiration: 1700000000000,
        timestamp: 1699999000000,
        contract: {
          delegateResourceContract: {
            balance: '1000000',
          },
        },
      })
    ).rejects.toMatchObject({ code: HardwareErrorCode.MethodNotSupported });
    expect(connector.fakeSessions[0].calls).toEqual([]);
  });

  test('solGetAddress: returns SolanaAddress payload', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [{ type: 'SolanaAddress', message: { address: 'SoLAnAaDdR3sS' } }]
    );

    const session = await connector.connect('device-1');
    const address = await callConnector(connector, session.sessionId, 'solGetAddress', {
      path: "m/44'/501'/0'/0'",
      showOnDevice: false,
    });

    expect(address).toEqual({ address: 'SoLAnAaDdR3sS', path: "m/44'/501'/0'/0'" });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'SolanaGetAddress',
        data: {
          address_n: [2147483692, 2147484149, 2147483648, 2147483648],
          show_display: false,
        },
      },
    ]);
  });

  test('solSignTransaction: ships serialized_tx + additional_info', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [{ type: 'SolanaTxSignature', message: { signature: 'beef'.repeat(16) } }]
    );

    const session = await connector.connect('device-1');
    const signed = await callConnector(connector, session.sessionId, 'solSignTransaction', {
      path: "m/44'/501'/0'/0'",
      serializedTx: '0xabcd1234',
      additionalInfo: {
        tokenAccountsInfos: [
          {
            baseAddress: 'base',
            tokenProgram: 'prog',
            tokenMint: 'mint',
            tokenAccount: 'acct',
          },
        ],
      },
    });

    expect(signed).toEqual({ signature: 'beef'.repeat(16) });
    expect(connector.fakeSessions[0].calls[0]).toEqual({
      name: 'SolanaSignTx',
      data: {
        address_n: [2147483692, 2147484149, 2147483648, 2147483648],
        serialized_tx: 'abcd1234',
        additional_info: {
          token_accounts_infos: [
            {
              base_address: 'base',
              token_program: 'prog',
              token_mint: 'mint',
              token_account: 'acct',
            },
          ],
        },
      },
    });
    // Option A: token definitions are caller-injected; the SDK never fetches.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('solSignTransaction: converts hex encoded token definition to device bytes', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [{ type: 'SolanaTxSignature', message: { signature: '11'.repeat(64) } }]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'solSignTransaction', {
      path: "m/44'/501'/0'/0'",
      serializedTx: '0xabcd1234',
      additionalInfo: {
        encodedToken: '010203',
        tokenAccountsInfos: [
          {
            baseAddress: 'base111',
            tokenProgram: 'program111',
            tokenMint: 'mint111',
            tokenAccount: 'account111',
          },
        ],
      },
    });

    const encodedToken = connector.fakeSessions[0].calls[0].data.additional_info
      .encoded_token as ArrayBuffer;
    expect(connector.fakeSessions[0].calls[0]).toEqual({
      name: 'SolanaSignTx',
      data: {
        address_n: [2147483692, 2147484149, 2147483648, 2147483648],
        serialized_tx: 'abcd1234',
        additional_info: {
          encoded_token: expect.any(ArrayBuffer),
          token_accounts_infos: [
            {
              base_address: 'base111',
              token_program: 'program111',
              token_mint: 'mint111',
              token_account: 'account111',
            },
          ],
        },
      },
    });
    expect(Buffer.from(encodedToken).toString('hex')).toBe('010203');
  });

  test('solSignTransaction: never fetches a token definition; omits encoded_token when caller omits it', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [{ type: 'SolanaTxSignature', message: { signature: '22'.repeat(64) } }]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'solSignTransaction', {
      path: "m/44'/501'/0'/0'",
      serializedTx: '0xabcd1234',
      additionalInfo: {
        tokenAccountsInfos: [
          {
            baseAddress: 'base111',
            tokenProgram: 'program111',
            tokenMint: 'Mint111111111111111111111111111111111111111',
            tokenAccount: 'account111',
          },
        ],
      },
    });

    // Option A: no network fetch, and no encoded_token when the caller omits it.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (connector.fakeSessions[0].calls[0].data.additional_info as Record<string, unknown>)
        .encoded_token
    ).toBeUndefined();
  });

  test('solSignMessage: surfaces MethodNotSupported (Trezor firmware lacks it)', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      []
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'solSignMessage', {
        path: "m/44'/501'/0'/0'",
        message: 'deadbeef',
      })
    ).rejects.toMatchObject({ code: 10004 });
    expect(connector.fakeSessions[0].deviceStateCalls).toEqual([]);
  });

  test('solGetAddress: reports invalid params with HardwareErrorCode.InvalidParams', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      []
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'solGetAddress', {
        path: 'm//',
      })
    ).rejects.toMatchObject({ code: HardwareErrorCode.InvalidParams });
    expect(connector.fakeSessions[0].deviceStateCalls).toEqual([]);
    expect(connector.fakeSessions[0].calls).toEqual([]);
  });

  test('signs EIP-712 typed data in hash mode', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'aabbcc', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signature = await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      mode: 'hash',
      domainSeparatorHash: `0x${'11'.repeat(32)}`,
      messageHash: `0x${'22'.repeat(32)}`,
    });

    expect(signature).toEqual({
      signature: '0xaabbcc',
      address: '0xabc',
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'EthereumSignTypedHash',
        data: {
          address_n: [2147483692, 2147483708, 2147483648, 0, 0],
          domain_separator_hash: '11'.repeat(32),
          message_hash: '22'.repeat(32),
        },
      },
    ]);
  });

  test('EVM typed-hash signing forwards static Ethereum network definition', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'aabbcc', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      mode: 'hash',
      domainSeparatorHash: `0x${'11'.repeat(32)}`,
      messageHash: `0x${'22'.repeat(32)}`,
      ethereumDefinitions: {
        encodedNetwork: '0a0101',
      },
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumSignTypedHash',
      data: {
        encoded_network: expect.any(ArrayBuffer),
      },
    });
    expect(
      Buffer.from(connector.fakeSessions[0].calls[0].data.encoded_network as ArrayBuffer).toString(
        'hex'
      )
    ).toBe('0a0101');
  });

  test('EVM typed-hash signing never fetches definitions; omits encoded_network when caller omits them', async () => {
    const fetchMock = jest.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'aabbcc', address: '0xabc' },
        },
      ]
    );

    try {
      const session = await connector.connect('device-1');
      await callConnector(connector, session.sessionId, 'evmSignTypedData', {
        path: "m/44'/60'/0'/0/0",
        mode: 'hash',
        chainId: 42,
        domainSeparatorHash: `0x${'11'.repeat(32)}`,
        messageHash: `0x${'22'.repeat(32)}`,
      });

      // Option A: the SDK never reaches the network for definitions.
      expect(fetchMock).not.toHaveBeenCalled();
      expect(connector.fakeSessions[0].calls[0].name).toBe('EthereumSignTypedHash');
      expect(connector.fakeSessions[0].calls[0].data.encoded_network).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('evmSignTypedData uses typed-hash fallback for T1B1 full-mode payloads', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor One', model: 'T1B1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: '1',
        internal_model: 'T1B1',
      },
      [
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'aabbcc', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signature = await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: { name: 'X' },
        types: {
          EIP712Domain: [{ name: 'name', type: 'string' }],
          Mail: [{ name: 'subject', type: 'string' }],
        },
        primaryType: 'Mail',
        message: { subject: 'Hello' },
      },
      metamaskV4Compat: true,
    });

    expect(signature).toEqual({
      signature: '0xaabbcc',
      address: '0xabc',
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'EthereumSignTypedHash',
        data: {
          address_n: [2147483692, 2147483708, 2147483648, 0, 0],
          domain_separator_hash: '8c922836fe399a0e2861cf2352c66faee7ad0761b3a22651e0678c63a8742c03',
          message_hash: '5686e63b2c8949c28797005ae63c630790f9d7e6a48cb0b224ceb479ec9165d6',
        },
      },
    ]);
  });

  test('T1B1 full-mode typed-data fallback forwards static Ethereum network definition', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor One', model: 'T1B1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: '1',
        internal_model: 'T1B1',
      },
      [
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'aabbcc', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: { name: 'X' },
        types: {
          EIP712Domain: [{ name: 'name', type: 'string' }],
          Mail: [{ name: 'subject', type: 'string' }],
        },
        primaryType: 'Mail',
        message: { subject: 'Hello' },
      },
      metamaskV4Compat: true,
      ethereumDefinitions: {
        encodedNetwork: '0a0101',
      },
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumSignTypedHash',
      data: {
        encoded_network: expect.any(ArrayBuffer),
      },
    });
    expect(
      Buffer.from(connector.fakeSessions[0].calls[0].data.encoded_network as ArrayBuffer).toString(
        'hex'
      )
    ).toBe('0a0101');
  });

  test('evmSignTypedData omits message_hash for T1B1 domain-only typed-data fallback', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor One', model: 'T1B1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: '1',
        internal_model: 'T1B1',
      },
      [
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'aabbcc', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signature = await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: { name: 'X' },
        types: {
          EIP712Domain: [{ name: 'name', type: 'string' }],
        },
        primaryType: 'EIP712Domain',
        message: {},
      },
      metamaskV4Compat: true,
    });

    expect(signature).toEqual({
      signature: '0xaabbcc',
      address: '0xabc',
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'EthereumSignTypedHash',
        data: {
          address_n: [2147483692, 2147483708, 2147483648, 0, 0],
          domain_separator_hash: '8c922836fe399a0e2861cf2352c66faee7ad0761b3a22651e0678c63a8742c03',
        },
      },
    ]);
  });

  test('evmSignTypedData rejects T1B1 full-mode V3 payloads instead of using unsupported full mode', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor One', model: 'T1B1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: '1',
        internal_model: 'T1B1',
      }
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'evmSignTypedData', {
        path: "m/44'/60'/0'/0/0",
        data: {
          domain: { name: 'X' },
          types: {
            EIP712Domain: [{ name: 'name', type: 'string' }],
            Mail: [{ name: 'subject', type: 'string' }],
          },
          primaryType: 'Mail',
          message: { subject: 'Hello' },
        },
        metamaskV4Compat: false,
      })
    ).rejects.toThrow('Trezor One typed-data signing requires hash mode for non-v4 payloads');
    expect(connector.fakeSessions[0].calls).toHaveLength(0);
  });

  test('evmSignTypedData uses caller-provided hashes for T1B1 V3 payloads', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor One', model: 'T1B1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: '1',
        internal_model: 'T1B1',
      },
      [
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'aabbcc', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signature = await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: { name: 'X' },
        types: {
          EIP712Domain: [{ name: 'name', type: 'string' }],
          Mail: [{ name: 'subject', type: 'string' }],
        },
        primaryType: 'Mail',
        message: { subject: 'Hello' },
      },
      metamaskV4Compat: false,
      domainSeparatorHash: `0x${'11'.repeat(32)}`,
      messageHash: `0x${'22'.repeat(32)}`,
    });

    expect(signature).toEqual({
      signature: '0xaabbcc',
      address: '0xabc',
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'EthereumSignTypedHash',
        data: {
          address_n: [2147483692, 2147483708, 2147483648, 0, 0],
          domain_separator_hash: '11'.repeat(32),
          message_hash: '22'.repeat(32),
        },
      },
    ]);
  });

  test("evmSignTypedData 'full' mode walks struct + value requests until signature", async () => {
    // Minimal EIP-712 sample:
    //   types:        EIP712Domain (1 field) + Mail (1 field)
    //   primaryType:  Mail
    //   domain:       { name: 'X' }
    //   message:      { subject: 'Hello' }
    //
    // Simulated Trezor flow (5 round trips):
    //   1. Initial → device asks for EIP712Domain struct
    //   2. StructAck → device asks for Mail struct
    //   3. StructAck → device asks for domain.name value (member_path=[0,0])
    //   4. ValueAck (utf8(X) = '58') → device asks for message.subject (member_path=[1,0])
    //   5. ValueAck (utf8(Hello) = '48656c6c6f') → device returns signature
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        { type: 'EthereumTypedDataStructRequest', message: { name: 'EIP712Domain' } },
        { type: 'EthereumTypedDataStructRequest', message: { name: 'Mail' } },
        { type: 'EthereumTypedDataValueRequest', message: { member_path: [0, 0] } },
        { type: 'EthereumTypedDataValueRequest', message: { member_path: [1, 0] } },
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'aabbccdd', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const result = await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: { name: 'X' },
        types: {
          EIP712Domain: [{ name: 'name', type: 'string' }],
          Mail: [{ name: 'subject', type: 'string' }],
        },
        primaryType: 'Mail',
        message: { subject: 'Hello' },
      },
    });

    expect(result).toEqual({ signature: '0xaabbccdd', address: '0xabc' });

    const { calls } = connector.fakeSessions[0];
    expect(calls.map(c => c.name)).toEqual([
      'EthereumSignTypedData',
      'EthereumTypedDataStructAck',
      'EthereumTypedDataStructAck',
      'EthereumTypedDataValueAck',
      'EthereumTypedDataValueAck',
    ]);

    expect(calls[0].data).toMatchObject({
      address_n: [2147483692, 2147483708, 2147483648, 0, 0],
      primary_type: 'Mail',
    });

    // StructAck for EIP712Domain — one string field
    expect(calls[1].data).toEqual({
      members: [{ name: 'name', type: { data_type: 4 /* STRING */ } }],
    });
    // StructAck for Mail — one string field
    expect(calls[2].data).toEqual({
      members: [{ name: 'subject', type: { data_type: 4 } }],
    });
    // ValueAck for domain.name — utf8('X') = 0x58
    expect(calls[3].data).toEqual({ value: '58' });
    // ValueAck for message.subject — utf8('Hello') = 0x48656c6c6f
    expect(calls[4].data).toEqual({ value: '48656c6c6f' });
  });

  test("evmSignTypedData 'full' mode forwards static Ethereum definitions", async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'abc123', address: '0xSigner' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: { name: 'Ether Mail' },
        types: {
          EIP712Domain: [{ name: 'name', type: 'string' }],
          Mail: [{ name: 'contents', type: 'string' }],
        },
        primaryType: 'Mail',
        message: { contents: 'Hello' },
      },
      ethereumDefinitions: {
        encodedNetwork: '0a0101',
        encodedToken: '0a020202',
      },
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumSignTypedData',
      data: {
        definitions: {
          encoded_network: expect.any(ArrayBuffer),
          encoded_token: expect.any(ArrayBuffer),
        },
      },
    });
    expect(
      Buffer.from(
        connector.fakeSessions[0].calls[0].data.definitions.encoded_network as ArrayBuffer
      ).toString('hex')
    ).toBe('0a0101');
    expect(
      Buffer.from(
        connector.fakeSessions[0].calls[0].data.definitions.encoded_token as ArrayBuffer
      ).toString('hex')
    ).toBe('0a020202');
  });

  test("evmSignTypedData 'full' mode shows SafeTx message hash by default", async () => {
    const messageHash = `0x${'12'.repeat(32)}`;
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'abc123', address: '0xSigner' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: { name: 'Safe' },
        types: {
          EIP712Domain: [{ name: 'name', type: 'string' }],
          SafeTx: [{ name: 'to', type: 'address' }],
        },
        primaryType: 'SafeTx',
        message: { to: '0x1111111111111111111111111111111111111111' },
      },
      messageHash,
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumSignTypedData',
      data: {
        primary_type: 'SafeTx',
        show_message_hash: '12'.repeat(32),
      },
    });
  });

  test("evmSignTypedData 'full' mode encodes array length as uint16", async () => {
    // types.Group: { members: address[] }   →  member_path=[1,0] asks for
    // the array — we should ship the length encoded as uint16 = 0x0002 (2 entries).
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        { type: 'EthereumTypedDataStructRequest', message: { name: 'EIP712Domain' } },
        { type: 'EthereumTypedDataStructRequest', message: { name: 'Group' } },
        { type: 'EthereumTypedDataValueRequest', message: { member_path: [1, 0] } },
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'deadbeef', address: '0xfff' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const result = await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: {},
        types: {
          EIP712Domain: [],
          Group: [{ name: 'members', type: 'address[]' }],
        },
        primaryType: 'Group',
        message: {
          members: [
            '0x1111111111111111111111111111111111111111',
            '0x2222222222222222222222222222222222222222',
          ],
        },
      },
    });

    expect(result).toEqual({ signature: '0xdeadbeef', address: '0xfff' });
    const valueAck = connector.fakeSessions[0].calls.find(
      c => c.name === 'EthereumTypedDataValueAck'
    );
    expect(valueAck?.data).toEqual({ value: '0002' }); // uint16 = 2
  });

  test("evmSignTypedData 'full' mode: depth-3 nested struct traversal", async () => {
    // types: Mail { from: Person, subject: string }, Person { name, wallet }
    // member_path drills: [1, 0, 0]=Mail.from.name, [1, 0, 1]=Mail.from.wallet,
    // [1, 1]=Mail.subject. Catches an implementation that hard-codes depth-1.
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        { type: 'EthereumTypedDataStructRequest', message: { name: 'EIP712Domain' } },
        { type: 'EthereumTypedDataStructRequest', message: { name: 'Mail' } },
        { type: 'EthereumTypedDataStructRequest', message: { name: 'Person' } },
        { type: 'EthereumTypedDataValueRequest', message: { member_path: [1, 0, 0] } },
        { type: 'EthereumTypedDataValueRequest', message: { member_path: [1, 0, 1] } },
        { type: 'EthereumTypedDataValueRequest', message: { member_path: [1, 1] } },
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'cafe', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const result = await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: {},
        types: {
          EIP712Domain: [],
          Mail: [
            { name: 'from', type: 'Person' },
            { name: 'subject', type: 'string' },
          ],
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' },
          ],
        },
        primaryType: 'Mail',
        message: {
          from: { name: 'Alice', wallet: '0x1111111111111111111111111111111111111111' },
          subject: 'Hi',
        },
      },
    });

    expect(result).toEqual({ signature: '0xcafe', address: '0xabc' });

    // Verify Mail's StructAck describes `from` as a STRUCT pointing at Person
    const mailStructAck = connector.fakeSessions[0].calls[2];
    expect(mailStructAck.name).toBe('EthereumTypedDataStructAck');
    expect(mailStructAck.data).toEqual({
      members: [
        { name: 'from', type: { data_type: 8 /* STRUCT */, size: 2, struct_name: 'Person' } },
        { name: 'subject', type: { data_type: 4 /* STRING */ } },
      ],
    });

    // Verify the three leaf ValueAcks landed in order with correct encodings
    const valueAcks = connector.fakeSessions[0].calls
      .filter(c => c.name === 'EthereumTypedDataValueAck')
      .map(c => c.data.value);
    expect(valueAcks).toEqual([
      '416c696365', // utf8('Alice')
      '1111111111111111111111111111111111111111', // address (no 0x)
      '4869', // utf8('Hi')
    ]);
  });

  test("evmSignTypedData 'full' mode: array-element-then-field traversal", async () => {
    // Group { members: Person[] }, Person { name }. member_path drills:
    // [1, 0]            → array length (uint16)
    // [1, 0, 0, 0]      → Group.members[0].name
    // [1, 0, 1, 0]      → Group.members[1].name
    // Catches array-element navigation entering struct fields correctly.
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        { type: 'EthereumTypedDataStructRequest', message: { name: 'EIP712Domain' } },
        { type: 'EthereumTypedDataStructRequest', message: { name: 'Group' } },
        { type: 'EthereumTypedDataStructRequest', message: { name: 'Person' } },
        { type: 'EthereumTypedDataValueRequest', message: { member_path: [1, 0] } },
        { type: 'EthereumTypedDataValueRequest', message: { member_path: [1, 0, 0, 0] } },
        { type: 'EthereumTypedDataValueRequest', message: { member_path: [1, 0, 1, 0] } },
        {
          type: 'EthereumTypedDataSignature',
          message: { signature: 'feed', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const result = await callConnector(connector, session.sessionId, 'evmSignTypedData', {
      path: "m/44'/60'/0'/0/0",
      data: {
        domain: {},
        types: {
          EIP712Domain: [],
          Group: [{ name: 'members', type: 'Person[]' }],
          Person: [{ name: 'name', type: 'string' }],
        },
        primaryType: 'Group',
        message: { members: [{ name: 'Alice' }, { name: 'Bob' }] },
      },
    });

    expect(result.signature).toBe('0xfeed');
    const valueAcks = connector.fakeSessions[0].calls
      .filter(c => c.name === 'EthereumTypedDataValueAck')
      .map(c => c.data.value);
    expect(valueAcks).toEqual([
      '0002', // array length as uint16
      '416c696365', // utf8('Alice')
      '426f62', // utf8('Bob')
    ]);
  });

  test('signs a legacy EVM transaction (single round trip, no data)', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        device_id: 'device-1',
        label: 'Trezor Safe 7',
        model: 'T3W1',
      },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 0,
            signature_r: '11'.repeat(32),
            signature_s: '22'.repeat(32),
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signed = await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      to: '0xrecipient',
      value: '0x0de0b6b3a7640000', // 1 ETH
      nonce: '0x5',
      gasLimit: '0x5208',
      gasPrice: '0x04a817c800',
      chainId: 1,
    });

    expect(signed).toEqual({
      v: '0x25', // 0 + 2*1 + 35 = 37 = 0x25 (EIP-155 v adjustment)
      r: `0x${'11'.repeat(32)}`,
      s: `0x${'22'.repeat(32)}`,
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'EthereumSignTx',
        data: {
          address_n: [2147483692, 2147483708, 2147483648, 0, 0],
          // even-padded: bare '5' would encode (Buffer.from) to an empty/zero
          // nonce on the wire. See formatAnyHex / trezorHexAmount.
          nonce: '05',
          gas_price: '04a817c800',
          gas_limit: '5208',
          to: '0xrecipient',
          value: '0de0b6b3a7640000',
          chain_id: 1,
          supports_definition_request: true,
        },
      },
    ]);
  });

  test('legacy EVM signTx forwards typed transaction type', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 0,
            signature_r: '11'.repeat(32),
            signature_s: '22'.repeat(32),
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      to: '0xrecipient',
      value: '0x0',
      nonce: '0x1',
      gasLimit: '0x5208',
      gasPrice: '0x04a817c800',
      chainId: 1,
      txType: 1,
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumSignTx',
      data: {
        tx_type: 1,
      },
    });
  });

  test('legacy EVM signTx rejects non-empty access-list transactions', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      []
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'evmSignTransaction', {
        path: "m/44'/60'/0'/0/0",
        to: '0xrecipient',
        value: '0x0',
        nonce: '0x1',
        gasLimit: '0x5208',
        gasPrice: '0x04a817c800',
        chainId: 1,
        txType: 1,
        accessList: [
          {
            address: '0x3333333333333333333333333333333333333333',
            storageKeys: [],
          },
        ],
      })
    ).rejects.toThrow(
      'evmSignTransaction: non-empty accessList is not supported for legacy typed transactions'
    );

    expect(connector.fakeSessions[0].calls).toHaveLength(0);
  });

  test('legacy EVM signTx forwards SLIP-24 payment request metadata', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 0,
            signature_r: '11'.repeat(32),
            signature_s: '22'.repeat(32),
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      to: '0xrecipient',
      value: '0x0',
      nonce: '0x1',
      gasLimit: '0x5208',
      gasPrice: '0x04a817c800',
      chainId: 1,
      paymentRequest: {
        nonce: 'nonce-1',
        recipientName: 'Merchant',
        amount: '100000',
        signature: 'ab'.repeat(64),
        memos: [{ textMemo: { text: 'order #1' } }],
      },
    });

    expect(connector.fakeSessions[0].calls[0].data.payment_req).toEqual({
      nonce: 'nonce-1',
      recipient_name: 'Merchant',
      amount: 'a086010000000000000000000000000000000000000000000000000000000000',
      signature: 'ab'.repeat(64),
      memos: [{ text_memo: { text: 'order #1' } }],
    });
  });

  test('signs a legacy EVM transaction with large data (multiple chunks)', async () => {
    // Build 3072 bytes of data: 1024 in initial chunk + two 1024-byte TxAck chunks.
    const dataHex = 'ab'.repeat(3072);
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        // Device asks for 1024 more bytes
        { type: 'EthereumTxRequest', message: { data_length: 1024 } },
        // Device asks for the final 1024 bytes
        { type: 'EthereumTxRequest', message: { data_length: 1024 } },
        // Done — returns the signature
        {
          type: 'EthereumTxRequest',
          message: { signature_v: 1, signature_r: 'ab'.repeat(32), signature_s: 'cd'.repeat(32) },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signed = await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      to: '0xrecipient',
      value: '0x0',
      nonce: '0x0',
      gasLimit: '0xea60',
      gasPrice: '0x04a817c800',
      data: `0x${dataHex}`,
      chainId: 1,
    });

    expect(signed.v).toBe('0x26'); // 1 + 2*1 + 35 = 38 = 0x26
    expect(signed.r).toBe(`0x${'ab'.repeat(32)}`);
    expect(signed.s).toBe(`0x${'cd'.repeat(32)}`);

    // All 3072 bytes are the same value, but assert each chunk is the exact
    // expected slice of the input — guards against a sliceHex bug that
    // returned the wrong window.
    const { calls } = connector.fakeSessions[0];
    expect(calls).toHaveLength(3);
    expect(calls[0].name).toBe('EthereumSignTx');
    expect(calls[0].data.data_length).toBe(3072);
    expect(calls[0].data.data_initial_chunk).toBe('ab'.repeat(1024));
    expect(calls[1].name).toBe('EthereumTxAck');
    expect(calls[1].data.data_chunk).toBe('ab'.repeat(1024));
    expect(calls[2].name).toBe('EthereumTxAck');
    expect(calls[2].data.data_chunk).toBe('ab'.repeat(1024));
  });

  test('legacy EVM signTx: v > 1 is NOT re-adjusted (device already encoded)', async () => {
    // If Trezor firmware returns v already in EIP-155 form (e.g. 27/28 for
    // chainId=0), the `v <= 1` guard in processTxRequest must skip the
    // 2*chainId+35 reconstruction. Otherwise we'd double-encode.
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 27, // already in EIP-155 form
            signature_r: '11'.repeat(32),
            signature_s: '22'.repeat(32),
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signed = await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      to: '0xrecipient',
      value: '0x0',
      nonce: '0x1',
      gasLimit: '0x5208',
      gasPrice: '0x04a817c800',
      chainId: 1,
    });

    expect(signed.v).toBe('0x1b'); // 27, unchanged
  });

  test('legacy EVM signTx omits recipient for contract deployment transactions', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 0,
            signature_r: '11'.repeat(32),
            signature_s: '22'.repeat(32),
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      value: '0x0',
      nonce: '0x1',
      gasLimit: '0x5208',
      gasPrice: '0x04a817c800',
      data: `0x${'60'.repeat(16)}`,
      chainId: 1,
    });

    expect(connector.fakeSessions[0].calls[0].data).not.toHaveProperty('to');
  });

  test('signs an EIP-1559 EVM transaction (v stays as y_parity, no chainId reconstruction)', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 1,
            signature_r: 'ff'.repeat(32),
            signature_s: 'ee'.repeat(32),
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signed = await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      to: '0xrecipient',
      value: '0x0',
      nonce: '0x0',
      gasLimit: '0xea60',
      maxFeePerGas: '0x04a817c800',
      maxPriorityFeePerGas: '0x77359400',
      chainId: 1,
    });

    expect(signed).toEqual({
      v: '0x1', // y_parity, no EIP-155 adjustment for EIP-1559
      r: `0x${'ff'.repeat(32)}`,
      s: `0x${'ee'.repeat(32)}`,
    });
    expect(connector.fakeSessions[0].calls[0].name).toBe('EthereumSignTxEIP1559');
    expect(connector.fakeSessions[0].calls[0].data).toMatchObject({
      address_n: [2147483692, 2147483708, 2147483648, 0, 0],
      max_gas_fee: '04a817c800',
      max_priority_fee: '77359400',
      gas_limit: 'ea60',
      chain_id: 1,
      access_list: [],
      data_length: 0,
    });
  });

  test('EIP-1559 EVM signTx forwards SLIP-24 payment request metadata', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 1,
            signature_r: 'ff'.repeat(32),
            signature_s: 'ee'.repeat(32),
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      to: '0xrecipient',
      value: '0x0',
      nonce: '0x0',
      gasLimit: '0xea60',
      maxFeePerGas: '0x04a817c800',
      maxPriorityFeePerGas: '0x77359400',
      chainId: 1,
      paymentRequest: {
        recipientName: 'Merchant',
        amount: '100000',
        signature: 'ab'.repeat(64),
      },
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumSignTxEIP1559',
      data: {
        payment_req: {
          recipient_name: 'Merchant',
          amount: 'a086010000000000000000000000000000000000000000000000000000000000',
          signature: 'ab'.repeat(64),
        },
      },
    });
  });

  test('legacy EVM signTx forwards static Ethereum definitions', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 0,
            signature_r: '11'.repeat(32),
            signature_s: '22'.repeat(32),
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      to: '0x2222222222222222222222222222222222222222',
      value: '0x0',
      nonce: '0x0',
      gasLimit: '0xea60',
      gasPrice: '0x04a817c800',
      chainId: 1,
      ethereumDefinitions: {
        encodedNetwork: '0a0101',
        encodedToken: '0a020202',
      },
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumSignTx',
      data: {
        definitions: {
          encoded_network: expect.any(ArrayBuffer),
          encoded_token: expect.any(ArrayBuffer),
        },
      },
    });
    expect(
      Buffer.from(
        connector.fakeSessions[0].calls[0].data.definitions.encoded_network as ArrayBuffer
      ).toString('hex')
    ).toBe('0a0101');
    expect(
      Buffer.from(
        connector.fakeSessions[0].calls[0].data.definitions.encoded_token as ArrayBuffer
      ).toString('hex')
    ).toBe('0a020202');
  });

  test('EIP-1559 EVM signTx forwards static Ethereum definitions', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 1,
            signature_r: 'ff'.repeat(32),
            signature_s: 'ee'.repeat(32),
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignTransaction', {
      path: "m/44'/60'/0'/0/0",
      to: '0x2222222222222222222222222222222222222222',
      value: '0x0',
      nonce: '0x0',
      gasLimit: '0xea60',
      maxFeePerGas: '0x04a817c800',
      maxPriorityFeePerGas: '0x77359400',
      chainId: 1,
      ethereumDefinitions: {
        encodedNetwork: '0a0101',
        encodedToken: '0a020202',
      },
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumSignTxEIP1559',
      data: {
        definitions: {
          encoded_network: expect.any(ArrayBuffer),
          encoded_token: expect.any(ArrayBuffer),
        },
      },
    });
    expect(
      Buffer.from(
        connector.fakeSessions[0].calls[0].data.definitions.encoded_network as ArrayBuffer
      ).toString('hex')
    ).toBe('0a0101');
    expect(
      Buffer.from(
        connector.fakeSessions[0].calls[0].data.definitions.encoded_token as ArrayBuffer
      ).toString('hex')
    ).toBe('0a020202');
  });

  test('evmSignTransaction does not preload definitions; sends none when caller omits them', async () => {
    const fetchMock = jest.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 0,
            signature_r: '11'.repeat(32),
            signature_s: '22'.repeat(32),
          },
        },
      ]
    );

    try {
      const session = await connector.connect('device-1');
      await callConnector(connector, session.sessionId, 'evmSignTransaction', {
        path: "m/44'/60'/0'/0/0",
        to: '0x2222222222222222222222222222222222222222',
        value: '0x0',
        nonce: '0x0',
        gasLimit: '0xea60',
        gasPrice: '0x04a817c800',
        data: `0x${'a9059cbb'.padEnd(136, '0')}`,
        chainId: 1,
      });

      // Option A: no network preload; the SignTx message carries no definitions.
      expect(fetchMock).not.toHaveBeenCalled();
      expect(connector.fakeSessions[0].calls[0].name).toBe('EthereumSignTx');
      expect(connector.fakeSessions[0].calls[0].data.definitions).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('evmSignTransaction acks a dynamic definition request with empty definitions (no fetch)', async () => {
    const fetchMock = jest.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3T1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [
        {
          type: 'EthereumDefinitionRequest',
          message: {
            chain_id: 1,
            token_address: '0x2222222222222222222222222222222222222222',
          },
        },
        {
          type: 'EthereumTxRequest',
          message: {
            signature_v: 0,
            signature_r: '11'.repeat(32),
            signature_s: '22'.repeat(32),
          },
        },
      ]
    );

    try {
      const session = await connector.connect('device-1');
      await callConnector(connector, session.sessionId, 'evmSignTransaction', {
        path: "m/44'/60'/0'/0/0",
        to: '0x2222222222222222222222222222222222222222',
        value: '0x0',
        nonce: '0x0',
        gasLimit: '0xea60',
        gasPrice: '0x04a817c800',
        data: `0x${'a9059cbb'.padEnd(136, '0')}`,
        chainId: 1,
      });

      // Device may still ask; we answer with an empty ack instead of fetching,
      // so signing proceeds with the device's generic confirmation screen.
      expect(fetchMock).not.toHaveBeenCalled();
      expect(connector.fakeSessions[0].calls[0].name).toBe('EthereumSignTx');
      expect(connector.fakeSessions[0].calls[1]).toEqual({
        name: 'EthereumDefinitionAck',
        data: { definitions: {} },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('signs an Ethereum personal_sign-style message (hex input)', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        device_id: 'device-1',
        label: 'Trezor Safe 7',
        model: 'T3W1',
      },
      [
        {
          type: 'EthereumMessageSignature',
          message: {
            signature: 'deadbeefcafebabe',
            address: '0xabc',
          },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signature = await callConnector(connector, session.sessionId, 'evmSignMessage', {
      path: "m/44'/60'/0'/0/0",
      message: '0xDEADBEEF',
      hex: true,
    });

    expect(signature).toEqual({
      signature: '0xdeadbeefcafebabe',
      address: '0xabc',
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'EthereumSignMessage',
        data: {
          address_n: [2147483692, 2147483708, 2147483648, 0, 0],
          message: 'DEADBEEF', // 0x stripped, hex preserved as-is
        },
      },
    ]);
  });

  test('evmSignMessage: reports invalid params with HardwareErrorCode.InvalidParams', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: 'T3W1',
      },
      []
    );

    const session = await connector.connect('device-1');
    await expect(
      callConnector(connector, session.sessionId, 'evmSignMessage', {
        path: "m/44'/60'/0'/0/0",
        message: 'not-hex',
        hex: true,
      })
    ).rejects.toMatchObject({ code: HardwareErrorCode.InvalidParams });
    expect(connector.fakeSessions[0].deviceStateCalls).toEqual([]);
    expect(connector.fakeSessions[0].calls).toEqual([]);
  });

  test('EVM signMessage forwards static Ethereum network definition', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: 'T3W1',
      },
      [
        {
          type: 'EthereumMessageSignature',
          message: { signature: 'aabbcc', address: '0xabc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmSignMessage', {
      path: "m/44'/60'/0'/0/0",
      message: 'hello world',
      ethereumDefinitions: {
        encodedNetwork: '0a0101',
      },
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumSignMessage',
      data: {
        encoded_network: expect.any(ArrayBuffer),
      },
    });
    expect(
      Buffer.from(connector.fakeSessions[0].calls[0].data.encoded_network as ArrayBuffer).toString(
        'hex'
      )
    ).toBe('0a0101');
  });

  test('EVM signMessage never fetches definitions; omits encoded_network when caller omits them', async () => {
    const fetchMock = jest.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: 'T3W1',
      },
      [
        {
          type: 'EthereumMessageSignature',
          message: { signature: 'aabbcc', address: '0xabc' },
        },
      ]
    );

    try {
      const session = await connector.connect('device-1');
      await callConnector(connector, session.sessionId, 'evmSignMessage', {
        path: "m/44'/60'/0'/0/0",
        message: 'hello world',
        chainId: 137,
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(connector.fakeSessions[0].calls[0].name).toBe('EthereumSignMessage');
      expect(connector.fakeSessions[0].calls[0].data.encoded_network).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('signs an Ethereum message with plain text (hex=false)', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        device_id: 'device-1',
        label: 'Trezor Safe 7',
        model: 'T3W1',
      },
      [
        {
          type: 'EthereumMessageSignature',
          message: { signature: '0xaabbcc' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const signature = await callConnector(connector, session.sessionId, 'evmSignMessage', {
      path: "m/44'/60'/0'/0/0",
      message: 'hello world',
    });

    expect(signature).toEqual({ signature: '0xaabbcc', address: undefined });
    expect(connector.fakeSessions[0].calls[0].data.message).toBe('hello world');
  });

  test('calls EthereumGetAddress and returns an EVM address payload', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        major_version: 2,
        minor_version: 8,
        patch_version: 10,
        device_id: 'device-1',
        label: 'Trezor Safe 7',
        model: 'T3W1',
      },
      [
        {
          type: 'EthereumAddress',
          message: { address: '0x1234567890123456789012345678901234567890' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    const address = await callConnector(connector, session.sessionId, 'evmGetAddress', {
      path: "m/44'/60'/0'/0/0",
      showOnDevice: false,
    });

    expect(address).toEqual({
      address: '0x1234567890123456789012345678901234567890',
      path: "m/44'/60'/0'/0/0",
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'EthereumGetAddress',
        data: {
          address_n: [2147483692, 2147483708, 2147483648, 0, 0],
          show_display: false,
        },
      },
    ]);
  });

  test('EVM getAddress forwards static Ethereum network definition', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: 'T3W1',
      },
      [
        {
          type: 'EthereumAddress',
          message: { address: '0x1234567890123456789012345678901234567890' },
        },
      ]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'evmGetAddress', {
      path: "m/44'/60'/0'/0/0",
      ethereumDefinitions: {
        encodedNetwork: '0a0101',
      },
    });

    expect(connector.fakeSessions[0].calls[0]).toMatchObject({
      name: 'EthereumGetAddress',
      data: {
        encoded_network: expect.any(ArrayBuffer),
      },
    });
    expect(
      Buffer.from(connector.fakeSessions[0].calls[0].data.encoded_network as ArrayBuffer).toString(
        'hex'
      )
    ).toBe('0a0101');
  });

  test('EVM getAddress never fetches definitions; omits encoded_network when caller omits them', async () => {
    const fetchMock = jest.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 5', model: 'T3T1' }],
      {
        vendor: 'trezor.io',
        device_id: 'device-1',
        model: 'T3W1',
      },
      [
        {
          type: 'EthereumAddress',
          message: { address: '0x1234567890123456789012345678901234567890' },
        },
      ]
    );

    try {
      const session = await connector.connect('device-1');
      await callConnector(connector, session.sessionId, 'evmGetAddress', {
        path: "m/44'/60'/0'/0/0",
        chainId: 137,
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(connector.fakeSessions[0].calls[0].name).toBe('EthereumGetAddress');
      expect(connector.fakeSessions[0].calls[0].data.encoded_network).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('calls GetAddress and returns a BTC address payload', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 7', model: 'T3W1' }],
      {
        vendor: 'trezor.io',
        major_version: 3,
        minor_version: 0,
        patch_version: 0,
        device_id: 'device-1',
        label: 'Trezor Safe 7',
        model: 'T3W1',
      },
      [{ type: 'Address', message: { address: 'bc1qexampleaddress' } }]
    );

    const session = await connector.connect('device-1');
    const address = await callConnector(connector, session.sessionId, 'btcGetAddress', {
      path: "m/84'/0'/0'/0/0",
      coin: 'Bitcoin',
      showOnDevice: false,
      scriptType: 'p2wpkh',
    });

    expect(address).toEqual({
      address: 'bc1qexampleaddress',
      path: "m/84'/0'/0'/0/0",
    });
    expect(connector.fakeSessions[0].calls).toEqual([
      {
        name: 'GetAddress',
        data: {
          address_n: [2147483732, 2147483648, 2147483648, 0, 0],
          coin_name: 'Bitcoin',
          show_display: false,
          script_type: 'SPENDWITNESS',
        },
      },
    ]);
  });

  test('btcGetAddress: normalizes the coin code and derives scriptType from path', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3W1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [{ type: 'Address', message: { address: 'bc1qderived' } }]
    );

    const session = await connector.connect('device-1');
    const address = await callConnector(connector, session.sessionId, 'btcGetAddress', {
      path: "m/84'/0'/0'/0/0",
      coin: 'btc', // network code, not the Trezor 'Bitcoin' name
      // scriptType omitted on purpose — the SDK derives it from the path
    });

    expect(address).toEqual({ address: 'bc1qderived', path: "m/84'/0'/0'/0/0" });
    expect(connector.fakeSessions[0].calls[0]).toEqual({
      name: 'GetAddress',
      data: {
        address_n: [2147483732, 2147483648, 2147483648, 0, 0],
        coin_name: 'Bitcoin', // normalized from 'btc'
        show_display: false,
        script_type: 'SPENDWITNESS', // derived from 84'
      },
    });
  });

  test('btcGetAddress: derives scriptType from the purpose segment only', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3W1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [{ type: 'Address', message: { address: 'legacy-address' } }]
    );

    const session = await connector.connect('device-1');
    await callConnector(connector, session.sessionId, 'btcGetAddress', {
      path: "m/44'/0'/86'/0/0",
      coin: 'btc',
    });

    expect(connector.fakeSessions[0].calls[0]).toEqual({
      name: 'GetAddress',
      data: {
        address_n: [2147483692, 2147483648, 2147483734, 0, 0],
        coin_name: 'Bitcoin',
        show_display: false,
        script_type: 'SPENDADDRESS',
      },
    });
  });

  test('btcGetAddress: normalizes doge coin code to Dogecoin', async () => {
    const connector = new SessionBackedTestTrezorConnector(
      [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3W1' }],
      { vendor: 'trezor.io', device_id: 'device-1', model: 'T3W1' },
      [{ type: 'Address', message: { address: 'DogeExampleAddress' } }]
    );

    const session = await connector.connect('device-1');
    const address = await callConnector(connector, session.sessionId, 'btcGetAddress', {
      path: "m/44'/3'/0'/0/0",
      coin: 'doge',
    });

    expect(address).toEqual({ address: 'DogeExampleAddress', path: "m/44'/3'/0'/0/0" });
    expect(connector.fakeSessions[0].calls[0]).toEqual({
      name: 'GetAddress',
      data: {
        address_n: [2147483692, 2147483651, 2147483648, 0, 0],
        coin_name: 'Dogecoin',
        show_display: false,
        script_type: 'SPENDADDRESS',
      },
    });
  });

  test('emits device-disconnect and drops session when transport reports physical drop', async () => {
    let triggerDisconnect: (() => void) | undefined;

    class DisconnectingConnector extends TrezorConnectorBase {
      constructor() {
        super({
          connectionType: 'ble',
          deviceSessionFactory: ({ transport }) =>
            new FakeDeviceSession(transport, {
              device_id: 'device-1',
              model: 'T3W1',
            }) as unknown as TrezorDeviceSession,
        });
      }

      protected async enumerateDevices() {
        return [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3W1' }];
      }

      protected async createByteTransport() {
        const memory = new MemoryByteTransport([]);
        return Object.assign(memory, {
          close: async () => {},
          onDisconnect: (handler: () => void) => {
            triggerDisconnect = handler;
            return () => {
              if (triggerDisconnect === handler) triggerDisconnect = undefined;
            };
          },
        });
      }
    }

    const connector = new DisconnectingConnector();
    const onDisconnect = jest.fn();
    connector.on('device-disconnect', onDisconnect);

    await connector.connect('device-1');
    expect(triggerDisconnect).toBeDefined();

    triggerDisconnect!();

    expect(onDisconnect).toHaveBeenCalledWith({ connectId: 'device-1' });
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(triggerDisconnect).toBeUndefined();

    await expect(callConnector(connector, 'device-1', 'getFeatures', {})).rejects.toThrow(
      /session not found/
    );
  });

  test('rejects invalid internal passphrase mode', async () => {
    const createThpAppSession = jest.fn(async () => 'thp-session');

    class PassphraseModeConnector extends TrezorConnectorBase {
      constructor() {
        super({
          connectionType: 'ble',
          deviceSessionFactory: () =>
            ({
              isThp: true,
              initialize: async () => trezorFeatures(),
              createThpAppSession,
            } as unknown as TrezorDeviceSession),
        });
      }

      protected async enumerateDevices() {
        return [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3W1' }];
      }

      protected async createByteTransport() {
        return new MemoryByteTransport([]);
      }
    }

    const connector = new PassphraseModeConnector();
    const session = await connector.connect('device-1');

    await expect(
      callConnector(connector, session.sessionId, '__thpCreateSession', {
        passphraseMode: 'silent',
      })
    ).rejects.toMatchObject({ code: HardwareErrorCode.InvalidParams });
    expect(createThpAppSession).not.toHaveBeenCalled();
  });

  test('explicit disconnect unsubscribes the physical-drop handler', async () => {
    let triggerDisconnect: (() => void) | undefined;

    class DisconnectingConnector extends TrezorConnectorBase {
      constructor() {
        super({
          connectionType: 'ble',
          deviceSessionFactory: ({ transport }) =>
            new FakeDeviceSession(transport, {
              device_id: 'device-1',
              model: 'T3W1',
            }) as unknown as TrezorDeviceSession,
        });
      }

      protected async enumerateDevices() {
        return [{ connectId: 'device-1', deviceId: 'device-1', name: 'Trezor', model: 'T3W1' }];
      }

      protected async createByteTransport() {
        const memory = new MemoryByteTransport([]);
        return Object.assign(memory, {
          close: async () => {},
          onDisconnect: (handler: () => void) => {
            triggerDisconnect = handler;
            return () => {
              if (triggerDisconnect === handler) triggerDisconnect = undefined;
            };
          },
        });
      }
    }

    const connector = new DisconnectingConnector();
    const onDisconnect = jest.fn();
    connector.on('device-disconnect', onDisconnect);

    await connector.connect('device-1');
    await connector.disconnect('device-1');

    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(triggerDisconnect).toBeUndefined();
  });

  test('bridges THP pairing request through uiResponse', async () => {
    let capturedThp: NonNullable<
      import('@onekeyfe/hwk-trezor-core').TrezorThpSessionOptions['onPairingRequest']
    >;
    class PairingConnector extends TrezorConnectorBase {
      constructor() {
        super({
          connectionType: 'ble',
          deviceSessionFactory: ({ thp }) => {
            capturedThp = thp!.onPairingRequest!;
            return new FakeDeviceSession(new MemoryByteTransport([]), {
              device_id: 'device-1',
              model: 'T3W1',
            }) as unknown as TrezorDeviceSession;
          },
        });
      }

      protected async enumerateDevices() {
        return [
          { connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 7', model: 'T3W1' },
        ];
      }

      protected async createByteTransport() {
        return new MemoryByteTransport([]);
      }
    }

    const connector = new PairingConnector();
    const onUiRequest = jest.fn();
    connector.on('ui-request', onUiRequest);
    await connector.connect('device-1');

    const pairingPromise = capturedThp!({
      availableMethods: [2],
      selectedMethod: 2,
    });
    expect(onUiRequest).toHaveBeenCalledWith({
      type: UI_REQUEST.REQUEST_TREZOR_THP_PAIRING,
      payload: {
        connectId: 'device-1',
        availableMethods: [2],
        selectedMethod: 2,
        nfcData: undefined,
      },
    });

    connector.uiResponse({
      type: UI_RESPONSE.RECEIVE_TREZOR_THP_PAIRING,
      payload: { tag: '123456' },
    });

    await expect(pairingPromise).resolves.toEqual({ tag: '123456' });
  });

  test('bridges Trezor PIN matrix request through uiResponse', async () => {
    let capturedThp: NonNullable<import('@onekeyfe/hwk-trezor-core').TrezorThpSessionOptions>;
    class PinConnector extends TrezorConnectorBase {
      constructor() {
        super({
          connectionType: 'ble',
          deviceSessionFactory: ({ thp }) => {
            capturedThp = thp!;
            return new FakeDeviceSession(new MemoryByteTransport([]), {
              device_id: 'device-1',
              model: 'T3W1',
            }) as unknown as TrezorDeviceSession;
          },
        });
      }

      protected async enumerateDevices() {
        return [
          { connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 7', model: 'T3W1' },
        ];
      }

      protected async createByteTransport() {
        return new MemoryByteTransport([]);
      }
    }

    const connector = new PinConnector();
    const onUiRequest = jest.fn();
    connector.on('ui-request', onUiRequest);
    await connector.connect('device-1');

    const pinPromise = (capturedThp! as any).onPinMatrixRequest({
      type: 'PinMatrixRequestType_Current',
    });
    expect(onUiRequest).toHaveBeenCalledWith({
      type: UI_REQUEST.REQUEST_PIN,
      payload: {
        connectId: 'device-1',
        type: 'PinMatrixRequestType_Current',
      },
    });

    connector.uiResponse({
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: '1234',
    });

    await expect(pinPromise).resolves.toBe('1234');
  });

  test('does not drop a synchronous Trezor PIN matrix uiResponse', async () => {
    let capturedThp: NonNullable<import('@onekeyfe/hwk-trezor-core').TrezorThpSessionOptions>;
    class PinConnector extends TrezorConnectorBase {
      constructor() {
        super({
          connectionType: 'ble',
          deviceSessionFactory: ({ thp }) => {
            capturedThp = thp!;
            return new FakeDeviceSession(new MemoryByteTransport([]), {
              device_id: 'device-1',
              model: 'T3W1',
            }) as unknown as TrezorDeviceSession;
          },
        });
      }

      protected async enumerateDevices() {
        return [
          { connectId: 'device-1', deviceId: 'device-1', name: 'Trezor Safe 7', model: 'T3W1' },
        ];
      }

      protected async createByteTransport() {
        return new MemoryByteTransport([]);
      }
    }

    const connector = new PinConnector();
    connector.on('ui-request', event => {
      if (event.type === UI_REQUEST.REQUEST_PIN) {
        connector.uiResponse({
          type: UI_RESPONSE.RECEIVE_PIN,
          payload: '1234',
        });
      }
    });
    await connector.connect('device-1');

    const pinPromise = (capturedThp! as any).onPinMatrixRequest({
      type: 'PinMatrixRequestType_Current',
    });

    await expect(
      Promise.race([pinPromise, new Promise(resolve => setTimeout(() => resolve('timeout'), 0))])
    ).resolves.toBe('1234');
  });
});
