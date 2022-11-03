import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallAptosMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallAptosMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallAptosMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Aptos Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="aptosGetAddress"
          options={[
            { name: 'path', value: "m/44'/637'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.aptosGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="aptosGetAddress [bundle]"
          options={[]}
          onCall={data =>
            SDK.aptosGetAddress(connectId, deviceId, {
              ...commonParams,
              bundle: [
                { path: "m/44'/637'/0'/0'/0'", showOnOneKey: false },
                { path: "m/44'/637'/1'/0'/0'", showOnOneKey: false },
                { path: "m/44'/637'/2'/0'/0'", showOnOneKey: false },
                { path: "m/44'/637'/3'/0'/0'", showOnOneKey: false },
                { path: "m/44'/637'/4'/0'/0'", showOnOneKey: false },
                { path: "m/44'/637'/5'/0'/0'", showOnOneKey: false },
                { path: "m/44'/637'/6'/0'/0'", showOnOneKey: false },
                { path: "m/44'/637'/7'/0'/0'", showOnOneKey: false },
                { path: "m/44'/637'/8'/0'/0'", showOnOneKey: false },
                { path: "m/44'/637'/9'/0'/0'", showOnOneKey: false },
              ],
            })
          }
        />

        <MethodInvoke
          title="AptosGetPublicKey"
          options={[
            { name: 'path', value: "m/44'/637'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.aptosGetPublicKey(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="AptosSignMessage"
          options={[
            { name: 'path', value: "m/44'/637'/0'/0'/0'", type: 'string' },
            { name: 'payload.address', value: undefined, type: 'string' },
            { name: 'payload.chainId', value: undefined, type: 'string' },
            { name: 'payload.application', value: undefined, type: 'string' },
            { name: 'payload.nonce', value: '12345', type: 'string' },
            { name: 'payload.message', value: 'hello', type: 'string' },
          ]}
          onCall={data =>
            SDK.aptosSignMessage(connectId, deviceId, {
              ...commonParams,
              ...(data as unknown as any),
            })
          }
        />

        <MethodInvoke
          title="aptosSignTransaction"
          options={[
            { name: 'path', value: "m/44'/637'/0'/0'", type: 'string' },
            {
              name: 'rawTx',
              value:
                '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.aptosSignTransaction(connectId, deviceId, {
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
