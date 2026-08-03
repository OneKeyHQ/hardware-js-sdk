import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { LoggerNames, getLogger } from '../../utils';
import { isProtocolV2UiEnabled, resolveProtocolV2UiInteraction } from './uiInteraction';
import { refreshProtocolV2DeviceStatus } from './walletSession';

import type { BaseMethod } from '../../api/BaseMethod';
import type { Device } from '../../device/Device';
import type { HardwareUiInteractionMeta } from '../../events';
import type { ProtocolV2UiInteractionCoordinator } from './uiInteraction';

const Log = getLogger(LoggerNames.Core);

export type ProtocolV2UnlockContext = {
  preflightCompleted: boolean;
};

export const createProtocolV2UnlockContext = (): ProtocolV2UnlockContext => ({
  preflightCompleted: false,
});

type RunnableMethod = Pick<
  BaseMethod,
  | 'run'
  | 'unlockPolicy'
  | 'useDevicePassphraseState'
  | 'protocolV2UiInteraction'
  | 'protocolV2UiMode'
  | 'params'
  | 'payload'
> & {
  name?: string;
  protocolV2UnlockContext?: ProtocolV2UnlockContext;
};

type UiInteractionCoordinator = Pick<
  ProtocolV2UiInteractionCoordinator,
  'enterMethodInteraction' | 'enterUnlockInteraction'
>;

type RunMethodWithUnlockPolicyOptions<T> = {
  context?: ProtocolV2UnlockContext;
  uiCoordinator?: UiInteractionCoordinator;
  afterStatusBeforeUnlock?: () => void | Promise<void>;
  prepare?: () => Promise<void>;
  run?: () => Promise<T>;
};

export async function runMethodWithUnlockPolicy<T = unknown>(
  method: RunnableMethod,
  device: Device,
  options: RunMethodWithUnlockPolicyOptions<T> = {}
): Promise<T> {
  const {
    context = createProtocolV2UnlockContext(),
    uiCoordinator,
    afterStatusBeforeUnlock,
    prepare,
    run: configuredRun,
  } = options;
  const run = configuredRun ?? (() => method.run() as Promise<T>);
  method.protocolV2UnlockContext = context;

  const shouldEmitUi = isProtocolV2UiEnabled(method);
  const shouldCoordinateUi = shouldEmitUi && uiCoordinator !== undefined;
  const requiresPreUnlock =
    device.isProtocolV2() &&
    (method.useDevicePassphraseState || method.unlockPolicy === 'unlock-before-run') &&
    !device.isBootloader?.() &&
    !device.isRomloader?.();

  if (requiresPreUnlock && !context.preflightCompleted) {
    const status = await refreshProtocolV2DeviceStatus(device);
    if (typeof status?.unlocked !== 'boolean') {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 DeviceStatus did not report an explicit unlock state.'
      );
    }

    await afterStatusBeforeUnlock?.();

    const isStandardWalletRequest =
      method.unlockPolicy !== 'unlock-before-run' &&
      method.useDevicePassphraseState &&
      method.payload?.useEmptyPassphrase === true;
    const standardWalletSessionOwnsUnlock =
      isStandardWalletRequest && status.passphraseProtection === true;

    if (!status.unlocked && !standardWalletSessionOwnsUnlock) {
      const unlockInteraction: HardwareUiInteractionMeta | undefined = shouldCoordinateUi
        ? uiCoordinator.enterUnlockInteraction(method.name)
        : undefined;
      const unlockedStatus = await device.unlockDevice(
        undefined,
        shouldCoordinateUi
          ? { emitUiEvent: false, interaction: unlockInteraction }
          : {
              source: 'unlock-coordinator',
              reason: 'device-locked',
              deviceOnly: true,
              method: method.name,
            }
      );
      if (unlockedStatus?.unlocked !== true) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Protocol V2 device remained locked after the unlock flow.'
        );
      }
      Log.debug('Protocol V2 pre-unlock completed', { method: method.name });
    }

    context.preflightCompleted = true;
  }

  await prepare?.();

  if (shouldCoordinateUi) {
    uiCoordinator.enterMethodInteraction(resolveProtocolV2UiInteraction(method));
  }

  return run();
}
