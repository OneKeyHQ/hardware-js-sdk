import { HardwareErrorCode, failure, runAllNetworkGetAddress } from '@onekeyfe/hwk-adapter-core';

import { debugLog } from '../../utils/debugLog';

import type {
  AllNetworkAddressParams,
  AllNetworkAddressResponse,
  AllNetworkGetAddressParams,
  AllNetworkMethodName,
  BtcAddress,
  BtcPublicKey,
  ChainForFingerprint,
  EvmAddress,
  ICommonCallParams,
  Response,
  SolAddress,
  TronAddress,
} from '@onekeyfe/hwk-adapter-core';

export type LedgerInstallAppContext = {
  deviceOutOfMemoryError?: Error;
  /**
   * Apps for which installApp has resolved (successfully or not) within
   * this bundle. Prevents an install-loop when DMK reports installApp
   * success but the app is still missing on the device — without this,
   * the retried main call would hit AppNotInstalled again and re-enter
   * the install flow, prompting the user a second time.
   */
  installAttemptedAppNames?: Set<string>;
};

export type LedgerCallChain = <T>(
  connectId: string,
  deviceId: string,
  chain: string,
  method: string,
  params: unknown,
  commonParams?: ICommonCallParams,
  skipFingerprint?: boolean,
  installContext?: LedgerInstallAppContext
) => Promise<Response<T>>;

export type LedgerGetChainFingerprint = (
  connectId: string,
  chain: ChainForFingerprint
) => Promise<Response<string>>;

const LEDGER_BTC_NETWORK_COIN_MAP: Partial<Record<string, string>> = {
  tbtc: 'Testnet',
  bch: 'Bcash',
  ltc: 'Litecoin',
  neurai: 'Neurai',
};

const LEDGER_UNSUPPORTED_ALLNETWORK_NETWORKS = new Set(['doge', 'dogecoin']);

export function createAllNetworkGetAddress({
  callChain,
  getChainFingerprint,
}: {
  callChain: LedgerCallChain;
  getChainFingerprint: LedgerGetChainFingerprint;
}) {
  return async function allNetworkGetAddress(
    connectId: string,
    _deviceId: string,
    params: AllNetworkGetAddressParams
  ): Promise<Response<AllNetworkAddressResponse[]>> {
    // Bundle-level REQ/RES. Each item inside still produces its own [REQ]/[RES]
    // pair via connectorCall — this top-level trace shows the batch shape so a
    // log reader can correlate the user's intent with the per-item activity.
    debugLog('[LedgerAdapter][REQ]', { method: 'allNetworkGetAddress', connectId, params });

    const installContext: LedgerInstallAppContext = {};
    const commonParams: ICommonCallParams = {
      autoInstallApp: params.autoInstallApp,
    };
    const chainFingerprints = new Map<ChainForFingerprint, string>();

    const result = await runAllNetworkGetAddress({
      connectId,
      deviceId: _deviceId,
      params,
      normalizeItem: normalizeLedgerAllNetworkItem,
      buildUnsupportedNetworkResponse: item =>
        isUnsupportedLedgerAllNetworkNetwork(item)
          ? buildUnsupportedNetworkResponse(item)
          : undefined,
      callItem: async ({ method, chain, item }) => {
        const itemDeviceId = getItemDeviceId(item) ?? chainFingerprints.get(chain) ?? '';
        return callAllNetworkMethod(
          callChain,
          connectId,
          itemDeviceId,
          method,
          item,
          commonParams,
          installContext
        );
      },
      attachIdentity: async ({ item, chain, payload }) =>
        attachLedgerIdentity(
          getChainFingerprint,
          connectId,
          item,
          chain,
          payload,
          chainFingerprints
        ),
      shouldAbortBundle: isTopLevelAllNetworkFailure,
      buildTopLevelFailure: response => {
        const code = response.payload?.code ?? HardwareErrorCode.DeviceMismatch;
        return failure(
          code as HardwareErrorCode,
          response.payload?.error ?? 'All-network get-address aborted',
          response.payload?.params
        );
      },
    });
    debugLog('[LedgerAdapter][RES]', {
      method: 'allNetworkGetAddress',
      success: result.success,
      payload: result,
    });
    return result;
  };
}

function isTopLevelAllNetworkFailure(response: AllNetworkAddressResponse): boolean {
  if (response.success) {
    return false;
  }
  const code = response.payload?.code;
  // User said "no" — SDK-dialog cancel and on-device reject both end the batch.
  return (
    code === HardwareErrorCode.DeviceMismatch ||
    code === HardwareErrorCode.UserAborted ||
    code === HardwareErrorCode.UserRejected
  );
}

function getItemDeviceId(item: AllNetworkAddressParams): string | undefined {
  const { deviceId } = item as { deviceId?: unknown };
  return typeof deviceId === 'string' && deviceId.length > 0 ? deviceId : undefined;
}

function isUnsupportedLedgerAllNetworkNetwork(item: AllNetworkAddressParams): boolean {
  return LEDGER_UNSUPPORTED_ALLNETWORK_NETWORKS.has(item.network.toLowerCase());
}

function buildUnsupportedNetworkResponse(item: AllNetworkAddressParams): AllNetworkAddressResponse {
  return {
    ...item,
    success: false,
    payload: {
      code: HardwareErrorCode.ChainNotSupported,
      error: `Ledger allNetwork does not support ${
        item.network.toLowerCase() === 'doge' ? 'Dogecoin' : item.network
      }`,
    },
  };
}

function normalizeLedgerAllNetworkItem(
  method: AllNetworkMethodName,
  item: AllNetworkAddressParams
): AllNetworkAddressParams {
  if (method !== 'btcGetAddress' && method !== 'btcGetPublicKey') {
    return item;
  }

  const itemWithCoin = item as AllNetworkAddressParams & { coin?: unknown };
  if (itemWithCoin.coin) {
    return item;
  }

  const coin = LEDGER_BTC_NETWORK_COIN_MAP[item.network];
  return coin ? { ...item, coin } : item;
}

async function attachLedgerIdentity(
  getChainFingerprint: LedgerGetChainFingerprint,
  connectId: string,
  item: AllNetworkAddressParams,
  chain: ChainForFingerprint,
  payload: Record<string, unknown>,
  chainFingerprints: Map<ChainForFingerprint, string>
): Promise<AllNetworkAddressResponse> {
  const fingerprint =
    getItemDeviceId(item) ||
    chainFingerprints.get(chain) ||
    (await bootstrapChainFingerprint(getChainFingerprint, connectId, chain));

  if (!fingerprint) {
    return buildFingerprintBootstrapFailure(item, chain);
  }
  chainFingerprints.set(chain, fingerprint);

  return {
    ...item,
    success: true,
    payload: {
      ...payload,
      deviceIdentity: {
        vendor: 'ledger',
        type: 'chainFingerprint',
        chain,
        value: fingerprint,
      },
      chainFingerprint: fingerprint,
      chainFingerprintChain: chain,
    },
  };
}

async function bootstrapChainFingerprint(
  getChainFingerprint: LedgerGetChainFingerprint,
  connectId: string,
  chain: ChainForFingerprint
): Promise<string> {
  const response = await getChainFingerprint(connectId, chain);
  return response.success ? response.payload : '';
}

function buildFingerprintBootstrapFailure(
  item: AllNetworkAddressParams,
  chain: ChainForFingerprint
): AllNetworkAddressResponse {
  return {
    ...item,
    success: false,
    payload: {
      code: HardwareErrorCode.DeviceMismatch,
      error: `Could not establish chain fingerprint for ${chain} after device call; refusing to return unverifiable result. Please retry.`,
    },
  };
}

async function callAllNetworkMethod(
  callChain: LedgerCallChain,
  connectId: string,
  deviceId: string,
  method: AllNetworkMethodName,
  item: AllNetworkAddressParams,
  commonParams: ICommonCallParams,
  installContext: LedgerInstallAppContext
): Promise<Response<unknown>> {
  switch (method) {
    case 'evmGetAddress':
      return callChain<EvmAddress>(
        connectId,
        deviceId,
        'evm',
        'evmGetAddress',
        item,
        commonParams,
        false,
        installContext
      );
    case 'btcGetAddress':
      return callChain<BtcAddress>(
        connectId,
        deviceId,
        'btc',
        'btcGetAddress',
        item,
        commonParams,
        false,
        installContext
      );
    case 'btcGetPublicKey':
      return callChain<BtcPublicKey>(
        connectId,
        deviceId,
        'btc',
        'btcGetPublicKey',
        item,
        commonParams,
        false,
        installContext
      );
    case 'solGetAddress':
      return callChain<SolAddress>(
        connectId,
        deviceId,
        'sol',
        'solGetAddress',
        item,
        commonParams,
        false,
        installContext
      );
    case 'tronGetAddress':
      return callChain<TronAddress>(
        connectId,
        deviceId,
        'tron',
        'tronGetAddress',
        item,
        commonParams,
        false,
        installContext
      );
    default:
      throw Object.assign(new Error(`Unsupported allNetwork method: ${method}`), {
        code: HardwareErrorCode.InvalidParams,
      });
  }
}
