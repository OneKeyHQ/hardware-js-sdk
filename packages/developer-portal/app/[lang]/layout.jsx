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

// Navigation menu configuration is in content/[lang]/_meta.js

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
        pageMap={pageMap}
        docsRepositoryBase="https://github.com/OneKeyHQ/hardware-js-sdk/tree/onekey/packages/developer-portal"
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
