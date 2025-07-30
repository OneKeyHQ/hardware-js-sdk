/**
 * SLIP39测试状态管理
 * 为每个SLIP39模块创建独立的状态实例，避免状态冲突
 */

import { createTestRunnerAtoms } from '../../components/BaseTestRunner/Context/TestRunnerVerifyProvider';

// 为每个SLIP39模块创建独立的状态管理实例
export const slip39StateInstances = {
  // 地址验证模块
  addressValidation: createTestRunnerAtoms('slip39-address-validation'),

  // 批量地址测试模块
  batchAddress: createTestRunnerAtoms('slip39-batch-address'),

  // 批量公钥测试模块
  batchPubkey: createTestRunnerAtoms('slip39-batch-pubkey'),
} as const;

// 简化的导出：只导出常用的原子
export const {
  clearItemVerifyStateAtom: addressValidationClearItemVerifyStateAtom,
  setFailedTasksAtom: addressValidationSetFailedTasksAtom,
} = slip39StateInstances.addressValidation;

// 工具函数：获取模块状态管理器
export function getSlip39StateManager(moduleId: keyof typeof slip39StateInstances) {
  return slip39StateInstances[moduleId];
}

// 类型导出
export type Slip39ModuleId = keyof typeof slip39StateInstances;
export type Slip39StateManager = ReturnType<typeof createTestRunnerAtoms>;
