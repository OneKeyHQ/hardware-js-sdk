# FirmwareUpdateV4 协议清理设计

## 目标

在 Pro2 尚未发布正式协议版本的前提下，移除已经废弃的 CRATE 固件目标，统一资源更新为 RESC bundle 直写，并修复文件分块写入重试可能重复追加数据的问题。同时补齐 Pro V1 的 passphrase attach-to-pin 请求字段。

## 协议决策

### 1. 删除 CRATE

- 从 Pro2 `DeviceFirmwareTargetType`、内部 `FwMgmtTarget_t`、bootloader runner、payload container 类型和工具常量中删除 CRATE。
- 目标编号连续重排为：INVALID=0、ROMLOADER=1、BOOTLOADER=2、APPLICATION_P1=3、APPLICATION_P2=4、COPROCESSOR=5、SE01..SE04=6..9。
- SDK 删除 `resourceBinaries` 参数、CRATE remote component 映射和 resource install item；资源不再进入 `DeviceFirmwareUpdateRequest`。
- 资源只通过 `resourceBundleFiles` 或远端 `release.resourceBundles` 直接写入目标路径。

### 2. 文件写入失败恢复

- 单次 `FilesystemFileWrite` 不再在相同非零 offset 上重试。
- 任意分块写入出现结果不确定的异常时，当前文件传输整体失败，并在重新连接设备后从 offset 0 重传。
- offset 0 使用 `overwrite=true`，会重建固件侧写入上下文，因此每次文件级重试都是幂等的。
- 文件级重试保持有界；耗尽后抛出 `EmmcFileWriteFirmwareError`。

### 3. bundle-only 行为

- `resourceBundleFiles` 计入显式 Protocol V2 payload 判断。
- 手动 bundle-only 请求不读取远端固件 components，不准备固件 target。
- `executeProtocolV2Update` 在没有固件 install item 时只同步 bundle，跳过 staging 验证、确认页面、`DeviceFirmwareUpdateRequest` 和状态轮询。
- 没有手动 payload 时仍允许读取远端固件 release；远端 RESC bundle 使用现有版本/哈希比对逻辑按需同步。

### 4. Pro V1 passphrase schema

- 在 `submodules/firmware/common/protob/messages-management.proto` 的 `GetPassphraseState` 中增加：
  - `optional bool _only_main_pin = 2;`
  - `optional bool allow_create_attach_pin = 3;`
- 运行根目录 `yarn update-protobuf`，同步生成 V1/V2 JSON schema 和 TypeScript 类型。

## 验证标准

- 生成后的 Protocol V2 schema 和 TypeScript enum 不再包含 CRATE，且数值与固件内部 enum 一致。
- SDK 不再公开或接受 `resourceBinaries`。
- 第二个及后续 chunk 写入失败时，下一次写入从 offset 0 开始，而不是重复原 offset。
- `resourceBundleFiles` 单独调用时不下载远端整机固件、不发送 `DeviceFirmwareUpdateRequest`。
- V1 `GetPassphraseState` schema/types 包含两个新增字段。
- core Protocol V2 测试、hd-transport Protocol V2 测试、lint 和可执行的 firmware-pro2 相关测试/构建检查通过。
