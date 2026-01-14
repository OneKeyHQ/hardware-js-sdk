'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { ChainDropdown } from './ChainDropdown'

// Module-level variable to persist chain selection across remounts (no localStorage flash)
let lastSelectedChainId = 'eth'

// JSON-RPC reference methods for Ethereum
const ETH_REFERENCE_METHODS = [
  { id: 'eth_requestAccounts', name: 'eth_requestAccounts' },
  { id: 'eth_accounts', name: 'eth_accounts' },
  { id: 'eth_sendTransaction', name: 'eth_sendTransaction' },
  { id: 'eth_call', name: 'eth_call' },
  { id: 'eth_chainId', name: 'eth_chainId' },
  { id: 'personal_sign', name: 'personal_sign' },
  { id: 'eth_signTypedData_v4', name: 'eth_signTypedData_v4' },
  { id: 'wallet_switchEthereumChain', name: 'wallet_switchEthereumChain' },
  { id: 'wallet_addEthereumChain', name: 'wallet_addEthereumChain' },
  { id: 'wallet_watchAsset', name: 'wallet_watchAsset' },
]

// Provider chain data with pages
const PROVIDER_CHAINS = [
  {
    id: 'eth',
    name: 'Ethereum',
    icon: 'ethereum',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'accessing-accounts', name: 'Accessing Accounts' },
      { id: 'sending-transactions', name: 'Sending Transactions' },
      { id: 'signing-data', name: 'Signing Data' },
      { id: 'reference', name: 'JSON-RPC Reference', expandable: true, children: ETH_REFERENCE_METHODS },
    ]
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    icon: 'bitcoin',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'api-reference', name: 'API Reference' },
      { id: 'event', name: 'Event' },
      { id: 'guide', name: 'Guide' },
    ]
  },
  {
    id: 'solana',
    name: 'Solana',
    icon: 'solana',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'detecting-the-provider', name: 'Detecting the Provider' },
      { id: 'establishing-a-connection', name: 'Establishing a Connection' },
      { id: 'sending-a-transaction', name: 'Sending a Transaction' },
      { id: 'signing-a-message', name: 'Signing a Message' },
    ]
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    icon: 'cosmos',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'getting-started', name: 'Getting Started' },
      { id: 'signing', name: 'Signing' },
      { id: 'api-reference', name: 'API Reference' },
    ]
  },
  {
    id: 'aptos',
    name: 'Aptos',
    icon: 'aptos',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'getting-started', name: 'Getting Started' },
      { id: 'transactions', name: 'Transactions' },
      { id: 'signing', name: 'Signing' },
      { id: 'api-reference', name: 'API Reference' },
    ]
  },
  {
    id: 'sui',
    name: 'Sui',
    icon: 'sui',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'getting-started', name: 'Getting Started' },
      { id: 'transactions', name: 'Transactions' },
      { id: 'signing', name: 'Signing' },
      { id: 'api-reference', name: 'API Reference' },
    ]
  },
  {
    id: 'ton',
    name: 'TON',
    icon: 'ton',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'getting-started', name: 'Getting Started' },
      { id: 'transactions', name: 'Transactions' },
      { id: 'signing', name: 'Signing' },
      { id: 'api-reference', name: 'API Reference' },
    ]
  },
  {
    id: 'tron',
    name: 'TRON',
    icon: 'tron',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'getting-started', name: 'Getting Started' },
      { id: 'transactions', name: 'Transactions' },
      { id: 'signing', name: 'Signing' },
      { id: 'api-reference', name: 'API Reference' },
    ]
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    icon: 'polkadot',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'getting-started', name: 'Getting Started' },
      { id: 'signing', name: 'Signing' },
      { id: 'api-reference', name: 'API Reference' },
    ]
  },
  {
    id: 'cardano',
    name: 'Cardano',
    icon: 'cardano',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'getting-started', name: 'Getting Started' },
      { id: 'transactions', name: 'Transactions' },
      { id: 'signing', name: 'Signing' },
      { id: 'api-reference', name: 'API Reference' },
    ]
  },
  {
    id: 'algorand',
    name: 'Algorand',
    icon: 'algorand',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'getting-started', name: 'Getting Started' },
      { id: 'transactions', name: 'Transactions' },
      { id: 'signing', name: 'Signing' },
      { id: 'api-reference', name: 'API Reference' },
    ]
  },
  {
    id: 'conflux',
    name: 'Conflux',
    icon: 'conflux',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'getting-started', name: 'Getting Started' },
      { id: 'transactions', name: 'Transactions' },
      { id: 'api-reference', name: 'API Reference' },
    ]
  },
  {
    id: 'near',
    name: 'NEAR',
    icon: 'near',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'introduction', name: 'Introduction' },
      { id: 'integrating', name: 'Integrating' },
      { id: 'reference', name: 'Reference' },
      { id: 'resources', name: 'Resources' },
    ]
  },
  {
    id: 'nostr',
    name: 'Nostr',
    icon: 'nostr',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'api-reference', name: 'API Reference' },
      { id: 'event', name: 'Event' },
      { id: 'guide', name: 'Guide' },
    ]
  },
  {
    id: 'webln',
    name: 'WebLN',
    icon: 'bitcoin',
    pages: [
      { id: 'index', name: 'Overview', path: '' },
      { id: 'api-reference', name: 'API Reference' },
      { id: 'event', name: 'Event' },
      { id: 'guide', name: 'Guide' },
    ]
  },
]

export function ProviderChainSidebar({ lang = 'en' }) {
  const [expandedSections, setExpandedSections] = useState({})
  const pathname = usePathname()
  const router = useRouter()

  // Extract current chain and page from URL
  const pathParts = pathname?.split('/') || []
  const providerIndex = pathParts.findIndex(p => p === 'provider')
  const urlChainId = providerIndex >= 0 && PROVIDER_CHAINS.some(c => c.id === pathParts[providerIndex + 1])
    ? pathParts[providerIndex + 1]
    : null
  const currentPage = pathParts[providerIndex + 2] || 'index'
  const currentSubPage = pathParts[providerIndex + 3] || null

  // Auto-expand reference section if we're in it
  useEffect(() => {
    if (currentPage === 'reference' && currentSubPage) {
      setExpandedSections(prev => ({ ...prev, reference: true }))
    }
  }, [currentPage, currentSubPage])

  // Use URL chain if available, otherwise use last selected (persists across remounts)
  const displayedChainId = urlChainId || lastSelectedChainId
  const selectedChain = PROVIDER_CHAINS.find(c => c.id === displayedChainId) || PROVIDER_CHAINS[0]
  const shouldHighlight = Boolean(urlChainId)
  const basePath = `/${lang}/connect-to-software/provider`

  // Update last selected when URL chain changes
  useEffect(() => {
    if (urlChainId) {
      lastSelectedChainId = urlChainId
    }
  }, [urlChainId])

  // Navigate to the chain's overview page when selecting from dropdown
  const handleChainSelect = (chain) => {
    lastSelectedChainId = chain.id
    router.push(`${basePath}/${chain.id}`)
  }

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const searchPlaceholder = lang === 'zh' ? '搜索链...' : 'Search chains...'
  const noResults = lang === 'zh' ? '未找到链' : 'No chains found'
  const placeholder = lang === 'zh' ? '选择链' : 'Select a chain'

  return (
    <div className="provider-chain-sidebar">
      {/* Chain Dropdown */}
      <ChainDropdown
        chains={PROVIDER_CHAINS}
        selectedChainId={displayedChainId}
        onSelect={handleChainSelect}
        searchPlaceholder={searchPlaceholder}
        noResultsText={noResults}
        placeholder={placeholder}
        placeholderChainId="eth"
        className="mb-2"
      />

      {/* Pages List */}
      <ul className="space-y-0.5 border-l border-zinc-200 dark:border-neutral-800 ml-[11px] pl-3">
        {selectedChain.pages.map((page) => {
          const pagePath = page.path !== undefined
            ? `${basePath}/${displayedChainId}${page.path ? `/${page.path}` : ''}`
            : `${basePath}/${displayedChainId}/${page.id}`

          const isActive = shouldHighlight && (
            pathname === pagePath ||
            (page.id === 'index' && pathname === `${basePath}/${displayedChainId}`) ||
            (currentPage === page.id && !currentSubPage)
          )

          const isParentActive = page.expandable && currentPage === page.id
          const isExpanded = expandedSections[page.id] || isParentActive

          return (
            <li key={page.id}>
              {page.expandable ? (
                // Expandable item with children
                <div>
                  <button
                    onClick={() => toggleSection(page.id)}
                    className={`w-full flex items-center justify-between py-1.5 text-sm transition-colors text-left
                      ${isParentActive ? 'sidebar-section-active' : 'sidebar-section'}`}
                  >
                    <span>{page.name}</span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Children */}
                  {isExpanded && page.children && (
                    <ul className="mt-0.5 ml-2 space-y-0.5 border-l border-zinc-200 dark:border-neutral-800 pl-2">
                      {page.children.map((child) => {
                        const childPath = `${basePath}/${displayedChainId}/${page.id}/${child.id}`
                        const isChildActive = (
                          pathname === childPath ||
                          currentSubPage === child.id
                        )

                        return (
                          <li key={child.id}>
                            <Link
                              href={childPath}
                              className={`block py-1 text-xs transition-colors rounded px-1.5
                                ${isChildActive ? 'sidebar-link-active' : 'sidebar-link'}`}
                            >
                              {child.name}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                // Regular link item
                <Link
                  href={pagePath}
                  className={`block py-1.5 text-sm transition-colors rounded px-1.5
                    ${isActive ? 'sidebar-link-active' : 'sidebar-link'}`}
                >
                  {page.name}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { PROVIDER_CHAINS }
