export default {
  index: {
    title: '首页',
    display: 'hidden',
    theme: {
      layout: 'full',
      sidebar: false,
      toc: false,
      pagination: false,
      breadcrumb: false,
      timestamp: false,
      footer: false,
      copyPage: false
    }
  },
  'connect-to-hardware': {
    title: '连接硬件',
    type: 'menu',
    items: {
      'hardware-sdk': { title: '硬件 JS SDK', href: '/zh/hardware-sdk' },
      'air-gap': { title: 'Air-Gap 离线签名', href: '/zh/air-gap' }
    }
  },
  'hardware-sdk': {
    title: 'hardware-sdk',
    type: 'page'
  },
  'air-gap': {
    title: 'Air Gap',
    type: 'page'
  },
  'connect-to-software': {
    title: '连接软件',
    type: 'page'
  },
  changelog: {
    title: '更新日志',
    display: 'hidden'
  }
}
