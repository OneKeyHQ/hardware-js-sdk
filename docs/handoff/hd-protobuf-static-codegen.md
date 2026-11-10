# HD protobuf 静态代码生成落地

## 实现结论

内置协议使用当前 protobufjs 的同一套算法，在构建前生成普通 JavaScript 函数。保留
`encode.ts` / `decode.ts` 及 Core 的手写兼容处理，不切换 Buf，也不经 protoc 往返。
protobuf 字节会参与签名流程，因此验收首先比较字节和完整输出对象，不能只检查调用成功。

本次范围是 Classic/Mini/Touch/Pro 的 V1、Pro2 的 V2，以及共用的编解码路径。
使用合成数据，不连接设备。插件接入目标为 extension offscreen 中的 Core/transport；
background 继续通过代理调用 offscreen，二者的 JS 对象不共享。

## 修改位置

- `packages/hd-transport/scripts/protobuf-static.js`：从当前 V1、legacy V1、V2 和旧版
  ProtocolInfo schema 提取 ctor、encode、decode、verify、fromObject、toObject。
  相同函数实现去重，共 832 组。生成文件禁止手改。
- `packages/hd-transport/src/serialization/protobuf/generated/codecs.js`：生成产物，约
  3.65 MB / 108,000 行；这是生成代码量，不是手写兼容代码量。
- `serialization/protobuf/messages.ts`：保留 Root/Type/Enum 反射对象及 lookup API，
  对完整匹配的内置 schema 安装静态函数，并显式配置 Long，避免 CSP 下可选依赖发现失败。
- `protocols/index.ts`：旧版 ProtocolInfo 恢复路径也使用静态函数。
- `packages/hd-common-connect-sdk/src/index.ts`：增加命名导出 `HardwareSDKLowLevel`，
  直接初始化本地 Core，复用现有 transport 选择、call、cancel、uiResponse、dispose。
  全局事件格式与 Web LowLevel 入口一致；提供实际 transport 切换。

HWK 的兼容处理是行为差异确实存在的证据，不是完整差异清单。本实现没有引入 HWK 依赖。
HD 原有枚举、空 bytes、Long 转换及电量尾字节修复逻辑都保留在原位置。

## 已覆盖的差分

旧基线为 `protobuf.Root.fromJSON(schema)` 生成的原算法，候选为生产 `parseConfigure`。
测试预先生成基线后禁用 Type.setup / 动态构造，候选必须使用静态函数。

| 项目          | 覆盖                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| 消息          | V1 618、legacy V1 486、V2 604，共 1,708 条                                  |
| 输入          | 53,389 组：缺失、undefined、null、默认值、正常值、错误标量类型和边界值      |
| 解码          | 75,891 次：同时包含未知字段、未知枚举、混合枚举、截断、重复子消息和字节变异 |
| 帧            | 1,240 条带消息编号的消息，比对 V1 envelope/chunks；V2 同时比对 frame        |
| Features 全链 | 9,212 组，含手写 patch、固件版本修复、状态映射、缓存及最终投影              |
| 历史 bug      | 额外比对 Long 常量被前序调用影响的连续操作                                  |
| CSP           | Node 禁止字符串代码生成及独立 browser IIFE VM 各 8,540 次操作               |

差分使用严格对象比较，区分属性不存在和自有 undefined、null、数组、number/string；
异常比较成功/失败、名称和消息，不比较堆栈行号。包括 `signatures: ['', '', '']`，
单 enum 名称、重复 enum 数字、未知 enum 解出的自有 undefined。

运行差分后，逐消息结果保存在 Git 忽略目录：
`node_modules/.cache/protobuf-static/{v1,legacy-v1,v2}.json`。
报告仅含消息名称、计数和比较结果，不保存输入或 wire bytes。

## 重现命令

```sh
# 使用仓库已有 JSON，不修改固件子模块及协议定义。
yarn update-protobuf:static
yarn --cwd packages/hd-transport check:static

# 必须按依赖顺序构建；全新工作区单包 build 可能缺少下游需要的 dist。
yarn build

yarn --cwd packages/hd-transport test --runInBand static-protobuf.test.js --coverage=false
yarn --cwd packages/hd-transport test:static-csp
yarn agent:check --profile commit
```

正常 `yarn update-protobuf` 在生成协议 JSON 后也会更新静态函数；transport build 会检查
生成产物是否过期。protobufjs 升级同样要重新生成并重新跑差分。

## 插件接入

```ts
import { HardwareSDKLowLevel } from '@onekeyfe/hd-common-connect-sdk';

await HardwareSDKLowLevel.init({ env: 'webusb' });
```

此入口供受信任的本地宿主使用。App 侧后续在 `sdk-loader/index.ext-bg-v3.ts` 对接这个入口，
继续保持 background → offscreen 代理。现有 `hd-web-sdk` iframe 入口保留，其他 Web SDK
不需要重写。本仓库没有 App loader，尚未完成插件实机端到端验收，也没有移除 App iframe。

## 边界与代价

- 内置 schema 无需运行时生成函数，但仍保留 protobufjs 反射层以维持现有 API。
  自定义 schema 保留旧的动态行为，不承诺在禁止 eval 的环境中工作。
- 静态函数只用于完整匹配的 schema；修改字段或字段顺序后需要重新生成。
- 浏览器验证包约 5.65 MB，未压缩，包含 transport 和依赖。静态化增加包体积，
  本次没有以更换算法换取体积优化。
- 以上是可重跑的兼容性验收范围；未进行设备签名、固件安装或完整插件生命周期测试。
