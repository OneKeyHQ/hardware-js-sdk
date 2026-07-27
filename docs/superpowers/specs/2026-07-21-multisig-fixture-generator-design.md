# ETH/BTC 多签测试向量生成器设计

## 1. 背景与目标

`expo-playground` 的 Multisig Test 当前在 `app/features/multisig/cases.ts` 中手工维护 ETH Safe 与 BTC 多签用例。固定 xpub、脚本、引用交易和占位签名难以随测试助记词变化，也不能证明签名数据彼此一致。

本次新增一个仅在 Node.js 中运行的离线生成器。生成器从三个环境变量读取测试助记词，派生 ETH/BTC 签名人，构造确定性的不可广播交易，生成 TypeScript fixture，并由 Multisig Test 直接导入。

## 2. 安全边界

- 仅支持离线确定性数据，不访问 RPC、区块浏览器或广播接口。
- 助记词只允许来自 `MULTISIG_MNEMONIC_1`、`MULTISIG_MNEMONIC_2`、`MULTISIG_MNEMONIC_3`。
- 不在控制台、异常、快照或生成文件中输出助记词、seed、扩展私钥或私钥。
- 生成文件只包含地址、公钥、扩展公钥、交易参数和签名等公开测试材料。
- 生成的 BTC funding transaction 使用显式的虚构 coinbase-like 输入，并在元数据中标记 `broadcastable: false`。
- 生成器拒绝重复助记词、无效助记词和缺失环境变量。

## 3. 生成器接口

新增命令：

```bash
MULTISIG_MNEMONIC_1="..." \
MULTISIG_MNEMONIC_2="..." \
MULTISIG_MNEMONIC_3="..." \
yarn workspace onekey-hardware-playground generate:multisig-fixtures
```

默认输出到：

```text
packages/connect-examples/expo-playground/app/features/multisig/generatedFixtures.ts
```

命令成功时只输出生成文件路径、用例数量和非敏感摘要。文件内容采用稳定排序和固定格式，相同助记词与相同生成器版本必须得到字节级一致的结果。

## 4. 模块划分

### 4.1 环境与校验

`scripts/multisig/readMnemonics.ts` 负责读取、规范化和校验三个助记词。该模块不记录输入值，只返回内存中的规范化字符串。

### 4.2 密钥派生

`scripts/multisig/deriveSigners.ts` 复用仓库已有的 `@scure/bip39`、`@scure/bip32` 和 secp256k1 能力：

- ETH 使用 `m/44'/60'/0'/0/0`，生成三个 owner 地址与 EIP-712 签名密钥。
- BTC 按脚本族使用 BIP48：
  - P2SH：`m/48'/0'/0'/0'` + `[0, 0]`
  - P2SH-P2WSH：`m/48'/0'/0'/1'` + `[0, 0]`
  - P2WSH：`m/48'/0'/0'/2'` + `[0, 0]`
- BTC fixture 中保存账户级 xpub 和相对路径 `[0, 0]`，与 Hardware SDK 的 `MultisigRedeemScriptType` 一致。

公钥顺序固定为环境变量序号，避免生成结果因地址排序发生隐式变化。ETH Safe 聚合签名另按 owner 地址升序排列，符合 Safe 签名拼接规则。

### 4.3 ETH fixture

生成固定的 Safe EIP-712 `SafeTx`：

- chainId、Safe 地址、目标地址、value、nonce 和 gas 字段使用公开、确定性的测试常量。
- 三个 owner 分别对同一 EIP-712 digest 签名。
- 输出 digest、owner 地址、单签名、2-of-3 聚合签名和 3-of-3 聚合签名。
- 页面执行参数仍使用 `evmSignTypedData`，硬件返回结果可与当前 owner 的期望签名比对。
- Safe 地址是离线测试标识，不宣称由三个 owner 实际部署，也不生成可广播交易。

ETH 首批生成两个页面用例：标准签名与 DelegateCall 风险签名。已有 calldata 展示用例继续保留为静态回归用例，因为它不依赖助记词。

### 4.4 BTC fixture

对 P2SH、P2SH-P2WSH、P2WSH 分别生成：

1. 三个账户级 xpub 和 `[0, 0]` 子公钥。
2. 2-of-3 redeem script、可选 witness script、地址和 scriptPubKey。
3. 一笔确定性的虚构 funding transaction，输出 200000 sats 到多签 scriptPubKey。
4. 一笔花费该输出的交易，发送 190000 sats 到固定销毁地址，手续费 10000 sats。
5. 三个合法 sighash 签名、单签名槽位和双签名槽位。
6. 可供设备执行的地址用例、未签名交易用例和继续签名用例。

继续签名用例默认预填 signer 1 的签名，适合将 signer 2 的助记词导入设备后验证。生成元数据同时保留全部 signer 的期望签名，便于单元测试验证。

## 5. 页面接入

`cases.ts` 不再保存助记词相关的硬编码 BTC xpub、prevTx 和占位签名，而是：

- 导入 `generatedFixtures.ts`。
- 将生成的 ETH/BTC fixture 映射成现有 `MultisigTestCase`。
- 保留 Safe calldata、ERC20 calldata 和无效阈值等不依赖助记词的静态用例。

生成 fixture 增加非敏感参考数据：

```ts
type MultisigFixtureReference = {
  broadcastable: false;
  signerAddresses: string[];
  digest?: string;
  expectedSignatures: string[];
};
```

第一阶段只将参考数据用于测试与结果展示，不自动判定硬件签名失败；不同 SDK 返回格式先经过独立规范化后再比较。

## 6. 错误处理

- 缺少环境变量：指出变量名，不输出其他变量内容。
- 助记词无效：指出第几个 signer，无原文回显。
- 助记词重复：拒绝生成，避免伪装成 2-of-3。
- 派生或签名失败：返回阶段化错误，例如“BTC P2WSH signer 2 派生失败”。
- 写文件前先完成全部生成与自校验，避免留下半成品。
- 输出文件只在内容变化时覆盖，减少无意义 diff。

## 7. 自校验与测试

实现遵循测试驱动开发，自动化测试覆盖：

- 环境变量缺失、无效、重复以及助记词不泄漏。
- 相同输入生成相同输出。
- 三个 ETH 地址、EIP-712 digest 和签名恢复地址一致。
- ETH 聚合签名按 owner 地址排序。
- 三种 BTC 地址和 scriptPubKey 与 redeem/witness script 一致。
- funding txid 与 `refTxs.hash` 一致。
- 每个 BTC 签名都能通过对应公钥验证。
- `signatures` 槽位数量与 pubkeys 数量一致。
- 所有生成的正向页面用例通过现有 `validateMultisigCase`。
- 生成文件不包含助记词、seed、xprv 或私钥字段。

工程验证包括相关 Jest 测试、playground TypeScript 检查、ESLint 和生产构建。

## 8. 验收标准

- 只设置三个环境变量即可一条命令重新生成 ETH/BTC 多签 fixture。
- 生成结果能够被 Multisig Test 直接编译和加载，无需人工复制 JSON。
- ETH fixture 包含可验证的三个 EIP-712 签名及 2-of-3/3-of-3 聚合签名。
- BTC fixture 覆盖 P2SH、P2SH-P2WSH、P2WSH 的地址、交易和继续签名数据。
- 所有交易均明确不可广播，脚本不进行网络访问。
- 生成物和日志不包含任何私密密钥材料。
