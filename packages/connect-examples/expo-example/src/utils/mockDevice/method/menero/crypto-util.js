/* eslint-disable no-continue */
/* eslint-disable no-param-reassign */
/* eslint-disable no-bitwise */

// see https://github.com/CoinSpace/monerolib

/**
 * crypto.cpp & crypto-ops.c
 *
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto-ops.c
 */
import BN from 'bn.js';
import { Buffer } from 'buffer';
import { keccak_256 as keccak } from '@noble/hashes/sha3';
import { randomBytes } from '@noble/hashes/utils';
import varint from 'varint';
import { A, ec, fffb1, fffb2, fffb3, fffb4, sqrtm1 } from './crypto-util-data.js';
import {
  decodeInt,
  decodePoint,
  decodeScalar,
  encodeInt,
  encodePoint,
  squareRoot,
} from './helpers.js';

// TODO remove when jest.mockModule will be implemented
// https://github.com/facebook/jest/issues/10025
const random = randomBytes;

/**
 * random_scalar
 * generate a random unbiased 32-byte (256-bit) integer
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L123-L141
 */

export function randomScalar() {
  // l = 2^252 + 27742317777372353535851937790883648493.
  // l fits 15 times in 32 bytes (iow, 15 l is the highest multiple of l that fits in 32 bytes)
  const limit = ec.curve.n.muln(15);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const buf = random(32);
    let num = decodeInt(buf);
    if (num.gte(limit)) {
      continue;
    }
    // reduceScalar32
    num = num.umod(ec.curve.n);
    // num may be zero once per 2^252 + 27742317777372353535851937790883648493 variants O_o
    if (!num.isZero()) {
      return encodeInt(num);
    }
  }
}

/**
 * generate_keys
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L153-L173
 */

export function generateKeys(seed) {
  if (typeof seed === 'string') seed = Buffer.from(seed, 'hex');
  const sec = seed ? reduceScalar32(seed) : randomScalar();
  // TODO sec check is redundant in secretKeyToPublicKey
  const pub = secretKeyToPublicKey(sec);
  return { sec, pub };
}

/**
 * cn_fast_hash
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/ringct/rctOps.cpp#L558-L585
 */

export function fastHash(data) {
  if (typeof data === 'string') data = Buffer.from(data, 'hex');
  return Buffer.from(keccak(data));
}

/**
 * sc_reduce32
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto-ops.c#L2433
 */

export function reduceScalar32(scalar) {
  const num = decodeInt(scalar);
  return encodeInt(num.umod(ec.curve.n));
}

/**
 * sc_check
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto-ops.c#L3814
 */

export function checkScalar(scalar) {
  try {
    decodeScalar(scalar);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * hash_to_scalar
 * Difference from cpp: we hash whole buffer without boundary be length
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L143-L146
 */

export function hashToScalar(data) {
  const hash = fastHash(data);
  return reduceScalar32(hash);
}

/**
 * check_key
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L175-L178
 */

export function checkKey(data) {
  try {
    decodePoint(data);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * secret_key_to_public_key
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L180-L188
 */

export function secretKeyToPublicKey(sec) {
  const k = decodeScalar(sec, 'Invalid secret key');
  const K = ec.g.mul(k);
  return encodePoint(K);
}

/**
 * generate_key_derivation
 * Key derivation: 8*(sec*pub)
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L190-L203
 */

export function generateKeyDerivation(pub, sec) {
  const s = decodeScalar(sec, 'Invalid secret key');
  const P = decodePoint(pub, 'Invalid public key');
  const P2 = P.mul(s);
  const P3 = P2.mul(new BN('8'));
  return encodePoint(P3);
}

/**
 * derivation_to_scalar
 * H_s(derivation || varint(output_index))
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L205-L215
 */

export function derivationToScalar(derivation, index) {
  if (typeof derivation === 'string') derivation = Buffer.from(derivation, 'hex');
  const data = Buffer.concat([derivation, Buffer.from(varint.encode(index))]);
  return hashToScalar(data);
}

/**
 * derive_public_key
 * H_s(derivation || varint(output_index))G + base
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L217-L235
 */

export function derivePublicKey(derivation, index, pub) {
  const P1 = decodePoint(pub, 'Invalid public key');
  const scalar = derivationToScalar(derivation, index);
  const P = ec.g.mul(decodeInt(scalar));
  const P2 = P.add(P1);
  return encodePoint(P2);
}

/**
 * derive_secret_key
 * base + H_s(derivation || varint(output_index))
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L237-L243
 */

export function deriveSecretKey(derivation, index, sec) {
  const s = decodeScalar(sec, 'Invalid secret key');
  const scalar = derivationToScalar(derivation, index);
  const key = s.add(decodeInt(scalar)).umod(ec.curve.n);
  return encodeInt(key);
}

/**
 * generate_signature
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L290-L317
 */

export function generateSignature(prefix, pub, sec) {
  if (typeof prefix === 'string') prefix = Buffer.from(prefix, 'hex');
  if (typeof pub === 'string') pub = Buffer.from(pub, 'hex');
  // sec checked inside secretKeyToPublicKey
  const expectedPub = secretKeyToPublicKey(sec);
  if (!expectedPub.equals(pub)) {
    throw new RangeError('Incorrect public key');
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const k = decodeInt(randomScalar());
    const K = ec.g.mul(k);
    const buf = Buffer.concat([prefix, pub, encodePoint(K)]);
    const c = decodeInt(hashToScalar(buf));
    if (c.isZero()) {
      continue;
    }
    // sc_mulsub(&sig.r, &sig.c, &unwrap(sec), &k);
    // sc_mulsub(aa, bb, cc):
    // (cc - aa * bb) % l
    const r = k.sub(decodeInt(sec).mul(c)).umod(ec.curve.n);
    if (r.isZero()) {
      continue;
    }
    return Buffer.concat([encodeInt(c), encodeInt(r)]);
  }
}

/**
 * check_signature
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L319-L341
 */

export function checkSignature(prefix, pub, sig) {
  if (typeof prefix === 'string') prefix = Buffer.from(prefix, 'hex');
  if (typeof sig === 'string') sig = Buffer.from(sig, 'hex');
  if (typeof pub === 'string') pub = Buffer.from(pub, 'hex');
  const P1 = decodePoint(pub, 'Invalid public key');
  let c;
  let r;
  try {
    c = decodeScalar(sig.slice(0, 32));
    r = decodeScalar(sig.slice(32, 64));
  } catch (err) {
    return false;
  }
  if (c.isZero()) {
    return false;
  }
  const P2 = P1.mul(c).add(ec.g.mul(r));
  const buf = Buffer.concat([prefix, pub, encodePoint(P2)]);
  return c.eq(decodeInt(hashToScalar(buf)));
}

/**
 * ge_fromfe_frombytes_vartime
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto-ops.c#L2310-L2424
 * https://github.com/monero-project/monero/blob/v0.17.1.9/tests/crypto/crypto.cpp#L47-L51
 */

export function hashToPoint(data) {
  /**
   * u - input data
   * v = 2 * u^2
   * w = 2 * u^2 + 1 = v + 1
   * t = w^2 - 2 * A^2 * u^2 = w^2 - A^2 * v
   * x = sqrt( w / w^2 - 2 * A^2 * u^2 ) = sqrt( w / t )
   *
   * negative = false
   * check = w - x^2 * t
   *
   * if (isnonzero(check)) {
   *   check = w + x^2 * t
   *   if (isnonzero(check)) {
   *     negative = true
   *   } else {
   *     x = x * fe_fffb1
   *   }
   * } else {
   *   x = x * fe_fffb2
   * }
   *
   * let odd;
   * if (!negative) {
   *   odd = false
   *   r = -2 * A * u^2 = -1 * A * v
   *   x = x * u
   * } else {
   *   odd = true
   *   r = -1 * A
   *   check = w - sqrtm1 * x^2 * t
   *   if (isnonzero(check)) {
   *     check = w + sqrtm1 * x^2 * t
   *     if (isnonzero(check)) {
   *       throw Error()
   *     } else {
   *       x = x * fe_fffb3
   *     }
   *   } else {
   *     x = x * fe_fffb4
   *   }
   * }
   *
   * if (x.isOdd() !== odd) {
   *   x = -1 * x
   * }
   *
   * z = r + w
   * y = r - w
   * x = x * z
   */

  const u = decodeInt(data).toRed(ec.curve.red);
  // v = 2 * u^2
  const v = u.redMul(u).redMul(new BN(2).toRed(ec.curve.red));
  // w = 2 * u^2 + 1 = v + 1
  const w = v.redAdd(new BN(1).toRed(ec.curve.red));
  // t = w^2 - 2 * A^2 * u^2 = w^2 - A^2 * v
  const t = w.redMul(w).redSub(A.redMul(A).redMul(v));
  // x = sqrt( w / w^2 - 2 * A^2 * u^2 ) = sqrt( w / t )
  let x = squareRoot(w, t);

  let negative = false;

  // check = w - x^2 * t
  let check = w.redSub(x.redMul(x).redMul(t));

  if (!check.isZero()) {
    // check = w + x^2 * t
    check = w.redAdd(x.redMul(x).redMul(t));
    if (!check.isZero()) {
      negative = true;
    } else {
      // x = x * fe_fffb1
      x = x.redMul(fffb1);
    }
  } else {
    // x = x * fe_fffb2
    x = x.redMul(fffb2);
  }

  let odd;
  let r;
  if (!negative) {
    odd = false;
    // r = -2 * A * u^2 = -1 * A * v
    r = A.redNeg().redMul(v);
    // x = x * u
    x = x.redMul(u);
  } else {
    odd = true;
    // r = -1 * A
    r = A.redNeg();
    // check = w - sqrtm1 * x^2 * t
    check = w.redSub(x.redMul(x).redMul(t).redMul(sqrtm1));
    if (!check.isZero()) {
      // check = w + sqrtm1 * x^2 * t
      check = w.redAdd(x.redMul(x).redMul(t).redMul(sqrtm1));
      if (!check.isZero()) {
        throw new TypeError('Invalid point');
      } else {
        x = x.redMul(fffb3);
      }
    } else {
      x = x.redMul(fffb4);
    }
  }

  if (x.isOdd() !== odd) {
    // x = -1 * x
    x = x.redNeg();
  }

  // z = r + w
  const z = r.redAdd(w);
  // y = r - w
  const y = r.redSub(w);
  // x = x * z
  x = x.redMul(z);

  return ec.curve.point(x, y, z);
}

/**
 * hash_to_ec
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L611-L619
 */

export function hashToEc(data) {
  const hash = fastHash(data);
  const P = hashToPoint(hash);
  return P.mul(new BN(8).toRed(ec.curve.red));
}

/**
 * generate_key_image
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L621-L628
 */

export function generateKeyImage(pub, sec) {
  const s = decodeScalar(sec, 'Invalid secret key');
  const P1 = hashToEc(pub);
  const P2 = P1.mul(s);
  return encodePoint(P2);
}

/**
 * generate_ring_signature
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L645-L709
 */

export function generateRingSignature(prefix, image, pubs, sec, index) {
  if (index >= pubs.length) {
    throw new TypeError('Bad index of secret key');
  }
  if (typeof prefix === 'string') prefix = Buffer.from(prefix, 'hex');
  const P = decodePoint(image, 'Invalid key image');
  const s = decodeScalar(sec, 'Invalid secret key');
  const sum = new BN(0);
  const ab = new Array(pubs.length);
  const sig = new Array(pubs.length);
  // top level just to pass monero tests
  let k;
  for (let i = 0; i < pubs.length; i++) {
    const pub = pubs[i];
    if (i === index) {
      k = decodeInt(randomScalar());
      const K = ec.g.mul(k);
      const P1 = hashToEc(pub);
      const P2 = P1.mul(k);
      ab[i] = [encodePoint(K), encodePoint(P2)];
    } else {
      sig[i] = [randomScalar(), randomScalar()];
      const c = decodeInt(sig[i][0]);
      const r = decodeInt(sig[i][1]);
      const P1 = decodePoint(pub, 'Invalid pubkey');
      const P2 = P1.mul(c).add(ec.g.mul(r));
      const P3 = hashToEc(pub);
      const P4 = P3.mul(r).add(P.mul(c));
      ab[i] = [encodePoint(P2), encodePoint(P4)];
      sum.iadd(c);
    }
  }
  const h = hashToScalar(Buffer.concat([prefix, ...ab.flat()]));
  const c = decodeInt(h).sub(sum).umod(ec.curve.n);
  const r = k.sub(c.mul(s)).umod(ec.curve.n);
  sig[index] = [encodeInt(c), encodeInt(r)];
  return Buffer.concat(sig.flat());
}

/**
 * check_ring_signature
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/crypto/crypto.cpp#L711-L751
 */

export function checkRingSignature(prefix, image, pubs, sig) {
  if (typeof prefix === 'string') prefix = Buffer.from(prefix, 'hex');
  if (typeof sig === 'string') sig = Buffer.from(sig, 'hex');
  let P;
  try {
    P = decodePoint(image);
  } catch (err) {
    return false;
  }
  const sum = new BN(0);
  const ab = new Array(pubs.length);
  for (let i = 0; i < pubs.length; i++) {
    const pub = pubs[i];
    let c;
    let r;
    try {
      c = decodeScalar(sig.slice(0 + i * 64, 32 + i * 64));
      r = decodeScalar(sig.slice(32 + i * 64, 64 + i * 64));
    } catch (err) {
      return false;
    }
    let P1;
    try {
      P1 = decodePoint(pub);
    } catch (err) {
      return false;
    }
    const P2 = P1.mul(c).add(ec.g.mul(r));
    const P3 = hashToEc(pub);
    const P4 = P3.mul(r).add(P.mul(c));
    ab[i] = [encodePoint(P2), encodePoint(P4)];
    sum.iadd(c);
  }
  const h = hashToScalar(Buffer.concat([prefix, ...ab.flat()]));
  return sum.umod(ec.curve.n).eq(decodeInt(h));
}

/*
export function decryptPaymentId(encrypted, txPubKey, privateViewKey) {
  const INTEGRATED_ID_SIZE = 8;
  const ENCRYPTED_PAYMENT_ID_TAIL = (141).toString(16);
  const keyDerivation = generateKeyDerivation(txPubKey, privateViewKey);
  const pidKey = fastHash(keyDerivation + ENCRYPTED_PAYMENT_ID_TAIL).slice(0, INTEGRATED_ID_SIZE * 2);
  return xor8(encrypted, pidKey);
}
*/

export default {
  randomScalar,
  generateKeys,
  fastHash,
  reduceScalar32,
  hashToScalar,
  checkScalar,
  checkKey,
  secretKeyToPublicKey,
  generateKeyDerivation,
  derivationToScalar,
  derivePublicKey,
  deriveSecretKey,
  generateSignature,
  checkSignature,
  hashToPoint,
  hashToEc,
  generateKeyImage,
  generateRingSignature,
  checkRingSignature,
  // decryptPaymentId,
};
