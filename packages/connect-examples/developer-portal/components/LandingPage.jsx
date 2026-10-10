'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, Search, Check, Cable, Code2, QrCode } from 'lucide-react'
import { DOCS_AI_TAB, emitDocsAIOpen } from './docAIAssistEvents'
import Footer from './Footer'
import styles from './LandingPage.module.css'

export function LandingPage({ locale = 'en' }) {
  const isZh = locale === 'zh'
  const root = `/${locale}`
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '')
  const routes = [
    {
      number: '02',
      icon: Code2,
      title: isZh ? '连接 OneKey 钱包' : 'Connect to the OneKey wallet',
      description: isZh ? '让 dApp 请求账户、签名和交易。使用钱包 Provider，或接入已有的钱包连接组件。' : 'Let your dApp request accounts, signatures, and transactions through OneKey. Use a wallet provider or a connection UI library.',
      audience: isZh ? '适合 dApp 与网站' : 'For dApps and websites',
      href: `${root}/connect-to-software`,
      cta: isZh ? 'dApp 快速开始' : 'Connect a dApp',
      links: [
        [isZh ? '各链 Provider API' : 'Chain provider APIs', `${root}/connect-to-software/provider`],
        [isZh ? '钱包连接组件' : 'Wallet UI libraries', `${root}/connect-to-software/wallet-ui/web3modal`],
        [isZh ? '移动端与深度链接' : 'Mobile and deep links', `${root}/connect-to-software/mobile-deeplinks`],
      ],
    },
    {
      number: '01',
      icon: Cable,
      title: isZh ? '直接连接硬件钱包' : 'Connect directly to a device',
      description: isZh ? '在你的钱包或应用中，通过 USB 或蓝牙与 OneKey 硬件通信，由用户在设备上确认操作。' : 'Add OneKey hardware signing to your wallet or app over USB or Bluetooth, with user confirmation on the device.',
      audience: isZh ? '适合钱包与应用开发者' : 'For wallet and app developers',
      href: `${root}/hardware-sdk/getting-started`,
      cta: isZh ? '硬件 SDK 快速开始' : 'Start with the Hardware SDK',
      links: [
        ['WebUSB', `${root}/hardware-sdk/transport/web-usb`],
        ['React Native BLE', `${root}/hardware-sdk/transport/react-native-ble`],
        [isZh ? '原生移动端' : 'Native mobile', `${root}/hardware-sdk/transport/native-ble`],
        [isZh ? '设备与链支持' : 'Device and chain support', `${root}/hardware-sdk/concepts/chain-support`],
      ],
    },
    {
      number: '03',
      icon: QrCode,
      title: isZh ? '通过二维码离线签名' : 'Exchange signing data over QR',
      description: isZh ? '在应用与支持二维码的 OneKey 硬件之间传递签名请求与结果，无需 USB 或蓝牙连接。' : 'Exchange signing requests and responses with a QR-capable OneKey device without a USB or Bluetooth connection.',
      audience: isZh ? '适合二维码钱包集成' : 'For QR-based wallet integrations',
      href: `${root}/air-gap`,
      cta: isZh ? '了解二维码签名' : 'Explore QR signing',
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
            <p className={styles.eyebrow}><span className={styles.statusDot} />{isZh ? 'ONEKEY 开发者平台' : 'THE ONEKEY DEVELOPER PLATFORM'}</p>
            <h1 id="developer-title">{isZh ? <>让好想法，<br />安心落地。</> : <>Good ideas.<br />Built on trust.</>}</h1>
            <p className={styles.intro}>{isZh ? '为你的 dApp、钱包或应用接入 OneKey。先选择集成方式，再跟随指南完成第一次调用。' : 'Build with OneKey in your dApp, wallet, or application. Choose an integration below and follow the guide to your first request.'}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primary} href={`${root}/hardware-sdk/getting-started`}>{isZh ? '开始构建' : 'Start building'}<ArrowRight size={17} /></Link>
              <Link className={styles.search} href={`${root}/hardware-sdk/chains/ethereum-and-evm/evmsigntransaction`}>{isZh ? '探索 API' : 'Explore the API'}<ArrowUpRight size={16} /></Link>
            </div>
            <div className={styles.heroMeta}>{(isZh ? ['开放源码', 'TypeScript SDK', '设备端确认签名'] : ['Open source', 'TypeScript SDKs', 'User-confirmed signing']).map(text => <span key={text}><Check size={14} />{text}</span>)}</div>
          </div>
          <figure className={styles.hardware}>
            <div className={styles.stageTop}><span>HARDWARE, MEET SOFTWARE.</span><span aria-hidden="true">+</span></div>
            <div className={styles.hardwareImage}>
              <Image
                src={`${basePath}/brand/pro2/onekey-pro2-hero.webp`}
                alt={isZh ? 'OneKey Pro 2 硬件钱包，展示设备上的资产概览与交易确认界面' : 'OneKey Pro 2 hardware wallets showing the portfolio and transaction confirmation screens'}
                width={3200}
                height={2400}
                preload
              />
            </div>
            <figcaption><div><span>{isZh ? '认识新一代硬件' : 'INTRODUCING'}</span><h2>OneKey Pro 2</h2></div><a href="https://onekey.so/products/onekey-pro-2/" aria-label={isZh ? '了解 OneKey Pro 2' : 'Explore OneKey Pro 2'}><ArrowUpRight size={24} /></a></figcaption>
          </figure>
        </section>

        <section className={styles.integrations} aria-labelledby="integration-title">
          <div className={styles.sectionHeading}><h2 id="integration-title">{isZh ? '你在构建什么？' : 'What are you building?'}</h2><span>{isZh ? '三个入口，一步开始' : 'Choose a path to get started'}</span></div>
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
          <span className={styles.eyebrow}>{isZh ? '从连接到确认' : 'FROM ZERO TO CONNECTED'}</span>
          <h2>{isZh ? <>连接第一台设备。<br />确认第一个地址。</> : <>Your first device.<br />Your first address.</>}</h2>
          <Link href={`${root}/hardware-sdk/getting-started`}>{isZh ? '跟随快速开始' : 'Follow the quickstart'}<ArrowRight size={18} /></Link>
        </section>
        <section className={styles.resources} aria-labelledby="resources-title">
          <div><h2 id="resources-title">{isZh ? '开发过程中' : 'While you build'}</h2><p>{isZh ? '查示例、解决问题、跟进 SDK 变更。' : 'Try an example, resolve an error, or check what changed.'}</p></div>
          <div className={styles.resourceLinks}>
            <button className={styles.search} type="button" onClick={() => emitDocsAIOpen(DOCS_AI_TAB.SEARCH)}><Search size={16} />{isZh ? '搜索文档、方法或错误' : 'Search docs, methods, or errors'}</button>
            <a href="https://hardware-example.onekey.so/">{isZh ? '打开硬件 Playground' : 'Open the hardware playground'}<ArrowUpRight size={16} /></a>
            <Link href={`${root}/troubleshooting`}>{isZh ? '排查集成问题' : 'Troubleshoot an integration'}<ArrowRight size={16} /></Link>
            <Link href={`${root}/changelog`}>{isZh ? '查看 SDK 更新日志' : 'Read the SDK changelog'}<ArrowRight size={16} /></Link>
            <a href="https://github.com/OneKeyHQ/hardware-js-sdk">{isZh ? '查看源码与示例' : 'Browse SDK source and examples'}<ArrowUpRight size={16} /></a>
          </div>
        </section>
        <aside className={styles.support}>
          <div><h2>{isZh ? '需要帮助？' : 'Need help with an integration?'}</h2><p>{isZh ? '报告问题时，请提供 SDK 版本、运行环境与最小复现示例。' : 'Include your SDK version, runtime, and a minimal reproduction when reporting an issue.'}</p></div>
          <Link href={`${root}/troubleshooting#report-an-issue`}>{isZh ? '找到正确的反馈入口' : 'Find the right support channel'}<ArrowRight size={16} /></Link>
        </aside>
      </main>
      <div className={styles.footerLinks}>
        <nav aria-label={isZh ? '语言' : 'Language'}><Link href="/en" aria-current={!isZh ? 'page' : undefined}>English</Link><Link href="/zh" aria-current={isZh ? 'page' : undefined}>简体中文</Link></nav>
        <nav aria-label={isZh ? 'OneKey 资源' : 'OneKey resources'}><a href="https://onekey.so/">OneKey</a><a href="https://help.onekey.so/">{isZh ? '帮助中心' : 'Help center'}</a><a href="https://help.onekey.so/hc/articles/11461297">{isZh ? '用户协议' : 'User agreement'}</a><a href="https://help.onekey.so/hc/articles/11461298">{isZh ? '隐私政策' : 'Privacy policy'}</a></nav>
      </div>
      <Footer />
    </div>
  )
}
