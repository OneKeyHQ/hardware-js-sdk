# Trezor Source

This package vendors MIT-licensed source from `trezor/trezor-suite`.

- Source package: `packages/protobuf`
- Source commit: `593784597e72283b9eec1a9f1c25c32a82e5b388` (tag `v26.7.4`)
- Original package name: `@trezor/protobuf`
- Original license: MIT

## 本地改动

- 所有 `src/definitions/messages-*.ts` — import 路径 `@trezor/schema-utils` →
  `@onekeyfe/hwk-trezor-schema-utils`（包名重命名，机械替换，逐文件相同）。
- `src/manager.ts` — 两处沿用旧基线就有的修复，非 v26.7.4 引入：
  1. THP codec_v1 `Failure_InvalidProtocol` 20 字节兼容判断，改成直接按字节比较
     （`binaryPayload[0] === 0x08 && binaryPayload[1] === 0x11`），不用 `Buffer.compare`。
  2. `fromBinary(schema, Uint8Array.from(patchedPayload), ...)` —
     `@bufbuild/protobuf` 的 `fromBinary` 在我们的 `@types/node` 18 环境下对 `Buffer`
     类型不买账，转成纯 `Uint8Array` 规避。
  另外删掉了一处 `// @ts-expect-error noUncheckedIndexedAccess` 注释（我们
  tsconfig 没开这个选项，属于"无错可压"，见下条统一说明）。
- 全包范围：删掉了所有 `// @ts-expect-error: ...noUncheckedIndexedAccess...` 注释
  （分布在多个 `messages-*.ts` / `manager.ts` 里）。这是 upstream 给自己开了
  `noUncheckedIndexedAccess` 编译选项后加的压制注释，我们 `tsconfig.json` 没开这个
  选项，`tsc` 会报 "Unused '@ts-expect-error' directive"，删掉即可，无功能影响。
- **`AuthenticityProof` / Safe7 认证消息一族**（`AuthenticityProof`、
  `AuthenticityProofSizes`、`AuthenticityProofType`、`AuthenticityProofChunk`、
  `GetAuthenticityProofChunk`，`AuthenticateDevice` 加了 `stream` 字段）——
  之前我们在旧基线上手动加过一版等价实现；v26.7.4 官方已经原生支持，字段形状逐字段核对
  完全一致，直接采用 upstream 版本，手改版作废。`hwk-trezor-adapter` 里依赖这些消息形状的
  `verifyAuthenticityProof.ts` / `x509certificate.ts` 不需要跟着改。
- `src/definitions/messages-nostr.ts` + `messages-nostr_pb.js` + `messages-nostr_pb.d.ts` —
  upstream v26.7.4 新增的 Nostr 消息定义，之前没有。原样收进来（`definitions/index.ts`
  会 re-export 它，不收会导致 index.ts 编不过），import 路径同样做了包名重命名。目前没有
  任何调用方用到 Nostr，纯粹是跟着 upstream 全量同步进来的,不是因为有需求。
- 其余 `*_pb.js` 生成文件（bitcoin/ble/cardano/common/crypto/debug/definitions/
  ethereum(-eip712)/evolu/management/ripple/solana/stellar/telemetry/thp/tron）—
  纯 `@generated` 产物，v26.7.4 原样覆盖，未手改。

