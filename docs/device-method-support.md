# OneKey 硬件设备方法支持列表

> 更新日期: 2026-02-28
> 说明：测试用例层面不再通过 skip 隐藏结果，统一按真实返回做 expected 覆盖。
> 说明：`expected = false` 的用例按“任意失败即通过”判定，同时在结果区展示设备实际错误信息。

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

这些插件会在 `src/testTools/deviceCompatibility/plugins/index.ts` 中统一注册到 `compatibilityManager`。

---

# Overrides 规则模型

当前设备兼容层的核心结构如下：

```ts
interface DeviceCompatibilityOverride {
  id: string;
  methods: string | string[];
  when?: (context) => boolean;
  skip?: string;
  expected?: boolean;
}
```

## 字段含义

| 字段 | 说明 |
|------|------|
| `methods` | 规则命中的方法名，支持单个字符串或字符串数组 |
| `when` | 可选附加条件；上下文里可读取 `method / key / path / params / testContext / features / deviceType` |
| `expected` | 覆盖默认期望值；常见场景是将默认失败改成成功，或将默认成功改成失败 |
| `skip` | 标记为跳过并返回原因 |

## 匹配规则

- 设备类型通过 `getDeviceType(features)` 判断
- 每个设备插件内部按 `overrides.find(...)` 顺序匹配
- **第一个命中的 override 生效**

这意味着：更具体的规则应放在更靠前的位置，避免被更宽泛的规则提前吞掉。

---

# 当前代码路径如何消费这些规则

## 1. Automation Test

`packages/connect-examples/expo-example/src/testTools/automationTest/useAutomationTest.ts`

当前自动化测试会在这些 suites 中读取 `compatibilityManager.getExpectedOverride(...)`：

- `sdkAddressBatch`
- `sdkPubkeyBatch`
- `specialPassphrase`

这里的作用不是隐藏失败，而是把“某设备当前预期应该失败/成功”的行为显式体现在结果里。

## 2. Blind Signature / Security Check

`packages/connect-examples/expo-example/src/testTools/securityCheckTest/blindSignature/utils.ts`

这里通过 `getDeviceExpected(...)` 包装 `getExpectedOverride(...)`，把默认预期与设备差异合并成最终断言结果。

例如：

- Classic 对 `evmSignTransaction + authorizationList` 期望失败
- Classic 1S / Pure 在 `securityChecksDisabled === true` 时，部分 `coinType=60` 用例期望成功

## 3. Hook API（skip 场景）

`src/testTools/deviceCompatibility/DeviceCompatibility.ts` 还暴露了：

- `useDeviceCompatibility(method)`
- `useBatchDeviceCompatibility(methods, pathsByMethod)`
- `compatibilityManager.checkMethod(...)`

这些 API 仍支持方法级、路径级 skip 判断，适合需要在 UI 或批量测试入口提前过滤能力的场景。

---

# 维护流程

当设备行为发生变化时，建议按下面顺序更新：

1. 修改对应设备插件里的 override
2. 保持“更具体的规则在前，更宽泛的规则在后”
3. 更新本文档中的设备差异说明
4. 到 expo-example 的相关测试工具里复跑受影响路径，确认结果区展示的是**真实错误**而不是被静默跳过

## 何时改 `expected`

优先用于这两类情况：

- 固件当前稳定返回失败，但测试不应把它记为回归
- 某些设备在特定参数或 test context 下，实际能力与默认期望不同

## 何时改 `skip`

仅在“执行本身没有意义”时使用，例如：

- 某设备明确不存在该能力
- 某路径组合在当前设备上不应被调用

如果只是“会失败，但这个失败本身就是当前已知行为”，优先使用 `expected=false`，这样结果页仍会保留真实错误信息。
