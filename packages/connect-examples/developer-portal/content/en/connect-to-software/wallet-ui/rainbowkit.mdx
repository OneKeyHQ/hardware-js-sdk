---
title: RainbowKit
description: Integrate OneKey with RainbowKit for React dApps
---

import { Callout } from 'nextra/components'

# RainbowKit

React wallet connection UI with built-in OneKey support. RainbowKit provides a beautiful, customizable wallet modal that works out of the box.

<Callout type="info">
OneKey is included in RainbowKit's default wallet list. No additional configuration is required for basic integration.
</Callout>

---

## Installation

```bash
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
```

---

## Basic Setup

OneKey is automatically available in RainbowKit's wallet list:

```tsx filename="App.tsx"
import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const config = getDefaultConfig({
  appName: 'My dApp',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from cloud.walletconnect.com
  chains: [mainnet, polygon, arbitrum, optimism],
})

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ConnectButton />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## Custom Wallet List

To prioritize OneKey or customize the wallet order:

```tsx filename="config.ts"
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  oneKeyWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [oneKeyWallet, metaMaskWallet, coinbaseWallet],
    },
    {
      groupName: 'Other',
      wallets: [walletConnectWallet],
    },
  ],
  {
    appName: 'My dApp',
    projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  }
)
```

---

## Customization

### Theme

```tsx
import { darkTheme, lightTheme } from '@rainbow-me/rainbowkit'

<RainbowKitProvider
  theme={darkTheme({
    accentColor: '#00B812', // OneKey green
    accentColorForeground: 'white',
    borderRadius: 'medium',
  })}
>
```

### Modal Size

```tsx
<RainbowKitProvider modalSize="compact">
```

---

## Hooks

Use wagmi hooks after connection:

```tsx
import { useAccount, useBalance, useSendTransaction } from 'wagmi'

function Wallet() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const { sendTransaction } = useSendTransaction()

  if (!isConnected) return <ConnectButton />

  return (
    <div>
      <p>Address: {address}</p>
      <p>Balance: {balance?.formatted} {balance?.symbol}</p>
    </div>
  )
}
```

---

## Resources

- [RainbowKit Documentation](https://www.rainbowkit.com/docs/introduction)
- [Wagmi Documentation](https://wagmi.sh)
- [Get WalletConnect Project ID](https://cloud.walletconnect.com)
