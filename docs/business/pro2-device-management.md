# Pro2 / Neo device management

This document covers Pro2 and Neo / Protocol V2 device settings, wallpaper and NFT upload, and firmware update. These features depend on Core Protocol V2 guards and file/state orchestration. They are not transport-layer protocol.

## Device settings

| Core internal operation | protobuf | Return value | Unlock policy |
| --- | --- | --- | --- |
| `deviceSettingsGet` | `DeviceSettingsGet` | `DeviceSettings` | Read without unlocking |
| `deviceSettingsSet` | `DeviceSettingsSet` | `Success` | Unlock depends on the fields |
| `deviceSettingsPageShow` | `DeviceSettingsPageShow` | `Success` | Unlock once when already known locked |

These raw commands are not public `CoreApi`. Callers use `deviceSettings`; Core routes V1 vs V2.

Public `DeviceSettings` fields include device name, Bluetooth, language, wallpaper path, brightness, auto-lock, auto-shutdown, animation, tap-to-wake, haptic, USB lock, randomized keyboard, and security-mode state. They can be read while locked. `passphrase_enable` and `fido_enabled` are private and returned only when unlocked. Fields follow the current protobuf and generated types.

`deviceSettingsSet` supports partial updates, but the SDK strips `passphrase_enable` and `airgap_mode`. Updates that only include `label`, `language`, `brightness`, or `haptic_feedback` write without unlocking. Any other field unlocks first when the device is locked. Success toasts and page jumps for `autolock_delay_ms` / `autoshutdown_delay_ms` are implemented by firmware.

After any successful Protocol V2 settings write, the SDK force-refreshes `DeviceStatus` and `DeviceSettings`, and updates the unified `DeviceState` only from device readback. Write request parameters are not a state source. If readback fails after a successful write, the public call fails; callers must not replay a settings command that may already have taken effect.

`passphrase_enable` and `airgap_mode` must open a device page through `deviceSettingsPageShow` and be confirmed on-device.

Supported settings pages:

- `DeviceReset`
- `DevicePinChange`
- `DevicePassphrase`
- `DeviceAirgap`

Status reads disable wallet Session handling and use `unlockPolicy='none'`, so they do not auto-unlock. Unified `deviceSettings` computes `none` or `unlock-before-run` from the fields; device pages also use `unlock-before-run`. A known locked device is unlocked first, but a later locked response does not replay the settings write or page operation.

Before opening a page, the SDK emits a non-blocking `REQUEST_BUTTON` whose payload includes `source='method-lifecycle'`, `reason='settings-page'`, `completion='operation-completed'`, and the specific `page`. The App only shows "confirm on device" and does not call `uiResponse()`. API `Success` means the on-device confirmation finished.

Public `deviceChangePin(remove=false)` on Pro2 reuses the `DevicePinChange` page and sends `reason='change-pin'`. Success means the PIN change completed. Pro2 does not currently support `remove=true` through this API.

Public `deviceWipe()` on Pro2 reuses the `DeviceReset` wipe confirmation page and sends `reason='device-management'`, `operation='wipe-device'`. Success means the secure-element wipe completed; the device stays on the reboot prompt until the user confirms. Protocol V1 keeps the original `WipeDevice` final-operation flow.

Main implementations:

- `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsPageShow.ts`

## Portfolio update

`uploadPortfolio` stages and applies a package without device confirmation:

- The caller passes `packageBase64` without a data URL prefix. The LowLevel SDK validates it strictly and decodes it into device chunks.
- `uiMode` defaults to `silent`, which disables transfer progress events and Protocol V2 UI lifecycle events.
- `uiMode='progress'` emits `DEVICE_PROGRESS` while staging the file and emits `CLOSE_UI_WINDOW` when the operation ends.
- Neither mode emits `REQUEST_PIN` or `REQUEST_BUTTON`, and neither mode unlocks the wallet.
- Firmware validates the pending package, updates Portfolio data, and returns the final `Success/Failure` response.
- The App treats the final `PortfolioUpdate` response as authoritative; progress events do not determine success.

## Wallpaper upload

`deviceUploadWallpaper` accepts `604 × 1024` JPEG Base64 without a data URL prefix. TopLevel passes the string only. LowLevel SDK decodes it, converts the device format, writes the filesystem, and sets the active wallpaper. The method uses `unlock-before-run`: if the device is known locked, it unlocks and wakes the screen, then writes the file and sets `wallpaper_path`. A `DeviceLocked` error during the business phase is not retried.

1. Strictly validate Base64, JPEG, fixed size, decoded RGBA length, file name, and `chunkSize`.
2. Encode the JPEG decode result as `RGB565` with an 8×8 threshold ordered-dither matrix.
3. Confirm `FilesystemDirMake(60809)`, `FilesystemFileWrite(60805)`, and `DeviceSettingsSet(60412)` from `ProtocolInfo.supported_messages`.
4. Create `vol1:/wallpapers`, upload through `FilesystemFileWrite` chunks, and advance offset from device `processed_byte`.
5. Call `DeviceSettingsSet` to update `wallpaper_path`.

Firmware version selects the upload format:

- Firmware `< 1.0.1`: the SDK uploads an RGB565 `.bin` directly. File names allow letters, digits, underscore, hyphen, and an optional `.bin`. If no name is provided, a stable name is generated from the BLAKE2s hash of the encoded result.
- Official firmware `>= 1.0.1`: the SDK builds an unsigned RESOURCE OKPP/OKAR package that contains only `wallpaper.bin` and uploads it to `vol1:/wallpapers/wallpaper.okpkg`. `fileName` does not choose the device path in this mode. Firmware validates and unpacks to `vol1:/wallpapers/wallpaper.bin`, persists the final `.bin` path, then deletes the temporary `.okpkg`.

`DeviceUploadWallpaperResponse.path` is the path passed to `DeviceSettingsSet`: the legacy flow returns the final `.bin` path; the package flow returns the temporary `wallpaper.okpkg` path. Read `DeviceState.settings.wallpaperPath` for the current active wallpaper path; the SDK refreshes that state after a successful settings write.

There is no host-side transactional rollback. A dropped transfer can leave a partial file. Official firmware `>= 1.0.1` owns package validation, staging, replace, and cleanup during apply. Setting `wallpaper_path` to an empty string restores the built-in wallpaper.

Main implementations:

- `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- `packages/core/src/utils/pro2Wallpaper.ts`
- `packages/core/src/api/helpers/protocolV2FileWrite.ts`

## NFT upload

`deviceUploadNft` supports Pro2 and Neo / Protocol V2 only. It also uses `unlock-before-run`: if the device is known locked, it unlocks and wakes the screen, then writes NFT files and sends `NftUpdate`. A `DeviceLocked` error during the business phase is not retried. Callers crop the original and thumbnail to `540 × 540` and `263 × 263` JPEG and pass Base64 without a data URL prefix. LowLevel then:

1. Strictly validates both Base64 payloads, JPEG, fixed size, and decoded RGBA length.
2. Composites transparent areas onto black and encodes both images as uncompressed LVGL v9 RGB565. Encoding shares the wallpaper RGB565 dither, but NFT does not generate an A8 alpha plane.
3. Builds basename `nft-<hash8>-<timestamp_ms>` from the first 8 BLAKE2s hex chars of the full original `.bin` and a Unix millisecond timestamp.
4. Chooses legacy three-file upload or host-asset package upload from the firmware version.
5. Sends one `NftUpdate` after the files are confirmed. Transport does not auto-replay this side-effect request. Only a final `Success` returns `nftUpdated: true`.

File layout by firmware version:

- Firmware `< 1.0.1`: the SDK confirms `FilesystemPathInfoQuery(60802)`, `FilesystemFileWrite(60805)`, `FilesystemDirList(60808)`, and `NftUpdate(61500)` from the current Link `ProtocolInfo.supported_messages`. Before writing, it counts complete three-file sets with `FilesystemDirList("vol1:/nft", depth=1)` and throws `NftStorageLimitReached` at the 10-item cap. It then writes original `.bin`, thumbnail `_m.bin`, and metadata `.json` in that order.
- Official firmware `>= 1.0.1`: only `FilesystemFileWrite(60805)` and `NftUpdate(61500)` are required. The SDK packs the three logical files into one unsigned RESOURCE OKPP/OKAR package, uploads `vol1:/nft/<basename>.okpkg`, and does not list the directory or enforce capacity on the host. `NftUpdate` triggers firmware validation, unpack, atomic replace, and deletion of the temporary `.okpkg`. Firmware owns the 10-NFT cap and evicts the oldest item when over the limit.

`DeviceUploadNftResponse.imagePath`, `thumbnailPath`, and `metadataPath` are always the final logical paths after a successful apply. The package flow actually transfers a temporary `.okpkg`, but firmware unpacks it to those three returned paths. `totalSize` is the total bytes the host transferred.

`title` is 1–63 UTF-8 bytes. `subtitle` is 0–95 UTF-8 bytes. Public parameters may pass a fixed `timestampMs` so a lost response can be retried with the same basename. Transport does not auto-replay side-effect requests. NFT image and thumbnail sizes come from the separate `getNftSize` API, not the wallpaper `homeScreenType` branch.

Main implementations:

- `packages/core/src/api/protocol-v2/DeviceUploadNft.ts`
- `packages/core/src/utils/pro2Nft.ts`
- `packages/core/src/utils/pro2Wallpaper.ts`
- `packages/core/src/api/helpers/protocolV2FileWrite.ts`

## Firmware update

Protocol V1 keeps `firmwareUpdate` through `firmwareUpdateV3`. Pro2 and Neo use `firmwareUpdateV4`. Low-level `DeviceFirmwareUpdate` is only for Core's internal update orchestration to send install targets; it is not public `CoreApi`.

Switching firmware type does not add a `DeviceSettingsPageShow` page. `firmwareUpdateV4` uses `unlock-before-run`: if known locked, it unlocks, then sends `DeviceReboot(Bootloader)`. Once update orchestration has started, a locked error does not replay from the beginning. Confirm and reboot pages are handled by firmware; the SDK then reconnects and continues orchestration.

Supported Pro2 targets include bootloader, application P1/P2, coprocessor, SE01–SE04, and the RESC bundle. Neo uses the same update path and supports resource sync, but only SE01 and SE02. `romloaderBinary` still exists in some compatibility types, but the current install request does not accept `ROMLOADER`; that must use the loader-specific flow.

High-level update flow:

1. Call `checkAllFirmwareRelease` for component versions, suggested update targets, and remote release config.
2. Pass returned `targetsToUpdate` to `firmwareUpdateV4`. The SDK downloads and verifies every remote firmware and RESC binary before reboot. Each remote component must provide a positive integer size and a full SHA-256; missing or mismatched values abort before the device is modified.
3. Compare versions and fingerprints. `forceTargets` only skips version checks for the named targets.
4. For the RESC bundle, compare device header, version, and hash.
5. Reboot into bootloader if needed, then poll until the mode is confirmed.
6. Write target files to `vol0:/` in chunks, then verify size with PathInfo.
7. Submit every pending install file through `DeviceFirmwareUpdateStage.targets[]`, then send an empty `DeviceFirmwareUpdateRequest` to start install. Before the install request, the SDK emits a non-blocking `REQUEST_BUTTON` (`reason='firmware-update'`) so the App can show "confirm on device". The App does not call `uiResponse()`.
8. Poll target install status. Disconnect, timeout, and reconnect probes are allowed during install. Reuse the current command channel while the same link is available; re-enumerate and verify physical identity only after the link fails.
9. If the device has already returned to normal mode, do not send another Normal reboot. Then explicitly refresh `DeviceState` identity/versions.

Reliability constraints:

- BLE and WebUSB use different default chunks, with a 64-byte minimum.
- File transfer resumes from `processed_byte`. Total progress aggregates all target bytes.
- Protocol V2 installation polling requests `progress_percent` and `phase_info`. The SDK aggregates each target's reported percentage into overall install progress and exposes the active `installTargetId`, normalized `installPhase` (`prepare` / `install` / `verify`), and `installPhaseProgress` through `FIRMWARE_PROGRESS`.
- Install start, install complete, and user interaction use different timeout windows.
- After the install request is sent, the device may drop BLE before the `Success` reply arrives. The SDK does not replay that side-effect request; it reconnects and polls, then confirms from target status or the final App version.
- Transport does not auto-resend the install request. Retry is decided by the high-level flow from phase and idempotency.
- Release config, SDK target types, and firmware enums must ship together.

`firmwareUpdateV4` still returns BLE, application, and bootloader versions for the old interface. For SE, P1/P2, hash, build ID, or coprocessor versions, call `getDeviceState({ scope: 'firmware' })`.

The Protocol V2 branch of `checkAllFirmwareRelease` reads device state and parses the loaded Pro2 `firmware-v1` config. It does not download binaries, reboot, or install. Each `components.*.version` is the suggested version for that target. Returned `targetsToUpdate` can be passed to `firmwareUpdateV4` as the same field. When versions match, the SDK uses `components.*.payloadHash` only to distinguish same-version Bootloader/P1/P2 hotfixes. Without a valid `payloadHash`, status stays `unknown` and the check stage does not fetch the component URL. Config `fingerprint` is the SHA-256 of the full `.okpkg` and is only for post-download file verification; it must not be compared directly with the device payload hash. Components without a current version or comparable metadata are `unknown` and are not auto-added as update targets. ROMloader is `unsupported`.

P1 maps to `DeviceInfo.fw.application`. P2 maps to `DeviceInfo.fw.application_data`. In normal mode, if only P1 is reported, P1/P2 are treated as one application package set; a P1 hotfix updates both application targets. In bootloader mode, when P2 is reported, the SDK compares P1 and P2 separately.

Release config should write OKPP `payloadHash` for Bootloader/P1/P2. Legacy Range fallback requires the CDN to allow cross-origin `Range` responses for that runtime; otherwise same-version components return `unknown` instead of being treated as already latest.

Main implementations:

- `packages/core/src/api/FirmwareUpdateV4.ts`
- `packages/core/src/protocols/protocol-v2/firmware.ts`
- `packages/core/src/api/protocol-v2/DeviceFirmwareUpdate.ts`

## Shared maintenance rules

- Settings, wallpaper, NFT, and firmware update are Core business orchestration. Transport only carries one message at a time.
- New side-effect operations must state whether unlock retry or disconnect retry is allowed.
- Reuse helpers for file paths, chunk limits, and timeouts. Do not reimplement them per method.
- Public field normalization and runtime-mode checks are in [Pro2 field migration](../sdk/pro2-field-migration.md).
