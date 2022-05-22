import { Transport } from '@onekeyfe/hd-transport';
import HttpBridge from '@onekeyfe/hd-transport-http';
import DataManager from './DataManager';
import { getBridgeInfo } from './transportInfo';

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

    this.configure();
  }

  static async configure() {
    try {
      console.log('Initializing transports');
      await this.transport.init(true);
      console.log('Configuring transports');
      await this.transport.configure(JSON.stringify(this.defaultMessages));
      console.log('Configuring transports done');
      await this.transport.init();
    } catch (error) {
      console.log('Initializing transports error: ', error);
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
