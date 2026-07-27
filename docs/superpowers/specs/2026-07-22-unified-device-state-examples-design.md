# 统一 DeviceState Examples 设计

## 背景

SDK 已将 `getDeviceState()` 定义为 Protocol V1 与 Protocol V2 的统一设备信息入口，
`getFeatures()` 仅保留 Protocol V1 兼容语义。当前 `expo-playground` 与
`expo-example` 虽然已经展示 `getDeviceState`，但设备选择、连接信息补全和部分状态刷新
仍默认调用 `getFeatures()`，导致示例向接入者暴露两套状态模型，并使 Pro2 路径依赖一个
明确不支持 Protocol V2 的兼容 API。

## 目标

1. 正式示例只使用 `getDeviceState()` 读取设备身份、版本、设置和运行状态。
2. `getFeatures()` 只出现在明确标注为 Protocol V1 compatibility 的入口和专项测试中。
3. Pro2 示例不公开 `DeviceInfoGet`、`DeviceStatusGet`、`DeviceSettingsGet` 的原始命令心智模型。
4. examples 保存统一的 `DeviceState`，不再为 Pro2 构造第二套 `Features` 或 `DeviceProfile`。
5. 默认读取不刷新 status；需要运行状态时必须由示例参数显式请求 `refresh: ['status']`。

## 非目标

- 不迁移明确验证 Protocol V1、bootloader、transport 或会话兼容行为的自动化测试。
- 不删除 SDK 的 V1 `getFeatures()` 公共兼容入口。
- 不在本次重写所有 developer portal 历史迁移文档；正式 API 文档保持
  `getDeviceState()` 优先、`getFeatures()` V1-only。
- 不把底层 Protocol V2 command class 暴露回公共 API。

## 方案

### Expo Playground

设备连接补全流程调用 `getDeviceState(connectId)`，并使用：

- `state.identity.serialNo` 更新设备 `uuid`；
- `state.identity.deviceId` 更新钱包状态标识；
- `state.identity.deviceType` 更新设备类型；
- `state.identity.label` 更新用户标签；
- `state.identity.bleName || state.identity.label` 作为连接列表名称；
- `state.identity.displayName` 作为面向用户的显示名称。

Playground store 增加 canonical `deviceState`。仍需兼容旧 UI 的 `features` 字段只允许保存
Protocol V1 的真实 `Features`，不得从 Pro2 `DeviceState` 反向构造伪 `Features`。

方法执行后的设备信息刷新统一调用 `getDeviceState()`。Passphrase 判定优先读取
`deviceState.status.passphraseProtection`；未知状态保持 `undefined`，不隐式调用
`getFeatures()` 或 `DeviceStatusGet` 猜测。

`getDeviceState` 提供四组示例：

1. Cached state：不发送刷新请求；
2. Identity and versions：显式刷新 `identity`、`versions`；
3. Settings：显式刷新 `settings`；
4. Runtime status：显式刷新 `status`，并提示仅 normal mode 可用。

`getFeatures` 保留在方法列表，但名称与说明明确标记为 Protocol V1 compatibility。

### Pro2 Debug

Pro2 Debug 页面继续展示公开的高层 SDK 方法以及必要的底层 wire 说明，但不提供已从公共
API 删除的原始 Info/Status/Settings 查询入口。

`getDeviceState` 的 wire 信息按 refresh section 描述：identity/versions/verification 可能发送
`DeviceInfoGet`，settings 可能发送 `DeviceSettingsGet`，status 只有显式请求且设备处于
normal mode 时发送 `DeviceStatusGet`。Cached state 不应描述为必然发送 `DeviceInfoGet`。

设置写入继续使用协议中立的 `deviceSettings`/`deviceSettingsPageShow` 等公开方法；成功后
依赖 SDK `DEVICE.STATE` 事件或再次读取 `getDeviceState()`，不直接读取原始 settings API。

### Expo Example

设备列表选中设备后使用 `getDeviceState()` 建立统一快照，不再默认调用 `getFeatures()`。
Basic API 将 `getDeviceState` 放在正式设备信息入口位置，并将 `getFeatures` 标记为 V1-only。
Pro2 页面只展示 canonical state 的 cached 和显式 refresh 示例。

下列测试工具继续保留 `getFeatures()`：

- 明确测试 V1 Initialize/GetFeatures 的功能测试；
- bootloader 与固件升级兼容流程；
- transport 帧清理、重试与会话计数专项测试；
- 依赖真实 V1 `Features` 字段验证旧固件行为的自动化测试。

保留处增加 V1 compatibility 注释，防止后续将其误认为通用接入示例。

## 数据流

```text
searchDevices
  -> select/hydrate device
  -> getDeviceState(cached or explicit refresh)
  -> store.deviceState
  -> identity/status/settings/versions consumers

Protocol V1 compatibility tool
  -> getFeatures
  -> store.features (V1 only)
```

examples 不监听或 mock 一套新的 features 事件。SDK 的 `DEVICE.STATE` 是状态变化事件；页面
需要主动刷新时复用事件 payload 或再次读取 canonical snapshot。

## 错误处理

- `getDeviceState()` 失败时保留搜索结果与已有 snapshot，不用 `getFeatures()` 静默兜底。
- settings/status 显式刷新失败时展示 SDK 错误；cached identity 仍可继续用于设备列表。
- bootloader/romloader 模式不发送 status refresh。
- 未知 boolean 保持 `undefined`，UI 使用 disabled/unknown 表达，不转换为 `false`。

## 测试

1. Playground 方法配置测试断言 `getDeviceState` 四类预设及 `getFeatures` V1-only 文案。
2. 设备 hydration 测试断言调用 `getDeviceState`，且名称优先级分别为连接名和显示名语义。
3. Passphrase helper 测试断言从 canonical status 读取，未知值不触发兼容 API。
4. Pro2 Debug 测试断言不公开原始 Info/Status/Settings 查询，并正确描述显式 refresh。
5. Expo Example 数据配置与设备选择测试断言通用路径不调用 `getFeatures()`。
6. 运行 expo-playground、expo-example 的 TypeScript 检查及相关 Jest 测试。

## PR 边界

- SDK PR：统一状态核心改造、文档、expo-playground 和 expo-example 示例迁移，base 为
  `feat/pro2-usb-ble`。
- App PR：App 的 canonical state 消费、持久化/事件同步、详情页刷新、Pro2 设置与上游
  portfolio/brightness 合并，base 为 `feat/pro2-usb-ble`。

两个 PR 不互相复制业务逻辑。App PR 依赖 SDK PR 提供的 `DeviceState` 公共契约。
