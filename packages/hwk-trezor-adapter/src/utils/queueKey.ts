/**
 * The only Trezor queue-key derivation; enqueue, bundle cancel scope and cancel()
 * must agree or a cancel misses. An operation id wins when present.
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
