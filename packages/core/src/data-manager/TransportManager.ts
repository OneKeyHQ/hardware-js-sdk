import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import DataManager from './DataManager';
import { LoggerNames, getLogger } from '../utils';
// eslint-disable-next-line import/no-cycle
import { DevicePool } from '../device/DevicePool';
import { getSupportMessageVersion } from '../utils/deviceFeaturesUtils';

import type { MessageVersion } from './DataManager';
import type { LowlevelTransportSharedPlugin, Transport } from '@onekeyfe/hd-transport';
import type { Features } from '../types';

const Log = getLogger(LoggerNames.Transport);
const BleLogger = getLogger(LoggerNames.HdBleTransport);
const HttpLogger = getLogger(LoggerNames.HdTransportHttp);
const LowLevelLogger = getLogger(LoggerNames.HdTransportLowLevel);
const NodeUsbLogger = getLogger(LoggerNames.HdTransportNodeUsb);
const WebBleLogger = getLogger(LoggerNames.HdWebBleTransport);
const WebUsbLogger = getLogger(LoggerNames.HdTransportWebUsb);

/**
 * transport 在同一个环境中只会存在一个
 * 这里设计成单例获取
 * 方便进行环境判断，读取不同的 transport
 */
export default class TransportManager {
  static transport: Transport;

  static defaultMessages: JSON | Record<string, any>;

  static currentMessages: JSON | Record<string, any>;

  static reactNativeInit = false;

  static messageVersion: MessageVersion = 'latest';

  static plugin: LowlevelTransportSharedPlugin | null = null;

  static load() {
    Log.debug('transport manager load');
    this.defaultMessages = DataManager.getProtobufMessages();
    this.currentMessages = this.defaultMessages;
    this.messageVersion = 'latest';
  }

  static async configure() {
    try {
      const env = DataManager.getSettings('env');
      Log.debug('Initializing transports', env);
      if (env === 'react-native') {
        if (!this.reactNativeInit) {
          await this.transport.init(BleLogger, DevicePool.emitter);
          this.reactNativeInit = true;
        } else {
          Log.debug('React Native Do Not Initializing transports');
        }
      } else if (env === 'node-usb') {
        // NodeUsbTransport handles USB I/O directly — no plugin needed
        await this.transport.init(NodeUsbLogger, DevicePool.emitter);
      } else if (env === 'lowlevel') {
        if (!this.plugin) {
          throw ERRORS.TypedError(
            HardwareErrorCode.TransportNotConfigured,
            'Lowlevel transport must have plugin'
          );
        }
        await this.transport.init(LowLevelLogger, DevicePool.emitter, this.plugin);
      } else if (env === 'desktop-web-ble' || env === 'desktop-web-ble-pro2') {
        await this.transport.init(WebBleLogger, DevicePool.emitter);
      } else if (env === 'webusb' || env === 'desktop-webusb') {
        await this.transport.init(WebUsbLogger);
      } else {
        await this.transport.init(HttpLogger);
      }
      Log.debug('Configuring transports');
      await this.transport.configure(JSON.stringify(this.defaultMessages));
      this.currentMessages = this.defaultMessages;
      this.messageVersion = 'latest';
      await this.configureProtocolV2Messages();
      Log.debug('Configuring transports done');
    } catch (error) {
      Log.debug('Initializing transports error: ', error);
      if (error.code === 'ECONNABORTED') {
        throw ERRORS.TypedError(HardwareErrorCode.BridgeTimeoutError);
      }
    }
  }

  /**
   * Re-load the transport's main protobuf schema based on a device's reported features.
   *
   * This handles message-version compatibility within Protocol V1 (e.g. Touch's classic
   * vs latest schema). It is NOT used to switch between Protocol V1 and Protocol V2 —
   * the transport already holds both schemas after initial configure(), and routes per
   * device by `getProtocolType()`.
   */
  static async reconfigure(features?: Features) {
    if (!features) {
      return;
    }

    const { messageVersion, messages } = getSupportMessageVersion(features);

    if (this.currentMessages === messages || !messages) {
      return;
    }

    Log.debug(`Reconfiguring transports version:${messageVersion}`);

    try {
      await this.transport.configure(JSON.stringify(messages));
      this.currentMessages = messages;
      this.messageVersion = messageVersion;
    } catch (error) {
      throw ERRORS.TypedError(
        HardwareErrorCode.TransportInvalidProtobuf,
        `Transport_InvalidProtobuf:  ${error.message as unknown as string}`
      );
    }
  }

  static setTransport(TransportConstructor: any, plugin?: LowlevelTransportSharedPlugin) {
    const env = DataManager.getSettings('env');
    if (env === 'react-native') {
      /** Actually initializes the ReactNativeTransport */
      this.transport = new TransportConstructor({ scanTimeout: 3000 }) as unknown as Transport;
    } else {
      /** Actually initializes the HttpTransport */
      this.transport = new TransportConstructor() as unknown as Transport;
    }
    if (plugin) {
      this.plugin = plugin;
      Log.debug('set transport plugin: ', this.plugin);
    }
    Log.debug(
      'set transport: ',
      this.transport.name,
      this.transport.version,
      this.transport.configured
    );
  }

  static getTransport() {
    return this.transport;
  }

  private static async configureProtocolV2Messages() {
    const pro2Messages = DataManager.getProtobufMessages('pro2');
    const { configureProtocolV2 } = this.transport;
    if (pro2Messages && typeof configureProtocolV2 === 'function') {
      await configureProtocolV2.call(this.transport, JSON.stringify(pro2Messages));
      Log.debug('Protocol V2 messages configured');
    }
  }

  static getDefaultMessages() {
    return this.defaultMessages;
  }

  static getCurrentMessages() {
    return this.currentMessages;
  }

  static getMessageVersion() {
    return this.messageVersion;
  }
}
