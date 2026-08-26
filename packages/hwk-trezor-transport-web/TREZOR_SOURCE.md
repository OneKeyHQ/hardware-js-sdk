# Trezor Source

This package vendors MIT-licensed source from `trezor/trezor-suite`.

- Source package: `packages/transport-web`
- Source commit: `593784597e72283b9eec1a9f1c25c32a82e5b388` (tag `v26.7.4`)
- Original package name: `@trezor/transport-web`
- Original license: MIT

## 为什么突然多了这个包

跟 `hwk-trezor-transport-common` 同一次拆分：upstream 把浏览器专属的 WebUSB transport
和 SharedWorker session backend 从 `packages/transport` 挪进了新包 `transport-web`。
我们旧的 `hwk-trezor-transport/src/transports/webusb.ts` + `webusb.browser.ts` +
`sessions/background-browser.ts` + `sessions/background-sharedworker.ts` 从没被本地
改过（跟旧基线逐字节一致），所以这次直接原样从 v26.7.4 新位置搬过来，没有本地патч要合并。

## 本地改动

- import 路径 `@trezor/transport-common` → `@onekeyfe/hwk-trezor-transport-common`
  （包名重命名，机械替换）。
- 删掉了 `sessions/background-sharedworker.ts` 里一处
  `// @ts-expect-error: indexing with noUncheckedIndexedAccess` 注释——
  跟其它包一样，我们没开这个编译选项，属于无错可压；实测删掉照样编译通过。
