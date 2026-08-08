import { useMemo, useRef, useState } from 'react';
import { H5, Stack, Text, XStack } from 'tamagui';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { useIntl } from 'react-intl';

import { Button } from '../../components/ui/Button';
import {
  PROTOCOL_V2_RESOURCE_SLOTS,
  getProtocolV2FirmwareTargets,
  inspectProtocolV2ResourcePackageDirectory,
} from './protocolV2FirmwareFiles';
import {
  collectDirectoryFiles,
  getBrowserDirectoryPicker,
  isDirectoryPickerCancelled,
} from './protocolV2DirectoryPicker';

import type { FirmwareUpdateV4Params, FirmwareUpdateV4Target } from '@onekeyfe/hd-core';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { ProtocolV2BinaryField } from './protocolV2FirmwareFiles';
import type { InputHTMLAttributes } from 'react';

type UpdateState = {
  success: boolean;
  payload?: string;
};

type RuntimeFirmwarePlatform = Extract<
  NonNullable<FirmwareUpdateV4Params['platform']>,
  'web' | 'native'
>;

type ProtocolV2FirmwareUpdateProps = {
  deviceType: string;
  onUpdate: (params: FirmwareUpdateV4Params) => Promise<UpdateState | undefined>;
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

const formatFileSize = (size?: number) => {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export function ProtocolV2FirmwareUpdate({
  deviceType,
  onUpdate,
  onCheckUpdates,
}: ProtocolV2FirmwareUpdateProps) {
  const intl = useIntl();
  const resourceDirectoryInputRef = useRef<HTMLInputElement>(null);
  const [targetFiles, setTargetFiles] = useState<
    Partial<Record<ProtocolV2BinaryField, DocumentPickerAsset>>
  >({});
  const [resourceFiles, setResourceFiles] = useState<Partial<Record<string, DocumentPickerAsset>>>(
    {}
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>();
  const [resourceFolderName, setResourceFolderName] = useState<string>();
  const [resourceFolderValid, setResourceFolderValid] = useState(true);

  const firmwareTargets = useMemo(() => getProtocolV2FirmwareTargets(deviceType), [deviceType]);
  const selectedTargetCount = Object.keys(targetFiles).length;
  const selectedResourceCount = Object.keys(resourceFiles).length;
  const selectedFileCount = selectedTargetCount + selectedResourceCount;

  const pickTargetFile = async (param: ProtocolV2BinaryField) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    setTargetFiles(current => ({ ...current, [param]: result.assets[0] }));
    setUpdateState(undefined);
  };

  const loadResourceDirectory = (selectedFiles: readonly File[], selectedFolderName?: string) => {
    const inspection = inspectProtocolV2ResourcePackageDirectory(selectedFiles);
    const nextResourceFiles: Partial<Record<string, DocumentPickerAsset>> = {};
    for (const [key, file] of Object.entries(inspection.matchedFiles)) {
      if (file) {
        nextResourceFiles[key] = {
          name: file.name,
          size: file.size,
          uri: '',
          mimeType: file.type,
          file,
        } satisfies DocumentPickerAsset;
      }
    }
    const relativePath = selectedFiles[0]?.webkitRelativePath ?? '';
    const folderName = selectedFolderName || relativePath.split('/')[0] || 'Selected folder';
    const valid =
      inspection.missingSlots.length === 0 &&
      inspection.duplicateSlots.length === 0 &&
      inspection.unrecognizedFiles.length === 0;

    setResourceFolderName(folderName);
    setResourceFiles(nextResourceFiles);
    setResourceFolderValid(valid);
    setUpdateState(
      valid
        ? undefined
        : {
            success: false,
            payload: intl.formatMessage(
              { id: 'tip__protocol_v2_resource_folder_incomplete' },
              {
                missing: inspection.missingSlots.map(slot => slot.label).join(', ') || '-',
                duplicates:
                  inspection.duplicateSlots.map(({ slot }) => slot.label).join(', ') || '-',
                unknown: inspection.unrecognizedFiles.map(file => file.name).join(', ') || '-',
              }
            ),
          }
    );
  };

  const pickResourceDirectory = async () => {
    const directoryPicker = getBrowserDirectoryPicker();
    if (!directoryPicker) {
      if (!resourceDirectoryInputRef.current) return;
      resourceDirectoryInputRef.current.value = '';
      resourceDirectoryInputRef.current.click();
      return;
    }

    try {
      const directory = await directoryPicker({
        id: 'onekey-protocol-v2-resources',
        mode: 'read',
      });
      const selectedFiles = await collectDirectoryFiles(directory);
      if (selectedFiles.length > 0) loadResourceDirectory(selectedFiles, directory.name);
    } catch (error) {
      if (isDirectoryPickerCancelled(error)) return;
      setUpdateState({
        success: false,
        payload: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const runUpdate = async (useRemoteConfig: boolean) => {
    setIsUpdating(true);
    setUpdateState(undefined);
    try {
      const platform = Platform.OS === 'web' ? 'web' : 'native';
      const params: FirmwareUpdateV4Params = {
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

        const selectedResources = PROTOCOL_V2_RESOURCE_SLOTS.flatMap(slot => {
          const asset = resourceFiles[slot.key];
          return asset ? [{ asset, devicePath: slot.devicePath }] : [];
        });
        if (selectedResources.length > 0) {
          params.resourceFiles = await Promise.all(
            selectedResources.map(async ({ asset, devicePath }) => ({
              binary: await readDocumentAsset(asset),
              devicePath,
            }))
          );
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

      <Stack padding="$3" gap="$3" borderColor="$border" borderWidth="$px" borderRadius="$3">
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="$2">
          <Stack gap="$1">
            <Text fontSize={18} fontWeight="bold">
              {intl.formatMessage(
                { id: 'label__protocol_v2_resource_files' },
                { selected: selectedResourceCount, total: PROTOCOL_V2_RESOURCE_SLOTS.length }
              )}
            </Text>
            <Text>
              {resourceFolderName
                ? intl.formatMessage(
                    {
                      id: resourceFolderValid
                        ? 'tip__protocol_v2_resource_folder_ready'
                        : 'tip__protocol_v2_resource_folder_selected',
                    },
                    { folder: resourceFolderName, count: selectedResourceCount }
                  )
                : intl.formatMessage({ id: 'tip__protocol_v2_resource_folder_hint' })}
            </Text>
          </Stack>
          {Platform.OS === 'web' ? (
            <>
              <input
                ref={resourceDirectoryInputRef}
                style={{ display: 'none' }}
                type="file"
                accept=".okpkg"
                multiple
                disabled={isUpdating}
                aria-label={intl.formatMessage({ id: 'action__pick_resource_folder' })}
                {...({
                  webkitdirectory: '',
                  directory: '',
                } as InputHTMLAttributes<HTMLInputElement>)}
                onChange={event => {
                  const selectedFiles = Array.from(event.currentTarget.files ?? []);
                  if (selectedFiles.length > 0) loadResourceDirectory(selectedFiles);
                }}
              />
              <Button variant="primary" disabled={isUpdating} onPress={pickResourceDirectory}>
                {intl.formatMessage({
                  id: resourceFolderName
                    ? 'action__replace_resource_folder'
                    : 'action__pick_resource_folder',
                })}
              </Button>
            </>
          ) : null}
        </XStack>

        <XStack flexWrap="wrap" gap="$2">
          {PROTOCOL_V2_RESOURCE_SLOTS.map(slot => {
            const file = resourceFiles[slot.key];
            return (
              <XStack
                key={slot.key}
                minWidth={300}
                flexBasis={360}
                flexGrow={1}
                padding="$2"
                gap="$2"
                alignItems="center"
                backgroundColor="$bgHover"
                borderRadius="$2"
              >
                <Text color={file ? '#16a34a' : '#8b8b8b'} fontSize={18} fontWeight="bold">
                  {file ? '✓' : '○'}
                </Text>
                <Stack flex={1} gap="$1">
                  <Text fontWeight="bold">{slot.label}</Text>
                  <Text numberOfLines={1} color={file ? '$text' : '#8b8b8b'}>
                    {file?.name ?? slot.devicePath.split('/').pop()}
                  </Text>
                </Stack>
                {file ? <Text color="#8b8b8b">{formatFileSize(file.size)}</Text> : null}
              </XStack>
            );
          })}
        </XStack>
      </Stack>

      <XStack flexWrap="wrap" gap="$2">
        <Button
          variant="primary"
          size="large"
          disabled={isUpdating || selectedFileCount === 0 || !resourceFolderValid}
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
            setResourceFiles({});
            setResourceFolderName(undefined);
            setResourceFolderValid(true);
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
