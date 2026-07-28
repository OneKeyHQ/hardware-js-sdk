# 交接文档：第三方硬件设备唯一 ID + 账户名迁移

> 最后更新：2026-07-28
> 本文保留了早期调查过程；以本节状态和
> `docs/device-attestation-voucher-backend.md` 的生产边界为准。

> **重要纠正**：客户端验真已收敛为 Trezor Connect 的生产策略：所有支持机型验证
> Optiga，T3W1 / Safe 7 再验证 Tropic。设备返回的 MCU 字段仍保留在 raw proof 中，
> 但不使用自定义 ML-DSA/serial 规则覆盖厂商结果。客户端已移除本地 Node/WSS/DMK
> 服务端，只保留最小真机集成检查；生产 Ledger relay 和发券信任边界由后端独立实现。

---

## 0. 状态速览

| 项                                                          | 状态                                                     | 真机验证                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| Trezor 设备唯一 ID（AuthenticateDevice 本地验签）           | ✅ 流式 proof + 官方 Optiga/Tropic 验证策略              | ⏳ 当前修复待 Safe 7 重新点击验证                                  |
| Ledger 设备唯一 ID（官方 DMK Genuine Check）                | ✅ SDK 直接厂商验真；客户端无本地 Node relay             | ✅ Nano X 真机已返回 genuine + DSID                                |
| Ledger 裸 attestation 公钥提取（transport tap）             | ✅ 已实现，已同步                                        | ⏳ 待测 `attestationPubKey` 字段                                   |
| Review 修复（H1/H2/M1/M2/M3）                               | ✅ 已应用 + 单测                                         | H1 已随 T3W1 真机验证                                              |
| app-monorepo 调试页（Developer→Gallery→DeviceAuthenticity） | ✅ 已加                                                  | ✅ 已用它测通两端                                                  |
| 账户名读取 · Ledger                                         | ✅ Desktop 已实现只读清单                                | ✅ 本机读出 Ethereum 名称/地址                                     |
| 账户名读取 · Trezor                                         | ✅ Desktop 已实现 Suite 缓存只读清单                     | ✅ 本机读出 Bitcoin 首个 receive address；不连接设备               |
| 本地 mock 发券                                              | ✅ 仅作 UI 联调：SDK 真机验真后生成 DEV 券               | 不作为后端可信凭证；生产发券由后端独立实现                         |

---

## 1. 背景与目标

**工作线 ①**：记录第三方 Trezor / Ledger 硬件钱包的**物理设备唯一 ID**，用于按收益分账对账。要求：跨 wipe/恢复不变、换设备就不同、不可被同一助记词伪造。核心结论——种子派生的地址/公钥**不行**（那是种子级，同助记词到处一样、wipe 后又变）；正确答案是**设备认证（attestation）里出厂烧录、随设备走的密钥**。

**工作线 ②**：做一个"从 Trezor Suite / Ledger Live 迁移账户名"的功能（类似 Edge 导入 Chrome 书签）：读用户本地 {地址 → 账户名}，在 OneKey 里按地址匹配、弹窗问要不要改名。

---

## 2. 仓库与分支

| 仓库                                               | 分支                                           | 作用                                                                                                            |
| -------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `~/Development/OnekeyWork/hardware-js-sdk`         | `codex/device-attestation-voucher-proof`       | Trezor/Ledger 真机验真 SDK 与设备传输能力                                                                         |
| `~/Development/OnekeyWork/app-monorepo-fix-ledger` | `codex/third-party-device-onboarding-rewards`  | 设备详情页、最小本地验真 UI、Claim 演示与账户名清单                                                               |
| 参考（只读）                                       | —                                              | `~/Development/OnekeyWork/trezor-suite`、`trezor-firmware`、`node_modules/@ledgerhq/device-management-kit`(DMK) |

> ⚠️ 关键前提：设备认证只能加在**新 `hwk-*` 栈**（`hwk-trezor-adapter`/`hwk-ledger-adapter`/`hwk-trezor-connector`），**不能**加在 legacy `packages/core`（`DeviceVerify.ts` 那套）——legacy 的 wire protobuf 里没有 `AuthenticateDevice` 消息、features 也没有 `internal_model`。

---

## 3. 工作线 ①：设备唯一 ID —— 实现细节

### 3.1 Trezor（本地可验，最干净）

**机制**：`AuthenticateDevice({ challenge, stream: true })` → 旧固件直接返回
`AuthenticityProof`，Safe 7 当前固件先返回各 proof part 的大小，再由主机以
`GetAuthenticityProofChunk` 分块取回。主机侧使用 Trezor 公开的生产根验证证书与
challenge 签名。T3W1 按 Trezor Connect 的生产策略同时验证
Optiga(P-256) 和 Tropic(Ed25519)。MCU proof 会随 raw evidence 返回，但不参与当前客户端 verdict。

**支持机型**：Safe 3（T2B1/T3B1）、Safe 5（T3T1）、T3W1（+Tropic）。**Trezor One(T1B1)/Model T(T2T1) 无安全芯片，不支持**。

**API**：`TrezorAdapter.verifyDeviceAuthenticity(connectId, { dangerouslyAllowDebugKeys? })` → `Response<AuthenticateDeviceResult>`：

```ts
{ verified: boolean, deviceId?, deviceCertPubKey?, serialNumber?, rootPubKey?, caPubKey?, usedDebugKey?, error? }
```

`deviceId` = 序列号（T3W1+）或 `sha256(deviceCertPubKey)`。**只信 `verified===true` 且 `usedDebugKey!==true`**。

**新增验签模块**：`packages/hwk-trezor-adapter/src/deviceAuthenticity/`（从 `@trezor/device-authenticity` 移植）：

- `x509certificate.ts`（DER/X.509 解析，自包含，原样移植）
- `verifySignatures.ts`（P-256 + Ed25519；P-256 **关 lowS**——硬件签名非 low-S）
- `verifyAuthenticityProof.ts`（根 CA→CA→ 设备 →challenge 全链 + CA 黑名单钩子）
- `config.ts`（Trezor 公开 Optiga/Tropic 生产根）
- `index.ts`（`authenticateDeviceFromProof()`：整体 try/catch 兜底、T3W1 强制 Optiga + Tropic、debug-key 标记）
- `__tests__/verifyAuthenticityProof.test.ts`（Optiga/Tropic 真证书和签名黄金向量）

**设备调用接线**（3 处）：

- `hwk-adapter-core/src/types/wallet.ts`：`IDeviceManagerMethods` 加可选 `authenticateDevice`
- `hwk-trezor-connector/src/index.ts`：switch 加 `case 'authenticateDevice'` 发 `AuthenticateDevice` 消息
- `hwk-trezor-adapter/src/adapter/TrezorAdapter.ts`：`verifyDeviceAuthenticity` 方法

**历史真机结果**（T3W1）：`Verified ✅`，`deviceId=serialNumber` = `3437333132303432353030383646`（ASCII "4731204250086F"），`rootPubKey` 命中 T3W1 PROD Optiga 根键（非 debug）。2026-07-28 收敛官方策略后的版本需要重新点击一次 Claim 验证。

### 3.2 Ledger（必须走 Ledger 后端）

**关键教训**：最初实现的"自造 `E0 52`（GET CERTIFICATE）裸 APDU 本地读证书"路线**真机上不成立**——Nano X 对裸 `E0 52 00 00 00` 返回状态字 `6604`（不是参数错 6a86，是**缺 secure-channel 会话**）。证书读取必须在 Ledger 后端驱动的加密会话里做。

**最终机制**：用 DMK 的 `GenuineCheckDeviceAction`——和"装 App"**完全同一套** secure-channel 管道（`wss://scriptrunner.api.live.ledger.com/update/genuine`）。DMK 内部读设备 attestation 证书、算出 `deviceId = sha3_256(attestation pubkey)`，并给出 `{ isGenuine }` 真伪结论。**无需 token / 不用登录**（设备自己在会话里握手），装 App 能连=genuine 能连、零额外配置。

**API**：`LedgerAdapter.verifyDeviceAuthenticity(connectId)` → `Response<LedgerAttestationResult>`：

```ts
{ verified: boolean, deviceId?, attestationPubKey?, note }
```

- `verified` = Ledger HSM 的 `isGenuine`
- `deviceId` = `sha3_256(attestation pubkey)`（后端验证过）
- `attestationPubKey` = 65 字节裸公钥（best-effort，见下）

**实现**（都在 `hwk-ledger-adapter`）：

- `connector/LedgerConnectorBase.ts`：`case 'getDeviceGenuineCheck'` —— `dmk.executeDeviceAction({sessionId, new GenuineCheckDeviceAction({input:{}})})` + `deviceActionToPromise`（**照抄装 App 的模式**），从 Pending 的 `intermediateValue.deviceId`（Uint8Array）捕获 deviceId，**5 分钟超时**（"Allow secure connection" 确认看门狗不会为它暂停）。
- `adapter/LedgerAdapter.ts`：`verifyDeviceAuthenticity` 走该 case；没拿到 deviceId 时返回 failure（不给假 id）。

**裸公钥提取**（transport tap）：DMK 只吐 hash 不吐裸公钥。为对齐 Trezor，在 `LedgerConnectorBase._tapTransportForCert`/`_tapConnectedDevice` 用 Proxy 包 `TransportConnectedDevice.sendApdu`（**唯一 APDU 必经口**），截 `E0 52` 应答用 LV 解析抠出 65 字节公钥，再用 `sha3_256(pubkey)===deviceId` **交叉校验**确保是对的那把。tap 全程 try/catch + 原样返回,**绝不干扰真实 APDU 流**。

**真机结果**（Nano X）：`Verified ✅`，`deviceId=818706ff78239d1ab642df69c1d1fdd48acfc59ba282f4139383cfee31adfcdc`（走 genuine-check backend）。`attestationPubKey` 字段的真机验证**待做**（清缓存重启 Desktop 后看 Ledger 结果多一行 `attestationPubKey: 04...`）。

#### 3.2.1 当前 Monorepo 最小验证实现

App Monorepo 不再内置 Node/WSS/DMK 服务端。设备详情页的开发按钮只做两件事：

1. 调用 `adapter.hw.verifyDeviceAuthenticity()` 跑真实设备/厂商验真；
2. 验真成功后生成一张本地 `DEV-LOCAL-*` 券，验证 UI 流程。

Trezor 会使用 background 生成的 32-byte challenge；Ledger 直接运行 SDK 中的官方
DMK Genuine Check 并连接 Ledger HSM。两者结果都是真实集成结果，但客户端返回的
`verified/deviceId` **不能作为生产后端发券凭证**。

后端团队按 `docs/device-attestation-voucher-backend.md` 独立实现 challenge、Ledger
relay、状态机、鉴权、幂等和发券事务。客户端当前没有可复用的本地服务端代码，也不
直接依赖 `ws`、`rxjs`、`purify-ts` 或 Ledger DMK 包。

### 3.3 Review 修复状态（Fable 5 审查）

- **H1**（T3W1 只验 Optiga = 芯片移植攻击面）→ ✅ 按 Trezor Connect 生产策略，
  T3W1 强制 Optiga + Tropic；不再追加未经厂商 API 定义的 MCU/serial verdict。
- **H2**（Ledger 假 id 易误用）→ ✅ 已被 genuine-check 重构取代：现在 Ledger 有真 `verified` + 后端验证的 deviceId。
- **H3**（Ledger `E0 52` p1/p2 是猜测 + 批次证书风险）→ ✅ 真机坐实"裸 E0 52 不成立"，已改走 genuine-check（彻底绕开该风险）。
- **M1**（无吊销通道）→ ✅ 加 CA 公钥黑名单钩子（默认空）。
- **M2**（畸形证书抛未捕获异常）→ ✅ `authenticateDeviceFromProof` 整体 try/catch → `verified:false`。
- **M3**（debug key 无守卫）→ ✅ 参数改名 `dangerouslyAllowDebugKeys` + 结果带 `usedDebugKey` 标志。
- 已补：Safe 7 流式 proof protobuf/连接逻辑和 Optiga/Tropic 生产根；仍待当前 App
  重新点击真机验真。L1（CA notBefore 未来检查，Low）仍未做。

---

## 4. 构建 / 同步 / 缓存 工作流（**踩坑重灾区，必读**）

app-monorepo 通过**文件拷贝**吃 SDK（node_modules 里是 dist 副本，不是软链）。每次改 SDK 都要走完整链路，**光重启不清缓存不生效**：

```bash
# Terminal A：同步所有本地 SDK dist 到 app-monorepo
cd ~/Development/OnekeyWork/hardware-js-sdk
yarn debug:watcher

# Terminal B：构建并监听改过的包
yarn workspace @onekeyfe/hwk-trezor-adapter dev
# Ledger 改动时换成 @onekeyfe/hwk-ledger-adapter

# 如果 Desktop 已缓存旧的 node_modules bundle：停掉 Desktop 后清一次缓存
cd ~/Development/OnekeyWork/app-monorepo-fix-ledger
rm -rf apps/desktop/node_modules/.cache node_modules/.cache/web node_modules/.cache/babel-loader

# 再启动 Desktop
corepack yarn app:desktop
```

**判断新代码是否生效**：看报错信息变没变（每版报错串不同）。曾因缓存导致改了半天还跑旧代码、报旧的 `GET CERTIFICATE failed with status 6604`。
**注意**：缓存不能边跑边清（webpack 会立刻重新生成）——必须先停 Desktop 再清。
**构建环境**：`tsup` 曾部分缺失，`yarn install` 可恢复（本会话已跑过一次）。

> 当前使用 `yarn debug:watcher` 同步本地 SDK，不发 alpha 包。
> `hwk-ledger-adapter` 只需同步 `dist`；App Monorepo 不再包含本地 relay。

---

## 5. app-monorepo 调试页（怎么测）

**新增/改动**（`app-monorepo-fix-ledger`）：

- `packages/kit-bg/src/services/ServiceThirdPartyHardware/index.ts`：加 background 转发方法 `thirdPartyHardwareVerifyDeviceAuthenticity({ vendor, connectId })` → `adapter.hw.verifyDeviceAuthenticity(connectId)`。
- `packages/kit/src/views/Developer/pages/Gallery/Components/stories/DeviceAuthenticity.tsx`：**新页面**（vendor 切换 + Search 拿 connectId + Verify + 结果显示）。
- `packages/shared/src/routes/gallery.ts`：枚举加 `ComponentDeviceAuthenticity`。
- `packages/kit/src/views/Developer/pages/Gallery/index.tsx`：lazy import + 路由（菜单自动从枚举生成）。

**测试步骤**：Desktop 里 → 开 Developer Mode → **Developer → Gallery → 搜 "DeviceAuthenticity"** → 选 Trezor/Ledger → **Search devices**（先关掉 Trezor Suite / Ledger Live，它们抢 USB/HID）→ **verifyDeviceAuthenticity**。

- Ledger 首次会弹设备上的 "Allow secure connection" + 联网。
- **Ledger 的 connectId 为空是正常的**（USB 单设备自动选中）；页面已处理（handleVerify 对 Ledger 不强制 connectId）。

**测试入口对比**：`hwk-demo`（Expo，只 web，且 Ledger 有 metro friction）**不适合**——用 app-monorepo Desktop 才对。

**待办真机验证项**：① Ledger 两台同批次设备 deviceId 是否不同（genuine-check 理论上必唯一）；② Ledger `attestationPubKey` 字段是否出现。

---

## 6. 工作线 ②：账户名迁移 —— 调研结论（未实现）

### 6.1 Ledger Live —— ✅ 可行（纯本地明文）

数据在 `~/Library/Application Support/Ledger Live/app.json`（明文 JSON，未加密）。本机 17 账户实测跑通。

- **账户名**：`data.wallet.accountsData.accountNames`（用户改的，`[[accountId,name],...]`）优先，回退 `data.accounts[].data.name`（已解析默认名，永不空）。
- **地址**：EVM 用 `accounts[].data.freshAddress`（稳定，小写比对）；BTC/UTXO 的 `freshAddress` 是"下一个未用地址"**不稳定**，得用 `xpub`+`derivationMode` 或派生 index0。
- **account id 格式**：`js:2:<链>:<xpub或地址>:<派生模式>`。
- **加密降级**：用户若在 Ledger Live 设了应用密码，`data.accounts`/`data.wallet` 变 AES 串——检测 `accounts` 不是 list 就提示用户临时关密码，别破解。
- **`~/Library/Application Support/Ledger Wallet/`** 只有 Crashpad/sentry，无 app.json；数据在 "Ledger Live" 目录。

### 6.2 Trezor Suite —— ⚠️ 难（接设备 + 云端文件）

账户标签是**加密的**（labeling/metadata 功能），设计上不让纯本地读：

- **加密**：`.mtdt` 文件 AES-256-GCM。密钥根 `masterKey` **必须由 Trezor 设备**通过 CipherKeyValue 派生：
  - `path="m/10015'/0'"`, `key="Enable labeling?"`, `value="fedcba98765432100123456789abcdeffedcba98765432100123456789abcdef"`, `encrypt=true`
  - 之后纯软件：`deriveMetadataKey(masterKey,xpub)=base58check(HMAC-SHA256(masterKey,xpub))` → 每账户一把；`deriveAesKey`/`deriveFilename` 见 `trezor-suite/suite/metadata/src/metadataUtils.ts`。
  - **接设备只需一次**（拿 masterKey），逐账户解密全是软件，不用每账户点设备。
- **文件在哪**：旧版/本地模式在 `userData/metadata/*.mtdt`（接设备就能读）；**新版 Suite(26.5.2，用户这台)已搬到 Dropbox / Google Drive / suite-sync 中继**——本地没文件，得让用户 OAuth 授权网盘/连中继取回。
- **解密后结构**：`{ accountLabel, addressLabels:{地址→名字}, outputLabels }`。`addressLabels` 直接是 {地址 → 名字}；`accountLabel` 是账户整体名，按地址匹配需先从 xpub 派生该账户地址集。
- **本机现状**：labeling 从没启用过，本地无任何标签（xpub 在 IndexedDB 明文，但没名字）。要真测需一台用户确实改过名的机器/账户。
- **可行性结论**：**(b) 半能**——接设备拿钥匙 + 搞定文件来源（本地直接读 / 云上要授权）。比 Ledger 重不少。

### 6.3 迁移弹窗匹配逻辑（通用）

OneKey 侧已有用户账户地址/xpub。对每条导入 `{地址或xpub → 名字}`：EVM 按地址比、BTC/xpub 类按 xpub（或派生首地址）比，命中就弹"要不要把这个账户也改成这个名"。

### 6.4 待你拍板

- 是否**先做 Ledger**（纯本地、快）、Trezor 排二期？
- Trezor 若做，目标用户主要是"本地存标签"还是"云同步"？后者要把 Dropbox/Google OAuth 纳入范围。

---

## 7. 关键文件索引

**SDK（hardware-js-sdk）**

- 新增：`packages/hwk-trezor-adapter/src/deviceAuthenticity/`（验签模块 + 测试）
- 改：`hwk-trezor-adapter/src/adapter/TrezorAdapter.ts`、`hwk-trezor-connector/src/index.ts`、`hwk-adapter-core/src/types/wallet.ts`
- 改：`hwk-ledger-adapter/src/adapter/LedgerAdapter.ts`、`hwk-ledger-adapter/src/connector/LedgerConnectorBase.ts`
- 改：两个 `package.json`(加 `@noble/curves`/`@noble/hashes`)、`hwk-demo` 两个文件（web 版调试按钮，可选）

**app-monorepo-fix-ledger**

- `packages/kit-bg/src/services/ServiceThirdPartyHardware/index.ts`
- `packages/kit/src/views/Developer/pages/Gallery/Components/stories/DeviceAuthenticity.tsx`（新）
- `packages/shared/src/routes/gallery.ts`、`packages/kit/src/views/Developer/pages/Gallery/index.tsx`

**参考/证据**

- Trezor 验签参考：`trezor-suite/packages/device-authenticity/src/`
- Trezor 根 CA：`trezor-firmware/core/embed/projects/prodtest/cmd/hsm_keys.h`
- Ledger genuine-check：`node_modules/@ledgerhq/device-management-kit/lib/esm/src/api/secure-channel/`
- Ledger 装 App 模式参照：`hwk-ledger-adapter/src/device-apps/DeviceApps.ts`
- 迁移数据：`~/Library/Application Support/Ledger Live/app.json`、`~/Library/Application Support/@trezor/`、`trezor-suite/suite/metadata/src/metadataUtils.ts` + `metadataLabelingConstants.ts`

---

## 8. 未提交 / 未决事项

- 原始调试工作已分别 checkpoint；生产接入工作在
  `codex/device-attestation-voucher-proof` 和
  `codex/third-party-device-onboarding-rewards` 分支继续。
- 设备 ID：Ledger `attestationPubKey` 字段 + 两台同批次 deviceId 唯一性待真机确认。
- 分账合规提醒：采集第三方设备 ID 属设备指纹，多辖区算个人数据需披露同意；attestation 只证明"真设备"，不证明"同一个人"。
- Trezor Suite 云端标签仍需要 Dropbox/Google/suite-sync 的产品授权范围；App 会明确返回
  `cloud_source_requires_authorization`，不会误报成已同步。

---

## 9. 生产接入实现（2026-07-26）

后端协议、安全边界、表结构、幂等事务、Ledger relay 及上线测试门槛已整理到：

- `docs/device-attestation-voucher-backend.md`

SDK：

- `IHardwareWallet.verifyDeviceAuthenticity(connectId, params)` 成为公共类型；
- Trezor 接受服务端 32-byte challenge，原样调用 `AuthenticateDevice`，返回 raw
  certificates/signatures 给后端独立验证；
- Ledger connector 支持单次 `wss://` genuine-check relay base，运行结束恢复 Ledger
  官方默认；
- bridged/combined connector 支持运行时 `configure`；
- Ledger `isGenuine=false` 的结果不再返回 attacker-controlled device identity；
- reward 客户端不使用 `dangerouslyAllowDebugKeys`。

App：

- 仅 `FinalizeWalletSetup` 识别到真正新增的 Ledger/Trezor wallet 时，在用户点
  Enter wallet 后运行 post-add flow；
- Electron main 读取 Ledger Live `app.json`，只向 background 返回
  Ethereum `name/address` 最小字段；`xpub`、源 account id 与完整账户对象不跨 IPC；
  支持 `accountNames` tuple 和旧结构，并对 password-encrypted 数据 fail closed；
- 相同 EVM 地址且所有候选名称一致时，Ledger Live 名称先经用户确认，再调用
  `setAccountName`；读取、确认和 rename RPC 均有尾超时；
- 之后显示设备奖励弹窗：服务端 challenge → 物理设备证明 → canonical address
  signature → 服务端 claim；
- Trezor claim 上传 raw proof；Ledger claim 只上传后端拥有的 relay session id，不上传
  客户端 `verified/deviceId` 作为证据；
- relay URL 只允许当前环境 OneKey attestation origin、固定 path 与单次 token，穿过
  SW/offscreen bridge 时不会写入 SDK 日志；
- claim background method 显式重建白名单 DTO，运行时额外字段（包括客户端
  `verified/deviceId/DSID`）不会透传；
- 任何名称迁移、厂商服务或 reward API 失败都不阻止钱包创建和进入首页。

服务端上线 gate：

- App 的“新 wallet id”判断只控制 UI，`walletAddAttemptId/walletId` 不证明首次添加；
- 发券必须由服务端根据可信 creation event，或 OneKey ID + 已验证 DSID + 地址 +
  campaign 的历史 claim 判定资格；后端未实现前不得开放活动。
