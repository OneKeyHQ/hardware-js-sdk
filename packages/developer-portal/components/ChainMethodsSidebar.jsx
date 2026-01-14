'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChainDropdown } from './ChainDropdown'

// Module-level variable to persist chain selection across remounts (no localStorage flash)
let lastSelectedChainId = 'ethereum-and-evm'

// Chain data with methods
const CHAINS = [
  {
    id: 'ethereum-and-evm',
    name: 'EVM',
    icon: 'ethereum',
    methods: [
      { id: 'evmgetaddress', name: 'evmGetAddress' },
      { id: 'evmgetpublickey', name: 'evmGetPublicKey' },
      { id: 'evmsignmessage', name: 'evmSignMessage' },
      { id: 'evmsigntransaction', name: 'evmSignTransaction' },
      { id: 'evmsigntypeddata', name: 'evmSignTypedData' },
      { id: 'evmverifymessage', name: 'evmVerifyMessage' },
    ]
  },
  {
    id: 'bitcoin-and-bitcoin-forks',
    name: 'Bitcoin & Forks',
    icon: 'bitcoin',
    methods: [
      { id: 'btcgetaddress', name: 'btcGetAddress' },
      { id: 'btcgetpublickey', name: 'btcGetPublicKey' },
      { id: 'btcsignmessage', name: 'btcSignMessage' },
      { id: 'btcsigntransaction', name: 'btcSignTransaction' },
      { id: 'btcverifymessage', name: 'btcVerifyMessage' },
    ]
  },
  {
    id: 'solana',
    name: 'Solana',
    icon: 'solana',
    methods: [
      { id: 'solgetaddress', name: 'solGetAddress' },
      { id: 'solsigntransaction', name: 'solSignTransaction' },
    ]
  },
  {
    id: 'aptos',
    name: 'Aptos',
    icon: 'aptos',
    methods: [
      { id: 'aptosgetaddress', name: 'aptosGetAddress' },
      { id: 'aptosgetpublickey', name: 'aptosGetPublicKey' },
      { id: 'aptossignmessage', name: 'aptosSignMessage' },
      { id: 'aptossigntransaction', name: 'aptosSignTransaction' },
    ]
  },
  {
    id: 'sui',
    name: 'Sui',
    icon: 'sui',
    methods: [
      { id: 'suigetaddress', name: 'suiGetAddress' },
      { id: 'suigetpublickey', name: 'suiGetPublicKey' },
      { id: 'suisignmessage', name: 'suiSignMessage' },
      { id: 'suisigntransaction', name: 'suiSignTransaction' },
    ]
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    icon: 'cosmos',
    methods: [
      { id: 'cosmosgetaddress', name: 'cosmosGetAddress' },
      { id: 'cosmosgetpublickey', name: 'cosmosGetPublicKey' },
      { id: 'cosmossigntransaction', name: 'cosmosSignTransaction' },
    ]
  },
  {
    id: 'near',
    name: 'NEAR',
    icon: 'near',
    methods: [
      { id: 'neargetaddress', name: 'nearGetAddress' },
      { id: 'nearsigntransaction', name: 'nearSignTransaction' },
    ]
  },
  {
    id: 'ton',
    name: 'TON',
    icon: 'ton',
    methods: [
      { id: 'tongetaddress', name: 'tonGetAddress' },
      { id: 'tonsignmessage', name: 'tonSignMessage' },
      { id: 'tonsignproof', name: 'tonSignProof' },
    ]
  },
  {
    id: 'tron',
    name: 'TRON',
    icon: 'tron',
    methods: [
      { id: 'trongetaddress', name: 'tronGetAddress' },
      { id: 'tronsignmessage', name: 'tronSignMessage' },
      { id: 'tronsigntransaction', name: 'tronSignTransaction' },
    ]
  },
  {
    id: 'cardano',
    name: 'Cardano',
    icon: 'cardano',
    methods: [
      { id: 'cardanogetaddress', name: 'cardanoGetAddress' },
      { id: 'cardanogetpublickey', name: 'cardanoGetPublicKey' },
      { id: 'cardanosignmessage', name: 'cardanoSignMessage' },
      { id: 'cardanosigntransaction', name: 'cardanoSignTransaction' },
    ]
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    icon: 'polkadot',
    methods: [
      { id: 'polkadotgetaddress', name: 'polkadotGetAddress' },
      { id: 'polkadotsigntransaction', name: 'polkadotSignTransaction' },
    ]
  },
  {
    id: 'ripple',
    name: 'Ripple (XRP)',
    icon: 'xrp',
    methods: [
      { id: 'xrpgetaddress', name: 'xrpGetAddress' },
      { id: 'xrpsigntransaction', name: 'xrpSignTransaction' },
    ]
  },
  {
    id: 'stellar',
    name: 'Stellar',
    icon: 'stellar',
    methods: [
      { id: 'stellargetaddress', name: 'stellarGetAddress' },
      { id: 'stellarsigntransaction', name: 'stellarSignTransaction' },
    ]
  },
  {
    id: 'filecoin',
    name: 'Filecoin',
    icon: 'filecoin',
    methods: [
      { id: 'filecoingetaddress', name: 'filecoinGetAddress' },
      { id: 'filecoinsigntransaction', name: 'filecoinSignTransaction' },
    ]
  },
  {
    id: 'conflux',
    name: 'Conflux',
    icon: 'conflux',
    methods: [
      { id: 'confluxgetaddress', name: 'confluxGetAddress' },
      { id: 'confluxsignmessage', name: 'confluxSignMessage' },
      { id: 'confluxsignmessagecip23', name: 'confluxSignMessageCIP23' },
      { id: 'confluxsigntransaction', name: 'confluxSignTransaction' },
    ]
  },
  {
    id: 'nervos',
    name: 'Nervos',
    icon: 'nervos',
    methods: [
      { id: 'nervosgetaddress', name: 'nervosGetAddress' },
      { id: 'nervossigntransaction', name: 'nervosSignTransaction' },
    ]
  },
  {
    id: 'starcoin',
    name: 'Starcoin',
    icon: 'starcoin',
    methods: [
      { id: 'startcoingetaddress', name: 'starcoinGetAddress' },
      { id: 'starcoingetpublickey', name: 'starcoinGetPublicKey' },
      { id: 'starcoinsignmessage', name: 'starcoinSignMessage' },
      { id: 'starcoinsigntransaction', name: 'starcoinSignTransaction' },
      { id: 'starcoinverifymessage', name: 'starcoinVerifyMessage' },
    ]
  },
  {
    id: 'kaspa',
    name: 'Kaspa',
    icon: 'kaspa',
    methods: [
      { id: 'kaspagetaddress', name: 'kaspaGetAddress' },
      { id: 'kaspasigntransaction', name: 'kaspaSignTransaction' },
    ]
  },
  {
    id: 'nexa',
    name: 'Nexa',
    icon: 'nexa',
    methods: [
      { id: 'nexagetaddress', name: 'nexaGetAddress' },
      { id: 'nexasigntransaction', name: 'nexaSignTransaction' },
    ]
  },
  {
    id: 'nem',
    name: 'NEM',
    icon: 'nem',
    methods: [
      { id: 'nemgetaddress', name: 'nemGetAddress' },
      { id: 'nemsigntransaction', name: 'nemSignTransaction' },
    ]
  },
  {
    id: 'algorand',
    name: 'Algorand',
    icon: 'algorand',
    methods: [
      { id: 'algogetaddress', name: 'algoGetAddress' },
      { id: 'algosigntransaction', name: 'algoSignTransaction' },
    ]
  },
  {
    id: 'dynex',
    name: 'Dynex',
    icon: 'dynex',
    methods: [
      { id: 'dnxgetaddress', name: 'dnxGetAddress' },
      { id: 'dnxsigntransaction', name: 'dnxSignTransaction' },
    ]
  },
  {
    id: 'alephium',
    name: 'Alephium',
    icon: 'alephium',
    methods: [
      { id: 'alephiumgetaddress', name: 'alephiumGetAddress' },
      { id: 'alephiumsignmessage', name: 'alephiumSignMessage' },
      { id: 'alephiumsigntransaction', name: 'alephiumSignTransaction' },
    ]
  },
  {
    id: 'benfen',
    name: 'Benfen',
    icon: 'benfen',
    methods: [
      { id: 'benfengetaddress', name: 'benfenGetAddress' },
      { id: 'benfengetpublickey', name: 'benfenGetPublicKey' },
      { id: 'benfensignmessage', name: 'benfenSignMessage' },
      { id: 'benfensigntransaction', name: 'benfenSignTransaction' },
    ]
  },
  {
    id: 'nostr',
    name: 'Nostr',
    icon: 'nostr',
    methods: [
      { id: 'nostrgetpublickey', name: 'nostrGetPublicKey' },
      { id: 'nostrsignevent', name: 'nostrSignEvent' },
      { id: 'nostrsignschnorr', name: 'nostrSignSchnorr' },
      { id: 'nostrencryptmessage', name: 'nostrEncryptMessage' },
      { id: 'nostrdecryptmessage', name: 'nostrDecryptMessage' },
    ]
  },
  {
    id: 'scdo',
    name: 'SCDO',
    icon: 'scdo',
    methods: [
      { id: 'scdogetaddress', name: 'scdoGetAddress' },
      { id: 'scdosignmessage', name: 'scdoSignMessage' },
      { id: 'scdosigntransaction', name: 'scdoSignTransaction' },
    ]
  },
]

export function ChainMethodsSidebar({ lang = 'en' }) {
  const pathname = usePathname()
  const router = useRouter()

  // Get chain from URL
  const pathParts = pathname?.split('/') || []
  const apiRefIndex = pathParts.findIndex(p => p === 'chains')
  const urlChainId = apiRefIndex >= 0 && CHAINS.some(c => c.id === pathParts[apiRefIndex + 1])
    ? pathParts[apiRefIndex + 1]
    : null
  const currentMethod = pathParts[apiRefIndex + 2] || null

  // Use URL chain if available, otherwise use last selected (persists across remounts)
  const displayedChainId = urlChainId || lastSelectedChainId
  const selectedChain = CHAINS.find(c => c.id === displayedChainId) || CHAINS[0]
  const basePath = `/${lang}/hardware-sdk/chains`

  // Update last selected when URL chain changes
  useEffect(() => {
    if (urlChainId) {
      lastSelectedChainId = urlChainId
    }
  }, [urlChainId])

  // Navigate to the chain's first method when selecting from dropdown
  const handleChainSelect = (chain) => {
    lastSelectedChainId = chain.id
    const firstMethod = chain.methods[0]
    router.push(`${basePath}/${chain.id}/${firstMethod.id}`)
  }

  const sectionLabel = lang === 'zh' ? '链方法' : 'Chain Methods'
  const searchPlaceholder = lang === 'zh' ? '搜索链...' : 'Search chains...'
  const noResults = lang === 'zh' ? '未找到链' : 'No chains found'

  return (
    <div className="hardware-product-sidebar">
      {/* Section Label */}
      <div className="mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {sectionLabel}
        </span>
      </div>

      {/* Chain Dropdown */}
      <ChainDropdown
        chains={CHAINS}
        selectedChainId={displayedChainId}
        onSelect={handleChainSelect}
        searchPlaceholder={searchPlaceholder}
        noResultsText={noResults}
        className="mb-2"
      />

      {/* Methods List */}
      <ul className="flex flex-col gap-0.5 border-l border-zinc-200 dark:border-neutral-800 ml-[11px]">
        {selectedChain.methods.map((method) => {
          const methodPath = `${basePath}/${displayedChainId}/${method.id}`
          const isActive = pathname === methodPath ||
            (urlChainId === displayedChainId && currentMethod === method.id)

          return (
            <li key={method.id}>
              <Link
                href={methodPath}
                className={`flex rounded px-2 py-1.5 text-sm transition-colors
                  ${isActive ? 'sidebar-link-active' : 'sidebar-link'}`}
              >
                {method.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { CHAINS }
