import { CoreApi, PROTO } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallStarcoinMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
};

export function CallStarcoinMethods({
  SDK,
  selectedDevice: currentDevice,
}: CallStarcoinMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Starcoin Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="starcoinGetAddress"
          options={[
            { name: 'path', value: "m/44'/101010'/0'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.starcoinGetAddress(connectId, deviceId, { ...data })}
        />

        <MethodInvoke
          title="starcoinGetPublicKey"
          options={[
            { name: 'path', value: "m/44'/101010'/0'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.starcoinGetPublicKey(connectId, deviceId, { ...data })}
        />

        <MethodInvoke
          title="starcoinSignMessage"
          options={[
            { name: 'path', value: "m/44'/101010'/0'/0'/0'", type: 'string' },
            {
              name: 'messageHex',
              value: '6578616d706c65206d657373616765', // 'example message'
              type: 'string',
            },
          ]}
          onCall={data => SDK.starcoinSignMessage(connectId, deviceId, { ...data } as any)}
        />

        <MethodInvoke
          title="starcoinVerifyMessage"
          options={[
            {
              name: 'publicKey',
              value: 'cf90aea8962229869bcba527f0cf0de73ad4c22fe27ad2875007e967db7056f5',
              type: 'string',
            },
            {
              name: 'messageHex',
              value: '0x6578616d706c65206d657373616765', // 'example message'
              type: 'string',
            },
            {
              name: 'signature',
              value:
                '447d2c3131c32d176106482d8fc780d933f13b37b0f06beee27de5e73a945e8c807f7764d269a196306f53383a26ab632913f4076457e3230b9defafe1c6ba0b',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.starcoinVerifyMessage(connectId, deviceId, { ...data } as unknown as any)
          }
        />

        <MethodInvoke
          title="starcoinSignTransaction"
          options={[
            { name: 'path', value: "m/44'/101010'/0'/0'/0'", type: 'string' },
            { name: 'rawTx', value: undefined, type: 'string' },
          ]}
          onCall={data =>
            SDK.starcoinSignTransaction(connectId, deviceId, { ...data } as unknown as any)
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
