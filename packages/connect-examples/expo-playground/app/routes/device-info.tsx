import React, { useMemo } from 'react';
import { Copy, Download, Info, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { PageLayout } from '../components/common/PageLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks/use-toast';
import { useDeviceStore } from '../store/deviceStore';

import type { DeviceState } from '@onekeyfe/hd-core';

interface DeviceField {
  key: string;
  label: string;
  value: unknown;
}

interface DeviceGroup {
  key: string;
  title: string;
  fields: DeviceField[];
}

interface DeviceSection {
  key: string;
  title: string;
  groups: DeviceGroup[];
}

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const formatFieldValue = (value: unknown): string => {
  if (!hasValue(value)) return '--';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

const field = (key: string, label: string, value: unknown): DeviceField => ({
  key,
  label,
  value,
});

const componentGroup = ({
  key,
  title,
  version,
  buildId,
  hash,
  extraFields = [],
}: {
  key: string;
  title: string;
  version: unknown;
  buildId: unknown;
  hash: unknown;
  extraFields?: DeviceField[];
}): DeviceGroup | undefined => {
  const fields = [
    field(`${key}.version`, 'Version', version),
    field(`${key}.buildId`, 'Build ID', buildId),
    field(`${key}.hash`, 'Hash', hash),
    ...extraFields,
  ];

  return fields.some(item => hasValue(item.value)) ? { key, title, fields } : undefined;
};

const securityElementGroup = (
  state: DeviceState,
  index: 1 | 2 | 3 | 4
): DeviceGroup | undefined => {
  const key = `se0${index}` as const;
  const bootKey = `se0${index}Boot` as const;
  const buildIdKey = `se0${index}BuildId` as const;
  const hashKey = `se0${index}Hash` as const;
  const bootBuildIdKey = `se0${index}BootBuildId` as const;
  const bootHashKey = `se0${index}BootHash` as const;
  const metadata = state.securityElements?.[key];
  const fields = [
    field(`${key}.type`, 'Type', metadata?.type),
    field(`${key}.state`, 'State', metadata?.state),
    field(`${key}.version`, 'Application Version', state.versions[key]),
    field(`${key}.buildId`, 'Application Build ID', state.verification?.[buildIdKey]),
    field(`${key}.hash`, 'Application Hash', state.verification?.[hashKey]),
    field(`${key}.bootVersion`, 'Boot Version', state.versions[bootKey]),
    field(`${key}.bootBuildId`, 'Boot Build ID', state.verification?.[bootBuildIdKey]),
    field(`${key}.bootHash`, 'Boot Hash', state.verification?.[bootHashKey]),
  ];

  return fields.some(item => hasValue(item.value))
    ? { key, title: key.toUpperCase(), fields }
    : undefined;
};

const buildDeviceSections = (
  state: DeviceState | undefined,
  deviceInfoTitle: string,
  seInfoTitle: string
): DeviceSection[] => {
  if (!state) return [];

  const verification = state.verification ?? {};
  const hasApplicationP1 = [
    state.versions.applicationP1,
    verification.applicationP1BuildId,
    verification.applicationP1Hash,
  ].some(hasValue);
  const deviceGroups: Array<DeviceGroup | undefined> = [
    {
      key: 'identity',
      title: 'Identity',
      fields: [
        field('identity.deviceType', 'Device Type', state.identity.deviceType),
        field('identity.serialNo', 'Serial Number', state.identity.serialNo),
        field('protocol', 'Protocol', state.protocol),
        field('protocolVersion', 'Protocol Version', state.protocolVersion),
        field('identity.model', 'Model', state.identity.model),
        field('identity.vendor', 'Vendor', state.identity.vendor),
      ],
    },
    componentGroup({
      key: 'board',
      title: 'Boardloader',
      version: state.versions.board,
      buildId: verification.boardBuildId,
      hash: verification.boardHash,
    }),
    componentGroup({
      key: 'bootloader',
      title: 'Bootloader',
      version: state.versions.bootloader,
      buildId: verification.bootloaderBuildId,
      hash: verification.bootloaderHash,
    }),
    componentGroup({
      key: hasApplicationP1 ? 'applicationP1' : 'firmware',
      title: hasApplicationP1 ? 'Application P1' : 'Firmware',
      version: hasApplicationP1 ? state.versions.applicationP1 : state.versions.firmware,
      buildId: hasApplicationP1 ? verification.applicationP1BuildId : verification.firmwareBuildId,
      hash: hasApplicationP1 ? verification.applicationP1Hash : verification.firmwareHash,
    }),
    componentGroup({
      key: 'applicationP2',
      title: 'Application P2',
      version: state.versions.applicationP2,
      buildId: verification.applicationP2BuildId,
      hash: verification.applicationP2Hash,
    }),
    componentGroup({
      key: 'coprocessor',
      title: 'Coprocessor',
      version: state.versions.ble,
      buildId: verification.bleBuildId,
      hash: verification.bleHash,
      extraFields: [field('coprocessor.name', 'BLE Name', state.identity.bleName)],
    }),
  ];
  const securityElementGroups = ([1, 2, 3, 4] as const)
    .map(index => securityElementGroup(state, index))
    .filter((group): group is DeviceGroup => group !== undefined);

  return [
    {
      key: 'deviceInfo',
      title: deviceInfoTitle,
      groups: deviceGroups.filter((group): group is DeviceGroup => group !== undefined),
    },
    ...(securityElementGroups.length > 0
      ? [{ key: 'seInfo', title: seInfoTitle, groups: securityElementGroups }]
      : []),
  ];
};

const DeviceInfoPage: React.FC = () => {
  const { toast } = useToast();
  const { currentDevice } = useDeviceStore();
  const { t } = useTranslation();
  const deviceInfoTitle = t('deviceInfo.deviceInfo');
  const seInfoTitle = t('deviceInfo.seInfo');
  const deviceSections = useMemo(
    () => buildDeviceSections(currentDevice?.state, deviceInfoTitle, seInfoTitle),
    [currentDevice?.state, deviceInfoTitle, seInfoTitle]
  );
  const deviceType = formatFieldValue(
    currentDevice?.state?.identity.deviceType ?? currentDevice?.deviceType
  );
  const serialNumber = formatFieldValue(
    currentDevice?.state?.identity.serialNo ?? currentDevice?.serialNo
  );

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

  const exportDeviceInfo = () => {
    if (!currentDevice?.state) return;

    const markdown = [
      `# OneKey ${deviceType} Device Information`,
      `Serial Number: ${serialNumber}`,
      `Export Time: ${formatCurrentTime(Date.now())}`,
      '',
    ];

    deviceSections.forEach(section => {
      markdown.push(`## ${section.title}`, '');
      section.groups.forEach(group => {
        markdown.push(`### ${group.title}`);
        group.fields.forEach(item => {
          markdown.push(`**${item.label}**: ${formatFieldValue(item.value)}`);
        });
        markdown.push('');
      });
    });

    const formatTime = formatCurrentTime(Date.now())
      .replace(/:/g, '')
      .replace(/\//g, '')
      .replace(/ /g, '-');
    const fileName = `OneKey-${deviceType}-${serialNumber}-${formatTime}.md`;
    const blob = new Blob([markdown.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Success',
      description: `Device information exported as ${fileName}`,
    });
  };

  const handleKeyPress = (event: React.KeyboardEvent, text: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      copyToClipboard(text);
    }
  };

  const renderField = (item: DeviceField) => {
    const value = formatFieldValue(item.value);
    const isEmpty = value === '--';

    return (
      <div
        key={item.key}
        role={isEmpty ? undefined : 'button'}
        tabIndex={isEmpty ? undefined : 0}
        onClick={() => !isEmpty && copyToClipboard(value)}
        onKeyDown={event => !isEmpty && handleKeyPress(event, value)}
        className={`group relative p-2 rounded transition-all duration-200 ${
          isEmpty
            ? 'bg-muted/5 text-muted-foreground cursor-default'
            : 'bg-background hover:bg-accent/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50'
        }`}
        title={isEmpty ? `${item.label} - No data` : `${item.label}: ${value} (click to copy)`}
        aria-label={isEmpty ? `${item.label} - No data` : `Copy ${item.label}: ${value}`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs font-bold text-foreground">{item.label}</span>
          {!isEmpty ? (
            <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : null}
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

  const renderGroup = (group: DeviceGroup) => (
    <div key={group.key} className="border border-border/40 rounded-lg p-2 bg-card/30 mb-2">
      <h4 className="mb-2 text-sm font-semibold text-foreground">{group.title}</h4>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
        {group.fields.map(renderField)}
      </div>
    </div>
  );

  const renderSection = (section: DeviceSection) => {
    const fields = section.groups.flatMap(group => group.fields);
    const fieldsWithValues = fields.filter(item => hasValue(item.value)).length;

    return (
      <div key={section.key} className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{section.title}</h3>
          <Badge variant="outline" className="text-xs font-bold px-2 py-0.5">
            {fieldsWithValues}/{fields.length}
          </Badge>
        </div>
        <div className="space-y-2">{section.groups.map(renderGroup)}</div>
      </div>
    );
  };

  return (
    <PageLayout fixedHeight={true}>
      <div className="flex-1 flex flex-col px-3 py-2 min-h-0 h-full">
        <div className="flex-shrink-0 mb-2">
          <DeviceNotConnectedState />
        </div>

        {currentDevice ? (
          <>
            <div className="flex-shrink-0 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-muted/20">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">{deviceType} Information</h1>
                  <p className="text-xs text-muted-foreground">Serial: {serialNumber}</p>
                </div>
              </div>
              <Button
                onClick={exportDeviceInfo}
                variant="outline"
                size="sm"
                disabled={!currentDevice.state}
                className="flex items-center gap-1.5 hover:bg-accent"
              >
                <Download className="w-3 h-3" />
                Export
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-4 pb-2">{deviceSections.map(renderSection)}</div>
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
