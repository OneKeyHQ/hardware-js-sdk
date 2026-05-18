import { Command } from 'commander';

import { createSDK, disposeSDK } from './sdk';
import {
  clearSessionFromKeychain,
  preloadSessionFromKeychain,
  saveSessionToKeychain,
} from './session';
import {
  resolveBatchGetAddress,
  resolveGetAddress,
  resolveGetPublicKey,
  resolveSignMessage,
  resolveSignTransaction,
} from './chains';

import type {
  EthereumSignTypedDataMessage,
  EthereumSignTypedDataTypes,
  Features,
  IDeviceType,
  SearchDevice,
} from '@onekeyfe/hd-core';

/** SearchDevice enriched with features fetched after discovery */
type EnrichedSearchDevice = SearchDevice & { features?: Features };

function extractPassphraseSession(payload: unknown): {
  passphraseState?: string;
  sessionId?: string;
} {
  if (typeof payload === 'string') {
    return { passphraseState: payload };
  }
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const statePayload = payload as {
    passphrase_state?: unknown;
    passphraseState?: unknown;
    session_id?: unknown;
    sessionId?: unknown;
  };

  let passphraseState: string | undefined;
  if (typeof statePayload.passphrase_state === 'string') {
    passphraseState = statePayload.passphrase_state;
  } else if (typeof statePayload.passphraseState === 'string') {
    passphraseState = statePayload.passphraseState;
  }

  let sessionId: string | undefined;
  if (typeof statePayload.session_id === 'string') {
    sessionId = statePayload.session_id;
  } else if (typeof statePayload.sessionId === 'string') {
    sessionId = statePayload.sessionId;
  }

  return { passphraseState, sessionId };
}

const program = new Command();

program
  .name('onekey-hw')
  .description('OneKey hardware wallet CLI for AI agent integration')
  .version('1.1.26-alpha.1');

// ============================================================
// Global Options
// ============================================================

program.option('--connect-id <id>', 'Device connection ID (USB: serial, iOS: uuid, Android: MAC)');
program.option(
  '--device-id <id>',
  'Persistent device ID from getFeatures (changes when seed changes)'
);
program.option('--passphrase-state <state>', 'Passphrase state for hidden wallet access');
program.option('--use-empty-passphrase', 'Use standard wallet (skip passphrase prompt)');

// ============================================================
// Device Commands
// ============================================================

program
  .command('search')
  .description('Search for connected OneKey hardware wallet devices')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.searchDevices();

      // Auto-fetch features for each discovered device (doesn't require PIN)
      if (result?.success && Array.isArray(result.payload)) {
        for (const device of result.payload as EnrichedSearchDevice[]) {
          if (device.connectId) {
            try {
              const features = await sdk.getFeatures(device.connectId);
              if (features?.success && features.payload) {
                device.features = features.payload;
                device.name = features.payload.label || features.payload.ble_name || device.name;
                const devType = features.payload.onekey_device_type?.toLowerCase();
                if (devType) {
                  device.deviceType = devType as IDeviceType;
                }
              }
            } catch {
              // Features fetch failed — device may need PIN, continue with basic info
            }
          }
        }
      }

      outputResult(globalOpts, result);
    })
  );

program
  .command('get-features')
  .description('Get device features (firmware, unlock state, passphrase protection, etc.)')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      // Resolve connectId: explicit flag wins, else pick the first attached device
      let { connectId } = globalOpts as { connectId?: string };
      if (!connectId) {
        const searchResult = await sdk.searchDevices();
        if (
          !searchResult?.success ||
          !Array.isArray(searchResult.payload) ||
          searchResult.payload.length === 0
        ) {
          outputResult(globalOpts, {
            success: false,
            payload: { error: 'No device found', code: 'NO_DEVICE' },
          });
          return;
        }
        connectId = (searchResult.payload[0] as EnrichedSearchDevice).connectId ?? undefined;
      }
      const result = await sdk.getFeatures(connectId || '');
      outputResult(globalOpts, result);
    })
  );

// ============================================================
// Signing Commands
// ============================================================

program
  .command('get-address')
  .description('Get a cryptocurrency address from the hardware wallet')
  .requiredOption('--chain <chain>', 'Target blockchain (evm, btc, sol, ...)')
  .option('--path <path>', 'BIP44 derivation path')
  .option('--show-on-device <bool>', 'Display address on device for verification', 'true')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await resolveGetAddress(sdk, {
        chain: opts.chain,
        path: opts.path,
        showOnDevice: opts.showOnDevice === 'true',
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('get-public-key')
  .description('Get public key from the hardware wallet')
  .requiredOption('--chain <chain>', 'Target blockchain')
  .option('--path <path>', 'BIP44 derivation path')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await resolveGetPublicKey(sdk, {
        chain: opts.chain,
        path: opts.path,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('sign-transaction')
  .description('Sign a blockchain transaction (requires device confirmation)')
  .requiredOption('--chain <chain>', 'Target blockchain')
  .requiredOption('--tx <json>', 'Transaction data (JSON)')
  .option('--path <path>', 'BIP44 derivation path')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const tx = safeJsonParse(opts.tx, '--tx') as Record<string, unknown>;
      const result = await resolveSignTransaction(sdk, {
        chain: opts.chain,
        path: opts.path,
        transaction: tx,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('sign-message')
  .description('Sign a message (requires device confirmation)')
  .requiredOption('--chain <chain>', 'Target blockchain')
  .requiredOption('--message <msg>', 'Message to sign')
  .option('--path <path>', 'BIP44 derivation path')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await resolveSignMessage(sdk, {
        chain: opts.chain,
        path: opts.path,
        message: opts.message,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('sign-typed-data')
  .description('Sign EIP-712 typed data (EVM only, requires device confirmation)')
  .requiredOption('--data <json>', 'EIP-712 typed data JSON')
  .option('--path <path>', 'BIP44 derivation path')
  .option('--no-metamask-v4-compat', 'Disable MetaMask V4 compatibility mode')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const data = safeJsonParse(
        opts.data,
        '--data'
      ) as EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
      const path = opts.path || "m/44'/60'/0'/0/0";
      const result = await sdk.evmSignTypedData(params.connectId || '', params.deviceId || '', {
        path,
        metamaskV4Compat: opts.metamaskV4Compat,
        data,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('sign-psbt')
  .description('Sign a Bitcoin PSBT (Pro/Classic1s only, requires device confirmation)')
  .requiredOption('--psbt <hex>', 'Hex-encoded PSBT data')
  .option('--coin <coin>', 'Bitcoin network: btc, ltc, etc.', 'btc')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.btcSignPsbt(params.connectId || '', params.deviceId || '', {
        psbt: opts.psbt,
        coin: opts.coin,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('verify-message')
  .description('Verify a signed message on-device (BTC, EVM, Starcoin)')
  .requiredOption('--chain <chain>', 'Target blockchain (btc, evm, starcoin)')
  .requiredOption('--address <addr>', 'Signer address')
  .requiredOption('--message <msg>', 'Original message')
  .requiredOption('--signature <sig>', 'Signature to verify')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const cid = params.connectId || '';
      const did = params.deviceId || '';
      let result: unknown;
      switch (opts.chain.toLowerCase()) {
        case 'evm':
        case 'eth':
        case 'ethereum':
          result = await sdk.evmVerifyMessage(cid, did, {
            address: opts.address,
            messageHex: opts.message,
            signature: opts.signature,
            ...params,
          });
          break;
        case 'btc':
        case 'bitcoin':
          result = await sdk.btcVerifyMessage(cid, did, {
            address: opts.address,
            messageHex: opts.message,
            signature: opts.signature,
            coin: 'btc',
            ...params,
          });
          break;
        case 'starcoin':
        case 'stc':
          result = await sdk.starcoinVerifyMessage(cid, did, {
            publicKey: opts.address,
            messageHex: opts.message,
            signature: opts.signature,
            ...params,
          });
          break;
        default:
          throw new Error(
            `verifyMessage not supported for chain: ${opts.chain}. Supported: evm, btc, starcoin`
          );
      }
      outputResult(globalOpts, result);
    })
  );

program
  .command('batch-get-address')
  .description('Get addresses for multiple chains/paths in a single session')
  .requiredOption('--bundle <json>', 'JSON array of {chain, path, showOnDevice}')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const bundle = safeJsonParse(opts.bundle, '--bundle') as Array<{
        chain: string;
        path?: string;
        showOnDevice?: boolean;
      }>;
      const result = await resolveBatchGetAddress(sdk, {
        bundle,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

// ============================================================
// Chain-Specific Commands
// ============================================================

program
  .command('evm-sign-eip712')
  .description('Sign EIP-712 message by domain/message hash (EVM, requires device confirmation)')
  .requiredOption('--domain-hash <hex>', 'EIP-712 domain separator hash')
  .requiredOption('--message-hash <hex>', 'EIP-712 message hash')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/60'/0'/0/0")
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.evmSignMessageEIP712(params.connectId || '', params.deviceId || '', {
        path: opts.path,
        domainHash: opts.domainHash,
        messageHash: opts.messageHash,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('sol-sign-offchain')
  .description('Sign a Solana off-chain message (requires device confirmation)')
  .requiredOption('--message-hex <hex>', 'Off-chain message as hex')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/501'/0'/0'")
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.solSignOffchainMessage(
        params.connectId || '',
        params.deviceId || '',
        {
          path: opts.path,
          messageHex: opts.messageHex,
          ...params,
        }
      );
      outputResult(globalOpts, result);
    })
  );

program
  .command('nostr-encrypt')
  .description('Encrypt a message for a Nostr recipient')
  .requiredOption('--pubkey <hex>', 'Recipient Nostr public key')
  .requiredOption('--plaintext <text>', 'Message to encrypt')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/1237'/0'/0/0")
  .option('--show-on-device <bool>', 'Display on device', 'false')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.nostrEncryptMessage(params.connectId || '', params.deviceId || '', {
        path: opts.path,
        pubkey: opts.pubkey,
        plaintext: opts.plaintext,
        showOnOneKey: opts.showOnDevice === 'true',
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('nostr-decrypt')
  .description('Decrypt a Nostr encrypted message')
  .requiredOption('--pubkey <hex>', 'Sender Nostr public key')
  .requiredOption('--ciphertext <text>', 'Encrypted message')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/1237'/0'/0/0")
  .option('--show-on-device <bool>', 'Display on device', 'false')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.nostrDecryptMessage(params.connectId || '', params.deviceId || '', {
        path: opts.path,
        pubkey: opts.pubkey,
        ciphertext: opts.ciphertext,
        showOnOneKey: opts.showOnDevice === 'true',
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('nostr-sign-schnorr')
  .description('Sign a Schnorr signature for Nostr')
  .requiredOption('--hash <hex>', 'Hash to sign (hex)')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/1237'/0'/0/0")
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.nostrSignSchnorr(params.connectId || '', params.deviceId || '', {
        path: opts.path,
        hash: opts.hash,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('lnurl-auth')
  .description('Authenticate with LNURL (Lightning Network)')
  .requiredOption('--domain <domain>', 'Service domain')
  .requiredOption('--k1 <hex>', 'Challenge k1 parameter')
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.lnurlAuth(params.connectId || '', params.deviceId || '', {
        domain: opts.domain,
        k1: opts.k1,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('conflux-sign-cip23')
  .description('Sign a Conflux CIP-23 structured message')
  .requiredOption('--domain-hash <hex>', 'CIP-23 domain hash')
  .requiredOption('--message-hash <hex>', 'CIP-23 message hash')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/503'/0'/0/0")
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.confluxSignMessageCIP23(
        params.connectId || '',
        params.deviceId || '',
        {
          path: opts.path,
          domainHash: opts.domainHash,
          messageHash: opts.messageHash,
          ...params,
        }
      );
      outputResult(globalOpts, result);
    })
  );

program
  .command('aptos-sign-in')
  .description('Sign an Aptos sign-in message')
  .requiredOption('--payload <text>', 'Sign-in payload string')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/637'/0'/0'/0'")
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.aptosSignInMessage(params.connectId || '', params.deviceId || '', {
        path: opts.path,
        payload: opts.payload,
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('ton-sign-proof')
  .description('Sign a TON proof (for wallet authentication)')
  .requiredOption('--appdomain <domain>', 'Application domain')
  .requiredOption('--expire-at <timestamp>', 'Proof expiration timestamp')
  .option('--comment <text>', 'Optional comment')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/607'/0'")
  .action(opts =>
    runCommand({ needsSession: true }, async ({ sdk, globalOpts, params }) => {
      const result = await sdk.tonSignProof(params.connectId || '', params.deviceId || '', {
        path: opts.path,
        appdomain: opts.appdomain,
        expireAt: safeParseInt(opts.expireAt, '--expire-at'),
        ...(opts.comment ? { comment: opts.comment } : {}),
        ...params,
      });
      outputResult(globalOpts, result);
    })
  );

// ============================================================
// Firmware Commands
// ============================================================

program
  .command('firmware-check')
  .description('Check if firmware updates are available')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.checkFirmwareRelease(globalOpts.connectId);
      outputResult(globalOpts, result);
    })
  );

program
  .command('firmware-check-all')
  .description('Check all firmware components (system, BLE, bootloader)')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.checkAllFirmwareRelease(globalOpts.connectId);
      outputResult(globalOpts, result);
    })
  );

program
  .command('firmware-update')
  .description('Firmware update is not supported via CLI')
  .action(() =>
    respondAndExit({
      success: false,
      payload: {
        error:
          'Firmware update via CLI is not supported. Please use the OneKey App or https://firmware.onekey.so/ to update firmware.',
        code: 'FIRMWARE_UPDATE_NOT_SUPPORTED',
      },
    })
  );

program
  .command('firmware-update-ble')
  .description('BLE firmware update is not supported via CLI')
  .action(() =>
    respondAndExit({
      success: false,
      payload: {
        error:
          'BLE firmware update via CLI is not supported. Please use the OneKey App or https://firmware.onekey.so/ to update firmware.',
        code: 'FIRMWARE_UPDATE_NOT_SUPPORTED',
      },
    })
  );

program
  .command('bootloader-check')
  .description('Check bootloader version and status')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.checkBootloaderRelease(globalOpts.connectId);
      outputResult(globalOpts, result);
    })
  );

// ============================================================
// Security / Management Commands
// ============================================================

program
  .command('change-pin')
  .description('Change or set the device PIN code')
  .option('--remove', 'Remove PIN protection instead of changing')
  .action(opts =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.deviceChangePin(globalOpts.connectId, {
        remove: opts.remove ?? false,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('passphrase-state')
  .description('Get current passphrase state (for hidden wallet session management)')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.getPassphraseState(globalOpts.connectId, {
        useEmptyPassphrase: globalOpts.useEmptyPassphrase,
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('toggle-passphrase')
  .description('Enable or disable passphrase (hidden wallet) protection')
  .requiredOption('--enable <bool>', 'true to enable, false to disable')
  .action(opts =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.deviceSettings(globalOpts.connectId, {
        usePassphrase: opts.enable === 'true',
      });
      outputResult(globalOpts, result);
    })
  );

program
  .command('device-wipe')
  .description('Factory reset — erase ALL data (IRREVERSIBLE, requires --yes)')
  .option('--yes', 'Confirm factory reset (required)')
  .action(opts => {
    if (!opts.yes) {
      respondAndExit({
        success: false,
        payload: {
          error: 'Factory reset requires --yes flag to confirm. This operation is IRREVERSIBLE.',
          code: 'CONFIRMATION_REQUIRED',
        },
      });
      return;
    }
    return runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.deviceWipe(globalOpts.connectId);
      outputResult(globalOpts, result);
    });
  });

program
  .command('device-settings')
  .description('Update device label and settings')
  .option('--label <name>', 'Device display name')
  .option('--auto-lock-delay <seconds>', 'Auto-lock timeout in seconds (0 = disabled)')
  .option('--language <lang>', 'Device language')
  .option('--passphrase-always-on-device <bool>', 'Always enter passphrase on device')
  .option('--haptic-feedback <bool>', 'Enable/disable haptic feedback')
  .option('--auto-shutdown-delay <seconds>', 'Auto shutdown timeout in seconds')
  .action(opts =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      // Map CLI options to SDK param names (camelCase → snake_case handled by SDK)
      // Reference: packages/core/src/api/device/DeviceSettings.ts
      const settings: Record<string, unknown> = {};
      if (opts.label !== undefined) settings.label = opts.label;
      if (opts.autoLockDelay !== undefined)
        settings.autoLockDelayMs = safeParseInt(opts.autoLockDelay, '--auto-lock-delay') * 1000;
      if (opts.language !== undefined) settings.language = opts.language;
      if (opts.passphraseAlwaysOnDevice !== undefined)
        settings.passphraseAlwaysOnDevice = opts.passphraseAlwaysOnDevice === 'true';
      if (opts.hapticFeedback !== undefined)
        settings.hapticFeedback = opts.hapticFeedback === 'true';
      if (opts.autoShutdownDelay !== undefined)
        settings.autoShutdownDelayMs =
          safeParseInt(opts.autoShutdownDelay, '--auto-shutdown-delay') * 1000;

      if (Object.keys(settings).length === 0) {
        outputResult(globalOpts, {
          success: false,
          error: 'No settings provided. Use --label, --auto-lock-delay, --language, etc.',
        });
        return;
      }

      const result = await sdk.deviceSettings(globalOpts.connectId, settings);
      outputResult(globalOpts, result);
    })
  );

program
  .command('device-verify')
  .description('Verify device is genuine OneKey hardware')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.deviceVerify(globalOpts.connectId, { dataHex: '' });
      outputResult(globalOpts, result);
    })
  );

program
  .command('lock')
  .description('Lock the device')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const result = await sdk.deviceLock(globalOpts.connectId, {});
      outputResult(globalOpts, result);
    })
  );

// ============================================================
// Session Management Commands
// ============================================================

const sessionCmd = program.command('session').description('Manage device passphrase session cache');

sessionCmd
  .command('connect')
  .description('Connect device and establish passphrase session (cached for subsequent commands)')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      // 1. Search for device
      const searchResult = await sdk.searchDevices();
      if (!searchResult?.success || !searchResult.payload?.length) {
        outputResult(globalOpts, {
          success: false,
          payload: { error: 'No device found', code: 'NO_DEVICE' },
        });
        return;
      }
      const device = searchResult.payload[0] as EnrichedSearchDevice;
      const connectId = device.connectId || globalOpts.connectId;

      // 2. Unlock if locked — getPassphraseState below talks to a live
      // device session, which a locked device will reject with an obscure
      // error. Uses the same PinInvalid retry policy as prepareSession.
      if (device.features?.unlocked === false) {
        process.stderr.write('[onekey-hw] Device is locked. Unlocking (PIN required)...\n');
        await unlockWithRetry(sdk, connectId);
      }

      // 3. Get passphraseState (triggers 1/2/3 selection)
      const psResult = await sdk.getPassphraseState(connectId, {
        initSession: true,
        useEmptyPassphrase: false,
      });
      if (!psResult.success) {
        outputResult(globalOpts, psResult);
        return;
      }
      const { passphraseState, sessionId: passphraseSessionId } = extractPassphraseSession(
        psResult.payload
      );
      if (!passphraseState) {
        outputResult(globalOpts, {
          success: false,
          payload: { error: 'getPassphraseState did not return passphraseState' },
        });
        return;
      }

      // 4. Get address to verify + extract deviceId
      const addrResult = await sdk.evmGetAddress(connectId, device.deviceId || '', {
        path: "m/44'/60'/0'/0/0",
        showOnOneKey: false,
        passphraseState,
      });

      // 5. Fetch the now-active session_id via getFeatures.
      //
      // IMPORTANT: pass `passphraseState` here. Without it, the SDK's
      // connectStateChange guard (core/index.ts) would see the payload's
      // passphraseState flip from mnNy → undefined, clear the cached Device,
      // and call Initialize again with no passphrase_state / no session_id.
      // That Initialize resets the device to the standard wallet and returns
      // a *standard-wallet* session_id — which we'd then save in the keychain
      // paired with the hidden-wallet passphraseState. On the next CLI run
      // the mismatch would trigger PassphraseRequest (1/2/3 again).
      const featResult = await sdk.getFeatures(connectId, {
        passphraseState,
        skipPassphraseCheck: true,
      });
      const featPayload = featResult?.success ? featResult.payload : undefined;
      const deviceId = featPayload?.device_id || device.deviceId || '';
      const sessionId = passphraseSessionId || featPayload?.session_id || '';

      // 6. Save to keychain
      if (passphraseState && deviceId && sessionId) {
        await saveSessionToKeychain(deviceId, passphraseState, sessionId);
      }

      outputResult(globalOpts, {
        success: true,
        payload: {
          passphraseState,
          deviceId,
          ...(sessionId ? { sessionId } : {}),
          ...(addrResult?.success ? { address: addrResult.payload.address } : {}),
        },
      });
    })
  );

sessionCmd
  .command('disconnect')
  .description('Clear cached device session')
  .action(() =>
    runCommand({}, async ({ sdk, globalOpts }) => {
      const searchResult = await sdk.searchDevices();
      const device = // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        (searchResult?.payload as any)?.[0];
      const deviceId = device?.features?.device_id || device?.deviceId;
      if (deviceId) {
        await clearSessionFromKeychain(deviceId);
      }
      outputResult(globalOpts, {
        success: true,
        payload: deviceId ? { deviceId } : {},
      });
    })
  );

// ============================================================
// Helpers
// ============================================================

/**
 * Extract common device params from global CLI options.
 * These are passed to every SDK method call.
 *
 * skipPassphraseCheck is always true because:
 * - prepareSession handles passphrase selection (1/2/3 + pinentry/device)
 * - Without it, SDK's checkPassphraseStateSafety triggers a SECOND
 *   REQUEST_PASSPHRASE (double prompt) even when passphraseState is set
 * - Error 114 (no passphrase state) is also bypassed — our interactive
 *   handler in REQUEST_PASSPHRASE handles it correctly
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCommonParams(globalOpts: Record<string, any>) {
  return {
    connectId: globalOpts.connectId,
    deviceId: globalOpts.deviceId,
    passphraseState: globalOpts.passphraseState,
    useEmptyPassphrase: globalOpts.useEmptyPassphrase,
    skipPassphraseCheck: true,
  };
}

/**
 * HardwareErrorCode.PinInvalid from @onekeyfe/hd-shared. Duplicated here
 * to avoid pulling the shared package's runtime just for one enum value.
 * (PinCancelled is 802 — we don't retry it, any non-PinInvalid failure
 * falls through to the "bail out" branch below.)
 */
const HW_ERR_PIN_INVALID = 801;

/**
 * Unlock a locked device, retrying up to `maxAttempts` times on
 * `PinInvalid`. On `PinCancelled` or any other failure, throws immediately
 * so the structured error surfaces to the user via runCommand's catch.
 *
 * With `@@ONEKEY_INPUT_PIN_IN_DEVICE` semantics the device firmware
 * normally loops PIN entry internally and only reports back on success
 * or cancel. Retrying here is defensive: if the device ever surfaces
 * `PinInvalid` directly (older firmware, specific models), give the
 * user another chance without forcing a re-run of the whole command.
 */
async function unlockWithRetry(
  sdk: typeof import('@onekeyfe/hd-common-connect-sdk').default,
  connectId: string,
  maxAttempts = 3
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}> {
  let lastPayload: { error?: string; code?: number | string } = {};
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await sdk.deviceUnlock(connectId, {});
    if (result?.success && result.payload) {
      return { payload: result.payload };
    }
    lastPayload = (result?.payload ?? {}) as {
      error?: string;
      code?: number | string;
    };
    const { code } = lastPayload;
    const isPinInvalid = code === HW_ERR_PIN_INVALID;
    if (!isPinInvalid || attempt >= maxAttempts) {
      // PinCancelled, other error, or PinInvalid on the last attempt — bail out
      const err = new Error(`Device unlock failed: ${lastPayload.error ?? 'unknown error'}`);
      (err as Error & { code?: number | string }).code = code ?? 'UNLOCK_FAILED';
      throw err;
    }
    process.stderr.write(
      `[onekey-hw] Invalid PIN. Retry on your device (attempt ${attempt + 1}/${maxAttempts}).\n`
    );
  }
  // Unreachable — the loop either returns or throws
  throw new Error('Device unlock failed: retry loop exited without a result');
}

/**
 * Prepare passphrase session before SDK calls.
 *
 * 1. If --use-empty-passphrase or --passphrase-state provided → use as-is
 * 2. Try keychain → preloadSessionCache → use cached session
 * 3. Keychain miss → getPassphraseState (triggers 1/2/3 prompt) → save to keychain
 *
 * After this, globalOpts.passphraseState is set and getCommonParams will include it.
 */
async function prepareSession(
  sdk: typeof import('@onekeyfe/hd-common-connect-sdk').default,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalOpts: Record<string, any>
): Promise<string | undefined> {
  // Skip if standard wallet or passphraseState already provided
  if (globalOpts.useEmptyPassphrase || globalOpts.passphraseState) {
    return globalOpts.passphraseState;
  }

  // Errors from the SDK calls below (PIN cancelled, transport broken,
  // getPassphraseState rejection) intentionally propagate to runCommand's
  // catch block, which renders them as structured `{ success: false,
  // payload: { error, code } }` output instead of silently falling through
  // to a confusing downstream error 112 / 114.

  // ── Step 1: Discover device ──────────────────────────────────────
  const searchResult = await sdk.searchDevices();
  if (
    !searchResult?.success ||
    !Array.isArray(searchResult.payload) ||
    searchResult.payload.length === 0
  ) {
    return undefined;
  }

  const device = searchResult.payload[0] as {
    connectId?: string;
    deviceId?: string;
    features?: {
      device_id?: string;
      onekey_device_type?: string;
      session_id?: string;
      passphrase_protection?: boolean | null;
      unlocked?: boolean | null;
    };
  };
  const connectId = device.connectId || globalOpts.connectId || '';
  if (!globalOpts.connectId && connectId) {
    globalOpts.connectId = connectId;
  }

  // ── Step 2: Get features if searchDevices didn't populate them ──
  // getFeatures failures here are non-fatal — we fall through to Step 3
  // which will fail with a clearer error if the device is truly unreachable.
  let deviceId = device.features?.device_id || device.deviceId || '';
  let deviceType = device.features?.onekey_device_type;
  let unlocked = device.features?.unlocked;
  let passphraseProtection = device.features?.passphrase_protection;

  if (!deviceId || unlocked == null || passphraseProtection == null) {
    try {
      const featResult = await sdk.getFeatures(connectId);
      if (featResult?.success && featResult.payload) {
        deviceId = featResult.payload.device_id || deviceId;
        deviceType = featResult.payload.onekey_device_type || deviceType;
        unlocked = featResult.payload.unlocked;
        passphraseProtection = featResult.payload.passphrase_protection;
      }
    } catch {
      /* non-fatal — Step 3 will surface a clear error if device is gone */
    }
  }

  // ── Step 3: Unlock if locked (matches app-monorepo ServiceHardware flow) ──
  // Track whether device was locked — locking invalidates passphrase sessions,
  // so keychain session reuse is only possible if device was already unlocked.
  // PinInvalid retries inside unlockWithRetry; PinCancelled/other failures
  // throw and propagate to runCommand's catch for structured output.
  const wasLocked = unlocked === false;
  if (wasLocked) {
    process.stderr.write('[onekey-hw] Device is locked. Unlocking (PIN required)...\n');
    const { payload: feat } = await unlockWithRetry(sdk, connectId);
    deviceId = feat.device_id || deviceId;
    unlocked = feat.unlocked;
    passphraseProtection = feat.passphrase_protection;
  }

  if (!globalOpts.deviceId && deviceId) {
    globalOpts.deviceId = deviceId;
  }

  // ── Step 4: Check passphrase protection ──────────────────────────
  if (passphraseProtection === false && deviceType !== 'pro2' && deviceType !== 'PRO2') {
    return undefined;
  }

  // ── Step 5: Try keychain session reuse ───────────────────────────
  // Only attempt if device was already unlocked — locking invalidates
  // all passphrase sessions, so cached session_id is useless after unlock.
  if (!wasLocked && deviceId) {
    const cached = await preloadSessionFromKeychain(deviceId);
    if (cached) {
      globalOpts.passphraseState = cached;
      return cached;
    }
  }

  // ── Step 6: Keychain miss → getPassphraseState (triggers 1/2/3 prompt) ──
  const psResult = await sdk.getPassphraseState(connectId, {
    initSession: true,
    useEmptyPassphrase: false,
  });

  if (psResult.success && psResult.payload) {
    const { passphraseState, sessionId: passphraseSessionId } = extractPassphraseSession(
      psResult.payload
    );
    if (!passphraseState) {
      return undefined;
    }
    globalOpts.passphraseState = passphraseState;

    // Save session to keychain for next invocation.
    //
    // Pass passphraseState to keep connectStateChange=false — otherwise
    // Initialize would be re-run without passphrase_state, resetting the
    // device to the standard wallet and returning a mismatched session_id.
    // See the matching comment in `session connect`.
    if (deviceId) {
      const featAfter = await sdk.getFeatures(connectId, {
        passphraseState,
        skipPassphraseCheck: true,
      });
      const sessionId =
        passphraseSessionId || (featAfter?.success ? featAfter.payload?.session_id : undefined);
      if (sessionId) {
        await saveSessionToKeychain(deviceId, passphraseState, sessionId);
        await preloadSessionFromKeychain(deviceId);
      }
    }

    return passphraseState;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function outputResult(_globalOpts: Record<string, any>, result: unknown): void {
  console.log(JSON.stringify(result, null, 2));
  if (
    result &&
    typeof result === 'object' &&
    'success' in result &&
    !(result as { success: boolean }).success
  ) {
    process.exitCode = 1;
  }
  // No process.exit here — runCommand() below handles dispose + exit so SDK
  // async cleanup (USB release, event listener teardown) finishes first.
}

/**
 * Unified command runner. All `.action(...)` handlers should wrap their body
 * in this helper so every command goes through the same lifecycle:
 *
 *   1. (optional) create SDK
 *   2. (optional) prepareSession — unlock + keychain preload + passphraseState
 *   3. run the handler (which calls outputResult on success)
 *   4. report uncaught errors as a structured failure result
 *   5. dispose SDK
 *   6. drain event loop and process.exit with the right code
 *
 * This fixes three previous bugs:
 *   - Most signing commands skipped prepareSession, so keychain sessions
 *     were never actually reused.
 *   - outputResult scheduled process.exit(200ms) before dispose completed,
 *     racing USB release on slower transports.
 *   - Errors thrown from SDK calls leaked as stack traces instead of the
 *     CLI's structured `{ success: false, payload: { error } }` shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySdk = Awaited<ReturnType<typeof createSDK>>;

interface CommandContext {
  sdk: AnySdk;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalOpts: Record<string, any>;
  params: ReturnType<typeof getCommonParams>;
}

async function runCommand(
  options: { needsSession?: boolean },
  handler: (ctx: CommandContext) => Promise<void>
): Promise<void> {
  const globalOpts = program.opts();
  try {
    const sdk = await createSDK(globalOpts);
    if (options.needsSession) {
      await prepareSession(sdk, globalOpts);
    }
    await handler({
      sdk,
      globalOpts,
      params: getCommonParams(globalOpts),
    });
  } catch (err) {
    const code = (err as Error & { code?: string }).code || 'COMMAND_FAILED';
    outputResult(globalOpts, {
      success: false,
      payload: {
        error: err instanceof Error ? err.message : String(err),
        code,
      },
    });
  } finally {
    // Singleton disposer — awaits the SDK, calls dispose, clears the
    // promise reference. Idempotent, safe to call even if init failed.
    await disposeSDK();
  }
  // SDK event listeners can keep the event loop alive after dispose.
  // setImmediate lets any trailing stdout/stderr writes flush first.
  setImmediate(() => process.exit(process.exitCode ?? 0));
}

/** For commands that don't touch the SDK at all (e.g. firmware-update stubs). */
function respondAndExit(result: unknown): void {
  outputResult({}, result);
  setImmediate(() => process.exit(process.exitCode ?? 0));
}

/**
 * Safe JSON.parse. Throws on failure — runCommand() catches and renders
 * the structured error so the SDK still gets disposed cleanly.
 */
function safeJsonParse(input: string, label: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    const err = new Error(`Invalid JSON for ${label}: ${input.slice(0, 100)}`);
    (err as Error & { code?: string }).code = 'INVALID_JSON';
    throw err;
  }
}

/**
 * #9 FIX: Safe parseInt with NaN check
 */
function safeParseInt(input: string, label: string): number {
  const num = parseInt(input, 10);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid number for ${label}: "${input}"`);
  }
  return num;
}

program.parse();
