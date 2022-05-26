import { Transport } from '@onekeyfe/hd-transport';
import HttpBridge from '@onekeyfe/hd-transport-http';
import { ERRORS } from '../constants';
import { initLog } from '../utils';
import DataManager from './DataManager';
import { getBridgeInfo } from './transportInfo';

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

  static load() {
    const bridgeLatestVersion = getBridgeInfo().version.join('.');
    this.transport = new HttpBridge() as any;
    this.transport.setBridgeLatestVersion(bridgeLatestVersion);
    this.defaultMessages = DataManager.getProtobufMessages();
    this.currentMessages = this.defaultMessages;
  }

  static async configure() {
    try {
      Log.debug('Initializing transports');
      await this.transport.init(true);
      Log.debug('Configuring transports');
      await this.transport.configure(JSON.stringify(this.defaultMessages));
      Log.debug('Configuring transports done');
    } catch (error) {
      Log.debug('Initializing transports error: ', error);
    }
  }

  static async reconfigure(messages: JSON | number[]) {
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
