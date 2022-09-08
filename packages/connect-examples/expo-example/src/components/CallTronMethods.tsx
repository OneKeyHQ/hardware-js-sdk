import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallTronMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallTronMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallTronMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Tron Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="tronGetAddress"
          options={[
            { name: 'path', value: "m/44'/195'/0'/0/0", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.tronGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="tronSignMessage"
          options={[
            { name: 'path', value: "m/44'/195'/0'/0/0", type: 'string' },
            { name: 'messageHex', value: '0x6578616d706c65206d657373616765', type: 'string' },
          ]}
          onCall={data =>
            SDK.tronSignMessage(connectId, deviceId, { ...commonParams, ...data } as unknown as any)
          }
        />

        <MethodInvoke
          title="tronSignTransaction"
          options={[
            { name: 'path', value: "m/44'/195'/0'/0/0", type: 'string' },
            {
              name: 'transaction.refBlockBytes',
              value: 'ddf1',
              type: 'string',
            },
            {
              name: 'transaction.refBlockHash',
              value: 'd04764f22469a0b8',
              type: 'string',
            },
            {
              name: 'transaction.data',
              value: undefined,
              type: 'string',
            },
            {
              name: 'transaction.feeLimit',
              value: undefined,
              type: 'number',
            },
            { name: 'transaction.expiration', value: 1655692140000, type: 'number' },
            { name: 'transaction.timestamp', value: 1655692083406, type: 'number' },
          ]}
          onCall={data =>
            SDK.tronSignTransaction(connectId, deviceId, {
              ...commonParams,
              // @ts-expect-error
              path: data.path,
              transaction: {
                // @ts-expect-error
                ...data.transaction,
                contract: {
                  transferContract: {
                    toAddress: 'TXrs7yxQLNzig7J9EbKhoEiUp6kWpdWKnD',
                    amount: 100,
                  },
                },
              },
            } as unknown as any)
          }
        />

        <MethodInvoke
          title="tronSignTransaction TRC20"
          options={[
            { name: 'path', value: "m/44'/195'/0'/0/0", type: 'string' },
            {
              name: 'transaction.refBlockBytes',
              value: 'f37c',
              type: 'string',
            },
            {
              name: 'transaction.refBlockHash',
              value: 'aadfb347dabb84de',
              type: 'string',
            },
            {
              name: 'transaction.data',
              value: undefined,
              type: 'string',
            },
            {
              name: 'transaction.feeLimit',
              value: 1000000,
              type: 'number',
            },
            { name: 'transaction.expiration', value: 1657770198000, type: 'number' },
            { name: 'transaction.timestamp', value: 1657770139291, type: 'number' },
          ]}
          onCall={data =>
            SDK.tronSignTransaction(connectId, deviceId, {
              ...commonParams,
              // @ts-expect-error
              path: data.path,
              transaction: {
                // @ts-expect-error
                ...data.transaction,
                contract: {
                  triggerSmartContract: {
                    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                    data: 'a9059cbb000000000000000000000000f01fad0beb95a0a41cb1e68f384b33b846fe7d830000000000000000000000000000000000000000000000000000000000000001',
                  },
                },
              },
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
