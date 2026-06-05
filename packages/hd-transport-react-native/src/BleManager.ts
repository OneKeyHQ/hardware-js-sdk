import BleUtils from '@onekeyfe/react-native-ble-utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { bleLogger } from './logger';

import type { Peripheral } from '@onekeyfe/react-native-ble-utils';

const Logger = bleLogger;

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
      reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded, 'device is not bonded'));
    }, 60 * 1000);

    const cleanupListener = BleUtils.onDeviceBondState(peripheral => {
      if (peripheral.id?.toLowerCase() !== bleMacAddress.toLowerCase()) {
        return;
      }
      const { bondState } = peripheral;

      const hasBonded = bondState.preState === 'BOND_BONDING' && bondState.state === 'BOND_BONDED';
      const hasCanceled = bondState.preState === 'BOND_BONDING' && bondState.state === 'BOND_NONE';
      Logger.debug('onDeviceBondState bondState:', bondState);
      if (hasBonded) {
        cleanup();
        resolve(peripheral);
      } else if (hasCanceled) {
        cleanup();
        reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceBondedCanceled, 'bonding canceled'));
      }
    });
  });
