import { useState, useEffect } from 'react';
import { useTemplateRegistry } from './useTemplateRegistry';
import deviceMethods from '../data/methods/device';
import firmwareUpdateMethods from '../data/methods/firmware';
import type { ChainConfig, UnifiedMethodConfig } from '~/data/types';

interface MethodResolverResult {
  selectedChain?: ChainConfig | null;
  selectedMethod: UnifiedMethodConfig | null;
  isChainNotFound: () => boolean;
  isMethodNotFound: () => boolean;
}

interface MethodResolverOptions {
  chainId?: string;
  methodName?: string;
}

export function useMethodResolver({
  chainId,
  methodName,
}: MethodResolverOptions): MethodResolverResult {
  const { getChain, getChainMethods, isFullyReady } = useTemplateRegistry();
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<UnifiedMethodConfig | null>(null);

  // 链查找逻辑（仅当提供了 chainId 时）
  useEffect(() => {
    if (!chainId) {
      setSelectedChain(null);
      return;
    }

    if (!isFullyReady) {
      setSelectedChain(null);
      return;
    }

    console.log('[MethodResolver] 查找链:', { chainId, isFullyReady });

    const chain = getChain(chainId);
    if (chain) {
      setSelectedChain(chain);
      console.log('[MethodResolver] 找到链:', chain.name);
    } else {
      console.warn('[MethodResolver] 未找到链:', chainId);
      setSelectedChain(null);
    }
  }, [chainId, getChain, isFullyReady]);

  // 方法查找逻辑
  useEffect(() => {
    if (!methodName) {
      setSelectedMethod(null);
      return;
    }

    console.log('[MethodResolver] 查找方法:', {
      chainId,
      methodName,
    });

    let methods: UnifiedMethodConfig[] = [];

    if (chainId) {
      // 链方法模式：查找特定链的方法
      if (isFullyReady) {
        const chainMethods = getChainMethods(chainId);
        methods = chainMethods; // 现在直接使用，无需转换
        console.log(
          '[MethodResolver] 链方法模式，可用方法:',
          methods.map(m => m.method)
        );
      }
    } else {
      // 设备方法模式：直接从设备和固件方法中查找
      methods = [...deviceMethods, ...firmwareUpdateMethods]; // 现在都是 UnifiedMethodConfig 格式
      console.log(
        '[MethodResolver] 设备方法模式，可用方法:',
        methods.map(m => m.method)
      );
    }

    const method = methods.find(m => m.method === methodName) || null;

    if (method) {
      setSelectedMethod(method);
      console.log('[MethodResolver] 找到方法:', method.method);
    } else {
      console.warn('[MethodResolver] 未找到方法:', methodName);
      setSelectedMethod(null);
    }
  }, [chainId, methodName, getChainMethods, isFullyReady]);

  return {
    // 仅在链模式下返回 selectedChain
    ...(chainId ? { selectedChain } : {}),
    selectedMethod,
    // 检查函数
    isChainNotFound: () => Boolean(chainId && isFullyReady && !selectedChain),
    isMethodNotFound: () => Boolean(isFullyReady && methodName && !selectedMethod),
  };
}
