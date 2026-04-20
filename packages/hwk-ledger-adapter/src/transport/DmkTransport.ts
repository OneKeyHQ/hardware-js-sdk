import Transport from '@ledgerhq/hw-transport';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';

/**
 * Transport adapter that bridges Ledger's legacy hw-app-* SDKs to DMK's sendApdu.
 *
 * Legacy SDKs (hw-app-trx, hw-app-xrp, etc.) require a Transport instance.
 * This adapter wraps DMK's session-based sendApdu so legacy SDKs can run
 * over DMK's transport layer without a separate USB/HID connection.
 *
 * Usage:
 *   const transport = new DmkTransport(dmk, sessionId);
 *   const trx = new Trx(transport);
 *   const address = await trx.getAddress("44'/195'/0'/0/0");
 */
export class DmkTransport extends Transport {
  private _dmk: DeviceManagementKit;
  private _sessionId: string;

  constructor(dmk: DeviceManagementKit, sessionId: string) {
    super();
    this._dmk = dmk;
    this._sessionId = sessionId;
  }

  async exchange(apdu: Buffer): Promise<Buffer> {
    const response = await this._dmk.sendApdu({
      sessionId: this._sessionId,
      apdu: new Uint8Array(apdu),
    });

    // Legacy format: data + statusCode (2 bytes) concatenated
    const result = Buffer.alloc(response.data.length + 2);
    if (response.data.length > 0) {
      result.set(response.data, 0);
    }
    result.set(response.statusCode, response.data.length);
    return result;
  }

  async close(): Promise<void> {
    // DMK manages session lifecycle
  }
}
