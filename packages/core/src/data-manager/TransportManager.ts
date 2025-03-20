import { LowlevelTransportSharedPlugin, Transport } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import DataManager, { MessageVersion } from './DataManager';
import { getLogger, LoggerNames } from '../utils';
// eslint-disable-next-line import/no-cycle
import { DevicePool } from '../device/DevicePool';
import { getSupportMessageVersion } from '../utils/deviceFeaturesUtils';
import { Features } from '../types';

const Log = getLogger(LoggerNames.Transport);
const BleLogger = getLogger(LoggerNames.HdBleTransport);
const HttpLogger = getLogger(LoggerNames.HdTransportHttp);
const LowLevelLogger = getLogger(LoggerNames.HdTransportLowLevel);

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
      Log.debug('Initializing transports');
      if (env === 'react-native') {
        if (!this.reactNativeInit) {
          await this.transport.init(BleLogger, DevicePool.emitter);
          this.reactNativeInit = true;
        } else {
          Log.debug('React Native Do Not Initializing transports');
        }
      } else if (env === 'lowlevel') {
        if (!this.plugin) {
          throw ERRORS.TypedError(
            HardwareErrorCode.TransportNotConfigured,
            'Lowlevel transport mast have plugin'
          );
        }
        await this.transport.init(LowLevelLogger, DevicePool.emitter, this.plugin);
      } else {
        await this.transport.init(HttpLogger);
      }
      Log.debug('Configuring transports');
      await this.transport.configure(JSON.stringify(this.defaultMessages));
      Log.debug('Configuring transports done');
    } catch (error) {
      Log.debug('Initializing transports error: ', error);
      if (error.code === 'ECONNABORTED') {
        throw ERRORS.TypedError(HardwareErrorCode.BridgeTimeoutError);
      }
    }
  }

  static async reconfigure(features?: Features | undefined) {
    Log.debug(`Begin reconfiguring transports`);
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
