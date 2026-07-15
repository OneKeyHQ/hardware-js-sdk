# ADR-002：Protocol V2 公共协议层与 Transport 边界

> - 状态：已采纳
> - 决策日期：2026-07-13
> - 最后核验：2026-07-15
> - 适用范围：`hd-transport` 及各 USB/BLE Transport

## 背景

Protocol V2 的编码、帧重组、超时、序列号和 Link 生命周期如果分别散落在每个 Transport 中，会导致 USB、WebUSB 和多种 BLE 实现产生不同的错误恢复与重试语义。

## 决策

- 公共层负责 protobuf encode/decode、帧组装、调用串行化、超时、序列号和 Link 生命周期。
- Transport adapter 只负责平台连接、原生读写、notification/endpoint 管理和平台错误映射。
- Node USB 与 WebUSB 复用 `ProtocolV2UsbTransportBase`，通过抽象 hook 接入各自的原生 I/O。
- USB 每次 open、claim、reset 或 reconnect 都轮换 generation；旧 generation 的读写必须立即失败。
- Link-fatal 错误先使 Link 失效，再取消读取、重置 assembler、关闭原生连接并清理协议缓存。
- Protocol V2 业务命令不在 Transport 层自动重发。文件写入、固件安装等操作可能具有副作用，SDK 无法确认设备是否已处理失败前的请求。
- 只允许在尚未发送业务帧的连接准备阶段，或同一 generation 内等待输入时进行平台级恢复。

## 结果

- USB 与 BLE 使用一致的 Protocol V2 调用模型和错误边界。
- 迟到的异步 I/O 通过 generation 与 cancellation 隔离。
- 新增 Transport 时只需实现平台 adapter，不需要复制协议状态机。
- 业务重试由明确了解幂等性的上层流程决定。

## 实现位置

- `packages/hd-transport/src/protocols/v2/usb-transport-base.ts`
- `packages/hd-transport/src/protocols/v2/link-manager.ts`
- `packages/hd-transport/src/protocols/v2/frame-assembler.ts`
