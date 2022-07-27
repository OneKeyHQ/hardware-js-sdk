import { CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallEVMMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
};

export function CallEVMMethods({ SDK, selectedDevice: currentDevice }: CallEVMMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
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
            SDK.evmGetAddress(connectId, deviceId, {
              bundle: [
                { path: "m/44'/60'/0'/0/10", showOnOneKey: false },
                { path: "m/44'/60'/0'/0/11", showOnOneKey: false },
                { path: "m/44'/60'/0'/0/12", showOnOneKey: false },
                { path: "m/44'/60'/0'/0/13", showOnOneKey: false },
                { path: "m/44'/60'/0'/0/14", showOnOneKey: false },
                { path: "m/44'/60'/0'/0/15", showOnOneKey: false },
                { path: "m/44'/60'/0'/0/16", showOnOneKey: false },
                { path: "m/44'/60'/0'/0/17", showOnOneKey: false },
                { path: "m/44'/60'/0'/0/18", showOnOneKey: false },
                { path: "m/44'/60'/0'/0/19", showOnOneKey: false },
              ],
            })
          }
        />

        <MethodInvoke
          title="evmGetPublicKey"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.evmGetPublicKey(connectId, deviceId, { ...data })}
        />

        <MethodInvoke
          title="evmSignMessage"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            { name: 'messageHex', value: '0x6578616d706c65206d657373616765', type: 'string' },
          ]}
          onCall={data => SDK.evmSignMessage(connectId, deviceId, { ...data } as unknown as any)}
        />

        <MethodInvoke
          title="evmSignMessageEIP712"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
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
            SDK.evmSignMessageEIP712(connectId, deviceId, { ...data } as unknown as any)
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
            SDK.evmSignTransaction(connectId, deviceId, { ...data } as unknown as any)
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
            SDK.evmSignTransaction(connectId, deviceId, { ...data } as unknown as any)
          }
        />

        <MethodInvoke
          title="evmSignTypedData"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            {
              name: 'metamaskV4Compat',
              value: true,
              type: 'boolean',
            },
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
            SDK.evmSignTypedData(connectId, deviceId, {
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
            } as unknown as any)
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
              value: '4578616d706c65206d657373616765', // 'example message'
              type: 'string',
            },
            {
              name: 'signature',
              value:
                '11dc86c631ef5d9388c5e245501d571b864af1a717cbbb3ca1f6dacbf330742957242aa52b36bbe7bb46dce6ff0ead0548cc5a5ce76d0aaed166fd40cb3fc6e51c', // 'Example message'
              type: 'string',
            },
          ]}
          onCall={data => SDK.evmVerifyMessage(connectId, deviceId, { ...data } as unknown as any)}
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
