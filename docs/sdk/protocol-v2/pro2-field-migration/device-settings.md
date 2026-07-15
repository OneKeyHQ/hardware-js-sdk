# Pro 2 设备设置字段迁移

Protocol V2 把用户可配置项从设备信息和状态中拆到 `DeviceSettings`。Core 通过独立设置 API 暴露读取、写入和设备端确认能力。

## 设置字段分组

| 分组           | Protocol V2 字段                                                | 当前访问方式                         |
| -------------- | --------------------------------------------------------------- | ------------------------------------ |
| 身份展示       | `label`、`device_name_display_enabled`                          | Get / Set                            |
| 连接           | `bt_enable`                                                     | Get / Set                            |
| 本地化         | `language`                                                      | Get / Set                            |
| 外观           | `wallpaper_path`、`brightness`、`animation_enable`              | Get / Set；壁纸文件另由文件 API 上传 |
| 唤醒与反馈     | `tap_to_wake`、`haptic_feedback`                                | Get / Set                            |
| 电源与锁定     | `autolock_delay_ms`、`autoshutdown_delay_ms`、`usb_lock_enable` | Get / Set                            |
| 安全输入       | `random_keypad`                                                 | Get / Set                            |
| 能力开关       | `fido_enabled`、`experimental_features`                         | Get / Set                            |
| 设备端确认设置 | `passphrase_enable`、`airgap_mode`                              | Get；修改必须使用 PageShow           |

## 三类消息

### `DeviceSettingsGet -> DeviceSettings`

读取完整设置。SDK 方法 `deviceSettingsGet` 是 Protocol V2 专用调用，并允许在设备锁定错误后按方法策略执行一次解锁重试。

### `DeviceSettingsSet -> Success`

支持部分字段更新，调用方只发送需要修改的字段。SDK 会拒绝空设置对象，并主动移除不能直接写入的 `passphrase_enable` 和 `airgap_mode`。

固件协议允许部分设备级偏好在锁定时应用，但其他字段可能返回 `DeviceError_DeviceLocked`。SDK 的高层调用仍应通过统一的受保护方法策略处理，不在业务层重复实现无限重试。

### `DeviceSettingsPageShow`

以下设置需要用户在设备端完成确认或输入：

| page               | 用途              |
| ------------------ | ----------------- |
| `DeviceReset`      | 擦除设备确认流程  |
| `DevicePinChange`  | 修改 PIN          |
| `DevicePassphrase` | Passphrase 设置页 |
| `DeviceAirgap`     | Air Gap 设置页    |

成功响应只表示目标页面或流程已打开；最终选择保留在设备端，不通过通用 `ButtonRequest` 驱动 App UI。

## 与旧 Features 的迁移关系

| 旧 Features / 设备详情语义 | Protocol V2 来源                        | 当前标准 Features/Profile                           | 调用方策略           |
| -------------------------- | --------------------------------------- | --------------------------------------------------- | -------------------- |
| label                      | `DeviceSettings.label`                  | 不自动合并                                          | 直接调用设置 API     |
| language                   | `DeviceSettings.language`               | 当前为 `null`                                       | 直接调用设置 API     |
| BLE enabled                | `DeviceSettings.bt_enable`              | 当前为 `null`                                       | 直接调用设置 API     |
| autolock delay             | `DeviceSettings.autolock_delay_ms`      | 当前为 `null`                                       | 直接调用设置 API     |
| auto shutdown delay        | `DeviceSettings.autoshutdown_delay_ms`  | 无标准 Profile 字段                                 | 直接调用设置 API     |
| haptic feedback            | `DeviceSettings.haptic_feedback`        | 无标准 Profile 字段                                 | 直接调用设置 API     |
| Passphrase enabled         | `DeviceSettings.passphrase_enable` 可读 | 以 `DeviceStatus.passphrase_enabled` 为标准状态来源 | 不从设置回填状态缓存 |

这类字段“没有出现在 DeviceInfo”并不是协议缺失，而是职责拆分。设备详情页若需要完整设置，应并行或按需调用 `deviceSettingsGet`，不能要求固件把设置重复放回 `DeviceInfo`。

## 命名与语义注意事项

- protobuf 使用 `bt_enable`，公共 SDK 历史语义通常叫 `bleEnabled`；二者属于命名映射，不应再创造第三套字段名。
- `passphrase_enable` 和 `airgap_mode` 是读取结果，修改入口是设备页面，不是 `DeviceSettingsSet`。
- `wallpaper_path` 只保存设备侧路径；图片编码、上传和覆盖策略属于壁纸业务流程。
- `autolock_delay_ms` 与 `autoshutdown_delay_ms` 是不同策略，不能合并成一个超时字段。
