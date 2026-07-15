# Transport 总览与协议探测

> - 文档状态：当前实现
> - 最后核验：2026-07-15

## 职责边界

公共 `hd-transport` 协议层负责 V1/V2 编解码、V2 Session、Link、sequence、超时和帧组装。具体 Transport 只负责平台连接、原生读写、订阅、endpoint/characteristic 发现和错误映射。

| Transport        | V1   | V2         | 平台职责                                                   |
| ---------------- | ---- | ---------- | ---------------------------------------------------------- |
| WebUSB           | 支持 | 支持       | 浏览器授权、USB interface/endpoint、`transferIn/out`       |
| Node USB         | 支持 | 支持       | libusb open/claim、endpoint 读写                           |
| Electron BLE     | 支持 | 支持       | noble 连接、订阅、hex 写入和通知                           |
| React Native BLE | 支持 | 支持       | BLE PLX service/characteristic、base64 写入和通知          |
| lowlevel BLE     | 支持 | 支持       | 原生桥接 `enumerate/connect/send/receive`，JS 负责协议重组 |
| HTTP/Emulator    | V1   | 当前不支持 | 单协议 Transport，`getProtocolType()` 返回 V1              |

## 自动协议探测

当前 V2 acquire probe 是：

```text
Ping { message: "protocol-v2-probe" } -> Success
```

V1 probe 是：

```text
Initialize -> Features
```

普通连接的顺序：

1. 有 V2 hint 或连接缓存为 V2：先探测 V2，失败后清理 probe 状态，再探测 V1。
2. 其他情况：先探测 V1，失败后清理 probe 状态，再探测 V2。
3. 两者都失败：抛出协议探测错误，不把未知设备默认为 V1。

设备名、PID 和 descriptor 只能影响探测顺序或 I/O 路由，不能作为最终协议结论。

## 显式协议参数

- `connectProtocol='V1'`：实际验证 V1；不匹配时抛错。
- `connectProtocol='V2'`：表示上层已经确认协议，常用于固件升级重启后的重连；Transport 记录 V2 并跳过重复 probe。

显式 V2 是受控重连优化，不应被普通应用用作静态设备型号判断。

## 探测失败后的清理

V1 和 V2 使用不同的分包与接收状态。第一次 probe 失败后，Transport 必须清理可能残留的 assembler、pending frame、订阅 token 或 USB 连接，再尝试另一套协议。BLE 通常需要重新订阅；WebUSB/Node USB 通常需要 reset 或重建连接状态。

## 探测结果交接

Transport 探测成功后，将协议类型写入连接缓存和设备 descriptor，供上层选择后续初始化流程。Transport 的职责到协议识别和连接状态维护为止，不负责构建 Features 或调用业务 API。

上层如何消费探测结果见 [SDK Protocol V2 适配](../../sdk/protocol-v2/README.md)。
