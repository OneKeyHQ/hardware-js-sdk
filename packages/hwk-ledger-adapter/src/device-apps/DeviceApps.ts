import { DeviceActionStatus } from '@ledgerhq/device-management-kit';
import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';
import { Subject } from 'rxjs';

import { deviceActionToPromise } from '../signer/deviceActionToPromise';
import { debugLog } from '../utils/debugLog';

import type {
  DeviceManagementKit,
  GetOsVersionResponse,
} from '@ledgerhq/device-management-kit';
import type { Observable } from 'rxjs';
import type { CancelReason } from '../signer/deviceActionToPromise';

const INSTALL_TIMEOUT_MS = 5 * 60_000;

export interface AppMetadata {
  versionName: string;
  versionId: number;
  version: string;
  versionDisplayName: string | null;
  description: string | null;
  icon: string | null;
  bytes: number | null;
  currencyId: string | null;
  isDevTools: boolean;
}

export interface InstallProgress {
  progress: number;
  requiredUserInteraction?: string;
}

export type InstallProgressCallback = (progress: InstallProgress) => void;

export interface InstallAppCallParams {
  appName: string;
  unlockTimeout?: number;
  // In-process function ref forwarded through connector.call (params typed unknown).
  onProgress?: InstallProgressCallback;
}

export interface ListInstalledAppsCallParams {
  unlockTimeout?: number;
}

export interface FirmwareVersion {
  /** BOLOS version on the secure element — the user-facing firmware version. */
  seVersion: string;
  /** MCU SEPH (SE–MCU link protocol) version. */
  mcuSephVersion: string;
  /** MCU bootloader version. */
  mcuBootloaderVersion: string;
  /** Hardware revision (e.g. "00" / "01" on Nano X). */
  hwVersion: string;
}

/** Full GetOsVersionResponse projected to a plain serializable shape. */
export interface LedgerDeviceInfo extends FirmwareVersion {
  isBootloader: boolean;
  isOsu: boolean;
  targetId: number;
  seTargetId?: number;
  mcuTargetId?: number;
  /** Secure element flags as hex string (raw bytes turned readable). */
  seFlagsHex: string;
}

/**
 * OS-level device management (install, list apps). Mirrors SignerEth:
 * built fresh per call, consumer sets onInteraction / onRegisterCanceller.
 */
export class DeviceApps {
  onInteraction?: (interaction: string) => void;

  onRegisterCanceller?: (cancel: (reason?: CancelReason) => void) => void;

  constructor(
    private readonly _dmk: DeviceManagementKit,
    private readonly _sessionId: string,
    private readonly _ledgerKit: LedgerKitModule,
  ) {}

  async listInstalled(options?: { unlockTimeout?: number }): Promise<AppMetadata[]> {
    const action = (this._dmk as unknown as DmkExecuteCapable).executeDeviceAction({
      sessionId: this._sessionId,
      deviceAction: new this._ledgerKit.ListAppsWithMetadataDeviceAction({
        input: { unlockTimeout: options?.unlockTimeout },
      }),
    });
    const result = await deviceActionToPromise<Array<DmkApplication | null>>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller,
    );
    return result
      .filter((a): a is DmkApplication => a !== null)
      .map(applicationToMetadata);
  }

  // Catalog lookup via custom device action — DMK has no typed wrapper for this.
  async listAvailable(): Promise<AppMetadata[]> {
    const customAction = new ListAvailableAppsDeviceAction({
      GetOsVersionCommand: this._ledgerKit.GetOsVersionCommand,
      isSuccessCommandResult: this._ledgerKit.isSuccessCommandResult,
    });
    const action = (this._dmk as unknown as DmkExecuteCapable).executeDeviceAction({
      sessionId: this._sessionId,
      deviceAction: customAction,
    });
    const result = await deviceActionToPromise<DmkApplication[]>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller,
    );
    return result.map(applicationToMetadata);
  }

  async getFirmwareVersion(): Promise<FirmwareVersion> {
    const v = await this._fetchOsVersion();
    return {
      seVersion: v.seVersion,
      mcuSephVersion: v.mcuSephVersion,
      mcuBootloaderVersion: v.mcuBootloaderVersion,
      hwVersion: v.hwVersion,
    };
  }

  async getDeviceInfo(): Promise<LedgerDeviceInfo> {
    const v = await this._fetchOsVersion();
    return {
      isBootloader: v.isBootloader,
      isOsu: v.isOsu,
      targetId: v.targetId,
      seTargetId: v.seTargetId,
      mcuTargetId: v.mcuTargetId,
      seVersion: v.seVersion,
      seFlagsHex: bytesToHex(v.seFlags),
      mcuSephVersion: v.mcuSephVersion,
      mcuBootloaderVersion: v.mcuBootloaderVersion,
      hwVersion: v.hwVersion,
    };
  }

  /**
   * Pre-flight space check. Mirrors DMK's PredictOutOfMemoryTask using the
   * data we already expose (listInstalled / listAvailable / getOsVersion).
   * Fails fast with HardwareErrorCode.DeviceOutOfMemory before issuing the
   * actual install — saves the user the time-to-fail of DMK's state machine.
   */
  private async _assertEnoughSpace(appName: string): Promise<void> {
    let osVersion: GetOsVersionResponse;
    let installed: AppMetadata[];
    let available: AppMetadata[];
    try {
      [osVersion, installed, available] = await Promise.all([
        this._fetchOsVersion(),
        this.listInstalled(),
        this.listAvailable(),
      ]);
    } catch (err) {
      // Precheck is best-effort — if we can't fetch metadata (locked, network,
      // etc.) defer to DMK's install flow which has its own retry / error
      // handling. Skipping the precheck only loses fail-fast, not correctness.
      debugLog('[DeviceApps] precheck skipped:', (err as { message?: string })?.message);
      return;
    }

    if (installed.some(a => a.versionName === appName)) return; // DMK no-ops, skip precheck
    const target = available.find(a => a.versionName === appName);
    if (!target) return; // DMK will surface "App not found in manager API" itself

    const capacity = getDeviceCapacity(osVersion.targetId);
    if (!capacity) return; // unknown device model — defer to DMK
    const blockSize = capacity.getBlockSize(osVersion.seVersion);
    const totalBlocks = Math.floor(capacity.memorySize / blockSize);
    const blocks = (b: number | null) => Math.ceil((b ?? 0) / blockSize);

    const usedBlocks = installed.reduce((sum, a) => sum + blocks(a.bytes), 0);
    const neededBlocks = blocks(target.bytes);

    debugLog(
      '[DeviceApps] space check',
      'targetId=', osVersion.targetId.toString(16),
      'memorySize=', capacity.memorySize,
      'blockSize=', blockSize,
      'usedBlocks=', usedBlocks,
      'neededBlocks=', neededBlocks,
      'totalBlocks=', totalBlocks,
    );

    if (usedBlocks + neededBlocks > totalBlocks) {
      const usedBytes = usedBlocks * blockSize;
      const neededBytes = neededBlocks * blockSize;
      const freeBytes = Math.max(0, capacity.memorySize - usedBytes);
      throw Object.assign(
        new Error(
          `Not enough space to install "${appName}": needs ${neededBytes} bytes, ${freeBytes} bytes free of ${capacity.memorySize}.`,
        ),
        {
          code: HardwareErrorCode.DeviceOutOfMemory,
          _tag: 'OutOfMemoryDAError',
          appName,
          params: {
            requiredBytes: neededBytes,
            availableBytes: freeBytes,
            totalBytes: capacity.memorySize,
          },
        },
      );
    }
  }

  // Sole sendCommand wrapper — surfaces unlock-device interaction through
  // the same onInteraction pipeline as the device-action methods.
  private async _fetchOsVersion(): Promise<GetOsVersionResponse> {
    const customAction = new GetOsVersionDeviceAction({
      GetOsVersionCommand: this._ledgerKit.GetOsVersionCommand,
      isSuccessCommandResult: this._ledgerKit.isSuccessCommandResult,
    });
    const action = (this._dmk as unknown as DmkExecuteCapable).executeDeviceAction({
      sessionId: this._sessionId,
      deviceAction: customAction,
    });
    return deviceActionToPromise<GetOsVersionResponse>(
      action,
      this.onInteraction,
      undefined,
      this.onRegisterCanceller,
    );
  }

  async install(
    appName: string,
    onProgress?: InstallProgressCallback,
    options?: { unlockTimeout?: number },
  ): Promise<void> {
    if (!appName) throw new Error('DeviceApps.install: appName is required');
    debugLog('[DeviceApps] install:', appName);

    await this._assertEnoughSpace(appName);

    const action = (this._dmk as unknown as DmkExecuteCapable).executeDeviceAction({
      sessionId: this._sessionId,
      deviceAction: new this._ledgerKit.InstallAppDeviceAction({
        input: { appName, unlockTimeout: options?.unlockTimeout },
      }),
    });

    await deviceActionToPromise<void>(
      action,
      this.onInteraction,
      INSTALL_TIMEOUT_MS,
      this.onRegisterCanceller,
      onProgress
        ? intermediateValue => {
            const iv = intermediateValue as
              | { progress?: number; requiredUserInteraction?: string }
              | undefined;
            if (typeof iv?.progress === 'number') {
              onProgress({
                progress: iv.progress,
                requiredUserInteraction: iv.requiredUserInteraction,
              });
            }
          }
        : undefined,
    );
  }
}

interface DmkApplication {
  versionName: string;
  versionId: number;
  version: string;
  versionDisplayName: string | null;
  description: string | null;
  icon: string | null;
  bytes: number | null;
  currencyId: string | null;
  isDevTools: boolean;
}

function bytesToHex(bytes: Uint8Array | undefined): string {
  if (!bytes) return '';
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function applicationToMetadata(app: DmkApplication): AppMetadata {
  return {
    versionName: app.versionName,
    versionId: app.versionId,
    version: app.version,
    versionDisplayName: app.versionDisplayName,
    description: app.description,
    icon: app.icon,
    bytes: app.bytes,
    currencyId: app.currencyId,
    isDevTools: app.isDevTools,
  };
}

interface DeviceCapacity {
  memorySize: number;
  getBlockSize: (firmwareVersion: string) => number;
}

// Mirrors DMK's StaticDeviceModelDataSource. `mask` matches the top byte of
// targetId; the lower 16 bits encode hardware revision (ignored for memory).
const DEVICE_CAPACITIES: ReadonlyArray<{ mask: number; capacity: DeviceCapacity }> = [
  // Nano S — block size 4K on fw<2.0, 2K on >=2.0. Default 4K (conservative).
  {
    mask: 0x31100000,
    capacity: {
      memorySize: 320 * 1024,
      getBlockSize: fw => (parseMajor(fw) >= 2 ? 2 * 1024 : 4 * 1024),
    },
  },
  // Nano S Plus
  { mask: 0x33100000, capacity: { memorySize: 1533 * 1024, getBlockSize: () => 32 } },
  // Nano X
  { mask: 0x33000000, capacity: { memorySize: 2 * 1024 * 1024, getBlockSize: () => 4 * 1024 } },
  // Stax
  { mask: 0x33200000, capacity: { memorySize: 1533 * 1024, getBlockSize: () => 32 } },
  // Flex
  { mask: 0x33300000, capacity: { memorySize: 1533 * 1024, getBlockSize: () => 32 } },
  // Apex / Nano Gen5
  { mask: 0x33400000, capacity: { memorySize: 1533 * 1024, getBlockSize: () => 32 } },
];

function getDeviceCapacity(targetId: number): DeviceCapacity | undefined {
  const masked = targetId & 0xffff0000;
  return DEVICE_CAPACITIES.find(d => d.mask === masked)?.capacity;
}

function parseMajor(version: string): number {
  const m = /^(\d+)/.exec(version);
  return m ? Number(m[1]) : 0;
}

// Loosened DMK surface (we receive the module via dynamic importLedgerKit).
export interface LedgerKitModule {
  ListAppsWithMetadataDeviceAction: new (args: { input: unknown }) => unknown;
  InstallAppDeviceAction: new (args: { input: unknown }) => unknown;
  GetOsVersionCommand: new () => unknown;
  isSuccessCommandResult: (result: unknown) => result is { data: GetOsVersionResponse };
}

interface DmkExecuteCapable {
  // Loose return: deviceActionToPromise narrows the observable shape per-call.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeDeviceAction(args: { sessionId: string; deviceAction: unknown }): any;
}

// Custom DeviceAction: GetOsVersion → managerApi.getAppList. Duck-typed against
// DMK's DeviceAction interface so executeDeviceAction wires InternalApi for us.

interface InternalApiLike {
  sendCommand: (command: unknown) => Promise<unknown>;
  getManagerApiService: () => {
    getAppList: (deviceInfo: GetOsVersionResponse) => {
      run: () => Promise<{ isLeft: () => boolean; extract: () => unknown }>;
    };
  };
}

type AnyState<T> =
  | { readonly status: DeviceActionStatus.NotStarted }
  | { readonly status: DeviceActionStatus.Pending; readonly intermediateValue: unknown }
  | { readonly status: DeviceActionStatus.Stopped }
  | { readonly status: DeviceActionStatus.Completed; readonly output: T }
  | { readonly status: DeviceActionStatus.Error; readonly error: unknown };

type OsVersionDeps = {
  GetOsVersionCommand: new () => unknown;
  isSuccessCommandResult: (result: unknown) => result is { data: GetOsVersionResponse };
};

// Custom DeviceAction: GetOsVersionCommand → output the raw response.
// Going through executeDeviceAction (not raw sendCommand) keeps unlock-device
// interaction flowing through DeviceApps.onInteraction like every other method.
class GetOsVersionDeviceAction {
  readonly input = undefined;

  constructor(private readonly _deps: OsVersionDeps) {}

  _execute(internalApi: { sendCommand: (cmd: unknown) => Promise<unknown> }): {
    observable: Observable<AnyState<GetOsVersionResponse>>;
    cancel: () => void;
  } {
    const subject = new Subject<AnyState<GetOsVersionResponse>>();
    let cancelled = false;

    (async () => {
      try {
        subject.next({
          status: DeviceActionStatus.Pending,
          intermediateValue: { requiredUserInteraction: 'none' },
        });
        const result = await internalApi.sendCommand(new this._deps.GetOsVersionCommand());
        if (cancelled) return;
        if (!this._deps.isSuccessCommandResult(result)) {
          const errObj = (result as { error?: { message?: string } })?.error;
          throw new Error(errObj?.message ?? 'GetOsVersionCommand failed');
        }
        subject.next({ status: DeviceActionStatus.Completed, output: result.data });
        subject.complete();
      } catch (err) {
        if (cancelled) return;
        subject.next({ status: DeviceActionStatus.Error, error: err });
        subject.complete();
      }
    })();

    return {
      observable: subject.asObservable(),
      cancel: () => {
        cancelled = true;
        subject.next({ status: DeviceActionStatus.Stopped });
        subject.complete();
      },
    };
  }
}

class ListAvailableAppsDeviceAction {
  readonly input = undefined;

  private readonly _GetOsVersionCommand: new () => unknown;

  private readonly _isSuccessCommandResult: (
    result: unknown,
  ) => result is { data: GetOsVersionResponse };

  constructor(deps: OsVersionDeps) {
    this._GetOsVersionCommand = deps.GetOsVersionCommand;
    this._isSuccessCommandResult = deps.isSuccessCommandResult;
  }

  _execute(internalApi: InternalApiLike): {
    observable: Observable<AnyState<DmkApplication[]>>;
    cancel: () => void;
  } {
    const subject = new Subject<AnyState<DmkApplication[]>>();
    let cancelled = false;

    (async () => {
      try {
        subject.next({
          status: DeviceActionStatus.Pending,
          intermediateValue: { requiredUserInteraction: 'none' },
        });

        const osVersionResult = await internalApi.sendCommand(new this._GetOsVersionCommand());
        if (cancelled) return;
        if (!this._isSuccessCommandResult(osVersionResult)) {
          const errObj = (osVersionResult as { error?: { message?: string } })?.error;
          throw new Error(errObj?.message ?? 'GetOsVersionCommand failed');
        }

        const managerApi = internalApi.getManagerApiService();
        const either = await managerApi.getAppList(osVersionResult.data).run();
        if (cancelled) return;
        if (either.isLeft()) {
          const httpErr = either.extract() as { message?: string };
          throw new Error(httpErr?.message ?? 'Manager API getAppList failed');
        }

        const apps = either.extract() as DmkApplication[];
        subject.next({ status: DeviceActionStatus.Completed, output: apps });
        subject.complete();
      } catch (err) {
        if (cancelled) return;
        subject.next({ status: DeviceActionStatus.Error, error: err });
        subject.complete();
      }
    })();

    return {
      observable: subject.asObservable(),
      cancel: () => {
        cancelled = true;
        subject.next({ status: DeviceActionStatus.Stopped });
        subject.complete();
      },
    };
  }
}
