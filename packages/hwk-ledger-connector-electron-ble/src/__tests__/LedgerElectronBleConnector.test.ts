import { LedgerConnectorBase } from '@onekeyfe/hwk-ledger-adapter';
import { createLedgerElectronBleConnector, LedgerElectronBleTransport } from '../index';

jest.mock('@onekeyfe/hwk-ledger-adapter', () => ({
  LedgerConnectorBase: jest.fn(),
}));

describe('Ledger Electron BLE package entry', () => {
  it('creates a BLE connector with the host-provided bridge', async () => {
    const bridge = {} as Parameters<typeof createLedgerElectronBleConnector>[0];
    createLedgerElectronBleConnector(bridge);
    const constructor = jest.mocked(LedgerConnectorBase);
    expect(constructor).toHaveBeenCalledWith(expect.any(Function), { connectionType: 'ble' });
    const [loadTransport] = constructor.mock.calls[0];
    expect(await loadTransport()).toEqual(expect.any(Function));
    expect(LedgerElectronBleTransport).toEqual(expect.any(Function));
  });
});
