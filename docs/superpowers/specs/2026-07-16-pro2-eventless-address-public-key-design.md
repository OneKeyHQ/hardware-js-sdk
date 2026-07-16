# Pro2 地址与公钥确认无 Event 设计

## 变更表

| 原字段/流程 | 原作用 | 修改后 | 修改原因 |
| --- | --- | --- | --- |
| `ButtonRequest_Address` | 通知 App 地址正在等待设备确认 | 删除 | 地址确认页面由固件内部直接显示 |
| `ButtonRequest_PublicKey` | 通知 App 公钥正在等待设备确认 | 删除 | 公钥确认页面由固件内部直接显示 |
| `ButtonAck` | 允许设备继续确认流程 | 删除 | Host 不控制设备页面启动 |
| `REQUEST_BUTTON` | App 展示“请在设备确认”Toast | App 根据 `showOnOneKey` 和 API 生命周期主动展示 | 不再等待硬件 Event |
| 无显示请求 | 直接返回地址/公钥 | 保持不变 | 不需要设备交互 |

## 原流程

```text
GetAddress/GetPublicKey(show_display=true)
  -> ButtonRequest_Address/PublicKey
  -> SDK 自动 ButtonAck
  -> App 显示设备确认提示
  -> 设备显示确认页
  -> Address/PublicKey 或 Failure
```

## Pro2 目标流程

```text
GetAddress/GetPublicKey(showOnOneKey=true)
  -> 固件直接显示地址/公钥确认页
  -> 用户确认或取消
  -> 最终 Address/PublicKey 或 UserCancelled
```

当前 firmware-pro2 本地改动已经删除地址和公钥的 Host `ButtonRequest` 发送，目标设计与这条方向一致。

## SDK/App 职责

- SDK 正常等待最终结果，不自动发送 `ButtonAck`。
- App 在发起 `showOnOneKey=true` 调用时主动显示“请在设备确认”。
- 调用成功、失败、取消或断连时幂等关闭提示。
- `PREVIOUS_ADDRESS_RESULT` 和批量地址进度是 SDK 主动生成的数据，不属于硬件 Event 删除范围。

## firmware-pro2 职责

- 请求要求显示时直接创建设备确认页。
- 确认后返回最终结果。
- 取消后返回 `UserCancelled`。
- Host Cancel 能关闭当前确认页并结束原请求。
- BLE 请求的最终响应必须返回原 Transport source，不能固定路由到 USB。

## 验收项

- `showOnOneKey=false` 不显示设备页面。
- `showOnOneKey=true` 显示正确地址或公钥。
- 不产生 `ButtonRequest_Address/PublicKey`。
- 用户取消不会返回地址或公钥。
- USB/BLE 返回路径一致。
- 批量地址不会因删除 Event 丢失进度或已完成结果。
