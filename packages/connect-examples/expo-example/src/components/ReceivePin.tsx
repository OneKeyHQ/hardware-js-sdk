import React, { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Dialog, SizableText, Stack, Text, Unspaced, XStack, YStack } from 'tamagui';
import { Delete, X } from '@tamagui/lucide-icons';
import { StyleSheet } from 'react-native';
import { Button } from './ui/Button';

type IReceivePinProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: string) => void;
  onSwitchDevice: () => void;
  onCancel: () => void;
};

const keyboardMap = ['7', '8', '9', /**/ '4', '5', '6', /**/ '1', '2', '3'];

export function ReceivePin({
  open,
  onOpenChange,
  onConfirm,
  onSwitchDevice,
  onCancel,
}: IReceivePinProps) {
  const intl = useIntl();

  const [val, setVal] = useState('');
  const varMask = useMemo(
    () =>
      val
        .split('')
        .map(v => (v ? '•' : ''))
        .join(''),
    [val]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal padding="$4">
        <Dialog.Overlay key="overlay" backgroundColor="$bgBackdrop" />
        <Dialog.Content
          key="content"
          minWidth="100%"
          minHeight={320}
          $gtXs={{
            minWidth: 480,
          }}
        >
          <Dialog.Title>{intl.formatMessage({ id: 'title__input_pin' })}</Dialog.Title>

          <YStack gap="$2">
            <Stack
              borderWidth={StyleSheet.hairlineWidth}
              borderColor="$borderSubdued"
              borderRadius="$2"
              overflow="hidden"
              style={{
                borderCurve: 'continuous',
              }}
            >
              <XStack
                height="$12"
                alignItems="center"
                paddingHorizontal="$3"
                borderBottomWidth={StyleSheet.hairlineWidth}
                borderColor="$borderSubdued"
                backgroundColor="$bgSubdued"
              >
                <Text selectable={false} paddingLeft="$6" textAlign="center" flex={1} fontSize={40}>
                  {varMask}
                </Text>
                <Button
                  variant="tertiary"
                  onPress={() => {
                    setVal(v => v.slice(0, -1));
                  }}
                >
                  <Delete />
                </Button>
              </XStack>
              <XStack flexWrap="wrap">
                {keyboardMap.map((num, index) => (
                  <Stack
                    key={index}
                    flexBasis="33.3333%"
                    h="$14"
                    borderRightWidth={StyleSheet.hairlineWidth}
                    borderBottomWidth={StyleSheet.hairlineWidth}
                    borderColor="$borderSubdued"
                    justifyContent="center"
                    alignItems="center"
                    {...((index === 2 || index === 5 || index === 8) && {
                      borderRightWidth: 0,
                    })}
                    {...((index === 6 || index === 7 || index === 8) && {
                      borderBottomWidth: 0,
                    })}
                    hoverStyle={{
                      bg: '$bgHover',
                    }}
                    pressStyle={{
                      bg: '$bgActive',
                    }}
                    focusable
                    focusStyle={{
                      outlineColor: '$focusRing',
                      outlineOffset: -2,
                      outlineWidth: 2,
                      outlineStyle: 'solid',
                    }}
                    onPress={() => setVal(v => v + num)}
                  >
                    <Stack
                      width="$2.5"
                      height="$2.5"
                      borderRadius="$full"
                      backgroundColor="$text"
                    />
                  </Stack>
                ))}
              </XStack>
            </Stack>

            <Dialog.Close asChild>
              <Button
                size="large"
                onPress={() => {
                  onConfirm(val);
                  setVal('');
                }}
              >
                {intl.formatMessage({ id: 'action__confirm' })}
              </Button>
            </Dialog.Close>

            <Dialog.Close asChild>
              <Button onPress={onSwitchDevice}>
                {intl.formatMessage({ id: 'action__switch_device' })}
              </Button>
            </Dialog.Close>
          </YStack>
          <Unspaced>
            <Dialog.Close asChild>
              <Button
                onPress={() => {
                  setVal('');
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
