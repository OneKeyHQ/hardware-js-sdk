'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowUpRight,
  Bot,
  Check,
  Code2,
  Copy,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react'

const INSTALL_COMMAND = 'npx skills add OneKeyHQ/onekey-wallet-skills'
const GITHUB_REPO_URL = 'https://github.com/OneKeyHQ/onekey-wallet-skills'

const copyByLocale = {
  en: {
    eyebrow: 'OneKey Agent Wallet',
    title: 'Wallets, built for AI agents.',
    subtitle:
      'Skills let agents read balances, research markets, and prepare transactions. Every fund move ends on a OneKey device the user must approve — with the full transaction shown on screen.',
    primaryCta: 'Install skills',
    secondaryCta: 'Explore capabilities',

    installEyebrow: 'Install',
    installTitle: 'One command, every AI agent.',
    installSubtitle:
      'Powered by the open skills CLI. Auto-detects Claude Code, Codex, Cursor, OpenCode, and 50+ more.',
    installCopyLabel: 'Copy',
    installCopiedLabel: 'Copied',
    installCommandSrLabel: 'Install command',
    installNote:
      'Running multiple AI agents on the same machine? Pass --agent <name> to target a specific one.',

    proof: [
      '4 wallet skills',
      'Claude Code · Codex · Cursor · OpenCode',
      'One npx command',
      'Hardware confirmation for fund moves',
    ],

    sectionEyebrow: 'Skill-first wallet layer',
    sectionTitle: 'Everything an agent needs at the wallet boundary.',
    cards: [
      {
        title: 'Wallet Skills',
        description:
          'Install once, then ask for balances, receive addresses, transfers, swaps, markets, and safety checks in natural language.',
        icon: Sparkles,
        href: 'wallet-skills',
      },
      {
        title: 'Agent Wallet Session',
        description:
          'Pair a GUI-managed Agent Wallet through App Transfer without asking users to paste private keys into prompts.',
        icon: WalletCards,
        href: 'wallet-session',
      },
      {
        title: 'Swap & Market Skills',
        description:
          'Quote trades, research tokens, inspect liquidity, and stage execution only after the user sees the result.',
        icon: Bot,
        href: 'capabilities#swap-and-bridge',
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
        icon: LockKeyhole,
        href: 'hardware-control',
      },
      {
        title: 'Schema-Backed Routing',
        description:
          'Skills read the live command schema before choosing parameters, so docs do not need to lead with raw CLI recipes.',
        icon: Code2,
        href: 'capabilities',
      },
    ],

    finalEyebrow: 'Start now',
    finalTitle: 'Install in one command. Ship in an afternoon.',
    finalCta: 'Read the quickstart',
    finalSecondary: 'Browse the GitHub repo',

    heroImageAlt:
      'A OneKey hardware wallet displaying a Gnosis Safe transaction flagged as a high-risk delegatecall, awaiting user approval on device.',
  },
  zh: {
    eyebrow: 'OneKey Agent Wallet',
    title: '为 AI Agent 打造的钱包。',
    subtitle:
      'Skills 让 Agent 读余额、研究行情、准备交易。每一笔资金动作都在 OneKey 设备上最后一审——交易内容完整显示在屏幕上，由用户确认。',
    primaryCta: '安装 Skills',
    secondaryCta: '查看能力',

    installEyebrow: '安装',
    installTitle: '一条命令，覆盖所有 AI Agent。',
    installSubtitle:
      '基于开源 skills CLI。自动识别 Claude Code、Codex、Cursor、OpenCode 等 50+ AI agent。',
    installCopyLabel: '复制',
    installCopiedLabel: '已复制',
    installCommandSrLabel: '安装命令',
    installNote: '一台机器装了多个 AI agent？加上 --agent <name> 参数指定其中一个。',

    proof: [
      '4 个钱包 Skills',
      'Claude Code · Codex · Cursor · OpenCode',
      '一条 npx 命令',
      '资金操作硬件确认',
    ],

    sectionEyebrow: 'Skill-first 钱包能力层',
    sectionTitle: 'Agent 在钱包边界需要的能力，一次装好。',
    cards: [
      {
        title: 'Wallet Skills',
        description:
          '安装一次后，用户用自然语言处理余额、收款地址、转账、swap、行情和安全检查。',
        icon: Sparkles,
        href: 'wallet-skills',
      },
      {
        title: 'Agent Wallet 会话',
        description:
          '通过 App Transfer 配对 OneKey GUI 管理的钱包，不要求用户把私钥粘贴进 prompt。',
        icon: WalletCards,
        href: 'wallet-session',
      },
      {
        title: 'Swap 和行情 Skills',
        description:
          '报价交易、研究 token、查看流动性，并且只在用户确认后进入执行。',
        icon: Bot,
        href: 'capabilities#swap-and-bridge',
      },
      {
        title: '安全检查',
        description:
          'Token audit、交易模拟、授权风险审查，以及链和地址不匹配阻断。',
        icon: ShieldCheck,
        href: 'capabilities#security-checks',
      },
      {
        title: '硬件控制',
        description:
          '转账、兑换等敏感操作升级到设备端 clear signing 和物理确认。',
        icon: LockKeyhole,
        href: 'hardware-control',
      },
      {
        title: 'Schema 路由',
        description:
          'Skills 先读取实时命令 schema 再选择参数，文档不需要把原始 CLI recipes 放在最前面。',
        icon: Code2,
        href: 'capabilities',
      },
    ],

    finalEyebrow: '现在开始',
    finalTitle: '一条命令装好，一个下午跑通。',
    finalCta: '查看快速开始',
    finalSecondary: '在 GitHub 查看源码',

    heroImageAlt:
      'OneKey 硬件钱包显示一笔被识别为高风险 delegatecall 的 Gnosis Safe 交易，等待用户在设备上确认。',
  },
}

const getCopy = (locale) => copyByLocale[locale] ?? copyByLocale.en

const getCardHref = (basePath, href) =>
  href.includes('#')
    ? `${basePath}/agent-wallet/${href.replace('#', '/#')}`
    : `${basePath}/agent-wallet/${href}/`

function CopyButton({ text, label, copiedLabel }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    [],
  )

  const onCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API requires a secure context and user gesture; fail quietly.
    }
  }

  const Icon = copied ? Check : Copy

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? copiedLabel : `${label}: ${text}`}
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold leading-4 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57E668]"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{copied ? copiedLabel : label}</span>
    </button>
  )
}

export function AgentWalletLanding({ locale = 'en' }) {
  const copy = getCopy(locale)
  const basePath = `/${locale}`

  return (
    <div className="landing-page flex min-h-screen max-w-full flex-col overflow-x-hidden bg-[#101111] text-white">
      <main className="flex flex-col">
        {/* HERO — copy + product shot */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_76%_16%,rgba(22,214,41,0.18),transparent_30%),radial-gradient(circle_at_8%_14%,rgba(87,230,104,0.1),transparent_28%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[540px] bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(180deg,#000,transparent)]"
          />

          <div className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-5 pb-12 pt-20 md:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-16 lg:pb-20 lg:pt-24">
            <div className="flex w-full min-w-0 max-w-[720px] flex-col justify-center">
              <div className="w-fit rounded-full border border-[#57E668]/35 bg-[#57E668]/10 px-4 py-2 text-[14px] font-semibold leading-5 text-[#57E668]">
                {copy.eyebrow}
              </div>
              <h1 className="mt-6 max-w-full text-[44px] font-semibold leading-[1.02] md:text-[64px] lg:text-[76px]">
                {copy.title}
              </h1>
              <p className="mt-7 max-w-full text-[18px] leading-[30px] text-white/68 md:max-w-[560px]">
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
                  href={`${basePath}/agent-wallet/capabilities/`}
                  className="rounded-full border border-white/15 bg-white/10 px-8 py-[18px] text-[16px] font-semibold leading-5 text-white no-underline transition-colors hover:bg-white/15"
                >
                  {copy.secondaryCta}
                </Link>
              </div>
            </div>

            <div className="relative flex min-w-0 items-center justify-center">
              <div className="relative w-full max-w-[680px]">
                <Image
                  src="/landing-page/agent-clear-signing.jpg"
                  alt={copy.heroImageAlt}
                  width={1440}
                  height={1800}
                  priority
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  className="h-auto w-full"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-[linear-gradient(to_top,#101111_0%,rgba(16,17,17,0.96)_28%,rgba(16,17,17,0.7)_55%,transparent_100%)]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* INSTALL — its own moment, full width */}
        <section className="mx-auto w-full max-w-[1440px] px-6 lg:px-16">
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#141616] shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(87,230,104,0.12),transparent_45%)]"
            />
            <div className="relative grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12 lg:p-10">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#57E668]" aria-hidden="true" />
                  <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#57E668]">
                    {copy.installEyebrow}
                  </span>
                </div>
                <h2 className="mt-3 text-[26px] font-semibold leading-[1.15] md:text-[34px]">
                  {copy.installTitle}
                </h2>
                <p className="mt-3 max-w-[520px] text-[15px] leading-[24px] text-white/65">
                  {copy.installSubtitle}
                </p>
              </div>

              <div className="w-full min-w-0">
                <div className="relative">
                  <pre className="m-0 overflow-x-auto rounded-[14px] bg-[#0C0D0D] p-4 pr-[110px] text-[14px] leading-[22px] text-[#D7FFDC]">
                    <code aria-label={copy.installCommandSrLabel}>{INSTALL_COMMAND}</code>
                  </pre>
                  <div className="absolute right-3 top-3">
                    <CopyButton
                      text={INSTALL_COMMAND}
                      label={copy.installCopyLabel}
                      copiedLabel={copy.installCopiedLabel}
                    />
                  </div>
                </div>
                <p className="m-0 mt-3 text-[12px] leading-5 text-white/55">{copy.installNote}</p>
              </div>
            </div>
          </div>
        </section>

        {/* PROOF BAR */}
        <section className="mx-auto mt-6 grid w-full max-w-[1440px] grid-cols-1 gap-3 px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-16">
          {copy.proof.map((item) => (
            <div
              key={item}
              className="min-h-[86px] rounded-[16px] border border-white/10 bg-[#222]/80 px-5 py-6 text-[15px] font-semibold leading-5 text-white/85"
            >
              {item}
            </div>
          ))}
        </section>

        {/* CAPABILITY CARDS */}
        <section className="mx-auto w-full max-w-[1440px] px-6 py-28 lg:px-16">
          <div className="max-w-[820px]">
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
                    <card.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-[22px] font-semibold leading-7 text-white">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[22px] text-white/65">
                    {card.description}
                  </p>
                </div>
                <span className="mt-7 inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#16D629]">
                  {locale === 'zh' ? '查看文档' : 'Read docs'}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mx-auto w-full max-w-[1440px] px-6 pb-28 lg:px-16">
          <div className="flex flex-col items-start gap-7 rounded-[24px] border border-white/10 bg-[#222] p-8 lg:flex-row lg:items-center lg:justify-between lg:p-12">
            <div>
              <span className="text-[14px] font-semibold leading-5 text-[#57E668]">
                {copy.finalEyebrow}
              </span>
              <h2 className="mt-3 max-w-[680px] text-[28px] font-semibold leading-[1.15] md:text-[40px]">
                {copy.finalTitle}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`${basePath}/agent-wallet/quickstart/`}
                className="rounded-full bg-[linear-gradient(90deg,#57E668_0%,#16D629_100%)] px-7 py-[14px] text-[15px] font-semibold leading-5 text-[#101111] no-underline transition-opacity hover:opacity-90"
              >
                {copy.finalCta}
              </Link>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-6 py-[14px] text-[15px] font-semibold leading-5 text-white no-underline transition-colors hover:bg-white/10"
              >
                {copy.finalSecondary}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
