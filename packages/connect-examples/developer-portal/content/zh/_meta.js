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
  'agent-wallet': {
    title: 'Agent Wallet',
    type: 'menu',
    items: {
      overview: { title: '概览', href: '/zh/agent-wallet/overview' },
      quickstart: { title: '快速开始', href: '/zh/agent-wallet/quickstart' },
      capabilities: {
        title: '能力地图',
        href: '/zh/agent-wallet/capabilities',
      },
      'wallet-skills': {
        title: 'Wallet Skills',
        href: '/zh/agent-wallet/wallet-skills',
      },
      recipes: { title: '场景示例', href: '/zh/agent-wallet/recipes' },
      'wallet-session': {
        title: 'Agent Wallet 会话',
        href: '/zh/agent-wallet/wallet-session',
      },
      'keyless-binding': {
        title: 'Keyless 绑定',
        href: '/zh/agent-wallet/keyless-binding',
      },
      'hardware-control': {
        title: '硬件控制',
        href: '/zh/agent-wallet/hardware-control',
      },
      safety: { title: '安全规则', href: '/zh/agent-wallet/safety' },
    },
  },
  // 导航菜单及下拉项
  'hardware-sdk': {
    title: '硬件接入',
    type: 'menu',
    items: {
      'web-usb': { title: 'WebUSB 连接', href: '/zh/hardware-sdk/transport/web-usb' },
      'react-native-ble': { title: 'React Native BLE', href: '/zh/hardware-sdk/transport/react-native-ble' },
      'native-ble': { title: '原生移动端 BLE', href: '/zh/hardware-sdk/transport/native-ble' },
    },
  },
  'connect-to-software': {
    title: 'dApp 接入',
    type: 'menu',
    items: {
      provider: { title: 'Provider API', href: '/zh/connect-to-software/provider' },
      web3modal: { title: 'Web3Modal UI 组件', href: '/zh/connect-to-software/wallet-ui/web3modal' },
    },
  },
  'air-gap': {
    title: '离线签名',
    type: 'page',
  },
  changelog: {
    title: '更新日志',
    display: 'hidden',
  },
};
