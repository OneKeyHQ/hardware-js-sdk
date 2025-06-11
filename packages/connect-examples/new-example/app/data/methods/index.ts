// ============================================
// 区块链方法配置导出
// ============================================

// 主要区块链
export { default as bitcoin } from "./bitcoin";
export { default as ethereum } from "./ethereum";
export { default as solana } from "./solana";
export { default as cardano } from "./cardano";
export { default as polkadot } from "./polkadot";

// Layer 2 & 新兴链
export { default as sui } from "./sui";
export { default as aptos } from "./aptos";
export { default as near } from "./near";
export { default as ton } from "./ton";
export { default as cosmos } from "./cosmos";

// 传统区块链
export { default as tron } from "./tron";
export { default as ripple } from "./xrp";
export { default as stellar } from "./stellar";
export { default as neo } from "./neo";
export { default as nem } from "./nem";

// 新兴项目
export { default as kaspa } from "./kaspa";
export { default as algorand } from "./algorand";
export { default as filecoin } from "./filecoin";
export { default as nervos } from "./nervos";
export { default as starcoin } from "./starcoin";
export { default as scdo } from "./scdo";
export { default as dynex } from "./dynex";
export { default as nexa } from "./nexa";
export { default as alephium } from "./alephium";
export { default as conflux } from "./conflux";
export { default as nostr } from "./nostr";

// 特殊网络
export { default as lightning } from "./lightning";
export { default as allnetwork } from "./allnetwork";

// 测试链
export { default as benfen } from "./benfen";

// 设备和基础操作
export { default as device } from "./device";
export { default as basic } from "./basic";

// 重新导出类型
export type { ChainConfig, MethodConfig } from "~/data/types";
