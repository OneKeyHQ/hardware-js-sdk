import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import type {
  DeviceState,
  DeviceStateIdentity,
  DeviceStatePatch,
  DeviceStateUpdateSource,
} from '../types';

export type DeviceStateUpdateResult = {
  state: DeviceState;
  revision: number;
  source: DeviceStateUpdateSource;
  changedKeys: string[];
};

const getModelDisplayName = (deviceType: DeviceStateIdentity['deviceType']) =>
  deviceType === EDeviceType.Unknown ? 'OneKey' : `OneKey ${deviceType.toUpperCase()}`;

const getDisplayName = (identity: DeviceStateIdentity) =>
  identity.label || identity.bleName || getModelDisplayName(identity.deviceType);

export function createEmptyDeviceState(
  identity: Partial<DeviceStateIdentity> = {}
): DeviceState {
  const normalizedIdentity: DeviceStateIdentity = {
    deviceType: EDeviceType.Unknown,
    firmwareType: EFirmwareType.Universal,
    model: null,
    vendor: null,
    deviceId: null,
    serialNo: '',
    label: null,
    bleName: null,
    displayName: '',
    ...identity,
  };
  normalizedIdentity.displayName = getDisplayName(normalizedIdentity);

  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: Date.now(),
    protocol: 'unknown',
    identity: normalizedIdentity,
    status: {
      mode: 'unknown',
      initialized: null,
      unlocked: null,
      firmwarePresent: null,
      backupRequired: null,
      noBackup: null,
      unfinishedBackup: null,
      recoveryMode: null,
      passphraseProtection: null,
      pinProtection: null,
      attachToPinEnabled: null,
      unlockedAttachPin: null,
    },
    settings: {
      language: null,
      bleEnabled: null,
      sdCardPresent: null,
      sdProtection: null,
      wipeCodeProtection: null,
      passphraseAlwaysOnDevice: null,
      safetyChecks: null,
      autoLockDelayMs: null,
      autoShutdownDelayMs: null,
      displayRotation: null,
      experimentalFeatures: null,
      wallpaperPath: null,
      brightness: null,
      animationEnabled: null,
      tapToWake: null,
      hapticFeedback: null,
      deviceNameDisplayEnabled: null,
      airgapMode: null,
      fidoEnabled: null,
      usbLockEnabled: null,
      randomKeypad: null,
    },
    versions: {
      firmware: null,
      bootloader: null,
      board: null,
      ble: null,
    },
    capabilities: [],
  };
}

const isEqual = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

const applySectionPatch = <T extends object>(
  target: T,
  patch: Partial<T>,
  prefix: string,
  changedKeys: string[]
) => {
  for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T] | undefined][]) {
    if (value === undefined || isEqual(target[key], value)) {
      continue;
    }
    target[key] = value;
    changedKeys.push(`${prefix}.${String(key)}`);
  }
};

export class DeviceStateStore {
  private state: DeviceState | undefined;

  constructor(initial?: DeviceState) {
    this.state = initial ? structuredClone(initial) : undefined;
  }

  getState() {
    return this.state;
  }

  replace(state: DeviceState, source: DeviceStateUpdateSource): DeviceStateUpdateResult {
    const revision = (this.state?.revision ?? 0) + 1;
    this.state = {
      ...structuredClone(state),
      revision,
      updatedAt: Date.now(),
    };
    return {
      state: this.state,
      revision,
      source,
      changedKeys: ['*'],
    };
  }

  update(patch: DeviceStatePatch, source: DeviceStateUpdateSource): DeviceStateUpdateResult {
    const next = structuredClone(this.state ?? createEmptyDeviceState());
    const changedKeys: string[] = [];

    if (patch.protocol !== undefined && patch.protocol !== next.protocol) {
      next.protocol = patch.protocol;
      changedKeys.push('protocol');
    }
    if (patch.identity) applySectionPatch(next.identity, patch.identity, 'identity', changedKeys);
    if (patch.status) applySectionPatch(next.status, patch.status, 'status', changedKeys);
    if (patch.settings) applySectionPatch(next.settings, patch.settings, 'settings', changedKeys);
    if (patch.versions) applySectionPatch(next.versions, patch.versions, 'versions', changedKeys);

    if (patch.capabilities !== undefined && !isEqual(next.capabilities, patch.capabilities)) {
      next.capabilities = structuredClone(patch.capabilities);
      changedKeys.push('capabilities');
    }
    if (patch.verification !== undefined && !isEqual(next.verification, patch.verification)) {
      next.verification = structuredClone(patch.verification);
      changedKeys.push('verification');
    }
    if (patch.raw !== undefined && !isEqual(next.raw, patch.raw)) {
      next.raw = structuredClone(patch.raw);
      changedKeys.push('raw');
    }
    if (patch.session === null) {
      if (next.session !== undefined) {
        delete next.session;
        changedKeys.push('session');
      }
    } else if (patch.session) {
      const session = next.session ?? { sessionId: null };
      applySectionPatch(session, patch.session, 'session', changedKeys);
      next.session = session;
    }

    const displayName = getDisplayName(next.identity);
    if (displayName !== next.identity.displayName) {
      next.identity.displayName = displayName;
      changedKeys.push('identity.displayName');
    }

    if (changedKeys.length > 0) {
      next.revision = (this.state?.revision ?? 0) + 1;
      next.updatedAt = Date.now();
      this.state = next;
    } else if (!this.state) {
      this.state = next;
    }

    return {
      state: this.state,
      revision: this.state.revision,
      source,
      changedKeys,
    };
  }

  clearSession(source: DeviceStateUpdateSource) {
    if (!this.state?.session) return undefined;
    return this.update({ session: null }, source);
  }
}
