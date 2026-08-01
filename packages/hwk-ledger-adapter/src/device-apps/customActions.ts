/* eslint-disable max-classes-per-file -- both classes are duck-typed DMK DeviceAction implementations sharing the same internal types (OsVersionDeps / InternalApiLike / AnyState); splitting would push those types into a third file with no payoff. */
/**
 * Duck-typed DMK DeviceAction implementations for the two flows DMK has no
 * typed wrapper for: fetching OS version and listing available apps in the
 * catalog. Both are routed through `executeDeviceAction` so the
 * `unlock-device` interaction surfaces through the same onInteraction
 * pipeline as every other call.
 */
import { DeviceActionStatus } from '@ledgerhq/device-management-kit';
import { Subject } from 'rxjs';

import type { GetOsVersionResponse } from '@ledgerhq/device-management-kit';
import type { Observable } from 'rxjs';

export interface DmkApplication {
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

export type OsVersionDeps = {
  GetOsVersionCommand: new () => unknown;
  isSuccessCommandResult: (result: unknown) => result is { data: GetOsVersionResponse };
};

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

// Wrapped as a DeviceAction (not raw sendCommand) so unlock-device interaction
// flows through onInteraction like every other method.
export class GetOsVersionDeviceAction {
  readonly input = undefined;

  // eslint-disable-next-line no-useless-constructor, no-empty-function
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

export class ListAvailableAppsDeviceAction {
  readonly input = undefined;

  private readonly _GetOsVersionCommand: new () => unknown;

  private readonly _isSuccessCommandResult: (
    result: unknown
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
