// ============================================
// 统一方法注册表
// 将所有方法数据合并到一个文件中以优化打包
// ============================================

import type { UnifiedMethodConfig, ChainConfig, ChainCategory } from './types';

// 静态导入所有方法，确保它们被打包到一个chunk中
import { bitcoin } from './methods/bitcoin';
import { ethereum } from './methods/ethereum';
import { solana } from './methods/solana';
import { cardano } from './methods/cardano';
import { polkadot } from './methods/polkadot';
import { sui } from './methods/sui';
import { aptos } from './methods/aptos';
import { near } from './methods/near';
import { ton } from './methods/ton';
import { cosmos } from './methods/cosmos';
import { tron } from './methods/tron';
import { xrp } from './methods/xrp';
import { stellar } from './methods/stellar';
import { neo } from './methods/neo';
import { nem } from './methods/nem';
import { kaspa } from './methods/kaspa';
import { algorand } from './methods/algorand';
import { filecoin } from './methods/filecoin';
import { nervos } from './methods/nervos';
import { starcoin } from './methods/starcoin';
import { scdo } from './methods/scdo';
import { dynex } from './methods/dynex';
import { nexa } from './methods/nexa';
import { alephium } from './methods/alephium';
import { conflux } from './methods/conflux';
import { nostr } from './methods/nostr';
import { lightning } from './methods/lightning';
import { allnetwork } from './methods/allnetwork';
import { benfen } from './methods/benfen';

// 创建统一的方法注册表接口
export interface MethodsRegistry {
  chains: ChainConfig[];
  methodsByChain: Record<string, UnifiedMethodConfig[]>;
  allMethods: UnifiedMethodConfig[];
  getChainMethods: (chainId: string) => UnifiedMethodConfig[];
  searchMethods: (query: string) => UnifiedMethodConfig[];
  getChain: (chainId: string) => ChainConfig | undefined;
  isReady: () => boolean;
}

// 链模块配置
const chainModules = [
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
  { id: 'ripple', module: xrp },
  { id: 'stellar', module: stellar },
  { id: 'neo', module: neo },
  { id: 'nem', module: nem },
  { id: 'kaspa', module: kaspa },
  { id: 'benfen', module: benfen },
  { id: 'algorand', module: algorand },
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

// 构建注册表
function buildMethodsRegistry(): MethodsRegistry {
  const chains: ChainConfig[] = [];
  const methodsByChain: Record<string, UnifiedMethodConfig[]> = {};
  const allMethodsList: UnifiedMethodConfig[] = [];

  chainModules.forEach(({ id, module }) => {
    try {
      // 获取方法数组和链元数据
      const methods = module.api;
      const chainMetaId = module.id as ChainCategory;

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
        console.warn(`Invalid data for chain ${id}:`, { methods, chainMetaId });
      }
    } catch (error) {
      console.warn(`Failed to process chain ${id}:`, error);
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
          method.method.toLowerCase().includes(lowerQuery) ||
          method.description.toLowerCase().includes(lowerQuery)
      );
    },
    getChain: (chainId: string) => chains.find(chain => chain.id === chainId),
    isReady: () => true,
  };
}

// 创建并导出注册表实例
export const methodsRegistry = buildMethodsRegistry();

// 导出便捷函数
export const getChainMethods = (chainId: string) => methodsRegistry.getChainMethods(chainId);
export const searchMethods = (query: string) => methodsRegistry.searchMethods(query);
export const getAllChains = () => methodsRegistry.chains;
export const getAllMethods = () => methodsRegistry.allMethods;
export const getChain = (chainId: string) => methodsRegistry.getChain(chainId);

// 按类别分组的方法
export const getMethodsByCategory = () => {
  const categories: Record<string, ChainConfig[]> = {};

  methodsRegistry.chains.forEach(chain => {
    const category = chain.id;
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(chain);
  });

  return categories;
};

// 获取统计信息
export const getRegistryStats = () => {
  const totalChains = methodsRegistry.chains.length;
  const totalMethods = methodsRegistry.allMethods.length;
  const categoryCounts: Record<string, number> = {};

  methodsRegistry.chains.forEach(chain => {
    const category = chain.id;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return {
    totalChains,
    totalMethods,
    categoryCounts,
  };
};

// 默认导出
export default methodsRegistry;
