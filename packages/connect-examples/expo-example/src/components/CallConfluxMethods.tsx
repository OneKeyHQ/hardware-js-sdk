import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallConfluxMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallConfluxMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallConfluxMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Conflux Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="confluxGetAddress"
          options={[
            { name: 'path', value: "m/44'/503'/0'/0/0", type: 'string' },
            { name: 'chainId', value: undefined, type: 'number' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.confluxGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="confluxSignMessage"
          options={[
            { name: 'path', value: "m/44'/503'/0'/0/0", type: 'string' },
            { name: 'messageHex', value: '0x6578616d706c65206d657373616765', type: 'string' },
          ]}
          onCall={data =>
            SDK.confluxSignMessage(connectId, deviceId, {
              ...commonParams,
              ...data,
            } as unknown as any)
          }
        />

        <MethodInvoke
          title="confluxSignMessageCIP23"
          options={[
            { name: 'path', value: "m/44'/503'/0'/0/0", type: 'string' },
            {
              name: 'domainHash',
              value: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
              type: 'string',
            },
            {
              name: 'messageHash',
              value: '0x07bc1c4f3268fc74b60587e9bb7e01e38a7d8a9a3f51202bf25332aa2c75c644',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.confluxSignMessageCIP23(connectId, deviceId, {
              ...commonParams,
              ...data,
            } as unknown as any)
          }
        />

        <MethodInvoke
          title="confluxSignTransaction"
          options={[
            { name: 'path', value: "m/44'/503'/0'/0/0", type: 'string' },
            {
              name: 'transaction.to',
              value: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              type: 'string',
            },
            {
              name: 'transaction.value',
              value: '0xf4240',
              type: 'string',
            },
            {
              name: 'transaction.data',
              value: '0x01',
              type: 'string',
            },
            {
              name: 'transaction.chainId',
              value: 1,
              type: 'number',
            },
            {
              name: 'transaction.nonce',
              value: '0x00',
              type: 'string',
            },
            {
              name: 'transaction.epochHeight',
              value: '0x00',
              type: 'string',
            },
            {
              name: 'transaction.gasLimit',
              value: '0x5208',
              type: 'string',
            },
            {
              name: 'transaction.storageLimit',
              value: '0x5208',
              type: 'string',
            },
            {
              name: 'transaction.gasPrice',
              value: '0xbebc200',
              type: 'string',
            }
          ]}
          onCall={data =>
            SDK.confluxSignTransaction(connectId, deviceId, {
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
