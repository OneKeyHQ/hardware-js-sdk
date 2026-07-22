import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle } from 'react';
import { ListItem, Stack, Text, View, XStack } from 'tamagui';
import { FlatList, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Check } from '@tamagui/lucide-icons';
import { useIntl } from 'react-intl';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { ONEKEY_WEBUSB_FILTER } from '@onekeyfe/hd-shared';

import HardwareSDKContext from '../provider/HardwareSDKContext';
import { Button } from './ui/Button';
import PanelView from './ui/Panel';
import { getItem, setItem } from '../utils/storeUtil';
import { connectionTypeAtom } from '../atoms/deviceConnectAtoms';
import { deviceActionsAtom, deviceListAtom, selectDeviceAtom } from '../atoms/deviceAtoms';
import { useCommonParams } from '../provider/CommonParamsProvider';
import { applyDeviceStateToExampleDevice } from '../utils/deviceStateAdapter';

import type { ConnectionType } from '../atoms/deviceConnectAtoms';
import type { ForwardedRef } from 'react';
import type { DeviceState } from '@onekeyfe/hd-core';
import type { Features } from '@onekeyfe/hd-transport';
import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';

export type Device = {
  connectId: string;
  name: string;
  features?: Features;
  deviceState?: DeviceState;
  deviceType?: string;
  protocolType?: HardwareConnectProtocol;
  id?: string;
  state?: string;
};

const CONNECTION_TYPE_STORE_KEY = '@onekey/connectionType';

/**
 * Determine if the connection type should use hd-common-connect-sdk
 */
const shouldUseCommonSdk = (connectionType: ConnectionType | null): boolean =>
  connectionType === 'desktop-web-ble' || connectionType === 'webusb';

/**
 * Check if switching between connection types requires app restart.
 * Restart is needed when:
 * - Switching between different SDK types (common sdk vs iframe sdk)
 * - Switching between different transport classes within the same SDK
 */
const needsRestartForSwitch = (from: ConnectionType | null, to: ConnectionType | null): boolean => {
  if (from === to) return false;
  const fromUsesCommonSdk = shouldUseCommonSdk(from);
  const toUsesCommonSdk = shouldUseCommonSdk(to);
  // Different SDK type -> restart
  if (fromUsesCommonSdk !== toUsesCommonSdk) return true;
  // Same SDK but different transport class -> also restart
  // (switchTransport is a no-op in hd-common-connect-sdk)
  if (fromUsesCommonSdk && toUsesCommonSdk && from !== to) return true;
  return false;
};

const storeConnectionType = async (value: ConnectionType) => {
  try {
    await setItem(CONNECTION_TYPE_STORE_KEY, value);
  } catch (error) {
    console.log('Error storing connection type:', error);
  }
};

const getStoredConnectionType = async (): Promise<ConnectionType | null> => {
  try {
    const value = await getItem(CONNECTION_TYPE_STORE_KEY);
    return value as ConnectionType | null;
  } catch (error) {
    console.log('Error getting stored connection type:', error);
    return null;
  }
};

type ItemProps = {
  item: Device;
  onPress: () => void;
  connected: boolean;
};

const Item = ({ item, onPress, connected }: ItemProps) => {
  const intl = useIntl();

  return (
    <ListItem
      onPress={onPress}
      backgroundColor={connected ? '$bgInfo' : '$bgHover'}
      icon={connected ? Check : undefined}
      flexWrap="wrap"
      borderWidth="$px"
      borderColor="$border"
      gap="$4"
    >
      <ListItem.Text>{item.name}</ListItem.Text>
      <ListItem.Text>{item.deviceType}</ListItem.Text>
      {!!item.protocolType && <ListItem.Text>{item.protocolType}</ListItem.Text>}
      <ListItem.Text>{item.connectId}</ListItem.Text>
      <Button onPress={onPress}>{intl.formatMessage({ id: 'action__connect_device' })}</Button>
    </ListItem>
  );
};

type IDeviceListProps = {
  disableSaveDevice?: boolean;
};
export interface IDeviceListInstance {
  searchDevices: () => Promise<void> | void;
}

function DeviceListFC(
  { disableSaveDevice = false }: IDeviceListProps,
  ref: ForwardedRef<IDeviceListInstance>
) {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const selectedDevice = useAtomValue(selectDeviceAtom);
  const devices = useAtomValue(deviceListAtom);
  const setDeviceActions = useSetAtom(deviceActionsAtom);
  const [connectionType, setConnectionType] = useAtom(connectionTypeAtom);
  const { commonParams } = useCommonParams();

  // Initialize connection type from storage on mount
  useEffect(() => {
    getStoredConnectionType().then(storedType => {
      if (storedType) {
        setConnectionType(storedType);
      } else if (Platform.OS === 'web' && (window as any).desktopApi) {
        // In Electron, default to Desktop BLE instead of Bridge
        // to avoid axios compatibility issues in the renderer process
        setConnectionType('desktop-web-ble');
      }
    });
  }, [setConnectionType]);

  const selectDevice = useCallback(
    async (device: Device | undefined) => {
      if (!device?.connectId || !sdk) {
        setDeviceActions({ type: 'select', payload: device });
        return;
      }

      setDeviceActions({ type: 'select', payload: device });

      const stateRes = await sdk.getDeviceState(device.connectId, {
        connectProtocol: commonParams.connectProtocol,
      });
      if (!stateRes.success || !stateRes.payload) return;

      setDeviceActions({
        type: 'select',
        payload: applyDeviceStateToExampleDevice(device, stateRes.payload),
      });
    },
    [commonParams.connectProtocol, sdk, setDeviceActions]
  );

  const searchDevices = useCallback(async () => {
    selectDevice(undefined);
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));

    // Use unified searchDevices approach for all transport types
    // WebUSB authorization is now handled internally by the SDK
    if (connectionType === 'webusb') {
      try {
        await window?.navigator?.usb?.requestDevice({ filters: ONEKEY_WEBUSB_FILTER });
      } catch (error) {
        console.warn('WebUSB request device failed:', error);
      }
    }
    const response = await sdk.searchDevices(
      commonParams.connectProtocol
        ? {
            connectProtocol: commonParams.connectProtocol,
          }
        : undefined
    );
    const foundDevices = (response.payload as unknown as Device[]) ?? [];
    setDeviceActions({ type: 'setList', payload: foundDevices });

    // 🔧 DESKTOP BLE FIX: Don't auto-select devices, let user choose manually
    // This prevents automatic connection which can cause issues with device switching
    // Users should manually click the "Connect Device" button for their desired device

    // Only auto-select for non-desktop-web-ble connections to maintain backward compatibility
    if (Platform.OS === 'web' && foundDevices?.length && connectionType !== 'desktop-web-ble') {
      const device = foundDevices[0];
      selectDevice(device);
    }
  }, [intl, sdk, selectDevice, setDeviceActions, connectionType, commonParams.connectProtocol]);

  const deviceCancel = useCallback(() => {
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));

    sdk.cancel();
  }, [intl, sdk]);

  const handleRemoveSelected = useCallback(() => {
    setDeviceActions({ type: 'clear' });
  }, [setDeviceActions]);

  const onSwitchConnectionType = useCallback(
    async (value: ConnectionType) => {
      if (value === connectionType) return;

      const previousConnectionType = connectionType;

      try {
        // Update connection type and persist manually
        setConnectionType(value);
        await storeConnectionType(value);

        // Restart desktop client when switching between different SDK types
        // (e.g., bridge <-> webusb, bridge <-> desktop-web-ble, webusb <-> desktop-web-ble)
        const shouldRestart =
          Platform.OS === 'web' && needsRestartForSwitch(previousConnectionType, value);

        // @ts-expect-error
        if (shouldRestart && window.desktopApi?.restart) {
          console.log('Restarting app due to SDK type change:', {
            from: previousConnectionType,
            to: value,
          });
          // @ts-expect-error
          window.desktopApi.restart();
          return; // Exit early as the app will restart
        }

        // @ts-expect-error
        const res = await sdk?.switchTransport(value);
        console.log('switchTransport res:====>>>::: ', res);

        // Clear device list when switching connection type
        setDeviceActions({ type: 'setList', payload: [] });
        selectDevice(undefined);
      } catch (error) {
        console.error('Failed to switch connection type:', error);
        // Rollback on error and persist the rollback
        setConnectionType(previousConnectionType);
        await storeConnectionType(previousConnectionType);
        alert(
          intl.formatMessage({ id: 'tip__switch_connection_type_failed' }) ||
            'Failed to switch connection type'
        );
      }
    },
    [sdk, setConnectionType, connectionType, intl, selectDevice, setDeviceActions]
  );

  useImperativeHandle(
    ref,
    () => ({
      searchDevices,
    }),
    [searchDevices]
  );

  const renderItem = ({ item }: { item: Device }) => {
    const connected = item.connectId === selectedDevice?.connectId;

    return (
      <Item
        item={item}
        onPress={() => {
          selectDevice(item);
        }}
        connected={connected}
      />
    );
  };

  return (
    <PanelView>
      {disableSaveDevice ? (
        <Text fontSize={16} fontWeight="bold">
          {intl.formatMessage({ id: 'message__search_device_and_connect_device' })}
        </Text>
      ) : (
        <View flexDirection="row" justifyContent="space-between" flexWrap="wrap">
          <Text fontSize={15}>
            {intl.formatMessage({ id: 'message__current_selector_device' })}
            {selectedDevice?.connectId || intl.formatMessage({ id: 'message__no_device' })}
          </Text>
          <XStack gap={4}>
            <Picker selectedValue={connectionType} onValueChange={onSwitchConnectionType}>
              <Picker.Item label="OneKey Bridge" value="bridge" />
              <Picker.Item label="WebUSB" value="webusb" />
              <Picker.Item label="Desktop Web BLE" value="desktop-web-ble" />
            </Picker>
            <Button onPress={handleRemoveSelected}>
              {intl.formatMessage({ id: 'action__clean_device' })}
            </Button>
          </XStack>
        </View>
      )}
      <Stack flexDirection="row" gap="$2">
        <Button width="80%" disabled={!sdk} variant="primary" size="medium" onPress={searchDevices}>
          {intl.formatMessage({ id: 'action__search_device' })}
        </Button>
        <Button
          width="20%"
          disabled={!sdk}
          variant="secondary"
          size="medium"
          onPress={deviceCancel}
        >
          {intl.formatMessage({ id: 'action__cancel' })}
        </Button>
      </Stack>
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={item => item.connectId}
        extraData={selectedDevice?.connectId}
      />
    </PanelView>
  );
}

export const DeviceList = forwardRef<IDeviceListInstance, IDeviceListProps>(DeviceListFC);
