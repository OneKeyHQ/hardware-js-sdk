---
title: Web3-Onboard
description: Integrate OneKey with Blocknative's Web3-Onboard
---

import { Callout } from 'nextra/components'

# Web3-Onboard

Blocknative's multi-wallet connection library. Framework-agnostic with support for React, Vue, and vanilla JavaScript.

<Callout type="info">
OneKey is automatically detected via the injected wallets module. No additional configuration required.
</Callout>

---

## Installation

```bash
npm install @web3-onboard/core @web3-onboard/injected-wallets
```

---

## Basic Setup

```javascript
import Onboard from '@web3-onboard/core'
import injectedModule from '@web3-onboard/injected-wallets'

const injected = injectedModule()

const onboard = Onboard({
  wallets: [injected],
  chains: [
    {
      id: '0x1',
      token: 'ETH',
      label: 'Ethereum Mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    },
    {
      id: '0x89',
      token: 'MATIC',
      label: 'Polygon',
      rpcUrl: 'https://polygon-rpc.com',
    },
  ],
  appMetadata: {
    name: 'My dApp',
    icon: '<svg>...</svg>',
    description: 'My dApp description',
  },
})

// Connect wallet
async function connect() {
  const wallets = await onboard.connectWallet()
  console.log('Connected wallets:', wallets)
}
```

---

## React Integration

```tsx filename="App.tsx"
import { init, useConnectWallet, useWallets } from '@web3-onboard/react'
import injectedModule from '@web3-onboard/injected-wallets'

const injected = injectedModule()

init({
  wallets: [injected],
  chains: [
    {
      id: '0x1',
      token: 'ETH',
      label: 'Ethereum',
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
    },
  ],
})

function App() {
  const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()
  const connectedWallets = useWallets()

  if (wallet) {
    return (
      <div>
        <p>Connected: {wallet.accounts[0].address}</p>
        <button onClick={() => disconnect({ label: wallet.label })}>
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button disabled={connecting} onClick={() => connect()}>
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
```

---

## Additional Wallet Modules

For WalletConnect support (mobile wallets):

```bash
npm install @web3-onboard/walletconnect
```

```javascript
import walletConnectModule from '@web3-onboard/walletconnect'

const walletConnect = walletConnectModule({
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
})

const onboard = Onboard({
  wallets: [injected, walletConnect],
  // ...
})
```

---

## Get Provider

After connecting, get the provider for transactions:

```javascript
import { ethers } from 'ethers'

const wallets = await onboard.connectWallet()

if (wallets[0]) {
  const provider = new ethers.BrowserProvider(wallets[0].provider)
  const signer = await provider.getSigner()

  // Send transaction
  const tx = await signer.sendTransaction({
    to: '0x...',
    value: ethers.parseEther('0.1'),
  })
}
```

---

## Customization

### Theme

```javascript
const onboard = Onboard({
  // ...
  theme: 'dark', // or 'light', 'system'
  // Or custom theme
  theme: {
    '--w3o-background-color': '#1a1a1a',
    '--w3o-foreground-color': '#ffffff',
    '--w3o-text-color': '#ffffff',
    '--w3o-border-color': '#333333',
    '--w3o-action-color': '#00B812',
  },
})
```

### Account Center

```javascript
const onboard = Onboard({
  // ...
  accountCenter: {
    desktop: {
      enabled: true,
      position: 'topRight',
    },
    mobile: {
      enabled: true,
      position: 'topRight',
    },
  },
})
```

---

## Resources

- [Web3-Onboard Documentation](https://onboard.blocknative.com/docs/overview/introduction)
- [React Module](https://onboard.blocknative.com/docs/modules/react)
- [GitHub Repository](https://github.com/blocknative/web3-onboard)
