import { ChainMethodsSidebar } from '../../../components/ChainMethodsSidebar'

export default {
  index: 'Übersicht',
  'getting-started': 'Erste Schritte',
  'agent-integration': {
    title: 'OneKey Agent Wallet',
    display: 'hidden'
  },
  playground: {
    title: 'Interaktive Demo',
    theme: {
      layout: 'full',
      toc: false,
      copyPage: false
    }
  },
  transport: 'Transport',
  signers: 'Signierleitfäden',
  'firmware-update': 'Firmware-Update',
  '---api': { type: 'separator', title: 'APIs' },
  'core-api-guide': 'Leitfaden zur Core-API',
  'basic-api': 'Basis-API',
  'device-api': 'Geräte-API',
  // Chain Methods - custom sidebar selector
  '---chain': {
    type: 'separator',
    title: <ChainMethodsSidebar lang="de" />
  },
  chains: { display: 'hidden' },
  '---Reference': { type: 'separator', title: 'Referenz' },
  'legacy-guides': 'Migrationsleitfaden',
  concepts: 'Konzepte'
}
