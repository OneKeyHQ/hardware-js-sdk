import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import { CardanoAddressType } from '@onekeyfe/hd-transport';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallCardanoMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallCardanoMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallCardanoMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Cardano Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="CardanoGetAddress"
          options={[
            { name: 'addressType', value: 0, type: 'number' },
            { name: 'path', value: `m/1852'/1815'/0'/0/0`, type: 'string' },
            { name: 'stakingPath', value: `m/1852'/1815'/0'/2/0`, type: 'string' },
            { name: 'stakingKeyHash', value: '', type: 'string' },
            { name: 'paymentScriptHash', value: '', type: 'string' },
            { name: 'stakingScriptHash', value: '', type: 'string' },
            { name: 'networkId', value: 1, type: 'number' },
            { name: 'protocolMagic', value: 764824073, type: 'number' },
            { name: 'derivationType', value: 2, type: 'number' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          // addr1qxfzjswzujgvn70cwpkxdal5dddtasjrljmx8upgzlaehqa2vx9039emchclmwwfmwtar32lp4x558nr8wa3f26rkn7qwne3ad
          // m/1852'/1815'/0'/0/0
          onCall={(data: any) =>
            SDK.cardanoGetAddress(connectId, deviceId, {
              ...commonParams,
              ...{
                addressParameters: {
                  addressType: data.addressType,
                  path: data.path,
                  stakingPath: data.stakingPath,
                  stakingKeyHash: data.stakingKeyHash || undefined,
                  paymentScriptHash: data.paymentScriptHash || undefined,
                  stakingScriptHash: data.stakingScriptHash || undefined,
                },
                protocolMagic: data.protocolMagic,
                networkId: data.networkId,
                derivationType: data.derivationType,
                address: data.address,
                showOnOneKey: data.showOnOneKey,
              },
            })
          }
        />

        <MethodInvoke
          title="CardanoGetPublicKey"
          options={[
            { name: 'path', value: "m/1852'/1815'/0'", type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
            { name: 'derivationType', value: 2, type: 'number' },
          ]}
          onCall={data =>
            SDK.cardanoGetPublicKey(connectId, deviceId, {
              ...commonParams,
              ...data,
            })
          }
        />

        <MethodInvoke
          title="CardanoSignTransaction"
          options={[
            {
              name: 'tip',
              value: 'The parameters are too complicated, please use the source code to debug',
              type: 'string',
            },
          ]}
          onCall={(data: any) => {
            const params = {
              signingMode: 0,
              inputs: [
                {
                  path: "m/1852'/1815'/0'/0/0",
                  prev_hash: '311940642e2f1ee1029a59c05f83c78fc27cc8a52bfd1e65721800dd8b026dec',
                  prev_index: 0,
                },
                {
                  path: "m/1852'/1815'/0'/0/0",
                  prev_hash: '416538899e722e49c5a3670461d2bc6ce8aea8b307fae8bcec39d0019ee3c3d0',
                  prev_index: 0,
                },
                {
                  path: "m/1852'/1815'/0'/0/0",
                  prev_hash: '416538899e722e49c5a3670461d2bc6ce8aea8b307fae8bcec39d0019ee3c3d0',
                  prev_index: 1,
                },
              ],
              outputs: [
                {
                  address:
                    'addr1qxfzjswzujgvn70cwpkxdal5dddtasjrljmx8upgzlaehqa2vx9039emchclmwwfmwtar32lp4x558nr8wa3f26rkn7qwne3ad',
                  amount: '2613231',
                },
                {
                  addressParameters: {
                    path: "m/1852'/1815'/0'/0/0",
                    addressType: 0,
                    stakingPath: "m/1852'/1815'/0'/2/0",
                  },
                  amount: '1222487',
                  tokenBundle: [
                    {
                      policyId: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6',
                      tokenAmounts: [{ assetNameBytes: '4d494e', amount: '27828472' }],
                    },
                  ],
                },
              ],
              fee: '177513',
              protocolMagic: 764824073,
              networkId: 1,
              derivationType: 2,
            };
            return SDK.cardanoSignTransaction(connectId, deviceId, {
              ...commonParams,
              ...params,
            } as unknown as any);
          }}
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
