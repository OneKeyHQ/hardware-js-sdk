import test from 'node:test';
import assert from 'node:assert/strict';
import { translateBatch } from './provider.mjs';
const config = { baseUrl: 'https://api.example.com/v1', model: 'test-model', apiKey: 'test-only-not-a-real-key' };
const units = [{ id: 'unit-1', text: 'Confirm on OneKey Pro 2.' }];

test('uses the configured endpoint and restores protected terms', async () => {
  const results = await translateBatch(units, 'fr', config, { fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.example.com/v1/chat/completions');
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    const input = JSON.parse(body.messages[1].content);
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ translations: [{ id: input.units[0].id, text: 'Confirmez sur __OK_0__.' }] }) } }] }), { status: 200 });
  }});
  assert.deepEqual(results, { 'unit-1': 'Confirmez sur OneKey Pro 2.' });
});

test('missing credentials fail before any request', async () => {
  let calls = 0;
  await assert.rejects(translateBatch(units, 'de', { ...config, apiKey: '' }, { fetchImpl: () => { calls++; } }), /credential/);
  assert.equal(calls, 0);
});

test('rejects truncation, wrong IDs and changed technical tokens', async () => {
  for (const content of [
    { translations: [] },
    { translations: [{ id: 'another-id', text: '__OK_0__' }] },
    { translations: [{ id: 'unit-1', text: 'Confirmé' }] },
  ]) {
    await assert.rejects(translateBatch(units, 'fr', config, { fetchImpl: async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] })) }));
  }
});

test('does not echo response bodies or credentials on API failure', async () => {
  await assert.rejects(translateBatch(units, 'es', config, { fetchImpl: async () => new Response('private-body-test-only-not-a-real-key', { status: 401 }) }), error => !error.message.includes('private-body') && !error.message.includes(config.apiKey) && error.message.includes('401'));
});

test('rejects credential-bearing, insecure or query-bearing endpoints', async () => {
  for (const baseUrl of ['http://example.com/v1', 'https://user:password@example.com/v1', 'https://example.com/v1?key=secret']) {
    await assert.rejects(translateBatch(units, 'ja', { ...config, baseUrl }), /endpoint/);
  }
});
