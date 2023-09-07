import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { StyleSheet, Text, View } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallSuiMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallSuiMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallSuiMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Sui Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="suiGetAddress"
          options={[
            { name: 'path', value: "m/44'/784'/0'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.suiGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="suiGetAddress [bundle]"
          options={[]}
          onCall={data =>
            SDK.suiGetAddress(connectId, deviceId, {
              ...commonParams,
              bundle: [
                { path: "m/44'/784'/0'/0'/0'", showOnOneKey: false },
                { path: "m/44'/784'/1'/0'/0'", showOnOneKey: false },
                { path: "m/44'/784'/2'/0'/0'", showOnOneKey: false },
                { path: "m/44'/784'/3'/0'/0'", showOnOneKey: false },
                { path: "m/44'/784'/4'/0'/0'", showOnOneKey: false },
                { path: "m/44'/784'/5'/0'/0'", showOnOneKey: false },
                { path: "m/44'/784'/6'/0'/0'", showOnOneKey: false },
                { path: "m/44'/784'/7'/0'/0'", showOnOneKey: false },
                { path: "m/44'/784'/8'/0'/0'", showOnOneKey: false },
                { path: "m/44'/784'/9'/0'/0'", showOnOneKey: false },
              ],
            })
          }
        />

        <MethodInvoke
          title="suiGetPublicKey"
          options={[
            { name: 'path', value: "m/44'/784'/0'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.suiGetPublicKey(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="suiSignMessage"
          options={[
            { name: 'path', value: "m/44'/784'/0'/0'/0'", type: 'string' },
            {
              name: 'messageHex',
              value: '010203',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.suiSignMessage(connectId, deviceId, {
              ...commonParams,
              ...data,
            } as unknown as any)
          }
        />

        <MethodInvoke
          title="suiSignTransaction"
          options={[
            { name: 'path', value: "m/44'/784'/0'/0'/0'", type: 'string' },
            {
              name: 'rawTx',
              value:
                '5472616e73616374696f6e446174613a3a0005012da3a446433920a4a290f834710575bd943631de0200000000000000207a7b5943ca4bfa227033fa7c6ddb452c7f7f8a18f73f1058b4ac07a14d22e0a5017cb14a7a318219299f008f31e977808c96e372a60140420f0000000000c68311c708918b26fa85b4ded86977baf81086872da3a446433920a4a290f834710575bd943631de0200000000000000207a7b5943ca4bfa227033fa7c6ddb452c7f7f8a18f73f1058b4ac07a14d22e0a501000000000000007a00000000000000',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.suiSignTransaction(connectId, deviceId, {
              ...commonParams,
              ...data,
            } as unknown as any)
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
