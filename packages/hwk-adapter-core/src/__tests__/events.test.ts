import { describe, it, expect } from 'vitest';
import { DEVICE_EVENT, DEVICE, UI_EVENT, UI_REQUEST, UI_RESPONSE, SDK } from '../index';

describe('event constants', () => {
  it('should export DEVICE_EVENT string', () => {
    expect(DEVICE_EVENT).toBe('DEVICE_EVENT');
  });

  it('should export DEVICE object with correct event names', () => {
    expect(DEVICE.CONNECT).toBe('device-connect');
    expect(DEVICE.DISCONNECT).toBe('device-disconnect');
    expect(DEVICE.CHANGED).toBe('device-changed');
    expect(DEVICE.FEATURES).toBe('features');
  });

  it('should export UI_EVENT string', () => {
    expect(UI_EVENT).toBe('UI_EVENT');
  });

  it('should export UI_REQUEST object with correct event names', () => {
    expect(UI_REQUEST.REQUEST_PIN).toBe('ui-request-pin');
    expect(UI_REQUEST.REQUEST_BUTTON).toBe('ui-request-button');
    expect(UI_REQUEST.REQUEST_PASSPHRASE).toBe('ui-request-passphrase');
    expect(UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE).toBe('ui-request-passphrase-on-device');
    expect(UI_REQUEST.REQUEST_QR_DISPLAY).toBe('ui-request-qr-display');
    expect(UI_REQUEST.REQUEST_QR_SCAN).toBe('ui-request-qr-scan');
    expect(UI_REQUEST.REQUEST_DEVICE_PERMISSION).toBe('ui-request-device-permission');
    expect(UI_REQUEST.REQUEST_SELECT_DEVICE).toBe('ui-request-select-device');
  });

  it('should export UI_RESPONSE object with correct event names', () => {
    expect(UI_RESPONSE.RECEIVE_PIN).toBe('receive-pin');
    expect(UI_RESPONSE.RECEIVE_PASSPHRASE).toBe('receive-passphrase');
    expect(UI_RESPONSE.RECEIVE_PASSPHRASE_ON_DEVICE).toBe('receive-passphrase-on-device');
    expect(UI_RESPONSE.RECEIVE_QR_RESPONSE).toBe('receive-qr-response');
    expect(UI_RESPONSE.RECEIVE_SELECT_DEVICE).toBe('receive-select-device');
    expect(UI_RESPONSE.CANCEL).toBe('cancel');
  });

  it('should export SDK object with correct event names', () => {
    expect(SDK.DEVICE_STUCK).toBe('device-stuck');
    expect(SDK.DEVICE_UNRESPONSIVE).toBe('device-unresponsive');
    expect(SDK.DEVICE_RECOVERED).toBe('device-recovered');
    expect(SDK.DEVICE_INTERACTION).toBe('device-interaction');
  });
});
