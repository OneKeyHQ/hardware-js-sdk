import { ChainMethodsSidebar } from '../../../components/ChainMethodsSidebar'

export default {
  index: '概要',
  'getting-started': 'はじめに',
  'agent-integration': {
    title: 'OneKey Agent Wallet',
    display: 'hidden'
  },
  playground: {
    title: 'インタラクティブデモ',
    theme: {
      layout: 'full',
      toc: false,
      copyPage: false
    }
  },
  transport: 'トランスポート',
  signers: '署名ガイド',
  'firmware-update': 'ファームウェア更新',
  '---api': { type: 'separator', title: 'API' },
  'core-api-guide': 'コア API ガイド',
  'basic-api': '基本 API',
  'device-api': 'デバイス API',
  // Chain Methods - custom sidebar selector
  '---chain': {
    type: 'separator',
    title: <ChainMethodsSidebar lang="ja" />
  },
  chains: { display: 'hidden' },
  '---Reference': { type: 'separator', title: 'リファレンス' },
  'legacy-guides': '移行ガイド',
  concepts: '概念'
}
