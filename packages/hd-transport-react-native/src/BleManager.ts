import BleUtils from '@onekeyfe/react-native-ble-utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { LoggerNames, getLogger } from '@onekeyfe/hd-core';

import type { Peripheral } from '@onekeyfe/react-native-ble-utils';

const Logger = getLogger(LoggerNames.HdBleTransport);

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
    let timeout: any | undefined;

    const cleanup = (cleanupListener: (() => void) | undefined) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (cleanupListener) cleanupListener();
    };

    const cleanupListener = BleUtils.onDeviceBondState(peripheral => {
      if (peripheral.id?.toLowerCase() !== bleMacAddress.toLowerCase()) {
        return;
      }
      const { bondState } = peripheral;

      if (bondState.preState === 'BOND_NONE' && bondState.state === 'BOND_BONDING') {
        timeout = setTimeout(() => {
          cleanup(cleanupListener);
          reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceNotBonded, 'device is not bonded'));
        }, 60 * 1000);
      }

      const hasBonded = bondState.preState === 'BOND_BONDING' && bondState.state === 'BOND_BONDED';
      const hasCanceled = bondState.preState === 'BOND_BONDING' && bondState.state === 'BOND_NONE';
      Logger.debug('onDeviceBondState bondState:', bondState);
      if (hasBonded) {
        cleanup(cleanupListener);
        resolve(peripheral);
      } else if (hasCanceled) {
        cleanup(cleanupListener);
        reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceBondedCanceled, 'bonding canceled'));
      }
    });
  });
