import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import MdxImage from './components/MdxImage.jsx'

const docsComponents = getDocsMDXComponents()
const docsWrapper = docsComponents.wrapper

export function useMDXComponents(components) {
  return {
    ...docsComponents,
    img: MdxImage,
    wrapper: (props) => {
      const filePath = props?.metadata?.filePath || ''
      const isLanding =
        filePath.endsWith('content/zh/index.mdx') || filePath.endsWith('content/en/index.mdx')
      if (isLanding) {
        return <>{props.children}</>
      }
      return docsWrapper(props)
    },
    ...components,
  }
}
