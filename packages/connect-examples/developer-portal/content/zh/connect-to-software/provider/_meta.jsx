import { ProviderChainSidebar } from '../../../../components/ProviderChainSidebar'

export default {
  index: { title: '概览' },
  // Provider API - chain selector
  '---provider': {
    type: 'separator',
    title: <ProviderChainSidebar lang="zh" />
  },
  // Chain pages - hidden (accessed via chain selector)
  eth: { display: 'hidden' },
  btc: { display: 'hidden' },
  solana: { display: 'hidden' },
  cosmos: { display: 'hidden' },
  aptos: { display: 'hidden' },
  sui: { display: 'hidden' },
  ton: { display: 'hidden' },
  tron: { display: 'hidden' },
  polkadot: { display: 'hidden' },
  cardano: { display: 'hidden' },
  algorand: { display: 'hidden' },
  conflux: { display: 'hidden' },
  near: { display: 'hidden' },
  nostr: { display: 'hidden' },
  webln: { display: 'hidden' }
}
