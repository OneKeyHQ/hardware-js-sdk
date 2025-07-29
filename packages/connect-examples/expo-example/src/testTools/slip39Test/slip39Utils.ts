/**
 * SLIP39 统一工具模块
 *
 * 提供地址和公钥的统一生成接口，支持多种区块链方法
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { Slip39, WORD_LIST, validateMnemonic, combineMnemonics } from './core/index';

// Import address generators
import { generateBtcAddressFromSeed } from '../../utils/mockDevice/method/btcGetAddress';
import { generateEvmAddressFromSeed } from '../../utils/mockDevice/method/evmGetAddress';
import { generateCosmosAddressFromSeed } from '../../utils/mockDevice/method/cosmosGetAddress';
import { generateAlephiumAddressFromSeed } from '../../utils/mockDevice/method/alephiumGetAddress';
import { generateSuiAddressFromSeed } from '../../utils/mockDevice/method/suiGetAddress';
import { generateAlgoAddressFromSeed } from '../../utils/mockDevice/method/algoGetAddress';
import { generateNervosAddressFromSeed } from '../../utils/mockDevice/method/nervosGetAddress';
import { generateNexaAddressFromSeed } from '../../utils/mockDevice/method/nexaGetAddress';
import { generateScdoAddressFromSeed } from '../../utils/mockDevice/method/scdoGetAddress';
import { generateXrpAddressFromSeed } from '../../utils/mockDevice/method/xrpGetAddress';
import { generateBenfenAddressFromSeed } from '../../utils/mockDevice/method/benfenGetAddress';
import { generateTonAddressFromSeed } from '../../utils/mockDevice/method/tonGetAddress';

// Import public key generators
import { generateAptosPublicKeyFromSeed } from '../../utils/mockDevice/method/aptosGetPublicKey';
import { generateNostrPublicKeyFromSeed } from '../../utils/mockDevice/method/nostrGetPublicKey';
import { generatePolkadotPublicKeyFromSeed } from '../../utils/mockDevice/method/polkadotGetPublicKey';
import { generateSuiPublicKeyFromSeed } from '../../utils/mockDevice/method/suiGetPublicKey';

import { deriveKeyPairWithPath } from '../../utils/mockDevice/helper';

/**
 * 统一的生成器配置
 */
export interface GeneratorConfig {
  shares: string[];
  passphrase?: string;
  method: string;
  params: any;
}

/**
 * 统一的生成器响应
 */
export interface GeneratorResponse<T = any> {
  success: boolean;
  payload?: T;
  error?: string;
}

/**
 * SLIP39 分析结果
 */
export interface SLIP39Analysis {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  shareCount: number; // 当前提供的shares数量
  threshold: number; // 恢复所需的最少shares数量
  masterSecret?: string;
  // 详细配置信息
  identifier?: number;
  iterationExponent?: number;
  extendableBackupFlag?: number;
  isExtendable?: boolean;
  configType?: 'SLIP39 Basic' | 'SLIP39 Advanced';
  groupThreshold?: number;
  groupCount?: number;
  memberThreshold?: number;
  memberCount?: number;
  // 新增OneKey兼容性检查
  isOnekeyCompatible?: boolean;
  compatibilityIssues?: string[];
  // 新增详细参数说明
  pbkdf2Iterations?: number;
  groupIndex?: number;
  memberIndex?: number;
}

/**
 * 生成器类型
 */
export type GeneratorType = 'address' | 'pubkey';

/**
 * 方法生成器映射
 */
interface MethodGenerator {
  address?: (seed: Buffer, params: any) => Promise<GeneratorResponse>;
  pubkey?: (seed: Buffer, params: any) => Promise<GeneratorResponse>;
}

/**
 * 生成器映射表
 */
const GENERATORS: Record<string, MethodGenerator> = {
  btcGetAddress: {
    address: async (seed: Buffer, params: any) => {
      try {
        const result = await generateBtcAddressFromSeed(seed, params.path, params.coin);
        return { success: true, payload: { address: result } };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  },
  btcGetPublicKey: {
    pubkey: (seed: Buffer, params: any) => {
      try {
        const keyPair = deriveKeyPairWithPath(seed, params.path, 'secp256k1');
        const publicKey = keyPair.publicKey ? Buffer.from(keyPair.publicKey).toString('hex') : '';
        return Promise.resolve({
          success: true,
          payload: { publicKey, node: { public_key: publicKey } },
        });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  evmGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateEvmAddressFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  evmGetPublicKey: {
    pubkey: (seed: Buffer, params: any) => {
      try {
        const keyPair = deriveKeyPairWithPath(seed, params.path, 'secp256k1');
        const publicKey = keyPair.publicKey
          ? `0x${Buffer.from(keyPair.publicKey).toString('hex')}`
          : '';
        return Promise.resolve({
          success: true,
          payload: { publicKey },
        });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  cosmosGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateCosmosAddressFromSeed(seed, params.path, params.hrp);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  cosmosGetPublicKey: {
    pubkey: (seed: Buffer, params: any) => {
      try {
        const keyPair = deriveKeyPairWithPath(seed, params.path, 'secp256k1');
        const publicKey = keyPair.publicKey ? Buffer.from(keyPair.publicKey).toString('hex') : '';
        return Promise.resolve({
          success: true,
          payload: { publicKey },
        });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  suiGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateSuiAddressFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  suiGetPublicKey: {
    pubkey: (seed: Buffer, params: any) => {
      try {
        const result = generateSuiPublicKeyFromSeed(seed, params.path);
        return Promise.resolve({
          success: true,
          payload: { publicKey: result },
        });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  alephiumGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateAlephiumAddressFromSeed(seed, params.path, params.group || 0);
        return Promise.resolve({ success: true, payload: { address: result.address } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  algoGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateAlgoAddressFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  nervosGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateNervosAddressFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  nexaGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateNexaAddressFromSeed(seed, params.path, params.prefix);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  scdoGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateScdoAddressFromSeed(seed, params.path, params.shard);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  xrpGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateXrpAddressFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  benfenGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generateBenfenAddressFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  tonGetAddress: {
    address: async (seed: Buffer, params: any) => {
      try {
        const tonParams = {
          walletVersion: params.walletVersion ?? 3, // 修复：默认使用V4R2
          isBounceable: params.isBounceable ?? false, // 修复：使用??而不是||，默认false
          isTestnetOnly: params.isTestnetOnly ?? false,
          workchain: params.workchain ?? 0,
          walletId: params.walletId ?? 698983191, // 修复：添加默认walletId
        };
        const result = await generateTonAddressFromSeed(seed, params.path, tonParams);
        return { success: true, payload: { address: result } };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  },
  aptosGetPublicKey: {
    pubkey: (seed: Buffer, params: any) => {
      try {
        const result = generateAptosPublicKeyFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { publicKey: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  nostrGetPublicKey: {
    pubkey: (seed: Buffer, params: any) => {
      try {
        const result = generateNostrPublicKeyFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { publicKey: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  polkadotGetAddress: {
    address: (seed: Buffer, params: any) => {
      try {
        const result = generatePolkadotPublicKeyFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { address: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
  polkadotGetPublicKey: {
    pubkey: (seed: Buffer, params: any) => {
      try {
        const result = generatePolkadotPublicKeyFromSeed(seed, params.path);
        return Promise.resolve({ success: true, payload: { publicKey: result } });
      } catch (error) {
        return Promise.resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  },
};

/**
 * SLIP39 元数据接口
 */
export interface SLIP39Metadata {
  identifier: number;
  iterationExponent: number;
  extendableBackupFlag: number;
  groupThreshold?: number;
  groupCount?: number;
  memberThreshold?: number;
}

/**
 * 从 SLIP39 shares 中提取完整的配置信息
 * 使用core模块的combineMnemonics函数来解析配置
 */
export function extractSLIP39FullConfig(shares: string[]): SLIP39Metadata {
  if (!shares || shares.length === 0) {
    throw new Error('No shares provided');
  }

  try {
    // 先提取基本元数据
    const basicMetadata = extractSLIP39Metadata(shares);

    // 使用combineMnemonics来触发decodeMnemonics，从错误信息中提取配置
    let groupThreshold = 1;
    let groupCount = 1;
    let memberThreshold = shares.length;

    try {
      // 尝试使用combineMnemonics，即使失败也能从错误中获取配置信息
      combineMnemonics(shares, '');

      // 如果成功，说明是简单的单组配置
      groupThreshold = 1;
      groupCount = 1;

      // 尝试确定memberThreshold
      for (let i = 1; i < shares.length; i++) {
        try {
          combineMnemonics(shares.slice(0, i), '');
          memberThreshold = i;
          break;
        } catch (error) {
          // 继续尝试
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '';

      // 从错误信息中解析配置
      const groupThresholdMatch = errorMsg.match(/Expected (\d+) groups/);
      if (groupThresholdMatch) {
        groupThreshold = parseInt(groupThresholdMatch[1], 10);
      }

      const groupCountMatch = errorMsg.match(/but (\d+) were provided/);
      if (groupCountMatch) {
        groupCount = parseInt(groupCountMatch[1], 10);
      }

      const memberThresholdMatch = errorMsg.match(/Expected (\d+) mnemonics/);
      if (memberThresholdMatch) {
        memberThreshold = parseInt(memberThresholdMatch[1], 10);
      }
    }

    return {
      identifier: basicMetadata.identifier,
      iterationExponent: basicMetadata.iterationExponent,
      extendableBackupFlag: basicMetadata.extendableBackupFlag,
      groupThreshold,
      groupCount,
      memberThreshold,
    };
  } catch (error) {
    throw new Error(
      `Failed to extract SLIP39 full config: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * 从 SLIP39 shares 中提取元数据（向后兼容）
 */
export function extractSLIP39Metadata(shares: string[]): SLIP39Metadata {
  if (!shares || shares.length === 0) {
    throw new Error('No shares provided');
  }

  try {
    const firstShare = shares[0];
    const words = firstShare.split(' ');
    if (words.length < 20) {
      throw new Error('Invalid SLIP39 share length');
    }

    // Parse the share using the SLIP39 wordlist
    const indices = words.map(word => {
      const index = WORD_LIST.indexOf(word.toLowerCase());
      if (index === -1) {
        throw new Error(`Invalid SLIP39 word: ${word}`);
      }
      return index;
    });

    // Extract metadata from the first words (identifier + iteration exponent + extendable flag)
    const RADIX_BITS = 10;
    const ID_BITS_LENGTH = 15;
    const ITERATION_EXP_BITS_LENGTH = 4;
    const EXTENDABLE_BACKUP_FLAG_BITS_LENGTH = 1;
    const ITERATION_EXP_WORDS_LENGTH = Math.floor(
      (ID_BITS_LENGTH +
        EXTENDABLE_BACKUP_FLAG_BITS_LENGTH +
        ITERATION_EXP_BITS_LENGTH +
        RADIX_BITS -
        1) /
        RADIX_BITS
    );

    // Convert first ITERATION_EXP_WORDS_LENGTH words to integer
    let value = 0;
    for (let i = 0; i < ITERATION_EXP_WORDS_LENGTH; i++) {
      // eslint-disable-next-line no-bitwise
      value = value * (1 << RADIX_BITS) + indices[i];
    }

    // Extract fields from the packed integer
    // eslint-disable-next-line no-bitwise
    const identifier = value >> (ITERATION_EXP_BITS_LENGTH + EXTENDABLE_BACKUP_FLAG_BITS_LENGTH);
    const extendableBackupFlag =
      // eslint-disable-next-line no-bitwise
      (value >> ITERATION_EXP_BITS_LENGTH) & ((1 << EXTENDABLE_BACKUP_FLAG_BITS_LENGTH) - 1);
    // eslint-disable-next-line no-bitwise
    const iterationExponent = value & ((1 << ITERATION_EXP_BITS_LENGTH) - 1);

    return {
      identifier,
      iterationExponent,
      extendableBackupFlag,
    };
  } catch (error) {
    throw new Error(
      `Failed to extract SLIP39 metadata: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Trezor 兼容的解密函数 (Feistel 密码)
 * 实现与 OneKey/Trezor 硬件钱包完全兼容的 SLIP39 passphrase 处理
 *
 * 基于 OneKey firmware-pro/core/src/trezor/crypto/slip39.py 的真实实现
 */
export function trezorCompatibleDecrypt(
  encryptedMasterSecret: Uint8Array,
  passphrase: string,
  iterationExponent: number,
  identifier: number,
  extendable = false
): Uint8Array {
  if (encryptedMasterSecret.length % 2 !== 0) {
    throw new Error('The length of the encrypted master secret in bytes must be an even number.');
  }

  // Split the encrypted master secret into left and right halves
  const halfLen = encryptedMasterSecret.length / 2;
  let l = encryptedMasterSecret.slice(0, halfLen);
  let r = encryptedMasterSecret.slice(halfLen);

  // Generate salt according to OneKey firmware specification
  // 来源: firmware-pro/core/src/trezor/crypto/slip39.py _get_salt()
  let salt: Uint8Array;
  if (extendable) {
    // For extendable backups, salt is empty bytes
    salt = new Uint8Array(0);
  } else {
    // For non-extendable: _CUSTOMIZATION_STRING_ORIG + identifier (2 bytes, big-endian)
    // 注意：使用原始的customization string "shamir"，与firmware-pro完全一致
    const customizationString = new TextEncoder().encode('shamir');
    const ID_LENGTH_BITS = 15;
    const identifierByteLength = Math.ceil(ID_LENGTH_BITS / 8); // 2 bytes
    const identifierBytes = new Uint8Array(identifierByteLength);

    // Store identifier in big-endian format (与固件完全一致)
    for (let i = 0; i < identifierByteLength; i++) {
      // eslint-disable-next-line no-bitwise
      identifierBytes[identifierByteLength - 1 - i] = (identifier >> (8 * i)) & 0xff;
    }

    salt = new Uint8Array([...customizationString, ...identifierBytes]);
  }

  // Constants from OneKey firmware implementation
  // 来源: firmware-pro/core/src/trezor/crypto/slip39.py
  const ROUND_COUNT = 4;
  const BASE_ITERATION_COUNT = 10000;
  // eslint-disable-next-line no-bitwise
  const iterationCount = Math.floor((BASE_ITERATION_COUNT << iterationExponent) / ROUND_COUNT);

  // Feistel cipher decryption (reverse order for decryption)
  // 来源: firmware-pro/core/src/trezor/crypto/slip39.py decrypt()
  for (let i = ROUND_COUNT - 1; i >= 0; i--) {
    // Round function implementation (与固件 _round_function 完全一致)
    // key: bytes([i]) + passphrase
    // salt: salt + r
    // iterations: (_BASE_ITERATION_COUNT << e) // _ROUND_COUNT
    const roundKey = new Uint8Array([i, ...new TextEncoder().encode(passphrase)]);
    const roundSalt = new Uint8Array([...salt, ...r]);

    // Use Noble crypto's PBKDF2 with HMAC-SHA256 (与固件使用的参数完全一致)
    const fBytes = pbkdf2(sha256, roundKey, roundSalt, { c: iterationCount, dkLen: r.length });

    // XOR operation and swap: (l, r) = (r, l XOR f)
    const newL = r;
    const newR = new Uint8Array(l.length);
    for (let j = 0; j < l.length; j++) {
      // eslint-disable-next-line no-bitwise
      newR[j] = l[j] ^ fBytes[j];
    }
    l = newL;
    r = newR;
  }

  // Combine the result: return r + l (与固件返回顺序一致)
  return new Uint8Array([...r, ...l]);
}

/**
 * 从 SLIP39 分片恢复主密钥 (硬件钱包兼容版本)
 * 使用原始逻辑：passphrase直接传递给Slip39.recoverSecret
 * 这与OneKey/Trezor硬件钱包的实现完全一致
 */
export function recoverMasterSecret(shares: string[], passphrase?: string): Buffer {
  if (!shares || shares.length === 0) {
    throw new Error('No shares provided');
  }

  const validShares = shares.filter(share => share && share.trim().length > 0);

  if (validShares.length === 0) {
    throw new Error('No valid shares provided');
  }

  try {
    // 使用原始逻辑：passphrase直接传递给Slip39.recoverSecret
    // 这与硬件钱包的实现完全一致
    const masterSecretArray = Slip39.recoverSecret(validShares, passphrase || '');
    return Buffer.from(masterSecretArray);
  } catch (error) {
    throw new Error(
      `Failed to recover master secret from shares: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * 生成备份SLIP39 shares
 * 从原始shares恢复master secret，然后使用新的配置生成备份shares
 */
export function generateBackupSLIP39Shares(
  originalShares: string[],
  passphrase: string,
  backupConfig: {
    shareCount: number;
    threshold: number;
    iterationExponent?: number;
    extendableBackupFlag?: number;
    title?: string;
  }
): string[] {
  try {
    // 1. 从原始shares恢复master secret（应用passphrase）
    const masterSecret = recoverMasterSecret(originalShares, passphrase);
    const masterSecretArray = Array.from(masterSecret);

    // 2. 使用恢复的master secret生成新的备份shares
    // 注意：不再使用passphrase，因为master secret已经是解密后的
    const slip39Instance = Slip39.fromArray(masterSecretArray, {
      passphrase: '', // 不使用passphrase，因为master secret已经是最终的
      threshold: 1, // 单组配置
      groups: [
        [backupConfig.threshold, backupConfig.shareCount, backupConfig.title || 'Backup Group'],
      ],
      iterationExponent: backupConfig.iterationExponent || 1,
      extendableBackupFlag: backupConfig.extendableBackupFlag || 1,
      title: backupConfig.title || 'SLIP39 Backup',
    });

    // 3. 提取生成的shares
    const backupShares: string[] = [];

    const extractShares = (node: any): void => {
      if (node.mnemonic) {
        backupShares.push(node.mnemonic);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => extractShares(child));
      }
    };

    if (slip39Instance.root) {
      extractShares(slip39Instance.root);
    }

    if (backupShares.length === 0) {
      throw new Error('No backup shares were generated');
    }

    return backupShares;
  } catch (error) {
    throw new Error(
      `Failed to generate backup shares: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * 分析 SLIP39 分片
 */
export function analyzeSLIP39Shares(shares: string[]): SLIP39Analysis {
  const result: SLIP39Analysis = {
    isValid: false,
    errors: [],
    warnings: [],
    shareCount: 0,
    threshold: 0,
  };

  try {
    if (!shares || shares.length === 0) {
      result.errors.push('No shares provided');
      return result;
    }

    const validShares = shares.filter(share => share && share.trim().length > 0);
    result.shareCount = validShares.length;

    if (validShares.length === 0) {
      result.errors.push('No valid shares provided');
      return result;
    }

    // 提取SLIP39完整配置信息
    try {
      const fullConfig = extractSLIP39FullConfig(validShares);
      result.identifier = fullConfig.identifier;
      result.iterationExponent = fullConfig.iterationExponent;
      result.extendableBackupFlag = fullConfig.extendableBackupFlag;
      result.isExtendable = fullConfig.extendableBackupFlag > 0;

      // 设置组配置信息
      result.groupThreshold = fullConfig.groupThreshold || 1;
      result.groupCount = fullConfig.groupCount || 1;

      // 确定配置类型
      if (result.groupCount > 1) {
        result.configType = 'SLIP39 Advanced';
      } else {
        result.configType = 'SLIP39 Basic';
      }
    } catch (error) {
      result.warnings.push(
        `Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // 尝试不同的shares组合来确定阈值
    let actualThreshold = 0;
    let canRecover = false;

    // 从最少的shares开始尝试，找到能成功恢复的最小数量
    for (let i = 1; i <= validShares.length; i++) {
      try {
        const testShares = validShares.slice(0, i);
        const masterSecretArray = Slip39.recoverSecret(testShares, '');
        result.masterSecret = Buffer.from(masterSecretArray).toString('hex');
        actualThreshold = i;
        canRecover = true;
        break;
      } catch (error) {
        // 继续尝试更多shares
      }
    }

    if (canRecover) {
      result.threshold = actualThreshold;

      // 使用从配置中提取的信息，如果没有则使用默认值
      if (!result.configType) {
        result.configType = 'SLIP39 Basic';
      }
      if (!result.groupThreshold) {
        result.groupThreshold = 1;
      }
      if (!result.groupCount) {
        result.groupCount = 1;
      }

      result.memberThreshold = actualThreshold;
      result.memberCount = validShares.length;

      // 计算PBKDF2迭代次数
      if (result.iterationExponent !== undefined) {
        // eslint-disable-next-line no-restricted-properties
        result.pbkdf2Iterations = 10000 * 2 ** result.iterationExponent;
      }

      // OneKey兼容性检查：只有Basic模式且Extendable才兼容
      result.compatibilityIssues = [];
      result.isOnekeyCompatible =
        result.configType === 'SLIP39 Basic' && result.isExtendable === true;

      // 简化的配置说明
      if (result.isOnekeyCompatible) {
        result.warnings.push('✅ OneKey兼容');
      } else {
        if (result.configType !== 'SLIP39 Basic') {
          result.compatibilityIssues.push('需要Basic模式');
        }
        if (!result.isExtendable) {
          result.compatibilityIssues.push('需要可扩展备份');
        }
      }

      // 基本参数验证
      if (
        result.iterationExponent !== undefined &&
        (result.iterationExponent < 0 || result.iterationExponent > 15)
      ) {
        result.compatibilityIssues.push(`迭代指数超出范围: ${result.iterationExponent} (应为0-15)`);
        result.isOnekeyCompatible = false;
      }

      if (result.identifier !== undefined && (result.identifier < 0 || result.identifier > 32767)) {
        result.compatibilityIssues.push(`标识符超出范围: ${result.identifier} (应为0-32767)`);
        result.isOnekeyCompatible = false;
      }

      if (result.memberCount && result.memberThreshold) {
        if (
          result.memberCount < 1 ||
          result.memberCount > 16 ||
          result.memberThreshold < 1 ||
          result.memberThreshold > 16 ||
          result.memberThreshold > result.memberCount
        ) {
          result.compatibilityIssues.push('分片配置超出OneKey支持范围 (1-16)');
          result.isOnekeyCompatible = false;
        }
      }
    } else {
      result.errors.push('无法恢复master secret，可能shares不足或无效');
    }

    result.isValid = canRecover;
    result.isValid = true;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error analyzing shares');
  }

  return result;
}

/**
 * 从 SLIP39 分片生成地址
 * 使用与 OneKey/Trezor 完全相同的 passphrase 处理逻辑
 */
export async function generateMultiChainAddressFromSLIP39(
  config: GeneratorConfig
): Promise<GeneratorResponse> {
  try {
    // 使用硬件钱包兼容的 master secret 恢复
    const masterSecret = recoverMasterSecret(config.shares, config.passphrase);

    const methodGenerator = GENERATORS[config.method];
    if (!methodGenerator) {
      return {
        success: false,
        error: `Unsupported method: ${config.method}`,
      };
    }

    const generator = methodGenerator.address;
    if (!generator) {
      return {
        success: false,
        error: `Method ${config.method} does not support address generation`,
      };
    }

    return await generator(masterSecret, config.params);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 从 SLIP39 分片生成公钥
 * 使用与 OneKey/Trezor 完全相同的 passphrase 处理逻辑
 */
export async function generateMultiChainPublicKeyFromSLIP39(
  config: GeneratorConfig
): Promise<GeneratorResponse> {
  try {
    // 使用硬件钱包兼容的 master secret 恢复
    const masterSecret = recoverMasterSecret(config.shares, config.passphrase);

    const methodGenerator = GENERATORS[config.method];
    if (!methodGenerator) {
      return {
        success: false,
        error: `Unsupported method: ${config.method}`,
      };
    }

    const generator = methodGenerator.pubkey;
    if (!generator) {
      return {
        success: false,
        error: `Method ${config.method} does not support pubkey generation`,
      };
    }

    return await generator(masterSecret, config.params);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 获取所有支持的方法列表
 */
export function getSupportedMethods(type?: GeneratorType): string[] {
  if (!type) {
    return Object.keys(GENERATORS);
  }

  return Object.keys(GENERATORS).filter(method => GENERATORS[method][type]);
}

/**
 * 验证 SLIP39 助记词格式
 * 直接使用 core 中的实现
 */
export function validateSLIP39Mnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic);
}
