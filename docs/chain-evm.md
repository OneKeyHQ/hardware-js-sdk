# OneKey SDK: EVM 集成技术详解

## 1. 核心概念

OneKey 硬件钱包对 EVM (以太坊虚拟机) 兼容链的支持，建立在一套统一且经过安全验证的技术栈之上。

- **椭圆曲线:** `secp256k1`
- **签名算法:** `ECDSA`
- **路径推导:** `BIP-32` / `BIP-44`
- **标准路径:** `m/44'/60'/0'/0/index`
- **地址格式:** `EIP-55` (混合大小写校验和)

## 2. SDK Versioning and Protocol Management

OneKey SDK is designed to provide a seamless developer experience by abstracting away the complexities of different hardware firmware versions. It achieves this through an automatic protocol detection mechanism.

### 3.1 Protocol Dialects: `legacyV1` vs `latest`

The SDK internally manages two primary protocol "dialects" for communicating with the device:

- **`legacyV1` (Trezor-compatible Protocol):** Used for older generations of OneKey firmware. This protocol is compatible with the message format originally defined by Trezor.
- **`latest` (Native OneKey Protocol):** Used for modern OneKey firmware. This is a more feature-rich, native protocol that supports the latest EIPs and optimizations, such as EIP-7702.

### 3.2 Automatic Protocol Switching

The SDK automatically determines which protocol to use at runtime.

- **Detection:** When a method like `EVMSignTransaction` is called, it uses `TransportManager.getMessageVersion()` to query the connected device's protocol version.
- **Switching Logic:**
  - If the device returns `'v1'`, the SDK invokes the signing logic with a compatibility flag (`supportTrezor: true`), instructing it to format messages for the legacy protocol.
  - Otherwise, it defaults to using the native `latest` protocol.

This ensures that developers can write a single piece of code that works across all generations of OneKey hardware without needing to worry about the underlying communication differences.

## 3. 交易类型 (Transaction Types)

OneKey SDK 支持多种 EVM 交易类型，能够自动检测并处理，确保最佳的网络兼容性和费用效益。

### 2.1 Legacy (Type 0)

最基础的交易类型，至今仍被广泛支持。

- **核心参数:** `to`, `value`, `gasPrice`, `gasLimit`, `nonce`, `data`
- **优点:** 兼容所有 EVM 链。
- **缺点:** 采用简单的“最高价拍卖”Gas 机制，可能导致费用过高或交易确认缓慢。

### 2.2 EIP-1559 (Type 2)

引入了更复杂的 Gas 市场机制，旨在提高费用预测的准确性和网络效率。

- **核心参数:**
  - `maxFeePerGas`: 用户愿意支付的总 Gas 单价上限。
  - `maxPriorityFeePerGas`: 用户愿意支付给矿工的小费单价。
- **优点:**
  - **费用可预测性:** 避免 Gas 价格剧烈波动。
  - **效率提升:** 允许用户仅支付市场价，而非盲目出价。
- **SDK 实现:** 通过 `hasEIP1559Features` 函数检测 `maxFeePerGas` 和 `maxPriorityFeePerGas` 字段来自动识别。

### 2.3 EIP-7702 (Type 4)

**EIP-7702** 是一项前瞻性的 EIP，旨在通过引入 **`authorizationList`** 来改进智能合约钱包的用户体验。它允许外部拥有账户 (EOA) 为合约账户单次交易授权，从而模拟智能合约钱包的部分功能，如批量处理交易。

- **核心参数:**
  - `authorizationList`: 一个授权列表，每个授权包含 `chainId`, `address`, 和 `nonce`。
- **优点:**
  - **简化用户授权:** 允许 EOA 像智能合约钱包一样执行复杂操作，而无需预先部署合约或预存资金。
  - **Gas 效率:** 潜在地降低了多步操作的 Gas 成本。
- **SDK 实现:** 通过 `hasEIP7702Features` 函数检测 `authorizationList` 字段来识别。此类型是 EIP-1559 的扩展，因此也包含其费用参数。

### 交易类型对比

| 特性 | Legacy (Type 0) | EIP-1559 (Type 2) | EIP-7702 (Type 4) |
| :--- | :--- | :--- | :--- |
| **Gas 机制** | `gasPrice` (单一拍卖) | `maxFeePerGas` + `maxPriorityFeePerGas` | 同 EIP-1559 |
| **核心目的** | 基础交易 | 优化 Gas 市场 | 增强 EOA 账户能力 |
| **主要优点** | 兼容性强 | 费用可预测、高效 | 模拟智能合约钱包、简化授权 |
| **SDK 支持** | ✅ | ✅ | ✅ |

## 4. 签名方法 (Signing Methods)

除了交易签名，OneKey SDK 还支持多种数据签名标准，以满足不同的 DApp 交互需求。

### 3.1 交易签名 (`EVMSignTransaction`)

核心功能，用于对上述所有类型的交易进行签名，生成可广播的裸交易 (`rawTx`)。

### 3.2 消息签名 (`EVMSignMessage`)

遵循 `personal_sign` 规范，用于对任意 UTF-8 或十六进制字符串进行签名。

- **过程:** 消息会添加 `\x19Ethereum Signed Message:\n` 前缀后再进行哈希和签名。
- **优点:** 比 `eth_sign` 更安全，因为前缀可以防止签名恶意交易。
- **缺点:** 用户在设备上只能看到消息哈希，无法直观理解签名内容。

### 3.3 结构化数据签名（EIP-712）

EIP-712 结构化数据签名在 SDK 中通过两条路径实现：

- 解析签名（TypedData）：`EVMSignTypedData` 内部调用 `EthereumSignTypedData(OneKey)` 与交互请求，实现设备端结构化展示与签名。
- 哈希盲签（TypedHash）：`EVMSignTypedData` 内部在指定场景降级为 `EthereumSignTypedHash(OneKey)`，调用方需提供 `domainHash` 与 `messageHash`。

两条路径由 SDK 自动选择，调用方统一使用 `evmSignTypedData`。

### 签名方法对比

| 方法 | `EVMSignMessage` (`personal_sign`) | `EVMSignTypedData` |
| :--- | :--- | :--- |
| **显示内容** | 消息哈希（不直观） | 结构化数据（清晰可读）或哈希盲签 |
| **安全性** | 中等 | 高（解析）/ 中（盲签） |
| **用户体验** | 一般 | 优（解析）/ 一般（盲签） |
| **应用场景** | 简单身份验证 | 复杂 DApp 授权、链下操作 |

## 5. 核心 API 实现分析

### 5.1 `EVMGetAddress`

获取指定 BIP-44 路径下的 EVM 地址。支持单地址和批量地址查询。

- **关键逻辑:**
  - **批量处理:** 方法内部会自动将单个请求和批量（`bundle`）请求统一为数组进行处理。
  - **参数验证:** 验证 `path` 的有效性，并处理可选参数 `showOnOneKey`（默认为 `true`，在设备上显示地址）和 `chainId`。
  - **协议切换:** 调用 `TransportManager.getMessageVersion()` 来决定使用 `legacyV1` 还是 `latest` 的 `getAddress` 实现。
  - **设备交互:** 循环处理批量请求，对每个请求都向设备发起一次 `typedCall` 调用。

### 5.2 `EVMSignMessage`

对遵循 `personal_sign` 规范的消息进行签名。

- **关键逻辑:**
  - **Hex 输入:** 调用者需要传入十六进制格式的消息 (`messageHex`)。
  - **参数验证:** 验证 `path` 和 `messageHex` 的有效性，并支持可选的 `chainId` 参数。
  - **协议切换:** 同样使用 `TransportManager.getMessageVersion()` 来选择 `legacyV1` 或 `latest` 实现。
  - **设备交互:** 将格式化后的参数（地址路径、消息、链 ID）通过 `typedCall` 发送到设备进行签名。


### 5.3 `EVMSignTransaction`

对 EVM 交易进行签名，是与区块链交互最核心的功能。

- **关键逻辑:**
  - **交易类型检测:** 方法首先会通过检查交易对象的参数来自动识别交易类型：
    - `authorizationList` 存在 `=>` **EIP-7702**
    - `maxFeePerGas` 和 `maxPriorityFeePerGas` 存在 `=>` **EIP-1559**
    - 否则 `=>` **Legacy**
  - **动态参数验证:** 根据检测到的交易类型，应用不同的验证规则，确保所有必需的字段（如 `gasPrice` 或 `maxFeePerGas`）都存在。
  - **协议切换:** 同样使用 `TransportManager.getMessageVersion()` 来选择 `legacyV1` 或 `latest` 实现。注意：EIP-7702 在 `legacyV1` 模式下不被支持。
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

注意：`EVMSignMessageEIP712` 已废弃，不再对外提供方法。请统一使用 `evmSignTypedData`。
## 6. 最佳实践与安全

1.  **优先使用现代标准:**
    - **交易:** 优先构造 **EIP-1559** 交易，以获得更好的费用控制。
    - **签名:** 优先使用 **EIP-712** 进行数据签名，为用户提供最高的安全性。

2.  **路径管理:**
    - 始终遵循 `BIP-44` 标准路径 (`m/44'/60'/0'/0/index`)，确保钱包兼容性。

3.  **参数格式:**
    - 所有数值型参数 (如 `value`, `gasLimit`) 均应以十六进制字符串 (`0x...`) 格式提供。

4.  **固件兼容性:**
    - SDK 会自动处理不同固件版本的功能差异。始终使用最新版 SDK 以获得最佳兼容性。
