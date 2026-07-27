export type DeviceMethodSection = 'basic' | 'device' | 'firmware' | 'advanced';

const PROTOCOL_V2_FILE_SYSTEM_METHODS = new Set([
  'pathinfo',
  'dirlist',
  'dirmake',
  'dirremove',
  'fileread',
  'filewrite',
  'filedelete',
  'filesystempathinfoquery',
  'filesystemdirlist',
  'filesystemdirmake',
  'filesystemdirremove',
  'filesystemfileread',
  'filesystemfilewrite',
  'filesystemfiledelete',
  'filesystempermissionfix',
  'filesystemformat',
]);

export function getDeviceMethodSection(method: string): DeviceMethodSection {
  const methodName = method.toLowerCase();

  if (
    [
      'searchdevices',
      'promptwebdeviceaccess',
      'getfeatures',
      'getdevicestate',
      'refreshdevicestate',
      'getonekeyfeatures',
      'getpassphrasestate',
      'openwalletsession',
      'clearsessioncache',
      'testinitializedeviceduration',
      'preinitialize',
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
      'devicebackup',
      'devicereset',
      'devicerecovery',
      'deviceflags',
      'devicelock',
      'deviceunlock',
      'devicecancel',
      'uploadportfolio',
    ].includes(methodName)
  ) {
    return 'device';
  }

  return 'advanced';
}
