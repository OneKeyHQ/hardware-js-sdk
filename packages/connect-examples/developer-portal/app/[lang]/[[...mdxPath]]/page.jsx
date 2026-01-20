import { notFound } from 'next/navigation'
import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../../mdx-components'

// Use Nextra's built-in generateStaticParams (requires i18n config in next.config.mjs)
export const generateStaticParams = generateStaticParamsFor('mdxPath', 'lang')

const loadPage = async (params) => {
  try {
    return await importPage(params.mdxPath, params.lang)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
      notFound()
    }
    throw error
  }
}

export async function generateMetadata(props) {
  const params = await props.params
  const { metadata } = await loadPage(params)
  return metadata
}

const Wrapper = getMDXComponents().wrapper

export default async function Page(props) {
  const params = await props.params
  const {
    default: MDXContent,
    toc,
    metadata,
    sourceCode
  } = await loadPage(params)

  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
