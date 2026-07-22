# Multisig Hardware Test Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 expo-playground Multisig Test 扩展为覆盖三个测试助记词的 ETH/BTC 硬件回归矩阵，并自动校验硬件返回地址和签名。

**Architecture:** 生成器为每个 signer 产出明确的参数场景，`cases.ts` 将场景映射为页面用例；独立纯函数负责规范化和校验 SDK 返回，路由只组合执行结果，展示组件只渲染校验状态和原始 JSON。

**Tech Stack:** TypeScript、React 18、Jest 28、ethers 6、bitcoinjs-lib、现有 Hardware SDK。

---

### Task 1: 扩展生成 fixture 的 signer 场景

**Files:**
- Modify: `packages/connect-examples/expo-playground/scripts/multisig/types.ts`
- Modify: `packages/connect-examples/expo-playground/scripts/multisig/generateBtcFixtures.ts`
- Modify: `packages/connect-examples/expo-playground/scripts/multisig/__tests__/generateBtcFixtures.test.ts`
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/generatedFixtures.ts`

- [ ] **Step 1: 编写失败测试**

断言每个 BTC fixture 包含三个 `signerScenarios`，每个场景的首次签名槽位全空，继续签名槽位恰好预填一个其他 signer，当前 signer 槽位为空。

```ts
expect(fixture.signerScenarios).toHaveLength(3);
scenario.continueSignParameters.inputs[0].multisig.signatures.forEach((value, index) => {
  if (index === scenario.signerIndex) expect(value).toBe('');
});
expect(signatures.filter(Boolean)).toHaveLength(1);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest --config ../../../jest.config.js --runTestsByPath scripts/multisig/__tests__/generateBtcFixtures.test.ts --runInBand`

Expected: FAIL，因为 `signerScenarios` 尚不存在。

- [ ] **Step 3: 实现 signer 场景**

在输出类型中增加：

```ts
type BtcSignerScenario = {
  signerIndex: 0 | 1 | 2;
  signerEnvKey: `MULTISIG_MNEMONIC_${1 | 2 | 3}`;
  signerAddress: string;
  expectedSignature: string;
  prefilledSignerIndex: 0 | 1 | 2;
  firstSignParameters: BtcSignParameters;
  continueSignParameters: BtcSignParameters;
};
```

预填规则为 `[1, 0, 0]`，即 signer 1 预填 signer 2，signer 2/3 预填 signer 1。保留旧字段只到页面迁移完成，然后删除旧 `partialSignParameters`。

- [ ] **Step 4: 运行测试并重新生成 fixture**

Run: 使用 `yarn tsx --env-file=scripts/.env scripts/generate-multisig-fixtures.ts`。

Expected: ETH 2、BTC 3，生成文件不包含助记词原文。

- [ ] **Step 5: 提交**

```bash
git add packages/connect-examples/expo-playground/scripts/multisig \
  packages/connect-examples/expo-playground/app/features/multisig/generatedFixtures.ts
git commit -m "feat(playground): generate multisig signer scenarios"
```

### Task 2: 生成完整页面硬件用例矩阵

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/types.ts`
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/cases.ts`
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts`
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/validation.ts`

- [ ] **Step 1: 编写失败测试**

断言存在 6 个生成 ETH signer 用例和 27 个 BTC 硬件用例，并验证每个用例携带 `hardwareExpectation`。

```ts
expect(generatedEthCases).toHaveLength(6);
expect(generatedBtcCases).toHaveLength(27);
expect(testCase.hardwareExpectation?.signerEnvKey).toBe('MULTISIG_MNEMONIC_3');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest --config ../../../jest.config.js --runTestsByPath app/features/multisig/multisig.test.ts --runInBand`

Expected: FAIL，当前只有通用 signer 用例。

- [ ] **Step 3: 实现用例矩阵**

增加 `MultisigHardwareExpectation` 与可选 `prefilledSignerIndex`。ETH 每个 fixture 映射三个 signer；BTC 每种脚本映射三个地址、三个首次签名和三个继续签名用例。标题统一包含 `Signer N`，摘要增加当前 signer 和环境变量名。

- [ ] **Step 4: 运行领域测试**

Run: `yarn jest --config ../../../jest.config.js --runTestsByPath app/features/multisig/multisig.test.ts --runInBand`

Expected: PASS，所有正向用例继续通过参数校验。

- [ ] **Step 5: 提交**

```bash
git add packages/connect-examples/expo-playground/app/features/multisig
git commit -m "feat(playground): add multisig hardware test matrix"
```

### Task 3: 实现硬件结果纯函数校验

**Files:**
- Create: `packages/connect-examples/expo-playground/app/features/multisig/hardwareVerification.ts`
- Create: `packages/connect-examples/expo-playground/app/features/multisig/hardwareVerification.test.ts`
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/types.ts`

- [ ] **Step 1: 编写失败测试**

覆盖 ETH 地址/签名匹配、BTC 地址匹配、BTC 签名带或不带 `01`、不匹配和结构缺失。

```ts
expect(verifyMultisigHardwareResult(ethCase, ethResult).status).toBe('passed');
expect(verifyMultisigHardwareResult(btcCase, withoutSighash).status).toBe('passed');
expect(verifyMultisigHardwareResult(btcCase, mismatch).status).toBe('failed');
expect(verifyMultisigHardwareResult(btcCase, {}).status).toBe('unavailable');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest --config ../../../jest.config.js --runTestsByPath app/features/multisig/hardwareVerification.test.ts --runInBand`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现规范化与校验**

实现 `normalizeHex`、`equalBitcoinSignature` 和 `verifyMultisigHardwareResult`。只读取 `{ success: true, data }` 包装内的字段；expected/actual 展示值截断到前后各 10 个字符，避免结果区过长。

- [ ] **Step 4: 运行测试确认通过**

Run: `yarn jest --config ../../../jest.config.js --runTestsByPath app/features/multisig/hardwareVerification.test.ts --runInBand`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/connect-examples/expo-playground/app/features/multisig/hardwareVerification.ts \
  packages/connect-examples/expo-playground/app/features/multisig/hardwareVerification.test.ts \
  packages/connect-examples/expo-playground/app/features/multisig/types.ts
git commit -m "feat(playground): verify multisig hardware results"
```

### Task 4: 接入执行流程与校验结果 UI

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/routes/multisig-test.tsx`
- Modify: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.tsx`
- Modify: `packages/connect-examples/expo-playground/app/components/multisig/MultisigExecutionPanel.test.ts`

- [ ] **Step 1: 编写失败测试**

组件测试断言源码包含“硬件校验通过”“硬件校验失败”“未自动校验”，并展示 `signerEnvKey`，路由测试或领域测试断言成功执行后调用校验器。

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest --config ../../../jest.config.js --runTestsByPath app/components/multisig/MultisigExecutionPanel.test.ts --runInBand`

Expected: FAIL，组件尚未展示校验状态。

- [ ] **Step 3: 接入验证结果**

SDK 成功后计算 `verification` 并保存到 execution state。结果区域先展示校验卡片，再展示原始 JSON；failed 使用红色，passed 使用绿色，unavailable 使用灰色。测试助记词提示改为显示 `MULTISIG_MNEMONIC_N`，删除“固件默认测试助记词”的旧文案。

- [ ] **Step 4: 运行相关测试、lint 和构建**

Run: `yarn jest --config ../../../jest.config.js --runTestsByPath app/features/multisig app/components/multisig/MultisigExecutionPanel.test.ts --runInBand`

Run: `yarn lint`

Run: `yarn build`

Expected: 测试和 lint 通过，生产构建成功；只允许现有包体积警告。

- [ ] **Step 5: 敏感信息与工作区检查**

使用加载 `scripts/.env` 的 Node 检查生成文件不包含三个环境变量值，并运行 `git diff --check`。

- [ ] **Step 6: 提交**

```bash
git add packages/connect-examples/expo-playground/app/routes/multisig-test.tsx \
  packages/connect-examples/expo-playground/app/components/multisig
git commit -m "feat(playground): show multisig hardware verification"
```
