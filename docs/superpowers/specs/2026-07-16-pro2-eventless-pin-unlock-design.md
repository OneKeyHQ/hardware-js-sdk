# Pro2 PIN 与自动解锁无 Event 设计

## 变更表

| 原字段/流程 | 原作用 | 修改后 | 修改原因 |
| --- | --- | --- | --- |
| `ButtonRequest_PinEntry` | 通知 App 即将进入 PIN 输入阶段 | 删除 | Pro2 业务先返回统一 `DeviceLocked`，不通过 Event 启动解锁 |
| `ButtonAck` | 允许固件继续显示 PIN 页面 | 删除 | `DeviceSessionAskPin` 直接打开设备 PIN 页面 |
| `PinMatrixRequest` | 请求 App 提供 PIN，或切换到设备输入 | 删除 | Pro2 PIN 只在设备输入 |
| `PinMatrixAck` | 将 App PIN 或设备输入选择回传给固件 | 删除 | Host 不再参与 PIN 输入 |
| `REQUEST_PIN` | App 展示 PIN 输入或设备操作提示 | Pro2 不再由 Event 触发 | App 根据解锁 API 生命周期主动展示等待状态 |
| 业务内部隐式解锁 | 业务请求暂停并等待 Host ACK | `DeviceLocked -> DeviceSessionAskPin -> retry once` | 解锁成为明确、可复用的 SDK 流程 |

## 原流程

```text
业务请求
  -> ButtonRequest_PinEntry 或 PinMatrixRequest
  -> SDK/App 展示 PIN UI
  -> PinMatrixAck / ButtonAck
  -> 设备或 App 输入 PIN
  -> 原业务继续
```

原流程把业务调用、PIN UI 和 ACK 状态机绑定在一起。不同方法可能各自实现一套 PIN 前置逻辑。

## Pro2 目标流程

```text
业务请求
  -> Failure(DeviceLocked)
  -> SDK 调用 DeviceSessionAskPin
  -> 固件直接显示设备 PIN/指纹页面
  -> Success 或 UserCancel
  -> SDK 原业务只重试一次
```

`DeviceSessionAskPin` 是唯一的 Host 主动解锁入口。设备页面由固件直接创建，不发送任何 PIN 或
Button Event。

## SDK 职责

1. 将固件统一 locked subcode 映射为 `HardwareErrorCode.DeviceLocked`。
2. 只有声明 `unlockPolicy='retry-on-locked'` 的方法才自动解锁。
3. 同一业务调用最多自动解锁并重试一次，防止死循环。
4. 解锁成功后调用 `DeviceStatusGet`，刷新 `unlocked`、Passphrase 和 Attach PIN 状态。
5. 用户取消、PIN 错误、次数耗尽时不重试业务。
6. 多个并发调用只能共享一个串行解锁任务，不能同时打开多个 PIN 页面。

## firmware-pro2 职责

1. 需要解锁的业务在 locked 时直接返回统一 `DeviceLocked`。
2. `DeviceSessionAskPin` 直接显示本地 PIN/指纹页面。
3. 成功时完成 FG 解锁状态、锁屏、活动计时器和 SE 状态同步后返回 `Success`。
4. 用户取消返回稳定 subcode，不返回普通字符串错误代替协议状态。
5. 不发送 `ButtonRequest_PinEntry`、`PinMatrixRequest`。

## 产品行为

- App 在调用 SDK 前或收到 SDK 解锁阶段通知时展示“请在设备上解锁”。
- App 不显示 Pro2 PIN 输入框。
- 解锁完成后等待原业务最终结果。
- 取消后关闭等待页并返回可操作状态。

## 验收项

- locked 地址、签名、设置和 Session 请求都能走统一自动解锁。
- 不产生 `ButtonRequest_PinEntry/PinMatrixRequest`。
- SDK 不发送 `ButtonAck/PinMatrixAck`。
- PIN 取消后原业务不重试。
- 连续返回 `DeviceLocked` 时最多只解锁一次。
- USB/BLE 和多设备场景不串设备。
