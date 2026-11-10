import { Buffer } from 'buffer';

export type ManualSigningMethod = 'btcGetPublicKey' | 'zcashGetAddress' | 'moneroGetAddress';

export type ManualSigningCall = (
  method: ManualSigningMethod,
  params: Record<string, unknown>
) => Promise<{ success: boolean; payload?: unknown }>;

export type PrepareSigningSample = (call: ManualSigningCall) => Promise<Record<string, unknown>>;

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The device returned an invalid response.');
  }
  return value as Record<string, unknown>;
}

export function hex(value: unknown, length?: number): Buffer {
  if (
    typeof value !== 'string' ||
    !/^(?:[0-9a-fA-F]{2})+$/.test(value) ||
    (length !== undefined && value.length !== length * 2)
  ) {
    throw new Error('The device returned invalid hexadecimal data.');
  }
  return Buffer.from(value, 'hex');
}

export async function readDevice(
  call: ManualSigningCall,
  method: ManualSigningMethod,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const result = await call(method, params);
  if (!result.success) {
    throw new Error('The device call failed or was cancelled. No further signing steps were run.');
  }
  return record(result.payload);
}

export function devicePublicKey(response: Record<string, unknown>): Buffer {
  return hex(record(response.node).public_key, 33);
}
