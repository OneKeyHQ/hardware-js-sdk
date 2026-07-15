# Pro2 Deep Dive 文档清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 删除根目录过时的 Pro2 Deep Dive 文档，并确认其中仍有效的内容已经由当前正式文档承载。

**Architecture:** 以当前 Protocol V2 编码、Transport 探测和 DeviceInfo 实现为证据，对照原文逐项判断。正式文档已经覆盖的内容不重复迁移，错误或过时描述直接随原文删除，Git 历史负责追溯。

**Tech Stack:** Markdown、TypeScript 源码核对、Git、Prettier

---

### Task 1: 核对原文与当前实现

**Files:**

- Read: `OneKey_Pro2_Deep_Dive.md`
- Read: `packages/hd-transport/src/protocols/v2/encode.ts`
- Read: `packages/hd-transport/src/constants.ts`
- Read: `packages/hd-transport-web-device/src/webusb.ts`
- Read: `packages/hd-transport-react-native/src/index.ts`
- Read: `packages/core/src/protocols/protocol-v2/features.ts`
- Read: `docs/protocol/protocol-v2.md`
- Read: `docs/protocol/transport.md`
- Read: `docs/architecture/overview.md`

- [x] **Step 1: 验证当前 wire format**

检查 `encode.ts` 和常量，确认当前 V2 使用 `0x5A`、little-endian frame length、CRC8、router、attribute、1-255 sequence，以及 `PROTOCOL_V2_FRAME_MAX_BYTES` 限制。

- [x] **Step 2: 验证当前协议探测**

检查 WebUSB 和 React Native Transport，确认显式协议只验证指定协议；普通路径按 protocol hint 和 V1/V2 probe 顺序完成实际请求验证，不使用原文的单首字节伪代码。

- [x] **Step 3: 验证当前设备信息来源**

检查 `features.ts`，确认 Pro2 通过 `DeviceInfoGet` 的字段选择构建兼容 Features，而不是继续依赖原文描述的 Legacy `GetFeatures` 流程。

- [x] **Step 4: 对照正式文档覆盖情况**

确认以下内容已经存在：

- `docs/protocol/transport.md` 的 V1/V2 帧、message id 字节序和探测差异。
- `docs/protocol/protocol-v2.md` 的完整帧格式、message payload、schema、link 和消息表。
- `docs/architecture/overview.md` 的 DeviceInfo、DeviceStatus、DeviceSession 职责分工。

Expected: 原文不存在需要新增正式文档才能保留的唯一有效内容。

### Task 2: 按当前实现修正正式文档并删除过时根文档

**Files:**

- Modify: `docs/protocol/protocol-v2.md`
- Modify: `docs/protocol/transport.md`
- Modify: `docs/architecture/overview.md`
- Delete: `OneKey_Pro2_Deep_Dive.md`

- [x] **Step 1: 修正 Protocol V2 参数和探测语义**

把统一 `4096` 文件分片说明改为 WebUSB `4000`、BLE `1800`；把显式 V2 改为信任调用方提示并跳过重复探测；把 V1/V2 都失败后的行为改为抛出协议探测错误。

- [x] **Step 2: 修正 Transport schema 和流程图**

明确 V2 编码只能使用 `v2Schema`，仅允许白名单历史交互响应在解码时回退 V1 schema；三个 transport 流程图在双协议探测失败后都进入错误状态。

- [x] **Step 3: 修正 Architecture 探测边界**

明确 `connectProtocol='V1'` 会验证 V1，`connectProtocol='V2'` 用于上层已经确认协议的重连路径并跳过重复探测；默认双 probe 失败时抛错。

- [x] **Step 4: 删除文件**

Run:

```bash
git rm OneKey_Pro2_Deep_Dive.md
```

Expected: 文件进入 staged deletion，仓库根目录不再出现该文档。

- [x] **Step 5: 搜索引用和过时名称**

Run:

```bash
rg -n 'OneKey_Pro2_Deep_Dive|Pro2_Deep_Dive' --glob '!submodules/**' .
```

Expected: 除本实施计划和设计记录对旧文件名的历史说明外，没有当前入口或链接引用。

### Task 3: 验证并提交

**Files:**

- Verify: `docs/protocol/protocol-v2.md`
- Verify: `docs/protocol/transport.md`
- Verify: `docs/architecture/overview.md`
- Verify: `docs/archive/superpowers/specs/2026-07-15-pro2-deep-dive-cleanup-design.md`
- Verify: `docs/archive/superpowers/plans/2026-07-15-pro2-deep-dive-cleanup.md`

- [x] **Step 1: 检查正式文档没有吸收旧结论**

Run:

```bash
rg -n 'Proto V0|优先调用 `OnekeyGetFeatures`|单次最大 2048B|发送.*Proto V0.*GetFeatures' docs \
  --glob '!docs/archive/**'
```

Expected: 正式文档没有匹配结果。

- [x] **Step 2: 检查格式和工作区边界**

Run:

```bash
node_modules/.bin/prettier --check \
  docs/archive/superpowers/specs/2026-07-15-pro2-deep-dive-cleanup-design.md \
  docs/archive/superpowers/plans/2026-07-15-pro2-deep-dive-cleanup.md
git diff --check
git status --short
```

Expected: 格式和空白检查通过；用户已有的 `pro2Demo` 删除、固件子模块变化和并发新增的 `docs/superpowers/` 文件保持不变。

- [x] **Step 3: 提交清理**

Run:

```bash
git add OneKey_Pro2_Deep_Dive.md \
  docs/architecture/overview.md \
  docs/protocol/protocol-v2.md \
  docs/protocol/transport.md \
  docs/archive/superpowers/plans/2026-07-15-pro2-deep-dive-cleanup.md
git commit -m "docs: remove outdated Pro2 deep dive"
```

Expected: 提交只包含根文档删除、三篇正式文档修正和本实施计划。
