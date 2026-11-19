'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { serve, validate, der, MAX_LINE } = require('../helper/runtime.cjs');

const generation = 'a'.repeat(32);
const ok = payload => ({ success: true, payload });
const identity = { deviceId: 'synthetic-device', serialNo: 'synthetic-serial', deviceType: 'pro2' };
const wallet = { deviceId: identity.deviceId, serialNo: identity.serialNo,
  walletType: 'hidden', passphraseState: 'synthetic-wallet-identity' };
const account = [0x80000054, 0x80000000, 0x80000000];
const envelope = (id, op, params = {}) => ({ v: 1, generation, id, op, params });
const turn = () => new Promise(resolve => setImmediate(resolve));
class SDK extends EventEmitter {
  constructor() { super(); this.calls = []; }
  async init(settings) { this.calls.push(['init', settings]); return true; }
  async dispose() { this.calls.push(['dispose']); }
  cancel(id) { this.calls.push(['cancel', id]); }
  uiResponse(value) { this.calls.push(['uiResponse', value]); this.resolveUI?.(); }
  async searchDevices() { return ok([{ connectId: 'usb1', connectProtocol: 'V2', deviceType: 'pro2' }]); }
  async getDeviceState(id, params) {
    this.calls.push(['state', id, params]);
    return ok({ schemaVersion: 1, protocol: 'V2', identity,
      status: { initialized: true, mode: 'normal' } });
  }
  async openWalletSession(id, params) {
    this.calls.push(['open', id, params]);
    return ok({ protocol: 'V2', ...wallet });
  }
  async btcGetPublicKey(...args) {
    this.calls.push(['xpub', ...args]); return ok({ xpub: 'synthetic-xpub', root_fingerprint: 5 });
  }
  async btcGetAddress(...args) {
    this.calls.push(['address', ...args]); return ok({ address: 'synthetic-address' });
  }
  async btcSignTransaction(...args) {
    this.calls.push(['sign', ...args]);
    return ok({ signatures: ['3006020101020101'], serializedTx: 'untrusted-and-discarded' });
  }
}
function harness(timeout = 1000, sdk = new SDK()) {
  const input = new PassThrough();
  const output = [];
  let died = false;
  const server = serve(sdk, input, line => output.push(JSON.parse(line)), () => { died = true; }, generation, timeout);
  return { sdk, output, input, server, died: () => died,
    send: (id, op, params) => input.write(`${JSON.stringify(envelope(id, op, params))}\n`) };
}
async function ready(t, timeout) {
  const h = harness(timeout);
  t.after(() => h.server.die());
  h.send(1, 'hello'); await turn();
  assert.equal(h.output[0].ok, true);
  assert.deepEqual(h.sdk.calls[0], ['init', { env: 'node-usb', debug: false, fetchConfig: false, transportReconnect: false }]);
  return h;
}
const bound = { connectId: 'usb1', binding: wallet, coin: 'Bitcoin' };
const xpubParams = { ...bound, path: account, scriptType: 'SPENDWITNESS' };
function txParams() {
  return { ...bound, version: 2, locktime: 0,
    inputs: [{ prev_hash: '00'.repeat(32), prev_index: 0, amount: '1000', sequence: 0xffffffff,
      address_n: [...account, 0, 0], script_type: 'SPENDWITNESS' }],
    outputs: [{ amount: '999', address: 'synthetic-address', script_type: 'PAYTOADDRESS' }],
    refTxs: [{ hash: '00'.repeat(32), version: 2, lock_time: 0,
      inputs: [{ prev_hash: '11'.repeat(32), prev_index: 0, script_sig: '', sequence: 0xffffffff }],
      bin_outputs: [{ amount: '1000', script_pubkey: '0014' + '00'.repeat(20) }] }] };
}

test('fixed SDK API routing, V2 state, explicit wallet selection and public projection', async t => {
  const h = await ready(t);
  h.send(2, 'search'); await turn();
  assert.deepEqual(h.output[1].result, [{ connectId: 'usb1', deviceId: identity.deviceId, serialNo: identity.serialNo, model: 'pro2' }]);
  h.send(3, 'open', { connectId: 'usb1', mode: 'select-hidden' }); await turn();
  assert.deepEqual(h.output[2].result, wallet);
  h.send(4, 'xpub', xpubParams); await turn();
  const call = h.sdk.calls.find(c => c[0] === 'xpub');
  assert.equal(call[2], identity.deviceId);
  assert.equal(call[3].passphraseState, wallet.passphraseState);
  assert.equal(call[3].useEmptyPassphrase, undefined);
  assert.equal(call[3].retryCount, 0);
  assert.equal(call[3].showOnOneKey, false);
  assert.equal(call[3].connectProtocol, 'V2');
  h.send(5, 'address', { ...xpubParams, path: [...account, 0, 0] }); await turn();
  assert.equal(h.sdk.calls.find(c => c[0] === 'address')[3].showOnOneKey, true);
  h.send(6, 'sign', txParams()); await turn();
  assert.deepEqual(h.output.at(-1).result, { signatures: [{ index: 0, signature: '3006020101020101' }] });
  assert.equal(JSON.stringify(h.output).includes('serializedTx'), false);
});

test('schema rejects unknown methods, extra fields, sessions, oversized and invalid values', async () => {
  const malformed = [envelope(1, 'wipeDevice'), envelope(1, 'state', { connectId: 'usb1', debug: true }),
    envelope(1, 'xpub', { ...xpubParams, sessionId: 'forbidden' }),
    envelope(1, 'xpub', { ...xpubParams, binding: { ...wallet, walletType: 'standard' } }),
    envelope(1, 'xpub', { ...xpubParams, path: [NaN] }),
    envelope(1, 'xpub', { ...xpubParams, coin: 'Regtest' }),
    { ...envelope(1, 'search'), generation: 'stale' }, { ...envelope(1, 'search'), v: 2 }];
  const badTx = txParams(); badTx.inputs[0].amount = 1000;
  malformed.push(envelope(1, 'sign', badTx));
  for (const message of malformed) assert.throws(() => validate(message, generation));
  validate(envelope(1, 'sign', txParams()), generation);
  const encryption = [0x80000000 + 4541509, 0x80000000 + 1112098098];
  for (const coin of ['Bitcoin', 'Testnet']) {
    validate(envelope(1, 'xpub', { ...bound, coin, path: encryption, scriptType: 'SPENDADDRESS' }), generation);
  }
  for (const params of [
    { ...bound, path: encryption, scriptType: 'SPENDWITNESS' },
    { ...bound, path: [encryption[0], encryption[1], 0x80000000], scriptType: 'SPENDADDRESS' },
    { ...bound, path: [encryption[0]], scriptType: 'SPENDADDRESS' },
    { ...bound, path: [encryption[0], encryption[1] + 1], scriptType: 'SPENDADDRESS' },
    { ...bound, path: [4541509, 1112098098], scriptType: 'SPENDADDRESS' },
  ]) assert.throws(() => validate(envelope(1, 'xpub', params), generation));
  assert.throws(() => validate(envelope(1, 'address', {
    ...bound, path: encryption, scriptType: 'SPENDADDRESS' }), generation));
  const signed = txParams();
  signed.inputs[0].address_n = encryption;
  assert.throws(() => validate(envelope(1, 'sign', signed), generation));
  const h = harness();
  h.input.write('x'.repeat(MAX_LINE));
  await turn();
  assert.equal(h.died(), true);
});

test('storage encryption xpub is forwarded', async t => {
  const h = await ready(t);
  const encryption = [0x80000000 + 4541509, 0x80000000 + 1112098098];
  h.send(2, 'xpub', { ...bound, path: encryption, scriptType: 'SPENDADDRESS' });
  await turn();
  const call = h.sdk.calls.find(c => c[0] === 'xpub');
  assert.deepEqual(call[3].path, encryption);
  assert.equal(call[3].scriptType, 'SPENDADDRESS');
  assert.equal(call[3].showOnOneKey, false);
  assert.equal(h.output.at(-1).ok, true);
  assert.equal(h.died(), false);
});

test('one queue serializes operations across devices; UI reply penetrates a waiting call', async t => {
  const h = await ready(t);
  let release;
  h.sdk.btcGetPublicKey = async () => {
    h.sdk.emit('UI_EVENT', { type: 'ui-request_passphrase', payload: { device: { connectId: 'usb1' } } });
    await new Promise(resolve => { release = resolve; h.sdk.resolveUI = resolve; });
    return ok({ xpub: 'synthetic-xpub' });
  };
  h.send(2, 'xpub', xpubParams); await turn();
  h.send(3, 'state', { connectId: 'usb2' }); await turn();
  assert.equal(h.sdk.calls.some(c => c[0] === 'state' && c[1] === 'usb2'), false);
  const event = h.output.at(-1);
  assert.equal(event.id, 2); assert.equal(event.event, 'passphrase-select');
  assert.equal(typeof release, 'function');
  h.send(4, 'ui', { target: 2, token: event.token, choice: 'device' }); await turn(); await turn();
  assert.deepEqual(h.sdk.calls.find(c => c[0] === 'uiResponse')[1], {
    type: 'ui-receive_passphrase', payload: { value: '', passphraseOnDevice: true, save: false } });
  assert.equal(h.output.find(m => m.id === 2 && m.ok)?.result.xpub, 'synthetic-xpub');
  assert.equal(h.sdk.calls.some(c => c[0] === 'state' && c[1] === 'usb2'), true);
});

test('cancel penetrates pending SDK call, drops queued work and late response', async t => {
  const h = await ready(t);
  let release;
  h.sdk.btcGetAddress = () => new Promise(resolve => { release = resolve; });
  h.send(2, 'address', { ...xpubParams, path: [...account, 0, 0] }); await turn();
  h.send(3, 'state', { connectId: 'usb2' });
  h.send(4, 'cancel', { target: 2 }); await turn();
  assert.equal(h.died(), true);
  assert.equal(h.sdk.calls.some(c => c[0] === 'cancel' && c[1] === 'usb1'), true);
  release(ok({ address: 'late-address' })); await turn();
  assert.equal(h.output.some(m => m.id === 2 && m.ok), false);
  assert.equal(h.sdk.calls.some(c => c[0] === 'state' && c[1] === 'usb2'), false);
});

test('timeouts/disconnect/SDK failure are terminal and never replay side effects', async t => {
  for (const mode of ['timeout', 'disconnect', 'failure']) {
    const h = await ready(t, 15);
    let calls = 0;
    h.sdk.btcGetAddress = () => {
      calls++;
      return mode === 'failure' ? Promise.resolve({ success: false, payload: { error: 'do-not-forward-secret' } })
        : new Promise(() => {});
    };
    h.send(2, 'address', { ...xpubParams, path: [...account, 0, 0] }); await turn();
    if (mode === 'disconnect') h.sdk.emit('device-disconnect', { device: { connectId: 'usb1' } });
    if (mode === 'timeout') await new Promise(resolve => setTimeout(resolve, 30));
    await turn();
    assert.equal(h.died(), true, mode);
    h.send(3, 'address', { ...xpubParams, path: [...account, 0, 0] }); await turn();
    assert.equal(calls, 1);
    assert.equal(JSON.stringify(h.output).includes('do-not-forward-secret'), false);
  }
});

test('disconnect of another device leaves the active wallet request running', async t => {
  const h = await ready(t);
  let release;
  h.sdk.btcGetAddress = () => new Promise(resolve => { release = resolve; });
  h.send(2, 'address', { ...xpubParams, path: [...account, 0, 0] });
  h.send(3, 'state', { connectId: 'usb2' });
  await turn();
  h.sdk.emit('device-disconnect', {});
  h.sdk.emit('device-disconnect', { device: { connectId: 'usb-other' } });
  h.sdk.emit('device-disconnect', { device: { connectId: 'usb2' } });
  await turn();
  assert.equal(h.died(), false);
  assert.equal(h.output.some(m => m.id === 3 && m.ok === false), true);
  assert.equal(h.sdk.calls.some(c => c[0] === 'state' && c[1] === 'usb2'), false);
  release(ok({ address: 'synthetic-address' }));
  await turn();
  assert.equal(h.died(), false);
  assert.equal(h.output.find(m => m.id === 2 && m.ok)?.result.address, 'synthetic-address');
});

test('wallet/device/protocol mismatch fails before address/signing', async t => {
  for (const mutation of ['serialNo', 'deviceId', 'walletType', 'protocol']) {
    const h = await ready(t);
    if (mutation === 'protocol') h.sdk.getDeviceState = async () => ok({ protocol: 'V1' });
    if (mutation === 'walletType') {
      h.sdk.openWalletSession = async () => ok({ protocol: 'V2', ...wallet, walletType: 'standard', passphraseState: null });
      h.send(2, 'open', { connectId: 'usb1', mode: 'select-hidden' });
    } else h.send(2, 'xpub', { ...xpubParams,
      binding: { ...wallet, ...(mutation === 'protocol' ? {} : { [mutation]: 'different' }) } });
    await turn();
    assert.equal(h.died(), true);
    assert.equal(h.output.at(-1).ok, false);
    assert.equal(h.sdk.calls.some(c => c[0] === 'xpub'), false);
  }
});

test('standard binding explicitly asks SDK for empty passphrase; malformed signature arrays fail', async t => {
  const h = await ready(t);
  h.send(2, 'xpub', { ...xpubParams, binding: { ...wallet, walletType: 'standard', passphraseState: null } });
  await turn();
  const params = h.sdk.calls.find(c => c[0] === 'xpub')[3];
  assert.equal(params.useEmptyPassphrase, true);
  assert.equal(params.passphraseState, undefined);
  for (const signatures of [[], [null], ['3006020100020101'], ['3006020180020101'], new Array(1), ['3006020101020101', '3006020101020101']]) {
    const bad = await ready(t);
    bad.sdk.btcSignTransaction = async () => ok({ signatures });
    bad.send(2, 'sign', txParams()); await turn();
    assert.equal(bad.output.at(-1).ok, false);
    assert.equal(bad.died(), true);
  }
  for (const value of ['300602010102010101', '300702020001020101', '00', '30GG']) assert.throws(() => der(value));
});

test('stale UI token, duplicate request IDs and init false fail closed; dispose calls SDK', async t => {
  const h = await ready(t);
  h.send(2, 'ui', { target: 1, token: 1, choice: 'device' }); await turn();
  assert.equal(h.died(), true);
  const duplicate = await ready(t);
  duplicate.send(1, 'search'); await turn();
  assert.equal(duplicate.died(), true);
  const bad = harness(); t.after(() => bad.server.die());
  bad.sdk.init = async () => false;
  bad.send(1, 'hello'); await turn();
  assert.equal(bad.output[0].ok, false);
  const close = await ready(t);
  close.send(2, 'dispose'); await turn();
  assert.equal(close.sdk.calls.some(c => c[0] === 'dispose'), true);
});

test('production entry loads CommonJS SDK/USB exports and reserves stdout before imports', () => {
  const { spawnSync } = require('node:child_process');
  const pathModule = require('node:path');
  const result = spawnSync(process.execPath, ['--require', pathModule.join(__dirname, 'entry_modules.cjs'),
    pathModule.join(__dirname, '../helper/entry.cjs'), '--manifest', 'mock-receipt',
    '--manifest-sha256', '0'.repeat(64), '--smoke'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { v: 1, imports: true, sdkVersion: '1.2.10' });
  assert.equal(result.stderr, '');
});

test('device cancellation returns only a stable cancellation code', async t => {
  const h = await ready(t);
  h.sdk.btcGetPublicKey = async () => ({ success: false, payload: { code: 803, error: 'do-not-forward' } });
  h.send(2, 'xpub', xpubParams); await turn();
  assert.deepEqual(h.output.at(-1).error, { code: 'CANCELLED' });
  assert.equal(h.died(), true);
});

test('cancellation in the same chunk prevents a scheduled operation from starting', async t => {
  const h = await ready(t);
  h.input.write(`${JSON.stringify(envelope(2, 'address', { ...xpubParams, path: [...account, 0, 0] }))}\n${JSON.stringify(envelope(3, 'cancel', { target: 2 }))}\n`);
  await turn();
  assert.equal(h.died(), true);
  assert.equal(h.sdk.calls.some(c => c[0] === 'address' || c[0] === 'state'), false);
  assert.deepEqual(h.output.at(-1), { v: 1, generation, id: 3, ok: true, result: null });
});

test('late state response after invalidation cannot begin address or signing', async t => {
  const h = await ready(t);
  let release;
  h.sdk.getDeviceState = () => new Promise(resolve => { release = resolve; });
  h.send(2, 'address', { ...xpubParams, path: [...account, 0, 0] }); await turn();
  h.send(3, 'cancel', { target: 2 }); await turn();
  release(ok({ schemaVersion: 1, protocol: 'V2', identity, status: { initialized: true, mode: 'normal' } }));
  await turn();
  assert.equal(h.sdk.calls.some(c => c[0] === 'address'), false);
});

test('Core close notifications during discovery state reads do not invalidate the helper', async t => {
  const h = await ready(t);
  const original = h.sdk.getDeviceState.bind(h.sdk);
  h.sdk.getDeviceState = (...args) => {
    h.sdk.emit('UI_EVENT', { type: 'ui-close_window' });
    h.sdk.emit('UI_EVENT', { type: 'ui-close_pin_window', payload: {} });
    return original(...args);
  };
  h.send(2, 'search'); await turn();
  assert.equal(h.died(), false);
  assert.equal(h.output.at(-1).ok, true);
  assert.equal(h.output.at(-1).result.length, 1);
});

test('init must be boolean true; standard open projects only explicit public binding', async t => {
  const bad = harness(); t.after(() => bad.server.die());
  bad.sdk.init = async () => ({ success: false });
  bad.send(1, 'hello'); await turn();
  assert.equal(bad.output[0].ok, false);
  const h = await ready(t);
  h.sdk.openWalletSession = async (id, params) => {
    assert.equal(id, 'usb1');
    assert.equal(params.mode, 'standard');
    assert.equal(params.passphraseState, undefined);
    assert.equal(params.useEmptyPassphrase, undefined);
    return ok({ protocol: 'V2', ...wallet, walletType: 'standard', passphraseState: null, resumed: true });
  };
  h.send(2, 'open', { connectId: 'usb1', mode: 'standard' }); await turn();
  assert.deepEqual(h.output.at(-1).result, { ...wallet, walletType: 'standard', passphraseState: null });
});

test('discovery skips explicit uninitialized and loader states before supported devices', async t => {
  const h = await ready(t);
  const ids = ['new', 'loader', 'ready'];
  h.sdk.searchDevices = async () => ok(ids.map(connectId => ({ connectId, connectProtocol: 'V2', deviceType: 'pro2' })));
  const queried = [];
  h.sdk.getDeviceState = async id => {
    queried.push(id);
    return ok({ schemaVersion: 1, protocol: 'V2', identity: { ...identity, deviceId: id === 'ready' ? identity.deviceId : null },
      status: { initialized: id !== 'new', mode: id === 'loader' ? 'bootloader' : 'normal' } });
  };
  h.send(2, 'search'); await turn();
  assert.equal(h.died(), false);
  assert.deepEqual(queried, ids);
  assert.deepEqual(h.output.at(-1).result, [{ connectId: 'ready', deviceId: identity.deviceId,
    serialNo: identity.serialNo, model: 'pro2' }]);
});

test('locked initialized device is listed without deviceId and unlocks only through open', async t => {
  const h = await ready(t);
  h.sdk.getDeviceState = async () => ok({ schemaVersion: 1, protocol: 'V2',
    identity: { deviceId: null, serialNo: identity.serialNo, deviceType: 'pro2' },
    status: { initialized: true, mode: 'normal', unlocked: false } });
  h.send(2, 'search'); await turn();
  assert.equal(h.died(), false);
  assert.deepEqual(h.output.at(-1).result, [{ connectId: 'usb1', deviceId: null,
    serialNo: identity.serialNo, model: 'pro2' }]);
  h.sdk.openWalletSession = async () => ok({ protocol: 'V2', deviceId: identity.deviceId,
    walletType: 'standard', passphraseState: null });
  h.send(3, 'open', { connectId: 'usb1', mode: 'standard' }); await turn();
  assert.equal(h.output.at(-1).ok, true);
  assert.equal(h.output.at(-1).result.deviceId, identity.deviceId);
  h.send(4, 'xpub', xpubParams); await turn();
  assert.equal(h.output.at(-1).ok, false);
  assert.equal(h.output.at(-1).error.code, 'DEVICE_MISMATCH');
  assert.equal(h.sdk.calls.some(c => c[0] === 'xpub'), false);
});

test('cancel disposes the sdk before the cancel acknowledgement', async t => {
  const h = await ready(t);
  h.sdk.getDeviceState = () => new Promise(() => {});
  h.sdk.dispose = async () => {
    assert.equal(h.output.some(message => message.id === 3), false);
    h.sdk.calls.push(['dispose']);
  };
  h.send(2, 'state', { connectId: 'usb1' }); await turn();
  h.send(3, 'cancel', { target: 2 }); await turn();
  assert.equal(h.died(), true);
  assert.equal(h.sdk.calls.some(c => c[0] === 'dispose'), true);
  assert.deepEqual(h.output.at(-1), { v: 1, generation, id: 3, ok: true, result: null });
});

test('a dispose that does not return still exits within the cleanup budget', async t => {
  const h = await ready(t);
  h.sdk.getDeviceState = () => new Promise(() => {});
  h.sdk.dispose = () => new Promise(() => {});
  h.send(2, 'state', { connectId: 'usb1' }); await turn();
  h.send(3, 'cancel', { target: 2 });
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.equal(h.died(), true);
  assert.equal(h.output.at(-1).id, 3);
});

test('discovery still terminates on communication failures and incomplete state', async t => {
  for (const payload of [null, { schemaVersion: 1, protocol: 'V2', identity, status: { initialized: null, mode: 'unknown' } }]) {
    const h = await ready(t);
    h.sdk.getDeviceState = async () => payload === null
      ? { success: false, payload: { code: 999 } } : ok(payload);
    h.send(2, 'search'); await turn();
    assert.equal(h.died(), true);
    assert.equal(h.output.at(-1).ok, false);
  }
});
