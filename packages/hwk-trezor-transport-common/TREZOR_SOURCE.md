# Trezor Source

This package vendors MIT-licensed source from `trezor/trezor-suite`.

- Source package: `packages/transport-common`
- Source commit: `593784597e72283b9eec1a9f1c25c32a82e5b388` (tag `v26.7.4`)
- Original package name: `@trezor/transport-common`
- Original license: MIT

## 为什么突然多了这个包

`hwk-trezor-transport` 之前是从 upstream 旧基线（commit `7c1a47df3b29f1274e4fc19a5249e1c30f2dbd32`）
整包搬过来的单一包。upstream 在 v26.7.4 之前把 `packages/transport` 拆成了三个包：
`transport`（USB/Bridge/UDP 具体传输实现留在原地）、`transport-common`（本包：环境无关的
抽象层——sessions、THP 协议、abstract transport/api 基类、types、utils）、
`transport-web`（浏览器专属：WebUSB + SharedWorker session backend）。
本次同步跟着 upstream 一起拆，不是我们自己决定拆分。

## 本地改动

- 所有涉及跨包引用的 import：`@trezor/utils` → `@onekeyfe/hwk-trezor-utils`、
  `@trezor/type-utils` → `@onekeyfe/hwk-trezor-type-utils`、
  `@trezor/protobuf` → `@onekeyfe/hwk-trezor-protobuf`、
  `@trezor/protocol`（含 `@trezor/protocol/src/protocol-v2/constants`）→
  `@onekeyfe/hwk-trezor-protocol`（包名重命名，机械替换）。
- `src/api/usb.ts`：
  1. `let newArray: Uint8Array<ArrayBuffer>` → `let newArray: Uint8Array`
     （我们 `@types/node` 是 18，没有 `Uint8Array<T>` 泛型）。
  2. `device?.opened` 判断后关闭设备那段，把 `device.close()` 改成先捕获到
     `const openedDevice = device` 再调用 `openedDevice.close()`——TS 5.1 在这个
     闭包里narrow不住 `device` 仍然可能是 `undefined`，捕获成新常量规避。
- `src/types/usbInterface.ts` — `ArrayBufferView<ArrayBuffer>` → `ArrayBufferView`
  （同一类泛型不存在问题，我们 lib 版本没有这个泛型形式）。
- 删掉了全包范围的 `// @ts-expect-error: ...noUncheckedIndexedAccess...` 压制注释
  （`api/abstract.ts`、`sessions/background.ts`、`thp/loop.ts`、`utils/send.ts`），
  原因同其它包：我们没开这个编译选项，属于无错可压。

## 已知缺口

upstream `transport-common` 有一套自己的单元测试（`tests/*.test.ts`：sessions、THP、
abstractUsb、apiUsb、readMessageBuffer 等），这次没有跟着搬进来 —— 我们原来的
`hwk-trezor-transport` 就没有测试，这次只做同构搬迁，不新增测试覆盖范围。以后要补的话
从 upstream 这几个文件抄。
