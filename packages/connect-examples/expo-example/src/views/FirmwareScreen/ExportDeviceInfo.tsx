import { useIntl } from 'react-intl';

import { Button } from '../../components/ui/Button';
import { downloadFile } from '../../utils/downloadUtils';
import { useDeviceFieldContext } from './DeviceFieldContext';
import { buildDeviceAdvancedInfo } from './deviceAdvancedInfo';
import { getDeviceBasicInfo } from '../../utils/deviceUtils';

import type { Features } from '@onekeyfe/hd-core';

export function formatCurrentTime(timestamp: number) {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.format(timestamp);
}

export function getDeviceMode(features: Features | undefined) {
  if (features?.bootloader_mode === true) {
    return 'label__device_bootloader_statue';
  }
  return 'label__device_firmware_status';
}

export function ExportDeviceInfo() {
  const intl = useIntl();
  const { deviceState, features, onekeyFeatures } = useDeviceFieldContext();

  const exportInfo = () => {
    if (!deviceState) return;

    const markdown = [];

    const {
      deviceType,
      serialNumber,
      bleVersion,
      bootloaderVersion,
      boardloaderVersion,
      firmwareVersion,
    } = getDeviceBasicInfo(features, onekeyFeatures);

    const bootloaderMode = intl.formatMessage({
      id: getDeviceMode(features),
    });

    markdown.push(`# Device OneKey ${deviceType} Info (${serialNumber})`);
    markdown.push(``);
    markdown.push(`${intl.formatMessage({ id: 'label__device_type_sdk' })}:    ${deviceType}`);
    markdown.push(`${intl.formatMessage({ id: 'label__device_uuid' })}:    ${serialNumber}`);
    markdown.push(
      `${intl.formatMessage({ id: 'label__device_device_statue' })}:    ${bootloaderMode}`
    );
    markdown.push(
      `${intl.formatMessage({
        id: 'label__device_boardloader_version',
      })}:    ${boardloaderVersion}`
    );
    markdown.push(
      `${intl.formatMessage({ id: 'label__device_bootloader_version' })}:    ${bootloaderVersion}`
    );
    markdown.push(
      `${intl.formatMessage({ id: 'label__device_firmware_version' })}:    ${firmwareVersion}`
    );
    markdown.push(
      `${intl.formatMessage({ id: 'label__device_bluetooth_version' })}:    ${bleVersion}`
    );

    const advancedInfo = buildDeviceAdvancedInfo(deviceState);
    const appendGroups = (title: string, groups: typeof advancedInfo.deviceGroups) => {
      if (groups.length === 0) return;
      markdown.push('', `## ${title}`, '');
      groups.forEach(group => {
        markdown.push(`### ${intl.formatMessage({ id: group.titleId })}`);
        group.fields.forEach(item => {
          markdown.push(`${intl.formatMessage({ id: item.labelId })}:    ${item.value ?? '—'}`);
        });
        markdown.push('');
      });
    };

    appendGroups(
      intl.formatMessage({ id: 'title__device_advanced_info' }),
      advancedInfo.deviceGroups
    );
    appendGroups(
      intl.formatMessage({ id: 'label__device_se_info' }),
      advancedInfo.securityElementGroups
    );

    const formatTime = formatCurrentTime(Date.now())
      ?.replace(/:/g, '')
      ?.replace(/\//g, '')
      ?.replace(/ /g, '-');
    let downloadFileName = `${deviceType}-${serialNumber}-${formatTime}.txt`;
    if (features?.bootloader_mode === true) {
      downloadFileName = `${deviceType}-bootloader-${serialNumber}-${formatTime}.txt`;
    }

    downloadFile(downloadFileName, markdown.join('\n').toString());
  };

  return (
    <Button variant="primary" size="medium" disabled={!deviceState} onPress={exportInfo}>
      {intl.formatMessage({ id: 'label__device_info_export' })}
    </Button>
  );
}
