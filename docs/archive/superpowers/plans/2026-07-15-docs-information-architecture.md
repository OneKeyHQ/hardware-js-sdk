# Hardware JS SDK 文档信息架构整理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将 `docs/` 整理为架构、协议、设备、SDK、业务、测试和归档七类，并保留 Pro2 历史材料中的有效知识。

**Architecture:** 长期维护文档按技术职责归类，阶段性设计、实施计划和分支对齐材料进入 `docs/archive/`。迁移后由 `docs/README.md` 提供唯一导航，正式文档承载当前事实，归档材料只用于追溯。

**Tech Stack:** Markdown、Git、Shell 链接检查

---

### Task 1: 机械迁移长期维护文档

**Files:**
- Move: `docs/architecture.md` → `docs/architecture/overview.md`
- Move: `docs/transport.md` → `docs/protocol/transport.md`
- Move: `docs/protocol-v2.md` → `docs/protocol/protocol-v2.md`
- Move: `docs/events.md` → `docs/sdk/events.md`
- Move: `docs/attachToPin.md` → `docs/device/security/attach-to-pin.md`
- Move: `docs/slip39.md` → `docs/device/security/slip39.md`
- Move: `docs/pro-init-session-passphrase.md` → `docs/device/session/pro-passphrase-session.md`
- Move: `docs/protocol-v2-deviceinfo-field-gaps.md` → `docs/device/device-info/protocol-v2-field-gaps.md`
- Move: `docs/device-method-support.md` → `docs/device/capabilities/method-support.md`
- Move: `docs/onekey-device-chain-support.md` → `docs/device/capabilities/chain-support.md`
- Move: `docs/chain.md` → `docs/business/chains/overview.md`
- Move: `docs/chain-evm.md` → `docs/business/chains/evm.md`
- Move: `docs/eip-7702.md` → `docs/business/chains/eip-7702.md`
- Move: `docs/pro2-ble-speed-test.md` → `docs/testing/pro2-ble-performance.md`

- [x] **Step 1: 创建所有有实际文档落点的目标目录**

Run:

```bash
mkdir -p docs/architecture docs/protocol docs/sdk \
  docs/device/security docs/device/session docs/device/device-info docs/device/capabilities \
  docs/business/chains docs/testing
```

Expected: 命令成功，不创建空的 `device-customization` 或 `firmware-update` 目录。

- [x] **Step 2: 使用 `git mv` 完成机械迁移**

按 Files 清单逐项执行 `git mv`，不在本步骤改写正文。

- [x] **Step 3: 核对迁移数量**

Run:

```bash
find docs -maxdepth 4 -type f -name '*.md' | sort
git status --short
```

Expected: 14 篇长期维护文档显示为重命名或移动，原路径不再存在。

### Task 2: 提炼 Pro2 稳定业务文档

**Files:**
- Create: `docs/business/device-settings.md`
- Create: `docs/business/device-customization/wallpaper.md`
- Create: `docs/business/firmware-update/pro2.md`
- Modify: `docs/protocol/protocol-v2.md`
- Modify: `docs/device/session/pro-passphrase-session.md`
- Modify: `docs/device/security/attach-to-pin.md`

- [x] **Step 1: 新建设备设置正式文档**

文档必须包含：适用范围、V1/V2 API 边界、`deviceSettingsGet/Set/PageShow` 接口表、可读字段、禁止静默写入的安全字段、页面枚举、解锁重试语义和关键代码位置。

- [x] **Step 2: 新建 Pro2 壁纸正式文档**

文档必须包含：公共 API、604×1024 输入约束、RGB565/RGB565A8 编码、文件名策略、Filesystem 分片流程、`SetWallpaper` 激活步骤、中断风险和关键代码位置。

- [x] **Step 3: 新建 Pro2 固件升级正式文档**

文档必须包含：V1/V2 API 分代、支持 target、ROMLOADER 限制、升级步骤、传输可靠性、远端 release 配置、返回值兼容和关键代码位置。

- [x] **Step 4: 将 Protocol V2 命名和消息边界合入正式协议文档**

在 `docs/protocol/protocol-v2.md` 中补充：三类 schema 名称、V2 消息 ID 边界、允许回退的少量交互消息、sequence/link generation 规则、公共方法与 protobuf 命名区别，以及 proto/两份 JSON 必须同源的约束。

- [x] **Step 5: 将钱包 Session 当前规则合入正式设备文档**

确认 `docs/device/session/pro-passphrase-session.md` 明确包含：V1/V2 分流、`btc_test_address` 到 `passphraseState` 的归一化、无效 session 单次重试、公共返回值 `string | undefined`、缓存失效时机。

- [x] **Step 6: 补充 Attach-to-PIN 与 Pro2 解锁边界**

在 `docs/device/security/attach-to-pin.md` 中增加 Pro2 章节，区分 `attach_to_pin_enabled`、`unlocked_by_attach_to_pin`、`unlocked_attach_pin`，说明设备端 PIN 输入、`DeviceLocked` 错误映射和声明式单次解锁重试。

- [x] **Step 7: 检查正式文档不存在相互矛盾的当前结论**

Run:

```bash
git diff -- docs/protocol docs/device docs/business
```

Expected: Pro2 对齐材料中的稳定结论均有正式落点，正文不把归档计划当作事实来源。

### Task 3: 归档工程过程文档

**Files:**
- Move: `docs/pro2-branch-alignment/` → `docs/archive/pro2-branch-alignment/`
- Move: `docs/superpowers/` → `docs/archive/superpowers/`
- Create: `docs/archive/README.md`
- Modify: `docs/archive/pro2-branch-alignment/README.md`
- Create: `docs/archive/superpowers/README.md`

- [x] **Step 1: 创建归档目录并移动 Pro2 对齐材料**

Run:

```bash
mkdir -p docs/archive
git mv docs/pro2-branch-alignment docs/archive/pro2-branch-alignment
```

- [x] **Step 2: 移动 Superpowers 记录**

Run:

```bash
git mv docs/superpowers docs/archive/superpowers
```

Expected: 本设计和本计划也随目录进入归档。

- [x] **Step 3: 新增归档总入口**

`docs/archive/README.md` 必须说明：归档内容不代表当前实现；当前事实从 `../README.md` 进入；Pro2 对齐材料是分支快照；Superpowers 保存设计与实施过程。

- [x] **Step 4: 标记两个归档区域的状态**

在 Pro2 对齐 README 顶部增加历史状态提示和正式文档链接；新建 Superpowers README，说明 `specs/` 与 `plans/` 的用途及非规范属性。

### Task 4: 重建文档导航并修复引用

**Files:**
- Modify: `docs/README.md`
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: all moved Markdown files containing relative links

- [x] **Step 1: 重写主文档索引**

`docs/README.md` 必须包含：推荐阅读路径、七类目录说明、完整正式文档索引、归档入口、包级 README 入口和“不在根目录新增文档”的维护规则。

- [x] **Step 2: 更新仓库根入口**

把 `README.md` 和 `CLAUDE.md` 中的旧路径替换为新路径；根 README 保持简洁，CLAUDE 按任务类型指向正式文档。

- [x] **Step 3: 修复移动文档内部相对链接**

至少更新 `attach-to-pin.md` 中指向 SLIP39、架构和传输文档的链接，并扫描其他 Markdown 相对链接。

- [x] **Step 4: 搜索旧路径残留**

Run:

```bash
rg -n 'docs/(architecture|transport|protocol-v2|events|attachToPin|slip39|pro-init-session-passphrase|protocol-v2-deviceinfo-field-gaps|device-method-support|onekey-device-chain-support|chain-evm|chain|eip-7702|pro2-ble-speed-test|pro2-branch-alignment|superpowers)(\.md|/)' \
  --glob '!submodules/**' .
```

Expected: 无指向旧位置的当前文档引用；归档文档中描述历史路径的文字可保留，但链接必须有效。

### Task 5: 验证目录、链接和变更边界

**Files:**
- Verify: all files under `docs/`

- [x] **Step 1: 检查 docs 根目录**

Run:

```bash
find docs -maxdepth 1 -type f -print | sort
```

Expected:

```text
docs/README.md
```

- [x] **Step 2: 运行本地 Markdown 相对链接检查**

Run:

```bash
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const files = execFileSync('git', ['ls-files', '*.md'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean).filter(file => !file.startsWith('submodules/'));
const broken = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) broken.push(`${file}: ${match[1]}`);
  }
}
if (broken.length) {
  console.error(broken.join('\n'));
  process.exit(1);
}
console.log(`Checked ${files.length} Markdown files: all relative links resolve.`);
NODE
```

Expected: 输出 `all relative links resolve` 并以 0 退出。

- [x] **Step 3: 检查格式和用户改动边界**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: 无空白错误；`pro2Demo/ble_tool.py`、`pro2Demo/webusb_test.html` 和 `submodules/firmware` 的既有状态保持不变。

- [x] **Step 4: 提交文档整理**

Run:

```bash
git add README.md CLAUDE.md docs
git commit -m "docs: reorganize SDK documentation"
```

Expected: 仅提交本轮文档和入口变更，不包含用户已有的其他工作区修改。
