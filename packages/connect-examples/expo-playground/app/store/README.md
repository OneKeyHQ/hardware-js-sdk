# 统一持久化存储系统

## 概述

项目已将所有 localStorage 持久化操作统一到 `persistenceStore.ts` 中，提供类型安全、结构化的数据持久化管理。

## 架构设计

### 存储分类

1. **传输设置** (`transport`)
   - 首选传输类型 (webusb/jsbridge/emulator)
   - 最后使用时间

2. **主题设置** (`theme`)
   - 主题偏好 (light/dark/system)
   - 最后切换时间

3. **用户界面偏好** (`ui`)
   - 侧边栏折叠状态
   - 高级选项显示
   - 紧凑模式
   - 语言设置

4. **开发者设置** (`developer`)
   - 调试模式
   - 日志级别
   - 内部日志显示

5. **用户偏好** (`preferences`)
   - 自动连接
   - 记住设备
   - 确认对话框

## 使用方法

### 基础使用

```typescript
import { 
  useTransportPersistence,
  useThemePersistence,
  useUIPersistence 
} from '../store/persistenceStore';

// 传输设置
const { preferredType, setTransportPreference } = useTransportPersistence();

// 主题设置
const { preference, setThemePreference } = useThemePersistence();

// UI 偏好
const { uiState, setUIPreference } = useUIPersistence();
```

### 便捷方法

```typescript
// 直接设置特定UI偏好
const { setSidebarCollapsed, setShowAdvancedOptions } = useUIPersistence();

// 开发者设置
const { setDebugMode, setLogLevel } = useDeveloperPersistence();

// 用户偏好
const { setAutoConnect, setRememberDevices } = useUserPreferences();
```

### 全局管理

```typescript
import { usePreferencesManager } from '../store/persistenceStore';

const { 
  resetAllPreferences, 
  exportPreferences, 
  importPreferences 
} = usePreferencesManager();

// 导出设置
const settingsJson = exportPreferences();

// 导入设置
const success = importPreferences(settingsJson);

// 重置所有设置
resetAllPreferences();
```

## 存储结构

```typescript
interface PersistenceState {
  transport: {
    preferredType: TransportType;
    lastUsed: string | null;
  };
  theme: {
    preference: 'light' | 'dark' | 'system';
    lastToggled: string | null;
  };
  ui: {
    sidebarCollapsed: boolean;
    showAdvancedOptions: boolean;
    compactMode: boolean;
    language: string;
  };
  developer: {
    debugMode: boolean;
    logLevel: string;
    showInternalLogs: boolean;
  };
  preferences: {
    autoConnect: boolean;
    rememberDevices: boolean;
    confirmations: boolean;
  };
}
```

## Store 重构说明

### deviceStore.ts
- 移除了 transport 持久化逻辑
- `transportType` 现在仅用于 UI 状态同步
- 实际持久化由 `persistenceStore` 处理

### uiStore.ts
- 重构为仅处理临时 UI 状态
- 持久化的 UI 偏好移至 `persistenceStore`
- 新增通知系统支持

### hardwareStore.ts
- 保持不变，专注于硬件参数管理

## 最佳实践

1. **使用类型安全的 hooks**
   ```typescript
   // ✅ 推荐
   const { preferredType } = useTransportPersistence();
   
   // ❌ 避免直接访问 localStorage
   const transport = localStorage.getItem('preferred-transport');
   ```

2. **批量设置偏好**
   ```typescript
   // ✅ 推荐 - 使用专门的 setter
   setUIPreference('sidebarCollapsed', true);
   setUIPreference('compactMode', false);
   
   // ❌ 避免直接修改 store
   usePersistenceStore.setState({...});
   ```

3. **导出/导入设置**
   ```typescript
   // 导出用户设置
   const settings = exportPreferences();
   
   // 导入设置
   if (importPreferences(settings)) {
     console.log('设置导入成功');
   }
   ```

## 技术特性

- **类型安全**: 完整的 TypeScript 类型支持
- **自动持久化**: 基于 Zustand persist 中间件
- **结构化存储**: 分类清晰的数据结构
- **版本管理**: 支持存储版本控制
- **导入导出**: 支持设置的备份和恢复
- **开发友好**: 丰富的开发者工具和日志

## 迁移指南

旧代码中的 localStorage 操作已经被替换：

```typescript
// 旧方式 ❌
localStorage.setItem('preferred-transport', 'webusb');
const transport = localStorage.getItem('preferred-transport');

// 新方式 ✅
const { setTransportPreference, preferredType } = useTransportPersistence();
setTransportPreference('webusb');
```

所有相关组件已经更新使用新的持久化系统。 