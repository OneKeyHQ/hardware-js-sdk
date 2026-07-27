# Unified DeviceState Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Expo Playground and Expo Example teach `getDeviceState()` as the canonical V1/V2 device information API while retaining `getFeatures()` only for explicit Protocol V1 compatibility tests.

**Architecture:** Example runtime state stores the SDK `DeviceState` snapshot directly. Device list hydration and refresh read identity/status from that snapshot without constructing Pro2 `Features`; V1-only tools continue to call `getFeatures()` and are labeled as compatibility paths.

**Tech Stack:** TypeScript, React, Zustand, Jotai, Jest, Expo, hd-core.

---

### Task 1: Define Expo Playground API examples

**Files:**

- Modify: `packages/connect-examples/expo-playground/app/data/methods/device.test.ts`
- Modify: `packages/connect-examples/expo-playground/app/data/methods/device.ts`
- Modify: `packages/connect-examples/expo-playground/app/i18n/locales/en.ts`
- Modify: `packages/connect-examples/expo-playground/app/i18n/locales/zh.ts`

- [ ] **Step 1: Write the failing method configuration test**

Assert that `getDeviceState` exposes cached, identity/versions, settings, and status presets, and that `getFeatures` description resolves to a V1 compatibility label.

- [ ] **Step 2: Run the test and verify it fails**

Run: `yarn jest app/data/methods/device.test.ts --runInBand`

Expected: FAIL because settings/status presets and compatibility text are missing.

- [ ] **Step 3: Implement the method presets and translations**

Keep `getFeatures` callable, but rename its description to “Get legacy Features (Protocol V1 compatibility only)” and the equivalent Chinese copy. Add explicit `refresh: ['settings']` and `refresh: ['status']` presets without making either the default.

- [ ] **Step 4: Run the test and verify it passes**

Run: `yarn jest app/data/methods/device.test.ts --runInBand`

Expected: PASS.

### Task 2: Store and hydrate canonical DeviceState in Expo Playground

**Files:**

- Modify: `packages/connect-examples/expo-playground/app/types/hardware.ts`
- Modify: `packages/connect-examples/expo-playground/app/store/deviceStore.ts`
- Create: `packages/connect-examples/expo-playground/app/services/deviceStateAdapter.test.ts`
- Create: `packages/connect-examples/expo-playground/app/services/deviceStateAdapter.ts`
- Modify: `packages/connect-examples/expo-playground/app/services/hardwareService.ts`

- [ ] **Step 1: Write failing adapter tests**

Test that a `DeviceState` updates serial number, device ID, device type, label and user-facing display name, while connection name follows `bleName || label || existing name`. Test that no `Features` object is fabricated.

- [ ] **Step 2: Run the adapter tests and verify they fail**

Run: `yarn jest app/services/deviceStateAdapter.test.ts --runInBand`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Add canonical state fields and adapter**

Add `deviceState?: DeviceState` to `DeviceInfo`, `deviceState` plus `setDeviceState` to the Zustand store, and a pure `applyDeviceStateToDevice(device, state)` adapter. The adapter must preserve existing V1 `features` instead of projecting a new one.

- [ ] **Step 4: Replace hydration getFeatures call**

Call `sdk.getDeviceState(device.connectId)`, apply the adapter, store the snapshot, and log `identity.serialNo/deviceId/displayName`. On failure, keep the original search result and do not fall back to `getFeatures()`.

- [ ] **Step 5: Run adapter and method tests**

Run: `yarn jest app/services/deviceStateAdapter.test.ts app/data/methods/device.test.ts --runInBand`

Expected: PASS.

### Task 3: Refresh Playground state and passphrase information canonically

**Files:**

- Create: `packages/connect-examples/expo-playground/app/services/deviceStateSelectors.test.ts`
- Create: `packages/connect-examples/expo-playground/app/services/deviceStateSelectors.ts`
- Modify: `packages/connect-examples/expo-playground/app/services/hardwareService.ts`
- Modify: `packages/connect-examples/expo-playground/app/hooks/useHardwareMethodExecution.ts`

- [ ] **Step 1: Write failing selector tests**

Test that passphrase protection returns `true`, `false`, or `undefined` directly from `state.status.passphraseProtection`, and that firmware versions are read from `state.versions` without a Features conversion.

- [ ] **Step 2: Run selector tests and verify they fail**

Run: `yarn jest app/services/deviceStateSelectors.test.ts --runInBand`

Expected: FAIL because selectors do not exist.

- [ ] **Step 3: Implement selectors and replace refresh calls**

Use cached `deviceState` for passphrase decisions. If no snapshot exists, call cached `getDeviceState(connectId)` once; do not request status implicitly. Change `refreshCurrentDeviceInfo` to call `getDeviceState` and update `currentDevice.deviceState` plus the store snapshot. Retain `getOnekeyFeatures` only where the screen explicitly demonstrates that OneKey-specific API.

- [ ] **Step 4: Run selector tests and Playground typecheck**

Run: `yarn jest app/services/deviceStateSelectors.test.ts --runInBand && yarn typecheck`

Expected: PASS.

### Task 4: Correct Pro2 Debug API explanations

**Files:**

- Modify: `packages/connect-examples/expo-playground/app/routes/pro2-debug.test.ts`
- Modify: `packages/connect-examples/expo-playground/app/routes/pro2-debug.tsx`

- [ ] **Step 1: Write failing debug configuration tests**

Assert that public groups do not include `deviceInfoGet`, `deviceStatusGet`, or `deviceSettingsGet`, and that `getDeviceState` documentation distinguishes cached reads from explicit identity/settings/status refreshes.

- [ ] **Step 2: Run the test and verify it fails**

Run: `yarn jest app/routes/pro2-debug.test.ts --runInBand`

Expected: FAIL because wire information currently implies every state read sends `DeviceInfoGet`.

- [ ] **Step 3: Update the debug explanation**

Describe `getDeviceState` as a canonical snapshot whose wire calls depend on `refresh`. Remove unused raw status/settings query metadata. Keep write/settings-page and filesystem debug methods unchanged.

- [ ] **Step 4: Run the debug test and verify it passes**

Run: `yarn jest app/routes/pro2-debug.test.ts --runInBand`

Expected: PASS.

### Task 5: Migrate Expo Example public demonstration paths

**Files:**

- Create: `packages/connect-examples/expo-example/src/utils/deviceStateAdapter.test.ts`
- Create: `packages/connect-examples/expo-example/src/utils/deviceStateAdapter.ts`
- Modify: `packages/connect-examples/expo-example/src/components/DeviceList.tsx`
- Modify: `packages/connect-examples/expo-example/src/data/basic.ts`
- Modify: `packages/connect-examples/expo-example/src/data/pro2.ts`

- [ ] **Step 1: Write failing Expo Example adapter/config tests**

Test that selected device identity comes from `DeviceState`, `getDeviceState` is the primary Basic API, `getFeatures` is labeled V1-only, and Pro2 presets include cached, versions, settings, and explicit status.

- [ ] **Step 2: Run tests and verify they fail**

Run the repository Jest command targeting the new adapter/config test.

Expected: FAIL before adapter and config changes.

- [ ] **Step 3: Implement device selection and API configuration**

Replace the DeviceList `getFeatures` call with `getDeviceState`. Preserve V1-only test tools elsewhere. Reorder and relabel Basic API entries and add the canonical Pro2 presets.

- [ ] **Step 4: Run Expo Example TypeScript verification**

Run: `yarn tsc --noEmit -p packages/connect-examples/expo-example/tsconfig.json`

Expected: PASS.

### Task 6: Verify, document, and commit

**Files:**

- Modify: `packages/connect-examples/expo-playground/README.md`

- [ ] **Step 1: Update README API guidance**

Document `getDeviceState` as the normal integration path and `getFeatures` as V1 compatibility only.

- [ ] **Step 2: Run full relevant verification**

Run SDK Core tests, Expo Playground Jest/typecheck/build, Expo Example typecheck, formatting, ESLint on changed files, and `git diff --check`.

- [ ] **Step 3: Commit implementation**

Commit message: `refactor(examples): demonstrate canonical device state api`.

- [ ] **Step 4: Push both repositories and open PRs**

Push `codex/unified-device-state` in SDK and App. Create two PRs with base `feat/pro2-usb-ble`; explain that the App PR depends on the SDK PR and list test results.
