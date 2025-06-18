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
import { searchActions } from '../data/searchActions';

// 搜索历史管理
const SEARCH_HISTORY_KEY = 'kbar_search_history';
const MAX_HISTORY_ITEMS = 10;

function getSearchHistory(): string[] {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

function addToSearchHistory(query: string) {
  if (!query.trim()) return;

  const history = getSearchHistory();
  const newHistory = [query, ...history.filter(item => item !== query)].slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  } catch {
    // 忽略存储错误
  }
}

// 结果渲染组件
function RenderResults() {
  const { results } = useMatches();
  const { query } = useKBar();
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // 如果没有搜索查询，显示搜索历史或空状态
  if (!query) {
    if (searchHistory.length > 0) {
      return (
        <div className="py-2">
          <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
            最近搜索
          </div>
          {searchHistory.map((historyItem, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => {
                // 触发搜索并设置输入值
                const searchInput = document.querySelector(
                  '[data-kbar-search]'
                ) as HTMLInputElement;
                if (searchInput) {
                  searchInput.value = historyItem;
                  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  searchInput.focus();
                }
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {historyItem}
              </div>
            </button>
          ))}
        </div>
      );
    } else {
      return (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600"
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
          <div>开始输入以搜索...</div>
          <div className="text-xs mt-1 text-gray-400 dark:text-gray-500">搜索功能、页面或文档</div>
        </div>
      );
    }
  }

  // 显示搜索结果
  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => {
        // 处理分组标题
        if (typeof item === 'string') {
          return (
            <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              {item}
            </div>
          );
        }

        // 处理搜索结果项
        const action = item as ActionImpl;
        return (
          <div
            className={`px-4 py-3 cursor-pointer transition-colors border-l-2 ${
              active
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500 text-blue-900 dark:text-blue-100'
                : 'border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{action.name}</div>
                {action.subtitle && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                    {action.subtitle}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}

// 搜索触发按钮组件
export function SearchTrigger() {
  const handleClick = () => {
    // 检测操作系统并发送相应的键盘事件
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      metaKey: isMac, // Mac 使用 Cmd 键
      ctrlKey: !isMac, // Windows/Linux 使用 Ctrl 键
      bubbles: true,
    });

    document.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
    >
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="text-gray-500 dark:text-gray-400">搜索</span>
      <kbd className="ml-auto text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
        ⌘K
      </kbd>
    </button>
  );
}

// 主要的命令面板提供者组件
export function CommandPalette({ children }: { children: React.ReactNode }) {
  return (
    <KBarProvider
      actions={searchActions}
      options={{
        callbacks: {
          onSelectAction: action => {
            // 当用户选择一个动作时，将搜索查询添加到历史记录
            const searchInput = document.querySelector('[data-kbar-search]') as HTMLInputElement;
            if (searchInput && searchInput.value.trim()) {
              addToSearchHistory(searchInput.value.trim());
            }
            // 执行原始动作
            if (action.perform) {
              action.perform(action);
            }
          },
        },
      }}
    >
      <KBarPortal>
        <KBarPositioner className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm p-4">
          <KBarAnimator className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-2xl mx-auto mt-16 overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* 搜索输入框 */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <KBarSearch
                className="w-full px-4 py-4 text-base border-0 outline-0 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
                placeholder="搜索功能、页面或文档..."
                data-kbar-search
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
                  <span>导航</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-white dark:bg-gray-700 px-1 py-0.5 rounded text-xs border border-gray-200 dark:border-gray-600">
                    ↵
                  </kbd>
                  <span>选择</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-white dark:bg-gray-700 px-1 py-0.5 rounded text-xs border border-gray-200 dark:border-gray-600">
                    esc
                  </kbd>
                  <span>关闭</span>
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
