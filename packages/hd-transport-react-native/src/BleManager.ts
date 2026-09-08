import BleUtils from '@onekeyfe/react-native-ble-utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { bleLogger } from './logger';

import type { Peripheral } from '@onekeyfe/react-native-ble-utils';

const Logger = bleLogger;

// Android BluetoothDevice.EXTRA_UNBOND_REASON values.
const bondFailureReasons: Record<number, string> = {
  1: 'authentication_failed',
  2: 'rejected',
  3: 'canceled',
  4: 'device_unreachable',
  5: 'discovery_in_progress',
  6: 'timeout',
  7: 'repeated_attempts',
  8: 'remote_canceled',
  9: 'removed',
};

/**
 * get the device basic info of connected devices
 * @param serviceUuids
 * @returns {Promise<[string[]]>}
 */
export const getConnectedDeviceIds = (serviceUuids: string[]) =>
  BleUtils.getConnectedPeripherals(serviceUuids);

export const getBondedDevices = () => BleUtils.getBondedPeripherals();

export const pairDevice = (macAddress: string) => BleUtils.pairDevice(macAddress);

export const onDeviceBondState = (bleMacAddress: string): Promise<Peripheral | undefined> =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (cleanupListener) cleanupListener();
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(
        ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded, 'Bluetooth pairing timed out', {
          phase: 'bond',
          reason: 'timeout',
        })
      );
    }, 60 * 1000);

    const cleanupListener = BleUtils.onDeviceBondState(peripheral => {
      if (peripheral.id?.toLowerCase() !== bleMacAddress.toLowerCase()) {
        return;
      }
      const { bondState } = peripheral;

      const hasBonded = bondState.preState === 'BOND_BONDING' && bondState.state === 'BOND_BONDED';
      const hasFailed = bondState.preState === 'BOND_BONDING' && bondState.state === 'BOND_NONE';
      Logger.debug('onDeviceBondState bondState:', bondState);
      if (hasBonded) {
        cleanup();
        resolve(peripheral);
      } else if (hasFailed) {
        cleanup();
        const nativeReason =
          'reason' in bondState && typeof bondState.reason === 'number'
            ? bondState.reason
            : undefined;
        const reason =
          nativeReason === undefined ? 'unknown' : bondFailureReasons[nativeReason] ?? 'unknown';
        const params = {
          phase: 'bond',
          reason,
          ...(nativeReason === undefined ? {} : { nativeReason }),
        };
        if (reason === 'timeout') {
          // Connection timeouts are retried by Core; pairing requires a new user attempt.
          reject(
            ERRORS.TypedError(
              HardwareErrorCode.BleDeviceNotBonded,
              'Bluetooth pairing timed out',
              params
            )
          );
        } else if (reason === 'canceled') {
          reject(
            ERRORS.TypedError(
              HardwareErrorCode.BleDeviceBondedCanceled,
              'Bluetooth pairing canceled',
              params
            )
          );
        } else {
          reject(
            ERRORS.TypedError(
              HardwareErrorCode.BleDeviceNotBonded,
              'Bluetooth pairing failed',
              params
            )
          );
        }
      }
    });
  });
