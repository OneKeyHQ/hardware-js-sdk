'use client'

import Image from 'next/image'

const getBasePath = () => process.env.NEXT_PUBLIC_BASE_PATH
  ? process.env.NEXT_PUBLIC_BASE_PATH.replace(/\/$/, '')
  : ''

// Chain icon component using PNG images from public/icons/chains/
export function ChainIcon({ chain, size = 20, className = '' }) {
  const basePath = getBasePath()
  const chainMap = {
    ethereum: 'ethereum',
    eth: 'ethereum',
    bitcoin: 'bitcoin',
    btc: 'bitcoin',
    solana: 'solana',
    sol: 'solana',
    cosmos: 'cosmos',
    atom: 'cosmos',
    aptos: 'aptos',
    apt: 'aptos',
    near: 'near',
    ton: 'ton',
    polkadot: 'polkadot',
    dot: 'polkadot',
    cardano: 'cardano',
    ada: 'cardano',
    tron: 'tron',
    trx: 'tron',
    sui: 'sui',
    xrp: 'xrp',
    ripple: 'xrp',
    algorand: 'algorand',
    algo: 'algorand',
    filecoin: 'filecoin',
    fil: 'filecoin',
    kaspa: 'kaspa',
    kas: 'kaspa',
    conflux: 'conflux',
    cfx: 'conflux',
    nervos: 'nervos',
    ckb: 'nervos',
    starcoin: 'starcoin',
    stc: 'starcoin',
    stellar: 'stellar',
    xlm: 'stellar',
    nostr: 'nostr',
    nexa: 'nexa',
    nem: 'nem',
    xem: 'nem',
    dynex: 'dynex',
    dnx: 'dynex',
    alephium: 'alephium',
    alph: 'alephium',
    benfen: 'benfen',
    bfc: 'benfen',
    scdo: 'scdo',
  }

  const normalizedChain = chainMap[chain?.toLowerCase()] || chain?.toLowerCase()
  const iconPath = `${basePath}/icons/chains/${normalizedChain}.png`

  return (
    <Image
      src={iconPath}
      alt={`${chain} icon`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      unoptimized
    />
  )
}

// Pre-defined chain icon components using PNG
export function EthereumIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="ethereum" size={size} className={className} />
}

export function BitcoinIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="bitcoin" size={size} className={className} />
}

export function SolanaIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="solana" size={size} className={className} />
}

export function CosmosIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="cosmos" size={size} className={className} />
}

export function AptosIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="aptos" size={size} className={className} />
}

export function NearIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="near" size={size} className={className} />
}

export function TonIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="ton" size={size} className={className} />
}

export function PolkadotIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="polkadot" size={size} className={className} />
}

export function CardanoIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="cardano" size={size} className={className} />
}

export function TronIcon({ className = "w-5 h-5", size = 20 }) {
  return <ChainIcon chain="tron" size={size} className={className} />
}

// Chain icons map for LandingPage
export const chainIcons = {
  Ethereum: EthereumIcon,
  Bitcoin: BitcoinIcon,
  Solana: SolanaIcon,
  Cosmos: CosmosIcon,
  Aptos: AptosIcon,
  NEAR: NearIcon,
  TON: TonIcon,
  Polkadot: PolkadotIcon,
  Cardano: CardanoIcon,
  Tron: TronIcon,
}

// Generic placeholder for chains without icons
export function GenericChainIcon({ className = "w-5 h-5", name }) {
  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 flex items-center justify-center text-white text-xs font-bold`}>
      {name?.charAt(0) || '?'}
    </div>
  )
}

// Device icon component
export function DeviceIcon({ device, size = 40, className = '' }) {
  const basePath = getBasePath()
  const deviceMap = {
    classic: 'classic1s',
    'classic 1s': 'classic1s',
    'classic1s': 'classic1s',
    mini: 'mini',
    touch: 'touch',
    pro: 'pro-black',
    'pro-black': 'pro-black',
    'pro-white': 'pro-white',
  }

  const normalizedDevice = deviceMap[device?.toLowerCase()] || device?.toLowerCase()
  const iconPath = `${basePath}/icons/devices/${normalizedDevice}.png`

  return (
    <Image
      src={iconPath}
      alt={`OneKey ${device}`}
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  )
}

// OneKey logo
export function OneKeyIcon({ size = 24, className = '' }) {
  const basePath = getBasePath()
  return (
    <Image
      src={`${basePath}/icons/onekey.png`}
      alt="OneKey"
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  )
}
