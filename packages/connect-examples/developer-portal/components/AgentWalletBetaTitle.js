import React from 'react'

export function AgentWalletBetaTitle({ betaLabel }) {
  return React.createElement(
    'span',
    { className: 'agent-wallet-beta-title' },
    React.createElement('span', null, 'Agent Wallet'),
    React.createElement(
      'span',
      { className: 'agent-wallet-beta-badge' },
      betaLabel
    )
  )
}

const disclaimerContent = {
  en: {
    title: 'Private beta disclaimer',
    description:
      'Agent Wallet is currently in private beta. When testing transfers, swaps, approvals, or other on-chain operations, use a dedicated test wallet and only small amounts you can afford to lose. Always verify the network, asset, amount, recipient, fees, and confirmation details before approving.',
  },
  zh: {
    title: '内测免责声明',
    description:
      'Agent Wallet 当前处于内测阶段。测试转账、兑换、授权或其他链上操作时，请使用专用测试钱包，并仅使用可承受损失的小额资金。确认前请务必核对网络、币种、金额、收款地址、手续费及确认信息。',
  },
}

export function AgentWalletDisclaimer({ locale }) {
  const content = disclaimerContent[locale] || disclaimerContent.en

  return React.createElement(
    'aside',
    {
      className: 'agent-wallet-disclaimer',
      role: 'note',
      'aria-label': content.title,
    },
    React.createElement('strong', null, content.title),
    React.createElement('p', null, content.description)
  )
}
