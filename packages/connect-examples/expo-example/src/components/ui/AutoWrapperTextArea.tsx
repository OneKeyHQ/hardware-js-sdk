import { get } from 'lodash';
import { useEffect, useRef } from 'react';
import { TextArea } from 'tamagui';

export type AutoExpandingTextAreaProps = React.ComponentProps<typeof TextArea>;

const AutoWrapperTextArea = ({ value, ...props }: AutoExpandingTextAreaProps) => {
  const textAreaRef = useRef(null);

  useEffect(() => {
    const scrollHeight = get(textAreaRef, 'current.scrollHeight', 0);
    if (scrollHeight > 0) {
      // @ts-expect-error
      textAreaRef.current.style.height = 'inherit';
      // @ts-expect-error
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <TextArea ref={textAreaRef} multiline value={value} fontSize={13} lineHeight={15} {...props} />
  );
};

export default AutoWrapperTextArea;
