import { ScrollView, View } from 'tamagui';
import HeaderView from './Header';

export interface PageViewProps {
  children?: React.ReactNode;
  scrollable?: boolean;
}

const PageView = ({ children, scrollable = true }: PageViewProps) => (
  <View flex={1} backgroundColor="bgApp">
    <HeaderView />
    {scrollable ? <ScrollView flex={1}>{children}</ScrollView> : <View>{children}</View>}
  </View>
);

export default PageView;
