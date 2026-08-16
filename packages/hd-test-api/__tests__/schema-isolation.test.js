/* eslint-disable @typescript-eslint/no-var-requires */
const {
  mergeProtobufSchemas,
} = require('../../hd-transport/src/serialization/protobuf/schema-extension');
const productionV1 = require('../../core/src/data/messages/messages.json');
const productionV1Legacy = require('../../core/src/data/messages/messages_legacy_v1.json');
const productionV2 = require('../../core/src/data/messages/messages-protocol-v2.json');
const extensionV1 = require('../src/protobuf/messages-v1.json');
const extensionV1Legacy = require('../src/protobuf/messages-v1-legacy.json');
const extensionV2 = require('../src/protobuf/messages-protocol-v2.json');

const pureFactoryMessages = {
  v1: ['DeviceInfoSettings', 'GetDeviceInfo', 'WriteSEPublicCert'],
  v2: [
    'DeviceFactoryInfoSet',
    'DeviceFactoryInfoGet',
    'DeviceCertificateWrite',
    'DeviceCertificateRead',
  ],
};

describe('hardware test protobuf isolation', () => {
  test.each([
    ['current Protocol V1', productionV1, extensionV1, pureFactoryMessages.v1],
    ['legacy Protocol V1', productionV1Legacy, extensionV1Legacy, pureFactoryMessages.v1],
    ['Protocol V2', productionV2, extensionV2, pureFactoryMessages.v2],
  ])(
    'injects %s factory definitions without shipping them in the base schema',
    (_, base, extension, names) => {
      const merged = mergeProtobufSchemas(base, [extension]);

      names.forEach(name => {
        expect(base.nested).not.toHaveProperty(name);
        expect(extension.nested).toHaveProperty(name);
        expect(merged.nested).toHaveProperty(name);
      });
    }
  );

  test('keeps verification wire messages in production because deviceVerify consumes them', () => {
    expect(productionV1.nested).toHaveProperty('ReadSEPublicCert');
    expect(productionV1.nested).toHaveProperty('SESignMessage');
    expect(extensionV1.nested).not.toHaveProperty('ReadSEPublicCert');
    expect(extensionV1.nested).not.toHaveProperty('SESignMessage');
  });

  test.each([
    ['current Protocol V1', productionV1, extensionV1, 'DebugLinkMemoryWrite'],
    ['legacy Protocol V1', productionV1Legacy, extensionV1Legacy, 'DebugLinkMemoryWrite'],
    ['Protocol V2', productionV2, extensionV2, 'CosiCommit'],
  ])('keeps %s test protobuf definitions in the extension package', (_, base, extension, name) => {
    expect(base.nested).not.toHaveProperty(name);
    expect(extension.nested).toHaveProperty(name);
    expect(mergeProtobufSchemas(base, [extension]).nested).toHaveProperty(name);
  });
});
