import { CoreApi } from '@onekeyfe/hd-core';
import React, { View, StyleSheet, Text } from 'react-native';
import type { Device } from './DeviceList';
import MethodInvoke from './MethodInvoke';

type CallDeviceMethodsProps = {
  SDK: CoreApi;
  selectedDevice: Device | null;
};

export function CallDeviceMethods({ SDK, selectedDevice: currentDevice }: CallDeviceMethodsProps) {
  const connectId = currentDevice?.connectId ?? '';
  return (
    <View>
      <Text style={{ textAlign: 'center', fontSize: 24 }}>Device Method Test</Text>
      <View style={styles.buttonContainer}>
        <MethodInvoke
          title="deviceBackup"
          options={[]}
          onCall={() => SDK.deviceBackup(connectId)}
        />

        <MethodInvoke
          title="deviceChangePin"
          options={[{ name: 'remove', value: undefined, type: 'boolean' }]}
          onCall={data => SDK.deviceChangePin(connectId, { ...data })}
        />

        <MethodInvoke
          title="deviceFlags"
          options={[{ name: 'flags', value: undefined, type: 'number' }]}
          onCall={data => SDK.deviceFlags(connectId, { ...data })}
        />

        <MethodInvoke
          title="deviceRebootToBootloader"
          options={[]}
          onCall={() => SDK.deviceRebootToBootloader(connectId)}
        />

        <MethodInvoke
          title="deviceRebootToBoardloader"
          options={[]}
          onCall={() => SDK.deviceRebootToBoardloader(connectId)}
        />

        <MethodInvoke
          title="deviceUpdateReboot"
          options={[]}
          onCall={() => SDK.deviceUpdateReboot(connectId)}
        />

        <MethodInvoke
          title="deviceRecovery"
          options={[
            { name: 'wordCount', value: undefined, type: 'number' },
            { name: 'passphraseProtection', value: undefined, type: 'boolean' },
            { name: 'pinProtection', value: undefined, type: 'boolean' },
            { name: 'language', value: undefined, type: 'string' },
            { name: 'label', value: undefined, type: 'string' },
            { name: 'enforceWordlist', value: undefined, type: 'boolean' },
            { name: 'type', value: undefined, type: 'string' },
            { name: 'u2fCounter', value: undefined, type: 'number' },
            { name: 'dryRun', value: undefined, type: 'boolean' },
          ]}
          onCall={data => SDK.deviceRecovery(connectId, { ...data })}
        />

        <MethodInvoke
          title="deviceReset"
          options={[
            { name: 'displayRandom', value: undefined, type: 'boolean' },
            { name: 'strength', value: undefined, type: 'number' },
            { name: 'passphraseProtection', value: undefined, type: 'boolean' },
            { name: 'pinProtection', value: undefined, type: 'boolean' },
            { name: 'language', value: undefined, type: 'string' },
            { name: 'label', value: undefined, type: 'string' },
            { name: 'u2fCounter', value: undefined, type: 'number' },
            { name: 'skipBackup', value: undefined, type: 'boolean' },
            { name: 'noBackup', value: undefined, type: 'boolean' },
            { name: 'backupType', value: undefined, type: 'string' },
          ]}
          onCall={data => SDK.deviceReset(connectId, { ...data })}
        />

        <MethodInvoke
          title="deviceSettings"
          options={[
            { name: 'language', value: undefined, type: 'string' },
            { name: 'label', value: undefined, type: 'string' },
            { name: 'usePassphrase', value: undefined, type: 'boolean' },
            { name: 'homescreen', value: undefined, type: 'string' },
            { name: 'passphraseSource', value: undefined, type: 'number' },
            { name: 'autoLockDelayMs', value: undefined, type: 'number' },
            { name: 'displayRotation', value: undefined, type: 'number' },
            { name: 'passphraseAlwaysOnDevice', value: undefined, type: 'boolean' },
            { name: 'safetyChecks', value: undefined, type: 'number' },
            { name: 'experimentalFeatures', value: undefined, type: 'boolean' },
          ]}
          onCall={data =>
            SDK.deviceSettings(connectId, {
              ...data,
              safetyChecks: +data.safetyChecks,
            } as unknown as any)
          }
        />

        <MethodInvoke
          title="deviceVerify"
          options={[{ name: 'dataHex', value: '36d5e8bb396f4497c5cb876cac5c7fe1', type: 'string' }]}
          onCall={data => SDK.deviceVerify(connectId, { ...data } as unknown as any)}
        />

        <MethodInvoke title="deviceWipe" options={[]} onCall={() => SDK.deviceWipe(connectId)} />

        <MethodInvoke
          title="deviceSupportFeatures"
          options={[]}
          onCall={() => SDK.deviceSupportFeatures(connectId)}
        />

        <MethodInvoke
          title="deviceUpdateBootloader"
          options={[]}
          onCall={() => SDK.deviceUpdateBootloader(connectId)}
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
