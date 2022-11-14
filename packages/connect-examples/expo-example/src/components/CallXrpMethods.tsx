import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallXrpMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallXrpMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallXrpMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>XRP Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="xrpGetAddress"
          options={[
            { name: 'path', value: "m/44'/144'/0'/0/0", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.xrpGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="xrpSignTransaction"
          options={[
            { name: 'path', value: "m/44'/144'/1'/0/0", type: 'string' },
            {
              name: 'fee',
              value: '12',
              type: 'string',
            },
            {
              name: 'flags',
              value: 0,
              type: 'number',
            },
            {
              name: 'sequence',
              value: 32841006,
              type: 'number',
            },
            {
              name: 'maxLedgerVersion',
              value: 32841630,
              type: 'number',
            },
            {
              name: 'amount',
              value: 1000000,
              type: 'number',
            },
            {
              name: 'destination',
              value: 'rwgumKP89VhMrJ4dRkGVS4tafRfAmZmKf8',
              type: 'string',
            },
          ]}
          onCall={(data: any) =>
            SDK.xrpSignTransaction(connectId, deviceId, {
              ...commonParams,
              path: data.path,
              transaction: {
                fee: data.fee,
                flags: data.flags,
                sequence: data.sequence,
                maxLedgerVersion: data.maxLedgerVersion,
                payment: {
                  amount: data.amount,
                  destination: data.destination,
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
