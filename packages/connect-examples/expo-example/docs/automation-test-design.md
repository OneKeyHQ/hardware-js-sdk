# 硬件钱包自动化测试设计文档

## 概述

`expo-example` 的自动化测试系统通过 PhonePilot 驱动设备完成钱包创建/导入，再由 SDK 执行批量校验，最终生成结构化报告。

**核心文件**：

| 文件 | 职责 |
|------|------|
| `services/phonePilotMcp/types.ts` | 类型定义 |
| `testTools/automationTest/scenarioCatalog.ts` | 场景配置 |
| `testTools/automationTest/scenarioResolver.ts` | Passphrase/数据集解析 |
| `testTools/automationTest/useAutomationTest.ts` | 执行主逻辑 |
| `atoms/automationAtoms.ts` | 状态管理 |
| `views/AutomationTest/index.tsx` | UI |

---

## 0. 快速开始

### 入口与默认配置

| 项目 | 当前实现 |
|------|----------|
| 页面路由 | `expo-example/automation-test` |
| 配置持久化 | `localStorage` key: `automation-test-config` |
| 默认场景 | `ok26054_bip39_import_12`、`ok40090_slip39_import_20_1of1` |
| 默认 suites | `deviceFlow`、`sdkAddressBatch`、`sdkPubkeyBatch` |
| 默认 passphrase variants | `normal`、`passphrase_2` |
| 默认 PhonePilot 地址 | `EXPO_PUBLIC_PHONEPILOT_URL` 或 `http://localhost:3847` |
| 默认 runner 行为 | `stopOnFirstError=false`、`retryCount=1`、`delayBetweenTests=500`、`devicePreparationMode=full` |

### 启动步骤

1. 打开 `expo-example/automation-test`
2. 选择场景、suite、passphrase 变体
3. 若模式为 `full` 或 `deviceFlowOnly`，先连接 PhonePilot MCP
4. 确认状态区可见：
   - `MCP: Ready`
   - `OCR: Ready`（仅 create 场景强依赖）
5. 点击开始，查看实时报告与日志

### 设备准备模式怎么选

| 模式 | 何时使用 | 约束 |
|------|----------|------|
| `full` | 需要从设备流到 SDK 校验跑完整链路 | 必须连接 PhonePilot；重置策略由 `getFeatures()` 自动判断 |
| `sdkOnly` | 设备上已经是目标钱包，只想复跑 SDK suites | 不要求 PhonePilot 连接，但仍需要选择场景与 suite |
| `deviceFlowOnly` | 只验证创建/导入流程，不跑任何 SDK case | 必须连接 PhonePilot；可在不选择 SDK suite 时直接启动 |

### UI 自动响应

运行期间，Automation Runner 会自动处理常见 SDK UI 事件：

- `REQUEST_BUTTON` → PhonePilot `confirmAction()`
- `REQUEST_PIN` → PhonePilot `inputPin('1111')`
- `REQUEST_PASSPHRASE` → SDK `RECEIVE_PASSPHRASE`，随后由 PhonePilot 做物理确认

---

## 1. 场景模型

### AutomationScenario 字段

```ts
interface AutomationScenario {
  id: AutomationScenarioId;
  jiraKey: JiraIssueKey;
  title: string;
  flowType: 'create' | 'import';
  walletType: 'bip39' | 'slip39';
  caseLabel: string;
  wordCount: number;
  shareCount?: number;           // SLIP39
  threshold?: number;            // SLIP39
  phonePilotSequenceId: string;  // 设备流入口
  supportedSuites: TestSuiteType[];
  slip39DatasetId?: Slip39DatasetId;
  bip39ImportMnemonicWords?: string[];  // BIP39 导入场景用于 SDK 校验
}
```

### Suite 类型

| suite | 说明 |
|-------|------|
| `deviceFlow` | PhonePilot 执行创建/导入序列，验证设备流程 |
| `sdkAddressBatch` | 多链地址批量查询，比对预期值 |
| `sdkPubkeyBatch` | 多链公钥批量查询，比对预期值 |
| `specialPassphrase` | 9 组特殊字符 × BTC/EVM/DNX，mockDevice vs SDK |
| `securityCheck` | 28 个链签名方法 × 合法/非法 coinType，验证 safetyChecks 行为 |
| `chainMethodBatch` | 5 条链（BTC/ETH/ADA/SOL/DOT）× 多方法 × presupposes，验证调用成功/失败 |

### 场景矩阵

**BIP39 Create（OK-26053）**

| scenarioId | sequenceId | suites |
|------------|------------|--------|
| `ok26053_bip39_create_12` | `create-wallet` | deviceFlow · sdkAddressBatch · sdkPubkeyBatch |
| `ok26053_bip39_create_18` | `create-wallet-18` | 同上 |
| `ok26053_bip39_create_24` | `create-wallet-24` | 同上 |

**BIP39 Import（OK-26054）**

| scenarioId | sequenceId | suites |
|------------|------------|--------|
| `ok26054_bip39_import_12` | `one-normal-12` | deviceFlow · sdkAddressBatch · sdkPubkeyBatch · specialPassphrase |
| `ok26054_bip39_import_12_two` | `two-normal-12` | 同上 |
| `ok26054_bip39_import_12_three` | `three-normal-12` | 同上 |
| `ok26054_bip39_import_18` | `one-normal-18` | 同上 |
| `ok26054_bip39_import_18_two` | `two-normal-18` | 同上 |
| `ok26054_bip39_import_18_three` | `three-normal-18` | 同上 |
| `ok26054_bip39_import_24` | `one-normal-24` | 同上 |
| `ok26054_bip39_import_24_two` | `two-normal-24` | 同上 |
| `ok26054_bip39_import_24_three` | `three-normal-24` | 同上 |
| `bip39_import_12_api` | `api-normal-12` | deviceFlow · securityCheck · **chainMethodBatch** |

**SLIP39 Create（OK-5504）**

| scenarioId | sequenceId | suites |
|------------|------------|--------|
| `ok5504_slip39_create_20_1of1` | `create-slip39-single-template` | deviceFlow · sdkAddressBatch · sdkPubkeyBatch |
| `ok5504_slip39_create_20_2of2` | `create-slip39-multi-2of2-template` | 同上 |
| `ok5504_slip39_create_20_8of8` | `create-slip39-multi-8of8-template` | 同上 |
| `ok5504_slip39_create_20_16of2` | `create-slip39-multi-16of2-template` | 同上 |

**SLIP39 Import（OK-40090）**

| scenarioId | sequenceId | dataset | suites |
|------------|------------|---------|--------|
| `ok40090_slip39_import_20_1of1` | `count20_one_normal` | `count20_one` | deviceFlow · sdkAddressBatch · sdkPubkeyBatch |
| `ok40090_slip39_import_20_3of2` | `count20_two_normal` | `count20_two` | 同上 |
| `ok40090_slip39_import_20_16of16` | `count20_three_normal` | `count20_three` | 同上 |
| `ok40090_slip39_import_33_1of1` | `count33_one_normal` | `count33_one` | 同上 |
| `ok40090_slip39_import_33_2of3` | `count33_two_normal` | `count33_two` | 同上 |

---

## 2. 执行流程

### DevicePreparationMode

| 模式 | 说明 |
|------|------|
| `full` | 重置设备 → PhonePilot 执行序列 → SDK 测试 |
| `sdkOnly` | 跳过 PhonePilot，设备已有正确钱包，直接跑 SDK suites |
| `deviceFlowOnly` | 只执行设备流，跳过所有 SDK 测试 |

### 主流程（full 模式）

```
1. healthCheck (PhonePilot)
2. getFeatures → 判断是否需要 reset
3. reset-wallet (若需要)
4. execute-sequence(phonePilotSequenceId)
   └─ 期间响应 UI_EVENT：
      REQUEST_BUTTON  → confirmAction()
      REQUEST_PIN     → inputPin('1111')
      REQUEST_PASSPHRASE → SDK RECEIVE_PASSPHRASE(literal)
5. getFeatures → 获取 deviceId
6. 依序执行 supportedSuites ∩ selectedSuites：
   sdkAddressBatch / sdkPubkeyBatch / specialPassphrase / securityCheck / chainMethodBatch
```

> `full` 模式下的 reset 不是固定执行。Runner 会先读取 `features.initialized` 和 `features.unlocked`，再决定是否跳过 reset，或者使用 `reset-wallet-locked` / `reset-wallet-unlocked`。

### suite 失败联动

| 情况 | 行为 |
|------|------|
| `deviceFlow` 失败 | 后续 SDK suites 标记 skipped |
| `deviceId` 获取失败 | SDK suites 标记 failed |
| `stopOnFirstError=true` 且某 suite 失败 | 停止后续场景 |

---

## 3. 数据解析

### BIP39

- **Import**：`bip39ImportMnemonicWords` 存储导入词组，`scenarioResolver` 据此生成地址/公钥预期值，与 SDK 结果比对
- **Create**：设备端创建，通过 mnemonicStore 捕获词组后做 EVM 地址对比确认

### SLIP39

- 设备导入由 PhonePilot 执行，SDK 校验复用仓库现有数据集：
  - 地址：`testTools/slip39Test/addressData`
  - 公钥：`testTools/slip39Test/pubKeyData`
- `scenarioResolver` 通过 `slip39DatasetId + passphraseVariantId` 组装 case id，例如 `count20_one_passphrase_2`

### Passphrase literal

| variant | BIP39 | SLIP39 |
|---------|-------|--------|
| `normal` | `undefined` | `undefined` |
| `passphrase_empty` | `''` | `''` |
| `passphrase_1` | `asdfg7890` | `12345` |
| `passphrase_2` | `1234567890qwertyuiopasdfghjklzxcvbnm` | `onekey` |

### 当前实现约束

- `specialPassphrase` 仅在 **BIP39 import** 场景且场景自带 `bip39ImportMnemonicWords` 时可运行
- `securityCheck` 与 `chainMethodBatch` 仅挂在 `bip39_import_12_api` 场景上
- `SLIP39 create` 的 SDK 校验当前只使用 `normal` 与 `passphrase_2`

---

## 4. 配置与状态

### AutomationTestConfig

```ts
interface AutomationTestConfig {
  scenarioIds: AutomationScenarioId[];
  testSuites: TestSuiteType[];
  passphraseVariants: PassphraseVariantId[];
  phonePilotUrl: string;
  stopOnFirstError: boolean;
  retryCount: number;
  delayBetweenTests: number;
  devicePreparationMode: DevicePreparationMode;
}
```

### 关键 Jotai atoms

| atom | 作用 |
|------|------|
| `automationConfigAtom` | 配置 |
| `automationProgressAtom` | 运行进度 |
| `automationReportAtom` | 最终报告 |
| `liveReportAtom` | 运行中实时报告 |
| `automationLogsAtom` | 实时日志 |
| `phonePilotConnectionStateAtom` | PhonePilot 连接状态 |
| `cameraFrameAtom` | 最近截图 |

### 报告结构

```
TestReport
  └─ ScenarioReportResult[]
       └─ TestSuiteResult[]
            └─ TestCaseResult[]
```

每个 `TestCaseResult` 包含 `title / method / expected / actual / passed / error / duration`。

---

## 5. 运行提示与排障

### 创建场景为什么比导入场景要求更高

create 场景执行完 PhonePilot sequence 后，会读取 `mnemonic-store`：

- BIP39 create：读取助记词词数
- SLIP39 create：额外记录 `shareCount` / `threshold`

因此 create 场景在执行前会检查 `health.ocrReady`。如果 OCR 未就绪，Runner 会直接终止该场景，而不是继续执行一个注定无法校验的流程。

### 常见失败信号

| 日志/现象 | 含义 | 优先检查 |
|-----------|------|----------|
| `PhonePilot server is not reachable` | 服务地址不可达 | `phonePilotUrl`、本地端口、服务是否启动 |
| `PhonePilot MCP connection failed` | `/health` 可达，但 MCP 初始化失败 | PhonePilot MCP transport 状态 |
| `sequence drift: ... is not present in PhonePilot /health sequenceIds` | 当前仓库引用的 `sequenceId` 不在服务端清单中 | PhonePilot 版本、sequence 配置是否同步 |
| `OCR not ready` | create 场景无法读取 mnemonic/share 数据 | OCR 依赖、模型、`/health` 返回的 `ocr.message` |
| `Warning: arm-connect failed` | MCP 已连通，但机械臂未接好 | 机械臂连接状态；依赖 arm 的 sequence 可能失败 |

### 其他行为细节

- `retryCount` 的实际最小值是 `1`
- `delayBetweenTests` 只作用在**场景之间**，不是单个 test case 之间
- 配置通过 `atomWithStorage` 持久化，刷新页面后会保留上次选择
- 若 `deviceFlow` 失败，后续 SDK suites 会标记为 `skipped`
