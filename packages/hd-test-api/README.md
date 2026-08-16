# @onekeyfe/hd-test-api

An explicit extension package for OneKey factory and hardware-test workflows. Non-production
methods, their TypeScript declarations, and their private protobuf schema fragments live in this
package instead of the production `@onekeyfe/hd-core` API. Factory, debug, and automated-test
commands share one extension registry and one schema fragment per protocol.

The package contains the complete `test/api` method set, including Bitcoin ownership/CoinJoin,
Crypto, Trezor-compatible EVM, debug link, eMMC, firmware test, Tezos, Monero, EOS, Binance,
WebAuthn, resource, and Bixin flows. It also includes the Protocol V1/V2 factory APIs from
`factory/api`.

`deviceReadSEPublicCert` and `deviceSESignMessage` remain part of `@onekeyfe/hd-core` because the
production device-verification flow uses them directly.

```ts
import HardwareTestSdk from '@onekeyfe/hd-test-api';

await HardwareTestSdk.init({ env: 'webusb' });
const info = await HardwareTestSdk.deviceReadFactoryInfo('connect-id', {
  connectProtocol: 'V2',
});
```

Provisioning and certificate/key writes are denied by default. A controlled factory process must
authorize them when creating its SDK instance:

```ts
import { createTestHardwareSdk } from '@onekeyfe/hd-test-api';

const FactorySdk = createTestHardwareSdk({
  allowDestructiveOperations: true,
});
```

The same authorization gate protects test methods that write flash/eMMC, erase or upload firmware,
load device secrets, mutate WebAuthn credentials, or update resources. Read-only test methods work
without enabling that flag.

Only create one Common SDK instance per JavaScript runtime. The underlying Core and transport
lifecycle are process-global. Keep all `@onekeyfe/hd-*` package versions aligned when publishing.
