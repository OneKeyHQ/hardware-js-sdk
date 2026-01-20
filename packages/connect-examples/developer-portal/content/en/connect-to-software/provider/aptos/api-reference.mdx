---
title: API Reference
description: Complete API reference for OneKey's Aptos provider
---

# API Reference

Complete reference for OneKey's Aptos provider methods and types.

---

## Methods

| Method | Description |
|--------|-------------|
| `connect()` | Connect wallet and get account |
| `disconnect()` | Disconnect wallet |
| `isConnected()` | Check connection status |
| `account()` | Get current account info |
| `network()` | Get current network name |
| `getNetwork()` | Get full network info |
| `getNetworkURL()` | Get network RPC URL |
| `signMessage(request)` | Sign arbitrary message |
| `signAndSubmitTransaction(payload, options?)` | Sign and submit transaction |
| `signTransaction(payload, options?)` | Sign transaction without submitting |
| `signTransactionV2(params)` | Sign BCS-serialized transaction |
| `signAndSubmitTransactionV2(params)` | Sign and submit (Standard V1.1.0) |
| `signIn(payload)` | AIP sign-in flow |
| `onAccountChange(callback)` | Listen for account changes |
| `onNetworkChange(callback)` | Listen for network changes |
| `onDisconnect(callback)` | Listen for disconnect |

---

## Types

### Account Info

```typescript
interface AptosAccountInfo {
  address: string    // Hex address with 0x prefix
  publicKey: string  // Ed25519 public key
}
```

### Network Info

```typescript
interface AptosNetwork {
  name: string       // Network name
  chainId: string    // Chain ID
  url: string        // RPC URL
}
```

### Sign Message Request

```typescript
interface SignMessageRequest {
  message: string    // Message to sign
  nonce?: string     // Optional nonce
  address?: boolean  // Include address in message
  application?: boolean // Include app info
  chainId?: boolean  // Include chain ID
}
```

### Sign Message Response

```typescript
interface SignMessageResponse {
  signature: string     // Hex signature
  fullMessage: string   // Complete signed message
  prefix: string        // APTOS prefix
  address?: string      // Signer address
  application?: string  // Application info
  chainId?: number      // Chain ID
  nonce: string         // Nonce used
}
```

### Transaction Payload

```typescript
interface TransactionPayload {
  type: 'entry_function_payload' | 'script_payload' | 'module_bundle_payload'
  function: string       // Module::function format
  type_arguments: string[]
  arguments: any[]
}
```

### Sign Transaction V2 Params

```typescript
interface SignTransactionV2Params {
  transaction: string        // BCS serialized transaction
  transactionType: 'simple' | 'multi_agent'
  asFeePayer?: boolean       // Sign as fee payer
}
```

---

## Supported Networks

| Network | Description |
|---------|-------------|
| Mainnet | Production network |
| Testnet | Testing environment |
| Devnet | Development environment |

---

## Events

| Event | Callback Parameters | Description |
|-------|---------------------|-------------|
| `accountChanged` | `address: string \| null` | Account changed |
| `accountChangedV2` | `account: AptosAccountInfo \| null` | Account changed (full info) |
| `networkChange` | `network: string \| null` | Network changed |
| `disconnect` | - | Wallet disconnected |

---

## Error Codes

| Code | Description |
|------|-------------|
| 4001 | User rejected request |
| 4100 | Unauthorized |
| 4200 | Unsupported method |
| 4201 | Unsupported network |
| -32603 | Internal error |

