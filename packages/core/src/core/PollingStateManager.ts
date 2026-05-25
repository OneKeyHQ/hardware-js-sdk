/**
 * Manages polling state for device connection attempts.
 *
 * Polling is isolated by connectId (device), so:
 * - New request for device A only stops device A's previous polling
 * - Device B's polling is unaffected
 */
export class PollingStateManager {
  // connectId -> current polling ID
  private activePolls = new Map<string, number>();

  /**
   * Start a new polling session for a device.
   * Automatically stops the previous polling for the same device.
   * @param connectId - Device identifier (use empty string for USB without connectId)
   * @returns The new polling ID
   */
  start(connectId: string): number {
    const currentId = (this.activePolls.get(connectId) ?? 0) + 1;
    this.activePolls.set(connectId, currentId);
    return currentId;
  }

  /**
   * Check if a polling session is still active.
   * @param connectId - Device identifier
   * @param pollingId - The polling ID to check
   */
  isActive(connectId: string, pollingId: number): boolean {
    return this.activePolls.get(connectId) === pollingId;
  }

  /**
   * Stop polling for a specific device.
   * @param connectId - Device identifier
   */
  stop(connectId: string): void {
    this.activePolls.delete(connectId);
  }

  /**
   * Stop all active polling sessions.
   */
  stopAll(): void {
    this.activePolls.clear();
  }
}
