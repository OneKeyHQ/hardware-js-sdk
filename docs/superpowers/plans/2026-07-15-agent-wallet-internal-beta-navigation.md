# Agent Wallet Internal Beta Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复 Agent Wallet 的顶层导航归属，修复进入该目录后其他导航上下文消失的问题，并为中英文入口增加醒目的内测徽标。

**Architecture:** 继续使用 Nextra 的顶层 `_meta.js` 页面地图，不改动通用 Layout。新增一个无状态 React 标题组件生成“Agent Wallet + 状态徽标”，由中英文元数据复用；使用 Node 内置测试直接加载真实元数据并渲染标题，浏览器回归负责验证 Nextra 最终布局。

**Tech Stack:** Next.js 16、Nextra 4、React 19、Node.js `node:test`、React DOM Server、Playwright CLI、CSS

---

## 文件结构

- 新增 `packages/connect-examples/developer-portal/tests/agent-wallet-navigation.test.mjs`：验证中英文页面地图、菜单顺序、路由和徽标渲染。
- 新增 `packages/connect-examples/developer-portal/components/AgentWalletBetaTitle.js`：生成可供 Nextra 元数据使用的 Agent Wallet 内测标题节点。
- 修改 `packages/connect-examples/developer-portal/content/en/_meta.js`：恢复英文 Agent Wallet 顶层菜单并使用英文徽标。
- 修改 `packages/connect-examples/developer-portal/content/zh/_meta.js`：恢复中文 Agent Wallet 顶层菜单并使用中文徽标。
- 修改 `packages/connect-examples/developer-portal/styles/globals.css`：定义内测标题与徽标的深色主题样式。

### Task 1: 恢复 Agent Wallet 顶层页面地图

**Files:**
- Create: `packages/connect-examples/developer-portal/tests/agent-wallet-navigation.test.mjs`
- Modify: `packages/connect-examples/developer-portal/content/en/_meta.js:14-44`
- Modify: `packages/connect-examples/developer-portal/content/zh/_meta.js:14-44`

- [ ] **Step 1: 编写页面地图失败测试**

```js
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
```

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `node --test tests/agent-wallet-navigation.test.mjs`

Expected: FAIL，错误包含 `en 缺少 agent-wallet 顶层配置`，证明测试命中了当前被注释的配置。

- [ ] **Step 3: 恢复英文和中文菜单配置**

将两个 `_meta.js` 中现有的 `agent-wallet` 配置取消注释，暂时保留字符串标题：

```js
'agent-wallet': {
  title: 'Agent Wallet',
  type: 'menu',
  items: {
    landing: { title: 'Landing', href: '/en/agent-wallet/' },
    overview: { title: 'Overview', href: '/en/agent-wallet/overview' },
    quickstart: { title: 'Quickstart', href: '/en/agent-wallet/quickstart' },
    capabilities: { title: 'Capabilities', href: '/en/agent-wallet/capabilities' },
    'wallet-skills': { title: 'Wallet Skills', href: '/en/agent-wallet/wallet-skills' },
    recipes: { title: 'Recipes', href: '/en/agent-wallet/recipes' },
    'wallet-session': { title: 'Agent Wallet Session', href: '/en/agent-wallet/wallet-session' },
    'keyless-binding': { title: 'Keyless Binding', href: '/en/agent-wallet/keyless-binding' },
    'hardware-control': { title: 'Hardware Control', href: '/en/agent-wallet/hardware-control' },
    safety: { title: 'Safety Rules', href: '/en/agent-wallet/safety' }
  }
},
```

中文文件使用现有中文子项标题和 `/zh/agent-wallet/...` 路由，键名与英文完全一致。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test tests/agent-wallet-navigation.test.mjs`

Expected: PASS，1 个测试通过。

- [ ] **Step 5: 提交页面地图修复**

```bash
git add packages/connect-examples/developer-portal/tests/agent-wallet-navigation.test.mjs \
  packages/connect-examples/developer-portal/content/en/_meta.js \
  packages/connect-examples/developer-portal/content/zh/_meta.js
git commit -m "fix(docs): restore Agent Wallet navigation context"
```

### Task 2: 增加可复用的内测徽标

**Files:**
- Create: `packages/connect-examples/developer-portal/components/AgentWalletBetaTitle.js`
- Modify: `packages/connect-examples/developer-portal/tests/agent-wallet-navigation.test.mjs`
- Modify: `packages/connect-examples/developer-portal/content/en/_meta.js:1,16`
- Modify: `packages/connect-examples/developer-portal/content/zh/_meta.js:1,16`
- Modify: `packages/connect-examples/developer-portal/styles/globals.css:860-870`

- [ ] **Step 1: 编写徽标渲染和样式失败测试**

在测试文件顶部新增：

```js
import { readFile } from 'node:fs/promises'
import { renderToStaticMarkup } from 'react-dom/server'
```

在页面地图测试后新增：

```js
test('Agent Wallet 标题显示本地化内测徽标', async () => {
  const enHtml = renderToStaticMarkup(enMeta['agent-wallet'].title)
  const zhHtml = renderToStaticMarkup(zhMeta['agent-wallet'].title)
  const css = await readFile(new URL('../styles/globals.css', import.meta.url), 'utf8')

  assert.match(enHtml, /Agent Wallet/)
  assert.match(enHtml, /Private Beta/)
  assert.match(zhHtml, /Agent Wallet/)
  assert.match(zhHtml, /内测/)
  assert.match(enHtml, /agent-wallet-beta-title/)
  assert.match(enHtml, /agent-wallet-beta-badge/)
  assert.match(css, /\.agent-wallet-beta-title\s*\{/)
  assert.match(css, /\.agent-wallet-beta-badge\s*\{/)
})
```

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `node --test tests/agent-wallet-navigation.test.mjs`

Expected: 第一个页面地图测试 PASS；第二个测试 FAIL，英文 HTML 中不存在 `Private Beta`。

- [ ] **Step 3: 实现最小标题组件**

```js
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
```

- [ ] **Step 4: 在中英文元数据中复用标题组件**

两个 `_meta.js` 顶部新增：

```js
import { AgentWalletBetaTitle } from '../../components/AgentWalletBetaTitle.js'
```

英文标题改为：

```js
title: AgentWalletBetaTitle({ betaLabel: 'Private Beta' }),
```

中文标题改为：

```js
title: AgentWalletBetaTitle({ betaLabel: '内测' }),
```

- [ ] **Step 5: 增加徽标样式**

在 `Sidebar Styling` 段落前加入：

```css
.agent-wallet-beta-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  white-space: nowrap;
}

.agent-wallet-beta-badge {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 1px 6px;
  border: 1px solid rgba(251, 191, 36, 0.55);
  border-radius: 9999px;
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  font-size: 10px;
  font-weight: 700;
  line-height: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
```

- [ ] **Step 6: 运行测试并确认全部通过**

Run: `node --test tests/agent-wallet-navigation.test.mjs`

Expected: PASS，2 个测试通过。

- [ ] **Step 7: 提交内测徽标**

```bash
git add packages/connect-examples/developer-portal/components/AgentWalletBetaTitle.js \
  packages/connect-examples/developer-portal/tests/agent-wallet-navigation.test.mjs \
  packages/connect-examples/developer-portal/content/en/_meta.js \
  packages/connect-examples/developer-portal/content/zh/_meta.js \
  packages/connect-examples/developer-portal/styles/globals.css
git commit -m "feat(docs): mark Agent Wallet as private beta"
```

### Task 3: 浏览器回归与生产构建

**Files:**
- Verify: `packages/connect-examples/developer-portal/content/en/_meta.js`
- Verify: `packages/connect-examples/developer-portal/content/zh/_meta.js`
- Verify: `packages/connect-examples/developer-portal/components/AgentWalletBetaTitle.js`
- Verify: `packages/connect-examples/developer-portal/styles/globals.css`

- [ ] **Step 1: 启动文档站**

Run: `yarn dev:webpack`

Expected: 服务在 `http://127.0.0.1:3001` Ready，无编译错误。

- [ ] **Step 2: 验证英文桌面导航**

使用 Playwright CLI 打开 `http://127.0.0.1:3001/en/agent-wallet/wallet-skills/`，视口设置为 `1216x920`。

Expected:

- 顶部导航出现 `Agent Wallet` 和 `Private Beta`。
- 左侧 Agent Wallet 分组显示同一徽标。
- Hardware Integration、dApp Integration、Offline Signing 仍存在。
- Wallet Skills 活动态正确，九个子页面链接均存在。
- 文档宽度无横向溢出。

- [ ] **Step 3: 验证中文和响应式导航**

依次检查：

```text
http://127.0.0.1:3001/zh/agent-wallet/wallet-skills/ @ 1216x920
http://127.0.0.1:3001/en/agent-wallet/wallet-skills/ @ 1216x460
http://127.0.0.1:3001/en/agent-wallet/wallet-skills/ @ 608x460
```

Expected:

- 中文入口和侧边栏显示 `内测`。
- 短视口侧边栏内容仍可滚动，底部语言栏不遮挡菜单。
- 移动端桌面侧边栏隐藏，菜单按钮可打开包含 Agent Wallet 徽标的移动导航。

- [ ] **Step 4: 运行自动化测试和生产构建**

Run:

```bash
node --test tests/agent-wallet-navigation.test.mjs
yarn build
```

Expected: 2 个 Node 测试通过；Next.js 构建和 Pagefind 索引成功，生成 582 个静态页面。

- [ ] **Step 5: 检查最终差异**

Run:

```bash
git diff --check
git status --short
git log --oneline -3
```

Expected: 无空白错误、无浏览器截图或构建产物进入 Git；最近提交依次包含设计、导航修复和内测徽标。
