# Protocol V2 消息分类与编号

> - 文档状态：当前生成 schema 摘要
> - 最后核验：2026-07-15
> - 唯一编号来源：`packages/hd-transport/messages-protocol-v2.json`

Protocol V2 schema 不只包含 60000 以上的系统消息，也包含设备支持的链业务与交互消息。本页聚焦 Protocol V2 新增的系统消息区间；完整定义以生成 JSON 和 `submodules/firmware-pro2` protobuf 为准。

## 系统消息组

| 编号范围                 | 消息组                   | 代表消息                                                                                                      |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 60000-60004              | 工厂信息                 | `DeviceFactoryInfoSet/Get`、`DeviceFactoryPermanentLock`、`DeviceFactoryTest`                                 |
| 60200-60208              | 协议信息与通用响应       | `ProtocolInfoRequest`、`ProtocolInfo`、`Ping`、`Success`、`Failure`                                           |
| 60400                    | 重启                     | `DeviceReboot`                                                                                                |
| 60410-60413              | 设备设置                 | `DeviceSettingsGet/Set`、`DeviceSettingsPageShow`                                                             |
| 60420-60424              | 设备证书                 | `DeviceCertificateRead/Write/Sign`                                                                            |
| 60430-60432              | 壁纸                     | `SetWallpaper`、`GetWallpaper`、`Wallpaper`                                                                   |
| 60600-60603、60606-60609 | 设备信息、状态与 Session | `DeviceInfoGet`、`DeviceStatusGet`、`DeviceSessionGet`、`DeviceSessionAskPin`                                 |
| 60604-60605              | Onboarding 状态          | `DevGetOnboardingStatus`、`DevOnboardingStatus`                                                               |
| 60800-60811              | 文件系统                 | `FilesystemPermissionFix`、`FilesystemPathInfoQuery`、`FilesystemFile*`、`FilesystemDir*`、`FilesystemFormat` |
| 61000-61002              | 固件安装                 | `DeviceFirmwareUpdateRequest`、`DeviceFirmwareUpdateStatusGet/Status`                                         |
| 61200                    | Portfolio                | `PortfolioUpdate`                                                                                             |

## 探测消息与协议信息消息不是同一概念

`ProtocolInfoRequest/ProtocolInfo` 是 schema 中可调用的协议信息消息。当前 Transport 的 acquire 探测实际调用：

```text
Ping { message: "protocol-v2-probe" } -> Success
```

不要仅因为存在 `ProtocolInfoRequest` 就把它写成当前自动探测流程。

## 消息分类与上层能力的边界

本页只记录 wire message 的名称和编号，不定义公共 SDK API，也不描述完整业务流程。

同一个 protobuf 消息可能被不同 Core 路径使用，但这不会改变它在传输层的消息编号、编码方式或请求响应类型。字段转换和调用编排见 [SDK Protocol V2 适配](../../sdk/protocol-v2/README.md)。

应用不应根据消息编号直接判断业务能力，也不应绕过 Core 自行拼装文件分片或固件升级流程。

## 更新规则

protobuf 或生成 JSON 变化时：

1. 先更新并生成 `messages-protocol-v2.json` 与 TypeScript 类型。
2. 检查本页消息组是否新增或改变编号。
3. 检查消息的 wire direction、请求响应关系和 schema 路由是否变化。
4. 不手工复制完整 protobuf 字段到本页；字段级 SDK 映射放在 `docs/sdk/`。
