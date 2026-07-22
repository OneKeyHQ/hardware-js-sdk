# OneKey Hardware SDK Integration Example

## Overview

A complete web application example demonstrating OneKey Hardware SDK integration with modern web technologies. This example serves as a practical reference for developers integrating OneKey hardware wallets into their applications.

## 🌐 Live Demo & Repository

- **Live Demo**: [https://connect.onekey.so/expo-playground](https://connect.onekey.so/expo-playground)
- **Source Code**: [GitHub Repository](https://github.com/OneKeyHQ/hardware-js-sdk/tree/onekey/packages/connect-examples/expo-playground)

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
cd hardware-js-sdk/packages/connect-examples/expo-playground
yarn 
yarn start
```

Open `http://localhost:3010` to explore the example.

## 🔐 生成 ETH/BTC 多签测试数据

Multisig Test 的 ETH Safe 与 BTC BIP48 用例由离线脚本生成。脚本只从以下三个环境变量读取测试助记词：

- `MULTISIG_MNEMONIC_1`
- `MULTISIG_MNEMONIC_2`
- `MULTISIG_MNEMONIC_3`

运行方式：

```bash
export MULTISIG_MNEMONIC_1="你的第一个测试助记词"
export MULTISIG_MNEMONIC_2="你的第二个测试助记词"
export MULTISIG_MNEMONIC_3="你的第三个测试助记词"

yarn generate:multisig-fixtures
```

生成结果写入 `app/features/multisig/generatedFixtures.ts`，页面会直接导入该文件，无需手工复制 JSON。相同的三个助记词会生成完全相同的数据。

安全说明：

- 只使用专门用于测试、没有真实资产的助记词。
- 脚本不会访问 RPC、区块浏览器或广播接口。
- BTC 引用交易使用虚构 coinbase-like 输入，所有生成数据均标记为不可广播。
- 助记词、seed、私钥和扩展私钥不会写入生成文件或正常日志。
- 不要将保存助记词的 `.env` 文件提交到 Git；应提交重新生成后的 `generatedFixtures.ts`。
- 页面仅生成 signer 1 的硬件执行用例，设备或模拟器应载入 `MULTISIG_MNEMONIC_1`。
- BTC “继续签名”用例预填 signer 2 的离线签名，再由 signer 1 设备完成第二个签名。

## 🔗 Resources

- **Main SDK**: [OneKey Hardware SDK](https://github.com/OneKeyHQ/hardware-js-sdk)
- **OneKey Bridge**: [Download Bridge App](https://help.onekey.so/hc/zh-cn/articles/9740566472335)
- **API Documentation**: [Hardware API Reference](https://connect.onekey.so/docs)
