import { Stack, Group, H3, YGroup, ListItem, Sheet, XStack, Text } from 'tamagui';
import { useNavigation, useRoute } from '@react-navigation/core';
import { Menu } from '@tamagui/lucide-icons';

import React, { useCallback, useMemo, useState, memo } from 'react';
import { useIntl } from 'react-intl';
import { Routes } from '../../route';
import { Button } from './Button';
import LocaleToggleButton from './LocaleToggleButton';
import { MenuItem, MenuListItem } from './MenuListItem';
import { useMedia } from '../../provider/MediaProvider';

// 菜单项数组
const menuItems: MenuItem[] = [
  { route: Routes.Payload, labelId: 'tab__api_payload' },
  { route: Routes.FirmwareUpdateTest, labelId: 'tab__firmware_update' },
  { route: Routes.PassphraseTest, labelId: 'tab__passphrase_test' },
  { route: Routes.AddressTest, labelId: 'tab__address_test' },
  { route: Routes.SLIP39Test, labelId: 'tab__slip39_test' },
  { route: Routes.SecurityCheck, labelId: 'tab__security_check' },
  { route: Routes.FunctionalTesting, labelId: 'tab__functional_testing' },
  { route: Routes.AttachToPinTestingScreen, labelId: 'tab__attach_to_pin_testing' },
  { route: Routes.ChainMethodTest, labelId: 'tab__chain_method_test' },
];

// 菜单按钮组件
const MenuButtons = memo(
  ({
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
            <Group.Item key={item.route}>
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
  }
);
MenuButtons.displayName = 'MenuButtons';

const SheetContent = memo(
  ({
    dropdownItems,
    navigate,
    open,
    setOpen,
  }: {
    dropdownItems: MenuItem[];
    navigate: (route: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
  }) => (
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
  )
);
SheetContent.displayName = 'SheetContent';

// 版本信息组件
const VersionInfo = memo(() => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const commitSha = typeof __COMMIT_SHA__ !== 'undefined' ? __COMMIT_SHA__ : 'dev';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown';

  // 只在生产环境显示
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  // 格式化日期为 YYYYMMDD 格式
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    } catch {
      return 'unknown';
    }
  };

  return (
    <Text fontSize="$2" color="$gray10" marginLeft="$2">
      {commitSha} {formatDate(buildTime)}
    </Text>
  );
});
VersionInfo.displayName = 'VersionInfo';

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
    const breakpoints = {
      lg: 7,
      md: 5,
      sm: 3,
      xs: 2,
    };

    let visibleCount = 0;
    if (media.gtLg) visibleCount = breakpoints.lg;
    else if (media.gtMd) visibleCount = breakpoints.md;
    else if (media.gtSm) visibleCount = breakpoints.sm;
    else if (media.gtXs) visibleCount = breakpoints.xs;

    return {
      visibleItems: menuItems.slice(0, visibleCount),
      dropdownItems: menuItems.slice(visibleCount),
    };
  }, [media]);

  return (
    <Stack
      backgroundColor="$bgApp"
      flexDirection="row"
      width="full"
      padding="$3"
      justifyContent="space-between"
    >
      <XStack alignItems="center">
        <H3>Hardware Example</H3>
        <VersionInfo />
      </XStack>

      <XStack minHeight={40} gap="$2">
        <MenuButtons visibleItems={visibleItems} currentRoute={route.name} navigate={navigate} />

        {dropdownItems?.length > 0 && (
          <>
            <Button onPress={() => setOpen(!open)}>
              <Menu size="$4" />
            </Button>
            <SheetContent
              dropdownItems={dropdownItems}
              navigate={navigate}
              open={open}
              setOpen={setOpen}
            />
          </>
        )}
        <LocaleToggleButton />
      </XStack>
    </Stack>
  );
};

export default HeaderView;
