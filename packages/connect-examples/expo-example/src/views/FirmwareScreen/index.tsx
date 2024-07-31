import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, type CheckedState, H5, Label, Stack, Text, XStack } from 'tamagui';
import { Check as CheckIcon } from '@tamagui/lucide-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import type { Features, OnekeyFeatures } from '@onekeyfe/hd-core';
import { Platform } from 'react-native';
import { useIntl } from 'react-intl';
import type { Device, IDeviceListInstance } from '../../components/DeviceList';
import PageView from '../../components/ui/Page';
import PanelView from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { DeviceList } from '../../components/DeviceList';
import { DeviceField } from './DeviceField';
import { MessageBox } from './MessageBox';
import { FirmwareUpdateEvent } from './FirmwareUpdateEvent';
import { DeviceFieldContext } from './DeviceFieldContext';
import { DeviceInfoFieldGroup, DeviceSeFieldGroup } from './DeviceFieldGroup';
import { ExportDeviceInfo, formatCurrentTime } from './ExportDeviceInfo';
import { getDeviceBasicInfo } from '../../utils/deviceUtils';

type UpdateType = 'ble' | 'firmware' | 'source' | 'bootloader';
type UpdateState = {
  success: boolean;
  payload?: string;
};

interface FirmwareActionButtonProps {
  title: string;
  deviceType: string;
  onUpdate: () => Promise<UpdateState | undefined>;
}

function FirmwareActionButton({ title, onUpdate, deviceType }: FirmwareActionButtonProps) {
  const intl = useIntl();
  const [updateState, setUpdateState] = useState<UpdateState | undefined>();

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
      <Button
        variant="primary"
        size="large"
        onPress={async () => {
          setUpdateState(undefined);
          const res = await onUpdate?.();
          setUpdateState(res);
        }}
      >
        {intl.formatMessage({ id: 'label__reboot_device_board_model' })}
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

interface FirmwareLocalFileProps {
  title: string;
  type: UpdateType;
  deviceType: string;
  onUpdate: (options: {
    type: UpdateType;
    file: DocumentPicker.DocumentPickerAsset;
    reboot?: boolean;
  }) => Promise<UpdateState | undefined>;
}

function FirmwareLocalFile({ title, type, onUpdate, deviceType }: FirmwareLocalFileProps) {
  const intl = useIntl();
  const [fileAsset, setFileAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState | undefined>();
  const [reboot, setReboot] = useState<boolean>(true);

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
      {(deviceType === 'pro' || deviceType === 'touch') && type === 'firmware' ? (
        <Stack flexDirection="row" alignItems="center">
          <Checkbox checked={reboot} onCheckedChange={checked => setReboot(!!checked)}>
            <Checkbox.Indicator>
              <CheckIcon />
            </Checkbox.Indicator>
          </Checkbox>
          <Label paddingRight="$0" justifyContent="flex-end">
            {intl.formatMessage({ id: 'label__reboot_device_after_update' })}
          </Label>
        </Stack>
      ) : null}
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
            reboot,
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
  selectDevice: Device | undefined;
  onReconnectDevice: () => void;
  onDisconnectDevice: () => void;
}
function FirmwareUpdate({
  selectDevice,
  onDisconnectDevice,
  onReconnectDevice,
}: FirmwareUpdateProps) {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const [features, setFeatures] = useState<Features | undefined>(undefined);
  const [onekeyFeatures, setOnekeyFeatures] = useState<OnekeyFeatures | undefined>(undefined);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const [showUpdateDialog, setShowUpdateDialog] = useState<boolean>(false);

  const {
    deviceType,
    serialNumber,
    bleVersion,
    bootloaderVersion,
    boardloaderVersion,
    firmwareVersion,
  } = getDeviceBasicInfo(features, onekeyFeatures);
  const deviceTypeLowerCase = deviceType.toLowerCase();

  const loadOnekeyFeatures = useCallback(() => {
    if (!sdk) return;
    sdk.getOnekeyFeatures(selectDevice?.connectId).then(res => {
      if (res.success) {
        setOnekeyFeatures(res.payload);
      } else {
        setOnekeyFeatures(undefined);
      }
    });
  }, [sdk, selectDevice?.connectId]);

  useEffect(() => {
    if (!sdk) return;
    if (selectDevice?.connectId == null || selectDevice?.features == null) {
      setFeatures(undefined);
      setOnekeyFeatures(undefined);
      return;
    }

    setConnecting(true);
    setFeatures(undefined);
    sdk
      .getFeatures(selectDevice?.connectId)
      .then(res => {
        if (res.success) {
          setFeatures(res.payload);
          loadOnekeyFeatures();
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
  }, [loadOnekeyFeatures, sdk, selectDevice?.connectId, selectDevice?.features]);

  const disconnectDevice = useCallback(() => {
    setFeatures(undefined);
    onDisconnectDevice?.();
  }, [onDisconnectDevice]);

  const updateFirmware = useCallback(
    async ({
      type,
      file,
      reboot,
    }: {
      type: UpdateType;
      file: DocumentPicker.DocumentPickerAsset;
      reboot?: boolean;
    }) => {
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

      if (
        type === 'bootloader' &&
        (deviceTypeLowerCase === 'touch' || deviceTypeLowerCase === 'pro')
      ) {
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
        const res = await sdk.firmwareUpdate(
          Platform.OS === 'web' ? undefined : selectDevice.connectId,
          {
            updateType: type === 'bootloader' ? 'firmware' : type,
            binary: fileData,
            rebootOnSuccess: reboot,
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
    [deviceTypeLowerCase, features, intl, sdk, selectDevice]
  );

  const rebootBoardModel = useCallback(async () => {
    if (!sdk) return;
    if (!features) return;
    if (!selectDevice) return;

    const res = await sdk.deviceRebootToBoardloader(selectDevice.connectId);
    if (!res.success) {
      return {
        success: false,
        payload: res.payload.error,
      };
    }
    return {
      success: true,
    };
  }, [features, sdk, selectDevice]);

  const deviceFieldProviderValue = useMemo(
    () => ({
      features,
      onekeyFeatures,
    }),
    [features, onekeyFeatures]
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
            <Button variant="primary" size="large" onPress={disconnectDevice}>
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
                value={deviceType}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_uuid' })}
                value={serialNumber}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_boardloader_version' })}
                value={boardloaderVersion}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_bootloader_version' })}
                value={bootloaderVersion}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_firmware_version' })}
                value={firmwareVersion}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_bluetooth_version' })}
                value={bleVersion}
              />
              <DeviceField
                field={intl.formatMessage({ id: 'label__device_device_statue' })}
                value={intl.formatMessage({
                  id:
                    features.bootloader_mode === true
                      ? 'label__device_bootloader_statue'
                      : 'label__device_firmware_status',
                })}
              />
            </Stack>
          </PanelView>

          <DeviceFieldContext.Provider value={deviceFieldProviderValue}>
            <PanelView title={intl.formatMessage({ id: 'title__device_advanced_info' })}>
              <XStack padding="$2" alignItems="center" gap="$8">
                <Text color="$text" fontSize={18} fontWeight="bold">
                  {intl.formatMessage({ id: 'label__device_info_update_time' })}:
                  {formatCurrentTime(Date.now())}
                </Text>
                <Button variant="primary" size="medium" onPress={onReconnectDevice}>
                  {intl.formatMessage({ id: 'label__device_info_refresh' })}
                </Button>
                <ExportDeviceInfo />
              </XStack>

              <DeviceInfoFieldGroup />

              <Text padding={8} fontWeight="bold">
                {intl.formatMessage({ id: 'label__device_se_info' })}
              </Text>
              <DeviceSeFieldGroup />
            </PanelView>
          </DeviceFieldContext.Provider>

          <PanelView title={intl.formatMessage({ id: 'title__device_firmware_update' })}>
            <XStack flexWrap="wrap" gap="$2">
              <FirmwareLocalFile
                deviceType={deviceTypeLowerCase}
                title={intl.formatMessage({ id: 'label__device_update_firmware' })}
                type="firmware"
                onUpdate={updateFirmware}
              />
              {deviceTypeLowerCase !== 'mini' && (
                <FirmwareLocalFile
                  deviceType={deviceTypeLowerCase}
                  title={intl.formatMessage({ id: 'label__device_update_ble_firmware' })}
                  type="firmware"
                  onUpdate={updateFirmware}
                />
              )}
              <FirmwareLocalFile
                deviceType={deviceTypeLowerCase}
                title={intl.formatMessage({ id: 'label__device_update_bootloader' })}
                type="bootloader"
                onUpdate={updateFirmware}
              />
              {(deviceTypeLowerCase === 'pro' || deviceTypeLowerCase === 'touch') && (
                <FirmwareLocalFile
                  deviceType={deviceTypeLowerCase}
                  title={intl.formatMessage({ id: 'label__device_update_sys_resource' })}
                  type="source"
                  onUpdate={updateFirmware}
                />
              )}
              {(deviceTypeLowerCase === 'pro' || deviceTypeLowerCase === 'touch') && (
                <FirmwareActionButton
                  deviceType={deviceTypeLowerCase}
                  title={intl.formatMessage({ id: 'label__reboot_device_board_model' })}
                  onUpdate={rebootBoardModel}
                />
              )}
            </XStack>
          </PanelView>
        </Stack>
      )}
    </Stack>
  );
}

export default function FirmwareScreen() {
  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>(undefined);
  const deviceListInstanceRef = useRef<IDeviceListInstance>(null);

  return (
    <PageView>
      <Stack padding="$2">
        <DeviceList ref={deviceListInstanceRef} onSelected={setSelectedDevice} disableSaveDevice />
        <FirmwareUpdate
          selectDevice={selectedDevice}
          onDisconnectDevice={() => setSelectedDevice(undefined)}
          onReconnectDevice={() => {
            deviceListInstanceRef.current?.searchDevices();
          }}
        />
      </Stack>
    </PageView>
  );
}
