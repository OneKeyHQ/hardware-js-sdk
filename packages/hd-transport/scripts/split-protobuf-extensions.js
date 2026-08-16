const fs = require('fs');
const path = require('path');

const [sourcePath, productionPath, extensionPath, profile = 'protocol-v2-extension'] =
  process.argv.slice(2);

if (!sourcePath || !productionPath || !extensionPath) {
  throw new Error(
    'Usage: split-protobuf-extensions.js <source> <production> <extension> [profile]'
  );
}

const profiles = {
  'protocol-v2-extension': [
    'DeviceCertificate',
    'DeviceCertificateWrite',
    'DeviceCertificateRead',
    'DeviceCertificateSignature',
    'DeviceCertificateSign',
    'DeviceFactoryAck',
    'DeviceFactoryInfoManufactureTime',
    'DeviceFactoryInfo',
    'DeviceFactoryInfoSet',
    'DeviceFactoryInfoGet',
    'DeviceFactoryPermanentLock',
    'DeviceFactoryTest',
    'DeviceInfoSettings',
    'GetDeviceInfo',
    'WriteSEPrivateKey',
    'WriteSEPublicCert',
    'CosiCommit',
    'CosiCommitment',
    'CosiSign',
    'CosiSignature',
    'DebugSwipeDirection',
    'DebugLinkDecision',
    'DebugLinkLayout',
    'DebugLinkReseedRandom',
    'DebugLinkRecordScreen',
    'DebugLinkGetState',
    'DebugLinkState',
    'DebugLinkStop',
    'DebugLinkLog',
    'DebugLinkMemoryRead',
    'DebugLinkMemory',
    'DebugLinkMemoryWrite',
    'DebugLinkFlashErase',
    'DebugLinkEraseSdCard',
    'DebugLinkWatchLayout',
    'LoadDevice',
    'DebugMoneroDiagRequest',
    'DebugMoneroDiagAck',
    'WebAuthnListResidentCredentials',
    'WebAuthnAddResidentCredential',
    'WebAuthnRemoveResidentCredential',
    'WebAuthnCredential',
    'WebAuthnCredentials',
  ],
  'protocol-v1-extension': [
    'DeviceInfoSettings',
    'GetDeviceInfo',
    'WriteSEPrivateKey',
    'WriteSEPublicCert',
    'CosiCommit',
    'CosiCommitment',
    'CosiSign',
    'CosiSignature',
    'DebugSwipeDirection',
    'DebugLinkDecision',
    'DebugLinkLayout',
    'DebugLinkReseedRandom',
    'DebugLinkRecordScreen',
    'DebugLinkGetState',
    'DebugLinkState',
    'DebugLinkStop',
    'DebugLinkLog',
    'DebugLinkMemoryRead',
    'DebugLinkMemory',
    'DebugLinkMemoryWrite',
    'DebugLinkFlashErase',
    'DebugLinkEraseSdCard',
    'DebugLinkWatchLayout',
    'LoadDevice',
    'DebugMoneroDiagRequest',
    'DebugMoneroDiagAck',
    'WebAuthnListResidentCredentials',
    'WebAuthnAddResidentCredential',
    'WebAuthnRemoveResidentCredential',
    'WebAuthnCredential',
    'WebAuthnCredentials',
  ],
};

const messageNames = profiles[profile];
if (!messageNames) {
  throw new Error(`Unknown protobuf extension profile: ${profile}`);
}

const schema = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const production = JSON.parse(JSON.stringify(schema));
const extension = { nested: { MessageType: { values: {} } } };

messageNames.forEach(messageName => {
  const definition = production.nested?.[messageName];
  if (definition) {
    extension.nested[messageName] = definition;
    delete production.nested[messageName];
  }

  const enumName = `MessageType_${messageName}`;
  const messageTypeValues = production.nested?.MessageType?.values;
  if (messageTypeValues && enumName in messageTypeValues) {
    extension.nested.MessageType.values[enumName] = messageTypeValues[enumName];
    delete messageTypeValues[enumName];
  }
});

fs.mkdirSync(path.dirname(extensionPath), { recursive: true });
fs.writeFileSync(productionPath, `${JSON.stringify(production, null, 2)}\n`);
fs.writeFileSync(extensionPath, `${JSON.stringify(extension, null, 2)}\n`);
