'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react'
import { DOCS_AI_TAB, emitDocsAIOpen } from './docAIAssistEvents'
import Footer from './Footer'
import styles from './LandingPage.module.css'

export function LandingPage({ locale = 'en' }) {
  const isZh = locale === 'zh'
  const root = `/${locale}`
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '')
  const routes = [
    {
      number: '01',
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
      number: '02',
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

  return (
    <div className={`landing-page ${styles.page}`}>
      <main id="nextra-skip-nav" tabIndex={-1} className={styles.main}>
        <section className={styles.hero} aria-labelledby="developer-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{isZh ? 'OneKey 开发者文档' : 'OneKey developer docs'}</p>
            <h1 id="developer-title">{isZh ? '从连接钱包，到完成签名。' : 'From wallet connection to signing.'}</h1>
            <p className={styles.intro}>{isZh ? '为你的 dApp、钱包或应用接入 OneKey。先选择集成方式，再跟随指南完成第一次调用。' : 'Build with OneKey in your dApp, wallet, or application. Choose an integration below and follow the guide to your first request.'}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primary} href={`${root}/getting-started`}>{isZh ? '选择接入方式' : 'Find your integration'}<ArrowRight size={17} /></Link>
              <button className={styles.search} type="button" onClick={() => emitDocsAIOpen(DOCS_AI_TAB.SEARCH)}><Search size={17} />{isZh ? '搜索文档、方法或错误' : 'Search docs, methods, or errors'}</button>
            </div>
          </div>
          <figure className={styles.hardware}>
            <div className={styles.hardwareImage}>
              <Image
                src={`${basePath}/brand/pro2/onekey-pro2-hero.webp`}
                alt={isZh ? 'OneKey Pro 2 硬件钱包，展示设备上的资产概览与交易确认界面' : 'OneKey Pro 2 hardware wallets showing the portfolio and transaction confirmation screens'}
                width={3200}
                height={2400}
                preload
              />
            </div>
            <figcaption><a href="https://onekey.so/products/onekey-pro-2/">OneKey Pro 2<ArrowUpRight size={14} /></a></figcaption>
          </figure>
        </section>

        <section className={styles.integrations} aria-labelledby="integration-title">
          <div className={styles.sectionHeading}><h2 id="integration-title">{isZh ? '你在构建什么？' : 'What are you building?'}</h2><span>{isZh ? '三个入口，一步开始' : 'Choose a path to get started'}</span></div>
          {routes.map(route => (
            <article className={styles.route} key={route.number}>
              <span className={styles.number} aria-hidden="true">{route.number}</span>
              <div className={styles.routeContent}>
                <p className={styles.audience}>{route.audience}</p>
                <h3><Link href={route.href}>{route.title}<ArrowUpRight size={21} /></Link></h3>
                <p className={styles.description}>{route.description}</p>
                <Link className={styles.routeCta} href={route.href}>{route.cta}<ArrowRight size={16} /></Link>
              </div>
              <nav className={styles.routeLinks} aria-label={route.title}>{route.links.map(([label, href]) => <Link key={href} href={href}>{label}<ArrowUpRight size={14} /></Link>)}</nav>
            </article>
          ))}
        </section>

        <section className={styles.resources} aria-labelledby="resources-title">
          <div><h2 id="resources-title">{isZh ? '开发过程中' : 'While you build'}</h2><p>{isZh ? '查示例、解决问题、跟进 SDK 变更。' : 'Try an example, resolve an error, or check what changed.'}</p></div>
          <div className={styles.resourceLinks}>
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
