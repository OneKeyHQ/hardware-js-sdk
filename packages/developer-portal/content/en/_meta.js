export default {
  index: {
    title: 'Home',
    display: 'hidden',
    theme: {
      layout: 'full',
      sidebar: false,
      toc: false,
      pagination: false,
      breadcrumb: false,
      timestamp: false,
      footer: false,
      copyPage: false,
    },
  },
  'hardware-sdk': {
    title: 'Hardware Integration',
    type: 'menu',
    items: {
      overview: { title: 'Overview', href: '/en/hardware-sdk' },
      transport: { title: 'Transport', href: '/en/hardware-sdk/transport' },
      signers: { title: 'Signer Guides', href: '/en/hardware-sdk/signers' },
      'core-api': { title: 'Core API', href: '/en/hardware-sdk/core-api-guide' },
      playground: { title: 'Playground', href: '/en/hardware-sdk/playground' },
    },
  },
  'connect-to-software': {
    title: 'dApp Integration',
    type: 'menu',
    items: {
      overview: { title: 'Quick Start', href: '/en/connect-to-software' },
      provider: { title: 'Provider API', href: '/en/connect-to-software/provider' },
      'wallet-ui': { title: 'Wallet UI', href: '/en/connect-to-software/wallet-ui' },
      'react-hooks': { title: 'React Hooks', href: '/en/connect-to-software/react-hooks' },
    },
  },
  'air-gap': {
    title: 'Offline Signing',
    type: 'menu',
    items: {
      overview: { title: 'Overview', href: '/en/air-gap' },
      'basic-api': { title: 'Basic API', href: '/en/air-gap/basic-api' },
      ethereum: { title: 'Ethereum & EVM', href: '/en/air-gap/ethereum-and-evm' },
      bitcoin: { title: 'Bitcoin (PSBT)', href: '/en/air-gap/bitcoin' },
      solana: { title: 'Solana', href: '/en/air-gap/solana' },
    },
  },
  changelog: {
    title: 'Changelog',
    display: 'hidden',
  },
};
