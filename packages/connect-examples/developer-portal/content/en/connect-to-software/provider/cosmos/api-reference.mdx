---
title: API Reference
description: Complete API reference for OneKey's Cosmos provider
---

# API Reference

Complete reference for OneKey's Cosmos provider methods and types.

---

## Methods

| Method | Description |
|--------|-------------|
| `enable(chainIds)` | Enable chain(s) and get key info |
| `disable(chainIds)` | Disable chain(s) |
| `disconnect()` | Disconnect from all chains |
| `getKey(chainId)` | Get account key for chain |
| `signAmino(chainId, signer, signDoc)` | Sign Amino-encoded transaction |
| `signDirect(chainId, signer, signDoc)` | Sign Protobuf-encoded transaction |
| `sendTx(chainId, tx, mode)` | Broadcast signed transaction |
| `signArbitrary(chainId, signer, data)` | Sign arbitrary message |
| `verifyArbitrary(chainId, signer, data, signature)` | Verify signature |
| `signEthereum(chainId, signer, data, type)` | Sign Ethereum data |
| `experimentalSuggestChain(chainInfo)` | Add custom chain |
| `getOfflineSigner(chainId)` | Get Direct offline signer |
| `getOfflineSignerOnlyAmino(chainId)` | Get Amino-only offline signer |
| `getOfflineSignerAuto(chainId)` | Auto-detect best signer type |
| `getChainInfosWithoutEndpoints()` | Get all chain infos |
| `getChainInfoWithoutEndpoints(chainId)` | Get specific chain info |
| `ping()` | Check connection |
| `babylonConnectWallet()` | Connect to Babylon wallet |
| `babylonGetKey()` | Get Babylon wallet key |

---

## Key Interface

```typescript
interface Key {
  name: string              // Human-readable name
  algo: string              // Signing algorithm
  pubKey: Uint8Array        // Public key bytes
  address: Uint8Array       // Address bytes
  bech32Address: string     // Bech32 formatted address
  isNanoLedger: boolean     // True if hardware wallet
  isKeystone: boolean       // True if Keystone hardware
}
```

---

## Sign Doc Types

### Amino Sign Doc

```typescript
interface StdSignDoc {
  chain_id: string
  account_number: string
  sequence: string
  fee: {
    amount: { denom: string; amount: string }[]
    gas: string
  }
  msgs: {
    type: string
    value: any
  }[]
  memo: string
}
```

### Direct Sign Doc

```typescript
interface DirectSignDoc {
  bodyBytes: Uint8Array | null
  authInfoBytes: Uint8Array | null
  chainId: string | null
  accountNumber: Long | null
}
```

---

## Sign Response Types

```typescript
interface AminoSignResponse {
  signed: StdSignDoc
  signature: StdSignature
}

interface DirectSignResponse {
  signed: DirectSignDoc
  signature: StdSignature
}

interface StdSignature {
  pub_key: {
    type: string
    value: string  // Base64 encoded
  }
  signature: string  // Base64 encoded
}
```

---

## Broadcast Modes

| Mode | Description |
|------|-------------|
| `block` | Wait for block inclusion |
| `sync` | Wait for CheckTx |
| `async` | Return immediately |

---

## Supported Chains

| Chain | Chain ID | Native Support |
|-------|----------|----------------|
| Cosmos Hub | `cosmoshub-4` | Yes |
| Osmosis | `osmosis-1` | Yes |
| Juno | `juno-1` | Yes |
| Stargaze | `stargaze-1` | Yes |
| Akash | `akashnet-2` | Yes |
| Secret Network | `secret-4` | Yes |
| Evmos | `evmos_9001-2` | Yes |
| Injective | `injective-1` | Yes |
| Custom | Any | Via `experimentalSuggestChain` |

---

## Events

| Event | Description |
|-------|-------------|
| `keplr_keystorechange` | Account or key changed |
| `connect` | Connected to chain |
| `disconnect` | Disconnected |

```typescript
// Listen for keystore changes
window.addEventListener('keplr_keystorechange', () => {
  console.log('Key changed, refresh account info')
})
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 4001 | User rejected request |
| 4100 | Unauthorized |
| -32603 | Internal error |

