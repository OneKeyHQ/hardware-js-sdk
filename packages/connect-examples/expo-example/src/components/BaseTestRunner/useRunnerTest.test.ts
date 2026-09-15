import { useContext } from 'react';
import { useSetAtom, useStore } from 'jotai';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { getProtocolAwareFeatures } from '../../utils/protocolAwareFeatures';
import {
  executeProtocolAwareMethod,
  isMethodSupportedOnProtocol,
} from '../../utils/protocolAwareMethod';
import { useRunnerTest } from './useRunnerTest';

jest.mock('react', () => ({
  useContext: jest.fn(),
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
  useRef: (current: unknown) => ({ current }),
}));
jest.mock('jotai', () => ({ useSetAtom: jest.fn(), useStore: jest.fn() }), { virtual: true });
jest.mock('@onekeyfe/hd-core', () => ({ UI_EVENT: 'ui', getDeviceType: jest.fn() }));
jest.mock('../../provider/HardwareSDKContext', () => ({ __esModule: true, default: {} }));
jest.mock('../../provider/DeviceProvider', () => ({
  useDevice: () => ({ selectedDevice: { connectId: 'connection', connectProtocol: 'V2' } }),
}));
jest.mock('../../utils/protocolAwareFeatures', () => ({ getProtocolAwareFeatures: jest.fn() }));
jest.mock('../../utils/protocolAwareMethod', () => ({
  createProtocolUnsupportedResponse: jest.fn(),
  executeProtocolAwareMethod: jest.fn(),
  isMethodSupportedOnProtocol: jest.fn(),
}));
jest.mock('./Context/TestRunnerProvider', () => ({ TestRunnerContext: {} }));
jest.mock('./Context/TestRunnerVerifyProvider', () => ({}));

function setup() {
  const sdk = { removeAllListeners: jest.fn(), cancel: jest.fn() };
  let logs: string[] = [];
  const context = {
    setRunnerState: jest.fn(),
    setRunnerLogs: jest.fn((next: string[] | ((previous: string[]) => string[])) => {
      logs = typeof next === 'function' ? next(logs) : next;
    }),
    setTimestampBeginTest: jest.fn(),
    setTimestampEndTest: jest.fn(),
    setRunningDeviceFeatures: jest.fn(),
    setRunningOneKeyDeviceFeatures: jest.fn(),
    setItemValues: jest.fn(),
    callbacks: {},
  };
  (useContext as jest.Mock).mockReturnValueOnce({ sdk }).mockReturnValueOnce(context);
  const setVerifyState = jest.fn();
  (useSetAtom as jest.Mock).mockReturnValueOnce(setVerifyState).mockReturnValue(jest.fn());
  (useStore as jest.Mock).mockReturnValue({ get: jest.fn(() => ({})) });
  const config = {
    initTestCase: jest.fn(),
    generateRequestParams: jest.fn(),
    processResponse: jest.fn(),
    removeHardwareListener: jest.fn(),
  };
  function RunnerHarness() {
    return useRunnerTest(config);
  }
  const runner = RunnerHarness();
  return { context, config, runner, sdk, setVerifyState, getLogs: () => logs };
}

beforeEach(() => {
  jest.resetAllMocks();
});

it('shows a failed device-state read, cleans up, and allows another run', async () => {
  const { context, config, runner, sdk, getLogs } = setup();
  (getProtocolAwareFeatures as jest.Mock).mockResolvedValue({
    success: false,
    payload: { error: 'Wallet not initialized' },
  });

  await runner.beginTest();

  expect(context.setRunnerState).toHaveBeenLastCalledWith('stopped');
  expect(context.setTimestampBeginTest).toHaveBeenCalledWith(expect.any(Number));
  expect(context.setTimestampEndTest).toHaveBeenLastCalledWith(expect.any(Number));
  expect(getLogs()).toEqual(['测试中止：读取设备状态失败：Wallet not initialized']);
  expect(config.initTestCase).not.toHaveBeenCalled();
  expect(config.removeHardwareListener).toHaveBeenCalledWith(sdk);

  (getProtocolAwareFeatures as jest.Mock).mockResolvedValue({
    success: true,
    payload: { protocol: 'V2' },
  });
  config.initTestCase.mockResolvedValue({ title: 'test', data: [] });
  await runner.beginTest();
  expect(context.setRunnerState).toHaveBeenLastCalledWith('done');
  expect(getLogs()).toEqual([]);
});

it('stops with a visible reason when no test cases are generated', async () => {
  const { context, config, runner, getLogs } = setup();
  (getProtocolAwareFeatures as jest.Mock).mockResolvedValue({
    success: true,
    payload: { protocol: 'V2' },
  });
  config.initTestCase.mockResolvedValue(undefined);

  await runner.beginTest();

  expect(context.setRunnerState).toHaveBeenLastCalledWith('stopped');
  expect(context.setTimestampEndTest).toHaveBeenLastCalledWith(expect.any(Number));
  expect(getLogs()).toEqual(['测试中止：未生成测试用例，请检查测试配置']);
  expect(config.generateRequestParams).not.toHaveBeenCalled();
});

it('also surfaces thrown errors during preparation', async () => {
  const { context, runner, getLogs } = setup();
  (getProtocolAwareFeatures as jest.Mock).mockRejectedValue(new Error('Device disconnected'));

  await runner.beginTest();

  expect(context.setRunnerState).toHaveBeenLastCalledWith('stopped');
  expect(getLogs()).toEqual(['测试中止：Device disconnected']);
});

it.each([
  [HardwareErrorCode.DeviceNotSupportMethod, 'skip'],
  [HardwareErrorCode.ActionCancelled, 'warning'],
  [HardwareErrorCode.RuntimeError, 'fail'],
])('preserves the failure reason for code %s as %s', async (code, verify) => {
  const { config, runner, setVerifyState } = setup();
  (getProtocolAwareFeatures as jest.Mock).mockResolvedValue({
    success: true,
    payload: { protocol: 'V2' },
  });
  config.initTestCase.mockResolvedValue({ title: 'test', data: [{ $key: 'case' }] });
  config.generateRequestParams.mockResolvedValue({ method: 'testMethod', params: {} });
  (isMethodSupportedOnProtocol as jest.Mock).mockReturnValue(true);
  (executeProtocolAwareMethod as jest.Mock).mockResolvedValue({
    success: false,
    payload: { code, error: 'SDK failure reason' },
  });

  await runner.beginTest();

  expect(setVerifyState).toHaveBeenLastCalledWith({
    key: 'case',
    newState: { verify, error: 'SDK failure reason', ext: undefined },
  });
  expect(config.processResponse).not.toHaveBeenCalled();
});
