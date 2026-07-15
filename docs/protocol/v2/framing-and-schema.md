# Protocol V2 帧格式与 Schema

> - 文档状态：当前线协议事实
> - 最后核验：2026-07-15
> - 实现入口：`packages/hd-transport/src/protocols/v2/`

## 帧格式

Protocol V2 使用 `0x5A` 起始字节和两段 CRC8：

```text
┌──────┬──────┬──────┬───────────┬────────┬──────┬─────┬─────────────┬─────┐
│ 0x5A │ LenL │ LenH │ HeaderCRC │ Router │ Attr │ Seq │ Payload     │ CRC │
└──────┴──────┴──────┴───────────┴────────┴──────┴─────┴─────────────┴─────┘
   1B     1B    1B        1B        1B      1B    1B    N bytes       1B
```

| 字段        | 说明                                                   |
| ----------- | ------------------------------------------------------ |
| `0x5A`      | SOF                                                    |
| `LenL/LenH` | little-endian 的完整帧长度，包含头、payload 和末尾 CRC |
| `HeaderCRC` | 对字节 0-2 计算 CRC8                                   |
| `Router`    | USB 为 `0`，BLE UART 为 `1`，socket 预留为 `2`         |
| `Attr`      | packet source 与 data type                             |
| `Seq`       | 1-255，递增并跳过 0                                    |
| `Payload`   | 2 字节 message type + protobuf bytes                   |
| `CRC`       | 对末尾 CRC 之前的完整帧计算 CRC8                       |

ACK 使用相同的帧头和 CRC，data type 为 ACK，完整长度必须为 8 字节。

## Payload

```text
┌──────────┬──────────┬────────────────────┐
│ TypeIdL  │ TypeIdH  │ Protobuf payload   │
└──────────┴──────────┴────────────────────┘
    1B         1B          N bytes
```

`messageTypeId` 是 little-endian `uint16`。

## 长度边界

| 场景               | 当前限制   | 原因                                     |
| ------------------ | ---------- | ---------------------------------------- |
| 通用 USB V2 frame  | 4608 bytes | 容纳 4000 字节文件数据及 protobuf/帧开销 |
| BLE V2 frame       | 2048 bytes | Pro2 BLE/UART 接收 FIFO 必须容纳完整帧   |
| WebUSB 文件数据块  | 4000 bytes | 由 Core 文件写入 helper 按传输选择       |
| BLE 文件写入数据块 | 1800 bytes | 为 protobuf 与帧头预留空间               |
| BLE 文件读取数据块 | 900 bytes  | 受设备 UART TX 缓冲限制                  |

“通用最大帧为 4608”不代表 BLE 可以接收同样大小的帧；BLE adapter 会使用更小的 2048 字节限制。

## CRC8

SDK 在编码时写入 header CRC 和 frame CRC，在解码时校验两者。`ProtocolV2FrameAssembler` 会在收到前 4 字节后尽早校验 header CRC，避免损坏的长度字段让接收端无限等待。

CRC8 实现在 `packages/hd-transport/src/protocols/v2/crc8.ts`。使用官方 Transport 时，应用层和原生 BLE 插件只需要原样传递字节，不要移除帧头或末尾 CRC。

## Schema 选择

V2 编码规则：

1. 始终从 `messages-protocol-v2.json` 查找消息名称。
2. 消息不存在时立即报错，不回退到 V1 schema。

V2 解码规则：

1. 先用 V2 schema 按 message type 解码。
2. 只有 V2 schema 中不存在该 type 时，才尝试 V1 schema。
3. V1 解码结果必须属于历史交互白名单：`Failure`、`ButtonRequest`、`EntropyRequest`、`PinMatrixRequest`、`PassphraseRequest`、`Deprecated_PassphraseStateRequest`、`WordRequest`。

因此，60000 是系统消息编号区间的约定，不是 schema 路由阈值。

## 主要实现

| 文件                 | 职责                                                |
| -------------------- | --------------------------------------------------- |
| `encode.ts`          | 组装帧、校验 sequence 和最大长度、写入 CRC          |
| `decode.ts`          | 校验 SOF、长度、CRC，提取 type、payload 和 sequence |
| `frame-assembler.ts` | 从 USB/BLE chunk 中提取一个或多个完整帧             |
| `protocols/index.ts` | protobuf schema 查找、编码与解码白名单              |
