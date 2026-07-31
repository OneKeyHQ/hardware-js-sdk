export class DeviceWalletSessionStore {
  private readonly walletSessions = new Map<string, Map<string, string>>();

  private readonly standardWalletSessions = new Map<
    string,
    { passphraseState: string; sessionId: string }
  >();

  private readonly pendingSessions = new Map<string, string>();

  get(deviceKey: string, passphraseState?: string) {
    if (!deviceKey || !passphraseState) return undefined;
    return this.walletSessions.get(deviceKey)?.get(passphraseState);
  }

  set(deviceKey: string, passphraseState?: string, sessionId?: string) {
    if (!deviceKey || !passphraseState || !sessionId) return;
    let deviceSessions = this.walletSessions.get(deviceKey);
    if (!deviceSessions) {
      deviceSessions = new Map<string, string>();
      this.walletSessions.set(deviceKey, deviceSessions);
    }
    deviceSessions.set(passphraseState, sessionId);
  }

  getStandard(deviceKey: string) {
    if (!deviceKey) return undefined;
    return this.standardWalletSessions.get(deviceKey);
  }

  setStandard(deviceKey: string, passphraseState?: string, sessionId?: string) {
    if (!deviceKey || !passphraseState || !sessionId) return;
    this.set(deviceKey, passphraseState, sessionId);
    this.standardWalletSessions.set(deviceKey, { passphraseState, sessionId });
  }

  setPending(deviceKey: string, sessionId?: string) {
    if (!deviceKey || !sessionId) return;
    this.pendingSessions.set(deviceKey, sessionId);
  }

  getPending(deviceKey: string) {
    if (!deviceKey) return undefined;
    return this.pendingSessions.get(deviceKey);
  }

  delete(deviceKey: string, passphraseState?: string) {
    if (!deviceKey || !passphraseState) return;
    const standardWalletSession = this.standardWalletSessions.get(deviceKey);
    if (standardWalletSession?.passphraseState === passphraseState) {
      this.standardWalletSessions.delete(deviceKey);
    }
    const deviceSessions = this.walletSessions.get(deviceKey);
    if (!deviceSessions) return;
    deviceSessions.delete(passphraseState);
    if (deviceSessions.size === 0) {
      this.walletSessions.delete(deviceKey);
    }
  }

  deleteStandard(deviceKey: string) {
    if (!deviceKey) return;
    const standardWalletSession = this.standardWalletSessions.get(deviceKey);
    this.standardWalletSessions.delete(deviceKey);
    if (standardWalletSession) {
      this.delete(deviceKey, standardWalletSession.passphraseState);
    }
  }

  deletePending(deviceKey: string) {
    if (!deviceKey) return;
    this.pendingSessions.delete(deviceKey);
  }

  deleteDevice(deviceKey: string) {
    if (!deviceKey) return;
    this.walletSessions.delete(deviceKey);
    this.standardWalletSessions.delete(deviceKey);
    this.pendingSessions.delete(deviceKey);
  }

  private migrateTemporaryDeviceKey(from: string, to: string) {
    if (!from || !to || from === to) return;

    const sourceSessions = this.walletSessions.get(from);
    if (sourceSessions) {
      sourceSessions.forEach((sessionId, passphraseState) => {
        if (!this.get(to, passphraseState)) {
          this.set(to, passphraseState, sessionId);
        }
      });
      this.walletSessions.delete(from);
    }

    const standardWalletSession = this.standardWalletSessions.get(from);
    if (
      standardWalletSession &&
      !this.standardWalletSessions.has(to) &&
      this.get(to, standardWalletSession.passphraseState) === standardWalletSession.sessionId
    ) {
      this.standardWalletSessions.set(to, standardWalletSession);
    }
    this.standardWalletSessions.delete(from);

    const pendingSession = this.pendingSessions.get(from);
    if (pendingSession && !this.pendingSessions.has(to)) {
      this.pendingSessions.set(to, pendingSession);
    }
    this.pendingSessions.delete(from);
  }

  reconcileDeviceIdentity({
    temporaryKey,
    previousDeviceId,
    nextDeviceId,
  }: {
    temporaryKey?: string;
    previousDeviceId?: string;
    nextDeviceId?: string;
  }) {
    if (!nextDeviceId) return;

    // A stable identity changing from A to B means the descriptor now refers to a
    // different physical device. Never copy A's wallet sessions into B's cache.
    if (previousDeviceId && previousDeviceId !== nextDeviceId) {
      this.deleteDevice(previousDeviceId);
      return;
    }

    // Migration is allowed only for the first promotion from a transport-local
    // descriptor key to a firmware-provided stable identity.
    if (!previousDeviceId && temporaryKey) {
      this.migrateTemporaryDeviceKey(temporaryKey, nextDeviceId);
    }
  }

  clear() {
    this.walletSessions.clear();
    this.standardWalletSessions.clear();
    this.pendingSessions.clear();
  }
}

export const deviceWalletSessionStore = new DeviceWalletSessionStore();
