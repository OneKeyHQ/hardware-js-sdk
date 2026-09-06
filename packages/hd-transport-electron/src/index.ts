import type { WebContents } from 'electron';

export * from './types';

// Export Desktop API types for other packages to reuse
export type {
  DesktopAPI,
  NobleBleAPI,
  NobleBleIpcErrorPayload,
  NobleBleIpcErrorResponse,
  NobleBleWriteOptions,
} from './types/desktop-api';
export { invokeNobleBleIpc, isNobleBleIpcErrorResponse } from './types/desktop-api';

export async function initNobleBleSupport(webContents: WebContents) {
  const { setupNobleBleHandlers } = await import('./noble-ble-handler');
  setupNobleBleHandlers(webContents);
}

/** Terminal process cleanup. A host sharing Noble can defer native stop until all users are idle. */
export async function disposeNobleBleSupport(releaseNoble?: (noble: { stop(): void }) => void) {
  const handler = await import('./noble-ble-handler');
  await handler.disposeNobleBleSupport(releaseNoble);
}
