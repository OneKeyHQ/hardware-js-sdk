import type { HardwareApiMethod } from "~/services/hardwareService";

// 统一的方法预设类型
export interface MethodPreset {
  title: string;
  value: Record<string, unknown>;
}

// 统一的方法配置类型 - 直接基于原始数据格式
export interface MethodConfig {
  method: HardwareApiMethod;
  description: string;
  presets?: MethodPreset[];
  deprecated?: boolean;
  noConnIdReq?: boolean;
  noDeviceIdReq?: boolean;
}

// 链元数据类型
export interface ChainMeta {
  id: ChainCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: Category;
}

// 完整的链配置类型
export interface ChainConfig extends ChainMeta {
  methods: MethodConfig[];
}

// 功能模块分类（非区块链）
export type FunctionalCategory = "basic" | "device";

// 区块链分类
export type ChainCategory =
  | "bitcoin"
  | "ethereum"
  | "solana"
  | "cardano"
  | "polkadot"
  | "sui"
  | "aptos"
  | "near"
  | "ton"
  | "cosmos"
  | "tron"
  | "xrp"
  | "stellar"
  | "neo"
  | "nem"
  | "kaspa"
  | "algorand"
  | "filecoin"
  | "nervos"
  | "starcoin"
  | "scdo"
  | "dynex"
  | "nexa"
  | "alephium"
  | "conflux"
  | "nostr"
  | "lightning"
  | "benfen"
  | "all-network";

// 统一分类类型
export type Category = FunctionalCategory | ChainCategory;

// 执行相关类型
export type ExecutionStatus =
  | "idle"
  | "loading"
  | "device-interaction"
  | "success"
  | "error";

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration?: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: "request" | "response" | "error" | "info";
  method?: string;
  content: string;
  data?: unknown;
  duration?: number;
}

// 注册表统计类型 - 简化
export interface RegistryStats {
  totalChains: number;
  totalMethods: number;
  functionalsByCategory: Record<FunctionalCategory, number>;
  chainsByCategory: Record<ChainCategory, number>;
}
