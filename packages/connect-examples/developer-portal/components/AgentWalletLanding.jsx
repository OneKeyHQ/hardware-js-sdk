'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Terminal,
  WalletCards,
} from 'lucide-react'

const copyByLocale = {
  en: {
    eyebrow: 'OneKey Agent Wallet',
    title: 'OneKey Agent Wallet',
    subtitle:
      'A wallet layer for AI agents. Let agents check balances, receive funds, research tokens, quote swaps, and prepare transactions while OneKey GUI and hardware keep users in control.',
    primaryCta: 'Start building',
    secondaryCta: 'Read docs',
    terminalTitle: 'agent-wallet.sh',
    agentRequest: 'Agent Wallet session',
    agentRequestValue: 'Keyless-bound account',
    hardwareRequired: 'Hardware confirmation required',
    hardwareRequiredValue: 'Review on device',
    proof: [
      'Wallet operations',
      'Swap execution',
      'Market research',
      'Hardware confirmation',
    ],
    sectionEyebrow: 'Developer entry points',
    sectionTitle:
      'One wallet layer for agent automation, market context, and hardware-verified signing.',
    cards: [
      {
        title: 'Wallet Operations',
        description:
          'Balances, receive addresses, history, transfers, BTC address types, and active session status.',
        icon: WalletCards,
        href: 'capabilities',
      },
      {
        title: 'Swap & Bridge',
        description:
          'Quote, build, execute, and track swaps, including bridge discovery and BTC sign-only PSBT flows.',
        icon: Bot,
        href: 'capabilities#swap-and-bridge',
      },
      {
        title: 'Market Research',
        description:
          'Prices, trending tokens, K-line data, liquidity, holders, and token research for agent decisions.',
        icon: LockKeyhole,
        href: 'capabilities#market-and-research',
      },
      {
        title: 'Wallet Skills',
        description:
          'Natural-language routing for Claude Code, Codex, Cursor, OpenCode, and OpenClaw.',
        icon: Bot,
        href: 'wallet-skills',
      },
      {
        title: 'Security Checks',
        description:
          'Token audits, transaction simulation, approval risk review, and chain/address mismatch blocking.',
        icon: ShieldCheck,
        href: 'capabilities#security-checks',
      },
      {
        title: 'Hardware Control',
        description:
          'Escalate sensitive transfers and swaps to device-side clear signing and physical confirmation.',
        icon: ShieldCheck,
        href: 'hardware-control',
      },
    ],
    modelTitle: 'Agents do the work. OneKey keeps the user in control.',
    modelItems: [
      'Agents can read wallet state, research markets, quote swaps, and prepare transactions through schema-backed skills.',
      'OneKey GUI and keyless binding keep sessions usable without asking users to paste private keys into prompts.',
      'Fund-moving actions can be escalated to OneKey hardware for clear signing and physical confirmation.',
    ],
    finalTitle: 'Give agents usable wallet capabilities without turning private keys into prompts.',
    finalCta: 'View AI Agent docs',
  },
  zh: {
    eyebrow: 'OneKey Agent Wallet',
    title: 'OneKey Agent Wallet',
    subtitle:
      '面向 AI Agent 的钱包能力层。让 Agent 查余额、收款、研究 token、报价 swap、准备交易，同时由 OneKey GUI 和硬件钱包保留用户控制权。',
    primaryCta: '开始构建',
    secondaryCta: '阅读文档',
    terminalTitle: 'agent-wallet.sh',
    agentRequest: 'Agent Wallet 会话',
    agentRequestValue: '已绑定 keyless',
    hardwareRequired: '需要硬件确认',
    hardwareRequiredValue: '在设备上审核',
    proof: ['钱包操作', 'Swap 执行', '行情研究', '硬件确认'],
    sectionEyebrow: '开发者入口',
    sectionTitle: '一层钱包能力覆盖 Agent 自动化、行情上下文和硬件签名确认。',
    cards: [
      {
        title: 'Wallet Operations',
        description: '余额、收款地址、历史、转账、BTC 地址类型和活动会话状态。',
        icon: WalletCards,
        href: 'capabilities',
      },
      {
        title: 'Swap & Bridge',
        description: '报价、构建、执行和跟踪 swap，包含 bridge discovery 与 BTC sign-only PSBT。',
        icon: Bot,
        href: 'capabilities#swap-and-bridge',
      },
      {
        title: 'Market Research',
        description: '价格、trending tokens、K 线、流动性、持仓和 token research。',
        icon: LockKeyhole,
        href: 'capabilities#market-and-research',
      },
      {
        title: 'Wallet Skills',
        description: '面向 Claude Code、Codex、Cursor、OpenCode、OpenClaw 的自然语言路由。',
        icon: Bot,
        href: 'wallet-skills',
      },
      {
        title: 'Security Checks',
        description: 'Token audit、交易模拟、授权风险审查，以及链和地址不匹配阻断。',
        icon: ShieldCheck,
        href: 'capabilities#security-checks',
      },
      {
        title: 'Hardware Control',
        description: '转账、兑换等高风险操作升级到设备端 clear signing 和物理确认。',
        icon: ShieldCheck,
        href: 'hardware-control',
      },
    ],
    modelTitle: 'Agent 负责执行，OneKey 保留用户控制权。',
    modelItems: [
      'Agent 可以通过 schema-backed skills 读取钱包状态、研究行情、报价 swap 并准备交易。',
      'OneKey GUI 和 keyless 绑定让会话可用，但不要求用户把私钥粘贴进 prompt。',
      '涉及资金移动的操作可以升级到 OneKey 硬件，完成 clear signing 和物理确认。',
    ],
    finalTitle: '让 Agent 拥有可用的钱包能力，但不要把私钥变成 prompt。',
    finalCta: '查看 AI Agent 文档',
  },
}

const terminalLines = [
  '$ onekey auth login --app-transfer',
  '$ onekey token trending --chain sol',
  '$ onekey swap quote --chain eth --from ETH --to USDC --amount 1',
  '$ onekey auth login --hardware',
]

const getCopy = (locale) => copyByLocale[locale] ?? copyByLocale.en

const getCardHref = (basePath, href) =>
  href.includes('#')
    ? `${basePath}/agent-wallet/${href.replace('#', '/#')}`
    : `${basePath}/agent-wallet/${href}/`

export function AgentWalletLanding({ locale = 'en' }) {
  const copy = getCopy(locale)
  const basePath = `/${locale}`

  return (
    <div className="landing-page flex min-h-screen max-w-full flex-col overflow-x-hidden bg-[#101111] text-white">
      <main className="flex flex-col">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_16%,rgba(22,214,41,0.18),transparent_30%),radial-gradient(circle_at_8%_14%,rgba(87,230,104,0.1),transparent_28%)]" />
          <div className="absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(180deg,#000,transparent)]" />

          <div className="relative mx-auto grid min-h-[810px] w-full max-w-[1440px] grid-cols-1 gap-12 overflow-hidden px-5 pb-20 pt-24 md:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-16 lg:pt-32">
            <div className="flex w-full min-w-0 max-w-[680px] flex-col justify-center">
              <div className="w-fit rounded-full border border-[#57E668]/30 bg-[#57E668]/10 px-4 py-2 text-[14px] font-semibold leading-5 text-[#57E668]">
                {copy.eyebrow}
              </div>
              <h1 className="mt-6 max-w-full text-[48px] font-semibold leading-[0.96] md:text-[72px] lg:text-[86px]">
                {copy.title}
              </h1>
              <p className="mt-7 max-w-full text-[18px] leading-[30px] text-white/65 md:max-w-[620px]">
                {copy.subtitle}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`${basePath}/agent-wallet/quickstart/`}
                  className="rounded-full bg-[linear-gradient(90deg,#57E668_0%,#16D629_100%)] px-8 py-[18px] text-[16px] font-semibold leading-5 text-[#101111] no-underline transition-opacity hover:opacity-90"
                >
                  {copy.primaryCta}
                </Link>
                <Link
                  href={`${basePath}/agent-wallet/overview/`}
                  className="rounded-full border border-white/15 bg-white/10 px-8 py-[18px] text-[16px] font-semibold leading-5 text-white no-underline transition-colors hover:bg-white/15"
                >
                  {copy.secondaryCta}
                </Link>
              </div>

              <div className="mt-10 w-full min-w-0 max-w-full overflow-hidden rounded-[16px] border border-white/10 bg-[#141616]/85 shadow-[0_24px_70px_rgba(0,0,0,0.36)] md:max-w-[560px]">
                <div className="flex h-11 items-center gap-2 border-b border-white/10 px-4 text-[12px] text-white/45">
                  <span className="size-2.5 rounded-full bg-white/25" />
                  <span className="size-2.5 rounded-full bg-white/25" />
                  <span className="size-2.5 rounded-full bg-white/25" />
                  <Terminal className="ml-2 size-3.5" />
                  <span>{copy.terminalTitle}</span>
                </div>
                <pre className="m-0 grid max-w-full min-w-0 gap-2.5 overflow-x-auto p-5 text-[13px] leading-[22px] text-[#D7FFDC] md:p-6 md:text-[14px]">
                  {terminalLines.map((line) => (
                    <code key={line} className="w-max min-w-0">
                      {line}
                    </code>
                  ))}
                </pre>
              </div>
            </div>

            <div className="flex min-w-0 items-center">
              <div className="relative aspect-[1/0.88] w-full overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_52%_42%,rgba(87,230,104,0.2),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_32px_120px_rgba(0,0,0,0.48)]">
                <div className="absolute inset-9 overflow-hidden rounded-[20px] bg-[linear-gradient(90deg,rgba(16,17,17,0.04),rgba(16,17,17,0.18)),url('/landing-page/agent-clear-signing.jpg')] bg-cover bg-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_28px_80px_rgba(0,0,0,0.42)]" />
                <div className="absolute inset-x-[60px] inset-y-[72px] rounded-[26px] border border-[#57E668]/40 shadow-[0_0_34px_rgba(87,230,104,0.18),inset_0_0_28px_rgba(87,230,104,0.08)]" />
                <div className="absolute bottom-20 left-5 grid max-w-[220px] gap-1 rounded-[14px] border border-white/15 bg-[#111312]/85 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                  <span className="text-[12px] leading-4 text-white/55">
                    {copy.agentRequest}
                  </span>
                  <strong className="text-[14px] leading-[18px] text-white">
                    {copy.agentRequestValue}
                  </strong>
                </div>
                <div className="absolute right-5 top-20 grid max-w-[240px] gap-1 rounded-[14px] border border-[#57E668]/35 bg-[#111312]/85 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                  <span className="text-[12px] leading-4 text-white/55">
                    {copy.hardwareRequired}
                  </span>
                  <strong className="text-[14px] leading-[18px] text-white">
                    {copy.hardwareRequiredValue}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto -mt-6 grid w-full max-w-[1440px] grid-cols-1 gap-3 px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-16">
          {copy.proof.map((item) => (
            <div
              key={item}
              className="rounded-[16px] border border-white/10 bg-[#222]/80 px-5 py-6 text-[15px] font-semibold leading-5 text-white/85"
            >
              {item}
            </div>
          ))}
        </section>

        <section className="mx-auto w-full max-w-[1440px] px-6 py-28 lg:px-16">
          <div className="max-w-[760px]">
            <span className="text-[14px] font-semibold leading-5 text-[#57E668]">
              {copy.sectionEyebrow}
            </span>
            <h2 className="mt-3 text-[36px] font-semibold leading-[1.08] md:text-[52px]">
              {copy.sectionTitle}
            </h2>
          </div>

          <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {copy.cards.map((card) => (
              <Link
                key={card.title}
                href={getCardHref(basePath, card.href)}
                className="flex min-h-[252px] flex-col justify-between rounded-[16px] border border-white/10 bg-[#222] p-7 no-underline transition-all hover:-translate-y-0.5 hover:border-[#57E668]/45 hover:bg-[#242724]"
              >
                <div>
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#191919] text-[#57E668]">
                    <card.icon className="size-5" />
                  </span>
                  <h3 className="mt-6 text-[22px] font-semibold leading-7 text-white">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[22px] text-white/65">
                    {card.description}
                  </p>
                </div>
                <span className="mt-7 inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#16D629]">
                  {copy.secondaryCta}
                  <ArrowUpRight className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1440px] px-6 pb-28 lg:px-16">
          <div className="grid gap-8 rounded-[24px] border border-white/10 bg-[#222] p-8 lg:grid-cols-[0.82fr_1fr] lg:p-10">
            <div>
              <LockKeyhole className="size-8 text-[#57E668]" />
              <h2 className="mt-6 text-[32px] font-semibold leading-[1.1] md:text-[44px]">
                {copy.modelTitle}
              </h2>
            </div>
            <div className="grid gap-4">
              {copy.modelItems.map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-[16px] border border-white/10 bg-[#191919] p-5 text-[16px] leading-6 text-white/75"
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#57E668]" />
                  <span>{item}</span>
                </div>
              ))}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-5 rounded-[16px] bg-[#101111] p-5">
                <strong className="max-w-[560px] text-[22px] leading-7 text-white">
                  {copy.finalTitle}
                </strong>
                <Link
                  href={`${basePath}/agent-wallet/overview/`}
                  className="rounded-full bg-[linear-gradient(90deg,#57E668_0%,#16D629_100%)] px-6 py-3 text-[15px] font-semibold text-[#101111] no-underline"
                >
                  {copy.finalCta}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
