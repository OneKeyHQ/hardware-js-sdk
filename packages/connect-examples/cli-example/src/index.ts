/**
 * CLI Example — test NodeUsbTransport communication with OneKey hardware devices.
 *
 * Usage:
 *   yarn start search          — search for connected devices
 *   yarn start get-features    — get device features (auto-selects first device)
 *   yarn start get-address     — get an EVM address (default path m/44'/60'/0'/0/0)
 *   yarn start ping            — ping device with a message
 */
import * as readline from 'readline';
import HardwareSDK from '@onekeyfe/hd-common-connect-sdk';
import { DEVICE, DEVICE_EVENT, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(label: string, data?: unknown) {
  console.log(`\n[${label}]`, data !== undefined ? JSON.stringify(data, null, 2) : '');
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// SDK init
// ---------------------------------------------------------------------------

async function initSDK() {
  // Listen for device connect/disconnect
  HardwareSDK.on(DEVICE_EVENT, (e: any) => {
    if (e.type === DEVICE.CONNECT) {
      log('DEVICE.CONNECT', e.payload);
    } else if (e.type === DEVICE.DISCONNECT) {
      log('DEVICE.DISCONNECT', e.payload);
    }
  });

  // Handle PIN request — prompt user in terminal
  HardwareSDK.on(UI_EVENT, async (e: any) => {
    if (e.type === UI_REQUEST.REQUEST_PIN) {
      const pin = await prompt('Enter PIN: ');
      HardwareSDK.uiResponse({
        type: UI_RESPONSE.RECEIVE_PIN,
        payload: pin,
      });
    }

    if (e.type === UI_REQUEST.REQUEST_PASSPHRASE) {
      const passphrase = await prompt('Enter passphrase (empty for none): ');
      HardwareSDK.uiResponse({
        type: UI_RESPONSE.RECEIVE_PASSPHRASE,
        payload: { value: passphrase, passphraseOnDevice: !passphrase, save: false },
      });
    }

    if (e.type === UI_REQUEST.REQUEST_BUTTON) {
      console.log('\n>>> Please confirm on your device <<<\n');
    }
  });

  const success = await HardwareSDK.init({
    env: 'node-usb',
    debug: false,
  });

  if (!success) {
    console.error('Failed to initialize SDK');
    process.exit(1);
  }
  log('SDK', 'initialized (env: node-usb)');
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function searchDevices() {
  const res = await HardwareSDK.searchDevices();
  log('searchDevices', res);
  return res;
}

async function getFirstDevice(): Promise<{ connectId: string; deviceId: string }> {
  const res = await HardwareSDK.searchDevices();
  if (!res.success || !res.payload?.length) {
    console.error('No device found. Is your OneKey connected via USB?');
    process.exit(1);
  }
  const device = res.payload[0];
  log('Using device', { connectId: device.connectId, name: device.name, deviceType: device.deviceType });
  return { connectId: device.connectId ?? '', deviceId: device.deviceId ?? '' };
}

async function getFeatures() {
  const { connectId } = await getFirstDevice();
  const res = await HardwareSDK.getFeatures(connectId);
  log('getFeatures', res);
}

async function getAddress() {
  const { connectId, deviceId } = await getFirstDevice();
  const path = "m/44'/60'/0'/0/0";
  log('getAddress', { path });
  const res = await HardwareSDK.evmGetAddress(connectId, deviceId, {
    path,
    showOnOneKey: false,
  });
  log('evmGetAddress', res);
}

async function ping() {
  const { connectId } = await getFirstDevice();
  // Use getFeatures as a connectivity test
  const res = await HardwareSDK.getFeatures(connectId);
  log('ping (getFeatures)', res);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const command = process.argv[2] || 'search';

  await initSDK();

  switch (command) {
    case 'search':
      await searchDevices();
      break;
    case 'get-features':
      await getFeatures();
      break;
    case 'get-address':
      await getAddress();
      break;
    case 'ping':
      await ping();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available: search, get-features, get-address, ping');
      break;
  }

  // Give time for any pending events, then exit
  setTimeout(() => process.exit(0), 1000);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
