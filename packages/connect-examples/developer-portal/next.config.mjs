import nextra from 'nextra'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Get version info for local development (CI will override via env vars)
const getVersionInfo = () => {
  try {
    // Try to get SDK version from core package
    const corePkgPath = resolve(__dirname, '../core/package.json')
    const corePkg = JSON.parse(readFileSync(corePkgPath, 'utf-8'))
    const sdkVersion = corePkg.version || 'dev'

    // Try to get git info
    let commitId = ''
    let commitShort = ''
    try {
      commitId = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
      commitShort = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    } catch {
      commitShort = 'local'
    }

    return { sdkVersion, commitId, commitShort }
  } catch {
    return { sdkVersion: 'dev', commitId: '', commitShort: 'local' }
  }
}

const versionInfo = getVersionInfo()

const normalizeBasePath = (value) => value.replace(/^\/|\/$/g, '')

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim()
const normalizedBasePath = rawBasePath
  ? `/${normalizeBasePath(rawBasePath)}`
  : ''

const rawAssetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX?.trim()
const normalizedAssetPrefix =
  rawAssetPrefix ??
  (normalizedBasePath ? normalizedBasePath : '')

const withNextra = nextra({
  contentDirBasePath: '/',
  unstable_shouldAddLocaleToLinks: true,
  // Syntax highlighting configuration
  mdxOptions: {
    rehypePrettyCodeOptions: {
      theme: {
        dark: 'github-dark',
        light: 'github-light-high-contrast'
      }
    }
  }
})

export default withNextra({
  basePath: normalizedBasePath || undefined,
  assetPrefix: normalizedAssetPrefix || undefined,
  trailingSlash: true,
  output: 'export',
  images: {
    unoptimized: true
  },
  // Required by Nextra for page-map generation
  // Note: This is Nextra-specific, not standard App Router i18n
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en'
  },
  // Version info - CI env vars take precedence over local git info
  env: {
    NEXT_PUBLIC_SDK_VERSION: process.env.NEXT_PUBLIC_SDK_VERSION || versionInfo.sdkVersion,
    NEXT_PUBLIC_COMMIT_ID: process.env.NEXT_PUBLIC_COMMIT_ID || versionInfo.commitId,
    NEXT_PUBLIC_COMMIT_SHORT: process.env.NEXT_PUBLIC_COMMIT_SHORT || versionInfo.commitShort,
    NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
  }
})
