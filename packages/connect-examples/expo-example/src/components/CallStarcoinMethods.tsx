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
          onCall={data => SDK.starcoinGetAddress(connectId, { ...data })}
        />

        <MethodInvoke
          title="starcoinGetPublicKey"
          options={[
            { name: 'path', value: "m/44'/101010'/0'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.starcoinGetPublicKey(connectId, { ...data })}
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
          onCall={data => SDK.starcoinSignMessage(connectId, { ...data } as any)}
        />

        <MethodInvoke
          title="starcoinVerifyMessage"
          options={[
            {
              name: 'publicKey',
              value: 'bf70027c9e4cea4584bd6016748c21e350708b2c166bf61ea78a147b5ff320ae',
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
                'd39843f39983cf42609d1667f1c5a7958d8aef6b06880b93f67833630113a11c6847607a184d17da24bfaf799afc45fdcf2abef34142a23cabeb0d11374ac103',
              type: 'string',
            },
          ]}
          onCall={data => SDK.starcoinVerifyMessage(connectId, { ...data } as unknown as any)}
        />

        <MethodInvoke
          title="starcoinSignTransaction"
          options={[
            { name: 'path', value: "m/44'/101010'/0'/0'/0'", type: 'string' },
            { name: 'rawTx', value: undefined, type: 'string' },
          ]}
          onCall={data => SDK.starcoinSignTransaction(connectId, { ...data } as unknown as any)}
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
