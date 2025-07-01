import type { WebContents } from 'electron';

export * from './types';

export async function initNobleBleSupport(webContents: WebContents) {
  const { setupNobleBleHandlers } = await import('./noble-ble-handler');
  setupNobleBleHandlers(webContents);
}
