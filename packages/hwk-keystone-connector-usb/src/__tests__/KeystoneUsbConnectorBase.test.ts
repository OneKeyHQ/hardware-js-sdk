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
 * A fake `TransportHID` that behaves like the real per-call
 * open→transfer→close cycle closely enough to exercise
 * `KeystoneUsbConnectorBase` end to end: it decodes whatever UR string the
 * connector sends and can be told what to answer per `Actions` value,
 * matching the real wire contract (`send()` resolves the already-parsed JSON
 * response body, per `TransportWebUSB`/`TransportNodeUSB` source).
 */
function fakeTransport(
  handlers: Partial<Record<number, (data: unknown) => unknown>>
): TransportHID {
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

function fakeTransportClass(transport: TransportHID): KeystoneUsbTransportStatic {
  return {
    connect: () => Promise.resolve(transport),
    getKeystoneDevices: () =>
      Promise.resolve([{ serialNumber: 'FAKE-SERIAL', productName: 'Keystone 3 Pro' }]),
    isSupported: () => Promise.resolve(true),
  };
}

describe('KeystoneUsbConnectorBase', () => {
  describe('searchDevices', () => {
    it('lists devices without opening/claiming (no mfp yet)', async () => {
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(fakeTransport({})), {
        timeoutMs: 1000,
      });
      const devices = await connector.searchDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('');
      expect(devices[0].connectId).not.toContain('FAKE-SERIAL');
      expect(parseHardwareRuntimeId(devices[0].connectId)).toMatchObject({
        kind: 'search-target',
        vendor: 'keystone',
        connectionType: 'usb',
      });
      expect(devices[0].connectionType).toBe('usb');
    });

    it('rotates opaque targets on every scan and rejects an expired target', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const connectDevice = jest.fn().mockResolvedValue(transport);
      const transportClass: KeystoneUsbTransportStatic = {
        connect: jest.fn().mockRejectedValue(new Error('ambient connect must not run')),
        connectDevice,
        getKeystoneDevices: () =>
          Promise.resolve([{ serialNumber: 'SAME-SERIAL', productName: 'Keystone 3 Pro' }]),
        isSupported: () => Promise.resolve(true),
      };
      const connector = new KeystoneUsbConnectorBase(transportClass, { timeoutMs: 1000 });

      const firstTarget = (await connector.searchDevices())[0].connectId;
      const secondTarget = (await connector.searchDevices())[0].connectId;

      expect(secondTarget).not.toBe(firstTarget);
      await expect(connector.connect(firstTarget)).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceNotFound,
      });
      expect(connectDevice).not.toHaveBeenCalled();
    });

    it('invalidates selected targets when the connector resets', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const connectDevice = jest.fn().mockResolvedValue(transport);
      const connector = new KeystoneUsbConnectorBase(
        {
          connect: jest.fn().mockRejectedValue(new Error('ambient connect must not run')),
          connectDevice,
          getKeystoneDevices: () => Promise.resolve([{ serialNumber: 'RESET-ME' }]),
          isSupported: () => Promise.resolve(true),
        },
        { timeoutMs: 1000 }
      );
      const target = (await connector.searchDevices())[0].connectId;

      connector.reset();

      await expect(connector.connect(target)).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceNotFound,
      });
      expect(connectDevice).not.toHaveBeenCalled();
    });

    it('invalidates the previous snapshot before a failed replacement scan', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const connectDevice = jest.fn().mockResolvedValue(transport);
      const getKeystoneDevices = jest
        .fn()
        .mockResolvedValueOnce([{ serialNumber: 'OLD' }])
        .mockRejectedValueOnce(new Error('enumeration failed'));
      const connector = new KeystoneUsbConnectorBase(
        {
          connect: jest.fn().mockRejectedValue(new Error('ambient connect must not run')),
          connectDevice,
          getKeystoneDevices,
          isSupported: () => Promise.resolve(true),
        },
        { timeoutMs: 1000 }
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
      const connector = new KeystoneUsbConnectorBase(
        {
          connect: jest.fn().mockRejectedValue(new Error('ambient connect must not run')),
          getKeystoneDevices,
          isSupported: () => Promise.resolve(true),
        },
        { timeoutMs: 1000 }
      );

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
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const connectDevice = jest.fn().mockResolvedValue(transport);
      const connector = new KeystoneUsbConnectorBase(
        {
          connect: jest.fn().mockRejectedValue(new Error('ambient connect must not run')),
          connectDevice,
          getKeystoneDevices: () => Promise.resolve([first, second]),
          isSupported: () => Promise.resolve(true),
        },
        { timeoutMs: 1000 }
      );

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
      const selectedTransport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const ambientConnect = jest.fn().mockRejectedValue(new Error('ambient connect must not run'));
      const connectDevice = jest.fn().mockResolvedValue(selectedTransport);
      const connector = new KeystoneUsbConnectorBase(
        {
          connect: ambientConnect,
          connectDevice,
          getKeystoneDevices: () => Promise.resolve([onlyDevice]),
          isSupported: () => Promise.resolve(true),
        },
        { timeoutMs: 1000 }
      );

      const session = await connector.connect();

      expect(connectDevice).toHaveBeenCalledWith(onlyDevice, expect.any(Object));
      expect(ambientConnect).not.toHaveBeenCalled();
      expect(session.deviceInfo.serialNumber).toBe('ONLY');
    });

    it('requires an explicit choice for a default connect with multiple devices', async () => {
      const ambientConnect = jest.fn().mockRejectedValue(new Error('ambient connect must not run'));
      const connectDevice = jest.fn();
      const connector = new KeystoneUsbConnectorBase(
        {
          connect: ambientConnect,
          connectDevice,
          getKeystoneDevices: () =>
            Promise.resolve([{ serialNumber: 'FIRST' }, { serialNumber: 'SECOND' }]),
          isSupported: () => Promise.resolve(true),
        },
        { timeoutMs: 1000 }
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
      const selectedTransport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const connectDevice = jest.fn().mockResolvedValue(selectedTransport);
      const transportClass: KeystoneUsbTransportStatic = {
        connect: jest.fn().mockRejectedValue(new Error('ambient connect must not run')),
        connectDevice,
        getKeystoneDevices: () => Promise.resolve([first, second]),
        isSupported: () => Promise.resolve(true),
      };
      const connector = new KeystoneUsbConnectorBase(transportClass, { timeoutMs: 1000 });
      const targets = await connector.searchDevices();

      const session = await connector.connectTarget({
        type: 'search-target',
        searchTargetId: targets[1].connectId,
      });

      expect(connectDevice).toHaveBeenCalledWith(second, expect.any(Object));
      expect(session.deviceInfo.serialNumber).toBe('SECOND');
    });

    it('disposes platform transport resources exactly once when a session ends', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const disposeTransport = jest.fn();
      const connector = new KeystoneUsbConnectorBase(
        {
          ...fakeTransportClass(transport),
          disposeTransport,
        },
        { timeoutMs: 1000 }
      );

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
      const selectedTransport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const connectDevice = jest.fn().mockResolvedValue(selectedTransport);
      const transportClass: KeystoneUsbTransportStatic = {
        connect: jest.fn().mockRejectedValue(new Error('ambient connect must not run')),
        connectDevice,
        getKeystoneDevices: () => Promise.resolve([first, second]),
        isSupported: () => Promise.resolve(true),
      };
      const connector = new KeystoneUsbConnectorBase(transportClass, { timeoutMs: 1000 });
      const targets = await connector.searchDevices();

      await connector.connect(targets[1].connectId);

      expect(connectDevice).toHaveBeenCalledWith(second, expect.any(Object));
    });

    it('fails closed when a platform cannot target one of multiple descriptors', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const ambientConnect = jest.fn().mockResolvedValue(transport);
      const transportClass: KeystoneUsbTransportStatic = {
        connect: ambientConnect,
        getKeystoneDevices: () =>
          Promise.resolve([{ serialNumber: 'FIRST' }, { serialNumber: 'SECOND' }]),
        isSupported: () => Promise.resolve(true),
      };
      const connector = new KeystoneUsbConnectorBase(transportClass, { timeoutMs: 1000 });
      const targets = await connector.searchDevices();

      await expect(connector.connect(targets[1].connectId)).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceOneDeviceOnly,
      });
      expect(ambientConnect).not.toHaveBeenCalled();
    });

    it('finds the expected wallet across multiple USB descriptors without an ambient pick', async () => {
      const first = { serialNumber: 'FIRST', productName: 'Keystone 3 Pro' };
      const second = { serialNumber: 'SECOND', productName: 'Keystone 3 Pro' };
      const firstTransport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: 'deadbeef',
        }),
      });
      const secondTransport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
      });
      const connectDevice = jest.fn((device: KeystoneUsbDeviceDescriptor) =>
        Promise.resolve(device === first ? firstTransport : secondTransport)
      );
      const ambientConnect = jest.fn().mockRejectedValue(new Error('ambient connect must not run'));
      const disposeTransport = jest.fn();
      const transportClass: KeystoneUsbTransportStatic = {
        connect: ambientConnect,
        connectDevice,
        getKeystoneDevices: () => Promise.resolve([first, second]),
        isSupported: () => Promise.resolve(true),
        disposeTransport,
      };
      const connector = new KeystoneUsbConnectorBase(transportClass, { timeoutMs: 1000 });

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
      const devices = [{ serialNumber: 'FIRST' }, { serialNumber: 'SECOND' }];
      const connectDevice = jest.fn().mockResolvedValue(
        fakeTransport({
          [Actions.CMD_GET_DEVICE_VERSION]: () => ({
            firmwareVersion: '1.7.0',
            walletMFP: 'deadbeef',
          }),
        })
      );
      const connector = new KeystoneUsbConnectorBase(
        {
          connect: jest.fn().mockRejectedValue(new Error('ambient connect must not run')),
          connectDevice,
          getKeystoneDevices: () => Promise.resolve(devices),
          isSupported: () => Promise.resolve(true),
        },
        { timeoutMs: 1000 }
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
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });

      const session = await connector.connect();

      expect(parseHardwareRuntimeId(session.sessionId)).toMatchObject({
        kind: 'connector-session',
        vendor: 'keystone',
        connectionType: 'usb',
      });
      expect(session.deviceInfo.deviceId).toBe('');
      expect(session.deviceInfo.raw).toEqual({ masterFingerprint: FAKE_MFP });
      expect(session.deviceInfo.capabilities?.persistentDeviceIdentity).toBe(false);
      expect(session.deviceInfo.vendor).toBe('keystone');
      expect(session.deviceInfo.connectionType).toBe('usb');
      expect(session.deviceInfo.firmwareVersion).toBe('1.7.0');
    });

    it('fails closed when the connected wallet does not match the expected MFP', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });

      await expect(connector.connect('deadbeef')).rejects.toMatchObject({
        code: HardwareErrorCode.DeviceMismatch,
      });
    });

    it('rejects a walletMFP that is not exactly 4 bytes encoded as 8 hex characters', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: 'aabbccddee',
        }),
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });

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
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
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
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });
      const session = await connector.connect();

      const result = await connector.call(session.sessionId, 'resolveUr', requestUr);

      expect(sentEncodedUr).toMatch(/^UR:ETH-SIGN-REQUEST\//);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect((result.payload as { urType: string }).urType).toBe('eth-signature');
    });
  });

  describe('on-device interaction events', () => {
    it('brackets signing resolveUr calls with ConfirmOnDevice / InteractionComplete', async () => {
      // The USB channel used to be completely silent while the device sat on
      // an approval screen. Hosts render these with the same handler they
      // already have for Ledger.
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
        [Actions.CMD_RESOLVE_UR]: () => ({ payload: encodeUrString('bytes', 'deadbeef') }),
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });
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

    it('shows public-data confirmation only once across internal USB session recovery', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
        [Actions.CMD_RESOLVE_UR]: () => ({ payload: encodeUrString('bytes', 'deadbeef') }),
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });
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
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
        [Actions.CMD_RESOLVE_UR]: () => {
          throw new TransportError('rejected', Status.PRS_PARSING_REJECTED);
        },
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
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

      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({
          firmwareVersion: '1.7.0',
          walletMFP: FAKE_MFP,
        }),
        [Actions.CMD_RESOLVE_UR]: () => ({ payload: firstPart }),
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 2000,
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
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
        [Actions.CMD_CHECK_LOCK_STATUS]: () => ({ payload: true }),
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });
      const session = await connector.connect();

      const result = await connector.call(session.sessionId, 'checkLockStatus', undefined);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload).toEqual({ locked: true });
    });
  });

  describe('error mapping', () => {
    it('maps a device-rejected TransportError to UserRejected as call data, not a throw', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
        [Actions.CMD_RESOLVE_UR]: () => {
          throw new TransportError('rejected', Status.PRS_PARSING_REJECTED);
        },
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });
      const session = await connector.connect();

      const result = await connector.call(session.sessionId, 'resolveUr', {
        urType: 'eth-sign-request',
        urData: 'de',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(HardwareErrorCode.UserRejected);
      // The rejection is the DEVICE speaking — recovery logic keys on this to
      // keep the session and never channel-switch. Travels via params in the
      // serialized shape.
      expect(result.error.params?.origin).toBe('device');
    });

    it('stamps transport origin on pipe-level failures and leaves timeouts unlabeled', async () => {
      const mkConnector = (status: number) => {
        const transport = fakeTransport({
          [Actions.CMD_GET_DEVICE_VERSION]: () => ({
            firmwareVersion: '1.7.0',
            walletMFP: FAKE_MFP,
          }),
          [Actions.CMD_RESOLVE_UR]: () => {
            throw new TransportError('boom', status);
          },
        });
        return new KeystoneUsbConnectorBase(fakeTransportClass(transport), { timeoutMs: 1000 });
      };

      const gone = mkConnector(Status.ERR_DEVICE_NOT_FOUND);
      const s1 = await gone.connect();
      const r1 = await gone.call(s1.sessionId, 'resolveUr', { urType: 'x', urData: 'de' });
      expect(r1.success).toBe(false);
      if (!r1.success) expect(r1.error.params?.origin).toBe('transport');

      // A timeout is two-faced (device waiting for a human vs dead pipe) —
      // an honest unset beats a plausible mislabel.
      const slow = mkConnector(Status.ERR_TIMEOUT);
      const s2 = await slow.connect();
      const r2 = await slow.call(s2.sessionId, 'resolveUr', { urType: 'x', urData: 'de' });
      expect(r2.success).toBe(false);
      if (!r2.success) expect(r2.error.params?.origin).toBeUndefined();
    });

    it('maps ERR_DATA_TOO_LARGE to PayloadTooLarge', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
        [Actions.CMD_RESOLVE_UR]: () => {
          throw new TransportError('too large', Status.ERR_DATA_TOO_LARGE);
        },
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });
      const session = await connector.connect();

      const result = await connector.call(session.sessionId, 'resolveUr', {
        urType: 'eth-sign-request',
        urData: 'de',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(HardwareErrorCode.PayloadTooLarge);
    });

    it('maps a legacy WebUSB NotFoundError code to DeviceNotFound', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
        [Actions.CMD_RESOLVE_UR]: () => {
          throw Object.assign(new Error('The device was disconnected'), {
            name: 'NotFoundError',
            code: 8,
          });
        },
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });
      const session = await connector.connect();

      const result = await connector.call(session.sessionId, 'resolveUr', {
        urType: 'qr-hardware-call',
        urData: 'de',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(HardwareErrorCode.DeviceNotFound);
      expect(result.error.params).toMatchObject({
        domExceptionName: 'NotFoundError',
        origin: 'transport',
      });
    });

    it('returns DeviceNotFound as data for an unknown sessionId, never throwing', async () => {
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(fakeTransport({})), {
        timeoutMs: 1000,
      });
      const result = await connector.call('nonexistent-session', 'resolveUr', {});
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(HardwareErrorCode.DeviceNotFound);
    });
  });

  describe('cancel / uiResponse', () => {
    it('are safe no-ops (no protocol-level cancel or UI relay over USB)', async () => {
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(fakeTransport({})), {
        timeoutMs: 1000,
      });
      await expect(connector.cancel('any')).resolves.toBeUndefined();
      expect(() => connector.uiResponse({ type: 'cancel' as any })).not.toThrow();
    });
  });
});
