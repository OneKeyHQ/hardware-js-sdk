import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Moon, Sun, Globe, ExternalLink } from 'lucide-react';
import { useTheme } from '../hooks/use-theme';
import { useTranslation } from 'react-i18next';
import { SearchTrigger } from './common/CommandPalette';
import { SidebarTrigger } from './ui/sidebar';

// 导入GitHub图标
import githubIcon from '../assets/gitHub.svg';

export function SiteHeader() {
  const { toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  // 获取版本信息
  const commitSha =
    (globalThis as typeof globalThis & { __COMMIT_SHA__?: string }).__COMMIT_SHA__ || 'dev';
  const isProduction = commitSha !== 'dev';

  // 调试信息 - 只在开发环境显示
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Debug - Environment info:', {
      commitSha,
      isProduction,
      globalCommitSha: (globalThis as typeof globalThis & { __COMMIT_SHA__?: string })
        .__COMMIT_SHA__,
      nodeEnv: process.env.NODE_ENV,
    });
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-6 max-w-[100%]">
          {/* 左侧：侧边栏切换按钮和版本信息 */}
          <div className="flex items-center gap-3">
            {/* 侧边栏切换按钮 */}
            <SidebarTrigger />

            {/* 版本信息 */}
            <div className="flex items-center gap-2">
              {isProduction && (
                <Badge variant="secondary" className="text-xs">
                  v{commitSha}
                </Badge>
              )}
              {!isProduction && (
                <Badge variant="outline" className="text-xs">
                  dev
                </Badge>
              )}
            </div>
          </div>

          {/* 右侧：工具栏 */}
          <div className="flex items-center gap-2">
            {/* 搜索功能 */}
            <SearchTrigger />

            {/* 分隔线 */}
            <div className="h-4 w-px bg-border mx-1" />

            {/* 外部链接 */}
            <Button variant="ghost" size="sm" asChild>
              <a
                href="https://developer.onekey.so/"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <span className="text-sm">{t('common.docs')}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <a
                href="https://github.com/OneKeyHQ/hardware-js-sdk/tree/onekey"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <span className="text-sm">GitHub</span>
                <img src={githubIcon} alt="GitHub" className="h-5 w-5" />
              </a>
            </Button>

            {/* 分隔线 */}
            <div className="h-4 w-px bg-border mx-1" />

            {/* 主题切换 - 常用功能 */}
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">{t('common.toggleTheme')}</span>
            </Button>

            {/* 语言切换 - 最右侧 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{currentLanguage.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map(lang => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className="gap-2"
                  >
                    <span>{lang.name}</span>
                    {i18n.language === lang.code && (
                      <Badge variant="secondary" className="ml-auto">
                        {t('common.current')}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}
