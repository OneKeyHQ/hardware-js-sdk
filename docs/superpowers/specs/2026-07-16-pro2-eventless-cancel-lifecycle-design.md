# Pro2 无 Event 交互生命周期设计

## 变更表

| 原字段/流程 | 原作用 | 修改后 | 修改原因 |
| --- | --- | --- | --- |
| UI Event 对话框关闭触发 SDK cancel | 取消当前 Host 等待项和设备流程 | App 根据当前 API 请求主动调用 `Cancel` | 不再有 Event 对话框作为取消入口 |
| Button/Passphrase/PIN ACK 超时 | 防止 Host 永久不响应 | 删除 | Pro2 不等待 Host ACK |
| 方法级超时 | 限制整个设备交互时间 | 保留 | 仍需处理设备无响应和 Transport 异常 |
| `CLOSE_UI_WINDOW` | 通知 App 收起 Event UI | 保留为兼容/通用关闭通知，但 Pro2 不依赖 | Pro2 UI 应以 Promise 生命周期幂等关闭 |
| 设备断连 | 原调用最终失败 | 保持并强化清理 | 防止请求错误路由到其他设备 |

## 单请求规则

同一设备、同一 Transport source 同时只允许一个前台交互请求：

- 已有交互时，新交互返回 `Busy`。
- 非交互状态查询可以按固件并发能力决定是否允许。
- USB Cancel 不能取消 BLE 请求，BLE Cancel 也不能取消 USB 请求。

## 主动取消

```text
App 用户关闭等待页
  -> SDK 发送 Cancel
  -> 固件定位当前 source 的前台交互
  -> 关闭设备页面
  -> 清理 PIN/Passphrase/签名临时状态
  -> 原请求返回 UserCancelled
  -> Cancel 自身返回 Success
```

没有活动交互时，`Cancel` 应幂等成功。

## 超时

- 删除所有等待 Host `ButtonAck/PassphraseAck/PinMatrixAck` 的超时。
- 保留页面交互、SE 操作、文件传输和整个 SDK 方法的合理超时。
- SDK 方法超时后必须尝试 Cancel，并清理本地请求队列。
- 超时不能把设备响应重新绑定到下一个请求。

## 断连与重连

- 断连立即结束当前请求并清理等待 UI。
- 不允许自动选择另一台同型号设备继续原请求。
- 重连后通过状态查询和 Session 恢复重新开始，不复用未完成交互。
- 固件重启导致的预期断连由具体升级/擦除状态机处理。

## 验收项

- Passphrase、Attach PIN、PIN、地址确认、签名和设置页都能主动取消。
- Cancel 不跨 Transport source。
- 重复 Cancel 幂等。
- Busy 不导致第二个设备页面打开。
- 方法超时后下一个请求能正常执行。
- 断连后 App 不永久显示 Processing。
