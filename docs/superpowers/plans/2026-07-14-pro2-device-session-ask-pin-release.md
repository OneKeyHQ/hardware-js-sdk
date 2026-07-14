# Pro2 DeviceSessionAskPin Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Pro2 解锁迁移到 firmware-pro2/dev 已实现的 `DeviceSessionAskPin(60608) → DeviceSessionPinResult(60609) → DeviceStatusGet`，发布新的 SDK alpha，并同步 app-monorepo 后触发 Desktop Release。

**Architecture:** Protocol V2 protobuf 完全以 `submodules/firmware-pro2` 的最新 schema 为源，不再临时恢复旧 10030/10031。SDK 仅在 Protocol V2 使用新会话解锁消息，Protocol V1 的 `UnLockDevice` 路径保持不变；app 统一通过 `deviceUnlock`，不再绕过 Pro2。

**Tech Stack:** TypeScript、Jest、protobufjs、Yarn/Lerna、GitHub Actions、npm、app-monorepo Yarn 4。

---

### Task 1: 重新生成 Protocol V2 protobuf

**Files:**
- Modify: `submodules/firmware-pro2`
- Modify: `packages/hd-transport/scripts/protobuf-build.sh`
- Modify: `packages/hd-transport/__tests__/messages.test.js`
- Regenerate: `packages/hd-transport/messages-protocol-v2.json`
- Regenerate: `packages/core/src/data/messages/messages-protocol-v2.json`
- Regenerate: `packages/hd-transport/src/types/messages.ts`

- [ ] **Step 1: 写入失败测试**

```js
expect(v2Messages.nested.MessageType.values).toMatchObject({
  MessageType_DeviceSessionAskPin: 60608,
  MessageType_DeviceSessionPinResult: 60609,
});
expect(v2Messages.nested.MessageType.values).not.toHaveProperty('MessageType_UnLockDevice');
```

- [ ] **Step 2: 验证旧生成产物失败**

Run: `yarn workspace @onekeyfe/hd-transport test messages.test.js --runInBand`

Expected: FAIL，因为当前 JSON 只有临时恢复的 10030/10031。

- [ ] **Step 3: 删除旧 ID 临时覆盖并更新 requiredMessages**

```bash
# protobuf-build.sh 不再调用 restoreTemporaryMessageType，requiredMessages 改为：
DeviceSessionAskPin
DeviceSessionPinResult
```

- [ ] **Step 4: 从最新 firmware-pro2/dev 重新生成**

Run: `yarn update-protobuf`

Expected: 生成 JSON 与 TypeScript 类型包含 60608/60609，不包含 Protocol V2 的 10030/10031。

- [ ] **Step 5: 验证协议测试通过**

Run: `yarn workspace @onekeyfe/hd-transport test messages.test.js --runInBand`

Expected: PASS。

### Task 2: 迁移 Pro2 deviceUnlock

**Files:**
- Modify: `packages/core/__tests__/protocol-v2.test.ts`
- Modify: `packages/core/src/device/Device.ts`

- [ ] **Step 1: 将 Protocol V2 解锁测试改为新调用序列**

```ts
expect(typedCall.mock.calls).toEqual([
  ['DeviceSessionAskPin', 'DeviceSessionPinResult'],
  ['DeviceStatusGet', 'DeviceStatus', {}],
]);
```

- [ ] **Step 2: 验证测试先失败**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: FAIL，实际仍调用 `UnLockDevice`。

- [ ] **Step 3: 实现 Protocol V2 新解锁路径**

```ts
await this.commands.typedCall('DeviceSessionAskPin', 'DeviceSessionPinResult');
return refreshProtocolV2DeviceStatus(this);
```

Protocol V1 分支继续调用：

```ts
this.commands.typedCall('UnLockDevice', 'UnLockDeviceResponse');
```

- [ ] **Step 4: 验证 core 测试通过**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: PASS，且 V1 回归测试不变。

### Task 3: 验证、升级并发布 SDK alpha

**Files:**
- Modify: all SDK package `package.json`
- Modify: `yarn.lock`（如版本工具产生）

- [ ] **Step 1: 运行相关测试、lint 和构建**

Run: `yarn workspace @onekeyfe/hd-transport test --runInBand`

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Run: `yarn lint`

Run: `yarn build`

- [ ] **Step 2: 将全部 SDK 包升级到下一个未发布 alpha**

Run: `yarn lerna version 1.2.0-alpha.10 --no-git-tag-version --force-publish='*' --yes`

Run: `yarn check-versions`

- [ ] **Step 3: 显式提交并推送当前功能分支**

```bash
git add docs/superpowers/plans/2026-07-14-pro2-device-session-ask-pin-release.md \
  submodules/firmware-pro2 \
  packages/hd-transport/scripts/protobuf-build.sh \
  packages/hd-transport/__tests__/messages.test.js \
  packages/hd-transport/messages-protocol-v2.json \
  packages/hd-transport/src/types/messages.ts \
  packages/core/src/data/messages/messages-protocol-v2.json \
  packages/core/src/device/Device.ts \
  packages/core/__tests__/protocol-v2.test.ts \
  packages/*/package.json \
  packages/connect-examples/electron-example/package.json \
  packages/connect-examples/expo-example/package.json \
  packages/connect-examples/expo-playground/package.json
git commit -m "feat: support pro2 device session pin unlock"
git push origin feat/pro2-usb-ble
```

- [ ] **Step 4: 触发并验证 npm 发布**

Run: `gh workflow run package-publish.yml --ref feat/pro2-usb-ble`

Expected: workflow success；`@onekeyfe/hd-core@1.2.0-alpha.10` 可查询，`next` 指向 alpha.10。

### Task 4: 同步 app-monorepo 并删除 Pro2 绕过

**Files:**
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.getCompatibleConnectId.test.ts`
- Modify: `package.json`
- Modify: `apps/cli/package.json`
- Modify: `yarn.lock`
- Rename/regenerate: `patches/@onekeyfe+hd-core+1.2.0-alpha.10.patch`

- [ ] **Step 1: 保留已验证的 Pro2 解锁回归测试**

测试必须证明 locked Pro2 会调用 `unlockDevice({ connectId })` 并返回解锁后的 features。

- [ ] **Step 2: 更新所有 Hardware SDK 依赖到 alpha.10**

Run: `yarn install --mode=update-lockfile`

- [ ] **Step 3: 将 app 本地 hd-core forceTargets 补丁重基到 alpha.10**

Expected: Yarn postinstall 能成功应用新补丁，且 SDK 导出类型包含 app 所需 `forceTargets`。

- [ ] **Step 4: 验证 app**

Run: `yarn install --immutable --mode=skip-build`

Run: `yarn _packageVersions`

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.getCompatibleConnectId.test.ts --runInBand`

Run: `yarn tsc:only`

- [ ] **Step 5: 提交并推送 app 分支**

```bash
git add package.json apps/cli/package.json yarn.lock \
  packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts \
  packages/kit-bg/src/services/ServiceHardware/ServiceHardware.getCompatibleConnectId.test.ts \
  patches/@onekeyfe+hd-core+1.2.0-alpha.9.patch \
  patches/@onekeyfe+hd-core+1.2.0-alpha.10.patch
git commit -m "fix: enable pro2 device session pin unlock"
git push origin feat/pro2-usb-ble
```

### Task 5: 触发 Desktop Release

- [ ] **Step 1: 触发 release-desktop-all**

Run: `gh workflow run release-desktop-all.yml --ref feat/pro2-usb-ble -f source_ref_name=feat/pro2-usb-ble`

- [ ] **Step 2: 核对运行 SHA 与初始任务状态**

Expected: 新 run 的 `headSha` 等于 app 最新提交，renderer job 进入 queued/in_progress。
