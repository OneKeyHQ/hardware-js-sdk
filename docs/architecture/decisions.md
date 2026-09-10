# SDK Key Architecture Decisions

This document records architecture decisions that still constrain the current implementation. It is not an archive of the design process; obsolete discussions are preserved in Git history and PRs.

## HWK Interaction 生命周期

HWK 对外只保留一组设备选择生命周期：`searchDeviceTargets()` 发现候选，
`connectDevice(searchTargetId)` 连接或建立逻辑关联并返回不透明的 `interactionId`，业务方法可在公共参数中携带
该 ID，最后由 `releaseInteraction(interactionId)` 释放。`openWallet()`/`WalletContext` 不再属于 HWK 公共契约。

采用以下规则：

- `DeviceSearchTarget` 只表示当前发现轮次中可选择的通讯入口；它的 `searchTargetId` 是不透明搜索句柄，
  不证明物理设备或钱包身份。Ledger USB 的
  search target 可以是临时句柄；Keystone QR 的 search target 可以是需要扫码才能解析的交互入口。
- `interactionId` 只存在于当前 Adapter 运行时，绑定已选 search target、实际 connect/session key 和连接通道。
  它不是 `connectId`、钱包身份或固件 session，不得写入 App 数据库，也不得跨 Adapter reset 或进程重启恢复。
  同一次活跃业务中的受控重连可以更新它的底层 session 绑定，但不能改变已选设备或钱包身份。
- 再次对同一 search target 调用 `connectDevice()` 表示开始新的业务生命周期。若连接实现需要替换现有 session，
  旧 session 对应的 Interaction 必须先终止，旧 ID 不能借用新 session 继续执行。
- 携带 `interactionId` 的业务调用是严格路由路径：只复用其已连接 session/逻辑 QR 关联和既定通道；不得
  使用 ambient session、改选未经验证的设备或切换通道。关联无法恢复后返回 `InteractionEnded`；从未属于
  本 Adapter 实例的 ID 返回 `InteractionNotFound`。
- Ledger 保留原有的有界 session 恢复：`DeviceLocked` 在原 session 等待解锁，`0x6901` 在原 session
  延迟重试一次；disconnect、not-advertising 和 timeout 可重新搜索原目标。BLE 必须匹配原 connectId；USB
  临时 search target 变化时，只有业务调用携带钱包 fingerprint 才可连接唯一候选，并必须在重发业务 APDU 前验证
  fingerprint。验证成功后更新该 interaction 的 connect/session 绑定，验证失败则终止 interaction。
- 不携带 `interactionId` 的调用是 operation-first 路径。Adapter 可在真正执行业务前发现候选；单个可验证
  候选可继续，多个候选必须等待宿主通过 `REQUEST_SELECT_DEVICE` 返回本轮的 `sdkConnectId`。选择只是路由
  决策，业务仍须按厂商能力验证物理设备或钱包身份。
- 空闲超时、运行时 reset，以及连接恢复失败会终止对应 Interaction，并发出 `interaction-ended` 通知；活跃
  device job 持有 Interaction 时暂停空闲计时。活跃 Ledger job 的瞬时 disconnect 先交给上述恢复链，只有
  恢复耗尽或身份不符才终止。`cancel()` 只中止当前 job，不隐式结束 Interaction，生命周期 owner 仍须调用
  `releaseInteraction()`。
- `releaseInteraction()` 是显式释放；底层不可恢复的 disconnect 是同一状态转换的被动来源。恢复链重发业务
  方法前必须重新完成该厂商可提供的设备或钱包身份验证；禁止在缺少身份依据时把 USB 临时候选当作原设备。
- Core method catalog 明确区分可重放的只读方法与不可重放的签名、设备修改及未知方法。不可重放方法一旦
  已进入 connector，丢失响应时不得自动重发；错误必须携带 `operationMayHaveCompleted` 和方法名，交由宿主
  提示用户核对状态。`PayloadTooLarge` 等明确发生在发送前的错误不属于未知结果。
- Adapter reset/dispose 是 teardown barrier：先终止 runtime interaction、取消 UI/job 等待，再等待已经进入
  connector 的原始调用退出，最后断开捕获的 session 并 reset connector。新 Adapter 不得与旧实例遗留调用并行。
- Keystone USB 的 UI selection snapshot 与 operation-first availability snapshot 分代隔离。selection token 只可
  exact-open 对应 descriptor；冷启动只有持久 wallet identity 时可逐个 exact-open 候选并读取固定身份 xpub，
  full wallet id 匹配后才可执行业务。过期 token 返回 `search-target` recovery，不得退化为默认第一台。
- Trezor Core 的 `onPairingCredentialsChanged` payload 是完整权威列表。Connector 必须原地替换其内存列表，
  不能做增量 merge；否则设备拒绝的 stale credential 会在当前 Adapter 生命周期内被再次优先选择。

厂商差异保留在 Adapter 内：OneKey/Trezor 的宿主可以明确选择 USB/BLE；Ledger 与 Keystone 可以由其 SDK
管理协议/通道选择；Keystone QR 的 connect 是逻辑钱包关联而不是持续物理连接。无论哪种实现，
Interaction 的严格复用与终止语义一致。

主要实现：

- `packages/hwk-adapter-core/src/utils/InteractionRegistry.ts`
- `packages/hwk-adapter-core/src/types/wallet.ts`
- `packages/hwk-ledger-adapter/src/adapter/LedgerAdapter.ts`
- `packages/hwk-trezor-adapter/src/adapter/TrezorAdapter.ts`
- `packages/hwk-keystone-adapter/src/adapter/KeystoneAdapter.ts`

## Protocol V2 Link and Sequence Number Lifecycle

Protocol V2 responses rely on serial calls, message types, and frame sequence numbers to maintain request boundaries. The current rules are:

- Each Transport instance holds one `ProtocolV2LinkManager` and isolates Links by device key.
- Calls for the same device execute serially. The Link reuses the Session, frame assembler, and platform adapter.
- `ProtocolV2SequenceCursor` keeps incrementing across ordinary disconnects, reconnects, and Link failures, and is cleared only when Transport `dispose`s.
- Firmware business-response sequences are a global send sequence across channel/source. A single Transport can only reject consecutive
  duplicate response sequence numbers; it cannot require adjacent visible responses to be strictly consecutive. Other routes can create legitimate gaps.
- Timeouts, disconnects, I/O, generation, and frame errors are link-fatal. Business responses such as protobuf `Failure` are not automatically treated as link-fatal.
- After a Link failure, gaps in the SDK send sequence are allowed, but old sequence numbers must not be rolled back or reused.

Primary implementation:

- `packages/hd-transport/src/protocols/v2/link-manager.ts`
- `packages/hd-transport/src/protocols/v2/session.ts`
- `packages/hd-transport/src/protocols/v2/sequence-cursor.ts`

## Ownership of User Cancel

Only SDK Core decides whether to send a protocol `Cancel`. The App may call `sdk.cancel()` at any time when closing UI, but must not decide on its own—based on device model, pairing stage, or permission dialogs—whether to send `Cancel` this time.

Current rules:

- For unacquired connections, pairing, probe, or initialize: abort the local call and disconnect the physical link only. Do not send a protocol `Cancel`, and do not acquire just to send `Cancel`.
- Send `Cancel` to the device only when already acquired and a PIN / passphrase / Button `cancelableAction` exists, or when Protocol V2 has opened user interaction (PIN on V1 OneKey devices still uses the existing `Initialize` cancel path).
- After a user cancel, the same round of acquire / initialize / BLE retry must fail immediately. Do not treat `BleConnectedError` as a retryable error and keep connecting.
- Whether to close the page or continue installation during firmware update belongs to the App navigation lifecycle, not the protocol Cancel policy.

Primary implementation:

- `packages/core/src/device/Device.ts` `interruptionFromUser()`
- `packages/core/src/device/DeviceCommands.ts` `cancelDeviceInPrompt()`
- `packages/core/src/core/index.ts` `cancel()` / `connectDeviceForBle()`

## Public Protocol Layer and Transport Boundary

To keep USB and BLE call and recovery semantics consistent, responsibilities of the public protocol layer and platform Transport are strictly separated:

- The public layer owns protobuf encode/decode, frame assembly, call serialization, timeouts, sequence numbers, and Link lifecycle.
- The Transport adapter only owns platform connections, native read/write, notification/endpoint management, and platform error mapping.
- The shared `ProtocolV2BleFrameWriter` owns the full Protocol V2 BLE frame fragmentation loop, call cancellation, and generation boundaries. Electron, React Native, and lowlevel adapters only provide their own
  per-packet capacity, throttling parameters, and native writes. Existing Protocol V1 BLE fragmentation does not reuse this path.
- Node USB and WebUSB reuse `ProtocolV2UsbTransportBase`.
- USB rotates generation after open, claim, reset, or reconnect. Async reads and writes of the old generation must fail.
- Transport does not automatically resend Protocol V2 business commands. Retries of side-effecting operations are decided by Core flows that understand idempotency.

Protocol selection state must distinguish four meanings:

- `expectedProtocol` comes from the caller's explicit `connectProtocol`. It is a strict constraint; a mismatch during active probing fails immediately.
- `protocolHint` comes only from unconfirmed Transport-internal cache. It only decides the first probe order; protocol switching is allowed after failure.
- `detectedProtocol` comes only from the current active connection response. It is the sole basis for initialization branching, method capability checks, and public output.
- A confirmed `detectedProtocol` becomes the strict expectation for subsequent connections. A protocol restored by the App is bound by connectId via
  `setDeviceConnectProtocol()` and injected into all subsequent calls. Only an explicit
  `forceProtocolDetection` can send a single call back to active probing.

Protocol version and device model are independent of each other. Protocol V2 device model is read from `DeviceInfo.hw.Device_type`. V2 must not be used to infer
Pro2, and Pro/Pro2 model must not be used to infer protocol. This way, later Pro migration to Protocol V2 does not require changing the business capability model.

Primary implementation:

- `packages/hd-transport/src/protocols/v2/usb-transport-base.ts`
- `packages/hd-transport/src/protocols/v2/frame-assembler.ts`
- `packages/hd-transport/src/protocols/v2/link-manager.ts`

## Cross-Runtime Parameter Boundary for Resource Upload

TopLevel and LowLevel SDKs may cross host bridges that only support JSON
semantics, such as Extension background/offscreen and the React Native bridge. The public business API does not provide a recursive binary codec. Resources that truly need to cross runtimes use an explicit, verifiable
string contract:

- Portfolio packages, Pro2 wallpaper JPEGs, NFT original JPEGs, and thumbnail JPEGs use standard
  Base64 without a data URL prefix. LowLevel Core performs strict decode, size, and format validation before device I/O.
- Base64 is used only at the public runtime boundary. Internally, LowLevel still uses `Uint8Array` for device format conversion, protobuf encoding, and
  file chunking, and does not repeatedly encode/decode between internal calls.
- Protocol V1 resource APIs for older Pro/Touch continue to use the existing hex contract and are not changed by Protocol V2 resource APIs.
- Firmware updates download or read artifacts in the runtime where LowLevel lives. Extension background does not pass native binaries into
  offscreen. Direct binaries on Desktop Bridge also skip global Base64 wrapping.
- Illegal, non-canonical, or oversized Base64, as well as invalid JPEGs and incorrect image dimensions, must return
  `CallMethodInvalidParameter` before device I/O.

Primary implementation:

- `packages/core/src/api/helpers/base64Data.ts`
- `packages/core/src/api/UploadPortfolio.ts`
- `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- `packages/core/src/api/protocol-v2/DeviceUploadNft.ts`

## Wallet Session Ownership and Cache Keys

Transport connections, frame sequence numbers, device-side `session_id`, and wallet identity are four different kinds of state and must not share a cache:

- For both V1 and V2, `openWalletSession()` returns only the public wallet identity
  `deviceId + passphraseState` for standard and hidden wallets. Firmware `session_id` enters the Core-internal Store only and is not passed through in public responses.
- Existing Apps may continue to call `getPassphraseState()`: V1 keeps the original firmware message flow; V2 has Core map
  `useEmptyPassphrase/initSession` intent onto the new Ask/Get Session flow. This does not mean Pro2
  restored firmware messages of the same name.
- Complete triples already stored in the OS Keychain by the old CLI can still be restored via `preloadSessionCache()`,
  but the new public wallet-selection response no longer provides the raw `sessionId` and no longer creates a new cross-process Session cache.
- V1 and V2 share `DeviceWalletSessionStore`, with the primary mapping key `deviceKey + passphraseState`. Protocol V2
  additionally stores an internal index keyed by `deviceKey` that points to the real standard wallet `{ passphraseState, sessionId }`. That index
  only serves explicit `standard/useEmptyPassphrase` intent; it is not a forged wallet identity and must not be used for hidden-wallet lookups.
- `DeviceWalletSessionStore` is the only wallet Session cache source in Core that may be used for restore.
  `DeviceState` and protocol raw snapshots are not Session caches.
- When restoring a hidden wallet, without `passphraseState` the cache of other wallets must not be scanned or reused. Standard wallets are read from
  the dedicated index via explicit standard-wallet intent, so the App does not need to pass back the standard wallet `passphraseState`.
- When a Protocol V1 request carries `deviceId`, Core must first send `Initialize` without `session_id/passphrase_state`
  to confirm the live `deviceId`. Only after identity matches may it read and pass through the corresponding wallet Session.
  Any business method that receives `deviceId` must also perform the same live identity check before the business command.
- The explicit `mode` of `openWalletSession()` is the sole flow intent. Once `mode` is passed, `useEmptyPassphrase` or `initSession` must not be mixed in. `standard/select-hidden` must also not carry a wallet binding.
- `openWalletSession()` must take an explicit `mode`. Legacy parameter compatibility stays only at the original
  `getPassphraseState()` entry, so the new API does not have two ways to express intent.
- `resume-hidden` accepts only `deviceId + passphraseState`; Core looks up `sessionId` from the Store. For V2, the local cache
  is only a non-authoritative restore hint. When the V2 local cache is missing, the handle is invalid, or the actual wallet returned by firmware does not match, Core
  allows one explicit wallet reselection and returns `DeviceCheckPassphraseStateError` only if it still does not match. V1 still returns `WalletSessionInvalid` when the cache is missing.
- Session capacity and eviction are managed by Pro2 firmware. The Core Store does not implement LRU or mirror hardware capacity; it only updates the corresponding mapping when a new handle is obtained,
  firmware rejects an old handle, or wallet identity verification fails.
- V2 first negotiates no intermediate firmware Events via `ProtocolInfoRequest { eventless_wallet_session: true }`.
  `DeviceSessionAskPin` and `DeviceSessionAskPassphrase` return only `Success`. Core then reads the current Session with an empty-parameter
  `DeviceSessionGet`. Restore uses `DeviceSessionGet` with `session_id + btc_test_address`
  so firmware verifies the target wallet before reusing the handle.
- Before Protocol V2 actually sends `DeviceSessionAskPin` each time, Core must synthesize a non-blocking
  `UI_REQUEST.REQUEST_PIN` to the App: `Main` maps to `ButtonRequest_PinEntry`, `AttachToPin` maps to
  `ButtonRequest_AttachPin`. The App only shows an on-device operation prompt and does not return a PIN. Paths where an existing method-interaction coordinator already emits a prompt
  must suppress duplicate lower-level Events. `protocolV2UiMode='none'` only suppresses ordinary method-interaction prompts
  and must not suppress an on-device PIN prompt that has already been triggered.
- Both `session_id` and `btc_test_address` on `DeviceSessionGet` are optional: `session_id` means attempting to restore the target
  Session; `btc_test_address` means the expected wallet identity. When both are omitted, the current Session is read. Get does not carry
  `seed_domains`. Derivation happens in `DeviceSessionAskPassphrase`. Every call must return the complete
  `DeviceSession` that firmware actually ended up with. Ordinary state mismatch does not return `InvalidSession`.
- Pro2 `DeviceSessionAskPassphrase` must explicitly carry the input source: host input sends
  `{ on_device: false, passphrase, seed_domains }`; device input sends `{ on_device: true, seed_domains }`.
  `seed_domains` is sent as `[Standard]` for opening a wallet and non-Cardano calls, and as
  `[Standard, Cardano]` for Cardano calls. An empty list must not be sent. When Attach PIN is supplemented with Cardano, send an empty host
  passphrase: `AskPassphrase({ passphrase: '', on_device: false, seed_domains: [Standard, Cardano] })`,
  without showing passphrase UI. Firmware clears the attach-pin flag; the SDK still treats the current session as Attach PIN.
  `on_device` must not be omitted, and a device-input flag and a host passphrase must not be sent together. Attach-to-PIN unlock still uses
  `DeviceSessionAskPin(AttachToPin)`.
- The PIN type of `DeviceSessionAskPin` is determined by the target wallet intent, not by the current context before the call:
  `Main` is used to select a standard wallet, and also to switch back to the standard wallet from an Attach-to-PIN hidden-wallet context.
  `AttachToPin` is used only to select the hidden wallet bound to that Attach PIN. `unlockedAttachPin=true` is current-context state
  and does not mean subsequent requests should keep using `AttachToPin`.
- The Pro2 wallet Session coordinator must not catch `DeviceLocked` and then implicitly unlock or replay protocol requests. Business methods that need to select or restore
  a hidden wallet must first refresh `DeviceStatus`. When the status is clearly locked, run
  `DeviceSessionAskPin(Main)` first; otherwise call the wallet Session protocol directly. A structured
  `DeviceLocked` returned during the call must be thrown upward as-is, to avoid repeating side-effecting requests. The Attach-to-PIN branch still only runs
  `DeviceSessionAskPin(AttachToPin)`.
- Empty-parameter `DeviceSessionGet()` only reads the firmware's current wallet Session; it is not a standard-wallet selection command. The first open of a standard wallet
  runs `AskPin(Main) -> AskPassphrase('', seed_domains) -> Get()`. When a cached restore result does not match, the same flow is run once to rebuild.
  When a hidden-wallet cached restore result does not match, one unified wallet selection is run, then Ask and `Get()`. Restore must not delete other wallet Sessions on the same device.
- A successful V2 `DeviceSessionGet` response must contain both a non-empty `session_id` and
  `btc_test_address`. Missing either field is an incomplete protocol response and must not be degraded to a standard wallet.
- When the first returned wallet identity does not match the caller's expectation, the corresponding one-shot restore must run. If it still does not match after restore, clear the current
  wallet cache and throw a security error. Looping retries are not allowed.
- On a Pro2 wallet identity mismatch, Core must refresh `DeviceStatus` to determine the actual unlock source. If
  `unlocked_by_attach_to_pin=true`, Attach PIN opened a non-target hidden wallet. Core must follow the Pro V1
  fail-closed policy, attempt `LockDevice`, clear the current wallet Session, and return
  `DeviceCheckUnlockTypeError`. It must not continue reselection or subsequent business. Ordinary non-Attach Session mismatch still allows
  one unified wallet reselection. Even if older firmware does not support lock, the cache must still be cleared and the call terminated.
- After Pro2 refreshes status in the unlock flow, standard vs hidden wallet is decided from the refreshed `passphraseProtection`.
  A pre-unlock status snapshot must not be used to route wallet results.
- `session_id` is not wallet identity. It must be bound to the `deviceId + passphraseState` returned in the same response.
- `session_id` does not appear in public `DeviceState`, at the top level of device messages, or in the `openWalletSession()` response.
  The public projection of legacy `Features.sessionId` stays empty; only Core-internal cache may use the real value.
- Public `clearSessionCache()` accepts only three scopes: no arguments, `deviceId` only, or the full
  `deviceId + passphraseState`. Passing `passphraseState` alone returns a parameter error, to avoid accidentally clearing
  all devices. This API only clears `DeviceWalletSessionStore`. It does not send Protocol V1/V2 commands
  and does not mean the device-side Session is closed.
- After a device wipe, Core clears the old `deviceId`, corresponding wallet Sessions,
  Protocol V2 temporary descriptor Sessions, device state, and pre-initialization metadata only after firmware explicitly returns success. The next call must re-read
  live identity. The new `deviceId` produced after wipe is a new wallet lifecycle. Callers must not overwrite old wallet bindings
  and must not bypass the existing `deviceId` mismatch check.

Primary implementation:

- `packages/core/src/device/DeviceWalletSessionStore.ts`
- `packages/core/src/protocols/protocol-v2/walletSession.ts`
- `packages/core/src/device/Device.ts`

## Pre-call Unlock for Protected Methods

Automatic unlock produces user interaction, and replaying business work can also re-execute side-effecting requests, so Core only allows pre-call unlock:

- Methods that need a wallet Session—addresses, signing, encryption/decryption, and the like—use `useDevicePassphraseState=true` as the single source of truth
  and do not maintain a method-name allowlist. New wallet business inherits this value by default, so it must pass the pre-call unlock gate first.
- `UnlockPolicy` has only `none` and `unlock-before-run`. Management methods that do not use a wallet Session but still require the device to be unlocked
  use `unlock-before-run` explicitly. Status, connection, loader, and public resource methods explicitly disable wallet
  Session handling and keep `none`.
- Pre-call unlock applies only to Pro2 / Protocol V2. In normal/application mode, the unified method entry first reads
  a fresh `DeviceStatus`. When a target `deviceId` is present, that status must first confirm device identity, then call
  `device.unlockDevice()` as needed. Only then does it enter Wallet Session, Safety Check, and business I/O, and it uses the
  post-unlock Status returned by the unlock flow to confirm the device is unlocked.
- Bootloader and Romloader do not support `DeviceStatusGet`. Status query and unlock must be skipped, going directly into the existing
  loader flow.
- The all-network root, bundle, and inner chain methods share a lightweight preflight context, so each logical operation
  runs Status/Unlock only once. Each sub-chain still independently restores and verifies Wallet Session according to firmware semantics.
- Pro2 settings are classified by firmware lock boundaries: language, brightness, animation, tap-to-wake, haptic feedback, and device-name display
  do not need unlock; auto-lock, auto-shutdown, Bluetooth, FIDO, USB Lock, randomized keyboard, and device-name change require unlock first;
  Change PIN, Passphrase, Air-gap, and Wipe unlock first then open the on-device confirmation page. Unknown new settings require unlock by default.
  Wallpaper and NFT file uploads (`deviceUploadWallpaper`, `deviceUploadNft`) write the filesystem and explicitly use
  `unlock-before-run`.
- The business callback runs only once. A structured `HardwareErrorCode.DeviceLocked` returned in the business phase fails immediately—
  no catch, no unlock, no replay. If unlock is canceled, fails, or post-unlock Status is still locked, the business send count is zero.
- Protocol V1, and methods that satisfy both `useDevicePassphraseState=false` and `unlockPolicy='none'`,
  do not enter the pre-call unlock flow.

Primary implementation:

- `packages/core/src/api/BaseMethod.ts`
- `packages/core/src/protocols/protocol-v2/unlockPolicyRunner.ts`
- `packages/core/src/device/DeviceCommands.ts`

## Method Protocol Capability and Firmware Version Boundaries

After the device has completed acquire/initialize and the protocol type has been confirmed by a real device response, Core must first check the method's protocol
capability, then the firmware version range for the corresponding model, and only then enter the method implementation and `typedCall()`:

- `BaseMethod.getSupportedProtocols()` returns only Protocol V1 by default. Adding Protocol V2 support must explicitly
  return `['V1', 'V2']`. Protocol V2-only methods return only `['V2']`.
- Protocol mismatch uniformly returns `DeviceNotSupportMethod`. Messages must not be sent to the device first and then rely on
  `UnknownMessage/UnexpectedMessage` to judge capability.
- `DeviceFirmwareRange` only expresses `min/max` firmware versions when the method is already supported. It does not express protocol unsupported. Encoding capability with
  `0.0.0`, fictional versions, or boolean sentinels is forbidden.
- Shared public-chain version ranges for Pro2 and Neo use `model_pro2`. Resolution first reads the precise `pro2` / `neo` range,
  then falls back to the product model. That model must not be used to infer hardware capabilities such as camera, NFC, fingerprint, or Find My.
- When parameters change protocol capability, the method overrides `getSupportedProtocols()` for dynamic judgment. For example, the BTC Neurai fork
  currently allows only Protocol V1, and its firmware version range is still maintained separately.
- The Core main call pipeline and all-network inner method dispatch reuse the same `BaseMethod` protocol assertion. Transport does not maintain
  an SDK public-method allowlist and does not own business capability judgment.

Primary implementation:

- `packages/core/src/api/BaseMethod.ts`
- `packages/core/src/core/index.ts`
- `packages/core/src/api/allnetwork/AllNetworkGetAddressBase.ts`

## Separation of Protocol V2 Runtime Stage and Message Capability

After Pro2 acquire, initialization, reconnect, and firmware-update reconnect all read `ProtocolInfo`:

- All Core `ProtocolInfoRequest`s always carry `eventless_wallet_session=true`. Firmware must keep repeated
  `true -> true` requests on the same source idempotent and must not clear the active wallet session. Empty requests and explicit `false`
  keep the old reset semantics.
- `ProtocolInfo` is the runtime context of the active Link. Core single-flights the first concurrent read and invalidates it after transport
  disconnect, reboot, or wipe. Ordinary status/settings/wallet calls reuse the cache and do not renegotiate.
- `build_fingerprint` is fixed as
  `<binary>__<version>__<commit>__<PROD|DEV>__<DEBUG|RELEASE>`. Core uses only the binary
  to identify application, bootloader, and romloader, mapping them to normal, bootloader, and romloader respectively.
- `supported_messages` is the live handler list for the current firmware stage, and the sole source for judging message capability.
  Capability must not be inferred from fingerprint version, commit, environment, build type, or `DeviceInfo` image structure.
- bootloader and romloader do not call `DeviceStatusGet`. application also calls it only when
  `supported_messages` contains the corresponding MessageType.
- `Device.isBootloader()` and `Device.isRomloader()` are mutually exclusive precise mode checks. Compatible
  `Features.bootloaderMode/bootloader_mode` still means a broad loader state and cannot distinguish the two loaders.
  New flows must read `DeviceState.status.mode` or the precise checks above.
- romloader semantics are currently strictly limited to Pro2/Neo + Protocol V2, and are jointly confirmed by
  `DeviceInfo.hw.Device_type=PRO2|NEO` and an active V2 response. The historical Pro Protocol V1
  boardloader is a different state; it must not be mapped to romloader and must not enter the Pro2 FirmwareUpdateV4 direct-upgrade flow.
- When the fingerprint cannot be parsed but `DeviceStatusGet` is explicitly declared supported, status may be read as a legacy-firmware compatibility path.
  When neither fingerprint nor capability can be confirmed, fail closed. Status commands must not be sent speculatively to an unknown stage.
- `DeviceInfo` owns hardware identity, image version, and verification info. `ProtocolInfo` owns runtime stage and message capability.
  `DeviceStatus` owns live wallet/lock status. All three are stored together in Core-internal raw state. Public
  `DeviceState` and events do not expose raw protocol responses.

Primary implementation:

- `packages/core/src/protocols/protocol-v2/features.ts`
- `packages/core/src/device/Device.ts`
- `packages/core/src/api/FirmwareUpdateV4.ts`

## Prepared Firmware Artifact Integrity Boundary

Prepared firmware update separates artifact acquisition from device execution. Integrity responsibility is divided as follows:

- The external firmware Host (for example the App's native/desktop artifact store) is responsible for obtaining expected size and
  SHA-256 from trusted release metadata, verifying the actually downloaded bytes, and generating a receipt before the first device mutation.
- `artifactRef` must reference an already-verified content-addressed object. The Host must keep the object immutable for the lease and reader lifetime, and must fail `open` when the object is missing or corrupted.
- The SDK is responsible for verifying metadata binding of Plan, PreparedPlan, and receipt, artifact size, read range, and EOF,
  but does not recompute the SHA-256 of artifact content at execution time. `FirmwareArtifactReceiptMismatch` means a binding or
  reader-contract mismatch, not that the SDK has independently authenticated the actual byte content.
- The guarantee that "integrity verification completed before the first device mutation" depends on the external Host honoring the contract above. On-device firmware signature verification is
  an independent defense and cannot replace Host integrity verification of resource artifacts.
- Protocol V2 resource archives must participate in the unified download as a Plan artifact with `role: resourceBundle`, `target: resource`, `container: zip`.
  Hosts with a persistent artifact store, such as the App, generate a `PreparedPlan`;
  the SDK reads in chunks via `ArtifactReader`. The device write path for the resource bundle comes from
  `flexible_metadata` in the signed OKPP header. Other entries in the ZIP do not participate in the update.
- When local development, CLI, and Web examples have no persistent artifact store, after download or file selection they pass component
  `ArrayBuffer`s and the full resource ZIP (`resourceArchiveBinary`) directly to `firmwareUpdateV4`. Core
  parses the ZIP, compares the RESC header, then writes packages that differ, without wrapping them into an in-memory PreparedPlan.
- SDK-internal network download must not be restored. Local files must not overwrite a remote Plan receipt to bypass remote verification.

Primary implementation:

- `packages/core/src/api/firmware/FirmwareUpdatePreparedPlan.ts`
- `packages/core/src/api/firmware/FirmwareArtifactSource.ts`
- `packages/core/src/api/FirmwareUpdateV4.ts`

## Maintenance Rules

- Only rules that continue to affect multiple modules and cannot be understood from local code alone belong in this document.
- When a decision changes, update the current rule in place and keep the evolution in Git history.
- Concrete frame formats, field mappings, and business flows are maintained separately in protocol, SDK, and business documents.
