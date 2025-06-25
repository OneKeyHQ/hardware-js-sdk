import { useState, useEffect } from 'react';
import { useThemePreference } from '../store/uiStore';

type Theme = 'dark' | 'light';

export function useTheme() {
  const { themePreference, setThemePreference } = useThemePreference();
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // 处理系统主题偏好
    const getSystemTheme = (): Theme => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // 根据偏好设置确定实际主题
    const actualTheme =
      themePreference === 'system' ? getSystemTheme() : (themePreference as Theme);

    setTheme(actualTheme);
    document.documentElement.classList.toggle('dark', actualTheme === 'dark');

    // 监听系统主题变化
    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [themePreference]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemePreference(newTheme);
    // localStorage 兼容性 - 为了兼容旧代码
    localStorage.setItem('theme', newTheme);
  };

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemePreference(mode);
    // localStorage 兼容性
    if (mode !== 'system') {
      localStorage.setItem('theme', mode);
    }
  };

  return {
    theme,
    themePreference,
    toggleTheme,
    setThemeMode,
    isDark: theme === 'dark',
  };
}
