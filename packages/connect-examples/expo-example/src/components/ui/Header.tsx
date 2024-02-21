import { Stack, Group, H3, YGroup, ListItem, useMedia, Sheet } from 'tamagui';
import { useNavigation, useRoute } from '@react-navigation/core';
import { Menu } from '@tamagui/lucide-icons';

import { useCallback, useMemo, useState } from 'react';
import { Routes } from '../../route';
import { Button } from './Button';

const HeaderView = () => {
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
            Api Payload
          </Button>
        </Group.Item>
        <Group.Item>
          <Button
            variant={route.name === Routes.FirmwareUpdateTest ? 'primary' : 'secondary'}
            onPress={() => navigate(Routes.FirmwareUpdateTest)}
          >
            Firmware Update
          </Button>
        </Group.Item>
        <Group.Item>
          <Button
            variant={route.name === Routes.PassphraseTest ? 'primary' : 'secondary'}
            onPress={() => navigate(Routes.PassphraseTest)}
          >
            Passphrase Test
          </Button>
        </Group.Item>
        <Group.Item>
          <Button
            variant={route.name === Routes.AddressTest ? 'primary' : 'secondary'}
            onPress={() => navigate(Routes.AddressTest)}
          >
            Address Test
          </Button>
        </Group.Item>
      </Group>
    ),
    [navigate, route.name]
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
            <ListItem title="Api Payload" onPress={() => navigate(Routes.Payload)} />

            <ListItem title="Firmware Update" onPress={() => navigate(Routes.FirmwareUpdateTest)} />

            <ListItem title="Passphrase Test" onPress={() => navigate(Routes.PassphraseTest)} />

            <ListItem title="Address Test" onPress={() => navigate(Routes.AddressTest)} />
          </YGroup>
        </Sheet.Frame>
      </Sheet>
    ),
    [navigate, open]
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
    </Stack>
  );
};

export default HeaderView;
