# ADR-001：Protocol V2 Link 与序列号生命周期

> - 状态：已采纳
> - 决策日期：2026-07-13
> - 最后核验：2026-07-15
> - 适用范围：Protocol V2 USB、WebUSB、Electron BLE、React Native BLE 与 lowlevel BLE

## 背景

Protocol V2 响应主要依靠串行调用、消息类型和帧序号维持请求边界。若协议探测、初始化和业务调用分别创建临时 Session，序列号会重复从 1 开始，迟到通知或旧连接数据也可能被后续调用消费。

## 决策

- 每个 Transport 实例持有一个 `ProtocolV2LinkManager`。
- Link 按设备 key 隔离；同一设备的 Protocol V2 调用串行执行。
- Link 内复用 `ProtocolV2Session`、frame assembler 和平台 adapter。
- `ProtocolV2SequenceCursor` 的生命周期长于活动 Link：普通断开、重连和 Link 失效不重置序列号。
- Transport `dispose` 时才清除序列号 Cursor、调用队列和全部 Link。
- 超时、断连、I/O、generation 或帧错误属于 link-fatal，必须使当前 Link 失效并清理平台资源。
- protobuf `Failure` 等业务响应不自动判定为 link-fatal。

## 结果

- 探测、初始化和业务请求在同一 Transport 生命周期内保持单调递增的帧序号。
- 旧连接、旧 notification 和迟到响应不会继续污染新 Link。
- Link 失效后允许出现序列号间隙，但不得回退或复用旧序列号。
- 不同设备、不同 Transport 实例之间不共享序列号状态。

## 实现位置

- `packages/hd-transport/src/protocols/v2/link-manager.ts`
- `packages/hd-transport/src/protocols/v2/session.ts`
- `packages/hd-transport/src/protocols/v2/sequence-cursor.ts`
