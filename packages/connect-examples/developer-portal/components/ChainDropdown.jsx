'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { ChainIcon } from './ChainIcons'

/**
 * ChainDropdown - A reusable dropdown component for selecting blockchain chains
 * 
 * @param {Object} props
 * @param {Array} props.chains - Array of chain objects with { id, name, icon }
 * @param {string} props.selectedChainId - Currently selected chain ID
 * @param {Function} props.onSelect - Callback when a chain is selected
 * @param {string} props.searchPlaceholder - Placeholder text for search input
 * @param {string} props.noResultsText - Text shown when no results found
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the dropdown is disabled
 */
export function ChainDropdown({
  chains = [],
  selectedChainId,
  onSelect,
  searchPlaceholder = 'Search chains...',
  noResultsText = 'No chains found',
  placeholder = 'Select a chain',
  placeholderChainId = null,
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const triggerRef = useRef(null)
  const listId = useId()

  const selectedChain = selectedChainId
    ? chains.find(c => c.id === selectedChainId)
    : null
  const placeholderChain = placeholderChainId
    ? chains.find(c => c.id === placeholderChainId)
    : null

  const filteredChains = chains.filter(chain =>
    chain.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Combined effect: mount state + event listeners
  useEffect(() => {
    setMounted(true)

    // Close on outside click
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const handleKeys = (event) => {
    if (!isOpen) return
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      setSearchQuery('')
      triggerRef.current?.focus()
      return
    }
    const options = Array.from(dropdownRef.current?.querySelectorAll('[role="option"]') || [])
    const index = options.indexOf(event.target)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const next = index < 0 ? (direction > 0 ? 0 : options.length - 1) : (index + direction + options.length) % options.length
      options[next]?.focus()
    } else if (index >= 0 && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault()
      options[event.key === 'Home' ? 0 : options.length - 1]?.focus()
    } else if (event.key === 'Enter' && event.target === inputRef.current && filteredChains.length) {
      event.preventDefault()
      handleSelect(filteredChains[0])
    }
  }

  const handleToggle = () => {
    if (!disabled && mounted) {
      setIsOpen(!isOpen)
    }
  }

  const handleSelect = (chain) => {
    setIsOpen(false)
    setSearchQuery('')
    onSelect?.(chain)
    triggerRef.current?.focus()
  }

  const clearSearch = () => {
    setSearchQuery('')
    inputRef.current?.focus()
  }

  return (
    <div ref={dropdownRef} onKeyDown={handleKeys} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }} className={`chain-dropdown relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        ref={triggerRef}
        aria-controls={isOpen ? listId : undefined}
        onClick={handleToggle}
        disabled={disabled}
        className={`
          chain-dropdown-trigger
          w-full flex items-center gap-2 px-2 py-1.5 rounded-md
          text-sm transition-colors
          text-zinc-600 dark:text-zinc-400
          hover:bg-zinc-100 dark:hover:bg-neutral-800
          hover:text-zinc-900 dark:hover:text-zinc-100
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedChain ? (
          <>
            <ChainIcon chain={selectedChain.icon} size={18} />
            <span className="flex-1 text-left truncate">
              {selectedChain.name}
            </span>
          </>
        ) : placeholderChain ? (
          <>
            <ChainIcon chain={placeholderChain.icon} size={18} />
            <span className="flex-1 text-left truncate text-zinc-500 dark:text-zinc-400">
              {placeholderChain.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-left truncate text-zinc-500 dark:text-zinc-400">
            {placeholder}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform flex-shrink-0
            ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {mounted && isOpen && (
        <div 
          className="
            chain-dropdown-menu
            absolute z-[9999] top-full left-0 right-0 mt-1
            rounded-md shadow-lg overflow-hidden
            border border-zinc-200 dark:border-neutral-700
            bg-white dark:bg-neutral-900
          "
        >
          {/* Search */}
          <div className="p-2 border-b border-zinc-100 dark:border-neutral-800">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                aria-label={searchPlaceholder}
                aria-controls={listId}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  chain-dropdown-search
                  w-full px-3 py-1.5 text-sm rounded-md
                  bg-zinc-50 dark:bg-neutral-800
                  text-zinc-900 dark:text-zinc-100
                  placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                  border border-zinc-200 dark:border-neutral-700
                  focus:outline-none focus:border-zinc-400 dark:focus:border-neutral-500
                  transition-colors
                "
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={searchPlaceholder.includes('搜索') ? '清除搜索' : 'Clear search'}
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 
                    text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
                    transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Chain List */}
          <div id={listId} role="listbox" aria-label={placeholder} className="max-h-64 overflow-y-auto p-1">
            {filteredChains.length > 0 ? (
              filteredChains.map((chain) => {
                const isSelected = chain.id === selectedChainId
                return (
                  <button
                    type="button"
                    tabIndex={-1}
                    key={chain.id}
                    onClick={() => handleSelect(chain)}
                    role="option"
                    aria-selected={isSelected}
                    className={`
                      chain-dropdown-item focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]
                      w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md
                      text-sm transition-colors text-left
                      ${isSelected
                        ? 'chain-selected'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-neutral-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }
                    `}
                  >
                    <ChainIcon chain={chain.icon} size={16} />
                    <span className="truncate">{chain.name}</span>
                  </button>
                )
              })
            ) : (
              <div className="px-2.5 py-3 text-center text-sm text-zinc-400 dark:text-zinc-500 font-normal">
                {noResultsText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ChainDropdown
