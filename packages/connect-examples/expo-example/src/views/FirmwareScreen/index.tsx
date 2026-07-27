import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, type CheckedState, H5, Label, Stack, Text, XStack } from 'tamagui';
import { Check as CheckIcon } from '@tamagui/lucide-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { type DeviceState, type Features, type OnekeyFeatures } from '@onekeyfe/hd-core';
import { Platform } from 'react-native';
import { useIntl } from 'react-intl';
import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';
import { useAtomValue, useSetAtom } from 'jotai';

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
import { getDeviceStateMode, getFirmwareDeviceStateSummary } from '../../utils/deviceUtils';
import { HardwareInputPinDialogProvider } from '../../provider/HardwareInputPinProvider';
import { useMedia } from '../../provider/MediaProvider';
import { selectDeviceAtom } from '../../atoms/deviceAtoms';

import type { IDeviceListInstance } from '../../components/DeviceList';

type UpdateType = 'ble' | 'firmware' | 'source' | 'bootloader';
type UpdateVersions = {
  bootloaderVersion?: string;
  firmwareVersion?: string;
  bleVersion?: string;
};
type UpdateState = {
  success: boolean;
  payload?: string;
  versions?: UpdateVersions;
};

function FirmwareUpdateResult({ updateState }: { updateState?: UpdateState }) {
  const intl = useIntl();

  if (!updateState) return null;

  const versionRows = updateState.versions
    ? [
        {
          label: intl.formatMessage({ id: 'label__device_bootloader_version' }),
          value: updateState.versions.bootloaderVersion,
        },
        {
          label: intl.formatMessage({ id: 'label__device_firmware_version' }),
          value: updateState.versions.firmwareVersion,
        },
        {
          label: intl.formatMessage({ id: 'label__device_bluetooth_version' }),
          value: updateState.versions.bleVersion,
        },
      ].filter(row => row.value)
    : [];

  return (
    <Stack gap="$1">
      <Text color={updateState.success ? '$text' : '$textCritical'}>
        {updateState.success
          ? intl.formatMessage({ id: 'tip__update_success' })
          : updateState.payload}
      </Text>
      {updateState.success && versionRows.length > 0 && (
        <Stack gap="$1" padding="$2" backgroundColor="$bgHover" borderRadius="$2">
          {versionRows.map(row => (
            <XStack key={row.label} justifyContent="space-between" gap="$4">
              <Text color="$textSubdued">{row.label}</Text>
              <Text color="$text" fontWeight="bold">
                {row.value}
              </Text>
            </XStack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

interface FirmwareActionButtonProps {
  title: string;
  deviceType: string;
  onUpdate: () => Promise<UpdateState | undefined>;
}

function FirmwareActionButton({ title, onUpdate, deviceType }: FirmwareActionButtonProps) {
  const intl = useIntl();
  const [updateState, setUpdateState] = useState<UpdateState | undefined>();
  const media = useMedia();

  // eslint-disable-next-line no-nested-ternary
  const width = media.gtLg ? '30%' : media.gtSm ? '48%' : '100%';
  return (
    <Stack
      padding="$2"
      gap="$2"
      borderColor="$border"
      borderWidth="$px"
      borderRadius="$3"
      width={width}
      flex={1}
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
      <FirmwareUpdateResult updateState={updateState} />
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
  const media = useMedia();

  // eslint-disable-next-line no-nested-ternary
  const width = media.gtLg ? '30%' : media.gtSm ? '48%' : '100%';

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
      width={width}
      flex={1}
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
      {(deviceType === EDeviceType.Pro || deviceType === EDeviceType.Touch) &&
      type === 'firmware' ? (
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
      <FirmwareUpdateResult updateState={updateState} />
    </Stack>
  );
}

interface FirmwareMultipleFilesProps {
  title: string;
  deviceType: string;
  onUpdate: (options: {
    firmwareBinary?: ArrayBuffer;
    bleBinary?: ArrayBuffer;
    bootloaderBinary?: ArrayBuffer;
    resourceBinary?: ArrayBuffer;
  }) => Promise<UpdateState | undefined>;
}

function FirmwareMultipleFiles({ title, onUpdate, deviceType }: FirmwareMultipleFilesProps) {
  const intl = useIntl();
  const [updateState, setUpdateState] = useState<UpdateState | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const media = useMedia();

  const [firmwareFile, setFirmwareFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [bleFile, setBleFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [bootloaderFile, setBootloaderFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null
  );
  const [resourceFile, setResourceFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // eslint-disable-next-line no-nested-ternary
  const width = media.gtLg ? '48%' : media.gtSm ? '100%' : '100%';

  const selectFile = (type: string) => {
    // This entry handles legacy Pro/Touch V3 resource zips; Pro2 uses bundle sync.
    const fileType =
      type === 'resource' && deviceType !== EDeviceType.Pro2
        ? 'application/zip'
        : 'application/octet-stream';
    DocumentPicker.getDocumentAsync({
      type: fileType,
    }).then(res => {
      if (res.canceled) return;
      if (res.assets.length === 0) {
        alert(intl.formatMessage({ id: 'tip__no_select_file_tip' }));
        return;
      }

      if (type === 'firmware') {
        setFirmwareFile(res.assets[0]);
      } else if (type === 'ble') {
        setBleFile(res.assets[0]);
      } else if (type === 'bootloader') {
        setBootloaderFile(res.assets[0]);
      } else if (type === 'resource') {
        setResourceFile(res.assets[0]);
      }
    });
  };

  const handleUpdate = async () => {
    if (!firmwareFile && !bleFile && !bootloaderFile && !resourceFile) {
      alert(intl.formatMessage({ id: 'tip__need_select_at_least_one_file' }));
      return;
    }

    setUpdateState(undefined);
    setLoading(true);

    try {
      const firmwareBinary = firmwareFile ? await firmwareFile.file?.arrayBuffer() : undefined;
      const bleBinary = bleFile ? await bleFile.file?.arrayBuffer() : undefined;
      const bootloaderBinary = bootloaderFile
        ? await bootloaderFile.file?.arrayBuffer()
        : undefined;
      const resourceBinary = resourceFile ? await resourceFile.file?.arrayBuffer() : undefined;

      const res = await onUpdate({
        firmwareBinary,
        bleBinary,
        bootloaderBinary,
        resourceBinary,
      });

      setUpdateState(res);
    } catch (error: any) {
      setUpdateState({
        success: false,
        payload: error.message || 'Unknown error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack
      padding="$2"
      gap="$2"
      borderColor="$border"
      borderWidth="$px"
      borderRadius="$3"
      width={width}
    >
      <H5>{title}</H5>

      <Stack gap="$3">
        <Stack
          padding="$2"
          backgroundColor="$bgHover"
          gap="$2"
          borderRadius="$2"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Text>
            {firmwareFile?.name
              ? firmwareFile.name
              : intl.formatMessage({ id: 'tip__no_select_firmware_file' })}
          </Text>
          <Button onPress={() => selectFile('firmware')}>
            {intl.formatMessage({ id: 'label__device_select_firmware' })}
          </Button>
        </Stack>

        {deviceType !== EDeviceType.Mini && (
          <Stack
            padding="$2"
            backgroundColor="$bgHover"
            gap="$2"
            borderRadius="$2"
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text>
              {bleFile?.name ? bleFile.name : intl.formatMessage({ id: 'tip__no_select_ble_file' })}
            </Text>
            <Button onPress={() => selectFile('ble')}>
              {intl.formatMessage({ id: 'label__device_select_ble_firmware' })}
            </Button>
          </Stack>
        )}

        <Stack
          padding="$2"
          backgroundColor="$bgHover"
          gap="$2"
          borderRadius="$2"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Text>
            {bootloaderFile?.name
              ? bootloaderFile.name
              : intl.formatMessage({ id: 'tip__no_select_bootloader_file' })}
          </Text>
          <Button onPress={() => selectFile('bootloader')}>
            {intl.formatMessage({ id: 'label__device_select_bootloader' })}
          </Button>
        </Stack>

        {(deviceType === EDeviceType.Pro || deviceType === EDeviceType.Touch) && (
          <Stack
            padding="$2"
            backgroundColor="$bgHover"
            gap="$2"
            borderRadius="$2"
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text>
              {resourceFile?.name
                ? resourceFile.name
                : intl.formatMessage({ id: 'tip__no_select_resource_file' })}
            </Text>
            <Button onPress={() => selectFile('resource')}>
              {intl.formatMessage({ id: 'label__device_select_sys_resource' })}
            </Button>
          </Stack>
        )}
      </Stack>

      <Button
        variant="primary"
        size="large"
        disabled={loading || (!firmwareFile && !bleFile && !bootloaderFile && !resourceFile)}
        onPress={handleUpdate}
      >
        {intl.formatMessage({ id: 'action__update' })}
      </Button>

      {loading && <Text>{intl.formatMessage({ id: 'tip__updating' })}...</Text>}

      <FirmwareUpdateResult updateState={updateState} />
    </Stack>
  );
}

interface FirmwareUpdateProps {
  onReconnectDevice: () => void;
  onDisconnectDevice: () => void;
}
function FirmwareUpdate({ onDisconnectDevice, onReconnectDevice }: FirmwareUpdateProps) {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const selectDevice = useAtomValue(selectDeviceAtom);
  const [deviceState, setDeviceState] = useState<DeviceState | undefined>(undefined);
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
  } = getFirmwareDeviceStateSummary(deviceState);
  const deviceTypeLowerCase = deviceType.toLowerCase();

  const loadDeviceFeatures = useCallback(async () => {
    if (selectDevice?.connectId == null) {
      setDeviceState(undefined);
      setFeatures(undefined);
      setOnekeyFeatures(undefined);
      return undefined;
    }

    if (!sdk) {
      return undefined;
    }

    setConnecting(true);
    setDeviceState(undefined);
    setFeatures(undefined);
    setOnekeyFeatures(undefined);
    setError(undefined);

    try {
      const stateRes = await sdk.getDeviceState(selectDevice.connectId, {
        scope: 'firmware',
      });
      if (!stateRes.success) {
        setError(stateRes.payload.error);
        return undefined;
      }

      const nextState = stateRes.payload;
      setDeviceState(nextState);

      // Retain legacy Features only in the V1 advanced-information panel.
      if (nextState.protocol === 'V1') {
        const featuresRes = await sdk.getFeatures(selectDevice.connectId);
        if (featuresRes.success) {
          setFeatures(featuresRes.payload);
        }
        const onekeyFeaturesRes = await sdk.getOnekeyFeatures(selectDevice.connectId);
        if (onekeyFeaturesRes.success) {
          setOnekeyFeatures(onekeyFeaturesRes.payload);
        }
      }

      return nextState;
    } catch (error) {
      console.error('Exception in loadDeviceFeatures:', error);
      setError(error instanceof Error ? error.message : String(error));
      return undefined;
    } finally {
      setConnecting(false);
    }
  }, [sdk, selectDevice?.connectId]);

  useEffect(() => {
    loadDeviceFeatures();
  }, [loadDeviceFeatures]);

  const disconnectDevice = useCallback(() => {
    setDeviceState(undefined);
    setFeatures(undefined);
    setOnekeyFeatures(undefined);
    onDisconnectDevice?.();
  }, [onDisconnectDevice]);

  const firmwareUpdateMultipleFiles = useCallback(
    async ({
      firmwareBinary,
      bleBinary,
      bootloaderBinary,
      resourceBinary,
    }: {
      firmwareBinary?: ArrayBuffer;
      bleBinary?: ArrayBuffer;
      bootloaderBinary?: ArrayBuffer;
      resourceBinary?: ArrayBuffer;
    }) => {
      if (!sdk)
        return { payload: intl.formatMessage({ id: 'tip__sdk_not_ready' }), success: false };
      if (!deviceState) return { payload: 'device state is not ready', success: false };
      if (!selectDevice) return { payload: 'need connect device', success: false };
      setShowUpdateDialog(true);
      try {
        const isProtocolV2Device = deviceTypeLowerCase === EDeviceType.Pro2;
        const res = isProtocolV2Device
          ? await sdk.firmwareUpdateV4(selectDevice.connectId, {
              applicationP1Binary: firmwareBinary,
              coprocessorBinary: bleBinary,
              bootloaderBinary,
              platform: 'web',
            })
          : await sdk.firmwareUpdateV3(selectDevice.connectId, {
              firmwareBinary,
              bleBinary,
              bootloaderBinary,
              resourceBinary,
              platform: 'web',
            });
        setShowUpdateDialog(false);
        if (res.success) {
          await loadDeviceFeatures();
        }
        return {
          success: res.success,
          payload: res.success ? undefined : res.payload?.error,
          versions: res.success ? res.payload : undefined,
        };
      } catch (error: any) {
        setShowUpdateDialog(false);
        return { payload: error.message || 'Unknown error occurred', success: false };
      }
    },
    [
      deviceTypeLowerCase,
      deviceState,
      intl,
      loadDeviceFeatures,
      sdk,
      selectDevice,
      setShowUpdateDialog,
    ]
  );

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
      if (!deviceState) return { payload: 'device state is not ready', success: false };
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
        (deviceTypeLowerCase === EDeviceType.Touch || deviceTypeLowerCase === EDeviceType.Pro)
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
        await loadDeviceFeatures();
        return {
          success: true,
        };
      }

      if (type === 'ble' || type === 'firmware') {
        setShowUpdateDialog(true);
        console.log('Starting firmware update:', {
          type,
          deviceId: selectDevice.connectId,
          platform: 'web',
        });

        // For desktop-web-ble mode, we need to pass the connectId
        const deviceId = selectDevice.connectId;
        console.log('Using device ID for firmware update:', deviceId);

        const res = await sdk.firmwareUpdateV2(deviceId, {
          binary: fileData,
          updateType: type,
          platform: 'web',
        });
        setShowUpdateDialog(false);
        if (!res.success) {
          return {
            success: false,
            payload: res.payload.error,
          };
        }
        await loadDeviceFeatures();
        return {
          success: true,
        };
      }

      if (type === 'bootloader') {
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
        await loadDeviceFeatures();
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
    [deviceState, deviceTypeLowerCase, intl, loadDeviceFeatures, sdk, selectDevice]
  );

  const rebootBoardModel = useCallback(async () => {
    if (!sdk) return;
    if (!deviceState) return;
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
  }, [deviceState, sdk, selectDevice]);

  const deviceFieldProviderValue = useMemo(
    () => ({
      features,
      onekeyFeatures,
    }),
    [features, onekeyFeatures]
  );

  return (
    <HardwareInputPinDialogProvider>
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
          {deviceState?.protocol === 'V1' && features && !onekeyFeatures && (
            <MessageBox message="OneKey Features not available. Try clicking 'Refresh OneKey Features' button." />
          )}
          {selectDevice && selectDevice.state === 'disconnected' && (
            <MessageBox
              message={`Device "${selectDevice.name}" shows as disconnected. In desktop-web-ble mode, this is normal - the device can still communicate via Bluetooth.`}
            />
          )}
        </Stack>

        {deviceState && (
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
                    id: getDeviceStateMode(deviceState),
                  })}
                />
                <DeviceField
                  field={intl.formatMessage({ id: 'label__device_firmware_type' })}
                  value={intl.formatMessage({
                    id:
                      deviceState.identity.firmwareType === EFirmwareType.BitcoinOnly
                        ? 'label__device_firmware_type_bitcoin_only'
                        : 'label__device_firmware_type_universal',
                  })}
                />
              </Stack>
            </PanelView>

            {features ? (
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
            ) : null}

            <PanelView title={intl.formatMessage({ id: 'title__device_firmware_update' })}>
              <XStack flexWrap="wrap" gap="$2">
                {(deviceTypeLowerCase === EDeviceType.Pro ||
                  deviceTypeLowerCase === EDeviceType.Pro2) && (
                  <FirmwareMultipleFiles
                    deviceType={deviceTypeLowerCase}
                    title={
                      deviceTypeLowerCase === EDeviceType.Pro2
                        ? 'Firmware Update V4 (Protocol V2)'
                        : intl.formatMessage({ id: 'label__device_update_firmware_v3' })
                    }
                    onUpdate={firmwareUpdateMultipleFiles}
                  />
                )}
                <FirmwareLocalFile
                  deviceType={deviceTypeLowerCase}
                  title={intl.formatMessage({ id: 'label__device_update_firmware' })}
                  type="firmware"
                  onUpdate={updateFirmware}
                />
                {deviceTypeLowerCase !== EDeviceType.Mini && (
                  <FirmwareLocalFile
                    deviceType={deviceTypeLowerCase}
                    title={intl.formatMessage({ id: 'label__device_update_ble_firmware' })}
                    type="ble"
                    onUpdate={updateFirmware}
                  />
                )}
                <FirmwareLocalFile
                  deviceType={deviceTypeLowerCase}
                  title={intl.formatMessage({ id: 'label__device_update_bootloader' })}
                  type="bootloader"
                  onUpdate={updateFirmware}
                />
                {(deviceTypeLowerCase === EDeviceType.Pro ||
                  deviceTypeLowerCase === EDeviceType.Touch) && (
                  <FirmwareLocalFile
                    deviceType={deviceTypeLowerCase}
                    title={intl.formatMessage({ id: 'label__device_update_sys_resource' })}
                    type="source"
                    onUpdate={updateFirmware}
                  />
                )}
                {(deviceTypeLowerCase === EDeviceType.Pro ||
                  deviceTypeLowerCase === EDeviceType.Touch) && (
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
    </HardwareInputPinDialogProvider>
  );
}

export default function FirmwareScreen() {
  const setSelectedDevice = useSetAtom(selectDeviceAtom);
  const deviceListInstanceRef = useRef<IDeviceListInstance>(null);

  return (
    <PageView>
      <Stack padding="$2">
        <DeviceList ref={deviceListInstanceRef} />
        <FirmwareUpdate
          onDisconnectDevice={() => setSelectedDevice(undefined)}
          onReconnectDevice={() => {
            deviceListInstanceRef.current?.searchDevices();
          }}
        />
      </Stack>
    </PageView>
  );
}
