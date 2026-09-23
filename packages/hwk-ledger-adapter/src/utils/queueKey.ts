/**
 * Single source of the Ledger device-queue key: connectorCall, allNetworkGetAddress
 * and cancel() must agree or a cancel misses its target. Operation id wins.
 */
export const LEDGER_DEFAULT_QUEUE_KEY = '__ledger_default__';

export function ledgerQueueKey({
  operationId,
  connectId,
}: {
  operationId?: string;
  connectId?: string;
}): string {
  return (operationId ?? connectId) || LEDGER_DEFAULT_QUEUE_KEY;
}
