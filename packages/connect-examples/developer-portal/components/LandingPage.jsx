'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Usb,
  Bluetooth,
  Smartphone,
  QrCode,
  ArrowUpRight,
  ChevronDown,
  Shield,
  Layers,
  Cable,
  X,
} from 'lucide-react'
import { ChainIcon } from './ChainIcons'

const V2_CHAIN_CHIPS = [
  { name: 'EVM', icon: 'ethereum' },
  { name: 'Bitcoin', icon: 'bitcoin' },
  { name: 'Solana', icon: 'solana' },
  { name: 'TON', icon: 'ton' },
  { name: 'TRON', icon: 'tron' },
  { name: 'Cardano', icon: 'cardano' },
  { name: 'Aptos', icon: 'aptos' },
  { name: 'Sui', icon: 'sui' },
  { name: 'Cosmos', icon: 'cosmos' },
  { name: 'Polkadot', icon: 'polkadot' },
  { name: 'NEAR', icon: 'near' },
  { name: 'Kaspa', icon: 'kaspa' },
  { name: 'XRP', icon: 'xrp' },
  { name: 'Filecoin', icon: 'filecoin' },
  { name: 'Conflux', icon: 'conflux' },
  { name: 'Algorand', icon: 'algorand' },
  { name: 'NEM', icon: 'nem' },
  { name: 'Nostr', icon: 'nostr' },
  { name: 'Starcoin', icon: 'starcoin' },
]

const V1_CHAIN_CHIPS = [
  { name: 'Stellar', icon: 'stellar' },
  { name: 'Alephium', icon: 'alephium' },
  { name: 'Benfen', icon: 'benfen' },
  { name: 'Nexa', icon: 'nexa' },
  { name: 'Dynex', icon: 'dynex' },
  { name: 'Nervos', icon: 'nervos' },
  { name: 'SCDO', icon: 'scdo' },
  { name: 'Neo (chain)' },
]

const DEVICE_LINEUP = [
  { name: 'Classic 1s', src: '/icons/devices/classic1s.png', protocol: 'V1' },
  { name: 'Mini', src: '/icons/devices/mini.png', protocol: 'V1' },
  { name: 'Touch', src: '/icons/devices/touch.png', protocol: 'V1' },
  { name: 'Pro', src: '/icons/devices/pro.png', protocol: 'V1' },
  { name: 'Pro 2', src: '/icons/devices/pro2.png', protocol: 'V2' },
  { name: 'Neo', src: '/icons/devices/neo.png', protocol: 'V2' },
]

const primaryCtaStyle = {
  backgroundColor: '#00B812',
  color: '#101111',
  cursor: 'pointer',
}

const heroSecurity05 = '/landing-page/security-05.png'
const heroSecurity04 = '/landing-page/security-04.png'
const heroSecurity03 = '/landing-page/security-03.png'
const heroSecurity02 = '/landing-page/security-02.png'
const heroSecurity01 = '/landing-page/security-01.png'

const getFooterData = (isZh, locale) => {
  const portalColumn = {
    title: isZh ? 'OneKey 开发者门户' : 'OneKey Developer portal',
    items: [
      { label: isZh ? '首页' : 'Home', href: `/${locale}` },
      { label: 'Playground', href: 'https://hardware-example.onekey.so/' },
      { label: 'Hardware-js-sdk', href: 'https://github.com/OneKeyHQ/hardware-js-sdk/' },
      { label: 'Cross-inpage-provider', href: 'https://github.com/OneKeyHQ/cross-inpage-provider' },
      { label: 'App-monorepo', href: 'https://github.com/OneKeyHQ/app-monorepo' },
    ],
  }

  const legalColumn = {
    title: isZh ? '法律' : 'Legal',
    items: [
      { label: isZh ? '用户协议' : 'User Agreement', href: 'https://help.onekey.so/hc/articles/11461297' },
      { label: isZh ? '隐私政策' : 'Privacy Policy', href: 'https://help.onekey.so/hc/articles/11461298' },
      { label: isZh ? '官方成员验证' : 'Team Verification', href: 'https://onekey.so/team-verification' },
    ],
  }

  return { portalColumn, legalColumn }
}

const IntegrationCard = ({
  title,
  description,
  icon: Icon,
  iconSrc,
  href,
  cta,
  badge,
  className = '',
}) => (
  <Link
    href={href}
    className={`flex min-h-[210px] w-full flex-col justify-between rounded-[16px] border border-white/10 bg-[#1a1c1b] p-[24px] no-underline transition-colors hover:border-[#00B812]/40 sm:min-h-[234px] sm:p-[32px] ${className}`}
  >
    <div className="flex flex-col gap-[24px]">
      <div className="flex items-center gap-[12px]">
        <div className="flex size-[38px] items-center justify-center rounded-full bg-[#141514]">
          {iconSrc ? (
            <img src={iconSrc} alt="" className="size-[20px]" />
          ) : (
            <Icon className="size-[20px] text-white" />
          )}
        </div>
        <span className="text-[20px] font-semibold leading-[25px] text-white sm:text-[24px] sm:leading-[30px]">
          {title}
        </span>
        {badge ? (
          <span className="rounded-full bg-[#00B812]/15 px-[8px] py-[2px] text-[11px] font-medium text-[#57E668]">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="text-[16px] leading-[20px] text-white/70">{description}</span>
    </div>
    <div className="flex items-center gap-[4px] text-[#00B812]">
      <span className="text-[18px] leading-[20px]">{cta}</span>
      <ArrowUpRight className="size-[16px]" />
    </div>
  </Link>
)

export function LandingPage({ locale = 'en' }) {
  const router = useRouter()
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const isZh = locale === 'zh'

  const handleLanguageChange = (newLocale) => {
    setShowLanguageMenu(false)
    router.push(`/${newLocale}`)
  }

  const copy = isZh
    ? {
        heroKicker: 'Hardware SDK 1.2.x',
        heroTitle: '硬件签名，从文档跑通',
        heroSubtitle: '同一套 JS API 覆盖 Protocol V1 与 V2。WebUSB、BLE、Native，五分钟拿到第一个地址。',
        ctaPrimary: '快速开始',
        ctaSecondary: '更新日志',
        ctaChains: '查看链支持',
        viewDocs: '查看文档',
        recommended: '推荐',
        hardwareTitle: '选择接入路径',
        hardwareSubtitle: 'USB 用 hd-common-connect-sdk；移动端 BLE 用 hd-ble-sdk。',
        dappTitle: 'dApp 接入',
        dappSubtitle: '软件钱包 Provider 与 UI Kit，和硬件 SDK 是两条线。',
        offlineTitle: '离线签名',
        offlineSubtitle: '二维码 Air-Gap。仅 Pro / Pro 2，Neo 无摄像头。',
        chainsTitle: '公开链方法',
        chainsSubtitle: '按 Core getSupportedProtocols() 统计，不是 App 的 100+ 币种目录。',
        devicesTitle: '同一套 API，两代协议',
        devicesSubtitle: 'Classic / Mini / Touch / Pro 走 Protocol V1。Pro 2 / Neo 走 Protocol V2。不要用 PID 判断。',
        devicesCta: '查看设备矩阵',
        proofLabel1: '公开链系列',
        proofValue1: '19',
        proofNote1: 'V1+V2，含 EVM / BTC / SOL / TON',
        proofLabel2: '仅 V1 系列',
        proofValue2: '8',
        proofNote2: '含 Stellar、Alephium、Neo 链，暂不在 Pro 2',
        proofLabel3: '传输',
        proofValue3: '4',
        proofNote3: 'WebUSB · RN BLE · Native BLE · Air-Gap',
        v1OnlyLabel: '目前仅 V1',
        benefitsTitle: '接入时真正用得到的',
        benefit1Title: '协议自动探测',
        benefit1Body: '不要用 PID 或蓝牙名判断 V1/V2。连上以后读 connectProtocol。',
        benefit2Title: '同一套调用',
        benefit2Body: 'HardwareSDK.method(connectId, deviceId, params)。Pro 2 不是第二套 SDK。',
        benefit3Title: '钱包绑定可持久化',
        benefit3Body: '只存 deviceId + passphraseState。不要存固件 session_id。',
        faqTitle: '接入常见问题',
        faq1Q: '必须接硬件吗？',
        faq1A: '硬件 SDK 是给设备签名用的。dApp 接软件钱包走 Provider / Web3Modal。两条产品线。',
        faq2Q: 'Web 和移动端差在哪？',
        faq2A: 'Web 用 WebUSB（HTTPS + 用户手势）。React Native 用 hd-ble-sdk。Android/iOS/Flutter 走 lowlevel 插件。',
        faq3Q: 'Pro 2 / Neo 支持哪些链？',
        faq3A: '只有 Core 声明了 V1+V2 的方法才能调。BTC/EVM/SOL/TON 等可以；Stellar、Alephium、Nexa、Dynex、Nervos、SCDO、Benfen、Neo 链目前仍是 V1。',
        faq4Q: '上线前要注意什么？',
        faq4A: '按设备串行调用；传输出错不要重放升级/擦除/签名；固件升级 Pro 用 V3，Pro 2/Neo 用 V4。',
        finalTitle: '从快速开始接到生产',
        finalBody: '先跑通 WebUSB，再按平台补 BLE，按机型查链支持。',
        supportTitle: '需要集成支持？',
        supportSubtitle: '获取架构评审、传输方案选择与生产环境落地支持。',
        supportPrimary: '提交需求',
      }
    : {
        heroKicker: 'Hardware SDK 1.2.x',
        heroTitle: 'Hardware signing, from the docs',
        heroSubtitle: 'One JavaScript API for Protocol V1 and V2. WebUSB, BLE, or native — first address in minutes.',
        ctaPrimary: 'Get Started',
        ctaSecondary: 'Changelog',
        ctaChains: 'Chain support',
        viewDocs: 'View docs',
        recommended: 'Recommended',
        devicesTitle: 'One API, two protocols',
        devicesSubtitle: 'Classic / Mini / Touch / Pro speak Protocol V1. Pro 2 / Neo speak Protocol V2. Do not branch on PID.',
        devicesCta: 'Device matrix',
        hardwareTitle: 'Pick a transport',
        hardwareSubtitle: 'USB through hd-common-connect-sdk. Mobile BLE through hd-ble-sdk.',
        dappTitle: 'dApp integration',
        dappSubtitle: 'Software-wallet Provider and UI kits. Separate from the hardware SDK.',
        offlineTitle: 'Offline signing',
        offlineSubtitle: 'QR Air-Gap on Pro and Pro 2. Neo has no camera.',
        chainsTitle: 'Public chain methods',
        chainsSubtitle: 'Counted from Core getSupportedProtocols(), not the App coin catalog.',
        proofLabel1: 'V1+V2 families',
        proofValue1: '19',
        proofNote1: 'Including EVM, Bitcoin, Solana, TON',
        proofLabel2: 'V1-only families',
        proofValue2: '8',
        proofNote2: 'Including Stellar, Alephium, and Neo chain — not on Pro 2 yet',
        v1OnlyLabel: 'V1 only today',
        proofLabel3: 'Transports',
        proofValue3: '4',
        proofNote3: 'WebUSB · RN BLE · Native BLE · Air-Gap',
        benefitsTitle: 'What actually matters',
        benefit1Title: 'Live protocol detect',
        benefit1Body: 'Do not branch on PID or BLE name. Read connectProtocol after connect.',
        benefit2Title: 'One call shape',
        benefit2Body: 'HardwareSDK.method(connectId, deviceId, params). Pro 2 is not a second SDK.',
        benefit3Title: 'Persist wallet bindings',
        benefit3Body: 'Store deviceId + passphraseState only. Never firmware session_id.',
        faqTitle: 'Integration FAQ',
        faq1Q: 'Do I have to use hardware?',
        faq1A: 'The hardware SDK is for device signing. Software-wallet dApps use Provider / Web3Modal. Two product lines.',
        faq2Q: 'Web vs mobile?',
        faq2A: 'Web is WebUSB (HTTPS + user gesture). React Native uses hd-ble-sdk. Android/iOS/Flutter use the low-level plugin.',
        faq3Q: 'Which chains on Pro 2 / Neo?',
        faq3A: 'Only methods that declare V1+V2. BTC/EVM/SOL/TON work. Stellar, Alephium, Nexa, Dynex, Nervos, SCDO, Benfen, and Neo chain are still V1.',
        faq4Q: 'Before production?',
        faq4A: 'Serialize per device. Do not replay firmware/wipe/sign after a drop. Pro uses firmwareUpdateV3; Pro 2 / Neo use V4.',
        finalTitle: 'From first address to production',
        finalBody: 'Run WebUSB, then add BLE for your platform, then check chain support per device.',
        supportTitle: 'Need integration support?',
        supportSubtitle: 'Architecture review, transport choice, and production rollout.',
        supportPrimary: 'Submit a Request',
      }
  const integrationCards = [
    {
      title: isZh ? 'WebUSB 连接' : 'WebUSB Connection',
      description: isZh ? '适用于网页与桌面浏览器的 USB 传输。' : 'USB transport for web apps and desktop browsers.',
      icon: Usb,
      href: `/${locale}/hardware-sdk/transport/web-usb`,
      cta: copy.viewDocs,
      badge: copy.recommended,
    },
    {
      title: isZh ? 'React Native BLE' : 'React Native BLE',
      description: isZh ? '适用于 React Native 的 BLE 传输。' : 'BLE transport for React Native apps.',
      icon: Bluetooth,
      href: `/${locale}/hardware-sdk/transport/react-native-ble`,
      cta: copy.viewDocs,
    },
    {
      title: isZh ? '原生移动端 BLE' : 'Native Mobile BLE',
      description: isZh ? '适用于原生移动端的 BLE 传输。' : 'BLE transport for native mobile apps.',
      icon: Smartphone,
      href: `/${locale}/hardware-sdk/transport/native-ble`,
      cta: copy.viewDocs,
    },
    /*
    {
      title: isZh ? 'OneKey Agent Wallet' : 'OneKey Agent Wallet',
      description: isZh
        ? '在 OneKey GUI 中管理 Agent 钱包，绑定 keyless 账号，并将高风险操作交给硬件确认。'
        : 'Manage agent wallets in the OneKey GUI, bind keyless accounts, and escalate high-risk actions to hardware confirmation.',
      icon: Bot,
      href: `/${locale}/agent-wallet`,
      cta: copy.viewDocs,
    },
    */
  ]

  const dappCards = [
    {
      title: isZh ? 'Provider API' : 'Provider API',
      description: isZh ? 'Provider 接入规范、支持链与签名能力说明。' : 'Provider integration specs, supported chains, and signing capabilities.',
      icon: Usb,
      href: `/${locale}/connect-to-software/provider`,
      cta: copy.viewDocs,
      iconSrc: '/landing-page/icon-provider.svg',
    },
    {
      title: isZh ? 'Web3Modal UI 组件' : 'Web3Modal UI Kit',
      description: isZh ? '可直接集成的钱包连接 UI，支持移动端。' : 'Drop-in wallet connection UI with mobile support.',
      icon: Bluetooth,
      href: `/${locale}/connect-to-software/wallet-ui/web3modal`,
      cta: copy.viewDocs,
      iconSrc: '/landing-page/icon-web3Modal.svg',
    },
  ]

  const offlineCards = [
    {
      title: isZh ? 'Air-Gapped QR 流程' : 'Air-Gapped QR Flow',
      description: isZh ? '通过二维码离线签名与数据交换。' : 'Sign transactions offline with QR-based data exchange.',
      icon: QrCode,
      href: `/${locale}/air-gap`,
      cta: copy.viewDocs,
    },
  ]

  return (
    <div
      className="flex min-h-screen flex-col bg-[#101111] text-white"
      style={{ fontFamily: '"Stabil Grotesk", sans-serif' }}
    >
      <main className="flex flex-col gap-[72px] sm:gap-[96px] lg:gap-[120px]">
        <section
          className="relative w-full overflow-hidden"
          style={{
            backgroundImage: "url('/landing-page/hero-bg.svg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
          }}
        >
          <div className="relative mx-auto min-h-[560px] w-full max-w-[1440px] lg:h-[810px] lg:min-h-0">
            <div className="absolute inset-x-[20px] top-[84px] z-10 flex flex-col items-center text-center sm:inset-x-[32px] sm:top-[104px] lg:left-[64px] lg:right-auto lg:top-[169px] lg:w-[711px] lg:items-start lg:text-left">
              <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#00B812]">
                {copy.heroKicker}
              </p>
              <h1 className="mt-[12px] max-w-full text-[36px] font-semibold leading-[40px] text-white sm:text-[44px] sm:leading-[48px] lg:text-[52px] lg:leading-[56px]">
                {copy.heroTitle}
              </h1>
              <p className="mt-[16px] max-w-[620px] text-[16px] leading-[24px] text-white/65">
                {copy.heroSubtitle}
              </p>
              <pre
                className="mt-[24px] hidden max-w-[620px] overflow-x-auto rounded-[12px] border border-white/10 bg-[#141514] p-[16px] text-left text-[12px] leading-[18px] text-[#86EA90] lg:block"
                style={{ fontFamily: '"Geist Mono", ui-monospace, monospace' }}
              >
{`await HardwareSDK.init({ env: 'webusb', fetchConfig: true })
const devices = await HardwareSDK.searchDevices()
if (!devices.success) throw new Error(devices.payload.error)
const { connectId } = devices.payload[0]`}
              </pre>
              <div className="mt-[32px] grid w-full max-w-[420px] grid-cols-1 gap-[12px] sm:grid-cols-2 lg:mt-[40px] lg:flex lg:w-auto lg:max-w-none lg:items-center lg:gap-[8px]">
                <button
                  type="button"
                  onClick={() => {
                    router.push(`/${locale}/hardware-sdk/getting-started`)
                  }}
                  className="flex min-h-[52px] items-center justify-center rounded-[50px] px-[24px] py-[14px] text-[16px] font-medium transition-opacity hover:opacity-90 sm:px-[32px] sm:py-[18px]"
                  style={primaryCtaStyle}
                >
                  {copy.ctaPrimary}
                </button>
                <Link
                  href={`/${locale}/changelog`}
                  className="flex min-h-[52px] items-center justify-center rounded-[50px] bg-white px-[24px] py-[14px] text-[16px] font-medium text-[#101111] no-underline sm:px-[32px] sm:py-[18px]"
                  style={{ color: '#101111' }}
                >
                  {copy.ctaSecondary}
                </Link>
                <Link
                  href={`/${locale}/hardware-sdk/concepts/chain-support`}
                  className="flex min-h-[52px] items-center justify-center rounded-[50px] border border-white/25 px-[24px] py-[14px] text-[16px] font-medium text-white no-underline sm:px-[32px] sm:py-[18px]"
                >
                  {copy.ctaChains}
                </Link>
              </div>
            </div>
              <img
                src={heroSecurity05}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+334.5px)] top-[-65px] hidden h-[919px] w-[915px] -translate-x-1/2 object-cover opacity-70 lg:block"
              />
              <img
                src={heroSecurity04}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+309.5px)] top-[11px] hidden h-[863px] w-[831px] -translate-x-1/2 object-cover lg:block"
              />
              <img
                src={heroSecurity03}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+309.5px)] top-[11px] hidden h-[863px] w-[831px] -translate-x-1/2 object-cover opacity-20 lg:block"
              />
              <img
                src={heroSecurity02}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+309.5px)] top-[11px] hidden h-[863px] w-[831px] -translate-x-1/2 object-cover lg:block"
              />
              <img
                src={heroSecurity01}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+309.5px)] top-[11px] hidden h-[863px] w-[831px] -translate-x-1/2 object-cover opacity-50 lg:block"
              />
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-[16px] px-[20px] sm:grid-cols-3 sm:px-[32px] lg:px-[64px]">
          {[
            { value: copy.proofValue1, label: copy.proofLabel1, note: copy.proofNote1 },
            { value: copy.proofValue2, label: copy.proofLabel2, note: copy.proofNote2 },
            { value: copy.proofValue3, label: copy.proofLabel3, note: copy.proofNote3 },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[16px] border border-white/10 bg-[#161716] px-[24px] py-[20px]"
            >
              <div className="text-[32px] font-semibold leading-[36px] text-white">{item.value}</div>
              <div className="mt-[8px] text-[14px] font-medium text-white/80">{item.label}</div>
              <div className="mt-[4px] text-[13px] text-white/50">{item.note}</div>
            </div>
          ))}
        </section>

        <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-[20px] sm:px-[32px] lg:px-[64px]">
          <div className="flex w-full flex-col items-center gap-[8px] text-center">
            <h2 className="text-[32px] font-medium leading-[38px] text-white sm:text-[40px] sm:leading-[46px]">
              {copy.devicesTitle}
            </h2>
            <span className="max-w-[720px] text-[16px] text-white/60">{copy.devicesSubtitle}</span>
          </div>
          <div className="mt-[24px] grid w-full grid-cols-2 gap-[12px] sm:grid-cols-3 lg:grid-cols-6">
            {DEVICE_LINEUP.map((device) => (
              <div
                key={device.name}
                className="flex flex-col items-center gap-[10px] rounded-[16px] border border-white/10 bg-[#161716] px-[12px] py-[16px]"
              >
                <img src={device.src} alt="" className="h-[72px] w-auto object-contain" />
                <div className="text-[14px] font-medium text-white">{device.name}</div>
                <span
                  className={`rounded-full px-[8px] py-[2px] text-[11px] font-medium ${
                    device.protocol === 'V2'
                      ? 'bg-[#00B812]/15 text-[#57E668]'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {device.protocol}
                </span>
              </div>
            ))}
          </div>
          <Link
            href={`/${locale}/hardware-sdk/concepts/devices`}
            className="mt-[20px] inline-flex items-center gap-[4px] text-[16px] text-[#00B812] no-underline"
          >
            {copy.devicesCta}
            <ArrowUpRight className="size-[16px]" />
          </Link>
        </section>

        <section
          id="hardware-integration"
          className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-[20px] sm:px-[32px] lg:px-[64px]"
        >
          <div className="flex w-full flex-col items-center gap-[8px] text-center">
            <h2
              className="text-[32px] font-medium leading-[38px] sm:text-[40px] sm:leading-[46px]"
              style={{ color: '#FFFFFF' }}
            >
              {copy.hardwareTitle}
            </h2>
            <span className="text-[16px]" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {copy.hardwareSubtitle}
            </span>
          </div>
          <div className="mt-[24px] grid w-full grid-cols-1 gap-[16px] sm:gap-[24px] lg:grid-cols-3 lg:gap-[32px]">
            {integrationCards.map((card) => (
              <IntegrationCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-[20px] sm:px-[32px] lg:px-[64px]">
          <div className="flex w-full flex-col items-center gap-[8px] text-center">
            <h2
              className="text-[32px] font-medium leading-[38px] sm:text-[40px] sm:leading-[46px]"
              style={{ color: '#FFFFFF' }}
            >
              {copy.dappTitle}
            </h2>
            <span className="text-[16px]" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {copy.dappSubtitle}
            </span>
          </div>
          <div className="mt-[24px] grid w-full grid-cols-1 gap-[16px] sm:gap-[24px] lg:grid-cols-3 lg:gap-[32px]">
            {dappCards.map((card) => (
              <IntegrationCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-[20px] sm:px-[32px] lg:px-[64px]">
          <div className="flex w-full flex-col items-center gap-[8px] text-center">
            <h2
              className="text-[32px] font-medium leading-[38px] sm:text-[40px] sm:leading-[46px]"
              style={{ color: '#FFFFFF' }}
            >
              {copy.offlineTitle}
            </h2>
            <span className="text-[16px]" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {copy.offlineSubtitle}
            </span>
          </div>
          <div className="mt-[24px] grid w-full grid-cols-1 gap-[16px] sm:gap-[24px] lg:grid-cols-3 lg:gap-[32px]">
            {offlineCards.map((card) => (
              <IntegrationCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[1440px] flex-col px-[20px] sm:px-[32px] lg:px-[64px]">
          <div className="flex w-full flex-col items-center gap-[8px] text-center">
            <h2 className="text-[32px] font-medium leading-[38px] text-white sm:text-[40px] sm:leading-[46px]">
              {copy.chainsTitle}
            </h2>
            <span className="max-w-[720px] text-[16px] text-white/60">{copy.chainsSubtitle}</span>
          </div>
          <div className="mt-[24px] flex flex-wrap justify-center gap-[8px]">
            {V2_CHAIN_CHIPS.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-[8px] rounded-full border border-white/10 bg-[#161716] px-[12px] py-[8px] text-[13px] text-white/80"
              >
                <ChainIcon chain={item.icon} size={16} />
                {item.name}
              </span>
            ))}
          </div>
          <p className="mt-[20px] text-center text-[13px] text-white/40">{copy.v1OnlyLabel}</p>
          <div className="mt-[8px] flex flex-wrap justify-center gap-[8px]">
            {V1_CHAIN_CHIPS.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-[8px] rounded-full border border-dashed border-white/15 bg-transparent px-[12px] py-[8px] text-[13px] text-white/55"
              >
                {item.icon ? <ChainIcon chain={item.icon} size={16} /> : null}
                {item.name}
              </span>
            ))}
          </div>
          <div className="mt-[20px] flex justify-center">
            <Link
              href={`/${locale}/hardware-sdk/concepts/chain-support`}
              className="inline-flex items-center gap-[4px] text-[16px] text-[#00B812] no-underline"
            >
              {copy.ctaChains}
              <ArrowUpRight className="size-[16px]" />
            </Link>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-[16px] px-[20px] sm:grid-cols-3 sm:px-[32px] lg:px-[64px]">
          <div className="sm:col-span-3">
            <h2 className="text-center text-[32px] font-medium leading-[38px] text-white sm:text-[40px] sm:leading-[46px]">
              {copy.benefitsTitle}
            </h2>
          </div>
          {[
            { icon: Cable, title: copy.benefit1Title, body: copy.benefit1Body },
            { icon: Layers, title: copy.benefit2Title, body: copy.benefit2Body },
            { icon: Shield, title: copy.benefit3Title, body: copy.benefit3Body },
          ].map((item) => (
            <div key={item.title} className="rounded-[16px] border border-white/10 bg-[#161716] p-[24px]">
              <item.icon className="size-[20px] text-[#00B812]" />
              <div className="mt-[16px] text-[18px] font-semibold text-white">{item.title}</div>
              <p className="mt-[8px] text-[14px] leading-[20px] text-white/60">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto w-full max-w-[880px] px-[20px] sm:px-[32px]">
          <h2 className="text-center text-[32px] font-medium leading-[38px] text-white sm:text-[40px] sm:leading-[46px]">
            {copy.faqTitle}
          </h2>
          <div className="mt-[24px] divide-y divide-white/10 border-y border-white/10">
            {[
              { q: copy.faq1Q, a: copy.faq1A },
              { q: copy.faq2Q, a: copy.faq2A },
              { q: copy.faq3Q, a: copy.faq3A },
              { q: copy.faq4Q, a: copy.faq4A },
            ].map((item) => (
              <details key={item.q} className="group py-[16px]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-[16px] text-[17px] font-medium text-white marker:content-none">
                  {item.q}
                  <ChevronDown className="size-[18px] shrink-0 text-white/50 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-[8px] pr-[32px] text-[15px] leading-[22px] text-white/60">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1440px] px-[20px] sm:px-[32px] lg:px-[64px]">
          <div className="flex flex-col items-start gap-[20px] rounded-[24px] border border-[#00B812]/25 bg-[#141914] p-[24px] sm:p-[40px] lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[26px] font-medium text-white sm:text-[30px]">{copy.finalTitle}</h2>
              <p className="mt-[8px] max-w-[560px] text-[16px] text-white/60">{copy.finalBody}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/hardware-sdk/getting-started`)}
              className="flex min-h-[48px] items-center justify-center rounded-[50px] px-[28px] py-[12px] text-[16px] font-medium"
              style={primaryCtaStyle}
            >
              {copy.ctaPrimary}
            </button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1440px] px-[20px] sm:px-[32px] lg:px-[64px]">
          <div
            className="relative flex flex-col items-start gap-[32px] rounded-[24px] bg-[#222222] p-[24px] sm:p-[32px] lg:flex-row lg:items-center lg:gap-[40px] lg:p-[40px]"
          >
            <div className="flex w-full max-w-[591px] flex-col gap-[32px] lg:gap-[40px]">
              <div className="flex flex-col gap-[8px]">
                <div className="text-[26px] font-medium leading-[32px] text-white sm:text-[30px] sm:leading-[36px]">
                  {copy.supportTitle}
                </div>
                <div className="text-[16px] leading-[20px] text-white/70">
                  {copy.supportSubtitle}
                </div>
              </div>
              <div className="flex w-full flex-col gap-[12px] sm:flex-row sm:flex-wrap sm:gap-[16px]">
                <a
                  href="https://help.onekey.so/hc/requests/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center justify-center gap-[8px] rounded-[50px] px-[20px] py-[10px] text-[16px] font-medium no-underline"
                  style={primaryCtaStyle}
                >
                  {copy.supportPrimary}
                </a>
                <a
                  href="https://github.com/OneKeyHQ/hardware-js-sdk/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center justify-center gap-[8px] rounded-[50px] border border-white px-[20px] py-[10px] text-[16px] font-medium text-white no-underline"
                >
                  GitHub Issues
                </a>
              </div>
            </div>
            <img
              src="/landing-page/device.png"
              alt="OneKey device"
              className="pointer-events-none hidden size-[400px] object-contain lg:absolute lg:right-[40px] lg:top-[-80px] lg:block"
            />
          </div>
        </section>
      </main>

      <footer className="mt-[72px] w-full rounded-t-[40px] bg-[#101111] sm:mt-[96px] sm:rounded-t-[64px] lg:mt-[120px]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[56px] px-[20px] py-[72px] sm:px-[32px] sm:py-[96px] lg:flex-row lg:gap-[133px] lg:px-[64px] lg:py-[120px]">
          <div className="flex shrink-0 flex-col gap-[10px]">
            <div className="flex flex-col gap-[16px]">
              <img
                src="/landing-page/onekey-brand.svg"
                alt="OneKey"
                className="h-[57px] w-[233px]"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex w-fit items-center gap-[8px] rounded-[50px] border border-white px-[20px] py-[10px] text-[16px] font-medium text-white"
                >
                  {isZh ? '中文' : 'English'}
                  <ChevronDown className={`size-[24px] transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
                </button>
                {showLanguageMenu && (
                  <div className="absolute left-0 top-full z-20 mt-[8px] flex flex-col overflow-hidden rounded-[12px] border border-white/10 bg-[#1a1a1a]">
                    <button
                      type="button"
                      onClick={() => handleLanguageChange('en')}
                      className={`px-[20px] py-[12px] text-left text-[14px] hover:bg-white/10 ${!isZh ? 'text-[#16d629]' : 'text-white'}`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLanguageChange('zh')}
                      className={`px-[20px] py-[12px] text-left text-[14px] hover:bg-white/10 ${isZh ? 'text-[#16d629]' : 'text-white'}`}
                    >
                      中文
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-[24px] pt-[10px]">
              <div className="flex items-center gap-[16px]">
                <a
                  href="https://twitter.com/onekeyHQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                >
                  <img src="/landing-page/social/twitter.svg" alt="" className="size-[24px]" />
                </a>
                <a
                  href="https://github.com/OneKeyHQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <img src="/landing-page/social/github.svg" alt="" className="size-[24px]" />
                </a>
                <a
                  href="https://discord.gg/onekey"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Discord"
                >
                  <img src="/landing-page/social/discord.svg" alt="" className="size-[24px]" />
                </a>
              </div>
              <div className="flex flex-col gap-[16px]">
                <div className="flex items-center gap-[16px]">
                  <a
                    href="https://github.com/OneKeyHQ"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="/landing-page/badge-osi.svg"
                      alt="Open Source"
                      className="h-[33px] w-[96px]"
                    />
                  </a>
                  <img
                    src="/landing-page/badge-cceal.svg"
                    alt="CCEAL 5+ ISO 27001"
                    className="h-[32px] w-[108px]"
                  />
                </div>
                <p className="text-[12px] leading-[15px] text-white/60">
                  Since 2019 - {new Date().getFullYear()} | OneKey Limited All Rights Reserved
                </p>
                <p className="mt-2 font-mono text-[11px] leading-[14px] text-white/40">
                  SDK v{process.env.NEXT_PUBLIC_SDK_VERSION || 'dev'}
                  {process.env.NEXT_PUBLIC_COMMIT_SHORT && process.env.NEXT_PUBLIC_COMMIT_SHORT !== 'local' && (
                    <>
                      {' '}
                      ·{' '}
                      <a
                        href={`https://github.com/OneKeyHQ/hardware-js-sdk/commit/${process.env.NEXT_PUBLIC_COMMIT_ID || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-white/60"
                      >
                        {process.env.NEXT_PUBLIC_COMMIT_SHORT}
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-[80px]">
            <div className="flex flex-wrap gap-[40px] lg:gap-[80px]">
              <div className="flex flex-col gap-[32px]">
                <p className="text-[14px] font-medium leading-[20px] text-white/60">
                  {getFooterData(isZh, locale).portalColumn.title}
                </p>
                <div className="flex flex-col gap-[16px]">
                  {getFooterData(isZh, locale).portalColumn.items.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="text-[16px] leading-[20px] text-white hover:text-white/80"
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-[32px]">
                <p className="text-[14px] font-medium leading-[17px] text-white/60">
                  {getFooterData(isZh, locale).legalColumn.title}
                </p>
                <div className="flex flex-col gap-[16px]">
                  {getFooterData(isZh, locale).legalColumn.items.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="text-[16px] font-medium leading-[20px] text-white hover:text-white/80"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[16px]">
              <button
                type="button"
                onClick={() => setShowSubscribeModal(true)}
                className="w-fit rounded-[50px] border border-white px-[20px] py-[10px] text-[16px] font-medium text-white hover:bg-white/10"
              >
                {isZh ? '订阅我们的通知' : 'Subscribe to our notifications'}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {showSubscribeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-[16px]">
          <div className="relative max-h-[calc(100dvh-32px)] w-full max-w-[520px] overflow-hidden rounded-[16px] bg-white">
            <button
              type="button"
              onClick={() => setShowSubscribeModal(false)}
              className="absolute right-[12px] top-[12px] z-10 flex size-[44px] items-center justify-center rounded-full bg-black/10 hover:bg-black/20"
              aria-label="Close"
            >
              <X className="size-[20px] text-gray-600" />
            </button>
            <iframe
              title="Subscribe to OneKey notifications"
              width="100%"
              height="640"
              src="https://42580da6.sibforms.com/serve/MUIEAI9xKoDAfTUz53hH6tfFw33F9jhgZ4pvLBMCebFgxpaWbthSByPZWMaeONkK5X2ffORCqwK1J-ZPnWiv0QO7xOKU7GNASRGHZkksxcx-GnE0kkPbJ-GFDvZ5MC1vPT1lybkIKZZxZI5eXofyZQqeXNaaGT6-nQJ1hNb5FG0tvGLpgNK3oBe9Wvx3lpghzTTkwiYcWH25Xt1o"
              allowFullScreen
              style={{ display: 'block', maxWidth: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
