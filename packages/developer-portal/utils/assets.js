/**
 * Get the full path for static assets in the public directory.
 * Uses NEXT_PUBLIC_ASSET_PREFIX to support versioned asset paths.
 *
 * @param {string} path - The asset path starting with /
 * @returns {string} The full asset path with prefix
 *
 * @example
 * getAssetPath('/landing-page/icon.svg')
 * // Returns: '/developer/{sha}/landing-page/icon.svg' in production
 * // Returns: '/landing-page/icon.svg' in development
 */
export function getAssetPath(path) {
  const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || ''
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${assetPrefix}${normalizedPath}`
}
