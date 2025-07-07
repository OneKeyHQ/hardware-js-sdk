import { useIntl } from 'react-intl';
import { memo, useCallback, useMemo, useState } from 'react';
import { Dialog, Input, Stack, Text, Unspaced, YStack } from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import { useMedia } from '../provider/MediaProvider';
import { Button } from './ui/Button';

interface EnterPhaseProps {
  requestPayload?: {
    existsAttachPinUser?: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { passphrase: string }) => void;
  onSwitchDevice: () => void;
  onSwitchDeviceAttachPin: () => void;
  onCancel: () => void;
}

export function EnterPhase({
  requestPayload,
  open,
  onOpenChange,
  onConfirm,
  onSwitchDevice,
  onSwitchDeviceAttachPin,
  onCancel,
}: EnterPhaseProps) {
  const intl = useIntl();
  const media = useMedia();
  const [passphrase, setPassphrase] = useState('');

  const handleSubmit = useCallback(() => {
    onConfirm({
      passphrase: passphrase || '',
    });
  }, [passphrase, onConfirm]);

  const minWidth = useMemo(() => (media.gtXs ? 480 : '100%'), [media.gtXs]);
  const titleText = useMemo(() => intl.formatMessage({ id: 'title__input_passphrase' }), [intl]);

  if (!open) return null;

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
          minHeight={320}
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

          <YStack gap="$2">
            {requestPayload && <Text>payload: {JSON.stringify(requestPayload)}</Text>}
            <Input value={passphrase} onChangeText={setPassphrase} placeholder="Input Passphrase" />

            <Stack space="$2">
              <Button variant="primary" onPress={handleSubmit}>
                {intl.formatMessage({ id: 'action__confirm' })}
              </Button>
              <Button variant="secondary" onPress={onSwitchDevice}>
                {intl.formatMessage({ id: 'action__switch_device' })}
              </Button>
              <Button variant="secondary" onPress={onSwitchDeviceAttachPin}>
                {intl.formatMessage({ id: 'action__switch_device_attach_pin' })}
              </Button>
            </Stack>
          </YStack>

          <CloseButton onCancel={onCancel} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

// 关闭按钮组件
const CloseButton = memo<{
  onCancel: () => void;
}>(({ onCancel }: { onCancel: () => void }) => (
  <Unspaced>
    <Dialog.Close asChild>
      <Button
        onPress={onCancel}
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
));

CloseButton.displayName = 'CloseButton';
