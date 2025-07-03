import type { HardwareApiMethod } from '~/services/hardwareService';

// 选项类型定义
export interface SelectOption {
  label: string;
  value: string;
}

// 参数字段类型 - 包含值和UI配置
export interface ParameterField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'textarea' | 'select' | 'file';
  label?: string;
  description?: string;
  placeholder?: string;
  value?: unknown; // 参数的实际值
  required?: boolean;
  visible?: boolean;
  editable?: boolean;
  options?: string[] | SelectOption[];
  accept?: string; // 文件类型限制
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

// 统一的预设配置 - 既包含参数定义，也包含参数值
export interface MethodPreset {
  title: string;
  description?: string;
  // 参数列表 - 每个参数包含完整的配置和值
  parameters: ParameterField[];
}

// 方法分类
export type MethodCategory =
  | 'address'
  | 'publicKey'
  | 'transaction'
  | 'signing'
  | 'device'
  | 'info'
  | 'firmware'
  | 'other';

// 链分类
export type ChainCategory =
  | 'bitcoin'
  | 'ethereum'
  | 'polkadot'
  | 'cosmos'
  | 'solana'
  | 'cardano'
  | 'tron'
  | 'sui'
  | 'ton'
  | 'aptos'
  | 'near'
  | 'algo'
  | 'stellar'
  | 'ripple'
  | 'neo'
  | 'nem'
  | 'kaspa'
  | 'nervos'
  | 'nexa'
  | 'starcoin'
  | 'conflux'
  | 'scdo'
  | 'benfen'
  | 'alephium'
  | 'dynex'
  | 'filecoin'
  | 'nostr'
  | 'lightning'
  | 'allnetwork';

export type DeviceMethodCategory = 'device' | 'firmware';

// 联合类型，用于统一处理
export type AllMethodCategory = ChainCategory | DeviceMethodCategory;

// **统一的方法配置类型** - 极简设计
export interface UnifiedMethodConfig {
  method: HardwareApiMethod;
  description?: string;
  category?: MethodCategory;

  // 预设配置 - 每个预设包含完整的参数定义和值
  presets: MethodPreset[];

  // 其他配置
  noDeviceIdReq?: boolean;
  noConnIdReq?: boolean;
  deprecated?: boolean;
  supportedDevices?: string[];
  tags?: string[];
}

// 执行状态
export type ExecutionStatus =
  | 'idle'
  | 'preparing'
  | 'loading'
  | 'executing'
  | 'device-interaction'
  | 'success'
  | 'error'
  | 'cancelled';

// 日志类型
export type LogType = 'info' | 'success' | 'error' | 'warning';

// 链配置类型 - 简化为统一类型
export interface ChainConfig {
  id: AllMethodCategory;
  methods: UnifiedMethodConfig[];
}

// 模块配置类型 - 用于注册表
export interface ModuleConfig {
  id: string;
  module: {
    api: UnifiedMethodConfig[];
    id: AllMethodCategory;
  };
}

// 方法注册表接口
export interface MethodsRegistry {
  chains: ChainConfig[];
  methodsByChain: Record<string, UnifiedMethodConfig[]>;
  allMethods: UnifiedMethodConfig[];
  getChainMethods: (chainId: string) => UnifiedMethodConfig[];
  searchMethods: (query: string) => UnifiedMethodConfig[];
  getChain: (chainId: string) => ChainConfig | undefined;
  isReady: () => boolean;
}
