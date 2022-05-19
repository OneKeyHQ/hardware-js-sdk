import EventEmitter from 'events';
import TransportManager from '../data-manager/TransportManager';

export class DeviceList extends EventEmitter {
  constructor() {
    super();
    TransportManager.load();
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
      console.log(error);
    }
  }
}
