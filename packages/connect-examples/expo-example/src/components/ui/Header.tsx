import { Stack, Group, H3, YGroup, ListItem, useMedia, Popover, Adapt } from 'tamagui';
import { useNavigation, useRoute } from '@react-navigation/core';
import { Menu } from '@tamagui/lucide-icons';

import { Routes } from '../../route';
import { Button } from './Button';

const HeaderView = () => {
  const media = useMedia();
  const route = useRoute();
  const navigation = useNavigation();

  console.log('gtSmMedia', route.name);

  function navigate(routeName: string) {
    // @ts-expect-error
    navigation.navigate(routeName);
  }

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
              Firmware Update Test
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
          <Group.Item>
            <Button
              variant={route.name === Routes.Mock ? 'primary' : 'secondary'}
              onPress={() => navigate(Routes.Mock)}
            >
              Mock Test
            </Button>
          </Group.Item>
        </Group>
      ) : (
        <Popover>
          <Popover.Trigger asChild>
            <Button>
              <Menu size="$4" />
            </Button>
          </Popover.Trigger>

          <Adapt platform="touch">
            <Popover.Sheet modal dismissOnSnapToBottom>
              <Popover.Sheet.Frame padding="$4">
                <Adapt.Contents />
              </Popover.Sheet.Frame>
              <Popover.Sheet.Overlay
                animation="lazy"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              />
            </Popover.Sheet>
          </Adapt>

          <Popover.Content
            borderWidth={1}
            borderColor="$borderColor"
            enterStyle={{ y: -10, opacity: 0 }}
            exitStyle={{ y: -10, opacity: 0 }}
            elevate
          >
            <YGroup alignSelf="center" width={240}>
              <YGroup.Item>
                <Popover.Close asChild>
                  <ListItem title="Api Payload" onPress={() => navigate(Routes.Payload)} />
                </Popover.Close>
              </YGroup.Item>
              <YGroup.Item>
                <Popover.Close asChild>
                  <ListItem
                    title="Firmware Update Test"
                    onPress={() => navigate(Routes.FirmwareUpdateTest)}
                  />
                </Popover.Close>
              </YGroup.Item>
              <YGroup.Item>
                <Popover.Close asChild>
                  <ListItem
                    title="Passphrase Test"
                    onPress={() => navigate(Routes.PassphraseTest)}
                  />
                </Popover.Close>
              </YGroup.Item>
              <YGroup.Item>
                <Popover.Close asChild>
                  <ListItem title="Address Test" onPress={() => navigate(Routes.AddressTest)} />
                </Popover.Close>
              </YGroup.Item>
            </YGroup>
          </Popover.Content>
        </Popover>
      )}
    </Stack>
  );
};

export default HeaderView;
