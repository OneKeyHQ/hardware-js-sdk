export const FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION = 2 as const;
export const FIRMWARE_PREPARED_PLAN_SCHEMA_VERSION = 2 as const;
export const FIRMWARE_HOST_BINDING_PROTOCOL_VERSION = 1 as const;
export const FIRMWARE_CHECKPOINT_SCHEMA_VERSION = 1 as const;

export type FirmwareManifestModeKind = 'external-only' | 'sdk-managed';

export interface FirmwareUpdateCapabilities {
  planSchemaVersion: typeof FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION;
  preparedPlanSchemaVersion: typeof FIRMWARE_PREPARED_PLAN_SCHEMA_VERSION;
  hostBindingProtocolVersion: typeof FIRMWARE_HOST_BINDING_PROTOCOL_VERSION;
  checkpointSchemaVersion: typeof FIRMWARE_CHECKPOINT_SCHEMA_VERSION;
  manifestModes: readonly ['external-only', 'sdk-managed'];
  supportsArtifactReader: true;
  supportsAwaitableCheckpoint: true;
  supportsResume: true;
  supportsReconciliation: true;
}

const MANIFEST_MODES = Object.freeze(['external-only', 'sdk-managed'] as const);

export const FIRMWARE_UPDATE_CAPABILITIES: FirmwareUpdateCapabilities = Object.freeze({
  planSchemaVersion: FIRMWARE_UPDATE_PLAN_SCHEMA_VERSION,
  preparedPlanSchemaVersion: FIRMWARE_PREPARED_PLAN_SCHEMA_VERSION,
  hostBindingProtocolVersion: FIRMWARE_HOST_BINDING_PROTOCOL_VERSION,
  checkpointSchemaVersion: FIRMWARE_CHECKPOINT_SCHEMA_VERSION,
  manifestModes: MANIFEST_MODES,
  supportsArtifactReader: true,
  supportsAwaitableCheckpoint: true,
  supportsResume: true,
  supportsReconciliation: true,
});

export const getFirmwareUpdateCapabilities = (): FirmwareUpdateCapabilities =>
  FIRMWARE_UPDATE_CAPABILITIES;
