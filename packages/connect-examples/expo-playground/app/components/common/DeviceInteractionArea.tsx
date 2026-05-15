import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { useTranslation } from 'react-i18next';
import DeviceActionAnimation from '../ui/DeviceActionAnimation';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Play,
  RotateCcw,
  Upload,
  Zap,
} from 'lucide-react';
import type { DeviceModel, ThemeType } from '../ui/DeviceActionAnimation';
import { UiEvent } from '@onekeyfe/hd-core';
import { getDeviceImagePath } from '../../utils/deviceTypeUtils';
import type { DeviceInfo } from '../../types/hardware';
import type { ExecutionStatus } from '~/data/types';

// 添加固件进度数据类型
interface FirmwareProgressData {
  progress: number;
  progressType: 'transferData' | 'installingFirmware';
}

interface FirmwareVersionInfo {
  bootloaderVersion?: string;
  firmwareVersion?: string;
  bleVersion?: string;
}

interface DeviceInteractionAreaProps {
  status: ExecutionStatus;
  deviceAction?: {
    actionType: UiEvent['type'];
    deviceInfo?: unknown;
  } | null;
  deviceModel: DeviceModel;
  deviceTheme: ThemeType;
  onExecute: () => void;
  onReset: () => void;
  isCancelling?: boolean;
  // 添加固件进度相关属性
  firmwareProgress?: FirmwareProgressData | null;
  firmwareVersions?: FirmwareVersionInfo | null;
  // 添加当前设备信息
  currentDevice?: DeviceInfo | null;
  title?: string | null;
  compact?: boolean;
}

const DeviceInteractionArea: React.FC<DeviceInteractionAreaProps> = ({
  status,
  deviceAction,
  deviceModel,
  deviceTheme,
  onExecute,
  onReset,
  isCancelling = false,
  firmwareProgress,
  firmwareVersions,
  currentDevice,
  title,
  compact = false,
}) => {
  const { t } = useTranslation();
  const panelTitle =
    title === undefined ? t('components.methodExecutor.expectedUserExperience') : title;

  // 获取状态配置
  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <Clock className="h-5 w-5 animate-spin" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
          message: t('components.methodExecutor.executing'),
        };
      case 'device-interaction':
        return {
          icon: <Clock className="h-5 w-5 animate-pulse" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeColor: 'bg-green-100 text-green-800 border-green-300',
          message: t('deviceOperations.deviceInstructions'),
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeColor: 'bg-green-100 text-green-800 border-green-300',
          message: t('components.methodExecutor.executionSuccess'),
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeColor: 'bg-red-100 text-red-800 border-red-300',
          message: t('components.methodExecutor.executionFailed'),
        };
      default:
        return {
          icon: <ArrowRight className="h-5 w-5" />,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/20',
          borderColor: 'border-border/50',
          badgeColor: 'bg-muted text-muted-foreground border-border',
          message: t('components.methodExecutor.waitingExecution'),
        };
    }
  };

  // 获取固件进度配置
  const getFirmwareProgressConfig = () => {
    if (!firmwareProgress) return null;

    switch (firmwareProgress.progressType) {
      case 'transferData':
        return {
          icon: <Upload className="h-4 w-4" />,
          title: t('components.deviceInteractionArea.transferringData'),
          description: t('components.deviceInteractionArea.transferringDataDesc'),
          color: 'text-blue-600',
        };
      case 'installingFirmware':
        return {
          icon: <Zap className="h-4 w-4" />,
          title: t('components.deviceInteractionArea.installingFirmware'),
          description: t('components.deviceInteractionArea.installingFirmwareDesc'),
          color: 'text-orange-600',
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();
  const progressConfig = getFirmwareProgressConfig();
  const firmwareVersionRows = firmwareVersions
    ? [
        {
          label: t('common.bootVersion'),
          value: firmwareVersions.bootloaderVersion,
        },
        {
          label: t('common.firmwareVersion'),
          value: firmwareVersions.firmwareVersion,
        },
        {
          label: t('common.bluetoothVersion'),
          value: firmwareVersions.bleVersion,
        },
      ].filter(row => row.value)
    : [];

  return (
    <Card className="bg-card border border-border/50 shadow-sm h-full flex flex-col">
      {panelTitle && (
        <CardHeader className="pb-1 flex-shrink-0">
          <CardTitle className="text-sm text-foreground flex items-center justify-between">
            {panelTitle}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={`flex-1 flex flex-col min-h-0 ${compact ? 'p-4' : ''}`}>
        <div className="flex flex-col items-center justify-center h-full">
          {/* 设备展示区域 - 占用更多空间 */}
          <div
            className={
              compact
                ? 'order-2 flex-1 w-full flex items-center justify-center min-h-[96px] mb-3'
                : 'order-2 flex-1 w-full flex items-center justify-center min-h-0 mb-6'
            }
          >
            {status === 'success' ? (
              <div className="w-full h-full flex items-center justify-center">
                <DeviceActionAnimation
                  action="success"
                  deviceModel={deviceModel}
                  theme={deviceTheme}
                  loop={false}
                  autoplay={true}
                />
              </div>
            ) : status === 'error' ? (
              <div className="w-full h-full flex items-center justify-center">
                <DeviceActionAnimation
                  action="error"
                  deviceModel={deviceModel}
                  theme={deviceTheme}
                  loop={false}
                  autoplay={true}
                />
              </div>
            ) : deviceAction ? (
              <div className={compact ? 'w-28 h-28' : 'w-100 h-100'}>
                <DeviceActionAnimation
                  action={deviceAction.actionType}
                  deviceModel={deviceModel}
                  theme={deviceTheme}
                  loop={true}
                  autoplay={true}
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                {/* 设备图片或默认图标 */}
                <div className={`relative ${compact ? 'mb-2' : 'mb-8'}`}>
                  {currentDevice ? (
                    /* 显示真实设备图片 */
                    <div
                      className={`${
                        compact ? 'w-16 h-24' : 'w-32 h-48'
                      } flex items-center justify-center`}
                    >
                      <img
                        src={getDeviceImagePath(currentDevice.deviceType)}
                        alt={`OneKey ${currentDevice.deviceType || 'Device'}`}
                        className="max-w-full max-h-full object-contain filter drop-shadow-lg"
                      />
                    </div>
                  ) : (
                    /* 默认设备图标 */
                    <div
                      className={`${
                        compact ? 'w-16 h-24' : 'w-24 h-36'
                      } bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden`}
                    >
                      {/* 屏幕区域 */}
                      <div className="absolute top-3 left-3 right-3 h-20 bg-gray-900 dark:bg-gray-100 rounded-sm"></div>

                      {/* 按钮区域 */}
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                    </div>
                  )}
                </div>

                {/* 设备信息 */}
                <div className={`text-center ${compact ? 'space-y-1' : 'space-y-3'}`}>
                  <h3 className={`${compact ? 'text-sm' : 'text-base'} font-medium text-foreground`}>
                    {currentDevice ? `OneKey ${currentDevice.deviceType || 'Device'}` : ''}
                  </h3>
                  <p className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                    {status === 'idle'
                      ? currentDevice
                        ? t('components.methodExecutor.deviceConnected')
                        : t('components.methodExecutor.connectDevice')
                      : status === 'loading'
                      ? t('components.methodExecutor.executing')
                      : statusConfig.message}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 固件更新进度显示 */}
          {firmwareProgress && progressConfig && (
            <div className="order-3 w-full mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className={progressConfig.color}>{progressConfig.icon}</div>
                <span className="text-sm font-medium text-foreground">{progressConfig.title}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {firmwareProgress.progress}%
                </span>
              </div>
              <Progress value={firmwareProgress.progress} className="h-2 mb-1" />
              <p className="text-xs text-muted-foreground">{progressConfig.description}</p>
            </div>
          )}

          {status === 'success' && firmwareVersionRows.length > 0 && (
            <div className="order-4 w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {t('components.deviceInteractionArea.updatedVersions')}
                </span>
              </div>
              <div className="space-y-1">
                {firmwareVersionRows.map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-green-700">{row.label}</span>
                    <span className="font-mono font-medium text-green-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 执行控制按钮 - 并排布局，恢复文字 */}
          <div
            className={`w-full grid grid-cols-2 ${
              compact ? 'order-1 mb-3 gap-3' : 'order-5 gap-4'
            } flex-shrink-0`}
          >
            <Button
              onClick={onExecute}
              disabled={status === 'loading' || status === 'device-interaction'}
              className={`bg-primary hover:bg-primary/90 text-primary-foreground ${
                compact ? 'h-10' : 'h-11'
              } text-sm flex items-center gap-2`}
            >
              {status === 'loading' || status === 'device-interaction' ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>{t('components.methodExecutor.executing2')}</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>{t('common.execute')}</span>
                </>
              )}
            </Button>

            {/* 取消按钮 */}
            <Button
              variant={
                status === 'loading' || status === 'device-interaction' ? 'elegant' : 'outline'
              }
              onClick={onReset}
              disabled={status === 'idle' || status === 'error' || isCancelling}
              className={
                status === 'loading' || status === 'device-interaction'
                  ? `${compact ? 'h-10' : 'h-11'} text-sm flex items-center gap-2`
                  : `border-border text-foreground hover:bg-muted ${
                      compact ? 'h-10' : 'h-11'
                    } text-sm flex items-center gap-2`
              }
            >
              {isCancelling ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>{t('components.methodExecutor.cancelling')}</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  <span>{t('common.cancel')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceInteractionArea;
