# Pro2 固件升级

## 1. API 分代

| 方法 | 主要设备/协议 | 说明 |
| --- | --- | --- |
| `firmwareUpdate` / `V2` / `V3` | 既有 Protocol V1 设备 | 保持旧升级链路 |
| `firmwareUpdateV4` | Pro2 / Protocol V2 | target 化、多组件、文件系统暂存和状态轮询 |
| `deviceFirmwareUpdate` | V2 低阶接口 | 直接发送安装目标请求 |

Pro2 不应自动落入旧升级实现；`BaseMethod.checkFirmwareRelease` 对 V2 显式跳过，V4 自己管理 release 元数据和目标选择。

## 2. 支持的安装目标

| 参数 | 固件目标 |
| --- | --- |
| `bootloaderBinary` | BOOTLOADER |
| `applicationP1Binary` | APPLICATION_P1 |
| `applicationP2Binary` | APPLICATION_P2 |
| `coprocessorBinary` | COPROCESSOR |
| `se01Binary` - `se04Binary` | SE01 - SE04 |
| `resourceBundleFiles` | RESC bundle，FileWrite 直写指定路径 |

`romloaderBinary` 虽保留在参数中，但当前 bootloader 安装请求不接受 ROMLOADER，传入会明确报错，必须走 loader 专用流程。

## 3. 升级流程

1. 获取 Pro2 组件版本和设备状态。
2. 根据手动二进制或远端 release 配置准备目标。
3. 对远端组件比较版本；`forceTargets` 可跳过版本满足判断。
4. RESC bundle 可读取设备端 OKPP header，比对版本和 hash，已最新则跳过。
5. 必要时重启进入 bootloader，并轮询重连确认模式。
6. 将各目标二进制分片写入 `vol0:/` 暂存路径。
7. 用 `PathInfo` 校验暂存文件大小。
8. 一次发送 `DeviceFirmwareUpdateRequest`，携带所有安装 target 和 path。
9. 轮询目标状态；处理中允许断连、超时和重连探测。
10. 回到 normal mode 后重新获取 DeviceInfo/Features，返回最终版本。

## 4. 传输与可靠性

- BLE/WebUSB 使用不同默认 chunk 大小，最小 64 字节。
- 文件传输有有限次数重试，并按固件 `processed_byte` 恢复进度。
- 进度以总字节数聚合，避免多 target 各自从 0 到 100。
- 安装开始和安装完成使用不同超时窗口；用户交互 Ack 不继承业务调用超时。
- 状态 enum 兼容数字和历史解码后的字符串枚举名。

## 5. 远端配置变化

Pro2 新增 `firmware-v1` release 字段，可描述：

- 各固件 component 的 target、URL、版本和 fingerprint。
- RESC bundle 的名称、URL、设备路径、版本、payload hash 和 header hash。

这意味着服务端 release 配置、SDK 类型和固件 target 名称必须同步发布。

## 6. 返回值兼容

`firmwareUpdateV4` 暂时保持与 V3 相同的版本对象形态：

```ts
{
  bleVersion: string;
  firmwareVersion: string;
  bootloaderVersion: string;
}
```

Pro2 实际包含更多组件版本，上层若需要 SE、P1/P2 或 coprocessor 的最终版本，应调用 `getDeviceInfo` / `deviceInfoGet`，不能只依赖 V4 返回值。

## 7. 关键代码

- `packages/core/src/api/FirmwareUpdateV4.ts`
- `packages/core/src/types/api/firmwareUpdate.ts`
- `packages/core/src/protocols/protocol-v2/firmware.ts`
- `packages/core/src/api/protocol-v2/DeviceFirmwareUpdate.ts`
