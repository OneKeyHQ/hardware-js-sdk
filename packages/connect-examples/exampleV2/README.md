# OneKey Hardware SDK Integration Example

## Overview

A complete web application example demonstrating OneKey Hardware SDK integration with modern web technologies. This example serves as a practical reference for developers integrating OneKey hardware wallets into their applications.

## 🌐 Live Demo & Repository

- **Live Demo**: [https://connect.onekey.so/exampleV2](https://connect.onekey.so/exampleV2)
- **Source Code**: [GitHub Repository](https://github.com/OneKeyHQ/hardware-js-sdk/tree/onekey/packages/connect-examples/exampleV2)

## 🚀 What You Can Learn

### 1. **Connection Methods**
- **WebUSB**: Direct browser-to-device connection
- **JSBridge**: Connection via OneKey Bridge desktop app
- **Hardware Emulator**: Docker-based device simulation for testing

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
import { CoreApi } from '@onekeyfe/hd-core';

// Initialize SDK
const sdk = new CoreApi({
  env: 'web',
  debug: true,
  connectSrc: 'https://connect.onekey.so/'
});

// Switch connection method
await sdk.switchTransport('webusb'); // or 'emulator'

// Find devices
const devices = await sdk.searchDevices();

// Get address example
const result = await sdk.evmGetAddress({
  path: "m/44'/60'/0'/0/0",
  showOnOneKey: true
});
```

## 📚 Getting Started

```bash
# Clone and setup
git clone https://github.com/OneKeyHQ/hardware-js-sdk.git
cd hardware-js-sdk/packages/connect-examples/exampleV2
yarn 
yarn start
```

Open `http://localhost:3010` to explore the example.

## 🔗 Resources

- **Main SDK**: [OneKey Hardware SDK](https://github.com/OneKeyHQ/hardware-js-sdk)
- **OneKey Bridge**: [Download Bridge App](https://help.onekey.so/hc/zh-cn/articles/9740566472335)
- **API Documentation**: [Hardware API Reference](https://connect.onekey.so/docs) 