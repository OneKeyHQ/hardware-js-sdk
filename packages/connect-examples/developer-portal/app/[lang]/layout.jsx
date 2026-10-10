import { ui } from '../../i18n/ui.mjs'
import { Layout, LastUpdated } from 'nextra-theme-docs'
import { publishedLocales, publishedLocaleCodes } from '../../i18n/locales.mjs'
import { getPageMap } from 'nextra/page-map'
import { OneKeyWordmark } from '../../components/OneKeyLogo'
import { NavbarMenuActiveMarker } from '../../components/NavbarMenuActiveMarker'
import OneKeyNavbar from '../../components/OneKeyNavbar'
import { OneKeySidebarSearch } from '../../components/OneKeyNavbar.client'
import Footer from '../../components/Footer'
import DocAIChatWidget from '../../components/DocAIChatWidget.client'

// Static params for i18n routing (Next.js App Router pattern)
// See: https://nextjs.org/docs/app/guides/internationalization#static-rendering
export async function generateStaticParams() {
  return publishedLocaleCodes.map(lang => ({ lang }))
}

// Menu structure is defined in content/{lang}/_meta.js using type: 'menu'

export default async function LocaleLayout({ children, params }) {
  const { lang } = await params
  const pageMap = await getPageMap(`/${lang}`)

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
        search={<OneKeySidebarSearch lang={lang} />}
        pageMap={pageMap}
        docsRepositoryBase="https://github.com/OneKeyHQ/hardware-js-sdk/tree/onekey/packages/connect-examples/developer-portal"
        i18n={publishedLocales.map(({ code, name }) => ({ locale: code, name }))}
        sidebar={{
          defaultMenuCollapseLevel: 1,
          toggleButton: true
        }}
        editLink={ui(lang, 'Edit this page', '编辑此页面')}
        feedback={{ content: null }}
        toc={{
          title: ui(lang, 'On This Page', '本页内容'),
          backToTop: ui(lang, 'Back to top', '返回顶部')
        }}
        lastUpdated={<LastUpdated locale={lang}>{ui(lang, 'Last updated on', '最后更新于')}</LastUpdated>}
        navigation={true}
        copyPageButton={false}
        themeSwitch={{ light: ui(lang, 'Light', '浅色'), dark: ui(lang, 'Dark', '深色'), system: ui(lang, 'System', '跟随系统') }}
        darkMode={true}
        nextThemes={{ defaultTheme: 'light' }}
        footer={<Footer key="onekey-footer" />}
      >
        {children}
      </Layout>
      <DocAIChatWidget lang={lang} />
    </>
  )
}
