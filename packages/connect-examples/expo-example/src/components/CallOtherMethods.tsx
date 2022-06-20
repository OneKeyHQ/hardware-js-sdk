import { CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallOtherMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
};

export function CallOtherMethods({ SDK, selectedDevice: currentDevice }: CallOtherMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Other Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="cipherKeyValue"
          options={[
            { name: 'path', value: "m/49'/0'/0'", type: 'string' },
            {
              name: 'key',
              value: 'This text is displayed on OneKey during encrypt',
              type: 'string',
            },
            { name: 'value', value: '1c0ffeec0ffeec0ffeec0ffeec0ffee1', type: 'string' },
            { name: 'encrypt', value: true, type: 'boolean' },
            { name: 'askOnEncrypt', value: true, type: 'boolean' },
            { name: 'askOnDecrypt', value: true, type: 'boolean' },
            { name: 'iv', value: undefined, type: 'string' },
          ]}
          onCall={data => SDK.cipherKeyValue(connectId, { ...data })}
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
