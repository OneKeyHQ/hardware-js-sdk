import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallFilecoinMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallFilecoinMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallFilecoinMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Filecoin Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="filecoinGetAddress"
          options={[
            { name: 'path', value: "m/44'/461'/0'/0/0", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
            { name: 'isTestnet', value: true, type: 'boolean' },
          ]}
          onCall={data => SDK.filecoinGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />
        <MethodInvoke
          title="filecoinSignTransaction"
          options={[
            { name: 'path', value: "m/44'/461'/0'/0/0", type: 'string' },
            { name: 'isTestnet', value: true, type: 'boolean' },
            {
              name: 'rawTx',
              value:
                '8a0055015a2fd22d821d5855e401118fef6ea0373dadbde355018ae51a9d6c9fe1872fd31b10c96df89106790297004900016345785d8a00001a0009354445001730ee6e440001865e0040',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.filecoinSignTransaction(connectId, deviceId, { ...commonParams, ...data })
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
