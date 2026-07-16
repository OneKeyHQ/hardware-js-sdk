# Pro2 无硬件交互 Event 设计索引

## 目标

Pro2 的目标模型是：SDK 发起明确业务请求，设备在本机完成 PIN、Passphrase、确认和恢复等交互，
最后只返回成功或失败。App 不再依赖硬件中间 Event 推进产品页面。

## 文档索引

| 模块 | 设计文档 | 主要替换内容 |
| --- | --- | --- |
| Passphrase / Attach-to-PIN | [Passphrase 与 Attach-to-PIN](2026-07-16-pro2-eventless-wallet-session-design.md) | `PassphraseRequest/Ack`、`ButtonRequest_PassphraseEntry/AttachPin` |
| PIN / 解锁 | [PIN 与自动解锁](2026-07-16-pro2-eventless-pin-unlock-design.md) | `ButtonRequest_PinEntry`、`PinMatrixRequest/Ack` |
| 地址 / 公钥确认 | [地址与公钥确认](2026-07-16-pro2-eventless-address-public-key-design.md) | `ButtonRequest_Address/PublicKey` |
| 交易 / 消息签名 | [签名确认](2026-07-16-pro2-eventless-signing-design.md) | `ButtonRequest_SignTx/ConfirmOutput/Warning` 等 |
| 设备管理 | [设备管理](2026-07-16-pro2-eventless-device-management-design.md) | Reset、Wipe、设置页和危险操作确认 |
| Onboarding / 恢复 | [Onboarding 与恢复](2026-07-16-pro2-eventless-onboarding-recovery-design.md) | `EntropyRequest`、`WordRequest`、Onboarding 阶段推进 |
| 取消 / 超时 / 断连 | [交互生命周期](2026-07-16-pro2-eventless-cancel-lifecycle-design.md) | `Cancel`、Busy、超时、断连清理 |
| 保留边界 | [非 UI Event 边界](2026-07-16-pro2-eventless-boundaries-design.md) | 进度、Transport、数据分片 Request/Ack |

## 总体判断规则

| 消息或事件 | Pro2 处理 |
| --- | --- |
| 请求过程中的 PIN、Passphrase、Button UI 中间响应 | 删除 |
| 设备本地页面 | 保留，由业务命令直接触发 |
| 最终业务响应或 Failure | 保留 |
| 交易数据分片 Request/Ack | 保留，它们是业务协议握手 |
| 文件、固件和资源进度 | 保留，它们由 SDK 或状态查询生成 |
| USB/BLE 连接、断开和 notification | 保留，它们是 Transport 生命周期 |
| App 主动产生的 processing/checking UI | 保留 |

## SDK 总入口

Pro2 不注册以下设备交互监听：

- `DEVICE.PIN`
- `DEVICE.BUTTON`
- `DEVICE.PASSPHRASE`
- `DEVICE.PASSPHRASE_ON_DEVICE`

`DeviceCommands._filterCommonTypes()` 收到 Pro2 的 `PinMatrixRequest`、`PassphraseRequest` 或
`ButtonRequest` 时，应报告协议错误，不能继续自动 ACK。

原 Pro 保留原来的 Event 与 ACK 流程。
