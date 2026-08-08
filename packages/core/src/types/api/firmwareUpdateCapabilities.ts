export interface FirmwareUpdateCapabilities {
  planSchemaVersion: 2;
  preparedPlanSchemaVersion: 2;
  hostBindingProtocolVersion: 2;
  manifestModes: Array<'external-only' | 'sdk-managed'>;
  supportsArtifactReader: true;
}

export declare function getFirmwareUpdateCapabilities(): FirmwareUpdateCapabilities;
