import EventEmitter from 'events';
import TransportManager from '../data-manager/TransportManager';
import DeviceConnector from './DeviceConnector';

export class DeviceList extends EventEmitter {
  connector: DeviceConnector;

  constructor() {
    super();
    TransportManager.load();
    this.connector = new DeviceConnector();
  }

  // eslint-disable-next-line class-methods-use-this
  async init() {
    const transport = TransportManager.getTransport();
    const defaultMessages = TransportManager.getDefaultMessages();
    try {
      console.log('Initializing transports');
      await transport.init(true);
      console.log('Configuring transports');
      await transport.configure(JSON.stringify(defaultMessages));
      console.log('Configuring transports done');
      await transport.init();
    } catch (error) {
      console.log('Initializing transports error: ', error);
    }
  }

  async getDeviceLists() {
    const deviceDiff = await this.connector.enumerate();
    console.log(deviceDiff);
    if (deviceDiff.connected.length > 0) {
      // await this.connector.
      await this.connector.listen();
    }
    return deviceDiff.connected;
  }
}
