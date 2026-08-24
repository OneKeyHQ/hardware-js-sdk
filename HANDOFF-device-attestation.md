# Device attestation SDK handoff

本文只描述 `hardware-js-sdk` 的设备验真接口、实现边界和已知缺口。领券 API、服务端设备键、幂等和验收标准以 App 仓库的 `packages/kit-bg/src/thirdPartyDeviceReward/BACKEND-API-HANDOFF.md` 为准。

## 1. 公共接口

Trezor：

```ts
adapter.verifyDeviceAuthenticity(connectId, {
  challenge: '32-byte-server-challenge-as-64-hex-chars',
});
```

成功 payload 的关键字段（全部是客户端本地结果）：

```ts
{
  vendor: 'trezor';
  verified: true;
  deviceId: string; // 已计算：hex(sha3_256(deviceCertPubKey))
  deviceCertPubKey: string; // 已解析的 Optiga raw public key hex
  usedDebugKey: false;
  trezorProof: {
    challenge: string;
    deviceModel: string;
    proof: AuthenticityProof;
  }
}
```

Ledger：

```ts
adapter.verifyDeviceAuthenticity(connectId, {
  ledgerGenuineCheckWebSocketUrl: 'wss://attestation.example/v1/ledger/session/opaque-token',
});
```

成功 payload 的关键字段（全部是客户端本地结果）：

```ts
{
  vendor: 'ledger';
  verified: true;
  deviceId: string; // 已计算：hex(sha3_256(E0 52 public key))，64 lowercase hex
}
```

正式领券的字段映射与 SDK 本地结果不同：

| 厂商   | App 提交给 claim API                      | 后台如何得到公钥                                                                                |
| ------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Trezor | `challengeId + payload.trezorProof.proof` | `proof.optiga_certificates[0]` 是 DER hex 设备叶证书；验真后取 SPKI BIT STRING 的原始公钥 bytes |
| Ledger | 只有 `challengeId`                        | 从该 challenge 对应 relay 的 `E0 52` response 第二个 LV 取原始公钥 bytes                        |

App 不上传 `payload.verified/deviceId/deviceCertPubKey`，也不会二次哈希 `payload.deviceId`。后台对两家可信原始公钥都独立计算 FIPS 202 SHA3-256，不是 Ethereum Keccak-256。

## 2. Trezor 实现

调用链：

```text
TrezorAdapter.verifyDeviceAuthenticity
  -> Features.internal_model
  -> AuthenticateDevice(challenge)
  -> connector 收集 AuthenticityProof（含分块响应）
  -> authenticateDeviceFromProof
```

设备签名的不是裸 challenge，而是：

```text
compactSize(19)
|| UTF8("AuthenticateDevice:")
|| compactSize(32)
|| challengeBytes
```

当前实现会：

- 验证 Optiga leaf → manufacturing CA → 固定 Trezor production root。
- 验证上述 challenge signature。
- 强制 `optiga_*=P-256`、`tropic_*=Ed25519`，并分别使用对应层的 root；禁止跨字段替换 proof。
- P-256 使用 SHA-256 + secp256r1 ECDSA，兼容 Optiga 的 permissive DER re-encode 并允许合法 high-S；Tropic Ed25519 直接验完整 framed message。
- T3W1 额外要求 Tropic proof。
- 标记 debug root；带服务端 challenge 时禁止开启 debug roots。
- 对恶意/畸形证书返回 `verified: false`，不让 parser exception 逃出。
- 对所有已支持型号统一返回 `sha3_256(optiga deviceCertPubKey)`，不再用型号相关 serial 作为 ID。

Trezor SDK 本地 ID 的精确来源是：

```text
AuthenticateDevice 返回的 proof.optiga_certificates[0]
  → DER X.509 device leaf
  → leaf.tbsCertificate.subjectPublicKeyInfo.bits.bytes
  → 65-byte、0x04 开头的 P-256 point
  → lowercaseHex(SHA3-256(bytes))
```

正式 claim 不单独发送这里解析出的 `deviceCertPubKey/deviceId`；后台从同一张 proof 叶证书重复验证和提取。

客户端 verdict 的已知缺口：Trezor 最新官方策略已按设备 capability 要求 Tropic/MCU，并校验跨层 root/CN/serial；MCU 使用 ML-DSA-44，大 proof 需要完整分块收集。当前客户端配置没有 `T3W1` ML-DSA-44 root，也不验证 MCU 层，所以 SDK verdict 只能是 UX 预检；raw proof 仍交给后台按完整策略验证。后台不能复制客户端 config 作为完整 production trust bundle。

官方核对基线：

- [当前 SDK：Optiga 公钥的 SHA3-256 本地 ID](./packages/hwk-trezor-adapter/src/deviceAuthenticity/index.ts#L94-L163)
- [当前 SDK：从 leaf SPKI BIT STRING 取公钥并验签](./packages/hwk-trezor-adapter/src/deviceAuthenticity/verifyAuthenticityProof.ts#L118-L238)
- [当前 SDK：P-256/Ed25519 签名格式、预哈希与 low-S 策略](./packages/hwk-trezor-adapter/src/deviceAuthenticity/verifySignatures.ts#L1-L42)
- [Trezor 官方：proof verifier](https://github.com/trezor/trezor-suite/blob/fa8dfcb8b6807ce9804a0b0e3a351dcf4af8cc66/packages/device-authenticity/src/verifyAuthenticityProof.ts#L83-L334)
- [Trezor 官方：Tropic/MCU capability 与跨层一致性策略](https://github.com/trezor/trezor-suite/blob/fa8dfcb8b6807ce9804a0b0e3a351dcf4af8cc66/packages/connect/src/api/authenticateDevice.ts#L151-L232)

## 3. Ledger 实现

调用链：

```text
LedgerAdapter.verifyDeviceAuthenticity
  -> connector.configure(one-shot relay base URL)
  -> DMK GenuineCheckDeviceAction
  -> Ledger secure-channel backend/HSM verdict
  -> capture DMK deviceId
  -> clear relay config in finally
```

关键协议事实：

- 当前依赖基线为 `@ledgerhq/device-management-kit@1.2.0`。
- DMK 会在传入 base URL 后追加 `/genuine?targetId=...&perso=...`。
- `E0 52` GET CERTIFICATE 响应中第一个 LV 字段需跳过，第二个 LV 字段才是 65-byte、`0x04` 开头的 attestation public key。
- Ledger DMK 对该公钥执行 `sha3_256`；connector 只把 DMK 的 32-byte 结果转成小写 hex，作为 `payload.deviceId`（其协议语境中的 DSID），没有再次哈希。
- `verified` 的信任根是 Ledger upstream/HSM 的最终 genuine verdict，不是本地离线证书验证。
- relay URL 只用于一次操作并在 `finally/reset` 清除；并发 genuine check 在 adapter 内串行化。

当前生产阻断：connector 自身只强制 `wss:`，不掌握业务环境的可信域名。App 已按 Rebate endpoint 严格校验 hostname、port、`/v1/ledger/session/<token>`、userinfo/query/fragment；任何其他 SDK 调用方也必须提供同等级 allowlist，后续最好把允许的 host/policy 显式下沉到 SDK API。

Ledger DMK 的 parser/state machine 不是稳定公开 API。升级 DMK 时必须重新审计 URL 拼接、E0 52/LV 解析和最终 verdict，并重跑官方向量及真机测试。

官方核对基线：

- [当前 SDK：读取 DMK 的 32-byte deviceId 并转为 hex](./packages/hwk-ledger-adapter/src/connector/LedgerConnectorBase.ts#L854-L900)
- [当前 SDK：Ledger adapter 返回本地验真结果](./packages/hwk-ledger-adapter/src/adapter/LedgerAdapter.ts#L837-L909)
- [Ledger 官方：E0 52 公钥、SHA3-256 DSID 和最终结果](https://github.com/LedgerHQ/device-sdk-ts/blob/c5a122c061e09a9f23536015cc20b4d1fc1fa50c/packages/device-management-kit/src/api/secure-channel/task/ConnectToSecureChannelTask.ts#L137-L236)
- [Ledger 官方：E0 52 第二个 LV 公钥解析](https://github.com/LedgerHQ/device-sdk-ts/blob/c5a122c061e09a9f23536015cc20b4d1fc1fa50c/packages/device-management-kit/src/api/secure-channel/utils.ts#L17-L61)

当前 DMK 1.2.0 默认 genuine upstream 是 `wss://scriptrunner.api.live.ledger.com/update/genuine`；后台 relay 必须固定这个目标，不能接受客户端提供 upstream。

## 4. 身份语义

| 属性               | Trezor                        | Ledger                       |
| ------------------ | ----------------------------- | ---------------------------- |
| 厂商真实性         | production root 证书链        | Ledger HSM genuine verdict   |
| 物理设备身份       | Optiga attestation public key | E0 52 attestation public key |
| SDK 诊断 ID        | SHA3-256                      | SHA3-256                     |
| wipe/recovery 后   | 不变                          | 不变                         |
| 能否证明 seed/账户 | 不能，也不应混入              | 不能，也不应混入             |

服务端在独立验真后生成与 SDK 同口径的设备唯一 ID：Trezor 公钥来自 claim 的 `proof.optiga_certificates[0]`，Ledger 公钥来自 claim 所指 relay 的 `E0 52` response 第二个 LV。防重索引使用 `(campaignId, vendor, deviceId)`；不要把客户端 `deviceId` 当授权输入，也不要再增加一套 HMAC/哈希设备键。

## 5. 必须保留的测试

- Trezor production/debug/unknown roots、challenge 篡改、缺层、畸形证书、统一 64-hex device ID，以及 Tropic proof 不能替换 Optiga proof。
- Trezor capability-based Tropic/MCU、ML-DSA-44、跨层 serial 和流式 proof（补齐后）。
- Ledger genuine/not-genuine/no-deviceId、relay 一次性清理、并发串行化、URL policy。
- Ledger E0 52 第二 LV 提取和 SHA3-256 设备 ID 官方向量。
- 两家设备的 result 都不得把失败 proof 的 device ID 当可信值返回。
