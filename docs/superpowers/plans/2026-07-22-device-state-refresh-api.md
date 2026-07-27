# Device State Refresh API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate cached device-state reads from explicit hardware synchronization while preserving one canonical `DeviceState` model.

**Architecture:** Public callers use `getDeviceState(connectId)` for the canonical snapshot and `refreshDeviceState(connectId, { scope })` for explicit I/O. SDK-internal code keeps fine-grained refresh sections and raw protocol payload access; public scopes map to protocol-neutral business intents.

**Tech Stack:** TypeScript, Jest, Rollup, React/Expo examples, app-monorepo service layer.

---

### Task 1: Define and test the public API boundary

**Files:**

- Modify: `packages/core/__tests__/public-device-state-api.test.ts`
- Modify: `packages/core/src/types/api/getDeviceState.ts`
- Create: `packages/core/src/types/api/refreshDeviceState.ts`
- Modify: `packages/core/src/types/api/index.ts`
- Modify: `packages/core/src/inject.ts`
- Modify: `packages/core/src/api/index.ts`
- Create: `packages/core/src/api/RefreshDeviceState.ts`

- [ ] Add failing tests asserting `getDeviceState` accepts no refresh/raw options and `refreshDeviceState` is exposed.
- [ ] Run the focused API test and verify it fails because `refreshDeviceState` is missing.
- [ ] Add `DeviceStateRefreshScope = 'basic' | 'firmware' | 'settings' | 'runtime'` and the public method type.
- [ ] Wire the method through Core API injection and method exports.
- [ ] Run the focused test and verify it passes.

### Task 2: Separate internal reads from explicit refresh

**Files:**

- Modify: `packages/core/src/device/Device.ts`
- Modify: `packages/core/src/api/GetDeviceState.ts`
- Create: `packages/core/__tests__/refresh-device-state.test.ts`
- Modify: `packages/core/__tests__/get-device-state.test.ts`
- Modify: `packages/core/src/api/GetFeatures.ts`

- [ ] Add failing tests for scope-to-command mapping and unsupported runtime refresh in boot mode.
- [ ] Introduce an internal state-read options type containing `refreshSections` and `includeRaw`.
- [ ] Make public `GetDeviceState` call the cached/minimal path only.
- [ ] Make `RefreshDeviceState` map public scopes to internal sections and return the same full snapshot.
- [ ] Keep `GetFeatures` on the internal raw-enabled path for Protocol V1 only.
- [ ] Run focused state tests and verify they pass.

### Task 3: Migrate SDK examples and documentation

**Files:**

- Modify: `packages/connect-examples/expo-playground/app/data/methods/device.ts`
- Modify: `packages/connect-examples/expo-playground/app/data/methods/device.test.ts`
- Modify: `packages/connect-examples/expo-playground/app/routes/pro2-debug.tsx`
- Modify: `packages/connect-examples/expo-example/src/data/basic.ts`
- Modify: `packages/connect-examples/expo-example/src/data/pro2.ts`
- Modify: `packages/connect-examples/expo-example/src/views/FirmwareScreen/index.tsx`
- Modify: `packages/connect-examples/react-native-demo/ble/src/BleDemoScreen.tsx`
- Modify: `packages/connect-examples/expo-playground/README.md`
- Modify: `packages/connect-examples/developer-portal/content/en/hardware-sdk/basic-api/get-device-info.mdx`
- Modify: `packages/connect-examples/developer-portal/content/zh/hardware-sdk/basic-api/get-device-info.mdx`

- [ ] Add failing example tests for the new method and scope presets.
- [ ] Replace public refresh arrays with `refreshDeviceState({ scope })`.
- [ ] Document that `getDeviceState` is cache/minimal-init and refresh is explicit I/O.
- [ ] Run example tests, typecheck, lint, and Playground build.

### Task 4: Migrate app-monorepo service consumers

**Files:**

- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Modify: `packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.ts`
- Modify: `apps/cli/src/signer/base/SignerHardwareBase.ts`
- Modify: `apps/cli/src/commands/auth/hardware-login-command.ts`
- Modify: `packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/dialog/DialogDeviceAbout.tsx`
- Modify: related tests adjacent to these files.

- [ ] Update failing mocks and expectations to distinguish cached reads from refresh calls.
- [ ] Route firmware/settings/runtime intents to the matching public scope.
- [ ] Preserve the App service cache and event synchronization behavior.
- [ ] Run all related App tests and `yarn tsc:only`.

### Task 5: Verify and publish

**Files:**

- Modify: the existing SDK and App Draft PR branches.

- [ ] Run Core full tests and builds in dependency order.
- [ ] Run all changed-file lint and diff checks.
- [ ] Commit SDK and App changes separately.
- [ ] Push both branches and update the existing Draft PR descriptions.
