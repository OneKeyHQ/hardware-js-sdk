# Pro2 Eventless Wallet Session 实施计划

> **执行要求：** 按 `superpowers:executing-plans` 逐项实施，并对每个行为遵循测试先行（RED → GREEN → REFACTOR）。

**目标：** 将 Pro2 的钱包会话入口从固件中间消息驱动迁移为 Host/SDK 主动发送 `DeviceSessionOpen`，同时保持 App 现有 Passphrase、设备输入 Passphrase、Attach PIN 等 UI 交互基本不变。

**架构原则：** SDK 内部增加钱包会话协调器，负责恢复隐藏钱包会话、请求用户选择、发送最终设备命令及补发第二阶段 UI 事件。标准钱包直接沿用设备默认空 Passphrase 上下文，不调用 `DeviceSessionOpen`，也不引入 `STANDARD_WALLET_KEY`；隐藏钱包缓存仍严格使用 `deviceKey + passphraseState`。App 继续消费既有 UI 事件，仅增强可选来源元数据。

**技术栈：** TypeScript、Jest、protobufjs JSON schema、Yarn workspace、React Native/OneKey App monorepo。

---

## 任务 1：补齐 Protocol V2 的 `DeviceSessionOpen` 协议类型

**文件：**

- 修改：`submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_session.proto`
- 生成：`packages/hd-transport/messages-protocol-v2.json`
- 生成：`packages/core/src/data/messages/messages-protocol-v2.json`
- 生成：`packages/hd-transport/src/types/messages.ts`
- 测试：`packages/core/__tests__/protocol-v2.test.ts`

1. 先增加类型/序列化测试，验证 `DeviceSessionOpen` 只支持隐藏钱包的 `resume`、Host Passphrase、设备 Passphrase 和 Attach PIN 选择，协议类型中不存在 `STANDARD`、`wallet_type` 和 `hidden_wallet` 包装层。
2. 运行单测，确认因消息类型尚不存在而失败。
3. 在 Pro2 proto 中新增消息号 `60609` 的 `DeviceSessionOpen`，定义互斥的 `resume` / `select` 载荷；`select` 直接包含三种隐藏钱包 access，保留 `DeviceSession` 返回结构。
4. 运行 `yarn workspace @onekeyfe/hd-transport update:protobuf` 生成 SDK 两份 schema 和 TypeScript 类型。
5. 重新运行协议单测并执行 `git diff --check`。

## 任务 2：把钱包选择参数完整传入 Protocol V2

**文件：**

- 修改：`packages/core/src/utils/deviceFeaturesUtils.ts`
- 修改：`packages/core/src/protocols/protocol-v2/walletSession.ts`
- 测试：`packages/core/__tests__/protocol-v2.test.ts`

1. 先写失败测试：`onlyMainPin/useEmptyPassphrase=true` 必须直接返回标准钱包上下文，不发送 `DeviceSessionOpen`、不恢复隐藏钱包缓存，也不写入隐藏钱包 Session Store。
2. 先写失败测试：带 `expectedPassphraseState` 时只允许恢复该隐藏钱包对应的缓存。
3. 将 `onlyMainPin` 从两处兼容入口完整传入钱包会话协调器。
4. 运行聚焦单测，确认参数路由正确。

## 任务 3：实现 SDK 钱包会话协调器与兼容 UI 事件

**文件：**

- 修改：`packages/core/src/protocols/protocol-v2/walletSession.ts`
- 修改：`packages/core/src/device/DeviceCommands.ts`
- 修改：`packages/core/src/events/device.ts`
- 修改：`packages/core/src/events/ui-request.ts`
- 修改：`packages/core/src/device/Device.ts`
- 修改：`packages/core/src/core/deviceEventRegistration.ts`
- 修改：`packages/core/src/core/index.ts`
- 测试：`packages/core/__tests__/protocol-v2.test.ts`
- 测试：`packages/core/__tests__/DeviceCommands.test.ts`

1. 先写失败测试：标准钱包不发送 `DeviceSessionOpen`，且不读写隐藏钱包缓存；`getPassphraseState({ useEmptyPassphrase:true })` 保持成功返回形状但不生成隐藏钱包 `passphraseState`。
2. 先写失败测试：隐藏钱包命中缓存时发送 `DeviceSessionOpen(resume)`；失效时仅删除当前钱包缓存，再请求用户选择。
3. 先写失败测试：Host Passphrase 直接发送 `select.host_passphrase`；设备输入发送 `select.passphrase_on_device` 并补发 `REQUEST_PASSPHRASE_ON_DEVICE`；Attach PIN 发送 `select.attach_pin_on_device` 并补发兼容的 `REQUEST_PIN/ButtonRequest_AttachPin`，请求中不得出现 `wallet_type/hidden_wallet`。
4. 将 `_promptPassphrase` 提炼为可供协调器调用的内部方法，并支持“取消 UI 等待但不向设备发送旧协议 Cancel”的模式；旧 Protocol V1 行为保持不变。
5. 在 `PassphraseRequestPayload` 和 UI 请求载荷中增加可选 `source`、`reason`、`expectedPassphraseState`，同时保留 `passphraseState`、`existsAttachPinUser` 等旧字段。
6. 实现 `DeviceSessionOpen` 的恢复、选择、状态校验、锁定后解锁重试和定向缓存失效逻辑。
7. 运行 `protocol-v2.test.ts`、`DeviceCommands.test.ts` 和钱包 Store 测试。

## 任务 4：更新公开兼容 API，清理旧 Session 查询命名

**文件：**

- 删除：旧的 Protocol V2 原始 Session 查询 API 文件
- 新增：`packages/core/src/api/protocol-v2/DeviceSessionOpen.ts`
- 修改：`packages/core/src/api/index.ts`
- 修改：`packages/core/src/inject.ts`
- 修改：相关 Core API 类型和导出文件（按编译错误精确定位）
- 测试：`packages/core/__tests__/protocol-v2.test.ts`

1. 先写失败测试：Core API 暴露仅用于隐藏钱包的 `deviceSessionOpen`，且原有业务入口 `getPassphraseState` 的标准钱包路径继续成功但返回 `undefined` passphraseState。
2. 用 `DeviceSessionOpen` 替换仅用于调试的旧 Session 查询 API，避免公开层继续暴露已经删除的固件请求。
3. 不新增 `STANDARD_WALLET_KEY`，也不放宽 `DeviceWalletSessionStore` 对缺少 `passphraseState` 的拒绝规则。
4. 运行 Core API 路由测试、类型检查及 Store 测试。

## 任务 5：让 App 透传新元数据但保持现有页面流转

**文件：**

- 修改：`../app-monorepo/packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- 修改：`../app-monorepo/packages/kit-bg/src/states/jotai/atoms/hardware.ts`
- 测试：在相邻目录新增或修改最小单元测试，覆盖 Hardware UI payload 转换

1. 先写失败测试：`REQUEST_PASSPHRASE` 的 `source/reason/expectedPassphraseState` 能经过后台服务进入 UI atom，旧字段仍存在。
2. 扩展 App 的硬件 UI payload 类型和事件转换逻辑，只透传可选元数据，不改变现有 UI 枚举和页面映射。
3. 验证三条交互保持原状：Host Passphrase → Loading；设备 Passphrase → 等待设备页；Attach PIN → 设备 PIN 页。
4. 运行 App 聚焦测试与受影响 package 的 TypeScript/ESLint 检查；不得覆盖 App 工作区已有的 Portfolio/DevSettings 修改。

## 任务 6：文档清理与最终回归

**文件：**

- 修改：`docs/superpowers/specs/2026-07-16-pro2-eventless-wallet-session-design.md`
- 修改：`docs/superpowers/specs/2026-07-16-pro2-eventless-index.md`
- 修改：`docs/sdk/pro2-eventless-migration.md`
- 修改：`docs/sdk/events.md`
- 按实现结果清理：`docs/device/wallet-session-and-security.md`、`docs/architecture/decisions.md`

1. 对照最终代码删除文档中的过时名称、重复说明和未实现承诺。
2. 明确 `PassphraseAck` 是旧 Host → Firmware ACK，`DeviceSessionOpen` 是新会话入口，两者并非简单改名。
3. 明确普通 Passphrase 可由 Host 或设备输入；主 PIN 与 Attach PIN 仅允许设备输入。
4. 明确标准钱包不缓存、隐藏钱包按 `deviceKey + passphraseState` 缓存，以及 App 兼容事件顺序。
5. 运行 Prettier、`git diff --check`、SDK 聚焦测试、SDK build/typecheck、App 聚焦测试和受影响 package lint。
6. 最终检查两个仓库的 `git status`，仅汇报本次实际修改，单独列出原先已存在的 App 工作区修改。
