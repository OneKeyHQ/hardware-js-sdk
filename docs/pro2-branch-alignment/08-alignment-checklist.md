# Pro2 功能对齐检查清单

## 1. Protocol 与固件

- [ ] firmware-pro2 proto 与两份生成的 `messages-protocol-v2.json` 内容一致。
- [ ] DeviceSettings、DeviceStatus、DeviceSession 字段编号和 required/optional 定义一致。
- [ ] 固件锁定错误稳定返回 `Failure_ProcessError + subcode=9`。
- [ ] invalid session 的错误码/文本能被 SDK 稳定识别。
- [ ] USB、BLE 在断开重连后 sequence 和 link generation 均重置。

## 2. Passphrase / Session / Attach PIN

- [ ] 主 PIN 解锁返回 `unlocked_attach_pin=false`。
- [ ] Attach PIN 解锁返回 `unlocked_attach_pin=true`，DeviceStatus 同步更新。
- [ ] 公开 `deviceSessionGet` 无业务参数并发送空请求。
- [ ] Core 内部钱包 session 的有效、无效和无缓存路径均通过。
- [ ] 预期 `passphraseState` 不匹配时清缓存并报错。
- [ ] `initSession=true` 不复用旧 session。
- [ ] V1 Pro 的 Attach-to-PIN 和旧设备地址回退路径没有被 V2 改动破坏。

## 3. DeviceSettings

- [ ] Get 返回所有固件已支持字段。
- [ ] Set 支持部分字段更新，不要求发送完整对象。
- [ ] Set 拒绝仅传 `passphrase_enable` / `airgap_mode`。
- [ ] PageShow 四个页面均可打开，`fieldName` / `field_name` 行为一致。
- [ ] 锁屏状态首次调用触发一次解锁并重试，第二次失败不循环。

## 4. 壁纸

- [ ] 604x1024 不透明 RGBA 编码为 RGB565。
- [ ] 含透明像素编码为 RGB565A8。
- [ ] 非法尺寸、数据长度、文件名和 chunkSize 被拒绝。
- [ ] BLE 与 WebUSB 分片上传均能按 `processed_byte` 续传。
- [ ] 上传后发送 `SetWallpaper(WallpaperTarget.Lock, path)` 并生效。
- [ ] 中断、同名覆盖、半成品文件的产品策略已确认。

## 5. 固件升级

- [ ] 手动二进制和远端 release 两种输入模式均通过。
- [ ] bootloader、P1、P2、coprocessor、SE1-4 target 映射与固件一致。
- [ ] ROMLOADER 明确失败，并向调用方提示使用专用流程。
- [ ] RESC bundle 版本/hash 相同可跳过，不同则重新同步。
- [ ] 进入 bootloader、安装断连、状态轮询、回 normal mode 全链路通过 USB/BLE。
- [ ] `forceTargets` 只强制指定目标。
- [ ] V4 最终返回版本与 `getDeviceInfo` 读取结果一致。

## 6. API 与兼容

- [ ] 所有 `getPassphraseState` 调用方都按 `string | undefined` 消费。
- [ ] `file*` 与 `filesystem*` 双命名在 core、web、BLE、common-connect 包均导出。
- [ ] V2-only 方法在 V1 设备上返回一致的不支持错误。
- [ ] 旧 `deviceSettings`、`firmwareUpdateV3` 和 V1 passphrase 流程回归通过。
- [ ] TypeScript 声明、CoreApi、inject 和具体实现的方法名完全一致。

## 7. 建议测试命令

根据当前仓库脚本，至少运行 core 与 transport 的相关测试，并重点覆盖：

- `packages/core/__tests__/protocol-v2.test.ts`
- `packages/core/__tests__/DeviceCommands.test.ts`
- `packages/core/__tests__/RequestQueue.test.ts`
- `packages/core/__tests__/pro2Wallpaper.test.ts`
- `packages/core/__tests__/protocol-v2-firmware-targets.test.ts`
- `packages/hd-transport/__tests__/protocol-v2.test.js`
- 各 USB/BLE Protocol V2 link 测试

## 8. 合并前文档复核

- [ ] 用最终 merge-base 重新生成核心文件清单。
- [ ] 将工作区未提交变更纳入最终 commit 后重新核对返回值和类型。
- [ ] 更新发布说明，单独突出 `getPassphraseState` 破坏性变更。
- [ ] 固件版本、SDK alpha 版本和远端 release 配置按同一批次发布。
