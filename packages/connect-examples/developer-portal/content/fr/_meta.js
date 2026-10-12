import { AgentWalletBetaTitle } from '../../components/AgentWalletBetaTitle.js'

export default {
  index: {
    title: "Accueil",
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
  'getting-started': { title: "Commencer ici", type: 'page' },
  'connect-to-software': {
    title: "dApps",
    type: 'menu',
    items: {
      quickstart: { title: "Démarrage rapide dApp", href: "/fr/connect-to-software" },
      provider: { title: "API du fournisseur", href: "/fr/connect-to-software/provider" },
      web3modal: { title: "Kit d’interface Web3Modal", href: "/fr/connect-to-software/wallet-ui/web3modal" },
    },
  },
  'hardware-sdk': {
    title: "Matériel",
    type: 'menu',
    items: {
      'getting-started': { title: "Premiers pas", href: "/fr/hardware-sdk/getting-started" },
      'web-usb': { title: "Connexion WebUSB", href: "/fr/hardware-sdk/transport/web-usb" },
      'react-native-ble': { title: "BLE React Native", href: "/fr/hardware-sdk/transport/react-native-ble" },
      'native-ble': { title: "BLE mobile natif", href: "/fr/hardware-sdk/transport/native-ble" },
    },
  },
  'air-gap': {
    title: "Signature par QR code",
    type: 'page',
  },
  'agent-wallet': {
    title: AgentWalletBetaTitle({ betaLabel: "Bêta privée" }),
    type: 'menu',
    items: {
      landing: { title: "Page d’accueil", href: "/fr/agent-wallet/" },
      overview: { title: "Vue d’ensemble", href: "/fr/agent-wallet/overview" },
      quickstart: { title: "Démarrage rapide", href: "/fr/agent-wallet/quickstart" },
      capabilities: {
        title: "Fonctionnalités",
        href: "/fr/agent-wallet/capabilities",
      },
      'wallet-skills': {
        title: "Compétences de portefeuille",
        href: "/fr/agent-wallet/wallet-skills",
      },
      recipes: { title: "Exemples pratiques", href: "/fr/agent-wallet/recipes" },
      'wallet-session': {
        title: "Session Agent Wallet",
        href: "/fr/agent-wallet/wallet-session",
      },
      'keyless-binding': {
        title: "Liaison sans clé",
        href: "/fr/agent-wallet/keyless-binding",
      },
      'hardware-control': {
        title: "Contrôle du matériel",
        href: "/fr/agent-wallet/hardware-control",
      },
      safety: { title: "Règles de sécurité", href: "/fr/agent-wallet/safety" },
    },
  },
  'integration-guides': {
    title: "Ressources",
    type: 'menu',
    items: {
      guides: { title: "Guides d’intégration", href: "/fr/integration-guides" },
      glossary: { title: "Glossaire", href: "/fr/integration-guides/glossary" },
      troubleshooting: { title: "Dépannage", href: "/fr/troubleshooting" },
      contributing: { title: "Contribuer", href: "/fr/integration-guides/contributing" },
      legacy: { title: "Intégrations historiques", href: "/fr/legacy" },
    },
  },
  legacy: { title: "Intégrations historiques", display: 'hidden' },
  troubleshooting: { title: "Dépannage", display: 'hidden' },
  // Navigation menus with dropdown items
  changelog: {
    title: "Journal des modifications",
    display: 'hidden',
  },
};
