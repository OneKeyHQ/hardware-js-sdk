'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Code2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react'

const copyByLocale = {
  en: {
    eyebrow: 'OneKey Agent Wallet',
    title: 'Build wallet-native AI agents with OneKey',
    subtitle:
      'Install wallet skills first. Agents can read balances, research markets, quote swaps, and prepare transactions in natural language while OneKey GUI and hardware keep users in control.',
    primaryCta: 'Install skills',
    secondaryCta: 'See what agents can do',
    installTitle: 'Start with skills',
    installSubtitle:
      'Users ask in natural language. The skills handle schema discovery, CLI preflight, and safe command routing behind the scenes.',
    installOptions: [
      {
        id: 'claude',
        label: 'Claude Code',
        command:
          '/plugin marketplace add OneKeyHQ/onekey-wallet-skills\n/plugin install onekey-wallet-skills',
        note: 'Native plugin install for Claude Code.',
      },
      {
        id: 'codex',
        label: 'Codex',
        command:
          'Fetch and follow instructions from https://raw.githubusercontent.com/OneKeyHQ/onekey-wallet-skills/main/.codex/INSTALL.md',
        note: 'Codex follows the repo install guide and discovers the four wallet skills.',
      },
      {
        id: 'cursor',
        label: 'Cursor',
        command: 'git clone https://github.com/OneKeyHQ/onekey-wallet-skills',
        note: 'Point Cursor at the plugin directory, then ask wallet prompts directly.',
      },
      {
        id: 'opencode',
        label: 'OpenCode',
        command:
          'Fetch and follow instructions from https://raw.githubusercontent.com/OneKeyHQ/onekey-wallet-skills/main/.opencode/INSTALL.md',
        note: 'OpenCode uses the same skill pack and command schema.',
      },
    ],
    proof: [
      '4 wallet skills',
      'Claude Code, Codex, Cursor, OpenCode, OpenClaw',
      'CLI handled by skills',
      'Hardware confirmation for fund moves',
    ],
    sectionEyebrow: 'Skill-first wallet layer',
    sectionTitle:
      'Make the first step installation, not a wall of terminal commands.',
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
    modelTitle: 'Users speak to the skill. OneKey handles the wallet boundary.',
    modelItems: [
      'The visible onboarding path is skill installation and natural-language prompts, not manual CLI setup.',
      'Skills use the current schema to route wallet, market, swap, and security requests without exposing raw command dumps to users.',
      'Fund-moving actions are staged, risk-checked, and can be escalated to OneKey hardware for clear signing.',
    ],
    finalTitle: 'Give agents usable wallet capabilities without turning private keys into prompts.',
    finalCta: 'Start with the quickstart',
  },
  zh: {
    eyebrow: 'OneKey Agent Wallet',
    title: '让 AI Agent 用上 OneKey 钱包',
    subtitle:
      '先安装 Wallet Skills。用户用自然语言查余额、研究行情、报价 swap、准备交易，OneKey GUI 和硬件钱包继续保留关键控制权。',
    primaryCta: '安装 Skills',
    secondaryCta: '查看能力',
    installTitle: '先安装 Skills',
    installSubtitle:
      '用户不需要手写 CLI。Skills 会在背后完成 schema discovery、CLI preflight 和安全路由。',
    installOptions: [
      {
        id: 'claude',
        label: 'Claude Code',
        command:
          '/plugin marketplace add OneKeyHQ/onekey-wallet-skills\n/plugin install onekey-wallet-skills',
        note: 'Claude Code 使用原生 plugin 安装路径。',
      },
      {
        id: 'codex',
        label: 'Codex',
        command:
          'Fetch and follow instructions from https://raw.githubusercontent.com/OneKeyHQ/onekey-wallet-skills/main/.codex/INSTALL.md',
        note: 'Codex 按仓库安装说明接入四个钱包 skills。',
      },
      {
        id: 'cursor',
        label: 'Cursor',
        command: 'git clone https://github.com/OneKeyHQ/onekey-wallet-skills',
        note: '把 Cursor 指向 plugin 目录后，直接输入钱包请求。',
      },
      {
        id: 'opencode',
        label: 'OpenCode',
        command:
          'Fetch and follow instructions from https://raw.githubusercontent.com/OneKeyHQ/onekey-wallet-skills/main/.opencode/INSTALL.md',
        note: 'OpenCode 使用同一套 skill pack 和命令 schema。',
      },
    ],
    proof: [
      '4 个钱包 Skills',
      '支持 Claude Code / Codex / Cursor / OpenCode / OpenClaw',
      'CLI 由 Skills 处理',
      '资金操作交给硬件确认',
    ],
    sectionEyebrow: 'Skill-first 钱包能力层',
    sectionTitle: '第一步应该是安装 Skills，而不是让用户面对一大段终端命令。',
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
    modelTitle: '用户面对的是 Skill，钱包边界交给 OneKey。',
    modelItems: [
      '可见的 onboarding 是 skill 安装和自然语言 prompt，不是手动 CLI 初始化。',
      'Skills 根据当前 schema 路由钱包、行情、交易和安全请求，不把原始命令 dump 给用户。',
      '涉及资金移动的动作会先预览、检查风险，并可升级到 OneKey 硬件完成 clear signing。',
    ],
    finalTitle: '让 Agent 拥有可用的钱包能力，但不要把私钥变成 prompt。',
    finalCta: '从快速开始进入',
  },
}

const getCopy = (locale) => copyByLocale[locale] ?? copyByLocale.en

const getCardHref = (basePath, href) =>
  href.includes('#')
    ? `${basePath}/agent-wallet/${href.replace('#', '/#')}`
    : `${basePath}/agent-wallet/${href}/`

export function AgentWalletLanding({ locale = 'en' }) {
  const copy = getCopy(locale)
  const basePath = `/${locale}`
  const [selectedClient, setSelectedClient] = useState('claude')
  const selectedInstall =
    copy.installOptions.find((option) => option.id === selectedClient) ?? copy.installOptions[0]

  return (
    <div className="landing-page flex min-h-screen max-w-full flex-col overflow-x-hidden bg-[#101111] text-white">
      <main className="flex flex-col">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_16%,rgba(22,214,41,0.2),transparent_30%),radial-gradient(circle_at_8%_14%,rgba(87,230,104,0.11),transparent_28%)]" />
          <div className="absolute inset-x-0 top-0 h-[540px] bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(180deg,#000,transparent)]" />

          <div className="relative mx-auto grid min-h-[760px] w-full max-w-[1440px] grid-cols-1 gap-12 overflow-hidden px-5 pb-16 pt-20 md:px-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:px-16 lg:pt-20">
            <div className="flex w-full min-w-0 max-w-[720px] flex-col justify-center">
              <div className="w-fit rounded-full border border-[#57E668]/35 bg-[#57E668]/10 px-4 py-2 text-[14px] font-semibold leading-5 text-[#57E668]">
                {copy.eyebrow}
              </div>
              <h1 className="mt-6 max-w-full text-[52px] font-semibold leading-[0.96] md:text-[76px] lg:text-[88px]">
                {copy.title}
              </h1>
              <p className="mt-7 max-w-full text-[18px] leading-[30px] text-white/68 md:max-w-[660px]">
                {copy.subtitle}
              </p>
              <div className="mt-8 w-full min-w-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#141616]/88 shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur">
                <div className="border-b border-white/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[18px] font-semibold leading-6 text-white">
                        {copy.installTitle}
                      </div>
                    </div>
                    <Sparkles className="size-5 text-[#57E668]" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {copy.installOptions.map((option) => {
                      const isActive = option.id === selectedInstall.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedClient(option.id)}
                          className={`rounded-full px-3.5 py-2 text-[13px] font-semibold leading-4 transition-colors ${
                            isActive
                              ? 'bg-[#57E668] text-[#101111]'
                              : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid gap-3 p-4">
                  <pre className="m-0 min-h-[72px] overflow-x-auto rounded-[14px] bg-[#0C0D0D] p-4 text-[13px] leading-[22px] text-[#D7FFDC]">
                    <code>{selectedInstall.command}</code>
                  </pre>
                  <p className="m-0 text-[13px] leading-5 text-white/52">{selectedInstall.note}</p>
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
                <div className="absolute inset-9 overflow-hidden rounded-[22px] bg-[linear-gradient(90deg,rgba(16,17,17,0.04),rgba(16,17,17,0.18)),url('/landing-page/agent-clear-signing.jpg')] bg-cover bg-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_28px_80px_rgba(0,0,0,0.42)]" />
                <div className="absolute inset-x-[60px] inset-y-[72px] rounded-[26px] border border-[#57E668]/40 shadow-[0_0_34px_rgba(87,230,104,0.18),inset_0_0_28px_rgba(87,230,104,0.08)]" />
                <div className="absolute bottom-20 left-5 grid max-w-[220px] gap-1 rounded-[14px] border border-white/15 bg-[#111312]/85 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                  <span className="text-[12px] leading-4 text-white/55">
                    {locale === 'zh' ? 'Agent Wallet 会话' : 'Agent Wallet session'}
                  </span>
                  <strong className="text-[14px] leading-[18px] text-white">
                    {locale === 'zh' ? '已绑定 keyless' : 'Keyless-bound account'}
                  </strong>
                </div>
                <div className="absolute right-5 top-20 grid max-w-[240px] gap-1 rounded-[14px] border border-[#57E668]/35 bg-[#111312]/85 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                  <span className="text-[12px] leading-4 text-white/55">
                    {locale === 'zh' ? '需要硬件确认' : 'Hardware confirmation required'}
                  </span>
                  <strong className="text-[14px] leading-[18px] text-white">
                    {locale === 'zh' ? '在设备上审核' : 'Review on device'}
                  </strong>
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
                  {locale === 'zh' ? '查看文档' : 'Read docs'}
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
                  href={`${basePath}/agent-wallet/quickstart/`}
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
