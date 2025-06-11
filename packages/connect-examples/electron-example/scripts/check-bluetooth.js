#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { exec } = require('child_process');
const os = require('os');

console.log('🔍 Checking Bluetooth status...');
console.log('Platform:', os.platform());
console.log('Architecture:', os.arch());

if (os.platform() === 'darwin') {
  // macOS
  console.log('\n📱 Checking macOS Bluetooth status...');

  exec('system_profiler SPBluetoothDataType', (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Error checking Bluetooth:', error.message);
      return;
    }

    if (stdout.includes('State: On')) {
      console.log('✅ Bluetooth is enabled');
    } else {
      console.log('❌ Bluetooth is disabled');
      console.log('💡 Please enable Bluetooth in System Preferences');
    }
  });

  console.log('\n🔐 Checking Bluetooth permissions...');
  console.log('💡 Please ensure:');
  console.log('1. Open System Preferences > Security & Privacy > Privacy');
  console.log('2. Select "Bluetooth" from the left sidebar');
  console.log('3. Make sure "Electron" or your app is checked');
  console.log('4. If not listed, click "+" and add your app');
} else {
  console.log('⚠️ Non-macOS platform - please check Bluetooth manually');
}

console.log('\n🔧 Troubleshooting steps:');
console.log('1. Restart Bluetooth: sudo pkill bluetoothd');
console.log(
  '2. Reset Bluetooth module: sudo kextunload -b com.apple.iokit.BroadcomBluetoothHostControllerUSBTransport && sudo kextload -b com.apple.iokit.BroadcomBluetoothHostControllerUSBTransport'
);
console.log('3. Try running the app with elevated permissions');
