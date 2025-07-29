/**
 * SLIP39 测试系统统一类型定义
 */

import { TestCase } from '../../components/BaseTestRunner/types';

/**
 * SLIP39 测试配置
 */
export interface SLIP39TestConfig {
  name: string;
  description: string;
  shares: string[];
  threshold?: number;
}

/**
 * 密码短语配置
 */
export interface SLIP39PassphraseConfig {
  name: string;
  passphrase?: string;
  passphraseState?: string;
}

/**
 * 测试方法数据
 */
export interface SLIP39MethodData {
  method: string;
  name?: string;
  params?: any;
  expectedAddress?: Record<string, string>;
  expectedPublicKey?: Record<string, any>;
}

/**
 * 基础测试用例数据
 */
export interface SLIP39TestCaseData {
  id: string;
  name: string;
  description: string;
  passphrase?: string;
  passphraseState?: string;
  shares?: string[];
  data: SLIP39MethodData[];
}

/**
 * 批量测试用例数据项
 */
export interface SLIP39BatchTestCaseData {
  id: string;
  method: string;
  title: string;
  description: string;
  params?: any;
  result: {
    [path: string]: {
      address?: string;
      publicKey?: string;
      serializedPath?: string;
    };
  };
  expectedAddress?: {
    [path: string]: string;
  };
  expectedPublicKey?: {
    [path: string]: string;
  };
  testType?: 'address' | 'pubkey';
}

/**
 * 批量测试用例额外数据
 */
export interface SLIP39BatchTestCaseExtra {
  passphrase?: string;
  passphraseState?: string;
  shares: string[];
}

/**
 * 批量测试用例
 */
export type SLIP39BatchTestCase = TestCase<SLIP39BatchTestCaseData[], SLIP39BatchTestCaseExtra> & {
  passphrase?: string;
  passphraseState?: string;
};

/**
 * 支持的区块链方法
 */
export type SupportedChainMethod =
  | 'btcGetAddress'
  | 'evmGetAddress'
  | 'cosmosGetAddress'
  | 'suiGetAddress'
  | 'alephiumGetAddress'
  | 'algoGetAddress'
  | 'nervosGetAddress'
  | 'nexaGetAddress'
  | 'scdoGetAddress'
  | 'xrpGetAddress'
  | 'benfenGetAddress'
  | 'tonGetAddress'
  | 'aptosGetPublicKey'
  | 'nostrGetPublicKey'
  | 'polkadotGetAddress';

/**
 * 链配置
 */
export interface ChainConfig {
  method: SupportedChainMethod;
  defaultPath: string;
  coinType?: string;
  network?: string;
  prefix?: string;
}

/**
 * 优化的批量测试用例数据（使用 bundle 参数）
 */
export interface SLIP39OptimizedBatchTestCaseData {
  id: string;
  method: string;
  title: string;
  description: string;
  params: any;
  bundleParams: any[]; // bundle 参数数组
  result: { [key: string]: { address: string; publicKey?: string } };
  expectedAddress?: { [key: string]: string };
  expectedPublicKey?: { [key: string]: string };
  testType: 'address' | 'pubkey';
}

/**
 * 优化的批量测试用例
 */
export type SLIP39OptimizedBatchTestCase = TestCase<
  SLIP39OptimizedBatchTestCaseData[],
  SLIP39BatchTestCaseExtra
> & {
  passphrase?: string;
  passphraseState?: string;
};

/**
 * SLIP39 备份配置
 */
export interface SLIP39BackupConfiguration {
  shareCount: number;
  threshold: number;
  passphrase?: string;
  iterationExponent?: number;
  extendableBackupFlag?: number;
  title?: string;
}
