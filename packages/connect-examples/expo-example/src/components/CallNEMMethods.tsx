import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallNEMMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallNEMMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallNEMMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>NEM Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="nemGetAddress"
          options={[
            { name: 'path', value: "m/44'/43'/2'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.nemGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="nemSignTransaction"
          options={[
            { name: 'path', value: "m/44'/1'/0'/0'/0'", type: 'string' },
            { name: 'transaction.amount', value: 2000000, type: 'number' },
            {
              name: 'transaction.recipient',
              value: 'TALICE2GMA34CXHD7XLJQ536NM5UNKQHTORNNT2J',
              type: 'string',
            },
            { name: 'transaction.timeStamp', value: 74649215, type: 'number' },
            { name: 'transaction.type', value: 257, type: 'number' },
            { name: 'transaction.fee', value: 2000000, type: 'number' },
            { name: 'transaction.deadline', value: 74735615, type: 'number' },
            // eslint-disable-next-line no-bitwise
            { name: 'transaction.version', value: -1744830464, type: 'number' },
          ]}
          onCall={data =>
            SDK.nemSignTransaction(connectId, deviceId, {
              ...commonParams,
              // @ts-expect-error
              path: data.path,
              transaction: {
                // @ts-expect-error
                ...data.transaction,
                message: {
                  payload: '746573745f6e656d5f7472616e73616374696f6e5f7472616e73666572',
                  type: 1,
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
