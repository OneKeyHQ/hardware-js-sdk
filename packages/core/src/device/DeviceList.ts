import EventEmitter from 'events';
import { Transport } from '@onekeyfe/hd-transport';
import HttpBridge from '@onekeyfe/hd-transport-http';
import DataManager from '../data-manager/DataManager';
import { getBridgeInfo } from '../data-manager/transportInfo';
// import { Transport } from '@onekeyfe/hd-transport';

export class DeviceList extends EventEmitter {
  // transport: Transport;
  // devices: { [path: string]: Device } = {};

  constructor() {
    super();
    const transports: Transport[] = [];
    const bridgeLatestVersion = getBridgeInfo().version.join('.');
    const bridge = new HttpBridge();
    bridge.setBridgeLatestVersion(bridgeLatestVersion);
    transports.push(bridge as any);
    // this.transport = new Fallback(transports);
    // this.defaultMessages = DataManager.getProtobufMessages();
    // this.currentMessages = this.defaultMessages;

    // TODO: inject transport
  }
}
