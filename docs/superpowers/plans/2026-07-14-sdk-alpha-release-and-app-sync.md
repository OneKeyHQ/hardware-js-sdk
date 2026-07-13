# SDK Alpha 发布与 App 同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 审查并发布包含 Pro2 Protocol V2 Session/Unlock 变更的 `1.2.0-alpha.9` SDK，然后将 app-monorepo 同步到该版本并触发 Desktop 全平台构建。

**Architecture:** SDK 仓库先完成提交范围审查、协议生成一致性检查和包级验证，再统一提升所有独立包及内部依赖到同一个 alpha 版本，通过 `publish-npm-packages` workflow 发布到 npm `next` 标签。npm 可见后，app-monorepo 只更新 OneKey hardware SDK 依赖与 lockfile，推送同名功能分支，并从该分支触发 `release-desktop-all`。

**Tech Stack:** TypeScript、Jest、Yarn 1、Lerna 4、npm registry、GitHub Actions、GitHub CLI。

---

### Task 1: 审查 SDK 协议与 Session 实现

**Files:**
- Review: `packages/core/src/device/DeviceWalletSessionStore.ts`
- Review: `packages/core/src/protocols/protocol-v2/walletSession.ts`
- Review: `packages/core/src/device/Device.ts`
- Review: `packages/core/src/api/protocol-v2/DeviceStatusGet.ts`
- Review: `packages/core/src/api/protocol-v2/DeviceSessionGet.ts`
- Review: `packages/hd-transport/scripts/protobuf-build.sh`
- Review: `packages/hd-transport/messages-protocol-v2.json`
- Test: `packages/core/__tests__/protocol-v2.test.ts`
- Test: `packages/core/__tests__/device-wallet-session-store.test.ts`
- Test: `packages/hd-transport/__tests__/messages.test.js`

- [ ] **Step 1: 检查提交范围和协议 ID**

Run:

```bash
git diff c6b63591..HEAD --stat
rg -n 'MessageType_(GetPassphraseState|PassphraseState|UnLockDevice|UnLockDeviceResponse|DeviceStatusGet|DeviceStatus|DeviceSessionGet|DeviceSession)' packages/hd-transport/messages-protocol-v2.json packages/core/src/data/messages/messages-protocol-v2.json
```

Expected: V2 只包含 unlock `10030/10031`、status `60602/60603`、session `60606/60607`；不包含旧 passphrase `10028/10029` ID。

- [ ] **Step 2: 检查 Session 生命周期和错误边界**

确认缓存严格使用 `deviceKey + passphraseState`，无 passphraseState 时不扫描其他钱包；invalid session 和钱包状态不一致会清理当前缓存；V2 unlock 使用 `UnLockDevice -> DeviceStatusGet`；V1 路径不改变。

- [ ] **Step 3: 运行发布前验证**

Run:

```bash
yarn --cwd packages/hd-transport test --runInBand
yarn --cwd packages/core test protocol-v2.test.ts device-wallet-session-store.test.ts --runInBand
yarn eslint packages/core/src/device/DeviceWalletSessionStore.ts packages/core/src/protocols/protocol-v2/walletSession.ts packages/core/src/device/Device.ts packages/core/src/api/protocol-v2/DeviceStatusGet.ts packages/core/src/api/protocol-v2/DeviceSessionGet.ts packages/hd-transport/__tests__/messages.test.js
yarn --cwd packages/hd-transport build
yarn --cwd packages/core build
```

Expected: 所有相关测试、ESLint 和构建退出码为 0；已知 Core 全量 EVM Ledger safety 测试不作为本发布变更的阻断项，但必须在结果中记录。

- [ ] **Step 4: 提交审查修复或审查记录**

如审查产生代码修复，使用显式文件路径提交；如无代码问题，仅将本计划与后续版本变更一并提交。

### Task 2: 发布 SDK `1.2.0-alpha.9`

**Files:**
- Modify: `packages/*/package.json`
- Modify: `packages/connect-examples/expo-example/package.json`
- Modify: `packages/connect-examples/expo-playground/package.json`
- Modify: `yarn.lock`

- [ ] **Step 1: 确认目标版本未发布**

Run:

```bash
npm view @onekeyfe/hd-core@1.2.0-alpha.9 version
```

Expected: npm 返回 404，表示该版本可用。

- [ ] **Step 2: 使用 Lerna 统一提升版本**

Run:

```bash
yarn lerna version 1.2.0-alpha.9 --no-git-tag-version --force-publish='*' --yes
yarn check-versions
```

Expected: 所有发布包版本和内部 `@onekeyfe/*` 依赖统一为 `1.2.0-alpha.9`，版本检查通过。

- [ ] **Step 3: 验证版本变更并提交**

Run:

```bash
git diff --check
git diff -- packages yarn.lock
```

Commit:

```bash
git commit --only packages yarn.lock docs/superpowers/plans/2026-07-14-sdk-alpha-release-and-app-sync.md -m "chore: release hardware sdk 1.2.0-alpha.9"
```

- [ ] **Step 4: 推送并触发 npm 发布 workflow**

Run:

```bash
git push origin feat/pro2-usb-ble
gh workflow run package-publish.yml --ref feat/pro2-usb-ble
gh run list --workflow package-publish.yml --branch feat/pro2-usb-ble --limit 1
```

Expected: 新 workflow run 的 `headBranch` 为 `feat/pro2-usb-ble`。

- [ ] **Step 5: 等待 npm 发布完成并校验 registry**

Run:

```bash
RUN_ID=$(gh run list --workflow package-publish.yml --branch feat/pro2-usb-ble --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
npm view @onekeyfe/hd-core@1.2.0-alpha.9 version
npm view @onekeyfe/hd-transport@1.2.0-alpha.9 version
```

Expected: workflow 成功，两个关键包均返回 `1.2.0-alpha.9`。

### Task 3: 同步 app-monorepo 并触发 Desktop Release All

**Files:**
- Modify: `/Users/caikaisheng/Documents/GitHub/app-monorepo/package.json`
- Modify: `/Users/caikaisheng/Documents/GitHub/app-monorepo/apps/cli/package.json`
- Modify: `/Users/caikaisheng/Documents/GitHub/app-monorepo/yarn.lock`

- [ ] **Step 1: 更新所有 `1.2.0-alpha.8` hardware SDK 依赖**

在 app-monorepo 中将所有 `@onekeyfe/hd-*` 的 `1.2.0-alpha.8` 精确版本更新为 `1.2.0-alpha.9`，保持 `hwk-*` 版本不变，然后运行：

```bash
yarn install --mode=update-lockfile
rg -n '1\.2\.0-alpha\.8' package.json apps/cli/package.json yarn.lock
```

Expected: hardware SDK 相关旧版本无残留，lockfile 解析到 `1.2.0-alpha.9`。

- [ ] **Step 2: 运行 app 依赖验证并提交**

Run:

```bash
yarn _packageVersions
git diff --check
```

Commit:

```bash
git commit --only package.json apps/cli/package.json yarn.lock -m "chore: update hardware sdk to 1.2.0-alpha.9"
```

- [ ] **Step 3: 推送 app 分支并触发 Desktop 全平台工作流**

Run:

```bash
git push origin feat/pro2-usb-ble
gh workflow run release-desktop-all.yml --ref feat/pro2-usb-ble -f source_ref_name=feat/pro2-usb-ble
gh run list --workflow release-desktop-all.yml --branch feat/pro2-usb-ble --limit 1
```

Expected: 新 workflow run 使用 app-monorepo 的 `feat/pro2-usb-ble` 提交，Desktop macOS、Windows、Linux 作业开始执行；发布行为使用 workflow 当前默认值。

- [ ] **Step 4: 确认 workflow 已进入执行状态**

Run:

```bash
RUN_ID=$(gh run list --workflow release-desktop-all.yml --branch feat/pro2-usb-ble --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view "$RUN_ID" --json status,conclusion,headBranch,headSha,url
```

Expected: `headBranch=feat/pro2-usb-ble`，`status` 为 queued 或 in_progress，且 `headSha` 对应本轮 app 依赖升级提交。
