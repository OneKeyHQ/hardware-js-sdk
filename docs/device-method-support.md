# OneKey 硬件设备方法支持列表

> 更新日期: 2026-02-06

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
| `aptosSignTransaction` | 19 | USB 传输错误，待固件调查 |
| `evmSignTransaction` | - | EIP-7702 (authorizationList) 不支持 |
| `solSignTransaction` | - | 正确 coin type 501 返回 Invalid params，待调查 |

## 与 Classic 1S 的行为差异

| 方法 | Classic | Classic 1S |
|-----|---------|-----------|
| `stellarSignTransaction` (错误 coin type) | 警告后可签名 | 直接拒绝 |
| `nemSignTransaction` (错误 coin type) | 警告后可签名 | 直接拒绝 |

---

# Classic 1S / Classic Pure

## 不支持的方法

| 方法 | 说明 |
|-----|------|
| `dnxGetAddress` | 性能限制 |

其他方法全部支持。

---

# Touch / Pro / Mini

全部方法支持，无已知限制。

---

# 错误码参考

| 错误码 | 含义 |
|-------|-----|
| 19 | 传输错误 |
| 415 | 设备不支持该方法 |
| 800 | 未知消息/固件不支持 |

---

# 配置文件位置

```
packages/connect-examples/expo-example/src/testTools/deviceCompatibility/plugins/
├── classic.ts
├── classic1s.ts
├── classicpure.ts
├── pro.ts
├── touch.ts
└── mini.ts
```
