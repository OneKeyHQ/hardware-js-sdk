// ============================================
// 统一方法注册表
// 将所有方法数据合并到一个文件中以优化打包
// ============================================

import type {
  UnifiedMethodConfig,
  ChainConfig,
  ModuleConfig,
  MethodsRegistry,
  AllMethodCategory,
} from '../data/types';

// 统计信息类型
export interface RegistryStats {
  totalChains: number;
  totalMethods: number;
  chainsByCategory: Partial<Record<AllMethodCategory, number>>;
}

// 静态导入所有方法，确保它们被打包到一个chunk中
import { bitcoin } from '../data/methods/bitcoin';
import { ethereum } from '../data/methods/ethereum';
import { solana } from '../data/methods/solana';
import { cardano } from '../data/methods/cardano';
import { polkadot } from '../data/methods/polkadot';
import { sui } from '../data/methods/sui';
import { aptos } from '../data/methods/aptos';
import { near } from '../data/methods/near';
import { ton } from '../data/methods/ton';
import { cosmos } from '../data/methods/cosmos';
import { tron } from '../data/methods/tron';
import { ripple } from '../data/methods/ripple';
import { stellar } from '../data/methods/stellar';
import { neo } from '../data/methods/neo';
import { nem } from '../data/methods/nem';
import { kaspa } from '../data/methods/kaspa';
import { algo } from '../data/methods/algo';
import { filecoin } from '../data/methods/filecoin';
import { nervos } from '../data/methods/nervos';
import { starcoin } from '../data/methods/starcoin';
import { scdo } from '../data/methods/scdo';
import { dynex } from '../data/methods/dynex';
import { nexa } from '../data/methods/nexa';
import { alephium } from '../data/methods/alephium';
import { conflux } from '../data/methods/conflux';
import { nostr } from '../data/methods/nostr';
import { lightning } from '../data/methods/lightning';
import { allnetwork } from '../data/methods/allnetwork';
import { benfen } from '../data/methods/benfen';
import { device } from '../data/methods/device';
import { firmware } from '../data/methods/firmware';

// 设备模块配置
const deviceModules: ModuleConfig[] = [
  { id: 'device', module: device },
  { id: 'firmware', module: firmware },
];

// 链模块配置
const chainModules: ModuleConfig[] = [
  // 主要区块链
  { id: 'bitcoin', module: bitcoin },
  { id: 'ethereum', module: ethereum },
  { id: 'solana', module: solana },
  { id: 'cardano', module: cardano },
  { id: 'polkadot', module: polkadot },
  { id: 'sui', module: sui },
  { id: 'aptos', module: aptos },
  { id: 'near', module: near },
  { id: 'ton', module: ton },
  { id: 'cosmos', module: cosmos },
  { id: 'tron', module: tron },
  { id: 'ripple', module: ripple },
  { id: 'stellar', module: stellar },
  { id: 'neo', module: neo },
  { id: 'nem', module: nem },
  { id: 'kaspa', module: kaspa },
  { id: 'benfen', module: benfen },
  { id: 'algo', module: algo },
  { id: 'filecoin', module: filecoin },
  { id: 'nervos', module: nervos },
  { id: 'starcoin', module: starcoin },
  { id: 'scdo', module: scdo },
  { id: 'dynex', module: dynex },
  { id: 'nexa', module: nexa },
  { id: 'alephium', module: alephium },
  { id: 'conflux', module: conflux },
  { id: 'nostr', module: nostr },

  // 特殊功能
  { id: 'lightning', module: lightning },
  { id: 'allnetwork', module: allnetwork },
];

// 构建注册表的通用函数
function buildRegistry(modules: ModuleConfig[]): MethodsRegistry {
  const chains: ChainConfig[] = [];
  const methodsByChain: Record<string, UnifiedMethodConfig[]> = {};
  const allMethodsList: UnifiedMethodConfig[] = [];

  modules.forEach(({ id, module }) => {
    try {
      // 获取方法数组和链元数据
      const methods = module.api;
      const chainMetaId = module.id;

      if (Array.isArray(methods) && methods.length > 0 && chainMetaId) {
        // 创建链配置
        const chainConfig: ChainConfig = {
          id: chainMetaId,
          methods: methods,
        };

        chains.push(chainConfig);
        methodsByChain[id] = methods;
        allMethodsList.push(...methods);
      } else {
        console.warn(`Invalid data for module ${id}:`, { methods, chainMetaId });
      }
    } catch (error) {
      console.warn(`Failed to process module ${id}:`, error);
    }
  });

  return {
    chains,
    methodsByChain,
    allMethods: allMethodsList,
    getChainMethods: (chainId: string) => methodsByChain[chainId] || [],
    searchMethods: (query: string) => {
      const lowerQuery = query.toLowerCase();
      return allMethodsList.filter(
        method =>
          method.method.toString().toLowerCase().includes(lowerQuery) ||
          method.description.toLowerCase().includes(lowerQuery)
      );
    },
    getChain: (chainId: string) => chains.find(chain => chain.id === chainId),
    isReady: () => true,
  };
}

// 创建并导出注册表实例
export const signerMethodsRegistry = buildRegistry(chainModules);
export const deviceMethodsRegistry = buildRegistry(deviceModules);

// 导出便捷函数
export const getChainMethods = (chainId: string) => signerMethodsRegistry.getChainMethods(chainId);
export const searchMethods = (query: string) => signerMethodsRegistry.searchMethods(query);
export const getAllChains = () => signerMethodsRegistry.chains;
export const getAllMethods = () => signerMethodsRegistry.allMethods;
export const getChain = (chainId: string) => signerMethodsRegistry.getChain(chainId);

// 按类别分组的方法
export const getMethodsByCategory = () => {
  const categories: Record<string, ChainConfig[]> = {};

  signerMethodsRegistry.chains.forEach(chain => {
    const category = chain.id;
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(chain);
  });

  return categories;
};

// 获取统计信息
export const getRegistryStats = (): RegistryStats => {
  const totalChains = signerMethodsRegistry.chains.length;
  const totalMethods = signerMethodsRegistry.allMethods.length;
  const chainsByCategory: Partial<Record<AllMethodCategory, number>> = {};

  signerMethodsRegistry.chains.forEach(chain => {
    const category = chain.id;
    chainsByCategory[category] = (chainsByCategory[category] || 0) + 1;
  });

  return {
    totalChains,
    totalMethods,
    chainsByCategory,
  };
};
