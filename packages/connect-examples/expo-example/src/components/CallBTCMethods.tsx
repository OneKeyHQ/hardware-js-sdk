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

        <MethodInvoke
          title="btcSignTransaction"
          options={[{ name: 'coin', value: 'btc', type: 'string' }]}
          onCall={data =>
            SDK.btcSignTransaction({
              device: { ...currentDevice },
              inputs: [
                {
                  address_n: [2147483692, 2147483648, 2147483648, 1, 0],
                  prev_index: 0,
                  prev_hash: 'b035d89d4543ce5713c553d69431698116a822c57c03ddacf3f04b763d1999ac',
                },
              ],
              outputs: [
                {
                  address_n: [2147483692, 2147483648, 2147483648, 1, 1],
                  amount: '3181747',
                  script_type: 'PAYTOADDRESS',
                },
                {
                  address: '18WL2iZKmpDYWk1oFavJapdLALxwSjcSk2',
                  amount: '200000',
                  script_type: 'PAYTOADDRESS',
                },
              ],
              refTxs: [
                {
                  hash: 'b035d89d4543ce5713c553d69431698116a822c57c03ddacf3f04b763d1999ac',
                  inputs: [
                    {
                      prev_hash: '448946a44f1ef514601ccf9b22cc3e638c69ea3900b67b87517ea673eb0293dc',
                      prev_index: 0,
                      script_sig:
                        '47304402202872cb8459eed053dcec0f353c7e293611fe77615862bfadb4d35a5d8807a4cf022015057aa0aaf72ab342b5f8939f86f193ad87b539931911a72e77148a1233e022012103f66bbe3c721f119bb4b8a1e6c1832b98f2cf625d9f59242008411dd92aab8d94',
                      sequence: 4294967295,
                    },
                  ],
                  bin_outputs: [
                    {
                      amount: 3431747,
                      script_pubkey: '76a91441352a84436847a7b660d5e76518f6ebb718dedc88ac',
                    },
                    {
                      amount: 10000,
                      script_pubkey: '76a9141403b451c79d34e6a7f6e36806683308085467ac88ac',
                    },
                  ],
                  lock_time: 0,
                  version: 1,
                },
              ],
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
