import { HardwareErrorCode } from '../types/errors';
import { failure, success } from '../types/response';
import {
  hasHardwareRuntimeIdPrefix,
  isHardwareInteractionId,
  parseHardwareRuntimeId,
} from './hardwareRuntimeId';

import type { VendorType } from '../types/device';
import type { Response } from '../types/response';

export interface HardwareOperationTarget {
  /** Effective target accepted by existing adapter/connector call paths. */
  targetId: string | undefined;
  /** Present when this operation is pinned to a live interaction. */
  interactionId: string | undefined;
}

/**
 * Normalizes the transitional positional interaction id and the canonical
 * common-params field. All vendors must reject conflicting bindings.
 */
export function resolveHardwareOperationTarget(
  positionalTargetId: string | null | undefined,
  commonInteractionId: string | null | undefined,
  expectedVendor?: VendorType
): Response<HardwareOperationTarget> {
  const normalizedPositionalTargetId = positionalTargetId ?? undefined;
  const normalizedCommonInteractionId = commonInteractionId || undefined;
  const positionalInteractionId = isHardwareInteractionId(normalizedPositionalTargetId)
    ? normalizedPositionalTargetId
    : undefined;
  const parsedPositionalTarget = parseHardwareRuntimeId(normalizedPositionalTargetId);
  const parsedCommonInteraction = parseHardwareRuntimeId(normalizedCommonInteractionId);

  if (
    normalizedPositionalTargetId &&
    hasHardwareRuntimeIdPrefix(normalizedPositionalTargetId) &&
    !parsedPositionalTarget
  ) {
    return failure(HardwareErrorCode.InvalidParams, 'Invalid hardware operation target id');
  }

  if (parsedPositionalTarget?.kind === 'connector-session') {
    return failure(
      HardwareErrorCode.InvalidParams,
      'Hardware connector session id cannot be used as an operation target'
    );
  }

  if (normalizedCommonInteractionId && parsedCommonInteraction?.kind !== 'interaction') {
    return failure(HardwareErrorCode.InvalidParams, 'Invalid hardware interaction id');
  }

  if (
    expectedVendor &&
    ((parsedPositionalTarget && parsedPositionalTarget.vendor !== expectedVendor) ||
      (parsedCommonInteraction && parsedCommonInteraction.vendor !== expectedVendor))
  ) {
    return failure(
      HardwareErrorCode.InvalidParams,
      `Hardware interaction does not belong to ${expectedVendor}`
    );
  }

  if (
    positionalInteractionId &&
    normalizedCommonInteractionId &&
    positionalInteractionId !== normalizedCommonInteractionId
  ) {
    return failure(HardwareErrorCode.InvalidParams, 'Conflicting hardware interaction ids', {
      positionalInteractionId,
      commonInteractionId: normalizedCommonInteractionId,
    });
  }

  const interactionId = normalizedCommonInteractionId ?? positionalInteractionId;
  return success({
    interactionId,
    targetId: interactionId ?? normalizedPositionalTargetId,
  });
}
