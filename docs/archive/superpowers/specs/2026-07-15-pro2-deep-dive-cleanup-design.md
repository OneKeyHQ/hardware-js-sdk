# Pro2 Deep Dive 文档清理设计

## 背景

仓库根目录的 `OneKey_Pro2_Deep_Dive.md` 是早期 Pro 1/Pro2 协议调研文档。它没有进入当前文档索引，并包含多项已经被现有实现取代的描述：

- 使用 `Proto V0` 而不是当前统一名称 `Protocol V2`。
- 假设 Pro2 继续使用 `GetFeatures` / `OnekeyGetFeatures` 作为初始化事实来源。
- 建议优先发送新协议探测，而当前实现默认先验证 Protocol V1，再按连接状态和显式协议选择探测 V2。
- 把首字节判断当作完整协议探测，而当前实现使用具体请求、响应和 transport 状态完成验证。
- 使用 2048B 单帧上限，与当前 SDK 的 frame 和文件分片参数不一致。
- 把 ZBus、DMA、SE task 等固件内部推断写成 SDK 接入规范，但缺少稳定接口契约。

## 决策

删除根目录 `OneKey_Pro2_Deep_Dive.md`，不保留原文归档副本。Git 历史已经能够追溯原始内容，继续保留 Markdown 副本会增加读者误用旧结论的风险。

删除前只提取同时满足以下条件的内容：

1. 与当前代码和 protobuf 一致。
2. 尚未被正式文档覆盖。
3. 对 SDK 使用者或维护者有长期价值。
4. 能放入现有唯一事实来源，而不新增另一篇综合性 Deep Dive。

## 内容落点

### Protocol V1/V2 差异

正式落点为 `docs/protocol/protocol-v2.md` 和 `docs/protocol/transport.md`。保留或补充：

- Protocol V1 与 V2 的帧起始、长度编码和 message type 字节序差异。
- V2 帧包含 CRC8、router、attribute 和 sequence。
- 协议选择依赖主动探测和连接状态，不能只依赖 PID、设备名或单个首字节。

### Pro2 设备信息

正式落点为：

- `docs/architecture/overview.md`
- `docs/device/device-info/protocol-v2-field-gaps.md`
- `docs/device/session/pro-passphrase-session.md`

Pro2 的当前状态来源必须表述为 `DeviceInfoGet`、`DeviceStatusGet` 和 `DeviceSessionGet` 的职责分工，不迁移旧 `Features` / `OnekeyFeatures` 字段对比表。

### 文件系统和固件升级

正式落点为：

- `docs/protocol/protocol-v2.md`
- `docs/business/firmware-update/pro2.md`
- `docs/business/device-customization/wallpaper.md`

不迁移旧的 `FixPermission`、旧消息简称、V3 固件升级命名或 2048B 上限。

## 实施步骤

1. 对照当前正式文档检查原文中的有效内容是否已经覆盖。
2. 仅补充缺失且可由当前实现支持的 Protocol V1/V2 wire-format 差异。
3. 更新文档索引或维护规则，明确根目录不放独立技术文档。
4. 删除 `OneKey_Pro2_Deep_Dive.md`。
5. 搜索仓库引用、检查 Markdown 链接、格式和 Git diff。

## 验收标准

- 仓库根目录不再存在 `OneKey_Pro2_Deep_Dive.md`。
- 过时的 `Proto V0`、Pro2 `GetFeatures` 初始化和 2048B 上限没有进入正式文档。
- 当前 Protocol V1/V2 帧和探测差异在正式文档中有清晰入口。
- 仓库不存在指向被删除文件的引用。
- 文档相对链接和格式检查通过。
- 不提交用户当前工作区里的 `pro2Demo` 删除和固件子模块改动。
