import { EDeviceType, HardwareErrorCode, HardwareErrorCodeMessage } from '@onekeyfe/hd-shared';

import AllNetworkGetAddressBase from '../src/api/allnetwork/AllNetworkGetAddressBase';
import AllNetworkGetAddress from '../src/api/allnetwork/AllNetworkGetAddress';
import AllNetworkGetAddressByLoop from '../src/api/allnetwork/AllNetworkGetAddressByLoop';
import EvmGetAddress from '../src/api/evm/EVMGetAddress';
import { UI_REQUEST } from '../src/constants/ui-request';
import { findMethod } from '../src/api/utils';
import { getActiveRequestsByDeviceInstance } from '../src/utils/tracing';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../src/api/utils', () => ({
  findMethod: jest.fn(),
}));

class TestAllNetworkMethod extends AllNetworkGetAddressBase {
  async getAllNetworkAddress() {
    return Promise.resolve([]);
  }
}

describe.each([EDeviceType.Pro2, EDeviceType.Neo])('%s loading lifecycle', deviceType => {
  function setup(callback = false) {
    const Method = callback ? AllNetworkGetAddressByLoop : AllNetworkGetAddress;
    const method = new Method({
      id: 1,
      payload: {
        method: callback ? 'allNetworkGetAddressByLoop' : 'allNetworkGetAddress',
        connectId: 'test-device',
        callbackId: 'item',
        callbackIdFinish: 'finish',
        bundle: [
          { network: 'evm', path: "m/44'/60'/0'/0/0" },
          { network: 'sol', path: "m/44'/501'/0'" },
        ],
      },
    });
    const calls: string[] = [];
    const typedCall = jest.fn((type: string, _response: string, message: { action?: number }) => {
      calls.push(type === 'DeviceAnimationControl' ? `animation:${message.action}` : type);
      return Promise.resolve({ message: { root_fingerprint: 0 } });
    });
    method.device = {
      commands: { typedCall, disposed: false },
      isProtocolV2: jest.fn(() => true),
      getCurrentDeviceType: jest.fn(() => deviceType),
      ensureProtocolV2RuntimeContext: jest.fn(() =>
        Promise.resolve({ supported_messages: [60461] })
      ),
    } as any;
    method.postMessage = jest.fn();
    method.context = {
      registerCallbackTask: jest.fn(),
      cancelCallbackTasks: jest.fn(() => method.device.pendingCallbackPromise?.resolve()),
    } as any;
    const callMethod = jest.spyOn(method, 'callMethod').mockImplementation(name => {
      calls.push(name);
      return Promise.resolve([{ success: true, payload: {} }] as any);
    });
    return { method, calls, typedCall, callMethod };
  }

  test('keeps one session across fingerprint and all chain requests', async () => {
    const { method, calls } = setup();
    await method.run();
    expect(calls).toEqual([
      'animation:1',
      'GetPublicKey',
      'evmGetAddress',
      'solGetAddress',
      'animation:2',
    ]);
  });

  test.each(['V1', 'unsupported', 'Pro'])('does not change %s device behavior', async variant => {
    const { method, calls } = setup();
    if (variant === 'V1') jest.spyOn(method.device, 'isProtocolV2').mockReturnValue(false);
    if (variant === 'Pro')
      jest.spyOn(method.device, 'getCurrentDeviceType').mockReturnValue(EDeviceType.Pro);
    if (variant === 'unsupported') {
      jest
        .spyOn(method.device, 'ensureProtocolV2RuntimeContext')
        .mockResolvedValue({ supported_messages: [] } as any);
    }
    await method.run();
    expect(calls).toEqual(['GetPublicKey', 'evmGetAddress', 'solGetAddress']);
  });

  test('does not reconnect for cleanup after chain failure', async () => {
    const { method, calls, callMethod } = setup();
    const error = new Error('chain failed');
    callMethod.mockRejectedValue(error);
    await expect(method.run()).rejects.toBe(error);
    expect(calls).toEqual(['animation:1', 'GetPublicKey']);
  });

  test('does not replace a successful result when Stop fails', async () => {
    const { method, calls, typedCall } = setup();
    typedCall.mockResolvedValueOnce({ message: { root_fingerprint: 0 } });
    typedCall.mockResolvedValueOnce({ message: { root_fingerprint: 0 } });
    typedCall.mockImplementationOnce(() => {
      calls.push('stop-failed');
      return Promise.reject(new Error('cleanup failed'));
    });
    await expect(method.run()).resolves.toHaveLength(2);
    expect(calls).toEqual(['evmGetAddress', 'solGetAddress', 'stop-failed']);
  });

  test('does not continue wallet commands when starting the session fails', async () => {
    const { method, typedCall, callMethod } = setup();
    const error = new Error('link disconnected');
    typedCall.mockRejectedValueOnce(error);
    await expect(method.run()).rejects.toBe(error);
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(callMethod).not.toHaveBeenCalled();
  });

  test.each(['success', 'failure', 'cancel'])(
    'keeps callback loading until background %s',
    async outcome => {
      const { method, calls, callMethod } = setup(true);
      let finishChain: () => void = () => {};
      const chainPending = new Promise<void>(resolve => {
        finishChain = resolve;
      });
      callMethod.mockImplementationOnce(async () => {
        calls.push('chain-pending');
        await chainPending;
        if (outcome === 'failure') throw new Error('chain failed');
        if (outcome === 'cancel') method.abortController?.abort();
        return [{ success: true, payload: {} }] as any;
      });
      await expect(method.run()).resolves.toEqual([]);
      expect(calls).toEqual(['animation:1', 'GetPublicKey', 'chain-pending']);
      finishChain();
      await method.device.pendingCallbackPromise?.promise;
      expect(calls.filter(call => call === 'animation:2')).toHaveLength(
        outcome === 'success' ? 1 : 0
      );
      expect(method.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ callbackId: 'finish' }),
        })
      );
    }
  );

  test('does not send further commands when the fingerprint response is invalid', async () => {
    const { method, typedCall, callMethod } = setup();
    typedCall.mockResolvedValueOnce({ message: { root_fingerprint: 0 } });
    typedCall.mockResolvedValueOnce({ message: {} } as any);
    await expect(method.run()).rejects.toThrow();
    expect(callMethod).not.toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledTimes(2);
  });

  test.each(['disposed', 'replaced'])(
    'does not send cleanup through a %s connection',
    async state => {
      const { method, calls, callMethod } = setup();
      callMethod.mockImplementation(() => {
        if (state === 'disposed') method.device.commands.disposed = true;
        else method.device.commands = { typedCall: jest.fn() } as any;
        return Promise.resolve([{ success: true, payload: {} }] as any);
      });
      await method.run();
      expect(calls).toEqual(['animation:1', 'GetPublicKey']);
    }
  );
});

describe('AllNetworkGetAddressBase tracing', () => {
  test('resumes a Protocol V2 hidden wallet before running a nested chain method', async () => {
    const calls: string[] = [];
    const checkPassphraseStateSafety = jest.fn().mockImplementation(() => {
      calls.push('restore-wallet-session');
      return Promise.resolve(true);
    });
    const innerMethod = {
      checkSafetyLevelOnTestNet: jest.fn().mockResolvedValue(false),
      connectId: 'connect-id',
      deviceId: 'device-id',
      getVersionRange: jest.fn().mockReturnValue({}),
      assertProtocolSupported: jest.fn(),
      init: jest.fn(),
      name: 'evmGetAddress',
      responseID: 43,
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockImplementation(() => {
        calls.push('run-chain-method');
        return Promise.resolve([{ address: '0xhidden' }]);
      }),
      setDevice: jest.fn(),
      strictCheckDeviceSupport: false,
    };
    (findMethod as jest.Mock).mockReturnValue(innerMethod);
    const method = new TestAllNetworkMethod({
      id: 1,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        passphraseState: 'hidden-state',
        bundle: [],
      },
    });
    method.protocolV2UnlockContext = { preflightCompleted: true };
    const typedCall = jest.fn();
    method.device = {
      checkPassphraseStateSafety,
      commands: {
        typedCall,
      },
      getCurrentFirmwareType: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('V2'),
      getCurrentFirmwareVersionString: jest.fn().mockReturnValue('1.0.0'),
      getCurrentMethodVersionRange: jest
        .fn()
        .mockImplementation((getRange: (type: string) => unknown) => getRange('pro2')),
      instanceId: 'device-instance',
      isProtocolV2: jest.fn().mockReturnValue(true),
      isBootloader: jest.fn().mockReturnValue(false),
      isRomloader: jest.fn().mockReturnValue(false),
      off: jest.fn(),
      on: jest.fn(),
      state: { status: { unlocked: true } },
      updateProtocolV2Status: jest.fn(),
    } as any;

    await method.callMethod(
      'evmGetAddress',
      {
        bundle: [
          {
            _originRequestParams: {
              network: 'evm',
              path: "m/44'/60'/0'/0/0",
            },
          },
        ],
      },
      0
    );

    expect(checkPassphraseStateSafety).toHaveBeenCalledWith(
      'hidden-state',
      false,
      undefined,
      undefined,
      undefined
    );
    expect(calls).toEqual(['restore-wallet-session', 'run-chain-method']);
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('resumes a Protocol V2 Cardano hidden wallet with the Cardano seed domain', async () => {
    const calls: string[] = [];
    const checkPassphraseStateSafety = jest.fn().mockImplementation(() => {
      calls.push('resume-cardano-session');
      return Promise.resolve(true);
    });
    const innerMethod = {
      checkSafetyLevelOnTestNet: jest.fn().mockResolvedValue(false),
      connectId: 'connect-id',
      deviceId: 'device-id',
      getVersionRange: jest.fn().mockReturnValue({}),
      assertProtocolSupported: jest.fn(),
      init: jest.fn(),
      name: 'cardanoGetAddress',
      responseID: 45,
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockImplementation(() => {
        calls.push('run-cardano-method');
        return Promise.resolve([{ address: 'addr1hidden' }]);
      }),
      setDevice: jest.fn(),
      strictCheckDeviceSupport: false,
    };
    (findMethod as jest.Mock).mockReturnValue(innerMethod);
    const method = new TestAllNetworkMethod({
      id: 5,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        passphraseState: 'hidden-state',
        bundle: [],
      },
    });
    method.protocolV2UnlockContext = { preflightCompleted: true };
    const typedCall = jest.fn();
    method.device = {
      checkPassphraseStateSafety,
      commands: {
        typedCall,
      },
      getCurrentFirmwareType: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('V2'),
      getCurrentFirmwareVersionString: jest.fn().mockReturnValue('1.0.0'),
      getCurrentMethodVersionRange: jest
        .fn()
        .mockImplementation((getRange: (type: string) => unknown) => getRange('pro2')),
      instanceId: 'device-instance',
      isProtocolV2: jest.fn().mockReturnValue(true),
      isBootloader: jest.fn().mockReturnValue(false),
      isRomloader: jest.fn().mockReturnValue(false),
      off: jest.fn(),
      on: jest.fn(),
      state: { status: { unlocked: true } },
      updateProtocolV2Status: jest.fn(),
    } as any;

    await method.callMethod(
      'cardanoGetAddress',
      {
        bundle: [
          {
            _originRequestParams: {
              network: 'ada',
              path: "m/1852'/1815'/0'/0/0",
            },
          },
        ],
      },
      0
    );

    expect(checkPassphraseStateSafety).toHaveBeenCalledWith(
      'hidden-state',
      false,
      undefined,
      true,
      undefined
    );
    expect(calls).toEqual(['resume-cardano-session', 'run-cardano-method']);
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('resumes a Protocol V2 standard wallet before running a nested chain method', async () => {
    const calls: string[] = [];
    const checkPassphraseStateSafety = jest.fn().mockImplementation(() => {
      calls.push('resume-standard-session');
      return Promise.resolve(true);
    });
    const innerMethod = {
      checkSafetyLevelOnTestNet: jest.fn().mockResolvedValue(false),
      connectId: 'connect-id',
      deviceId: 'device-id',
      getVersionRange: jest.fn().mockReturnValue({}),
      assertProtocolSupported: jest.fn(),
      init: jest.fn(),
      name: 'evmGetAddress',
      responseID: 44,
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockImplementation(() => {
        calls.push('run-chain-method');
        return Promise.resolve([{ address: '0xstandard' }]);
      }),
      setDevice: jest.fn(),
      strictCheckDeviceSupport: false,
    };
    (findMethod as jest.Mock).mockReturnValue(innerMethod);
    const method = new TestAllNetworkMethod({
      id: 2,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        useEmptyPassphrase: true,
        bundle: [],
      },
    });
    method.protocolV2UnlockContext = {
      preflightCompleted: true,
      preflightMainPinSelected: true,
    };
    const typedCall = jest.fn();
    method.device = {
      checkPassphraseStateSafety,
      commands: {
        typedCall,
      },
      getCurrentFirmwareType: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('V2'),
      getCurrentFirmwareVersionString: jest.fn().mockReturnValue('1.0.0'),
      getCurrentMethodVersionRange: jest
        .fn()
        .mockImplementation((getRange: (type: string) => unknown) => getRange('pro2')),
      instanceId: 'device-instance',
      isProtocolV2: jest.fn().mockReturnValue(true),
      isBootloader: jest.fn().mockReturnValue(false),
      isRomloader: jest.fn().mockReturnValue(false),
      off: jest.fn(),
      on: jest.fn(),
      state: { status: { unlocked: true } },
      updateProtocolV2Status: jest.fn(),
    } as any;

    await method.callMethod(
      'evmGetAddress',
      {
        bundle: [
          {
            _originRequestParams: {
              network: 'evm',
              path: "m/44'/60'/0'/0/0",
            },
          },
        ],
      },
      0
    );

    expect(checkPassphraseStateSafety).toHaveBeenCalledWith(
      undefined,
      true,
      undefined,
      undefined,
      true
    );
    expect(calls).toEqual(['resume-standard-session', 'run-chain-method']);
    expect(typedCall).not.toHaveBeenCalled();
  });

  function createV2NestedHarness(payload: Record<string, unknown>) {
    const calls: string[] = [];
    const checkPassphraseStateSafety = jest
      .fn()
      .mockImplementation((_state, _empty, _skip, deriveCardano) => {
        calls.push(deriveCardano ? 'resume-cardano-session' : 'restore-wallet-session');
        return Promise.resolve(true);
      });
    const method = new TestAllNetworkMethod({
      id: 10,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        bundle: [],
        ...payload,
      },
    });
    method.protocolV2UnlockContext = { preflightCompleted: true };
    method.device = {
      checkPassphraseStateSafety,
      commands: {
        typedCall: jest.fn(),
      },
      getCurrentFirmwareType: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('V2'),
      getCurrentFirmwareVersionString: jest.fn().mockReturnValue('1.0.0'),
      getCurrentMethodVersionRange: jest
        .fn()
        .mockImplementation((getRange: (type: string) => unknown) => getRange('pro2')),
      instanceId: 'device-instance',
      isProtocolV2: jest.fn().mockReturnValue(true),
      isBootloader: jest.fn().mockReturnValue(false),
      isRomloader: jest.fn().mockReturnValue(false),
      off: jest.fn(),
      on: jest.fn(),
      state: { status: { unlocked: true } },
      updateProtocolV2Status: jest.fn(),
    } as any;
    return { calls, checkPassphraseStateSafety, method };
  }

  function mockInnerChainMethod(name: string, onRun: () => void) {
    return {
      checkSafetyLevelOnTestNet: jest.fn().mockResolvedValue(false),
      connectId: 'connect-id',
      deviceId: 'device-id',
      getVersionRange: jest.fn().mockReturnValue({}),
      assertProtocolSupported: jest.fn(),
      init: jest.fn(),
      name,
      responseID: 50,
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockImplementation(() => {
        onRun();
        return Promise.resolve([{ address: `${name}-address` }]);
      }),
      setDevice: jest.fn(),
      strictCheckDeviceSupport: false,
    };
  }

  function createGroupedAddressHarness(showOnOneKey?: boolean) {
    const { method: nestedHarness, checkPassphraseStateSafety } = createV2NestedHarness({});
    const bundle = [0, 1, 2].map(index => ({
      network: 'evm',
      path: `m/44'/60'/${index}'/0/0`,
      showOnOneKey,
    }));
    const method = new AllNetworkGetAddress({
      id: 11,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        useEmptyPassphrase: true,
        bundle,
      },
    });
    method.protocolV2UnlockContext = nestedHarness.protocolV2UnlockContext;
    method.abortController = new AbortController();
    method.device = nestedHarness.device;
    method.device.getCurrentDeviceType = jest.fn().mockReturnValue(EDeviceType.Pro2);
    method.device.toMessageObject = jest.fn().mockReturnValue({});
    method.postMessage = jest.fn();
    const typedCall = jest
      .fn()
      .mockImplementation((_type: string, _response: string, params: { address_n: number[] }) => {
        const index = params.address_n[2] - 0x80000000;
        if (index === 1) return Promise.reject(new Error('Forbidden key path'));
        return Promise.resolve({ message: { address: `address-${index}` } });
      });
    method.device.commands.typedCall = typedCall;
    (findMethod as jest.Mock).mockImplementation(message => new EvmGetAddress(message));
    method.init();
    return { method, typedCall, checkPassphraseStateSafety, bundle };
  }

  test.each([false, true, undefined])(
    'isolates a V2 address failure without repeating device confirmations (showOnOneKey=%s)',
    async showOnOneKey => {
      const { method, typedCall, checkPassphraseStateSafety, bundle } =
        createGroupedAddressHarness(showOnOneKey);

      const result = await method.getAllNetworkAddress(7);

      expect(result.map(item => item.success)).toEqual([true, false, true]);
      expect(result.map(item => item.path)).toEqual(bundle.map(item => item.path));
      expect(result[0].payload).toMatchObject({ address: 'address-0', rootFingerprint: 7 });
      expect(result[1].payload).toMatchObject({
        code: HardwareErrorCode.CallMethodInvalidParameter,
      });
      expect(result[2].payload).toMatchObject({ address: 'address-2', rootFingerprint: 7 });
      expect(typedCall.mock.calls.map(([, , params]) => params.address_n[2] - 0x80000000)).toEqual(
        showOnOneKey === false ? [0, 1, 0, 1, 2] : [0, 1, 2]
      );
      expect(checkPassphraseStateSafety).toHaveBeenCalledTimes(1);
      expect(
        jest
          .mocked(method.postMessage)
          .mock.calls.flatMap(([message]) =>
            message.type === UI_REQUEST.PREVIOUS_ADDRESS_RESULT ? [message.payload.data.path] : []
          )
      ).toEqual([bundle[0].path, bundle[2].path]);
      expect(method.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: UI_REQUEST.DEVICE_PROGRESS, payload: { progress: 100 } })
      );
      expect(getActiveRequestsByDeviceInstance('device-instance')).toEqual([]);
    }
  );

  test('preserves repeated input addresses when suppressing V2 retry notifications', async () => {
    const { method, bundle } = createGroupedAddressHarness(false);
    method.payload.bundle = [bundle[0], bundle[0], bundle[1], bundle[0], bundle[2]];

    const result = await method.getAllNetworkAddress(7);

    expect(result.map(item => item.success)).toEqual([true, true, false, true, true]);
    expect(
      jest
        .mocked(method.postMessage)
        .mock.calls.flatMap(([message]) =>
          message.type === UI_REQUEST.PREVIOUS_ADDRESS_RESULT ? [message.payload.data.path] : []
        )
    ).toEqual([bundle[0].path, bundle[0].path, bundle[0].path, bundle[2].path]);
  });

  test('forwards successful V2 address notifications before the batch finishes', async () => {
    const { method, typedCall, bundle } = createGroupedAddressHarness(false);
    typedCall.mockImplementation((_type, _response, params) => {
      const index = params.address_n[2] - 0x80000000;
      expect(
        jest
          .mocked(method.postMessage)
          .mock.calls.filter(([message]) => message.type === UI_REQUEST.PREVIOUS_ADDRESS_RESULT)
      ).toHaveLength(index);
      return Promise.resolve({ message: { address: `address-${index}` } });
    });

    const result = await method.getAllNetworkAddress(7);

    expect(result.map(item => item.success)).toEqual([true, true, true]);
    expect(typedCall).toHaveBeenCalledTimes(3);
    expect(
      jest
        .mocked(method.postMessage)
        .mock.calls.flatMap(([message]) =>
          message.type === UI_REQUEST.PREVIOUS_ADDRESS_RESULT ? [message.payload.data.path] : []
        )
    ).toEqual(bundle.map(item => item.path));
  });

  test('does not retry a failed V2 link as individual address requests', async () => {
    const { method, typedCall } = createGroupedAddressHarness(false);
    const error = new Error('link disconnected');
    typedCall.mockRejectedValueOnce(error);

    await expect(method.getAllNetworkAddress(7)).rejects.toBe(error);

    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('does not retry a V2 wallet mismatch as individual address requests', async () => {
    const { method, typedCall, checkPassphraseStateSafety } = createGroupedAddressHarness(false);
    checkPassphraseStateSafety.mockResolvedValueOnce(false);

    await expect(method.getAllNetworkAddress(7)).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceCheckPassphraseStateError,
    });

    expect(checkPassphraseStateSafety).toHaveBeenCalledTimes(1);
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('does not start individual retries after cancellation', async () => {
    const { method, typedCall } = createGroupedAddressHarness(false);
    typedCall.mockImplementationOnce(() => {
      method.abortController?.abort();
      return Promise.reject(new Error('Forbidden key path'));
    });

    await expect(method.getAllNetworkAddress(7)).rejects.toThrow(
      HardwareErrorCodeMessage[HardwareErrorCode.RepeatUnlocking]
    );

    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('preserves Protocol V1 grouped error handling', async () => {
    const { method, typedCall, checkPassphraseStateSafety } = createGroupedAddressHarness(false);
    jest.spyOn(method.device, 'isProtocolV2').mockReturnValue(false);
    jest.spyOn(method.device, 'getProtocol').mockReturnValue('V1');

    const result = await method.getAllNetworkAddress(7);

    expect(result.map(item => item.success)).toEqual([false, false, false]);
    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(checkPassphraseStateSafety).not.toHaveBeenCalled();
  });

  test('reuses a Protocol V2 hidden-wallet session across later nested chain methods', async () => {
    const { calls, checkPassphraseStateSafety, method } = createV2NestedHarness({
      passphraseState: 'hidden-state',
    });
    (findMethod as jest.Mock)
      .mockReturnValueOnce(mockInnerChainMethod('evmGetAddress', () => calls.push('run-evm')))
      .mockReturnValueOnce(mockInnerChainMethod('solGetAddress', () => calls.push('run-sol')));

    await method.callMethod(
      'evmGetAddress',
      {
        bundle: [{ _originRequestParams: { network: 'evm', path: "m/44'/60'/0'/0/0" } }],
      },
      0
    );
    await method.callMethod(
      'solGetAddress',
      {
        bundle: [{ _originRequestParams: { network: 'sol', path: "m/44'/501'/0'" } }],
      },
      0
    );

    expect(checkPassphraseStateSafety).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['restore-wallet-session', 'run-evm', 'run-sol']);
  });

  test('resumes Cardano after a Protocol V2 standard-domain session, then reuses it', async () => {
    const { calls, checkPassphraseStateSafety, method } = createV2NestedHarness({
      passphraseState: 'hidden-state',
    });
    (findMethod as jest.Mock)
      .mockReturnValueOnce(mockInnerChainMethod('evmGetAddress', () => calls.push('run-evm')))
      .mockReturnValueOnce(
        mockInnerChainMethod('cardanoGetAddress', () => calls.push('run-cardano'))
      )
      .mockReturnValueOnce(mockInnerChainMethod('solGetAddress', () => calls.push('run-sol')));

    await method.callMethod(
      'evmGetAddress',
      {
        bundle: [{ _originRequestParams: { network: 'evm', path: "m/44'/60'/0'/0/0" } }],
      },
      0
    );
    await method.callMethod(
      'cardanoGetAddress',
      {
        bundle: [{ _originRequestParams: { network: 'ada', path: "m/1852'/1815'/0'/0/0" } }],
      },
      0
    );
    await method.callMethod(
      'solGetAddress',
      {
        bundle: [{ _originRequestParams: { network: 'sol', path: "m/44'/501'/0'" } }],
      },
      0
    );

    expect(checkPassphraseStateSafety).toHaveBeenCalledTimes(2);
    expect(checkPassphraseStateSafety).toHaveBeenNthCalledWith(
      2,
      'hidden-state',
      false,
      undefined,
      true,
      undefined
    );
    expect(calls).toEqual([
      'restore-wallet-session',
      'run-evm',
      'resume-cardano-session',
      'run-cardano',
      'run-sol',
    ]);
  });

  test('batches Protocol V2 same-method addresses onto one nested chain call', async () => {
    const method = new AllNetworkGetAddress({
      id: 3,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        useEmptyPassphrase: true,
        bundle: [
          { network: 'evm', path: "m/44'/60'/0'/0/0", showOnOneKey: false },
          { network: 'evm', path: "m/44'/60'/0'/0/1", showOnOneKey: false },
        ],
      },
    });
    method.device = {
      isProtocolV2: jest.fn().mockReturnValue(true),
    } as any;
    method.postMessage = jest.fn();
    const callMethod = jest.fn().mockResolvedValue([
      { payload: { address: '0x1' }, success: true },
      { payload: { address: '0x2' }, success: true },
    ]);
    method.callMethod = callMethod;

    await method.getAllNetworkAddress(7);

    expect(callMethod).toHaveBeenCalledTimes(1);
    expect(callMethod).toHaveBeenCalledWith(
      'evmGetAddress',
      expect.objectContaining({ bundle: [expect.any(Object), expect.any(Object)] }),
      7,
      expect.any(Function)
    );
  });

  test('batches Protocol V2 hidden-wallet same-method addresses onto one nested chain call', async () => {
    const method = new AllNetworkGetAddress({
      id: 6,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        passphraseState: 'hidden-state',
        bundle: [
          { network: 'evm', path: "m/44'/60'/0'/0/0", showOnOneKey: false },
          { network: 'evm', path: "m/44'/60'/0'/0/1", showOnOneKey: false },
          { network: 'sol', path: "m/44'/501'/0'", showOnOneKey: false },
        ],
      },
    });
    method.device = {
      isProtocolV2: jest.fn().mockReturnValue(true),
    } as any;
    method.postMessage = jest.fn();
    const callMethod = jest
      .fn()
      .mockResolvedValueOnce([
        { payload: { address: '0x1' }, success: true },
        { payload: { address: '0x2' }, success: true },
      ])
      .mockResolvedValueOnce([{ payload: { address: 'sol1' }, success: true }]);
    method.callMethod = callMethod;

    await method.getAllNetworkAddress(7);

    expect(callMethod).toHaveBeenCalledTimes(2);
    expect(callMethod).toHaveBeenNthCalledWith(
      1,
      'evmGetAddress',
      expect.objectContaining({ bundle: [expect.any(Object), expect.any(Object)] }),
      7,
      expect.any(Function)
    );
    expect(callMethod).toHaveBeenNthCalledWith(
      2,
      'solGetAddress',
      expect.objectContaining({ bundle: [expect.any(Object)] }),
      7
    );
  });

  test('keeps same-method address batching for Protocol V1', async () => {
    const method = new AllNetworkGetAddress({
      id: 4,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        useEmptyPassphrase: true,
        bundle: [
          { network: 'evm', path: "m/44'/60'/0'/0/0" },
          { network: 'evm', path: "m/44'/60'/0'/0/1" },
        ],
      },
    });
    method.device = {
      isProtocolV2: jest.fn().mockReturnValue(false),
    } as any;
    method.postMessage = jest.fn();
    const callMethod = jest.fn().mockResolvedValue([
      { payload: { address: '0x1' }, success: true },
      { payload: { address: '0x2' }, success: true },
    ]);
    method.callMethod = callMethod;

    await method.getAllNetworkAddress(7);

    expect(callMethod).toHaveBeenCalledTimes(1);
    expect(callMethod).toHaveBeenCalledWith(
      'evmGetAddress',
      expect.objectContaining({ bundle: [expect.any(Object), expect.any(Object)] }),
      7
    );
  });

  test('releases the nested request context when an unhandled error escapes', async () => {
    const deviceInstanceId = 'device-instance';
    const innerMethod = {
      checkSafetyLevelOnTestNet: jest.fn().mockResolvedValue(false),
      connectId: 'connect-id',
      deviceId: 'device-id',
      getVersionRange: jest.fn().mockReturnValue({}),
      assertProtocolSupported: jest.fn(),
      init: jest.fn(),
      name: 'xrpGetAddress',
      responseID: 42,
      run: jest.fn().mockRejectedValue(new Error('address failed')),
      setDevice: jest.fn(),
      strictCheckDeviceSupport: false,
    };
    (findMethod as jest.Mock).mockReturnValue(innerMethod);
    const method = new TestAllNetworkMethod({
      id: 1,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        bundle: [],
      },
    });
    method.device = {
      instanceId: deviceInstanceId,
      getCurrentFirmwareType: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('V1'),
      getCurrentFirmwareVersionString: jest.fn().mockReturnValue('1.0.0'),
      getCurrentMethodVersionRange: jest
        .fn()
        .mockImplementation((getRange: (type: string) => unknown) => getRange('classic')),
      isProtocolV2: jest.fn().mockReturnValue(false),
      off: jest.fn(),
      on: jest.fn(),
    } as any;

    await expect(
      method.callMethod(
        'xrpGetAddress',
        {
          bundle: [
            {
              _originRequestParams: {
                network: 'xrp',
                path: "m/44'/144'/0'/0/0",
              },
            },
          ],
        },
        0
      )
    ).rejects.toThrow('address failed');

    expect(getActiveRequestsByDeviceInstance(deviceInstanceId)).toEqual([]);
  });
});
