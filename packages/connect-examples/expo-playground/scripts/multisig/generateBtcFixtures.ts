import { sign } from '@noble/secp256k1';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';
import { address as bitcoinAddress, networks, payments, Transaction } from 'bitcoinjs-lib';

import type { MultisigMnemonics } from './readMnemonics';
import type {
  BtcMultisigDescriptor,
  BtcMultisigFixture,
  BtcScriptType,
} from './types';

const FUNDING_AMOUNT = 200000;
const OUTPUT_AMOUNT = 190000;
const DESTINATION_ADDRESS = '1BitcoinEaterAddressDontSendf59kuE';

const BTC_CONFIGS: Array<{
  id: BtcMultisigFixture['id'];
  title: string;
  accountPath: string;
  scriptType: BtcScriptType;
}> = [
  { id: 'p2sh', title: 'P2SH', accountPath: "m/48'/0'/0'/0'", scriptType: 'SPENDMULTISIG' },
  {
    id: 'p2sh-p2wsh',
    title: 'P2SH-P2WSH',
    accountPath: "m/48'/0'/0'/1'",
    scriptType: 'SPENDP2SHWITNESS',
  },
  { id: 'p2wsh', title: 'P2WSH', accountPath: "m/48'/0'/0'/2'", scriptType: 'SPENDWITNESS' },
];

function cloneMultisig(multisig: BtcMultisigDescriptor, signatures: string[]) {
  return {
    pubkeys: multisig.pubkeys.map(item => ({ node: item.node, address_n: [...item.address_n] })),
    signatures: [...signatures],
    m: multisig.m,
  };
}

function createPayment(id: BtcMultisigFixture['id'], childPublicKeys: Buffer[]) {
  const p2ms = payments.p2ms({ m: 2, pubkeys: childPublicKeys, network: networks.bitcoin });
  if (!p2ms.output) throw new Error(`BTC ${id} 无法生成 multisig script`);

  if (id === 'p2sh') {
    const payment = payments.p2sh({ redeem: p2ms, network: networks.bitcoin });
    return { payment, redeemScript: p2ms.output, witnessScript: undefined };
  }

  const p2wsh = payments.p2wsh({ redeem: p2ms, network: networks.bitcoin });
  if (id === 'p2sh-p2wsh') {
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
  const accounts = mnemonics.map(mnemonic =>
    HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic)).derive(config.accountPath)
  );
  const children = accounts.map(account => account.deriveChild(0).deriveChild(0));
  const childPublicKeys = children.map((child, index) => {
    if (!child.publicKey) throw new Error(`BTC ${config.title} signer ${index + 1} 公钥派生失败`);
    return Buffer.from(child.publicKey);
  });
  const privateKeys = children.map((child, index) => {
    if (!child.privateKey) throw new Error(`BTC ${config.title} signer ${index + 1} 私钥派生失败`);
    return child.privateKey;
  });
  const { payment, redeemScript, witnessScript } = createPayment(config.id, childPublicKeys);
  if (!payment.address || !payment.output || !redeemScript) {
    throw new Error(`BTC ${config.title} 地址生成失败`);
  }

  const fundingTx = createFundingTransaction(config.id, payment.output);
  const prevHash = fundingTx.getId();
  const spendingTx = createSpendingTransaction(prevHash);
  const sighash =
    config.id === 'p2sh'
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
  const emptySignatures = ['', '', ''];
  const partialSignatures = [expectedSignatures[0], '', ''];
  const doubleSignatures = [expectedSignatures[0], expectedSignatures[1], ''];
  const baseMultisig: BtcMultisigDescriptor = {
    pubkeys: accountXpubs.map(node => ({ node, address_n: [0, 0] })),
    signatures: emptySignatures,
    m: 2,
  };
  const path = `${config.accountPath}/0/0`;
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
    inputs: [
      {
        address_n: path,
        prev_hash: prevHash,
        prev_index: 0,
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
  const prefilledSignerIndexes = [1, 0, 0] as const;
  const signerEnvKeys = [
    'MULTISIG_MNEMONIC_1',
    'MULTISIG_MNEMONIC_2',
    'MULTISIG_MNEMONIC_3',
  ] as const;
  const signerScenarios = ([0, 1, 2] as const).map(signerIndex => {
    const prefilledSignerIndex = prefilledSignerIndexes[signerIndex];
    const continueSignatures = ['', '', ''];
    continueSignatures[prefilledSignerIndex] = expectedSignatures[prefilledSignerIndex];
    return {
      signerIndex,
      signerEnvKey: signerEnvKeys[signerIndex],
      signerAddress: signerAddresses[signerIndex],
      expectedSignature: expectedSignatures[signerIndex],
      prefilledSignerIndex,
      firstSignParameters: buildSignParameters(emptySignatures),
      continueSignParameters: buildSignParameters(continueSignatures),
    };
  });

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
      '2 / 3 阈值',
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
