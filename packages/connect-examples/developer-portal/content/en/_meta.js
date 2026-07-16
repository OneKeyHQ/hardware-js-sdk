import { AgentWalletBetaTitle } from '../../components/AgentWalletBetaTitle.js'

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
  'agent-wallet': {
    title: AgentWalletBetaTitle({ betaLabel: 'Private Beta' }),
    type: 'menu',
    items: {
      landing: { title: 'Landing', href: '/en/agent-wallet/' },
      overview: { title: 'Overview', href: '/en/agent-wallet/overview' },
      quickstart: { title: 'Quickstart', href: '/en/agent-wallet/quickstart' },
      capabilities: {
        title: 'Capabilities',
        href: '/en/agent-wallet/capabilities',
      },
      'wallet-skills': {
        title: 'Wallet Skills',
        href: '/en/agent-wallet/wallet-skills',
      },
      recipes: { title: 'Recipes', href: '/en/agent-wallet/recipes' },
      'wallet-session': {
        title: 'Agent Wallet Session',
        href: '/en/agent-wallet/wallet-session',
      },
      'keyless-binding': {
        title: 'Keyless Binding',
        href: '/en/agent-wallet/keyless-binding',
      },
      'hardware-control': {
        title: 'Hardware Control',
        href: '/en/agent-wallet/hardware-control',
      },
      safety: { title: 'Safety Rules', href: '/en/agent-wallet/safety' },
    },
  },
  // Navigation menus with dropdown items
  'hardware-sdk': {
    title: 'Hardware Integration',
    type: 'menu',
    items: {
      'web-usb': { title: 'WebUSB Connection', href: '/en/hardware-sdk/transport/web-usb' },
      'react-native-ble': { title: 'React Native BLE', href: '/en/hardware-sdk/transport/react-native-ble' },
      'native-ble': { title: 'Native Mobile BLE', href: '/en/hardware-sdk/transport/native-ble' },
    },
  },
  'connect-to-software': {
    title: 'dApp Integration',
    type: 'menu',
    items: {
      provider: { title: 'Provider API', href: '/en/connect-to-software/provider' },
      web3modal: { title: 'Web3Modal UI Kit', href: '/en/connect-to-software/wallet-ui/web3modal' },
    },
  },
  'air-gap': {
    title: 'Offline Signing',
    type: 'page',
  },
  changelog: {
    title: 'Changelog',
    display: 'hidden',
  },
};
