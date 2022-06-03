import BleManager from 'react-native-ble-manager';

export const initializeBleManager = () => {
  BleManager.start({ showAlert: false });
};

/**
 * get the id of connected devices
 * @param serviceUuids
 * @returns {Promise<[string[]]>}
 */
export const getConnectedDeviceIds = async (serviceUuids: string[]) => {
  const connectedPeripherals = await BleManager.getConnectedPeripherals(serviceUuids);
  return connectedPeripherals.map(peripheral => peripheral.id);
};
