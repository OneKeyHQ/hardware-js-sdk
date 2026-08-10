import { EFirmwareType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DataManager } from '../../data-manager';

import type { EDeviceType } from '@onekeyfe/hd-shared';
import type { Device } from '../../device/Device';
import type {
  DeviceState,
  Features,
  IFirmwareReleaseInfo,
  IProtocolV2FirmwareComponentTarget,
} from '../../types';
import type {
  FirmwareReleaseCheckResult,
  ProtocolV2ComponentReleaseInfo,
  ProtocolV2FirmwareReleaseStatus,
} from '../../types/api/checkAllFirmwareRelease';
import type { ProtocolV2FirmwareReleasePlan } from '../CheckAllFirmwareRelease';

export const PROTOCOL_V2_MAIN_FIRMWARE_TARGETS: readonly IProtocolV2FirmwareComponentTarget[] = [
  'APPLICATION_P1',
  'APPLICATION_P2',
  'SE01',
  'SE02',
  'SE03',
  'SE04',
];

export const PROTOCOL_V2_BLE_TARGETS: readonly IProtocolV2FirmwareComponentTarget[] = [
  'COPROCESSOR',
];

export const PROTOCOL_V2_BOOTLOADER_TARGETS: readonly IProtocolV2FirmwareComponentTarget[] = [
  'BOOTLOADER',
];

export type ProtocolV2FirmwareReleaseContext = {
  state: Omit<DeviceState, 'identity'> & {
    identity: Omit<DeviceState['identity'], 'deviceType'> & {
      deviceType: EDeviceType.Pro2 | EDeviceType.Neo;
    };
  };
  features: Features;
  firmwareType: EFirmwareType;
  release: IFirmwareReleaseInfo | undefined;
};

export async function loadProtocolV2FirmwareReleaseContext({
  device,
  firmwareType: firmwareTypeParam,
  checkFirmwareHash = false,
  methodName,
}: {
  device: Device;
  firmwareType?: EFirmwareType;
  checkFirmwareHash?: boolean;
  methodName: string;
}): Promise<ProtocolV2FirmwareReleaseContext> {
  const state = await device.getDeviceState({
    refreshSections: checkFirmwareHash
      ? ['identity', 'versions', 'verification']
      : ['identity', 'versions'],
    allowLegacyProtocolV2ProtocolInfo: true,
  });
  if (state.identity.deviceType !== 'pro2' && state.identity.deviceType !== 'neo') {
    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceNotSupportMethod,
      `${methodName} requires a Pro2 or Neo device for Protocol V2`
    );
  }

  const { features } = device;
  if (!features) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `${methodName} requires initialized device features`
    );
  }

  const firmwareType = firmwareTypeParam ?? state.identity.firmwareType ?? EFirmwareType.Universal;
  return {
    state: state as ProtocolV2FirmwareReleaseContext['state'],
    features,
    firmwareType,
    release: DataManager.getFirmwareLatestRelease(features, firmwareType),
  };
}

export function summarizeProtocolV2FirmwareRelease(
  plan: ProtocolV2FirmwareReleasePlan,
  componentTargets: readonly IProtocolV2FirmwareComponentTarget[]
): ProtocolV2FirmwareReleasePlan {
  const targetSet = new Set<IProtocolV2FirmwareComponentTarget>(componentTargets);
  const components = plan.components.filter(component => targetSet.has(component.componentTarget));
  const targetsToUpdate = Array.from(
    new Set(
      components.flatMap(component =>
        component.status === 'outdated' && component.updateTarget ? [component.updateTarget] : []
      )
    )
  );
  const hasUpgrade = targetsToUpdate.length > 0;
  const required = !!plan.release?.required && hasUpgrade;
  let status: ProtocolV2FirmwareReleaseStatus = 'valid';
  if (!plan.release || components.length === 0) {
    status = 'unavailable';
  } else if (required) {
    status = 'required';
  } else if (hasUpgrade) {
    status = 'outdated';
  } else if (components.some(component => component.status === 'unknown')) {
    status = 'unknown';
  } else if (components.every(component => component.status === 'unsupported')) {
    status = 'unavailable';
  }

  return {
    ...plan,
    status,
    hasUpgrade,
    required,
    components,
    targetsToUpdate,
  };
}

export function toProtocolV2FirmwareReleaseInfo({
  plan,
  state,
  release,
}: {
  plan: ProtocolV2FirmwareReleasePlan;
  state: DeviceState;
  release: FirmwareReleaseCheckResult['release'];
}): FirmwareReleaseCheckResult {
  return {
    shouldUpdate: plan.hasUpgrade,
    status: plan.status === 'unavailable' ? 'unknown' : plan.status,
    // Protocol V2 components share package-set release notes. The optional
    // bootloaderChangelog field belongs to the legacy Protocol V1 release model.
    changelog: plan.release ? [plan.release.changelog] : [],
    release,
    bootloaderMode: state.status.mode === 'bootloader' || state.status.mode === 'romloader',
  };
}

export function getProtocolV2ComponentReleaseInfo(
  plan: ProtocolV2FirmwareReleasePlan,
  componentTarget: IProtocolV2FirmwareComponentTarget
): ProtocolV2ComponentReleaseInfo | undefined {
  const componentRelease = plan.components.find(
    component => component.componentTarget === componentTarget
  );
  if (!componentRelease || !plan.release) {
    return undefined;
  }
  const component = plan.release.components?.[componentRelease.configKey];
  if (!component) {
    return undefined;
  }
  return {
    ...component,
    protocol: 'V2',
    configKey: componentRelease.configKey,
    componentTarget,
    required: plan.release.required,
    changelog: plan.release.changelog,
  };
}
