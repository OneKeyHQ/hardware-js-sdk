#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('onekey-hw')
  .description('OneKey hardware wallet CLI for AI agent integration')
  .version('0.1.0-alpha.0');

// ============================================================
// Global Options
// ============================================================

program.option('--json', 'Output in JSON format (for agent consumption)');
program.option('--transport <type>', 'Transport type: http | webusb | ble', 'http');
program.option('--connect-id <id>', 'Device connection ID (USB: serial, iOS: uuid, Android: MAC)');
program.option('--device-id <id>', 'Persistent device ID from getFeatures (changes when seed changes)');
program.option('--passphrase-state <state>', 'Passphrase state for hidden wallet access');
program.option('--use-empty-passphrase', 'Use standard wallet (skip passphrase prompt)');

// ============================================================
// Device Commands
// ============================================================

program
  .command('search')
  .description('Search for connected OneKey hardware wallet devices')
  .option('--timeout <ms>', 'Search timeout in milliseconds', '10000')
  .action(async (opts) => {
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(program.opts());
    try {
      const result = await sdk.searchDevices();
      outputResult(program.opts(), result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('status')
  .description('Get device features and current status')
  .action(async () => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.getFeatures(globalOpts.connectId);
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('bridge-status')
  .description('Check if OneKey Bridge is running')
  .action(async () => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.checkBridgeStatus();
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
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const { resolveGetAddress } = await import('./chains');
    const sdk = await createSDK(globalOpts);
    try {
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
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const { resolveGetPublicKey } = await import('./chains');
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
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const { resolveSignTransaction } = await import('./chains');
    const sdk = await createSDK(globalOpts);
    try {
      const tx = JSON.parse(opts.tx);
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
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const { resolveSignMessage } = await import('./chains');
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
  .command('batch-get-address')
  .description('Get addresses for multiple chains/paths in a single session')
  .requiredOption('--bundle <json>', 'JSON array of {chain, path, showOnDevice}')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const { resolveBatchGetAddress } = await import('./chains');
    const sdk = await createSDK(globalOpts);
    try {
      const bundle = JSON.parse(opts.bundle);
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
// Firmware Commands
// ============================================================

program
  .command('firmware-check')
  .description('Check if firmware updates are available')
  .action(async () => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
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
    const { createSDK } = await import('./sdk');
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
  .description('Update device firmware')
  .option('--version <ver>', 'Target firmware version (e.g., "4.8.0")')
  .option('--platform <platform>', 'Platform: native | desktop | ext | web', 'desktop')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      // firmwareUpdateV2 requires: connectId, deviceId, { updateType, platform, version? }
      const params: Record<string, unknown> = {
        updateType: 'firmware',
        platform: opts.platform,
      };
      if (opts.version) {
        params.version = opts.version.split('.').map(Number);
      }
      const result = await sdk.firmwareUpdateV2(
        globalOpts.connectId,
        globalOpts.deviceId,
        params as any
      );
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('firmware-update-ble')
  .description('Update BLE (Bluetooth) firmware')
  .option('--version <ver>', 'Target BLE firmware version')
  .option('--platform <platform>', 'Platform: native | desktop | ext | web', 'desktop')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      // BLE firmware update also uses firmwareUpdateV2 with updateType: 'ble'
      const params: Record<string, unknown> = {
        updateType: 'ble',
        platform: opts.platform,
      };
      if (opts.version) {
        params.version = opts.version.split('.').map(Number);
      }
      const result = await sdk.firmwareUpdateV2(
        globalOpts.connectId,
        globalOpts.deviceId,
        params as any
      );
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('bootloader-check')
  .description('Check bootloader version and status')
  .action(async () => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
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
  .action(async () => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceChangePin(globalOpts.connectId);
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('toggle-passphrase')
  .description('Enable or disable passphrase (hidden wallet) protection')
  .requiredOption('--enable <bool>', 'true to enable, false to disable')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
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
  .command('device-backup')
  .description('Trigger recovery phrase backup on device')
  .action(async () => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceBackup(globalOpts.connectId);
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('device-recovery')
  .description('Recover wallet from recovery phrase (entered on device)')
  .option('--word-count <count>', 'Recovery phrase length: 12, 18, or 24', '24')
  .option('--passphrase-protection <bool>', 'Enable passphrase after recovery', 'false')
  .option('--pin-protection <bool>', 'Set PIN after recovery', 'true')
  .option('--label <name>', 'Device label')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceRecovery(globalOpts.connectId, {
        wordCount: parseInt(opts.wordCount, 10),
        passphraseProtection: opts.passphraseProtection === 'true',
        pinProtection: opts.pinProtection === 'true',
        label: opts.label,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('device-reset')
  .description('Initialize device with a new wallet seed (DESTROYS current wallet)')
  .option('--word-count <count>', 'Seed phrase length: 12, 18, or 24', '24')
  .option('--passphrase-protection <bool>', 'Enable passphrase', 'false')
  .option('--pin-protection <bool>', 'Set PIN', 'true')
  .option('--label <name>', 'Device label')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceReset(globalOpts.connectId, {
        strength: wordCountToStrength(parseInt(opts.wordCount, 10)),
        passphraseProtection: opts.passphraseProtection === 'true',
        pinProtection: opts.pinProtection === 'true',
        label: opts.label,
      });
      outputResult(globalOpts, result);
    } finally {
      sdk.dispose();
    }
  });

program
  .command('device-wipe')
  .description('Factory reset — erase ALL data (IRREVERSIBLE)')
  .action(async () => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
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
  .option('--auto-lock-delay <seconds>', 'Auto-lock timeout in seconds')
  .action(async (opts) => {
    const globalOpts = program.opts();
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      const settings: Record<string, unknown> = {};
      if (opts.label) settings.label = opts.label;
      if (opts.autoLockDelay) settings.autoLockDelayMs = parseInt(opts.autoLockDelay, 10) * 1000;
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
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceVerify(globalOpts.connectId);
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
    const { createSDK } = await import('./sdk');
    const sdk = await createSDK(globalOpts);
    try {
      const result = await sdk.deviceLock(globalOpts.connectId);
      outputResult(globalOpts, result);
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
 */
function getCommonParams(globalOpts: Record<string, any>) {
  return {
    connectId: globalOpts.connectId,
    deviceId: globalOpts.deviceId,
    passphraseState: globalOpts.passphraseState,
    useEmptyPassphrase: globalOpts.useEmptyPassphrase,
  };
}

function outputResult(globalOpts: { json?: boolean }, result: unknown): void {
  if (globalOpts.json || !process.stdout.isTTY) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result);
  }
}

function wordCountToStrength(wordCount: number): number {
  switch (wordCount) {
    case 12: return 128;
    case 18: return 192;
    case 24: return 256;
    default: return 256;
  }
}

program.parse();
