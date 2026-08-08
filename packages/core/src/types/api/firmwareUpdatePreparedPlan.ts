import type { FirmwareArtifactReference } from './firmwareUpdate';
import type {
  FirmwareUpdatePlan,
  FirmwareUpdatePlanArtifactRole,
  FirmwareUpdatePlanTarget,
} from './firmwareUpdatePlan';

export interface FirmwareUpdatePreparedEntry {
  entryName: string;
  artifact: FirmwareArtifactReference;
}

export interface FirmwareUpdatePreparedArtifactInput {
  artifactId: string;
  artifact: FirmwareArtifactReference;
  materializedEntries?: FirmwareUpdatePreparedEntry[];
}

export interface FirmwareUpdatePreparedArtifact {
  artifactId: string;
  role: FirmwareUpdatePlanArtifactRole;
  target: FirmwareUpdatePlanTarget;
  container: 'raw' | 'zip';
  logicalName?: string;
  targetVersion?: string;
  artifact: FirmwareArtifactReference;
  materializedEntries?: FirmwareUpdatePreparedEntry[];
}

export interface FirmwareUpdatePreparedPlan {
  schemaVersion: 2;
  preparedPlanDigest: string;
  planDigest: string;
  networkPolicy: 'forbid';
  executor: FirmwareUpdatePlan['executor'];
  deviceIdentity: string;
  deviceModel: string;
  firmwareType: FirmwareUpdatePlan['firmwareType'];
  platform: FirmwareUpdatePlan['platform'];
  leaseRef: string;
  artifacts: FirmwareUpdatePreparedArtifact[];
  targetsToUpdate: FirmwareUpdatePlanTarget[];
}

export declare function prepareFirmwareUpdatePlan(input: {
  plan: FirmwareUpdatePlan;
  leaseRef: string;
  artifacts: FirmwareUpdatePreparedArtifactInput[];
}): FirmwareUpdatePreparedPlan;

export declare function validateFirmwareUpdatePreparedPlan(
  value: unknown
): FirmwareUpdatePreparedPlan;
