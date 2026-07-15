import assert from 'node:assert/strict'
import test from 'node:test'

import enMeta from '../content/en/_meta.js'
import zhMeta from '../content/zh/_meta.js'

const expectedItemKeys = [
  'landing',
  'overview',
  'quickstart',
  'capabilities',
  'wallet-skills',
  'recipes',
  'wallet-session',
  'keyless-binding',
  'hardware-control',
  'safety'
]

test('Agent Wallet 属于中英文顶层页面地图', () => {
  for (const [locale, meta] of [['en', enMeta], ['zh', zhMeta]]) {
    const menu = meta['agent-wallet']

    assert.ok(menu, `${locale} 缺少 agent-wallet 顶层配置`)
    assert.equal(menu.type, 'menu')
    assert.deepEqual(Object.keys(menu.items), expectedItemKeys)
    assert.equal(menu.items.landing.href, `/${locale}/agent-wallet/`)
    assert.equal(menu.items['wallet-skills'].href, `/${locale}/agent-wallet/wallet-skills`)
    assert.equal(menu.items.safety.href, `/${locale}/agent-wallet/safety`)
  }
})
