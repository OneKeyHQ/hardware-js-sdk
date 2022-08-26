import { CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallSolanaMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
};

export function CallSolanaMethods({ SDK, selectedDevice: currentDevice }: CallSolanaMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Solana Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="solGetAddress"
          options={[
            { name: 'path', value: "m/44'/501'/0'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.solGetAddress(connectId, deviceId, { ...data })}
        />

        <MethodInvoke
          title="solSignTransaction"
          options={[
            { name: 'path', value: "m/44'/501'/0'/0'", type: 'string' },
            {
              name: 'rawTx',
              value:
                '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.solSignTransaction(connectId, deviceId, {
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
