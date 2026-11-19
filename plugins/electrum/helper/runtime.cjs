'use strict';

const MAX_LINE = 1024 * 1024;
const DISPOSE_BUDGET_MS = 200;
const LIMIT = 200;
const INPUT = ['SPENDADDRESS', 'SPENDP2SHWITNESS', 'SPENDWITNESS'];
const CHANGE = ['PAYTOADDRESS', 'PAYTOP2SHWITNESS', 'PAYTOWITNESS'];
const COMMON = { connectProtocol: 'V2', keepSession: true, retryCount: 0 };

class Failure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const requireValue = (value, code = 'INVALID_REQUEST') => {
  if (!value) throw new Failure(code);
};
const object = (value, keys) => {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value));
  requireValue(Object.keys(value).sort().join(',') === [...keys].sort().join(','));
};
const string = (value, max = 256) => {
  requireValue(typeof value === 'string' && value.length > 0 && value.length <= max);
  // eslint-disable-next-line no-control-regex -- reject ASCII controls, including NUL
  requireValue(!/[\x00-\x1f\x7f]/.test(value));
};
const uint = (value, max = 0xffffffff) => {
  requireValue(Number.isSafeInteger(value) && value >= 0 && value <= max);
};
const hex = (value, max, size) => {
  requireValue(typeof value === 'string' && value.length <= max && /^(?:[a-f0-9]{2})*$/.test(value));
  if (size !== undefined) requireValue(value.length === size);
};
// Electrum's wallet-file key, m/4541509'/1112098098'. xpub only; not an account path.
const STORAGE_ENCRYPTION_PATH = [0x80000000 + 4541509, 0x80000000 + 1112098098];
const isStorageEncryptionPath = value => Array.isArray(value)
  && value.length === STORAGE_ENCRYPTION_PATH.length
  && value.every((n, index) => n === STORAGE_ENCRYPTION_PATH[index]);
const path = (value, coin, scriptType) => {
  requireValue(Array.isArray(value) && (value.length === 3 || value.length === 5));
  value.forEach(n => uint(n));
  requireValue(value.slice(0, 3).every(n => n >= 0x80000000));
  if (value.length === 5) requireValue(value[3] <= 1 && value[4] < 0x80000000);
  const purpose = { SPENDADDRESS: 44, SPENDP2SHWITNESS: 49, SPENDWITNESS: 84,
    PAYTOADDRESS: 44, PAYTOP2SHWITNESS: 49, PAYTOWITNESS: 84 }[scriptType];
  requireValue(value[0] === 0x80000000 + purpose);
  requireValue(value[1] === 0x80000000 + (coin === 'Bitcoin' ? 0 : 1));
};
const money = value => {
  requireValue(typeof value === 'string' && /^(0|[1-9][0-9]{0,15})$/.test(value));
  requireValue(BigInt(value) <= 2100000000000000n);
};
const array = (value, max = LIMIT) => {
  requireValue(Array.isArray(value) && value.length > 0 && value.length <= max);
};
const binding = value => {
  object(value, ['serialNo', 'deviceId', 'walletType', 'passphraseState']);
  string(value.serialNo);
  string(value.deviceId);
  requireValue(value.walletType === 'standard' || value.walletType === 'hidden');
  if (value.walletType === 'standard') requireValue(value.passphraseState === null);
  else string(value.passphraseState);
};
function signParams(p) {
  array(p.inputs);
  array(p.outputs);
  array(p.refTxs);
  uint(p.version, 0x7fffffff);
  uint(p.locktime);
  p.inputs.forEach(i => {
    object(i, ['prev_hash', 'prev_index', 'amount', 'sequence', 'address_n', 'script_type']);
    hex(i.prev_hash, 64, 64);
    uint(i.prev_index);
    money(i.amount);
    uint(i.sequence);
    path(i.address_n, p.coin, i.script_type);
    requireValue(i.address_n.length === 5 && INPUT.includes(i.script_type));
  });
  p.outputs.forEach(o => {
    money(o.amount);
    if ('address_n' in o) {
      object(o, ['amount', 'address_n', 'script_type']);
      path(o.address_n, p.coin, o.script_type);
      requireValue(o.address_n.length === 5 && o.address_n[3] === 1 && CHANGE.includes(o.script_type));
    } else if ('address' in o) {
      object(o, ['amount', 'address', 'script_type']);
      string(o.address, 128);
      requireValue(o.script_type === 'PAYTOADDRESS');
    } else {
      object(o, ['amount', 'op_return_data', 'script_type']);
      hex(o.op_return_data, 160);
      requireValue(o.script_type === 'PAYTOOPRETURN' && o.amount === '0');
    }
  });
  const hashes = new Set();
  p.refTxs.forEach(t => {
    object(t, ['hash', 'version', 'lock_time', 'inputs', 'bin_outputs']);
    hex(t.hash, 64, 64);
    requireValue(!hashes.has(t.hash));
    hashes.add(t.hash);
    uint(t.version, 0x7fffffff);
    uint(t.lock_time);
    array(t.inputs, 2000);
    array(t.bin_outputs, 2000);
    t.inputs.forEach(i => {
      object(i, ['prev_hash', 'prev_index', 'script_sig', 'sequence']);
      hex(i.prev_hash, 64, 64);
      uint(i.prev_index);
      uint(i.sequence);
      hex(i.script_sig, 20000);
    });
    t.bin_outputs.forEach(o => {
      object(o, ['amount', 'script_pubkey']);
      money(o.amount);
      hex(o.script_pubkey, 20000);
    });
  });
  p.inputs.forEach(i => requireValue(hashes.has(i.prev_hash)));
}
function validate(m, generation) {
  object(m, ['v', 'generation', 'id', 'op', 'params']);
  requireValue(m.v === 1 && m.generation === generation);
  uint(m.id, Number.MAX_SAFE_INTEGER);
  requireValue(m.id > 0);
  const p = m.params;
  switch (m.op) {
    case 'hello': case 'search': case 'dispose': object(p, []); break;
    case 'state': object(p, ['connectId']); string(p.connectId); break;
    case 'open':
      object(p, ['connectId', 'mode']);
      string(p.connectId);
      requireValue(['standard', 'select-hidden'].includes(p.mode));
      break;
    case 'xpub': case 'address': case 'sign':
      object(p, m.op === 'sign'
        ? ['connectId', 'binding', 'coin', 'inputs', 'outputs', 'refTxs', 'version', 'locktime']
        : ['connectId', 'binding', 'coin', 'path', 'scriptType']);
      string(p.connectId);
      binding(p.binding);
      requireValue(p.coin === 'Bitcoin' || p.coin === 'Testnet');
      if (m.op === 'sign') signParams(p);
      else if (m.op === 'xpub' && isStorageEncryptionPath(p.path)) {
        requireValue(p.scriptType === 'SPENDADDRESS');
      } else {
        path(p.path, p.coin, p.scriptType);
        requireValue(INPUT.includes(p.scriptType));
        if (m.op === 'address') requireValue(p.path.length === 5);
      }
      break;
    case 'cancel': object(p, ['target']); uint(p.target, Number.MAX_SAFE_INTEGER); break;
    case 'ui':
      object(p, ['target', 'token', 'choice']);
      uint(p.target, Number.MAX_SAFE_INTEGER);
      uint(p.token);
      requireValue(p.choice === 'device');
      break;
    default: throw new Failure('INVALID_REQUEST');
  }
}
function der(signature) {
  hex(signature, 144);
  const b = Buffer.from(signature, 'hex');
  requireValue(b.length >= 8 && b[0] === 0x30 && b[1] === b.length - 2, 'SDK_FAILED');
  let offset = 2;
  for (let i = 0; i < 2; i++) {
    requireValue(b[offset++] === 2, 'SDK_FAILED');
    const size = b[offset++];
    requireValue(size > 0 && size <= 33 && offset + size <= b.length, 'SDK_FAILED');
    requireValue(!(b[offset] & 0x80) && !(size > 1 && b[offset] === 0 && !(b[offset + 1] & 0x80)), 'SDK_FAILED');
    requireValue(b.subarray(offset, offset + size).some(n => n !== 0), 'SDK_FAILED');
    offset += size;
  }
  requireValue(offset === b.length, 'SDK_FAILED');
}
function deviceId(value) {
  if (value == null) return null;
  string(value);
  return value;
}
function stateResult(s, discovery = false) {
  if (discovery && s?.schemaVersion === 1 && s.protocol === 'V2'
    && ['pro2', 'neo'].includes(s.identity?.deviceType)
    && (s.status?.initialized === false
      || ['bootloader', 'romloader', 'notInitialized', 'backupMode'].includes(s.status?.mode))) return null;
  requireValue(s && s.protocol === 'V2' && s.schemaVersion === 1 && s.status?.initialized === true
    && s.status.mode === 'normal' && ['pro2', 'neo'].includes(s.identity?.deviceType), 'UNSUPPORTED');
  // A locked Pro2/Neo can omit device_id until openWalletSession unlocks it. serialNo stays the physical id.
  string(s.identity.serialNo);
  return { deviceId: deviceId(s.identity.deviceId), serialNo: s.identity.serialNo, model: s.identity.deviceType };
}
function serve(sdk, input, write, fatal, generation, timeoutMs = 120000, sdkVersion = '1.2.10') {
  let dead = false;
  let initialized = false;
  let buffer = Buffer.alloc(0);
  let highestId = 0;
  let token = 0;
  const active = new Map();
  const pending = [];
  let running;
  const send = message => {
    if (dead) return;
    const line = `${JSON.stringify({ v: 1, generation, ...message })}\n`;
    if (Buffer.byteLength(line) > MAX_LINE) { die(); return; }
    write(line);
  };
  let sessionGeneration = generation;
  function die(ack) {
    if (dead) return;
    dead = true;
    // Reject anything still queued before waiting on transport cleanup.
    sessionGeneration = null;
    active.forEach(a => clearTimeout(a.timer));
    active.clear();
    pending.length = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const reply = ack && typeof ack === 'object' && ack.ok === true ? ack : undefined;
      if (reply) {
        const line = `${JSON.stringify({ v: 1, generation, ...reply })}\n`;
        if (Buffer.byteLength(line) <= MAX_LINE) write(line);
      }
      fatal();
    };
    const timer = setTimeout(finish, DISPOSE_BUDGET_MS);
    if (typeof timer.unref === 'function') timer.unref();
    Promise.resolve().then(() => sdk.dispose()).then(finish, finish);
    try { sdk.cancel(); } catch { /* No diagnostics across the boundary. */ }
  }
  const call = async promise => {
    const response = await promise;
    requireValue(!dead, 'CANCELLED');
    if (response?.success === false && [802, 803, 822].includes(response.payload?.code)) {
      throw new Failure('CANCELLED');
    }
    requireValue(response?.success === true && 'payload' in response, 'SDK_FAILED');
    return response.payload;
  };
  async function operation(m) {
    requireValue(!dead, 'CANCELLED');
    const p = m.params;
    if (m.op === 'hello') {
      requireValue(!initialized, 'INVALID_REQUEST');
      const started = await sdk.init({ env: 'node-usb', debug: false, fetchConfig: false,
        transportReconnect: false });
      requireValue(started === true, 'SDK_FAILED');
      initialized = true;
      return { protocol: 1, sdkVersion };
    }
    requireValue(initialized, 'INVALID_REQUEST');
    if (m.op === 'search') {
      const result = await call(sdk.searchDevices({ ...COMMON }));
      requireValue(Array.isArray(result) && result.length <= 32, 'SDK_FAILED');
      const found = [];
      for (const d of result) {
        if (typeof d.connectId !== 'string' || d.connectProtocol !== 'V2'
          || !['pro2', 'neo'].includes(d.deviceType)) continue;
        // Search results are hints. The initialized state below is authoritative.
        const state = stateResult(await call(sdk.getDeviceState(d.connectId, { ...COMMON, scope: 'runtime' })), true);
        if (!state) continue;
        found.push({ connectId: d.connectId, ...state });
      }
      return found;
    }
    if (m.op === 'dispose') { await sdk.dispose(); initialized = false; return null; }
    const state = stateResult(await call(sdk.getDeviceState(p.connectId, { ...COMMON, scope: 'runtime' })));
    if (m.op === 'state') return state;
    if (m.op === 'open') {
      // Unlock first. A locked device has no device_id yet; the session result is the one that must.
      const wallet = await call(sdk.openWalletSession(p.connectId, { ...COMMON, mode: p.mode }));
      requireValue(wallet && wallet.protocol === 'V2' && wallet.deviceId, 'DEVICE_MISMATCH');
      string(wallet.deviceId);
      if (state.deviceId !== null) requireValue(wallet.deviceId === state.deviceId, 'DEVICE_MISMATCH');
      requireValue(wallet.walletType === (p.mode === 'standard' ? 'standard' : 'hidden'), 'WALLET_MISMATCH');
      const result = { deviceId: wallet.deviceId, serialNo: state.serialNo,
        walletType: wallet.walletType, passphraseState: wallet.passphraseState };
      binding(result);
      return result;
    }
    requireValue(state.deviceId !== null && state.deviceId === p.binding.deviceId
      && state.serialNo === p.binding.serialNo, 'DEVICE_MISMATCH');
    const walletParams = p.binding.walletType === 'standard'
      ? { useEmptyPassphrase: true } : { passphraseState: p.binding.passphraseState };
    const params = { ...COMMON, ...walletParams, coin: p.coin };
    if (m.op === 'xpub') {
      const result = await call(sdk.btcGetPublicKey(p.connectId, state.deviceId,
        { ...params, path: p.path, scriptType: p.scriptType, showOnOneKey: false }));
      string(result.xpub, 128);
      if (result.root_fingerprint !== undefined) uint(result.root_fingerprint);
      return { xpub: result.xpub, rootFingerprint: result.root_fingerprint ?? null };
    }
    if (m.op === 'address') {
      const result = await call(sdk.btcGetAddress(p.connectId, state.deviceId,
        { ...params, path: p.path, scriptType: p.scriptType, showOnOneKey: true }));
      string(result.address, 128);
      return { address: result.address };
    }
    const result = await call(sdk.btcSignTransaction(p.connectId, state.deviceId,
      { ...params, inputs: p.inputs, outputs: p.outputs, refTxs: p.refTxs,
        version: p.version, locktime: p.locktime }));
    requireValue(Array.isArray(result.signatures) && result.signatures.length === p.inputs.length, 'SDK_FAILED');
    return { signatures: Array.from(result.signatures, (signature, index) => {
      der(signature);
      return { index, signature };
    }) };
  }
  sdk.on('UI_EVENT', message => {
    if (dead) return;
    // Core closes its UI after each method, including discovery's internal state reads.
    // Electrum owns message lifetime at the outer flow boundary, so those are not prompts.
    const types = { 'ui-request_pin': 'pin', 'ui-button': 'button',
      'ui-request_passphrase': 'passphrase-select', 'ui-request_passphrase_on_device': 'passphrase' };
    const event = types[message.type];
    if (!event) return;
    const connectId = message.payload?.device?.connectId
      ?? message.payload?.interaction?.device?.connectId;
    const id = running;
    const a = active.get(id);
    if (!a || !a.connectId || (connectId && connectId !== a.connectId)) { die(); return; }
    // This adapter never accepts host PIN/passphrase entry.
    if (event === 'pin' && message.payload?.responseCorrelation) { die(); return; }
    token++;
    if (event === 'passphrase-select') {
      if (a.ui) { die(); return; }
      a.ui = { token };
    }
    send({ id, event, token });
  });
  sdk.on('device-disconnect', payload => {
    const device = payload && typeof payload.device === 'object' ? payload.device : payload;
    const connectId = device && typeof device.connectId === 'string' ? device.connectId : '';
    if (!connectId) return;
    const current = running !== undefined ? active.get(running) : undefined;
    if (current && current.connectId === connectId) {
      die();
      return;
    }
    // Another device unplugging must not abort the wallet that is still connected.
    for (let index = pending.length - 1; index >= 0; index--) {
      const message = pending[index];
      if (message.params?.connectId !== connectId) continue;
      pending.splice(index, 1);
      const queued = active.get(message.id);
      if (queued) clearTimeout(queued.timer);
      active.delete(message.id);
      send({ id: message.id, ok: false, error: { code: 'SDK_FAILED' } });
    }
  });
  function runNext() {
    if (dead || running !== undefined) return;
    const m = pending.shift();
    if (!m) return;
    running = m.id;
    const a = active.get(m.id);
    Promise.resolve().then(() => operation(m)).then(result => {
      send({ id: m.id, ok: true, result });
    }).catch(error => {
      send({ id: m.id, ok: false, error: { code: error instanceof Failure ? error.code : 'SDK_FAILED' } });
      die();
    }).finally(() => {
      clearTimeout(a.timer);
      active.delete(m.id);
      running = undefined;
      runNext();
    });
  }
  function receive(m) {
    try {
      validate(m, sessionGeneration);
      requireValue(m.id > highestId);
      highestId = m.id;
      if (m.op === 'cancel') {
        const a = active.get(m.params.target);
        requireValue(a, 'UI_FAILED');
        if (running === m.params.target) {
          try { sdk.cancel(a.connectId); } catch { /* die() cancels again. */ }
        }
        die({ id: m.id, ok: true, result: null });
        return;
      }
      if (m.op === 'ui') {
        const a = active.get(m.params.target);
        requireValue(running === m.params.target && a?.ui?.token === m.params.token, 'UI_FAILED');
        a.ui = undefined;
        sdk.uiResponse({ type: 'ui-receive_passphrase',
          payload: { value: '', passphraseOnDevice: true, save: false } });
        return;
      }
      requireValue(active.size < 8, 'BUSY');
      const a = { connectId: m.params.connectId, ui: undefined, timer: setTimeout(die, timeoutMs) };
      active.set(m.id, a);
      pending.push(m);
      runNext();
    } catch (error) {
      if (Number.isSafeInteger(m?.id) && m.id > 0) send({ id: m.id, ok: false,
        error: { code: error instanceof Failure ? error.code : 'INVALID_REQUEST' } });
      die();
    }
  }
  input.on('data', chunk => {
    if (dead) return;
    if (chunk.length > MAX_LINE) { die(); return; }
    buffer = Buffer.concat([buffer, chunk]);
    while (!dead) {
      const end = buffer.indexOf(10);
      if (end < 0) break;
      if (end + 1 > MAX_LINE) { die(); return; }
      const line = buffer.subarray(0, end);
      buffer = buffer.subarray(end + 1);
      try { receive(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line))); }
      catch { die(); return; }
    }
    if (buffer.length >= MAX_LINE) die();
  });
  input.on('end', () => die());
  input.on('error', () => die());
  return { die };
}
module.exports = { serve, validate, der, MAX_LINE };
