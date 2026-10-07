import FirmwareUpdateV4 from '../../src/api/FirmwareUpdateV4';

import type { ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';
import type { Device } from '../../src/device/Device';
import type { Features } from '../../src/types';
import type { FirmwareUpdateV4Params } from '../../src/types/api/firmwareUpdate';

jest.mock('../../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

type InstallTarget = { target_id: number; path: string };
type PollingMethod = {
  params: FirmwareUpdateV4Params;
  isBleReconnect: () => boolean;
  protocolV2InstallNeedsReconnect: boolean;
  protocolV2ExpectedSerialNumber: string;
  protocolV2InstallBaselineVersions: Map<number, string>;
  protocolV2LatestFinalFeatures?: Features;
  protocolV2LatestFinalDeviceInfo?: ProtocolV2DeviceInfo;
  reconnectProtocolV2Device: () => Promise<void>;
  waitForProtocolV2FirmwareUpdateComplete: (
    targets: InstallTarget[],
    requireCurrentInstallStatus: boolean
  ) => Promise<void>;
  assertExpectedProtocolV2Versions: () => void;
};

type Scenario = {
  scenario: string;
  expectedTargetVersions?: FirmwareUpdateV4Params['expectedTargetVersions'];
  currentVersion?: string;
  p2Only?: boolean;
  missingBaseline?: boolean;
  loaderMode?: boolean;
  completes: boolean;
};

const scenarios: Scenario[] = [
  { scenario: 'omitted expected versions', completes: true },
  { scenario: 'empty expected versions', expectedTargetVersions: {}, completes: true },
  {
    scenario: 'only a P1 expected version',
    expectedTargetVersions: { app_v1: '1.0.3' },
    completes: true,
  },
  {
    scenario: 'matching paired expected versions',
    expectedTargetVersions: { app_v1: '1.0.3', app_v2: '1.0.3' },
    completes: true,
  },
  {
    scenario: 'a mismatched expected P2 version',
    expectedTargetVersions: { app_v2: '1.0.4' },
    completes: false,
  },
  { scenario: 'unchanged P1', currentVersion: '1.0.2', completes: false },
  { scenario: 'P2-only without expected versions', p2Only: true, completes: false },
  { scenario: 'a missing P1 baseline', missingBaseline: true, completes: false },
  { scenario: 'a device still in loader mode', loaderMode: true, completes: false },
];

describe.each([
  { transport: 'USB', isBle: false, platform: 'desktop' as const },
  { transport: 'BLE', isBle: true, platform: 'native' as const },
])('FirmwareUpdateV4 direct binaries over $transport', ({ isBle, platform }) => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe.each([
    { endpoint: 'empty records', unavailable: false },
    { endpoint: 'unavailable status handler', unavailable: true },
  ])('$endpoint without observed install evidence', ({ unavailable }) => {
    test.each(scenarios)('$scenario', async scenario => {
      let now = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      jest.spyOn(global, 'setTimeout').mockImplementation(((
        callback: () => void,
        delay: number
      ) => {
        now += delay;
        callback();
        return 0;
      }) as typeof setTimeout);

      const method = new FirmwareUpdateV4({
        id: 1,
        payload: {
          method: 'firmwareUpdateV4',
          connectId: 'pro2-optional-version-test',
          platform,
          ...(!scenario.p2Only ? { applicationP1Binary: new ArrayBuffer(1) } : {}),
          applicationP2Binary: new ArrayBuffer(1),
          ...(scenario.expectedTargetVersions !== undefined
            ? { expectedTargetVersions: scenario.expectedTargetVersions }
            : {}),
        },
      });
      method.init();

      const firmwareVersion = scenario.currentVersion ?? '1.0.3';
      const deviceInfo = {
        hw: { serial_no: 'pro2-optional-version-test' },
        main_mcu: { application: { version: firmwareVersion } },
      } as ProtocolV2DeviceInfo;
      const features = {
        mode: scenario.loaderMode ? 'bootloader' : 'normal',
        bootloaderMode: !!scenario.loaderMode,
        firmwareVersion,
      } as Features;
      const typedCall = jest.fn().mockImplementation((type: string) => {
        if (type === 'DeviceInfoGet') return { type: 'DeviceInfo', message: deviceInfo };
        if (type === 'DeviceFirmwareUpdateStatusGet') {
          if (unavailable) throw new Error('unsupported message');
          return { type: 'DeviceFirmwareUpdateStatus', message: { records: [] } };
        }
        throw new Error(`Unexpected command: ${type}`);
      });
      const probeProtocolV2RuntimeState = jest.fn().mockResolvedValue(features);
      method.device = {
        originalDescriptor: { path: 'pro2-optional-version-test' },
        getCommands: () => ({ typedCall }),
        probeProtocolV2RuntimeState,
        setCancelableAction: jest.fn(),
      } as unknown as Device;
      method.postProgressMessage = jest.fn();

      const pollingMethod = method as unknown as PollingMethod;
      expect(pollingMethod.params.expectedTargetVersions).toEqual(scenario.expectedTargetVersions);
      pollingMethod.isBleReconnect = () => isBle;
      pollingMethod.protocolV2InstallNeedsReconnect = true;
      pollingMethod.protocolV2ExpectedSerialNumber = 'pro2-optional-version-test';
      pollingMethod.protocolV2InstallBaselineVersions = new Map([
        [4, '1.0.2'],
        [5, '1.0.2'],
      ]);
      if (scenario.missingBaseline) pollingMethod.protocolV2InstallBaselineVersions.delete(4);
      pollingMethod.reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
      const targets = [
        { target_id: 4, path: 'vol0:/application_p1.bin' },
        { target_id: 5, path: 'vol0:/application_p2.bin' },
      ].filter(target => !scenario.p2Only || target.target_id === 5);

      const polling = pollingMethod.waitForProtocolV2FirmwareUpdateComplete(targets, true);
      if (scenario.completes) {
        await expect(polling).resolves.toBeUndefined();
        expect(now).toBe(0);
        expect(method.postProgressMessage).toHaveBeenCalledWith(100, 'installingFirmware');
        pollingMethod.protocolV2LatestFinalFeatures = features;
        pollingMethod.protocolV2LatestFinalDeviceInfo = deviceInfo;
        expect(() => pollingMethod.assertExpectedProtocolV2Versions()).not.toThrow();
      } else {
        await expect(polling).rejects.toMatchObject({
          params: { firmwareUpdateCode: 'FirmwareInstallTimeout' },
        });
        expect(now).toBe(600_000);
        expect(method.postProgressMessage).not.toHaveBeenCalledWith(100, 'installingFirmware');
      }
      expect(probeProtocolV2RuntimeState).toHaveBeenLastCalledWith(deviceInfo, expect.any(Number), {
        forceRuntimeContextRefresh: true,
      });
    });
  });
});
