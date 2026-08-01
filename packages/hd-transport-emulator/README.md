# OneKey Hardware Emulator Transport

This package provides HTTP-based transport for connecting to OneKey hardware emulator.

## Features

- HTTP-based communication with emulator server
- Compatible with OneKey Connect SDK
- Support for switchTransport functionality
- Default emulator server URL: `http://localhost:21333`

## Installation

```bash
npm install @onekeyfe/hd-transport-emulator
```

## Usage

### Basic Usage

```javascript
import EmulatorTransport from '@onekeyfe/hd-transport-emulator';

// Create transport instance
const transport = new EmulatorTransport();
// or with custom URL
const transport = new EmulatorTransport('http://localhost:21333');

// Initialize transport
await transport.init(logger);

// Configure with protobuf messages
await transport.configure(signedData);
```

### With OneKey Connect SDK

```javascript
import HardwareSDK from '@onekeyfe/hd-web-sdk';

// Initialize with emulator environment
await HardwareSDK.init({
  env: 'emulator',
  debug: true
});

// Switch to emulator transport
await HardwareSDK.switchTransport('emulator');
```

### In Connect Examples

The emulator transport is integrated into the connect examples:

1. **Expo Example**: Select "Emulator" from the transport picker
2. **Electron Example**: Use switchTransport API to switch to emulator

## API

### Constructor

```javascript
new EmulatorTransport(url?: string)
```

- `url` (optional): Emulator server URL, defaults to `http://localhost:21333`

### Methods

All methods implement the standard OneKey Transport interface:

- `init(logger)`: Initialize transport
- `configure(signedData)`: Configure protobuf messages
- `enumerate()`: List available devices
- `acquire(input)`: Acquire device session
- `release(session, onclose)`: Release device session
- `call(session, name, data)`: Call device method
- `stop()`: Stop transport

## Emulator Server

Make sure your OneKey emulator server is running on the configured URL (default: `http://localhost:21333`) before using this transport.

## Development

```bash
# Build
npm run build

# Development mode
npm run dev
```
