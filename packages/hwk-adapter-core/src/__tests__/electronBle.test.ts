import { rehydrateElectronBleErrors } from '../types/electronBle';
import { HardwareErrorCode } from '../types/errors';

const serialized = {
  message: 'The device removed its Bluetooth pairing with this computer',
  code: HardwareErrorCode.BleBondInvalid,
  params: { phase: 'subscribe', nativeErrorDomain: 'CBErrorDomain', nativeErrorCode: 14 },
};

describe('rehydrateElectronBleErrors', () => {
  it('restores serialized rejections from a frozen bridge as the errors the host threw', async () => {
    // contextBridge may hand the renderer a frozen object.
    const bridge = Object.freeze({
      subscribe: jest.fn<Promise<void>, [string]>().mockRejectedValue(serialized),
    });
    const error: unknown = await rehydrateElectronBleErrors(bridge)
      .subscribe('ledger')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message: serialized.message,
      code: HardwareErrorCode.BleBondInvalid,
      params: serialized.params,
    });
  });

  it('restores a rejection without one of our codes as a plain Error', async () => {
    const bridge = {
      connect: jest
        .fn<Promise<void>, []>()
        .mockRejectedValue({ message: 'host failure', code: -99999 }),
    };
    const error: unknown = await rehydrateElectronBleErrors(bridge)
      .connect()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).toEqual(new Error('host failure'));
    expect(error).not.toHaveProperty('code');
  });

  it('passes Errors, resolved values and synchronous methods through', async () => {
    const original = new Error("Error invoking remote method 'x': Error: status: 3");
    const unsubscribe = () => undefined;
    const bridge = {
      label: 'bridge',
      write: jest.fn(async () => {
        throw original;
      }),
      getDevice: jest.fn(async function getDevice(this: { label: string }, id: string) {
        return { id, from: this.label };
      }),
      onNotification: jest.fn(() => unsubscribe),
    };
    const wrapped = rehydrateElectronBleErrors(bridge);
    await expect(wrapped.write()).rejects.toBe(original);
    await expect(wrapped.getDevice('ledger')).resolves.toEqual({ id: 'ledger', from: 'bridge' });
    expect(wrapped.onNotification()).toBe(unsubscribe);
    expect(wrapped.label).toBe('bridge');
  });

  it('calls the method the bridge holds at call time', async () => {
    const bridge = { connect: jest.fn(async () => 'first') };
    const wrapped = rehydrateElectronBleErrors(bridge);
    bridge.connect = jest.fn(async () => 'second');
    await expect(wrapped.connect()).resolves.toBe('second');
  });
});
