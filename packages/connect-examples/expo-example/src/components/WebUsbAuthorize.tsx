import React from 'react';
import { useIntl } from 'react-intl';
import { Dialog, Text, Unspaced, YStack } from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import { Button } from './ui/Button';

type IWebUsbAuthorizeProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (device: USBDevice) => void;
  onCancel: () => void;
  // Optional USB device filters
  filters?: USBDeviceFilter[];
};

export function WebUsbAuthorize({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  filters = [],
}: IWebUsbAuthorizeProps) {
  const intl = useIntl();

  const handleRequestDevice = async () => {
    try {
      const device = await navigator.usb.requestDevice({ filters });
      onSuccess(device);
      onOpenChange(false);
    } catch (error) {
      // User cancelled the device selection or an error occurred
      console.error('WebUSB request device error:', error);
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal padding="$4">
        <Dialog.Overlay key="overlay" backgroundColor="$bgBackdrop" />
        <Dialog.Content
          key="content"
          minWidth="100%"
          minHeight={240}
          $gtXs={{
            minWidth: 480,
          }}
        >
          <Dialog.Title>
            {intl.formatMessage({ id: 'title__authorize_usb_device' }) || 'Authorize USB Device'}
          </Dialog.Title>

          {/* @ts-expect-error */}
          <YStack gap="$4" py="$4">
            <Text textAlign="center">
              {intl.formatMessage({ id: 'content__authorize_usb_device_description' }) ||
                'Please connect and authorize your USB device to continue'}
            </Text>

            <Button size="large" onPress={handleRequestDevice}>
              {intl.formatMessage({ id: 'action__authorize_device' }) || 'Authorize Device'}
            </Button>
          </YStack>

          <Unspaced>
            <Dialog.Close asChild>
              <Button
                onPress={() => {
                  onCancel();
                }}
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
