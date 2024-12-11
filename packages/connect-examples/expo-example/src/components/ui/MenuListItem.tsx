import { useIntl } from 'react-intl';
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
}) => {
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
