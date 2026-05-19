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
      'Install one skill pack. Your agents can read balances, research markets, and stage transactions in plain language — while users keep control through OneKey GUI and hardware.',
    primaryCta: 'Install skills',
    secondaryCta: 'Explore capabilities',
    installTitle: 'One command, every AI agent.',
    installSubtitle:
      'Powered by the open skills CLI. Auto-detects Claude Code, Codex, Cursor, OpenCode, and 50+ more.',
    installCopyLabel: 'Copy',
    installCopiedLabel: 'Copied',
    installCommandSrLabel: 'Install command',
    installNote: 'Running multiple AI agents on the same machine? Pass --agent <name> to target a specific one.',
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
      'OneKey hardware wallet performing clear signing for an AI agent transaction',
    heroSessionLabel: 'Agent Wallet session',
    heroSessionValue: 'Keyless-bound account',
    heroConfirmLabel: 'Hardware confirmation required',
    heroConfirmValue: 'Review on device',
  },
  zh: {
    eyebrow: 'OneKey Agent Wallet',
    title: '为 AI Agent 打造的钱包。',
    subtitle:
      '一条命令装好 skills。Agent 用自然语言查余额、研究行情、准备交易，关键控制权留给 OneKey GUI 和硬件钱包。',
    primaryCta: '安装 Skills',
    secondaryCta: '查看能力',
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
    heroImageAlt: 'OneKey 硬件钱包对 AI agent 发起的交易进行 clear signing',
    heroSessionLabel: 'Agent Wallet 会话',
    heroSessionValue: '已绑定 keyless',
    heroConfirmLabel: '需要硬件确认',
    heroConfirmValue: '在设备上审核',
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
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_76%_16%,rgba(22,214,41,0.2),transparent_30%),radial-gradient(circle_at_8%_14%,rgba(87,230,104,0.11),transparent_28%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[540px] bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(180deg,#000,transparent)]"
          />

          <div className="relative mx-auto grid min-h-[760px] w-full max-w-[1440px] grid-cols-1 gap-12 overflow-hidden px-5 pb-16 pt-20 md:px-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:px-16 lg:pt-20">
            <div className="flex w-full min-w-0 max-w-[720px] flex-col justify-center">
              <div className="w-fit rounded-full border border-[#57E668]/35 bg-[#57E668]/10 px-4 py-2 text-[14px] font-semibold leading-5 text-[#57E668]">
                {copy.eyebrow}
              </div>
              <h1 className="mt-6 max-w-full text-[44px] font-semibold leading-[1.02] md:text-[64px] lg:text-[76px]">
                {copy.title}
              </h1>
              <p className="mt-7 max-w-full text-[18px] leading-[30px] text-white/68 md:max-w-[660px]">
                {copy.subtitle}
              </p>

              <div className="mt-8 w-full min-w-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#141616]/88 shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur">
                <div className="flex items-start justify-between gap-3 p-5">
                  <div>
                    <div className="text-[16px] font-semibold leading-5 text-white">
                      {copy.installTitle}
                    </div>
                    <p className="mt-2 max-w-[440px] text-[13px] leading-5 text-white/60">
                      {copy.installSubtitle}
                    </p>
                  </div>
                  <Sparkles className="mt-1 size-5 shrink-0 text-[#57E668]" aria-hidden="true" />
                </div>
                <div className="border-t border-white/10 p-5">
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
                  <p className="m-0 mt-3 text-[13px] leading-5 text-white/55">{copy.installNote}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
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

            <div className="flex min-w-0 items-center">
              <div className="relative aspect-[1/0.9] w-full overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_52%_42%,rgba(87,230,104,0.2),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_32px_120px_rgba(0,0,0,0.48)]">
                <div className="absolute inset-9 overflow-hidden rounded-[22px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_28px_80px_rgba(0,0,0,0.42)]">
                  <Image
                    src="/landing-page/agent-clear-signing.jpg"
                    alt={copy.heroImageAlt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,17,17,0.04),rgba(16,17,17,0.18))]"
                  />
                </div>
                <div
                  aria-hidden="true"
                  className="absolute inset-x-[60px] inset-y-[72px] rounded-[26px] border border-[#57E668]/40 shadow-[0_0_34px_rgba(87,230,104,0.18),inset_0_0_28px_rgba(87,230,104,0.08)]"
                />
                <div className="absolute bottom-20 left-5 grid max-w-[220px] gap-1 rounded-[14px] border border-white/15 bg-[#111312]/85 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                  <span className="text-[12px] leading-4 text-white/55">{copy.heroSessionLabel}</span>
                  <strong className="text-[14px] leading-[18px] text-white">{copy.heroSessionValue}</strong>
                </div>
                <div className="absolute right-5 top-20 grid max-w-[240px] gap-1 rounded-[14px] border border-[#57E668]/35 bg-[#111312]/85 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                  <span className="text-[12px] leading-4 text-white/55">{copy.heroConfirmLabel}</span>
                  <strong className="text-[14px] leading-[18px] text-white">{copy.heroConfirmValue}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto -mt-4 grid w-full max-w-[1440px] grid-cols-1 gap-3 px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-16">
          {copy.proof.map((item) => (
            <div
              key={item}
              className="min-h-[86px] rounded-[16px] border border-white/10 bg-[#222]/80 px-5 py-6 text-[15px] font-semibold leading-5 text-white/85"
            >
              {item}
            </div>
          ))}
        </section>

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
