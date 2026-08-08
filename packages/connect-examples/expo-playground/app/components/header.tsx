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

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 max-w-full items-center justify-between gap-2 px-2 sm:h-16 sm:px-4 lg:px-6">
          {/* 左侧：侧边栏切换按钮 */}
          <div className="flex shrink-0 items-center">
            <SidebarTrigger className="h-11 w-11 sm:h-9 sm:w-9" />
          </div>

          {/* 右侧：工具栏 */}
          <div className="flex min-w-0 items-center gap-0.5 sm:gap-1 lg:gap-2">
            {/* 搜索功能 */}
            <SearchTrigger />

            {/* 分隔线 */}
            <div className="mx-1 hidden h-4 w-px bg-border sm:block" />

            {/* 外部链接 */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-11 w-11 px-0 sm:h-9 sm:w-auto sm:px-3"
            >
              <a
                href="https://developer.onekey.so/"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <span className="sr-only lg:not-sr-only lg:text-sm">{t('common.docs')}</span>
                <ExternalLink className="h-4 w-4 sm:h-3 sm:w-3" />
              </a>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden h-11 w-11 px-0 sm:h-9 sm:w-auto sm:px-3 lg:inline-flex"
            >
              <a
                href="https://github.com/OneKeyHQ/hardware-js-sdk/tree/onekey"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <span className="sr-only lg:not-sr-only lg:text-sm">GitHub</span>
                <img src={githubIcon} alt="GitHub" className="h-5 w-5" />
              </a>
            </Button>

            {/* 分隔线 */}
            <div className="mx-1 hidden h-4 w-px bg-border sm:block" />

            {/* 主题切换 - 常用功能 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="relative h-11 w-11 px-0 sm:h-9 sm:w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">{t('common.toggleTheme')}</span>
            </Button>

            {/* 语言切换 - 最右侧 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={currentLanguage.name}
                  className="h-11 w-11 gap-2 px-0 sm:h-9 sm:w-auto sm:px-3"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden lg:inline">{currentLanguage.name}</span>
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
