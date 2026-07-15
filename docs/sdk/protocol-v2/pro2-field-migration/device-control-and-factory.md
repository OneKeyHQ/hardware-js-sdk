# Pro 2 设备操作与生产制造信息

`messages_device_control.proto` 保存设备操作相关内容，`messages_device_factory.proto` 保存生产制造相关内容。Core 不应把这些内容合并进普通设备 `Features`。

## 设备操作

### 重启

`DeviceReboot.reboot_type` 明确区分：

| 枚举         | 目标模式   |
| ------------ | ---------- |
| `Normal`     | 正常应用   |
| `Romloader`  | romloader  |
| `Bootloader` | bootloader |

运行模式切换是控制命令，不是修改 `DeviceInfo` 字段。重启后的当前模式需要通过重连和新的设备信息响应重新判断。

### 设置

`DeviceSettings*` 也位于 control proto，因为设置包含读写和设备端确认操作。字段迁移详情见 [设备设置](./device-settings.md)。

### 设备证书

| 消息                     | 关键字段                         | 边界                 |
| ------------------------ | -------------------------------- | -------------------- |
| `DeviceCertificateWrite` | `cert_and_pubkey`、`private_key` | 私钥仅写入，不能读回 |
| `DeviceCertificateRead`  | 无请求字段                       | 返回证书和公钥材料   |
| `DeviceCertificateSign`  | `data`                           | 使用设备证书能力签名 |

证书数据属于受保护信息，不应进入设备详情、日志或标准 Features。

### 固件升级

| 消息/结构                       | 字段                                             | 作用                             |
| ------------------------------- | ------------------------------------------------ | -------------------------------- |
| `DeviceFirmwareTarget`          | `target_id`、`path`                              | 指定要安装的组件和设备侧文件路径 |
| `DeviceFirmwareUpdateRequest`   | `targets[]`                                      | 一次提交最多九个安装目标         |
| `DeviceFirmwareUpdateRecord`    | `target_id`、`status`、`payload_version`、`path` | 描述每个目标的安装记录           |
| `DeviceFirmwareUpdateStatusGet` | `fields`                                         | 控制状态查询返回哪些记录字段     |
| `DeviceFirmwareUpdateStatus`    | `records[]`                                      | 返回升级任务记录                 |

升级目标已按组件拆开，包括 crate、romloader、bootloader、application P1/P2、coprocessor 和 SE01–SE04。`DeviceInfo` 负责读取组件当前版本，`DeviceFirmwareUpdateStatus` 负责安装任务状态；二者不能混成一个“固件字段”。

SDK 的原始 `deviceFirmwareUpdate` 只发送安装请求。高层固件升级还负责编排文件暂存、目标选择、轮询、断连和重连。

## 生产制造信息

工厂信息从普通设备信息中独立出来：

| 旧工厂语义                       | Protocol V2 字段                  | 迁移说明                                               |
| -------------------------------- | --------------------------------- | ------------------------------------------------------ |
| 工厂记录版本                     | `DeviceFactoryInfo.version`       | 独立工厂数据版本                                       |
| 工厂序列号                       | `DeviceFactoryInfo.serial_number` | 与普通 `DeviceHardwareInfo.serial_no` 分属不同读写边界 |
| 老化测试状态                     | `burn_in_completed`               | 结构化布尔状态                                         |
| 工厂测试状态                     | `factory_test_completed`          | 结构化布尔状态                                         |
| 生产时间                         | `manufacture_time`                | 拆为年月日时分秒结构                                   |
| 历史 CPU / SPI Flash / SE 描述串 | 已移除                            | 不再作为无结构字符串继续迁移                           |
| 历史 NFT voucher                 | 已移除                            | 当前 `DeviceFactoryInfo` 不提供                        |

`DeviceFactoryInfoSet/Get` 只用于生产制造流程。`DeviceFactoryPermanentLock` 使用两个固定校验值降低误操作风险，`DeviceFactoryTest` 区分完整老化测试与功能测试。

## 使用边界

- 普通设备详情读取 `DeviceInfo`，不能为了拿工厂字段调用工厂接口。
- 工厂序列号与运行时序列号即使值相同，也不能在 SDK 中互相静默兜底。
- 固件升级记录属于任务状态；组件已安装版本以新的 `DeviceInfo` 为准。
- 证书私钥、工厂写入参数和永久锁参数不得进入公共日志或 DeviceProfile raw 输出。
- 新增设备操作优先放入 `messages_device_control.proto`；新增静态、可查询的组件信息才考虑放入 `messages_device_info.proto`。
