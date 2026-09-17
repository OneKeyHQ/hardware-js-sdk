/**
 * The one place a Ledger device-queue key is derived.
 *
 * Three call sites have to agree on it or a cancel misses its target: the job
 * `enqueue` in `connectorCall`, the bundle-wide cancel scope in
 * `allNetworkGetAddress`, and `cancel()`. An operation id wins when there is
 * one, because a call pinned to an operation is queued under it.
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
