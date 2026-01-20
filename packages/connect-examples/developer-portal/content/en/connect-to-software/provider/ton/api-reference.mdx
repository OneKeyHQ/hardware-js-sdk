---
title: API Reference
description: Complete API reference for OneKey's TON provider
---

# API Reference

Complete reference for OneKey's TON provider methods and types.

---

## Methods

| Method | Description |
|--------|-------------|
| `connect(version?, request?)` | Connect wallet |
| `restoreConnection()` | Restore previous session |
| `disconnect()` | Disconnect wallet |
| `send(message)` | Send RPC request |
| `listen(callback)` | Listen for wallet events |

---

## Send Methods

| Method | Description |
|--------|-------------|
| `sendTransaction` | Send TON or interact with contracts |
| `signData` | Sign arbitrary data cells |
| `disconnect` | Disconnect via RPC |

---

## Types

### Account Info

```typescript
interface AccountInfo {
  address: string      // Raw address (0:<hex>)
  network: string      // Network ID (-239 mainnet, -3 testnet)
  publicKey: string    // Hex public key (no 0x)
  walletStateInit: string // Base64 encoded state init
}
```

### Transaction Request

```typescript
interface TransactionRequest {
  valid_until?: number  // UNIX timestamp for validity
  network?: string      // Network ID
  from?: string         // Sender address
  messages: Message[]   // Up to 4 messages
}
```

### Message

```typescript
interface Message {
  address: string      // Recipient (raw format)
  amount: string       // Amount in nanotons
  payload?: string     // Base64 BOC for contract calls
  stateInit?: string   // Base64 StateInit for deployment
}
```

### Sign Data Request

```typescript
interface SignDataRequest {
  schema_crc: number   // Schema identifier
  cell: string         // Base64 encoded cell
  publicKey?: string   // Optional specific key
}
```

### Sign Data Result

```typescript
interface SignDataResult {
  signature: string    // Base64 signature
  timestamp: number    // UNIX timestamp (UTC)
}
```

### Device Info

```typescript
interface DeviceInfo {
  platform: string     // 'iphone' | 'android' | 'windows' | 'mac' | 'linux'
  appName: string      // 'onekey'
  appVersion: string   // Wallet version
  maxProtocolVersion: number // 2
  features: string[]   // Supported features
}
```

---

## Networks

| Network | Network ID |
|---------|------------|
| Mainnet | -239 |
| Testnet | -3 |

---

## Events

| Event | Description |
|-------|-------------|
| `accountChanged` | Account changed |
| `disconnect` | Wallet disconnected |

---

## Error Codes

| Code | Description |
|------|-------------|
| 0 | Unknown error |
| 1 | Bad request |
| 100 | Unknown app |
| 300 | User rejected request |
| 400 | Method not supported |

