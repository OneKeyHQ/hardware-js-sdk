import { createDeferred, Deferred } from '@onekeyfe/hd-shared';
import { ISendMessage } from '../types';
import { store } from './store';
import { setMethodState } from './store/reducers/runtime';
import { serviceHardware } from './hardware';
import { createResponseMessage } from '../event';

const getDevice = () => store.getState().runtime.device;

// eslint-disable-next-line import/no-mutable-exports
let devicePromise: Deferred<void> | null = null;

async function invokeResponse(message: ISendMessage, response: any) {
  return new Promise(async (resolve) => {
    const responseMessage = createResponseMessage(
      message.id ?? 0,
      response.success,
      response.payload
    );
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const result = await window.hardwareSDK.ipcRenderer.invoke('hardware-sdk', responseMessage);
    resolve(result);
    setTimeout(() => store.dispatch(setMethodState('empty')), 1500);
  });
}

function addIpcListener() {
  const subscription = window.hardwareSDK.ipcRenderer.on(
    'hardware-sdk',
    async (message: ISendMessage) => {
      if (message.messageType !== 'Send') {
        return;
      }

      console.log('ipcrenderer received message');

      // get runtime device
      let device = getDevice();
      store.dispatch(setMethodState('processing'));
      if (!device) {
        console.log('need get device');
        devicePromise = createDeferred();
        try {
          await devicePromise?.promise;
        } catch (e) {
          // TODO: search device error
        }
        device = getDevice();
      }

      if (!device?.connectId) {
        store.dispatch(setMethodState('failed'));
        return;
      }

      console.log('call Method $$$$$$44========>>>');

      let response;
      // call method
      const HardwareSDK = await serviceHardware.getSDKInstance();
      switch (message.payload.method) {
        case 'getFeatures': {
          console.log('getFeatures call ======> ');
          response = await HardwareSDK.getFeatures(device.connectId);
          break;
        }
        case 'evmGetAddress': {
          response = await HardwareSDK.evmGetAddress(device.connectId, device?.deviceId ?? '', {
            ...message.payload.params,
          });
          break;
        }

        default: {
          response = createResponseMessage(message.id ?? 0, false, {
            error: 'not found method',
          });
        }
      }
      store.dispatch(setMethodState(response.success ? 'success' : 'failed'));
      await invokeResponse(message, response);
    }
  );

  return subscription;
}

export { devicePromise, addIpcListener };
