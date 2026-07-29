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

export type FirmwareUpdatePlanForceTarget = 'firmware' | 'ble' | 'bootloader' | 'resource';

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

export interface FirmwareUpdatePlan {
  schemaVersion: 2;
  planDigest: string;
  executor: 'v2' | 'v3' | 'v4';
  deviceIdentity: string;
  deviceModel: string;
  firmwareType: EFirmwareType;
  platform: 'native' | 'desktop' | 'ext' | 'web' | 'web-embed';
  artifacts: FirmwareUpdatePlanArtifact[];
  targetsToUpdate: FirmwareUpdatePlanTarget[];
}
