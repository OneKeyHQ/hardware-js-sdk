# OneKey SDK：EVM 与 EIP-7702

## 1. 核心概念

OneKey 硬件钱包对 EVM (以太坊虚拟机) 兼容链的支持，建立在一套统一且经过安全验证的技术栈之上。

- **椭圆曲线:** `secp256k1`
- **签名算法:** `ECDSA`
- **路径推导:** `BIP-32` / `BIP-44`
- **标准路径:** `m/44'/60'/0'/0/index`
- **地址格式:** `EIP-55` (混合大小写校验和)

## 2. SDK 版本与 Protocol V1 Schema 管理

SDK 会根据设备 Features 选择 Protocol V1 schema，调用方不需要自行选择 protobuf 方言。

### 2.1 Protocol V1 Schema：`v1LegacySchema` 与 `v1CurrentSchema`

SDK 内部维护两套 Protocol V1 schema：

- **`v1LegacySchema`：** Trezor-compatible 历史 schema。
- **`v1CurrentSchema`：** 当前 OneKey Protocol V1 schema，包含 EIP-7702 等扩展消息。

### 2.2 自动切换

EVM 方法通过 `TransportManager.getProtocolV1MessageSchema()` 读取当前选择：

- `v1LegacySchema` 使用 legacy 兼容实现。
- `v1CurrentSchema` 使用当前 OneKey 实现。

这里描述的是 Protocol V1 内部 schema 选择，不等同于 Transport 对 Protocol V1/V2 的连接探测。

## 3. 交易类型 (Transaction Types)

OneKey SDK 支持多种 EVM 交易类型，能够自动检测并处理，确保最佳的网络兼容性和费用效益。

### 3.1 Legacy (Type 0)

最基础的交易类型，至今仍被广泛支持。

- **核心参数:** `to`, `value`, `gasPrice`, `gasLimit`, `nonce`, `data`
- **优点:** 兼容所有 EVM 链。
- **缺点:** 采用简单的“最高价拍卖”Gas 机制，可能导致费用过高或交易确认缓慢。

### 3.2 EIP-1559 (Type 2)

引入了更复杂的 Gas 市场机制，旨在提高费用预测的准确性和网络效率。

- **核心参数:**
  - `maxFeePerGas`: 用户愿意支付的总 Gas 单价上限。
  - `maxPriorityFeePerGas`: 用户愿意支付给矿工的小费单价。
- **优点:**
  - **费用可预测性:** 避免 Gas 价格剧烈波动。
  - **效率提升:** 允许用户仅支付市场价，而非盲目出价。
- **SDK 实现:** 通过 `hasEIP1559Features` 函数检测 `maxFeePerGas` 和 `maxPriorityFeePerGas` 字段来自动识别。

### 3.3 EIP-7702 (Type 4)

**EIP-7702** 是一项前瞻性的 EIP，旨在通过引入 **`authorizationList`** 来改进智能合约钱包的用户体验。它允许外部拥有账户 (EOA) 为合约账户单次交易授权，从而模拟智能合约钱包的部分功能，如批量处理交易。

- **核心参数:**
  - `authorizationList`: 一个授权列表，每个授权包含 `chainId`, `address`, 和 `nonce`。
- **优点:**
  - **简化用户授权:** 允许 EOA 像智能合约钱包一样执行复杂操作，而无需预先部署合约或预存资金。
  - **Gas 效率:** 潜在地降低了多步操作的 Gas 成本。
- **SDK 实现:** 通过 `hasEIP7702Features` 函数检测 `authorizationList` 字段来识别。此类型是 EIP-1559 的扩展，因此也包含其费用参数。

### 交易类型对比

| 特性         | Legacy (Type 0)       | EIP-1559 (Type 2)                       | EIP-7702 (Type 4)          |
| :----------- | :-------------------- | :-------------------------------------- | :------------------------- |
| **Gas 机制** | `gasPrice` (单一拍卖) | `maxFeePerGas` + `maxPriorityFeePerGas` | 同 EIP-1559                |
| **核心目的** | 基础交易              | 优化 Gas 市场                           | 增强 EOA 账户能力          |
| **主要优点** | 兼容性强              | 费用可预测、高效                        | 模拟智能合约钱包、简化授权 |
| **SDK 支持** | ✅                    | ✅                                      | ✅                         |

## 4. 签名方法 (Signing Methods)

除了交易签名，OneKey SDK 还支持多种数据签名标准，以满足不同的 DApp 交互需求。

### 4.1 交易签名 (`EVMSignTransaction`)

核心功能，用于对上述交易生成 `v/r/s` 签名结果；交易序列化与广播由调用方完成。

### 4.2 消息签名 (`EVMSignMessage`)

遵循 `personal_sign` 规范，用于对任意 UTF-8 或十六进制字符串进行签名。

- **过程:** 消息会添加 `\x19Ethereum Signed Message:\n` 前缀后再进行哈希和签名。
- **优点:** 比 `eth_sign` 更安全，因为前缀可以防止签名恶意交易。
- **显示边界:** 设备显示内容取决于消息格式和固件实现，应用不能假设所有设备都只显示哈希或都能完整显示原文。

### 4.3 结构化数据签名（EIP-712）

EIP-712 结构化数据签名在 SDK 中通过两条路径实现：

- 解析签名（TypedData）：`EVMSignTypedData` 内部调用 `EthereumSignTypedData(OneKey)` 与交互请求，实现设备端结构化展示与签名。
- 哈希盲签（TypedHash）：`EVMSignTypedData` 内部在指定场景降级为 `EthereumSignTypedHash(OneKey)`，调用方需提供 `domainHash` 与 `messageHash`。

两条路径由 SDK 自动选择，调用方统一使用 `evmSignTypedData`。

### 签名方法对比

| 方法         | `EVMSignMessage` (`personal_sign`) | `EVMSignTypedData`               |
| :----------- | :--------------------------------- | :------------------------------- |
| **显示内容** | 消息哈希（不直观）                 | 结构化数据（清晰可读）或哈希盲签 |
| **安全性**   | 中等                               | 高（解析）/ 中（盲签）           |
| **用户体验** | 一般                               | 优（解析）/ 一般（盲签）         |
| **应用场景** | 简单身份验证                       | 复杂 DApp 授权、链下操作         |

## 5. 核心 API 实现分析

### 5.1 `EVMGetAddress`

获取指定 BIP-44 路径下的 EVM 地址。支持单地址和批量地址查询。

- **关键逻辑:**
  - **批量处理:** 方法内部会自动将单个请求和批量（`bundle`）请求统一为数组进行处理。
  - **参数验证:** 验证 `path` 的有效性，并处理可选参数 `showOnOneKey`（默认为 `true`，在设备上显示地址）和 `chainId`。
  - **协议切换:** 调用 `TransportManager.getProtocolV1MessageSchema()` 来决定使用 `legacyV1` 还是 `latest` 的 `getAddress` 实现。
  - **设备交互:** 循环处理批量请求，对每个请求都向设备发起一次 `typedCall` 调用。

### 5.2 `EVMSignMessage`

对遵循 `personal_sign` 规范的消息进行签名。

- **关键逻辑:**
  - **Hex 输入:** 调用者需要传入十六进制格式的消息 (`messageHex`)。
  - **参数验证:** 验证 `path` 和 `messageHex` 的有效性，并支持可选的 `chainId` 参数。
  - **协议切换:** 同样使用 `TransportManager.getProtocolV1MessageSchema()` 来选择 `legacyV1` 或 `latest` 实现。
  - **设备交互:** 将格式化后的参数（地址路径、消息、链 ID）通过 `typedCall` 发送到设备进行签名。

### 5.3 `EVMSignTransaction`

对 EVM 交易进行签名，是与区块链交互最核心的功能。

- **关键逻辑:**
  - **交易类型检测:** 方法首先会通过检查交易对象的参数来自动识别交易类型：
    - `authorizationList` 存在 `=>` **EIP-7702**
    - `maxFeePerGas` 和 `maxPriorityFeePerGas` 存在 `=>` **EIP-1559**
    - 否则 `=>` **Legacy**
  - **动态参数验证:** 根据检测到的交易类型，应用不同的验证规则，确保所有必需的字段（如 `gasPrice` 或 `maxFeePerGas`）都存在。
  - **协议切换:** 同样使用 `TransportManager.getProtocolV1MessageSchema()` 来选择 `legacyV1` 或 `latest` 实现。注意：EIP-7702 在 `legacyV1` 模式下不被支持。
  - **设备交互:** 根据交易类型，调用 `latest` 模块中对应的 `evmSignTx`, `evmSignTxEip1559`, 或 `evmSignTxEip7702` 函数，将交易数据分块发送给设备进行签名。

### 5.4 `EVMSignTypedData`

EIP-712 结构化数据签名的统一入口。SDK 内部根据设备能力与数据复杂度，在“解析签名”与“哈希盲签”之间自动选择：

- 解析签名（推荐）：设备端结构化展示与签名。
- 哈希盲签：调用方需提供 `domainHash` 与 `messageHash`，设备仅对哈希进行签名。

选择规则（摘要）：

- Classic1s / ClassicPure：
  - 固件 ≥ 3.14.0 或设备具备 `Capability_EthereumTypedData` → 解析签名
  - 否则 → 哈希盲签（`EthereumSignTypedHash(OneKey)`）
- Classic / Mini：
  - 固件 ≥ 2.2.0 → 哈希盲签（需要 `domainHash` 和 `messageHash`）
  - 固件 < 2.2.0 → SDK 内部兼容性降级
- Touch / Pro：
  - 默认解析签名
  - 若数据包含嵌套数组或数据量过大 → 哈希盲签
  - 固件要求：嵌套数组签名能力需固件 ≥ 4.2.0；更大数据阈值在固件 ≥ 4.4.0 生效（从 1KB 提升到 1.5KB）

注意：`evmSignMessageEIP712` 已标记为 deprecated，但为了兼容现有调用仍然公开导出。新接入应统一使用 `evmSignTypedData`；迁移完成前不要声称旧方法已经从 SDK 删除。

## 6. 最佳实践与安全

## 7. EIP-7702 维护要点

EIP-7702 使用 Type 4 交易，在普通 EIP-1559 字段基础上增加 `authorizationList`。SDK 维护时需要同时检查公共输入类型、Core 到 protobuf 的字段转换、固件 Schema 和设备确认界面。

### Authorization 结构

每条授权至少包含：

- `chainId`：授权适用的链；`0` 表示可跨链使用，需要调用方明确评估风险。
- `address`：被授权的 delegation 目标地址。
- `nonce`：授权账户 nonce。
- `yParity`、`r`、`s`：授权签名结果。

授权签名可以由设备生成，也可以由调用方提供。调用方提供外部签名时，SDK 只能验证结构和编码，不能替代业务层确认签名来源可信。

### 当前兼容边界

- 固件和 SDK 对 authorization 数量、chain ID、nonce 范围及地址编码可能存在版本约束。
- 使用前必须经过方法的 firmware range 检查，不能只依据 EVM 基础交易是否可用。
- Delegator 白名单、calldata 解析和设备确认属于安全边界，新增合约模式时需要同步评审。
- Classic 等旧机型不能从普通 EVM 支持状态推断 EIP-7702 支持。

### 字段映射检查

修改 EIP-7702 时至少核对：

1. 公共 TypeScript 类型是否保留大整数与 hex 的精度。
2. Core 是否按 protobuf 预期转换 `authorizationList`。
3. V1 legacy/current Schema 与对应固件版本是否匹配。
4. 设备端是否展示 chain、delegator 和授权账户等关键确认信息。
5. 测试是否同时覆盖设备生成授权和外部授权签名。

关键实现以 `packages/core/src/api/evm/`、EVM protobuf Schema 和 firmware range 配置为准。

1.  **优先使用现代标准:**

    - **交易:** 优先构造 **EIP-1559** 交易，以获得更好的费用控制。
    - **签名:** 优先使用 **EIP-712** 进行数据签名，为用户提供最高的安全性。

2.  **路径管理:**

    - 始终遵循 `BIP-44` 标准路径 (`m/44'/60'/0'/0/index`)，确保钱包兼容性。

3.  **参数格式:**

    - 所有数值型参数 (如 `value`, `gasLimit`) 均应以十六进制字符串 (`0x...`) 格式提供。

4.  **固件兼容性:**
    - SDK 会自动处理不同固件版本的功能差异。始终使用最新版 SDK 以获得最佳兼容性。
