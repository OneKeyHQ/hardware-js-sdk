# 实时设备状态与身份边界设计

日期：2026-07-23
涉及仓库：`hardware-js-sdk`、`app-monorepo`
实施分支：两个仓库的 `codex/unified-device-state`

## 1. 设计结论

公共设备状态 API 收敛为一个 `getDeviceState()`。在 normal 模式下，它默认读取实时 runtime status；在 bootloader 或 romloader 模式下，它自动跳过不受支持的 `DeviceStatusGet`，只返回 `DeviceInfoGet` 可以确认的状态。

`refreshDeviceState()` 从公共 API 删除。设置和固件详情通过 `getDeviceState()` 的语义 scope 获取：

```ts
getDeviceState(connectId);
getDeviceState(connectId, { scope: 'settings' });
getDeviceState(connectId, { scope: 'firmware' });
```

该设计替代 `2026-07-22-unified-device-state-design.md` 中“默认缓存读取 + 独立 `refreshDeviceState()`”的查询策略。旧文档的数据模型、单一真源、协议 Mapper、事件来源和 V1 兼容边界继续有效。

## 2. 目标

1. 调用者只需理解 `getDeviceState()`，不必区分缓存读取、status 刷新和协议版本。
2. normal 模式下返回的 `deviceId`、`initialized` 和 `unlocked` 是本次调用确认的实时值。
3. bootloader 和 romloader 永远不发送 `DeviceStatusGet`。
4. SDK 在执行依赖 `deviceId` 的业务方法前完成实时身份校验，App 不承担安全前置调用责任。
5. 同一物理设备重置后产生的新钱包身份不会污染旧钱包记录。
6. 设备自动锁屏、名称修改和部分状态事件可以正确反映到 App。
7. Classic 1S、Touch、Pro 和 Pro2 对 App 暴露相同语义，协议差异留在 SDK。

## 3. 非目标

1. 不恢复 `DeviceInfoGet.targets.status`；该字段将被协议删除。
2. 不把 `DeviceInfoGet`、`DeviceStatusGet` 或 `DeviceSettingsGet` 暴露为公共 Core API。
3. 不对设备状态进行后台定时轮询。
4. 不在本次设计中修改 Wallet Session 的建立、恢复或缓存策略。
5. 不改变第三方硬件适配器的公共行为。

## 4. 公共 API

### 4.1 类型

```ts
export type GetDeviceStateParams = CommonParams & {
  scope?: 'runtime' | 'settings' | 'firmware';
};

getDeviceState(
  connectId: string,
  params?: GetDeviceStateParams,
): Response<DeviceState>;
```

默认 scope 为 `runtime`。`scope` 表示调用者额外需要的数据集合，不表示排除 runtime。

不公开 `cached`、`includeRaw`、`refreshSections` 等内部参数。SDK 内部可以保留无 I/O 的状态快照读取方法，但它不能成为普通接入者需要理解的第二套 API。

### 4.2 normal 模式

| 调用 | V1 | V2 |
|---|---|---|
| `getDeviceState()` | `GetFeatures` | 首次最小 `DeviceInfoGet`，随后本次调用执行 `DeviceStatusGet` |
| `{ scope: 'settings' }` | `GetFeatures` | runtime status + `DeviceSettingsGet` |
| `{ scope: 'firmware' }` | `GetFeatures` + `OnekeyGetFeatures` | runtime status + 完整版本/校验 `DeviceInfoGet` |

每次公开 `getDeviceState()` 都产生一次可追溯的实时读取。SDK 可以在同一个请求内部合并重复工作，但不能跨请求用 TTL 缓存替代身份或锁屏确认。

### 4.3 bootloader 与 romloader

协议模式由最小 `DeviceInfoGet` 确认。

- `getDeviceState()`：返回 basic DeviceInfo 状态，不请求 status。
- `{ scope: 'firmware' }`：请求完整 DeviceInfo，不请求 status。
- `{ scope: 'settings' }`：返回明确的“不支持当前模式”错误，不请求 settings 或 status。

设备发现和 `searchDevices()` 保持 basic-only，不因为该公共 API 改动而默认发送 `DeviceStatusGet`。

## 5. SDK 内部数据流

### 5.1 普通状态读取

```text
getDeviceState(scope)
  -> acquire / protocol detection
  -> ensure basic DeviceInfo when required
  -> loader mode?
       yes -> skip status
       no  -> read DeviceStatus
  -> optional settings or firmware detail
  -> merge DeviceStatePatch
  -> emit DEVICE.STATE for real changes
  -> return public DeviceState snapshot
```

### 5.2 身份敏感方法

所有设置了 `checkDeviceId = true` 且携带 expected `deviceId` 的 V2 方法，在比较前执行一次内部实时 status 读取：

```text
business method(expectedDeviceId)
  -> initialize basic info
  -> read live DeviceStatus
  -> compare live deviceId with expectedDeviceId
  -> mismatch: fail before device business command
  -> match: continue unlock/passphrase/business lifecycle
```

该读取不能触发 PIN，也不能因已有缓存 ID 相同而跳过。它用于同时避免新实例的空 ID 误判和重置后的旧缓存误判。

### 5.3 只读方法的锁屏策略

以下只读入口统一使用 `unlockPolicy = 'none'`：

- `GetDeviceState`
- SDK 内部状态读取调度器
- 内部 `DeviceInfoGet`
- 内部 `DeviceStatusGet`
- 内部 `DeviceSettingsGet`

读取锁定状态本身不得请求 PIN。自动解锁只允许发生在签名、设置写入、设备页面操作或显式 `deviceUnlock()` 等用户交互方法中。

`getFeaturesWithUnlock()` 作为 App 旧流程兼容入口时，必须先读取 runtime，再以 `unlocked === false` 判断是否解锁；不得把 `null` 或 `undefined` 当作 locked。

## 6. 状态字段语义

### 6.1 身份字段

| 字段 | 语义 | 重置影响 |
|---|---|---|
| `serialNo` | 物理设备身份 | 不变化 |
| `deviceId` | 当前种子/钱包身份 | 变化 |
| `connectId` | 传输路由 | 可能变化 |

`deviceId` 只能来自真实 status 或 V1 Features，不能由 serialNo、connectId 或 label 推导。

### 6.2 名称字段

```text
displayName = label || bleName || modelDisplayName
```

- `label` 来自设备 settings，是 App 可见名称的第一优先级。
- `bleName` 是发现和连接名称。
- `SearchDevice.name` 可以继续保持发现语义；业务 UI 使用 `state.identity.displayName`。
- 设置 label 成功后，SDK 先更新 DeviceState，再发送事件；不要求为了名称刷新读取 status。

### 6.3 status 新鲜度

公开 `getDeviceState()` 成功返回 normal 状态，即代表 runtime 已在本次调用刷新。App 不通过 `null` 猜测是否应刷新。

SDK 搜索结果中的 basic state 仍允许 runtime 字段为 `null`。它只用于展示候选设备，不能直接用于钱包身份绑定或“已解锁”判断。

## 7. 重置检测与 App 持久化

App 接收状态事件时先解析物理设备，再验证钱包身份：

1. serialNo、connectId 用于定位候选物理设备记录。
2. 如果 DB `deviceId` 和事件 `deviceId` 都非空且不相等，判定为 reset/new identity。
3. reset 事件不得合并到旧 `IDBDevice.deviceState`，也不得更新旧钱包页面的状态快照。
4. App 触发现有的钱包 deprecated/reset 提示流程。
5. 新钱包创建时使用 live status 返回的 deviceId 创建新的 DB device/wallet 关联。

如果任意一侧 deviceId 为空，事件只能更新不依赖钱包身份的 basic 字段；不能用空 ID 覆盖已确认的 DB deviceId。

## 8. 事件合并

SDK 继续发送完整 `DEVICE.STATE` 快照和 `changedKeys`。完整快照表示当前 SDK Device 实例所知的状态，不保证新实例已经读取所有 section。

App 因此不能直接用事件快照替换长期状态，而应：

1. 以当前内存 snapshot 或持久化 state 为 base。
2. 只应用 `changedKeys` 指定的字段。
3. 忽略 `raw`、`session` 等非持久字段。
4. 重新计算 `identity.displayName`。
5. 使用 event revision/order 队列避免同一连接事件乱序。

该规则同时用于 DB 和设备详情 atom，保证 basic 事件不会把已确认的 `deviceId`、`unlocked` 或 settings 重新覆盖为 `null`。

## 9. App 调用边界

- 搜索页面：使用 `searchDevices()`，不补 status。
- 用户选中设备、创建钱包前：调用默认 `getDeviceState()`。
- 设备详情进入或重新获得焦点：调用 `{ scope: 'settings' }`，一次得到 live runtime 和 settings。
- 固件页面：调用 `{ scope: 'firmware' }`。
- 签名、取地址和取公钥：App 正常传递 DB deviceId；SDK 内部负责 live identity preflight。
- 改名或设置写入：消费 SDK 状态事件，不重复查询；如果跨线程事件尚未到达，页面保持当前值直到同一事件队列完成，不从旧 DB 快照回滚。

App 删除 `refreshDeviceState()` wrapper 和调用点。Pro2-only 的设备管理 snapshot 收敛为 OneKey 通用 snapshot，协议差异由 SDK 处理。

## 10. 错误处理

- loader 模式请求 settings：明确返回 mode-not-supported，不尝试 status 或 unlock。
- normal 模式 status 读取失败：`getDeviceState()` 返回失败，不把旧缓存包装为实时成功。
- expected/live deviceId 不一致：沿用 `DeviceCheckDeviceIdError`，并确保错误发生在业务命令之前。
- 只读请求遇到 locked：返回设备实际响应；SDK 不自动弹 PIN。
- App 持久化失败：内存事件仍可广播，但不得把失败解释为设备重置；日志记录 connectId、serialNo 和 revision，敏感 ID 使用现有脱敏策略。

## 11. 测试与验收

### SDK

1. normal V2 的默认 `getDeviceState()` 每次调用一次 `DeviceStatusGet`。
2. bootloader/romloader 默认和 firmware scope 都不调用 status。
3. settings scope 调用 status + settings，且 locked 时不调用 unlock。
4. firmware scope 在 normal 调用 status + full DeviceInfo。
5. `checkDeviceId` 在比较前读取 live status；相同 ID 继续，不同 ID 在业务命令前失败。
6. 已缓存旧 ID、设备 status 返回新 ID 时不能通过校验。
7. V1 默认读取和 scopes 保持 GetFeatures/OnekeyGetFeatures 兼容。
8. 公共 CoreApi 不再包含 `refreshDeviceState` 和原生 V2 读取方法。

### App

1. 钱包创建必须使用含非空 live deviceId 的状态。
2. 同 serialNo、同 deviceId 的事件正常增量合并。
3. 同 serialNo、不同非空 deviceId 的事件不写旧记录并触发 reset 流程。
4. basic 部分事件保留已确认的 deviceId/status/settings。
5. 设备详情读取 settings scope，并在自动锁屏后显示 `unlocked: false`。
6. label 事件更新 DB name、设备详情标题和管理列表。
7. Classic 1S、Touch、Pro、Pro2 使用同一 App 调用路径。

### 实机

1. Pro2 normal：默认 state 返回 deviceId、initialized 和当前 unlocked。
2. Pro2 locked：读取 state/settings 不弹 PIN。
3. Pro2 bootloader/romloader：没有 `DeviceStatusGet` 日志。
4. 修改 label 后 App 页面自动更新。
5. 设备 reset 后旧钱包显示 reset/deprecated，新设备可以创建新钱包记录。

## 12. 迁移策略

Pro2 尚未发布，本次直接迁移，不保留 `refreshDeviceState()` 的弃用壳或临时 Pro2 读取 API。Protocol V1 的 `getFeatures()` 和 `DEVICE.FEATURES` 继续作为旧协议兼容投影，但 App 的 OneKey 主流程不再依赖它们。
