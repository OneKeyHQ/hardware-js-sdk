import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallEVMMethodsProps = {
  SDK: any;
  selectedDevice: Device | null;
};

export function CallEVMMethods({ SDK, selectedDevice: currentDevice }: CallEVMMethodsProps) {
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>EVM Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="evmGetAddress"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data =>
            SDK.evmGetAddress({
              device: { ...currentDevice },
              ...data,
            })
          }
        />

        <MethodInvoke
          title="evmGetPublicKey"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data =>
            SDK.evmGetPublicKey({
              device: { ...currentDevice },
              ...data,
            })
          }
        />

        <MethodInvoke
          title="evmSignMessage"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            { name: 'messageHex', value: '0x68656c6c6f20776f726c64', type: 'string' },
          ]}
          onCall={data =>
            SDK.evmSignMessage({
              device: { ...currentDevice },
              ...data,
            })
          }
        />

        <MethodInvoke
          title="evmSignMessageEIP712"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            {
              name: 'domainHash',
              value: '0xb9d8c78acf9b987311de6c7b45bb6a9c8e1bf361fa7fd3467a2163f994c79500',
              type: 'string',
            },
            {
              name: 'messageHash',
              value: '0xb9d8c78acf9b987311de6c7b45bb6a9c8e1bf361fa7fd3467a2163f994c79500',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.evmSignMessageEIP712({
              device: { ...currentDevice },
              ...data,
            })
          }
        />

        <MethodInvoke
          title="evmSignTransaction"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
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
              name: 'transaction.gasLimit',
              value: '0x5208',
              type: 'string',
            },
            {
              name: 'transaction.gasPrice',
              value: '0xbebc200',
              type: 'string',
            },
            {
              name: 'transaction.txType',
              value: undefined,
              type: 'number',
            },
          ]}
          onCall={data =>
            SDK.evmSignTransaction({
              device: { ...currentDevice },
              ...data,
            })
          }
        />

        <MethodInvoke
          title="evmSignTransactionEIP1559"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
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
              name: 'transaction.gasLimit',
              value: '0x5208',
              type: 'string',
            },
            {
              name: 'transaction.maxFeePerGas',
              value: '0xbebc200',
              type: 'string',
            },
            {
              name: 'transaction.maxPriorityFeePerGas',
              value: '0xbebc200',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.evmSignTransaction({
              device: { ...currentDevice },
              ...data,
            })
          }
        />

        <MethodInvoke
          title="evmSignTypedData"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            {
              name: 'metamaskV4Compat',
              value: true, // 'Example message'
              type: 'boolean',
            },
            {
              name: 'domainHash',
              value: '0xb9d8c78acf9b987311de6c7b45bb6a9c8e1bf361fa7fd3467a2163f994c79500',
              type: 'string',
            },
            {
              name: 'messageHash',
              value: '0xb9d8c78acf9b987311de6c7b45bb6a9c8e1bf361fa7fd3467a2163f994c79500',
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.evmSignTypedData({
              device: { ...currentDevice },
              ...data,
              data: {
                types: {
                  EIP712Domain: [
                    {
                      name: 'name',
                      type: 'string',
                    },
                  ],
                  Message: [
                    {
                      name: 'Best Wallet',
                      type: 'string',
                    },
                    {
                      name: 'Number',
                      type: 'uint64',
                    },
                  ],
                },
                primaryType: 'Message',
                domain: {
                  name: 'example.onekey.so',
                },
                message: {
                  Wallet: 'Onekey Touch',
                  Number: '911112119',
                },
              },
            })
          }
        />

        <MethodInvoke
          title="evmVerifyMessage"
          options={[
            {
              name: 'address',
              value: '0xdA0b608bdb1a4A154325C854607c68950b4F1a34',
              type: 'string',
            },
            {
              name: 'messageHex',
              value: '4578616d706c65206d657373616765', // 'Example message'
              type: 'string',
            },
            {
              name: 'signature',
              value:
                '11dc86c631ef5d9388c5e245501d571b864af1a717cbbb3ca1f6dacbf330742957242aa52b36bbe7bb46dce6ff0ead0548cc5a5ce76d0aaed166fd40cb3fc6e51c', // 'Example message'
              type: 'string',
            },
          ]}
          onCall={data =>
            SDK.evmVerifyMessage({
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
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
