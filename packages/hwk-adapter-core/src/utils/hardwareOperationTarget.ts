import { HardwareErrorCode } from '../types/errors';
import { failure, success } from '../types/response';
import { hasHardwareRuntimeIdPrefix, parseHardwareRuntimeId } from './hardwareRuntimeId';

import type { VendorType } from '../types/device';
import type { Response } from '../types/response';
import type { IHardwareConnectionContext } from '../types/wallet';

export interface HardwareOperationTarget {
  /** Effective target accepted by existing adapter/connector call paths. */
  targetId: string | undefined;
  /** Present when this operation is pinned to a live operation. */
  operationId: string | undefined;
}

/**
 * Normalizes the transitional positional operation id and the canonical
 * common-params field. All vendors must reject conflicting bindings.
 */
export function resolveHardwareOperationTarget(
  positionalTargetId: string | null | undefined,
  commonOperationId: string | null | undefined,
  expectedVendor?: VendorType
): Response<HardwareOperationTarget> {
  const targetId = positionalTargetId ?? undefined;
  const commonId = commonOperationId || undefined;
  const parsedTarget = parseHardwareRuntimeId(targetId);
  const parsedCommon = parseHardwareRuntimeId(commonId);
  const positionalOperationId = parsedTarget?.kind === 'operation' ? targetId : undefined;

  if (hasHardwareRuntimeIdPrefix(targetId) && !parsedTarget) {
    return failure(HardwareErrorCode.InvalidParams, 'Invalid hardware operation target id');
  }

  if (parsedTarget?.kind === 'link') {
    return failure(
      HardwareErrorCode.InvalidParams,
      'Hardware transport link id cannot be used as an operation target'
    );
  }

  if (commonId && parsedCommon?.kind !== 'operation') {
    return failure(HardwareErrorCode.InvalidParams, 'Invalid hardware operation id');
  }

  if (
    expectedVendor &&
    [parsedTarget, parsedCommon].some(parsed => parsed && parsed.vendor !== expectedVendor)
  ) {
    return failure(
      HardwareErrorCode.InvalidParams,
      `Hardware operation does not belong to ${expectedVendor}`
    );
  }

  if (positionalOperationId && commonId && positionalOperationId !== commonId) {
    return failure(HardwareErrorCode.InvalidParams, 'Conflicting hardware operation ids', {
      positionalOperationId,
      commonOperationId: commonId,
    });
  }

  const operationId = commonId ?? positionalOperationId;
  return success({ operationId, targetId: operationId ?? targetId });
}

/** Narrow the connection-context fields of untyped call params. */
export function pickConnectionContext(params: {
  knownConnections?: unknown;
  extra?: unknown;
  allowDeviceSelection?: unknown;
  supportedTransports?: unknown;
}): IHardwareConnectionContext {
  return {
    knownConnections: params.knownConnections as IHardwareConnectionContext['knownConnections'],
    extra: params.extra as IHardwareConnectionContext['extra'],
    allowDeviceSelection:
      typeof params.allowDeviceSelection === 'boolean' ? params.allowDeviceSelection : undefined,
    supportedTransports:
      params.supportedTransports as IHardwareConnectionContext['supportedTransports'],
  };
}
