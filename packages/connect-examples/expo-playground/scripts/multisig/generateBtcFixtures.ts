import { sign } from '@noble/secp256k1';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import { getHDPath } from '@onekeyfe/hd-core';
import { address as bitcoinAddress, networks, payments, Transaction } from 'bitcoinjs-lib';

import type { MultisigMnemonics } from './readMnemonics';
import type { BtcMultisigDescriptor, BtcMultisigFixture, BtcScriptType } from './types';

const FUNDING_AMOUNT = 200000;
const OUTPUT_AMOUNT = 190000;
const DESTINATION_ADDRESS = '1BitcoinEaterAddressDontSendf59kuE';

const BTC_CONFIGS: Array<{
  id: BtcMultisigFixture['id'];
  title: string;
  accountPath: string;
  scriptType: BtcScriptType;
  signerCount: 2 | 3;
  threshold: 2;
  childPath: readonly [number, number];
}> = [
  {
    id: 'p2sh',
    title: 'P2SH',
    accountPath: "m/48'/0'/0'/0'",
    scriptType: 'SPENDMULTISIG',
    signerCount: 3,
    threshold: 2,
    childPath: [0, 0],
  },
  {
    id: 'p2sh-p2wsh',
    title: 'P2SH-P2WSH',
    accountPath: "m/48'/0'/0'/1'",
    scriptType: 'SPENDP2SHWITNESS',
    signerCount: 3,
    threshold: 2,
    childPath: [0, 0],
  },
  {
    id: 'p2wsh',
    title: 'P2WSH',
    accountPath: "m/48'/0'/0'/2'",
    scriptType: 'SPENDWITNESS',
    signerCount: 3,
    threshold: 2,
    childPath: [0, 0],
  },
  {
    id: 'p2wsh-2of2-index2',
    title: 'P2WSH · Index 2',
    accountPath: "m/48'/0'/0'/2'",
    scriptType: 'SPENDWITNESS',
    signerCount: 2,
    threshold: 2,
    childPath: [0, 2],
  },
];

function cloneMultisig(multisig: BtcMultisigDescriptor, signatures: string[]) {
  return {
    pubkeys: multisig.pubkeys.map(item => ({ node: item.node, address_n: [...item.address_n] })),
    signatures: [...signatures],
    m: multisig.m,
  };
}

function createPayment(
  scriptType: BtcScriptType,
  threshold: number,
  childPublicKeys: Buffer[]
) {
  const p2ms = payments.p2ms({
    m: threshold,
    pubkeys: childPublicKeys,
    network: networks.bitcoin,
  });
  if (!p2ms.output) throw new Error(`BTC ${scriptType} 无法生成 multisig script`);

  if (scriptType === 'SPENDMULTISIG') {
    const payment = payments.p2sh({ redeem: p2ms, network: networks.bitcoin });
    return { payment, redeemScript: p2ms.output, witnessScript: undefined };
  }

  const p2wsh = payments.p2wsh({ redeem: p2ms, network: networks.bitcoin });
  if (scriptType === 'SPENDP2SHWITNESS') {
    const payment = payments.p2sh({ redeem: p2wsh, network: networks.bitcoin });
    return { payment, redeemScript: p2wsh.output, witnessScript: p2ms.output };
  }

  return { payment: p2wsh, redeemScript: p2ms.output, witnessScript: p2ms.output };
}

function createFundingTransaction(id: string, scriptPubKey: Buffer): Transaction {
  const transaction = new Transaction();
  transaction.version = 2;
  transaction.addInput(
    Buffer.alloc(32),
    0xffffffff,
    0xffffffff,
    Buffer.from(`offline-multisig-${id}`, 'utf8')
  );
  transaction.addOutput(scriptPubKey, FUNDING_AMOUNT);
  return transaction;
}

function createSpendingTransaction(prevHash: string): Transaction {
  const transaction = new Transaction();
  transaction.version = 2;
  transaction.addInput(Buffer.from(prevHash, 'hex').reverse(), 0, 0xfffffffd);
  transaction.addOutput(
    bitcoinAddress.toOutputScript(DESTINATION_ADDRESS, networks.bitcoin),
    OUTPUT_AMOUNT
  );
  return transaction;
}

async function createFixture(
  mnemonics: MultisigMnemonics,
  config: (typeof BTC_CONFIGS)[number]
): Promise<BtcMultisigFixture> {
  const accounts = mnemonics.slice(0, config.signerCount).map(mnemonic =>
    HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic)).derive(config.accountPath)
  );
  const children = accounts.map(account =>
    config.childPath.reduce((node, index) => node.deriveChild(index), account)
  );
  const childPublicKeys = children.map((child, index) => {
    if (!child.publicKey) throw new Error(`BTC ${config.title} signer ${index + 1} 公钥派生失败`);
    return Buffer.from(child.publicKey);
  });
  const privateKeys = children.map((child, index) => {
    if (!child.privateKey) throw new Error(`BTC ${config.title} signer ${index + 1} 私钥派生失败`);
    return child.privateKey;
  });
  const { payment, redeemScript, witnessScript } = createPayment(
    config.scriptType,
    config.threshold,
    childPublicKeys
  );
  if (!payment.address || !payment.output || !redeemScript) {
    throw new Error(`BTC ${config.title} 地址生成失败`);
  }

  const fundingTx = createFundingTransaction(config.id, payment.output);
  const prevHash = fundingTx.getId();
  const spendingTx = createSpendingTransaction(prevHash);
  const sighash =
    config.scriptType === 'SPENDMULTISIG'
      ? spendingTx.hashForSignature(0, redeemScript, Transaction.SIGHASH_ALL)
      : spendingTx.hashForWitnessV0(
          0,
          witnessScript ?? redeemScript,
          FUNDING_AMOUNT,
          Transaction.SIGHASH_ALL
        );
  const expectedSignatures = await Promise.all(
    privateKeys.map(async privateKey => {
      const derSignature = await sign(sighash, privateKey, { canonical: true, der: true });
      return `${Buffer.from(derSignature).toString('hex')}01`;
    })
  );
  const accountXpubs = accounts.map(account => account.publicExtendedKey);
  const accountNodes = accounts.map((account, index) => {
    if (!account.chainCode || !account.publicKey) {
      throw new Error(`BTC ${config.title} signer ${index + 1} HDNode 派生失败`);
    }
    return {
      depth: account.depth,
      fingerprint: account.parentFingerprint,
      child_num: account.index,
      chain_code: Buffer.from(account.chainCode).toString('hex'),
      public_key: Buffer.from(account.publicKey).toString('hex'),
    };
  });
  const emptySignatures = Array.from({ length: config.signerCount }, () => '');
  const partialSignatures = [...emptySignatures];
  partialSignatures[0] = expectedSignatures[0];
  const doubleSignatures = [...emptySignatures];
  doubleSignatures[0] = expectedSignatures[0];
  doubleSignatures[1] = expectedSignatures[1];
  const baseMultisig: BtcMultisigDescriptor = {
    pubkeys: accountNodes.map(node => ({ node, address_n: [...config.childPath] })),
    signatures: emptySignatures,
    m: config.threshold,
  };
  const path = `${config.accountPath}/${config.childPath.join('/')}`;
  const addressN = getHDPath(path);
  const refTx = {
    hash: prevHash,
    version: fundingTx.version,
    inputs: fundingTx.ins.map(input => ({
      prev_hash: Buffer.from(input.hash).reverse().toString('hex'),
      prev_index: input.index,
      script_sig: input.script.toString('hex'),
      sequence: input.sequence,
    })),
    bin_outputs: fundingTx.outs.map(output => ({
      amount: output.value,
      script_pubkey: output.script.toString('hex'),
    })),
    lock_time: fundingTx.locktime,
  };
  const buildSignParameters = (signatures: string[]) => ({
    coin: 'btc' as const,
    version: spendingTx.version,
    locktime: spendingTx.locktime,
    inputs: [
      {
        address_n: [...addressN],
        prev_hash: prevHash,
        prev_index: 0,
        sequence: spendingTx.ins[0].sequence,
        amount: String(FUNDING_AMOUNT),
        script_type: config.scriptType,
        multisig: cloneMultisig(baseMultisig, signatures),
      },
    ],
    outputs: [
      {
        address: DESTINATION_ADDRESS,
        amount: String(OUTPUT_AMOUNT),
        script_type: 'PAYTOADDRESS' as const,
      },
    ],
    refTxs: [refTx],
  });
  const signerAddresses = childPublicKeys.map(
    publicKey => payments.p2pkh({ pubkey: publicKey, network: networks.bitcoin }).address ?? ''
  );
  const signerIndex = 0 as const;
  const prefilledSignerIndex = 1 as const;
  const continueSignatures = [...emptySignatures];
  continueSignatures[prefilledSignerIndex] = expectedSignatures[prefilledSignerIndex];
  const signerScenarios = [
    {
      signerIndex,
      signerEnvKey: 'MULTISIG_MNEMONIC_1' as const,
      signerAddress: signerAddresses[signerIndex],
      expectedSignature: expectedSignatures[signerIndex],
      prefilledSignerIndex,
      firstSignParameters: buildSignParameters(emptySignatures),
      continueSignParameters: buildSignParameters(continueSignatures),
    },
  ];

  return {
    id: config.id,
    title: config.title,
    path,
    scriptType: config.scriptType,
    address: payment.address,
    addressParameters: {
      path,
      coin: 'btc',
      showOnOneKey: true,
      scriptType: config.scriptType,
      multisig: cloneMultisig(baseMultisig, emptySignatures),
    },
    signParameters: buildSignParameters(emptySignatures),
    partialSignParameters: buildSignParameters(partialSignatures),
    signerScenarios,
    expectedDeviceChecks: [
      'Bitcoin 网络',
      config.title,
      `${config.threshold} / ${config.signerCount} 阈值`,
      `发送 ${OUTPUT_AMOUNT} sats`,
      `手续费 ${FUNDING_AMOUNT - OUTPUT_AMOUNT} sats`,
    ],
    reference: {
      broadcastable: false,
      signerAddresses,
      expectedSignatures,
      accountXpubs,
      childPublicKeys: childPublicKeys.map(publicKey => publicKey.toString('hex')),
      sighash: sighash.toString('hex'),
      scriptPubKey: payment.output.toString('hex'),
      redeemScript: redeemScript.toString('hex'),
      witnessScript: witnessScript?.toString('hex'),
      fundingTxHex: fundingTx.toHex(),
      spendingTxHex: spendingTx.toHex(),
      prevHash,
      doubleSignatures,
    },
  };
}

export async function generateBtcFixtures(
  mnemonics: MultisigMnemonics
): Promise<BtcMultisigFixture[]> {
  return Promise.all(BTC_CONFIGS.map(config => createFixture(mnemonics, config)));
}
