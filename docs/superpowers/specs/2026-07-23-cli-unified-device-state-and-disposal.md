# CLI 统一设备状态与资源释放设计

## 背景

`onekey-hw get-features` 直接调用旧的 `SDK.getFeatures()`。Protocol V2 设备不支持该公共旧接口，因此 Pro2 会返回 415；与此同时，CLI 的版本号被硬编码为旧版本，SDK 的 `dispose()` 也没有完整停止 Connector、Transport 和设备池状态。

## 目标

- 为所有设备提供 `onekey-hw get-state`，直接输出公共 `getDeviceState()` 的统一状态。
- 保留 `get-features` 的旧命令和 V1 返回结构，同时让 Pro2/V2 可用于调试。
- CLI 版本始终与已安装包的 `package.json` 一致。
- `dispose()` 在 SDK 资源所有者层完成清理，使长驻进程可以安全地 dispose 后重新初始化。
- 不扩大公共 `SDK.getFeatures()` 的职责；它继续只服务 Protocol V1 兼容。

## 方案

### 状态命令

新增 `get-state`。`scope` 支持 `runtime`、`settings` 和 `firmware`，默认 `runtime`。设备搜索已经刷新动态状态，因此 `runtime` 直接复用同一次搜索的 canonical state；`settings` 和 `firmware` 再通过公共 `sdk.getDeviceState(connectId, { scope })` 读取对应扩展字段，避免默认流程重复请求 status。

设备选择统一复用一次搜索结果：显式指定 `--connect-id` 时按连接 ID 匹配；未指定时选择首个设备。搜索结果本身已经包含 SDK 生成的 `state` 与兼容 `features`，同时负责把 V1 的用户态序列号 connectId 映射到当前进程的底层 USB 设备缓存。CLI 不再在 `search` 后对每台 USB 设备额外调用 `getFeatures()`。

### 旧命令兼容

`get-features` 先搜索并识别协议：

- Protocol V1：继续调用 `sdk.getFeatures()`，保持旧返回结构及刷新行为。
- Protocol V2：返回搜索结果中由 SDK 状态投影生成的 `features`，不向设备发送不支持的 V1 指令。

该兼容仅存在于 CLI；公共 SDK 的 `getFeatures()` 仍明确拒绝 V2，避免新接入者继续依赖旧模型。

### 版本来源

Commander 的版本号运行时从 `packages/hd-cli/package.json` 读取。发布包始终包含该文件，因此无需生成第二份版本常量。

### 生命周期

`Core.dispose()` 负责停止当前 Connector、停止全部轮询、停止 Transport，并重置 DevicePool；common-connect 随后解除 Core 事件监听并清空 `_core`。清理方法保持幂等。

Transport 的 `stop()` 允许返回 Promise，以便 Node USB 在停止时取消仍在等待响应的原生 `Transfer`，再等待 Protocol V2 link 和已打开 USB 句柄完成关闭。CLI 的 `disposeSDK()` 对同步与异步实现均使用 `await Promise.resolve(sdk.dispose())`。

CLI 等待 dispose 完成后让 Node 自然退出，不再用 `process.exit()` 掩盖残留句柄。连接失败的技术细节只进入 SDK logger，stdout 始终保留给结构化 JSON 响应。

## 兼容性

- V1 App/SDK API 不变。
- Pro2 尚未发布，新增 `get-state` 是推荐调试入口。
- `KnownDevice.label` 保留旧语义，统一名称继续读取 `state.identity.displayName`。
- `get-features` 的 V2 行为只属于 CLI 兼容层，不改变 SDK 公共契约。

## 验证

- 单元测试覆盖 V1/V2 `get-features` 分流、`get-state` scope、CLI 版本以及 dispose 幂等清理。
- 运行 hd-cli、core、common-connect 与 Node USB Transport 的定向测试和构建。
- 连接 Pro2 实测 `search`、`get-state` 三种 scope、`get-features` 兼容输出以及进程退出。
