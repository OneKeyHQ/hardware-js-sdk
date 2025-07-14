import React, { useMemo, useCallback, memo } from 'react';
import { useIntl } from 'react-intl';
import { Dialog, Text, Unspaced, YStack } from 'tamagui';
import { X, Bluetooth, Settings } from '@tamagui/lucide-icons';
import { Platform } from 'react-native';
import { Button } from './ui/Button';
import { useMedia } from '../provider/MediaProvider';

// Type declaration for desktopApi
declare global {
  interface Window {
    desktopApi?: {
      bluetoothSystem?: {
        requestPermission: () => Promise<boolean>;
        openBluetoothSettings: () => void;
        openSystemSettings: () => void;
        getSystemState: () => Promise<{
          isSupported: boolean;
          isPoweredOn: boolean;
          hasPermission: boolean;
          isScanning: boolean;
        }>;
      };
    };
  }
}

// 蓝牙权限错误类型
export type BluetoothErrorType = 'permission' | 'powered_off' | 'unsupported';

// 组件 Props
type IBluetoothPermissionProps = {
  open: boolean;
  errorType: BluetoothErrorType;
  onOpenChange: (open: boolean) => void;
  onRequestPermission?: () => void;
  onOpenSettings?: () => void;
  onCancel: () => void;
};

// 关闭按钮组件
const CloseButton = memo<{
  onCancel: () => void;
}>(({ onCancel }: { onCancel: () => void }) => {
  const handleCancelPress = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <Unspaced>
      <Dialog.Close asChild>
        <Button
          onPress={handleCancelPress}
          variant="tertiary"
          circular
          width={32}
          height={32}
          position="absolute"
          top="$3"
          right="$3"
        >
          <X />
        </Button>
      </Dialog.Close>
    </Unspaced>
  );
});

CloseButton.displayName = 'CloseButton';

// 打开系统设置的函数 - 使用 desktopApi 而不是直接 import electron
const openSystemSettings = () => {
  if (typeof window !== 'undefined' && window.desktopApi?.bluetoothSystem) {
    // 使用 desktopApi 打开蓝牙设置
    window.desktopApi.bluetoothSystem.openBluetoothSettings();
  } else {
    console.warn('desktopApi not available - cannot open system settings');
  }
};

// 主组件
export const BluetoothPermission = memo<IBluetoothPermissionProps>(
  ({
    open,
    errorType,
    onOpenChange,
    onRequestPermission,
    onOpenSettings,
    onCancel,
  }: IBluetoothPermissionProps) => {
    const intl = useIntl();
    const media = useMedia();

    const minWidth = useMemo(() => (media.gtXs ? 480 : '100%'), [media.gtXs]);

    // 根据错误类型获取标题
    const titleText = useMemo(() => {
      switch (errorType) {
        case 'permission':
          return intl.formatMessage({ id: 'title__bluetooth_permission_required' });
        case 'powered_off':
          return intl.formatMessage({ id: 'title__bluetooth_not_available' });
        case 'unsupported':
          return intl.formatMessage({ id: 'title__bluetooth_unsupported' });
        default:
          return intl.formatMessage({ id: 'title__bluetooth_error' });
      }
    }, [intl, errorType]);

    // 根据错误类型获取描述文本
    const descriptionText = useMemo(() => {
      switch (errorType) {
        case 'permission':
          return intl.formatMessage({ id: 'content__bluetooth_permission_description' });
        case 'powered_off':
          return intl.formatMessage({ id: 'content__bluetooth_powered_off_description' });
        case 'unsupported':
          return intl.formatMessage({ id: 'content__bluetooth_unsupported_description' });
        default:
          return intl.formatMessage({ id: 'content__bluetooth_error_description' });
      }
    }, [intl, errorType]);

    // 主要操作按钮文本和处理函数
    const { primaryButtonText, primaryAction } = useMemo(() => {
      switch (errorType) {
        case 'permission':
          return {
            primaryButtonText: intl.formatMessage({ id: 'action__grant_permission' }),
            primaryAction: onRequestPermission || (() => {}),
          };
        case 'powered_off':
          return {
            primaryButtonText: intl.formatMessage({ id: 'action__open_settings' }),
            primaryAction: onOpenSettings || openSystemSettings,
          };
        case 'unsupported':
          return {
            primaryButtonText: intl.formatMessage({ id: 'action__understand' }),
            primaryAction: onCancel,
          };
        default:
          return {
            primaryButtonText: intl.formatMessage({ id: 'action__ok' }),
            primaryAction: onCancel,
          };
      }
    }, [intl, errorType, onRequestPermission, onOpenSettings, onCancel]);

    const handlePrimaryAction = useCallback(() => {
      primaryAction();
      // 只有在不支持的情况下才自动关闭，其他情况等待权限结果
      if (errorType === 'unsupported') {
        onOpenChange(false);
      }
    }, [primaryAction, errorType, onOpenChange]);

    const secondaryButtonText = useMemo(() => intl.formatMessage({ id: 'action__cancel' }), [intl]);

    const handleSecondaryAction = useCallback(() => {
      onCancel();
      onOpenChange(false);
    }, [onCancel, onOpenChange]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal padding="$4">
          <Dialog.Overlay
            key="overlay"
            backgroundColor="$bgBackdrop"
            animateOnly={['transform', 'opacity']}
            animation={[
              'quicker',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <Dialog.Content
            key="content"
            minWidth={minWidth}
            minHeight={200}
            animateOnly={['transform', 'opacity']}
            animation={[
              'quicker',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          >
            <Dialog.Title>{titleText}</Dialog.Title>

            <YStack gap="$4" paddingVertical="$3">
              {/* 蓝牙图标 */}
              <YStack alignItems="center" paddingVertical="$2">
                {errorType === 'powered_off' ? (
                  <Settings size={48} color="$colorWarning" />
                ) : (
                  <Bluetooth
                    size={48}
                    color={errorType === 'unsupported' ? '$colorCritical' : '$colorInfo'}
                  />
                )}
              </YStack>

              {/* 描述文本 */}
              <Text textAlign="center" fontSize="$4" lineHeight="$5" color="$colorSubdued">
                {descriptionText}
              </Text>

              {/* 操作按钮 */}
              <YStack gap="$3">
                <Dialog.Close asChild>
                  <Button size="large" onPress={handlePrimaryAction}>
                    {primaryButtonText}
                  </Button>
                </Dialog.Close>

                {/* 只有在权限和开关问题时显示取消按钮，不支持时不显示 */}
                {errorType !== 'unsupported' && (
                  <Dialog.Close asChild>
                    <Button variant="tertiary" onPress={handleSecondaryAction}>
                      {secondaryButtonText}
                    </Button>
                  </Dialog.Close>
                )}
              </YStack>
            </YStack>

            <CloseButton onCancel={onCancel} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    );
  }
);

BluetoothPermission.displayName = 'BluetoothPermission';
