import { ChainMethodsSidebar } from '../../../components/ChainMethodsSidebar'

export default {
  index: 'Descripción general',
  'getting-started': 'Primeros pasos',
  'agent-integration': {
    title: 'OneKey Agent Wallet',
    display: 'hidden'
  },
  playground: {
    title: 'Demo interactiva',
    theme: {
      layout: 'full',
      toc: false,
      copyPage: false
    }
  },
  transport: 'Transporte',
  signers: 'Guías de firma',
  'firmware-update': 'Actualización del firmware',
  '---api': { type: 'separator', title: 'API' },
  'core-api-guide': 'Guía de la API principal',
  'basic-api': 'API básica',
  'device-api': 'API del dispositivo',
  // Chain Methods - custom sidebar selector
  '---chain': {
    type: 'separator',
    title: <ChainMethodsSidebar lang="es" />
  },
  chains: { display: 'hidden' },
  '---Reference': { type: 'separator', title: 'Referencia' },
  'legacy-guides': 'Guía de migración',
  concepts: 'Conceptos'
}
