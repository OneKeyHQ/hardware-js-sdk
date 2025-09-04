import React, { useMemo, useCallback, memo } from 'react';
import { useIntl } from 'react-intl';
import { Dialog, Stack, Text, Unspaced, XStack, YStack } from 'tamagui';
import { Delete, X } from '@tamagui/lucide-icons';
import { StyleSheet } from 'react-native';
import { atom, getDefaultStore, useAtomValue, useSetAtom } from 'jotai';
import { Button } from './ui/Button';
import { useMedia } from '../provider/MediaProvider';

// Pin value atom
export const pinValueAtom = atom<string>('');

// Pin mask atom (derived atom)
export const pinMaskAtom = atom(get => {
  const val = get(pinValueAtom);
  return val
    .split('')
    .map(v => (v ? '•' : ''))
    .join('');
});

// Pin actions atom (write-only atom)
export const pinActionsAtom = atom(
  null,
  (get, set, action: { type: 'add' | 'delete' | 'clear'; value?: string }) => {
    const currentVal = get(pinValueAtom);

    switch (action.type) {
      case 'add':
        if (action.value) {
          set(pinValueAtom, currentVal + action.value);
        }
        break;
      case 'delete':
        set(pinValueAtom, currentVal.slice(0, -1));
        break;
      case 'clear':
        set(pinValueAtom, '');
        break;
      default:
        break;
    }
  }
);

// 样式常量
const borderCurveStyle = {
  borderCurve: 'continuous' as const,
};

const hoverStyle = {
  bg: '$bgHover',
};

const pressStyle = {
  bg: '$bgActive',
};

const focusStyle = {
  outlineColor: '$focusRing',
  outlineOffset: -2,
  outlineWidth: 2,
  outlineStyle: 'solid' as const,
};

// PIN 显示组件
const PinDisplay = memo(() => {
  const pinMask = useAtomValue(pinMaskAtom);
  const setPinAction = useSetAtom(pinActionsAtom);

  const handleDeletePress = useCallback(() => {
    setPinAction({ type: 'delete' });
  }, [setPinAction]);

  return (
    <XStack
      height="$12"
      alignItems="center"
      paddingHorizontal="$3"
      borderBottomWidth={StyleSheet.hairlineWidth}
      borderColor="$borderSubdued"
      backgroundColor="$bgSubdued"
    >
      <Text selectable={false} paddingLeft="$6" textAlign="center" flex={1} fontSize={40}>
        {pinMask}
      </Text>
      <Button variant="tertiary" onPress={handleDeletePress}>
        <Delete />
      </Button>
    </XStack>
  );
});

PinDisplay.displayName = 'PinDisplay';

// 单个键盘按钮组件
const KeyboardButton = memo<{
  num: string;
  index: number;
}>(({ num, index }: { num: string; index: number }) => {
  const setPinAction = useSetAtom(pinActionsAtom);

  const handlePress = useCallback(() => {
    setPinAction({ type: 'add', value: num });
  }, [setPinAction, num]);

  const isRightEdge = index === 2 || index === 5 || index === 8;
  const isBottomEdge = index === 9;

  const borderRightStyle = isRightEdge ? { borderRightWidth: 0 } : {};
  const borderBottomStyle = isBottomEdge ? { borderBottomWidth: 0 } : {};

  return (
    <Stack
      flexBasis={index === 9 ? '100%' : '33.3333%'}
      height="$14"
      borderRightWidth={StyleSheet.hairlineWidth}
      borderBottomWidth={StyleSheet.hairlineWidth}
      borderColor="$borderSubdued"
      justifyContent="center"
      alignItems="center"
      {...borderRightStyle}
      {...borderBottomStyle}
      hoverStyle={hoverStyle}
      pressStyle={pressStyle}
      focusable
      focusStyle={focusStyle}
      onPress={handlePress}
    >
      <Stack width="$2.5" height="$2.5" borderRadius="$full" backgroundColor="$text" />
    </Stack>
  );
});

KeyboardButton.displayName = 'KeyboardButton';

// PIN 键盘组件
const PinKeyboard = memo(() => {
  const keyboardMap = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'];

  return (
    <XStack flexWrap="wrap">
      {keyboardMap.map((num, index) => (
        <KeyboardButton key={index} num={num} index={index} />
      ))}
    </XStack>
  );
});

PinKeyboard.displayName = 'PinKeyboard';

// PIN 输入区域组件
const PinInputArea = memo(() => (
  <Stack
    borderWidth={StyleSheet.hairlineWidth}
    borderColor="$borderSubdued"
    borderRadius="$2"
    overflow="hidden"
    style={borderCurveStyle}
  >
    <PinDisplay />
    <PinKeyboard />
  </Stack>
));

PinInputArea.displayName = 'PinInputArea';

// PIN 操作按钮组件
const PinActions = memo<{
  onConfirm: (value: string) => void;
  onSwitchDevice: () => void;
}>(
  ({
    onConfirm,
    onSwitchDevice,
  }: {
    onConfirm: (value: string) => void;
    onSwitchDevice: () => void;
  }) => {
    const intl = useIntl();
    const setPinAction = useSetAtom(pinActionsAtom);

    const handleConfirmPress = useCallback(() => {
      const pin = getDefaultStore().get(pinValueAtom);
      setPinAction({ type: 'clear' });
      onConfirm(pin);
    }, [onConfirm, setPinAction]);

    const handleSwitchDevicePress = useCallback(() => {
      setPinAction({ type: 'clear' });
      onSwitchDevice();
    }, [onSwitchDevice, setPinAction]);

    const confirmText = useMemo(() => intl.formatMessage({ id: 'action__confirm' }), [intl]);
    const switchDeviceText = useMemo(
      () => intl.formatMessage({ id: 'action__switch_device' }),
      [intl]
    );

    return (
      <>
        <Dialog.Close asChild>
          <Button size="large" onPress={handleConfirmPress}>
            {confirmText}
          </Button>
        </Dialog.Close>

        <Dialog.Close asChild>
          <Button onPress={handleSwitchDevicePress}>{switchDeviceText}</Button>
        </Dialog.Close>
      </>
    );
  }
);

PinActions.displayName = 'PinActions';

// 关闭按钮组件
const CloseButton = memo<{
  onCancel: () => void;
}>(({ onCancel }: { onCancel: () => void }) => {
  const setPinAction = useSetAtom(pinActionsAtom);

  const handleCancelPress = useCallback(() => {
    setPinAction({ type: 'clear' });
    onCancel();
  }, [onCancel, setPinAction]);

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

// 主组件
type IReceivePinProps = {
  open: boolean;
  payload?: any;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: string) => void;
  onSwitchDevice: () => void;
  onCancel: () => void;
};

export const ReceivePin = memo<IReceivePinProps>(
  ({ open, payload, onOpenChange, onConfirm, onSwitchDevice, onCancel }: IReceivePinProps) => {
    const intl = useIntl();
    const media = useMedia();
    const setPinAction = useSetAtom(pinActionsAtom);

    const minWidth = useMemo(() => (media.gtXs ? 480 : '100%'), [media.gtXs]);
    const titleText = useMemo(() => intl.formatMessage({ id: 'title__input_pin' }), [intl]);

    const handleCancel = useCallback(() => {
      setPinAction({ type: 'clear' });
      onCancel();
    }, [onCancel, setPinAction]);

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
              {payload && <Text>payload: {JSON.stringify(payload)}</Text>}
              <PinInputArea />
              <PinActions onConfirm={onConfirm} onSwitchDevice={onSwitchDevice} />
            </YStack>

            <CloseButton onCancel={handleCancel} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    );
  }
);

ReceivePin.displayName = 'ReceivePin';
