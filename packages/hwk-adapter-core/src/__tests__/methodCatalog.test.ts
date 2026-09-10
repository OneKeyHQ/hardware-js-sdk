import {
  ALL_NETWORK_METHOD_NAMES,
  canReplayHardwareMethodAfterTransportFailure,
  getHardwareMethodMetadata,
  isAllNetworkMethodName,
  operationMayHaveCompletedParams,
} from '../index';

describe('hardware method catalog', () => {
  it('describes current allNetwork methods and their chains', () => {
    expect(ALL_NETWORK_METHOD_NAMES).toEqual([
      'evmGetAddress',
      'btcGetAddress',
      'btcGetPublicKey',
      'solGetAddress',
      'tronGetAddress',
    ]);
    expect(getHardwareMethodMetadata('btcGetPublicKey')).toEqual({
      chain: 'btc',
      allNetwork: true,
      replayAfterTransportFailure: 'safe',
    });
    expect(getHardwareMethodMetadata('evmSignTransaction')).toEqual({
      chain: 'evm',
      allNetwork: false,
      replayAfterTransportFailure: 'unsafe',
    });
  });

  it('narrows allNetwork method names without guessing from the network', () => {
    expect(isAllNetworkMethodName('btcGetAddress')).toBe(true);
    expect(isAllNetworkMethodName('btcGetPublicKey')).toBe(true);
    expect(isAllNetworkMethodName('btcSignTransaction')).toBe(false);
    expect(isAllNetworkMethodName('notARealMethod')).toBe(false);
  });

  it('allows ambiguous transport replay only for read-only operations', () => {
    expect(canReplayHardwareMethodAfterTransportFailure('btcGetAddress')).toBe(true);
    expect(canReplayHardwareMethodAfterTransportFailure('getFeatures')).toBe(true);
    expect(canReplayHardwareMethodAfterTransportFailure('btcSignPsbt')).toBe(false);
    expect(canReplayHardwareMethodAfterTransportFailure('wipeDevice')).toBe(false);
    expect(canReplayHardwareMethodAfterTransportFailure('futureMutation')).toBe(false);
  });

  it('builds the shared ambiguous-operation marker', () => {
    expect(operationMayHaveCompletedParams('evmSignMessage', { interactionId: 'test' })).toEqual({
      interactionId: 'test',
      operationMayHaveCompleted: true,
      method: 'evmSignMessage',
    });
  });
});
