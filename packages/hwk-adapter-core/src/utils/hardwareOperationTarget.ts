import { HardwareErrorCode } from '../types/errors';
import { failure, success } from '../types/response';
import {
  hasHardwareRuntimeIdPrefix,
  isHardwareOperationId,
  parseHardwareRuntimeId,
} from './hardwareRuntimeId';

import type { VendorType } from '../types/device';
import type { Response } from '../types/response';

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
  const normalizedPositionalTargetId = positionalTargetId ?? undefined;
  const normalizedCommonOperationId = commonOperationId || undefined;
  const positionalOperationId = isHardwareOperationId(normalizedPositionalTargetId)
    ? normalizedPositionalTargetId
    : undefined;
  const parsedPositionalTarget = parseHardwareRuntimeId(normalizedPositionalTargetId);
  const parsedCommonOperation = parseHardwareRuntimeId(normalizedCommonOperationId);

  if (
    normalizedPositionalTargetId &&
    hasHardwareRuntimeIdPrefix(normalizedPositionalTargetId) &&
    !parsedPositionalTarget
  ) {
    return failure(HardwareErrorCode.InvalidParams, 'Invalid hardware operation target id');
  }

  if (parsedPositionalTarget?.kind === 'link') {
    return failure(
      HardwareErrorCode.InvalidParams,
      'Hardware transport link id cannot be used as an operation target'
    );
  }

  if (normalizedCommonOperationId && parsedCommonOperation?.kind !== 'operation') {
    return failure(HardwareErrorCode.InvalidParams, 'Invalid hardware operation id');
  }

  if (
    expectedVendor &&
    ((parsedPositionalTarget && parsedPositionalTarget.vendor !== expectedVendor) ||
      (parsedCommonOperation && parsedCommonOperation.vendor !== expectedVendor))
  ) {
    return failure(
      HardwareErrorCode.InvalidParams,
      `Hardware operation does not belong to ${expectedVendor}`
    );
  }

  if (
    positionalOperationId &&
    normalizedCommonOperationId &&
    positionalOperationId !== normalizedCommonOperationId
  ) {
    return failure(HardwareErrorCode.InvalidParams, 'Conflicting hardware operation ids', {
      positionalOperationId,
      commonOperationId: normalizedCommonOperationId,
    });
  }

  const operationId = normalizedCommonOperationId ?? positionalOperationId;
  return success({
    operationId,
    targetId: operationId ?? normalizedPositionalTargetId,
  });
}
