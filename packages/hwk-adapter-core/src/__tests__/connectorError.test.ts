import {
  rehydrateConnectorError,
  serializeConnectorError,
} from '../types/connector';

/**
 * Simulates a host bridge (e.g. the extension offscreen↔SW JsBridge) that runs
 * a thrown Error through a fixed field whitelist before sending. This is the
 * exact behaviour that USED to drop custom fields like `appName` — the whole
 * point of carrying failures as data is to survive it.
 */
const BRIDGE_ERROR_WHITELIST = [
  'message',
  'code',
  'errorCode',
  'name',
  'stack',
  'info',
  'payload',
] as const;

function throughErrorWhitelist(err: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of BRIDGE_ERROR_WHITELIST) {
    if (err[key] !== undefined) out[key] = err[key];
  }
  return out;
}

describe('serializeConnectorError / rehydrateConnectorError', () => {
  it('keeps message/code/errorCode at the top level and nests the rest under params', () => {
    const err = Object.assign(new Error('Failed to open "Tron"'), {
      code: 100,
      errorCode: '6d00',
      _tag: 'OpenAppCommandError',
      statusCode: '6d00',
      appName: 'Tron',
    });

    const s = serializeConnectorError(err);

    expect(s.message).toBe('Failed to open "Tron"');
    expect(s.code).toBe(100);
    expect(s.errorCode).toBe('6d00');
    expect(s.params).toMatchObject({
      _tag: 'OpenAppCommandError',
      statusCode: '6d00',
      appName: 'Tron',
    });
    // stack must never leak into params
    expect(s.params).not.toHaveProperty('stack');
  });

  it('survives a JSON round-trip with NO field loss (data transport)', () => {
    const err = Object.assign(new Error('boom'), {
      code: 7,
      appName: 'Bitcoin',
      _tag: 'SomeTag',
      statusCode: 0x6985,
    });

    const wire = JSON.parse(JSON.stringify(serializeConnectorError(err)));

    expect(wire.message).toBe('boom');
    expect(wire.code).toBe(7);
    expect(wire.params.appName).toBe('Bitcoin');
    expect(wire.params._tag).toBe('SomeTag');
    expect(wire.params.statusCode).toBe(0x6985);
  });

  it('survives the bridge error whitelist that drops top-level custom fields', () => {
    // The regression: appName lived on the raw Error top-level and the bridge
    // whitelist stripped it. As DATA, appName rides inside `params` which the
    // whitelist preserves wholesale.
    const err = Object.assign(new Error('Failed to open "Solana"'), {
      code: 100,
      appName: 'Solana',
    });

    const serialized = serializeConnectorError(err);
    // The result object itself crosses as `data` -> JSON round-trip only.
    const afterTransport = JSON.parse(JSON.stringify(serialized));
    const rehydrated = rehydrateConnectorError(afterTransport);

    expect((rehydrated as { appName?: string }).appName).toBe('Solana');
    expect((rehydrated as { code?: number }).code).toBe(100);
    expect(rehydrated.message).toBe('Failed to open "Solana"');

    // Sanity: had appName been thrown as a top-level Error field instead, the
    // whitelist would have dropped it.
    const naive = throughErrorWhitelist(err as unknown as Record<string, unknown>);
    expect(naive).not.toHaveProperty('appName');
  });

  it('rehydrates a flat Error so classifiers reading own-props keep working', () => {
    const err = Object.assign(new Error('locked'), {
      code: 11,
      errorCode: '5515',
      statusCode: '5515',
      _tag: 'LockedDeviceError',
    });

    const rehydrated = rehydrateConnectorError(
      serializeConnectorError(err),
    ) as unknown as Record<string, unknown>;

    expect(rehydrated instanceof Error).toBe(true);
    expect(rehydrated.message).toBe('locked');
    expect(rehydrated.code).toBe(11);
    expect(rehydrated.errorCode).toBe('5515');
    expect(rehydrated.statusCode).toBe('5515');
    expect(rehydrated._tag).toBe('LockedDeviceError');
  });

  it('flattens an existing params bag instead of nesting it', () => {
    const err = Object.assign(new Error('x'), {
      code: 1,
      params: { appName: 'Ethereum', permissionDeniedReason: 'denied' },
    });

    const s = serializeConnectorError(err);

    expect(s.params?.appName).toBe('Ethereum');
    expect(s.params?.permissionDeniedReason).toBe('denied');
    expect(s.params).not.toHaveProperty('params');
  });

  it('shallow-snapshots a nested originalError (raw Error would lose its message)', () => {
    const err = Object.assign(new Error('outer'), {
      code: 2,
      originalError: Object.assign(new Error('inner'), {
        _tag: 'InnerTag',
        statusCode: '6d00',
      }),
    });

    const wire = JSON.parse(JSON.stringify(serializeConnectorError(err)));

    expect(wire.params.originalError.message).toBe('inner');
    expect(wire.params.originalError._tag).toBe('InnerTag');
    expect(wire.params.originalError.statusCode).toBe('6d00');
  });

  it('drops a non-JSON-safe field instead of crashing the transport', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const err = Object.assign(new Error('boom'), {
      code: 9,
      appName: 'Tron',
      error: circular, // a sibling field with a circular ref
    });

    const s = serializeConnectorError(err);

    // The circular field is dropped, the rest survives, and the whole thing
    // is now safe to JSON.stringify (what the bridge does).
    expect(s.params).not.toHaveProperty('error');
    expect(s.params?.appName).toBe('Tron');
    expect(() => JSON.stringify(s)).not.toThrow();
  });

  it('handles non-object throwables', () => {
    expect(serializeConnectorError('plain string')).toEqual({
      message: 'plain string',
    });
    expect(serializeConnectorError(undefined)).toEqual({ message: 'Unknown error' });
  });
});
