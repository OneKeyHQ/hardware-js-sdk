import {
  EDeviceType,
  EFirmwareType,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
} from '@onekeyfe/hd-shared';
import semver from 'semver';

import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';
import { DataManager } from '../data-manager';
import {
  getBleFirmwareReleaseInfo,
  getBootloaderReleaseInfo,
  getFirmwareReleaseInfo,
} from './firmware/releaseHelper';
import {
  buildFirmwareUpdatePlan,
  validateFirmwareUpdatePlanForceTargets,
} from './firmware/FirmwareUpdatePlan';
import { getBridgeReleaseInfo } from '../utils/bridgeUpdate';
import {
  buildProtocolV2ResourceUpdatePlan,
  readProtocolV2ResourceInventory,
} from '../protocols/protocol-v2/resources';
import {
  LoggerNames,
  getDeviceFirmwareVersion,
  getDeviceType,
  getFirmwareType,
  getLogger,
} from '../utils';

import type {
  AllFirmwareRelease,
  CheckAllFirmwareReleaseParams,
  ProtocolV2FirmwareComponentRelease,
  ProtocolV2FirmwareReleaseStatus,
} from '../types/api/checkAllFirmwareRelease';
import type { FirmwareUpdateV4Target } from '../types/api/firmwareUpdate';
import type {
  DeviceFeaturesVerify,
  DeviceStateVersions,
  IFirmwareReleaseInfo,
  IProtocolV2FirmwareComponent,
  IProtocolV2FirmwareComponentTarget,
} from '../types';
import type { FirmwareUpdatePlan } from '../types/api/firmwareUpdatePlan';

const UPDATE_TARGET_BY_COMPONENT_TARGET: Readonly<
  Partial<Record<IProtocolV2FirmwareComponentTarget, FirmwareUpdateV4Target>>
> = {
  BOOTLOADER: 'boot',
  APPLICATION_P1: 'app_v1',
  APPLICATION_P2: 'app_v2',
  COPROCESSOR: 'coprocessor',
  SE01: 'se01',
  SE02: 'se02',
  SE03: 'se03',
  SE04: 'se04',
};

const CURRENT_VERSION_BY_COMPONENT_TARGET: Readonly<
  Record<IProtocolV2FirmwareComponentTarget, keyof DeviceStateVersions | null>
> = {
  ROMLOADER: 'board',
  BOOTLOADER: 'bootloader',
  APPLICATION_P1: 'applicationP1',
  APPLICATION_P2: 'applicationP2',
  COPROCESSOR: 'ble',
  SE01: 'se01',
  SE02: 'se02',
  SE03: 'se03',
  SE04: 'se04',
};

const CURRENT_HASH_BY_COMPONENT_TARGET: Readonly<
  Partial<Record<IProtocolV2FirmwareComponentTarget, keyof DeviceFeaturesVerify>>
> = {
  BOOTLOADER: 'bootloaderHash',
  APPLICATION_P1: 'applicationP1Hash',
  APPLICATION_P2: 'applicationP2Hash',
};

function normalizeHex(value: string | undefined): string | undefined {
  const normalized = value?.replace(/^0x/i, '').toLowerCase();
  return normalized && /^[0-9a-f]+$/.test(normalized) ? normalized : undefined;
}

function toVersionString(version: number[] | undefined): string | null {
  return version?.length ? version.join('.') : null;
}

function getOrderedComponentEntries(release: IFirmwareReleaseInfo) {
  const components = release.components ?? {};
  const orderedKeys = [
    ...(release.installOrder ?? []),
    ...Object.keys(components).filter(key => !release.installOrder?.includes(key)),
  ];
  return orderedKeys
    .map(key => {
      const component = components[key];
      return component ? ([key, component] as const) : undefined;
    })
    .filter((entry): entry is readonly [string, IProtocolV2FirmwareComponent] => !!entry);
}

function buildComponentRelease({
  configKey,
  component,
  currentVersions,
  currentVerification,
  checkFirmwareHash,
  remotePayloadHash,
  releaseRequired,
}: {
  configKey: string;
  component: IProtocolV2FirmwareComponent;
  currentVersions: DeviceStateVersions;
  currentVerification: Partial<DeviceFeaturesVerify>;
  checkFirmwareHash: boolean;
  remotePayloadHash: string | null | undefined;
  releaseRequired: boolean;
}): ProtocolV2FirmwareComponentRelease {
  const componentTarget = component.target.toUpperCase() as IProtocolV2FirmwareComponentTarget;
  const updateTarget = UPDATE_TARGET_BY_COMPONENT_TARGET[componentTarget] ?? null;
  const currentVersionKey = CURRENT_VERSION_BY_COMPONENT_TARGET[componentTarget];
  const currentVersion = currentVersionKey
    ? currentVersions[currentVersionKey] ??
      (componentTarget === 'APPLICATION_P1' ? currentVersions.firmware : null) ??
      null
    : null;
  const targetVersion = toVersionString(component.version);

  let status: ProtocolV2FirmwareComponentRelease['status'] = 'unknown';
  if (!updateTarget) {
    status = 'unsupported';
  } else if (
    currentVersion &&
    targetVersion &&
    semver.valid(currentVersion) &&
    semver.valid(targetVersion)
  ) {
    if (semver.lt(currentVersion, targetVersion)) {
      status = 'outdated';
    } else if (semver.gt(currentVersion, targetVersion)) {
      status = 'valid';
    } else {
      const currentHashKey = CURRENT_HASH_BY_COMPONENT_TARGET[componentTarget];
      if (!checkFirmwareHash || !currentHashKey) {
        status = 'valid';
      } else {
        const currentHash = normalizeHex(currentVerification[currentHashKey]);
        const expectedHash = normalizeHex(remotePayloadHash ?? undefined);
        if (currentHash && expectedHash) {
          status = expectedHash.startsWith(currentHash) ? 'valid' : 'outdated';
        } else {
          status = 'unknown';
        }
      }
    }
  }

  return {
    configKey,
    componentTarget,
    updateTarget,
    currentVersion,
    targetVersion,
    status,
    required: releaseRequired && status === 'outdated',
  };
}

type ProtocolV2FirmwareReleasePlan = {
  firmwareType: EFirmwareType;
  status: ProtocolV2FirmwareReleaseStatus;
  hasUpgrade: boolean;
  required: boolean;
  currentVersions: DeviceStateVersions;
  components: ProtocolV2FirmwareComponentRelease[];
  targetsToUpdate: FirmwareUpdateV4Target[];
  release: IFirmwareReleaseInfo | undefined;
};

export function buildProtocolV2FirmwareRelease({
  currentVersions,
  currentVerification = {},
  checkFirmwareHash = false,
  remotePayloadHashes = {},
  firmwareType,
  release,
}: {
  currentVersions: DeviceStateVersions;
  currentVerification?: Partial<DeviceFeaturesVerify>;
  checkFirmwareHash?: boolean;
  remotePayloadHashes?: Readonly<Record<string, string | null>>;
  firmwareType: EFirmwareType;
  release: IFirmwareReleaseInfo | undefined;
}): ProtocolV2FirmwareReleasePlan {
  if (!release) {
    return {
      firmwareType,
      status: 'unavailable' as const,
      hasUpgrade: false,
      required: false,
      currentVersions,
      components: [],
      targetsToUpdate: [],
      release: undefined,
    };
  }

  let components = getOrderedComponentEntries(release).map(([configKey, component]) =>
    buildComponentRelease({
      configKey,
      component,
      currentVersions,
      currentVerification,
      checkFirmwareHash,
      remotePayloadHash: Object.prototype.hasOwnProperty.call(remotePayloadHashes, configKey)
        ? remotePayloadHashes[configKey]
        : normalizeHex(component.payloadHash),
      releaseRequired: release.required,
    })
  );
  if (!currentVersions.applicationP2) {
    const applicationP1 = components.find(
      component => component.componentTarget === 'APPLICATION_P1'
    );
    if (applicationP1) {
      components = components.map(component =>
        component.componentTarget === 'APPLICATION_P2' && component.status === 'unknown'
          ? {
              ...component,
              currentVersion: currentVersions.applicationP1 ?? currentVersions.firmware,
              status: applicationP1.status,
              required: applicationP1.required,
            }
          : component
      );
    }
  }
  const targetsToUpdate = components.flatMap(component =>
    component.status === 'outdated' && component.updateTarget ? [component.updateTarget] : []
  );
  const uniqueTargetsToUpdate = Array.from(new Set(targetsToUpdate));
  const hasUpgrade = uniqueTargetsToUpdate.length > 0;
  const required = release.required && hasUpgrade;
  let status: ProtocolV2FirmwareReleaseStatus = 'valid';
  if (required) {
    status = 'required';
  } else if (hasUpgrade) {
    status = 'outdated';
  } else if (components.some(component => component.status === 'unknown')) {
    status = 'unknown';
  }

  return {
    firmwareType,
    status,
    hasUpgrade,
    required,
    currentVersions,
    components,
    targetsToUpdate: uniqueTargetsToUpdate,
    release,
  };
}

const Log = getLogger(LoggerNames.Method);

export default class CheckAllFirmwareRelease extends BaseMethod {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    if (this.device.isProtocolV2()) {
      return this.runProtocolV2();
    }

    const { features } = this.device;
    const {
      checkBridgeRelease,
      firmwareType: firmwareTypeParams,
      platform,
      forceUpdateTargets,
    } = this.payload as CheckAllFirmwareReleaseParams;
    const validatedForceUpdateTargets = validateFirmwareUpdatePlanForceTargets(forceUpdateTargets);

    if (!features) {
      return Promise.resolve(null);
    }

    const deviceFirmwareType = getFirmwareType(features);
    const firmwareType = firmwareTypeParams ?? deviceFirmwareType;
    const firmwareRelease = getFirmwareReleaseInfo(features, firmwareType);

    const currentFirmwareVersion = getDeviceFirmwareVersion(features).join('.');
    const willUpdateFirmwareVersion = firmwareRelease.release?.version?.join('.');
    const deviceType = getDeviceType(features);

    let bridgeReleaseInfo = null;
    if (
      checkBridgeRelease &&
      (firmwareRelease.status === 'required' || firmwareRelease.status === 'outdated')
    ) {
      bridgeReleaseInfo = await getBridgeReleaseInfo({
        deviceType,
        currentFirmwareVersion,
        willUpdateFirmwareVersion,
      });
    }
    const bootloaderRelease = getBootloaderReleaseInfo({
      features,
      willUpdateFirmwareVersion,
      firmwareType,
    });
    const bleFirmwareReleaseInfo = getBleFirmwareReleaseInfo(features);
    let firmwareUpdatePlan: FirmwareUpdatePlan | undefined;
    try {
      firmwareUpdatePlan = buildFirmwareUpdatePlan({
        features,
        firmwareType,
        platform: platform ?? 'web',
        firmware: firmwareRelease,
        ble: bleFirmwareReleaseInfo,
        bootloader: bootloaderRelease,
        forceUpdateTargets: validatedForceUpdateTargets,
      });
    } catch (error) {
      if (
        validatedForceUpdateTargets.length > 0 ||
        !(error instanceof HardwareError) ||
        error.params?.firmwareUpdateCode !== 'FirmwarePlanInvalid'
      ) {
        throw error;
      }
      // A Plan is an optional external-host capability. Release checks remain
      // available for legacy and recovery flows when a Plan cannot be built.
      Log.warn(
        '[CheckAllFirmwareRelease] Optional firmware Plan is unavailable; using the legacy release result'
      );
      firmwareUpdatePlan = undefined;
    }

    return {
      firmware: firmwareRelease,
      bootloader: bootloaderRelease,
      ble: bleFirmwareReleaseInfo,
      bridge: bridgeReleaseInfo
        ? {
            shouldUpdate: bridgeReleaseInfo.shouldUpdate,
            status: bridgeReleaseInfo.shouldUpdate ? 'outdated' : 'valid',
            changelog: bridgeReleaseInfo.changelog,
            release: bridgeReleaseInfo.releaseVersion,
          }
        : undefined,
      features,
      firmwareUpdatePlan,
    } as unknown as AllFirmwareRelease;
  }

  private async runProtocolV2(): Promise<AllFirmwareRelease> {
    const { checkFirmwareHash = false, firmwareType: firmwareTypeParam } = this
      .payload as CheckAllFirmwareReleaseParams;
    const state = await this.device.getDeviceState({
      refreshSections: checkFirmwareHash
        ? ['identity', 'versions', 'verification']
        : ['identity', 'versions'],
    });
    if (state.identity.deviceType !== 'pro2' && state.identity.deviceType !== 'neo') {
      throw ERRORS.TypedError(
        HardwareErrorCode.DeviceNotSupportMethod,
        'checkAllFirmwareRelease requires a Pro2 or Neo device for Protocol V2'
      );
    }

    const { features } = this.device;
    if (!features) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'checkAllFirmwareRelease requires initialized device features'
      );
    }

    const firmwareType =
      firmwareTypeParam ?? state.identity.firmwareType ?? EFirmwareType.Universal;
    const release = DataManager.getFirmwareLatestRelease(features, firmwareType);
    const plan = buildProtocolV2FirmwareRelease({
      currentVersions: state.versions,
      currentVerification: checkFirmwareHash ? state.verification : undefined,
      checkFirmwareHash,
      firmwareType,
      release,
    });
    const resourceDeviceType =
      state.identity.deviceType === 'neo' ? EDeviceType.Neo : EDeviceType.Pro2;
    const resources = DataManager.getProtocolV2Resources(resourceDeviceType);
    let resourceStatus: 'valid' | 'outdated' | 'unknown' = 'unknown';
    if (resources?.length) {
      const loaderMode = state.status.mode === 'bootloader' || state.status.mode === 'romloader';
      // Application mode rejects host access to vol0:/bundles. Resource inventory is
      // resolved after FirmwareUpdateV4 enters a loader instead of probing here.
      if (loaderMode) {
        try {
          const inventory = await readProtocolV2ResourceInventory({
            commands: this.device.getCommands(),
            resources,
          });
          resourceStatus = buildProtocolV2ResourceUpdatePlan({
            resources,
            inventory,
            mode: 'bootloader-recovery',
          }).status;
        } catch {
          resourceStatus = buildProtocolV2ResourceUpdatePlan({
            resources,
            mode: 'bootloader-recovery',
          }).status;
        }
      }
    }
    const targetsToUpdate = [
      ...plan.targetsToUpdate,
      ...(resourceStatus === 'outdated' ? (['resource'] as const) : []),
    ];
    const firmwareStatus = plan.status === 'unavailable' ? 'unknown' : plan.status;
    const emptyRelease = 'none' as const;

    return {
      firmware: {
        status: firmwareStatus,
        changelog: release ? [release.changelog] : [],
        release: release ?? emptyRelease,
        bootloaderMode: state.status.mode === 'bootloader' || state.status.mode === 'romloader',
      },
      ble: {
        status: 'valid',
        release: emptyRelease,
      },
      bootloader: {
        status: 'valid',
        release: emptyRelease,
      },
      features,
      protocol: 'V2',
      deviceType: state.identity.deviceType,
      ...plan,
      resourceStatus,
      hasUpgrade: plan.hasUpgrade || resourceStatus === 'outdated',
      targetsToUpdate,
    };
  }
}
