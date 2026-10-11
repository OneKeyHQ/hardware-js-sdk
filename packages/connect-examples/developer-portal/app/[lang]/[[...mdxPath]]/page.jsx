import { publishedLocaleCodes } from '../../../i18n/locales.mjs';
import { ui } from '../../../i18n/ui.mjs';
import { notFound } from 'next/navigation';
import { generateStaticParamsFor, importPage } from 'nextra/pages';
import { useMDXComponents as getMDXComponents } from '../../../mdx-components';

// Use Nextra's built-in generateStaticParams (requires i18n config in next.config.mjs)
export const generateStaticParams = generateStaticParamsFor('mdxPath', 'lang');

const loadPage = async params => {
  try {
    return await importPage(params.mdxPath, params.lang);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'MODULE_NOT_FOUND'
    ) {
      notFound();
    }
    throw error;
  }
};

export async function generateMetadata(props, parent) {
  const params = await props.params;
  const { metadata } = await loadPage(params);
  const inherited = await parent;
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const slug = (params.mdxPath || []).join('/');
  const route = locale => `${basePath}/${locale}/${slug ? `${slug}/` : ''}`;
  const description =
    metadata.description ||
    ui(
      params.lang,
      'Official developer documentation for OneKey hardware and software integration.',
      'OneKey 硬件与软件集成的官方开发者文档。'
    );
  return {
    ...metadata,
    description,
    alternates: {
      canonical: route(params.lang),
      languages: {
        ...Object.fromEntries(
          publishedLocaleCodes.map(locale => [locale === 'zh' ? 'zh-CN' : locale, route(locale)])
        ),
        'x-default': route('en'),
      },
    },
    openGraph: {
      ...inherited.openGraph,
      ...metadata.openGraph,
      title: metadata.title,
      description,
      url: route(params.lang),
      locale: { en: 'en_US', zh: 'zh_CN', fr: 'fr_FR', de: 'de_DE', es: 'es_ES', ja: 'ja_JP' }[
        params.lang
      ],
    },
    twitter: { ...inherited.twitter, ...metadata.twitter, title: metadata.title, description },
  };
}

const Wrapper = getMDXComponents().wrapper;

export default async function Page(props) {
  const params = await props.params;
  const { default: MDXContent, toc, metadata, sourceCode } = await loadPage(params);

  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
