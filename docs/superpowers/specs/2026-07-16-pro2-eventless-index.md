# Pro2 无固件中间 Event 设计索引

## 一页结论

“无 Event”只描述硬件协议层：Pro2 firmware 不再向 Host 发送 PIN、Passphrase、Button 等 UI
中间消息，也不等待 Host ACK 后再继续设备状态机。

SDK 与 App 之间仍然保留 Event，作为稳定的产品交互契约：

```text
Protocol V1
  firmware UI message -> SDK 转换 Event -> App -> uiResponse -> SDK Ack -> firmware

Protocol V2 / Pro2
  SDK 根据业务状态合成 Event -> App -> 可选 uiResponse
  SDK 将选择转换为显式业务命令；firmware 只返回最终结果
```

因此，App 的硬件交互容器、等待页和 `uiResponse()` 机制可以继续复用。变化主要集中在 SDK
协调层和 firmware 协议状态机，而不是把交互责任整体推给 App。

`DeviceSessionOpen` 也不是 `PassphraseAck` 或 `ButtonRequest` 的简单改名。它把原来的
`PassphraseRequest -> PassphraseAck -> ButtonRequest/ButtonAck -> DeviceSession` 多轮状态机收敛为
一个主动命令，并额外提供标准钱包选择与指定 Session 恢复能力。

隐藏钱包 Session 继续按 `deviceKey + passphraseState` 缓存；标准钱包不增加特殊缓存 key，由
`useEmptyPassphrase=true` 在每次业务调用前显式执行 `select STANDARD`。

## 文档索引

| 模块                       | 设计文档                                                                          | SDK → App Event 形态              | firmware 变化                                                               |
| -------------------------- | --------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------- |
| Passphrase / Attach-to-PIN | [Passphrase 与 Attach-to-PIN](2026-07-16-pro2-eventless-wallet-session-design.md) | 阻塞选择 Event；等待 `uiResponse` | 删除 Passphrase/Button Request/Ack，改用 `DeviceSessionOpen(select/resume)` |
| PIN / 解锁                 | [PIN 与自动解锁](2026-07-16-pro2-eventless-pin-unlock-design.md)                  | 非阻塞“请在设备解锁”Event         | 删除 PIN/Button Request/Ack，改用 `DeviceSessionAskPin`                     |
| 地址 / 公钥确认            | [地址与公钥确认](2026-07-16-pro2-eventless-address-public-key-design.md)          | 非阻塞确认提示 Event              | 请求到达后直接显示确认页                                                    |
| 交易 / 消息签名            | [签名确认](2026-07-16-pro2-eventless-signing-design.md)                           | 非阻塞通用签名提示 Event          | 页面步骤全部在设备完成                                                      |
| 设备管理                   | [设备管理](2026-07-16-pro2-eventless-device-management-design.md)                 | 非阻塞设备操作提示 Event          | 显式页面命令或最终操作响应                                                  |
| Onboarding / 恢复          | [Onboarding 与恢复](2026-07-16-pro2-eventless-onboarding-recovery-design.md)      | 可选阶段通知；查询为事实来源      | 不发送敏感数据和页面阶段 Event                                              |
| 取消 / 超时 / 断连         | [交互生命周期](2026-07-16-pro2-eventless-cancel-lifecycle-design.md)              | Event UI 仍可作为取消入口         | `Cancel` 直接取消当前设备请求                                               |
| 保留边界                   | [无固件中间 Event 边界](2026-07-16-pro2-eventless-boundaries-design.md)           | 保留 SDK、Transport 和进度 Event  | 保留业务数据握手与最终响应                                                  |

## Event 分类与统一规则

| 类别                 | 示例                                        | SDK 是否 emit         | App 是否响应       | SDK 后续动作                     |
| -------------------- | ------------------------------------------- | --------------------- | ------------------ | -------------------------------- |
| 阻塞选择 Event       | 隐藏钱包选择 Passphrase / Hidden Wallet PIN | 是                    | 是，`uiResponse()` | 转成 `DeviceSessionOpen(select)` |
| 非阻塞设备提示 Event | 解锁、地址确认、签名、设备管理              | 是                    | 否                 | 等待设备最终结果                 |
| 状态/阶段通知        | Onboarding、进度、升级提示                  | 可选或保留            | 否                 | 查询或方法结果仍是事实来源       |
| 敏感数据交换         | PIN、助记词、熵；设备输入 Passphrase        | 不通过 App Event 传输 | 不适用             | 只在设备端处理                   |
| Host Passphrase      | App 输入的普通 Passphrase                   | 通过既有阻塞 Event    | `uiResponse()`     | 只用于当前 Session 打开请求      |
| 业务数据握手         | 签名分片 Request/Ack                        | 不转换为通用 UI Event | SDK 内部响应       | 继续业务协议                     |

## SDK 总入口

Protocol V2 不再消费设备返回的 `PinMatrixRequest`、`PassphraseRequest`、`ButtonRequest`，也不发送
对应 ACK；收到这些消息应按协议回归错误结束调用。

但这不等于删除 Core 的公共 UI Event 能力。Protocol V2 由方法层或协调器主动发出：

- `REQUEST_PASSPHRASE`：阻塞选择 Event。
- `REQUEST_PIN`：非阻塞设备解锁提示。
- `REQUEST_BUTTON`：地址、公钥、签名和设备管理的非阻塞提示。
- `REQUEST_PASSPHRASE_ON_DEVICE`：用户选择设备 Passphrase 后必须发送的非阻塞阶段提示，用于兼容
  当前 App 等待页面。
- `CLOSE_UI_WINDOW/CLOSE_UI_PIN_WINDOW`：统一、幂等关闭 UI。

原 Pro / Protocol V1 保留现有“固件消息 → Event → ACK”流程。App 可以监听同一组公共 Event，SDK
根据协议版本决定 Event 来源和后续动作。

## 最终验收原则

- firmware 不发送 UI 中间消息，不等待 Host UI ACK。
- App 仍通过 SDK Event 展示一致的硬件交互体验。
- 阻塞 Event 的响应只驱动显式业务命令，不伪造 firmware ACK。
- 非阻塞 Event 不能创建无意义的 `uiResponse` 等待项。
- 调用成功、失败、取消、超时或断连时，SDK 都清理 Event 等待并关闭 UI。
- PIN、助记词和熵不进入 Host；Passphrase 不进入日志或持久化 App 状态，App 输入模式只在当前
  `uiResponse()` 与 Session 打开请求中短暂存在。
