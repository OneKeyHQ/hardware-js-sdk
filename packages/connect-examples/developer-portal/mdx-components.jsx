import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { AgentWalletDisclaimer } from './components/AgentWalletBetaTitle.js'
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

      const agentWalletMatch = filePath.match(/content\/(en|zh)\/agent-wallet\//)
      if (agentWalletMatch) {
        return docsWrapper({
          ...props,
          children: (
            <>
              <AgentWalletDisclaimer locale={agentWalletMatch[1]} />
              {props.children}
            </>
          ),
        })
      }

      return docsWrapper(props)
    },
    ...components,
  }
}
