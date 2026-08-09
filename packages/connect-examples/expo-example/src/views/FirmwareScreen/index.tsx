import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, type CheckedState, H5, Label, Stack, Text, XStack } from 'tamagui';
import { Check as CheckIcon } from '@tamagui/lucide-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  type DeviceState,
  type Features,
  type FirmwareUpdateV4Target,
  getFirmwareType,
  projectDeviceStateFeatures,
} from '@onekeyfe/hd-core';
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
import { ExportDeviceInfo, formatCurrentTime, getDeviceMode } from './ExportDeviceInfo';
import {
  ProtocolV2FirmwareUpdate,
  type ProtocolV2FirmwareUpdateRequest,
} from './ProtocolV2FirmwareUpdate';
import {
  type FirmwarePlanArtifactOverrides,
  prepareFirmwareUpdatePlanMemoryHost,
} from './firmwareUpdatePlanHost';
import { buildDeviceAdvancedInfo } from './deviceAdvancedInfo';
import { getDeviceBasicInfo } from '../../utils/deviceUtils';
import { HardwareInputPinDialogProvider } from '../../provider/HardwareInputPinProvider';
import { useMedia } from '../../provider/MediaProvider';
import { selectDeviceAtom } from '../../atoms/deviceAtoms';

import type { IDeviceListInstance } from '../../components/DeviceList';

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
    // source -> .zip
    // ble & firmware & bootloader -> .bin
    const fileType = type === 'resource' ? 'application/zip' : 'application/octet-stream';
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
  onReconnectDevice: () => void;
  onDisconnectDevice: () => void;
}
function FirmwareUpdate({ onDisconnectDevice, onReconnectDevice }: FirmwareUpdateProps) {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const selectDevice = useAtomValue(selectDeviceAtom);
  const [features, setFeatures] = useState<Features | undefined>(undefined);
  const [deviceState, setDeviceState] = useState<DeviceState | undefined>(undefined);
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
  } = getDeviceBasicInfo(features, undefined);
  const deviceTypeLowerCase = deviceType.toLowerCase();
  const selectedDeviceType = (selectDevice?.deviceType ?? deviceTypeLowerCase).toLowerCase();
  const isProtocolV2Device =
    (features?.protocol === 'V2' || selectDevice?.connectProtocol === 'V2') &&
    (selectedDeviceType === EDeviceType.Pro2 || selectedDeviceType === EDeviceType.Neo);

  useEffect(() => {
    if (!sdk) return;
    if (selectDevice?.connectId == null) {
      setFeatures(undefined);
      setDeviceState(undefined);
      return;
    }

    const loadDeviceFeatures = async () => {
      setConnecting(true);
      setFeatures(undefined);
      setDeviceState(undefined);
      setError(undefined);

      try {
        console.log('Loading device features for:', selectDevice.connectId);

        const stateRes = await sdk.getDeviceState(selectDevice.connectId, { scope: 'firmware' });
        console.log('getDeviceState(firmware) result:', stateRes);

        if (stateRes.success) {
          setDeviceState(stateRes.payload);
          setFeatures(projectDeviceStateFeatures(stateRes.payload));
        } else {
          console.error('Failed to get device state:', stateRes.payload.error);
          setError(stateRes.payload.error);
        }
      } catch (error) {
        console.error('Exception in loadDeviceFeatures:', error);
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setConnecting(false);
      }
    };

    loadDeviceFeatures();
  }, [sdk, selectDevice?.connectId]);

  const disconnectDevice = useCallback(() => {
    setFeatures(undefined);
    setDeviceState(undefined);
    onDisconnectDevice?.();
  }, [onDisconnectDevice]);

  const firmwareUpdateV3 = useCallback(
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
      if (!features) return { payload: 'features is not ready', success: false };
      if (!selectDevice) return { payload: 'need connect device', success: false };
      setShowUpdateDialog(true);
      try {
        const res = await sdk.firmwareUpdateV3(selectDevice.connectId, {
          firmwareBinary,
          bleBinary,
          bootloaderBinary,
          resourceBinary,
          platform: 'web',
        });
        setShowUpdateDialog(false);
        return {
          success: res.success,
          payload: res.success ? undefined : res.payload?.error,
        };
      } catch (error: any) {
        setShowUpdateDialog(false);
        return { payload: error.message || 'Unknown error occurred', success: false };
      }
    },
    [features, intl, sdk, selectDevice, setShowUpdateDialog]
  );

  const firmwareUpdateV4 = useCallback(
    async (params: ProtocolV2FirmwareUpdateRequest) => {
      if (!sdk)
        return { payload: intl.formatMessage({ id: 'tip__sdk_not_ready' }), success: false };
      if (!features) return { payload: 'features is not ready', success: false };
      if (!selectDevice)
        return {
          payload: intl.formatMessage({ id: 'tip__need_connect_device_first' }),
          success: false,
        };

      setShowUpdateDialog(true);
      try {
        const componentFields = [
          ['boot', 'bootloaderBinary'],
          ['app_v1', 'applicationP1Binary'],
          ['app_v2', 'applicationP2Binary'],
          ['coprocessor', 'coprocessorBinary'],
          ['se01', 'se01Binary'],
          ['se02', 'se02Binary'],
          ['se03', 'se03Binary'],
          ['se04', 'se04Binary'],
        ] as const;
        const localTargets: FirmwareUpdateV4Target[] = componentFields.flatMap(([target, field]) =>
          params[field] ? [target] : []
        );
        if (params.resourceArchiveBinary) localTargets.push('resource');
        const releaseResponse = await sdk.checkAllFirmwareRelease(selectDevice.connectId, {
          platform: params.platform,
          protocolV2ForceUpdateTargets: params.targetsToUpdate ?? localTargets,
        });
        if (!releaseResponse.success) {
          throw new Error(releaseResponse.payload.error);
        }
        const plan = releaseResponse.payload.firmwareUpdatePlan;
        if (!plan || plan.executor !== 'v4') {
          throw new Error('Protocol V2 firmware update Plan is unavailable');
        }
        const overrides: FirmwarePlanArtifactOverrides = {};
        for (const [target, field] of componentFields) {
          const binary = params[field];
          if (binary) overrides[target] = binary;
        }
        if (params.resourceArchiveBinary) overrides.resource = params.resourceArchiveBinary;
        const memoryHost = await prepareFirmwareUpdatePlanMemoryHost({
          hardwareSDK: sdk,
          plan,
          overrides,
        });
        let res;
        try {
          res = await sdk.firmwareUpdateV4(selectDevice.connectId, {
            platform: params.platform,
            preparedPlan: memoryHost.preparedPlan,
            hostBindingGeneration: memoryHost.hostBindingGeneration,
            targetsToUpdate: memoryHost.targetsToUpdate,
            expectedDeviceId: memoryHost.expectedDeviceId,
            expectedTargetVersions: memoryHost.expectedTargetVersions,
            componentArtifacts: memoryHost.componentArtifacts,
          });
        } finally {
          memoryHost.release();
        }
        return {
          success: res.success,
          payload: res.success ? undefined : res.payload.error,
        };
      } catch (error) {
        return {
          success: false,
          payload: error instanceof Error ? error.message : String(error),
        };
      } finally {
        setShowUpdateDialog(false);
      }
    },
    [features, intl, sdk, selectDevice]
  );

  const checkProtocolV2FirmwareUpdates = useCallback(
    async (platform: 'web' | 'native') => {
      if (!sdk)
        return { payload: intl.formatMessage({ id: 'tip__sdk_not_ready' }), success: false };
      if (!features) return { payload: 'features is not ready', success: false };
      if (!selectDevice)
        return {
          payload: intl.formatMessage({ id: 'tip__need_connect_device_first' }),
          success: false,
        };

      try {
        // App mode cannot inspect vol0 resources, so request a loader-side comparison.
        const res = await sdk.checkAllFirmwareRelease(selectDevice.connectId, {
          platform,
          protocolV2ForceUpdateTargets: ['resource'],
        });
        if (!res.success) {
          return {
            success: false,
            payload: res.payload.error,
          };
        }
        const targetsToUpdate = res.payload.targetsToUpdate ?? [];
        return {
          success: true,
          targetsToUpdate,
        };
      } catch (error) {
        return {
          success: false,
          payload: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [features, intl, sdk, selectDevice]
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
      onekeyFeatures: undefined,
      deviceState,
    }),
    [deviceState, features]
  );
  const hasSecurityElementInfo = deviceState
    ? buildDeviceAdvancedInfo(deviceState).securityElementGroups.length > 0
    : false;

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
          {selectDevice && selectDevice.state === 'disconnected' && (
            <MessageBox
              message={`Device "${selectDevice.name}" is disconnected. Reconnect it and search again.`}
            />
          )}
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
                    id: getDeviceMode(features),
                  })}
                />
                <DeviceField
                  field={intl.formatMessage({ id: 'label__device_firmware_type' })}
                  value={intl.formatMessage({
                    id:
                      getFirmwareType(features) === EFirmwareType.BitcoinOnly
                        ? 'label__device_firmware_type_bitcoin_only'
                        : 'label__device_firmware_type_universal',
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

                {hasSecurityElementInfo && (
                  <>
                    <Text padding={8} fontWeight="bold">
                      {intl.formatMessage({ id: 'label__device_se_info' })}
                    </Text>
                    <DeviceSeFieldGroup />
                  </>
                )}
              </PanelView>
            </DeviceFieldContext.Provider>

            <PanelView title={intl.formatMessage({ id: 'title__device_firmware_update' })}>
              {isProtocolV2Device ? (
                <ProtocolV2FirmwareUpdate
                  deviceType={selectedDeviceType}
                  onUpdate={firmwareUpdateV4}
                  onCheckUpdates={checkProtocolV2FirmwareUpdates}
                />
              ) : (
                <XStack flexWrap="wrap" gap="$2">
                  {deviceTypeLowerCase === EDeviceType.Pro && (
                    <FirmwareMultipleFiles
                      deviceType={deviceTypeLowerCase}
                      title={intl.formatMessage({ id: 'label__device_update_firmware_v3' })}
                      onUpdate={firmwareUpdateV3}
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
              )}
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
        <DeviceList ref={deviceListInstanceRef} disableSaveDevice />
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
