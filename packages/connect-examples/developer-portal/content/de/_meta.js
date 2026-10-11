import { AgentWalletBetaTitle } from '../../components/AgentWalletBetaTitle.js'

export default {
  index: {
    title: "Startseite",
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
  'getting-started': { title: "Hier beginnen", type: 'page' },
  'connect-to-software': {
    title: "dApps",
    type: 'menu',
    items: {
      quickstart: { title: "Schnellstart für dApps", href: "/de/connect-to-software" },
      provider: { title: "Provider-API", href: "/de/connect-to-software/provider" },
      web3modal: { title: "Web3Modal UI Kit", href: "/de/connect-to-software/wallet-ui/web3modal" },
    },
  },
  'hardware-sdk': {
    title: "Hardware",
    type: 'menu',
    items: {
      'getting-started': { title: "Erste Schritte", href: "/de/hardware-sdk/getting-started" },
      'web-usb': { title: "WebUSB-Verbindung", href: "/de/hardware-sdk/transport/web-usb" },
      'react-native-ble': { title: "React Native BLE", href: "/de/hardware-sdk/transport/react-native-ble" },
      'native-ble': { title: "Natives Mobile BLE", href: "/de/hardware-sdk/transport/native-ble" },
    },
  },
  'air-gap': {
    title: "Signieren per QR-Code",
    type: 'page',
  },
  'agent-wallet': {
    title: AgentWalletBetaTitle({ betaLabel: "Private Beta" }),
    type: 'menu',
    items: {
      landing: { title: "Einstiegsseite", href: "/de/agent-wallet/" },
      overview: { title: "Übersicht", href: "/de/agent-wallet/overview" },
      quickstart: { title: "Schnellstart", href: "/de/agent-wallet/quickstart" },
      capabilities: {
        title: "Funktionen",
        href: "/de/agent-wallet/capabilities",
      },
      'wallet-skills': {
        title: "Wallet-Skills",
        href: "/de/agent-wallet/wallet-skills",
      },
      recipes: { title: "Anwendungsbeispiele", href: "/de/agent-wallet/recipes" },
      'wallet-session': {
        title: "Agent-Wallet-Sitzung",
        href: "/de/agent-wallet/wallet-session",
      },
      'keyless-binding': {
        title: "Schlüssellose Verknüpfung",
        href: "/de/agent-wallet/keyless-binding",
      },
      'hardware-control': {
        title: "Gerätesteuerung",
        href: "/de/agent-wallet/hardware-control",
      },
      safety: { title: "Sicherheitsregeln", href: "/de/agent-wallet/safety" },
    },
  },
  'integration-guides': {
    title: "Ressourcen",
    type: 'menu',
    items: {
      guides: { title: "Integrationsanleitungen", href: "/de/integration-guides" },
      glossary: { title: "Glossar", href: "/de/integration-guides/glossary" },
      troubleshooting: { title: "Fehlerbehebung", href: "/de/troubleshooting" },
      contributing: { title: "Mitwirken", href: "/de/integration-guides/contributing" },
      legacy: { title: "Ältere Integrationen", href: "/de/legacy" },
    },
  },
  legacy: { title: "Ältere Integrationen", display: 'hidden' },
  troubleshooting: { title: "Fehlerbehebung", display: 'hidden' },
  // Navigation menus with dropdown items
  changelog: {
    title: "Änderungsprotokoll",
    display: 'hidden',
  },
};
