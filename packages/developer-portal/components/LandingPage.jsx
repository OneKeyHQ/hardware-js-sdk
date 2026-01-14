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
  X,
} from 'lucide-react'

const heroSecurity05 = '/landing-page/security-05.svg'
const heroSecurity04 = '/landing-page/security-04.svg'
const heroSecurity03 = '/landing-page/security-03.svg'
const heroSecurity02 = '/landing-page/security-02.svg'
const heroSecurity01 = '/landing-page/security-01.svg'

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

const IntegrationCard = ({ title, description, icon: Icon, iconSrc, href, cta, className = '' }) => (
  <Link
    href={href}
    className={`flex h-[234px] w-full flex-col justify-between rounded-[16px] border border-white/10 bg-[#222] p-[32px] no-underline ${className}`}
  >
    <div className="flex flex-col gap-[24px]">
      <div className="flex items-center gap-[12px]">
        <div className="flex size-[38px] items-center justify-center rounded-full bg-[#191919]">
          {iconSrc ? (
            <img src={iconSrc} alt="" className="size-[20px]" />
          ) : (
            <Icon className="size-[20px] text-white" />
          )}
        </div>
        <p className="text-[24px] font-semibold leading-[30px] text-white">
          {title}
        </p>
      </div>
      <p className="text-[16px] leading-[20px] text-white/70">
        {description}
      </p>
    </div>
    <div className="flex items-center gap-[4px] text-[#16d629]">
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
        heroTitle: 'OneKey 开发者门户',
        heroSubtitle: '用 OneKey 硬件构建安全的 Web3 体验。',
        ctaPrimary: '开始构建',
        ctaSecondary: '更新日志',
        viewDocs: '查看文档',
        hardwareTitle: '硬件接入',
        hardwareSubtitle: '通过 USB 或 BLE 连接 OneKey 设备。',
        dappTitle: 'dApp 接入',
        dappSubtitle: 'SDK 与 API 用于钱包连接与签名。',
        offlineTitle: '离线签名',
        offlineSubtitle: '使用二维码进行离线签名。',
        supportTitle: '需要集成支持？',
        supportSubtitle: '获取架构评审、传输方案选择与生产环境落地支持。',
        supportPrimary: '提交需求',
      }
    : {
        heroTitle: 'OneKey Developer Portal',
        heroSubtitle: 'Integrate secure, hardware-backed signing into your dApp, wallet, or blockchain stack.',
        ctaPrimary: 'Get Started',
        ctaSecondary: 'View Changelog',
        viewDocs: 'View docs',
        hardwareTitle: 'Hardware Integration',
        hardwareSubtitle: 'Connect to OneKey devices over USB or BLE transports.',
        dappTitle: 'dApp Integration',
        dappSubtitle: 'SDKs and APIs for wallet connectivity and signing.',
        offlineTitle: 'Offline Signing',
        offlineSubtitle: 'Air-gapped signing flows using QR codes.',
        supportTitle: 'Need integration support?',
        supportSubtitle: 'Get help with architecture reviews, transport selection, and production rollout.',
        supportPrimary: 'Submit a Request',
      }
  const integrationCards = [
    {
      title: isZh ? 'WebUSB 连接' : 'WebUSB Connection',
      description: isZh ? '适用于网页与桌面浏览器的 USB 传输。' : 'USB transport for web apps and desktop browsers.',
      icon: Usb,
      href: `/${locale}/hardware-sdk/transport/web-usb`,
      cta: copy.viewDocs,
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
    <div className="flex min-h-screen flex-col bg-[#101111] font-sans text-white">
      <main className="flex flex-col gap-[120px]">
        <section
          className="relative w-full overflow-hidden"
          style={{
            backgroundImage: "url('/landing-page/hero-bg.svg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
          }}
        >
          <div className="relative mx-auto h-[810px] w-full max-w-[1440px]">
            <div className="absolute left-[64px] top-[169px] z-10 flex w-[711px] flex-col gap-[0px]">
              <h1 className="text-[52px] font-semibold leading-[56px]">
                <span className="bg-gradient-to-r from-white from-[24%] to-[#16d629] bg-clip-text text-transparent">
                  {copy.heroTitle}
                </span>
              </h1>
              <p className="mt-[0px] text-[16px] leading-[56px] text-white/60">
                {copy.heroSubtitle}
              </p>
            </div>
            <div className="absolute left-[64px] top-[335px] z-10 flex items-center gap-[8px]">
              <button
                type="button"
                onClick={() => {
                  const section = document.getElementById('hardware-integration')
                  if (section) {
                    section.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className="flex w-[223px] items-center justify-center gap-[8px] rounded-[50px] px-[32px] py-[18px] text-[16px] font-medium text-[#101111]"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, rgb(79, 245, 95) 0%, rgb(33, 233, 53) 100%)',
                  color: '#101111',
                }}
              >
                {copy.ctaPrimary}
                <img
                  src="/Button/Icon/logo.svg"
                  alt=""
                  className="size-[24px]"
                />
              </button>
              <Link
                href={`/${locale}/changelog`}
                className="flex items-center justify-center rounded-[50px] bg-white px-[32px] py-[18px] text-[16px] font-medium text-[#101111] no-underline"
                style={{ color: '#101111' }}
              >
                {copy.ctaSecondary}
              </Link>
            </div>
              <img
                src={heroSecurity05}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+334.5px)] top-[-65px] h-[919px] w-[915px] -translate-x-1/2 object-cover opacity-70"
              />
              <img
                src={heroSecurity04}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+309.5px)] top-[11px] h-[863px] w-[831px] -translate-x-1/2 object-cover"
              />
              <img
                src={heroSecurity03}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+309.5px)] top-[11px] h-[863px] w-[831px] -translate-x-1/2 object-cover opacity-20"
              />
              <img
                src={heroSecurity02}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+309.5px)] top-[11px] h-[863px] w-[831px] -translate-x-1/2 object-cover"
              />
              <img
                src={heroSecurity01}
                alt=""
                className="pointer-events-none absolute left-[calc(50%+309.5px)] top-[11px] h-[863px] w-[831px] -translate-x-1/2 object-cover opacity-50"
              />
          </div>
        </section>

        <section
          id="hardware-integration"
          className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-[64px]"
        >
          <div className="flex w-full flex-col items-center gap-[8px] text-center">
            <p className="text-[40px] font-medium leading-[46px]">{copy.hardwareTitle}</p>
            <p className="text-[16px] text-white/70">
              {copy.hardwareSubtitle}
            </p>
          </div>
          <div className="mt-[24px] grid w-full grid-cols-1 gap-[32px] lg:grid-cols-3">
            {integrationCards.map((card) => (
              <IntegrationCard key={card.title} {...card} />
            ))}
          </div>
          <div className="mt-[24px] h-[1px] w-full bg-white/30" />
        </section>

        <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-[64px]">
          <div className="flex w-full flex-col items-center gap-[8px] text-center">
            <p className="text-[40px] font-medium leading-[46px]">{copy.dappTitle}</p>
            <p className="text-[16px] text-white/70">
              {copy.dappSubtitle}
            </p>
          </div>
          <div className="mt-[24px] grid w-full grid-cols-1 gap-[32px] lg:grid-cols-2">
            {dappCards.map((card) => (
              <IntegrationCard key={card.title} {...card} />
            ))}
          </div>
          <div className="mt-[24px] h-[1px] w-full bg-white/30" />
        </section>

        <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-[64px]">
          <div className="flex w-full flex-col items-center gap-[8px] text-center">
            <p className="text-[40px] font-medium leading-[46px]">{copy.offlineTitle}</p>
            <p className="text-[16px] text-white/70">
              {copy.offlineSubtitle}
            </p>
          </div>
          <div className="mt-[24px] grid w-full grid-cols-1 gap-[32px] lg:grid-cols-2">
            {offlineCards.map((card) => (
              <IntegrationCard key={card.title} className="lg:col-span-1" {...card} />
            ))}
          </div>
          <div className="mt-[24px] h-[1px] w-full bg-white/30" />
        </section>

        <section className="mx-auto w-full max-w-[1440px] px-[64px]">
          <div
            className="relative flex flex-col items-start gap-[40px] rounded-[24px] bg-[#222222] p-[40px] lg:flex-row lg:items-center"
          >
            <div className="flex w-full max-w-[591px] flex-col gap-[40px]">
              <div className="flex flex-col gap-[8px]">
                <div className="text-[30px] font-medium leading-[36px] text-white">
                  {copy.supportTitle}
                </div>
                <div className="text-[16px] leading-[20px] text-white/70">
                  {copy.supportSubtitle}
                </div>
              </div>
              <div className="flex flex-wrap gap-[16px]">
                <a
                  href="https://help.onekey.so/hc/requests/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-[8px] rounded-[50px] px-[20px] py-[10px] text-[16px] font-medium text-[#101111] no-underline"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, rgb(79, 245, 95) 0%, rgb(33, 233, 53) 100%)',
                    color: '#101111',
                  }}
                >
                  {copy.supportPrimary}
                </a>
                <a
                  href="https://github.com/OneKeyHQ/hardware-js-sdk/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-[8px] rounded-[50px] border border-white px-[20px] py-[10px] text-[16px] font-medium text-white no-underline"
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

      <footer className="mt-[120px] w-full rounded-t-[64px] bg-[#101111]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[80px] px-[64px] py-[120px] lg:flex-row lg:gap-[133px]">
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
                  2022 OneKey, Inc. All rights reserved.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative max-h-[90vh] w-full max-w-[520px] overflow-hidden rounded-[16px] bg-white">
            <button
              type="button"
              onClick={() => setShowSubscribeModal(false)}
              className="absolute right-[16px] top-[16px] z-10 flex size-[32px] items-center justify-center rounded-full bg-black/10 hover:bg-black/20"
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
