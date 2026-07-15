# Protocol V1 与 Protocol V2 传输差异

> - 文档状态：当前实现
> - 最后核验：2026-07-15
> - 适用范围：Hardware JS SDK 的设备通信和 Transport 实现

本页只比较传输协议，不讨论字段如何转换为公共 Features，也不描述设置、钱包或固件升级业务流程。

## 核心差异

| 维度                | Protocol V1                                | Protocol V2                                                     |
| ------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| 当前设备范围        | Classic、Mini、Touch、Pro 等               | Pro 2                                                           |
| Transport           | USB、BLE、Bridge 等                        | WebUSB、Node USB、Electron BLE、React Native BLE、lowlevel BLE  |
| 协议探测            | 发送 `Initialize` 并等待 `Features`        | 发送带固定标识的 `Ping` 并等待 `Success`                        |
| 帧                  | `0x3F` transport chunk，消息体以 `##` 开头 | `0x5A` 变长完整帧，包含 Router、Attr、Seq 和两段 CRC8           |
| message type 字节序 | big-endian                                 | little-endian                                                   |
| schema              | current/legacy V1 schema，可在初始化后重配 | 独立 `messages-protocol-v2.json`                                |
| schema 回退         | 根据 V1 Features 选择 current/legacy       | V2 请求不得静默使用 V1 schema；只有少量历史交互响应允许兼容解码 |
| 调用状态            | 传统 Transport 请求/响应                   | 每设备维护 Link、Session、assembler、调用队列和 Sequence Cursor |
| 读写边界            | Transport chunk                            | V2 协议层负责完整 frame，BLE 等平台可在物理层继续分片           |
| 重连隔离            | 由各 Transport 的既有行为管理              | generation、assembler 和未完成调用必须随 Link 失效              |

## 协议探测

```text
Transport acquire
  -> 根据 hint/缓存选择探测顺序
  -> V1: Initialize -> Features
  -> V2: Ping("protocol-v2-probe") -> Success
  -> 记录连接对应的协议类型
```

协议探测属于 Transport。应用和 Core 业务方法不应通过 PID、设备名或 descriptor 自行猜测协议。

显式 `connectProtocol='V2'` 用于上层已经确认协议的重连路径，例如设备重启后的恢复；它不是让普通调用方手工选择协议的公共业务开关。

## 帧和字节序

V1 使用固定 transport chunk，协议消息体带 `##` 标记。V2 使用 `0x5A` 开头的变长帧，帧内包含长度、路由属性、序列号和 CRC8。

V2 的 message type 使用 little-endian。实现不能复用 V1 的 big-endian message type 解析，也不能把 V2 完整帧再次套入 V1 chunk assembler。

具体格式见 [Protocol V2 帧格式与 Schema](../v2/framing-and-schema.md)。

## Schema 选择

V1 可以在设备初始化后，根据返回的 Features 在 current/legacy schema 之间切换。

V2 编码必须从 V2 schema 查找消息名称；解码也优先使用 V2 schema。系统消息常位于 60000 以上只是编号约定，不是运行时选择 schema 的条件。

## Link 与错误恢复

Protocol V2 的公共协议层为每台设备维护：

- 请求串行队列。
- Sequence Cursor。
- V2 frame assembler。
- 当前 Link generation。
- 未完成调用和超时状态。

断开、致命读写错误或协议失配会使当前 Link 失效。重连后旧通知、旧 assembler 和旧 Promise 不能进入新的调用周期。

具体规则见 [Link、Session 与错误边界](../v2/link-and-session.md)。

## Core 和业务差异放在哪里

`DeviceInfoGet`、`DeviceStatusGet`、`DeviceSessionGet`、`Filesystem*` 和 `DeviceFirmware*` 在本目录中只作为 wire message 出现。它们如何转换为 SDK API 或组合成业务流程，分别记录在：

- [SDK Protocol V2 适配](../../sdk/protocol-v2/README.md)
- [Pro 2 字段迁移](../../sdk/protocol-v2/pro2-field-migration/README.md)
- `docs/device/`
- `docs/business/`
