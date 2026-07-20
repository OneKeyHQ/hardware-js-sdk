# Expo Playground 多签测试台设计

## 1. 背景

`firmware-pro2` 已包含 Bitcoin 多签地址、脚本和交易签名实现，以及 Ethereum EIP-712、普通交易签名实现。`expo-playground` 也已经积累 Gnosis Safe EIP-712、EVM 交易和 BTC 交易示例，但当前入口按 SDK 方法分散，缺少一个面向多签回归的集中测试页面。

本功能新增独立的“多签测试台”，将固件能力、已有示例和新增回归用例统一整理，并提供快捷字段与完整 JSON 两种参数编辑方式。

## 2. 目标

- 在 `expo-playground` 新增独立路由 `/multisig-test`。
- 同时支持 ETH Safe EIP-712、ETH 多签合约 calldata、BTC 三类多签脚本。
- 整理并标记用例来源，避免将根据固件实现整理的用例误称为固件原始测试向量。
- 支持快速修改常用字段，并保留完整 SDK 参数 JSON 编辑能力。
- 支持在浏览器本地复制和管理自定义测试用例。
- 复用现有设备连接、SDK 方法执行、结果和日志能力。

## 3. 非目标

- 不广播 ETH 或 BTC 交易。
- 不实现多签协调服务、签名人通信或链上提交流程。
- 不在页面中保存助记词、私钥或其他敏感材料。
- 不修改用户当前正在编辑的 `pro2-debug.tsx`。
- 不把 ETH 多签描述成设备原生的独立协议；硬件设备仍执行标准 EVM 交易或 EIP-712 签名。

## 4. 现有能力与用例来源

### 4.1 Firmware

Bitcoin 固件代码支持：

- `SPENDMULTISIG`：传统 P2SH 多签。
- 带 `multisig` 的 `SPENDP2SHWITNESS`：P2SH-P2WSH 多签。
- 带 `multisig` 的 `SPENDWITNESS`：原生 P2WSH 多签。
- 多签地址生成、阈值与公钥校验、已有签名槽位、交易输入和找零输出。

Ethereum 固件代码支持标准交易签名和 EIP-712 结构化数据签名。Safe 多签语义由 EIP-712 数据或合约 calldata 表达，而不是一个单独的固件多签消息类型。

当前 `firmware-pro2` 子模块包含上述实现代码，但没有随仓库附带完整的 ETH/BTC 上游设备测试向量。因此页面来源标签使用 `Firmware Capability`，说明用例根据固件能力整理。

### 4.2 Existing Example

复用 `expo-playground` 现有数据：

- Gnosis Safe 标准 EIP-712 用例。
- 十进制 chainId 的 Safe EIP-712 兼容性用例。
- Safe 危险操作提示用例。
- 普通 `evmSignTransaction` 参数结构。
- BTC 交易的 inputs、outputs、refTxs 参数结构。

### 4.3 Multisig Regression

新增可执行的多签回归向量，覆盖 BTC 三种脚本、部分签名继续签署，以及 ETH Safe calldata 场景。

## 5. 页面架构

新增独立路由和侧边栏入口，不将功能并入 Pro 2 Debug 页面。

页面采用“两栏 + 底部执行区”布局：

- 左栏：链切换、来源筛选、内置用例和自定义用例列表。
- 右栏上部：用例说明、快捷字段、高级 JSON 编辑器和保存操作。
- 右栏底部：设备交互、执行摘要、SDK 返回结果、错误和耗时。

窄屏时左栏折叠到顶部，用例列表、编辑区和执行区按纵向排列。

## 6. 数据模型

内置和自定义用例使用统一模型：

```ts
type MultisigChain = 'eth' | 'btc';
type MultisigCaseSource = 'firmware-capability' | 'existing-example' | 'regression' | 'custom';

type MultisigTestCase = {
  id: string;
  title: string;
  description: string;
  chain: MultisigChain;
  source: MultisigCaseSource;
  method: 'evmSignTypedData' | 'evmSignTransaction' | 'btcGetAddress' | 'btcSignTransaction';
  parameters: Record<string, unknown>;
  expectedDeviceChecks: string[];
  builtIn: boolean;
};
```

内置用例是只读基准数据。用户修改内置用例后只能保存为新副本，不允许覆盖原始向量。

自定义用例保存到带版本号的 localStorage 记录中：

```ts
type StoredMultisigCases = {
  version: 1;
  cases: MultisigTestCase[];
};
```

读取到损坏数据或不支持的版本时，忽略异常记录并继续显示内置用例。

## 7. 首批内置用例

### 7.1 ETH

1. Safe EIP-712 标准交易，来源为已有示例。
2. Safe EIP-712 十进制 chainId，来源为已有示例。
3. Safe EIP-712 危险操作，来源为已有示例。
4. Safe `execTransaction` calldata 标准调用，来源为新增回归。
5. Safe `execTransaction` calldata 内部合约调用，来源为新增回归。

### 7.2 BTC

1. 2-of-3 P2SH 多签地址生成。
2. 2-of-3 P2SH-P2WSH 多签地址生成。
3. 2-of-3 原生 P2WSH 多签地址生成。
4. 2-of-3 P2SH 多签交易签名。
5. 2-of-3 P2SH-P2WSH 多签交易签名。
6. 2-of-3 原生 P2WSH 多签交易签名。
7. 带一个已有签名的部分签名继续签署。
8. 阈值或公钥数量错误的本地校验用例；该用例不发送到设备。

BTC 用例使用公开测试向量和非生产测试账户材料，不包含真实资产或用户敏感信息。

## 8. 参数编辑

### 8.1 快捷字段

ETH Safe EIP-712 快捷字段包括：

- 派生路径、chainId、Safe 地址。
- 目标地址、value、nonce、operation。
- safeTxGas、baseGas、gasPrice、gasToken、refundReceiver。

ETH calldata 快捷字段包括：

- 派生路径、chainId、目标合约、value。
- nonce、gasLimit、gasPrice 或 EIP-1559 gas 字段。
- calldata。

BTC 快捷字段包括：

- coin、脚本类型、m-of-n 阈值和派生路径。
- inputs、outputs 数量和概要。
- 公钥、已有签名和 refTxs 概要。

深层数组仍通过高级 JSON 完整编辑，避免为每个嵌套字段构建庞大且难维护的动态表单。

### 8.2 同步规则

页面维护一个规范化参数对象作为可执行真值：

- 快捷字段修改后立即更新规范化参数和 JSON 展示。
- JSON 编辑器维护独立文本草稿。
- 只有 JSON 解析和方法校验成功并点击“应用”后，才替换规范化参数并更新快捷字段。
- 无效 JSON 不会覆盖最后一次有效参数。
- 切换用例、恢复默认或离开页面前，如存在未应用或未保存修改，显示确认提示。

## 9. 执行流程

```text
选择内置或自定义用例
        ↓
复制为编辑草稿
        ↓
快捷字段或高级 JSON 编辑
        ↓
本地方法级校验
        ↓
展示设备核对摘要
        ↓
调用现有 Hardware SDK 方法
        ↓
设备确认
        ↓
展示签名、地址、已签交易或错误
```

执行期间锁定用例切换和参数编辑，确保页面展示内容与设备正在确认的请求一致。页面只调用签名或地址方法，不负责广播。

## 10. 校验规则

### 10.1 ETH

- 派生路径格式有效。
- 地址字段为合法 EVM 地址。
- chainId 接受十进制数值或现有 SDK 支持的格式。
- EIP-712 `types`、`primaryType`、`domain` 和 `message` 结构完整。
- Safe `verifyingContract`、目标地址、nonce、operation 和 gas 字段有效。
- 交易 value、data、nonce 和 gas 字段格式有效。

### 10.2 BTC

- `1 ≤ m ≤ n`，且 n 与公钥数量一致。
- signatures 数量不能超过公钥数量。
- 多签脚本必须携带 `multisig` 数据。
- P2SH、P2SH-P2WSH、P2WSH 与对应 SDK script type 保持一致。
- 输入、输出金额为非负整数，输出总额不超过输入总额。
- prev_hash、prev_index、refTxs 和找零路径满足 SDK 参数要求。

校验错误包含字段路径和中文说明，例如 `inputs[0].multisig.m`，便于直接定位。

## 11. 错误处理与安全

- 未连接设备时禁用执行并显示连接提示。
- 分别展示用户拒绝、设备超时、固件不支持、参数错误和未知错误。
- 设备拒绝或超时后不自动重试。
- 失败后保留请求快照和编辑状态。
- 执行前展示链、方法、路径、阈值、目标地址、金额和合约数据摘要。
- 提醒用户在设备屏幕上核对相同信息。
- 日志和 localStorage 不保存助记词、私钥等敏感数据。

## 12. 测试策略

实现遵循测试驱动开发：先编写并运行失败测试，再实现最小代码。

自动化测试覆盖：

- 内置用例结构与 ID 唯一性。
- 每个内置用例映射到正确 SDK 方法。
- 内置正向用例能够通过本地校验。
- ETH 地址、chainId、EIP-712 和交易字段校验。
- BTC 阈值、公钥数量、签名槽位、脚本类型和金额校验。
- 快捷字段到规范化参数的更新。
- 有效和无效 JSON 的应用行为。
- 内置用例复制、自定义用例重命名和删除。
- localStorage 正常读取、损坏数据降级和版本不兼容处理。

工程验证包括：

- playground 相关单元测试。
- TypeScript 类型检查。
- ESLint。
- playground 生产构建。

实机人工验证覆盖：

- ETH Safe EIP-712。
- ETH Safe calldata。
- BTC P2SH、P2SH-P2WSH、P2WSH 地址与交易签名。
- BTC 部分签名继续签署。
- 用户拒绝和设备超时。

## 13. 验收标准

- 用户能从侧边栏进入独立多签测试页面。
- 用户能按 ETH/BTC 和来源筛选内置用例。
- 用户能通过快捷字段或高级 JSON 修改参数，两者按约定同步。
- 用户能将修改后的用例保存为浏览器本地副本并管理副本。
- 所有正向内置用例均通过本地校验并调用正确 SDK 方法。
- 无效用例在调用设备前被拦截，并显示字段级错误。
- 页面能完整展示设备状态、请求摘要、签名结果和错误。
- 页面不会广播交易，也不会覆盖内置用例或现有 `pro2-debug.tsx` 改动。

