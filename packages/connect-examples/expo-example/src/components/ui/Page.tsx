import { ScrollView, View } from 'tamagui';
import HeaderView from './Header';

export interface PageViewProps {
  children?: React.ReactNode;
  scrollable?: boolean;
}

const PageView = ({ children, scrollable = true }: PageViewProps) => (
  <View flex={1} backgroundColor="bgApp">
    <HeaderView />
    {scrollable ? (
      <ScrollView flex={1} testID="page-view-scrollable" overflow="scroll">
        {children}
      </ScrollView>
    ) : (
      <View testID="page-view-non-scrollable">{children}</View>
    )}
  </View>
);

export default PageView;
