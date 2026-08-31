# Trezor Source

This package vendors MIT-licensed source from `trezor/trezor-suite`.

- Source package: `packages/protocol`
- Source commit: `593784597e72283b9eec1a9f1c25c32a82e5b388` (tag `v26.7.4`)
- Original package name: `@trezor/protocol`
- Original license: MIT

## 本地改动

- `src/protocol-thp/crypto/{crc32,curve25519,pairing,tools}.ts`、`src/protocol-thp/utils.ts`、
  `src/protocol-tpn/decode.ts` — 删掉了几处 `// @ts-expect-error: indexing with
  noUncheckedIndexedAccess` 注释。这几行是上游为自己开了 `noUncheckedIndexedAccess`
  编译选项加的，我们 `tsconfig.json` 没开这个选项，所以这几行在我们这没有对应的错误可压，
  `tsc` 会报 "Unused '@ts-expect-error' directive"，删掉即可，没有功能影响。
- `src/index.ts`、`src/protocol-thp/decode.ts` — v26.7.4 里上游没碰这两个文件，之前留的本地
  改动原样保留：`index.ts` 多导出了 `protocol-v2/constants`（`hwk-trezor-core` 的 tsup alias
  需要用到）。

