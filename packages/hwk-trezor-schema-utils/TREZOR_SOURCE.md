# Trezor Source

This package vendors MIT-licensed source from `trezor/trezor-suite`.

- Source package: `packages/schema-utils`
- Source commit: `593784597e72283b9eec1a9f1c25c32a82e5b388` (tag `v26.7.4`)
- Original package name: `@trezor/schema-utils`
- Original license: MIT

## 本地改动

- `src/custom-types/keyof-enum.ts` — 原样采用 v26.7.4 上游的重写版（`TKeyOf<TObject<...>>` 取代旧版
  `TUnion<TLiteralGuard<UnionToTuple<...>>>` 递归类型）。这正好是我们之前手动尝试规避的
  `.d.ts` 阶段 "Hint cannot be named" (TS4023) 问题的官方解法，upstream 已经用这种写法修过了，
  不需要我们再自己绕。唯一改动：import 路径 `@trezor/utils` → `@onekeyfe/hwk-trezor-utils`（包名重命名）。
- `src/codegen.ts` — import 路径 `@trezor/schema-utils` → `@onekeyfe/hwk-trezor-schema-utils`（包名重命名，
  非编译修复；此文件不在 `src/index.ts` 的入口图里，不影响发布产物）。
- `src/custom-types/index.ts`、`src/index.ts` — 额外导出 `TArrayBuffer` / `TBuffer` / `TKeyOfEnum` /
  `TUint` / `TUintOptions` 这几个类型（上游只导出 builder class，不导出对应类型），供下游按类型引用。
- `package.json` — 新增依赖 `@onekeyfe/hwk-trezor-utils`（新版 `keyof-enum.ts` 需要它的
  `typedObjectFromEntries` / `typedObjectKeys`，旧版不需要）。

