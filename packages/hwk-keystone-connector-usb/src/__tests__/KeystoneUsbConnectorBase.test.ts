import { UR, URDecoder, UREncoder } from '@ngraveio/bc-ur';
import { Actions } from '@keystonehq/hw-transport-usb';
import { Status, TransportError } from '@keystonehq/hw-transport-error';
import { ETHSignature, EthSignRequest } from '@keystonehq/bc-ur-registry-eth';
import {
  EConnectorInteraction,
  HardwareErrorCode,
  parseHardwareRuntimeId,
} from '@onekeyfe/hwk-adapter-core';

import { KeystoneUsbConnectorBase } from '../KeystoneUsbConnectorBase';

import type {
  KeystoneUsbDeviceDescriptor,
  KeystoneUsbTransportStatic,
} from '../KeystoneUsbConnectorBase';
import type { TransportHID } from '@keystonehq/hw-transport-usb';

const FAKE_MFP = 'e89702d2';

type TransportHandlers = Partial<Record<number, (data: unknown) => unknown>>;

function decodeUrString(encoded: string): { urType: string; urData: string } {
  const decoder = new URDecoder();
  decoder.receivePart(encoded);
  const ur = decoder.resultUR();
  return { urType: ur.type, urData: ur.cbor.toString('hex') };
}

function encodeUrString(urType: string, urData: string): string {
  return new UREncoder(new UR(Buffer.from(urData, 'hex'), urType), Infinity)
    .nextPart()
    .toUpperCase();
}

/**
 * Fake `TransportHID` following the real `send()` contract: decodes the UR the connector sends and
 * answers per `Actions` value.
 */
function fakeTransport(handlers: TransportHandlers): TransportHID {
  return {
    open: async () => {},
    close: async () => {},
    receive: () => Promise.resolve(null),
    send: <T>(action: number, data: unknown): Promise<T> => {
      const handler = handlers[action];
      if (!handler) throw new Error(`fakeTransport: no handler for action ${action}`);
      return Promise.resolve(handler(data) as T);
    },
  };
}

/** A transport whose device reports `walletMFP`, plus any extra action handlers. */
function versionTransport(
  walletMFP: string | (() => string) = FAKE_MFP,
  handlers: TransportHandlers = {}
): TransportHID {
  return fakeTransport({
    [Actions.CMD_GET_DEVICE_VERSION]: () => ({
      firmwareVersion: '1.7.0',
      walletMFP: typeof walletMFP === 'function' ? walletMFP() : walletMFP,
    }),
    ...handlers,
  });
}

function fakeTransportClass(transport: TransportHID): KeystoneUsbTransportStatic {
  return {
    connect: () => Promise.resolve(transport),
    getKeystoneDevices: () =>
      Promise.resolve([{ serialNumber: 'FAKE-SERIAL', productName: 'Keystone 3 Pro' }]),
    isSupported: () => Promise.resolve(true),
  };
}

/** A platform that must open descriptors exactly; an ambient `connect()` fails the test. */
function exactTransportClass(
  devices: KeystoneUsbDeviceDescriptor[],
  overrides: Partial<KeystoneUsbTransportStatic> = {}
): KeystoneUsbTransportStatic {
  return {
    connect: jest.fn().mockRejectedValue(new Error('ambient connect must not run')),
    getKeystoneDevices: () => Promise.resolve(devices),
    isSupported: () => Promise.resolve(true),
    ...overrides,
  };
}

function newConnector(transportClass: KeystoneUsbTransportStatic): KeystoneUsbConnectorBase {
  return new KeystoneUsbConnectorBase(transportClass, { timeoutMs: 1000 });
}

function versionConnector(handlers: TransportHandlers = {}): KeystoneUsbConnectorBase {
  return newConnector(fakeTransportClass(versionTransport(FAKE_MFP, handlers)));
}

async function resolveUrError(thrown: unknown, urType = 'eth-sign-request') {
  const connector = versionConnector({
    [Actions.CMD_RESOLVE_UR]: () => {
      throw thrown;
    },
  });
  const session = await connector.connect();
  const result = await connector.call(session.sessionId, 'resolveUr', { urType, urData: 'de' });
  if (result.success) throw new Error('expected resolveUr to fail');
  return result.error;
}

describe('KeystoneUsbConnectorBase', () => {
  describe('searchDevices', () => {
    const withDevices = (devices: KeystoneUsbDeviceDescriptor[]) =>
      newConnector({
        ...fakeTransportClass(fakeTransport({})),
        getKeystoneDevices: () => Promise.resolve(devices),
      });

    it('never appends the serial, even when two units report the same model', async () => {
      const connector = withDevices([
        { serialNumber: 'M-76AB5599', productName: 'Keystone 3 Pro' },
        { serialNumber: 'M-1234ABCD', productName: 'Keystone 3 Pro' },
        { serialNumber: 'M-99999999', productName: 'Keystone Essential' },
      ]);

      const devices = await connector.searchDevices();

      // The serial is not readable on the unit, so it would not tell the two
      // apart for the person choosing; it would only cost the model name.
      expect(devices.map(d => d.name)).toEqual([
        'Keystone 3 Pro',
        'Keystone 3 Pro',
        'Keystone Essential',
      ]);
    });

    it('falls back to the brand when the device publishes no product name', async () => {
      const connector = withDevices([{ serialNumber: 'M-76AB5599' }]);

      const devices = await connector.searchDevices();

      expect(devices.map(d => d.name)).toEqual(['Keystone']);
    });

    it('maps an enumeration DOMException to a five-digit HWK code, not its legacy code', async () => {
      const connector = newConnector(
        exactTransportClass([], {
          getKeystoneDevices: jest
            .fn()
            .mockRejectedValue(new DOMException('device is gone', 'NotFoundError')),
        })
      );

      const scan = connector.searchDevices();
      await expect(scan).rejects.toThrow('device is gone');
      await expect(scan).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceNotFound,
        origin: 'transport',
      });
    });

    it('lists devices without opening/claiming (no mfp yet)', async () => {
      const connector = newConnector(fakeTransportClass(fakeTransport({})));
      const devices = await connector.searchDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('');
      expect(devices[0].connectId).not.toContain('FAKE-SERIAL');
      expect(parseHardwareRuntimeId(devices[0].connectId)).toMatchObject({
        kind: 'search-target',
        vendor: 'keystone',
      });
      expect(devices[0].connectionType).toBe('usb');
    });

    it('rotates opaque targets on every scan and rejects an expired target', async () => {
      const connectDevice = jest.fn().mockResolvedValue(versionTransport());
      const connector = newConnector(
        exactTransportClass([{ serialNumber: 'SAME-SERIAL', productName: 'Keystone 3 Pro' }], {
          connectDevice,
        })
      );

      const firstTarget = (await connector.searchDevices())[0].connectId;
      const secondTarget = (await connector.searchDevices())[0].connectId;

      expect(secondTarget).not.toBe(firstTarget);
      await expect(connector.connect(firstTarget)).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceNotFound,
      });
      expect(connectDevice).not.toHaveBeenCalled();
    });

    it('invalidates selected targets when the connector resets', async () => {
      const connectDevice = jest.fn().mockResolvedValue(versionTransport());
      const connector = newConnector(
        exactTransportClass([{ serialNumber: 'RESET-ME' }], { connectDevice })
      );
      const target = (await connector.searchDevices())[0].connectId;

      connector.reset();

      await expect(connector.connect(target)).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceNotFound,
      });
      expect(connectDevice).not.toHaveBeenCalled();
    });

    it('invalidates the previous snapshot before a failed replacement scan', async () => {
      const connectDevice = jest.fn().mockResolvedValue(versionTransport());
      const getKeystoneDevices = jest
        .fn()
        .mockResolvedValueOnce([{ serialNumber: 'OLD' }])
        .mockRejectedValueOnce(new Error('enumeration failed'));
      const connector = newConnector(
        exactTransportClass([], { connectDevice, getKeystoneDevices })
      );
      const oldTarget = (await connector.searchDevices())[0].connectId;

      await expect(connector.searchDevices()).rejects.toThrow('enumeration failed');

      await expect(connector.connect(oldTarget)).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceNotFound,
      });
      expect(connectDevice).not.toHaveBeenCalled();
    });

    it('publishes only the newest concurrent selection scan', async () => {
      let resolveFirst: ((devices: KeystoneUsbDeviceDescriptor[]) => void) | undefined;
      let resolveSecond: ((devices: KeystoneUsbDeviceDescriptor[]) => void) | undefined;
      const getKeystoneDevices = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<KeystoneUsbDeviceDescriptor[]>(resolve => {
              resolveFirst = resolve;
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise<KeystoneUsbDeviceDescriptor[]>(resolve => {
              resolveSecond = resolve;
            })
        );
      const connector = newConnector(exactTransportClass([], { getKeystoneDevices }));

      const firstScan = connector.searchDevices();
      const secondScan = connector.searchDevices();
      resolveSecond?.([{ serialNumber: 'NEW' }]);
      const secondTargets = await secondScan;
      resolveFirst?.([{ serialNumber: 'OLD' }]);

      await expect(firstScan).resolves.toEqual([]);
      expect(secondTargets).toHaveLength(1);
    });

    it('keeps availability targets exact-connectable without expiring the UI snapshot', async () => {
      const first = { serialNumber: 'FIRST', productName: 'Keystone 3 Pro' };
      const second = { serialNumber: 'SECOND', productName: 'Keystone 3 Pro' };
      const connectDevice = jest.fn().mockResolvedValue(versionTransport());
      const connector = newConnector(exactTransportClass([first, second], { connectDevice }));

      const uiTarget = (await connector.searchDevices())[0].connectId;
      const firstAvailabilityTargets = await connector.searchDevices({ purpose: 'availability' });
      const secondAvailabilityTargets = await connector.searchDevices({ purpose: 'availability' });

      await expect(
        connector.connectTarget({
          type: 'search-target',
          searchTargetId: firstAvailabilityTargets[0].connectId,
        })
      ).rejects.toMatchObject({ code: HardwareErrorCode.DeviceNotFound });
      await connector.connectTarget({ type: 'search-target', searchTargetId: uiTarget });
      await connector.connectTarget({
        type: 'search-target',
        searchTargetId: secondAvailabilityTargets[1].connectId,
      });

      expect(connectDevice).toHaveBeenNthCalledWith(1, first, expect.any(Object));
      expect(connectDevice).toHaveBeenNthCalledWith(2, second, expect.any(Object));
    });
  });

  describe('connect', () => {
    it('uses exact-device opening for a default connect when the platform supports it', async () => {
      const onlyDevice = { serialNumber: 'ONLY', productName: 'Keystone 3 Pro' };
      const connectDevice = jest.fn().mockResolvedValue(versionTransport());
      const ambientConnect = jest.fn().mockRejectedValue(new Error('ambient connect must not run'));
      const connector = newConnector(
        exactTransportClass([onlyDevice], { connect: ambientConnect, connectDevice })
      );

      const session = await connector.connect();

      expect(connectDevice).toHaveBeenCalledWith(onlyDevice, expect.any(Object));
      expect(ambientConnect).not.toHaveBeenCalled();
      expect(session.deviceInfo.serialNumber).toBe('ONLY');
    });

    it('requires an explicit choice for a default connect with multiple devices', async () => {
      const connectDevice = jest.fn();
      const ambientConnect = jest.fn().mockRejectedValue(new Error('ambient connect must not run'));
      const connector = newConnector(
        exactTransportClass([{ serialNumber: 'FIRST' }, { serialNumber: 'SECOND' }], {
          connect: ambientConnect,
          connectDevice,
        })
      );

      await expect(connector.connect()).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceOneDeviceOnly,
      });
      expect(connectDevice).not.toHaveBeenCalled();
      expect(ambientConnect).not.toHaveBeenCalled();
    });

    it('opens the exact descriptor selected from a multi-device search', async () => {
      const first = { serialNumber: 'FIRST', productName: 'Keystone 3 Pro' };
      const second = { serialNumber: 'SECOND', productName: 'Keystone 3 Pro' };
      const connectDevice = jest.fn().mockResolvedValue(versionTransport());
      const connector = newConnector(exactTransportClass([first, second], { connectDevice }));
      const targets = await connector.searchDevices();

      const session = await connector.connectTarget({
        type: 'search-target',
        searchTargetId: targets[1].connectId,
      });

      expect(connectDevice).toHaveBeenCalledWith(second, expect.any(Object));
      expect(session.deviceInfo.serialNumber).toBe('SECOND');
    });

    it('disposes platform transport resources exactly once when a session ends', async () => {
      const transport = versionTransport();
      const disposeTransport = jest.fn();
      const connector = newConnector({ ...fakeTransportClass(transport), disposeTransport });

      const session = await connector.connect();
      await connector.disconnect(session.sessionId);
      await connector.disconnect(session.sessionId);
      connector.reset();

      expect(disposeTransport).toHaveBeenCalledTimes(1);
      expect(disposeTransport).toHaveBeenCalledWith(transport);
    });

    it('selects by descriptor identity when serial numbers are duplicated', async () => {
      const first = { serialNumber: 'DUPLICATE', productName: 'Keystone 3 Pro' };
      const second = { serialNumber: 'DUPLICATE', productName: 'Keystone 3 Pro' };
      const connectDevice = jest.fn().mockResolvedValue(versionTransport());
      const connector = newConnector(exactTransportClass([first, second], { connectDevice }));
      const targets = await connector.searchDevices();

      await connector.connect(targets[1].connectId);

      expect(connectDevice).toHaveBeenCalledWith(second, expect.any(Object));
    });

    it('fails closed when a platform cannot target one of multiple descriptors', async () => {
      const ambientConnect = jest.fn().mockResolvedValue(versionTransport());
      const connector = newConnector(
        exactTransportClass([{ serialNumber: 'FIRST' }, { serialNumber: 'SECOND' }], {
          connect: ambientConnect,
        })
      );
      const targets = await connector.searchDevices();

      await expect(connector.connect(targets[1].connectId)).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceOneDeviceOnly,
      });
      expect(ambientConnect).not.toHaveBeenCalled();
    });

    it('finds the expected wallet across multiple USB descriptors without an ambient pick', async () => {
      const first = { serialNumber: 'FIRST', productName: 'Keystone 3 Pro' };
      const second = { serialNumber: 'SECOND', productName: 'Keystone 3 Pro' };
      const firstTransport = versionTransport('deadbeef');
      const secondTransport = versionTransport();
      const connectDevice = jest.fn((device: KeystoneUsbDeviceDescriptor) =>
        Promise.resolve(device === first ? firstTransport : secondTransport)
      );
      const disposeTransport = jest.fn();
      const ambientConnect = jest.fn().mockRejectedValue(new Error('ambient connect must not run'));
      const connector = newConnector(
        exactTransportClass([first, second], {
          connect: ambientConnect,
          connectDevice,
          disposeTransport,
        })
      );

      const session = await connector.connectTarget({
        type: 'expected-device-identity',
        deviceIdentity: FAKE_MFP,
      });

      expect(connectDevice.mock.calls.map(([device]) => device)).toEqual([first, second]);
      expect(ambientConnect).not.toHaveBeenCalled();
      expect(session.deviceInfo.serialNumber).toBe('SECOND');
      expect(session.deviceInfo.raw).toEqual({ masterFingerprint: FAKE_MFP });
      expect(disposeTransport).toHaveBeenCalledTimes(1);
      expect(disposeTransport).toHaveBeenCalledWith(firstTransport);

      await connector.disconnect(session.sessionId);
      expect(disposeTransport).toHaveBeenCalledTimes(2);
      expect(disposeTransport).toHaveBeenLastCalledWith(secondTransport);
    });

    it('fails closed after every connected Keystone has the wrong wallet fingerprint', async () => {
      const connectDevice = jest.fn().mockResolvedValue(versionTransport('deadbeef'));
      const connector = newConnector(
        exactTransportClass([{ serialNumber: 'FIRST' }, { serialNumber: 'SECOND' }], {
          connectDevice,
        })
      );

      await expect(
        connector.connectTarget({
          type: 'expected-device-identity',
          deviceIdentity: FAKE_MFP,
        })
      ).rejects.toMatchObject({ code: HardwareErrorCode.DeviceMismatch });
      expect(connectDevice).toHaveBeenCalledTimes(2);
    });

    it('keeps the transport session separate from the device-reported mfp', async () => {
      const session = await versionConnector().connect();

      expect(parseHardwareRuntimeId(session.sessionId)).toMatchObject({
        kind: 'link',
        vendor: 'keystone',
      });
      expect(session.deviceInfo.deviceId).toBe('');
      expect(session.deviceInfo.raw).toEqual({ masterFingerprint: FAKE_MFP });
      expect(session.deviceInfo.capabilities?.persistentDeviceIdentity).toBe(false);
      expect(session.deviceInfo.vendor).toBe('keystone');
      expect(session.deviceInfo.connectionType).toBe('usb');
      expect(session.deviceInfo.firmwareVersion).toBe('1.7.0');
    });

    it('fails closed when the connected wallet does not match the expected MFP', async () => {
      await expect(versionConnector().connect('deadbeef')).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceMismatch,
      });
    });

    it('rejects a walletMFP that is not exactly 4 bytes encoded as 8 hex characters', async () => {
      const connector = newConnector(fakeTransportClass(versionTransport('aabbccddee')));

      await expect(connector.connect()).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceMismatch,
      });
    });
  });

  describe('call("resolveUr", ...)', () => {
    it('encodes the outgoing UR as a bech32 string and decodes the response back to {urType, urData}', async () => {
      const request = EthSignRequest.constructETHRequest(
        Buffer.from('deadbeef', 'hex'),
        4, // typedTransaction
        "44'/60'/0'/0/0",
        FAKE_MFP,
        '2b5893f2-52e2-4ba8-9d5e-6c2b6f5f1c11'
      );
      const requestSdkUr = request.toUR();
      const requestUr = { urType: requestSdkUr.type, urData: requestSdkUr.cbor.toString('hex') };

      let sentEncodedUr = '';
      const connector = versionConnector({
        [Actions.CMD_RESOLVE_UR]: data => {
          sentEncodedUr = data as string;
          const decodedRequest = decodeUrString(sentEncodedUr);
          expect(decodedRequest.urType).toBe('eth-sign-request');
          const requestId = EthSignRequest.fromCBOR(
            Buffer.from(decodedRequest.urData, 'hex')
          ).getRequestId();
          const signature = new ETHSignature(Buffer.alloc(65, 0x07), requestId);
          const signatureSdkUr = signature.toUR();
          return {
            payload: encodeUrString(signatureSdkUr.type, signatureSdkUr.cbor.toString('hex')),
          };
        },
      });
      const session = await connector.connect();

      const result = await connector.call(session.sessionId, 'resolveUr', requestUr);

      expect(sentEncodedUr).toMatch(/^UR:ETH-SIGN-REQUEST\//);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect((result.payload as { urType: string }).urType).toBe('eth-signature');
    });
  });

  describe('on-device operation events', () => {
    const answerBytes = {
      [Actions.CMD_RESOLVE_UR]: () => ({ payload: encodeUrString('bytes', 'deadbeef') }),
    };

    it('brackets signing resolveUr calls with ConfirmOnDevice / InteractionComplete', async () => {
      // The USB channel is otherwise silent while the device sits on an approval screen; hosts
      // render these events with the same handler they already have for Ledger.
      const connector = versionConnector(answerBytes);
      const events: string[] = [];
      connector.on('ui-event', e => events.push((e as { type: string }).type));

      const session = await connector.connect();
      await connector.call(session.sessionId, 'resolveUr', { urType: 'x', urData: 'de' });

      expect(events).toEqual([
        EConnectorInteraction.Searching, // connect()'s own
        EConnectorInteraction.ConfirmOnDevice,
        EConnectorInteraction.InteractionComplete,
      ]);
    });

    it('asks a different wallet for its own public-data approval', async () => {
      let walletMFP = FAKE_MFP;
      const connector = newConnector(
        fakeTransportClass(versionTransport(() => walletMFP, answerBytes))
      );
      const confirmations: string[] = [];
      connector.on('ui-event', e => {
        const { type } = e as { type: string };
        if (type === EConnectorInteraction.ConfirmOnDevice) confirmations.push(type);
      });

      const first = await connector.connect();
      await connector.call(first.sessionId, 'resolveUr', {
        urType: 'qr-hardware-call',
        urData: 'de',
      });
      expect(confirmations).toHaveLength(1);

      await connector.disconnect(first.sessionId);
      walletMFP = 'aabbccdd';
      const other = await connector.connect();
      await connector.call(other.sessionId, 'resolveUr', {
        urType: 'qr-hardware-call',
        urData: 'ad',
      });

      expect(confirmations).toHaveLength(2);
    });

    it('shows public-data confirmation only once across internal USB session recovery', async () => {
      const connector = versionConnector(answerBytes);
      const events: string[] = [];
      connector.on('ui-event', e => events.push((e as { type: string }).type));

      const firstSession = await connector.connect();
      await connector.call(firstSession.sessionId, 'resolveUr', {
        urType: 'qr-hardware-call',
        urData: 'de',
      });
      await connector.disconnect(firstSession.sessionId);
      const recoveredSession = await connector.connect();
      await connector.call(recoveredSession.sessionId, 'resolveUr', {
        urType: 'qr-hardware-call',
        urData: 'ad',
      });
      await connector.call(recoveredSession.sessionId, 'resolveUr', {
        urType: 'eth-sign-request',
        urData: 'beef',
      });

      expect(events).toEqual([
        EConnectorInteraction.Searching,
        EConnectorInteraction.ConfirmOnDevice,
        EConnectorInteraction.InteractionComplete,
        EConnectorInteraction.Searching,
        EConnectorInteraction.ConfirmOnDevice,
        EConnectorInteraction.InteractionComplete,
      ]);
    });

    it('always closes the bracket, even when the device rejects', async () => {
      // A rejection without InteractionComplete would leave the host's
      // "confirm on device" toast up forever.
      const connector = versionConnector({
        [Actions.CMD_RESOLVE_UR]: () => {
          throw new TransportError('rejected', Status.PRS_PARSING_REJECTED);
        },
      });
      const events: string[] = [];
      connector.on('ui-event', e => events.push((e as { type: string }).type));

      const session = await connector.connect();
      const result = await connector.call(session.sessionId, 'resolveUr', {
        urType: 'x',
        urData: 'de',
      });

      expect(result.success).toBe(false);
      expect(events.slice(1)).toEqual([
        EConnectorInteraction.ConfirmOnDevice,
        EConnectorInteraction.InteractionComplete,
      ]);
    });
  });

  describe('multi-part UR responses', () => {
    it('fails immediately when the transport response does not contain enough BC-UR parts', async () => {
      const encoder = new UREncoder(new UR(Buffer.alloc(220, 0x5a), 'bytes'), 40);
      const firstPart = encoder.nextPart().toUpperCase();
      expect(firstPart).toMatch(/^UR:BYTES\/1-/);

      const connector = versionConnector({
        [Actions.CMD_RESOLVE_UR]: () => ({ payload: firstPart }),
      });
      const session = await connector.connect();

      const result = await connector.call(session.sessionId, 'resolveUr', {
        urType: 'eth-sign-request',
        urData: 'deadbeef',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(HardwareErrorCode.PayloadTooLarge);
      expect(result.error.message).toContain('incomplete BC-UR response');
    });
  });

  describe('call("checkLockStatus", ...)', () => {
    it('passes through the device-reported lock status', async () => {
      const connector = versionConnector({
        [Actions.CMD_CHECK_LOCK_STATUS]: () => ({ payload: true }),
      });
      const session = await connector.connect();

      const result = await connector.call(session.sessionId, 'checkLockStatus', undefined);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload).toEqual({ locked: true });
    });
  });

  describe('error mapping', () => {
    // A timeout is two-faced (device waiting for a human vs dead pipe), so an honest unset beats
    // a plausible mislabel.
    it.each([
      [Status.ERR_DEVICE_NOT_FOUND, 'transport'],
      [Status.ERR_TIMEOUT, undefined],
    ])('labels pipe-level status %s with origin %s', async (status, origin) => {
      const error = await resolveUrError(new TransportError('boom', status));
      expect(error.params?.origin).toBe(origin);
    });

    // Status 0..15 are firmware response status words, so every one of them means the device
    // answered; tearing the USB session down there would break "decline on screen, then retry".
    it.each<[number, HardwareErrorCode]>([
      [Status.RSP_FAILURE_CODE, HardwareErrorCode.UnknownError],
      [Status.PRS_INVALID_TOTAL_PACKETS, HardwareErrorCode.InvalidParams],
      [Status.PRS_INVALID_INDEX, HardwareErrorCode.InvalidParams],
      [Status.PRS_PARSING_REJECTED, HardwareErrorCode.UserRejected],
      [Status.PRS_PARSING_ERROR, HardwareErrorCode.InvalidParams],
      [Status.PRS_PARSING_DISALLOWED, HardwareErrorCode.DeviceLocked],
      [Status.PRS_PARSING_UNMATCHED, HardwareErrorCode.InvalidParams],
      [Status.PRS_PARSING_MISMATCHED_WALLET, HardwareErrorCode.DeviceMismatch],
      [Status.PRS_PARSING_VERIFY_PASSWORD_ERROR, HardwareErrorCode.PinInvalid],
      [Status.PRS_EXPORT_ADDRESS_UNSUPPORTED_CHAIN, HardwareErrorCode.ChainNotSupported],
      [Status.PRS_EXPORT_ADDRESS_INVALID_PARAMS, HardwareErrorCode.InvalidParams],
      [Status.PRS_EXPORT_ADDRESS_ERROR, HardwareErrorCode.UnknownError],
      [Status.PRS_EXPORT_ADDRESS_DISALLOWED, HardwareErrorCode.DeviceLocked],
      [Status.PRS_EXPORT_ADDRESS_REJECTED, HardwareErrorCode.UserRejected],
      [Status.PRS_EXPORT_ADDRESS_BUSY, HardwareErrorCode.DeviceBusyInternal],
      // Forward-compat: a status word the enum does not name yet still came back inside a
      // response frame, so the session must survive it.
      [Status.PRS_EXPORT_ADDRESS_BUSY + 1, HardwareErrorCode.UnknownError],
    ])('keeps firmware status %s on the device side as code %s', async (status, code) => {
      const error = await resolveUrError(new TransportError('unknown error', status));
      expect({ code: error.code, origin: error.params?.origin }).toEqual({
        code,
        origin: 'device',
      });
    });

    it('names a firmware status the device sent no text for', async () => {
      // What hw-transport-webusb throws when the response frame carries no
      // payload text: `TransportError('unknown error', status)`.
      const error = await resolveUrError(
        new TransportError('unknown error', Status.PRS_PARSING_VERIFY_PASSWORD_ERROR)
      );
      expect(error.message).toContain('password verification failed');
    });

    it('keeps a device-supplied message instead of the table wording', async () => {
      const error = await resolveUrError(
        new TransportError('wallet is exporting another address', Status.PRS_EXPORT_ADDRESS_BUSY)
      );
      expect(error.message).toContain('wallet is exporting another address');
    });

    it('maps ERR_DATA_TOO_LARGE to PayloadTooLarge', async () => {
      const error = await resolveUrError(
        new TransportError('too large', Status.ERR_DATA_TOO_LARGE)
      );
      expect(error.code).toBe(HardwareErrorCode.PayloadTooLarge);
    });

    it('maps a legacy WebUSB NotFoundError code to DeviceNotFound', async () => {
      const error = await resolveUrError(
        Object.assign(new Error('The device was disconnected'), { name: 'NotFoundError', code: 8 }),
        'qr-hardware-call'
      );
      expect(error.code).toBe(HardwareErrorCode.DeviceNotFound);
      expect(error.params).toMatchObject({
        domExceptionName: 'NotFoundError',
        origin: 'transport',
      });
    });

    it('returns DeviceNotFound as data for an unknown sessionId, never throwing', async () => {
      const connector = newConnector(fakeTransportClass(fakeTransport({})));
      const result = await connector.call('nonexistent-session', 'resolveUr', {});
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(HardwareErrorCode.DeviceNotFound);
    });
  });

  describe('cancel / uiResponse', () => {
    it('are safe no-ops (no protocol-level cancel or UI relay over USB)', async () => {
      const connector = newConnector(fakeTransportClass(fakeTransport({})));
      await expect(connector.cancel('any')).resolves.toBeUndefined();
      expect(() => connector.uiResponse({ type: 'cancel' as any })).not.toThrow();
    });
  });
});
