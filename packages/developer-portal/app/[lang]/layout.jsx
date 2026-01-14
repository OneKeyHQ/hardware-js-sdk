import { Layout } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import { OneKeyWordmark } from '../../components/OneKeyLogo'
import { NavbarMenuActiveMarker } from '../../components/NavbarMenuActiveMarker'
import OneKeyNavbar from '../../components/OneKeyNavbar'

// Static params for i18n routing (Next.js App Router pattern)
// See: https://nextjs.org/docs/app/guides/internationalization#static-rendering
export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'zh' }]
}

function patchPageMapForTopNav(pageMap, lang) {
  if (!Array.isArray(pageMap) || pageMap.length === 0) return pageMap

  const [first, ...rest] = pageMap
  const hasMeta = first && typeof first === 'object' && 'data' in first
  const metaItem = hasMeta ? first : null
  const items = hasMeta ? rest : pageMap

  const hardwareSdkItem = items.find((item) => item?.name === 'hardware-sdk')
  const airGapItem = items.find((item) => item?.name === 'air-gap')
  const connectSoftwareItem = items.find((item) => item?.name === 'connect-to-software')
  if (!hardwareSdkItem || !airGapItem || !connectSoftwareItem) return pageMap

  const filteredItems = items.filter(
    (item) =>
      item?.name !== 'hardware-sdk' &&
      item?.name !== 'air-gap' &&
      item?.name !== 'connect-to-software' &&
      item?.name !== 'connect-to-hardware'
  )

  const connectHardwareTitle = lang === 'zh' ? '硬件接入' : 'Hardware Integration'
  const connectSoftwareTitle = lang === 'zh' ? 'dApp 接入' : 'dApp Integration'
  const offlineSigningTitle = lang === 'zh' ? 'Air-Gap 签名' : 'Offline Signing'

  const connectHardware = { ...hardwareSdkItem, title: connectHardwareTitle }
  const connectSoftware = { ...connectSoftwareItem, title: connectSoftwareTitle }
  const offlineSigning = { ...airGapItem, title: offlineSigningTitle }

  const resultItems = [connectHardware, connectSoftware, offlineSigning, ...filteredItems]
  return metaItem ? [metaItem, ...resultItems] : resultItems
}

export default async function LocaleLayout({ children, params }) {
  const { lang } = await params
  const pageMap = patchPageMapForTopNav(await getPageMap(`/${lang}`), lang)

  const navbar = (
    <OneKeyNavbar
      logo={<OneKeyWordmark />}
      logoLink={`/${lang}`}
      projectLink="https://github.com/OneKeyHQ/hardware-js-sdk"
    >
      <NavbarMenuActiveMarker lang={lang} />
    </OneKeyNavbar>
  )

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="${lang}";`
        }}
      />
      <Layout
        navbar={navbar}
        pageMap={pageMap}
        docsRepositoryBase="https://github.com/OneKeyHQ/developer-docs/tree/main"
        i18n={[
          { locale: 'en', name: 'English' },
          { locale: 'zh', name: '简体中文' }
        ]}
        sidebar={{
          defaultMenuCollapseLevel: 1,
          toggleButton: true
        }}
        editLink={lang === 'zh' ? '编辑此页面' : 'Edit this page'}
        feedback={{ content: null }}
        toc={{
          title: lang === 'zh' ? '本页内容' : 'On This Page',
          backToTop: lang === 'zh' ? '返回顶部' : 'Back to top'
        }}
        navigation={false}
        darkMode={false}
        nextThemes={{ defaultTheme: 'dark', forcedTheme: 'dark' }}
      >
        {children}
      </Layout>
    </>
  )
}
