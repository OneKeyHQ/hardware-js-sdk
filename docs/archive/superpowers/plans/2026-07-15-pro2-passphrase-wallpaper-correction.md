# Pro2 Passphrase 与壁纸链路修正实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `getPassphraseState` 公共返回值恢复为字符串，并把 Pro2 壁纸激活从 `DeviceSettingsSet.wallpaper_path` 修正为 `SetWallpaper`，同步 SDK、Expo Playground、App monorepo 与对齐文档。

**Architecture:** SDK 内部继续维护钱包 session、Attach PIN 和 passphrase protection 状态，但公共方法只暴露钱包标识字符串。壁纸仍由 SDK 编码并通过文件系统上传，上传成功后用固件定义的 `SetWallpaper` 指定锁屏目标和文件路径。

**Tech Stack:** TypeScript、Jest、React/Expo、Protocol Buffers、Yarn monorepo。

---

### Task 1: `getPassphraseState` 恢复字符串返回值

**Files:**
- Modify: `packages/core/__tests__/protocol-v2.test.ts`
- Modify: `packages/core/src/api/GetPassphraseState.ts`
- Modify: `packages/core/src/types/api/getPassphraseState.ts`
- Modify: `packages/core/src/types/api/index.ts`

- [ ] 修改现有 Protocol V1、Pro、Pro2 方法级测试，期望公共方法直接返回 `passphraseState` 字符串或 `undefined`。
- [ ] 运行对应 Jest 测试，确认当前对象实现导致断言失败。
- [ ] 保留 `getPassphraseStateWithRefreshDeviceInfo` 的内部对象结果，只让 `GetPassphraseState.run()` 返回字符串。
- [ ] 将声明改为 `Response<string | undefined>`，移除公共 `GetPassphraseStatePayload` 导出。
- [ ] 重新运行测试并确认通过。

### Task 2: 壁纸激活改用 `SetWallpaper`

**Files:**
- Modify: `packages/core/__tests__/pro2Wallpaper.test.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- Modify: `packages/connect-examples/expo-playground/app/routes/pro2-debug.tsx`
- Modify: `packages/connect-examples/expo-playground/app/data/methods/device.ts`

- [ ] 增加方法级测试，模拟目录创建和分片写入，并断言最后调用为 `SetWallpaper -> Success`，参数为 `WallpaperTarget.Lock` 和上传路径。
- [ ] 运行测试，确认当前实现因调用 `DeviceSettingsSet` 而失败。
- [ ] 导入 `WallpaperTarget`，将最后一步改为 `typedCall('SetWallpaper', 'Success', { target: WallpaperTarget.Lock, path })`。
- [ ] 更新 Expo Playground 的 wire info 和说明，删除 `DeviceSettingsSet` 壁纸链路描述。
- [ ] 运行壁纸相关测试并确认通过。

### Task 3: App monorepo 回退字符串消费语义

**Files:**
- Modify: `/Users/caikaisheng/Documents/GitHub/app-monorepo/packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Modify: `/Users/caikaisheng/Documents/GitHub/app-monorepo/packages/kit-bg/src/services/ServiceAccount/hardwarePassphraseState.ts`
- Modify: `/Users/caikaisheng/Documents/GitHub/app-monorepo/packages/kit/src/views/Onboarding/pages/ConnectHardwareWallet/passphraseStateUtils.ts`
- Modify/Test: 对应现有测试文件

- [ ] 先修改测试，使 ServiceHardware 与隐藏钱包辅助函数只接受字符串返回值。
- [ ] 运行目标测试，确认对象兼容代码与类型导致失败。
- [ ] 将 `getPassphraseStateBase` 返回类型改为 `Promise<string | undefined>`，删除协议字段和对象形状检查。
- [ ] 删除 `hardwarePassphraseState` 的对象兼容分支，直接返回字符串。
- [ ] Onboarding 不再从 passphrase 返回对象推断 `passphraseProtection/unlockedAttachPin`，改用当前 Features；字符串只用于确认钱包状态存在。
- [ ] 运行目标测试和 TypeScript 检查。

### Task 4: 清理并修正文档

**Files:**
- Modify/Delete within: `docs/pro2-branch-alignment/`

- [ ] 保留目录和有长期价值的功能文档。
- [ ] 删除重复描述或仅记录错误对象返回值的段落。
- [ ] 将 `getPassphraseState` 文档恢复为字符串返回值。
- [ ] 将壁纸链路修正为 `FilesystemFileWrite + SetWallpaper(Lock, path)`。
- [ ] 更新 README、兼容说明和检查清单中的风险项。

### Task 5: 最终验证

**Files:**
- Verify both repositories without unrelated edits.

- [ ] 运行 SDK 的 Protocol V2、壁纸和类型检查。
- [ ] 运行 App monorepo 的相关 Jest 测试与类型检查。
- [ ] 搜索并确认生产代码中不存在 `getPassphraseState(...).passphraseState` 对象式消费。
- [ ] 搜索并确认 SDK/Expo 壁纸激活不再使用 `DeviceSettingsSet.wallpaper_path`。
- [ ] 查看两个仓库的最终 diff，确认未覆盖用户原有无关改动。
