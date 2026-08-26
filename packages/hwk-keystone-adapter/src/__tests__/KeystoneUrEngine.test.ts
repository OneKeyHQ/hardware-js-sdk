import {
  CryptoCoinInfo,
  CryptoHDKey,
  CryptoKeypath,
  CryptoMultiAccounts,
  CryptoPSBT,
  Curve,
  PathComponent,
  QRHardwareCall,
  QRHardwareCallVersion,
} from '@keystonehq/bc-ur-registry';
import {
  ETHSignature,
  DataType as EthDataType,
  EthSignRequest,
} from '@keystonehq/bc-ur-registry-eth';
import { SolSignature } from '@keystonehq/bc-ur-registry-sol';
import HDKey from 'hdkey';

import { KeystoneUrEngine } from '../urEngine/KeystoneUrEngine';
import { TronSignRequest } from '../urEngine/TronSignRequest';
import { TronSignature as TronUrSignature } from '../urEngine/TronSignature';

import type { KeyDerivation } from '@keystonehq/bc-ur-registry';
import type { KeystoneUr } from '../urEngine/types';

// Every buffer below is a fixed, clearly-synthetic byte pattern chosen only to
// exercise CBOR/UR framing — none of it is derived from or resembles real key
// material. See docs/design/keystone-integration for why mfp is the identity key.
const FAKE_MFP_HEX = '52a5d0d1';

function urFromSdk(ur: { type: string; cbor: Buffer }): KeystoneUr {
  return { urType: ur.type, urData: ur.cbor.toString('hex') };
}

function buildMultiAccountsUr(): KeystoneUr {
  const hdKey = new CryptoHDKey({
    isMaster: false,
    key: Buffer.alloc(33, 0x02),
    chainCode: Buffer.alloc(32, 0x11),
    useInfo: new CryptoCoinInfo(),
    origin: new CryptoKeypath(
      [
        new PathComponent({ index: 44, hardened: true }),
        new PathComponent({ index: 60, hardened: true }),
        new PathComponent({ index: 0, hardened: true }),
      ],
      Buffer.from(FAKE_MFP_HEX, 'hex')
    ),
    name: 'ETH',
  });
  const multiAccounts = new CryptoMultiAccounts(
    Buffer.from(FAKE_MFP_HEX, 'hex'),
    [hdKey],
    'Keystone 3 Pro',
    undefined, // deviceId — omitted, matching the firmware's generic KeyDerivation response
    '1.7.0'
  );
  return urFromSdk(multiAccounts.toUR());
}

describe('KeystoneUrEngine', () => {
  const engine = new KeystoneUrEngine('OneKey-test');

  describe('parseMultiAccounts', () => {
    it('extracts the master fingerprint as the cross-channel identity key', () => {
      const parsed = engine.parseMultiAccounts(buildMultiAccountsUr());

      expect(parsed.masterFingerprint).toBe(FAKE_MFP_HEX);
      expect(parsed.device).toBe('Keystone 3 Pro');
      expect(parsed.deviceId).toBeUndefined();
      expect(parsed.deviceVersion).toBe('1.7.0');
      expect(parsed.accounts).toHaveLength(1);
      expect(parsed.accounts[0]).toMatchObject({ chain: 'ETH', path: "m/44'/60'/0'" });
    });

    it('lowercases the master fingerprint for stable dedup keys', () => {
      const upper = new CryptoMultiAccounts(Buffer.from('AABBCCDD', 'hex'), []);
      const parsedUpper = engine.parseMultiAccounts(urFromSdk(upper.toUR()));
      expect(parsedUpper.masterFingerprint).toBe('aabbccdd');
    });
  });

  describe('parseAccountResponse', () => {
    it('normalizes a single crypto-hdkey response into a one-entry multi-accounts shape', () => {
      const hdKey = new CryptoHDKey({
        isMaster: false,
        key: Buffer.alloc(33, 0x03),
        chainCode: Buffer.alloc(32, 0x22),
        useInfo: new CryptoCoinInfo(),
        origin: new CryptoKeypath(
          [
            new PathComponent({ index: 44, hardened: true }),
            new PathComponent({ index: 501, hardened: true }),
            new PathComponent({ index: 0, hardened: true }),
          ],
          Buffer.from(FAKE_MFP_HEX, 'hex')
        ),
        name: 'SOL',
      });
      const parsed = engine.parseAccountResponse(urFromSdk(hdKey.toUR()));

      expect(parsed.masterFingerprint).toBe(FAKE_MFP_HEX);
      expect(parsed.accounts).toHaveLength(1);
      expect(parsed.accounts[0]).toMatchObject({ chain: 'SOL', path: "m/44'/501'/0'" });
    });

    it('dispatches a crypto-multi-accounts response to the same shape', () => {
      const parsed = engine.parseAccountResponse(buildMultiAccountsUr());
      expect(parsed.masterFingerprint).toBe(FAKE_MFP_HEX);
      expect(parsed.accounts).toHaveLength(1);
    });
  });

  describe('EVM sign request / signature round trip', () => {
    it('builds an eth-sign-request UR carrying path, xfp and dataType', () => {
      const ur = engine.buildEthSignRequest({
        requestId: '2b5893f2-52e2-4ba8-9d5e-6c2b6f5f1c11',
        unsignedTxHex: 'deadbeef',
        dataType: 'typedTransaction',
        path: "m/44'/60'/0'/0/0",
        xfp: FAKE_MFP_HEX,
        chainId: 1,
        origin: 'OneKey',
      });

      expect(ur.urType).toBe('eth-sign-request');
      const decoded = EthSignRequest.fromCBOR(Buffer.from(ur.urData, 'hex'));
      expect(decoded.getDataType()).toBe(EthDataType.typedTransaction);
      expect(decoded.getDerivationPath()).toBe("44'/60'/0'/0/0");
      expect(decoded.getSourceFingerprint().toString('hex')).toBe(FAKE_MFP_HEX);
      expect(decoded.getChainId()).toBe(1);
      expect(decoded.getSignData().toString('hex')).toBe('deadbeef');
      expect(decoded.getRequestId()?.toString('hex').replace(/-/g, '')).toBe(
        '2b5893f252e24ba89d5e6c2b6f5f1c11'
      );
    });

    it('parses an eth-signature UR into requestId + r/s/v', () => {
      const requestId = Buffer.from('2b5893f252e24ba89d5e6c2b6f5f1c11', 'hex');
      const r = 'aa'.repeat(32);
      const s = 'bb'.repeat(32);
      const v = '1c';
      const signature = new ETHSignature(Buffer.from(r + s + v, 'hex'), requestId);

      const parsed = engine.parseEthSignature(urFromSdk(signature.toUR()));

      expect(parsed.r).toBe(r);
      expect(parsed.s).toBe(s);
      expect(parsed.v).toBe(v);
      expect(parsed.requestId).toBe('2b5893f2-52e2-4ba8-9d5e-6c2b6f5f1c11');
    });

    it('round-trips a requestId the engine itself minted, byte for byte', () => {
      const requestId = '11223344-5566-4788-9baa-bbccddeeff00';
      const ur = engine.buildEthSignRequest({
        requestId,
        unsignedTxHex: '00',
        dataType: 'personalMessage',
        path: "m/44'/60'/0'/0/0",
        xfp: FAKE_MFP_HEX,
      });
      const decoded = EthSignRequest.fromCBOR(Buffer.from(ur.urData, 'hex'));
      expect(decoded.getRequestId()?.toString('hex')).toBe(requestId.replace(/-/g, ''));
    });
  });

  describe('deriveEvmAddressFromXpub', () => {
    // Generated from a fixed, clearly-synthetic 32-byte seed (all 0x07) via the
    // same `hdkey` library bc-ur-registry-eth uses internally — not a real xpub,
    // not derived from any real seed phrase.
    const SYNTHETIC_XPUB = HDKey.fromMasterSeed(Buffer.alloc(32, 0x07)).publicExtendedKey;

    it('normalizes the relative path the same way with or without an m/ prefix', () => {
      expect(engine.deriveEvmAddressFromXpub(SYNTHETIC_XPUB, '0/0')).toBe(
        engine.deriveEvmAddressFromXpub(SYNTHETIC_XPUB, 'm/0/0')
      );
    });

    it('derives distinct, valid checksummed addresses for distinct indices', () => {
      const addr0 = engine.deriveEvmAddressFromXpub(SYNTHETIC_XPUB, '0/0');
      const addr1 = engine.deriveEvmAddressFromXpub(SYNTHETIC_XPUB, '0/1');
      expect(addr0).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(addr1).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(addr0).not.toBe(addr1);
    });
  });

  describe('buildKeyDerivationRequest', () => {
    it('encodes one qr-hardware-call carrying every requested path + curve', () => {
      const ur = engine.buildKeyDerivationRequest({
        schemas: [{ path: "m/44'/60'/0'" }, { path: "m/44'/501'/0'", curve: 'ed25519' }],
        origin: 'OneKey',
      });

      expect(ur.urType).toBe('qr-hardware-call');
      const decoded = QRHardwareCall.fromCBOR(Buffer.from(ur.urData, 'hex'));
      // Real Keystone firmware validates an unversioned/V0 request as
      // Cardano-only and rejects every other chain's path outright
      // (confirmed against `keystone3-firmware`'s
      // `CheckHardwareCallRequestIsLegal`) — V1 is what enables the general
      // per-chain path whitelist. Locking this in so it can't silently regress.
      expect(decoded.getVersion()).toBe(QRHardwareCallVersion.V1);
      const schemas = (decoded.getParams() as KeyDerivation).getSchemas();
      expect(schemas).toHaveLength(2);
      expect(schemas[0].getKeypath().getPath()).toBe("44'/60'/0'");
      expect(schemas[0].getCurve()).toBe(Curve.secp256k1);
      expect(schemas[1].getKeypath().getPath()).toBe("44'/501'/0'");
      expect(schemas[1].getCurve()).toBe(Curve.ed25519);
    });
  });

  describe('BTC PSBT round trip', () => {
    it('wraps an unsigned PSBT as crypto-psbt and reads it back unchanged', () => {
      const psbtHex = 'cHNidP8B'.padEnd(64, '0'); // arbitrary bytes; PSBT magic not required by the UR layer
      const built = engine.buildBtcPsbtRequest(Buffer.from(psbtHex, 'utf8').toString('hex'));
      expect(built.urType).toBe('crypto-psbt');

      const signedPsbtBytes = Buffer.from('signed-psbt-bytes-fixture');
      const responseUr = urFromSdk(new CryptoPSBT(signedPsbtBytes).toUR());
      expect(engine.parseBtcPsbt(responseUr)).toBe(signedPsbtBytes.toString('hex'));
    });
  });

  describe('SOL sign request / signature round trip', () => {
    it('builds a sol-sign-request UR and parses its signature back', () => {
      const ur = engine.buildSolSignRequest({
        requestId: '2b5893f2-52e2-4ba8-9d5e-6c2b6f5f1c11',
        unsignedPayloadHex: 'cafe',
        dataType: 'transaction',
        path: "m/44'/501'/0'/0'",
        xfp: FAKE_MFP_HEX,
      });
      expect(ur.urType).toBe('sol-sign-request');

      const requestId = Buffer.from('2b5893f252e24ba89d5e6c2b6f5f1c11', 'hex');
      const signature = new SolSignature(Buffer.alloc(64, 0x07), requestId);
      const parsed = engine.parseSolSignature(urFromSdk(signature.toUR()));

      expect(parsed.signature).toBe('07'.repeat(64));
      expect(parsed.requestId).toBe('2b5893f2-52e2-4ba8-9d5e-6c2b6f5f1c11');
    });
  });

  describe('TRON sign request / signature round trip', () => {
    it('builds a tron-sign-request UR carrying the raw tx bytes unparsed, and parses its signature back', () => {
      const ur = engine.buildTronSignRequest({
        requestId: '2b5893f2-52e2-4ba8-9d5e-6c2b6f5f1c11',
        rawTxHex: 'deadbeef',
        path: "m/44'/195'/0'/0/0",
        xfp: FAKE_MFP_HEX,
      });

      expect(ur.urType).toBe('tron-sign-request');
      const decoded = TronSignRequest.fromCBOR(Buffer.from(ur.urData, 'hex'));
      expect(decoded.getSignData().toString('hex')).toBe('deadbeef');
      expect(decoded.getDerivationPath()).toBe("44'/195'/0'/0/0");

      const requestId = Buffer.from('2b5893f252e24ba89d5e6c2b6f5f1c11', 'hex');
      const signature = new TronUrSignature(Buffer.alloc(65, 0x09), requestId);
      const parsed = engine.parseTronSignature(urFromSdk(signature.toUR()));

      expect(parsed.signature).toBe('09'.repeat(65));
      expect(parsed.requestId).toBe('2b5893f2-52e2-4ba8-9d5e-6c2b6f5f1c11');
    });
  });

  describe('deriveTronAddressFromXpub', () => {
    const SYNTHETIC_XPUB = HDKey.fromMasterSeed(Buffer.alloc(32, 0x07)).publicExtendedKey;

    it('derives a base58check TRON address (0x41-prefixed) distinct from the EVM one for the same xpub', () => {
      const tronAddress = engine.deriveTronAddressFromXpub(SYNTHETIC_XPUB, '0/0');
      const evmAddress = engine.deriveEvmAddressFromXpub(SYNTHETIC_XPUB, '0/0');
      expect(tronAddress).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
      // Same underlying secp256k1/keccak derivation as EVM — only the final
      // text encoding differs (base58check + 0x41 prefix vs checksummed hex).
      expect(tronAddress).not.toBe(evmAddress);
    });

    it('derives distinct addresses for distinct indices', () => {
      const addr0 = engine.deriveTronAddressFromXpub(SYNTHETIC_XPUB, '0/0');
      const addr1 = engine.deriveTronAddressFromXpub(SYNTHETIC_XPUB, '0/1');
      expect(addr0).not.toBe(addr1);
    });
  });

  it('never touches the network — KeystoneSDK is constructed bare, not via create()', () => {
    // Regression guard for the keyst.one config-fetch footgun documented in the
    // integration design: `KeystoneSDK.create()` phones home for fragment-size
    // config. `new KeystoneUrEngine()` must only ever use the bare constructor.
    const source = KeystoneUrEngine.toString();
    expect(source).not.toMatch(/\.create\(/);
  });
});
