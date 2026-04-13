import { Command } from 'commander';

import { createSDK } from './sdk';
import {
  resolveBatchGetAddress,
  resolveGetAddress,
  resolveGetPublicKey,
  resolveSignMessage,
  resolveSignTransaction,
} from './chains';
import { ansi, detectAndSetMode, getMode, outputResult } from './output';

const program = new Command();

program
  .name('onekey-hw')
  .description('OneKey hardware wallet CLI for AI agent integration')
  .version('1.1.26-alpha.0');

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
program.option('--human', 'Force human-readable output (auto-detected when running in terminal)');

program.hook('preAction', () => {
  const opts = program.opts();
  detectAndSetMode({ human: opts.human });

  // Mutual exclusion: --use-empty-passphrase and --passphrase-state cannot coexist
  if (opts.useEmptyPassphrase && opts.passphraseState) {
    outputResult({
      success: false,
      payload: {
        error:
          '--use-empty-passphrase and --passphrase-state are mutually exclusive. ' +
          'Use --use-empty-passphrase for standard wallet, or --passphrase-state for hidden wallet.',
        code: 'INVALID_PARAMS',
      },
    });
  }
});

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
        for (const device of result.payload) {
          if (device.connectId) {
            try {
              const features = await sdk.getFeatures(device.connectId);
              if (features?.success && features.payload) {
                device.features = features.payload;
                device.name = features.payload.label || features.payload.ble_name || device.name;
                device.deviceType =
                  features.payload.onekey_device_type?.toLowerCase() || device.deviceType;
              }
            } catch {
              // Features fetch failed — device may need PIN, continue with basic info
            }
          }
        }
      }

      outputResult(result);
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
      const result = await resolveGetAddress(sdk, {
        chain: opts.chain,
        path: opts.path,
        showOnDevice: opts.showOnDevice === 'true',
        ...getCommonParams(globalOpts),
      });
      outputResult(result);
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
      outputResult(result);
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
      outputResult(result);
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
      outputResult(result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('sign-typed-data')
  .description('Sign EIP-712 typed data (EVM only, requires device confirmation)')
  .requiredOption('--data <json>', 'EIP-712 typed data JSON')
  .option('--path <path>', 'BIP44 derivation path')
  .option('--metamask-v4-compat', 'Use MetaMask V4 compatibility mode', true)
  .action(async opts => {
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const data = safeJsonParse(opts.data, '--data');
      const params = getCommonParams(globalOpts);
      const path = opts.path || "m/44'/60'/0'/0/0";
      const result = await sdk.evmSignTypedData(params.connectId || '', params.deviceId || '', {
        path,
        metamaskV4Compat: opts.metamaskV4Compat,
        data: data as Parameters<typeof sdk.evmSignTypedData>[2]['data'],
        useEmptyPassphrase: params.useEmptyPassphrase,
        passphraseState: params.passphraseState,
      });
      outputResult(result);
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
        useEmptyPassphrase: params.useEmptyPassphrase,
        passphraseState: params.passphraseState,
      });
      outputResult(result);
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
            useEmptyPassphrase: params.useEmptyPassphrase,
            passphraseState: params.passphraseState,
          });
          break;
        case 'btc':
        case 'bitcoin':
          result = await sdk.btcVerifyMessage(cid, did, {
            address: opts.address,
            message: opts.message,
            signature: opts.signature,
            coin: 'btc',
            useEmptyPassphrase: params.useEmptyPassphrase,
            passphraseState: params.passphraseState,
          });
          break;
        case 'starcoin':
        case 'stc':
          result = await sdk.starcoinVerifyMessage(cid, did, {
            publicKey: opts.address,
            message: opts.message,
            signature: opts.signature,
            useEmptyPassphrase: params.useEmptyPassphrase,
            passphraseState: params.passphraseState,
          });
          break;
        default:
          throw new Error(
            `verifyMessage not supported for chain: ${opts.chain}. Supported: evm, btc, starcoin`
          );
      }
      outputResult(result);
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
      outputResult(result);
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
        useEmptyPassphrase: p.useEmptyPassphrase,
        passphraseState: p.passphraseState,
      });
      outputResult(result);
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
        useEmptyPassphrase: p.useEmptyPassphrase,
        passphraseState: p.passphraseState,
      });
      outputResult(result);
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
        useEmptyPassphrase: p.useEmptyPassphrase,
        passphraseState: p.passphraseState,
      });
      outputResult(result);
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
        useEmptyPassphrase: p.useEmptyPassphrase,
        passphraseState: p.passphraseState,
      });
      outputResult(result);
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
        useEmptyPassphrase: p.useEmptyPassphrase,
        passphraseState: p.passphraseState,
      });
      outputResult(result);
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
        useEmptyPassphrase: p.useEmptyPassphrase,
        passphraseState: p.passphraseState,
      });
      outputResult(result);
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
        useEmptyPassphrase: p.useEmptyPassphrase,
        passphraseState: p.passphraseState,
      });
      outputResult(result);
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
        useEmptyPassphrase: p.useEmptyPassphrase,
        passphraseState: p.passphraseState,
      });
      outputResult(result);
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
        useEmptyPassphrase: p.useEmptyPassphrase,
        passphraseState: p.passphraseState,
      });
      outputResult(result);
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
      const params = getCommonParams(globalOpts);
      const result = await sdk.checkFirmwareRelease(params.connectId);
      outputResult(result);
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
      const params = getCommonParams(globalOpts);
      const result = await sdk.checkAllFirmwareRelease(params.connectId);
      outputResult(result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('firmware-update')
  .description('Firmware update is not supported via CLI')
  .action(() => {
    outputResult({
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
    outputResult({
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
      const params = getCommonParams(globalOpts);
      const result = await sdk.checkBootloaderRelease(params.connectId);
      outputResult(result);
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
      const params = getCommonParams(globalOpts);
      const result = await sdk.deviceChangePin(params.connectId, {
        remove: opts.remove ?? false,
      });
      outputResult(result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('passphrase-state')
  .description('Get current passphrase state (for hidden wallet session management)')
  .action(async () => {
    const globalOpts = program.opts();
    // This command's purpose is to trigger passphrase input — using
    // --use-empty-passphrase with it is a contradiction.
    if (globalOpts.useEmptyPassphrase) {
      outputResult({
        success: false,
        payload: {
          error:
            'passphrase-state cannot be used with --use-empty-passphrase. ' +
            'This command triggers passphrase input to get the hidden wallet state.',
          code: 'INVALID_PARAMS',
        },
      });
      return;
    }
    const sdk = await createSDK(globalOpts);
    try {
      const params = getCommonParams(globalOpts);
      const result = await sdk.getPassphraseState(params.connectId);
      outputResult(result);
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
      const params = getCommonParams(globalOpts);
      const result = await sdk.deviceSettings(params.connectId, {
        usePassphrase: opts.enable === 'true',
      });
      outputResult(result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('device-wipe')
  .description('Factory reset — erase ALL data (IRREVERSIBLE)')
  .option('--confirm-wipe', 'Confirm you understand this will erase ALL data permanently')
  .action(async opts => {
    if (!opts.confirmWipe) {
      outputResult({
        success: false,
        payload: {
          error:
            'Factory reset requires --confirm-wipe flag. WARNING: This will erase ALL data on the device permanently.',
          code: 'CONFIRMATION_REQUIRED',
        },
      });
      return;
    }
    const globalOpts = program.opts();
    const sdk = await createSDK(globalOpts);
    try {
      const params = getCommonParams(globalOpts);
      const result = await sdk.deviceWipe(params.connectId);
      outputResult(result);
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
        outputResult({
          success: false,
          payload: {
            error: 'No settings provided. Use --label, --auto-lock-delay, --language, etc.',
            code: 'INVALID_PARAMS',
          },
        });
        return;
      }

      const params = getCommonParams(globalOpts);
      const result = await sdk.deviceSettings(params.connectId, settings);
      outputResult(result);
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
      const params = getCommonParams(globalOpts);
      const result = await sdk.deviceVerify(params.connectId);
      outputResult(result);
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
      const params = getCommonParams(globalOpts);
      const result = await sdk.deviceLock(params.connectId);
      outputResult(result);
    } finally {
      sdk.dispose();
    }
  });

// ============================================================
// Schema Discovery (for AI Agent integration)
// ============================================================

const schemaCmd = program
  .command('schema')
  .description('Show JSON Schema for CLI commands (for AI agent integration)');

interface SchemaEntry {
  name: string;
  description: string;
  options: { flags: string; description: string; required: boolean; defaultValue: unknown }[];
}

function collectAllSchemas(): SchemaEntry[] {
  return program.commands
    .filter(c => c.name() !== 'schema')
    .map(c => ({
      name: c.name(),
      description: c.description(),
      options: c.options.map(o => ({
        flags: o.flags,
        description: o.description,
        required: o.required,
        defaultValue: o.defaultValue,
      })),
    }));
}

function printSchemaList(schemas: SchemaEntry[]): never {
  if (getMode() === 'human') {
    schemas.forEach(c => {
      process.stdout.write(`${ansi.bold(c.name)}  ${c.description}\n`);
      c.options.forEach(o => {
        process.stdout.write(`  ${ansi.dim(o.flags)}  ${o.description || ''}\n`);
      });
    });
    process.exit(0);
  }
  // Agent mode: wrap in standard success envelope
  outputResult({ success: true, payload: { commands: schemas } });
}

function printSingleSchema(schema: SchemaEntry): never {
  if (getMode() === 'human') {
    process.stdout.write(`${ansi.bold(schema.name)}  ${schema.description}\n`);
    schema.options.forEach(o => {
      process.stdout.write(`  ${ansi.dim(o.flags)}  ${o.description || ''}\n`);
    });
    process.exit(0);
  }
  // Agent mode: wrap in standard success envelope
  outputResult({ success: true, payload: schema });
}

schemaCmd
  .command('list')
  .description('List all available commands')
  .action(() => {
    printSchemaList(collectAllSchemas());
  });

schemaCmd
  .argument('[command]', 'Command name to get schema for')
  .action((cmdName: string | undefined) => {
    if (!cmdName) {
      printSchemaList(collectAllSchemas());
      return;
    }
    const cmd = program.commands.find(c => c.name() === cmdName);
    if (!cmd) {
      outputResult({
        success: false,
        payload: { error: `Unknown command: ${cmdName}`, code: 'UNKNOWN_COMMAND' },
      });
      return;
    }
    const schema = collectAllSchemas().find(s => s.name === cmdName);
    if (!schema) {
      outputResult({
        success: false,
        payload: { error: `Schema not found for: ${cmdName}`, code: 'UNKNOWN_COMMAND' },
      });
      return;
    }
    printSingleSchema(schema);
  });

// ============================================================
// Helpers
// ============================================================

/**
 * Extract common device params from global CLI options.
 * These are passed to every SDK method call.
 */
function getCommonParams(globalOpts: Record<string, any>) {
  return {
    connectId: globalOpts.connectId,
    deviceId: globalOpts.deviceId,
    passphraseState: globalOpts.passphraseState,
    useEmptyPassphrase: globalOpts.useEmptyPassphrase,
  };
}

/**
 * #6 FIX: Safe JSON.parse with structured error output
 */
function safeJsonParse(input: string, label: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    outputResult({
      success: false,
      payload: {
        error: `Invalid JSON for ${label}: ${input.slice(0, 100)}`,
        code: 'INVALID_JSON',
      },
    });
    return undefined; // unreachable — outputResult exits process
  }
}

/**
 * #9 FIX: Safe parseInt with NaN check
 */
function safeParseInt(input: string, label: string): number {
  const num = parseInt(input, 10);
  if (Number.isNaN(num)) {
    outputResult({
      success: false,
      payload: {
        error: `Invalid number for ${label}: "${input}"`,
        code: 'INVALID_PARAM',
      },
    });
    return 0; // unreachable — outputResult exits process
  }
  return num;
}

program.parse();
