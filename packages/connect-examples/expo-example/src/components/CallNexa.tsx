import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallNexaMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallNexaMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallNexaMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Nexa Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="NexaGetAddress"
          options={[
            { name: 'path', value: "m/44'/29223'/0'/0/0", type: 'string' },
            { name: 'prefix', value: 'nexatest', type: 'string' },
            { name: 'scheme', value: 'schnorr', type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.nexaGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="NexaGetAddress [bundle]"
          options={[]}
          onCall={_ =>
            SDK.nexaGetAddress(connectId, deviceId, {
              ...commonParams,
              bundle: [
                { path: "m/44'/29223'/0'/0/0", showOnOneKey: false },
                { path: "m/44'/29223'/0'/0/1", showOnOneKey: false },
                { path: "m/44'/29223'/0'/0/2", showOnOneKey: false },
                { path: "m/44'/29223'/0'/0/3", showOnOneKey: false },
                { path: "m/44'/29223'/0'/0/4", showOnOneKey: false },
                { path: "m/44'/29223'/0'/0/5", showOnOneKey: false },
                { path: "m/44'/29223'/0'/0/6", showOnOneKey: false },
                { path: "m/44'/29223'/0'/0/7", showOnOneKey: false },
                { path: "m/44'/29223'/0'/0/8", showOnOneKey: false },
                { path: "m/44'/29223'/0'/0/9", showOnOneKey: false },
              ],
            })
          }
        />

        <MethodInvoke
          title="NexaSignTransaction"
          options={[
            { name: 'path', value: `m/44'/29223'/0'/0/0`, type: 'string' },
            { name: 'prefix', value: 'nexatest', type: 'string' },
            {
              name: 'message',
              value:
                '000578c6c76f10156fbc7ee4a8faa7a4e92b6adadc978abf66ae70f13a03b75d36cd7a6acc0967cc9f2f632f585cb7b4297873858c23233792767fd4ae662ec1093bb13029ce7b1f559ef5e747fcac439f1455a2ec7c5f09b72290795e70665044026cad0dba749a112e0d2ea420fa68e0218453db6bb0744e44eb51edc76af8bb6871190000000000',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.nexaSignTransaction(connectId, deviceId, {
              inputs: [
                {
                  path: "m/44'/29223'/0'/0/0",
                  message:
                    '000578c6c76f10156fbc7ee4a8faa7a4e92b6adadc978abf66ae70f13a03b75d36cd7a6acc0967cc9f2f632f585cb7b4297873858c23233792767fd4ae662ec1093bb13029ce7b1f559ef5e747fcac439f1455a2ec7c5f09b72290795e70665044026cad0dba749a112e0d2ea420fa68e0218453db6bb0744e44eb51edc76af8bb6871190000000000',
                  prefix: 'nexatest',
                  ...data,
                },
              ],
              ...commonParams,
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
