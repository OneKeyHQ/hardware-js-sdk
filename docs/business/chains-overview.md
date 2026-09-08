# OneKey 区块链集成技术详解

## 0. 核心概念

### 0.1 支持架构

OneKey 硬件钱包通过一组可复用的密码学原语和链专属协议支持多种区块链：

```
统一密码学原语 (secp256k1/ed25519)
        ↓
标准化路径推导 (BIP32/BIP44)
        ↓
区块链特定实现 (地址格式/交易结构)
```

### 0.2 技术分类

| 分类             | 椭圆曲线                                   | 签名算法 | 路径规则                    | 地址格式      | 代表链            |
| ---------------- | ------------------------------------------ | -------- | --------------------------- | ------------- | ----------------- |
| **Bitcoin 系**   | secp256k1                                  | ECDSA    | m/44'/coin'/0'/change/index | Base58/Bech32 | BTC, LTC, DOGE    |
| **Ethereum 系**  | secp256k1                                  | ECDSA    | m/44'/60'/0'/0/index        | EIP-55 Hex    | ETH, BSC, Polygon |
| **Ed25519 系**   | ed25519                                    | EdDSA    | 全硬化                      | Base58/Bech32 | SOL, ADA, NEAR    |
| **Substrate 系** | `ed25519-polkadot`（当前 Pro2 / Neo 实现） | EdDSA    | 全硬化                      | SS58          | DOT, KSM          |
| **Cosmos 系**    | secp256k1                                  | ECDSA    | m/44'/118'/0'/0/index       | Bech32+HRP    | ATOM, OSMO        |

## 1. Bitcoin 系列 (40+币种)

### 1.1 技术规范

**椭圆曲线：** secp256k1  
**签名算法：** ECDSA  
**模型：** UTXO  
**硬化规则：** 前 3 级硬化 (m/44'/coin_type'/account'/change/index)

### 1.2 地址类型与变种

**支持的地址类型：**

- **P2PKH (Legacy):** Base58Check 编码，以'1'开头
- **P2WPKH (SegWit):** Bech32 编码，以'bc1q'开头
- **P2TR (Taproot):** Bech32m 编码，以'bc1p'开头
- **P2SH-P2WPKH (Nested SegWit):** Base58Check 编码，以'3'开头

### 1.3 完整币种支持

**核心 Bitcoin 网络：**

- **BTC (Bitcoin):** SLIP-44: 0, 支持地址类型: Legacy/SegWit/Taproot, HRP: bc
- **TEST (Bitcoin Testnet):** SLIP-44: 1, 支持地址类型: Legacy/SegWit/Taproot, HRP: tb
- **REGTEST (Bitcoin Regtest):** SLIP-44: 1, 支持地址类型: Legacy/SegWit/Taproot, HRP: bcrt

**主要分叉币：**

- **BCH (Bitcoin Cash):** SLIP-44: 145, 地址格式: CashAddr, 前缀: bitcoincash
- **LTC (Litecoin):** SLIP-44: 2, 支持地址类型: Legacy/SegWit, HRP: ltc, 前缀: 0x30
- **DOGE (Dogecoin):** SLIP-44: 3, 支持地址类型: Legacy, 前缀: 0x1e
- **DASH (Dash):** SLIP-44: 5, 支持地址类型: Legacy, 前缀: 0x4c
- **ZEC (Zcash):** SLIP-44: 133, 支持地址类型: Legacy, 前缀: 0x1cb8
- **DCR (Decred):** SLIP-44: 42, 支持地址类型: Legacy, 前缀: 0x073

**扩展 Bitcoin 生态 (34 种)：**

- **PPC (Peercoin):** SLIP-44: 6, 前缀: 0x37, 特性: PoS 混合共识
- **NMC (Namecoin):** SLIP-44: 7, 前缀: 0x34, 特性: DNS 替代方案
- **FTC (Feathercoin):** SLIP-44: 8, 前缀: 0x0e
- **VIA (Viacoin):** SLIP-44: 14, 前缀: 0x47
- **DGB (DigiByte):** SLIP-44: 20, 前缀: 0x1e, 特性: 多算法挖矿
- **MONA (Monacoin):** SLIP-44: 22, 前缀: 0x32, 区域: 日本
- **XPM (Primecoin):** SLIP-44: 24, 前缀: 0x17, 特性: 质数挖矿
- **VTC (Vertcoin):** SLIP-44: 28, 前缀: 0x47, 特性: ASIC 抗性
- **MUE (MonetaryUnit):** SLIP-44: 31, 前缀: 0x10
- **SYS (Syscoin):** SLIP-44: 57, 前缀: 0x3f, 特性: 合并挖矿
- **FJC (Fujicoin):** SLIP-44: 75, 前缀: 0x24, 区域: 日本
- **XVG (Verge):** SLIP-44: 77, 前缀: 0x1e
- **UNO (Unobtanium):** SLIP-44: 92, 前缀: 0x82
- **GAME (GameCredits):** SLIP-44: 101, 前缀: 0x26, 类别: 游戏
- **FIRO (Firo):** SLIP-44: 136, 前缀: 0x52, 特性: Lelantus 隐私
- **KMD (Komodo):** SLIP-44: 141, 前缀: 0x3c, 特性: dPoW
- **BTX (Bitcore):** SLIP-44: 160, 前缀: 0x03
- **RVN (Ravencoin):** SLIP-44: 175, 前缀: 0x3c, 特性: 资产转移
- **XSN (Stakenet):** SLIP-44: 199, 前缀: 0x4c
- **ACM (Actinium):** SLIP-44: 228, 前缀: 0x35
- **NIX (NIX):** SLIP-44: 400, 前缀: 0x26
- **ZCR (ZCore):** SLIP-44: 428, 前缀: 0x50
- **KOTO (Koto):** SLIP-44: 510, 前缀: 0x18
- **XNA (Neurai):** SLIP-44: 1900, 前缀: 0x35
- **POLIS (Polis):** SLIP-44: 1997, 前缀: 0x37
- **AXE (Axe):** SLIP-44: 4242, 前缀: 0x4b
- **RITO (Ritocoin):** SLIP-44: 19169, 前缀: 0x19

**新兴 Bitcoin 类链：**

- **KASPA:** SLIP-44: 111111, 特性: BlockDAG, 地址格式: Bech32m
- **NEXA:** SLIP-44: 29223, 特性: 增强 UTXO, 地址格式: CashAddr-like

## 2. Ethereum 系列

### 2.1 技术规范

**椭圆曲线：** secp256k1  
**签名算法：** ECDSA  
**模型：** 账户模型  
**硬化规则：** 前 3 级硬化 (m/44'/60'/0'/0/index)
**地址格式：** EIP-55 混合大小写校验和
**签名标准：** EIP-155 (包含 chainId 防重放)

### 2.2 地址类型与变种

**统一地址格式：**

- **标准格式：** 0x + 40 位十六进制字符
- **校验和：** EIP-55 混合大小写编码
- **长度：** 固定 42 字符 (包含 0x 前缀)

### 2.3 完整网络支持

**主要 Layer 1：**

- **ETH (Ethereum):** SLIP-44: 60, Chain ID: 1, 特性: EIP-1559/London 硬分叉
- **ETC (Ethereum Classic):** SLIP-44: 61, Chain ID: 61, 特性: 经典共识

**Layer 2 & 侧链：**

- **Polygon:** SLIP-44: 60, Chain ID: 137, 特性: PoS 共识/快速确认
- **Arbitrum One:** SLIP-44: 60, Chain ID: 42161, 特性: Optimistic Rollup/欺诈证明
- **Optimism:** SLIP-44: 60, Chain ID: 10, 特性: Optimistic Rollup/Cannon 故障证明
- **BSC (BNB Smart Chain):** SLIP-44: 60, Chain ID: 56, 特性: PoA 共识/传统 Gas
- **Avalanche C-Chain:** SLIP-44: 60, Chain ID: 43114, 特性: Avalanche 共识
- **Fantom Opera:** SLIP-44: 60, Chain ID: 250, 特性: Lachesis 共识
- **Cronos:** SLIP-44: 60, Chain ID: 25, 特性: Tendermint 共识

**其他 EVM 兼容链：**

- **Moonbeam:** SLIP-44: 60, Chain ID: 1284, 特性: Polkadot 平行链
- **Moonriver:** SLIP-44: 60, Chain ID: 1285, 特性: Kusama 平行链
- **Celo:** SLIP-44: 60, Chain ID: 42220, 特性: 移动优先
- **Aurora:** SLIP-44: 60, Chain ID: 1313161554, 特性: NEAR 上的 EVM

## 3. Ed25519 系列

### 3.1 技术规范

**椭圆曲线：** edwards25519  
**签名算法：** EdDSA (确定性签名)  
**硬化规则：** 全硬化路径 (所有级别都使用硬化推导)  
**性能特性：** 签名/验证极快，抗侧信道攻击，固定 64 字节签名长度

### 3.2 路径与地址变种

**Solana 生态：**

- **SOL (Solana):** SLIP-44: 501, 路径: m/44'/501'/0'/0', 地址格式: Base58, 长度: 32 字节
- 特殊路径: 多账户支持 m/44'/501'/0'/0', m/44'/501'/1'/0', ...
- 特性: 程序派生地址(PDA), 关联代币账户(ATA), 租金豁免

For Pro2, regenerate the protocol schema from the `firmware-pro2` submodule's `main`
branch with `yarn update-protobuf`. `SolanaSignOffChainMessage.required_signers` uses
protobuf field 6; the former field 7 layout and `source_fingerprint` have been
removed. The SDK accepts `requiredSigners` as sorted, unique 32-byte hex public keys
and no longer exposes `sourceFingerprint`. App callers already using
`requiredSigners` only need the updated SDK schema. Signer-count limits remain
firmware-owned; the SDK does not impose a host-side limit.

**Cardano 生态：**

- **ADA (Cardano):** SLIP-44: 1815, 标准: CIP-1852
- 路径结构:
  - 支付地址: m/1852'/1815'/0'/0/{index}
  - 质押地址: m/1852'/1815'/0'/2/0
  - 奖励地址: m/1852'/1815'/0'/2/0
- 地址类型:
  - **Shelley 地址:** Bech32 编码, 前缀: addr (主网) / addr_test (测试网)
  - **Byron 地址 (已弃用):** Base58 编码, 传统格式
- 特性: 多密钥架构, 内置质押池

**NEAR 生态：**

- **NEAR (NEAR Protocol):** SLIP-44: 397, 路径: m/44'/397'/0'
- 地址格式:
  - **隐式账户:** 64 字符十六进制公钥
  - **命名账户:** 人类可读格式 (如 alice.near)
- 特性: 访问密钥系统, Rust/WASM 智能合约

**Algorand 生态：**

- **ALGO (Algorand):** SLIP-44: 283, 路径: m/44'/283'/0'/0'/0'
- 地址格式: Base32 带校验和, 58 字符长度
- 特性: 纯 PoS 共识, 原子交换, TEAL 智能合约

**新兴 Move 语言链：**

- **APT (Aptos):** SLIP-44: 637, 路径: m/44'/637'/0'/0'/0'
- **SUI (Sui):** SLIP-44: 784, 路径: m/44'/784'/0'/0'/0'
- 地址格式: 0x 前缀十六进制, 32 字节长度
- 特性: Move 编程语言, 并行执行, 对象模型

**其他 Ed25519 链：**

- **XLM (Stellar):** SLIP-44: 148, 路径: m/44'/148'/0', 地址格式: Base32+校验和
- **TON (Telegram Open Network):** SLIP-44: 607, 路径: m/44'/607'/0', 地址格式: Base64URL
- **NEM:** SLIP-44: 43, 路径: m/44'/43'/0'/0'/0', 特殊: 使用 Keccak 哈希变种

## 4. Substrate 系列

### 4.1 技术规范

**椭圆曲线：** secp256k1 (OneKey 实现使用与 Bitcoin 相同)
**签名算法：** ECDSA  
**硬化规则：** 全硬化路径 (m/44'/354'/0'/0'/0')  
**地址格式：** SS58 (Substrate 地址格式)
**网络区分：** SS58 前缀标识不同网络

### 4.2 地址类型与变种

**SS58 地址格式：**

- **编码方式：** Base58 编码
- **校验机制：** Blake2b 哈希校验和
- **前缀系统：** 单字节或多字节网络前缀
- **长度：** 通常 35-47 字符

### 4.3 完整网络支持

**主要中继链：**

- **DOT (Polkadot):** SLIP-44: 354, SS58 前缀: 0, 路径: m/44'/354'/0'/0'/0'
- **KSM (Kusama):** SLIP-44: 354, SS58 前缀: 2, 路径: m/44'/354'/0'/0'/0'
- **Westend (测试网):** SLIP-44: 354, SS58 前缀: 42, 路径: m/44'/354'/0'/0'/0'

**平行链生态：**

- **Astar:** SLIP-44: 354, SS58 前缀: 5, 特性: 智能合约平台
- **Acala:** SLIP-44: 354, SS58 前缀: 10, 特性: DeFi Hub
- **Moonbeam:** SLIP-44: 354, SS58 前缀: 1284, 特性: EVM 兼容
- **Parallel:** SLIP-44: 354, SS58 前缀: 172, 特性: 借贷协议
- **Centrifuge:** SLIP-44: 354, SS58 前缀: 36, 特性: 现实世界资产
- **Composable:** SLIP-44: 354, SS58 前缀: 49, 特性: 跨链 DeFi

**Kusama 生态平行链：**

- **Moonriver:** SLIP-44: 354, SS58 前缀: 1285, 特性: Moonbeam 金丝雀网络
- **Shiden:** SLIP-44: 354, SS58 前缀: 336, 特性: Astar 金丝雀网络
- **Karura:** SLIP-44: 354, SS58 前缀: 8, 特性: Acala 金丝雀网络

## 5. Cosmos 生态

### 5.1 技术规范

**椭圆曲线：** secp256k1  
**签名算法：** ECDSA  
**硬化规则：** 前 3 级硬化 (m/44'/118'/0'/0/{index})
**地址格式：** Bech32 + HRP (人类可读前缀)  
**签名标准：** Amino JSON + 标准 JSON 序列化
**共识机制：** Tendermint BFT + IBC 跨链协议

### 5.2 地址类型与变种

**Bech32 地址格式：**

- **编码方式：** Bech32 编码 (区别于 Bitcoin 的 Base58)
- **前缀系统：** HRP (Human Readable Part) 标识不同网络
- **长度：** 通常 39-45 字符
- **校验机制：** BCH 校验码

### 5.3 完整网络支持

**核心生态：**

- **ATOM (Cosmos Hub):** SLIP-44: 118, HRP: cosmos, 路径: m/44'/118'/0'/0/{index}
- 特性: IBC Hub, 跨链路由, ATOM 质押治理

**主要应用链：**

- **OSMO (Osmosis):** SLIP-44: 118, HRP: osmo, 特性: DEX/AMM, 流动性池, 超流质押
- **JUNO (Juno Network):** SLIP-44: 118, HRP: juno, 特性: 智能合约, CosmWasm
- **AKASH (Akash Network):** SLIP-44: 118, HRP: akash, 特性: 云计算市场
- **SECRET (Secret Network):** SLIP-44: 118, HRP: secret, 特性: 隐私计算, TEE
- **SCRT (Secret Token):** 同 SECRET 网络代币

**DeFi 生态：**

- **LUNA (Terra Classic):** SLIP-44: 118, HRP: terra, 特性: 算法稳定币 (已崩盘)
- **LUNC (Terra Luna Classic):** 传统 Terra 代币
- **USTC (TerraUSD Classic):** 传统 UST 稳定币

**企业 & 交易所链：**

- **CRO (Crypto.com Chain):** SLIP-44: 118, HRP: cro, 特性: 支付, DeFi
- **BNB (BNB Beacon Chain):** SLIP-44: 714, HRP: bnb, 特性: Binance 生态 (注意独立 SLIP-44)

**新兴网络：**

- **TIA (Celestia):** SLIP-44: 118, HRP: celestia, 特性: 数据可用性, 模块化区块链
- **FET (Fetch.ai):** SLIP-44: 118, HRP: fetch, 特性: AI/ML, 自主代理
- **EVMOS:** SLIP-44: 118, HRP: evmos, 特性: EVM 兼容, Cosmos 生态
- **KAVA:** SLIP-44: 118, HRP: kava, 特性: DeFi 平台, 跨链借贷
- **BAND (Band Protocol):** SLIP-44: 118, HRP: band, 特性: 预言机网络

**测试网络：**

- **各链测试网:** 通常使用相同 HRP 但不同后缀 (如 cosmoshub-testnet)

## 6. 特殊链实现

### 6.1 独特架构链详细规范

**XRP Ledger (Ripple):**

- **椭圆曲线：** secp256k1, **SLIP-44:** 144, **路径:** m/44'/144'/0'/0/{index}
- **硬化规则：** 前 3 级硬化
- **地址格式：** Base58Check (XRP 专用字符集), 以'r'开头, 前缀: 0x00
- **特性：** Ripple 共识算法, 路径查找, 托管功能, 账户储备金要求

**Tron 网络:**

- **椭圆曲线：** secp256k1, **SLIP-44:** 195, **路径:** m/44'/195'/0'/0/{index}
- **硬化规则：** 前 3 级硬化
- **地址格式：** Base58Check, 以'T'开头, 前缀: 0x41 (类似 Ethereum 生成后添加 Tron 前缀)
- **特性：** DPoS 共识, TRC-20 代币标准, 带宽机制, 智能合约

**Filecoin 网络:**

- **椭圆曲线：** secp256k1, **SLIP-44:** 461, **路径:** m/44'/461'/0'/0/{index}
- **硬化规则：** 前 3 级硬化
- **地址格式：** 自定义编码, 以'f'开头
- **特性：** 存储证明, 检索市场, Actor 模型

**Nervos CKB:**

- **椭圆曲线：** secp256k1, **SLIP-44:** 309, **路径:** m/44'/309'/0'/0/{index}
- **硬化规则：** 前 3 级硬化
- **地址格式：** CKB 专用格式
- **特性：** Cell 模型, Layer1 存储, PoW 共识

**Conflux 网络:**

- **椭圆曲线：** secp256k1, **SLIP-44:** 503, **路径:** m/44'/503'/0'/0/{index}
- **硬化规则：** 前 3 级硬化
- **地址格式：** 混合格式 (兼容 Ethereum)
- **特性：** 树图结构, 高 TPS, 中国政府支持

**Starcoin:**

- **椭圆曲线：** ed25519, **SLIP-44:** 101010, **路径:** m/44'/101010'/0'/0'/0'
- **硬化规则：** 全硬化
- **地址格式：** 0x 前缀十六进制
- **特性：** Move 语言, 分层架构

**其他特殊链:**

- **SCDO:** SLIP-44: 541, 椭圆曲线: secp256k1, 特性: 分片技术
- **Alephium:** SLIP-44: 1234, 椭圆曲线: secp256k1, 特性: DAG+区块链混合
- **Dynex (DNX):** SLIP-44: 237, 椭圆曲线: secp256k1, 特性: 神经形态计算

## 7. 协议扩展

### 7.1 Bitcoin 协议扩展

**Lightning Network:**

- **基础链:** Bitcoin, **技术:** 支付通道, 路由支付
- **当前 SDK 能力:** `lnurlAuth`

Hardware JS SDK 当前没有提供通用的闪电发票签名或通道管理 API，不应把 Lightning 协议本身的能力全部写成 SDK 已支持能力。

**Nostr 协议:**

- **椭圆曲线:** secp256k1, **签名:** Schnorr 签名
- **应用:** 去中心化社交, 抗审查通信
- **支持功能:** 事件签名, 私信加密, 身份验证

## 8. 技术规格总览

### 8.1 硬化规则分类

**前 3 级硬化 (大多数链):**

- Bitcoin 系列: m/44'/coin_type'/account'/change/index
- Ethereum 系列: m/44'/60'/account'/change/index
- Cosmos 系列: m/44'/118'/account'/change/index
- 特殊链 (XRP, Tron 等): m/44'/coin_type'/account'/change/index

**全硬化 (高安全性链):**

- Ed25519 系列: m/44'/coin_type'/account'/role'/index'
- Substrate 系列: m/44'/354'/account'/role'/index'

**特殊路径 (标准外):**

- Cardano CIP-1852: m/1852'/1815'/account'/role/index
- NEAR 简化: m/44'/397'/account'

### 8.2 技术分类说明

| 技术类型     | 主要曲线/算法                       | 硬化规则       | 主要特征                         |
| ------------ | ----------------------------------- | -------------- | -------------------------------- |
| Bitcoin 系   | secp256k1 / ECDSA、部分 Schnorr     | 前三级硬化为主 | UTXO、多地址类型                 |
| Ethereum 系  | secp256k1 / ECDSA                   | 前三级硬化     | 账户模型、EVM 兼容               |
| Ed25519 系   | ed25519 / EdDSA                     | 通常全硬化     | 链之间的派生和地址编码仍可能不同 |
| Substrate 系 | 当前设备实现使用 `ed25519-polkadot` | 全硬化         | SS58 地址与网络 prefix           |
| Cosmos 系    | secp256k1 / ECDSA                   | 前三级硬化为主 | Bech32 HRP 与链专属交易结构      |
| 特殊链       | 以具体实现为准                      | 以具体实现为准 | 独特地址、交易或签名规则         |

具体链数量会随 SDK 方法、设备固件和网络配置变化，不在长期文档中维护无法自动验证的总数。

### 8.3 统一 API 接口

多数链遵循相似的命名模式，但请求结构和支持能力并不完全相同：

```typescript
// 常见地址获取模式
HardwareSDK.{chain}GetAddress(connectId, deviceId, {
  path,
  showOnOneKey,
  ...chainSpecific,
})

// 常见交易签名模式；部分链使用 rawTx、serializedTx 或专属参数
HardwareSDK.{chain}SignTransaction(connectId, deviceId, {
  path,
  ...chainSpecific,
})
```

并非所有链都同时提供地址、交易、消息、验证和公钥 API。接入时必须以对应公共 TypeScript 类型为准。

---

## 🎯 总结

OneKey SDK 通过复用 secp256k1、ed25519 及其链专属派生/编码规则，为多种区块链提供风格相近但类型明确的硬件 API：

**技术优势：**

- **密码学复用：** 复用基础曲线，同时保留链专属派生与签名规则
- **路径标准化：** 遵循 BIP32/BIP44/CIP-1852 等行业标准
- **接口一致性：** 相同的调用模式，不同的参数配置
- **硬化策略：** 根据链的安全需求选择合适的硬化级别

**生态覆盖：**
从 Bitcoin、EVM 到多种独立 Layer 1，SDK 提供统一的连接和交互框架；具体链能力仍应按方法、设备和固件逐项确认。
