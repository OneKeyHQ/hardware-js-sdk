import { useState, useEffect, useCallback } from 'react';
import type { ChainConfig, UnifiedMethodConfig, ChainCategory } from '~/data/types';
import { signerMethodsRegistry } from '../data/methodsRegistry';

// 统计信息类型
interface RegistryStats {
  totalChains: number;
  totalMethods: number;
  chainsByCategory: Record<ChainCategory, number>;
}

// 模板注册表类 - 简化版，使用 signerMethodsRegistry
class TemplateRegistry {
  private chains: ChainConfig[] = [];
  private ready = false;

  async initialize(): Promise<void> {
    try {
      // 直接使用 signerMethodsRegistry 的数据，无需转换
      this.chains = signerMethodsRegistry.chains;
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize template registry:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getAllChains(): ChainConfig[] {
    return [...this.chains];
  }

  getAllMethods(): UnifiedMethodConfig[] {
    return this.chains.flatMap(chain => chain.methods);
  }

  getChain(chainId: string): ChainConfig | undefined {
    return this.chains.find(chain => chain.id === chainId);
  }

  getChainMethods(chainId: string): UnifiedMethodConfig[] {
    const chain = this.getChain(chainId);
    return chain ? chain.methods : [];
  }

  searchMethods(query: string): UnifiedMethodConfig[] {
    const searchTerm = query.toLowerCase();
    return this.getAllMethods().filter(
      method =>
        method.method.toLowerCase().includes(searchTerm) ||
        method.description.toLowerCase().includes(searchTerm)
    );
  }

  getStats(): RegistryStats {
    const chainsByCategory = {} as Record<ChainCategory, number>;

    // 统计所有链的分类
    this.chains.forEach(chain => {
      chainsByCategory[chain.id] = (chainsByCategory[chain.id] || 0) + 1;
    });

    return {
      totalChains: this.chains.length,
      totalMethods: this.getAllMethods().length,
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
      console.error('Failed to initialize template registry:', err);
      setError(err instanceof Error ? err.message : '初始化失败');
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
    getChain: useCallback((chainId: string) => templateRegistry.getChain(chainId), []),
    getChainMethods: useCallback(
      (chainId: string) => templateRegistry.getChainMethods(chainId),
      []
    ),
    searchMethods: useCallback((query: string) => templateRegistry.searchMethods(query), []),
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
