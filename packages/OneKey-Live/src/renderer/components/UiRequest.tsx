import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Alert } from '@onekeyhq/ui-components';
import { UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { serviceHardware } from 'renderer/hardware';
import type { RootState } from '../store';

let lastParams = '';
let lastCallTime = 0;

function UiRequest() {
  const uiEvent = useSelector((state: RootState) => state.uiResponse.event);
  const prevUiEvent = useRef('');

  useEffect(() => {
    prevUiEvent.current = uiEvent?.uiRequest ?? '';
  }, [uiEvent]);

  if (!uiEvent) {
    return null;
  }

  const currentCallTime = Date.now();
  const currentParams = JSON.stringify({
    uiRequest: uiEvent.uiRequest,
    payload: uiEvent.payload,
  });

  if (currentCallTime - lastCallTime < 1000 && lastParams === currentParams) {
    // ignore frequent calls
    return null;
  }

  lastCallTime = currentCallTime;
  lastParams = currentParams;

  if (
    [UI_REQUEST.REQUEST_PIN, UI_REQUEST.REQUEST_BUTTON].includes(
      prevUiEvent.current as unknown as any
    ) &&
    uiEvent.uiRequest === UI_REQUEST.CLOSE_UI_WINDOW
  ) {
    try {
      const connectId = uiEvent.payload?.deviceConnectId ?? '';
      serviceHardware
        .getSDKInstance()
        .then((instance) => {
          instance.cancel(connectId);
          // if (prevUiEvent.current === UI_REQUEST.REQUEST_PIN) {
          //   instance.getFeatures(connectId);
          // }
          return true;
        })
        .catch(() => {});
    } catch {
      // Empty
    }
    return null;
  }

  let content = '';

  switch (uiEvent.uiRequest) {
    case UI_REQUEST.REQUEST_PIN: {
      content = 'Please enter the pin code on  your device';
      serviceHardware.sendUiResponse({
        type: UI_RESPONSE.RECEIVE_PIN,
        payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
      });
      break;
    }
    case UI_REQUEST.REQUEST_BUTTON: {
      content = 'Please confirm on your device';
      break;
    }
    case UI_REQUEST.CLOSE_UI_WINDOW: {
      content = '';
      break;
    }
    default: {
      content = 'Please confirm on your device';
      break;
    }
  }

  if (!content) return null;

  return (
    // @ts-expect-error
    <Alert title="UI Request" type="success">
      <p>{content}</p>
    </Alert>
  );
}

export default React.memo(UiRequest);
