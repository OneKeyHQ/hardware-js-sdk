import { getFirmwareUpdateCapabilities } from '../../src/api/firmware/FirmwareUpdateCapabilities';

describe('getFirmwareUpdateCapabilities', () => {
  it('advertises only the prepared artifact contract', () => {
    expect(getFirmwareUpdateCapabilities()).toEqual({
      planSchemaVersion: 2,
      preparedPlanSchemaVersion: 2,
      hostBindingProtocolVersion: 2,
      manifestModes: ['external-only', 'sdk-managed'],
      supportsArtifactReader: true,
    });
  });
});
