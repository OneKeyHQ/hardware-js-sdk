'use client'

import { useMemo } from 'react'
import { useFSRoute } from 'nextra/hooks'
import { Layout, LastUpdated } from 'nextra-theme-docs'
import { ui } from '../i18n/ui.mjs'

// Resources span several existing URLs. Group their sidebar without moving pages.
export function resourcesPageMap(pageMap, route, locale) {
  const sections = ['integration-guides', 'troubleshooting', 'legacy']
  const isResource = sections.some(name =>
    route === `/${locale}/${name}` || route.startsWith(`/${locale}/${name}/`)
  )
  if (!isResource) return pageMap

  const meta = pageMap.find(item => 'data' in item)
  const guides = pageMap.find(item => item.name === 'integration-guides')
  if (!meta || !guides) return pageMap

  const { children, ...menu } = guides
  const resources = meta.data['integration-guides']
  const resourcePages = sections.slice(1).map(name => pageMap.find(item => item.name === name))

  return [
    {
      ...meta,
      data: {
        ...meta.data,
        '---resources': { type: 'separator' },
        'resources-guides': { type: 'doc' },
        troubleshooting: { ...meta.data.troubleshooting, display: 'normal' },
        legacy: { ...meta.data.legacy, display: 'normal' },
      },
    },
    ...pageMap.filter(item => item !== meta && !sections.includes(item.name)),
    menu,
    { name: '---resources', title: resources.title },
    {
      ...guides,
      name: 'resources-guides',
      title: resources.items.guides.title,
      children,
    },
    ...resourcePages.filter(Boolean),
  ]
}

export default function DocsLayout({ pageMap, locale, ...props }) {
  const route = useFSRoute()
  const navigation = useMemo(
    () => resourcesPageMap(pageMap, route, locale),
    [pageMap, route, locale]
  )
  return <Layout {...props} pageMap={navigation}
    lastUpdated={<LastUpdated locale={locale}>{ui(locale, 'Last updated on')}</LastUpdated>} />
}
