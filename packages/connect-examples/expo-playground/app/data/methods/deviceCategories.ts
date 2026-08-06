export type DeviceMethodSection = 'basic' | 'device' | 'firmware' | 'advanced';

const BASIC_METHODS = new Set([
  'searchdevices',
  'promptwebdeviceaccess',
  'getfeatures',
  'detectdeviceconnectprotocol',
  'getdevicestate',
  'getonekeyfeatures',
  'getpassphrasestate',
  'openwalletsession',
  'clearsessioncache',
  'testinitializedeviceduration',
  'preinitialize',
  'testprotocolv2ping',
  'devicegetonboardingstatus',
  'devicesupportfeatures',
  'getlogs',
]);

const DEVICE_METHODS = new Set([
  'devicesettings',
  'devicebackup',
  'devicereset',
  'devicerecovery',
  'deviceflags',
  'devicechangepin',
  'devicelock',
  'deviceunlock',
  'devicecancel',
  'uploadportfolio',
  'deviceuploadwallpaper',
  'deviceuploadnft',
]);

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

  if (BASIC_METHODS.has(methodName)) return 'basic';

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

  if (DEVICE_METHODS.has(methodName)) return 'device';

  return 'advanced';
}
