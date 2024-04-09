import { ScrollView, View } from 'tamagui';
import Watermark from '@uiw/react-watermark';
import HeaderView from './Header';

export interface PageViewProps {
  children?: React.ReactNode;
  scrollable?: boolean;
}

const PageView = ({ children, scrollable = true }: PageViewProps) => (
  <Watermark
    content="测试使用，需要特殊 Bridge"
    fontColor="rgb(255 0 0 / 15%)"
    gapX={480}
    gapY={480}
    fontSize={28}
  >
    <View flex={1} backgroundColor="bgApp">
      <HeaderView />
      {scrollable ? <ScrollView flex={1}>{children}</ScrollView> : <View>{children}</View>}
    </View>
  </Watermark>
);

export default PageView;
