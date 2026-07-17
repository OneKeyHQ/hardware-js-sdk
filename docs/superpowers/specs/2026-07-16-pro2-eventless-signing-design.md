# Pro2 交易与消息签名无固件中间 Event 设计

## 一页结论

SDK 在签名调用进入设备交互阶段时合成一个非阻塞 `REQUEST_BUTTON`，App 继续展示通用“请在设备上
确认”。firmware 内部完成输出、费用、风险和最终确认页面，不再逐页发送 Button Event。

```text
SDK emit 通用签名提示
  -> 发送签名请求
  -> 保留链协议数据 Request/Ack
  -> firmware 内部完成所有确认页
  -> 最终 Signature 或 Failure
```

App 不再根据 Button code 镜像“正在确认输出/费用/风险”等设备内部页，但整体等待和取消交互不变。

## 新旧映射

| 原字段/流程                           | Pro2 处理             | SDK → App                               |
| ------------------------------------- | --------------------- | --------------------------------------- |
| `ButtonRequest_SignTx`                | firmware 删除         | SDK 合成一次通用签名 `REQUEST_BUTTON`   |
| `ButtonRequest_ConfirmOutput`         | firmware 删除         | 不逐输出发送 Event                      |
| `ButtonRequest_FeeOverThreshold`      | firmware 删除         | 风险内容由设备展示                      |
| `ButtonRequest_UnknownDerivationPath` | firmware 删除         | 风险内容由设备展示                      |
| `ButtonRequest_Warning/Other`         | firmware 删除 UI 用法 | 必要时使用稳定、非敏感的 SDK 状态 Event |
| 链协议数据 Request/Ack                | 保留                  | SDK 内部响应，不转成 UI Event           |

## 必须保留的数据握手

以下消息即使名为 Request/Ack，也不能删除：

- Bitcoin `TxRequest/TxAck`。
- Stellar operation request/ack。
- Sui transaction data request/ack。
- Cardano、NEM 等链的分段交易数据交互。

判断标准：承载待签名业务数据的是签名协议；只用于要求 Host 展示或放行设备 UI 的，才是要删除的
firmware UI 中间消息。

## SDK/App 职责

- SDK 在确认签名请求即将进入设备交互后发出一次非阻塞 `REQUEST_BUTTON`。
- payload 至少包含设备、`source=method-lifecycle`、`reason=signing-confirmation` 和签名类型；不包含
  完整交易、消息明文或敏感数据。
- SDK 继续正确响应链数据分片请求，不把它们转换为通用 UI Event。
- App 继续使用现有 `REQUEST_BUTTON` 等待页，不调用 `uiResponse()`。
- App 不依赖旧 Button code 判断设备当前页；需要展示的风险内容应在调用前由 App 业务页面说明，最终
  决策在设备完成。
- 调用成功、失败、取消、超时或断连时，SDK 统一关闭 UI。

## firmware-pro2 职责

- 所有签名确认页面使用内部 UIVIEW/签名状态机。
- 不发送签名相关 `ButtonRequest`，不等待 `ButtonAck`。
- 页面取消必须中断签名、清理敏感状态并返回最终失败。
- 交易数据握手与设备 UI 状态机不能互相误消费消息。
- 最终错误保留取消、数据错误、风险拒绝和断连等稳定语义。

## 产品行为

- 用户仍会在 App 看到“请在设备确认”，在设备上查看和确认交易。
- App 提示从 firmware 第一条 Button 消息到达时，前移到 SDK 确认进入签名阶段时。
- App 不再显示与设备每一页完全同步的细粒度步骤；整体签名进度、成功、失败和取消保持一致。

## 验收项

- 各链在钱包 Session 校验通过后才进入签名。
- 每次签名最多产生一次通用非阻塞确认 Event，除非协议明确存在独立阶段通知。
- firmware 不产生签名 UI `ButtonRequest`，SDK 不发送 `ButtonAck`。
- 数据分片 Request/Ack 保持正常。
- 取消后不生成签名。
- Event payload 不泄露完整交易或消息内容。
- USB/BLE、多输入和长交易均能结束等待状态。
