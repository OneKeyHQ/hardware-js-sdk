import nodeCrypto from 'node:crypto';

import { createCipheriv, createDecipheriv } from '../runtime/crypto';
import { Buffer } from '../runtime/buffer';

// The runtimeShims vector test only covers a 5-byte 'hello' payload. The real
// THP handshake (protocol-thp/crypto/pairing.ts, decode.ts) also does:
//   - aes.decrypt(Buffer.alloc(0), tag)   // empty ciphertext, tag-only auth
//   - aes.decrypt(payload[0:1], tag)       // 1-byte payload
//   - 12-byte IV, 16-byte tag, AAD binding
// A crypto shim that mishandled empty input would break the handshake. These
// tests pin the shim to node's reference behavior for exactly those calls.

const KEY = Buffer.alloc(32, 1);
const IV = Buffer.alloc(12, 2); // THP getIvFromNonce() -> 12 bytes
const AAD = Buffer.from('handshake-hash');

// node reference: setAAD + optional update + final -> {ciphertext, tag}
function nodeEncrypt(plaintext: Buffer, aad: Buffer) {
  const c = nodeCrypto.createCipheriv('aes-256-gcm', KEY, IV);
  c.setAAD(aad);
  const ciphertext = Buffer.concat([c.update(plaintext), c.final()]);
  return { ciphertext, tag: c.getAuthTag() };
}

// shim decrypt shaped like protocol-thp/crypto/aesgcm.ts `decrypt(ct, tag)`
function shimDecrypt(ciphertext: Buffer, tag: Buffer, aad: Buffer) {
  const d = createDecipheriv('aes-256-gcm', KEY, IV);
  d.setAAD(aad);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ciphertext), d.final()]);
}

describe('THP handshake crypto edge cases (shim vs node)', () => {
  test('empty-plaintext auth-only: tag matches node, decrypt returns empty', () => {
    const ref = nodeEncrypt(Buffer.alloc(0), AAD);

    // shim encrypt of empty -> tag must equal node's
    const c = createCipheriv('aes-256-gcm', KEY, IV);
    c.setAAD(AAD);
    const ct = Buffer.concat([c.update(Buffer.alloc(0)), c.final()]);
    expect(ct.length).toBe(0);
    expect(c.getAuthTag().toString('hex')).toBe(ref.tag.toString('hex'));

    // this is the exact pairing.ts:108 / decode.ts call
    const out = shimDecrypt(Buffer.alloc(0), ref.tag, AAD);
    expect(out.length).toBe(0);
  });

  test('1-byte payload matches node (pairing.ts:43 shape)', () => {
    const ref = nodeEncrypt(Buffer.from([0x07]), AAD);
    expect(shimDecrypt(ref.ciphertext, ref.tag, AAD).toString('hex')).toBe('07');
  });

  test('wrong AAD throws (fails loudly, never silently passes)', () => {
    const ref = nodeEncrypt(Buffer.from('x'), AAD);
    expect(() => shimDecrypt(ref.ciphertext, ref.tag, Buffer.from('WRONG'))).toThrow();
  });

  test('empty ciphertext with tampered tag throws', () => {
    const ref = nodeEncrypt(Buffer.alloc(0), AAD);
    const badTag = Buffer.from(ref.tag);
    badTag[0] = (badTag[0] + 1) % 256;
    expect(() => shimDecrypt(Buffer.alloc(0), badTag, AAD)).toThrow();
  });

  test('bidirectional: node decrypts shim output for empty payload', () => {
    const c = createCipheriv('aes-256-gcm', KEY, IV);
    c.setAAD(AAD);
    Buffer.concat([c.update(Buffer.alloc(0)), c.final()]);
    const tag = c.getAuthTag();

    const d = nodeCrypto.createDecipheriv('aes-256-gcm', KEY, IV);
    d.setAAD(AAD);
    d.setAuthTag(tag);
    const out = Buffer.concat([d.update(Buffer.alloc(0)), d.final()]);
    expect(out.length).toBe(0);
  });
});
