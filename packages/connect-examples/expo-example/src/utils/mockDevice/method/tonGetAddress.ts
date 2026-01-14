import TonWeb from 'tonweb';

import { deriveKeyPairWithPath, mnemonicToSeed } from '../helper';

import type { Success, Unsuccessful } from '@onekeyfe/hd-core';

/**
 * 抽离的核心逻辑：从 seed 生成 TON 地址
 * 可以被 SLIP39 直接调用，避免助记词转换
 */
export async function generateTonAddressFromSeed(
  seed: Buffer,
  path: string,
  params: {
    walletVersion: number;
    isBounceable: boolean;
    isTestnetOnly: boolean;
    workchain?: number;
    walletId?: number;
  }
): Promise<string> {
  const { walletVersion, isBounceable, isTestnetOnly, workchain = 0, walletId } = params;

  const keyPair = deriveKeyPairWithPath(seed, path, 'ed25519');
  const { privateKey: privateKeyArray, publicKey: publicKeyArray } = keyPair;

  if (!privateKeyArray || !publicKeyArray) {
    throw new Error('privateKey or publicKey is undefined');
  }

  const publicKey = Buffer.from(publicKeyArray.slice(1));

  let contractVersion: keyof typeof TonWeb.Wallets.all = 'v4R2';
  switch (walletVersion) {
    case 0:
      contractVersion = 'v3R1';
      break;
    case 1:
      contractVersion = 'v3R2';
      break;
    case 2:
      contractVersion = 'v4R1';
      break;
    case 3:
      contractVersion = 'v4R2';
      break;
    default:
      contractVersion = 'v4R2';
  }

  // 计算walletId，与硬件实现保持一致
  const finalWalletId = walletId !== undefined ? walletId : 698983191 + workchain;

  const wallet = new TonWeb.Wallets.all[contractVersion](undefined as any, {
    publicKey: publicKey as any,
    wc: workchain,
    walletId: finalWalletId,
  });
  const address = await wallet.getAddress();
  const nonBounceableAddress = address.toString(true, true, isBounceable, isTestnetOnly);

  return nonBounceableAddress;
}

export default async function tonGetAddress(
  connectId: string,
  deviceId: string,
  params: any & {
    mnemonic: string;
    passphrase?: string;
    walletVersion: number;
    isBounceable: boolean;
    isTestnetOnly: boolean;
    workchain: number;
    walletId: number;
  }
): Promise<
  | Unsuccessful
  | Success<{
      address: string;
      path: string;
    }>
> {
  const {
    path,
    mnemonic,
    passphrase,
    walletVersion,
    isBounceable,
    isTestnetOnly,
    workchain,
    walletId,
  } = params;
  const seed = mnemonicToSeed(mnemonic, passphrase);

  try {
    const address = await generateTonAddressFromSeed(seed, path, {
      walletVersion,
      isBounceable,
      isTestnetOnly,
      workchain,
      walletId,
    });

    return {
      success: true,
      payload: { address, path },
    };
  } catch (error) {
    return {
      success: false,
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
