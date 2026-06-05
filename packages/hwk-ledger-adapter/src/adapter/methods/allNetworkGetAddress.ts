import { HardwareErrorCode, success } from '@onekeyfe/hwk-adapter-core';

import type {
  AllNetworkAddressParams,
  AllNetworkAddressResponse,
  AllNetworkGetAddressParams,
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
  declinedAppNames?: Set<string>;
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

type LedgerAllNetworkMethod =
  | 'evmGetAddress'
  | 'btcGetAddress'
  | 'btcGetPublicKey'
  | 'solGetAddress'
  | 'tronGetAddress';

const LEDGER_BTC_NETWORK_COIN_MAP: Partial<Record<string, string>> = {
  tbtc: 'Testnet',
  bch: 'Bcash',
  doge: 'Dogecoin',
  ltc: 'Litecoin',
  neurai: 'Neurai',
};

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
    const installContext: LedgerInstallAppContext = {};
    const commonParams: ICommonCallParams = {
      autoInstallApp: params.autoInstallApp,
    };
    const responses: AllNetworkAddressResponse[] = [];
    const chainFingerprints = new Map<ChainForFingerprint, string>();

    for (const item of params.bundle) {
      const method = getAllNetworkMethod(item);
      if (!method) {
        responses.push(buildUnsupportedMethodResponse(item));
      } else {
        const chain = getFingerprintChain(method);
        const itemDeviceId = getItemDeviceId(item) ?? chainFingerprints.get(chain) ?? '';
        const normalizedItem = normalizeLedgerAllNetworkItem(method, item);
        const response = await callAllNetworkItem(
          callChain,
          getChainFingerprint,
          connectId,
          itemDeviceId,
          chain,
          method,
          normalizedItem,
          commonParams,
          installContext,
          chainFingerprints
        );
        if (isTopLevelAllNetworkFailure(response)) {
          return { success: false, payload: response.payload };
        }
        responses.push(response);
      }
    }

    return success(responses);
  };
}

function isTopLevelAllNetworkFailure(response: AllNetworkAddressResponse): boolean {
  if (response.success) {
    return false;
  }
  return response.payload?.code === HardwareErrorCode.DeviceMismatch;
}

function getItemDeviceId(item: AllNetworkAddressParams): string | undefined {
  const { deviceId } = item as { deviceId?: unknown };
  return typeof deviceId === 'string' && deviceId.length > 0 ? deviceId : undefined;
}

function getAllNetworkMethod(item: AllNetworkAddressParams): LedgerAllNetworkMethod | undefined {
  switch (item.methodName) {
    case 'evmGetAddress':
    case 'btcGetAddress':
    case 'btcGetPublicKey':
    case 'solGetAddress':
    case 'tronGetAddress':
      return item.methodName;
    default:
      return undefined;
  }
}

function buildUnsupportedMethodResponse(item: AllNetworkAddressParams): AllNetworkAddressResponse {
  return {
    ...item,
    success: false,
    payload: {
      code: HardwareErrorCode.InvalidParams,
      error: `Unsupported allNetwork method: ${String(item.methodName)}`,
    },
  };
}

function normalizeLedgerAllNetworkItem(
  method: LedgerAllNetworkMethod,
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

async function callAllNetworkItem(
  callChain: LedgerCallChain,
  getChainFingerprint: LedgerGetChainFingerprint,
  connectId: string,
  deviceId: string,
  chain: ChainForFingerprint,
  method: LedgerAllNetworkMethod,
  item: AllNetworkAddressParams,
  commonParams: ICommonCallParams,
  installContext: LedgerInstallAppContext,
  chainFingerprints: Map<ChainForFingerprint, string>
): Promise<AllNetworkAddressResponse> {
  const response = await callAllNetworkMethod(
    callChain,
    connectId,
    deviceId,
    method,
    item,
    commonParams,
    installContext
  );

  if (!response.success) {
    return { ...item, success: false, payload: response.payload };
  }

  const payload = response.payload as Record<string, unknown>;
  const fingerprint =
    deviceId ||
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

function getFingerprintChain(method: LedgerAllNetworkMethod): ChainForFingerprint {
  switch (method) {
    case 'evmGetAddress':
      return 'evm';
    case 'btcGetAddress':
    case 'btcGetPublicKey':
      return 'btc';
    case 'solGetAddress':
      return 'sol';
    case 'tronGetAddress':
      return 'tron';
    default:
      throw Object.assign(new Error(`Unsupported allNetwork method: ${method}`), {
        code: HardwareErrorCode.InvalidParams,
      });
  }
}

async function callAllNetworkMethod(
  callChain: LedgerCallChain,
  connectId: string,
  deviceId: string,
  method: LedgerAllNetworkMethod,
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
