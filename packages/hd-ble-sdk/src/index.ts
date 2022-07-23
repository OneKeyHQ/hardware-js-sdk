import EventEmitter from 'events';
import HardwareSdk, {
  ConnectSettings,
  enableLog,
  parseConnectSettings,
  initCore,
  Core,
  createErrorMessage,
  createUiMessage,
  CORE_EVENT,
  CoreMessage,
  IFRAME,
  UI_EVENT,
  UiResponseEvent,
  UI_REQUEST,
} from '@onekeyfe/hd-core';
import {
  ERRORS,
  createDeferred,
  Deferred,
  HardwareErrorCode,
  getLogger,
  LoggerNames,
  setOutsideLogger,
} from '@onekeyfe/hd-shared';
import ReactNativeTransport from '@onekeyfe/hd-transport-react-native';

const eventEmitter = new EventEmitter();
const Log = getLogger(LoggerNames.HdBleSdk);

let _core: Core | undefined;
let _settings = parseConnectSettings();

let _messageID = 0;
export const messagePromises: { [key: number]: Deferred<any> } = {};

const dispose = () => {
  eventEmitter.removeAllListeners();
  _settings = parseConnectSettings();
};

const uiResponse = (response: UiResponseEvent) => {
  if (!_core) {
    throw ERRORS.TypedError(HardwareErrorCode.NotInitialized);
  }
  const { type, payload } = response;
  _core.handleMessage({ event: UI_EVENT, type, payload });
};

const cancel = (connectId?: string) => {
  if (_core === undefined) return;
  _core.handleMessage({ event: IFRAME.CANCEL, type: IFRAME.CANCEL, payload: { connectId } });
};

function handleMessage(message: CoreMessage) {
  const { event } = message;
  if (!_core) {
    return;
  }
  Log.debug('hd-ble-sdk handleMessage', message);

  switch (event) {
    case UI_EVENT:
      // pass UI event up
      eventEmitter.emit(message.event, message);
      eventEmitter.emit(message.type, message.payload);
      break;
    default:
      Log.log('No need to be captured message', message.event);
  }
}

async function postMessage(message: CoreMessage, usePromise = true) {
  if (!_core) {
    throw ERRORS.TypedError('postMessage: _core not found');
  }

  if (usePromise) {
    _messageID++;
    messagePromises[_messageID] = createDeferred();
    // const { promise } = messagePromises[_messageID];
    const response = await _core.handleMessage({ ...message, id: `${_messageID}` });
    // return promise;
    return response;
  }

  _core.handleMessage(message);
}

const init = async (settings: Partial<ConnectSettings>) => {
  _settings = { ..._settings, ...settings, env: 'react-native' };

  enableLog(!!settings.debug);

  if (_settings.logger) {
    setOutsideLogger(_settings.logger);
  }

  Log.debug('init');

  try {
    _core = await initCore(_settings, ReactNativeTransport);
    _core?.on(CORE_EVENT, handleMessage);

    return true;
  } catch (error) {
    Log.error(createErrorMessage(error));

    return false;
  }
};

const call = async (params: any) => {
  Log.debug('call: ', params);

  try {
    const response = await postMessage({ event: IFRAME.CALL, type: IFRAME.CALL, payload: params });
    if (response) {
      Log.debug('response: ', response);

      if (!response.success) {
        if (response.payload?.code === HardwareErrorCode.BlePermissionError) {
          /**
           * Send message notification when there is no Bluetooth access permission
           */
          postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_PERMISSION), false);
        }

        if (response.payload?.code === HardwareErrorCode.BleLocationError) {
          postMessage(createUiMessage(UI_REQUEST.LOCATION_PERMISSION), false);
        }
      }

      return response;
    }

    return createErrorMessage(ERRORS.TypedError(HardwareErrorCode.CallMethodNotResponse));
  } catch (error) {
    Log.error('__call error: ', error);
    return createErrorMessage(error);
  }
};

const HardwareBleSdk = HardwareSdk({
  eventEmitter,
  init,
  call,
  cancel,
  dispose,
  uiResponse,
});

export default HardwareBleSdk;
