import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';

import { pairWindowsBleDevice } from './windowsPairingHelper';

import type { WindowsBlePairingOptions } from './windowsPairingHelper';
import type { BleDebugLogger } from './debugLog';
import type { ThirdPartyBleDeviceInfo } from './types/desktop-api';

type PendingConnection = { id: string; vendor: string; controller: AbortController };
type CancelTarget = { vendor: string; id?: string };

// WinRT allows only one ceremony at a time, including across retiring renderer handlers.
let pairingQueue = Promise.resolve();

const cancelledError = () =>
  createHwkError({
    code: HardwareErrorCode.BlePairingCancelled,
    message: 'BLE connect cancelled',
    params: { phase: 'connect' },
  });

const connectFacts = (error: unknown) =>
  (
    error as {
      params?: { timedOut?: boolean; gattUnreachable?: boolean; msSinceLink?: number };
    } | null
  )?.params ?? {};

function waitForRetry(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(cancelledError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, 3000);
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

export class WindowsBlePairing {
  private readonly pending = new Set<PendingConnection>();

  private readonly options: WindowsBlePairingOptions;

  private readonly logger?: BleDebugLogger;

  constructor(options: WindowsBlePairingOptions, logger?: BleDebugLogger) {
    this.options = options;
    this.logger = logger;
  }

  cancel(target?: CancelTarget): void {
    for (const entry of this.pending) {
      if (
        !target ||
        (target.vendor === entry.vendor && (target.id === undefined || target.id === entry.id))
      ) {
        entry.controller.abort();
      }
    }
  }

  async connect<T>(
    id: string,
    vendor: string,
    device: ThirdPartyBleDeviceInfo | undefined,
    pauseScan: () => Promise<() => void>,
    connect: () => Promise<T>
  ): Promise<T> {
    if (vendor !== 'ledger' && vendor !== 'trezor') return connect();
    const entry = { id, vendor, controller: new AbortController() };
    this.pending.add(entry);
    const { signal } = entry.controller;
    const assertActive = () => {
      if (signal.aborted) throw cancelledError();
    };
    let resumeScan: (() => void) | undefined;
    let pairingCleanup = Promise.resolve();
    try {
      let outcome: 'paired' | 'already-paired' | 'skipped' = 'skipped';
      const address = device?.address;
      if (address) {
        // Retain the selected peripheral before queueing: another ceremony may
        // take longer than the discovery cache's idle lifetime.
        resumeScan = await pauseScan();
        assertActive();
        const operation = pairingQueue.then(async () => {
          assertActive();
          return pairWindowsBleDevice(this.options, { id, vendor, address }, signal, this.logger);
        });
        pairingCleanup = operation.then(
          () => undefined,
          () => undefined
        );
        pairingQueue = pairingCleanup;
        // A queued cancellation returns immediately, but its queue slot still waits
        // for the preceding helper's cleanup before the next ceremony can start.
        let onAbort!: () => void;
        const aborted = new Promise<never>((_, reject) => {
          onAbort = () => reject(cancelledError());
          signal.addEventListener('abort', onAbort, { once: true });
        });
        try {
          outcome = await Promise.race([operation, aborted]);
        } finally {
          signal.removeEventListener('abort', onAbort);
        }
      }
      assertActive();
      try {
        return await connect();
      } catch (error) {
        assertActive();
        const facts = connectFacts(error);
        if (outcome === 'paired' && !facts.timedOut) {
          await waitForRetry(signal);
          assertActive();
          return connect();
        }
        if (
          vendor === 'ledger' &&
          outcome === 'already-paired' &&
          facts.gattUnreachable &&
          typeof facts.msSinceLink === 'number' &&
          facts.msSinceLink < 2000
        ) {
          throw createHwkError({
            code: HardwareErrorCode.BleBondInvalid,
            message: 'The Ledger dropped the link Windows holds a pairing for',
            params: { phase: 'connect', ...facts },
          });
        }
        throw error;
      }
    } finally {
      this.pending.delete(entry);
      if (resumeScan) void pairingCleanup.then(resumeScan);
    }
  }
}
