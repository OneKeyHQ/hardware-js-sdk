import { ChainMethodsSidebar } from '../../../components/ChainMethodsSidebar'

export default {
  index: 'Vue d’ensemble',
  'getting-started': 'Premiers pas',
  'agent-integration': {
    title: 'OneKey Agent Wallet',
    display: 'hidden'
  },
  playground: {
    title: 'Démonstration interactive',
    theme: {
      layout: 'full',
      toc: false,
      copyPage: false
    }
  },
  transport: 'Transport',
  signers: 'Guides de signature',
  'firmware-update': 'Mise à jour du firmware',
  '---api': { type: 'separator', title: 'API' },
  'core-api-guide': 'Guide de l’API principale',
  'basic-api': 'API de base',
  'device-api': 'API de l’appareil',
  // Chain Methods - custom sidebar selector
  '---chain': {
    type: 'separator',
    title: <ChainMethodsSidebar lang="fr" />
  },
  chains: { display: 'hidden' },
  '---Reference': { type: 'separator', title: 'Référence' },
  'legacy-guides': 'Guide de migration',
  concepts: 'Concepts'
}
