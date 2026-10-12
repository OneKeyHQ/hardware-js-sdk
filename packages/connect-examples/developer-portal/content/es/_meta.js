import { AgentWalletBetaTitle } from '../../components/AgentWalletBetaTitle.js'

export default {
  index: {
    title: "Inicio",
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
  'getting-started': { title: "Empieza aquí", type: 'page' },
  'connect-to-software': {
    title: "dApps",
    type: 'menu',
    items: {
      quickstart: { title: "Inicio rápido para dApps", href: "/es/connect-to-software" },
      provider: { title: "API del proveedor", href: "/es/connect-to-software/provider" },
      web3modal: { title: "Kit de interfaz Web3Modal", href: "/es/connect-to-software/wallet-ui/web3modal" },
    },
  },
  'hardware-sdk': {
    title: "Hardware",
    type: 'menu',
    items: {
      'getting-started': { title: "Primeros pasos", href: "/es/hardware-sdk/getting-started" },
      'web-usb': { title: "Conexión WebUSB", href: "/es/hardware-sdk/transport/web-usb" },
      'react-native-ble': { title: "React Native BLE", href: "/es/hardware-sdk/transport/react-native-ble" },
      'native-ble': { title: "BLE móvil nativo", href: "/es/hardware-sdk/transport/native-ble" },
    },
  },
  'air-gap': {
    title: "Firma mediante QR",
    type: 'page',
  },
  'agent-wallet': {
    title: AgentWalletBetaTitle({ betaLabel: "Beta privada" }),
    type: 'menu',
    items: {
      landing: { title: "Presentación", href: "/es/agent-wallet/" },
      overview: { title: "Descripción general", href: "/es/agent-wallet/overview" },
      quickstart: { title: "Inicio rápido", href: "/es/agent-wallet/quickstart" },
      capabilities: {
        title: "Funciones",
        href: "/es/agent-wallet/capabilities",
      },
      'wallet-skills': {
        title: "Habilidades de la cartera",
        href: "/es/agent-wallet/wallet-skills",
      },
      recipes: { title: "Recetas", href: "/es/agent-wallet/recipes" },
      'wallet-session': {
        title: "Sesión de Agent Wallet",
        href: "/es/agent-wallet/wallet-session",
      },
      'keyless-binding': {
        title: "Vinculación sin claves",
        href: "/es/agent-wallet/keyless-binding",
      },
      'hardware-control': {
        title: "Control del hardware",
        href: "/es/agent-wallet/hardware-control",
      },
      safety: { title: "Reglas de seguridad", href: "/es/agent-wallet/safety" },
    },
  },
  'integration-guides': {
    title: "Recursos",
    type: 'menu',
    items: {
      guides: { title: "Guías de integración", href: "/es/integration-guides" },
      glossary: { title: "Glosario", href: "/es/integration-guides/glossary" },
      troubleshooting: { title: "Resolución de problemas", href: "/es/troubleshooting" },
      contributing: { title: "Cómo contribuir", href: "/es/integration-guides/contributing" },
      legacy: { title: "Integraciones antiguas", href: "/es/legacy" },
    },
  },
  legacy: { title: "Integraciones antiguas", display: 'hidden' },
  troubleshooting: { title: "Resolución de problemas", display: 'hidden' },
  // Navigation menus with dropdown items
  changelog: {
    title: "Registro de cambios",
    display: 'hidden',
  },
};
