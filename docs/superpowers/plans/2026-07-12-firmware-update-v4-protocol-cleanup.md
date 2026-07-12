# FirmwareUpdateV4 Protocol Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 Pro2 CRATE 升级目标，修复 Protocol V2 文件传输幂等性，保证 bundle-only 不触发整机升级，并补齐 Pro V1 passphrase schema。

**Architecture:** Pro2 固件和 SDK 共用一套连续的 firmware target 编号，资源文件脱离 firmware-management target，统一走 RESC bundle 直写。文件写入把重试边界从“单个 chunk”提升到“完整文件”，用 offset 0 覆盖写作为幂等恢复点。

**Tech Stack:** TypeScript、Jest、protobufjs、C/CMake、Protocol Buffers proto2。

---

### Task 1: 用测试锁定 SDK 新行为

**Files:**
- Modify: `packages/core/__tests__/protocol-v2.test.ts`
- Modify: `packages/hd-transport/__tests__/protocol-v2.test.js`

- [ ] **Step 1: 删除多个 CRATE target 的旧断言，增加 bundle-only 契约测试**

```ts
expect((method as any).prepareRemoteProtocolV2Binaries).not.toHaveBeenCalled();
expect((method as any).protocolV2StartFirmwareUpdate).not.toHaveBeenCalled();
```

- [ ] **Step 2: 增加文件级重传测试**

```ts
expect(writeOffsets).toEqual([0, 4000, 0, 4000, 8000]);
```

测试让第二个 chunk 第一次调用在设备可能已经写入后抛错，验证恢复后从 0 重传整文件。

- [ ] **Step 3: 运行测试确认失败**

Run: `yarn --cwd packages/core test protocol-v2.test.ts --runInBand`

Expected: FAIL，旧实现会重试 offset 4000，且 bundle-only 会进入远端固件准备流程。

### Task 2: 删除 SDK CRATE/resourceBinaries 路径

**Files:**
- Modify: `packages/core/src/api/FirmwareUpdateV4.ts`
- Modify: `packages/core/src/types/api/firmwareUpdate.ts`
- Modify: `packages/core/src/protocols/protocol-v2/firmware.ts`
- Modify: `packages/core/src/api/protocol-v2/helpers.ts`

- [ ] **Step 1: 删除公开参数和 CRATE target 映射**

```ts
export const ProtocolV2FirmwareTargetType = {
  FW_MGMT_TARGET_INVALID: 0,
  FW_MGMT_TARGET_ROMLOADER: 1,
  FW_MGMT_TARGET_BOOTLOADER: 2,
  FW_MGMT_TARGET_APPLICATION_P1: 3,
  FW_MGMT_TARGET_APPLICATION_P2: 4,
  FW_MGMT_TARGET_COPROCESSOR: 5,
  FW_MGMT_TARGET_SE01: 6,
  FW_MGMT_TARGET_SE02: 7,
  FW_MGMT_TARGET_SE03: 8,
  FW_MGMT_TARGET_SE04: 9,
} as const;
```

- [ ] **Step 2: 将 bundle 计入显式 payload**

```ts
return !!this.params.resourceBundleFiles?.length || !!this.params.bootloaderBinary || fwBinaryMap.length > 0;
```

- [ ] **Step 3: 简化 install item 构建**

只保留 bootloader、application、coprocessor、SE target；远端 component 遇到 CRATE/RESOURCE firmware target 时返回明确的 unsupported target 错误，资源应放入 `release.resourceBundles`。

- [ ] **Step 4: 运行 core 测试**

Run: `yarn --cwd packages/core test protocol-v2.test.ts --runInBand`

Expected: bundle-only 和 target 编号测试通过；文件级重传测试仍等待 Task 3。

### Task 3: 将写入重试提升到完整文件

**Files:**
- Modify: `packages/core/src/api/FirmwareUpdateV4.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 把 chunk 写入改成单次调用**

```ts
private async fileWrite(...) {
  return typedCall('FilesystemFileWrite', 'FilesystemFile', request);
}
```

- [ ] **Step 2: 增加文件传输外层有界重试**

```ts
for (let attempt = 1; attempt <= PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT; attempt += 1) {
  try {
    return await this.protocolV2WriteWholeFile(params);
  } catch (error) {
    if (attempt === PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT) throw error;
    await this.reconnectProtocolV2FileTransferDevice();
  }
}
```

- [ ] **Step 3: 验证每次 attempt 的 offset 从 0 开始**

Run: `yarn --cwd packages/core test protocol-v2.test.ts --runInBand`

Expected: PASS，失败序列后的写入 offset 首项为 0。

### Task 4: 从 firmware-pro2 删除 CRATE

**Files:**
- Modify: `submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_control.proto`
- Modify: `submodules/firmware-pro2/sys/firmware_management/firmware_management_internal.h`
- Modify: `submodules/firmware-pro2/sys/firmware_management/firmware_management_updater.c`
- Modify: `submodules/firmware-pro2/sys/firmware_management/firmware_management_updater.h`
- Modify: `submodules/firmware-pro2/sys/firmware_management/CMakeLists.txt`
- Delete: `submodules/firmware-pro2/sys/firmware_management/firmware_management_updater_crate.c`
- Modify: `submodules/firmware-pro2/sys/payload_package/payload_package_container.h`
- Modify: `submodules/firmware-pro2/utils/payload_package/format/constants.py`
- Modify: `submodules/firmware-pro2/executables/loaders/library/loader_fw_update.c`
- Modify: `submodules/firmware-pro2/executables/loaders/bootloader/bootloader_protocol.c`
- Modify: `submodules/firmware-pro2/executables/loaders/bootloader/tasks/task_bootloader_fg.c`
- Modify: `submodules/firmware-pro2/executables/tests/firmware_management_test_rtos/firmware_management_test.c`
- Modify: `submodules/firmware-pro2/executables/tests/firmware_management_test_rtos/generate_test_data.py`
- Modify: `submodules/firmware-pro2/utils/onekey_protocol_cli/web/routes/test_files.py`
- Modify: `submodules/firmware-pro2/utils/onekey_protocol_cli/web/routes/demo_files.py`
- Modify: `submodules/firmware-pro2/utils/onekey_protocol_cli/web/static/okproto.js`

- [ ] **Step 1: 删除 wire/internal enum 的 CRATE 并连续重编号**

```proto
FW_MGMT_TARGET_INVALID = 0;
FW_MGMT_TARGET_ROMLOADER = 1;
FW_MGMT_TARGET_BOOTLOADER = 2;
FW_MGMT_TARGET_APPLICATION_P1 = 3;
FW_MGMT_TARGET_APPLICATION_P2 = 4;
FW_MGMT_TARGET_COPROCESSOR = 5;
FW_MGMT_TARGET_SE01 = 6;
FW_MGMT_TARGET_SE02 = 7;
FW_MGMT_TARGET_SE03 = 8;
FW_MGMT_TARGET_SE04 = 9;
```

- [ ] **Step 2: 删除 updater、runner、UI 和测试数据中的 CRATE 分支**

删除 crate updater 源文件及 CMake 引用，并保证所有 switch 不再引用 `FW_MGMT_TARGET_CRATE`。

- [ ] **Step 3: 执行固件侧静态残留检查**

Run: `rg -n "FW_MGMT_TARGET_CRATE|PAYLOAD_PACKAGE_CONTAINER_TYPE_CRATE|updater_crate" submodules/firmware-pro2`

Expected: 无代码命中。

### Task 5: 更新 Pro V1 proto 与生成物

**Files:**
- Modify: `submodules/firmware/common/protob/messages-management.proto`
- Regenerate: `packages/hd-transport/messages.json`
- Regenerate: `packages/core/src/data/messages/messages.json`
- Regenerate: `packages/hd-transport/messages-protocol-v2.json`
- Regenerate: `packages/core/src/data/messages/messages-protocol-v2.json`
- Regenerate: `packages/hd-transport/src/types/messages.ts`

- [ ] **Step 1: 增加 V1 GetPassphraseState 字段**

```proto
message GetPassphraseState {
    optional string passphrase_state = 1;
    optional bool _only_main_pin = 2;
    optional bool allow_create_attach_pin = 3;
}
```

- [ ] **Step 2: 重新生成全部 schema/types**

Run: `yarn update-protobuf`

Expected: V1 schema/types 出现两个字段；V2 schema/types 不再出现 CRATE，target 编号为 0..9。

- [ ] **Step 3: 检查生成结果**

Run: `rg -n "_only_main_pin|allow_create_attach_pin|FW_MGMT_TARGET_CRATE" packages/hd-transport/messages.json packages/core/src/data/messages/messages.json packages/hd-transport/messages-protocol-v2.json packages/core/src/data/messages/messages-protocol-v2.json packages/hd-transport/src/types/messages.ts`

Expected: V1 字段存在，CRATE 无命中。

### Task 6: 完整验证

**Files:**
- Verify only

- [ ] **Step 1: 运行 SDK 测试**

Run: `yarn --cwd packages/core test protocol-v2.test.ts --runInBand`

Run: `yarn --cwd packages/hd-transport test protocol-v2.test.js --runInBand`

Expected: 全部 PASS。

- [ ] **Step 2: 运行静态检查**

Run: `yarn --cwd packages/core lint`

Expected: exit code 0。

- [ ] **Step 3: 运行 firmware-pro2 firmware-management/protobuf 编译检查**

Run: `cmake --build submodules/firmware-pro2/.build/dev_debug --target firmware_management_rtos_obj protocol_proto_generate -j2`

Expected: 两个 target 构建成功；若已有 build tree 的 toolchain 不可用，保留完整命令输出作为环境限制证据。

- [ ] **Step 4: 审查最终 diff**

Run: `git diff --check && git status --short`

Expected: 无 whitespace error，只有本任务变更和用户原有未提交文件。
