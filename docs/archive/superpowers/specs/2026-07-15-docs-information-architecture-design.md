# Hardware JS SDK 文档信息架构整理设计

## 1. 背景

当前 `docs/` 同时包含长期维护的技术参考、设备与业务说明、阶段性 Pro2 分支对齐材料，以及 Superpowers 生成的设计和实施记录。不同生命周期的文档处于同一层级，导致以下问题：

- 设备协议、SDK 行为和业务能力之间缺少清晰边界。
- `pro2-branch-alignment/` 与正式文档存在主题重叠，读者难以判断哪个版本有效。
- `superpowers/` 记录有追溯价值，但不应出现在主文档导航中。
- 根目录文件持续增加，文件名和阅读路径不再表达信息层级。
- 移动文档时可能破坏仓库内已有的相对链接和协作者入口。

## 2. 目标

1. 按稳定职责划分长期维护文档，使设备、协议、SDK 和业务内容边界明确。
2. 将阶段性工程记录移入归档区，同时保留 Git 追溯能力。
3. 从 Pro2 分支对齐材料中提取仍有效的技术结论，避免简单归档造成知识丢失。
4. 建立唯一的主入口和维护规则，避免文档再次堆积在根目录。
5. 修复仓库内受迁移影响的 Markdown 链接，并提供可重复执行的链接检查。

## 3. 非目标

- 本轮不大规模重写每篇技术文档的正文。
- 本轮不重新设计 SDK、Transport 或 Protocol V2 的代码架构。
- 本轮不整理子模块内部的文档目录。
- 本轮不删除仍具有历史追溯价值的设计、计划和分支对齐记录。
- 本轮不把包级 `README.md` 集中复制到 `docs/`。

## 4. 方案选择

采用“按技术领域组织长期文档，按生命周期归档工程记录”的方案。设备型号只作为文档适用范围，不作为一级目录，因为 Protocol V1/V2、链能力和 SDK 公共行为会跨多个设备型号。

目标目录：

```text
docs/
├── README.md
├── architecture/
│   └── overview.md
├── device/
│   ├── capabilities/
│   │   ├── chain-support.md
│   │   └── method-support.md
│   ├── device-info/
│   │   └── protocol-v2-field-gaps.md
│   ├── security/
│   │   ├── attach-to-pin.md
│   │   └── slip39.md
│   └── session/
│       └── pro-passphrase-session.md
├── protocol/
│   ├── protocol-v2.md
│   └── transport.md
├── sdk/
│   └── events.md
├── business/
│   ├── chains/
│   │   ├── overview.md
│   │   ├── evm.md
│   │   └── eip-7702.md
│   ├── device-customization/
│   └── firmware-update/
├── testing/
│   └── pro2-ble-performance.md
└── archive/
    ├── README.md
    ├── pro2-branch-alignment/
    └── superpowers/
        ├── plans/
        └── specs/
```

空的业务目录不提前创建。只有当对应正式文档从 Pro2 对齐材料中提炼完成后，才创建 `device-customization/` 或 `firmware-update/`。

## 5. 分类边界

### 5.1 Architecture

描述 SDK 总体分层、包职责、核心对象和跨模块调用关系。这里回答“系统由什么组成”，不承载具体帧格式或单项业务流程。

### 5.2 Protocol

描述设备通信协议和传输机制，包括帧格式、protobuf 消息、协议探测、USB/BLE 链路、重试与兼容边界。这里回答“SDK 如何与设备通信”。

### 5.3 Device

描述设备本身的状态、安全模型、钱包 Session、设备信息以及不同机型的能力差异。这里回答“设备具有什么状态与约束”。

### 5.4 SDK

描述应用接入 SDK 时可观察或必须处理的公共行为，例如事件、回调和应用响应约定。这里回答“应用如何消费 SDK”。

### 5.5 Business

描述用户可感知的业务能力，例如链地址与签名、固件升级、壁纸和 Portfolio。业务文档可以引用协议能力，但不重复解释底层帧和 Transport 实现。

### 5.6 Testing

保存仍对工程决策有参考价值的测试方法、测试环境和性能基线。短期调试日志不进入此目录。

### 5.7 Archive

保存已经完成或不再作为当前事实来源的设计稿、实施计划、分支对齐记录和阶段性结论。归档文档必须明确标注“非当前规范”，并链接到对应的正式文档。

## 6. 现有文档迁移映射

| 当前路径 | 目标路径 | 处理方式 |
| --- | --- | --- |
| `docs/architecture.md` | `docs/architecture/overview.md` | 直接迁移并修复链接 |
| `docs/transport.md` | `docs/protocol/transport.md` | 直接迁移 |
| `docs/protocol-v2.md` | `docs/protocol/protocol-v2.md` | 作为 Protocol V2 当前事实来源 |
| `docs/events.md` | `docs/sdk/events.md` | 直接迁移 |
| `docs/attachToPin.md` | `docs/device/security/attach-to-pin.md` | 规范文件名后迁移 |
| `docs/slip39.md` | `docs/device/security/slip39.md` | 直接迁移 |
| `docs/pro-init-session-passphrase.md` | `docs/device/session/pro-passphrase-session.md` | 迁移并作为 Session 当前说明 |
| `docs/protocol-v2-deviceinfo-field-gaps.md` | `docs/device/device-info/protocol-v2-field-gaps.md` | 迁移；保留“待确认”属性 |
| `docs/device-method-support.md` | `docs/device/capabilities/method-support.md` | 迁移 |
| `docs/onekey-device-chain-support.md` | `docs/device/capabilities/chain-support.md` | 迁移 |
| `docs/chain.md` | `docs/business/chains/overview.md` | 迁移 |
| `docs/chain-evm.md` | `docs/business/chains/evm.md` | 迁移 |
| `docs/eip-7702.md` | `docs/business/chains/eip-7702.md` | 迁移 |
| `docs/pro2-ble-speed-test.md` | `docs/testing/pro2-ble-performance.md` | 迁移并规范名称 |
| `docs/pro2-branch-alignment/` | `docs/archive/pro2-branch-alignment/` | 提炼有效结论后整体归档 |
| `docs/superpowers/` | `docs/archive/superpowers/` | 整体归档；本设计文档随目录迁移 |

## 7. Pro2 分支对齐材料处理

`pro2-branch-alignment/` 不能只做目录移动。每篇文档按以下规则处理：

| 对齐文档 | 正式事实来源 | 整理动作 |
| --- | --- | --- |
| Protocol V2 与命名 | `protocol/protocol-v2.md`、`architecture/overview.md` | 补齐仍有效的命名与协议边界 |
| Passphrase 与钱包 Session | `device/session/pro-passphrase-session.md` | 合并仍有效的 V1/V2 分流和缓存失效规则 |
| Attach-to-PIN 与 Pro2 解锁 | `device/security/attach-to-pin.md`、Session 文档 | 明确 Attach-to-PIN 与设备解锁是不同机制 |
| DeviceSettings | 新建 `business/device-settings.md`，仅在内容足够稳定时创建 | 提取公共 API、读写边界和兼容规则 |
| 壁纸上传 | 新建 `business/device-customization/wallpaper.md` | 提取公共接口、文件处理和激活流程 |
| 固件升级 | 新建 `business/firmware-update/pro2.md` | 提取升级目标、流程、可靠性和返回值兼容 |
| 对齐检查清单 | 仅归档 | 不作为长期技术参考 |

提炼完成后，归档目录的 `README.md` 顶部增加状态提示：该目录用于历史追溯，当前行为以正式文档索引为准。

## 8. Superpowers 文档处理

`docs/superpowers/plans` 和 `docs/superpowers/specs` 全部迁入 `docs/archive/superpowers/`，保留原有文件名和 `plans/specs` 两级结构。

处理规则：

- 不把计划中的未完成描述当作当前实现事实。
- 不逐篇重写历史计划。
- 对仍被正式文档引用的设计结论，改为由正式文档承载，并将历史文档作为补充背景。
- `docs/README.md` 不逐篇列出归档记录，只提供一个归档入口。

## 9. 导航与维护规则

新的 `docs/README.md` 按读者任务导航，而不是简单罗列文件：

1. 初次了解 SDK：Architecture → Protocol Transport → SDK Events。
2. 开发设备能力：Device 状态/安全/Session → 对应业务能力。
3. 集成链能力：Business Chains。
4. 排查 Protocol V2：Protocol V2 → Transport → Device Session。
5. 查阅历史决策：Archive。

维护规则：

- 新文档必须归入现有领域目录，不允许直接堆放在 `docs/` 根目录。
- 长期事实文档使用主题名，不在文件名中加入日期。
- 阶段性设计和实施记录使用日期前缀，并进入 `archive/superpowers/`。
- 正式文档只能有一个当前事实来源；其他文档通过链接引用，避免复制同一规则。
- 设备型号写在标题、适用范围或子目录中，只有形成至少两篇稳定文档时才创建型号子目录。
- 文档内容与代码冲突时，以验证后的代码行为为依据，并同步更新正式文档。

## 10. 链接迁移与兼容

需要检查并更新以下范围：

- 根目录 `README.md` 和 `CLAUDE.md`。
- `docs/**/*.md` 中的相对 Markdown 链接。
- 仓库源码、测试或配置中出现的 `docs/...` 路径。
- 包级 README 指向主文档的链接。

不创建旧路径占位文件，因为占位文件会继续让搜索结果出现两套入口。Git 历史负责旧路径追溯，仓库当前版本统一使用新路径。

## 11. 实施阶段

### 阶段一：建立目录和机械迁移

创建目标目录，使用 Git 感知的移动方式迁移现有文档，暂不修改正文结论。

### 阶段二：重写索引和修复引用

重写 `docs/README.md`，更新根目录入口和所有受影响的相对链接。

### 阶段三：提炼 Pro2 当前结论

逐篇对比 Pro2 对齐材料与正式文档，将仍有效且未覆盖的内容合入正式文档，新增稳定的 DeviceSettings、壁纸和固件升级文档。

### 阶段四：归档和状态标记

迁移 Superpowers 与 Pro2 对齐目录，新增归档说明，明确归档内容不是当前规范。

### 阶段五：验证

执行 Markdown 链接检查、旧路径残留搜索和 Git diff 审查，确认迁移没有遗漏或误删内容。

## 12. 验收标准

- `docs/` 根目录只保留 `README.md` 和领域目录。
- 所有现有 Markdown 文档均有明确的新位置，没有无意删除。
- `docs/README.md` 能按架构、协议、设备、SDK、业务、测试和归档完成导航。
- Pro2 对齐材料中的有效结论在正式文档中有明确落点。
- `archive/` 内所有入口都标明历史属性和当前事实来源。
- 仓库内不存在指向旧文档路径的有效引用。
- Markdown 相对链接检查通过。
- 不修改用户当前工作区中与文档整理无关的文件。

## 13. 风险与控制

- **知识丢失风险**：先提炼、后归档，不直接删除 Pro2 对齐材料。
- **链接失效风险**：机械迁移后统一扫描 Markdown 链接和文本路径引用。
- **分类过细风险**：不提前创建空目录；只有出现稳定内容时才增加子目录。
- **事实冲突风险**：正式文档保持唯一来源，归档材料添加状态说明。
- **改动过大风险**：迁移、内容合并和归档分阶段提交，便于审查和回滚。
