import { HardwareErrorCode } from '../types/errors';
import { failure, success } from '../types/response';
import { getAllNetworkMethodChain, isAllNetworkMethodName } from './methodCatalog';

import type { ChainForFingerprint } from '../types/fingerprint';
import type { Response } from '../types/response';
import type {
  AllNetworkAddressParams,
  AllNetworkAddressResponse,
  AllNetworkGetAddressParams,
} from '../types/wallet';
import type { AllNetworkMethodName } from './methodCatalog';

export type AllNetworkCallItemContext = {
  connectId: string;
  deviceId: string;
  method: AllNetworkMethodName;
  chain: ChainForFingerprint;
  item: AllNetworkAddressParams;
  index: number;
};

export type AllNetworkAttachIdentityContext = AllNetworkCallItemContext & {
  payload: Record<string, unknown>;
};

export type AllNetworkResponseContext = AllNetworkCallItemContext & {
  response: AllNetworkAddressResponse;
};

export type RunAllNetworkGetAddressOptions = {
  connectId: string;
  deviceId: string;
  params: AllNetworkGetAddressParams;
  getMethodChain?: (
    method: AllNetworkMethodName,
    item: AllNetworkAddressParams
  ) => ChainForFingerprint;
  normalizeItem?: (
    method: AllNetworkMethodName,
    item: AllNetworkAddressParams
  ) => AllNetworkAddressParams;
  buildUnsupportedNetworkResponse?: (
    item: AllNetworkAddressParams,
    method: AllNetworkMethodName
  ) => AllNetworkAddressResponse | undefined;
  callItem: (context: AllNetworkCallItemContext) => Promise<Response<unknown>>;
  attachIdentity: (context: AllNetworkAttachIdentityContext) => Promise<AllNetworkAddressResponse>;
  shouldAbortBundle?: (
    response: AllNetworkAddressResponse,
    context: AllNetworkResponseContext
  ) => boolean;
  buildTopLevelFailure?: (
    response: AllNetworkAddressResponse,
    context: AllNetworkResponseContext
  ) => Response<AllNetworkAddressResponse[]>;
};

export async function runAllNetworkGetAddress({
  connectId,
  deviceId,
  params,
  getMethodChain = method => getAllNetworkMethodChain(method),
  normalizeItem = (_method, item) => item,
  buildUnsupportedNetworkResponse,
  callItem,
  attachIdentity,
  shouldAbortBundle = () => false,
  buildTopLevelFailure = defaultBuildTopLevelFailure,
}: RunAllNetworkGetAddressOptions): Promise<Response<AllNetworkAddressResponse[]>> {
  const responses: AllNetworkAddressResponse[] = [];

  for (const [index, item] of params.bundle.entries()) {
    if (!isAllNetworkMethodName(String(item.methodName))) {
      responses.push(buildUnsupportedMethodResponse(item));
      continue;
    }

    const method = item.methodName;
    const unsupportedNetwork = buildUnsupportedNetworkResponse?.(item, method);
    if (unsupportedNetwork) {
      responses.push(unsupportedNetwork);
      continue;
    }

    const chain = getMethodChain(method, item);
    const normalizedItem = normalizeItem(method, item);
    const context: AllNetworkCallItemContext = {
      connectId,
      deviceId,
      method,
      chain,
      item: normalizedItem,
      index,
    };
    const response = await callItem(context);
    const itemResponse = response.success
      ? await attachIdentity({
          ...context,
          payload: response.payload as Record<string, unknown>,
        })
      : ({
          ...normalizedItem,
          success: false,
          payload: response.payload,
        } as AllNetworkAddressResponse);

    const responseContext = { ...context, response: itemResponse };
    if (!itemResponse.success && shouldAbortBundle(itemResponse, responseContext)) {
      return buildTopLevelFailure(itemResponse, responseContext);
    }
    responses.push(itemResponse);
  }

  return success(responses);
}

export function buildUnsupportedMethodResponse(
  item: AllNetworkAddressParams
): AllNetworkAddressResponse {
  return {
    ...item,
    success: false,
    payload: {
      code: HardwareErrorCode.InvalidParams,
      error: `Unsupported allNetwork method: ${String(item.methodName)}`,
    },
  };
}

function defaultBuildTopLevelFailure(
  response: AllNetworkAddressResponse
): Response<AllNetworkAddressResponse[]> {
  const payload = response.payload ?? {};
  return failure(
    (payload.code as HardwareErrorCode | undefined) ?? HardwareErrorCode.DeviceMismatch,
    payload.error ?? 'All-network get-address aborted',
    normalizeFailureParams(payload.params)
  );
}

function normalizeFailureParams(params: unknown): Record<string, unknown> | undefined {
  return params && typeof params === 'object' ? (params as Record<string, unknown>) : undefined;
}
