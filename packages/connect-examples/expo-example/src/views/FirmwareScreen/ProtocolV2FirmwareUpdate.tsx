import { useMemo, useState } from 'react';
import { H5, Stack, Text, XStack } from 'tamagui';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { useIntl } from 'react-intl';

import { Button } from '../../components/ui/Button';
import { getProtocolV2FirmwareTargets } from './protocolV2FirmwareFiles';

import type { FirmwareUpdateV4Params, FirmwareUpdateV4Target } from '@onekeyfe/hd-core';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { ProtocolV2BinaryField } from './protocolV2FirmwareFiles';

type UpdateState = {
  success: boolean;
  payload?: string;
};

type RuntimeFirmwarePlatform = Extract<
  NonNullable<FirmwareUpdateV4Params['platform']>,
  'web' | 'native'
>;

export type ProtocolV2FirmwareUpdateRequest = Pick<
  FirmwareUpdateV4Params,
  'platform' | 'targetsToUpdate' | ProtocolV2BinaryField
> & {
  resourceArchiveBinary?: ArrayBuffer;
};

type ProtocolV2FirmwareUpdateProps = {
  deviceType: string;
  onUpdate: (params: ProtocolV2FirmwareUpdateRequest) => Promise<UpdateState | undefined>;
  onCheckUpdates: (platform: RuntimeFirmwarePlatform) => Promise<
    | (UpdateState & {
        targetsToUpdate?: FirmwareUpdateV4Target[];
      })
    | undefined
  >;
};

async function readDocumentAsset(asset: DocumentPickerAsset) {
  if (asset.file) return asset.file.arrayBuffer();

  const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = new Uint8Array(Buffer.from(base64Data, 'base64'));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export function ProtocolV2FirmwareUpdate({
  deviceType,
  onUpdate,
  onCheckUpdates,
}: ProtocolV2FirmwareUpdateProps) {
  const intl = useIntl();
  const [targetFiles, setTargetFiles] = useState<
    Partial<Record<ProtocolV2BinaryField, DocumentPickerAsset>>
  >({});
  const [resourceArchiveFile, setResourceArchiveFile] = useState<DocumentPickerAsset>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>();

  const firmwareTargets = useMemo(() => getProtocolV2FirmwareTargets(deviceType), [deviceType]);
  const selectedTargetCount = Object.keys(targetFiles).length;
  const selectedFileCount = selectedTargetCount + (resourceArchiveFile ? 1 : 0);

  const pickTargetFile = async (param: ProtocolV2BinaryField) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    setTargetFiles(current => ({ ...current, [param]: result.assets[0] }));
    setUpdateState(undefined);
  };

  const pickResourceArchive = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/zip',
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    setResourceArchiveFile(result.assets[0]);
    setUpdateState(undefined);
  };

  const runUpdate = async (useRemoteConfig: boolean) => {
    setIsUpdating(true);
    setUpdateState(undefined);
    try {
      const platform = Platform.OS === 'web' ? 'web' : 'native';
      const params: ProtocolV2FirmwareUpdateRequest = {
        platform,
      };

      if (useRemoteConfig) {
        const checkResult = await onCheckUpdates(platform);
        if (!checkResult?.success) {
          setUpdateState(
            checkResult ?? {
              success: false,
              payload: intl.formatMessage({ id: 'tip__protocol_v2_remote_config_unavailable' }),
            }
          );
          return;
        }

        const targetsToUpdate = checkResult.targetsToUpdate ?? [];
        if (targetsToUpdate.length === 0) {
          setUpdateState({
            success: true,
            payload: intl.formatMessage({ id: 'tip__protocol_v2_already_current' }),
          });
          return;
        }
        params.targetsToUpdate = targetsToUpdate;
      } else {
        for (const target of firmwareTargets) {
          const asset = targetFiles[target.param];
          if (asset) params[target.param] = await readDocumentAsset(asset);
        }
        if (resourceArchiveFile) {
          params.resourceArchiveBinary = await readDocumentAsset(resourceArchiveFile);
        }
      }

      const result = await onUpdate(params);
      if (
        result &&
        !result.success &&
        result.payload?.includes('Unable to refresh the latest remote config')
      ) {
        setUpdateState({
          success: false,
          payload: intl.formatMessage({ id: 'tip__protocol_v2_remote_config_unavailable' }),
        });
      } else {
        setUpdateState(result);
      }
    } catch (error) {
      setUpdateState({
        success: false,
        payload: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Stack gap="$4">
      <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="$2">
        <Stack gap="$1">
          <H5>{intl.formatMessage({ id: 'label__device_update_protocol_v2' })}</H5>
          <Text>{intl.formatMessage({ id: 'tip__protocol_v2_local_update' })}</Text>
        </Stack>
        <Text
          paddingHorizontal="$3"
          paddingVertical="$1"
          backgroundColor="$bgHover"
          borderRadius="$4"
          fontWeight="bold"
        >
          {deviceType.toUpperCase()} · Protocol V2
        </Text>
      </XStack>

      <XStack
        padding="$3"
        gap="$3"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        borderColor="$border"
        borderWidth="$px"
        borderRadius="$3"
      >
        <Stack flex={1} minWidth={280} gap="$1">
          <Text fontWeight="bold">
            {intl.formatMessage({ id: 'label__protocol_v2_remote_update' })}
          </Text>
          <Text>{intl.formatMessage({ id: 'tip__protocol_v2_remote_update' })}</Text>
        </Stack>
        <Button
          variant="primary"
          size="large"
          disabled={isUpdating}
          onPress={() => runUpdate(true)}
        >
          {intl.formatMessage({ id: 'action__protocol_v2_remote_update' })}
        </Button>
      </XStack>

      <Stack gap="$2">
        <Text fontSize={18} fontWeight="bold">
          {intl.formatMessage({ id: 'label__protocol_v2_resource_archive' })}
        </Text>
        <XStack
          padding="$2"
          gap="$2"
          alignItems="center"
          justifyContent="space-between"
          backgroundColor="$bgHover"
          borderRadius="$2"
        >
          <Stack flex={1} gap="$1">
            <Text fontWeight="bold">
              {intl.formatMessage({ id: 'label__protocol_v2_resource_archive_zip' })}
            </Text>
            <Text numberOfLines={1} color={resourceArchiveFile ? '$text' : '#8b8b8b'}>
              {resourceArchiveFile?.name ??
                intl.formatMessage({ id: 'tip__protocol_v2_resource_archive_hint' })}
            </Text>
          </Stack>
          <Button disabled={isUpdating} onPress={pickResourceArchive}>
            {intl.formatMessage({ id: 'action__pick_file' })}
          </Button>
        </XStack>
      </Stack>

      <Stack gap="$2">
        <Text fontSize={18} fontWeight="bold">
          {intl.formatMessage({ id: 'label__protocol_v2_firmware_files' })}
        </Text>
        <XStack flexWrap="wrap" gap="$2">
          {firmwareTargets.map(target => {
            const file = targetFiles[target.param];
            return (
              <XStack
                key={target.param}
                minWidth={300}
                flexBasis={360}
                flexGrow={1}
                padding="$2"
                gap="$2"
                alignItems="center"
                justifyContent="space-between"
                backgroundColor="$bgHover"
                borderRadius="$2"
              >
                <Stack flex={1} gap="$1">
                  <Text fontWeight="bold">{target.label}</Text>
                  <Text numberOfLines={1} color={file ? '$text' : '#8b8b8b'}>
                    {file?.name ?? intl.formatMessage({ id: 'tip__protocol_v2_file_not_selected' })}
                  </Text>
                </Stack>
                <Button disabled={isUpdating} onPress={() => pickTargetFile(target.param)}>
                  {intl.formatMessage({ id: 'action__pick_file' })}
                </Button>
              </XStack>
            );
          })}
        </XStack>
      </Stack>

      <XStack flexWrap="wrap" gap="$2">
        <Button
          variant="primary"
          size="large"
          disabled={isUpdating || selectedFileCount === 0}
          onPress={() => runUpdate(false)}
        >
          {intl.formatMessage(
            { id: 'action__protocol_v2_local_update' },
            { count: selectedFileCount }
          )}
        </Button>
        <Button
          size="large"
          disabled={isUpdating || selectedFileCount === 0}
          onPress={() => {
            setTargetFiles({});
            setResourceArchiveFile(undefined);
            setUpdateState(undefined);
          }}
        >
          {intl.formatMessage({ id: 'action__clear_selected_files' })}
        </Button>
      </XStack>

      {isUpdating && <Text>{intl.formatMessage({ id: 'tip__updating' })}...</Text>}
      {updateState && (
        <Text color={updateState.success ? '$text' : '$textCritical'}>
          {updateState.success
            ? intl.formatMessage({ id: 'tip__update_success' })
            : updateState.payload}
        </Text>
      )}
    </Stack>
  );
}
