import { useState } from 'react';
import { TextArea } from 'tamagui';

export type AutoExpandingTextAreaProps = React.ComponentProps<typeof TextArea>;

const AutoExpandingTextArea = (props: AutoExpandingTextAreaProps) => {
  const [height, setHeight] = useState(10); // 初始高度

  const handleContentSizeChange = event => {
    setHeight(event.nativeEvent.contentSize.height); // 根据内容大小调整高度
  };

  return (
    <TextArea
      multiline
      {...props}
      scrollEnabled={false}
      minHeight={height}
      lineHeight={15}
      onContentSizeChange={handleContentSizeChange}
    />
  );
};

export default AutoExpandingTextArea;
