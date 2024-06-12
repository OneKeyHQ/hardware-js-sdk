import { Stack, Group, H3, YGroup, ListItem, useMedia, Sheet, XStack } from 'tamagui';
import { useNavigation, useRoute } from '@react-navigation/core';
import { Menu } from '@tamagui/lucide-icons';

import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Routes } from '../../route';
import { Button } from './Button';
import LocaleToggleButton from './LocaleToggleButton';

const HeaderView = () => {
  const intl = useIntl();
  const media = useMedia();
  const route = useRoute();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  const navigate = useCallback(
    (routeName: string) => {
      // @ts-expect-error
      navigation.navigate(routeName);
      setOpen(false);
    },
    [navigation]
  );

  const groupItemMemo = useMemo(
    () => (
      <Group
        $gtXs={{
          // @ts-expect-error
          orientation: 'horizontal',
        }}
        orientation="vertical"
      >
        <Group.Item>
          <Button
            variant={route.name === Routes.Payload ? 'primary' : 'secondary'}
            onPress={() => navigate(Routes.Payload)}
          >
            {intl.formatMessage({ id: 'tab__api_payload' })}
          </Button>
        </Group.Item>
        <Group.Item>
          <Button
            variant={route.name === Routes.FirmwareUpdateTest ? 'primary' : 'secondary'}
            onPress={() => navigate(Routes.FirmwareUpdateTest)}
          >
            {intl.formatMessage({ id: 'tab__firmware_update' })}
          </Button>
        </Group.Item>
        <Group.Item>
          <Button
            variant={route.name === Routes.PassphraseTest ? 'primary' : 'secondary'}
            onPress={() => navigate(Routes.PassphraseTest)}
          >
            {intl.formatMessage({ id: 'tab__passphrase_test' })}
          </Button>
        </Group.Item>
        <Group.Item>
          <Button
            variant={route.name === Routes.AddressTest ? 'primary' : 'secondary'}
            onPress={() => navigate(Routes.AddressTest)}
          >
            {intl.formatMessage({ id: 'tab__address_test' })}
          </Button>
        </Group.Item>{' '}
        <Group.Item>
          <Button
            variant={route.name === Routes.SecurityCheck ? 'primary' : 'secondary'}
            onPress={() => navigate(Routes.SecurityCheck)}
          >
            {intl.formatMessage({ id: 'tab__security_check' })}
          </Button>
        </Group.Item>
      </Group>
    ),
    [intl, navigate, route.name]
  );

  const smallGroupItemMemo = useMemo(
    () => (
      <Sheet
        forceRemoveScrollEnabled={open}
        modal
        open={open}
        onOpenChange={setOpen}
        snapPointsMode="fit"
        dismissOnSnapToBottom
        zIndex={100_000}
        animation="quick"
      >
        <Sheet.Overlay
          animation="quick"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="$bgBackdrop"
        />
        <Sheet.Handle />
        <Sheet.Frame padding="$4" justifyContent="center" alignItems="center" space="$5">
          <YGroup alignSelf="center" width={240}>
            <ListItem
              title={intl.formatMessage({ id: 'tab__api_payload' })}
              onPress={() => navigate(Routes.Payload)}
            />
            <ListItem
              title={intl.formatMessage({ id: 'tab__firmware_update' })}
              onPress={() => navigate(Routes.FirmwareUpdateTest)}
            />
            <ListItem
              title={intl.formatMessage({ id: 'tab__passphrase_test' })}
              onPress={() => navigate(Routes.PassphraseTest)}
            />
            <ListItem
              title={intl.formatMessage({ id: 'tab__address_test' })}
              onPress={() => navigate(Routes.AddressTest)}
            />
            <ListItem
              title={intl.formatMessage({ id: 'tab__security_check' })}
              onPress={() => navigate(Routes.SecurityCheck)}
            />
          </YGroup>
        </Sheet.Frame>
      </Sheet>
    ),
    [intl, navigate, open]
  );

  return (
    <Stack
      backgroundColor="$bgApp"
      flexDirection="row"
      width="full"
      padding="$3"
      justifyContent="space-between"
    >
      <H3>Hardware Example</H3>

      <XStack minHeight={40} gap="$2">
        {media.gtSm ? (
          groupItemMemo
        ) : (
          <>
            <Button onPress={() => setOpen(!open)}>
              <Menu size="$4" />
            </Button>
            {smallGroupItemMemo}
          </>
        )}
        <LocaleToggleButton />
      </XStack>
    </Stack>
  );
};

export default HeaderView;
