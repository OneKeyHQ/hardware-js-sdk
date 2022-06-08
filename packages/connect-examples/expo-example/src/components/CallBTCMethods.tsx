import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallBTCMethodsProps = {
  SDK: any;
  selectedDevice: Device | null;
};

export function CallBTCMethods({ SDK, selectedDevice: currentDevice }: CallBTCMethodsProps) {
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>BTC Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="btcGetAddress"
          options={[
            { name: 'path', value: "m/44'/0'/0'/0/0", type: 'string' },
            { name: 'coin', value: 'btc', type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
            { name: 'multisig', value: undefined, type: 'string' },
            { name: 'scriptType', value: undefined, type: 'string' },
          ]}
          onCall={data =>
            SDK.btcGetAddress({
              device: { ...currentDevice },
              ...data,
            })
          }
        />

        <MethodInvoke
          title="btcGetPublicKey"
          options={[
            { name: 'path', value: "m/44'/0'/0'/0/0", type: 'string' },
            { name: 'coin', value: 'btc', type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
            { name: 'scriptType', value: undefined, type: 'string' },
          ]}
          onCall={data =>
            SDK.btcGetPublicKey({
              device: { ...currentDevice },
              ...data,
            })
          }
        />

        <MethodInvoke
          title="btcSignMessage"
          options={[
            { name: 'path', value: "m/44'/0'/0'/0/0", type: 'string' },
            { name: 'coin', value: 'btc', type: 'string' },
            {
              name: 'messageHex',
              value: '4578616d706c65206d657373616765', // 'Example message'
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.btcSignMessage({
              device: { ...currentDevice },
              ...data,
            })
          }
        />

        <MethodInvoke
          title="btcVerifyMessage"
          options={[
            { name: 'address', value: '3BD8TL6iShVzizQzvo789SuynEKGpLTms9', type: 'string' },
            { name: 'coin', value: 'btc', type: 'string' },
            {
              name: 'messageHex',
              value: '0x6578616d706c65206d657373616765', // 'example message'
              type: 'string',
            },
            {
              name: 'signature',
              value:
                '0x24eeef2f7b4e075a90c9f49e2152ef744c3d1b5b42bcbfa5363efc5c3015338b7a529b400ecde45c34cedbed9978438b14be3ffb09be041752a68de46f70a7b1ab',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.btcVerifyMessage({
              device: { ...currentDevice },
              ...data,
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    padding: 12,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
