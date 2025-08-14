import React from 'react';
import { Info, Download, Copy, Monitor } from 'lucide-react';

import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useDeviceStore } from '../store/deviceStore';

// 定义设备组结构类型
interface DeviceGroup {
  fields: string[];
}

interface DeviceSection {
  title: string;
  groups: DeviceGroup[];
}

interface DeviceSections {
  deviceInfo: DeviceSection;
  seInfo: DeviceSection;
}

const DeviceInfoPage: React.FC = () => {
  const { toast } = useToast();
  const { currentDevice } = useDeviceStore();
  const { t } = useTranslation();

  // 获取字段值的辅助函数 - 整合 onekeyFeatures 和 features
  const getFieldValue = (field: string): string => {
    const onekeyValue =
      currentDevice?.onekeyFeatures?.[field as keyof typeof currentDevice.onekeyFeatures];
    const featuresValue = currentDevice?.features?.[field as keyof typeof currentDevice.features];
    const value = onekeyValue || featuresValue;

    // Convert value to string
    if (value === null || value === undefined) {
      return '--';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };
  // 格式化当前时间
  const formatCurrentTime = (timestamp: number) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(timestamp);
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Value copied to clipboard',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 简化的设备信息结构 - 按相关类型分组
  const deviceSections: DeviceSections = {
    deviceInfo: {
      title: t('deviceInfo.deviceInfo'),
      groups: [
        // 基本信息组
        {
          fields: ['onekey_device_type', 'onekey_serial_no', 'onekey_se_type'],
        },
        // 板子信息组
        {
          fields: ['onekey_board_version', 'onekey_board_hash', 'onekey_board_build_id'],
        },
        // Boot 信息组
        {
          fields: [
            'onekey_boot_version',
            'onekey_boot_hash',
            'onekey_boot_build_id',
            'onekey_boot_url',
          ],
        },
        // 固件信息组
        {
          fields: [
            'onekey_firmware_version',
            'onekey_firmware_hash',
            'onekey_firmware_build_id',
            'onekey_firmware_url',
          ],
        },
        // 蓝牙信息组
        {
          fields: [
            'onekey_ble_version',
            'onekey_ble_hash',
            'onekey_ble_build_id',
            'onekey_ble_url',
            'onekey_ble_name',
          ],
        },
      ],
    },
    seInfo: {
      title: t('deviceInfo.seInfo'),
      groups: [
        // SE01 信息组
        {
          fields: [
            'onekey_se01_version',
            'onekey_se01_hash',
            'onekey_se01_build_id',
            'onekey_se01_state',
          ],
        },
        // SE01 Boot 信息组
        {
          fields: [
            'onekey_se01_boot_version',
            'onekey_se01_boot_hash',
            'onekey_se01_boot_build_id',
          ],
        },
        // SE02 信息组
        {
          fields: [
            'onekey_se02_version',
            'onekey_se02_hash',
            'onekey_se02_build_id',
            'onekey_se02_state',
          ],
        },
        // SE02 Boot 信息组
        {
          fields: [
            'onekey_se02_boot_version',
            'onekey_se02_boot_hash',
            'onekey_se02_boot_build_id',
          ],
        },
        // SE03 信息组
        {
          fields: [
            'onekey_se03_version',
            'onekey_se03_hash',
            'onekey_se03_build_id',
            'onekey_se03_state',
          ],
        },
        // SE03 Boot 信息组
        {
          fields: [
            'onekey_se03_boot_version',
            'onekey_se03_boot_hash',
            'onekey_se03_boot_build_id',
          ],
        },
        // SE04 信息组
        {
          fields: [
            'onekey_se04_version',
            'onekey_se04_hash',
            'onekey_se04_build_id',
            'onekey_se04_state',
          ],
        },
        // SE04 Boot 信息组
        {
          fields: [
            'onekey_se04_boot_version',
            'onekey_se04_boot_hash',
            'onekey_se04_boot_build_id',
          ],
        },
      ],
    },
  };

  // 导出设备信息
  const exportDeviceInfo = () => {
    if (!currentDevice) return;

    const markdown = [];
    const deviceType = getFieldValue('onekey_device_type');
    const serialNumber = getFieldValue('onekey_serial_no');

    markdown.push(`# OneKey ${deviceType} Device Information`);
    markdown.push(`Serial Number: ${serialNumber}`);
    markdown.push(`Export Time: ${formatCurrentTime(Date.now())}`);
    markdown.push('');

    // 按照新的分类导出
    Object.values(deviceSections).forEach(section => {
      markdown.push(`## ${section.title}`);
      markdown.push('');

      section.groups.forEach((group: DeviceGroup) => {
        group.fields.forEach((field: string) => {
          const value = getFieldValue(field);
          markdown.push(`**${field}**: ${value}`);
        });
        markdown.push(''); // 组之间的空行
      });
    });

    const formatTime = formatCurrentTime(Date.now())
      ?.replace(/:/g, '')
      ?.replace(/\//g, '')
      ?.replace(/ /g, '-');

    const fileName = `OneKey-${deviceType}-${serialNumber}-${formatTime}.md`;

    // 创建下载
    const blob = new Blob([markdown.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Success',
      description: `Device information exported as ${fileName}`,
    });
  };

  // 处理键盘事件
  const handleKeyPress = (event: React.KeyboardEvent, text: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      copyToClipboard(text);
    }
  };

  // 渲染字段的组件 - 紧凑版本
  const renderField = (field: string, value: string) => {
    const isEmpty = value === '--';

    return (
      <div
        key={field}
        role={isEmpty ? undefined : 'button'}
        tabIndex={isEmpty ? undefined : 0}
        onClick={() => !isEmpty && copyToClipboard(value)}
        onKeyDown={e => !isEmpty && handleKeyPress(e, value)}
        className={`group relative p-2 rounded transition-all duration-200 ${
          isEmpty
            ? 'bg-muted/5 text-muted-foreground cursor-default'
            : 'bg-background hover:bg-accent/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50'
        }`}
        title={isEmpty ? `${field} - No data` : `${field}: ${value} (click to copy)`}
        aria-label={isEmpty ? `${field} - No data` : `Copy ${field}: ${value}`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs font-bold text-foreground">{field}</span>
          {!isEmpty && (
            <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <div
          className={`text-xs font-mono leading-tight font-medium ${
            isEmpty ? 'text-muted-foreground italic' : 'text-foreground'
          } ${value.length > 30 ? 'break-all' : ''}`}
        >
          {isEmpty ? 'Not available' : value}
        </div>
      </div>
    );
  };

  // 渲染组的组件 - 紧凑边框容器
  const renderGroup = (group: DeviceGroup, groupIndex: number) => {
    return (
      <div key={groupIndex} className="border border-border/40 rounded-lg p-2 bg-card/30 mb-2">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
          {group.fields.map((field: string) => renderField(field, getFieldValue(field)))}
        </div>
      </div>
    );
  };

  // 渲染区域的组件 - 紧凑分组版本
  const renderSection = (sectionKey: string, section: DeviceSection) => {
    const totalFields = section.groups.flatMap((group: DeviceGroup) => group.fields).length;
    const fieldsWithValues = section.groups
      .flatMap((group: DeviceGroup) => group.fields)
      .filter((field: string) => getFieldValue(field) !== '--').length;

    return (
      <div key={sectionKey} className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{section.title}</h3>
          <Badge variant="outline" className="text-xs font-bold px-2 py-0.5">
            {fieldsWithValues}/{totalFields}
          </Badge>
        </div>

        <div className="space-y-2">
          {section.groups.map((group: DeviceGroup, groupIndex: number) =>
            renderGroup(group, groupIndex)
          )}
        </div>
      </div>
    );
  };

  return (
    <PageLayout fixedHeight={true}>
      <div className="flex-1 flex flex-col px-3 py-2 min-h-0 h-full">
        {/* 设备连接状态 */}
        <div className="flex-shrink-0 mb-2">
          <DeviceNotConnectedState />
        </div>

        {currentDevice ? (
          <>
            {/* 标题和导出按钮 */}
            <div className="flex-shrink-0 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-muted/20">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">
                    {getFieldValue('onekey_device_type')} Information
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Serial: {getFieldValue('onekey_serial_no')}
                  </p>
                </div>
              </div>
              <Button
                onClick={exportDeviceInfo}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 hover:bg-accent"
              >
                <Download className="w-3 h-3" />
                Export
              </Button>
            </div>

            {/* 分类显示 */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-4 pb-2">
                {Object.entries(deviceSections).map(([sectionKey, section]) =>
                  renderSection(sectionKey, section)
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground max-w-md">
              <div className="p-4 rounded-full bg-muted/10 mx-auto mb-4 w-fit">
                <Info className="w-12 h-12 opacity-50" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">No Device Connected</h2>
              <p className="text-sm leading-relaxed">
                Connect a OneKey device to view detailed information about firmware, security
                elements, and technical specifications.
              </p>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default DeviceInfoPage;
