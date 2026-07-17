# Pro2 地址与公钥确认无固件中间 Event 设计

## 一页结论

`showOnOneKey=true` 时，SDK 在发出业务请求前合成一个非阻塞 `REQUEST_BUTTON`，App 继续展示“请在
设备上确认”。firmware 收到请求后直接显示地址或公钥确认页，不再发送 `ButtonRequest`，SDK 也不发送
`ButtonAck`。

```text
App 调用 showOnOneKey=true
  -> SDK emit REQUEST_BUTTON（非阻塞）
  -> SDK 发送 GetAddress/GetPublicKey
  -> firmware 直接显示确认页
  -> 最终 Address/PublicKey 或 UserCancelled
  -> SDK CLOSE_UI_WINDOW
```

## 新旧映射

| 原字段/流程                       | Pro2 处理                    | App 影响                       |
| --------------------------------- | ---------------------------- | ------------------------------ |
| `ButtonRequest_Address/PublicKey` | firmware 删除                | 不再作为提示来源               |
| `ButtonAck`                       | SDK 删除                     | App 无感知                     |
| `REQUEST_BUTTON`                  | SDK 根据 `showOnOneKey` 合成 | 继续复用现有确认提示，无需响应 |
| `showOnOneKey=false`              | 保持直接返回                 | 不展示提示或设备确认页         |

## SDK/App 职责

- SDK 只有在 `showOnOneKey=true` 时发出非阻塞 `REQUEST_BUTTON`。
- Event payload 应包含设备、`source=method-lifecycle`、`reason=address-confirmation` 或
  `public-key-confirmation`，并可保留兼容 Button code。
- App 继续监听 `REQUEST_BUTTON`，展示统一设备确认提示，不调用 `uiResponse()`。
- 调用成功、失败、取消、超时或断连时，SDK 发出关闭通知；App 幂等收起提示。
- `PREVIOUS_ADDRESS_RESULT` 和批量地址进度是 SDK 业务事件，不属于删除范围。
- App 不应自行根据 API 参数另开一套平行提示，以免与 SDK Event 重复展示。

## firmware-pro2 职责

- 请求要求显示时直接创建设备确认页。
- 确认后返回最终地址或公钥。
- 取消后返回 `UserCancelled`，不能先返回业务数据。
- Host Cancel 能关闭当前确认页并结束原请求。
- 最终响应必须返回原 Transport source，不能固定路由到 USB。
- 不发送 `ButtonRequest_Address/PublicKey`，也不等待 `ButtonAck`。

## 产品行为

产品层交互基本不变：用户发起“在设备上验证”后，App 仍显示确认提示，设备仍展示地址或公钥，用户
确认后 App 得到结果。用户可感知的差异仅是提示更早、更稳定，不再依赖 firmware 先发一条中间消息。

## 验收项

- `showOnOneKey=false` 不发 `REQUEST_BUTTON`，不显示设备页面。
- `showOnOneKey=true` 在请求开始时只发一次非阻塞提示，并显示正确地址或公钥。
- firmware 不产生 `ButtonRequest_Address/PublicKey`。
- SDK 不发送 `ButtonAck`，也不创建 UI 响应等待项。
- 用户取消不会返回地址或公钥。
- USB/BLE 返回路径一致。
- 批量地址不会因删除 firmware Event 丢失进度或已完成结果。
