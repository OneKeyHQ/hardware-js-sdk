import { Stack, Group, H3, YGroup, ListItem, useMedia, Sheet, XStack } from 'tamagui';
import { useNavigation, useRoute } from '@react-navigation/core';
import { Menu } from '@tamagui/lucide-icons';

import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Routes } from '../../route';
import { Button } from './Button';
import LocaleToggleButton from './LocaleToggleButton';

interface MenuItem {
  route: string;
  labelId: string;
}

// 菜单项数组
const menuItems: MenuItem[] = [
  { route: Routes.Payload, labelId: 'tab__api_payload' },
  { route: Routes.FirmwareUpdateTest, labelId: 'tab__firmware_update' },
  { route: Routes.PassphraseTest, labelId: 'tab__passphrase_test' },
  { route: Routes.AddressTest, labelId: 'tab__address_test' },
  { route: Routes.SecurityCheck, labelId: 'tab__security_check' },
  { route: Routes.FunctionalTesting, labelId: 'tab__functional_testing' },
];

// 菜单按钮组件
const MenuButtons = ({
  visibleItems,
  currentRoute,
  navigate,
}: {
  visibleItems: MenuItem[];
  currentRoute: string;
  navigate: (route: string) => void;
}) => {
  const intl = useIntl();

  return (
    visibleItems?.length > 0 && (
      <Group orientation="horizontal">
        {visibleItems.map(item => (
          <Group.Item>
            <Button
              variant={currentRoute === item.route ? 'primary' : 'secondary'}
              onPress={() => navigate(item.route)}
            >
              {intl.formatMessage({ id: item.labelId })}
            </Button>
          </Group.Item>
        ))}
      </Group>
    )
  );
};

// 菜单列表项组件
const MenuListItem = ({ item, onPress }: { item: MenuItem; onPress: (route: string) => void }) => {
  const intl = useIntl();

  return (
    <ListItem
      title={intl.formatMessage({ id: item.labelId })}
      onPress={() => onPress(item.route)}
      fontWeight="bold"
      textAlign="center"
      size="$5"
      color="black"
    />
  );
};

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

  const { visibleItems, dropdownItems } = useMemo(() => {
    if (media.gtXxl)
      return { visibleItems: menuItems.slice(0, 10), dropdownItems: menuItems.slice(10) };
    if (media.gtXl)
      return { visibleItems: menuItems.slice(0, 9), dropdownItems: menuItems.slice(9) };
    if (media.gtLg)
      return { visibleItems: menuItems.slice(0, 7), dropdownItems: menuItems.slice(7) };
    if (media.gtMd)
      return { visibleItems: menuItems.slice(0, 5), dropdownItems: menuItems.slice(5) };
    if (media.gtSm)
      return { visibleItems: menuItems.slice(0, 3), dropdownItems: menuItems.slice(3) };
    if (media.gtXs)
      return { visibleItems: menuItems.slice(0, 2), dropdownItems: menuItems.slice(2) };
    return { visibleItems: [], dropdownItems: menuItems };
  }, [media]);

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
        <MenuButtons visibleItems={visibleItems} currentRoute={route.name} navigate={navigate} />

        {dropdownItems?.length > 0 && (
          <>
            <Button onPress={() => setOpen(!open)}>
              <Menu size="$4" />
            </Button>
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
              <Sheet.Frame padding="$4" justifyContent="center" alignItems="center">
                <YGroup alignSelf="center">
                  {dropdownItems.map(item => (
                    <MenuListItem key={item.route} item={item} onPress={navigate} />
                  ))}
                </YGroup>
              </Sheet.Frame>
            </Sheet>
          </>
        )}
        <LocaleToggleButton />
      </XStack>
    </Stack>
  );
};

export default HeaderView;
