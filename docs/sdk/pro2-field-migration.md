# Pro2 Protocol V2 Field Migration and Responsibility Split

## 1. Document Purpose

This document fully explains how OneKey Pro 2 reorganizes device fields in Protocol V2, and how Hardware JS SDK Core reads, transforms, and exposes those fields.

This change is not a simple rename of old fields. It splits content that used to live in a single initialization result into multiple message groups by actual use:

1. Device basic information: relatively stable data such as model, serial number, main firmware, Bluetooth chip, and secure element.
2. Device realtime status: whether the device is initialized, unlocked, needs backup, and Passphrase / Attach-to-PIN state.
3. User settings: configurable content such as language, device name, Bluetooth switch, brightness, lock-screen timeout, and haptic feedback.
4. Wallet session: which wallet is currently open, whether the wallet session can be resumed, and PIN unlock results.
5. Device operations and firmware management: reboot, device certificates, firmware install targets, and install status.
6. Manufacturing information: production-stage data such as manufacture time, factory tests, burn-in tests, and factory serial number.
7. SDK field conversion: the SDK converts Protocol V1/V2 responses into a unified `DeviceState`; protocol-native structures stay inside Core only.

This document can be read on its own. It is the single source of truth in the repository for Pro2 field migration and SDK normalization, and can also be synced directly to Confluence.

## 2. One-Sentence Conclusion

Pro 2 no longer uses one ever-growing device-info object to carry all data. It provides messages separately for “basic information, realtime status, user settings, wallet session, device operations, and manufacturing.” The SDK aggregates protocol differences internally and, externally, only exposes a unified `DeviceState` read/refresh interface plus the corresponding business-operation APIs.

## 3. Why Split

Protocol V1 often returned a large amount of information in one `Initialize -> Features` round trip. That was convenient, but as device capabilities grew, several problems appeared:

- Device model and firmware version rarely change, while unlock state and backup state change frequently. They should not share the same refresh cycle.
- Label, language, and brightness are user settings, not device identity.
- A wallet session represents the current wallet context, not the physical device itself.
- Firmware install progress is the state of one task, not a long-lived device attribute.
- Factory tests and production records have different permission boundaries and should not appear in ordinary device details.
- Stuffing every new field into `Features` keeps raising compatibility cost among firmware, SDK, and App.

Protocol V2 therefore splits fields by purpose, change frequency, and security boundary.

## 4. Overall Structure After the Split

The old centralized device information can be understood as split into the following seven parts:

| Category | Protocol V2 Message | Main Content | Recommended Read Path |
| ------------------ | ------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| Device basic information | `DeviceInfoGet -> DeviceInfo` | Model, serial number, main MCU, Bluetooth chip, SE chips and versions | `getDeviceState({ scope: 'firmware' })` |
| Device realtime status | `DeviceStatusGet -> DeviceStatus` | Initialization, unlock, backup, Passphrase, Attach-to-PIN | `getDeviceState()` |
| User settings | `DeviceSettingsGet/Set/PageShow` | label, language, Bluetooth, brightness, lock screen, haptics, and more | `getDeviceState({ scope: 'settings' })` / high-level APIs |
| Wallet session resume | `DeviceSessionGet -> DeviceSession` | Resume an existing wallet session by `session_id` | Core-internal wallet session management |
| Wallet session create | `DeviceSessionAskPin/AskPassphrase -> DeviceSession` | Verify and atomically return a main-wallet or hidden-wallet session | Protected methods and wallet-selection flow |
| Device operations and firmware management | `DeviceReboot`, `DeviceCertificate*`, `DeviceFirmware*` | Reboot, certificates, firmware install | Dedicated APIs and the upgrade flow |
| Manufacturing information | `DeviceFactoryInfo*`, `DeviceFactoryTest`, and related | Manufacture time, factory tests, permanent lock | Manufacturing-only APIs |

Field flow can be simplified as:

```text
Protocol V2 protobuf
    ├── DeviceInfo ─────────────────> DeviceState identity / versions / verification
    ├── DeviceStatus ───────────────> DeviceState status
    ├── DeviceSettings ─────────────> DeviceState identity / settings
    ├── DeviceSession ──────────────> Core wallet session cache (does not enter public DeviceState)
    ├── DeviceFirmware ─────────────> firmware upgrade flow
    └── DeviceFactory ──────────────> manufacturing-only APIs
```

## 5. Device Basic Information

### 5.1 Message Structure

Device basic information is read through the following request:

```text
DeviceInfoGet -> DeviceInfo
```

The structure of `DeviceInfo` is:

```text
DeviceInfo
├── protocol_version       protocol version
├── hw                     hardware model, serial number, and hardware version
├── fw                     main MCU image information for each stage
├── coprocessor            Bluetooth / coprocessor information
├── se1, se2, se3, se4     secure-element information
```

`DeviceInfo` no longer owns realtime status reads. Historical `targets.status` will be removed from the protocol, and the SDK does not construct that field.

### 5.2 Hardware Information

| Protocol V2 Field | Meaning | Current SDK Handling |
| ----------------------------- | ------------------- | ---------------------------------------- |
| `hw.Device_type` | Device model | SDK identifies real models such as Pro 2 and Neo from the protocol enum |
| `hw.serial_no` | Device serial number | Converted to `DeviceState.identity.serialNo` |
| `hw.hardware_version` | Human-readable hardware version | Kept in raw Protocol V2 data |
| `hw.hardware_version_raw_adc` | Hardware-version ADC raw value | Kept in raw data |

Serial number and device ID are two different concepts:

- Serial number comes from `hw.serial_no`.
- Device ID comes from `DeviceStatus.device_id`.
- The SDK must not fall back from serial number to device ID.

### 5.3 Main Firmware Information

| Protocol V2 Field | Meaning | Current SDK Handling |
| --------------------- | ---------------------------- | ------------------------------------------- |
| `fw.romloader` | romloader image information | Mapped to the historical compatibility field `boardVersion` |
| `fw.bootloader` | bootloader image information | `bootloaderVersion` and bootloader verification information |
| `fw.application` | main application image information | `firmwareVersion` and firmware verification information |
| `fw.application_data` | P2 / application data image information | Currently kept in raw data; no independent Feature field yet |

Each image may include:

| Field | Purpose |
| ---------- | ------------------ |
| `version` | Version display and upgrade decisions |
| `build_id` | Identify a specific build |
| `hash` | Image integrity check |

Here, SDK `boardVersion` is a compatibility field left over from the historical boardloader name. It currently corresponds to `romloader.version`; it is not equivalent to `hw.hardware_version`. `application_data` is an independent P2 data package and must not be mapped to `boardVersion`.

### 5.4 Bluetooth and Coprocessor Information

| Protocol V2 Field | Meaning | Current SDK Handling |
| ------------------------- | ------------------- | ------------------------------------- |
| `coprocessor.bootloader` | Coprocessor bootloader | Kept in raw data |
| `coprocessor.application` | Coprocessor / Bluetooth application | Converted to `bleVersion` |
| `coprocessor.bt_adv_name` | Bluetooth advertising name | Converted to `DeviceState.identity.bleName` |
| `coprocessor.bt_mac` | Bluetooth MAC address | Kept in raw data |

Bluetooth advertising name and Bluetooth switch are two different fields:

- Advertising name comes from `DeviceInfo.coprocessor.bt_adv_name`.
- Whether Bluetooth is enabled comes from `DeviceSettings.bt_enable`.

### 5.5 Secure Element Information

Pro 2 provides up to four groups of secure-element information, `se1` through `se4`. Each group may include:

| Protocol V2 Field | Meaning | Current SDK Handling |
| ---------------- | ---------------------------------- | -------------------------------------------------------- |
| `application` | SE application version, build ID, and hash | Converted to `se01Version` through `se04Version` and verification fields |
| `bootloader` | SE bootloader version, build ID, and hash | Converted to `se01BootVersion` through `se04BootVersion` and verification fields |
| `type` | SE chip type | Kept in raw data; Core provides an enum-parsing helper |
| `state` | SE current runtime state | Kept in raw data; Core provides an enum-parsing helper |

### 5.6 Query Scope

`DeviceInfoGet` does not always return everything. The request is controlled by two parameter groups:

- `targets`: which static components to read, for example `hw`, `fw`, `coprocessor`, and `se1` through `se4`.
- `types`: whether image information should include `version`, `build_id`, `hash`, or component-specific information `specific`.

Typical scopes currently used by the SDK:

| Scenario | Content Read | Reason |
| ----------- | -------------------------------------------------- | -------------------------------------------- |
| Initialization | hw, fw, coprocessor; version, specific | Establish static information and, together with ProtocolInfo, identify the running stage |
| Lightweight refresh | hw, fw, coprocessor; version, specific | Refresh static information without implicitly reading status |
| versions | hw, fw, coprocessor, se1 through se4; version, specific | Display all component versions |
| verify/full | all targets; version, build_id, hash, specific | Full device verification |

## 6. Device Realtime Status

Runtime status is provided by a dedicated `DeviceStatusGet`:

```text
DeviceStatusGet -> DeviceStatus
```

`DeviceInfoGet.targets.status` is a historical field about to be removed from the underlying protocol. SDK business flows no longer construct or expose it.
Initialization first reads `ProtocolInfo`: the binary segment of `build_fingerprint` identifies application, bootloader, or
romloader, and `supported_messages` decides whether `DeviceStatusGet` can be called. Application reads runtime status when
it declares support; bootloader/romloader return the available identity and version snapshot directly and never send
`DeviceStatusGet`. Every public `getDeviceState()` follows the same rule.

### 6.1 Field Mapping

| Protocol V2 Field | Meaning | SDK Field |
| --------------------------- | -------------------------- | ----------------------------------------- |
| `device_id` | Wallet initialization lifecycle ID | `DeviceState.identity.deviceId` |
| `unlocked` | Whether the device is unlocked | `DeviceState.status.unlocked` |
| `init_states` | Whether device initialization is complete | `DeviceState.status.initialized` |
| `backup_required` | Whether backup is required | `DeviceState.status.backupRequired` |
| `passphrase_enabled` | Whether Passphrase protection is enabled | `DeviceState.status.passphraseProtection` |
| `attach_to_pin_enabled` | Whether Attach-to-PIN is enabled | `DeviceState.status.attachToPinEnabled` |
| `unlocked_by_attach_to_pin` | Whether the current unlock came from Attach PIN | `DeviceState.status.unlockedAttachPin` |

`DeviceState.protocol` is the SDK protocol family (`V1`/`V2`). The root-level
`DeviceState.protocolVersion` keeps `protocol_version` from the device message. The two mean different things;
for example, Pro 2 can return both `protocol: 'V2'` and `protocolVersion: 1`.

### 6.2 Status Fields May Be Empty

`passphrase_enabled`, `attach_to_pin_enabled`, and `unlocked_by_attach_to_pin` are private states in protobuf that become available after unlock.

Therefore:

- An empty field must not be interpreted as `false`.
- When the device is locked, callers must allow these fields to be missing.
- When the SDK updates cache, it should merge by field and must not clear all previous information just because one lightweight response omitted fields.

### 6.3 Onboarding Status

The concrete steps of device initialization are not stuffed into `DeviceStatus`. They use a dedicated message:

```text
OnboardingStatusGet -> OnboardingStatus
```

Returned content:

- `step`: current coarse-grained onboarding step.
- `phase`: current page phase within the step.
- `setup`: create-or-restore type and the selected backup medium.
- `pin_set`: whether PIN has been set.
- `wallet_initialized`: whether the wallet has finished initialization.

`DeviceStatus.init_states` only indicates whether initialization is finally complete. It cannot replace the detailed onboarding stages.

## 7. User Settings

User settings are handled through the following messages:

```text
DeviceSettingsGet      read settings
DeviceSettingsSet      change settings that can be written directly
DeviceSettingsPageShow open a settings page that must be confirmed on the device
```

### 7.1 Settings Fields

| Category | Protocol V2 Field | Description |
| ---------- | ----------------------------- | ---------------------------- |
| Device display | `label` | Device name |
| Device display | `device_name_display_enabled` | Whether the home screen shows model and Bluetooth identifiers |
| Connection | `bt_enable` | Whether Bluetooth is enabled |
| Localization | `language` | Full BCP-47 language identifier |
| Appearance | `wallpaper_path` | On-device wallpaper file path |
| Appearance | `brightness` | Screen brightness |
| Appearance | `animation_enable` | Whether animation is enabled |
| Wake and feedback | `tap_to_wake` | Tap to wake |
| Wake and feedback | `haptic_feedback` | Haptic feedback |
| Power and lock | `autolock_delay_ms` | Auto lock-screen delay |
| Power and lock | `autoshutdown_delay_ms` | Auto shutdown delay |
| Power and lock | `usb_lock_enable` | USB lock setting |
| Secure input | `random_keypad` | Whether the PIN keypad is randomly arranged |
| Capability switch | `fido_enabled` | FIDO feature switch |
| On-device confirmation | `passphrase_enable` | Readable; changes must be confirmed on the device |
| On-device confirmation | `airgap_mode` | Readable; changes must be confirmed on the device |

The “never” value of `autolock_delay_ms` and `autoshutdown_delay_ms` is
`0x10000000` (`268435456`) in both Protocol V1 and V2. Apps should get
allowed values from `getDeviceSettingsCapabilities(deviceType, 'V2')`.

Protocol V2 firmware uses full BCP-47 language identifiers. Externally, Core keeps public language codes consistent with Protocol V1
and `getLanguageConfig()`. Existing public codes (for example
`en`, `zh_cn`, `pt_br`) are converted to BCP-47 on write, and converted back to public codes when
`en-Latn-US`, `zh-Hans-CN`, or `pt-Latn-BR` are read.
Languages that only Pro2 supports and that have no historical public code continue to use the full BCP-47 identifier.

### 7.2 Direct Changes vs On-Device Confirmation

Public callers only use unified `deviceSettings`. Inside Core, `DeviceSettingsSet`
performs partial updates for fields that can be changed directly.

`passphrase_enable` and `airgap_mode` cannot be changed directly through `DeviceSettingsSet`.
Core reads the current state from the target boolean in `deviceSettings`, opens the corresponding device page through
`DeviceSettingsPageShow` when needed, and reads the state again after user confirmation to verify the result.

Pages that can be opened include:

| Page | Purpose |
| ------------------ | --------------- |
| `DeviceReset` | Confirm device wipe |
| `DevicePinChange` | Change PIN |
| `DevicePassphrase` | Passphrase settings |
| `DeviceAirgap` | Air Gap settings |

A successful low-level response only means the page has been opened. Public `deviceSettings` succeeds only after the target state has been read and confirmed.

### 7.3 Why These Fields Do Not Enter DeviceInfo

Label, language, Bluetooth switch, auto lock screen, and haptic feedback are all user configuration. They are not device model, serial number, or firmware version.

Therefore:

- `DeviceInfo` not providing these fields is a design result, not a missing-field bug.
- `getDeviceState({ scope: 'settings' })` and successful high-level settings operations both normalize and merge the fields into `DeviceState`.
- The device details page consumes only `DeviceState`; external integrators do not call raw `DeviceSettingsGet` directly.

## 8. Wallet Session

Wallet sessions are created or resumed through the following messages:

```text
DeviceSessionAskPassphrase({ seed_domains }) -> Success -> DeviceSessionGet() -> DeviceSession
DeviceSessionAskPin(Main/AttachToPin) -> Success -> DeviceSessionGet() -> DeviceSession
DeviceSessionAskPin(AttachToPin) -> Success
  -> DeviceSessionAskPassphrase({ passphrase: '', on_device: false, seed_domains: [Standard, Cardano] })
  -> Success -> DeviceSessionGet() -> DeviceSession
DeviceSessionGet({ session_id, btc_test_address }) -> DeviceSession
```

### 8.1 Field Notes

| Protocol V2 Field/Message | Meaning | Current SDK Handling |
| ----------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DeviceSessionGet.session_id` | Attempt to resume a previous wallet session | Core internally passes the current wallet cache value |
| `DeviceSessionGet.btc_test_address` | Expected wallet identity for the resume request | Mapped from internal `passphraseState` and sent together with the cached session |
| `DeviceSessionAskPassphrase.seed_domains` | Seed domains that need to be generated this time | Open-wallet / non-Cardano is `[Standard]`; Cardano is `[Standard, Cardano]`. Get does not carry this field. Attach PIN supplements Cardano and sends an empty Host passphrase. The `DeviceSession` response reports generated domains with the same enum |
| `DeviceSessionPinType` | `Any/Main/AttachToPin` PIN routing | Standard wallet always uses `Main`; Attach selection always uses the corresponding type |
| `DeviceSessionAskPassphrase` | Create a Passphrase hidden-wallet session | Host: `{ passphrase, on_device: false, seed_domains }`; device: `{ on_device: true, seed_domains }` |
| Response `session_id` | Current wallet session ID | Saved to the current wallet cache |
| Response `DeviceSession.btc_test_address` | Stable identifier used to confirm the current wallet context | Mapped to internal `passphraseState` |

Here, `btc_test_address` is used to confirm whether the currently opened wallet is the expected one. It is not used to display user asset addresses.

### 8.2 Session Resume Flow

```text
Read the current hidden-wallet cached session_id
    -> DeviceSessionGet({ session_id, btc_test_address })
    -> Return DeviceSession
    -> Verify whether btc_test_address matches the expected wallet
```

If the cached session is invalid:

1. Firmware may return `DeviceSessionError_InvalidSession=2`, or it may return the final actual session.
2. Core clears the invalid handle, or finds that the returned `btc_test_address` does not match the expected one.
3. Pro2 public `openWalletSession({ mode: 'resume-hidden' })` re-completes
   PIN/Passphrase/Attach PIN selection in the same call, then verifies `passphraseState` again; it fails only on a final mismatch.
4. SDK-internal signing retries that require no interaction still use strict resume. On invalidation they return
   `WalletSessionInvalid` directly and do not pop wallet selection.

A successful `DeviceSessionGet` response must carry both a non-empty `session_id` and
`btc_test_address`. Missing either field is treated as an incomplete protocol response. Core will not downgrade it to a standard wallet.

A standard wallet does not read other wallets’ Session Store entries. It only reads the internal standard index, negotiates eventless mode when needed, and
sends `DeviceSessionAskPin(Main)`. In public responses, a standard wallet’s `passphraseState` is always `null`;
a hidden wallet returns the device-generated `passphraseState`. Callers must use `walletType` to determine wallet type.
The SDK does not register callable raw Session APIs. Integrators cannot bypass the public wallet flow through low-level `call()`.

Apps must not call raw Session requests directly. Existing Apps may continue to call public
`getPassphraseState()`, and Core will map it to the new protocol on Pro2. New code should prefer
`openWalletSession()` with `standard/select-hidden/resume-hidden` to express intent explicitly.
`openWalletSession()` must take an explicit `mode` and does not accept the old
`useEmptyPassphrase/initSession` parameters. Old calls remain compatible through `getPassphraseState()`.

## 9. PIN Unlock Result

PIN unlock uses:

```text
DeviceSessionAskPin -> DeviceSession -> DeviceStatusGet -> DeviceStatus
```

| `DeviceStatus` Field | SDK Field | Meaning |
| --------------------------- | ----------------------------------------- | ---------------------------- |
| `unlocked` | `DeviceState.status.unlocked` | Whether unlock succeeded |
| `unlocked_by_attach_to_pin` | `DeviceState.status.unlockedAttachPin` | Whether unlock was through Attach PIN |
| `passphrase_enabled` | `DeviceState.status.passphraseProtection` | Passphrase state confirmed after unlock |

`DeviceSession` means on-device unlock and wallet-session creation are complete. Core then reads `DeviceStatus` and does not guess device settings state from the session response.

## 10. Device Operations and Firmware Management

### 10.1 Reboot

`DeviceReboot.reboot_type` supports:

| Value | Target |
| ------------ | ---------- |
| `Normal` | Normal application |
| `Romloader` | romloader |
| `Bootloader` | bootloader |

The reboot command only switches the running stage. After reconnect, `DeviceInfo` must be read again. Runtime state from before the reboot must not be reused.

### 10.2 Device Certificates

| Message | Purpose |
| ------------------------ | ------------------------ |
| `DeviceCertificateWrite` | Write certificate, public key, and write-only private key |
| `DeviceCertificateRead` | Read certificate and public-key material |
| `DeviceCertificateSign` | Sign data using device certificate capability |

The certificate private key can only be written, never read back, and must not enter device details, `DeviceState`, or logs.

### 10.3 Firmware Upgrade

Firmware upgrade is no longer represented by a single “current firmware field.” It is split into component information and an install task:

- Currently installed versions: re-read `DeviceInfo`.
- Status of this install task: read `DeviceFirmwareUpdateStatus`.

Main structures:

| Message or Structure | Fields | Purpose |
| ------------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| `DeviceFirmwareTarget` | `target_id`, `path` | Specify the component and on-device firmware path |
| `DeviceFirmwareUpdateStage` | `targets[]` | Stage a set of install targets |
| `DeviceFirmwareUpdateRequest` | `reboot_after_update` | Trigger install of already staged targets |
| `DeviceFirmwareUpdateRecord` | `target_id`, `status`, `progress_percent`, `phase_info`, `payload_version`, `path` | Save the install record for each component |
| `DeviceFirmwareUpdateStatusGet` | `fields` | Select which record fields to return |
| `DeviceFirmwareUpdateStatus` | `records[]` | Return all install records |

Supported install targets include crate, romloader, bootloader, application P1, application P2, coprocessor, SE01, SE02, SE03, and SE04.

SDK-internal raw `deviceFirmwareUpdate` only sends the install request and does not enter public `CoreApi`. The full upgrade flow still needs to:

1. Verify the upgrade package.
2. Write firmware files to the device in chunks.
3. Select install targets.
4. Trigger install.
5. Poll install status.
6. Handle disconnect and reconnect during install.
7. Re-read `DeviceInfo` after reconnect to confirm final versions.

## 11. Manufacturing Information

Manufacturing information uses dedicated messages and is not mixed with ordinary device information:

```text
DeviceFactoryInfoGet -> DeviceFactoryInfo
DeviceFactoryInfoSet -> Success
```

### 11.1 Current Fields

| Protocol V2 Field | Meaning |
| ------------------------ | ---------------------------- |
| `version` | Factory data-structure version |
| `serial_number` | Serial-number record in the manufacturing flow |
| `burn_in_completed` | Whether burn-in testing is complete |
| `factory_test_completed` | Whether factory functional testing is complete |
| `manufacture_time` | Manufacture time, split into year, month, day, hour, minute, and second |

### 11.2 Changes Compared With the Old Structure

| Old Content | Current Handling |
| -------------------- | --------------------------------------------------- |
| CPU description string | Removed |
| SPI Flash description string | Removed |
| SE description string | Removed; ordinary SE versions now come from `DeviceInfo.se1..se4` |
| pre-firmware description | Removed |
| NFT voucher | No longer provided by current `DeviceFactoryInfo` |

Other manufacturing operations include:

- `DeviceFactoryPermanentLock`: perform a permanent lock. Requires two fixed check values to reduce accidental operation risk.
- `DeviceFactoryTest`: select full burn-in testing or functional testing.

Even if the factory serial number has the same value as the ordinary device serial number, the SDK must not silently fall back between them, because they have different read and write permissions.

## 12. How the SDK Converts Fields

Externally, the SDK has only one unified device-state path.

### 12.1 Initialize Device

```text
DeviceInfoGet
    -> Protocol V2 Mapper
    -> DeviceStateStore
```

Purpose: establish a basic device identity and version snapshot without implicitly reading realtime status.

### 12.2 Get Unified Device State

```text
getDeviceState()
    -> omitted scope defaults to runtime
    -> normal mode refreshes DeviceStatus; loader mode skips it
    -> returns the full DeviceState (without raw and wallet session)

getDeviceState({ scope: 'settings' | 'firmware' })
    -> on top of runtime status, refresh settings or firmware information by business scope
    -> merge into DeviceStateStore
    -> return the full DeviceState
```

`scope` means “which partitions to actively refresh this time,” not a return-field filter. Even with the default `runtime`, the result is still a full public `DeviceState` snapshot, not only `status`. Partitions not refreshed this time use the already-normalized current values in `DeviceStateStore`.

Purpose: device details, version display, settings pages, and runtime-status reads. Protocol V1/V2 return the same structure.

### 12.3 SDK-Internal Raw Commands

```text
DeviceInfoGet / DeviceStatusGet / DeviceSettingsGet
    -> Mapper
    -> DeviceStateStore
```

These commands are for SDK-internal flows only and are not public APIs. External integrators do not need to choose raw commands, request scopes, or cache strategies.

## 13. Fields That Enter Unified DeviceState

| Protocol V2 Source | Standard SDK Field |
| ---------------------------------- | ----------------------------- |
| `protocol_version` | `protocol` / internal raw |
| `hw.serial_no` | `identity.serialNo` |
| `fw.application.version` | `versions.firmware` |
| `fw.bootloader.version` | `versions.bootloader` |
| `fw.romloader.version` | `versions.board` |
| `coprocessor.application.version` | `versions.ble` |
| `coprocessor.bt_adv_name` | `identity.bleName` |
| `se1..se4.application.version` | `versions.se01..se04` |
| `se1..se4.bootloader.version` | `versions.se01Boot..se04Boot` |
| `status.device_id` | `identity.deviceId` |
| `status.init_states` | `status.initialized` |
| `status.unlocked` | `status.unlocked` |
| `status.backup_required` | `status.backupRequired` |
| `status.passphrase_enabled` | `status.passphraseProtection` |
| `status.attach_to_pin_enabled` | `status.attachToPinEnabled` |
| `status.unlocked_by_attach_to_pin` | `status.unlockedAttachPin` |

Build ID and hash are requested only in `getDeviceState({ scope: 'firmware' })` and enter `DeviceState.verification`.

## 14. Dedicated Sources and Their DeviceState Projections

The following fields are still read and written by dedicated messages, but cross-device common fields are merged into standard `DeviceState`:

| Content | Protocol V2 Source | Standard Projection / Management |
| --------------- | -------------------------------------- | ------------------------------ |
| label | `DeviceSettings.label` | `identity.label/displayName` |
| language | `DeviceSettings.language` | `settings.language` |
| Bluetooth switch | `DeviceSettings.bt_enable` | `settings.bleEnabled` |
| Auto lock screen | `DeviceSettings.autolock_delay_ms` | `settings.autoLockDelayMs` |
| Auto shutdown | `DeviceSettings.autoshutdown_delay_ms` | `settings.autoShutdownDelayMs` |
| Haptic feedback | `DeviceSettings.haptic_feedback` | `settings.hapticFeedback` |
| Wallet session ID | `DeviceSession.session_id` | Core wallet session management |
| Wallet identifier | `DeviceSession.btc_test_address` | Internal `passphraseState` |
| Firmware install records | `DeviceFirmwareUpdateStatus` | Firmware upgrade APIs |
| Manufacturing information | `DeviceFactoryInfo` | Manufacturing-only APIs |

The device details page reads unified `DeviceState` and does not depend directly on the raw snake_case settings structure. These fields still must not be stuffed back into `DeviceInfo`.

## 15. Currently Missing DeviceState Fields

Keep “has an independent source but is not merged” separate from “DeviceState still lacks a field or a stable source.”

| Standard Field or Capability | Current Protocol V2 Situation | Current SDK Handling and Required Changes |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| Explicit run mode | `ProtocolInfo.build_fingerprint` provides the binary name | SDK maps it to normal/bootloader/romloader |
| `applicationDataVersion/BuildId/Hash` | `fw.application_data` is already provided | Currently only in internal raw; if the App needs it, add an explicit standard field |
| `safetyChecks` | No source in DeviceInfo, DeviceStatus, or DeviceSettings | Currently stays `null`; firmware needs to provide a read source |
| `batteryLevel` | Current Protocol V2 has no source | No reliable value; cannot be used to block Pro 2 upgrades for low battery |
| V1 fine-grained states such as `noBackup` | Currently only `backup_required` is provided | Do not derive other states from one boolean; the protocol needs explicit fields |

The current SDK no longer guesses main-MCU run mode from `DeviceInfo` image structure. The standard fingerprint format is
`<binary>__<version>__<commit>__<PROD|DEV>__<DEBUG|RELEASE>`, and binary only accepts
`application`, `bootloader`, and `romloader`. When the fingerprint cannot be identified, status may be read on the old-firmware compatibility path only if
`supported_messages` explicitly includes `DeviceStatusGet`. If neither can
confirm it, initialization fails safely. Version refresh must not overwrite
`notInitialized/backupMode` already confirmed by runtime or onboarding.

## 16. Complete Migration Matrix

| Former Centralized Semantics | Current Protocol V2 Location | Current SDK Handling | Change Type |
| ------------------------ | ---------------------------------------- | ---------------------- | ---------------------- |
| Device model | `DeviceInfo.hw.Device_type` | Identified as Pro 2 | Move |
| Device serial number | `DeviceInfo.hw.serial_no` | `serialNo` | Move |
| Device ID | `DeviceStatus.device_id` | `deviceId` | Split from hardware info into realtime status |
| Main application version | `DeviceInfo.fw.application` | `firmwareVersion` | Structured |
| bootloader version | `DeviceInfo.fw.bootloader` | `bootloaderVersion` | Structured |
| P2 / application data | `DeviceInfo.fw.application_data` | Currently kept in raw only | New independent component |
| romloader version | `DeviceInfo.fw.romloader` | `boardVersion` | Old boardloader renamed |
| Bluetooth firmware version | `DeviceInfo.coprocessor.application` | `bleVersion` | Move |
| Bluetooth advertising name | `DeviceInfo.coprocessor.bt_adv_name` | `bleName` | Move |
| Bluetooth switch | `DeviceSettings.bt_enable` | Dedicated settings API | Split from info into settings |
| SE1 through SE4 versions | `DeviceInfo.se1..se4` | Standard SE version and verification fields | Structured |
| Initialization state | `DeviceStatus.init_states` | `initialized` | Move and rename |
| Unlock state | `DeviceStatus.unlocked` | `unlocked` | Move |
| Backup state | `DeviceStatus.backup_required` | `backupRequired` | Move and rename |
| Whether Passphrase is enabled | `DeviceStatus.passphrase_enabled` | `passphraseProtection` | Move and rename |
| Whether Attach-to-PIN is enabled | `DeviceStatus.attach_to_pin_enabled` | `attachToPinEnabled` | Move and rename |
| Attach PIN unlock source | `DeviceStatus.unlocked_by_attach_to_pin` | `unlockedAttachPin` | Move and rename |
| label | `DeviceSettings.label` | Dedicated settings API | Split from info into settings |
| language | `DeviceSettings.language` | Dedicated settings API | Split from status into settings |
| Auto lock, auto shutdown, haptics | `DeviceSettings` | Dedicated settings API | Independent settings |
| Wallet session | `DeviceSession.session_id` | Core session cache | Split from initialization into wallet session |
| Wallet identifier | `DeviceSession.btc_test_address` | `passphraseState` | Independent wallet semantics |
| PIN unlock result | `Success + DeviceStatus` | Merged back into the standard status cache | Refresh after operation |
| Firmware install targets and progress | `DeviceFirmware*` | High-level upgrade flow | Independent task state |
| Factory production records | `DeviceFactoryInfo` | Manufacturing-only APIs | Isolated from ordinary device information |

## 17. Important Usage Principles

### 17.1 Do Not Stuff All Fields Back Into DeviceInfo

If a field already has a clear source, such as `DeviceSettings` or `DeviceSession`, it should be obtained through the corresponding API. Duplicating fields into `DeviceInfo` just to stay compatible with old `Features` would recreate multiple sources of truth.

### 17.2 Do Not Treat Empty Values as false

Many Protocol V2 fields are optional. A missing field may mean:

- This request did not select the corresponding target or type.
- The current running stage does not provide the field.
- The device is locked, so private state is not visible.
- The component does not exist or cannot be read right now.

Only when a field explicitly returns `false` can it be interpreted as off or not enabled.

### 17.3 Do Not Fall Back to Unrelated Fields

Typical prohibitions:

- Do not use `serial_no` in place of `device_id`.
- Do not use the factory serial number in place of the ordinary device serial number.
- Do not casually overwrite realtime `DeviceStatus.passphrase_enabled` with `DeviceSettings.passphrase_enable`.
- Do not use `payload_version` from firmware upgrade records in place of the component version actually read after reconnect.

### 17.4 Raw Messages Stay Inside the SDK Only

Standard `DeviceState` is the unified cross-device capability. Raw `protocolV2DeviceInfo` is kept only in the SDK-internal raw partition. Public `getDeviceState()` does not return raw; `includeRaw` is only for Core-internal V1 compatibility projection.

When adding a field, choose explicitly:

1. Whether it needs to enter a cross-device standard field.
2. Whether it should only enter Pro 2 raw data.
3. Whether it should use a dedicated API.
4. Whether it involves new permissions or lock state.

## 18. New-Field Onboarding Flow

When adding or migrating a Pro 2 field, follow these steps:

1. Choose the protobuf file by field purpose.
   - Static hardware and component versions: `messages_device_info.proto`.
   - Dynamic runtime status: `messages_device_status.proto`.
   - Wallet context: `messages_device_session.proto`.
   - Settings, reboot, certificates, and firmware operations: `messages_device_control.proto`.
   - Manufacturing information: `messages_device_factory.proto`.
2. Update firmware-pro2 protobuf and the corresponding `.options`.
3. Run `yarn update-protobuf` to update generated schema and TypeScript types.
4. Check that hd-transport encodes and decodes the new field correctly.
5. Decide Core’s output path: a standard `DeviceState` field, internal raw, or a business-operation API.
6. If it enters cache, define merge rules for missing fields in lightweight queries.
7. If the field is invisible while locked, make the difference among `undefined/null/false` explicit.
8. Add Core and Transport tests.
9. Update the field-migration document and App-side usage notes.

Do not hand-write in the SDK a field that has not entered protobuf. Even if TypeScript compiles, the actual device response still will not include that field.

## 19. Maintenance Checklist

After protobuf or SDK mapping changes, at least check the following:

- [ ] Message names, field names, and field numbers in firmware-pro2 `latest` proto have been confirmed.
- [ ] String length, bytes length, and repeated-count limits in `.options` have not been missed.
- [ ] `packages/hd-transport/messages-protocol-v2.json` has been updated.
- [ ] `packages/core/src/data/messages/messages-protocol-v2.json` has been updated.
- [ ] Request scopes for initialization, lightweight refresh, versions, and verify/full match the new field’s purpose.
- [ ] `DeviceStateMapper` field mapping and `DeviceStateStore` field-level merge are correct.
- [ ] identity, versions, verification, status, and settings partition semantics are correct.
- [ ] Raw read commands have not been re-exposed as a second public state API.
- [ ] Missing-field behavior in locked state and loader stages is covered.
- [ ] The document does not mix “already has an independent API” with “currently missing Feature fields.”

## 20. Code Sources of Truth

The conclusions in this document are based on the following code locations:

```text
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_info.proto
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_status.proto
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_session.proto
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_control.proto
submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/messages_device_factory.proto

packages/hd-transport/messages-protocol-v2.json
packages/core/src/data/messages/messages-protocol-v2.json
packages/core/src/protocols/protocol-v2/features.ts
packages/core/src/protocols/protocol-v2/walletSession.ts
packages/core/src/deviceProfile/buildDeviceFeatures.ts
packages/core/src/device/DeviceStateMapper.ts
packages/core/src/device/DeviceStateStore.ts
packages/core/src/device/DeviceStateProjector.ts
packages/core/src/api/protocol-v2/
```

## 21. Final Conclusion

Pro 2 Protocol V2 field migration can be summarized in three principles:

1. Split by purpose: manage device basic information, realtime status, user settings, wallet session, device operations, and manufacturing information separately.
2. Unified conversion: the SDK converts cross-device identity, versions, status, and settings into a single `DeviceState`.
3. Single source of truth: raw messages only produce patches. The same fact is not stored repeatedly across `DeviceInfo`, `DeviceStatus`, and App models.

Once these three principles are understood, deciding where a new field belongs is relatively direct: first decide whether it describes “what the device is,” “how the device is right now,” “what the user configured,” “which wallet is currently open,” “what operation the device should perform,” or “what the production stage recorded,” then choose the corresponding Protocol V2 message and SDK output path.
