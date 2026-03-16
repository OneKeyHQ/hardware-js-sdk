# OneKey 硬件设备方法支持列表

> 更新日期: 2026-03-16
> 说明：测试用例层面不再通过 skip 隐藏结果，统一按真实返回做 expected 覆盖。
> 说明：`expected = false` 的用例按“任意失败即通过”判定，同时在结果区展示设备实际错误信息。
> 当前作用范围：overrides 目前只被 `packages/connect-examples/expo-example/src/testTools/securityCheckTest/blindSignature/` 下的 blind-signature 测试读取；`chainMethodTest` 仍展示设备原始返回，不会按本表改写预期。

## 设备型号

| 设备 | 代号 | 说明 |
|-----|------|-----|
| OneKey Classic | `classic` | 第一代硬件钱包 |
| OneKey Classic 1S | `classic1s` | Classic 升级版 |
| OneKey Classic Pure | `classicPure` | 与 Classic 1S 同固件 |
| OneKey Touch | `touch` | 触屏版 |
| OneKey Pro | `pro` | 专业版 |
| OneKey Mini | `mini` | 迷你版 |

---

## overrides 规则如何生效

### 代码入口

- 管理器实现：`packages/connect-examples/expo-example/src/testTools/deviceCompatibility/DeviceCompatibility.ts`
- 插件注册：`packages/connect-examples/expo-example/src/testTools/deviceCompatibility/plugins/index.ts`
- 设备规则目录：`packages/connect-examples/expo-example/src/testTools/deviceCompatibility/plugins/`
- 当前消费方：
  - `packages/connect-examples/expo-example/src/testTools/securityCheckTest/blindSignature/utils.ts`
  - `packages/connect-examples/expo-example/src/testTools/securityCheckTest/blindSignature/index.tsx`

### 匹配流程

1. `compatibilityManager` 先通过 `getDeviceTypeFromSDK(features)` 识别当前设备型号。
2. 每个设备型号只读取自己对应的一个 plugin。
3. 在该 plugin 的 `overrides` 数组中按顺序查找，第一个命中的规则生效。
4. `checkMethod()` 只处理带 `skip` 的规则；`getExpectedOverride()` 只处理带 `expected` 的规则。
5. 当前仓库里的 plugin 规则全部是 `expected` 覆盖，暂时没有启用中的 `skip` 规则。

### 规则字段

| 字段 | 含义 |
|-----|------|
| `id` | 唯一规则 ID，便于定位和导出报告时排查 |
| `methods` | 单个方法名或方法名数组 |
| `when` | 可选条件函数，基于上下文进一步缩小命中范围 |
| `expected` | 覆盖默认预期，`true` 表示应成功，`false` 表示应失败 |
| `skip` | 可选跳过原因；管理器已支持，但当前 plugins 未使用 |

`when` 可读取的上下文字段来自 `DeviceCompatibilityRuleContext`：

- 必有：`method`、`features`、`deviceType`
- 按场景传入：`path`、`params`、`key`、`testContext`

### 当前源码里的典型例子

| 规则 ID | 文件 | 触发条件 | 结果 |
|-----|------|---------|------|
| `classic-eip7702` | `plugins/classic.ts` | `evmSignTransaction` 且 `params.transaction.authorizationList` 存在 | `expected = false` |
| `classic1s-stellar-coin60-with-safety-off` | `plugins/classic1s.ts` | `stellarSignTransaction` + `key === '60'` + `securityChecksDisabled === true` | `expected = true` |
| `mini-stellar-coin60-expected-success` | `plugins/mini.ts` | `stellarSignTransaction` + `key === '60'` | `expected = true` |

其中：

- blind-signature 测试会把 derivation path 里的 coin type 提取后作为 `key` 传入。
- 安全检查开关状态通过 `testContext.securityChecksDisabled` 传入，所以 Classic 1S / Classic Pure 的部分规则只在关闭安全检查时生效。

### 当前限制

- 这套规则不会自动影响所有测试页面；当前仅 blind-signature 测试读取 `expected` 覆盖。
- `useDeviceCompatibility()` 和 `useBatchDeviceCompatibility()` 已实现，但当前仓库内没有页面接入它们。
- 如果同一设备 plugin 内存在多个可能命中的规则，数组里更靠前的规则优先生效，因此新增规则时要注意顺序。

---

# Classic

## 不支持的方法

| 方法 | 错误码 | 错误信息 |
|-----|-------|---------|
| `alephiumGetAddress` | 800 | `Unknown message` |
| `alephiumSignTransaction` | 800 | `Unknown message` |
| `alephiumSignMessage` | 800 | `Unknown message` |
| `scdoGetAddress` | 800 | `Unknown message` |
| `scdoSignTransaction` | 800 | `Unknown message` |
| `scdoSignMessage` | 800 | `Unknown message` |
| `tonGetAddress` | 415 | `Device not support this method` |
| `tonSignMessage` | 415 | `Device not support this method` |
| `tonSignProof` | 415 | `Device not support this method` |
| `neoGetAddress` | 415 | `Device not support this method` |
| `neoSignTransaction` | 415 | `Device not support this method` |
| `benfenGetAddress` | 800 | `Unknown message` |
| `btcSignPsbt` | 800 | `Unknown message` |
| `aptosSignInMessage` | 800 | `Unknown message` |
| `tronSignMessage` | 415 | `Device not support this method` |
| `deviceRebootToBoardloader` | 800 | `Unknown message` |

## 已知问题

| 方法 | 错误码 | 说明 |
|-----|-------|------|
| `evmSignTransaction` | - | EIP-7702 (authorizationList) 不支持 |
| `solSignTransaction` | - | 正确 coin type 501 返回 Invalid params，待调查 |

## 与 Classic 1S 的行为差异

| 方法 | Classic | Classic 1S |
|-----|---------|-----------|
| `stellarSignTransaction` (错误 coin type) | 警告后可签名 | 关闭安全检查时可签名，严格模式拒绝 |
| `nemSignTransaction` (错误 coin type) | 警告后可签名 | 关闭安全检查时可签名，严格模式拒绝 |

---

# Classic 1S / Classic Pure

## 当前测试下失败预期的方法（expected=false）

| 方法 | 说明（实际错误文案可能随固件变化） |
|-----|-------------------------------|
| `dnxGetAddress` | 性能限制 |
| `dnxSignTransaction` | 固件当前返回失败（如 Unknown message） |

其他方法按默认预期执行。

---

# Pro

## 当前测试下失败预期的方法（expected=false）

| 方法 | 说明（实际错误文案可能随固件变化） |
|-----|-------------------------------|
| `dnxSignTransaction` | 固件当前返回失败（如 Unexpected message） |
| `solSignTransaction` (coin type 501) | 固件当前返回失败（如 Invalid signer used） |

其他方法按默认预期执行。

---

# Touch

## 当前测试下失败预期的方法（expected=false）

| 方法 | 说明（实际错误文案可能随固件变化） |
|-----|-------------------------------|
| `alephiumSignTransaction` | 固件当前返回失败（如 Unexpected message） |
| `alephiumSignMessage` | 固件当前返回失败（如 Unexpected message） |
| `dnxSignTransaction` | 固件当前返回失败（如 Unexpected message） |
| `neoSignTransaction` | 固件当前返回失败（如 Device not support this method） |
| `solSignTransaction` (coin type 501) | 固件当前返回失败（如 Invalid signer used） |
| `scdoSignTransaction` | 固件当前返回失败（如 Unexpected message） |
| `scdoSignMessage` | 固件当前返回失败（如 Unexpected message） |

其他方法按默认预期执行。

---

# Mini

## 当前测试下失败预期的方法（expected=false）

| 方法 | 说明（实际错误文案可能随固件变化） |
|-----|-------------------------------|
| `alephiumSignTransaction` | 固件当前返回失败（如 Unknown message） |
| `alephiumSignMessage` | 固件当前返回失败（如 Unknown message） |
| `dnxSignTransaction` | 固件当前返回失败（如 Unknown message） |
| `neoSignTransaction` | 固件当前返回失败（如 Device not support this method） |
| `solSignTransaction` (coin type 501) | 固件当前返回失败（如 Invalid params） |
| `scdoSignTransaction` | 固件当前返回失败（如 Unknown message） |
| `scdoSignMessage` | 固件当前返回失败（如 Unknown message） |
| `tonSignMessage` | 固件当前返回失败（如 Device not support this method） |
| `tonSignProof` | 固件当前返回失败（如 Device not support this method） |
| `tronSignMessage` | 固件当前返回失败（如 Device not support this method） |

## 当前测试下成功预期的特殊覆盖（expected=true）

| 方法 | 条件 | 说明 |
|-----|------|------|
| `nemSignTransaction` | coin type 60 | 当前设备实际可成功 |
| `stellarSignTransaction` | coin type 60 | 当前设备实际可成功 |

其他方法按默认预期执行。

---

# 错误码参考

| 错误码 | 含义 |
|-------|-----|
| 19 | 传输错误 |
| 415 | 设备不支持该方法 |
| 800 | 未知消息/固件不支持 |

---

# 配置文件位置（overrides 规则）

```
packages/connect-examples/expo-example/src/testTools/deviceCompatibility/plugins/
├── classic.ts
├── classic1s.ts
├── classicpure.ts
├── pro.ts
├── touch.ts
└── mini.ts
```

## 维护 runbook

1. 先在测试页或真机上复现行为差异，确认是设备/固件差异，而不是请求参数错误。
2. 按设备型号修改对应 plugin 文件；一条规则只描述一个稳定差异。
3. 只有在行为依赖特定条件时才加 `when`，例如：
   - coin type：使用 `key`
   - 安全检查开关：使用 `testContext.securityChecksDisabled`
   - 特定请求参数：使用 `params`
4. 修改后同步更新本页的设备矩阵和“典型例子”，避免代码和文档脱节。
5. 如果新增的是页面级跳过逻辑，除了写 `skip` 规则外，还要确认对应页面是否真的接入了 `checkMethod()`。
