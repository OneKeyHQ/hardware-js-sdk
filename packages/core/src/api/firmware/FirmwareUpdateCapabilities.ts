import type { FirmwareUpdateCapabilities } from '../../types/api/firmwareUpdateCapabilities';

export const getFirmwareUpdateCapabilities = (): FirmwareUpdateCapabilities => ({
  planSchemaVersion: 1,
  preparedPlanSchemaVersion: 1,
  hostBindingProtocolVersion: 1,
  checkpointSchemaVersion: 1,
  manifestModes: ['external-only', 'sdk-managed'],
  supportsArtifactReader: true,
  supportsAwaitableCheckpoint: true,
  supportsResume: true,
  supportsReconciliation: true,
});
