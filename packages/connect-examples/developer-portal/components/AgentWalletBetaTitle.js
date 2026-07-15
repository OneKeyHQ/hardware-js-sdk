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
