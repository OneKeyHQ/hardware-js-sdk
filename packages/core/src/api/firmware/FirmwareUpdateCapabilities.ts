import type { FirmwareUpdateCapabilities } from '../../types/api/firmwareUpdateCapabilities';

export const getFirmwareUpdateCapabilities = (): FirmwareUpdateCapabilities => ({
  planSchemaVersion: 2,
  preparedPlanSchemaVersion: 2,
  hostBindingProtocolVersion: 2,
  manifestModes: ['external-only', 'sdk-managed'],
  supportsArtifactReader: true,
});
