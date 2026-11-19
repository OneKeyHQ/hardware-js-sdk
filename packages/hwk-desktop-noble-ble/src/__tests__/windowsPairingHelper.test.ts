import { EventEmitter } from 'events';

import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { pairWindowsBleDevice } from '../windowsPairingHelper';

import type { WindowsBlePairingDecision, WindowsBlePairingRequest } from '../windowsPairingHelper';

class FakeHelper extends EventEmitter {
  stdout = new EventEmitter();

  stderr = new EventEmitter();

  stdin = Object.assign(new EventEmitter(), {
    write: jest.fn((_data: string, done?: () => void) => done?.()),
  });

  kill = jest.fn();

  report(event: Record<string, unknown>) {
    this.stdout.emit('data', Buffer.from(`${JSON.stringify(event)}\n`));
  }
}

let mockHelper: FakeHelper;
jest.mock('child_process', () => ({ spawn: () => mockHelper }));

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function start(vendor = 'ledger') {
  let answer!: (decision: WindowsBlePairingDecision) => void;
  const requests: WindowsBlePairingRequest[] = [];
  const logger = jest.fn();
  const controller = new AbortController();
  const pending = pairWindowsBleDevice(
    {
      helperPath: '/mockHelper.exe',
      onPairingRequest: request => {
        requests.push(request);
        return new Promise(resolve => {
          answer = resolve;
        });
      },
    },
    { id: 'selected', vendor, address: 'AA:BB:CC:DD:EE:FF' },
    controller.signal,
    logger
  );
  const result = pending.catch((error: unknown) => error);
  const show = async () => {
    mockHelper.report({ type: 'pairing', pin: 'comparison-fixture' });
    await flush();
    return requests[0].signal;
  };
  const decide = async (decision: WindowsBlePairingDecision) => {
    answer(decision);
    await flush();
  };
  return { pending, result, requests, logger, controller, show, decide };
}

beforeEach(() => {
  mockHelper = new FakeHelper();
  jest.useFakeTimers({ doNotFake: ['performance'] });
});
afterEach(() => jest.useRealTimers());

it.each([0, 3])('closes on WinRT success %s before native cleanup finishes', async status => {
  const pair = start('trezor');
  const signal = await pair.show();
  mockHelper.report({ type: 'link', connected: false });
  mockHelper.report({ type: 'pairing-result', status });
  expect(signal.aborted).toBe(true);
  jest.advanceTimersByTime(2000);
  expect(mockHelper.stdin.write).not.toHaveBeenCalled();
  mockHelper.report({ type: status === 0 ? 'paired' : 'already-paired' });
  mockHelper.emit('close', 0);
  await expect(pair.pending).resolves.toBe(status === 0 ? 'paired' : 'already-paired');
});

it.each([
  [12, HardwareErrorCode.DevicePermissionDenied],
  [7, HardwareErrorCode.BlePairingTimeout],
])('preserves the recovery category for WinRT status %s', async (status, code) => {
  const pair = start();
  const signal = await pair.show();
  mockHelper.report({ type: 'pairing-result', status });
  expect(signal.aborted).toBe(true);
  mockHelper.emit('close', 1);
  expect(await pair.result).toMatchObject({ code, params: { pairingStatus: status } });
});

it('replays a persistent Trezor device refusal without waiting for the host deadline', async () => {
  const pair = start('trezor');
  const signal = await pair.show();
  mockHelper.report({ type: 'link', connected: false });
  jest.advanceTimersByTime(999);
  expect(signal.aborted).toBe(false);
  mockHelper.report({ type: 'link', connected: false });
  jest.advanceTimersByTime(1);
  expect(signal.aborted).toBe(true);
  await pair.decide('confirm');
  expect(mockHelper.stdin.write.mock.calls).toEqual([['cancel\n', expect.any(Function)]]);
  jest.advanceTimersByTime(5000);
  expect(mockHelper.kill).toHaveBeenCalledTimes(1);
  mockHelper.report({ type: 'pairing-result', status: 17 });
  mockHelper.emit('close', 1);
  expect(await pair.result).toMatchObject({
    code: HardwareErrorCode.BlePairingTimeout,
    params: { deviceDisconnected: true },
  });
});

it('allows a transient Trezor link change to recover', async () => {
  const pair = start('trezor');
  const signal = await pair.show();
  mockHelper.report({ type: 'link', connected: false });
  jest.advanceTimersByTime(500);
  mockHelper.report({ type: 'link', connected: true });
  jest.advanceTimersByTime(2000);
  expect(signal.aborted).toBe(false);
  await pair.decide('confirm');
  mockHelper.report({ type: 'link', connected: false });
  jest.advanceTimersByTime(2000);
  expect(mockHelper.stdin.write.mock.calls).toEqual([['confirm\n', expect.any(Function)]]);
  mockHelper.report({ type: 'paired' });
  mockHelper.emit('close', 0);
  await expect(pair.pending).resolves.toBe('paired');
});

it('does not carry an offline event from before PIN display into a later prompt', async () => {
  const pair = start('trezor');
  mockHelper.report({ type: 'link', connected: false });
  const signal = await pair.show();
  jest.advanceTimersByTime(2000);
  expect(signal.aborted).toBe(false);
  await pair.decide('cancel');
  mockHelper.emit('close', 1);
  expect(await pair.result).toMatchObject({ code: HardwareErrorCode.BlePairingCancelled });
});

it.each(['disconnect', 'confirmation deadline', 'host cancellation', 'WinRT failure'])(
  'closes the dialog on %s and ignores late UI answers and PIN events',
  async reason => {
    const pair = start();
    const signal = await pair.show();
    if (reason === 'disconnect') mockHelper.report({ type: 'link', connected: false });
    if (reason === 'confirmation deadline') jest.advanceTimersByTime(30_000);
    if (reason === 'host cancellation') pair.controller.abort();
    if (reason === 'WinRT failure') mockHelper.report({ type: 'pairing-result', status: 19 });
    expect(signal.aborted).toBe(true);
    const count = mockHelper.stdin.write.mock.calls.length;
    await pair.decide('confirm');
    mockHelper.report({ type: 'pairing', pin: 'late-comparison' });
    await flush();
    expect(pair.requests).toHaveLength(1);
    expect(mockHelper.stdin.write).toHaveBeenCalledTimes(count);
    mockHelper.emit('close', 1);
    await pair.result;
  }
);

it.each(['confirm', 'cancel'] as const)(
  'clears the Trezor disconnect timer on %s',
  async decision => {
    const pair = start('trezor');
    await pair.show();
    mockHelper.report({ type: 'link', connected: false });
    await pair.decide(decision);
    jest.advanceTimersByTime(2000);
    expect(mockHelper.stdin.write.mock.calls).toEqual([[`${decision}\n`, expect.any(Function)]]);
    mockHelper.report({ type: 'paired' });
    mockHelper.emit('close', 0);
    if (decision === 'confirm') await expect(pair.pending).resolves.toBe('paired');
    else expect(await pair.result).toMatchObject({ code: HardwareErrorCode.BlePairingCancelled });
  }
);

it('bounds a pairing before PIN display and a stuck WinRT completion after confirmation', async () => {
  const first = start();
  jest.advanceTimersByTime(60_000);
  mockHelper.emit('close', 1);
  expect(await first.result).toMatchObject({ params: { timedOut: true } });
  const second = start();
  await second.show();
  await second.decide('confirm');
  jest.advanceTimersByTime(30_000);
  expect(second.requests[0].signal.aborted).toBe(true);
  mockHelper.emit('close', 1);
  expect(await second.result).toMatchObject({ params: { timedOut: true } });
});

it('keeps a user cancellation over later Windows failures and bounds helper cleanup', async () => {
  const pair = start();
  await pair.show();
  await pair.decide('cancel');
  mockHelper.report({
    type: 'error',
    message: 'pairing failed with status DevicePairingResultStatus(19)',
  });
  jest.advanceTimersByTime(5000);
  expect(mockHelper.kill).toHaveBeenCalledTimes(1);
  mockHelper.emit('close', 1);
  expect(await pair.result).toMatchObject({ code: HardwareErrorCode.BlePairingCancelled });
});

it('preserves the authoritative WinRT result before native cleanup exits', async () => {
  const pair = start('trezor');
  const signal = await pair.show();
  mockHelper.report({ type: 'pairing-result', status: 19 });
  expect(signal.aborted).toBe(true);
  mockHelper.report({ type: 'error', message: 'cleanup failed later' });
  mockHelper.emit('close', 1);
  expect(await pair.result).toMatchObject({ params: { pairingStatus: 19 } });
});

it('turns a throwing host UI callback into a clean cancellation', async () => {
  const controller = new AbortController();
  const result = pairWindowsBleDevice(
    {
      helperPath: '/mockHelper.exe',
      onPairingRequest: () => {
        throw new Error('window destroyed');
      },
    },
    { id: 'selected', vendor: 'trezor', address: 'address' },
    controller.signal
  ).catch(error => error);
  mockHelper.report({ type: 'pairing', pin: 'comparison-fixture' });
  await flush();
  expect(mockHelper.stdin.write).toHaveBeenCalledWith('cancel\n', expect.any(Function));
  mockHelper.emit('close', 1);
  expect(await result).toMatchObject({ code: HardwareErrorCode.BlePairingCancelled });
});

it('ignores an aborted UI rejection after Windows has already confirmed pairing', async () => {
  let dismiss!: (error: Error) => void;
  const controller = new AbortController();
  const request = jest.fn(
    (_request: WindowsBlePairingRequest) =>
      new Promise<WindowsBlePairingDecision>((_resolve, reject) => {
        dismiss = reject;
      })
  );
  const pairing = pairWindowsBleDevice(
    { helperPath: '/helper.exe', onPairingRequest: request },
    {
      id: 'selected',
      vendor: 'ledger',
      address: 'address',
    },
    controller.signal
  );
  mockHelper.report({ type: 'pairing', pin: 'comparison-fixture' });
  await flush();
  mockHelper.report({ type: 'pairing-result', status: 0 });
  expect(request.mock.calls[0][0].signal.aborted).toBe(true);
  dismiss(new Error('UI aborted'));
  await flush();
  expect(mockHelper.stdin.write).not.toHaveBeenCalled();
  mockHelper.report({ type: 'paired' });
  mockHelper.emit('close', 0);
  await expect(pairing).resolves.toBe('paired');
});

it('drains the final paired event after exit and never logs the comparison code', async () => {
  const pair = start();
  await pair.show();
  await pair.decide('confirm');
  mockHelper.emit('exit', 0);
  mockHelper.report({ type: 'paired' });
  mockHelper.emit('close', 0);
  await expect(pair.pending).resolves.toBe('paired');
  expect(JSON.stringify(pair.logger.mock.calls)).not.toContain('comparison-fixture');
});

it('handles a broken helper input pipe without an unhandled stream error', async () => {
  const pair = start();
  const signal = await pair.show();
  mockHelper.stdin.emit('error', new Error('EPIPE'));
  expect(signal.aborted).toBe(true);
  expect(mockHelper.kill).toHaveBeenCalledTimes(1);
  mockHelper.emit('close', 1);
  expect(await pair.result).toMatchObject({ code: HardwareErrorCode.BleConnectFailed });
});

it('ignores malformed helper output without crashing or leaking its contents', async () => {
  const pair = start();
  expect(() =>
    mockHelper.stdout.emit(
      'data',
      Buffer.from(
        `${[
          'not-json',
          'null',
          '[]',
          '{"type":"pairing","pin":{"value":"invalid-comparison-fixture"}}',
          '{"type":"link","connected":"false"}',
          '{"type":"pairing-result","status":"0"}',
        ].join('\n')}\n`
      )
    )
  ).not.toThrow();
  const signal = await pair.show();
  expect(signal.aborted).toBe(false);
  expect(pair.requests).toHaveLength(1);
  expect(JSON.stringify(pair.logger.mock.calls)).not.toContain('invalid-comparison-fixture');
  await pair.decide('confirm');
  mockHelper.report({ type: 'paired' });
  mockHelper.emit('close', 0);
  await expect(pair.pending).resolves.toBe('paired');
});

it.each(['spawn', 'empty', 'failed'])(
  'reports helper %s failure with a canonical error',
  async kind => {
    const pair = start();
    if (kind === 'spawn') mockHelper.emit('error', new Error('spawn ENOENT'));
    else mockHelper.emit('close', kind === 'empty' ? 0 : 1);
    expect(await pair.result).toMatchObject({
      code:
        kind === 'empty' ? HardwareErrorCode.BlePairingTimeout : HardwareErrorCode.BleConnectFailed,
    });
  }
);
