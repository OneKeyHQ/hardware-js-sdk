# 方法文件转换脚本

## 概述

`convert-methods.js` 脚本用于将所有方法文件转换为 `bitcoin.ts` 的类型定义模式。

## 目标格式

转换后的文件将具有以下特征：

### 链模块（如 ethereum.ts, solana.ts 等）
```typescript
import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  // ... 方法定义
];

// 导出链配置对象
export const ethereum: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'ethereum',
  api,
};
```

### 设备模块（device.ts, firmware.ts）
```typescript
import type { UnifiedMethodConfig, DeviceMethodCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  // ... 方法定义
];

// 导出链配置对象
export const device: {
  api: UnifiedMethodConfig[];
  id: DeviceMethodCategory;
} = {
  id: 'device',
  api,
};
```

## 使用方法

### 方法 1：直接运行（推荐）

```bash
# 在项目根目录下运行
cd wabicai-js-sdk/packages/connect-examples/new-example
node scripts/convert-methods.js
```

### 方法 2：通过 npm script

在 `package.json` 中添加：
```json
{
  "scripts": {
    "convert-methods": "node scripts/convert-methods.js"
  }
}
```

然后运行：
```bash
npm run convert-methods
```

## 转换内容

脚本会对每个方法文件执行以下操作：

1. **更新导入语句**
   - 链模块：添加 `ChainCategory` 类型导入
   - 设备模块：添加 `DeviceMethodCategory` 类型导入

2. **移除旧的元数据定义**
   - 删除 `const chainMeta = {...}` 定义
   - 删除 `export const chainMeta = {...}` 定义

3. **更新导出语句**
   - 为导出对象添加明确的类型注解
   - 确保导出格式与 `bitcoin.ts` 一致

4. **代码清理**
   - 移除多余的空行
   - 确保文件以换行符结尾

## 支持的文件

脚本会转换以下文件：
- alephium.ts
- algorand.ts
- allnetwork.ts
- aptos.ts
- benfen.ts
- cardano.ts
- conflux.ts
- cosmos.ts
- device.ts (设备模块)
- dynex.ts
- ethereum.ts
- filecoin.ts
- firmware.ts (设备模块)
- kaspa.ts
- lightning.ts
- near.ts
- nem.ts
- neo.ts
- nervos.ts
- nexa.ts
- nostr.ts
- polkadot.ts
- scdo.ts
- solana.ts
- starcoin.ts
- stellar.ts
- sui.ts
- ton.ts
- tron.ts
- xrp.ts

## 注意事项

1. **备份重要文件**：运行脚本前建议备份重要文件
2. **检查结果**：转换完成后请检查类型错误
3. **已转换文件**：脚本会自动跳过已经转换过的文件
4. **错误处理**：如果某个文件转换失败，脚本会继续处理其他文件

## 故障排除

如果遇到问题：

1. 确保在正确的目录下运行脚本
2. 检查文件路径是否正确
3. 确保有文件写入权限
4. 查看控制台输出的错误信息

## 手动修复

如果脚本无法自动转换某些文件，可以手动参考 `bitcoin.ts` 的格式进行修改。 