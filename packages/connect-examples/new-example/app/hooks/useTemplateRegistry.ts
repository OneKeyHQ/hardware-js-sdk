import { useState, useEffect, useCallback } from "react";
import type {
  ChainConfig,
  MethodConfig,
  ChainCategory,
  FunctionalCategory,
  Category,
  RegistryStats,
  ChainMeta,
} from "~/data/types";
import type { HardwareApiMethod } from "~/services/hardwareService";
import type { PlaygroundProps } from "~/data/components/Playground";

// 映射字段
function convertToMethodConfig(props: PlaygroundProps): MethodConfig {
  return {
    method: props.method as HardwareApiMethod,
    description: props.description,
    presets: props.presupposes?.map((preset) => ({
      title: preset.title,
      value: preset.value,
    })),
    deprecated: props.deprecated,
    noConnIdReq: props.noConnIdReq,
    noDeviceIdReq: props.noDeviceIdReq,
  };
}

// 模板注册表类 - 简化
class TemplateRegistry {
  private chains: ChainConfig[] = [];
  private ready = false;

  async initialize(): Promise<void> {
    try {
      // 动态导入所有链配置
      const chainImports = [
        // 基础功能
        { module: import("~/data/methods/basic"), id: "basic" },
        { module: import("~/data/methods/device"), id: "device" },

        // 主要区块链
        { module: import("~/data/methods/bitcoin"), id: "bitcoin" },
        { module: import("~/data/methods/ethereum"), id: "ethereum" },
        { module: import("~/data/methods/solana"), id: "solana" },
        { module: import("~/data/methods/cardano"), id: "cardano" },
        { module: import("~/data/methods/polkadot"), id: "polkadot" },

        { module: import("~/data/methods/sui"), id: "sui" },
        { module: import("~/data/methods/aptos"), id: "aptos" },
        { module: import("~/data/methods/near"), id: "near" },
        { module: import("~/data/methods/ton"), id: "ton" },
        { module: import("~/data/methods/cosmos"), id: "cosmos" },
        { module: import("~/data/methods/tron"), id: "tron" },
        { module: import("~/data/methods/xrp"), id: "ripple" },
        { module: import("~/data/methods/stellar"), id: "stellar" },
        { module: import("~/data/methods/neo"), id: "neo" },
        { module: import("~/data/methods/nem"), id: "nem" },
        { module: import("~/data/methods/kaspa"), id: "kaspa" },
        { module: import("~/data/methods/benfen"), id: "benfen" },
        { module: import("~/data/methods/algorand"), id: "algorand" },
        { module: import("~/data/methods/filecoin"), id: "filecoin" },
        { module: import("~/data/methods/nervos"), id: "nervos" },
        { module: import("~/data/methods/starcoin"), id: "starcoin" },
        { module: import("~/data/methods/scdo"), id: "scdo" },
        { module: import("~/data/methods/dynex"), id: "dynex" },
        { module: import("~/data/methods/nexa"), id: "nexa" },
        { module: import("~/data/methods/alephium"), id: "alephium" },
        { module: import("~/data/methods/conflux"), id: "conflux" },
        { module: import("~/data/methods/nostr"), id: "nostr" },

        // 特殊功能
        { module: import("~/data/methods/lightning"), id: "lightning" },
        { module: import("~/data/methods/allnetwork"), id: "allnetwork" },
      ];

      const chainModules = await Promise.all(
        chainImports.map(async ({ module, id }) => {
          try {
            const moduleData = await module;
            const api = moduleData.default as PlaygroundProps[];
            const chainMeta = moduleData.chainMeta as ChainMeta;

            if (!api || !chainMeta) {
              console.warn(`Missing data for chain ${id}`);
              return null;
            }

            // 直接转换方法配置
            const methods = api.map(convertToMethodConfig);

            return {
              ...chainMeta,
              methods,
            } as ChainConfig;
          } catch (error) {
            console.warn(`Failed to load chain ${id}:`, error);
            return null;
          }
        })
      );

      // 过滤掉加载失败的链
      this.chains = chainModules.filter(Boolean) as ChainConfig[];
      this.ready = true;
    } catch (error) {
      console.error("Failed to initialize template registry:", error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getAllChains(): ChainConfig[] {
    return [...this.chains];
  }

  getAllMethods(): MethodConfig[] {
    return this.chains.flatMap((chain) => chain.methods);
  }

  getChain(chainId: string): ChainConfig | undefined {
    return this.chains.find((chain) => chain.id === chainId);
  }

  getChainMethods(chainId: string): MethodConfig[] {
    const chain = this.getChain(chainId);
    return chain ? chain.methods : [];
  }

  getChainsByCategory(category: Category): ChainConfig[] {
    return this.chains.filter((chain) => chain.category === category);
  }

  getFunctionalChains(): ChainConfig[] {
    return this.chains.filter(
      (chain) => chain.category === "basic" || chain.category === "device"
    );
  }

  getBlockchainChains(): ChainConfig[] {
    return this.chains.filter(
      (chain) => chain.category !== "basic" && chain.category !== "device"
    );
  }

  searchMethods(query: string): MethodConfig[] {
    const searchTerm = query.toLowerCase();
    return this.getAllMethods().filter(
      (method) =>
        method.method.toLowerCase().includes(searchTerm) ||
        method.description.toLowerCase().includes(searchTerm)
    );
  }

  getStats(): RegistryStats {
    const functionalsByCategory = {} as Record<FunctionalCategory, number>;
    const chainsByCategory = {} as Record<ChainCategory, number>;

    // 分别统计功能模块和区块链分类
    this.chains.forEach((chain) => {
      if (chain.category === "basic" || chain.category === "device") {
        functionalsByCategory[chain.category as FunctionalCategory] =
          (functionalsByCategory[chain.category as FunctionalCategory] || 0) +
          1;
      } else {
        chainsByCategory[chain.category as ChainCategory] =
          (chainsByCategory[chain.category as ChainCategory] || 0) + 1;
      }
    });

    return {
      totalChains: this.chains.length,
      totalMethods: this.getAllMethods().length,
      functionalsByCategory,
      chainsByCategory,
    };
  }
}

// 全局注册表实例
const templateRegistry = new TemplateRegistry();

// Hook
export function useTemplateRegistry() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const initializeRegistry = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await templateRegistry.initialize();
      setIsReady(true);
      setIsInitialLoad(false);
    } catch (err) {
      console.error("Failed to initialize template registry:", err);
      setError(err instanceof Error ? err.message : "初始化失败");
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeRegistry();
  }, [initializeRegistry]);

  const refreshTemplates = useCallback(async () => {
    await initializeRegistry();
  }, [initializeRegistry]);

  return {
    // 数据
    chains: isReady ? templateRegistry.getAllChains() : [],
    allMethods: isReady ? templateRegistry.getAllMethods() : [],

    // 查询方法
    getChain: useCallback(
      (chainId: string) => templateRegistry.getChain(chainId),
      []
    ),
    getChainMethods: useCallback(
      (chainId: string) => templateRegistry.getChainMethods(chainId),
      []
    ),
    getChainsByCategory: useCallback(
      (category: Category) => templateRegistry.getChainsByCategory(category),
      []
    ),
    getFunctionalChains: useCallback(
      () => templateRegistry.getFunctionalChains(),
      []
    ),
    getBlockchainChains: useCallback(
      () => templateRegistry.getBlockchainChains(),
      []
    ),
    searchMethods: useCallback(
      (query: string) => templateRegistry.searchMethods(query),
      []
    ),
    getStats: useCallback(() => templateRegistry.getStats(), []),

    // 状态
    isLoading,
    error,
    isReady: isReady && templateRegistry.isReady(),

    // 新增：区分初始加载和后续操作
    isInitialLoading: isInitialLoad && (isLoading || !isReady),
    // 新增：是否完全就绪（数据已加载且注册表已初始化）
    isFullyReady: isReady && !isLoading && templateRegistry.isReady(),

    // 工具
    refreshTemplates,
  };
}
