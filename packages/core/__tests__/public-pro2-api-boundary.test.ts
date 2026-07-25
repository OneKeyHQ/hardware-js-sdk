import * as publicMethods from '../src/api';
import { findMethod } from '../src/api/utils';
import { createCoreApi } from '../src/inject';

import type { CoreApi } from '../src/types/api';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const internalMethodNames = [
  'protocolInfoRequest',
  'ping',
  'deviceSessionOpen',
  'deviceFirmwareUpdate',
  'deviceGetFirmwareUpdateStatus',
  'deviceFactoryInfoSet',
  'deviceFactoryInfoGet',
  'deviceSettingsSet',
  'deviceSettingsPageShow',
  'filesystemPermissionFix',
  'filesystemFormat',
] as const;

const unpublishedFilesystemAliases = [
  'filesystemFileRead',
  'filesystemFileWrite',
  'filesystemFileDelete',
  'filesystemDirList',
  'filesystemDirMake',
  'filesystemDirRemove',
  'filesystemPathInfoQuery',
] as const;

describe('public Pro2 API boundary', () => {
  test('exposes business methods without raw protocol shortcuts or file aliases', () => {
    const api = createCoreApi(jest.fn() as CoreApi['call']) as Record<string, unknown>;

    expect(api.deviceGetOnboardingStatus).toBeInstanceOf(Function);
    expect(api.uploadPortfolio).toBeInstanceOf(Function);
    expect(api.fileRead).toBeInstanceOf(Function);
    expect(api.fileWrite).toBeInstanceOf(Function);

    [...internalMethodNames, ...unpublishedFilesystemAliases].forEach(name => {
      expect(api).not.toHaveProperty(name);
      expect(publicMethods).not.toHaveProperty(name);
    });
  });

  test.each(internalMethodNames)('keeps %s available to the internal dispatcher', name => {
    expect(
      findMethod({
        id: 1,
        payload: { method: name },
      } as any)
    ).toBeDefined();
  });
});
