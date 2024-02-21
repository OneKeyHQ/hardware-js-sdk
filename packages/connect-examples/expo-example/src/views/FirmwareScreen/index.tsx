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
        alert('未选择文件');
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
        <Text>{fileAsset?.name ? fileAsset?.name : '未选择'}</Text>
        <Button onPress={selectFile}>选择文件</Button>
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
        Update
      </Button>
      {updateState && (
        <Text color={updateState?.success ? '$text' : '$textCritical'}>
          {updateState?.success ? '升级成功' : updateState?.payload}
        </Text>
      )}
    </Stack>
  );
}

interface FirmwareUpdateProps {
  selectDevice: Device | null;
}
function FirmwareUpdate({ selectDevice }: FirmwareUpdateProps) {
  const { sdk } = useContext(HardwareSDKContext);
  const [features, setFeatures] = useState<Features | undefined>(undefined);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const deviceType = getDeviceType(features);

  const [showUpdateDialog, setShowUpdateDialog] = useState<boolean>(false);

  useEffect(() => {
    if (!sdk) return;
    if (!selectDevice?.connectId) return;
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
  }, [sdk, selectDevice?.connectId]);

  const updateFirmware = useCallback(
    async ({ type, file }: { type: UpdateType; file: DocumentPicker.DocumentPickerAsset }) => {
      if (!sdk) return { payload: 'sdk is not ready', success: false };
      if (!features) return { payload: 'features is not ready', success: false };
      if (!selectDevice) return { payload: 'selectDevice is not ready', success: false };

      let fileData: ArrayBuffer | undefined;
      if (Platform.OS === 'web') {
        fileData = await file.file?.arrayBuffer();
      } else {
        const base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64',
        });
        fileData = new Uint8Array(Buffer.from(base64Data, 'base64')).buffer;
      }

      if (!fileData) return { payload: 'fileData is not ready', success: false };

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
        const res = await sdk.firmwareUpdateV2(selectDevice.connectId, {
          updateType: type === 'bootloader' ? 'firmware' : type,
          binary: fileData,
          platform: Platform.OS === 'web' ? 'web' : 'native',
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
    [deviceType, features, sdk, selectDevice]
  );

  return (
    <Stack>
      <FirmwareUpdateEvent open={showUpdateDialog} onOpenChange={setShowUpdateDialog} />

      <Stack marginTop="$2">
        {connecting && <MessageBox message="Connecting..." />}
        {!selectDevice && <MessageBox message="请先搜索并连接设备" />}
        {!!error && <MessageBox message={error} />}
      </Stack>

      {features && (
        <Stack>
          <PanelView title="Device Information">
            <Stack
              flex={1}
              padding="$2"
              backgroundColor="$bgHover"
              gap="$2"
              flexDirection="row"
              flexWrap="wrap"
              borderRadius="$2"
            >
              <DeviceField field="DeviceType (SDK)" value={getDeviceType(features)} />
              <DeviceField field="DeviceUUID" value={getDeviceUUID(features)} />
              <DeviceField
                field="FirmwareVersion"
                value={getDeviceFirmwareVersion(features).join('.')}
              />
              <DeviceField
                field="BootloaderVersion"
                value={getDeviceBootloaderVersion(features).join('.')}
              />
              <DeviceField field="BleVersion" value={features.ble_ver} />
            </Stack>
          </PanelView>

          <PanelView title="Firmware Update">
            <XStack flexWrap="wrap" gap="$2">
              <FirmwareLocalFile title="升级固件" type="firmware" onUpdate={updateFirmware} />
              {deviceType !== 'mini' && (
                <FirmwareLocalFile
                  title="升级 BLE 固件"
                  type="firmware"
                  onUpdate={updateFirmware}
                />
              )}
              <FirmwareLocalFile
                title="升级 Bootloader"
                type="bootloader"
                onUpdate={updateFirmware}
              />
              {deviceType === 'pro' ||
                (deviceType === 'touch' && (
                  <FirmwareLocalFile title="升级系统资源" type="source" onUpdate={updateFirmware} />
                ))}
            </XStack>
          </PanelView>

          <PanelView title="Device Advanced Information">
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
        <FirmwareUpdate selectDevice={selectedDevice} />
      </Stack>
    </PageView>
  );
}
