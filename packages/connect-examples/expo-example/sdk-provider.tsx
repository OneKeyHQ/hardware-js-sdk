import { CoreApi } from '@onekeyfe/hd-core';
import { Platform } from 'react-native';

let SDK: CoreApi;

export async function getOneKeySDK() {
  if (SDK) return SDK;

  if (Platform.OS === 'web') {
    SDK = (await import('@onekeyfe/hd-web-sdk')) as unknown as CoreApi;
  } else {
    SDK = (await import('@onekeyfe/hd-ble-sdk')) as unknown as CoreApi;
  }

  return SDK;
}
