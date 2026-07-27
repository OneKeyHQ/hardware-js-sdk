import type { FirmwareUpdateV4Target } from './firmwareUpdate';
import type { EFirmwareType } from '@onekeyfe/hd-shared';

export type FirmwareUpdatePlanArtifactRole =
  | 'firmware'
  | 'ble'
  | 'bootloader'
  | 'resource'
  | 'component'
  | 'resourceBundle';

export type FirmwareUpdatePlanTarget = 'firmware' | 'ble' | 'bootloader' | FirmwareUpdateV4Target;

export interface FirmwareUpdatePlanArtifact {
  artifactId: string;
  role: FirmwareUpdatePlanArtifactRole;
  target: FirmwareUpdatePlanTarget;
  url: string;
  container: 'raw' | 'zip';
  logicalName?: string;
  expectedSize?: number;
  expectedSha256?: string;
  targetVersion?: string;
}

export type FirmwareUpdatePlanEpochKind =
  | 'legacy-update'
  | 'resource-sync'
  | 'bootloader-install'
  | 'bootloader-verify'
  | 'component-install'
  | 'final-verify';

export interface FirmwareUpdatePlanEpoch {
  epoch: number;
  kind: FirmwareUpdatePlanEpochKind;
  artifactIds: string[];
  targets: FirmwareUpdatePlanTarget[];
}

export interface FirmwareUpdatePlan {
  schemaVersion: 1;
  planDigest: string;
  executor: 'v2' | 'v3' | 'v4';
  deviceIdentity: string;
  deviceModel: string;
  firmwareType: EFirmwareType;
  platform: 'native' | 'desktop' | 'ext' | 'web' | 'web-embed';
  artifacts: FirmwareUpdatePlanArtifact[];
  epochs: FirmwareUpdatePlanEpoch[];
  targetsToUpdate: FirmwareUpdatePlanTarget[];
}
