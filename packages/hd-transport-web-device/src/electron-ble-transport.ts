import transport from '@onekeyfe/hd-transport'; // COMMON_HEADER_SIZE, // LogBlockCommand, // AcquireInput,
import {
  ERRORS,
  HardwareErrorCode,
  // createDeferred,
  Deferred,
  // isOnekeyDevice,
  // isHeaderChunk,
  ONEKEY_SERVICE_UUID,
} from '@onekeyfe/hd-shared';
// import ByteBuffer from 'bytebuffer';
import type EventEmitter from 'events';

const { parseConfigure } = transport;

// Add type declaration for desktopApi
declare global {
  interface Window {
    desktopApi?: {
      onBleSelect: (callback: (devices: Array<{ id: string; name: string }>) => void) => () => void;
    };
  }
}

export default class ElectronBleTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  name = 'ElectronBleTransport';

  configured = false;

  runPromise: Deferred<any> | null = null;

  Log?: any;

  emitter?: EventEmitter;

  init(logger: any, emitter?: EventEmitter) {
    this.Log = logger;
    this.emitter = emitter;

    if (!navigator.bluetooth) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Web Bluetooth is not supported by current browser'
      );
    }
  }

  configure(signedData: any) {
    const messages = parseConfigure(signedData);
    this.configured = true;
    this._messages = messages;
  }

  listen() {}

  async enumerate(): Promise<{ id: string; name: string }[]> {
    console.log('[Transport] Starting enumerate');

    try {
      console.log('[Transport] Calling requestDevice');
      // 触发蓝牙设备搜索
      navigator.bluetooth
        .requestDevice({
          filters: [
            { services: [ONEKEY_SERVICE_UUID] },
            // { namePrefix: 'BixinKey' },
            // { namePrefix: 'K' },
            // { namePrefix: 'T' },
            // { namePrefix: 'Touch' },
            // { namePrefix: 'Pro' },
          ],
          optionalServices: [ONEKEY_SERVICE_UUID],
        })
        .catch(error => {
          // 忽略用户取消的错误
          console.log('[Transport] RequestDevice error (expected):', error);
        });

      // 检查 window.desktopApi
      console.log('[Transport] Checking desktopApi:', window.desktopApi);
      if (!window.desktopApi?.onBleSelect) {
        console.error('[Transport] desktopApi.onBleSelect not available');
        throw new Error('desktopApi.onBleSelect not available');
      }

      // 使用 Set 去重，存储搜索到的设备
      const deviceSet = new Set<string>();
      const devices: Array<{ id: string; name: string }> = [];

      return await new Promise((resolve, reject) => {
        console.log('[Transport] Setting up device scanning with 3s timeout');

        // 清理函数
        const cleanupAll = () => {
          console.log('[Transport] Cleaning up resources');
          clearTimeout(timeoutId);
          cleanup?.();
        };

        // 设置 3 秒超时
        const timeoutId = setTimeout(() => {
          console.log('[Transport] Scan timeout, returning devices:', devices);
          cleanupAll();
          resolve(devices);
        }, 3000);

        // 监听设备发现事件
        const cleanup = window.desktopApi?.onBleSelect(newDevices => {
          console.log('[Transport] Received new devices:', newDevices);

          // 将新设备添加到列表中（去重）
          newDevices.forEach(device => {
            const deviceKey = `${device.id}-${device.name}`;
            if (!deviceSet.has(deviceKey)) {
              deviceSet.add(deviceKey);
              devices.push(device);
              console.log('[Transport] Added new device:', device);
            }
          });
        });
      });
    } catch (error) {
      console.error('[Transport] Error in enumerate:', error);
      throw error;
    }
  }
}
