'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Search } from 'lucide-react'
import { ChainIcon } from './ChainIcons'

// Chain data with icons
const CHAINS = [
  { id: 'ethereum-and-evm', name: 'Ethereum & EVM', icon: 'ethereum' },
  { id: 'bitcoin-and-bitcoin-forks', name: 'Bitcoin & Forks', icon: 'bitcoin' },
  { id: 'solana', name: 'Solana', icon: 'solana' },
  { id: 'aptos', name: 'Aptos', icon: 'aptos' },
  { id: 'sui', name: 'Sui', icon: 'sui' },
  { id: 'cosmos', name: 'Cosmos', icon: 'cosmos' },
  { id: 'near', name: 'NEAR', icon: 'near' },
  { id: 'ton', name: 'TON', icon: 'ton' },
  { id: 'tron', name: 'TRON', icon: 'tron' },
  { id: 'cardano', name: 'Cardano', icon: 'cardano' },
  { id: 'polkadot', name: 'Polkadot', icon: 'polkadot' },
  { id: 'ripple', name: 'Ripple (XRP)', icon: 'xrp' },
  { id: 'stellar', name: 'Stellar', icon: 'stellar' },
  { id: 'filecoin', name: 'Filecoin', icon: 'filecoin' },
  { id: 'conflux', name: 'Conflux', icon: 'conflux' },
  { id: 'nervos', name: 'Nervos', icon: 'nervos' },
  { id: 'starcoin', name: 'Starcoin', icon: 'starcoin' },
  { id: 'kaspa', name: 'Kaspa', icon: 'kaspa' },
  { id: 'nexa', name: 'Nexa', icon: 'nexa' },
  { id: 'nem', name: 'NEM', icon: 'nem' },
  { id: 'algorand', name: 'Algorand', icon: 'algorand' },
  { id: 'dynex', name: 'Dynex', icon: 'dynex' },
  { id: 'alephium', name: 'Alephium', icon: 'alephium' },
  { id: 'benfen', name: 'Benfen', icon: 'benfen' },
  { id: 'nostr', name: 'Nostr', icon: 'nostr' },
  { id: 'scdo', name: 'SCDO', icon: 'scdo' },
]

export function SidebarChainSelector({
  basePath = '/en/hardware-sdk/api-reference',
  currentChainId = null,
  showMethods = false,
  methods = []
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef(null)
  const router = useRouter()

  // Find current chain
  const currentChain = CHAINS.find(c => c.id === currentChainId) || CHAINS[0]

  // Filter chains based on search
  const filteredChains = CHAINS.filter(chain =>
    chain.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle chain selection
  const handleSelect = (chain) => {
    setIsOpen(false)
    setSearchQuery('')
    router.push(`${basePath}/${chain.id}`)
  }

  return (
    <div className="my-6">
      {/* Section Label */}
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
        Chain Methods
      </div>

      {/* Dropdown Button */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
        >
          <ChainIcon chain={currentChain.icon} size={24} />
          <span className="flex-1 text-left font-medium text-zinc-900 dark:text-white">
            {currentChain.name}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search chains..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Chain List */}
            <div className="max-h-[300px] overflow-y-auto">
              {filteredChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSelect(chain)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                    chain.id === currentChainId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <ChainIcon chain={chain.icon} size={20} />
                  <span className={`text-sm ${
                    chain.id === currentChainId
                      ? 'font-semibold text-blue-600 dark:text-blue-400'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {chain.name}
                  </span>
                </button>
              ))}
              {filteredChains.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-zinc-400">
                  No chains found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Methods List (optional) */}
      {showMethods && methods.length > 0 && (
        <div className="mt-4 space-y-1">
          {methods.map((method) => (
            <a
              key={method.id}
              href={`${basePath}/${currentChainId}/${method.id}`}
              className="block px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {method.name}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// Compact version for use within content
export function ChainSelectorCompact({
  basePath = '/en/hardware-sdk/api-reference',
  currentChainId = null
}) {
  const router = useRouter()
  const currentChain = CHAINS.find(c => c.id === currentChainId) || CHAINS[0]

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm text-zinc-500">Select chain:</span>
      <select
        value={currentChainId || CHAINS[0].id}
        onChange={(e) => router.push(`${basePath}/${e.target.value}`)}
        className="appearance-none bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
      >
        {CHAINS.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// Grid view of all chains
export function ChainGrid({ basePath = '/en/hardware-sdk/api-reference' }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 my-6">
      {CHAINS.map((chain) => (
        <a
          key={chain.id}
          href={`${basePath}/${chain.id}`}
          className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 rounded-xl transition-all group"
        >
          <ChainIcon chain={chain.icon} size={24} />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white truncate">
            {chain.name}
          </span>
        </a>
      ))}
    </div>
  )
}

export { CHAINS }
