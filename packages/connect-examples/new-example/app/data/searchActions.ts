import { methodsRegistry } from './methodsRegistry';
import type { Action } from 'kbar';
// 构建搜索动作
export const buildSearchActions = (): Action[] => {
  // 1. 方法级别搜索
  const methodActions: Action[] = methodsRegistry.allMethods.map(method => ({
    id: `method-${method.method}`,
    name: method.method,
    subtitle: method.description,
    keywords: `${method.method} ${method.description}`,
    perform: () => {
      window.location.href = `/device-methods/${method.method}`;
    },
  }));

  // 2. 区块链级别搜索
  const chainActions: Action[] = methodsRegistry.chains.map(chain => ({
    id: `chain-${chain.id}`,
    name: chain.name,
    subtitle: chain.description,
    keywords: `${chain.name} ${chain.description} ${chain.id}`,
    section: '区块链',
    perform: () => {
      window.location.href = `/chains/${chain.id}`;
    },
  }));

  return [...methodActions, ...chainActions];
};

// 导出搜索动作
export const searchActions = buildSearchActions();

// 导出统计信息
export const getSearchStats = () => {
  const actions = searchActions;
  const sections = [...new Set(actions.map(action => action.section).filter(Boolean))] as string[];
  const sectionCounts = sections.reduce((acc, section) => {
    if (typeof section === 'string') {
      acc[section] = actions.filter(action => action.section === section).length;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    totalActions: actions.length,
    sections: sections,
    sectionCounts: sectionCounts,
  };
};
