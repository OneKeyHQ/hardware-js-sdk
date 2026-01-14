import { ChainMethodsSidebar } from '../../../components/ChainMethodsSidebar'

export default {
  index: '概览',
  playground: {
    title: '交互演示',
    theme: {
      layout: 'full',
      toc: false,
      copyPage: false
    }
  },
  transport: '传输协议',
  signers: '交易签名指引',
  '---api': { type: 'separator', title: 'API' },
  'core-api-guide': '核心接口速查',
  'basic-api': '基础 API',
  'device-api': '设备 API',
  // Chain Methods - custom sidebar selector
  '---chain': {
    type: 'separator',
    title: <ChainMethodsSidebar lang="zh" />
  },
  chains: { display: 'hidden' },
  '---Reference': { type: 'separator', title: '参考' },
  'legacy-guides': '迁移指引',
  'concepts': '概念'
}
