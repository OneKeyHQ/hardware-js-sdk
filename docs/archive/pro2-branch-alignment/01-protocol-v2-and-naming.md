# Protocol V2 与命名对齐

## 1. Schema 命名

旧的 `latest` / `v1` 命名无法表达“协议版本”和“schema 新旧”两个维度，当前分支改为：

| 新名称 | 含义 | 数据来源 |
| --- | --- | --- |
| `v1CurrentSchema` | 当前 Protocol V1 schema | `messages.json` |
| `v1LegacySchema` | 旧设备使用的 Protocol V1 schema | `messages_legacy_v1.json` |
| `v2Schema` | Pro2 Protocol V2 schema | `messages-protocol-v2.json` |

对应类型从 `MessageVersion` 调整为 `ProtocolV1MessageSchema` / `ProtobufMessageSchema`，选择函数改为 `getSupportProtocolV1MessageSchema`。

## 2. Protocol V2 消息边界

V2 系统消息使用 60000 以上的消息 ID，并新增以下核心组：

- 协议与探活：`ProtocolInfoRequest`、`Ping`
- 设备信息：`DeviceInfoGet` -> `DeviceInfo`
- 动态状态：`DeviceStatusGet` -> `DeviceStatus`
- 钱包会话：`DeviceSessionGet` -> `DeviceSession`
- PIN 解锁：`DeviceSessionAskPin` -> `DeviceSessionPinResult`
- 设置：`DeviceSettingsGet/Set/PageShow`
- 文件系统：`FilesystemFileRead/Write`、目录和 PathInfo
- 固件：`DeviceFirmwareUpdateRequest`、状态查询

V2 编码必须从 `v2Schema` 查找消息；解码仅对少量历史交互消息允许回退到 V1 schema，例如 `ButtonRequest`、`PassphraseRequest` 和已废弃的 passphrase state 消息。

## 3. 传输层变化

Protocol V2 使用独立的帧格式、CRC8、序列号和会话：

- 帧头以 V2 framing 处理，不复用 V1 packet assembler。
- sequence 范围为 1-255，按连接会话维护并跳过 0。
- USB 与 BLE 均通过 link manager 管理连接代际和失效。
- 重连后旧 generation、assembler 和未完成请求必须失效，避免旧通知污染新会话。
- `typedCall` 会把预期响应类型传给 transport，降低并发或异步响应时的误匹配。

## 4. 对外命名原则

- 公共 SDK 方法使用小驼峰，例如 `deviceInfoGet`、`deviceStatusGet`。
- protobuf 消息保留固件定义，例如 `DeviceInfoGet`、`DeviceStatusGet`。
- 文件 API 同时提供短名称和历史/显式名称：`fileWrite` 与 `filesystemFileWrite` 指向同一实现。
- 协议字符串统一使用 `'V1' | 'V2'`，Pro2 重连时显式传入 `V2`，不依赖再次猜测。

## 5. 关键代码

- `packages/core/src/data-manager/DataManager.ts`
- `packages/core/src/data-manager/MessagesConfig.ts`
- `packages/hd-transport/src/protocols/index.ts`
- `packages/hd-transport/src/protocols/v2/`
- `packages/core/src/api/protocol-v2/`

## 6. 对齐要求

固件 proto、`packages/hd-transport/messages-protocol-v2.json` 与 `packages/core/src/data/messages/messages-protocol-v2.json` 必须来自同一版本。消息 ID、字段名或 enum 有任一侧不一致，TypeScript 能编译但运行时仍可能出现 unexpected response 或字段为空。
