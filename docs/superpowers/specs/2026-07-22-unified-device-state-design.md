# 统一设备状态架构设计

日期：2026-07-22  
涉及仓库：`hardware-js-sdk`、`app-monorepo`  
实施分支：两个仓库的 `codex/unified-device-state`

## 1. 背景

当前设备信息在 SDK 与 App 中存在多套表达：

- SDK 的 `Features` 是扁平化运行时状态，同时混合身份、设置、版本、会话和协议原始字段。
- SDK 的 `DeviceProfile` 是 `getDeviceInfo()` 返回的结构化投影，与 `Features` 有大量重叠。
- App 同时消费 `Features`、`DeviceProfile`、Pro/Pro2 设置快照和本地数据库字段。
- 设备设置成功后，SDK 虽然可以发送 `DEVICE.FEATURES`，但 App 的数据库、状态容器和页面刷新链路并不统一。
- Pro2 的部分读取路径曾默认携带 `DeviceInfoGet.targets.status = true` 或隐式调用 `DeviceStatusGet`，导致 bootloader 模式和普通信息查询承担不必要的动态状态读取风险。

本次迁移不采用运行时双轨或渐进式内部模型。SDK 和 App 一次性迁移到唯一的 `DeviceState`。只有 Protocol V1 必需的旧 `Features` 接口继续兼容；临时增加的 Pro2 信息、状态和设置读取接口收回 SDK 内部，不再形成第二套公共模型。

## 2. 目标

1. SDK 内部只有一个设备状态真源 `DeviceState`。
2. 查询 API 和事件使用同一份状态结构。
3. Pro、Pro2 以及 Protocol V1/V2 对外提供相同接口。
4. App 不再理解协议差异，也不再同时维护 feature/profile/settings 多套对象。
5. 默认信息读取不调用 `DeviceStatusGet`，不携带 `targets.status = true`。
6. 设置和名称修改成功后，由 SDK 立即更新状态并发送事件，App 无需再次查询设备。
7. 只兼容老协议必需的 `getFeatures()`/`DEVICE.FEATURES`，不继续公开 Pro2 临时查询接口。

## 3. 非目标

1. 本次不修改底层 protobuf 协议定义；只停止上层使用即将删除的 `targets.status`。
2. 本次不保证曾直接调用 Pro2 临时原始查询接口的第三方代码无修改升级；正式业务接口统一迁移到 `getDeviceState()`。
3. 本次不统一 Ledger、Trezor 等第三方硬件自身的底层协议模型；适配器只需在统一钱包接口边界投影状态。
4. 本次不通过周期轮询保证状态新鲜度；动态状态刷新必须由明确操作或设备事件驱动。

## 4. 设计原则

### 4.1 单一真源

`Device` 实例只保存 `state: DeviceState | undefined`。所有命令响应、连接初始化、设置操作和状态刷新都转换为 `DeviceStatePatch`，再由统一状态容器合并。

### 4.2 快照优先

`DEVICE.STATE` 对外发送完整快照，而不是要求接入方合并 patch。事件仍携带 `changedKeys`，供日志、性能优化和精确刷新使用。

### 4.3 显式刷新

默认读取只返回已有状态；首次读取只补齐基础信息。只有调用者明确要求刷新某个区域时，SDK 才发送相应设备命令。

### 4.4 协议差异留在 Mapper

Protocol V1 的 `Features/OnekeyFeatures` 与 Protocol V2 的 `DeviceInfo/DeviceStatus` 只能出现在协议 Mapper 和 `raw` 字段中。业务代码不得根据协议消息字段直接分支。

### 4.5 兼容层无状态

`getFeatures()` 和 `DEVICE.FEATURES` 只服务 Protocol V1 兼容，并从 `DeviceState` 即时投影，不拥有缓存、刷新策略或合并逻辑。`getDeviceInfo()`、`deviceInfoGet()`、`deviceStatusGet()` 和 `deviceSettingsGet()` 不再属于公共 API。

## 5. 统一数据模型

```ts
export type DeviceState = {
  schemaVersion: 1;
  revision: number;
  updatedAt: number;

  protocol: 'V1' | 'V2' | 'unknown';

  identity: {
    deviceType: IDeviceType;
    firmwareType: EFirmwareType;
    model: string | null;
    vendor: string | null;
    deviceId: string | null;
    serialNo: string;
    label: string | null;
    bleName: string | null;
    displayName: string;
  };

  status: {
    mode: 'normal' | 'bootloader' | 'romloader' | 'notInitialized' | 'backupMode' | 'unknown';
    initialized: boolean | null;
    unlocked: boolean | null;
    firmwarePresent: boolean | null;
    backupRequired: boolean | null;
    noBackup: boolean | null;
    unfinishedBackup: boolean | null;
    recoveryMode: boolean | null;
    passphraseProtection: boolean | null;
    pinProtection: boolean | null;
    attachToPinEnabled: boolean | null;
    unlockedAttachPin: boolean | null;
  };

  settings: {
    language: string | null;
    bleEnabled: boolean | null;
    sdCardPresent: boolean | null;
    sdProtection: boolean | null;
    wipeCodeProtection: boolean | null;
    passphraseAlwaysOnDevice: boolean | null;
    safetyChecks: string | null;
    autoLockDelayMs: number | null;
    autoShutdownDelayMs: number | null;
    displayRotation: number | null;
    experimentalFeatures: boolean | null;
    wallpaperPath: string | null;
    brightness: number | null;
    animationEnabled: boolean | null;
    tapToWake: boolean | null;
    hapticFeedback: boolean | null;
    deviceNameDisplayEnabled: boolean | null;
    airgapMode: boolean | null;
    fidoEnabled: boolean | null;
    usbLockEnabled: boolean | null;
    randomKeypad: boolean | null;
  };

  versions: {
    firmware: string | null;
    bootloader: string | null;
    board: string | null;
    ble: string | null;
    se01?: string | null;
    se02?: string | null;
    se03?: string | null;
    se04?: string | null;
    se01Boot?: string | null;
    se02Boot?: string | null;
    se03Boot?: string | null;
    se04Boot?: string | null;
  };

  capabilities: Array<number | string>;
  verification?: DeviceVerification;
  session?: DeviceSessionState;
  raw?: DeviceRawState;
};
```

字段要求：

- 各 section 始终存在，尚未读取或协议不支持的值使用 `null`，避免调用方判断整段对象是否存在。
- `raw` 仅用于调试和底层兼容，App 业务不得依赖。
- `session` 是易失状态，不写入 App 的长期数据库。
- `revision` 在同一设备实例中单调递增，用于丢弃乱序事件。
- `updatedAt` 表示 SDK 接受最后一次状态变更的时间，不代表设备端所有字段都在该时刻读取。

## 6. SDK 内部结构

### 6.1 DeviceStateStore

`DeviceStateStore` 负责：

- 保存唯一状态。
- 深度合并明确存在的字段；`undefined` 表示不修改，`null` 表示确认没有值。
- 维护 `revision` 和 `updatedAt`。
- 统一重新计算派生字段。
- 生成 `changedKeys`。
- 在真实变化时通知 `Device` 发送事件。

禁止业务代码直接修改 `device.state`。

### 6.2 协议 Mapper

- `DeviceStateMapperV1`：将 `Features`、`OnekeyFeatures` 和设置命令响应转换为 patch。
- `DeviceStateMapperV2`：将 `DeviceInfo`、`DeviceStatus` 和设置命令响应转换为 patch。
- 两个 Mapper 输出完全相同的 `DeviceStatePatch`，不得发送事件或管理缓存。

### 6.3 兼容 Projector

- `projectFeatures(state)`：生成旧的扁平 `Features`。
- `projectKnownDevice(state, descriptor)`：生成设备列表消息。

Projector 必须是纯函数。SDK 测试需要验证旧投影与新状态的字段一致性。

## 7. 查询 API

新增：

```ts
getDeviceState(
  connectId?: string,
  params?: CommonParams & {
    refresh?: Array<'identity' | 'status' | 'settings' | 'versions' | 'verification'>;
    includeRaw?: boolean;
  },
): Response<DeviceState>;
```

默认 `refresh` 为空：

- 已有缓存时直接返回。
- 没有缓存时执行最小初始化。
- Protocol V1 可以使用协议本身要求的 `Initialize/GetFeatures`。
- Protocol V2 使用不带 `targets.status` 的 `DeviceInfoGet` 获取基础信息。
- 不发送额外的 `DeviceStatusGet`。

当 `refresh` 包含 `status` 时：

- 仅 Protocol V2 normal 模式允许调用 `DeviceStatusGet`。
- bootloader、romloader 模式直接返回已有状态，未读取字段保持 `null`。
- Protocol V1 按其原生能力刷新，但不得额外构造 Protocol V2 状态命令。

当多个区域需要刷新时，由协议 Mapper 合并能共用的命令，避免重复读取。

公共 API 边界：

- 正式设备状态查询只暴露 `getDeviceState()`。
- `getFeatures()` 仅作为 Protocol V1 兼容入口。
- `DeviceInfoGet`、`DeviceStatusGet`、`DeviceSettingsGet` 的 command class 和协议类型保留在 SDK 内部，供 `Device`、固件和设置流程调用。
- 不在 `CoreApi`、`inject()` 或公共 `api/index.ts` 中暴露 `getDeviceInfo()`、`deviceInfoGet()`、`deviceStatusGet()`、`deviceSettingsGet()`。

## 8. 事件模型

新增：

```ts
DEVICE.STATE = 'state';

type DeviceStateEvent = {
  connectId: string | null;
  state: DeviceState;
  revision: number;
  source: DeviceStateUpdateSource;
  changedKeys: string[];
};
```

事件来源至少包括：

- `initialize`
- `device-info`
- `device-status`
- `apply-settings`
- `change-pin`
- `unlock`
- `passphrase`
- `firmware-update`
- `transport-reconnect`
- `compatibility`

设置命令成功后，SDK 必须先更新状态，再发送 `DEVICE.STATE`。App 不需要通过 `getDeviceState()` 回读确认。

Protocol V1 兼容事件 `DEVICE.FEATURES` 从同一次状态快照即时投影。它不能反过来修改状态，也不能拥有独立发送路径；Protocol V2 不发送该事件。

## 9. 名称语义

统一定义：

```ts
displayName = label || bleName || modelDisplayName;
```

- `label` 是用户在设备上修改的名称，优先用于 UI。
- `bleName` 是连接和发现名称，不应覆盖用户标签。
- `KnownDevice.name` 暂时保留发现语义，可以继续使用 `bleName || label || fallback`。
- App 所有可见名称必须使用 `state.identity.displayName`。

改名成功链路：

```text
ApplySettings(label)
  -> DeviceStateMapper 生成 identity.label patch
  -> DeviceStateStore 重算 displayName
  -> DEVICE.STATE
  -> App store + DB
  -> UI 自动刷新
```

## 10. DeviceStatusGet 与 boot 模式

必须满足以下硬性约束：

1. `DeviceInfoGet` 的业务调用不得携带 `targets.status = true`。
2. 普通连接、设备列表、设备详情、固件检测和设置页面初始化不得默认调用 `DeviceStatusGet`。
3. bootloader 和 romloader 模式不得调用 `DeviceStatusGet`。
4. 只有明确请求 `refresh: ['status']` 或必须确认动态状态的设备交互流程才能调用状态命令。
5. 固件升级流程需要的模式判断优先使用已确认的 `state.status.mode` 和命令响应，不通过无条件状态轮询实现。

## 11. App 迁移

### 11.1 类型与服务

App 一次性执行：

- `IOneKeyDeviceFeatures` 替换为 SDK `DeviceState` 或必要的 section 类型。
- `DeviceProfile` 消费点替换为 `DeviceState`，并删除该公共类型。
- `ServiceHardware.getFeatures/getDeviceInfo` 的内部调用替换为 `getDeviceState`。
- 新增 `ServiceHardware.getDeviceState`，OneKey 业务不保留 `getDeviceInfo` 薄包装。
- Pro/Pro2 设置管理器只读取 `state.settings`。
- 固件检测只读取 `state.identity`、`state.status` 和 `state.versions`。

### 11.2 事件和 UI 刷新

App 监听 `DEVICE.STATE` 后按以下顺序处理：

1. 按 `connectId/deviceId/serialNo` 解析数据库设备。
2. 检查 revision，丢弃同一 SDK 会话中的乱序旧事件。
3. 持久化可持久化 section。
4. 更新设备 atom/store 中的状态快照。
5. 发送 App 内部 `HardwareDeviceStateUpdate`。
6. 设备详情、重命名、设置和固件页面通过统一 selector 自动刷新。

数据库写入不能代替内存状态更新，否则会再次出现改名后当前页面不刷新的问题。

### 11.3 数据库迁移

- 增加 `deviceState` 字段并存储去除 `session/raw` 后的状态。
- 数据库升级时，将已有 `features` JSON 转换为 `DeviceState`。
- 迁移完成后不再双写 `features`。
- 运行时代码不得优先读取旧字段；旧字段只允许出现在一次性数据库迁移器中。

## 12. 兼容策略

SDK 暂时保留的老协议兼容面：

- `Features` 类型。
- `getFeatures()`。
- `DEVICE.FEATURES`。

兼容实现规则：

- Protocol V1 的 `getFeatures()` 调用统一的 `getDeviceState()` 刷新/读取逻辑，再通过 Projector 返回旧结构。
- 旧参数转换为对应的 `refresh` 区域，不允许维护独立查询策略。
- 旧事件仅在 Protocol V1 下由 `DEVICE.STATE` 同步投影产生。
- 文档把 `getFeatures()` 标记为 Protocol V1 compatibility/deprecated；新接入统一使用 `getDeviceState()`。

`DeviceProfile/getDeviceInfo` 以及 Pro2 原始读取方法本次直接从公共 API 删除，但底层 command class 继续作为内部实现存在。

## 13. 错误处理

- 最小初始化失败且不存在缓存时，查询返回原始设备错误。
- 显式刷新某一区域失败但已有缓存时，不静默伪装为新数据；沿用 API 错误语义，缓存保持不变。
- 设置命令失败时不得乐观更新状态。
- 事件监听器失败不能影响 SDK 命令成功结果。
- 数据库持久化失败需要记录日志，但 App 内存状态仍接受 SDK 的新快照，避免 UI 显示旧值。

## 14. 测试策略

### 14.1 SDK

- V1 `Features` 到 `DeviceState` 映射。
- V2 `DeviceInfo/DeviceStatus` 到 `DeviceState` 映射。
- patch 合并、`null/undefined` 语义和 revision。
- 设置与改名命令成功后的状态事件。
- `displayName` 优先级。
- 默认 `getDeviceState()` 不调用 `DeviceStatusGet`。
- bootloader/romloader 即使显式请求普通信息也不调用状态命令。
- 所有业务 `DeviceInfoGet` 不包含 `targets.status`。
- V1 `getFeatures/DEVICE.FEATURES` 与新状态投影一致，V2 明确拒绝 `getFeatures` 且不发送兼容事件。
- 公共 API 不包含 `getDeviceInfo/deviceInfoGet/deviceStatusGet/deviceSettingsGet`。
- USB/BLE 重连保留已确认身份和设置，同时清理 session 易失字段。

### 14.2 App

- `DEVICE.STATE` 同时更新数据库和内存 store。
- 改名事件立即更新设备详情 UI 使用的数据源。
- Pro/Pro2 设置使用同一 selector。
- 数据库旧 `features` 到 `deviceState` 的一次性迁移。
- revision 乱序保护。
- 固件升级 boot 模式不触发状态查询。
- 旧 App 服务包装不保存第二份状态。

### 14.3 回归验证

- SDK 单元测试、类型检查、lint、build。
- App 相关 Jest 测试、完整 TypeScript、oxlint、oxfmt。
- 手动验证 USB 与 BLE 的连接、改名、重启、设置、固件升级入口。

## 15. 实施顺序

1. SDK 定义 `DeviceState`、Store、Mapper 和 Projector，并以测试固定行为。
2. SDK 将 `Device` 内部缓存、查询和事件迁移到唯一状态。
3. SDK 接入设置、解锁、passphrase、固件等状态变化来源。
4. SDK 增加新 API/事件，仅为 Protocol V1 保留 `Features` 兼容投影，并收回 Pro2 原始查询接口。
5. App 接入 SDK 新版本和 `DEVICE.STATE`。
6. App 迁移服务、数据库、状态容器、设置和设备详情页面。
7. 删除 App 内部旧 Features/Profile 运行时路径和重复设置快照。
8. 执行全量验证，并针对 boot 模式和改名刷新做专项回归。

## 16. 验收条件

- SDK 内部搜索不到作为状态容器使用的 `device.features`。
- App 业务代码不再以 `Features` 或 `DeviceProfile` 作为主状态模型。
- 设置和改名后无需额外查询，当前页面即可刷新。
- 默认所有流程不调用 `DeviceStatusGet`。
- bootloader/romloader 流程不调用 `DeviceStatusGet`。
- 业务代码不再构造 `targets.status = true`。
- 新 API 与新事件结构一致。
- Protocol V1 旧 SDK API 从新状态即时投影。
- Pro2 信息、状态和设置读取仅在 SDK 内部存在，外部接入无需理解协议命令。
- App 数据库只持久化一份设备状态。

## 17. 事件消费与兼容语义补充

1. `DEVICE.STATE` payload 是 App 内存态的即时真值。设备详情页必须直接用事件中的完整 state 更新 snapshot，不能先回读数据库再覆盖事件状态。
2. 依赖数据库重新查询的消费者只能在对应状态持久化完成后收到通知；持久化失败时仍发送事件，但不得让失败阻断 SDK 命令结果。
3. 同一物理设备的持久化队列优先使用 serialNo，其次 deviceId，最后才使用可能随传输变化的 connectId。
4. Protocol V1 的 `getFeatures()` 保留“访问设备并获得新快照”的兼容语义；App 的 `getFeaturesWithoutCache()` 也必须触发真实刷新。
5. 未读取 `DeviceStatusGet` 时，`null` 表示未知，UI 不得把未知状态转换成明确的 `false` 并标记为已确认。
6. 显式请求刷新某个 section 时，SDK 不得静默把读取失败伪装成刷新成功；调用方可以选择跳过不可读取的 section，或处理明确错误。
