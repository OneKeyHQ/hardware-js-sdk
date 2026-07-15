# Pro 2 设备信息字段迁移

`DeviceInfoGet -> DeviceInfo` 只负责设备身份、组件信息、固件镜像信息，以及可选的状态快照。Core 不应把它当成 Protocol V1 `Features` 的完整替代品。

## 消息结构

```text
DeviceInfo
├── protocol_version
├── hw                  DeviceHardwareInfo
├── fw                  DeviceMainMcuInfo
├── coprocessor         DeviceCoprocessorInfo
├── se1..se4            DeviceSEInfo
└── status              DeviceStatus（可选快照）
```

`DeviceInfoGet.targets` 决定读取哪些组件，`DeviceInfoGet.types` 决定每个固件镜像包含哪些信息。调用方不应默认每次都请求完整 hash；初始化和状态刷新使用较小范围，校验或升级场景才请求完整信息。

## 组件字段

| 模块     | Protocol V2 字段              | 含义                         | SDK 归一化                                       |
| -------- | ----------------------------- | ---------------------------- | ------------------------------------------------ |
| 协议     | `protocol_version`            | 当前设备协议版本             | `Features.protocolVersion`                       |
| 硬件     | `hw.Device_type`              | 设备型号枚举                 | SDK 当前固定识别为 Pro 2                         |
| 硬件     | `hw.serial_no`                | 设备序列号                   | `Features.serialNo`、`DeviceProfile.serialNo`    |
| 硬件     | `hw.hardware_version`         | 可读硬件版本                 | 保留在原始 `protocolV2DeviceInfo`                |
| 硬件     | `hw.hardware_version_raw_adc` | 硬件版本 ADC 原始值          | 保留在原始结构                                   |
| 主控     | `fw.romloader`                | romloader 镜像信息           | 映射到历史兼容字段 `boardVersion`                |
| 主控     | `fw.bootloader`               | bootloader 镜像信息          | `bootloaderVersion` 与校验字段                   |
| 主控     | `fw.application`              | 主应用镜像信息               | `firmwareVersion` 与校验字段                     |
| 主控     | `fw.application_data`         | P2/application data 镜像信息 | 当前保留在原始结构，尚无独立 Feature 字段        |
| 协处理器 | `coprocessor.bootloader`      | 协处理器 bootloader          | 保留在原始结构                                   |
| 协处理器 | `coprocessor.application`     | BLE/协处理器应用             | `bleVersion` 与校验字段                          |
| 协处理器 | `coprocessor.bt_adv_name`     | BLE 广播名                   | `Features.bleName`                               |
| 协处理器 | `coprocessor.bt_mac`          | BLE MAC                      | 保留在原始结构                                   |
| SE       | `se1..se4.application`        | 各安全芯片应用信息           | `se01Version` 至 `se04Version`                   |
| SE       | `se1..se4.bootloader`         | 各安全芯片 bootloader 信息   | `se01BootVersion` 至 `se04BootVersion`           |
| SE       | `se1..se4.type/state`         | 芯片类型和运行状态           | 当前保留在原始结构，Core 提供统一枚举解析 helper |

每个 `DeviceFirmwareImageInfo` 可以包含：

| 字段       | 查询开关         | 用途                 |
| ---------- | ---------------- | -------------------- |
| `version`  | `types.version`  | 版本展示和升级判断   |
| `build_id` | `types.build_id` | 构建追踪与完整性校验 |
| `hash`     | `types.hash`     | 镜像校验             |

`types.specific` 控制组件特有信息，例如硬件版本、BLE 广播信息和 SE 类型/状态。

## SDK 查询范围

| SDK 场景          | targets                             | types                                     | 目的                                |
| ----------------- | ----------------------------------- | ----------------------------------------- | ----------------------------------- |
| 初始化 Features   | `hw`、`fw`、`coprocessor`、`status` | `version`、`specific`                     | 建立基础身份和状态缓存              |
| 轻量状态刷新      | `hw`、`coprocessor`、`status`       | `version`、`specific`                     | 刷新状态，同时保留序列号和 BLE 名称 |
| versions scope    | 上述字段 + `se1..se4`               | `version`、`specific`                     | 获取所有组件版本                    |
| full/verify scope | 上述全部                            | `version`、`build_id`、`hash`、`specific` | 完整设备校验                        |

## 从集中式字段迁出的内容

| 旧的设备信息语义       | 新归属                       | 原因                                           |
| ---------------------- | ---------------------------- | ---------------------------------------------- |
| `device_id`            | `DeviceStatus.device_id`     | 它是运行身份状态，不再放入硬件信息             |
| 初始化、解锁、备份状态 | `DeviceStatus`               | 会随设备运行过程变化                           |
| label、语言、蓝牙开关  | `DeviceSettings`             | 属于用户配置，可独立读写                       |
| Passphrase 钱包上下文  | `DeviceSession`              | 属于钱包级 Session，不是物理设备信息           |
| 固件安装状态           | `DeviceFirmwareUpdateStatus` | 属于长流程控制状态                             |
| 生产制造信息           | `DeviceFactoryInfo`          | 只在生产制造相关接口中使用，不混入普通设备信息 |

## 边界与兼容规则

- `device_id` 只来自 `status.device_id`，不能从 `hw.serial_no` 兜底；序列号和设备 ID 是不同身份。
- `DeviceInfo.status` 是可选嵌入快照；需要独立刷新状态时使用 `DeviceStatusGet`。
- 当前 protobuf 没有显式运行模式。SDK 根据现有固件响应结构区分：只包含 loader 基础信息且带 `fw.romloader` 的响应识别为 romloader；其他没有 status 的 loader 响应识别为 bootloader。这是兼容性推断，不是长期协议字段。
- loader 或受限运行阶段可能只返回部分 target。字段缺失应解释为该阶段未提供，而不是用其他字段猜测。
- 原始公共 `deviceInfoGet` 返回调用方请求的未加工结构，不更新 Device 的 Features 缓存。
