// ============================================
// 统一方法注册表
// 将所有方法数据合并到一个文件中以优化打包
// ============================================

import type { PlaygroundProps } from './components/Playground';
import type { ChainConfig, ChainMeta } from './types';

// 静态导入所有方法，确保它们被打包到一个chunk中
import * as bitcoin from './methods/bitcoin';
import * as ethereum from './methods/ethereum';
import * as solana from './methods/solana';
import * as cardano from './methods/cardano';
import * as polkadot from './methods/polkadot';
import * as sui from './methods/sui';
import * as aptos from './methods/aptos';
import * as near from './methods/near';
import * as ton from './methods/ton';
import * as cosmos from './methods/cosmos';
import * as tron from './methods/tron';
import * as ripple from './methods/xrp';
import * as stellar from './methods/stellar';
import * as neo from './methods/neo';
import * as nem from './methods/nem';
import * as kaspa from './methods/kaspa';
import * as algorand from './methods/algorand';
import * as filecoin from './methods/filecoin';
import * as nervos from './methods/nervos';
import * as starcoin from './methods/starcoin';
import * as scdo from './methods/scdo';
import * as dynex from './methods/dynex';
import * as nexa from './methods/nexa';
import * as alephium from './methods/alephium';
import * as conflux from './methods/conflux';
import * as nostr from './methods/nostr';
import * as lightning from './methods/lightning';
import * as allnetwork from './methods/allnetwork';
import * as benfen from './methods/benfen';
import * as device from './methods/device';
import * as basic from './methods/basic';
import * as firmwareUpdate from './methods/firmwareUpdate';

// 创建统一的方法注册表接口
export interface MethodsRegistry {
  chains: ChainConfig[];
  methodsByChain: Record<string, PlaygroundProps[]>;
  allMethods: PlaygroundProps[];
  getChainMethods: (chainId: string) => PlaygroundProps[];
  searchMethods: (query: string) => PlaygroundProps[];
  getChain: (chainId: string) => ChainConfig | undefined;
  isReady: () => boolean;
}

// 链模块配置
const chainModules = [
  // 基础功能
  { id: 'basic', module: basic },
  { id: 'device', module: device },
  { id: 'firmwareUpdate', module: firmwareUpdate },

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
  const methodsByChain: Record<string, PlaygroundProps[]> = {};
  const allMethodsList: PlaygroundProps[] = [];

  chainModules.forEach(({ id, module }) => {
    try {
      // 获取方法数组和链元数据
      const methods = (module as Record<string, unknown>).default as PlaygroundProps[];
      const chainMeta = (module as Record<string, unknown>).chainMeta as ChainMeta;

      if (Array.isArray(methods) && methods.length > 0 && chainMeta) {
        // 创建链配置
        const chainConfig: ChainConfig = {
          ...chainMeta,
          methods: methods,
        };

        chains.push(chainConfig);
        methodsByChain[id] = methods;
        allMethodsList.push(...methods);
      } else {
        console.warn(`Invalid data for chain ${id}:`, { methods, chainMeta });
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
    const category = chain.category;
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
    const category = chain.category;
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
