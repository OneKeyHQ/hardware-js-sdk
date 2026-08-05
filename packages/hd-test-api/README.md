# @onekeyfe/hd-test-api

测试与工厂能力的显式扩展包。它复用 `@onekeyfe/hd-common-connect-sdk` 和当前
`@onekeyfe/hd-core` 协议实现，不维护独立的 Transport、协议状态机或 iframe。

浏览器通过 WebUSB 初始化：

```ts
import HardwareTestSdk from '@onekeyfe/hd-test-api';

await HardwareTestSdk.init({ env: 'webusb' });
```

Pro2 工厂信息写入和工厂证书写入默认拒绝。只有受控工厂流程可以创建显式授权实例：

```ts
import { createTestHardwareSdk } from '@onekeyfe/hd-test-api';

const HardwareFactorySdk = createTestHardwareSdk({
  allowDestructiveOperations: true,
});
```

只读工厂信息、证书读取和挑战签名属于正式 attestation API，直接由生产 SDK 提供。
