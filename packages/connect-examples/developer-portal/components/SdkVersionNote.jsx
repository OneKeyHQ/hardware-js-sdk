import { iframeConnectSrc, SDK_PACKAGE_VERSION } from '../helpers/sdkRelease.js'
import { ui } from '../i18n/ui.mjs'

export function SdkVersionNote({ locale = 'en' }) {
  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      {ui(locale, 'This docs build tracks Hardware SDK', '当前文档构建跟踪的 SDK 包版本是')} <code>{SDK_PACKAGE_VERSION}</code>.
      {' '}{ui(locale, 'The default iframe host is', '插件 iframe 默认地址是')} <code>{iframeConnectSrc()}</code>.
      {' '}{ui(locale, 'Omit connectSrc so the SDK uses the installed package version. Override it only for a self-hosted iframe, and match the installed @onekeyfe/hd-web-sdk version.', '请省略 connectSrc，让 SDK 使用安装包版本。只有自建 iframe 时才覆盖，且必须与安装的 @onekeyfe/hd-web-sdk 版本一致。')}
    </p>
  )
}
export default SdkVersionNote
