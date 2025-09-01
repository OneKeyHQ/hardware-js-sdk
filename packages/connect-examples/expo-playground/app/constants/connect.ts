import { getConnectSrc } from '@onekey-internal/shared-constants';

/**
 * OneKey Hardware SDK Connect Source Configuration
 *
 * Environment-based configuration for SDK connection source:
 * - Development: Uses CONNECT_SRC environment variable (typically https://localhost:8087)
 * - Production: Falls back to official CDN with current package version
 *
 * Usage in package.json scripts:
 * - "dev": "CONNECT_SRC=https://localhost:8087 webpack serve --mode=development"
 * - "start": "webpack serve --mode=development" (uses CDN)
 */
export const CONNECT_SRC = getConnectSrc();
