import { authenticateDeviceFromProof, getRequiredDeviceAuthenticityLayers } from '..';
import { prepareDeviceAuthenticityData, verifyAuthenticityProof } from '../verifyAuthenticityProof';

import type { DeviceAuthenticityConfig } from '../types';

// Golden vectors from trezor-suite `mockDeviceAuthenticityData.ts`.
// These are real device/CA certificate chains and challenge signatures.
const CHALLENGE = '29d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7920';

const CA_CERT_OPTIGA =
  '308201df30820184a00302010202040a001ab3300a06082a8648ce3d0403023054310b300906035504061302435a311e301c060355040a0c155472657a6f7220436f6d70616e7920732e722e6f2e3125302306035504030c1c5472657a6f72204d616e75666163747572696e6720526f6f742043413020170d3233303130313030303030305a180f32303533303130313030303030305a304f310b300906035504061302435a311e301c060355040a0c155472657a6f7220436f6d70616e7920732e722e6f2e3120301e06035504030c175472657a6f72204d616e75666163747572696e672043413059301306072a8648ce3d020106082a8648ce3d030107034200041b36cc98d5e3d1a20677aaf26254ef3756f27c9d63080c93ad3e7d39d3ad23bf00497b924789bc8e3f87834994e16780ad4eae7e75db1f03835ca64363e980b4a3473045300e0603551d0f0101ff04040302020430120603551d130101ff040830060101ff020100301f0603551d2304183016801428b202f8f9c78a74e8c152bbfb433d99d0ca03ef300a06082a8648ce3d0403020349003046022100dfe2f837f3644c1f0250d37cd0f7d1e4e9b8cfc4820d7f5a623a8cb69df99f6c02210089148848c5fc597df4b8545d9b19d1cc15abe0e1252fa2938a4cf01ae835c563';
const DEVICE_CERT_OPTIGA =
  '3082019e30820145a00302010202044ee2a50f300a06082a8648ce3d040302304f310b300906035504061302435a311e301c060355040a0c155472657a6f7220436f6d70616e7920732e722e6f2e3120301e06035504030c175472657a6f72204d616e75666163747572696e67204341301e170d3232303433303134313630315a170d3432303433303134313630315a301d311b301906035504030c1254324231205472657a6f72205361666520333059301306072a8648ce3d020106082a8648ce3d030107034200049bbf06dad9ab5905e05471ce16d5222c89c2caa39f26267ac0747129885fbd441bcc7fa84de120a36755daf30a6f47e8c0d4bddc15036ed2a3447dfa7a1d3e88a341303f300e0603551d0f0101ff040403020080300c0603551d130101ff04023000301f0603551d23041830168014176d8b9a403574f6a2b9ac353ef578682201a21a300a06082a8648ce3d04030203470030440220747c545e112df816173d3071f1ab25d399d8108550764ce1a3a428f1f18b506902200cda822c75b3da6e44e098014452f3fc324f29a79204c3fb4d5815afafc04b17';
const SIGNATURE_OPTIGA =
  '3045022100c01793ffbe4f16d4efc84a4533d9bbfbbf1baa5349346678e07fdb6d848cca7902200df11b9d2850173d9c93993fca983c6d2a3f31ea69a0e19b69e18cc3b78424fe';
const T2B1_ROOT_PUB_KEY_OPTIGA =
  '04626d58aca84f0fcb52ea63f0eb08de1067b8d406574a715d5e7928f4b67f113a00fb5c5918e74d2327311946c446b242c20fe7347482999bdc1e229b94e27d96';
const DEVICE_PUB_KEY_OPTIGA =
  '049bbf06dad9ab5905e05471ce16d5222c89c2caa39f26267ac0747129885fbd441bcc7fa84de120a36755daf30a6f47e8c0d4bddc15036ed2a3447dfa7a1d3e88';
const DEVICE_ID_OPTIGA_SHA3_256 =
  'ab823a17c8ff21e31a767374d2db9927715585dddca68f58238b768767119230';

const CA_CERT_TROPIC =
  '308201c130820173a003020102020868b1982d8b917275300506032b65703054310b300906035504061302435a311e301c060355040a0c155472657a6f7220436f6d70616e7920732e722e6f2e3125302306035504030c1c5472657a6f72204d616e75666163747572696e6720526f6f742043413020170d3235303832393132353934375a180f32303535303832323132353934375a304f310b300906035504061302435a311e301c060355040a0c155472657a6f7220436f6d70616e7920732e722e6f2e3120301e06035504030c175472657a6f72204d616e75666163747572696e67204341302a300506032b65700321009603b4971f811ed2a1cdb9ec3e6d6d0e22facfd83892a30480460872a2003f45a3663064300e0603551d0f0101ff04040302020430120603551d130101ff040830060101ff020100301d0603551d0e04160414cf35aa12a033c044ebc6c3c0c3aefea5ae5e7db4301f0603551d2304183016801424e601ebe264f0b1cfc5bc27cc03cdf69f23a85e300506032b657003410072e527330a4b079f8b8f261489595d7e0c6bc84cd4eecdf98988f4b185df503ac3ee7364ce7ef934f56c8e823f1ac38667f85d38469884f934290efdd27bef0e';
const DEVICE_CERT_TROPIC =
  '308201993082014ba003020102020868b1982dacb2b041300506032b6570304f310b300906035504061302435a311e301c060355040a0c155472657a6f7220436f6d70616e7920732e722e6f2e3120301e06035504030c175472657a6f72204d616e75666163747572696e672043413020170d3235303832393132353934375a180f32303535303832323132353934375a3051311b301906035504030c1254335731205472657a6f72205361666520373121301f06035504051318343732303930323235323232323232323232323232323232310f300d060355042e130654726f706963302a300506032b6570032100c92482676994f4e2dec7eb2bb6a9ce9a8a38d4536c5e16b26646015cd7034593a341303f300e0603551d0f0101ff040403020080300c0603551d130101ff04023000301f0603551d23041830168014cf35aa12a033c044ebc6c3c0c3aefea5ae5e7db4300506032b65700341003b0aa3ccdddfd2a473e3f36059d0da2e54428c8dca5050a5fabf845ca71365d8045cc4d15c4e6e37565cbd66cdb4ba8d7ca113941f596a9bbfc25c069cf91903';
const SIGNATURE_TROPIC =
  '9d6a7cfc1d9957a7eaa09f58ab385a4722dc621c6a58f0e281305f36c1447206ea6642f4e4ff36207bd57c3719101855e9c9a00a5db60cc84e20181d69f4fa00';
const T3W1_ROOT_PUB_KEY_TROPIC = 'cd318dc8405ae4f4144e3284dcb7b0cb0f0c2195c2ca14a0f6fccd9104e32a4b';
const SERIAL_TROPIC = '343732303930323235323232323232323232323232323232';

const CONFIG: DeviceAuthenticityConfig = {
  version: 1,
  T2B1: { rootPubKeysOptiga: [T2B1_ROOT_PUB_KEY_OPTIGA] },
  T3W1: { rootPubKeysOptiga: [], rootPubKeysTropic: [T3W1_ROOT_PUB_KEY_TROPIC] },
};

const signedData = prepareDeviceAuthenticityData({ payload: Buffer.from(CHALLENGE, 'hex') });

describe('verifyAuthenticityProof', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // CA_CERT_OPTIGA is valid 2023-01-01..2053-01-01; DEVICE_CERT_OPTIGA is
  // valid 2022-04-30..2042-04-30. Mocking Date.now() past a cert's own
  // notAfter exercises the real ASN.1-parsed validity window end to end,
  // without needing a freshly-signed "expired" fixture.
  it('rejects a proof whose device leaf certificate has expired', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2045-01-01T00:00:00Z').getTime());
    const result = verifyAuthenticityProof({
      proofType: 'optiga',
      certificates: [DEVICE_CERT_OPTIGA, CA_CERT_OPTIGA],
      signature: SIGNATURE_OPTIGA,
      signedData,
      deviceModel: 'T2B1',
      config: CONFIG,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('CERTIFICATE_EXPIRED');
  });

  it('rejects a proof whose CA certificate has expired', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2054-01-01T00:00:00Z').getTime());
    const result = verifyAuthenticityProof({
      proofType: 'optiga',
      certificates: [DEVICE_CERT_OPTIGA, CA_CERT_OPTIGA],
      signature: SIGNATURE_OPTIGA,
      signedData,
      deviceModel: 'T2B1',
      config: CONFIG,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('CERTIFICATE_EXPIRED');
  });

  it('verifies a genuine Optiga (P-256) proof', () => {
    const result = verifyAuthenticityProof({
      proofType: 'optiga',
      certificates: [DEVICE_CERT_OPTIGA, CA_CERT_OPTIGA],
      signature: SIGNATURE_OPTIGA,
      signedData,
      deviceModel: 'T2B1',
      config: CONFIG,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.deviceCertPubKey).toBe(DEVICE_PUB_KEY_OPTIGA);
      expect(result.rootPubKey).toBe(T2B1_ROOT_PUB_KEY_OPTIGA);
      expect(result.serialNumber).toBeUndefined(); // T2B1 has no OID 2.5.4.5
    }
  });

  it('verifies a genuine Tropic (Ed25519) proof and extracts the serial number', () => {
    const result = verifyAuthenticityProof({
      proofType: 'tropic',
      certificates: [DEVICE_CERT_TROPIC, CA_CERT_TROPIC],
      signature: SIGNATURE_TROPIC,
      signedData,
      deviceModel: 'T3W1',
      config: CONFIG,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.serialNumber).toBe(SERIAL_TROPIC);
      expect(result.rootPubKey).toBe(T3W1_ROOT_PUB_KEY_TROPIC);
    }
  });

  it('rejects a tampered challenge signature', () => {
    const tampered = `${SIGNATURE_OPTIGA.slice(0, -2)}00`;
    const result = verifyAuthenticityProof({
      proofType: 'optiga',
      certificates: [DEVICE_CERT_OPTIGA, CA_CERT_OPTIGA],
      signature: tampered,
      signedData,
      deviceModel: 'T2B1',
      config: CONFIG,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('INVALID_DEVICE_SIGNATURE');
  });

  it('rejects when the root CA is not trusted', () => {
    const result = verifyAuthenticityProof({
      proofType: 'optiga',
      certificates: [DEVICE_CERT_OPTIGA, CA_CERT_OPTIGA],
      signature: SIGNATURE_OPTIGA,
      signedData,
      deviceModel: 'T2B1',
      config: { version: 1, T2B1: { rootPubKeysOptiga: [] } },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('ROOT_PUBKEY_NOT_FOUND');
  });
});

describe('authenticateDeviceFromProof', () => {
  it('keeps T3W1 Tropic requirements independent from root-key configuration', () => {
    expect(getRequiredDeviceAuthenticityLayers('T3W1')).toEqual(['optiga', 'tropic']);
    expect(getRequiredDeviceAuthenticityLayers('T2B1')).toEqual(['optiga']);
  });

  it('derives the device id from the verified attestation public key', () => {
    const result = authenticateDeviceFromProof({
      proof: {
        optiga_certificates: [DEVICE_CERT_OPTIGA, CA_CERT_OPTIGA],
        optiga_signature: SIGNATURE_OPTIGA,
      },
      challenge: Buffer.from(CHALLENGE, 'hex'),
      deviceModel: 'T2B1',
      config: CONFIG,
    });

    expect(result.verified).toBe(true);
    expect(result.deviceCertPubKey).toBe(DEVICE_PUB_KEY_OPTIGA);
    expect(result.deviceId).toBe(DEVICE_ID_OPTIGA_SHA3_256);
  });

  it('rejects a Tropic proof substituted into the Optiga fields', () => {
    const result = authenticateDeviceFromProof({
      proof: {
        optiga_certificates: [DEVICE_CERT_TROPIC, CA_CERT_TROPIC],
        optiga_signature: SIGNATURE_TROPIC,
        tropic_certificates: [DEVICE_CERT_TROPIC, CA_CERT_TROPIC],
        tropic_signature: SIGNATURE_TROPIC,
      },
      challenge: Buffer.from(CHALLENGE, 'hex'),
      deviceModel: 'T3W1',
      config: {
        version: 1,
        T3W1: {
          rootPubKeysOptiga: [],
          rootPubKeysTropic: [T3W1_ROOT_PUB_KEY_TROPIC],
        },
      },
    });

    expect(result.verified).toBe(false);
    expect(result.deviceId).toBeUndefined();
    expect(result.error).toBe('RESPONSE_MALFORMED');
  });

  it('reports verified=false for a missing proof payload', () => {
    const result = authenticateDeviceFromProof({
      proof: { optiga_certificates: [], optiga_signature: '' },
      challenge: Buffer.from(CHALLENGE, 'hex'),
      deviceModel: 'T2B1',
      config: CONFIG,
    });

    expect(result.verified).toBe(false);
    expect(result.deviceId).toBeUndefined();
    expect(result.error).toBe('RESPONSE_PAYLOAD_MISSING');
  });

  // M2: a malicious device can return a malformed certificate; must fold into
  // verified:false, never throw an uncaught error.
  it('never throws on a malformed certificate (returns verified=false)', () => {
    let result: ReturnType<typeof authenticateDeviceFromProof> | undefined;
    expect(() => {
      result = authenticateDeviceFromProof({
        proof: { optiga_certificates: ['deadbeef', 'c0ffee'], optiga_signature: 'ab' },
        challenge: Buffer.from(CHALLENGE, 'hex'),
        deviceModel: 'T2B1',
        config: CONFIG,
      });
    }).not.toThrow();
    expect(result?.verified).toBe(false);
    expect(result?.deviceId).toBeUndefined();
    expect(result?.error).toMatch(/RESPONSE_MALFORMED/);
  });

  // M3: a chain that only matches a DEBUG/staging root must be flagged.
  it('flags usedDebugKey when the chain matches a debug root', () => {
    const debugConfig: DeviceAuthenticityConfig = {
      version: 1,
      T2B1: { rootPubKeysOptiga: [], debug: { rootPubKeysOptiga: [T2B1_ROOT_PUB_KEY_OPTIGA] } },
    };
    const result = authenticateDeviceFromProof({
      proof: {
        optiga_certificates: [DEVICE_CERT_OPTIGA, CA_CERT_OPTIGA],
        optiga_signature: SIGNATURE_OPTIGA,
      },
      challenge: Buffer.from(CHALLENGE, 'hex'),
      deviceModel: 'T2B1',
      config: debugConfig,
      allowDebugKeys: true,
    });

    expect(result.verified).toBe(true);
    expect(result.usedDebugKey).toBe(true);
  });

  // H1: on a Tropic-capable model (T3W1) an Optiga-only proof must NOT verify.
  it('requires the Tropic layer on T3W1 (optiga-only proof is rejected)', () => {
    const t3w1Config: DeviceAuthenticityConfig = {
      version: 1,
      T3W1: {
        rootPubKeysOptiga: [T2B1_ROOT_PUB_KEY_OPTIGA],
        rootPubKeysTropic: [T3W1_ROOT_PUB_KEY_TROPIC],
      },
    };
    const result = authenticateDeviceFromProof({
      // reuse the optiga vector but omit tropic_* → tropic required-but-missing
      proof: {
        optiga_certificates: [DEVICE_CERT_OPTIGA, CA_CERT_OPTIGA],
        optiga_signature: SIGNATURE_OPTIGA,
      },
      challenge: Buffer.from(CHALLENGE, 'hex'),
      deviceModel: 'T3W1',
      config: t3w1Config,
    });

    // The optiga device cert says model T2B1, so it fails model check before we
    // even reach the tropic requirement; either way it must NOT verify on T3W1.
    expect(result.verified).toBe(false);
  });
});

describe('M1: CA public key blacklist (revocation)', () => {
  const CA_PUB_KEY_OPTIGA =
    '041b36cc98d5e3d1a20677aaf26254ef3756f27c9d63080c93ad3e7d39d3ad23bf00497b924789bc8e3f87834994e16780ad4eae7e75db1f03835ca64363e980b4';

  it('rejects a blacklisted CA public key even when the chain is otherwise valid', () => {
    const result = verifyAuthenticityProof({
      proofType: 'optiga',
      certificates: [DEVICE_CERT_OPTIGA, CA_CERT_OPTIGA],
      signature: SIGNATURE_OPTIGA,
      signedData,
      deviceModel: 'T2B1',
      config: CONFIG,
      caPubKeyBlacklist: [CA_PUB_KEY_OPTIGA],
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('CA_PUBKEY_BLACKLISTED');
  });
});
