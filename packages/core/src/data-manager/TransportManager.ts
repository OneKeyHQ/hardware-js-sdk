import { Transport } from '@onekeyfe/hd-transport';
import HttpBridge from '@onekeyfe/hd-transport-http';
import ReactNativeTransport from '@onekeyfe/hd-transport-react-native';
import { ERRORS } from '../constants';
import { initLog } from '../utils';
import DataManager from './DataManager';

const Log = initLog('Transport');
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

  static load() {
    const env = DataManager.getSettings('env');
    console.log('transport manager load');
    if (env === 'react-native') {
      this.transport = new ReactNativeTransport({ scanTimeout: 1500 }) as any;
    } else {
      this.transport = new HttpBridge() as any;
    }
    this.defaultMessages = DataManager.getProtobufMessages();
    this.currentMessages = this.defaultMessages;
  }

  static async configure() {
    try {
      const env = DataManager.getSettings('env');
      Log.debug('Initializing transports');
      if (env === 'react-native') {
        if (!this.reactNativeInit) {
          await this.transport.init();
          this.reactNativeInit = true;
        } else {
          Log.debug('React Native Do Not Initializing transports');
        }
      } else {
        await this.transport.init();
      }
      Log.debug('Configuring transports');
      await this.transport.configure(JSON.stringify(this.defaultMessages));
      Log.debug('Configuring transports done');
    } catch (error) {
      Log.debug('Initializing transports error: ', error);
    }
  }

  static async reconfigure(messages?: JSON | number[] | null) {
    if (Array.isArray(messages)) {
      messages = DataManager.getProtobufMessages();
    }
    if (this.currentMessages === messages || !messages) {
      return;
    }
    try {
      await this.transport.configure(JSON.stringify(messages));
      this.currentMessages = messages;
    } catch (error) {
      throw ERRORS.TypedError('Transport_InvalidProtobuf', error.message);
    }
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
}
