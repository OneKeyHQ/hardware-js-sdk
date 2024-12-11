import { ListItem } from 'tamagui';

export interface MenuItem {
  route: string;
  labelId: string;
}

export const MenuListItem = ({
  item,
  onPress,
}: {
  item: MenuItem;
  onPress: (route: string) => void;
}) => (
  <ListItem
    title={item.labelId}
    onPress={() => onPress(item.route)}
    fontWeight="bold"
    textAlign="center"
    size="$5"
    color="black"
  />
);
