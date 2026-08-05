# OneKey Hardware SDK Integration Example

## Overview

A complete web application example demonstrating OneKey Hardware SDK integration with modern web technologies. This example serves as a practical reference for developers integrating OneKey hardware wallets into their applications.

## 🌐 Live Demo & Repository

- **Live Demo**: [https://connect.onekey.so/expo-playground](https://connect.onekey.so/expo-playground)
- **Source Code**: [GitHub Repository](https://github.com/OneKeyHQ/hardware-js-sdk/tree/onekey/packages/connect-examples/expo-playground)

## 🚀 What You Can Learn

### 1. **Connection Methods**

- **WebUSB**: Direct browser-to-device connection
- **Hardware Emulator**: Docker-based device simulation for testing
- **Protocol V1/V2**: Active protocol detection for Classic/Mini/Touch/Pro and Pro2

### 2. **Blockchain Integration**

- Bitcoin, Ethereum, Solana, and 20+ other networks
- Address generation, transaction signing, message signing
- Multi-chain wallet functionality

### 3. **Modern Implementation**

- React + TypeScript architecture
- Proper error handling and user feedback
- State management patterns
- Real-time operation logging

## 🔧 Hardware Emulator for Development

The example includes hardware emulator support for development without physical devices.

### Quick Setup

```bash
# 1. Clone emulator repository
git clone https://github.com/Johnwanzi/onekey-docker.git

# 2. Start OneKey Pro emulator
bash build-emu.sh pro-emu

# 3. Start OneKey Classic 1s emulator
bash build-emu.sh 1s-emu

# 4. Access via browser
# Open: http://localhost:6088/vnc.html
```

### Connect to Example

1. Open the example application
2. Select "Emulator" transport method
3. Click connect - automatically detects running emulators

## 💻 Main Use Cases

1. **Learning SDK Integration**: Understand how to properly initialize and use the OneKey SDK
2. **Testing API Methods**: Interactive testing of all hardware wallet functions
3. **Development Reference**: See best practices for error handling, state management, and UX
4. **Emulator Testing**: Develop and test without physical hardware devices

## 🛠️ Basic SDK Usage

```typescript
import HardwareSDK from '@onekeyfe/hd-common-connect-sdk';

// Initialize SDK
await HardwareSDK.init({
  env: 'webusb',
  debug: true,
  fetchConfig: true,
});

// Request browser permission in a user gesture, then detect V1/V2 from the device response.
await HardwareSDK.promptWebDeviceAccess();
const devices = await HardwareSDK.searchDevices();
const device = devices.success ? devices.payload[0] : undefined;

if (!device?.connectId) throw new Error('No device connected');

// DeviceState is the unified public state for both Protocol V1 and Protocol V2.
const state = await HardwareSDK.getDeviceState(device.connectId, { scope: 'firmware' });
```

Pro2 PIN prompts are device-side notifications and must not receive a V1 `RECEIVE_PIN`
response. Host/on-device passphrase selection is handled through the correlated SDK UI events.

## 📚 Getting Started

```bash
# Clone and setup
git clone https://github.com/OneKeyHQ/hardware-js-sdk.git
cd hardware-js-sdk/packages/connect-examples/expo-playground
yarn
yarn start
```

Open `http://localhost:3010` to explore the example.

## 🔗 Resources

- **Main SDK**: [OneKey Hardware SDK](https://github.com/OneKeyHQ/hardware-js-sdk)
- **API Documentation**: [Hardware API Reference](https://connect.onekey.so/docs)
