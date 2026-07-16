# Pro2 交易与消息签名无 Event 设计

## 变更表

| 原字段/流程 | 原作用 | 修改后 | 修改原因 |
| --- | --- | --- | --- |
| `ButtonRequest_SignTx` | 通知 App 等待设备签名确认 | 删除 | 固件签名状态机直接显示设备确认页 |
| `ButtonRequest_ConfirmOutput` | 通知 App 用户正在确认输出 | 删除 | 输出确认属于设备内部页面步骤 |
| `ButtonRequest_FeeOverThreshold` | 通知 App 高费率确认 | 删除 | 风险提示由设备直接显示 |
| `ButtonRequest_UnknownDerivationPath` | 通知 App 路径风险确认 | 删除 | 风险确认留在设备内部 |
| `ButtonRequest_Warning/Other` | 通用设备确认提示 | 删除 Pro2 Host Event | 固件返回最终签名或失败 |
| 链协议数据 Request/Ack | 请求下一段交易数据 | 保持 | 这是业务数据握手，不是 UI Event |

## 原 Pro 模型

原 Pro 可能在签名过程中多次发送 Button Event，App 展示“请在设备确认”，SDK 自动 ACK，签名状态机
随后继续处理输出、费用和最终确认。

## Pro2 目标模型

```text
SDK 发送完整或首段签名请求
  -> 固件按链协议请求后续交易数据（如需要）
  -> 固件内部显示输出、费用、风险和最终确认页面
  -> 用户确认或取消
  -> 最终 Signature 或 Failure
```

设备内部可以有多个页面和步骤，但 Host 只看到业务数据握手和最终结果。

## 必须保留的数据握手

例如以下类型不能因为名字包含 Request/Ack 就删除：

- Bitcoin `TxRequest/TxAck`
- Stellar operation request/ack
- Sui transaction data request/ack
- Cardano、NEM 等链的分段交易数据交互

判断标准：如果消息承载的是待签名业务数据，它属于签名协议；如果消息只是要求 App 展示设备 UI，
它才属于需要删除的硬件 UI Event。

## SDK/App 职责

- SDK 继续正确响应链数据分片请求。
- SDK 不把交易数据 Request 转成通用 UI Event。
- App 在签名调用开始时主动显示设备处理中状态。
- App 不依赖 Button code 判断当前在确认输出、费用还是最终签名。
- 最终错误需要保留明确的取消、数据错误、风险拒绝和设备断连语义。

## firmware-pro2 职责

- 所有签名确认页面使用内部 UIVIEW/签名状态机。
- 不发送签名相关 `ButtonRequest`。
- 页面取消必须中断签名、清理敏感状态并返回最终失败。
- 交易数据握手与设备 UI 状态机不能互相误消费消息。

## 验收项

- 各链地址对应的钱包 Session 校验通过后才能签名。
- 输出、费用、风险和最终确认都能在设备完成。
- 不产生签名相关 `ButtonRequest/ButtonAck`。
- 数据分片 Request/Ack 保持正常。
- 取消后不生成签名。
- USB/BLE、多输入和长交易均能结束等待状态。
