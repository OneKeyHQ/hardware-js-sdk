import { methodsRegistry } from './methodsRegistry';
import type { Action } from 'kbar';

// 导航函数 - 使用 React Router 的编程式导航
const navigateTo = (path: string) => {
  // 使用 window.history.pushState 进行 SPA 导航
  window.history.pushState(null, '', path);
  // 触发 popstate 事件让 React Router 响应
  window.dispatchEvent(new PopStateEvent('popstate'));
};

// 主题切换函数
const setTheme = (theme: 'light' | 'dark') => {
  localStorage.setItem('theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

// 外部链接跳转函数
const openExternalLink = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

// 构建搜索动作
export const buildSearchActions = (): Action[] => {
  const actions: Action[] = [];

  // NAVIGATION 分类 - 页面导航
  actions.push(
    {
      id: 'home',
      name: 'Home',
      subtitle: 'SDK 使用示例和快速开始',
      section: 'Navigation',
      shortcut: ['h'],
      keywords: 'home index 首页 主页 开始 start',
      perform: () => navigateTo('/'),
    },
    {
      id: 'emulator',
      name: 'Hardware Emulator',
      subtitle: '使用 Docker 启动硬件模拟器',
      section: 'Navigation',
      shortcut: ['e'],
      keywords: 'emulator hardware 模拟器 硬件 docker',
      perform: () => navigateTo('/emulator'),
    },
    {
      id: 'logs',
      name: 'Logs',
      subtitle: '查看操作日志和调试信息',
      section: 'Navigation',
      shortcut: ['l'],
      keywords: 'logs debug 日志 调试',
      perform: () => navigateTo('/logs'),
    }
  );

  // DOCUMENTATION 分类 - 文档和方法
  actions.push(
    {
      id: 'device-methods',
      name: 'Device Methods',
      subtitle: '硬件设备相关的 API 方法',
      section: 'Documentation',
      shortcut: ['d'],
      keywords: 'device methods api 设备 方法',
      perform: () => navigateTo('/device-methods'),
    },
    {
      id: 'firmware-update',
      name: 'Firmware Update',
      subtitle: '固件更新相关的 API 方法',
      section: 'Documentation',
      shortcut: ['f'],
      keywords: 'firmware update 固件 更新',
      perform: () => navigateTo('/firmware-update'),
    },
    {
      id: 'chains',
      name: 'Blockchains',
      subtitle: '支持的区块链和相关方法',
      section: 'Documentation',
      shortcut: ['c'],
      keywords: 'chains blockchain 区块链 链',
      perform: () => navigateTo('/chains'),
    }
  );

  // SETTINGS 分类 - 设置和配置
  actions.push(
    {
      id: 'theme-light',
      name: 'Light Theme',
      subtitle: '切换到浅色主题',
      section: 'Settings',
      shortcut: ['l'],
      keywords: 'theme light 主题 浅色 白色',
      perform: () => setTheme('light'),
    },
    {
      id: 'theme-dark',
      name: 'Dark Theme',
      subtitle: '切换到深色主题',
      section: 'Settings',
      shortcut: ['d'],
      keywords: 'theme dark 主题 深色 黑色',
      perform: () => setTheme('dark'),
    }
  );

  // EXTERNAL 分类 - 外部链接和文档
  actions.push(
    {
      id: 'github-repo',
      name: 'GitHub Repository',
      subtitle: 'OneKey Hardware JS SDK 源代码仓库',
      section: 'External',
      keywords: 'github repository source code 源代码 仓库',
      perform: () => openExternalLink('https://github.com/OneKeyHQ/hardware-js-sdk'),
    },
    {
      id: 'github-issues',
      name: 'GitHub Issues',
      subtitle: '报告问题或查看已知问题',
      section: 'External',
      keywords: 'github issues bug report 问题 报告 反馈',
      perform: () => openExternalLink('https://github.com/OneKeyHQ/hardware-js-sdk/issues'),
    },
    {
      id: 'github-releases',
      name: 'GitHub Releases',
      subtitle: '查看版本发布历史和更新日志',
      section: 'External',
      keywords: 'github releases changelog version 版本 发布 更新',
      perform: () => openExternalLink('https://github.com/OneKeyHQ/hardware-js-sdk/releases'),
    },
    {
      id: 'onekey-docs',
      name: 'OneKey Documentation',
      subtitle: 'OneKey 官方开发文档',
      section: 'External',
      keywords: 'documentation docs onekey 文档 开发',
      perform: () => openExternalLink('https://developer.onekey.so/'),
    },
    {
      id: 'onekey-website',
      name: 'OneKey Website',
      subtitle: 'OneKey 官方网站',
      section: 'External',
      keywords: 'website onekey official 官网 网站',
      perform: () => openExternalLink('https://onekey.so/'),
    },
    {
      id: 'hardware-connect',
      name: 'Hardware Connect Guide',
      subtitle: '硬件设备连接指南',
      section: 'External',
      keywords: 'hardware connect guide tutorial 硬件 连接 指南 教程',
      perform: () => openExternalLink('https://developer.onekey.so/hardware/'),
    }
  );

  // 为每个链创建搜索动作，并处理方法
  methodsRegistry.chains.forEach(chain => {
    // 根据链的 ID 确定正确的路由前缀
    let routePrefix: string;
    const chainIdStr = String(chain.id);

    if (chainIdStr === 'device') {
      routePrefix = '/device-methods';
    } else if (chainIdStr === 'firmwareUpdate') {
      routePrefix = '/firmware-update';
    } else {
      routePrefix = `/chains/${chain.id}`;

      // 为区块链添加链级别的搜索项
      actions.push({
        id: `chain-${chain.id}`,
        name: chain.name,
        subtitle: chain.description,
        section: 'Blockchains',
        keywords: `${chain.name} ${chain.description} ${chain.id}`,
        perform: () => navigateTo(`/chains/${chain.id}`),
      });
    }

    // 为每个方法添加搜索项
    if (chain.methods && chain.methods.length > 0) {
      chain.methods.forEach(method => {
        let sectionName: string;
        let actionName: string;

        if (chainIdStr === 'device') {
          sectionName = 'Device Methods';
          actionName = method.method;
        } else if (chainIdStr === 'firmwareUpdate') {
          sectionName = 'Firmware Update';
          actionName = method.method;
        } else {
          sectionName = 'Chain Methods';
          actionName = `${chain.name} - ${method.method}`;
        }

        actions.push({
          id: `method-${chain.id}-${method.method}`,
          name: actionName,
          subtitle: method.description,
          section: sectionName,
          keywords: `${chain.name} ${method.method} ${method.description} ${chain.id}`,
          perform: () => navigateTo(`${routePrefix}/${method.method}`),
        });
      });
    }
  });

  return actions;
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
