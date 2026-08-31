# Trezor Source

This package vendors MIT-licensed source from `trezor/trezor-suite`.

- Source package: `packages/utils`
- Source commit: `593784597e72283b9eec1a9f1c25c32a82e5b388` (tag `v26.7.4`)
- Original package name: `@trezor/utils`
- Original license: MIT

## 本地改动

- 所有 import 路径 `@trezor/type-utils` → `@onekeyfe/hwk-trezor-type-utils`（包名重命名，机械替换）。
- `src/bigNumber.ts` — 跟着 v26.7.4 新增了 `STRICT: false`。这个 `Config` 字段是
  `bignumber.js` 11.1.2+ 才有的类型，`package.json` 依赖跟着从 `^9.3.1` 升到
  `^11.1.2`（这是这次同步里唯一一处需要动依赖版本的地方）。
- `src/bufferUtils.ts` — `bufferToBytes`/`toNonSharedBuffer` 的参数类型从
  `Buffer<ArrayBuffer>` 改回 `Buffer`（我们 `@types/node` 是 18，没有 `Buffer<T>` 泛型，
  沿用旧基线就有的写法，不是这次新加的）。
- `src/convertTaprootXpub.ts` — 两处 `const [a, b]: [string, string] = xxx.split(...)`
  改成 `as [string, string]` 类型断言而不是类型标注。`.split()` 返回的是 `string[]`，
  直接标注成定长 tuple 在我们 TS 5.1 下过不去（upstream 用的 TS 6，两边对这类数组转
  tuple 的严格度不一样），加断言绕过，运行时已经用 `.length === 2` 判断过了。
- 删掉了一批 `// @ts-expect-error: ...noUncheckedIndexedAccess...` 注释（分布在
  `logsManager.ts` / `parseElectrumUrl.ts` / `promiseAllSequence.ts` / `arrayShuffle.ts` /
  `comparison.ts` / `logs.ts` / `convertTaprootXpub.ts` / `getRandomInt.ts` /
  `getLocaleSeparators.native.ts` / `bufferUtils.ts`）。upstream 给自己开了
  `noUncheckedIndexedAccess` 编译选项才需要这些注释压错误，我们没开这个选项，
  `tsc` 报 "Unused '@ts-expect-error' directive"，删掉即可，无功能影响。
- `src/isApproximatelyEqual.ts` 删除，`src/index.ts` 里对应的导出也删了 ——
  upstream v26.7.4 自己把这个函数删了，搜过我们仓库和 app-monorepo 都没人用，跟着删。
- 未收录 upstream v26.7.4 新增的 7 个文件（`amountInputTransformers.ts`、
  `context.ts`、`getIndexOrThrow.ts`、`getRandomString.ts`、`getWeakRandomUUID.ts`、
  `isUUID.ts`、`noop.ts`）—— 目前没有任何调用方需要它们，`src/index.ts` 也没有跟着
  加对应导出。以后真用到再单独补。

