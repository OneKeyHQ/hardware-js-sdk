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
