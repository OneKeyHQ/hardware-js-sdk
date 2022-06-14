import { CoreApi, PROTO } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallBTCMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
};

export function CallBTCMethods({ SDK, selectedDevice: currentDevice }: CallBTCMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
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
          onCall={data => SDK.btcGetAddress(connectId, { ...data })}
        />

        <MethodInvoke
          title="btcGetPublicKey"
          options={[
            { name: 'path', value: "m/44'/0'/0'/0/0", type: 'string' },
            { name: 'coin', value: 'btc', type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
            { name: 'scriptType', value: undefined, type: 'string' },
          ]}
          onCall={data => SDK.btcGetPublicKey(connectId, { ...data })}
        />

        <MethodInvoke
          title="btcSignMessage"
          options={[
            { name: 'path', value: "m/44'/0'/0'/0/0", type: 'string' },
            { name: 'coin', value: 'btc', type: 'string' },
            {
              name: 'messageHex',
              value: '6578616d706c65206d657373616765', // 'example message'
              type: 'string',
            },
          ]}
          onCall={data => SDK.btcSignMessage(connectId, { ...data } as any)}
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
          onCall={data => SDK.btcVerifyMessage(connectId, { ...data } as unknown as any)}
        />

        <MethodInvoke
          title="btcSignTransaction"
          options={[{ name: 'coin', value: 'test', type: 'string' }]}
          onCall={data =>
            SDK.btcSignTransaction(connectId, {
              inputs: [
                {
                  address_n: [2147483692, 2147483648, 2147483648, 0, 0],
                  prev_hash: '31287e47ceeacf2ee1797a08413e8d6431fb08fd14fd7d0c5134e99fbc16f0c4',
                  prev_index: 0,
                  amount: '1058412',
                },
              ],
              outputs: [
                {
                  address_n: [2147483692, 2147483648, 2147483648, 0, 0],
                  amount: '500000',
                  script_type: 'PAYTOADDRESS',
                },
                {
                  address: 'mnQv1Ty6iGNSmn3Fttdc3e5tqHn88gtJ6t',
                  amount: '100000',
                  script_type: 'PAYTOADDRESS',
                },
              ],
              refTxs: [
                {
                  hash: '31287e47ceeacf2ee1797a08413e8d6431fb08fd14fd7d0c5134e99fbc16f0c4',
                  inputs: [
                    {
                      prev_hash: '4380a32516a57fd5bb5634436a5113449f451ab6ab8f180ce287e2a526299676',
                      prev_index: 1,
                      script_sig: '',
                      sequence: 4294967294,
                    },
                  ],
                  bin_outputs: [
                    {
                      amount: 1058412,
                      script_pubkey: '76a9140b535ee6a35c99cf2b65953ba3e84ef981b60cf688ac',
                    },
                    {
                      amount: 2797469652,
                      script_pubkey: '76a9144ba479f8fabb30a5c83a70922e4172675b4393b988ac',
                    },
                  ],
                  lock_time: 2254775,
                  version: 2,
                },
              ],
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
