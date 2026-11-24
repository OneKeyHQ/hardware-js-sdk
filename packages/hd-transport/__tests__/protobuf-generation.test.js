import { isDeepStrictEqual } from 'util';

import schema from '../messages-protocol-v2.json';

const { applyZcashWireIds } = require('../scripts/protobuf-zcash');
const wireIds = require('../scripts/proto/zcash-wire-ids.json');
const { applyProtocolV2Additions } = require('../scripts/protobuf-v2-additions');

const copy = () => JSON.parse(JSON.stringify(schema));

test('the Zcash source snapshot exactly preserves the existing schema and wire table', () => {
  expect(isDeepStrictEqual(applyZcashWireIds(copy()), schema)).toBe(true);
  const missingIds = copy();
  Object.keys(wireIds).forEach(name => delete missingIds.nested.MessageType.values[name]);
  expect(JSON.stringify(applyZcashWireIds(missingIds))).toBe(JSON.stringify(schema));
});

test('generation refuses firmware definition drift, remapped IDs and ID collisions', () => {
  const drift = copy();
  drift.nested.ZcashGetAddress.fields.show_display.id = 100;
  expect(() => applyZcashWireIds(drift)).toThrow('Zcash firmware contract drift');
  const remapped = copy();
  remapped.nested.MessageType.values.MessageType_ZcashGetAddress = 12345;
  expect(() => applyZcashWireIds(remapped)).toThrow();
  const collision = copy();
  delete collision.nested.MessageType.values.MessageType_ZcashGetAddress;
  collision.nested.MessageType.values.MessageType_Synthetic = 12400;
  expect(() => applyZcashWireIds(collision)).toThrow('Duplicate Zcash wire ID');
});

test('latest additive V2 fields and settings values survive regeneration without replacing existing fields', () => {
  const data = copy();
  delete data.nested.ViewVerifyPage.fields.multisig_policy;
  for (const name of [
    'DeviceNameDisplay',
    'DeviceUsbLock',
    'DeviceRandomKeypad',
    'DeviceFido',
    'DeviceAutolock',
    'DeviceAutoshutdown',
    'DeviceBluetooth',
  ])
    delete data.nested.DeviceSettingsPage.values[name];
  expect(applyProtocolV2Additions(data)).toEqual(schema);
  const collision = copy();
  collision.nested.ViewVerifyPage.fields.multisig_policy.id = 100;
  expect(() => applyProtocolV2Additions(collision)).toThrow('Protocol V2 field drift');
});
