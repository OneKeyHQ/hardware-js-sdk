'use client'

import { ui } from '../i18n/ui.mjs'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, Search, Check, Cable, Code2, QrCode } from 'lucide-react'
import { DOCS_AI_TAB, emitDocsAIOpen } from './docAIAssistEvents'
import Footer from './Footer'
import styles from './LandingPage.module.css'
import { publishedLocales } from '../i18n/locales.mjs'

export function LandingPage({ locale = 'en' }) {
  const isZh = locale === 'zh'
  const root = `/${locale}`
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '')
  const routes = [
    {
      number: '02',
      icon: Code2,
      title: ui(locale, "Connect to the OneKey wallet", "连接 OneKey 钱包"),
      description: ui(locale, "Let your dApp request accounts, signatures, and transactions through OneKey. Use a wallet provider or a connection UI library.", "让 dApp 请求账户、签名和交易。使用钱包 Provider，或接入已有的钱包连接组件。"),
      audience: ui(locale, "For dApps and websites", "适合 dApp 与网站"),
      href: `${root}/connect-to-software`,
      cta: ui(locale, "Connect a dApp", "dApp 快速开始"),
      links: [
        [ui(locale, "Chain provider APIs", "各链 Provider API"), `${root}/connect-to-software/provider`],
        [ui(locale, "Wallet UI libraries", "钱包连接组件"), `${root}/connect-to-software/wallet-ui/web3modal`],
        [ui(locale, "Mobile and deep links", "移动端与深度链接"), `${root}/connect-to-software/mobile-deeplinks`],
      ],
    },
    {
      number: '01',
      icon: Cable,
      title: ui(locale, "Connect directly to a device", "直接连接硬件钱包"),
      description: ui(locale, "Add OneKey hardware signing to your wallet or app over USB or Bluetooth, with user confirmation on the device.", "在你的钱包或应用中，通过 USB 或蓝牙与 OneKey 硬件通信，由用户在设备上确认操作。"),
      audience: ui(locale, "For wallet and app developers", "适合钱包与应用开发者"),
      href: `${root}/hardware-sdk/getting-started`,
      cta: ui(locale, "Start with the Hardware SDK", "硬件 SDK 快速开始"),
      links: [
        ['WebUSB', `${root}/hardware-sdk/transport/web-usb`],
        ['React Native BLE', `${root}/hardware-sdk/transport/react-native-ble`],
        [ui(locale, "Native mobile", "原生移动端"), `${root}/hardware-sdk/transport/native-ble`],
        [ui(locale, "Device and chain support", "设备与链支持"), `${root}/hardware-sdk/concepts/chain-support`],
      ],
    },
    {
      number: '03',
      icon: QrCode,
      title: ui(locale, "Exchange signing data over QR", "通过二维码离线签名"),
      description: ui(locale, "Exchange signing requests and responses with a QR-capable OneKey device without a USB or Bluetooth connection.", "在应用与支持二维码的 OneKey 硬件之间传递签名请求与结果，无需 USB 或蓝牙连接。"),
      audience: ui(locale, "For QR-based wallet integrations", "适合二维码钱包集成"),
      href: `${root}/air-gap`,
      cta: ui(locale, "Explore QR signing", "了解二维码签名"),
      links: [
        ['Ethereum & EVM', `${root}/air-gap/ethereum-and-evm`],
        ['Bitcoin', `${root}/air-gap/bitcoin`],
      ],
    },
  ]

  routes.sort((a, b) => a.number.localeCompare(b.number))

  return (
    <div className={`landing-page ${styles.page}`}>
      <main id="nextra-skip-nav" tabIndex={-1} className={styles.main}>
        <section className={styles.hero} aria-labelledby="developer-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span className={styles.statusDot} />{ui(locale, "THE ONEKEY DEVELOPER PLATFORM", "ONEKEY 开发者平台")}</p>
            <h1 id="developer-title">{ui(locale, 'Good ideas.', '让好想法，')}<br />{ui(locale, 'Built on trust.', '安心落地。')}</h1>
            <p className={styles.intro}>{ui(locale, "Build with OneKey in your dApp, wallet, or application. Choose an integration below and follow the guide to your first request.", "为你的 dApp、钱包或应用接入 OneKey。先选择集成方式，再跟随指南完成第一次调用。")}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primary} href={`${root}/hardware-sdk/getting-started`}>{ui(locale, "Start building", "开始构建")}<ArrowRight size={17} /></Link>
              <Link className={styles.search} href={`${root}/hardware-sdk/chains/ethereum-and-evm/evmsigntransaction`}>{ui(locale, "Explore the API", "探索 API")}<ArrowUpRight size={16} /></Link>
            </div>
            <div className={styles.heroMeta}>{[ui(locale, 'Open source', '开放源码'), ui(locale, 'TypeScript SDKs', 'TypeScript SDK'), ui(locale, 'User-confirmed signing', '设备端确认签名')].map(text => <span key={text}><Check size={14} />{text}</span>)}</div>
          </div>
          <figure className={styles.hardware}>
            <div className={styles.stageTop}><span>{ui(locale, 'HARDWARE, MEET SOFTWARE.', '硬件与软件，相互连接。')}</span><span aria-hidden="true">+</span></div>
            <div className={styles.hardwareImage}>
              <Image
                src={`${basePath}/brand/pro2/onekey-pro2-hero.webp`}
                alt={ui(locale, "OneKey Pro 2 hardware wallets showing the portfolio and transaction confirmation screens", "OneKey Pro 2 硬件钱包，展示设备上的资产概览与交易确认界面")}
                width={3200}
                height={2400}
                preload
              />
            </div>
            <figcaption><div><span>{ui(locale, "INTRODUCING", "认识新一代硬件")}</span><h2>OneKey Pro 2</h2></div><a href="https://onekey.so/products/onekey-pro-2/" aria-label={ui(locale, "Explore OneKey Pro 2", "了解 OneKey Pro 2")}><ArrowUpRight size={24} /></a></figcaption>
          </figure>
        </section>

        <section className={styles.integrations} aria-labelledby="integration-title">
          <div className={styles.sectionHeading}><h2 id="integration-title">{ui(locale, "What are you building?", "你在构建什么？")}</h2><span>{ui(locale, "Choose a path to get started", "三个入口，一步开始")}</span></div>
          <div className={styles.routeGrid}>{routes.map(route => (
            <article className={styles.route} key={route.number}>
              <span className={styles.number} aria-hidden="true">{route.number} /</span><route.icon className={styles.routeIcon} size={24} strokeWidth={1.4} />
              <div className={styles.routeContent}>
                <p className={styles.audience}>{route.audience}</p>
                <h3><Link href={route.href}>{route.title}<ArrowUpRight size={21} /></Link></h3>
                <p className={styles.description}>{route.description}</p>
                <Link className={styles.routeCta} href={route.href}>{route.cta}<ArrowRight size={16} /></Link>
              </div>
              <nav className={styles.routeLinks} aria-label={route.title}>{route.links.map(([label, href]) => <Link key={href} href={href}>{label}<ArrowUpRight size={14} /></Link>)}</nav>
            </article>
          ))}</div>
        </section>

        <section className={styles.startStrip}>
          <span className={styles.eyebrow}>{ui(locale, "FROM ZERO TO CONNECTED", "从连接到确认")}</span>
          <h2>{ui(locale, 'Your first device.', '连接第一台设备。')}<br />{ui(locale, 'Your first address.', '确认第一个地址。')}</h2>
          <Link href={`${root}/hardware-sdk/getting-started`}>{ui(locale, "Follow the quickstart", "跟随快速开始")}<ArrowRight size={18} /></Link>
        </section>
        <section className={styles.resources} aria-labelledby="resources-title">
          <div><h2 id="resources-title">{ui(locale, "While you build", "开发过程中")}</h2><p>{ui(locale, "Try an example, resolve an error, or check what changed.", "查示例、解决问题、跟进 SDK 变更。")}</p></div>
          <div className={styles.resourceLinks}>
            <button className={styles.search} type="button" onClick={() => emitDocsAIOpen(DOCS_AI_TAB.SEARCH)}><Search size={16} />{ui(locale, "Search docs, methods, or errors", "搜索文档、方法或错误")}</button>
            <a href="https://hardware-example.onekey.so/">{ui(locale, "Open the hardware playground", "打开硬件 Playground")}<ArrowUpRight size={16} /></a>
            <Link href={`${root}/troubleshooting`}>{ui(locale, "Troubleshoot an integration", "排查集成问题")}<ArrowRight size={16} /></Link>
            <Link href={`${root}/changelog`}>{ui(locale, "Read the SDK changelog", "查看 SDK 更新日志")}<ArrowRight size={16} /></Link>
            <a href="https://github.com/OneKeyHQ/hardware-js-sdk">{ui(locale, "Browse SDK source and examples", "查看源码与示例")}<ArrowUpRight size={16} /></a>
          </div>
        </section>
        <aside className={styles.support}>
          <div><h2>{ui(locale, "Need help with an integration?", "需要帮助？")}</h2><p>{ui(locale, "Include your SDK version, runtime, and a minimal reproduction when reporting an issue.", "报告问题时，请提供 SDK 版本、运行环境与最小复现示例。")}</p></div>
          <Link href={`${root}/troubleshooting#report-an-issue`}>{ui(locale, "Find the right support channel", "找到正确的反馈入口")}<ArrowRight size={16} /></Link>
        </aside>
      </main>
      <div className={styles.footerLinks}>
        <nav aria-label={ui(locale, "Language", "语言")}>{publishedLocales.map(({ code, name }) => <Link key={code} href={`/${code}`} aria-current={locale === code ? 'page' : undefined}>{name}</Link>)}</nav>
        <nav aria-label={ui(locale, "OneKey resources", "OneKey 资源")}><a href="https://onekey.so/">OneKey</a><a href="https://help.onekey.so/">{ui(locale, "Help center", "帮助中心")}</a><a href="https://help.onekey.so/hc/articles/11461297">{ui(locale, "User agreement", "用户协议")}</a><a href="https://help.onekey.so/hc/articles/11461298">{ui(locale, "Privacy policy", "隐私政策")}</a></nav>
      </div>
      <Footer />
    </div>
  )
}
