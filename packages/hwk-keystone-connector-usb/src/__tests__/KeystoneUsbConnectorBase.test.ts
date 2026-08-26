import { UR, URDecoder, UREncoder } from '@ngraveio/bc-ur';
import { Actions } from '@keystonehq/hw-transport-usb';
import { Status, TransportError } from '@keystonehq/hw-transport-error';
import { ETHSignature, EthSignRequest } from '@keystonehq/bc-ur-registry-eth';
import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { KeystoneUsbConnectorBase } from '../KeystoneUsbConnectorBase';

import type { KeystoneUsbTransportStatic } from '../KeystoneUsbConnectorBase';
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
      expect(devices[0].connectId).toContain('FAKE-SERIAL');
      expect(devices[0].connectionType).toBe('usb');
    });
  });

  describe('connect', () => {
    it('resolves a session keyed by the device-reported mfp', async () => {
      const transport = fakeTransport({
        [Actions.CMD_GET_DEVICE_VERSION]: () => ({ firmwareVersion: '1.7.0', walletMFP: FAKE_MFP }),
      });
      const connector = new KeystoneUsbConnectorBase(fakeTransportClass(transport), {
        timeoutMs: 1000,
      });

      const session = await connector.connect();

      expect(session.sessionId).toBe(FAKE_MFP);
      expect(session.deviceInfo.deviceId).toBe(FAKE_MFP);
      expect(session.deviceInfo.vendor).toBe('keystone');
      expect(session.deviceInfo.connectionType).toBe('usb');
      expect(session.deviceInfo.firmwareVersion).toBe('1.7.0');
    });

    it('fails closed when the connected wallet does not match the requested deviceId', async () => {
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
