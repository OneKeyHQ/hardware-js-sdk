export default {
  index: {
    title: 'Home',
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
    title: 'Connect to hardware',
    type: 'menu',
    items: {
      'hardware-sdk': { title: 'Hardware JS SDK', href: '/en/hardware-sdk' },
      'air-gap': { title: 'Air-Gap', href: '/en/air-gap' }
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
    title: 'Connect to Software',
    type: 'page'
  },
  changelog: {
    title: 'Changelog',
    display: 'hidden'
  }
}
