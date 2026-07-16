# Pro2 Onboarding 与恢复无 Event 设计

## 变更表

| 原字段/流程 | 原作用 | 修改后 | 修改原因 |
| --- | --- | --- | --- |
| `ButtonRequest_MnemonicWordCount` | 请求 Host 选择助记词数量 | 删除 | Pro2 在设备页面选择 |
| `ButtonRequest_MnemonicInput` | 通知 Host 进入助记词输入 | 删除 | 助记词只在设备输入或由设备读取 SeedCard |
| `WordRequest/WordAck` | Host 逐词提供助记词 | Pro2 不使用 | 恢复敏感数据不经过 App/SDK |
| `EntropyRequest/EntropyAck` | Host 向设备提供创建钱包熵 | Pro2 不使用 | 钱包熵由设备安全生成 |
| `ButtonRequest_ConfirmWord/RecoveryHomepage` | 通知 App 恢复页面阶段 | 删除 | 页面阶段由设备本地状态机管理 |
| `DevOnboardingStatus` | 原来仅作为补充状态 | 作为 App 查询进度的唯一设备状态 | App 不再依赖 Button/Word Event 推进 |

## Pro2 产品模型

```text
App 打开设备初始化/恢复流程
  -> 设备本地完成安全检查、创建或恢复、备份
  -> App 周期性或在重连后调用 DevGetOnboardingStatus
  -> 根据 stage 展示通用引导
  -> stage=DONE 后继续读取 DeviceInfo/DeviceStatus 并创建 App 钱包
```

App 不接收助记词、不提供熵，也不根据硬件 UI Event 判断用户当前输入到第几个词。

## Onboarding 状态语义

`DevOnboardingStatus.stage` 是设备流程事实来源，包括：

- Safety Check
- Personalization
- Select Setup Method
- New Device
- Restore Mnemonic/SeedCard
- Wallet Ready
- Backup
- Done

`status_code/detail_code` 用于表达当前阶段的失败或细节，不应错误解码成其他 protobuf 消息。

`DEV_ONBOARDING_STAGE_DONE` 表示设备 onboarding 已完成。App 收到后必须继续执行最终状态刷新和钱包
创建流程，不能继续等待一个不会到来的 Button Event。

## SDK/App 职责

- SDK 提供稳定的 `deviceGetOnboardingStatus()` 查询。
- App 在连接、重连和 onboarding 页面恢复时重新查询。
- App 只展示阶段级状态，不镜像设备内部每个页面。
- DONE 后刷新 Features、DeviceStatus 和钱包 Session。
- 未识别 stage 保守展示处理中，并记录原始 stage/status/detail。

## firmware-pro2 职责

- 所有创建、助记词恢复和 SeedCard 流程在设备完成。
- 不发送 `WordRequest/EntropyRequest` 或 onboarding Button Event。
- 每次阶段变化都更新可查询状态。
- DONE 状态在重启或 App 重连后仍可正确读取。
- 失败、取消和重试必须有稳定 status/detail code。

## 验收项

- 新设备创建、助记词恢复、SeedCard 恢复均无需 Host 输入敏感信息。
- App 在任意阶段重启后能恢复显示。
- DONE 后能继续完成 App 钱包创建。
- 不产生 Word/Entropy/Button onboarding 中间消息。
- 未知状态不会造成错误 protobuf 解码或无限等待。
