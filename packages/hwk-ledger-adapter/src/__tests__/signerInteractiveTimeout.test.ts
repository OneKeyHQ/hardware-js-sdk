import { SignerSol } from '../signer/SignerSol';
import { SignerTron } from '../signer/SignerTron';

/** A DeviceAction that waits on the user's confirmation until `complete` is called. */
function confirmingAction() {
  let observer: any;
  const action = {
    observable: {
      subscribe(next: any) {
        observer = next;
        observer.next({
          status: 'pending',
          intermediateValue: { requiredUserInteraction: 'sign-transaction' },
        });
        return { unsubscribe: () => undefined };
      },
    },
    cancel: jest.fn(),
  };
  return {
    action,
    complete: (output: unknown) => observer.next({ status: 'completed', output }),
  };
}

describe('Ledger signers wait for on-device review like EVM and BTC', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['performance'] }));
  afterEach(() => jest.useRealTimers());

  it.each([
    [
      'tron signTransaction',
      (action: unknown) =>
        new SignerTron({ signTransaction: () => action } as any).signTransaction(
          "44'/195'/0'/0/0",
          new Uint8Array([1])
        ),
    ],
    [
      'tron signPersonalMessage',
      (action: unknown) =>
        new SignerTron({ signPersonalMessage: () => action } as any).signPersonalMessage(
          "44'/195'/0'/0/0",
          'hi'
        ),
    ],
    [
      'sol signTransaction',
      (action: unknown) =>
        new SignerSol({ signTransaction: () => action } as any).signTransaction(
          "44'/501'/0'",
          new Uint8Array([1])
        ),
    ],
    [
      'sol signMessage',
      (action: unknown) =>
        new SignerSol({ signMessage: () => action } as any).signMessage("44'/501'/0'", 'hi'),
    ],
  ])('%s still returns after two minutes of review', async (_name, sign) => {
    const { action, complete } = confirmingAction();
    let outcome: unknown;
    const pending = sign(action).then(
      value => {
        outcome = { value };
      },
      error => {
        outcome = { error };
      }
    );

    jest.advanceTimersByTime(120_000);
    await Promise.resolve();
    expect(outcome).toBeUndefined();
    complete(new Uint8Array([7]));
    await pending;
    expect(outcome).toHaveProperty('value');
    expect(action.cancel).not.toHaveBeenCalled();
  });
});
