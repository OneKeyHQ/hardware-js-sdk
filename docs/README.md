# OneKey Hardware SDK 文档索引

本目录按“先架构、再传输协议、再业务能力”的层级组织。根目录的 `CLAUDE.md` 只作为 AI/协作者入口，具体技术内容以这里的文档为准。

## 1. 架构与传输

| 文档               | 内容                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| `architecture.md`  | SDK 分层、TransportManager、Device 生命周期、Protocol V1/V2 职责边界  |
| `events.md`        | SDK 事件清单、触发时机、接收方式和 UI 响应规则                        |
| `transport.md`     | WebUSB / Electron BLE 流程、连接后主动协议探测、schema 路由、兼容边界 |
| `protocol-v2.md`  | Protocol V2 帧格式、protobuf 消息、文件系统、固件更新                 |
| `pro2-ble-speed-test.md` | Pro2 React Native BLE 传输测速、参数结论和优化方向             |

建议阅读顺序：

```
architecture.md
    ↓
events.md
    ↓
transport.md
    ↓
protocol-v2.md
```

## 2. 链和签名能力

| 文档           | 内容                                 |
| -------------- | ------------------------------------ |
| `chain.md`     | 多链集成通用模型、地址/签名 API 结构 |
| `chain-evm.md` | EVM 链集成、交易签名、TypedData      |
| `eip-7702.md`  | EIP-7702 相关能力说明                |

## 3. 设备安全与状态

| 文档                       | 内容                   |
| -------------------------- | ---------------------- |
| `slip39.md`                | SLIP39 恢复和密钥管理  |
| `attachToPin.md`           | Attach to PIN 技术细节 |
| `device-method-support.md` | 不同设备和方法支持矩阵 |

## 4. 包级 README

常见包入口：

| 包                   | README                                       |
| -------------------- | -------------------------------------------- |
| Core                 | `packages/core/README.md`                    |
| Web SDK              | `packages/hd-web-sdk/README.md`              |
| BLE SDK              | `packages/hd-ble-sdk/README.md`              |
| Common Connect SDK   | `packages/hd-common-connect-sdk/README.md`   |
| Transport            | `packages/hd-transport/README.md`            |
| Web Device Transport | `packages/hd-transport-web-device/README.md` |

## 5. 文档维护规则

- 入口和协作规则写在根目录 `CLAUDE.md`。
- 架构事实写在 `architecture.md`，不要散落到 PR 描述或 Agent 入口里。
- 传输流程写在 `transport.md`，尤其是 WebUSB/BLE 的自动探测和回退策略。
- Protocol V2、message id、文件系统和固件更新写在 `protocol-v2.md`。
- Pro2 BLE 真机测速、参数矩阵和阶段性结论写在 `pro2-ble-speed-test.md`。
- 生成文件、子模块来源和 schema 变化要在文档里说明来源，不要只写“已生成”。
- 如果文档和代码不一致，优先修文档或补代码验证，不保留过期描述。
