# Multisig Test 硬件测试矩阵与自动校验设计

## 1. 背景

现有多签生成器已经从三个环境变量助记词生成 ETH Safe 与 BTC BIP48 的公开 fixture，并接入 Multisig Test。当前页面仍以通用用例为主：测试人员需要自行判断设备应使用哪个 signer，SDK 返回值也只展示原始 JSON，没有自动与预期地址或签名比较。

本次将 Multisig Test 补齐为明确、可重复的三 signer 硬件回归矩阵。

## 2. 目标

- 为 `MULTISIG_MNEMONIC_1/2/3` 分别生成可识别的硬件测试用例。
- 在执行前明确提示当前设备应导入哪个测试助记词。
- 自动校验 ETH 地址与 EIP-712 签名、BTC 多签地址与交易签名。
- 将“SDK 调用成功但结果不匹配”单独展示为硬件校验失败。
- 保留 SDK 原始返回，便于固件和 SDK 联调。

## 3. 用例矩阵

### 3.1 ETH

每个 Safe fixture 为三个 signer 分别生成硬件用例：

- Safe EIP-712 标准交易 × signer 1/2/3。
- Safe EIP-712 DelegateCall 风险交易 × signer 1/2/3。

共 6 个由助记词生成的 ETH 硬件用例。每个用例使用相同 EIP-712 数据，但携带不同的 `expectedSigner`：

```ts
type ExpectedSigner = {
  index: 0 | 1 | 2;
  envKey: 'MULTISIG_MNEMONIC_1' | 'MULTISIG_MNEMONIC_2' | 'MULTISIG_MNEMONIC_3';
  address: string;
  signature: string;
};
```

### 3.2 BTC

对 P2SH、P2SH-P2WSH、P2WSH 分别生成以下用例：

- 地址核对：signer 1/2/3 各一个。虽然三者得到同一个多签地址，但用例明确设备助记词，便于逐台验证路径和多签描述符。
- 首次签名：signer 1/2/3 各一个，输入签名槽位全为空。
- 继续签名：signer 1/2/3 各一个，预填另一个 signer 的合法签名，同时保持当前 signer 槽位为空。

继续签名预填规则固定为：

- signer 1 用例预填 signer 2。
- signer 2 用例预填 signer 1。
- signer 3 用例预填 signer 1。

每种脚本 9 个用例，三种脚本共 27 个 BTC 硬件用例。无效阈值本地用例继续保留，不属于硬件矩阵。

## 4. 数据模型

`MultisigTestCase` 增加硬件期望字段：

```ts
type MultisigHardwareExpectation = {
  signerIndex: 0 | 1 | 2;
  signerEnvKey: string;
  signerAddress: string;
  expectedSignature?: string;
  expectedAddress?: string;
};
```

生成 fixture 保存每个 signer 对应的参数变体：

```ts
type BtcSignerScenario = {
  signerIndex: 0 | 1 | 2;
  signerEnvKey: string;
  expectedSignature: string;
  firstSignParameters: BtcSignParameters;
  continueSignParameters: BtcSignParameters;
};
```

页面用例只引用公开地址、签名和参数，不包含助记词内容。

## 5. 自动校验

新增独立纯函数 `verifyMultisigHardwareResult(testCase, sdkResult)`，返回：

```ts
type HardwareVerificationResult =
  | { status: 'passed'; checks: VerificationCheck[] }
  | { status: 'failed'; checks: VerificationCheck[]; message: string }
  | { status: 'unavailable'; checks: VerificationCheck[]; message: string };
```

SDK 执行结果由 `useHardwareMethodExecution` 包装为：

```ts
{
  success: true,
  data: <SDK payload>
}
```

校验规则：

- `evmSignTypedData`：读取 `data.address` 和 `data.signature`；地址忽略大小写，签名统一为 `0x` 前缀的小写 hex 后比较。
- `btcGetAddress`：读取 `data.address`，与生成的多签地址精确比较。
- `btcSignTransaction`：读取 `data.signatures[0]`。预期签名与实际签名统一为小写 hex，并允许 SDK 返回值省略尾部 `01` SIGHASH_ALL 字节。
- 本地用例或没有 expectation 的静态用例返回 `unavailable`，不把它们标记为失败。
- 结构缺失、返回类型异常或预期字段为空时返回 `unavailable`，并指出缺失字段。

## 6. 页面状态

执行状态增加 `verification` 字段，不修改现有 SDK 成功/错误语义：

```ts
type MultisigExecutionState = {
  status: 'idle' | 'running' | 'success' | 'error';
  result?: unknown;
  verification?: HardwareVerificationResult;
};
```

展示规则：

- 通过：绿色“硬件校验通过”，展示地址与签名检查项。
- 失败：红色“硬件校验失败”，展示 expected/actual 摘要，下面保留 SDK 原始 JSON。
- 无法校验：灰色“未自动校验”，说明原因，原始结果照常展示。
- SDK 调用错误继续使用现有“执行失败”状态，不与校验失败混淆。

执行摘要顶部显示：

- `当前 signer：Signer 1/2/3`。
- `设备助记词：MULTISIG_MNEMONIC_N`。
- `预填签名：Signer N`（仅继续签名用例）。

页面只显示环境变量名称，不显示助记词内容。

## 7. 测试策略

实现遵循测试驱动开发，覆盖：

- ETH 2 个 fixture × 3 signer，共 6 个生成用例。
- BTC 3 种脚本 × 3 signer × 地址/首次签名/继续签名，共 27 个硬件用例。
- 每个继续签名用例的当前 signer 槽位为空，且恰好预填一个其他 signer 的有效签名。
- ETH 地址大小写、签名 `0x` 规范化与不匹配。
- BTC 地址匹配与不匹配。
- BTC 签名带/不带 `01` 的兼容比较。
- SDK 结果结构缺失时返回 `unavailable`。
- UI 对 passed、failed、unavailable 三种结果使用不同文案和颜色。
- 所有生成的正向用例继续通过现有参数校验。

工程验证包括相关 Jest 测试、ESLint、生产构建和生成文件敏感信息扫描。全量 TypeScript 检查中的仓库既有错误单独记录。

## 8. 验收标准

- 测试人员可按用例标题明确知道设备应使用 signer 1、2 或 3。
- 三个助记词均覆盖 ETH 标准/风险签名和 BTC 三种脚本的地址、首次签名、继续签名。
- 硬件返回与预期一致时页面显示通过。
- SDK 调用成功但返回不一致时页面显示硬件校验失败，并保留原始结果。
- 不可校验场景不产生误报。
- 页面和生成文件不包含助记词、seed、私钥或扩展私钥。
