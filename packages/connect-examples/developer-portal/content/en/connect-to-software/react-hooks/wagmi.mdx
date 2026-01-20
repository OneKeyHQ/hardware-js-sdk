---
description: Connect to OneKey from React apps using wagmi and the injected EIP‑1193 provider
---

# React + wagmi

This guide shows a minimal, EIP‑1193‑based way to connect OneKey from React apps using wagmi. Core idea: prefer OneKey’s dedicated injection (`window.$onekey.ethereum`), then fall back to multi‑provider list or generic `window.ethereum`.

## Install

```bash
npm i wagmi viem
```

wagmi v2 is built on viem. This guide uses the Injected connector to work with injected wallets (OneKey / other EIP‑1193 providers).

## Create a OneKey‑first injected connector

Prefer OneKey’s dedicated injection to avoid ambiguity when multiple wallets are installed.

```ts
// onekeyConnector.ts
import { createConfig, http } from 'wagmi'
import { mainnet, polygon, arbitrum, base, optimism } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

function getOneKeyFirstProvider(): any {
  // 1) Prefer OneKey’s dedicated injection
  const onekey = (window as any)?.$onekey?.ethereum
  if (onekey) return onekey

  // 2) Fallback: find OneKey from multi-provider list
  const list = (window as any)?.ethereum?.providers
  const okFromList = list?.find((p: any) => p?.isOneKey || p?.onekey || (typeof p?.isOneKey === 'function' && p.isOneKey()))
  if (okFromList) return okFromList

  // 3) Final fallback: single injected provider
  return (window as any)?.ethereum
}

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, base, optimism],
  connectors: [
    injected({
      target() {
        return {
          id: 'onekey',
          name: 'OneKey',
          provider: getOneKeyFirstProvider,
        }
      },
      shimDisconnect: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
  },
})
```

Notes
- Prefer `window.$onekey.ethereum` to keep behavior deterministic in multi‑wallet environments.
- If OneKey is not installed, the connector falls back to other injected providers.
- Trigger `eth_requestAccounts` on a user gesture and handle `4001` (user rejected), as in the legacy docs.

## App setup

```tsx
// main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './onekeyConnector'
import App from './App'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
```

## Connect and read account

```tsx
// App.tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export default function App() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <div>
        <p>Connected: {address}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div>
      {connectors.map((c) => (
        <button key={c.uid} disabled={isPending} onClick={() => connect({ connector: c })}>
          Connect with {c.name}
        </button>
      ))}
    </div>
  )
}
```

## Sign and send

```ts
import { createWalletClient, custom } from 'viem'

const provider = (window as any)?.$onekey?.ethereum
  || (window as any)?.ethereum?.providers?.find((p: any) => p?.isOneKey || p?.onekey)
  || (window as any)?.ethereum

const client = createWalletClient({ transport: custom(provider) })
const [account] = await provider.request({ method: 'eth_requestAccounts' })

// Personal sign
await provider.request({ method: 'personal_sign', params: ['0x68656c6c6f', account] })

// EIP-1559 tx
const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [{ from: account, to: '0x...', value: '0x...' }],
})
```

## Events and network

- Listen to `accountsChanged` / `chainChanged` and refresh session state accordingly.
- Network switching/adding: `wallet_switchEthereumChain` and `wallet_addEthereumChain`.

## Mobile & Deeplinks

Use OneKey deeplinks for mobile web/WebViews:

- Custom scheme: `onekey-wallet://wc?uri={encodeURIComponent(wcUri)}`
- Universal link: `https://app.onekey.so/wc/connect/wc?uri={encodeURIComponent(wcUri)}`

## Troubleshooting

- 4001: user rejected (see legacy docs examples)

## Optional: EIP‑6963 (multi‑wallet discovery)

If desired, use EIP‑6963 to discover installed wallets first and prefer OneKey when available. Example:

```ts
let onekeyProvider: any = null
const providers: any[] = []

function onAnnounceProvider(event: any) {
  const { info, provider } = event.detail || {}
  providers.push({ info, provider })
  if (info?.name === 'OneKey' || info?.rdns?.includes?.('onekey')) {
    onekeyProvider = provider
  }
}

window.addEventListener('eip6963:announceProvider', onAnnounceProvider)
window.dispatchEvent(new Event('eip6963:requestProvider'))

// Prefer `onekeyProvider` at app init; otherwise fall back to getOneKeyFirstProvider()
```
