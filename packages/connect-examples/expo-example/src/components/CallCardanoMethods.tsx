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
            { name: 'path', value: "m/44'/144'/0'/0/0", type: 'string' },
            { name: 'networkId', value: false, type: 'boolean' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          // addr1qxfzjswzujgvn70cwpkxdal5dddtasjrljmx8upgzlaehqa2vx9039emchclmwwfmwtar32lp4x558nr8wa3f26rkn7qwne3ad
          // m/1852'/1815'/0'/0/0
          onCall={data =>
            SDK.cardanoGetAddress(connectId, deviceId, {
              ...commonParams,
              ...{
                addressParameters: {
                  addressType: CardanoAddressType.BASE,
                  path: `m/1852'/1815'/0'/0/0`,
                  // stakingPath: `m/1852'/1815'/0'/2/0`,
                },
                protocolMagic: 764824073,
                networkId: 1,
              },
            })
          }
        />

        {/* <MethodInvoke
          title="CardanoSignTransaction"
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
            SDK.CardanoSignTransaction(connectId, deviceId, {
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
        /> */}
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
