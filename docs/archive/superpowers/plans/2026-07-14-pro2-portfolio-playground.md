# Pro 2 Portfolio Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Pro 2 Portfolio SDK business API and add an Expo Playground page that can send Server Base64, local PFOL files, or a bundled development example through the required staged-write plus `PortfolioUpdate` flow.

**Architecture:** `UploadPortfolio` owns the device contract and exposes one safe public method. Playground parsing and PFOL preflight live in a focused utility, while the route owns input selection, device gating, progress, logs, and result presentation. The App monorepo consumes the released SDK API through its existing silent hardware service and retains deduplication/cooldown in the background runtime.

**Tech Stack:** TypeScript, React, React Router, Expo Playground web components, Jest, Lerna, OneKey Protocol V2.

---

### Task 1: Finish and verify the SDK Portfolio API

**Files:**
- Create: `packages/core/src/api/UploadPortfolio.ts`
- Modify: `packages/core/src/api/index.ts`
- Modify: `packages/core/src/inject.ts`
- Modify: `packages/core/src/types/api/protocolV2.ts`
- Modify: `packages/core/src/types/api/index.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: Keep the failing behavior tests**

Verify tests assert that the first call writes to `vol1:/portfolio/portfolio.pfol.pending`, the second call is `PortfolioUpdate`, and a failed write prevents the apply call.

- [ ] **Step 2: Run the focused test**

Run:

```bash
yarn jest packages/core/__tests__/protocol-v2.test.ts --runInBand -t UploadPortfolio
```

Expected: both `UploadPortfolio` tests pass.

- [ ] **Step 3: Verify exports, lint, and build**

Run:

```bash
yarn eslint packages/core/src/api/UploadPortfolio.ts packages/core/src/api/index.ts packages/core/src/inject.ts packages/core/src/types/api/protocolV2.ts packages/core/src/types/api/index.ts packages/core/__tests__/protocol-v2.test.ts
yarn --cwd packages/core build
```

Expected: exit code 0. Existing unrelated Rollup warnings may remain documented.

### Task 2: Add PFOL input parsing and preflight

**Files:**
- Create: `packages/connect-examples/expo-playground/app/utils/portfolioPackage.ts`
- Create: `packages/connect-examples/expo-playground/app/utils/portfolioPackage.test.ts`

- [ ] **Step 1: Write failing parsing tests**

Cover valid Base64, whitespace-trimmed Base64, empty/malformed input, maximum 64 KiB, `OKPP` container magic, and `PFOL` type magic at the v1 header offset.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
yarn --cwd packages/connect-examples/expo-playground jest app/utils/portfolioPackage.test.ts --runInBand
```

Expected: fail because `portfolioPackage.ts` does not exist.

- [ ] **Step 3: Implement the utility**

Export:

```ts
export type PortfolioPackageSource = 'base64' | 'file' | 'example';
export type PortfolioPackageInfo = {
  bytes: Uint8Array;
  byteLength: number;
  prefixHex: string;
  source: PortfolioPackageSource;
};

export function decodePortfolioPackageBase64(value: string): Uint8Array;
export function inspectPortfolioPackage(
  bytes: Uint8Array,
  source: PortfolioPackageSource,
): PortfolioPackageInfo;
```

Use strict size and magic validation. Do not implement signing or archive packing.

- [ ] **Step 4: Run the utility tests**

Expected: all parsing and preflight tests pass.

### Task 3: Add the Portfolio Playground route

**Files:**
- Create: `packages/connect-examples/expo-playground/app/routes/pro2-portfolio.tsx`
- Create: `packages/connect-examples/expo-playground/app/assets/portfolio/portfolio.sample.json`
- Create: `packages/connect-examples/expo-playground/app/assets/portfolio/portfolio.sample.pfol`
- Modify: `packages/connect-examples/expo-playground/app/services/hardwareService.ts`

- [ ] **Step 1: Add the typed hardware service wrapper**

Expose a wrapper that calls:

```ts
callHardwareAPI('uploadPortfolio', connectId, { packageBytes });
```

Keep the raw bytes as `ArrayBuffer` and return the final SDK payload.

- [ ] **Step 2: Implement three input modes**

Build Base64, PFOL file, and bundled-example controls. A successful selection must pass through `inspectPortfolioPackage` before enabling Send.

- [ ] **Step 3: Implement device gating and execution**

Require a connected Pro 2, disable Send while active, invoke `uploadPortfolio` once, display SDK progress during staging, and keep the apply state active until the final response.

- [ ] **Step 4: Implement result and error presentation**

Show source, bytes, prefix, transport, elapsed time, and final response. Map invalid package, unknown message, timeout/disconnect, and generic errors to distinct guidance. Never show staging-only completion as success.

- [ ] **Step 5: Source the bundled PFOL canonically**

Generate or copy the development-signed example from the firmware repository canonical sender tooling. Validate the JSON with that repository's `.venv/bin/python -m json.tool`. Do not generate the PFOL inside Playground code.

### Task 4: Register navigation and translations

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/entry.client.tsx`
- Modify: `packages/connect-examples/expo-playground/app/components/sidebar.tsx`
- Modify: `packages/connect-examples/expo-playground/app/i18n/locales/en.ts`
- Modify: `packages/connect-examples/expo-playground/app/i18n/locales/zh.ts`

- [ ] **Step 1: Register `/pro2-portfolio`**

Import the route, add it beside the other Pro 2 routes, and add a sidebar item using a file/upload icon.

- [ ] **Step 2: Add focused locale keys**

Add navigation, input-mode, validation, progress, result, and error strings without rewriting or discarding existing locale changes.

- [ ] **Step 3: Run Playground lint/build**

Run the package's available lint and build scripts from its `package.json` and record any unrelated existing failures separately.

### Task 5: Complete versioning and App integration

**Files:**
- Modify: SDK `packages/*/package.json` and `yarn.lock`
- Modify: App `package.json`, `apps/cli/package.json`, and `yarn.lock` after npm publication
- Modify: App Portfolio service files already merged from PR 12085

- [ ] **Step 1: Verify SDK version consistency**

Run:

```bash
yarn check-versions
```

Expected: all published SDK packages use `1.2.0-alpha.11`.

- [ ] **Step 2: Verify App Portfolio behavior**

Run the focused Portfolio tests and `yarn agent:check --profile commit`. Fix only task-related failures.

- [ ] **Step 3: Commit SDK and App changes separately**

Use conventional commit messages and explicit file lists so unrelated dirty-worktree changes remain untouched.

- [ ] **Step 4: Stop before external release authority**

Do not publish npm, trigger release workflows, or update the App dependency lockfile to an unpublished version without explicit user authorization. Report the exact remaining release/sync commands.

### Task 6: Final verification

**Files:**
- Verify both repositories only.

- [ ] **Step 1: Run fresh focused tests and builds**

Run SDK core tests/build, Playground tests/build, App Portfolio tests, and App commit profile.

- [ ] **Step 2: Inspect repository state**

Run `git status --short --branch`, `git diff --check`, and focused diffs in both repositories. Confirm unrelated user changes are preserved.

- [ ] **Step 3: Report runtime boundaries**

Document that App orchestration and dedup/cooldown live in the `bg` JS runtime, UI settled events originate in `main`, PFOL bytes are deserialized/copied per runtime crossing, and the physical Pro 2 transport/device is a shared native/external resource whose readiness cannot be assumed across runtime initialization order.
