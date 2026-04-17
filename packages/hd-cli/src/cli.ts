import { Command } from 'commander';

import { createSDK } from './sdk';
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
  .action(async () => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
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
    } finally {
      sdk.dispose();
    }
  });

// ============================================================
// Signing Commands
// ============================================================

program
  .command('get-address')
  .description('Get a cryptocurrency address from the hardware wallet')
  .requiredOption('--chain <chain>', 'Target blockchain (evm, btc, sol, ...)')
  .option('--path <path>', 'BIP44 derivation path')
  .option('--show-on-device <bool>', 'Display address on device for verification', 'true')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      await prepareSession(sdk, globalOpts);
      const result = await resolveGetAddress(sdk, {
        chain: opts.chain,
        path: opts.path,
        showOnDevice: opts.showOnDevice === 'true',
        ...getCommonParams(globalOpts),
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('get-public-key')
  .description('Get public key from the hardware wallet')
  .requiredOption('--chain <chain>', 'Target blockchain')
  .option('--path <path>', 'BIP44 derivation path')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await resolveGetPublicKey(sdk, {
        chain: opts.chain,
        path: opts.path,
        ...getCommonParams(globalOpts),
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('sign-transaction')
  .description('Sign a blockchain transaction (requires device confirmation)')
  .requiredOption('--chain <chain>', 'Target blockchain')
  .requiredOption('--tx <json>', 'Transaction data (JSON)')
  .option('--path <path>', 'BIP44 derivation path')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const tx = safeJsonParse(opts.tx, '--tx') as Record<string, unknown>;
      const result = await resolveSignTransaction(sdk, {
        chain: opts.chain,
        path: opts.path,
        transaction: tx,
        ...getCommonParams(globalOpts),
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('sign-message')
  .description('Sign a message (requires device confirmation)')
  .requiredOption('--chain <chain>', 'Target blockchain')
  .requiredOption('--message <msg>', 'Message to sign')
  .option('--path <path>', 'BIP44 derivation path')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await resolveSignMessage(sdk, {
        chain: opts.chain,
        path: opts.path,
        message: opts.message,
        ...getCommonParams(globalOpts),
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('sign-typed-data')
  .description('Sign EIP-712 typed data (EVM only, requires device confirmation)')
  .requiredOption('--data <json>', 'EIP-712 typed data JSON')
  .option('--path <path>', 'BIP44 derivation path')
  .option('--no-metamask-v4-compat', 'Disable MetaMask V4 compatibility mode')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const data = safeJsonParse(
        opts.data,
        '--data'
      ) as EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
      const params = getCommonParams(globalOpts);
      const path = opts.path || "m/44'/60'/0'/0/0";
      const result = await sdk.evmSignTypedData(params.connectId || '', params.deviceId || '', {
        path,
        metamaskV4Compat: opts.metamaskV4Compat,
        data,
        ...params,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('sign-psbt')
  .description('Sign a Bitcoin PSBT (Pro/Classic1s only, requires device confirmation)')
  .requiredOption('--psbt <hex>', 'Hex-encoded PSBT data')
  .option('--coin <coin>', 'Bitcoin network: btc, ltc, etc.', 'btc')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const params = getCommonParams(globalOpts);
      const result = await sdk.btcSignPsbt(params.connectId || '', params.deviceId || '', {
        psbt: opts.psbt,
        coin: opts.coin,
        ...params,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('verify-message')
  .description('Verify a signed message on-device (BTC, EVM, Starcoin)')
  .requiredOption('--chain <chain>', 'Target blockchain (btc, evm, starcoin)')
  .requiredOption('--address <addr>', 'Signer address')
  .requiredOption('--message <msg>', 'Original message')
  .requiredOption('--signature <sig>', 'Signature to verify')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const params = getCommonParams(globalOpts);
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
          });
          break;
        case 'btc':
        case 'bitcoin':
          result = await sdk.btcVerifyMessage(cid, did, {
            address: opts.address,
            messageHex: opts.message,
            signature: opts.signature,
            coin: 'btc',
          });
          break;
        case 'starcoin':
        case 'stc':
          result = await sdk.starcoinVerifyMessage(cid, did, {
            publicKey: opts.address,
            messageHex: opts.message,
            signature: opts.signature,
          });
          break;
        default:
          throw new Error(
            `verifyMessage not supported for chain: ${opts.chain}. Supported: evm, btc, starcoin`
          );
      }
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('batch-get-address')
  .description('Get addresses for multiple chains/paths in a single session')
  .requiredOption('--bundle <json>', 'JSON array of {chain, path, showOnDevice}')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const bundle = safeJsonParse(opts.bundle, '--bundle') as Array<{
        chain: string;
        path?: string;
        showOnDevice?: boolean;
      }>;
      const result = await resolveBatchGetAddress(sdk, {
        bundle,
        ...getCommonParams(globalOpts),
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

// ============================================================
// Chain-Specific Commands
// ============================================================

program
  .command('evm-sign-eip712')
  .description('Sign EIP-712 message by domain/message hash (EVM, requires device confirmation)')
  .requiredOption('--domain-hash <hex>', 'EIP-712 domain separator hash')
  .requiredOption('--message-hash <hex>', 'EIP-712 message hash')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/60'/0'/0/0")
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const p = getCommonParams(globalOpts);
      const result = await sdk.evmSignMessageEIP712(p.connectId || '', p.deviceId || '', {
        path: opts.path,
        domainHash: opts.domainHash,
        messageHash: opts.messageHash,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('sol-sign-offchain')
  .description('Sign a Solana off-chain message (requires device confirmation)')
  .requiredOption('--message-hex <hex>', 'Off-chain message as hex')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/501'/0'/0'")
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const p = getCommonParams(globalOpts);
      const result = await sdk.solSignOffchainMessage(p.connectId || '', p.deviceId || '', {
        path: opts.path,
        messageHex: opts.messageHex,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('nostr-encrypt')
  .description('Encrypt a message for a Nostr recipient')
  .requiredOption('--pubkey <hex>', 'Recipient Nostr public key')
  .requiredOption('--plaintext <text>', 'Message to encrypt')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/1237'/0'/0/0")
  .option('--show-on-device <bool>', 'Display on device', 'false')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const p = getCommonParams(globalOpts);
      const result = await sdk.nostrEncryptMessage(p.connectId || '', p.deviceId || '', {
        path: opts.path,
        pubkey: opts.pubkey,
        plaintext: opts.plaintext,
        showOnOneKey: opts.showOnDevice === 'true',
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('nostr-decrypt')
  .description('Decrypt a Nostr encrypted message')
  .requiredOption('--pubkey <hex>', 'Sender Nostr public key')
  .requiredOption('--ciphertext <text>', 'Encrypted message')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/1237'/0'/0/0")
  .option('--show-on-device <bool>', 'Display on device', 'false')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const p = getCommonParams(globalOpts);
      const result = await sdk.nostrDecryptMessage(p.connectId || '', p.deviceId || '', {
        path: opts.path,
        pubkey: opts.pubkey,
        ciphertext: opts.ciphertext,
        showOnOneKey: opts.showOnDevice === 'true',
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('nostr-sign-schnorr')
  .description('Sign a Schnorr signature for Nostr')
  .requiredOption('--hash <hex>', 'Hash to sign (hex)')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/1237'/0'/0/0")
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const p = getCommonParams(globalOpts);
      const result = await sdk.nostrSignSchnorr(p.connectId || '', p.deviceId || '', {
        path: opts.path,
        hash: opts.hash,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('lnurl-auth')
  .description('Authenticate with LNURL (Lightning Network)')
  .requiredOption('--domain <domain>', 'Service domain')
  .requiredOption('--k1 <hex>', 'Challenge k1 parameter')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const p = getCommonParams(globalOpts);
      const result = await sdk.lnurlAuth(p.connectId || '', p.deviceId || '', {
        domain: opts.domain,
        k1: opts.k1,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('conflux-sign-cip23')
  .description('Sign a Conflux CIP-23 structured message')
  .requiredOption('--domain-hash <hex>', 'CIP-23 domain hash')
  .requiredOption('--message-hash <hex>', 'CIP-23 message hash')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/503'/0'/0/0")
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const p = getCommonParams(globalOpts);
      const result = await sdk.confluxSignMessageCIP23(p.connectId || '', p.deviceId || '', {
        path: opts.path,
        domainHash: opts.domainHash,
        messageHash: opts.messageHash,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('aptos-sign-in')
  .description('Sign an Aptos sign-in message')
  .requiredOption('--payload <text>', 'Sign-in payload string')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/637'/0'/0'/0'")
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const p = getCommonParams(globalOpts);
      const result = await sdk.aptosSignInMessage(p.connectId || '', p.deviceId || '', {
        path: opts.path,
        payload: opts.payload,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('ton-sign-proof')
  .description('Sign a TON proof (for wallet authentication)')
  .requiredOption('--appdomain <domain>', 'Application domain')
  .requiredOption('--expire-at <timestamp>', 'Proof expiration timestamp')
  .option('--comment <text>', 'Optional comment')
  .option('--path <path>', 'BIP44 derivation path', "m/44'/607'/0'")
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const p = getCommonParams(globalOpts);
      const result = await sdk.tonSignProof(p.connectId || '', p.deviceId || '', {
        path: opts.path,
        appdomain: opts.appdomain,
        expireAt: safeParseInt(opts.expireAt, '--expire-at'),
        ...(opts.comment ? { comment: opts.comment } : {}),
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

// ============================================================
// Firmware Commands
// ============================================================

program
  .command('firmware-check')
  .description('Check if firmware updates are available')
  .action(async () => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.checkFirmwareRelease(globalOpts.connectId);
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('firmware-check-all')
  .description('Check all firmware components (system, BLE, bootloader)')
  .action(async () => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.checkAllFirmwareRelease(globalOpts.connectId);
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('firmware-update')
  .description('Firmware update is not supported via CLI')
  .action(() => {
    outputResult(program.opts(), {
      success: false,
      payload: {
        error:
          'Firmware update via CLI is not supported. Please use the OneKey App or https://firmware.onekey.so/ to update firmware.',
        code: 'FIRMWARE_UPDATE_NOT_SUPPORTED',
      },
    });
  });

program
  .command('firmware-update-ble')
  .description('BLE firmware update is not supported via CLI')
  .action(() => {
    outputResult(program.opts(), {
      success: false,
      payload: {
        error:
          'BLE firmware update via CLI is not supported. Please use the OneKey App or https://firmware.onekey.so/ to update firmware.',
        code: 'FIRMWARE_UPDATE_NOT_SUPPORTED',
      },
    });
  });

program
  .command('bootloader-check')
  .description('Check bootloader version and status')
  .action(async () => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.checkBootloaderRelease(globalOpts.connectId);
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

// ============================================================
// Security / Management Commands
// ============================================================

program
  .command('change-pin')
  .description('Change or set the device PIN code')
  .option('--remove', 'Remove PIN protection instead of changing')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceChangePin(globalOpts.connectId, {
        remove: opts.remove ?? false,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('passphrase-state')
  .description('Get current passphrase state (for hidden wallet session management)')
  .action(async () => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.getPassphraseState(globalOpts.connectId, {
        useEmptyPassphrase: globalOpts.useEmptyPassphrase,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('toggle-passphrase')
  .description('Enable or disable passphrase (hidden wallet) protection')
  .requiredOption('--enable <bool>', 'true to enable, false to disable')
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceSettings(globalOpts.connectId, {
        usePassphrase: opts.enable === 'true',
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('device-wipe')
  .description('Factory reset — erase ALL data (IRREVERSIBLE, requires --yes)')
  .option('--yes', 'Confirm factory reset (required)')
  .action(async opts => {
    const globalOpts = program.opts();
    if (!opts.yes) {
      outputResult(globalOpts, {
        success: false,
        payload: {
          error: 'Factory reset requires --yes flag to confirm. This operation is IRREVERSIBLE.',
          code: 'CONFIRMATION_REQUIRED',
        },
      });
      return;
    }
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceWipe(globalOpts.connectId);
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
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
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
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
    } finally {
      sdk.dispose();
    }
  });

program
  .command('device-verify')
  .description('Verify device is genuine OneKey hardware')
  .action(async () => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceVerify(globalOpts.connectId, { dataHex: '' });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('lock')
  .description('Lock the device')
  .action(async () => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceLock(globalOpts.connectId, {});
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

// ============================================================
// Session Management Commands
// ============================================================

const sessionCmd = program.command('session').description('Manage device passphrase session cache');

sessionCmd
  .command('connect')
  .description('Connect device and establish passphrase session (cached for subsequent commands)')
  .action(async () => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      // 1. Search for device
      const searchResult = await sdk.searchDevices();
      if (!searchResult?.success || !searchResult.payload?.length) {
        outputResult(globalOpts, {
          success: false,
          payload: { error: 'No device found', code: 'NO_DEVICE' },
        });
        return;
      }
      const device = searchResult.payload[0];
      const connectId = device.connectId || globalOpts.connectId;

      // 2. Get passphraseState (triggers 1/2/3 selection)
      const psResult = await sdk.getPassphraseState(connectId, {
        initSession: true,
        useEmptyPassphrase: false,
      });
      if (!psResult.success) {
        outputResult(globalOpts, psResult);
        return;
      }
      const passphraseState = psResult.payload;

      // 3. Get address to verify + extract deviceId
      const addrResult = await sdk.evmGetAddress(connectId, device.deviceId || '', {
        path: "m/44'/60'/0'/0/0",
        showOnOneKey: false,
        passphraseState,
      });

      // 4. Get sessionId from features
      const featResult = await sdk.searchDevices();
      const featDevice = // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        (featResult?.payload as any)?.[0];
      const deviceId = featDevice?.features?.device_id || device.deviceId || '';
      const sessionId = featDevice?.features?.session_id || '';

      // 5. Save to keychain
      if (passphraseState && deviceId && sessionId) {
        const { saveSessionToKeychain } = await import('./session');
        await saveSessionToKeychain(deviceId, passphraseState, sessionId);
      }

      outputResult(globalOpts, {
        success: true,
        payload: {
          passphraseState,
          deviceId,
          sessionId: sessionId ? '(cached)' : '(not available)',
          address: addrResult?.success ? addrResult.payload.address : undefined,
          message: 'Device session established. Subsequent commands will reuse this session.',
        },
      });
    } finally {
      sdk.dispose();
    }
  });

sessionCmd
  .command('disconnect')
  .description('Clear cached device session')
  .action(async () => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const searchResult = await sdk.searchDevices();
      const device = // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        (searchResult?.payload as any)?.[0];
      const deviceId = device?.features?.device_id || device?.deviceId;
      if (deviceId) {
        const { clearSessionFromKeychain } = await import('./session');
        await clearSessionFromKeychain(deviceId);
      }
      outputResult(globalOpts, {
        success: true,
        payload: { message: 'Device session cleared.', deviceId: deviceId || 'unknown' },
      });
    } finally {
      sdk.dispose();
    }
  });

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

  try {
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
        session_id?: string;
        passphrase_protection?: boolean | null;
        unlocked?: boolean | null;
      };
    };
    const connectId = device.connectId || globalOpts.connectId || '';
    if (!globalOpts.connectId && connectId) {
      globalOpts.connectId = connectId;
    }

    // ── Step 2: Get features (may need getFeatures if searchDevices didn't init) ──
    let deviceId = device.features?.device_id || device.deviceId || '';
    let unlocked = device.features?.unlocked;
    let passphraseProtection = device.features?.passphrase_protection;

    if (!deviceId || unlocked == null || passphraseProtection == null) {
      try {
        const featResult = await sdk.getFeatures(connectId);
        if (featResult?.success && featResult.payload) {
          deviceId = featResult.payload.device_id || deviceId;
          unlocked = featResult.payload.unlocked;
          passphraseProtection = featResult.payload.passphrase_protection;
        }
      } catch {
        /* non-fatal */
      }
    }

    // ── Step 3: Unlock if locked (matches app-monorepo ServiceHardware flow) ──
    // Track whether device was locked — locking invalidates passphrase sessions,
    // so keychain session reuse is only possible if device was already unlocked.
    const wasLocked = unlocked === false;
    if (wasLocked) {
      process.stderr.write('[onekey-hw] Device is locked. Unlocking (PIN required)...\n');
      try {
        const unlockResult = await sdk.deviceUnlock(connectId, {});
        if (unlockResult?.success && unlockResult.payload) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const feat = unlockResult.payload as any;
          deviceId = feat.device_id || deviceId;
          unlocked = feat.unlocked;
          passphraseProtection = feat.passphrase_protection;
        }
      } catch {
        process.stderr.write('[onekey-hw] Unlock failed, continuing...\n');
      }
    }

    if (!globalOpts.deviceId && deviceId) {
      globalOpts.deviceId = deviceId;
    }

    // ── Step 4: Check passphrase protection ──────────────────────────
    if (passphraseProtection === false) {
      return undefined;
    }

    // ── Step 5: Try keychain session reuse ───────────────────────────
    // Only attempt if device was already unlocked — locking invalidates
    // all passphrase sessions, so cached session_id is useless after unlock.
    if (!wasLocked && deviceId) {
      const { preloadSessionFromKeychain } = await import('./session');
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
      const passphraseState = psResult.payload as string;
      globalOpts.passphraseState = passphraseState;

      // Save session to keychain for next invocation
      if (deviceId) {
        const freshSearch = await sdk.searchDevices();
        const freshDevice = // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          (freshSearch?.payload as any)?.[0];
        const sessionId = freshDevice?.features?.session_id;
        if (sessionId) {
          const { saveSessionToKeychain, preloadSessionFromKeychain } = await import('./session');
          await saveSessionToKeychain(deviceId, passphraseState, sessionId);
          await preloadSessionFromKeychain(deviceId);
        }
      }

      return passphraseState;
    }
  } catch {
    // Non-fatal — will use skipPassphraseCheck fallback
  }
  return undefined;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function outputResult(_globalOpts: Record<string, any>, result: unknown): void {
  // #10 FIX: Always use JSON.stringify to avoid [Object] truncation
  console.log(JSON.stringify(result, null, 2));

  // Set exit code and let event loop drain so async cleanup (USB release) can complete
  if (
    result &&
    typeof result === 'object' &&
    'success' in result &&
    !(result as { success: boolean }).success
  ) {
    process.exitCode = 1;
  }
  // Allow a short delay for async USB release, then force exit
  // (SDK event listeners would otherwise keep the process alive indefinitely)
  setTimeout(() => process.exit(process.exitCode ?? 0), 200);
}

/**
 * #6 FIX: Safe JSON.parse with structured error output
 */
function safeJsonParse(input: string, label: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    console.error(
      JSON.stringify({
        success: false,
        payload: {
          error: `Invalid JSON for ${label}: ${input.slice(0, 100)}`,
          code: 'INVALID_JSON',
        },
      })
    );
    process.exit(1);
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
