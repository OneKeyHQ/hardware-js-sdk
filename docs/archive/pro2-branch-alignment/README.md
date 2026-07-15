# Pro 2 当前分支变更对齐

> **历史状态：** 本目录是 `feat/pro2-usb-ble` 在特定时间点的分支快照，不再作为当前 SDK 规范。当前行为请参考 [Protocol V2](../../protocol/protocol-v2.md)、[Passphrase 与钱包 Session](../../device/session/pro-passphrase-session.md)、[设备设置](../../business/device-settings.md)、[壁纸上传](../../business/device-customization/wallpaper.md) 和 [Pro2 固件升级](../../business/firmware-update/pro2.md)。

## 1. 文档范围

- 当前分支：`feat/pro2-usb-ble`
- 对比基线：`origin/onekey` 与当前 `HEAD` 的 merge-base：`a1fb7786313ccee4b1e570c53ae2c05a96f785df`
- 分析口径：已提交变更 + 当前工作区未提交变更
- 核心范围：`packages/core`、`packages/hd-transport*`、`packages/shared`
- 明确忽略：`packages/connect-examples`、示例页面、演示脚本

> 本目录描述的是当前工作区快照。未提交代码继续变化后，需要重新核对文档中的接口和行为。

## 2. 功能文档索引

| 文档                                                                         | 主题                  | 核心结论                                                       |
| ---------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------- |
| [01-protocol-v2-and-naming.md](./01-protocol-v2-and-naming.md)               | Protocol V2 与命名    | V1/V2 schema、消息名、传输协议和 Pro2 判定已显式分层           |
| [02-passphrase-and-wallet-session.md](./02-passphrase-and-wallet-session.md) | Passphrase 与钱包会话 | Pro2 不再复用 V1 `GetPassphraseState`，改走 `DeviceSessionGet` |
| [03-attach-to-pin-and-unlock.md](./03-attach-to-pin-and-unlock.md)           | Attach-to-PIN 与解锁  | 解锁结果与会话状态拆开；V2 方法支持锁定后自动解锁并重试一次    |
| [04-device-settings.md](./04-device-settings.md)                             | DeviceSettings        | 新增 V2 设置读取、写入和设备端设置页跳转接口                   |
| [05-wallpaper-upload.md](./05-wallpaper-upload.md)                           | 壁纸上传              | RGBA 编码、文件系统分片上传、设置壁纸路径形成完整链路          |
| [06-firmware-update.md](./06-firmware-update.md)                             | 固件升级              | `firmwareUpdateV4` 按 Pro2 target 分阶段上传、安装、轮询和重连 |
| [08-alignment-checklist.md](./08-alignment-checklist.md)                     | 对齐清单              | 按固件、Core、SDK 调用方和测试逐项验收                         |

## 3. 总体架构变化

```text
SDK 公共方法
  -> Core BaseMethod / RequestQueue
  -> Device / DeviceCommands
  -> Protocol V1 或 Protocol V2 消息路由
  -> USB / BLE 的 V2 link + sequence + frame assembler
  -> Pro2 固件
```

Pro2 的关键变化是从“在旧 Features 和 V1 方法上增加条件分支”，转向显式的 Protocol V2 模型：

1. `DataManager` 同时维护 `v1CurrentSchema`、`v1LegacySchema`、`v2Schema`。
2. Pro2 状态由 `DeviceInfo`、`DeviceStatus`、`DeviceSession` 分工提供。
3. `BaseMethod.requireProtocolV2` 统一限制 V2-only API。
4. `BaseMethod.unlockPolicy = 'retry-on-locked'` 为允许的 V2 方法提供一次自动解锁重试。
5. 文件系统成为壁纸、Portfolio、资源包和固件暂存的公共基础能力。

## 4. 当前主要风险

- `getPassphraseState` 对外保持 `string | undefined`；session、Attach PIN 和保护状态只在 Core 内部维护。
- `DeviceSettingsSet` 暂时禁止通过通用设置接口修改 `passphrase_enable` 和 `airgap_mode`，必须打开设备端设置页。
- Protocol V2 proto 的 enum 解码仍沿用历史字符串语义，业务层需继续兼容字符串枚举名与数字。
- `firmwareUpdateV4` 不支持通过当前流程安装 ROMLOADER。
- 当前分支仍有未提交实现与测试，文档结论应在合并前随最终 diff 再复核一次。
