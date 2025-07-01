import type { WebContents } from 'electron';

export * from './types';

// Export Desktop API types for other packages to reuse
export type { DesktopAPI, NobleBleAPI } from './types/desktop-api';

export async function initNobleBleSupport(webContents: WebContents) {
  const { setupNobleBleHandlers } = await import('./noble-ble-handler');
  setupNobleBleHandlers(webContents);
}
