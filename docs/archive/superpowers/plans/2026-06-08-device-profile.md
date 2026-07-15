# Device Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `getDeviceInfo` return the SDK standard device model while keeping `getFeatures` as the legacy compatibility API.

**Architecture:** Add a `DeviceProfile` canonical model and protocol-specific adapters. `Device` stores both legacy `features` and canonical `profile`; internal helpers prefer profile and fall back to features during migration.

**Tech Stack:** TypeScript, Jest, existing `@onekeyfe/hd-core` API patterns.

---

### Task 1: Add Canonical DeviceProfile Types And Builders

**Files:**

- Modify: `packages/core/src/types/api/getDeviceInfo.ts`
- Create: `packages/core/src/deviceProfile/buildDeviceProfile.ts`
- Create: `packages/core/src/deviceProfile/deviceProfileUtils.ts`
- Create: `packages/core/src/deviceProfile/index.ts`

- [x] Define `DeviceProfile` with fixed `se01`-style version and verify fields.
- [x] Add `buildProfileFromProtocolV1(features, onekeyFeatures?, options?)`.
- [x] Add `buildProfileFromProtocolV2(descriptor, deviceInfo, options?)`.
- [x] Keep profile fields as the direct canonical access surface instead of exporting one-to-one accessors.

### Task 2: Wire getDeviceInfo To DeviceProfile

**Files:**

- Modify: `packages/core/src/api/GetDeviceInfo.ts`
- Modify: `packages/core/src/api/helpers/deviceInfo.ts`
- Modify: `packages/core/__tests__/protocol-v2.test.ts`

- [x] Return `DeviceProfile` from `getDeviceInfo`.
- [x] For Pro2, map internal `DeviceInfoGet` directly to `DeviceProfile`.
- [x] Remove the old unified device info alias and standardize on `DeviceProfile`.
- [x] Update tests to assert direct V2 fields.

### Task 3: Store Profile On Device And Prefer It Internally

**Files:**

- Modify: `packages/core/src/device/Device.ts`
- Modify: `packages/core/src/utils/index.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [x] Add `profile?: DeviceProfile` to `Device`.
- [x] Update profile when features are refreshed or Protocol V2 info is read.
- [x] Make `toMessageObject`, `hasUsePassphrase`, and `checkDeviceId` prefer profile.
- [x] Keep `features` populated for `getFeatures` compatibility.

### Task 4: Verify Compatibility

**Files:**

- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [x] Run `yarn --cwd packages/core test protocol-v2.test.ts --runInBand`.
- [x] Run `yarn --cwd packages/core test preInitialize.test.ts --runInBand`.
- [x] Check `git diff` for unrelated churn.
