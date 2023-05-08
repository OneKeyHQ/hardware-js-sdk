import { CommonParams, CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallKaspaMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
  commonParams?: CommonParams;
};

export function CallKaspaMethods({
  SDK,
  selectedDevice: currentDevice,
  commonParams,
}: CallKaspaMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  const deviceId = currentDevice?.features?.deviceId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Sui Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="kaspaGetAddress"
          options={[
            { name: 'path', value: "m/44'/111111'/0'/0/0", type: 'string' },
            { name: 'prefix', value: 'kaspa', type: 'string' },
            { name: 'scheme', value: 'schnorr', type: 'string' },
            { name: 'showOnOneKey', value: false, type: 'boolean' },
          ]}
          onCall={data => SDK.kaspaGetAddress(connectId, deviceId, { ...commonParams, ...data })}
        />

        <MethodInvoke
          title="kaspaGetAddress [bundle]"
          options={[]}
          onCall={data =>
            SDK.kaspaGetAddress(connectId, deviceId, {
              ...commonParams,
              bundle: [
                { path: "m/44'/111111'/0'/0/0", showOnOneKey: false },
                { path: "m/44'/111111'/0'/0/1", showOnOneKey: false },
                { path: "m/44'/111111'/0'/0/2", showOnOneKey: false },
                { path: "m/44'/111111'/0'/0/3", showOnOneKey: false },
                { path: "m/44'/111111'/0'/0/4", showOnOneKey: false },
                { path: "m/44'/111111'/0'/0/5", showOnOneKey: false },
                { path: "m/44'/111111'/0'/0/6", showOnOneKey: false },
                { path: "m/44'/111111'/0'/0/7", showOnOneKey: false },
                { path: "m/44'/111111'/0'/0/8", showOnOneKey: false },
                { path: "m/44'/111111'/0'/0/9", showOnOneKey: false },
              ],
            })
          }
        />

        <MethodInvoke
          title="kaspaSignTransaction"
          options={[
            { name: 'subNetworkID', value: '00000000000000000000000000000000', type: 'string' },
            { name: 'prefix', value: 'kaspa', type: 'string' },
            { name: 'scheme', value: 'schnorr', type: 'string' },
          ]}
          onCall={data =>
            SDK.kaspaSignTransaction(connectId, deviceId, {
              version: 0,
              lockTime: '0',
              sigHashType: 0x1,
              sigOpCount: 1,
              inputs: [
                {
                  outputIndex: 1,
                  path: "m/44'/111111'/0'/0/0",
                  prevTxId: '1f226507807ff7dc5a7f8f2dec353fffc9dacc2645d8aecd02e5046907e3e2b2',
                  sequenceNumber: '0',
                  sigOpCount: 1,
                  output: {
                    satoshis: '990096458',
                    script: '207afdae557e69c0040fd4135adffc60f9486fb21f4cbae233fd6db3e84ba47c55ac',
                  },
                },
              ],
              outputs: [
                {
                  satoshis: '100000000',
                  script: '205ca3a7530284e5c5e472544edd6002c3afeb8c8f84d3a728fad255a4872753fbac',
                  scriptVersion: 0,
                },
                {
                  satoshis: '890094182',
                  script: '207afdae557e69c0040fd4135adffc60f9486fb21f4cbae233fd6db3e84ba47c55ac',
                  scriptVersion: 0,
                },
              ],
              ...commonParams,
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
