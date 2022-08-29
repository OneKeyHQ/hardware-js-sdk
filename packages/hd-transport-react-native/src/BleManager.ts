import BleManager from 'react-native-ble-manager';

export const initializeBleManager = () => {
  BleManager.start({ showAlert: false });
};

/**
 * get the device basic info of connected devices
 * @param serviceUuids
 * @returns {Promise<[string[]]>}
 */
export const getConnectedDeviceIds = async (serviceUuids: string[]) => {
  const connectedPeripherals = await BleManager.getConnectedPeripherals(serviceUuids);
  return connectedPeripherals.map(peripheral => {
    const { id, name, advertising = {} } = peripheral;
    return { id, name, ...advertising };
  });
};

export const getBondedDevices = async () => {
  const peripherals = await BleManager.getBondedPeripherals();
  return peripherals.map(peripheral => {
    const { id, name, advertising = {} } = peripheral;
    return { id, name, ...advertising };
  });
};

export const refreshCache = async (peripheralId: string) => {
  try {
    await BleManager.connect(peripheralId);
    await BleManager.refreshCache(peripheralId);
    await BleManager.disconnect(peripheralId, true);
    console.log('refreshCache success');
  } catch (error) {
    console.log('refreshCache error: ', error);
  }
};
