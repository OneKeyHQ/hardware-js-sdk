import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { assertFirmwareArtifactReference } from './FirmwareArtifactSource';
import {
  FIRMWARE_UPDATE_PLAN_ROLES,
  FIRMWARE_UPDATE_PLAN_TARGETS,
  assertFirmwareUpdatePlan,
  digestFirmwareUpdateContract,
} from './FirmwareUpdatePlan';

import type {
  FirmwareUpdatePreparedArtifact,
  FirmwareUpdatePreparedArtifactInput,
  FirmwareUpdatePreparedEntry,
  FirmwareUpdatePreparedPlan,
} from '../../types/api/firmwareUpdatePreparedPlan';
import type { FirmwareArtifactReference } from '../../types/api/firmwareUpdate';
import type { FirmwareUpdatePlan } from '../../types/api/firmwareUpdatePlan';

const preparedPlanError = (message: string): never => {
  throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, message, {
    firmwareUpdateCode: 'FirmwarePreparedPlanInvalid',
  });
};

const digestPreparedPlan = (plan: Omit<FirmwareUpdatePreparedPlan, 'preparedPlanDigest'>): string =>
  digestFirmwareUpdateContract(plan);

const assertOpaqueLeaseRef = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 160 ||
    value.includes('/') ||
    value.includes('\\')
  ) {
    return preparedPlanError('Firmware prepared plan leaseRef must be opaque');
  }
  return value;
};

export const getFirmwareUpdateResourceName = (value: unknown): string => {
  const normalized = typeof value === 'string' ? value.normalize('NFC') : undefined;
  const parts = normalized?.split('/');
  const resourceName = parts?.at(-1);
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 512 ||
    value !== normalized ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes(':') ||
    [...value].some(char => {
      const code = char.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    }) ||
    !parts?.every(
      part =>
        part.length > 0 &&
        part !== '.' &&
        part !== '..' &&
        !part.endsWith('.') &&
        !part.endsWith(' ')
    ) ||
    !resourceName ||
    resourceName.length > 128
  ) {
    return preparedPlanError('Firmware prepared plan entry name is invalid');
  }
  return resourceName;
};

const assertPreparedEntry = (value: unknown): FirmwareUpdatePreparedEntry => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return preparedPlanError('Firmware prepared plan entry must be an object');
  }
  const entry = value as Record<string, unknown>;
  if (
    Object.keys(entry).length !== 2 ||
    !Object.prototype.hasOwnProperty.call(entry, 'entryName') ||
    !Object.prototype.hasOwnProperty.call(entry, 'artifact')
  ) {
    return preparedPlanError('Firmware prepared plan entry fields are invalid');
  }
  getFirmwareUpdateResourceName(entry.entryName);
  assertFirmwareArtifactReference(entry.artifact as FirmwareUpdatePreparedEntry['artifact']);
  return value as FirmwareUpdatePreparedEntry;
};

const assertPreparedArtifacts = ({
  plan,
  artifacts,
}: {
  plan: FirmwareUpdatePlan;
  artifacts: readonly FirmwareUpdatePreparedArtifactInput[];
}): FirmwareUpdatePreparedArtifact[] => {
  if (artifacts.length !== plan.artifacts.length) {
    return preparedPlanError('Firmware prepared plan does not cover every artifact');
  }
  const inputs = new Map<string, FirmwareUpdatePreparedArtifactInput>();
  for (const input of artifacts) {
    if (
      !input ||
      typeof input !== 'object' ||
      typeof input.artifactId !== 'string' ||
      inputs.has(input.artifactId)
    ) {
      return preparedPlanError('Firmware prepared plan contains a duplicate artifact receipt');
    }
    inputs.set(input.artifactId, input);
  }
  return plan.artifacts.map(planArtifact => {
    const input = inputs.get(planArtifact.artifactId);
    if (!input) {
      return preparedPlanError('Firmware prepared plan artifact receipt is missing');
    }
    const artifact = assertFirmwareArtifactReference(input.artifact);
    if (
      (planArtifact.expectedSize !== undefined && artifact.size !== planArtifact.expectedSize) ||
      (planArtifact.expectedSha256 !== undefined &&
        artifact.sha256.toLowerCase() !== planArtifact.expectedSha256.toLowerCase())
    ) {
      return preparedPlanError('Firmware prepared plan receipt does not match the update plan');
    }
    const materializedEntries = input.materializedEntries?.map(value => {
      const entry = assertPreparedEntry(value);
      return {
        entryName: entry.entryName,
        artifact: {
          ...entry.artifact,
          sha256: entry.artifact.sha256.toLowerCase(),
        },
      };
    });
    if (
      (planArtifact.container === 'raw' && materializedEntries?.length) ||
      (planArtifact.container === 'zip' && !materializedEntries?.length)
    ) {
      return preparedPlanError('Firmware prepared plan materialization is incomplete');
    }
    if (
      materializedEntries &&
      new Set(
        materializedEntries.map(entry =>
          getFirmwareUpdateResourceName(entry.entryName).toLowerCase()
        )
      ).size !== materializedEntries.length
    ) {
      return preparedPlanError('Firmware prepared plan contains duplicate entry names');
    }
    return {
      artifactId: planArtifact.artifactId,
      role: planArtifact.role,
      target: planArtifact.target,
      container: planArtifact.container,
      ...(planArtifact.logicalName ? { logicalName: planArtifact.logicalName } : {}),
      ...(planArtifact.targetVersion ? { targetVersion: planArtifact.targetVersion } : {}),
      artifact: {
        ...artifact,
        sha256: artifact.sha256.toLowerCase(),
      },
      ...(materializedEntries?.length ? { materializedEntries } : {}),
    };
  });
};

export const prepareFirmwareUpdatePlan = ({
  plan: value,
  leaseRef,
  artifacts,
}: {
  plan: FirmwareUpdatePlan;
  leaseRef: string;
  artifacts: FirmwareUpdatePreparedArtifactInput[];
}): FirmwareUpdatePreparedPlan => {
  const plan = assertFirmwareUpdatePlan(value);
  const planWithoutDigest: Omit<FirmwareUpdatePreparedPlan, 'preparedPlanDigest'> = {
    schemaVersion: 2,
    planDigest: plan.planDigest,
    networkPolicy: 'forbid',
    executor: plan.executor,
    deviceIdentity: plan.deviceIdentity,
    deviceModel: plan.deviceModel,
    firmwareType: plan.firmwareType,
    platform: plan.platform,
    leaseRef: assertOpaqueLeaseRef(leaseRef),
    artifacts: assertPreparedArtifacts({ plan, artifacts }),
    targetsToUpdate: plan.targetsToUpdate,
  };
  return {
    ...planWithoutDigest,
    preparedPlanDigest: digestPreparedPlan(planWithoutDigest),
  };
};

export const validateFirmwareUpdatePreparedPlan = (value: unknown): FirmwareUpdatePreparedPlan => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return preparedPlanError('Firmware prepared plan must be an object');
  }
  const preparedPlan = value as FirmwareUpdatePreparedPlan;
  const exactKeys = [
    'schemaVersion',
    'preparedPlanDigest',
    'planDigest',
    'networkPolicy',
    'executor',
    'deviceIdentity',
    'deviceModel',
    'firmwareType',
    'platform',
    'leaseRef',
    'artifacts',
    'targetsToUpdate',
  ];
  if (
    Object.keys(value).length !== exactKeys.length ||
    exactKeys.some(key => !Object.prototype.hasOwnProperty.call(value, key)) ||
    preparedPlan.schemaVersion !== 2 ||
    preparedPlan.networkPolicy !== 'forbid' ||
    !/^[a-f0-9]{64}$/u.test(preparedPlan.planDigest) ||
    !/^[a-f0-9]{64}$/u.test(preparedPlan.preparedPlanDigest) ||
    !Array.isArray(preparedPlan.artifacts) ||
    !Array.isArray(preparedPlan.targetsToUpdate) ||
    (preparedPlan.executor !== 'v2' &&
      preparedPlan.executor !== 'v3' &&
      preparedPlan.executor !== 'v4') ||
    (preparedPlan.platform !== 'native' &&
      preparedPlan.platform !== 'desktop' &&
      preparedPlan.platform !== 'ext' &&
      preparedPlan.platform !== 'web' &&
      preparedPlan.platform !== 'web-embed') ||
    (preparedPlan.firmwareType !== 'universal' && preparedPlan.firmwareType !== 'bitcoinonly') ||
    typeof preparedPlan.deviceIdentity !== 'string' ||
    preparedPlan.deviceIdentity.length === 0 ||
    typeof preparedPlan.deviceModel !== 'string' ||
    preparedPlan.deviceModel.length === 0
  ) {
    return preparedPlanError('Firmware prepared plan header is invalid');
  }
  assertOpaqueLeaseRef(preparedPlan.leaseRef);
  const artifactIds = new Set<string>();
  const artifactTargets = new Set<string>();
  for (const artifact of preparedPlan.artifacts) {
    if (!artifact || typeof artifact !== 'object') {
      return preparedPlanError('Firmware prepared plan artifact is invalid');
    }
    const artifactKeys = [
      'artifactId',
      'role',
      'target',
      'container',
      'artifact',
      ...(artifact.logicalName !== undefined ? ['logicalName'] : []),
      ...(artifact.targetVersion !== undefined ? ['targetVersion'] : []),
      ...(artifact.materializedEntries !== undefined ? ['materializedEntries'] : []),
    ];
    if (
      typeof artifact.artifactId !== 'string' ||
      artifact.artifactId.length === 0 ||
      artifactIds.has(artifact.artifactId) ||
      Object.keys(artifact).length !== artifactKeys.length ||
      artifactKeys.some(key => !Object.prototype.hasOwnProperty.call(artifact, key)) ||
      !FIRMWARE_UPDATE_PLAN_ROLES.has(artifact.role) ||
      !FIRMWARE_UPDATE_PLAN_TARGETS.has(artifact.target) ||
      (artifact.container !== 'raw' && artifact.container !== 'zip') ||
      (artifact.logicalName !== undefined &&
        (typeof artifact.logicalName !== 'string' || artifact.logicalName.length === 0)) ||
      (artifact.targetVersion !== undefined &&
        (typeof artifact.targetVersion !== 'string' || artifact.targetVersion.length === 0)) ||
      (artifact.materializedEntries !== undefined &&
        !Array.isArray(artifact.materializedEntries)) ||
      (artifact.container === 'raw' && Boolean(artifact.materializedEntries?.length)) ||
      (artifact.container === 'zip' && !artifact.materializedEntries?.length)
    ) {
      return preparedPlanError('Firmware prepared plan artifact is invalid');
    }
    artifactIds.add(artifact.artifactId);
    artifactTargets.add(artifact.target);
    assertFirmwareArtifactReference(artifact.artifact);
    const materializedEntryNames =
      artifact.materializedEntries?.map(entry => {
        assertPreparedEntry(entry);
        return getFirmwareUpdateResourceName(entry.entryName).toLowerCase();
      }) ?? [];
    if (new Set(materializedEntryNames).size !== materializedEntryNames.length) {
      return preparedPlanError('Firmware prepared plan contains duplicate entry names');
    }
  }
  if (
    preparedPlan.targetsToUpdate.some(target => !FIRMWARE_UPDATE_PLAN_TARGETS.has(target)) ||
    new Set(preparedPlan.targetsToUpdate).size !== preparedPlan.targetsToUpdate.length ||
    preparedPlan.targetsToUpdate.length !== artifactTargets.size ||
    preparedPlan.targetsToUpdate.some(target => !artifactTargets.has(target))
  ) {
    return preparedPlanError('Firmware prepared plan targets are invalid');
  }
  const { preparedPlanDigest, ...withoutDigest } = preparedPlan;
  if (digestPreparedPlan(withoutDigest) !== preparedPlanDigest) {
    return preparedPlanError('Firmware prepared plan digest is invalid');
  }
  return preparedPlan;
};

/**
 * Identity observed on the live device while a degraded recovery plan runs, keyed by
 * the plan's opaque lease. Bootloader recovery starts with no serial and the device
 * reports one only after the firmware phase reboots it, so the later phases of the
 * SAME workflow must be allowed to continue — but only for the device that first
 * answered, never for a second one that appears mid-recovery.
 */
const degradedPlanIdentityPins = new Map<string, string>();
/** Keep the pin map from growing without bound across many workflows. */
const DEGRADED_PLAN_IDENTITY_PIN_LIMIT = 32;

const pinDegradedPlanIdentity = (leaseRef: string, deviceIdentity: string) => {
  if (degradedPlanIdentityPins.size >= DEGRADED_PLAN_IDENTITY_PIN_LIMIT) {
    const oldest = degradedPlanIdentityPins.keys().next();
    if (!oldest.done) {
      degradedPlanIdentityPins.delete(oldest.value);
    }
  }
  degradedPlanIdentityPins.set(leaseRef, deviceIdentity);
};

export const assertFirmwareUpdatePreparedPlanDeviceIdentity = ({
  preparedPlan: value,
  deviceIdentity: reportedIdentity,
  bootloaderMode,
  deviceModel,
}: {
  preparedPlan: unknown;
  deviceIdentity: string | undefined;
  /** Live device mode; a degraded plan may only START while the device is in bootloader. */
  bootloaderMode?: boolean;
  /** Live device model; a degraded plan must target the same model. */
  deviceModel?: string;
}): FirmwareUpdatePreparedPlan => {
  const preparedPlan = validateFirmwareUpdatePreparedPlan(value);
  // 'unavailable' is the reserved degraded sentinel — a device-reported serial equal
  // to it must never satisfy the exact-match branch below.
  const deviceIdentity = reportedIdentity === 'unavailable' ? undefined : reportedIdentity;

  if (preparedPlan.deviceIdentity === 'unavailable') {
    // Identity equality implies a model match in the strict branch; the degraded
    // branch has no identity to compare, so the model check must stand in for it.
    if (deviceModel === undefined || preparedPlan.deviceModel !== deviceModel) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
    }
    const pinnedIdentity = degradedPlanIdentityPins.get(preparedPlan.leaseRef);
    if (!deviceIdentity) {
      // Still identity-less: only legitimate while the device sits in bootloader.
      if (bootloaderMode !== true) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
      }
      return preparedPlan;
    }
    // The recovered device now reports a serial: bind this recovery to it, and hold
    // every later phase to the same one.
    if (!pinnedIdentity) {
      pinDegradedPlanIdentity(preparedPlan.leaseRef, deviceIdentity);
      return preparedPlan;
    }
    if (pinnedIdentity !== deviceIdentity) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
    }
    return preparedPlan;
  }

  if (!deviceIdentity || preparedPlan.deviceIdentity !== deviceIdentity) {
    throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
  }
  return preparedPlan;
};

type FirmwareUpdatePreparedBinding = {
  target: FirmwareUpdatePlan['targetsToUpdate'][number];
  artifact: FirmwareArtifactReference;
  logicalName?: string;
  entryName?: string;
};

const sameArtifactReference = (
  first: FirmwareArtifactReference,
  second: FirmwareArtifactReference
) =>
  first.artifactRef === second.artifactRef &&
  first.size === second.size &&
  first.sha256.toLowerCase() === second.sha256.toLowerCase();

export const assertFirmwareUpdatePreparedPlanBinding = ({
  preparedPlan: value,
  executor,
  platform,
  deviceIdentity,
  scopeTargets,
  bindings,
}: {
  preparedPlan: unknown;
  executor: FirmwareUpdatePreparedPlan['executor'];
  platform?: FirmwareUpdatePreparedPlan['platform'];
  deviceIdentity?: string;
  scopeTargets: FirmwareUpdatePreparedPlan['targetsToUpdate'];
  bindings: FirmwareUpdatePreparedBinding[];
}): FirmwareUpdatePreparedPlan => {
  const preparedPlan = validateFirmwareUpdatePreparedPlan(value);
  if (
    preparedPlan.executor !== executor ||
    (platform !== undefined && preparedPlan.platform !== platform) ||
    (deviceIdentity !== undefined && preparedPlan.deviceIdentity !== deviceIdentity)
  ) {
    return preparedPlanError('Firmware prepared plan executor binding is invalid');
  }
  const scope = new Set(scopeTargets);
  const expectedBindings: FirmwareUpdatePreparedBinding[] = [];
  for (const artifact of preparedPlan.artifacts) {
    if (scope.has(artifact.target)) {
      if (artifact.container === 'zip') {
        for (const entry of artifact.materializedEntries ?? []) {
          expectedBindings.push({
            target: artifact.target,
            ...(artifact.target === 'resource' && artifact.logicalName
              ? { logicalName: artifact.logicalName }
              : {}),
            entryName: entry.entryName,
            artifact: entry.artifact,
          });
        }
      } else {
        expectedBindings.push({
          target: artifact.target,
          ...(artifact.target === 'resource' && artifact.logicalName
            ? { logicalName: artifact.logicalName }
            : {}),
          artifact: artifact.artifact,
        });
      }
    }
  }
  if (
    expectedBindings.length !== bindings.length ||
    expectedBindings.some(expected => {
      const matching = bindings.filter(
        binding =>
          binding.target === expected.target &&
          binding.logicalName === expected.logicalName &&
          binding.entryName === expected.entryName &&
          sameArtifactReference(binding.artifact, expected.artifact)
      );
      return matching.length !== 1;
    })
  ) {
    return preparedPlanError('Firmware prepared plan artifact binding is invalid');
  }
  return preparedPlan;
};
