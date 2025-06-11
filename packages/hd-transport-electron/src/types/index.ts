// Export only type definitions to avoid bundling Noble into renderer process
export type { ElectronBleAPI, BluetoothPairingDetails, BluetoothPairingResponse } from '../types';
export type { DeviceInfo, CharacteristicPair, NobleModule, Logger } from './noble-extended';
