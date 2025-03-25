import { isNaN } from 'lodash';
import { useEffect, useRef, useCallback } from 'react';
import { TextArea } from 'tamagui';

export type AutoExpandingTextAreaProps = React.ComponentProps<typeof TextArea>;

const AutoWrapperTextArea = ({ value, ...props }: AutoExpandingTextAreaProps) => {
  const textAreaRef = useRef<any>(null);

  // 使用useCallback优化调整高度的函数
  const adjustHeight = useCallback(() => {
    if (!textAreaRef.current) return;

    const scrollHeight = textAreaRef.current.scrollHeight || 0;
    if (scrollHeight > 0) {
      const currentHeight = parseInt(textAreaRef.current.style.height);
      // 只有当高度需要变化时才更新DOM
      if (isNaN(currentHeight) || scrollHeight !== currentHeight) {
        textAreaRef.current.style.height = 'inherit';
        textAreaRef.current.style.height = `${scrollHeight}px`;
      }
    }
  }, []);

  useEffect(() => {
    // 添加一个小延迟，避免频繁调整造成的性能问题
    const timeoutId = setTimeout(adjustHeight, 0);
    return () => clearTimeout(timeoutId);
  }, [value, adjustHeight]);

  return (
    <TextArea ref={textAreaRef} multiline value={value} fontSize={13} lineHeight={15} {...props} />
  );
};

export default AutoWrapperTextArea;
