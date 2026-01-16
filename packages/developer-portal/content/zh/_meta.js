export default {
  index: {
    title: '首页',
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
    title: '硬件接入',
    type: 'menu',
    items: {
      overview: { title: '概览', href: '/zh/hardware-sdk' },
      transport: { title: '传输层', href: '/zh/hardware-sdk/transport' },
      signers: { title: '签名指南', href: '/zh/hardware-sdk/signers' },
      'core-api': { title: '核心 API', href: '/zh/hardware-sdk/core-api-guide' },
      playground: { title: 'Playground', href: '/zh/hardware-sdk/playground' },
    },
  },
  'connect-to-software': {
    title: 'dApp 接入',
    type: 'menu',
    items: {
      overview: { title: '快速开始', href: '/zh/connect-to-software' },
      provider: { title: 'Provider API', href: '/zh/connect-to-software/provider' },
      'wallet-ui': { title: '钱包 UI', href: '/zh/connect-to-software/wallet-ui' },
      'react-hooks': { title: 'React Hooks', href: '/zh/connect-to-software/react-hooks' },
    },
  },
  'air-gap': {
    title: 'Air-Gap 签名',
    type: 'menu',
    items: {
      overview: { title: '概览', href: '/zh/air-gap' },
      'basic-api': { title: '基础 API', href: '/zh/air-gap/basic-api' },
      ethereum: { title: 'Ethereum & EVM', href: '/zh/air-gap/ethereum-and-evm' },
      bitcoin: { title: 'Bitcoin (PSBT)', href: '/zh/air-gap/bitcoin' },
      solana: { title: 'Solana', href: '/zh/air-gap/solana' },
    },
  },
  changelog: {
    title: '更新日志',
    display: 'hidden',
  },
};
