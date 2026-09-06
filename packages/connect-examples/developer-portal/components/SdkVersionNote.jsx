import { iframeConnectSrc, SDK_PACKAGE_VERSION } from '../lib/sdkRelease.js'

export function SdkVersionNote({ locale = 'en' }) {
  const isZh = locale === 'zh'
  const src = iframeConnectSrc()

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      {isZh ? (
        <>
          当前文档构建跟踪的 SDK 包版本是 <code>{SDK_PACKAGE_VERSION}</code>
          。插件 iframe 默认地址是 <code>{src}</code>
          。请省略 <code>connectSrc</code>，让 SDK 按安装版本拼接；只有自建 iframe 时才覆盖，且必须与{' '}
          <code>@onekeyfe/hd-web-sdk</code> 版本一致。
        </>
      ) : (
        <>
          This docs build tracks Hardware SDK <code>{SDK_PACKAGE_VERSION}</code>
          . The default iframe host is <code>{src}</code>
          . Omit <code>connectSrc</code> so the SDK fills it from the installed package. Override
          only when you host the iframe yourself, and keep it equal to the installed{' '}
          <code>@onekeyfe/hd-web-sdk</code> version.
        </>
      )}
    </p>
  )
}

export default SdkVersionNote
