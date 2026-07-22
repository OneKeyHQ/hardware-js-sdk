export type DeviceMethodSection = 'basic' | 'device' | 'firmware' | 'advanced';

const PROTOCOL_V2_FILE_SYSTEM_METHODS = new Set([
  'pathinfo',
  'dirlist',
  'dirmake',
  'dirremove',
  'fileread',
  'filewrite',
  'filedelete',
]);

export function getDeviceMethodSection(method: string): DeviceMethodSection {
  const methodName = method.toLowerCase();

  if (
    [
      'searchdevices',
      'getfeatures',
      'getdevicestate',
      'getonekeyfeatures',
      'getpassphrasestate',
      'devicegetonboardingstatus',
      'protocolinforequest',
      'ping',
      'cancel',
      'devicesupportfeatures',
      'getlogs',
    ].includes(methodName)
  ) {
    return 'basic';
  }

  if (
    methodName.includes('firmware') ||
    methodName.includes('bootloader') ||
    methodName.includes('check') ||
    methodName.includes('bridge') ||
    methodName.includes('reboot') ||
    PROTOCOL_V2_FILE_SYSTEM_METHODS.has(methodName)
  ) {
    return 'firmware';
  }

  if (
    [
      'devicesettings',
      'devicesettingsset',
      'devicesettingspageshow',
      'devicechangepin',
      'devicelock',
      'deviceunlock',
      'devicecancel',
    ].includes(methodName)
  ) {
    return 'device';
  }

  return 'advanced';
}
