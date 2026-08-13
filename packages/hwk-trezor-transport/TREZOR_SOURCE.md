# Trezor Source

This package vendors MIT-licensed source from `trezor/trezor-suite`.

- Source package: `packages/transport`
- Source commit: `593784597e72283b9eec1a9f1c25c32a82e5b388` (tag `v26.7.4`)
- Original package name: `@trezor/transport`
- Original license: MIT

## 拆分说明

upstream 在 v26.7.4 之前把 `packages/transport` 拆成了三个包，本包只保留了 upstream
自己留在 `transport` 里的那部分：Bridge / node-usb / UDP 具体传输实现，以及
`bridgeApiCall` / `bridgeProtocolMessage` 这类 Bridge 专属 utils。环境无关的抽象层
（sessions、THP、abstract transport/api 基类、types、结构化 USB 接口）搬到了新建的
[`@onekeyfe/hwk-trezor-transport-common`](../hwk-trezor-transport-common/TREZOR_SOURCE.md)；
浏览器专属的 WebUSB + SharedWorker session backend 搬到了新建的
[`@onekeyfe/hwk-trezor-transport-web`](../hwk-trezor-transport-web/TREZOR_SOURCE.md)。

`src/index.ts` 现在跟 upstream 一样只导出本包自己还拥有的东西（`BridgeTransport`、
`NodeUsbTransport`、`UdpTransport`、`applyBridgeApiCallHeaders`、`bridgeApiCall`、
`bridgeApiResult`、`bridgeProtocolMessage`），不再从这里导出 `Transport` /
`WebUsbTransport` / `SessionsBackground` 等——查过仓库里没有任何调用方在用主入口的这些
符号（`hwk-trezor-connector-webusb` 有个同名的 `TrezorWebUsbTransport` 类，是自己独立实现的，
跟这个包无关），所以不需要留兼容重导出。

`./hwk` 子路径入口（`hwk.ts`）**保留**，因为 `hwk-trezor-core` 和 `hwk-trezor-connector`
的测试实际在用它。内容从"本地相对路径导入"改成"从 `@onekeyfe/hwk-trezor-transport-common`
转发"：
```ts
export { buildMessage, createChunks, sendChunks, receive, receiveAndParse, callThpMessage, parseThpMessage }
  from '@onekeyfe/hwk-trezor-transport-common';
```
`hwk-trezor-core/src/__tests__/vendoredPackageBoundary.test.ts` 里原本断言 `hwk.ts`
必须包含字符串 `'./src/utils/receive'`（相对路径）——这条断言已经跟着更新成检查
从 `@onekeyfe/hwk-trezor-transport-common` 转发，语义（"hwk.ts 存在、不重复实现
receive 逻辑"）没变，只是路径跟着拆分更新。

## 本地改动

- 所有 import 路径重命名（机械替换）：`@trezor/protocol`（含
  `@trezor/protocol/src/errors`）→ `@onekeyfe/hwk-trezor-protocol`、
  `@trezor/transport-common` → `@onekeyfe/hwk-trezor-transport-common`、
  `@trezor/utils` → `@onekeyfe/hwk-trezor-utils`、
  `@trezor/type-utils` → `@onekeyfe/hwk-trezor-type-utils`。
- `package.json`：去掉了 `@onekeyfe/hwk-trezor-protobuf`（拆分后本包不再直接用到
  protobuf，`hwk.ts` 需要的东西都从 `transport-common` 转发）、`@types/w3c-web-usb`、
  `@types/sharedworker`（WebUSB/SharedWorker 具体实现搬去了 `transport-web`，本包
  `nodeusb.ts` 用的 `WebUSB` 类型来自 `usb` 包自带类型，不需要 `@types/w3c-web-usb`）；
  新增 `@onekeyfe/hwk-trezor-transport-common`。
- 删掉了 `api/udp.ts` 里一批 `// @ts-expect-error: ...noUncheckedIndexedAccess...`
  压制注释，跟其它包一样：我们没开这个编译选项，属于无错可压。
