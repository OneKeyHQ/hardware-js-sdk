# Voucher backend integration

完整后台协议已统一维护在 App 仓库：

`packages/kit-bg/src/thirdPartyDeviceReward/BACKEND-API-HANDOFF.md`

先区分 SDK 本地结果与生产请求：

- Trezor SDK 的 `payload.deviceId` 已是 SHA3-256，但正式 claim 只上传 `challengeId + payload.trezorProof.proof`。后台验证 proof 后，从 `proof.optiga_certificates[0]` 的 leaf SPKI BIT STRING 提取 65-byte 公钥，再独立计算 SHA3-256。
- Ledger SDK 的 `payload.deviceId` 已是 DMK 计算的 SHA3-256/DSID；App 不再哈希也不上传它。正式 claim 只上传 `challengeId`；后台从该 challenge 的 relay 中提取 `E0 52` response 第二个 LV 公钥，并在同一 session 验证 Ledger HSM 最终结果后独立计算 SHA3-256。
- App 的 `verified/deviceId/deviceCertPubKey/deviceModel`、钱包、地址和账户签名都不是后台可信证据。
- Ledger DMK 会在 relay base URL 后追加 `/genuine?targetId=...&perso=...`；后台必须把 relay transcript、公钥、最终 verdict 和 challenge 绑定为同一 session。
- 当前客户端没有 `T3W1` ML-DSA-44 root/MCU verifier；后台必须按主规格固定的 Trezor 官方 production root tuple 和撤销策略实现，不能复制客户端 config 代替。
- 再次取得原券仍使用新 challenge 和同一 claim API；只有同一 claim 的网络重试复用原 challenge 并要求幂等。
- 正式 claim DTO 已简化为：Trezor 传 `challengeId + proof`，Ledger 只传 `challengeId`；vendor、协议版本和 Ledger session 均由 challenge 记录确定。

SDK 具体实现和未完成项见仓库根目录 `HANDOFF-device-attestation.md`。
