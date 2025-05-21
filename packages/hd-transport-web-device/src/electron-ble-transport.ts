import transport from '@onekeyfe/hd-transport'; // COMMON_HEADER_SIZE, // LogBlockCommand, // AcquireInput,
import {
  ERRORS,
  HardwareErrorCode,
  // createDeferred,
  Deferred,
  // isOnekeyDevice,
  // isHeaderChunk,
  ONEKEY_SERVICE_UUID,
  ONEKEY_WRITE_CHARACTERISTIC_UUID,
  ONEKEY_NOTIFY_CHARACTERISTIC_UUID,
} from '@onekeyfe/hd-shared';
// import ByteBuffer from 'bytebuffer';
import type EventEmitter from 'events';

const { parseConfigure } = transport;

// Add type declaration for desktopApi
declare global {
  interface Window {
    desktopApi?: {
      onBleSelect: (callback: (devices: Array<{ id: string; name: string }>) => void) => () => void;
      stopBleScan: () => void;
      selectBleDevice: (deviceId: string) => void;
      preSelectDevice?: (uuid: string) => void;
      clearPreSelect?: () => void;
    };
  }
}

interface BleTransport {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  service: BluetoothRemoteGATTService;
  writeCharacteristic: BluetoothRemoteGATTCharacteristic;
  notifyCharacteristic: BluetoothRemoteGATTCharacteristic;
  notifySubscription: null | ((event: Event) => void);
}

export type BleAcquireInput = {
  uuid: string;
  forceCleanRunPromise?: boolean;
};

export default class ElectronBleTransport {
  _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  name = 'ElectronBleTransport';

  configured = false;

  runPromise: Deferred<any> | null = null;

  Log?: any;

  emitter?: EventEmitter;

  // 缓存已发现的设备和传输对象
  private deviceList: Array<{ id: string; name: string; device: BluetoothDevice }> = [];

  private transportCache: Record<string, BleTransport> = {};

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
      // 检查 window.desktopApi
      console.log('[Transport] Checking desktopApi:', window.desktopApi);
      if (!window.desktopApi?.onBleSelect) {
        console.error('[Transport] desktopApi.onBleSelect not available');
        throw new Error('desktopApi.onBleSelect not available');
      }

      // 清除之前的预选状态
      window.desktopApi?.clearPreSelect?.();

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
          // Stop BLE scanning through desktopApi
          window.desktopApi?.stopBleScan();
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

        // 触发设备搜索
        navigator.bluetooth
          .requestDevice({
            filters: [{ services: [ONEKEY_SERVICE_UUID] }],
            optionalServices: [ONEKEY_SERVICE_UUID],
          })
          .catch(error => {
            // 忽略用户取消的错误
            console.log('[Transport] RequestDevice error (expected):', error);
          });
      });
    } catch (error) {
      // Make sure to stop scanning even if there's an error
      window.desktopApi?.stopBleScan();
      console.error('[Transport] Error in enumerate:', error);
      throw error;
    }
  }

  // 添加设备断开连接的监听器
  private addDisconnectListener(device: BluetoothDevice) {
    device.addEventListener('gattserverdisconnected', () => {
      console.log('[Transport] Device disconnected:', device.id);
      // 清理缓存
      delete this.transportCache[device.id];
      // 触发断开连接事件
      this.emitter?.emit('device-disconnect', {
        name: device.name,
        id: device.id,
        connectId: device.id,
      });
    });
  }

  // 监听特征值变化
  private _monitorCharacteristic(
    characteristic: BluetoothRemoteGATTCharacteristic,
    deviceId: string
  ) {
    const subscription = (event: Event) => {
      const { value } = event.target as BluetoothRemoteGATTCharacteristic;
      if (!value) return;

      console.log('[Transport] Received notification from device:', deviceId, value);
      // 触发数据接收事件
      this.emitter?.emit('device-data-receive', {
        id: deviceId,
        data: value,
      });
    };

    characteristic.addEventListener('characteristicvaluechanged', subscription);
    return subscription;
  }

  // 查找已缓存的设备
  private findDevice(id: string) {
    return this.deviceList.find(d => d.id === id);
  }

  async acquire(input: BleAcquireInput) {
    const { uuid, forceCleanRunPromise } = input;

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    console.log('[Transport] Acquiring device:', uuid);

    // 如果传输未释放，先释放
    if (this.transportCache[uuid]) {
      console.log('[Transport] Transport not released, will release:', uuid);
      await this.release(uuid);
    }

    // 强制清理运行中的 Promise
    if (forceCleanRunPromise && this.runPromise) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise));
      console.log('[Transport] Force clean Bluetooth run promise:', forceCleanRunPromise);
    }

    try {
      // 1. 查找设备或触发设备选择流程
      let deviceInfo = this.findDevice(uuid);

      if (!deviceInfo) {
        console.log('[Transport] Device not found in cache, requesting user to select device');

        // 检查 window.desktopApi
        if (!window.desktopApi?.onBleSelect) {
          throw new Error('desktopApi.onBleSelect not available');
        }

        deviceInfo = await new Promise((resolve, reject) => {
          let device: BluetoothDevice | null = null;

          // 先预选设备
          window.desktopApi?.preSelectDevice?.(uuid);

          // 监听设备选择事件
          const cleanup = window.desktopApi?.onBleSelect(devices => {
            console.log('[Transport] Received devices in acquire:', devices);

            // 查找指定 uuid 的设备
            const targetDevice = devices.find(d => d.id === uuid);
            if (targetDevice) {
              console.log('[Transport] Found target device:', targetDevice);

              // 如果已经获取到了 device，直接返回
              if (device) {
                cleanup?.();
                clearTimeout(timeoutId);
                resolve({
                  id: targetDevice.id,
                  name: targetDevice.name,
                  device,
                });
              }
            }
          });

          // 请求设备连接
          navigator.bluetooth
            .requestDevice({
              filters: [{ services: [ONEKEY_SERVICE_UUID] }],
              optionalServices: [ONEKEY_SERVICE_UUID],
            })
            .then(selectedDevice => {
              device = selectedDevice;
              // 如果已经找到了目标设备，可以立即解析
              const targetDevice = this.findDevice(uuid);
              if (targetDevice) {
                cleanup?.();
                clearTimeout(timeoutId);
                resolve({
                  id: targetDevice.id,
                  name: targetDevice.name,
                  device,
                });
              }
            })
            .catch(error => {
              console.error('[Transport] RequestDevice error:', error);
              cleanup?.();
              clearTimeout(timeoutId);
              window.desktopApi?.clearPreSelect?.();
              reject(error);
            });

          // 设置超时
          const timeoutId = setTimeout(() => {
            console.log('[Transport] Acquire timeout');
            cleanup?.();
            window.desktopApi?.stopBleScan();
            window.desktopApi?.clearPreSelect?.();
            reject(new Error('Acquire device timeout'));
          }, 5000);
        });

        if (!deviceInfo) {
          throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
        }

        // 清理预选状态
        window.desktopApi?.clearPreSelect?.();
      }

      const { device } = deviceInfo;

      // 2. 为设备添加断开连接的监听器
      this.addDisconnectListener(device);

      // 3. 连接到设备
      let server;
      try {
        server = await device.gatt?.connect();
      } catch (e: any) {
        console.log('[Transport] Connect to device error:', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleConnectedError, e.message || e);
      }

      if (!server) {
        throw ERRORS.TypedError(HardwareErrorCode.BleConnectedError, 'Unable to connect to device');
      }

      // 4. 获取服务
      let service;
      try {
        service = await server.getPrimaryService(ONEKEY_SERVICE_UUID);
      } catch (e: any) {
        console.log('[Transport] Get service error:', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleServiceNotFound);
      }

      // 5. 获取特征值
      let writeCharacteristic;
      let notifyCharacteristic;
      try {
        writeCharacteristic = await service.getCharacteristic(ONEKEY_WRITE_CHARACTERISTIC_UUID);
        notifyCharacteristic = await service.getCharacteristic(ONEKEY_NOTIFY_CHARACTERISTIC_UUID);
      } catch (e: any) {
        console.log('[Transport] Get characteristic error:', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotFound);
      }

      // 6. 检查特征值是否支持写入和通知
      if (
        !writeCharacteristic.properties.write &&
        !writeCharacteristic.properties.writeWithoutResponse
      ) {
        throw ERRORS.TypedError('BLECharacteristicNotWritable: write characteristic not writable');
      }

      if (!notifyCharacteristic.properties.notify) {
        throw ERRORS.TypedError(
          'BLECharacteristicNotNotifiable: notify characteristic not notifiable'
        );
      }

      // 7. 创建传输对象
      const transport: BleTransport = {
        device,
        server: null as any,
        service: null as any,
        writeCharacteristic: null as any,
        notifyCharacteristic: null as any,
        notifySubscription: null,
      };

      // 8. 启动通知
      try {
        await notifyCharacteristic.startNotifications();
        transport.notifySubscription = this._monitorCharacteristic(notifyCharacteristic, uuid);
      } catch (e: any) {
        console.log('[Transport] Start notifications error:', e);
        throw ERRORS.TypedError(HardwareErrorCode.BleCharacteristicNotifyError);
      }

      // 9. 缓存传输对象和设备信息
      this.transportCache[uuid] = transport;
      if (!this.findDevice(uuid)) {
        this.deviceList.push(deviceInfo);
      }

      // 10. 触发设备连接事件
      this.emitter?.emit('device-connect', {
        name: device.name,
        id: device.id,
        connectId: device.id,
      });

      return { uuid, path: uuid };
    } catch (error) {
      console.error('[Transport] Error acquiring device:', error);
      // 确保停止扫描
      window.desktopApi?.stopBleScan();
      throw error;
    }
  }

  async release(id: string) {
    const transport = this.transportCache[id];
    if (!transport) return;

    const { device, server, notifyCharacteristic, notifySubscription } = transport;

    try {
      // 停止通知
      if (notifyCharacteristic && notifySubscription) {
        notifyCharacteristic.removeEventListener('characteristicvaluechanged', notifySubscription);
        await notifyCharacteristic.stopNotifications();
      }

      // 断开连接
      if (server?.connected) {
        server.disconnect();
      }

      // 清理缓存
      delete this.transportCache[id];

      console.log('[Transport] Device released:', id);
    } catch (error) {
      console.error('[Transport] Error releasing device:', error);
      throw error;
    }
  }
}
