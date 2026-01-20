import { ChainMethodsSidebar } from '../../../components/ChainMethodsSidebar'

export default {
  index: 'Overview',
  playground: {
    title: 'Playground',
    theme: {
      layout: 'full',
      toc: false,
      copyPage: false
    }
  },
  transport: 'Transport',
  signers: 'Signer Guides',
  '---api': { type: 'separator', title: 'APIs' },
  'core-api-guide': 'Core API Guide',
  'basic-api': 'Basic API',
  'device-api': 'Device API',
  // Chain Methods - custom sidebar selector
  '---chain': {
    type: 'separator',
    title: <ChainMethodsSidebar lang="en" />
  },
  chains: { display: 'hidden' },
  '---Reference': { type: 'separator', title: 'Reference' },
  'legacy-guides': 'Migration Gudie',
  'concepts': 'concepts'
}
