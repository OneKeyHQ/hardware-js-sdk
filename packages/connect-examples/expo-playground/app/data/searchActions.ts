import { deviceMethodsRegistry, signerMethodsRegistry } from '../hooks/useMethodsRegistry';
import { usePersistenceStore } from '../store/persistenceStore';
import type { Action } from 'kbar';

// 获取基础路径 - 与项目配置保持一致
const getBasename = () => {
  if (typeof window === 'undefined') return '';
  // 统一使用环境变量，与 entry.client.tsx 和 webpack.config.js 保持一致
  return process.env.NODE_ENV === 'production' ? '/expo-playground' : '';
};

// 导航函数 - 使用 React Router 的编程式导航
const navigateTo = (path: string) => {
  // 添加 basename 前缀
  const fullPath = getBasename() + path;
  // 使用 window.history.pushState 进行 SPA 导航
  window.history.pushState(null, '', fullPath);
  // 触发 popstate 事件让 React Router 响应
  window.dispatchEvent(new PopStateEvent('popstate'));
};

// 主题切换函数
const setTheme = (theme: 'light' | 'dark') => {
  // 使用持久化存储来设置主题偏好
  usePersistenceStore.getState().setThemePreference(theme);
};

// 侧边栏切换函数 - 使用键盘事件触发
const toggleSidebar = () => {
  // 触发键盘事件来切换侧边栏，这样可以利用现有的键盘监听器
  const event = new KeyboardEvent('keydown', {
    key: 'b',
    metaKey: navigator.platform.includes('Mac'),
    ctrlKey: !navigator.platform.includes('Mac'),
    bubbles: true,
  });
  window.dispatchEvent(event);
};

// 外部链接跳转函数
const openExternalLink = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

// 定义搜索动作的优先级和使用频率
const ACTION_PRIORITIES = {
  // 高优先级 - 最常用的功能
  home: 10,
  'device-methods': 9,
  chains: 8,
  'toggle-sidebar': 7,

  // 中优先级 - 常用功能
  emulator: 6,
  logs: 5,
  'theme-light': 4,
  'theme-dark': 4,

  // 低优先级 - 外部链接和其他
  'github-repo': 3,
  'onekey-docs': 3,
  'github-issues': 2,
  'github-releases': 2,
  'onekey-website': 1,
  'hardware-connect-docs': 1,
};

// 排序选项枚举
export enum SortMode {
  PRIORITY = 'priority', // 按优先级排序（默认）
  ALPHABETICAL = 'alphabetical', // 按字母顺序排序
  SECTION = 'section', // 按分组排序
}

// 构建搜索动作 - 接收翻译函数作为参数
export const buildSearchActions = (
  t: (key: string, options?: Record<string, unknown>) => string,
  sortMode: SortMode = SortMode.PRIORITY
): Action[] => {
  const actions: Action[] = [];

  // 界面控制
  actions.push(
    {
      id: 'toggle-sidebar',
      name: t('search.actions.toggleSidebar'),
      shortcut: [navigator.platform.includes('Mac') ? 'cmd' : 'ctrl', 'b'],
      keywords: t('search.keywords.sidebar'),
      section: t('search.sections.interface'),
      perform: toggleSidebar,
      icon: '📋',
      priority: ACTION_PRIORITIES['toggle-sidebar'] || 1,
    },
    {
      id: 'theme-light',
      name: t('search.actions.lightTheme'),
      keywords: t('search.keywords.theme'),
      section: t('search.sections.interface'),
      perform: () => setTheme('light'),
      icon: '☀️',
      priority: ACTION_PRIORITIES['theme-light'] || 1,
    },
    {
      id: 'theme-dark',
      name: t('search.actions.darkTheme'),
      keywords: t('search.keywords.theme'),
      section: t('search.sections.interface'),
      perform: () => setTheme('dark'),
      icon: '🌙',
      priority: ACTION_PRIORITIES['theme-dark'] || 1,
    }
  );

  // 导航
  actions.push(
    {
      id: 'home',
      name: t('search.actions.home'),
      shortcut: ['h'],
      keywords: t('search.keywords.home'),
      section: t('search.sections.navigation'),
      perform: () => navigateTo('/'),
      icon: '🏠',
      priority: ACTION_PRIORITIES.home || 1,
    },
    {
      id: 'emulator',
      name: t('search.actions.emulator'),
      subtitle: t('search.descriptions.emulator'),
      section: t('search.sections.navigation'),
      shortcut: ['e'],
      keywords: t('search.keywords.emulator'),
      perform: () => navigateTo('/emulator'),
      priority: ACTION_PRIORITIES.emulator || 1,
    },
    {
      id: 'logs',
      name: t('search.actions.logs'),
      subtitle: t('search.descriptions.logs'),
      section: t('search.sections.navigation'),
      shortcut: ['l'],
      keywords: t('search.keywords.logs'),
      perform: () => navigateTo('/logs'),
      priority: ACTION_PRIORITIES.logs || 1,
    }
  );

  // DOCUMENTATION 分类 - 文档和方法
  actions.push(
    {
      id: 'device-methods',
      name: t('search.actions.deviceMethods'),
      subtitle: t('search.descriptions.deviceMethods'),
      section: t('search.sections.documentation'),
      shortcut: ['d'],
      keywords: t('search.keywords.device'),
      perform: () => navigateTo('/device-methods'),
      priority: ACTION_PRIORITIES['device-methods'] || 1,
    },
    {
      id: 'chains',
      name: t('search.actions.chains'),
      subtitle: t('search.descriptions.chains'),
      section: t('search.sections.documentation'),
      shortcut: ['s'],
      keywords: t('search.keywords.chains'),
      perform: () => navigateTo('/chains'),
      priority: ACTION_PRIORITIES.chains || 1,
    }
  );

  // EXTERNAL 分类 - 外部链接和文档
  actions.push(
    {
      id: 'github-repo',
      name: t('search.actions.githubRepo'),
      subtitle: t('search.descriptions.githubRepo'),
      section: t('search.sections.external'),
      keywords: t('search.keywords.github'),
      perform: () => openExternalLink('https://github.com/OneKeyHQ/hardware-js-sdk'),
      priority: ACTION_PRIORITIES['github-repo'] || 1,
    },
    {
      id: 'onekey-website',
      name: t('search.actions.onekeyWebsite'),
      subtitle: t('search.descriptions.onekeyWebsite'),
      section: t('search.sections.external'),
      keywords: t('search.keywords.website'),
      perform: () => openExternalLink('https://onekey.so/'),
      priority: ACTION_PRIORITIES['onekey-website'] || 1,
    },
    {
      id: 'hardware-connect-docs',
      name: t('search.actions.hardwareConnect'),
      subtitle: t('search.descriptions.hardwareConnect'),
      section: t('search.sections.external'),
      keywords: t('search.keywords.connect'),
      perform: () => openExternalLink('https://developer.onekey.so/connect-to-hardware/page-1'),
      priority: ACTION_PRIORITIES['hardware-connect-docs'] || 1,
    }
  );

  deviceMethodsRegistry.chains.forEach(chain => {
    chain.methods.forEach(method => {
      actions.push({
        id: `method-${chain.id}-${method.method}`,
        name: method.method,
        section: t('search.sections.deviceMethods'),
        keywords: `${method.method}`,
        perform: () => navigateTo(`/device-methods/${method.method}`),
        priority: 2, // 较低优先级
      });
    });
  });

  // 为每个链创建搜索动作，并处理方法
  signerMethodsRegistry.chains.forEach(chain => {
    // 根据链的 ID 确定正确的路由前缀
    let routePrefix: string;
    const chainIdStr = String(chain.id);

    if (chainIdStr === 'device' || chainIdStr === 'firmware') {
      routePrefix = '/device-methods';
    } else {
      routePrefix = `/chains/${chain.id}`;
      // 为区块链添加链级别的搜索项
      actions.push({
        id: `chain-${chain.id}`,
        name: chain.id,
        section: t('search.sections.blockchains'),
        keywords: `${chain.id}`,
        perform: () => navigateTo(`/chains/${chain.id}`),
        priority: 3, // 中等优先级
      });
    }

    // 为每个方法添加搜索项
    if (chain.methods && chain.methods.length > 0) {
      chain.methods.forEach(method => {
        let sectionName: string;
        let actionName: string;

        if (chainIdStr === 'device' || chainIdStr === 'firmware') {
          sectionName = t('search.sections.deviceMethods');
          actionName = method.method;
        } else {
          sectionName = t('search.sections.chainMethods');
          actionName = `${chain.id} - ${method.method}`;
        }

        actions.push({
          id: `method-${chain.id}-${method.method}`,
          name: actionName,
          subtitle: method.description?.startsWith('methodDescriptions.')
            ? t(method.description)
            : method.description,
          section: sectionName,
          keywords: `${chain.id} ${method.method} ${method.description}`,
          perform: () => navigateTo(`${routePrefix}/${method.method}`),
          priority: 2, // 较低优先级
        });
      });
    }
  });

  // 根据排序模式排序动作
  return sortActions(actions, sortMode);
};

// 扩展 Action 类型以包含 priority 属性
type ActionWithPriority = Action & { priority?: number };

// 排序函数
const sortActions = (actions: Action[], sortMode: SortMode): Action[] => {
  switch (sortMode) {
    case SortMode.PRIORITY:
      return actions.sort((a, b) => {
        const priorityA = (a as ActionWithPriority).priority || 0;
        const priorityB = (b as ActionWithPriority).priority || 0;
        // 优先级高的在前，相同优先级按字母顺序
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        return a.name.localeCompare(b.name);
      });

    case SortMode.ALPHABETICAL:
      return actions.sort((a, b) => a.name.localeCompare(b.name));

    case SortMode.SECTION:
      return actions.sort((a, b) => {
        // 先按 section 排序，再在同一 section 内按字母顺序排序
        const sectionA = (a.section as string) || '';
        const sectionB = (b.section as string) || '';
        if (sectionA !== sectionB) {
          return sectionA.localeCompare(sectionB);
        }
        return a.name.localeCompare(b.name);
      });

    default:
      return actions;
  }
};

// 导出搜索动作（默认按优先级排序）
// 注意：这个需要传入翻译函数
export const getSearchActions = (
  t: (key: string, options?: Record<string, unknown>) => string,
  sortMode?: SortMode
) => {
  return buildSearchActions(t, sortMode || SortMode.PRIORITY);
};

// 导出统计信息
export const getSearchStats = (t: (key: string, options?: Record<string, unknown>) => string) => {
  const actions = getSearchActions(t);
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
    sortModes: Object.values(SortMode),
  };
};

// 搜索配置选项 - 动态获取翻译
export const getSearchConfig = (t: (key: string, options?: Record<string, unknown>) => string) => ({
  defaultSortMode: SortMode.PRIORITY,
  availableSortModes: [
    {
      value: SortMode.PRIORITY,
      label: t('search.sortModes.priority') || 'By Priority',
    },
    {
      value: SortMode.ALPHABETICAL,
      label: t('search.sortModes.alphabetical') || 'Alphabetical',
    },
    { value: SortMode.SECTION, label: t('search.sortModes.section') || 'By Section' },
  ],
});
