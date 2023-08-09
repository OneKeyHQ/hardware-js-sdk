import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { StyleSheet, Text, View } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallEVMMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallEVMMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallEVMMethodsProps) {
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
            { name: 'chainId', value: 1, type: 'number' },
          ]}
          onCall={(data: any) =>
            SDK.evmGetAddress(connectId, deviceId, {
              ...commonParams,
              ...data,
              chainId: Number(data.chainId ?? 1),
            })
          }
        />

        <MethodInvoke
          title="evmGetAddress [bundle]"
          options={[]}
          onCall={data =>
            SDK.evmGetAddress(connectId, deviceId, {
              ...commonParams,
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
            { name: 'showOnOneKey', value: true, type: 'boolean' },
            { name: 'chainId', value: 1, type: 'number' },
          ]}
          onCall={(data: any) =>
            SDK.evmGetPublicKey(connectId, deviceId, {
              ...commonParams,
              ...data,
              chainId: Number(data.chainId ?? 1),
            })
          }
        />

        <MethodInvoke
          title="evmSignMessage"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            { name: 'messageHex', value: '0x6578616d706c65206d657373616765', type: 'string' },
            { name: 'chainId', value: 1, type: 'number' },
          ]}
          onCall={(data: any) =>
            SDK.evmSignMessage(connectId, deviceId, {
              ...commonParams,
              ...data,
              chainId: Number(data.chainId ?? 1),
            } as unknown as any)
          }
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
            SDK.evmSignMessageEIP712(connectId, deviceId, {
              ...commonParams,
              ...data,
            } as unknown as any)
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
              value: `0x${'01'.repeat(3072)}`,
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
            SDK.evmSignTransaction(connectId, deviceId, {
              ...commonParams,
              ...data,
            } as unknown as any)
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
              value: `0x${'01'.repeat(3072)}`,
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
            SDK.evmSignTransaction(connectId, deviceId, {
              ...commonParams,
              ...data,
            } as unknown as any)
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
            { name: 'chainId', value: 1, type: 'number' },
          ]}
          onCall={(data: any) =>
            SDK.evmSignTypedData(connectId, deviceId, {
              ...commonParams,
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
                      name: 'Wallet',
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
              chainId: Number(data.chainId ?? 1),
            } as unknown as any)
          }
        />

        <MethodInvoke
          title="evmSignTypedData(Nested array)"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            {
              name: 'metamaskV4Compat',
              value: true,
              type: 'boolean',
            },
            {
              name: 'domainHash',
              value: '276bc64a43ff20d362b6c982bc21d1f83716496363478990aa0bbaa99044923a',
              type: 'string',
            },
            {
              name: 'messageHash',
              value: 'f8d0b2b47784324fed641b26f594e164d78a7e53fd6b3c9db099ab5cbfa9fa30',
              type: 'string',
            },
            { name: 'chainId', value: 1, type: 'number' },
          ]}
          onCall={(data: any) =>
            SDK.evmSignTypedData(connectId, deviceId, {
              ...commonParams,
              ...data,
              data: {
                types: {
                  EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                    { name: 'chainId', type: 'uint256' },
                    { name: 'verifyingContract', type: 'address' },
                  ],
                  BulkOrder: [{ name: 'tree', type: 'OrderComponents[2][2][2]' }],
                  OrderComponents: [
                    { name: 'offerer', type: 'address' },
                    { name: 'zone', type: 'address' },
                    { name: 'offer', type: 'OfferItem[]' },
                    { name: 'consideration', type: 'ConsiderationItem[]' },
                    { name: 'orderType', type: 'uint8' },
                    { name: 'startTime', type: 'uint256' },
                    { name: 'endTime', type: 'uint256' },
                    { name: 'zoneHash', type: 'bytes32' },
                    { name: 'salt', type: 'uint256' },
                    { name: 'conduitKey', type: 'bytes32' },
                    { name: 'counter', type: 'uint256' },
                  ],
                  OfferItem: [
                    { name: 'itemType', type: 'uint8' },
                    { name: 'token', type: 'address' },
                    { name: 'identifierOrCriteria', type: 'uint256' },
                    { name: 'startAmount', type: 'uint256' },
                    { name: 'endAmount', type: 'uint256' },
                  ],
                  ConsiderationItem: [
                    { name: 'itemType', type: 'uint8' },
                    { name: 'token', type: 'address' },
                    { name: 'identifierOrCriteria', type: 'uint256' },
                    { name: 'startAmount', type: 'uint256' },
                    { name: 'endAmount', type: 'uint256' },
                    { name: 'recipient', type: 'address' },
                  ],
                },
                primaryType: 'BulkOrder',
                domain: {
                  name: 'Seaport',
                  version: '1.4',
                  chainId: '1',
                  verifyingContract: '0x00000000000001ad428e4906aE43D8F9852d0dD6',
                },
                message: {
                  tree: [
                    [
                      [
                        {
                          offerer: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                          offer: [
                            {
                              itemType: '2',
                              token: '0x59325733eb952a92e069C87F0A6168b29E80627f',
                              identifierOrCriteria: '3937',
                              startAmount: '1',
                              endAmount: '1',
                            },
                          ],
                          consideration: [
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '1662500000000000000',
                              endAmount: '1662500000000000000',
                              recipient: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                            },
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '87500000000000000',
                              endAmount: '87500000000000000',
                              recipient: '0xA1640edd7B69A3BdF98cD9A6A61F663DCf6D2Aa2',
                            },
                          ],
                          startTime: '1678331313',
                          endTime: '1678936113',
                          orderType: '0',
                          zone: '0x004C00500000aD104D7DBd00e3ae0A5C00560C00',
                          zoneHash:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          salt: '24446860302761739304752683030156737591518664810215442929803500646386929272332',
                          conduitKey:
                            '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
                          totalOriginalConsiderationItems: '2',
                          counter: '0',
                        },
                        {
                          offerer: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                          offer: [
                            {
                              itemType: '2',
                              token: '0x59325733eb952a92e069C87F0A6168b29E80627f',
                              identifierOrCriteria: '3938',
                              startAmount: '1',
                              endAmount: '1',
                            },
                          ],
                          consideration: [
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '1662500000000000000',
                              endAmount: '1662500000000000000',
                              recipient: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                            },
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '87500000000000000',
                              endAmount: '87500000000000000',
                              recipient: '0xA1640edd7B69A3BdF98cD9A6A61F663DCf6D2Aa2',
                            },
                          ],
                          startTime: '1678331313',
                          endTime: '1678936113',
                          orderType: '0',
                          zone: '0x004C00500000aD104D7DBd00e3ae0A5C00560C00',
                          zoneHash:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          salt: '24446860302761739304752683030156737591518664810215442929803664649720063338326',
                          conduitKey:
                            '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
                          totalOriginalConsiderationItems: '2',
                          counter: '0',
                        },
                      ],
                      [
                        {
                          offerer: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                          offer: [
                            {
                              itemType: '2',
                              token: '0x59325733eb952a92e069C87F0A6168b29E80627f',
                              identifierOrCriteria: '4229',
                              startAmount: '1',
                              endAmount: '1',
                            },
                          ],
                          consideration: [
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '1662500000000000000',
                              endAmount: '1662500000000000000',
                              recipient: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                            },
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '87500000000000000',
                              endAmount: '87500000000000000',
                              recipient: '0xA1640edd7B69A3BdF98cD9A6A61F663DCf6D2Aa2',
                            },
                          ],
                          startTime: '1678331313',
                          endTime: '1678936113',
                          orderType: '0',
                          zone: '0x004C00500000aD104D7DBd00e3ae0A5C00560C00',
                          zoneHash:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          salt: '24446860302761739304752683030156737591518664810215442929805272723565722202710',
                          conduitKey:
                            '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
                          totalOriginalConsiderationItems: '2',
                          counter: '0',
                        },
                        {
                          offerer: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                          offer: [
                            {
                              itemType: '2',
                              token: '0x59325733eb952a92e069C87F0A6168b29E80627f',
                              identifierOrCriteria: '4230',
                              startAmount: '1',
                              endAmount: '1',
                            },
                          ],
                          consideration: [
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '1662500000000000000',
                              endAmount: '1662500000000000000',
                              recipient: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                            },
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '87500000000000000',
                              endAmount: '87500000000000000',
                              recipient: '0xA1640edd7B69A3BdF98cD9A6A61F663DCf6D2Aa2',
                            },
                          ],
                          startTime: '1678331313',
                          endTime: '1678936113',
                          orderType: '0',
                          zone: '0x004C00500000aD104D7DBd00e3ae0A5C00560C00',
                          zoneHash:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          salt: '24446860302761739304752683030156737591518664810215442929802817449467791056812',
                          conduitKey:
                            '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
                          totalOriginalConsiderationItems: '2',
                          counter: '0',
                        },
                      ],
                    ],
                    [
                      [
                        {
                          offerer: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                          offer: [
                            {
                              itemType: '2',
                              token: '0x59325733eb952a92e069C87F0A6168b29E80627f',
                              identifierOrCriteria: '2129',
                              startAmount: '1',
                              endAmount: '1',
                            },
                          ],
                          consideration: [
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '1662500000000000000',
                              endAmount: '1662500000000000000',
                              recipient: '0xa0ed981643B4a37BcfD6C397de2b92809807Abb3',
                            },
                            {
                              itemType: '0',
                              token: '0x0000000000000000000000000000000000000000',
                              identifierOrCriteria: '0',
                              startAmount: '87500000000000000',
                              endAmount: '87500000000000000',
                              recipient: '0xA1640edd7B69A3BdF98cD9A6A61F663DCf6D2Aa2',
                            },
                          ],
                          startTime: '1678331313',
                          endTime: '1678936113',
                          orderType: '0',
                          zone: '0x004C00500000aD104D7DBd00e3ae0A5C00560C00',
                          zoneHash:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          salt: '24446860302761739304752683030156737591518664810215442929812710384782076106155',
                          conduitKey:
                            '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
                          totalOriginalConsiderationItems: '2',
                          counter: '0',
                        },
                        {
                          offerer: '0x0000000000000000000000000000000000000000',
                          zone: '0x0000000000000000000000000000000000000000',
                          offer: [],
                          consideration: [],
                          orderType: '0',
                          startTime: '0',
                          endTime: '0',
                          zoneHash:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          salt: '0',
                          conduitKey:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          counter: '0',
                          totalOriginalConsiderationItems: '0',
                        },
                      ],
                      [
                        {
                          offerer: '0x0000000000000000000000000000000000000000',
                          zone: '0x0000000000000000000000000000000000000000',
                          offer: [],
                          consideration: [],
                          orderType: '0',
                          startTime: '0',
                          endTime: '0',
                          zoneHash:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          salt: '0',
                          conduitKey:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          counter: '0',
                          totalOriginalConsiderationItems: '0',
                        },
                        {
                          offerer: '0x0000000000000000000000000000000000000000',
                          zone: '0x0000000000000000000000000000000000000000',
                          offer: [],
                          consideration: [],
                          orderType: '0',
                          startTime: '0',
                          endTime: '0',
                          zoneHash:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          salt: '0',
                          conduitKey:
                            '0x0000000000000000000000000000000000000000000000000000000000000000',
                          counter: '0',
                          totalOriginalConsiderationItems: '0',
                        },
                      ],
                    ],
                  ],
                },
              },
              chainId: Number(data.chainId ?? 1),
            } as unknown as any)
          }
        />

        <MethodInvoke
          title="evmSignTypedData(Bigger data)"
          options={[
            { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
            { name: 'chainId', value: 1, type: 'number' },
            {
              name: 'data',
              value: `{"path":"m/44'/60'/0'/0/0","metamaskV4Compat":true,"data":{"domain":{"name":"Franklin","version":"0.0.1","chainId":1,"verifyingContract":"0x0000000000000000000000000000000000000000"},"primaryType":"ForwardRequest","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"ForwardRequest":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"value","type":"uint256"},{"name":"gas","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"data","type":"bytes"}],"VerifyWallet":[{"name":"contents","type":"string"}]},"message":{"from":"0x0000000000000000000000000000000000000000","to":"0x0000000000000000000000000000000000000000","value":0,"gas":275755,"nonce":3,"data":"0xbe75bdba000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000002e000000000000000000000000000000000000000000000000000000000000000090000000000000000000000004b9eaa3f239cf3d891642454e46c165e55000a0d000000000000000000000000274ff28fcba6241bec8b175a2028f45f7b39d94a0000000000000000000000004abadc9a1db6fabad4b5472f0f22c84f868c3c4e000000000000000000000000871608cba092105b91e91295a1d79ffc539bfb48000000000000000000000000146fe4091f9ebcef37f407c0e87b01edcae24c110000000000000000000000003007cee9a49793ae53ff8158e362cc0a2073365a0000000000000000000000006d05723bd4f3b0446920a5bf0e89102b491a8c1e000000000000000000000000f680347c58c9ee6c4f0d9cdd0849777b978c8ce2000000000000000000000000e8c8f12ccb61fd25ecc5e391e99f69a971526c990000000000000000000000000000000000000000000000000000000000000009000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000900000000000000000000000000000000000000000000000000000000df84758000000000000000000000000000000000000000000000000000000000b2d05e00000000000000000000000000000000000000000000000000000000001dcd650000000000000000000000000000000000000000000000000000000000ee6b2800000000000000000000000000000000000000000000000000000000001dcd650000000000000000000000000000000000000000000000000000000000b2d05e0000000000000000000000000000000000000000000000000000000000df8475800000000000000000000000000000000000000000000000000000000077359400000000000000000000000000000000000000000000000000000000002540be40"}},"domainHash":"e1630040b43761d37578b947e7036afbc20d84c81af8d781275e318f080cc9f9","messageHash":"182a9c8090b0facb90c403825fd01a144ce8d0152a8ad785be33e9f8884bd0f5","chainId":1,"useEmptyPassphrase":true,"connectId":"TC01WBD202303160742560002553","deviceId":"91CC3D3EDFE355DE7619148C","method":"evmSignTypedData"}`,
              type: 'string',
            },
          ]}
          onCall={(data: any) =>
            SDK.evmSignTypedData(connectId, deviceId, {
              ...commonParams,
              ...JSON.parse(data.data),
              path: data.path,
              chainId: Number(data.chainId ?? 1),
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
            { name: 'chainId', value: 1, type: 'number' },
          ]}
          onCall={(data: any) =>
            SDK.evmVerifyMessage(connectId, deviceId, {
              ...commonParams,
              ...data,
              chainId: Number(data.chainId ?? 1),
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
