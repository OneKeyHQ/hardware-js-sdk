# OneKey 硬件设备能力矩阵

> - 文档状态：易变测试基线
> - 最后真机核验：2026-02-28
> - 适用范围：当日兼容性测试插件与对应设备固件
> - 事实来源：`packages/connect-examples/expo-example/src/testTools/deviceCompatibility/plugins/`
> - 维护要求：设备固件或 expected overrides 变化后同步更新；`expected = false` 表示当前测试接受设备返回失败。

## 设备型号

| 设备                | 代号          | 说明                 |
| ------------------- | ------------- | -------------------- |
| OneKey Classic      | `classic`     | 第一代硬件钱包       |
| OneKey Classic 1S   | `classic1s`   | Classic 升级版       |
| OneKey Classic Pure | `classicPure` | 与 Classic 1S 同固件 |
| OneKey Touch        | `touch`       | 触屏版               |
| OneKey Pro          | `pro`         | 专业版               |
| OneKey Pro 2        | `pro2`        | Protocol V2 专业版   |
| OneKey Neo          | `neo`         | Protocol V2 设备     |
| OneKey Mini         | `mini`        | 迷你版               |

---

## Classic

### 当前测试下失败预期的方法（expected=false）

| 方法                        | 说明                     |
| --------------------------- | ------------------------ |
| `alephiumGetAddress`        | 兼容性插件接受调用失败。 |
| `alephiumSignTransaction`   | 兼容性插件接受调用失败。 |
| `alephiumSignMessage`       | 兼容性插件接受调用失败。 |
| `scdoGetAddress`            | 兼容性插件接受调用失败。 |
| `scdoSignTransaction`       | 兼容性插件接受调用失败。 |
| `scdoSignMessage`           | 兼容性插件接受调用失败。 |
| `tonGetAddress`             | 兼容性插件接受调用失败。 |
| `tonSignMessage`            | 兼容性插件接受调用失败。 |
| `tonSignProof`              | 兼容性插件接受调用失败。 |
| `neoGetAddress`             | 兼容性插件接受调用失败。 |
| `neoSignTransaction`        | 兼容性插件接受调用失败。 |
| `benfenGetAddress`          | 兼容性插件接受调用失败。 |
| `btcSignPsbt`               | 兼容性插件接受调用失败。 |
| `aptosSignInMessage`        | 兼容性插件接受调用失败。 |
| `deviceRebootToBoardloader` | 兼容性插件接受调用失败。 |

### 已知问题

| 方法                 | 错误码 | 说明                                |
| -------------------- | ------ | ----------------------------------- |
| `evmSignTransaction` | -      | EIP-7702 (authorizationList) 不支持 |

### 与 Classic 1S 的行为差异

| 方法                                      | Classic      | Classic 1S                         |
| ----------------------------------------- | ------------ | ---------------------------------- |
| `stellarSignTransaction` (错误 coin type) | 警告后可签名 | 关闭安全检查时可签名，严格模式拒绝 |
| `nemSignTransaction` (错误 coin type)     | 警告后可签名 | 关闭安全检查时可签名，严格模式拒绝 |

---

## Classic 1S / Classic Pure

### 当前测试下失败预期的方法（expected=false）

| 方法                 | 说明（实际错误文案可能随固件变化）     |
| -------------------- | -------------------------------------- |
| `dnxGetAddress`      | 性能限制                               |
| `dnxSignTransaction` | 固件当前返回失败（如 Unknown message） |

其他方法按默认预期执行。

---

## Pro

### 当前测试下失败预期的方法（expected=false）

| 方法                 | 说明（实际错误文案可能随固件变化）        |
| -------------------- | ----------------------------------------- |
| `dnxGetAddress`      | 固件当前返回失败                          |
| `dnxSignTransaction` | 固件当前返回失败（如 Unexpected message） |

其他方法按默认预期执行。

---

## Touch

### 当前测试下失败预期的方法（expected=false）

| 方法                      | 说明（实际错误文案可能随固件变化）                    |
| ------------------------- | ----------------------------------------------------- |
| `alephiumSignTransaction` | 固件当前返回失败（如 Unexpected message）             |
| `alephiumSignMessage`     | 固件当前返回失败（如 Unexpected message）             |
| `dnxSignTransaction`      | 固件当前返回失败（如 Unexpected message）             |
| `neoSignTransaction`      | 固件当前返回失败（如 Device not support this method） |
| `scdoSignTransaction`     | 固件当前返回失败（如 Unexpected message）             |
| `scdoSignMessage`         | 固件当前返回失败（如 Unexpected message）             |

其他方法按默认预期执行。

---

## Mini

### 当前测试下失败预期的方法（expected=false）

| 方法                      | 说明（实际错误文案可能随固件变化）                    |
| ------------------------- | ----------------------------------------------------- |
| `alephiumSignTransaction` | 固件当前返回失败（如 Unknown message）                |
| `alephiumSignMessage`     | 固件当前返回失败（如 Unknown message）                |
| `dnxSignTransaction`      | 固件当前返回失败（如 Unknown message）                |
| `neoSignTransaction`      | 固件当前返回失败（如 Device not support this method） |
| `scdoSignTransaction`     | 固件当前返回失败（如 Unknown message）                |
| `scdoSignMessage`         | 固件当前返回失败（如 Unknown message）                |
| `tonSignMessage`          | 固件当前返回失败（如 Device not support this method） |
| `tonSignProof`            | 固件当前返回失败（如 Device not support this method） |
| `tronSignMessage`         | 固件当前返回失败（如 Device not support this method） |

### 当前测试下成功预期的特殊覆盖（expected=true）

| 方法                     | 条件         | 说明               |
| ------------------------ | ------------ | ------------------ |
| `nemSignTransaction`     | coin type 60 | 当前设备实际可成功 |
| `stellarSignTransaction` | coin type 60 | 当前设备实际可成功 |

其他方法按默认预期执行。

## Pro2 / Neo

当前兼容性测试插件目录没有 Pro2 / Neo 插件，因此本文不能据此给出二者的完整成功/失败矩阵。二者的公链能力共享 `model_pro2` 版本范围，并由 Protocol V2 真机测试和各方法的能力限制单独验证；需要差异化时仍可使用 `pro2` 或 `neo` 精确覆盖。不要把 OneKey Pro 的结果直接复制给该产品族。

Core 方法以 `BaseMethod.getSupportedProtocols()` 作为协议能力事实源：默认方法仅支持 Protocol
V1，支持 Pro2 / Neo 的共享方法必须显式声明 `['V1', 'V2']`，Protocol V2 专属方法声明 `['V2']`。只有协议
检查通过后才读取 `DeviceFirmwareRange` 的 `min/max`；版本范围缺失或 `0.0.0` 不再用于表示
“不支持”。

`model_pro2` 只表示共享的链/固件方法能力，不表示硬件外设能力。Neo 不具备摄像头、NFC、指纹和 Find My，应用层不得据此开放二维码钱包或这些硬件入口。

---

## 配置文件位置（overrides 规则）

```
packages/connect-examples/expo-example/src/testTools/deviceCompatibility/plugins/
├── classic.ts
├── classic1s.ts
├── classicpure.ts
├── pro.ts
├── touch.ts
└── mini.ts
```

## 链与固件版本边界

方法测试矩阵回答“当前测试是否接受该方法失败”，链能力还需要结合固件版本门槛判断。维护时以以下来源为准：

- 最新固件版本：`data.onekey.so/config.json` 对应的 release 配置。
- 方法最低版本：Core method 的 firmware range 和功能判断。
- 机型特殊覆盖：上述兼容性测试插件的 `expected` 配置。
- Pro2 / Neo：Protocol V2 Schema、Core 方法守卫和真机测试，不能从 OneKey Pro 推断。

常见需要单独核验的能力包括 EIP-7702、BTC PSBT、Solana 消息签名与 Versioned Transaction、Tron 消息签名、Cardano Conway、TON、Neo、Alephium 和部分特殊网络。不要在文档中长期复制远端“最新版本”数字；发布变化后它们会迅速失真。

判断某个设备是否支持一条链时，按以下顺序排查：

1. SDK 是否存在对应公共方法和 protobuf 消息。
2. 方法是否声明机型或最低固件版本限制。
3. 兼容性插件是否存在 `expected=false` 特殊覆盖。
4. 设备实际固件是否达到版本要求。
5. 对 Pro2 / Neo 执行 Protocol V2 真机测试。
