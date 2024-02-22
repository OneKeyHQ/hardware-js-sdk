import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { H5, Stack, Text, XStack } from 'tamagui';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  getDeviceType,
  type Features,
  getDeviceUUID,
  getDeviceFirmwareVersion,
  getDeviceBootloaderVersion,
} from '@onekeyfe/hd-core';
import { Platform } from 'react-native';
import { useIntl } from 'react-intl';
import type { Device } from '../../components/DeviceList';
import PageView from '../../components/ui/Page';
import PanelView from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { DeviceList } from '../../components/DeviceList';
import { DeviceField } from './DeviceField';
import { MessageBox } from './MessageBox';
import { FirmwareUpdateEvent } from './FirmwareUpdateEvent';

type UpdateType = 'ble' | 'firmware' | 'source' | 'bootloader';
type UpdateState = {
  success: boolean;
  payload?: string;
};
interface FirmwareLocalFileProps {
  title: string;
  type: UpdateType;
  onUpdate: (options: {
    type: UpdateType;
    file: DocumentPicker.DocumentPickerAsset;
  }) => Promise<UpdateState | undefined>;
}

function FirmwareLocalFile({ title, type, onUpdate }: FirmwareLocalFileProps) {
  const intl = useIntl();
  const [fileAsset, setFileAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState | undefined>();

  const selectFile = () => {
    // source -> .zip
    // ble & firmware -> .bin
    const fileType = type === 'source' ? 'application/zip' : 'application/octet-stream';
    DocumentPicker.getDocumentAsync({
      type: fileType,
    }).then(res => {
      if (res.canceled) return;
      if (res.assets.length === 0) {
        alert(intl.formatMessage({ id: 'tip__no_select_file_tip' }));
      } else {
        setFileAsset(res.assets[0]);
      }
    });
  };

  return (
    <Stack
      padding="$2"
      gap="$2"
      borderColor="$border"
      borderWidth="$px"
      borderRadius="$3"
      width="100%"
      flex={1}
      $gtSm={{ width: '48%' }}
      $gtLg={{ width: '30%' }}
    >
      <H5>{title}</H5>
      <Stack
        flex={1}
        padding="$2"
        backgroundColor="$bgHover"
        gap="$2"
        flexDirection="row"
        flexWrap="wrap"
        borderRadius="$2"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text>
          {fileAsset?.name ? fileAsset?.name : intl.formatMessage({ id: 'tip__no_select_file' })}
        </Text>
        <Button onPress={selectFile}>{intl.formatMessage({ id: 'action__pick_file' })}</Button>
      </Stack>
      <Button
        variant="primary"
        size="large"
        disabled={!fileAsset}
        onPress={async () => {
          setUpdateState(undefined);
          const res = await onUpdate?.({
            type,
            // @ts-ignore
            file: fileAsset,
          });
          setUpdateState(res);
        }}
      >
        {intl.formatMessage({ id: 'action__update' })}
      </Button>
      {updateState && (
        <Text color={updateState?.success ? '$text' : '$textCritical'}>
          {updateState?.success
            ? intl.formatMessage({ id: 'tip__update_success' })
            : updateState?.payload}
        </Text>
      )}
    </Stack>
  );
}

interface FirmwareUpdateProps {
  selectDevice: Device | null;
  onDisconnectDevice: () => void;
}
function FirmwareUpdate({ selectDevice, onDisconnectDevice }: FirmwareUpdateProps) {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const [features, setFeatures] = useState<Features | undefined>(undefined);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const deviceType = getDeviceType(features);

  const [showUpdateDialog, setShowUpdateDialog] = useState<boolean>(false);

  useEffect(() => {
    if (!sdk) return;
    if (selectDevice?.connectId == null && selectDevice?.features == null) return;
    setConnecting(true);
    setFeatures(undefined);
    sdk
      .getFeatures(selectDevice?.connectId)
      .then(res => {
        if (res.success) {
          setFeatures(res.payload);
        } else {
          setError(res.payload.error);
        }
      })
      .catch(e => {
        setError(e.message);
      })
      .finally(() => {
        setConnecting(false);
      });
  }, [sdk, selectDevice?.connectId, selectDevice?.features]);

  const disconnectDevice = useCallback(() => {
    setFeatures(undefined);
    onDisconnectDevice?.();
  }, [onDisconnectDevice]);

  const updateFirmware = useCallback(
    async ({ type, file }: { type: UpdateType; file: DocumentPicker.DocumentPickerAsset }) => {
      if (!sdk)
        return { payload: intl.formatMessage({ id: 'tip__sdk_not_ready' }), success: false };
      if (!features) return { payload: 'features is not ready', success: false };
      if (!selectDevice)
        return {
          payload: intl.formatMessage({ id: 'tip__need_connect_device_first' }),
          success: false,
        };

      let fileData: ArrayBuffer | undefined;
      if (Platform.OS === 'web') {
        fileData = await file.file?.arrayBuffer();
      } else {
        const base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64',
        });
        fileData = new Uint8Array(Buffer.from(base64Data, 'base64')).buffer;
      }

      if (!fileData)
        return { payload: intl.formatMessage({ id: 'tip__need_pick_file' }), success: false };

      if (type === 'bootloader' && (deviceType === 'touch' || deviceType === 'pro')) {
        setShowUpdateDialog(true);
        const res = await sdk.deviceUpdateBootloader(selectDevice.connectId, {
          binary: fileData,
        });

        setShowUpdateDialog(false);
        if (!res.success) {
          return {
            success: false,
            payload: res.payload.error,
          };
        }
        return {
          success: true,
        };
      }

      if (type === 'ble' || type === 'firmware' || type === 'bootloader') {
        setShowUpdateDialog(true);
        // @ts-expect-error
        const res = await sdk.firmwareUpdate(
          Platform.OS === 'web' ? undefined : selectDevice.connectId,
          {
            updateType: type === 'bootloader' ? 'firmware' : type,
            binary: fileData,
            platform: Platform.OS === 'web' ? 'web' : 'native',
          }
        );

        setShowUpdateDialog(false);
        if (!res.success) {
          return {
            success: false,
            payload: res.payload.error,
          };
        }
        return {
          success: true,
        };
      }

      if (type === 'source') {
        setShowUpdateDialog(true);
        const res = await sdk.deviceFullyUploadResource(selectDevice.connectId, {
          binary: fileData,
        });

        setShowUpdateDialog(false);
        if (!res.success) {
          return {
            success: false,
            payload: res.payload.error,
          };
        }
        return {
          success: true,
        };
      }
    },
    [deviceType, features, intl, sdk, selectDevice]
  );

  return (
    <Stack>
      <FirmwareUpdateEvent open={showUpdateDialog} onOpenChange={setShowUpdateDialog} />

      <Stack marginTop="$2">
        {connecting && (
          <MessageBox message={intl.formatMessage({ id: 'tip__connecting_device' })} />
        )}
        {!selectDevice && (
          <MessageBox
            message={intl.formatMessage({ id: 'tip__need_connect_and_search_device_first' })}
          />
        )}
        {!!error && <MessageBox message={error} />}
      </Stack>

      {features && (
        <Stack>
          <PanelView title={intl.formatMessage({ id: 'title__device_info' })}>
            <Button size="large" onPress={disconnectDevice}>
              {intl.formatMessage({ id: 'action__clean_device' })}
            </Button>
            <Stack
              flex={1}
              padding="$2"
              backgroundColor="$bgHover"
              gap="$2"
              flexDirection="row"
              flexWrap="wrap"
              borderRadius="$2"
            >
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_type_sdk' })}
                value={getDeviceType(features)}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_uuid' })}
                value={getDeviceUUID(features)}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_firmware_version' })}
                value={getDeviceFirmwareVersion(features).join('.')}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_bootloader_version' })}
                value={getDeviceBootloaderVersion(features).join('.')}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_bluetooth_version' })}
                value={features.ble_ver}
              />
            </Stack>
          </PanelView>

          <PanelView title={intl.formatMessage({ id: 'title__device_firmware_update' })}>
            <XStack flexWrap="wrap" gap="$2">
              <FirmwareLocalFile
                title={intl.formatMessage({ id: 'label__device_update_firmware' })}
                type="firmware"
                onUpdate={updateFirmware}
              />
              {deviceType !== 'mini' && (
                <FirmwareLocalFile
                  title={intl.formatMessage({ id: 'label__device_update_ble_firmware' })}
                  type="firmware"
                  onUpdate={updateFirmware}
                />
              )}
              <FirmwareLocalFile
                title={intl.formatMessage({ id: 'label__device_update_bootloader' })}
                type="bootloader"
                onUpdate={updateFirmware}
              />
              {deviceType === 'pro' ||
                (deviceType === 'touch' && (
                  <FirmwareLocalFile
                    title={intl.formatMessage({ id: 'label__device_update_sys_resource' })}
                    type="source"
                    onUpdate={updateFirmware}
                  />
                ))}
            </XStack>
          </PanelView>

          <PanelView title={intl.formatMessage({ id: 'title__device_advanced_info' })}>
            <Stack
              flex={1}
              padding="$2"
              backgroundColor="$bgHover"
              gap="$2"
              flexDirection="row"
              flexWrap="wrap"
              borderRadius="$2"
            >
              <DeviceField field="device_id" value={features.device_id} />
              <DeviceField field="serial_no" value={features.serial_no} />
              <DeviceField field="label" value={features.label} />
              <DeviceField field="bootloader_hash" value={features.bootloader_hash} />
              <DeviceField field="ble_name" value={features.ble_name} />
              <DeviceField field="ble_ver" value={features.ble_ver} />
              <DeviceField field="se_ver" value={features.se_ver} />
              <DeviceField field="onekey_version" value={features.onekey_version} />
              <DeviceField field="onekey_serial" value={features.onekey_serial} />
              <DeviceField field="bootloader_version" value={features.bootloader_version} />
              <DeviceField field="build_id" value={features.build_id} />
              <DeviceField field="onekey_device_type" value={features.onekey_device_type} />
              <DeviceField field="onekey_se_type" value={features.onekey_se_type} />
              <DeviceField field="onekey_board_version" value={features.onekey_board_version} />
              <DeviceField field="onekey_board_hash" value={features.onekey_board_hash} />
              <DeviceField field="onekey_boot_version" value={features.onekey_boot_version} />
              <DeviceField field="onekey_boot_hash" value={features.onekey_boot_hash} />
              <DeviceField field="onekey_se_version" value={features.onekey_se_version} />
              <DeviceField field="onekey_se_hash" value={features.onekey_se_hash} />
              <DeviceField field="onekey_se_build_id" value={features.onekey_se_build_id} />
              <DeviceField
                field="onekey_firmware_version"
                value={features.onekey_firmware_version}
              />
              <DeviceField field="onekey_firmware_hash" value={features.onekey_firmware_hash} />
              <DeviceField
                field="onekey_firmware_build_id"
                value={features.onekey_firmware_build_id}
              />
              <DeviceField field="onekey_serial_no" value={features.onekey_serial_no} />
            </Stack>
          </PanelView>
        </Stack>
      )}
    </Stack>
  );
}

export default function FirmwareScreen() {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  return (
    <PageView>
      <Stack padding="$2">
        <DeviceList onSelected={setSelectedDevice} disableSaveDevice />
        <FirmwareUpdate
          selectDevice={selectedDevice}
          onDisconnectDevice={() => setSelectedDevice(null)}
        />
      </Stack>
    </PageView>
  );
}
