import { TransportError } from './errors';

export class TransportRecovery {
  private manager: any;

  constructor(manager: any) {
    this.manager = manager;
  }

  async recover(error: TransportError): Promise<void> {
    if (!error.recoverable) {
      throw error;
    }

    // Try switching to the other transport
    const newTransport = error.transport === 'usb' ? 'ble' : 'usb';
    await this.manager.switchTransport(error.deviceId, newTransport);
  }
}
