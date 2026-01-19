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
