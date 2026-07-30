import type { OpenWalletSessionPayload } from '@onekeyfe/hd-core';

export type WalletSessionTestProtocol = 'V1' | 'V2';
export type WalletSessionCaseExecution = 'automatic' | 'interactive' | 'manual-checkpoint';
export type WalletSessionCaseCategory =
  | 'environment'
  | 'standard'
  | 'hidden'
  | 'cache'
  | 'attach-pin'
  | 'identity';

export type WalletSessionCaseDefinition = {
  id: string;
  title: string;
  description: string;
  category: WalletSessionCaseCategory;
  protocols: WalletSessionTestProtocol[];
  prerequisites: string[];
  steps: string[];
  expected: string[];
  execution: WalletSessionCaseExecution;
  sdkMethod?: string;
  destructive?: boolean;
};

const BOTH_PROTOCOLS: WalletSessionTestProtocol[] = ['V1', 'V2'];

export function assertAttachPinUnlocked(state: {
  status: { unlockedAttachPin?: boolean | null };
}): void {
  if (state.status.unlockedAttachPin !== true) {
    throw new Error('设备未报告 unlockedAttachPin=true');
  }
}

export const WALLET_SESSION_CASES: WalletSessionCaseDefinition[] = [
  {
    id: 'webusb-baseline',
    title: 'WebUSB 连接与身份基线',
    description: '授权真实设备并记录 Protocol、deviceId 和 Passphrase/Attach PIN 状态。',
    category: 'environment',
    protocols: BOTH_PROTOCOLS,
    prerequisites: [],
    steps: ['选择 WebUSB', '连接并解锁设备', '调用 getDeviceState(runtime)'],
    expected: ['protocol 为 V1 或 V2', '实时 deviceId 非空', '状态来自当前硬件响应'],
    execution: 'interactive',
    sdkMethod: 'getDeviceState',
  },
  {
    id: 'standard-open',
    title: '打开标准钱包',
    description: '验证标准钱包返回设备状态，但钱包类型只由 walletType 判定。',
    category: 'standard',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['webusb-baseline'],
    steps: ['调用 openWalletSession(standard)', '比较响应 deviceId 与实时状态'],
    expected: ['walletType=standard', 'passphraseState 非空', 'deviceId 与基线一致'],
    execution: 'interactive',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'standard-address',
    title: '标准钱包地址基线',
    description: '使用固定公开派生路径取得地址，作为后续钱包路由比较基线。',
    category: 'standard',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['standard-open'],
    steps: ['调用 evmGetAddress(useEmptyPassphrase=true)', '只在内存中保存地址'],
    expected: ['地址非空', '再次调用仍得到同一地址'],
    execution: 'interactive',
    sdkMethod: 'evmGetAddress',
  },
  {
    id: 'hidden-a-select',
    title: '通过 Host 选择隐藏钱包 A',
    description: '在 Host 输入一个仅用于测试的 Passphrase，只用于当前 SDK 请求，不保存到页面状态。',
    category: 'hidden',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['standard-address'],
    steps: [
      '调用 openWalletSession(select-hidden)',
      '在统一钱包选择弹窗的 Host 表单输入 Passphrase',
    ],
    expected: [
      'Host Passphrase 输入可用',
      'walletType=hidden',
      'passphraseState 非空',
      'deviceId 与基线一致',
      'Passphrase 不进入页面结果或跟踪日志',
    ],
    execution: 'interactive',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'hidden-a-address',
    title: '隐藏钱包 A 地址',
    description: '验证业务调用使用钱包 A 的 passphraseState，不会落入标准钱包。',
    category: 'hidden',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-a-select'],
    steps: ['调用 evmGetAddress(passphraseState=A)', '与标准钱包地址比较'],
    expected: ['地址非空', '地址与标准钱包不同'],
    execution: 'automatic',
    sdkMethod: 'evmGetAddress',
  },
  {
    id: 'hidden-a-resume',
    title: '恢复隐藏钱包 A',
    description: '使用 deviceId + passphraseState 恢复 SDK Store 中的钱包 Session。',
    category: 'hidden',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-a-address'],
    steps: ['调用 openWalletSession(resume-hidden)', '再次获取钱包 A 地址'],
    expected: ['钱包标识保持 A', '地址保持 A', '不得重新弹出 Passphrase 选择'],
    execution: 'automatic',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'hidden-b-select',
    title: '通过设备端选择隐藏钱包 B',
    description: '在硬件设备上输入与钱包 A 不同的测试 Passphrase，建立第二个钱包引用。',
    category: 'hidden',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-a-resume'],
    steps: ['调用 openWalletSession(select-hidden)', '在设备端输入不同于钱包 A 的 Passphrase'],
    expected: ['设备端 Passphrase 输入可用', '返回隐藏钱包', 'passphraseState 与 A 不同'],
    execution: 'interactive',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'hidden-b-address',
    title: '隐藏钱包 B 地址',
    description: '取得钱包 B 地址，作为多钱包隔离断言。',
    category: 'hidden',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-b-select'],
    steps: ['调用 evmGetAddress(passphraseState=B)'],
    expected: ['地址非空', '地址与标准钱包、钱包 A 均不同'],
    execution: 'automatic',
    sdkMethod: 'evmGetAddress',
  },
  {
    id: 'wallet-isolation',
    title: 'A/B 钱包双向隔离',
    description: '交替恢复 A 与 B，并验证同一路径始终路由到各自地址。',
    category: 'hidden',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-b-address'],
    steps: ['恢复 A 并取地址', '恢复 B 并取地址'],
    expected: ['A 始终得到 A 地址', 'B 始终得到 B 地址', '过程中不选择新钱包'],
    execution: 'automatic',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'wallet-cache-clear',
    title: '只清理钱包 A 缓存',
    description: '验证 clearSessionCache(deviceId, passphraseState) 的最小清理范围。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['wallet-isolation'],
    steps: ['只清理钱包 A 的缓存'],
    expected: ['本地调用成功', '不发送设备端关闭 Session 命令'],
    execution: 'automatic',
    sdkMethod: 'clearSessionCache',
  },
  {
    id: 'wallet-cache-invalid',
    title: '钱包 A 缓存失效',
    description: '验证已清理的钱包不会自动退化为重新选择隐藏钱包。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['wallet-cache-clear'],
    steps: ['恢复钱包 A', '统计 Passphrase UI 请求数'],
    expected: ['返回 WalletSessionInvalid', '不弹出 Passphrase 选择'],
    execution: 'automatic',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'hidden-a-reselect-after-clear',
    title: '清缓存后重新选择钱包 A',
    description: '再次输入钱包 A 的测试 Passphrase，验证钱包身份稳定且 Session 已重新建立。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['wallet-cache-invalid'],
    steps: [
      '调用 openWalletSession(select-hidden)',
      '在设备端输入与钱包 A 相同的测试 Passphrase',
      '再次获取地址',
    ],
    expected: ['passphraseState 与钱包 A 相同', '地址仍为钱包 A', '响应标记为新选择而非恢复'],
    execution: 'interactive',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'other-wallet-survives',
    title: '钱包 B 缓存仍可恢复',
    description: '验证清理 A 不会影响同一设备上的钱包 B。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-a-reselect-after-clear'],
    steps: ['恢复钱包 B', '再次获取钱包 B 地址'],
    expected: ['恢复成功', '地址仍为钱包 B', '不弹出 Passphrase 选择'],
    execution: 'automatic',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'device-cache-clear',
    title: '清理当前设备全部缓存',
    description: '验证 clearSessionCache(deviceId) 清理当前设备所有钱包。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['other-wallet-survives'],
    steps: ['按 deviceId 清理缓存'],
    expected: ['调用成功', '其他设备缓存范围不在本用例中修改'],
    execution: 'automatic',
    sdkMethod: 'clearSessionCache',
  },
  {
    id: 'device-cache-invalid',
    title: '设备级缓存失效',
    description: '验证设备级清理后钱包 B 也不能静默恢复。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['device-cache-clear'],
    steps: ['恢复钱包 B', '统计 Passphrase UI 请求数'],
    expected: ['返回 WalletSessionInvalid', '不弹出 Passphrase 选择'],
    execution: 'automatic',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'hidden-a-reselect-after-device-clear',
    title: '设备级清理后重建钱包 A',
    description: '重新选择钱包 A，为无参数全局清理建立一个确定存在的 Session。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['device-cache-invalid'],
    steps: ['调用 openWalletSession(select-hidden)', '输入与钱包 A 相同的测试 Passphrase'],
    expected: ['passphraseState 与钱包 A 相同', '地址仍为钱包 A', 'Session 已重新建立'],
    execution: 'interactive',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'all-cache-clear',
    title: '清理 SDK 全部钱包缓存',
    description: '验证无参数 clearSessionCache 的全局本地清理入口。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-a-reselect-after-device-clear'],
    steps: ['调用 clearSessionCache()'],
    expected: ['调用成功', '不会修改设备端钱包或执行 Lock/Wipe'],
    execution: 'automatic',
    sdkMethod: 'clearSessionCache',
  },
  {
    id: 'all-cache-invalid',
    title: '全局缓存清理后钱包失效',
    description: '验证无参数清理确实移除了刚重建的钱包 Session。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['all-cache-clear'],
    steps: ['恢复钱包 A', '统计 Passphrase UI 请求数'],
    expected: ['返回 WalletSessionInvalid', '不得自动选择新钱包'],
    execution: 'automatic',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'invalid-cache-params',
    title: '拒绝孤立的 passphraseState',
    description: '验证缺少 deviceId 时不会把局部清理误执行成全局清理。',
    category: 'cache',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['all-cache-invalid'],
    steps: ['仅传 passphraseState 调用 clearSessionCache'],
    expected: ['返回 CallMethodInvalidParameter', '错误明确要求 deviceId'],
    execution: 'automatic',
    sdkMethod: 'clearSessionCache',
  },
  {
    id: 'wrong-device-id',
    title: '错误 deviceId 业务调用',
    description: '验证钱包业务命令不会发送到不匹配的设备初始化生命周期。',
    category: 'identity',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-a-address'],
    steps: ['构造与实时身份不同的 deviceId', '调用 evmGetAddress'],
    expected: ['返回 DeviceCheckDeviceIdError', '不返回地址'],
    execution: 'automatic',
    sdkMethod: 'evmGetAddress',
  },
  {
    id: 'attach-pin-preflight',
    title: 'Attach PIN 能力检查',
    description: '读取设备是否已有 Attach-to-PIN 绑定；未绑定时跳过后续 Attach PIN 用例。',
    category: 'attach-pin',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['webusb-baseline'],
    steps: ['刷新 getDeviceState(runtime)', '读取 attachToPinEnabled'],
    expected: ['状态字段来自实时设备', '未启用时安全跳过而不是伪造绑定'],
    execution: 'automatic',
    sdkMethod: 'getDeviceState',
  },
  {
    id: 'attach-pin-select',
    title: '通过 Attach PIN 选择隐藏钱包',
    description: '直接选择 Attach-to-PIN 钱包，PIN 始终只在硬件设备上输入。',
    category: 'attach-pin',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['attach-pin-preflight'],
    steps: [
      '调用 openWalletSession(select-hidden)',
      '在统一钱包选择弹窗中选择 Attach PIN，并在设备上输入',
      '刷新设备状态并确认 Attach PIN 解锁',
    ],
    expected: [
      '返回隐藏钱包',
      'unlockedAttachPin=true',
      '只触发一次统一钱包选择弹窗',
      'Passphrase 不进入网页',
      '设备 Session 不进入公共响应',
    ],
    execution: 'interactive',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'attach-pin-state',
    title: 'Attach PIN 状态与钱包一致性',
    description: '刷新状态并验证 unlockedAttachPin，同时确认派生地址属于所选隐藏钱包。',
    category: 'attach-pin',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['attach-pin-select'],
    steps: ['刷新设备状态', '按返回的 passphraseState 获取地址'],
    expected: ['unlockedAttachPin=true', 'deviceId 未变化', '重复获取地址一致'],
    execution: 'automatic',
    sdkMethod: 'getDeviceState',
  },
  {
    id: 'attach-pin-standard-rejected',
    title: 'Attach PIN 上下文拒绝标准钱包请求',
    description: '验证设备处于 Attach PIN 隐藏钱包上下文时，不会把标准钱包请求路由到隐藏钱包。',
    category: 'attach-pin',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['attach-pin-state'],
    steps: ['调用 openWalletSession(standard)', '统计 Passphrase UI 请求数'],
    expected: ['返回 DeviceCheckUnlockTypeError', '不得返回标准钱包', '不得弹出钱包选择'],
    execution: 'automatic',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'attach-pin-reselect-after-standard-rejection',
    title: '标准钱包拒绝后重新进入 Attach PIN 钱包',
    description: '前一安全检查会锁定设备；重新选择 Attach PIN 钱包，为钱包状态错配检查恢复上下文。',
    category: 'attach-pin',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['attach-pin-standard-rejected'],
    steps: ['调用 openWalletSession(select-hidden)', '再次选择同一个 Attach PIN 钱包'],
    expected: ['返回原 Attach PIN 钱包标识', 'unlockedAttachPin=true', '只弹出一次钱包选择'],
    execution: 'interactive',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'attach-pin-wrong-wallet-rejected',
    title: 'Attach PIN 上下文拒绝错误隐藏钱包',
    description: '请求钱包 A，但设备当前 Attach PIN 指向另一个隐藏钱包时，必须拒绝而不是返回地址。',
    category: 'attach-pin',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['attach-pin-reselect-after-standard-rejection', 'hidden-a-address'],
    steps: ['确认 Attach PIN 钱包不同于钱包 A', '用钱包 A 的 passphraseState 请求地址'],
    expected: ['返回 DeviceCheckPassphraseStateError', '不返回其他钱包地址', '不得弹出钱包选择'],
    execution: 'automatic',
    sdkMethod: 'evmGetAddress',
  },
  {
    id: 'reconnect-same-device',
    title: '普通断开与 WebUSB 重连',
    description: '拔插或重启设备后重新授权，验证普通重连不会改变钱包初始化身份。',
    category: 'identity',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['webusb-baseline'],
    steps: ['人工拔插或普通重启设备', '重新搜索并刷新状态'],
    expected: ['同一初始化设备的 deviceId 保持一致', 'connectId 不作为钱包身份'],
    execution: 'manual-checkpoint',
    sdkMethod: 'getDeviceState',
  },
  {
    id: 'reconnect-session-outcome',
    title: '重连后的隐藏钱包 Session 结果',
    description: '普通重连后显式恢复钱包 A；允许固件 Session 仍有效或已失效，但禁止隐式切换钱包。',
    category: 'identity',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['reconnect-same-device', 'hidden-a-address'],
    steps: ['调用 openWalletSession(resume-hidden)', '成功时比较地址，失效时检查错误与 UI 请求'],
    expected: [
      '恢复成功时地址仍为钱包 A',
      '失效时返回 WalletSessionInvalid',
      '两种结果均不得自动选择新钱包',
    ],
    execution: 'automatic',
    sdkMethod: 'openWalletSession',
  },
  {
    id: 'runtime-restart-checkpoint',
    title: '浏览器/Core 重启检查点',
    description: '刷新页面会丢失进程内 Session 缓存，但不应改变硬件 deviceId。',
    category: 'identity',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-a-address'],
    steps: ['记录公开钱包标识但不记录 Session', '刷新浏览器页面并重新连接', '重新执行身份基线'],
    expected: [
      'deviceId 保持一致',
      '返回 WalletSessionInvalid',
      '旧 Session 不由页面持久化',
      '恢复失败时不自动选钱包',
    ],
    execution: 'manual-checkpoint',
  },
  {
    id: 'capture-pre-reset',
    title: '记录设备恢复前基线',
    description: '只记录当前 deviceId 与标准钱包地址的内存比较值，不执行擦除。',
    category: 'identity',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['hidden-a-address'],
    steps: ['记录当前身份和标准钱包地址', '确认专用测试设备已有可靠备份'],
    expected: ['不调用 deviceWipe', '不读取、显示或保存助记词'],
    execution: 'manual-checkpoint',
    destructive: true,
  },
  {
    id: 'verify-post-reset',
    title: '外部人工重置/恢复后的身份隔离',
    description: '用户在 OneKey App/设备端完成 wipe 与恢复后，页面只验证新的运行状态。',
    category: 'identity',
    protocols: BOTH_PROTOCOLS,
    prerequisites: ['capture-pre-reset'],
    steps: ['在页面外完成设备重置与恢复', '重新 WebUSB 连接', '比较新旧 deviceId 和标准地址'],
    expected: [
      'deviceId 必须变化',
      '旧 deviceId/Session 不可用于新生命周期',
      '恢复同一测试钱包时标准地址相同',
    ],
    execution: 'manual-checkpoint',
    destructive: true,
  },
];

export function getSatisfiedPrerequisiteIds(
  results: Record<string, { status: string }>
): Set<string> {
  return new Set(
    Object.entries(results)
      .filter(([, result]) => result.status === 'passed')
      .map(([id]) => id)
  );
}

export function summarizeWalletSession(payload: OpenWalletSessionPayload): Record<string, unknown> {
  return {
    protocol: payload.protocol,
    walletType: payload.walletType,
    deviceId: payload.deviceId,
    passphraseState: payload.passphraseState,
    sessionVisibility: 'sdk-internal',
    resumed: payload.resumed,
  };
}

export function buildWrongDeviceId(deviceId: string): string {
  if (!deviceId) {
    throw new Error('deviceId is required');
  }
  const suffix = deviceId.endsWith('0') ? '1' : '0';
  return `${deviceId.slice(0, -1)}${suffix}`;
}
