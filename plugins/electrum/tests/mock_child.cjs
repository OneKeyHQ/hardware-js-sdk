'use strict';
// Test-only stdio peer, separate from the real SDK entry point.
const readline = require('node:readline');
const generation = process.argv.at(-1);
const mode = process.argv[2];
const write = m => process.stdout.write(`${JSON.stringify({ v: 1, generation, ...m })}\n`);
const lines = readline.createInterface({ input: process.stdin });
let held;
lines.on('line', line => {
  const m = JSON.parse(line);
  if (m.op === 'hello') {
    if (mode === 'slow-start') {
      setTimeout(() => write({ id: m.id, ok: true, result: { protocol: 1, sdkVersion: '1.2.10' } }), 150); return;
    }
    write({ id: m.id, ok: true, result: { protocol: 1, sdkVersion: '1.2.10' } }); return;
  }
  if (m.op === 'dispose') { write({ id: m.id, ok: true, result: null }); return; }
  if (m.op === 'search') { write({ id: m.id, ok: true, result: [] }); return; }
  if (m.op === 'cancel') { write({ id: m.id, ok: true, result: null }); return; }
  if (mode === 'delay' && m.params.hold) {
    setTimeout(() => write({ id: m.id, ok: true, result: m.params }), 250); return;
  }
  if (mode === 'crash') process.exit(1);
  if (mode === 'hang') return;
  if (mode === 'stale') { write({ id: m.id, ok: true, result: null, generation: 'old' }); return; }
  if (mode === 'wrong-id') { write({ id: m.id + 1, ok: true, result: null }); return; }
  if (mode === 'extra') { write({ id: m.id, ok: true, result: null, unexpected: true }); return; }
  if (mode === 'long') { process.stdout.write('a'.repeat(1024 * 1024 + 1)); return; }
  if (mode === 'invalid-error') { write({ id: m.id, ok: false, error: { code: {} } }); return; }
  if (mode === 'bool-id') { write({ id: true, ok: true, result: null }); return; }
  if (mode === 'nan') { process.stdout.write(`{"v":1,"generation":"${generation}","id":${m.id},"ok":true,"result":NaN}\n`); return; }
  if (mode === 'error') { write({ id: m.id, ok: false, error: { code: 'SDK_FAILED' } }); return; }
  if (mode === 'ui') {
    if (m.op === 'ui') {
      if (m.params.target !== held || m.params.token !== 3 || m.params.choice !== 'device') process.exit(2);
      write({ id: held, ok: true, result: 'device-choice' });
    } else {
      held = m.id;
      write({ id: m.id, event: 'passphrase-select', token: 3 });
    }
    return;
  }
  write({ id: m.id, ok: true, result: m.params });
});
