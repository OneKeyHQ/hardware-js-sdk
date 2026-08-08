import {
  PROTOCOL_V2_RESOURCE_SLOTS,
  inspectProtocolV2ResourcePackageDirectory,
  matchProtocolV2ResourcePackageDirectory,
} from './protocolV2FirmwareFiles';

const completeResourceFiles = PROTOCOL_V2_RESOURCE_SLOTS.map(slot => ({
  name: `${slot.fileNamePrefix}.okpkg`,
}));

describe('Protocol V2 resource directory', () => {
  test('recognizes all nine packages from one selected folder', () => {
    const inspection = inspectProtocolV2ResourcePackageDirectory(completeResourceFiles);

    expect(Object.keys(inspection.matchedFiles)).toHaveLength(9);
    expect(inspection.missingSlots).toEqual([]);
    expect(inspection.duplicateSlots).toEqual([]);
    expect(inspection.unrecognizedFiles).toEqual([]);
    expect(matchProtocolV2ResourcePackageDirectory(completeResourceFiles)).toHaveProperty(
      'firmware_logo'
    );
  });

  test('reports missing, duplicate and unrecognized packages for the visible file list', () => {
    const inspection = inspectProtocolV2ResourcePackageDirectory([
      ...completeResourceFiles.slice(1),
      { name: 'images-resource-a.okpkg' },
      { name: 'unknown.okpkg' },
    ]);

    expect(inspection.missingSlots.map(slot => slot.key)).toEqual(['firmware_logo']);
    expect(inspection.duplicateSlots.map(({ slot }) => slot.key)).toEqual(['images']);
    expect(inspection.unrecognizedFiles.map(file => file.name)).toEqual(['unknown.okpkg']);
  });
});
