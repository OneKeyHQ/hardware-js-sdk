import { Text, XStack } from 'tamagui';

interface TabItem {
  id: string;
  label: string;
}

export function TabSelector({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <XStack borderBottomWidth={1} borderBottomColor="$gray5">
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <XStack
            key={tab.id}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderBottomWidth={2}
            borderBottomColor={isActive ? '$blue10' : 'transparent'}
            cursor="pointer"
            onPress={() => onTabChange(tab.id)}
          >
            <Text
              fontSize={13}
              fontWeight={isActive ? '700' : '400'}
              color={isActive ? '$blue10' : '$gray10'}
            >
              {tab.label}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
