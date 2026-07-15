# Pro2 固件升级

## 适用范围与 API 分代

| 方法                                                       | 主要设备或协议       | 说明                                      |
| ---------------------------------------------------------- | -------------------- | ----------------------------------------- |
| `firmwareUpdate` / `firmwareUpdateV2` / `firmwareUpdateV3` | Protocol V1 设备     | 保持既有升级链路                          |
| `firmwareUpdateV4`                                         | Pro2 / Protocol V2   | 多组件、target 化、文件系统暂存和状态轮询 |
| `deviceFirmwareUpdate`                                     | Protocol V2 低阶接口 | 直接发送固件安装目标请求                  |

Pro2 不自动落入旧升级实现。Protocol V2 会跳过 `BaseMethod.checkFirmwareRelease` 的 V1 检查，由 `firmwareUpdateV4` 管理 release 元数据、目标选择和升级状态。

## 支持的安装目标

| 输入参数                    | 固件目标                            |
| --------------------------- | ----------------------------------- |
| `bootloaderBinary`          | `BOOTLOADER`                        |
| `applicationP1Binary`       | `APPLICATION_P1`                    |
| `applicationP2Binary`       | `APPLICATION_P2`                    |
| `coprocessorBinary`         | `COPROCESSOR`                       |
| `se01Binary` - `se04Binary` | `SE01` - `SE04`                     |
| `resourceBundleFiles`       | RESC bundle，按指定路径写入文件系统 |

`romloaderBinary` 仍保留在部分参数类型中，但当前 bootloader 安装请求不接受 `ROMLOADER`。传入时 SDK 会明确报错，ROMLOADER 必须通过 loader 专用流程安装。

## 升级流程

1. 获取 Pro2 组件版本和当前设备状态。
2. 根据调用方二进制或远端 release 配置准备目标。
3. 对远端组件比较版本；`forceTargets` 只跳过指定目标的版本满足判断。
4. 对 RESC bundle 读取设备端 OKPP header，比较版本和 hash，已是最新版本时跳过。
5. 必要时重启进入 bootloader，并轮询重连确认模式。
6. 把各目标二进制分片写入 `vol0:/` 暂存路径。
7. 使用 `PathInfo` 校验暂存文件大小。
8. 一次发送 `DeviceFirmwareUpdateRequest`，携带所有待安装 target 和 path。
9. 轮询目标状态；处理中允许断连、超时和重连探测。
10. 设备回到 normal mode 后重新读取 DeviceInfo/Features，并返回最终版本。

## 传输与可靠性

- BLE 和 WebUSB 使用不同的默认 chunk 大小，最小值为 64 字节。
- 文件传输使用有限次数重试，并根据固件 `processed_byte` 恢复进度。
- 总进度按全部目标的总字节数聚合，避免每个 target 单独从 0 到 100。
- 安装开始与安装完成使用不同的超时窗口。
- 用户交互 Ack 不继承普通业务调用的短超时。
- 状态 enum 同时兼容数字值和历史解码后的字符串枚举名。

## 远端 release 配置

Pro2 的 `firmware-v1` release 字段可以描述：

- 各固件组件的 target、URL、版本和 fingerprint。
- RESC bundle 的名称、URL、设备路径、版本、payload hash 和 header hash。

服务端 release 配置、SDK 类型和固件 target 名称必须同步发布，避免出现类型可编译但运行时无法匹配目标的情况。

## 返回值兼容

`firmwareUpdateV4` 当前保持与 V3 相同的版本对象形态：

```ts
{
  bleVersion: string;
  firmwareVersion: string;
  bootloaderVersion: string;
}
```

Pro2 实际包含更多组件。应用如果需要 SE、P1/P2 或 coprocessor 的最终版本，应调用 `getDeviceInfo` 或 `deviceInfoGet`，不能只依赖 V4 返回值。

## 关键代码

- `packages/core/src/api/FirmwareUpdateV4.ts`
- `packages/core/src/types/api/firmwareUpdate.ts`
- `packages/core/src/protocols/protocol-v2/firmware.ts`
- `packages/core/src/api/protocol-v2/DeviceFirmwareUpdate.ts`
