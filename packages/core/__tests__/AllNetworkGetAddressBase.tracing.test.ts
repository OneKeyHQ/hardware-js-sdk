import { EDeviceType } from '@onekeyfe/hd-shared';

import AllNetworkGetAddressBase from '../src/api/allnetwork/AllNetworkGetAddressBase';
import AllNetworkGetAddress from '../src/api/allnetwork/AllNetworkGetAddress';
import AllNetworkGetAddressByLoop from '../src/api/allnetwork/AllNetworkGetAddressByLoop';
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

describe('Pro2 all-network loading lifecycle', () => {
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
      getCurrentDeviceType: jest.fn(() => EDeviceType.Pro2),
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

  test.each(['V1', 'unsupported', 'Neo'])('does not change %s device behavior', async variant => {
    const { method, calls } = setup();
    if (variant === 'V1') jest.spyOn(method.device, 'isProtocolV2').mockReturnValue(false);
    if (variant === 'Neo')
      jest.spyOn(method.device, 'getCurrentDeviceType').mockReturnValue(EDeviceType.Neo);
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

  test('runs Protocol V2 addresses one at a time so each command receives a wallet session', async () => {
    const method = new AllNetworkGetAddress({
      id: 3,
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
      isProtocolV2: jest.fn().mockReturnValue(true),
    } as any;
    method.postMessage = jest.fn();
    const callMethod = jest
      .fn()
      .mockResolvedValueOnce([{ payload: { address: '0x1' }, success: true }])
      .mockResolvedValueOnce([{ payload: { address: '0x2' }, success: true }]);
    method.callMethod = callMethod;

    await method.getAllNetworkAddress(7);

    expect(callMethod).toHaveBeenCalledTimes(2);
    expect(callMethod).toHaveBeenNthCalledWith(
      1,
      'evmGetAddress',
      expect.objectContaining({ bundle: [expect.any(Object)] }),
      7
    );
    expect(callMethod).toHaveBeenNthCalledWith(
      2,
      'evmGetAddress',
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
