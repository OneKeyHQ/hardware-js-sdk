# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is OneKey's hardware-js-sdk - a monorepo containing JavaScript/TypeScript SDKs for integrating with OneKey hardware wallets across multiple platforms (web, React Native, Node.js, and desktop).

## Essential Commands

### Setup & Development
```bash
# Initial setup
yarn                    # Install dependencies
yarn bootstrap          # Bootstrap lerna packages
yarn build             # Build all packages

# Full setup workflow
yarn setup             # Complete setup: install + bootstrap + build
```

### Development Commands
```bash
# Start development servers for specific packages
yarn dev:web           # Web SDK development
yarn dev:ble           # React Native BLE SDK  
yarn dev:core          # Core package development
yarn dev:transport     # Transport package development
yarn dev:shared        # Shared utilities development
yarn dev:common        # Common connect SDK development
yarn dev:transport-http          # HTTP transport development
yarn dev:transport-rn            # React Native transport development
yarn dev:transport-lowlevel      # Low-level transport development
yarn dev:transport-webusb        # WebUSB transport development
yarn dev:transport-emulator      # Emulator transport development
```

### Testing & Quality
```bash
yarn test             # Run all tests
yarn lint             # Run ESLint
yarn lint:staged      # Run lint-staged
```

### Example Applications
```bash
# Desktop example (recommended for development)
yarn example:desktop

# Mobile example (React Native)
yarn example

# Web example (requires additional setup)
yarn example:web      # After configuring CONNECT_SRC
```

### Build & Publishing
```bash
yarn build            # Build all packages
yarn clean            # Clean node_modules
yarn clean-workspace  # Clean everything
yarn update-version   # Update package versions
yarn publish-packages # Publish to npm
```

## Project Architecture

### Monorepo Structure
This is a Lerna-managed monorepo with the following key packages:

**Core Packages:**
- `@onekeyfe/core` - Main hardware wallet connection logic
- `@onekeyfe/hd-transport` - Low-level communication protocol
- `@onekeyfe/hd-shared` - Shared utilities and constants

**Platform SDKs:**
- `@onekeyfe/hd-web-sdk` - Web platform integration
- `@onekeyfe/hd-ble-sdk` - React Native BLE integration
- `@onekeyfe/hd-common-sdk` - Node.js/WebUSB integration

**Transport Layers:**
- `@onekeyfe/hd-transport-http` - HTTP communication
- `@onekeyfe/hd-transport-react-native` - React Native transport
- `@onekeyfe/hd-transport-webusb` - WebUSB transport
- `@onekeyfe/hd-transport-lowlevel` - Low-level transport interface
- `@onekeyfe/hd-transport-emulator` - Emulator transport

**Examples:**
- `connect-examples/expo-example` - React Native example app
- `connect-examples/electron-example` - Desktop Electron app
- `connect-examples/expo-playground` - Advanced web playground

### Key Architectural Patterns

**Transport Layer Design:**
- Multiple transport implementations for different platforms
- Unified protocol handling through `hd-transport`
- Platform-specific optimizations in individual transport packages

**Core API Design:**
- Method-based API structure (e.g., `btcGetAddress`, `evmSignTransaction`)
- Consistent parameter patterns across all blockchain integrations
- Type-safe TypeScript interfaces for all API methods

**Development Workflow:**
- Use `yarn bootstrap` after installing dependencies
- Always run `yarn build` before testing example applications
- Desktop example app is recommended for development and testing

## Development Guidelines

### Working with Examples
1. **Desktop Development (Recommended):**
   ```bash
   yarn bootstrap && yarn build
   yarn example:desktop
   ```

2. **Web Development:**
   ```bash
   # Build web SDK first
   yarn dev:web
   # Configure connect source in packages/connect-examples/expo-example/src/constants/connect.ts
   # Set CONNECT_SRC to https://localhost:8087/
   # Open https://localhost:8087/ in Chrome and type "thisisunsafe"
   yarn bootstrap && yarn build
   yarn example  # Select web option
   ```

3. **Mobile Development:**
   ```bash
   yarn bootstrap && yarn build
   yarn example  # Select iOS or Android
   ```

### Package Development
- Use `yarn dev:[package-name]` for development builds
- Core package (`@onekeyfe/core`) contains the main API implementations
- Transport packages handle platform-specific communication
- Shared package contains common utilities and error definitions

### Testing Integration
- Hardware SDK methods are tested through example applications
- Use desktop example app for comprehensive testing
- Web example requires SSL certificate acceptance for localhost
- Mobile examples test BLE connectivity and React Native integration

## Important Notes

### Git Submodules
The project uses git submodules. After cloning, run:
```bash
git submodule update --init --recursive
```

### Development Dependencies
- Node.js and Yarn are required
- NVM is recommended for Node.js version management
- Git LFS is required for large files

### Platform-Specific Considerations
- Web: Requires HTTPS for WebUSB functionality
- React Native: BLE permissions and platform-specific setup required
- Desktop: Electron app provides most comprehensive testing environment

### Protobuf Updates
```bash
yarn update-protobuf  # Updates protobuf definitions in hd-transport
```

### Docker Development Environment
The project includes Docker support for consistent development environments across different platforms.

## Expo-Example Routing Configuration

### Overview
The `connect-examples/expo-example` app uses React Navigation with URL linking support. Routes are configured with `/expo-example/` prefix for production deployment compatibility.

### Route Structure
All routes are defined with the `/expo-example/` prefix:
- `expo-example/api-payload` - Main testing interface
- `expo-example/firmware-update-test` - Firmware update testing
- `expo-example/passphrase-test` - Passphrase testing
- `expo-example/address-test` - Address generation testing
- `expo-example/security-check` - Security validation
- `expo-example/functional-testing` - Functional testing suite

### Webpack Configuration Logic

**Development Environment:**
- `publicPath = '/'` - Static assets served from root
- `historyApiFallback` rewrites `/expo-example/*` → `/`
- Users access: `http://localhost:19006/expo-example/api-payload`
- Webpack devServer handles URL rewriting, React Navigation handles routing

**Production Environment:**
- `publicPath = '/expo-example/'` - Static assets served from `/expo-example/`
- No devServer configuration needed (handled by deployment server)
- Users access: `https://example.onekeytest.com/expo-example/api-payload`
- GitHub Pages serves static files, React Navigation handles routing

### Key Configuration Files
- **Webpack Config:** `packages/connect-examples/expo-example/webpack.config.js`
- **App Entry:** `packages/connect-examples/expo-example/App.tsx`
- **Route Definitions:** `packages/connect-examples/expo-example/src/route.ts`

### URL Linking Configuration
The app supports deep linking with prefixes:
- `https://example.onekeytest.com/` (production)
- `http://localhost:19006/` (development)
- Expo linking URLs

This configuration ensures the app works correctly in both development and production environments while maintaining consistent routing patterns.