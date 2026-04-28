# Claude / Agent 工作入口

这份文件只放协作者入口和工程约束，不承载完整技术说明。详细文档以 `docs/README.md` 为索引。

## 先读什么

按任务类型选择入口：

| 任务                                    | 首选文档                                |
| --------------------------------------- | --------------------------------------- |
| 了解整体架构                            | `docs/architecture.md`                  |
| 调试 WebUSB / BLE / TransportManager    | `docs/transport.md`                     |
| 处理 Pro2 / Protocol V2 / firmware-pro2 | `docs/protocol-v2.md`                   |
| 链集成、签名、地址派生                  | `docs/chain.md`、`docs/chain-evm.md`    |
| SLIP39、PIN、设备安全状态               | `docs/slip39.md`、`docs/attachToPin.md` |
| 设备方法支持矩阵                        | `docs/device-method-support.md`         |

完整目录见 `docs/README.md`。

## 当前架构边界

- Protocol V1 服务 Classic / Mini / Touch / Pro 等现有设备，USB 和 BLE 都支持。
- Protocol V2 服务 Pro2，USB 和 BLE 都支持。
- 协议判断必须在连接后主动探测，不能依赖 PID、productName 或 descriptor。
- WebUSB / Electron BLE / React Native BLE 都通过 `GetProtoVersion` 探测 V2，失败或超时回落 V1。
- `desktop-web-ble` 是默认 Electron BLE 入口，不再按设备型号拆分 env alias。
- Protocol V2 不走传统 `Initialize/GetFeatures`，而是 `Ping + DevGetDeviceInfo` 后通过 `Protocol V2 feature adapter` 归一成 `Features`；早期固件不支持完整信息时才回退最小 `Features`。

## Protocol V2 改动注意事项

- `messages-pro2.json` 来源是 `submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest`。
- 当前 Protocol V2 schema 依赖 `firmware-pro2` 的 `origin/dev_romloader_split`，因为该分支包含 `Filesystem*`、`DevFirmwareUpdate`、`DevReboot` 等消息。
- Protocol V2 文件操作应使用 `FilesystemFileWrite` / `FilesystemDirMake` 等新消息名。
- Protocol V2 固件安装应使用 `DevFirmwareUpdate.targets` 显式传入 resource、bootloader、firmware 路径。
- 如果修改 protobuf，优先改生成脚本并重新生成 JSON/types，不要手改生成产物。

## 常用验证命令

根目录目前没有 `build:all` script；全仓构建入口是 `yarn build`（`lerna run build`）。协议和 protobuf 变更建议先按依赖顺序验证：

```bash
yarn --cwd packages/hd-transport test --runInBand
yarn --cwd packages/hd-transport build
yarn --cwd packages/hd-transport-web-device build
yarn --cwd packages/hd-transport-react-native build
yarn --cwd packages/hd-common-connect-sdk build
yarn --cwd packages/core build
NODE_OPTIONS=--max-old-space-size=8192 yarn lint --quiet
git diff --check
```

全仓 lint 容易吃内存，默认加 `NODE_OPTIONS=--max-old-space-size=8192`。

## Context7

本项目可通过 Context7 查询：

```json
{
  "url": "https://context7.com/onekeyhq/hardware-js-sdk",
  "library_id": "/onekeyhq/hardware-js-sdk"
}
```

查询主题建议使用精确 topic，例如 `transport`、`Protocol V2`、`firmware update`、`signing`、`SLIP39`。

## CLI 入口

`@onekeyfe/cli` 是完整钱包 CLI：

```bash
npm install -g @onekeyfe/cli
onekey auth login --hardware
onekey balance --chain eth
onekey device search
```

`@onekeyfe/hardware-cli` 是纯硬件 CLI，更适合 AI Agent 直连设备：

```bash
npm install -g @onekeyfe/hardware-cli
onekey-hw search
onekey-hw get-address --chain evm --use-empty-passphrase
```
