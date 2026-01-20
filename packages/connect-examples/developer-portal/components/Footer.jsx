'use client'

import { useMemo } from 'react'

export function Footer() {
  const versionInfo = useMemo(() => {
    const sdkVersion = process.env.NEXT_PUBLIC_SDK_VERSION || 'dev'
    const commitShort = process.env.NEXT_PUBLIC_COMMIT_SHORT || 'local'
    const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME

    let formattedDate = ''
    if (buildTime) {
      try {
        const date = new Date(buildTime)
        formattedDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      } catch {
        formattedDate = ''
      }
    }

    return { sdkVersion, commitShort, formattedDate }
  }, [])

  const currentYear = new Date().getFullYear()

  return (
    <footer className="nextra-footer pb-6 pt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span>Since 2019 - {currentYear}</span>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          <span>OneKey Limited All Rights Reserved</span>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <a
            href="https://github.com/OneKeyHQ/hardware-js-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#00B812] transition-colors"
          >
            GitHub
          </a>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <span key="version">SDK v{versionInfo.sdkVersion}</span>
          {versionInfo.commitShort && versionInfo.commitShort !== 'local' && (
            <span key="commit" className="flex items-center gap-1.5">
              <span className="text-zinc-300 dark:text-zinc-600">·</span>
              <a
                href={`https://github.com/OneKeyHQ/hardware-js-sdk/commit/${process.env.NEXT_PUBLIC_COMMIT_ID || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-[#00B812] transition-colors"
              >
                {versionInfo.commitShort}
              </a>
            </span>
          )}
          {versionInfo.formattedDate && (
            <span key="date" className="flex items-center gap-1.5">
              <span className="text-zinc-300 dark:text-zinc-600">·</span>
              <span>{versionInfo.formattedDate}</span>
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}

export default Footer
