import { getFirmwareUpdateCapabilities } from '../../src/api/firmware/FirmwareUpdateCapabilities';

describe('getFirmwareUpdateCapabilities', () => {
  it('uses explicit protocol versions for the complete recovery contract', () => {
    expect(getFirmwareUpdateCapabilities()).toEqual({
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
  });
});
