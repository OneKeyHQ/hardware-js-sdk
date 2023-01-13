import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallPolkadotMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallPolkadotMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallPolkadotMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Polkadot Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="polkadotGetAddress"
          options={[
            { name: 'path', value: "m/44'/354'/0'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.polkadotGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="polkadotGetAddress [bundle]"
          options={[]}
          onCall={data =>
            SDK.polkadotGetAddress(connectId, deviceId, {
              ...commonParams,
              bundle: [
                { path: "m/44'/354'/0'/0'/0'", showOnOneKey: false },
                { path: "m/44'/354'/1'/0'/0'", showOnOneKey: false },
                { path: "m/44'/354'/2'/0'/0'", showOnOneKey: false },
                { path: "m/44'/354'/3'/0'/0'", showOnOneKey: false },
                { path: "m/44'/354'/4'/0'/0'", showOnOneKey: false },
                { path: "m/44'/354'/5'/0'/0'", showOnOneKey: false },
                { path: "m/44'/354'/6'/0'/0'", showOnOneKey: false },
                { path: "m/44'/354'/7'/0'/0'", showOnOneKey: false },
                { path: "m/44'/354'/8'/0'/0'", showOnOneKey: false },
                { path: "m/44'/354'/9'/0'/0'", showOnOneKey: false },
              ],
            })
          }
        />

        <MethodInvoke
          title="polkadotGetPublicKey"
          options={[
            { name: 'path', value: "m/44'/354'/0'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data =>
            SDK.polkadotGetPublicKey(connectId, deviceId, { ...commonParams, ...data })
          }
        />

        <MethodInvoke
          title="polkadotSignTransaction"
          options={[
            { name: 'path', value: "m/44'/354'/0'/0'/0'", type: 'string' },
            {
              name: 'rawTx',
              value:
                '040300388671dd546ba19495211c8cdc200600f9798cf078fca0fb4749ebbc0579c12a0700e40b5402350128009a24000012000000e143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423ee356a704dbe75762aaae87b0f4702aafd09e67eed5d09a3a4b0e7da6c37b6f54',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.polkadotSignTransaction(connectId, deviceId, {
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
