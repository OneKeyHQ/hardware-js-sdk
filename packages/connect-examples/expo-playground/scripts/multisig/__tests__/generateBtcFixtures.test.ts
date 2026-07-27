import { verify } from '@noble/secp256k1';
import { describe, expect, test } from '@jest/globals';
import HardwareTransport from '@onekeyfe/hd-transport';
import { address as bitcoinAddress, networks, Transaction } from 'bitcoinjs-lib';

import MessagesJSON from '../../../../../core/src/data/messages/messages.json';
import { generateBtcFixtures } from '../generateBtcFixtures';
import type { MultisigMnemonics } from '../readMnemonics';

const TEST_MNEMONICS: MultisigMnemonics = [
  'mnemonic removed use runtime generated test input',
  'mnemonic removed use runtime generated test input',
  'mnemonic removed use runtime generated test input',
];

describe('generateBtcFixtures', () => {
  test('生成三种 2-of-3 fixture 和图片同构的 P2WSH 2-of-2 fixture', async () => {
    const first = await generateBtcFixtures(TEST_MNEMONICS);
    const second = await generateBtcFixtures(TEST_MNEMONICS);

    expect(first).toEqual(second);
    expect(first.map(item => item.id)).toEqual([
      'p2sh',
      'p2sh-p2wsh',
      'p2wsh',
      'p2wsh-2of2-index2',
    ]);
    expect(first.map(item => item.scriptType)).toEqual([
      'SPENDMULTISIG',
      'SPENDP2SHWITNESS',
      'SPENDWITNESS',
      'SPENDWITNESS',
    ]);
  });

  test('P2WSH 2-of-2 fixture 使用 /0/2 且只包含前两个 signer', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);
    const fixture = fixtures.find(item => item.id === 'p2wsh-2of2-index2');

    expect(fixture).toBeDefined();
    expect(fixture).toMatchObject({
      path: "m/48'/0'/0'/2'/0/2",
      scriptType: 'SPENDWITNESS',
      addressParameters: {
        path: "m/48'/0'/0'/2'/0/2",
        multisig: { m: 2, signatures: ['', ''] },
      },
      signerScenarios: [
        {
          signerIndex: 0,
          signerEnvKey: 'MULTISIG_MNEMONIC_1',
          prefilledSignerIndex: 1,
        },
      ],
    });
    expect(fixture?.addressParameters.multisig.pubkeys).toHaveLength(2);
    fixture?.addressParameters.multisig.pubkeys.forEach(item => {
      expect(item.address_n).toEqual([0, 2]);
    });
    expect(fixture?.reference.accountXpubs).toHaveLength(2);
    expect(fixture?.reference.childPublicKeys).toHaveLength(2);
  });

  test('funding transaction 的 txid 和输出脚本与引用数据一致', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);

    fixtures.forEach(fixture => {
      const fundingTx = Transaction.fromHex(fixture.reference.fundingTxHex);
      expect(fundingTx.getId()).toBe(fixture.reference.prevHash);
      expect(fundingTx.outs[0].script.toString('hex')).toBe(fixture.reference.scriptPubKey);
      expect(fundingTx.outs[0].value).toBe(200000);
      expect(fixture.signParameters.refTxs[0].hash).toBe(fixture.reference.prevHash);
    });
  });

  test('硬件签名参数可重建离线 spending transaction 的 sighash', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);

    fixtures.forEach(fixture => {
      const spendingTx = Transaction.fromHex(fixture.reference.spendingTxHex);
      expect(fixture.signParameters).toMatchObject({
        version: spendingTx.version,
        locktime: spendingTx.locktime,
        inputs: [{ sequence: spendingTx.ins[0].sequence }],
      });

      const parameters = fixture.signParameters;
      const input = parameters.inputs[0];
      const output = parameters.outputs[0];
      const hardwareTx = new Transaction();
      hardwareTx.version = parameters.version;
      hardwareTx.locktime = parameters.locktime;
      hardwareTx.addInput(
        Buffer.from(input.prev_hash, 'hex').reverse(),
        input.prev_index,
        input.sequence
      );
      hardwareTx.addOutput(
        bitcoinAddress.toOutputScript(output.address, networks.bitcoin),
        Number(output.amount)
      );
      const signingScript = Buffer.from(
        fixture.reference.witnessScript ?? fixture.reference.redeemScript,
        'hex'
      );
      const hardwareSighash =
        fixture.id === 'p2sh'
          ? hardwareTx.hashForSignature(0, signingScript, Transaction.SIGHASH_ALL)
          : hardwareTx.hashForWitnessV0(
              0,
              signingScript,
              Number(input.amount),
              Transaction.SIGHASH_ALL
            );

      expect(hardwareSighash.toString('hex')).toBe(fixture.reference.sighash);
    });
  });

  test('每个签名均可由对应子公钥验证', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);

    fixtures.forEach(fixture => {
      fixture.reference.expectedSignatures.forEach((signature, index) => {
        const derSignature = signature.slice(0, -2);
        expect(
          verify(derSignature, fixture.reference.sighash, fixture.reference.childPublicKeys[index])
        ).toBe(true);
      });
    });
  });

  test('签名槽位与每个 fixture 的 xpub 数量保持一致', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);

    fixtures.forEach(fixture => {
      const signerCount = fixture.reference.accountXpubs.length;
      const emptySignatures = Array.from({ length: signerCount }, () => '');
      const partialSignatures = [...emptySignatures];
      partialSignatures[0] = fixture.reference.expectedSignatures[0];
      const doubleSignatures = [...emptySignatures];
      doubleSignatures[0] = fixture.reference.expectedSignatures[0];
      doubleSignatures[1] = fixture.reference.expectedSignatures[1];

      expect(fixture.addressParameters.multisig.pubkeys).toHaveLength(signerCount);
      expect(fixture.addressParameters.multisig.signatures).toEqual(emptySignatures);
      expect(fixture.signParameters.inputs[0].multisig.signatures).toEqual(emptySignatures);
      expect(fixture.partialSignParameters.inputs[0].multisig.signatures).toEqual(
        partialSignatures
      );
      expect(fixture.reference.doubleSignatures).toEqual(doubleSignatures);
    });
  });

  test('生成的多签节点可以被设备 protobuf schema 编码', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);
    const messages = HardwareTransport.parseConfigure(MessagesJSON);
    const { Message: getAddressMessage } = HardwareTransport.createMessageFromName(
      messages,
      'GetAddress'
    );
    const { Message: txAckInputMessage } = HardwareTransport.createMessageFromName(
      messages,
      'TxAckInput'
    );

    fixtures.forEach(fixture => {
      expect(() =>
        HardwareTransport.encodeProtobuf(getAddressMessage, {
          address_n: fixture.signParameters.inputs[0].address_n,
          coin_name: 'Bitcoin',
          show_display: true,
          script_type: fixture.scriptType,
          multisig: fixture.addressParameters.multisig,
        })
      ).not.toThrow();
      expect(() =>
        HardwareTransport.encodeProtobuf(txAckInputMessage, {
          tx: { input: fixture.signParameters.inputs[0] },
        })
      ).not.toThrow();
    });
  });

  test('只为 signer 1 生成首次签名和继续签名场景', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);

    fixtures.forEach(fixture => {
      expect(fixture.signerScenarios).toHaveLength(1);
      fixture.signerScenarios.forEach(scenario => {
        expect(scenario.signerIndex).toBe(0);
        expect(scenario.signerEnvKey).toBe('MULTISIG_MNEMONIC_1');
        expect(scenario.expectedSignature).toBe(fixture.reference.expectedSignatures[0]);
        expect(scenario.firstSignParameters.inputs[0].multisig.signatures).toEqual(
          Array.from({ length: fixture.reference.accountXpubs.length }, () => '')
        );

        const continueSignatures = scenario.continueSignParameters.inputs[0].multisig.signatures;
        expect(continueSignatures[0]).toBe('');
        expect(continueSignatures.filter(Boolean)).toHaveLength(1);
        expect(scenario.prefilledSignerIndex).not.toBe(0);
        expect(continueSignatures[scenario.prefilledSignerIndex]).toBe(
          fixture.reference.expectedSignatures[scenario.prefilledSignerIndex]
        );
      });
    });
  });

  test('公开 fixture 不包含扩展私钥或 seed', async () => {
    const serialized = JSON.stringify(await generateBtcFixtures(TEST_MNEMONICS));

    TEST_MNEMONICS.forEach(mnemonic => expect(serialized).not.toContain(mnemonic));
    expect(serialized).not.toMatch(/privateKey|private_key|xprv|"seed"/i);
  });
});
