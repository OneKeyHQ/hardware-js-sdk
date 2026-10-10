import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { AgentWalletDisclaimer } from './components/AgentWalletBetaTitle.js'
import MdxImage from './components/MdxImage.jsx'
import DocPageTools from './components/DocPageTools.client.jsx'
import { removeLinks } from 'nextra/remove-links'

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

      const locale = filePath.includes('content/zh/') ? 'zh' : 'en'
      const isAgentWallet = /\/agent-wallet\//.test(filePath)
      const isCampaign = filePath.endsWith('/agent-wallet/index.mdx')
      const isInteractive = filePath.endsWith('/hardware-sdk/playground.mdx') || filePath.endsWith('/changelog.mdx')
      const design = filePath.endsWith('/hardware-sdk/getting-started.mdx')
        ? 'quickstart'
        : /\/(chains|basic-api|device-api|provider)\//.test(filePath)
          ? 'api'
          : 'guide'
      return docsWrapper({
        ...props,
        'data-onekey-design': isCampaign || isInteractive ? undefined : design,
        children: <>
          {isAgentWallet && <AgentWalletDisclaimer locale={locale} />}
          {!isCampaign && <DocPageTools locale={locale} sourceCode={props.sourceCode}
            toc={(props.toc || []).filter(item => item.depth >= 2 && item.depth <= 4)
              .map(item => ({ ...item, value: removeLinks(item.value) }))} />}
          {props.children}
        </>,
      })
    },
    ...components,
  }
}
