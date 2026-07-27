# ETH/BTC Multisig Fixture Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个从三个环境变量读取助记词、离线生成可验证 ETH Safe 与 BTC 2-of-3 多签测试向量，并自动接入 expo-playground Multisig Test 的 TypeScript 脚本。

**Architecture:** 生成逻辑拆成环境校验、密钥派生、ETH fixture、BTC fixture、序列化写入五个纯模块，CLI 只负责组合与写文件。生成文件导出稳定的公开 fixture，现有 `cases.ts` 负责映射为页面模型；所有私密材料仅存在于生成进程内存中。

**Tech Stack:** TypeScript 5.1、tsx、@scure/bip39、@scure/bip32、@noble/secp256k1、bitcoinjs-lib 6、ethers 6、Jest 28。

---

## 文件结构

- Create: `packages/connect-examples/expo-playground/scripts/multisig/types.ts` — 生成器内部与输出 fixture 类型。
- Create: `packages/connect-examples/expo-playground/scripts/multisig/readMnemonics.ts` — 环境变量读取、规范化、校验与去重。
- Create: `packages/connect-examples/expo-playground/scripts/multisig/deriveSigners.ts` — ETH/BTC HD 派生与公开 signer 数据。
- Create: `packages/connect-examples/expo-playground/scripts/multisig/generateEthFixtures.ts` — Safe EIP-712 digest、单签名和聚合签名。
- Create: `packages/connect-examples/expo-playground/scripts/multisig/generateBtcFixtures.ts` — 三种 BIP48 多签脚本、引用交易和签名槽位。
- Create: `packages/connect-examples/expo-playground/scripts/multisig/renderFixtures.ts` — 稳定 TypeScript 序列化与敏感内容扫描。
- Create: `packages/connect-examples/expo-playground/scripts/generate-multisig-fixtures.ts` — CLI 入口和原子写入。
- Create: `packages/connect-examples/expo-playground/scripts/multisig/__tests__/*.test.ts` — 生成器单元测试。
- Create: `packages/connect-examples/expo-playground/app/features/multisig/generatedFixtures.ts` — 生成结果。
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/types.ts` — 增加公开参考数据类型。
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/cases.ts` — 由生成 fixture 构造 ETH/BTC 用例。
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts` — 验证生成用例与参考签名。
- Modify: `packages/connect-examples/expo-playground/package.json` — 增加生成命令和 Node 侧依赖。

### Task 1: 环境变量读取与安全校验

**Files:**
- Create: `packages/connect-examples/expo-playground/scripts/multisig/readMnemonics.ts`
- Create: `packages/connect-examples/expo-playground/scripts/multisig/__tests__/readMnemonics.test.ts`
- Modify: `packages/connect-examples/expo-playground/package.json`

- [ ] **Step 1: 编写失败测试**

测试 `readMultisigMnemonics(env)`：三个变量齐全时返回规范化数组；缺失时报变量名；无效或重复时报 signer 序号；任何错误都不包含输入助记词。

```ts
expect(() => readMultisigMnemonics({})).toThrow('MULTISIG_MNEMONIC_1');
expect(() => readMultisigMnemonics(duplicateEnv)).toThrow('signer 2');
expect(capturedError).not.toContain(duplicateEnv.MULTISIG_MNEMONIC_1);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest scripts/multisig/__tests__/readMnemonics.test.ts --runInBand`

Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 实现最小读取模块**

```ts
export const MULTISIG_MNEMONIC_ENV_KEYS = [
  'MULTISIG_MNEMONIC_1',
  'MULTISIG_MNEMONIC_2',
  'MULTISIG_MNEMONIC_3',
] as const;

export function readMultisigMnemonics(env: NodeJS.ProcessEnv): [string, string, string] {
  // 规范化空白、validateMnemonic、去重；错误只包含变量名或 signer 序号。
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `yarn jest scripts/multisig/__tests__/readMnemonics.test.ts --runInBand`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/connect-examples/expo-playground/package.json \
  packages/connect-examples/expo-playground/scripts/multisig/readMnemonics.ts \
  packages/connect-examples/expo-playground/scripts/multisig/__tests__/readMnemonics.test.ts
git commit -m "feat(playground): validate multisig fixture mnemonics"
```

### Task 2: ETH signer 与 Safe fixture

**Files:**
- Create: `packages/connect-examples/expo-playground/scripts/multisig/types.ts`
- Create: `packages/connect-examples/expo-playground/scripts/multisig/deriveSigners.ts`
- Create: `packages/connect-examples/expo-playground/scripts/multisig/generateEthFixtures.ts`
- Create: `packages/connect-examples/expo-playground/scripts/multisig/__tests__/generateEthFixtures.test.ts`

- [ ] **Step 1: 编写失败测试**

使用三条公开 BIP39 测试助记词，断言生成三个不同 owner、固定 digest、每个签名可恢复到对应 owner，聚合签名按地址升序，且重复调用深度相等。

```ts
const fixtures = await generateEthFixtures(TEST_MNEMONICS);
expect(fixtures.standard.reference.signerAddresses).toHaveLength(3);
expect(recoverAddress(fixtures.standard.reference.digest, signature)).toBe(owner);
expect(generateEthFixtures(TEST_MNEMONICS)).resolves.toEqual(fixtures);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest scripts/multisig/__tests__/generateEthFixtures.test.ts --runInBand`

Expected: FAIL，提示生成函数不存在。

- [ ] **Step 3: 实现 ETH 派生与签名**

使用 `HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0")` 派生 owner；使用 `TypedDataEncoder.hash` 和 `wallet.signTypedData` 生成签名。输出 `standard` 与 `delegateCall` 两个 fixture，包含页面 `parameters` 和以下参考数据：

```ts
type EthFixtureReference = {
  broadcastable: false;
  digest: string;
  signerAddresses: string[];
  expectedSignatures: string[];
  aggregatedSignatures2Of3: string;
  aggregatedSignatures3Of3: string;
};
```

- [ ] **Step 4: 运行测试确认通过**

Run: `yarn jest scripts/multisig/__tests__/generateEthFixtures.test.ts --runInBand`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/connect-examples/expo-playground/scripts/multisig
git commit -m "feat(playground): generate Safe multisig fixtures"
```

### Task 3: BTC BIP48 fixture 与合法签名

**Files:**
- Create: `packages/connect-examples/expo-playground/scripts/multisig/generateBtcFixtures.ts`
- Create: `packages/connect-examples/expo-playground/scripts/multisig/__tests__/generateBtcFixtures.test.ts`

- [ ] **Step 1: 编写失败测试**

对 `p2sh`、`p2sh-p2wsh`、`p2wsh` 逐项断言：地址存在、scriptPubKey 与 payment output 相同、refTx hash 等于序列化 funding tx 的 txid、三个签名可验证、签名槽位固定为三个。

```ts
expect(Object.keys(fixtures)).toEqual(['p2sh', 'p2sh-p2wsh', 'p2wsh']);
expect(Transaction.fromHex(fixture.fundingTxHex).getId()).toBe(fixture.prevHash);
expect(verify(derSignature, fixture.sighash, childPublicKey)).toBe(true);
expect(fixture.partialSignatures).toHaveLength(3);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest scripts/multisig/__tests__/generateBtcFixtures.test.ts --runInBand`

Expected: FAIL，提示生成函数不存在。

- [ ] **Step 3: 实现三种 BTC fixture**

账户路径分别为 `m/48'/0'/0'/0'`、`m/48'/0'/0'/1'`、`m/48'/0'/0'/2'`，每个账户 xpub 配合 `address_n: [0, 0]`。使用 `bitcoin.payments.p2ms` 组合脚本，使用固定 coinbase-like 输入生成 200000 sats funding tx，再生成 190000 sats 支出交易。

签名规则：P2SH 使用 `hashForSignature`；两种 witness 模式使用 `hashForWitnessV0`；secp256k1 DER 签名追加 `SIGHASH_ALL` 字节。输出空签名、signer 1 单签名及 signer 1+2 双签名槽位。

- [ ] **Step 4: 运行测试确认通过**

Run: `yarn jest scripts/multisig/__tests__/generateBtcFixtures.test.ts --runInBand`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/connect-examples/expo-playground/scripts/multisig/generateBtcFixtures.ts \
  packages/connect-examples/expo-playground/scripts/multisig/__tests__/generateBtcFixtures.test.ts
git commit -m "feat(playground): generate Bitcoin multisig fixtures"
```

### Task 4: 稳定序列化与 CLI

**Files:**
- Create: `packages/connect-examples/expo-playground/scripts/multisig/renderFixtures.ts`
- Create: `packages/connect-examples/expo-playground/scripts/generate-multisig-fixtures.ts`
- Create: `packages/connect-examples/expo-playground/scripts/multisig/__tests__/renderFixtures.test.ts`
- Modify: `packages/connect-examples/expo-playground/package.json`

- [ ] **Step 1: 编写失败测试**

断言渲染结果以生成声明开头、相同输入字节相同、不包含助记词、`seed`、`xprv`、`private_key`，并且敏感扫描命中时拒绝返回。

```ts
expect(rendered).toContain('GENERATED_MULTISIG_FIXTURES');
expect(rendered).not.toContain(TEST_MNEMONICS[0]);
expect(() => assertNoSensitiveMaterial('xprv123')).toThrow('敏感');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest scripts/multisig/__tests__/renderFixtures.test.ts --runInBand`

Expected: FAIL。

- [ ] **Step 3: 实现渲染器与 CLI**

渲染器使用 `JSON.stringify(fixtures, null, 2)` 嵌入带 `as const` 的 TypeScript 导出。CLI 先完整生成、自校验、写临时文件，再 `rename` 到目标文件；内容未变化时不写入。

```json
"generate:multisig-fixtures": "tsx scripts/generate-multisig-fixtures.ts"
```

- [ ] **Step 4: 运行测试并生成初始 fixture**

Run: `yarn jest scripts/multisig/__tests__/renderFixtures.test.ts --runInBand`

Expected: PASS。

Run: 使用三条公开 BIP39 测试助记词设置三个环境变量后执行 `yarn generate:multisig-fixtures`。

Expected: 创建 `app/features/multisig/generatedFixtures.ts`，终端只显示路径和用例数量。

- [ ] **Step 5: 提交**

```bash
git add packages/connect-examples/expo-playground/scripts \
  packages/connect-examples/expo-playground/app/features/multisig/generatedFixtures.ts \
  packages/connect-examples/expo-playground/package.json yarn.lock
git commit -m "feat(playground): add multisig fixture generator command"
```

### Task 5: Multisig Test 页面接入

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/types.ts`
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/cases.ts`
- Modify: `packages/connect-examples/expo-playground/app/features/multisig/multisig.test.ts`

- [ ] **Step 1: 编写失败测试**

断言生成的两个 ETH 用例和每种 BTC 的地址、未签名、继续签名用例进入 `BUILT_IN_MULTISIG_CASES`；继续签名用例包含一个非空合法签名；所有正向用例通过现有校验。

```ts
expect(findCase('btc-p2wsh-partial-sign').parameters).toMatchObject({
  inputs: [{ multisig: { signatures: [expect.stringMatching(/^30/), '', ''] } }],
});
expect(failures).toEqual([]);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest app/features/multisig/multisig.test.ts --runInBand`

Expected: FAIL，因为 `cases.ts` 尚未导入生成 fixture。

- [ ] **Step 3: 替换硬编码 fixture**

在 `MultisigTestCase` 增加可选 `reference`，将生成数据映射到 `evmSignTypedData`、`btcGetAddress` 和 `btcSignTransaction`。保留 Safe calldata、ERC20 calldata 与本地无效阈值用例。

- [ ] **Step 4: 运行页面领域测试**

Run: `yarn jest app/features/multisig/multisig.test.ts --runInBand`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/connect-examples/expo-playground/app/features/multisig
git commit -m "feat(playground): load generated multisig test cases"
```

### Task 6: 全量验证与文档收尾

**Files:**
- Modify: `packages/connect-examples/expo-playground/README.md`

- [ ] **Step 1: 补充使用说明**

记录三个环境变量、生成命令、不可广播边界、建议只使用测试助记词，以及生成后应提交 `generatedFixtures.ts` 而不应提交 `.env`。

- [ ] **Step 2: 运行生成器单元测试**

Run: `yarn jest scripts/multisig app/features/multisig --runInBand`

Expected: PASS。

- [ ] **Step 3: 运行 TypeScript 与 lint**

Run: `yarn typecheck`

Expected: PASS。

Run: `yarn lint`

Expected: PASS；若仓库既有问题导致失败，记录与本次改动无关的具体错误。

- [ ] **Step 4: 运行生产构建**

Run: `yarn build`

Expected: PASS。

- [ ] **Step 5: 检查敏感材料与 diff**

Run: `rg -n "MULTISIG_MNEMONIC_[123]=|xprv|private_key|privateKey" app/features/multisig/generatedFixtures.ts README.md`

Expected: 生成文件无匹配；README 只出现变量名，不出现值。

Run: `git diff --check`

Expected: 无输出。

- [ ] **Step 6: 提交**

```bash
git add packages/connect-examples/expo-playground/README.md
git commit -m "docs(playground): document multisig fixture generation"
```
