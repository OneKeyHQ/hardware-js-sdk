import { AgentWalletBetaTitle } from '../../components/AgentWalletBetaTitle.js'

export default {
  index: {
    title: "ホーム",
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
  'getting-started': { title: "ここから始める", type: 'page' },
  'connect-to-software': {
    title: "dApps",
    type: 'menu',
    items: {
      quickstart: { title: "dApp クイックスタート", href: "/ja/connect-to-software" },
      provider: { title: "プロバイダー API", href: "/ja/connect-to-software/provider" },
      web3modal: { title: "Web3Modal UI Kit", href: "/ja/connect-to-software/wallet-ui/web3modal" },
    },
  },
  'hardware-sdk': {
    title: "ハードウェア",
    type: 'menu',
    items: {
      'getting-started': { title: "はじめに", href: "/ja/hardware-sdk/getting-started" },
      'web-usb': { title: "WebUSB 接続", href: "/ja/hardware-sdk/transport/web-usb" },
      'react-native-ble': { title: "React Native BLE", href: "/ja/hardware-sdk/transport/react-native-ble" },
      'native-ble': { title: "ネイティブモバイル BLE", href: "/ja/hardware-sdk/transport/native-ble" },
    },
  },
  'air-gap': {
    title: "QR 署名",
    type: 'page',
  },
  'agent-wallet': {
    title: AgentWalletBetaTitle({ betaLabel: "プライベートベータ" }),
    type: 'menu',
    items: {
      landing: { title: "トップページ", href: "/ja/agent-wallet/" },
      overview: { title: "概要", href: "/ja/agent-wallet/overview" },
      quickstart: { title: "クイックスタート", href: "/ja/agent-wallet/quickstart" },
      capabilities: {
        title: "機能",
        href: "/ja/agent-wallet/capabilities",
      },
      'wallet-skills': {
        title: "ウォレットスキル",
        href: "/ja/agent-wallet/wallet-skills",
      },
      recipes: { title: "実装例", href: "/ja/agent-wallet/recipes" },
      'wallet-session': {
        title: "Agent Wallet セッション",
        href: "/ja/agent-wallet/wallet-session",
      },
      'keyless-binding': {
        title: "キーレス連携",
        href: "/ja/agent-wallet/keyless-binding",
      },
      'hardware-control': {
        title: "ハードウェア制御",
        href: "/ja/agent-wallet/hardware-control",
      },
      safety: { title: "安全上のルール", href: "/ja/agent-wallet/safety" },
    },
  },
  'integration-guides': {
    title: "リソース",
    type: 'menu',
    items: {
      guides: { title: "統合ガイド", href: "/ja/integration-guides" },
      glossary: { title: "用語集", href: "/ja/integration-guides/glossary" },
      troubleshooting: { title: "トラブルシューティング", href: "/ja/troubleshooting" },
      contributing: { title: "貢献方法", href: "/ja/integration-guides/contributing" },
      legacy: { title: "従来の統合方法", href: "/ja/legacy" },
    },
  },
  legacy: { title: "従来の統合方法", display: 'hidden' },
  troubleshooting: { title: "トラブルシューティング", display: 'hidden' },
  // Navigation menus with dropdown items
  changelog: {
    title: "変更履歴",
    display: 'hidden',
  },
};
