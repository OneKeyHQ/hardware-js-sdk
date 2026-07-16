# Pro2 设备管理无 Event 设计

## 变更表

| 原字段/流程 | 原作用 | 修改后 | 修改原因 |
| --- | --- | --- | --- |
| `ButtonRequest_ResetDevice` | 等待用户确认初始化/重置 | 删除 Pro2 Host Event | 设备本地 onboarding 页面直接处理 |
| `ButtonRequest_WipeDevice` | 等待用户确认擦除设备 | 删除 | 擦除命令直接打开设备危险操作确认页 |
| `ButtonRequest_ProtectCall` | 业务前通用保护确认 | 删除 | 每个 Pro2 命令明确自己的设备认证和页面 |
| `ButtonRequest_Warning/Success` | 通知 App 设备页面阶段 | 删除 Pro2 Host Event | App 根据 API 生命周期和最终结果更新 UI |
| `DeviceSettingsPageShow` | 原来不存在或由旧命令间接进入 | 保持为显式页面导航命令 | Host 只表达打开哪个设备设置页 |

## 设置页与业务命令的区别

`DeviceSettingsPageShow` 是页面导航命令：

```text
App 选择设备设置项
  -> SDK DeviceSettingsPageShow(page)
  -> 固件直接打开对应设置页
  -> Success 表示页面请求已接受
```

设置页内后续修改由设备完成。App 在页面退出、设备重连或操作结束后重新读取
`DeviceSettingsGet/DeviceStatusGet`。

具有明确最终结果的危险操作则应保持请求生命周期：

```text
Wipe/Reset/Change security setting
  -> 固件显示设备确认页
  -> 用户确认或取消
  -> 最终 Success/Failure
```

## SDK/App 职责

- App 主动展示通用“请在设备操作”，不等待 Button Event。
- SDK 对 locked 设置命令使用统一自动解锁策略。
- 页面导航 Success 与设置修改完成不能混为一谈。
- 操作完成后刷新 `DeviceStatus`、`DeviceSettings` 和 Features。
- 擦除、重置等破坏性操作取消后不得自动重试。

## firmware-pro2 职责

- 每个设置页和危险操作直接创建本地 UI。
- 不发送 Reset/Wipe/ProtectCall 等 Button Event。
- 设置成功后持久化状态并保证下一次查询可见。
- 擦除/重置成功后返回响应并安全重启；Host 断连应被视为预期状态变化。
- 用户取消返回稳定失败，不使用超时模拟取消。

## 验收项

- Passphrase、蓝牙、Airgap、壁纸等设置页能直接打开。
- locked 设置请求走统一解锁。
- Wipe/Reset 必须在设备确认。
- 不产生设备管理类 `ButtonRequest`。
- 设置完成后查询值正确。
- 重启/断连不会让 App 永久停留在处理中。
