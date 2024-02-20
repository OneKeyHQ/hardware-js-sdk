import { ScrollView, View } from 'tamagui';
import HeaderView from './Header';

export interface PageViewProps {
  children?: React.ReactNode;
}

const PageView = ({ children }: PageViewProps) => (
  <View flex={1} backgroundColor="bgApp">
    <HeaderView />
    <ScrollView flex={1}>{children}</ScrollView>
  </View>
);

export default PageView;
