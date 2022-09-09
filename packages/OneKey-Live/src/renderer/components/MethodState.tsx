import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert } from '@onekeyhq/ui-components';
import { RootState } from '../store';

function MethodState() {
  const methodState = useSelector((state: RootState) => state.runtime.methodState);
  const [content, setContent] = useState('');
  const [type, setType] = useState('info');

  useEffect(() => {
    switch (methodState) {
      case 'empty': {
        setContent('No current task execution');
        setType('info');
        return;
      }
      case 'processing': {
        setContent('Processing');
        setType('info');
        return;
      }
      case 'success': {
        setContent('Success');
        setType('success');
        return;
      }
      case 'failed': {
        setContent('Method execution failed');
        setType('error');
        break;
      }
      default:
        break;
    }
  }, [methodState]);

  return (
    // @ts-expect-error
    <Alert title="Method State" type={type}>
      <p>{content}</p>
    </Alert>
  );
}

export default React.memo(MethodState);
