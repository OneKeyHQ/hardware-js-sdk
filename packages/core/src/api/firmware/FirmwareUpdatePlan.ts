import { bytesToHex } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { EDeviceType, EFirmwareType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import semver from 'semver';

import { getDeviceType, getDeviceUUID } from '../../utils/deviceInfoUtils';
import { resolveDeviceBootloaderMode } from '../../utils/deviceFeaturesCompat';
import {
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
} from '../../utils/deviceVersionUtils';

import type { FirmwareUpdateV4Target } from '../../types/api/firmwareUpdate';
import type {
  FirmwareUpdatePlan,
  FirmwareUpdatePlanArtifact,
  FirmwareUpdatePlanForceTarget,
  FirmwareUpdatePlanTarget,
} from '../../types/api/firmwareUpdatePlan';
import type { Features } from '../../types';

type FirmwareUpdatePlatform = 'native' | 'desktop' | 'ext' | 'web' | 'web-embed';

type ReleaseRecord = {
  url?: unknown;
  webUpdate?: unknown;
  resource?: unknown;
  fullResource?: unknown;
  fullResourceRange?: unknown;
  bootloaderResource?: unknown;
  version?: unknown;
  components?: unknown;
  installOrder?: unknown;
  resourceBundles?: unknown;
  fingerprint?: unknown;
  fingerprintWeb?: unknown;
  expectedSize?: unknown;
  resourceFingerprint?: unknown;
  resourceExpectedSize?: unknown;
  fullResourceFingerprint?: unknown;
  fullResourceExpectedSize?: unknown;
  bootloaderFingerprint?: unknown;
  bootloaderExpectedSize?: unknown;
  bootloaderVersion?: unknown;
};

type ReleaseSelection = {
  shouldUpdate?: boolean;
  status?: unknown;
  release?: unknown;
};

const PROTOCOL_V2_TARGETS: Readonly<
  Record<string, Exclude<FirmwareUpdatePlanTarget, 'firmware' | 'ble' | 'bootloader' | 'resource'>>
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

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asRelease = (release: ReleaseSelection | undefined): ReleaseRecord | undefined =>
  asRecord(release?.release) as ReleaseRecord | undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const asVersion = (value: unknown): string | undefined => {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some(part => typeof part !== 'number' || !Number.isSafeInteger(part) || part < 0)
  ) {
    return undefined;
  }
  return value.join('.');
};

const asIntegrity = ({
  size,
  sha256: value,
}: {
  size: unknown;
  sha256: unknown;
}): Pick<FirmwareUpdatePlanArtifact, 'expectedSize' | 'expectedSha256'> => {
  const sha256Value =
    typeof value === 'string' && /^[a-f0-9]{64}$/iu.test(value) ? value.toLowerCase() : undefined;
  return {
    ...(Number.isSafeInteger(size) && (size as number) > 0 ? { expectedSize: size as number } : {}),
    ...(sha256Value ? { expectedSha256: sha256Value } : {}),
  };
};

const isUpgrade = (release: ReleaseSelection | undefined): boolean =>
  release?.status === 'required' ||
  release?.status === 'outdated' ||
  release?.shouldUpdate === true;

const assertArtifactUrl = (value: unknown, label: string): string => {
  const raw = asString(value);
  if (!raw) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `${label} has no downloadable artifact`,
      { firmwareUpdateCode: 'FirmwarePlanInvalid' }
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, `${label} URL is invalid`, {
      firmwareUpdateCode: 'FirmwarePlanInvalid',
    });
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.port !== '' ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, `${label} URL is not canonical HTTPS`, {
      firmwareUpdateCode: 'FirmwarePlanInvalid',
    });
  }
  return raw;
};

const canonicalizeFirmwareUpdateContract = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeFirmwareUpdateContract);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const item = (value as Record<string, unknown>)[key];
        if (item !== undefined) {
          result[key] = canonicalizeFirmwareUpdateContract(item);
        }
        return result;
      }, {});
  }
  return value;
};

export const digestFirmwareUpdateContract = (value: unknown): string =>
  bytesToHex(
    sha256(new TextEncoder().encode(JSON.stringify(canonicalizeFirmwareUpdateContract(value))))
  );

const digestFirmwareUpdatePlan = (plan: Omit<FirmwareUpdatePlan, 'planDigest'>): string =>
  digestFirmwareUpdateContract(plan);

const planError = (message: string): never => {
  throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, message, {
    firmwareUpdateCode: 'FirmwarePlanInvalid',
  });
};

const FIRMWARE_UPDATE_PLAN_FORCE_TARGETS = new Set<FirmwareUpdatePlanForceTarget>([
  'firmware',
  'ble',
  'bootloader',
  'resource',
]);

export const validateFirmwareUpdatePlanForceTargets = (
  value: unknown
): FirmwareUpdatePlanForceTarget[] => {
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    value.length > FIRMWARE_UPDATE_PLAN_FORCE_TARGETS.size ||
    value.some(target => !FIRMWARE_UPDATE_PLAN_FORCE_TARGETS.has(target)) ||
    new Set(value).size !== value.length
  ) {
    return planError('Firmware update force targets are invalid');
  }
  return [...value] as FirmwareUpdatePlanForceTarget[];
};

const assertExactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = []
) => {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some(key => !Object.prototype.hasOwnProperty.call(value, key)) ||
    Object.keys(value).some(key => !allowed.has(key))
  ) {
    planError('Firmware update plan contains an invalid field set');
  }
};

const assertBoundedString = (value: unknown, label: string, maxLength = 256): string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    return planError(`Firmware update plan ${label} is invalid`);
  }
  return value;
};

export const FIRMWARE_UPDATE_PLAN_TARGETS = new Set<FirmwareUpdatePlanTarget>([
  'firmware',
  'ble',
  'bootloader',
  'resource',
  'boot',
  'app_v1',
  'app_v2',
  'coprocessor',
  'se01',
  'se02',
  'se03',
  'se04',
]);

export const FIRMWARE_UPDATE_PLAN_ROLES = new Set([
  'firmware',
  'ble',
  'bootloader',
  'resource',
  'component',
  'resourceBundle',
]);

const PLAN_CONTAINERS = new Set(['raw', 'zip']);

const PLAN_PLATFORMS = new Set<FirmwareUpdatePlatform>([
  'native',
  'desktop',
  'ext',
  'web',
  'web-embed',
]);

export const assertFirmwareUpdatePlan = (value: unknown): FirmwareUpdatePlan => {
  const plan = asRecord(value);
  if (!plan) {
    return planError('Firmware update plan must be an object');
  }
  assertExactKeys(plan, [
    'schemaVersion',
    'planDigest',
    'executor',
    'deviceIdentity',
    'deviceModel',
    'firmwareType',
    'platform',
    'artifacts',
    'targetsToUpdate',
  ]);
  if (
    plan.schemaVersion !== 2 ||
    typeof plan.planDigest !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(plan.planDigest) ||
    (plan.executor !== 'v2' && plan.executor !== 'v3' && plan.executor !== 'v4') ||
    !PLAN_PLATFORMS.has(plan.platform as FirmwareUpdatePlatform) ||
    (plan.firmwareType !== EFirmwareType.Universal &&
      plan.firmwareType !== EFirmwareType.BitcoinOnly)
  ) {
    return planError('Firmware update plan header is invalid');
  }
  assertBoundedString(plan.deviceIdentity, 'device identity');
  assertBoundedString(plan.deviceModel, 'device model', 64);
  if (!Array.isArray(plan.artifacts) || plan.artifacts.length > 128) {
    return planError('Firmware update plan artifact set is invalid');
  }
  const artifactIds = new Set<string>();
  const artifactTargets = new Set<FirmwareUpdatePlanTarget>();
  for (const item of plan.artifacts) {
    const artifact = asRecord(item);
    if (!artifact) {
      return planError('Firmware update plan artifact is invalid');
    }
    assertExactKeys(
      artifact,
      ['artifactId', 'role', 'target', 'url', 'container'],
      ['logicalName', 'expectedSize', 'expectedSha256', 'targetVersion']
    );
    const artifactId = assertBoundedString(artifact.artifactId, 'artifact id', 160);
    if (artifactIds.has(artifactId)) {
      return planError('Firmware update plan contains duplicate artifact ids');
    }
    artifactIds.add(artifactId);
    if (
      !FIRMWARE_UPDATE_PLAN_ROLES.has(artifact.role as string) ||
      !FIRMWARE_UPDATE_PLAN_TARGETS.has(artifact.target as FirmwareUpdatePlanTarget) ||
      !PLAN_CONTAINERS.has(artifact.container as string)
    ) {
      return planError('Firmware update plan artifact contract is invalid');
    }
    artifactTargets.add(artifact.target as FirmwareUpdatePlanTarget);
    assertArtifactUrl(artifact.url, `Firmware artifact ${artifactId}`);
    if (artifact.logicalName !== undefined) {
      assertBoundedString(artifact.logicalName, 'logical name', 256);
    }
    if (
      artifact.expectedSize !== undefined &&
      (!Number.isSafeInteger(artifact.expectedSize) || (artifact.expectedSize as number) <= 0)
    ) {
      return planError('Firmware update plan artifact size is invalid');
    }
    if (
      artifact.expectedSha256 !== undefined &&
      (typeof artifact.expectedSha256 !== 'string' ||
        !/^[a-f0-9]{64}$/u.test(artifact.expectedSha256))
    ) {
      return planError('Firmware update plan artifact digest is invalid');
    }
    if (artifact.targetVersion !== undefined) {
      assertBoundedString(artifact.targetVersion, 'target version', 64);
    }
  }
  if (
    !Array.isArray(plan.targetsToUpdate) ||
    plan.targetsToUpdate.some(
      target => !FIRMWARE_UPDATE_PLAN_TARGETS.has(target as FirmwareUpdatePlanTarget)
    ) ||
    new Set(plan.targetsToUpdate).size !== plan.targetsToUpdate.length ||
    plan.targetsToUpdate.length !== artifactTargets.size ||
    plan.targetsToUpdate.some(target => !artifactTargets.has(target as FirmwareUpdatePlanTarget))
  ) {
    return planError('Firmware update plan targets are invalid');
  }
  const legacyTargets = new Set<FirmwareUpdatePlanTarget>([
    'firmware',
    'ble',
    'bootloader',
    'resource',
  ]);
  const legacyOnlyTargets = new Set<FirmwareUpdatePlanTarget>(['firmware', 'ble', 'bootloader']);
  if (
    ((plan.executor === 'v2' || plan.executor === 'v3') &&
      plan.targetsToUpdate.some(
        target => !legacyTargets.has(target as FirmwareUpdatePlanTarget)
      )) ||
    (plan.executor === 'v4' &&
      plan.targetsToUpdate.some(target =>
        legacyOnlyTargets.has(target as FirmwareUpdatePlanTarget)
      )) ||
    // Only executor v2 services identity-less bootloader recovery (classic family);
    // Pro (v3) and Pro2 (v4) report a serial even in bootloader mode, so their plans
    // must always carry a real identity. Degraded v2 plans are bound to the live
    // device at install time instead.
    (plan.artifacts.length > 0 &&
      (plan.platform === 'native' || plan.platform === 'desktop') &&
      plan.executor !== 'v2' &&
      plan.deviceIdentity === 'unavailable')
  ) {
    return planError('Firmware update plan executor contract is invalid');
  }
  const { planDigest, ...withoutDigest } = plan as unknown as FirmwareUpdatePlan;
  if (digestFirmwareUpdatePlan(withoutDigest) !== planDigest) {
    return planError('Firmware update plan digest is invalid');
  }
  return plan as unknown as FirmwareUpdatePlan;
};

const selectResourceUrl = ({
  release,
  features,
  platform,
}: {
  release: ReleaseRecord;
  features: Features;
  platform: FirmwareUpdatePlatform;
}): string | undefined => {
  const resource = asString(release.resource);
  const fullResource = asString(release.fullResource);
  const range = release.fullResourceRange;
  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  const targetVersion = asVersion(release.version);
  if (
    platform === 'desktop' &&
    fullResource &&
    targetVersion &&
    Array.isArray(range) &&
    range.length === 2 &&
    typeof range[0] === 'string' &&
    typeof range[1] === 'string' &&
    semver.valid(currentVersion) &&
    semver.valid(targetVersion) &&
    semver.valid(range[0]) &&
    semver.valid(range[1]) &&
    semver.lt(currentVersion, range[0]) &&
    semver.gte(targetVersion, range[1])
  ) {
    return fullResource;
  }
  return resource;
};

const getExecutor = (features: Features): FirmwareUpdatePlan['executor'] => {
  const deviceType = getDeviceType(features);
  if (deviceType === EDeviceType.Pro2 || deviceType === EDeviceType.Neo) {
    return 'v4';
  }
  if (
    deviceType === EDeviceType.Pro &&
    semver.gte(getDeviceBootloaderVersion(features).join('.'), '2.8.0')
  ) {
    return 'v3';
  }
  return 'v2';
};

const buildProtocolV2Artifacts = (
  release: ReleaseRecord,
  {
    includeComponents = true,
    includeResources = true,
    componentTargets: selectedComponentTargets,
  }: {
    includeComponents?: boolean;
    includeResources?: boolean;
    componentTargets?: ReadonlySet<FirmwareUpdatePlanTarget>;
  } = {}
): {
  artifacts: FirmwareUpdatePlanArtifact[];
  targets: FirmwareUpdatePlanTarget[];
} => {
  const components = asRecord(release.components);
  if (includeComponents && !components) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Protocol V2 release has no component set',
      { firmwareUpdateCode: 'FirmwarePlanInvalid' }
    );
  }
  const installOrder = Array.isArray(release.installOrder)
    ? release.installOrder.filter((key): key is string => typeof key === 'string')
    : [];
  const componentKeys =
    includeComponents && components
      ? [...installOrder, ...Object.keys(components).filter(key => !installOrder.includes(key))]
      : [];
  const selectedComponentKeys = selectedComponentTargets
    ? componentKeys.filter(key => {
        const component = asRecord(components?.[key]);
        const targetName = asString(component?.target)?.toUpperCase();
        const target = targetName ? PROTOCOL_V2_TARGETS[targetName] : undefined;
        return !!target && selectedComponentTargets.has(target);
      })
    : componentKeys;
  const artifacts: FirmwareUpdatePlanArtifact[] = [];
  const targets: FirmwareUpdatePlanTarget[] = [];
  const componentTargetSet = new Set<FirmwareUpdatePlanTarget>();
  for (const key of selectedComponentKeys) {
    const component = asRecord(components?.[key]);
    const targetName = asString(component?.target)?.toUpperCase();
    const target = targetName ? PROTOCOL_V2_TARGETS[targetName] : undefined;
    if (targetName === 'ROMLOADER') {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 ROMLOADER requires its dedicated loader flow',
        { firmwareUpdateCode: 'FirmwarePlanInvalid' }
      );
    }
    if (!component || !target) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 component ${key} has an unsupported target`,
        { firmwareUpdateCode: 'FirmwarePlanInvalid' }
      );
    }
    if (componentTargetSet.has(target)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 component ${key} duplicates target ${target}`,
        { firmwareUpdateCode: 'FirmwarePlanInvalid' }
      );
    }
    componentTargetSet.add(target);
    artifacts.push({
      artifactId: `component:${target}`,
      role: 'component',
      target,
      url: assertArtifactUrl(component.url, `Protocol V2 component ${key}`),
      container: 'raw',
      logicalName: key,
      ...asIntegrity({
        size: component.expectedSize,
        sha256: component.fingerprint,
      }),
      ...(asVersion(component.version) ? { targetVersion: asVersion(component.version) } : {}),
    });
    targets.push(target);
  }

  const bundles =
    includeResources && Array.isArray(release.resourceBundles) ? release.resourceBundles : [];
  const resourceBundleNames = new Set<string>();
  for (const value of bundles) {
    const bundle = asRecord(value);
    const name = asString(bundle?.name);
    if (!bundle || !name) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 resource bundle is invalid',
        { firmwareUpdateCode: 'FirmwarePlanInvalid' }
      );
    }
    if (resourceBundleNames.has(name)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 resource bundle duplicates name ${name}`,
        { firmwareUpdateCode: 'FirmwarePlanInvalid' }
      );
    }
    resourceBundleNames.add(name);
    artifacts.push({
      artifactId: `resourceBundle:${name}`,
      role: 'resourceBundle',
      target: 'resource',
      url: assertArtifactUrl(bundle.url, `Protocol V2 resource bundle ${name}`),
      container: 'raw',
      logicalName: name,
      ...asIntegrity({
        size: bundle.expectedSize,
        sha256: bundle.fingerprint,
      }),
    });
  }
  if (bundles.length > 0) {
    targets.push('resource');
  }
  return { artifacts, targets: [...new Set(targets)] };
};

const isForcedTargetRepresented = ({
  executor,
  forcedTarget,
  artifacts,
  targetsToUpdate,
}: {
  executor: FirmwareUpdatePlan['executor'];
  forcedTarget: FirmwareUpdatePlanForceTarget;
  artifacts: readonly FirmwareUpdatePlanArtifact[];
  targetsToUpdate: readonly FirmwareUpdatePlanTarget[];
}): boolean => {
  if (executor !== 'v4') {
    return artifacts.some(
      artifact => artifact.target === forcedTarget && targetsToUpdate.includes(forcedTarget)
    );
  }
  if (forcedTarget === 'firmware') {
    return artifacts.some(
      artifact => artifact.role === 'component' && targetsToUpdate.includes(artifact.target)
    );
  }
  if (forcedTarget === 'resource') {
    return artifacts.some(
      artifact =>
        artifact.role === 'resourceBundle' &&
        artifact.target === 'resource' &&
        targetsToUpdate.includes('resource')
    );
  }
  return false;
};

const assertForcedTargetsRepresented = ({
  executor,
  forcedTargets,
  artifacts,
  targetsToUpdate,
}: {
  executor: FirmwareUpdatePlan['executor'];
  forcedTargets: readonly FirmwareUpdatePlanForceTarget[];
  artifacts: readonly FirmwareUpdatePlanArtifact[];
  targetsToUpdate: readonly FirmwareUpdatePlanTarget[];
}) => {
  for (const forcedTarget of forcedTargets) {
    if (
      !isForcedTargetRepresented({
        executor,
        forcedTarget,
        artifacts,
        targetsToUpdate,
      })
    ) {
      planError(`Forced firmware update target ${forcedTarget} is not represented by the plan`);
    }
  }
};

const finalizeFirmwareUpdatePlan = ({
  features,
  firmwareType,
  platform,
  artifacts,
  targetsToUpdate,
}: {
  features: Features;
  firmwareType: EFirmwareType;
  platform: FirmwareUpdatePlatform;
  artifacts: FirmwareUpdatePlanArtifact[];
  targetsToUpdate: FirmwareUpdatePlanTarget[];
}): FirmwareUpdatePlan => {
  const executor = getExecutor(features);
  const bootloaderMode = resolveDeviceBootloaderMode(features);
  // 'unavailable' is the reserved degraded-identity sentinel; a device-reported
  // serial must never be able to collide with it.
  const reportedIdentity = getDeviceUUID(features);
  const deviceIdentity = reportedIdentity === 'unavailable' ? '' : reportedIdentity;
  // Bootloader-mode classic-family devices (executor v2, e.g. classic1s) cannot report
  // a serial number, so their recovery plans fall back to the degraded 'unavailable'
  // identity. Binding is then enforced against the live device at install time instead
  // (assertFirmwareUpdatePreparedPlanDeviceIdentity), and plan integrity by the digest.
  // Pro (v3), Pro2, and Neo (v4) report a serial even in loader mode and stay strict.
  if (
    artifacts.length > 0 &&
    (platform === 'native' || platform === 'desktop') &&
    !deviceIdentity &&
    !(bootloaderMode && executor === 'v2')
  ) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Prepared firmware update requires a stable device identity',
      { firmwareUpdateCode: 'FirmwarePlanInvalid' }
    );
  }
  const planWithoutDigest: Omit<FirmwareUpdatePlan, 'planDigest'> = {
    schemaVersion: 2,
    executor,
    deviceIdentity: deviceIdentity || 'unavailable',
    deviceModel: String(getDeviceType(features)),
    firmwareType,
    platform,
    artifacts,
    targetsToUpdate,
  };
  return assertFirmwareUpdatePlan({
    ...planWithoutDigest,
    planDigest: digestFirmwareUpdatePlan(planWithoutDigest),
  });
};

export const buildProtocolV2FirmwareUpdatePlan = ({
  features,
  firmwareType,
  platform,
  release,
  targetsToUpdate,
  forceUpdateTargets,
  resourceArchiveAvailable,
}: {
  features: Features;
  firmwareType: EFirmwareType;
  platform: FirmwareUpdatePlatform;
  release: ReleaseRecord | undefined;
  targetsToUpdate: readonly FirmwareUpdateV4Target[];
  forceUpdateTargets?: FirmwareUpdatePlanForceTarget[];
  resourceArchiveAvailable: boolean;
}): FirmwareUpdatePlan => {
  const validatedForceTargets = validateFirmwareUpdatePlanForceTargets(forceUpdateTargets);
  if (validatedForceTargets.some(target => target === 'ble' || target === 'bootloader')) {
    planError('Protocol V2 does not support forced BLE or legacy bootloader targets');
  }

  const requestedComponentTargets = new Set<FirmwareUpdatePlanTarget>(
    targetsToUpdate.filter(target => target !== 'resource')
  );
  const protocolV2 = buildProtocolV2Artifacts(release ?? {}, {
    includeComponents: requestedComponentTargets.size > 0,
    includeResources: false,
    componentTargets: requestedComponentTargets,
  });
  const representedTargets = new Set(protocolV2.targets);
  const missingTarget = Array.from(requestedComponentTargets).find(
    target => !representedTargets.has(target)
  );
  if (missingTarget) {
    planError(`Protocol V2 release does not contain requested target ${missingTarget}`);
  }
  if (validatedForceTargets.includes('firmware') && protocolV2.targets.length === 0) {
    planError('Forced firmware update target firmware is not represented by the plan');
  }
  if (validatedForceTargets.includes('resource') && !resourceArchiveAvailable) {
    planError('Forced firmware update target resource has no Protocol V2 resource archive');
  }

  // Protocol V2 resource archives are materialized by the host into explicit
  // resourceFiles. The prepared artifact plan therefore binds firmware components only.
  return finalizeFirmwareUpdatePlan({
    features,
    firmwareType,
    platform,
    artifacts: protocolV2.artifacts,
    targetsToUpdate: protocolV2.targets,
  });
};

export const buildFirmwareUpdatePlan = ({
  features,
  firmwareType,
  platform,
  firmware,
  ble,
  bootloader,
  forceUpdateTargets,
}: {
  features: Features;
  firmwareType: EFirmwareType;
  platform: FirmwareUpdatePlatform;
  firmware: ReleaseSelection;
  ble: ReleaseSelection;
  bootloader?: ReleaseSelection;
  forceUpdateTargets?: FirmwareUpdatePlanForceTarget[];
}): FirmwareUpdatePlan => {
  const executor = getExecutor(features);
  let artifacts: FirmwareUpdatePlanArtifact[] = [];
  let targetsToUpdate: FirmwareUpdatePlanTarget[] = [];
  const firmwareRelease = asRelease(firmware);
  const validatedForceTargets = validateFirmwareUpdatePlanForceTargets(forceUpdateTargets);
  const forcedTargets = new Set(validatedForceTargets);
  const bootloaderMode = resolveDeviceBootloaderMode(features);
  // Bootloader recovery: an erased device reports firmware status 'none', a device
  // with intact firmware in bootloader mode reports 'unknown' (version fields carry
  // the bootloader version), and neither can report its BLE version — yet the app
  // treats bootloader mode as a mandatory reinstall. Only bootloader mode may treat
  // these statuses as install targets: in normal mode 'none' also describes devices
  // without the component at all (e.g. Mini has no BLE) and must stay excluded.
  const isRecoveryInstall = (release: ReleaseSelection | undefined): boolean =>
    bootloaderMode &&
    (release?.status === 'none' || release?.status === 'unknown') &&
    !!asRelease(release);
  const shouldUpdateFirmware =
    isUpgrade(firmware) || isRecoveryInstall(firmware) || forcedTargets.has('firmware');
  const shouldUpdateResource = isUpgrade(firmware) || forcedTargets.has('resource');

  if (
    executor === 'v4' &&
    validatedForceTargets.some(target => target === 'ble' || target === 'bootloader')
  ) {
    planError('Protocol V2 does not support forced BLE or legacy bootloader targets');
  }

  if (executor === 'v4' && (shouldUpdateFirmware || shouldUpdateResource)) {
    const protocolV2 = buildProtocolV2Artifacts(firmwareRelease ?? {}, {
      includeComponents: shouldUpdateFirmware,
      includeResources: shouldUpdateResource,
    });
    artifacts = protocolV2.artifacts;
    targetsToUpdate = protocolV2.targets;
  } else {
    if (isUpgrade(bootloader) || forcedTargets.has('bootloader')) {
      artifacts.push({
        artifactId: 'bootloader',
        role: 'bootloader',
        target: 'bootloader',
        url: assertArtifactUrl(asRelease(bootloader)?.bootloaderResource, 'Bootloader release'),
        container: 'raw',
        ...asIntegrity({
          size: asRelease(bootloader)?.bootloaderExpectedSize,
          sha256: asRelease(bootloader)?.bootloaderFingerprint,
        }),
        ...(asVersion(asRelease(bootloader)?.bootloaderVersion)
          ? {
              targetVersion: asVersion(asRelease(bootloader)?.bootloaderVersion),
            }
          : {}),
      });
    }
    if (shouldUpdateFirmware || shouldUpdateResource) {
      if (!firmwareRelease) {
        throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Firmware release is invalid', {
          firmwareUpdateCode: 'FirmwarePlanInvalid',
        });
      }
      if (shouldUpdateFirmware) {
        artifacts.push({
          artifactId: 'firmware',
          role: 'firmware',
          target: 'firmware',
          url: assertArtifactUrl(firmwareRelease.url, 'Firmware release'),
          container: 'raw',
          ...asIntegrity({
            size: firmwareRelease.expectedSize,
            sha256: firmwareRelease.fingerprint,
          }),
          ...(asVersion(firmwareRelease.version)
            ? { targetVersion: asVersion(firmwareRelease.version) }
            : {}),
        });
      }
      if (shouldUpdateResource) {
        const resourceUrl = selectResourceUrl({
          release: firmwareRelease,
          features,
          platform,
        });
        if (resourceUrl) {
          artifacts.push({
            artifactId: 'resource',
            role: 'resource',
            target: 'resource',
            url: assertArtifactUrl(resourceUrl, 'Firmware resource release'),
            container: 'zip',
            ...asIntegrity({
              size:
                resourceUrl === asString(firmwareRelease.fullResource)
                  ? firmwareRelease.fullResourceExpectedSize
                  : firmwareRelease.resourceExpectedSize,
              sha256:
                resourceUrl === asString(firmwareRelease.fullResource)
                  ? firmwareRelease.fullResourceFingerprint
                  : firmwareRelease.resourceFingerprint,
            }),
          });
        }
      }
    }
    if (isUpgrade(ble) || isRecoveryInstall(ble) || forcedTargets.has('ble')) {
      const bleRelease = asRelease(ble);
      artifacts.push({
        artifactId: 'ble',
        role: 'ble',
        target: 'ble',
        url: assertArtifactUrl(bleRelease?.webUpdate ?? bleRelease?.url, 'BLE release'),
        container: 'raw',
        ...asIntegrity({
          size: bleRelease?.expectedSize,
          sha256: bleRelease?.fingerprintWeb ?? bleRelease?.fingerprint,
        }),
        ...(asVersion(bleRelease?.version)
          ? { targetVersion: asVersion(bleRelease?.version) }
          : {}),
      });
    }
    targetsToUpdate = [...new Set(artifacts.map(artifact => artifact.target))];
  }

  assertForcedTargetsRepresented({
    executor,
    forcedTargets: validatedForceTargets,
    artifacts,
    targetsToUpdate,
  });
  return finalizeFirmwareUpdatePlan({
    features,
    firmwareType,
    platform,
    artifacts,
    targetsToUpdate,
  });
};
