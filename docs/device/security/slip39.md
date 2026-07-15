# OneKey SLIP39 技术详解

## 0. 核心概念说明

### 0.1 EMS vs Master Secret - 关键区别

**🔑 核心理解：**
```
设备初始化：熵源 → EMS (原始密钥材料，固定存储)
使用时计算：EMS + passphrase + 参数 → Master Secret (最终密钥)
```

| 概念 | EMS | Master Secret |
|------|-----|---------------|
| **本质** | 原始密钥材料 | 处理后的最终密钥 |
| **生成时机** | 设备初始化时 | 每次使用时动态计算 |
| **是否固定** | 固定不变 | 受参数影响而变化 |
| **passphrase影响** | 无影响 | 直接决定结果 |
| **存储位置** | 设备/分片中 | 临时计算，不存储 |
| **用途** | 中间存储 | BIP32密钥推导输入 |

**💡 形象比喻：**
```
EMS = 保险箱中的原始文档（固定）
Master Secret = 用不同密码解锁后看到的内容（可变）

相同保险箱 + 不同密码 = 不同内容
相同EMS + 不同passphrase = 不同Master Secret
```

## 1. SLIP39 核心原理

### 1.1 什么是 SLIP39

SLIP39 是基于 **Shamir 秘密分享算法** 的助记词标准，解决 BIP39 单点故障问题：

```
BIP39: 12/24个词 → 丢失 = 资产丢失
SLIP39: N个分片，任意M个 → 部分丢失仍可恢复
```

### 1.2 SLIP39 的两种类型

**SLIP39 Basic (单组模式):**
```
配置: 1个组，M-of-N分片
示例: 3-of-5 (5个分片，任意3个可恢复)
用途: 个人用户，简单易用
```

**SLIP39 Advanced (多组模式):**
```
配置: 多个组，每组有独立的M-of-N配置
示例: 2-of-3组，每组2-of-3分片
用途: 企业用户，复杂安全需求
```

### 1.3 OneKey/Trezor 的实现策略

| 功能 | OneKey | Trezor | 说明 |
|------|--------|--------|------|
| **生成 SLIP39 Basic** | ✅ | ✅ | 主要功能 |
| **生成 SLIP39 Advanced** | ❌ | ❌ | 用户体验复杂 |
| **恢复 SLIP39 Basic** | ✅ | ✅ | 完全支持 |
| **恢复 SLIP39 Advanced** | ✅ | ✅ | 兼容性支持 |

## 2. SLIP39 技术架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────┐
│           应用层：钱包 App                    │
├─────────────────────────────────────────────┤
│         业务层：交易、签名、地址生成           │
├─────────────────────────────────────────────┤
│      密钥推导层：BIP32 HD 钱包               │ ← 统一汇聚点
├─────────────────────────────────────────────┤
│    备份处理层：BIP39 单词 | SLIP39 分片      │ ← 差异化处理
├─────────────────────────────────────────────┤
│      硬件抽象层：OneKey/Trezor 兼容接口       │
├─────────────────────────────────────────────┤
│  密码学层：Shamir + Feistel + PBKDF2 + ECDSA │ ← 核心算法
└─────────────────────────────────────────────┘
```

### 2.2 核心技术栈

**标准 SLIP39 vs Trezor/OneKey 实现：**

| 组件 | 标准 SLIP39 | Trezor/OneKey | 差异说明 |
|------|------------|---------------|----------|
| **Shamir 分片** | ✅ | ✅ | 完全一致 |
| **Feistel 网络** | ❌ | ✅ 4轮 | **Trezor 独创增强** |
| **PBKDF2 迭代** | 2,500 | 5,000 | **更高安全性** |
| **Salt 生成** | 简单 | 复杂 | **关键差异点** |

### 2.3 Feistel 网络详解

**什么是 Feistel 网络？**

Feistel 网络是一种对称加密结构，Trezor 用它来增强 passphrase 的安全性：

```
🔐 Feistel 4轮加密过程

输入：主密钥分成左右两半 [L₀|R₀]
     ↓
第1轮：L₁ = R₀, R₁ = L₀ ⊕ F(R₀, passphrase, round=1)
     ↓
第2轮：L₂ = R₁, R₂ = L₁ ⊕ F(R₁, passphrase, round=2)
     ↓
第3轮：L₃ = R₂, R₃ = L₂ ⊕ F(R₂, passphrase, round=3)
     ↓
第4轮：L₄ = R₃, R₄ = L₃ ⊕ F(R₃, passphrase, round=4)
     ↓
输出：加密后的主密钥 [L₄|R₄]

其中 F() = PBKDF2-HMAC-SHA256(passphrase + round + salt + data)
```

**为什么使用 Feistel 网络？**
1. **安全增强**: 即使 passphrase 简单，也有额外保护
2. **对称设计**: 加密和解密使用相同算法
3. **硬件友好**: 实现简单，适合硬件钱包
4. **标准兼容**：SLIP39 标准没有规定 passphrase 如何处理

## 3. EMS vs Master Secret 概念详解

### 3.1 核心概念区分

**EMS (Encrypted Master Secret) - 原始密钥材料：**
```
设备初始化时生成：
熵源 → EMS (32字节原始数据)
特点：
- 从熵源直接生成，固定不变
- 通过SLIP39分片保护和恢复
- 与passphrase无关
- 所有同源分片恢复出相同的EMS
```

**Master Secret - 最终密钥：**
```
使用时动态计算：
EMS + passphrase + SLIP39参数 → Master Secret
特点：
- 从EMS动态派生
- 受passphrase和SLIP39参数影响
- 用于BIP32等密钥推导的输入
- 不同参数产生完全不同结果
```

### 3.2 标准 SLIP39 vs OneKey 流程对比

**标准参数配置：**
```typescript
const STANDARD_SLIP39 = {
  iterationExponent: 0,        // 2500 次 PBKDF2
  extendableBackupFlag: 0,     // 非扩展模式
  salt: "shamir" + identifier  // 固定 salt 前缀
};
```

**标准 SLIP39 实现：**
```
1. 设备初始化：熵源 → EMS (直接存储)
2. 分片恢复：SLIP39分片 → EMS
3. 密钥推导：EMS + 简单PBKDF2(passphrase, 2500次) → Master Secret
```

**OneKey/Trezor 增强实现：**
```
1. 设备初始化：熵源 → EMS (直接存储)
2. 分片恢复：SLIP39分片 → EMS  
3. 密钥推导：EMS + Feistel网络4轮(passphrase, 5000次) → Master Secret
```

**关键差异：都是先有EMS，后通过不同算法计算Master Secret**

**OneKey 增强配置：**
```typescript
const ONEKEY_ENHANCED = {
  iterationExponent: 1,        // 5000 次 PBKDF2
  extendableBackupFlag: 1,     // 可扩展模式
  salt: [],                    // 空 salt
  feistelRounds: 4            // 4轮 Feistel 加密
};
```

### 3.3 关键差异对比

| 差异点 | 标准 SLIP39 | OneKey/Trezor | 影响 |
|--------|------------|---------------|------|
| **Passphrase 处理** | 简单 PBKDF2 | Feistel 4轮加密 | 🔴 地址完全不同 |
| **PBKDF2 强度** | 2,500 次 | 5,000 次 | 🔴 地址完全不同 |
| **Salt 生成** | "shamir" + id | 空数组 | 🔴 地址完全不同 |
| **安全性** | 标准 | 增强 | ✅ OneKey 更安全 |

**为什么 OneKey 选择增强实现？**
1. **安全考虑**: Feistel 网络提供更强的 passphrase 保护
2. **硬件优化**: 对称设计更适合硬件实现
3. **生态统一**: 与 Trezor 保持完全一致

### 3.4 兼容性影响

```
场景分析：
标准工具生成 → OneKey 恢复 + passphrase
结果：地址不匹配（因为处理流程不同）

OneKey 生成 → 标准工具恢复 + passphrase
结果：地址不匹配（因为处理流程不同）

OneKey ↔ Trezor
结果：完全兼容（相同的增强流程）
```

## 4. SLIP39 核心参数详解

### 4.1 影响地址生成的关键参数

**🔐 全局参数（必须保持一致）：**

| 参数 | 英文名 | OneKey值 | 作用 | 影响范围 |
|------|--------|----------|------|----------|
| **迭代指数** | `iterationExponent` | 1 | PBKDF2 强度 | 🔴 影响所有地址 |
| **扩展标志** | `extendableBackupFlag` | 1 | 支持添加分片 | 🔴 影响所有地址 |
| **标识符** | `identifier` | 随机 | 分片组标识 | 🔴 影响所有地址 |

**📊 分组参数（仅影响恢复逻辑）：**

| 参数 | 英文名 | OneKey值 | 作用 | 影响范围 |
|------|--------|----------|------|----------|
| **组阈值** | `groupThreshold` | 1 | 需要几个组 | 🟡 仅恢复验证 |
| **组数量** | `groupCount` | 1 | 总组数 | 🟡 仅恢复验证 |
| **成员阈值** | `memberThreshold` | 用户配置 | 组内分片数 | 🟡 仅恢复验证 |

### 4.2 OneKey 默认配置

```typescript
const ONEKEY_SLIP39_CONFIG = {
  // 🔴 影响地址的全局参数
  iterationExponent: 1,        // PBKDF2 迭代 = 2^1 * 2500 = 5000次
  extendableBackupFlag: 1,     // 可扩展备份模式

  // 🟡 仅影响恢复的分组参数
  groupThreshold: 1,           // SLIP39 Basic: 只需1个组
  groupCount: 1,               // SLIP39 Basic: 只有1个组
  memberThreshold: 3,          // 用户可配置: 2-5
  memberCount: 4               // 用户可配置: 3-7
};
```

### 4.3 参数影响机制详解

**迭代指数的安全等级：**

| 迭代指数 | PBKDF2 轮数 | 破解难度 | 适用场景 |
|---------|------------|---------|----------|
| 0 | 2,500 | 较低 | 测试环境 |
| 1 | 5,000 | 标准 | OneKey/Trezor 默认 |
| 2 | 10,000 | 较高 | 企业用户 |
| 3 | 20,000 | 很高 | 超高安全需求 |

**扩展标志的影响：**

```typescript
// extendableBackupFlag = 1 (OneKey/Trezor 默认)
Salt = [] // 空数组

// extendableBackupFlag = 0 (第三方工具可能使用)
Salt = "shamir" + identifier // 非空数组

// 结果：不同的 Salt → 不同的 Master Secret → 不同的地址
```
## 5. Passphrase 处理机制详解

### 5.1 OneKey/Trezor 的 Passphrase 处理流程

**正确的流程理解：EMS → Master Secret**

```typescript
// 第一步：从 SLIP39 分片恢复 EMS
// 注意：这里恢复的是原始的EMS，不受passphrase影响
const ems = Slip39.recoverSecret(shares); // 恢复固定的EMS

// 第二步：使用 EMS + passphrase 计算最终 Master Secret
// 这是OneKey固件中slip39.decrypt()函数的实现
function calculateMasterSecret(ems: Buffer, passphrase: string): Buffer {
  const salt = getSalt(identifier, extendableBackupFlag);

  // Feistel 网络 4轮加密
  let left = ems.slice(0, 16);  // 前16字节
  let right = ems.slice(16);    // 后16字节

  for (let round = 1; round <= 4; round++) {
    const roundKey = pbkdf2(
      passphrase + round.toString(),
      salt.concat(right),
      2500 * Math.pow(2, iterationExponent)
    );

    const newLeft = right;
    const newRight = xor(left, roundKey.slice(0, 16));

    left = newLeft;
    right = newRight;
  }

  return Buffer.concat([left, right]);
}
```

### 5.2 关键技术细节

**Salt 生成机制（核心差异点）：**

```typescript
function getSalt(identifier: number[], extendableBackupFlag: number): number[] {
  if (extendableBackupFlag) {
    return []; // OneKey/Trezor: 空 salt
  }
  const salt = stringToBytes('shamir');
  return salt.concat(identifier); // 第三方工具: 'shamir' + identifier
}
```

**Master Secret 计算公式：**
```
Master Secret = Feistel4Rounds(EMS, passphrase, salt, iterations)

其中：
- EMS: 设备初始化时生成的原始密钥材料（固定不变）
- passphrase: 用户设置的密码短语（影响最终结果）
- salt: 基于 extendableBackupFlag 和 identifier 计算
- iterations: 2500 * 2^iterationExponent

关键理解：
✅ 相同EMS + 相同参数 = 相同Master Secret
✅ 相同EMS + 不同passphrase = 不同Master Secret  
✅ 相同EMS + 不同SLIP39参数 = 不同Master Secret
```

### 5.3 兼容性问题的根本原因

**相同 EMS，不同 Master Secret：**

```
测试案例：
OneKey 助记词: boring withdraw academic acid...
第三方助记词: reward husband acrobat easy...

结果分析：
✅ EMS 完全相同: 902226b2470fe02a36a0f1120eeecfee
✅ 无 passphrase 时，Master Secret 相同
❌ 有 passphrase 时，Master Secret 完全不同！

原因：
OneKey → extendableBackupFlag=1 → Salt=[] → Master Secret A
第三方 → extendableBackupFlag=0 → Salt="shamir"+id → Master Secret B
```

### 5.4 "Academic" 词的技术作用

**助记词编码结构：**

```
SLIP39 助记词结构：
[词1] [词2] [标识词] [配置词] [数据词...] [校验词...]
  ↓     ↓      ↓        ↓
identifier  "academic"  配置信息
(2词编码)   (标准标识)  (参数编码)
```

**不同实现的编码差异：**

| 助记词来源 | 第3位词汇 | extendableBackupFlag | Salt 生成 |
|-----------|----------|---------------------|-----------|
| OneKey/Trezor | "academic" | 1 | `[]` |
| 第三方工具 | 其他词汇 | 0 | `"shamir" + identifier` |

**为什么第3位词汇如此重要？**
- 编码了 SLIP39 的配置信息
- 影响 `extendableBackupFlag` 参数
- 直接决定 Salt 的计算方式
- 最终影响 Master Secret 和所有地址

## 6. 兼容性检测与风险防范

### 6.1 核心检测方法

**🎯 一行代码检测兼容性：**

```typescript
function isOneKeyCompatible(shares: string[]): boolean {
  return shares.every(share => share.split(' ')[2] === 'academic');
}
```
## 7. 开发者快速参考

### 7.1 核心 API 配置

**必须配置的参数：**
```typescript
const ONEKEY_SLIP39_CONFIG = {
  iterationExponent: 1,        // 与 OneKey 硬件一致
  extendableBackupFlag: 1,     // 与 OneKey 硬件一致
  groupThreshold: 1,           // SLIP39 Basic
  groupCount: 1               // SLIP39 Basic
};
```

### 7.2 常见问题 FAQ

**Q: 为什么相同的 SLIP39 助记词在不同平台生成不同地址？**
A: 参数配置不一致，确保 `iterationExponent=1` 和 `extendableBackupFlag=1`。

**Q: 如何判断助记词是否为 OneKey 标准？**
A: 检查第3个词是否为 "academic"。

**Q: 第三方工具生成的 SLIP39 能在 OneKey 使用吗？**
A: 可以恢复，但使用 passphrase 时可能地址不匹配。

### 7.3 最佳实践

**✅ 推荐：**
- 使用 OneKey 硬件生成 SLIP39 助记词
- 在 SDK 中集成兼容性检测
- 对第三方助记词给出明确警告

**❌ 避免：**
- 直接使用第三方助记词 + passphrase
- 忽略兼容性检查
- 使用错误的参数配置

## 8. 技术总结

### 8.1 核心技术洞察

**🎯 关键发现：**
1. **Salt 生成机制**: `Salt = extendableBackupFlag ? [] : "shamir" + identifier`
2. **"Academic" 标识符**: 第3位词汇标识 OneKey/Trezor 标准实现
3. **Feistel 网络**: 4轮加密增强 passphrase 安全性
4. **兼容性关键**: 相同的参数配置确保相同的 Salt 计算

### 8.2 兼容性矩阵

| 场景 | OneKey ↔ Trezor | OneKey ↔ 第三方 | 风险等级 |
|------|----------------|----------------|---------|
| 无 Passphrase | ✅ 完全兼容 | ✅ 可以恢复 | 🟢 低风险 |
| 有 Passphrase | ✅ 完全兼容 | ❌ 地址不匹配 | 🔴 高风险 |
---