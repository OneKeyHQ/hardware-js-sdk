---
title: API Reference
description: Complete API reference for OneKey's Algorand provider
---

# API Reference

Complete reference for OneKey's Algorand provider methods and types.

---

## Methods

| Method | Description |
|--------|-------------|
| `connect()` | Connect wallet (legacy) |
| `disconnect()` | Disconnect wallet |
| `enable(opts?)` | Enable wallet (ARC-0001) |
| `signTxns(transactions)` | Sign transactions (ARC-0001) |
| `postTxns(signedTxns)` | Broadcast transactions |
| `signAndPostTxns(transactions)` | Sign and broadcast |
| `signTransaction(txns)` | Sign transactions (legacy) |
| `signAndSendTransaction(txns)` | Sign and send (legacy) |
| `signMessage(message, encoding?)` | Sign arbitrary message |
| `getAlgodv2Client()` | Get Algod client |
| `getIndexerClient()` | Get Indexer client |

---

## Types

### Enable Options

```typescript
interface EnableOpts {
  genesisID?: string
  genesisHash?: string
}
```

### Enable Result

```typescript
interface EnableResult {
  genesisID: string
  genesisHash: string
  accounts: string[]
}
```

### Wallet Transaction

```typescript
interface WalletTransaction {
  txn: string                  // Base64 encoded unsigned transaction
  signers?: string[]           // Addresses that should sign (empty = skip)
  stxn?: string                // Pre-signed transaction
  message?: string             // Message to display
  msig?: MultisigMetadata
  authAddr?: string            // Rekeyed auth address
}
```

### Sign Txns Result

```typescript
interface SignTxnsResult {
  // Array of base64 signed transactions (null for skipped)
  [index: number]: string | null
}
```

### Post Txns Result

```typescript
interface PostTxnsResult {
  txIDs: string[]
}
```

---

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | Connection status |
| `address` | `string \| null` | Connected address |
| `isOneKey` | `boolean` | OneKey identifier |

---

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `connect` | `{ address }` | Wallet connected |
| `disconnect` | - | Wallet disconnected |
| `accountChanged` | `address` | Account changed |

---

## Error Codes

| Code | Description |
|------|-------------|
| 4001 | User rejected request |
| 4100 | Unauthorized |
| 4200 | Unsupported method |
| 4300 | Invalid input |

