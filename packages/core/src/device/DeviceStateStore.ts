import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import { cloneDeviceState } from './cloneDeviceState';

import type {
  DeviceFeaturesRaw,
  DeviceState,
  DeviceStateIdentity,
  DeviceStatePatch,
  DeviceStateSession,
  DeviceStateUpdateSource,
} from '../types';

type StoredDeviceState = DeviceState & {
  raw?: DeviceFeaturesRaw;
  session?: DeviceStateSession;
};

export type DeviceStateUpdateResult = {
  state: StoredDeviceState;
  revision: number;
  source: DeviceStateUpdateSource;
  changedKeys: string[];
};

const PRODUCT_DISPLAY_NAMES: Partial<Record<DeviceStateIdentity['deviceType'], string>> = {
  [EDeviceType.Classic]: 'OneKey Classic',
  [EDeviceType.Classic1s]: 'OneKey Classic 1S',
  [EDeviceType.ClassicPure]: 'OneKey Classic 1S Pure',
  [EDeviceType.Mini]: 'OneKey Mini',
  [EDeviceType.Touch]: 'OneKey Touch',
  [EDeviceType.Pro]: 'OneKey Pro',
  [EDeviceType.Pro2]: 'OneKey Pro 2',
};

const getModelDisplayName = (deviceType: DeviceStateIdentity['deviceType']) =>
  PRODUCT_DISPLAY_NAMES[deviceType] ?? 'OneKey';

const getDisplayName = (identity: DeviceStateIdentity) =>
  identity.label || identity.bleName || getModelDisplayName(identity.deviceType);

export function createEmptyDeviceState(
  identity: Partial<DeviceStateIdentity> = {}
): StoredDeviceState {
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
    protocolVersion: null,
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
    if (value !== undefined && !isEqual(target[key], value)) {
      target[key] = value;
      changedKeys.push(`${prefix}.${String(key)}`);
    }
  }
};

export class DeviceStateStore {
  private state: StoredDeviceState | undefined;

  constructor(initial?: StoredDeviceState) {
    this.state = initial ? cloneDeviceState(initial) : undefined;
  }

  getState() {
    return this.state;
  }

  replace(state: StoredDeviceState, source: DeviceStateUpdateSource): DeviceStateUpdateResult {
    const revision = (this.state?.revision ?? 0) + 1;
    this.state = {
      ...cloneDeviceState(state),
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
    const next = cloneDeviceState(this.state ?? createEmptyDeviceState());
    const changedKeys: string[] = [];

    if (patch.protocol !== undefined && patch.protocol !== next.protocol) {
      next.protocol = patch.protocol;
      changedKeys.push('protocol');
    }
    if (patch.protocolVersion !== undefined && patch.protocolVersion !== next.protocolVersion) {
      next.protocolVersion = patch.protocolVersion;
      changedKeys.push('protocolVersion');
    }
    if (patch.identity) applySectionPatch(next.identity, patch.identity, 'identity', changedKeys);
    if (patch.status) applySectionPatch(next.status, patch.status, 'status', changedKeys);
    if (patch.settings) applySectionPatch(next.settings, patch.settings, 'settings', changedKeys);
    if (patch.versions) applySectionPatch(next.versions, patch.versions, 'versions', changedKeys);

    if (patch.capabilities !== undefined && !isEqual(next.capabilities, patch.capabilities)) {
      next.capabilities = cloneDeviceState(patch.capabilities);
      changedKeys.push('capabilities');
    }
    if (patch.verification !== undefined) {
      const mergedVerification = {
        ...cloneDeviceState(next.verification ?? {}),
        ...cloneDeviceState(patch.verification),
      };
      if (!isEqual(next.verification, mergedVerification)) {
        next.verification = mergedVerification;
        changedKeys.push('verification');
      }
    }
    if (patch.raw !== undefined) {
      const mergedRaw = cloneDeviceState(next.raw ?? {});
      for (const [key, value] of Object.entries(patch.raw)) {
        if (value === null) {
          delete mergedRaw[key as keyof typeof mergedRaw];
        } else if (value !== undefined) {
          mergedRaw[key as keyof typeof mergedRaw] = cloneDeviceState(value) as never;
        }
      }
      if (!isEqual(next.raw, mergedRaw)) {
        next.raw = mergedRaw;
        changedKeys.push('raw');
      }
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

export const createPublicDeviceState = (state: StoredDeviceState): DeviceState => {
  const snapshot = cloneDeviceState(state);
  delete snapshot.raw;
  delete snapshot.session;
  return snapshot;
};
