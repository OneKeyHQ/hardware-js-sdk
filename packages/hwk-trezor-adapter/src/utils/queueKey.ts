/**
 * The one place a Trezor device-queue key is derived.
 *
 * Three call sites have to agree on it or a cancel misses its target: the job
 * `enqueue` in `_callMethod` / `getPassphraseState`, the bundle-wide cancel
 * scope in `allNetworkGetAddress`, and `cancel()`. An operation id wins when
 * there is one, because a call pinned to an operation is queued under it.
 */
export function trezorQueueKey({
  operationId,
  connectId,
}: {
  operationId?: string;
  connectId?: string;
}): string {
  return operationId || connectId || '';
}
