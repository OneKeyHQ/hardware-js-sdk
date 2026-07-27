import { usePersistenceStore } from '../store/persistenceStore';
import type { TransportType } from './hardwareInstance';

// 旧版本 localStorage 键名
const LEGACY_KEYS = {
  TRANSPORT: 'preferred-transport',
  THEME: 'theme',
  UI_SETTINGS: 'onekey-ui-settings',
  DEVICE_STORE: 'onekey-device-store',
} as const;

// 迁移统计信息
export interface MigrationStats {
  totalItems: number;
  migratedItems: number;
  skippedItems: number;
  errors: string[];
}

// 检查是否需要迁移
export function checkMigrationNeeded(): boolean {
  const legacyKeys = Object.values(LEGACY_KEYS);
  return legacyKeys.some(key => localStorage.getItem(key) !== null);
}

// 获取所有遗留的 localStorage 数据
export function getLegacyData(): Record<string, unknown> {
  const legacyData: Record<string, unknown> = {};

  Object.entries(LEGACY_KEYS).forEach(([name, key]) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        // 尝试解析 JSON，如果失败则保持原始字符串
        legacyData[name] = JSON.parse(value);
      } catch {
        legacyData[name] = value;
      }
    }
  });

  return legacyData;
}

// 执行数据迁移
export function migrateLegacyData(): MigrationStats {
  const stats: MigrationStats = {
    totalItems: 0,
    migratedItems: 0,
    skippedItems: 0,
    errors: [],
  };

  const persistenceStore = usePersistenceStore.getState();

  try {
    // 1. 迁移 transport 设置
    const transportValue = localStorage.getItem(LEGACY_KEYS.TRANSPORT);
    if (transportValue) {
      stats.totalItems++;
      try {
        if (['webusb', 'jsbridge', 'emulator'].includes(transportValue)) {
          persistenceStore.setTransportPreference(transportValue as TransportType);
          localStorage.removeItem(LEGACY_KEYS.TRANSPORT);
          stats.migratedItems++;
          console.log(`✅ Migrated transport preference: ${transportValue}`);
        } else {
          stats.skippedItems++;
          stats.errors.push(`Invalid transport type: ${transportValue}`);
        }
      } catch (error) {
        stats.errors.push(`Transport migration error: ${error}`);
      }
    }

    // 2. 迁移 theme 设置
    const themeValue = localStorage.getItem(LEGACY_KEYS.THEME);
    if (themeValue) {
      stats.totalItems++;
      try {
        if (['light', 'dark', 'system'].includes(themeValue)) {
          persistenceStore.setThemePreference(themeValue as 'light' | 'dark' | 'system');
          localStorage.removeItem(LEGACY_KEYS.THEME);
          stats.migratedItems++;
          console.log(`✅ Migrated theme preference: ${themeValue}`);
        } else {
          stats.skippedItems++;
          stats.errors.push(`Invalid theme value: ${themeValue}`);
        }
      } catch (error) {
        stats.errors.push(`Theme migration error: ${error}`);
      }
    }

    // 3. 迁移旧的 UI 设置
    const uiSettingsValue = localStorage.getItem(LEGACY_KEYS.UI_SETTINGS);
    if (uiSettingsValue) {
      stats.totalItems++;
      try {
        const uiSettings = JSON.parse(uiSettingsValue);
        if (uiSettings?.state) {
          const { state } = uiSettings;

          // 迁移侧边栏状态
          if (typeof state.sidebarCollapsed === 'boolean') {
            persistenceStore.setUIPreference('sidebarCollapsed', state.sidebarCollapsed);
          }

          // 迁移高级选项
          if (typeof state.showAdvancedOptions === 'boolean') {
            persistenceStore.setUIPreference('showAdvancedOptions', state.showAdvancedOptions);
          }

          // 迁移紧凑模式
          if (typeof state.compactMode === 'boolean') {
            persistenceStore.setUIPreference('compactMode', state.compactMode);
          }

          localStorage.removeItem(LEGACY_KEYS.UI_SETTINGS);
          stats.migratedItems++;
          console.log(`✅ Migrated UI settings`);
        } else {
          stats.skippedItems++;
          stats.errors.push('Invalid UI settings format');
        }
      } catch (error) {
        stats.errors.push(`UI settings migration error: ${error}`);
      }
    }

    // 4. 清理其他可能的遗留数据
    const allKeys = Object.keys(localStorage);
    const onekeyKeys = allKeys.filter(
      key =>
        key.startsWith('onekey-') ||
        key.startsWith('ONEKEY_') ||
        key === 'preferred-transport' ||
        key === 'theme'
    );

    onekeyKeys.forEach(key => {
      if (!(Object.values(LEGACY_KEYS) as string[]).includes(key)) {
        console.log(`🧹 Found additional legacy key: ${key}`);
        // 不自动删除未知的 OneKey 相关键，只记录
      }
    });
  } catch (error) {
    stats.errors.push(`Migration process error: ${error}`);
  }

  return stats;
}

// 清理所有遗留数据（危险操作，需要用户确认）
export function cleanupLegacyData(): void {
  const legacyKeys = Object.values(LEGACY_KEYS);
  let cleanedCount = 0;

  legacyKeys.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      cleanedCount++;
    }
  });

  console.log(`🧹 Cleaned up ${cleanedCount} legacy localStorage items`);
}

// 导出当前持久化数据（用于备份）
export function exportCurrentData(): string {
  const persistenceStore = usePersistenceStore.getState();
  return persistenceStore.exportPreferences();
}

// 生成迁移报告
export function generateMigrationReport(): {
  needsMigration: boolean;
  legacyData: Record<string, unknown>;
  migrationStats?: MigrationStats;
} {
  const needsMigration = checkMigrationNeeded();
  const legacyData = getLegacyData();

  return {
    needsMigration,
    legacyData,
  };
}

// 自动迁移（在应用启动时调用）
export function autoMigrate(): void {
  if (checkMigrationNeeded()) {
    console.log('🔄 Detected legacy localStorage data, starting migration...');
    const stats = migrateLegacyData();

    console.log('📊 Migration completed:', {
      total: stats.totalItems,
      migrated: stats.migratedItems,
      skipped: stats.skippedItems,
      errors: stats.errors.length,
    });

    if (stats.errors.length > 0) {
      console.warn('⚠️ Migration errors:', stats.errors);
    }
  }
}
