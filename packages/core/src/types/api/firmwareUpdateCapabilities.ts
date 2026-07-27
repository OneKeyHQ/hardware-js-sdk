export interface FirmwareUpdateCapabilities {
  planSchemaVersion: 1;
  preparedPlanSchemaVersion: 1;
  hostBindingProtocolVersion: 1;
  checkpointSchemaVersion: 1;
  manifestModes: Array<'external-only' | 'sdk-managed'>;
  supportsArtifactReader: true;
  supportsAwaitableCheckpoint: true;
  supportsResume: true;
  supportsReconciliation: true;
}

export declare function getFirmwareUpdateCapabilities(): FirmwareUpdateCapabilities;
