import { useState, useEffect } from 'react';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  KBarResults,
  useKBar,
  type ActionImpl,
} from 'kbar';
import { useTranslation } from 'react-i18next';
import { getSearchActions } from '../../data/searchActions';

// 平台检测工具
const getPlatformInfo = () => {
  if (typeof window === 'undefined') return { isMac: false, isWindows: false };

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';

  const isMac =
    platform.includes('mac') || platform.includes('darwin') || userAgent.includes('macintosh');

  const isWindows = platform.includes('win') || userAgent.includes('windows');

  return { isMac, isWindows };
};

// 跨平台快捷键映射
const getShortcutKeys = () => {
  const { isMac } = getPlatformInfo();

  return {
    CmdOrCtrl: isMac ? '⌘' : 'Ctrl+',
    Alt: isMac ? '⌥' : 'Alt',
    Shift: 'Shift',
    Meta: isMac ? '⌘' : 'Win',
  };
};

// 结果渲染组件
function RenderResults() {
  const { results } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => {
        // 处理分组标题
        if (typeof item === 'string') {
          return (
            <div className="px-4 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              {item}
            </div>
          );
        }

        // 处理搜索结果项
        const action = item as ActionImpl;

        // 格式化快捷键显示
        const formatShortcut = (shortcut: string[]) => {
          if (!shortcut || shortcut.length === 0) return null;

          const shortcutKeys = getShortcutKeys();

          return shortcut
            .map(key => {
              const lowerKey = key.toLowerCase();

              // 处理特殊键名 - 使用跨平台映射
              const keyMap: Record<string, string> = {
                shift: shortcutKeys.Shift,
                cmd: shortcutKeys.CmdOrCtrl,
                ctrl: shortcutKeys.CmdOrCtrl,
                alt: shortcutKeys.Alt,
                meta: shortcutKeys.Meta,
                // 其他常用键
                enter: '↵',
                return: '↵',
                escape: 'Esc',
                esc: 'Esc',
                space: 'Space',
                tab: 'Tab',
                backspace: '⌫',
                delete: 'Del',
                up: '↑',
                down: '↓',
                left: '←',
                right: '→',
              };

              return keyMap[lowerKey] || key.toUpperCase();
            })
            .join(' + ');
        };

        const shortcutDisplay = action.shortcut ? formatShortcut(action.shortcut) : null;

        return (
          <div
            className={`px-4 py-2 cursor-pointer transition-colors border-l-2 ${
              active
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500 text-blue-900 dark:text-blue-100'
                : 'border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{action.name}</div>
                {action.subtitle && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {action.subtitle}
                  </div>
                )}
              </div>
              {shortcutDisplay && (
                <div className="flex-shrink-0 ml-2">
                  <kbd className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">
                    {shortcutDisplay}
                  </kbd>
                </div>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}

// 搜索触发按钮组件
export function SearchTrigger() {
  const { query } = useKBar();
  const { t } = useTranslation();
  const shortcutKeys = getShortcutKeys();

  const handleClick = () => {
    query.toggle();
  };

  return (
    <button
      onClick={handleClick}
      className="group flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary/50 dark:hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 active:bg-gray-100 dark:active:bg-gray-600"
    >
      <svg
        className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-primary transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
        {t('search.placeholder')}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <kbd className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 transition-colors">
          {shortcutKeys.CmdOrCtrl.replace('+', '')}
        </kbd>
        <kbd className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 transition-colors">
          K
        </kbd>
      </div>
    </button>
  );
}

// 主要的命令面板提供者组件
export function CommandPalette({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [actions, setActions] = useState(() => getSearchActions(t));
  const [key, setKey] = useState(0); // 用于强制重新挂载 KBarProvider

  // 监听语言变化，重新获取搜索动作并强制重新挂载
  useEffect(() => {
    const newActions = getSearchActions(t);
    setActions(newActions);
    setKey(prev => prev + 1); // 强制重新挂载 KBarProvider
  }, [t]);

  return (
    <KBarProvider
      key={key} // 强制重新挂载以支持动态更新
      actions={actions}
      options={{
        // 启用 kbar 内置的历史记录功能
        enableHistory: true,
      }}
    >
      <KBarPortal>
        <KBarPositioner className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm p-4">
          <KBarAnimator className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-2xl mx-auto mt-12 overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* 搜索输入框 */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <KBarSearch
                className="w-full px-4 py-3 text-base border-0 outline-0 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
                placeholder={t('search.inputPlaceholder')}
              />
            </div>

            {/* 结果列表 */}
            <div className="max-h-96 overflow-y-auto">
              <RenderResults />
            </div>

            {/* 底部提示 */}
            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="bg-white dark:bg-gray-700 px-1 py-0.5 rounded text-xs border border-gray-200 dark:border-gray-600">
                    ↑↓
                  </kbd>
                  <span>{t('search.navigate')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-white dark:bg-gray-700 px-1 py-0.5 rounded text-xs border border-gray-200 dark:border-gray-600">
                    ↵
                  </kbd>
                  <span>{t('search.select')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-white dark:bg-gray-700 px-1 py-0.5 rounded text-xs border border-gray-200 dark:border-gray-600">
                    esc
                  </kbd>
                  <span>{t('search.close')}</span>
                </span>
              </div>
            </div>
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
}
