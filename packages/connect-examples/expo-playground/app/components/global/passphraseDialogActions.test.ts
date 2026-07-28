import { describe, expect, test } from '@jest/globals';

type ActionModule = {
  getPassphraseDialogActions?: (existsAttachPinUser: boolean) => string[];
};

async function loadActionModule(): Promise<ActionModule> {
  try {
    return (await import('./passphraseDialogActions')) as ActionModule;
  } catch {
    return {};
  }
}

describe('Passphrase dialog wallet selection actions', () => {
  test('offers Attach PIN only when the device reports an existing binding', async () => {
    const { getPassphraseDialogActions } = await loadActionModule();

    expect(getPassphraseDialogActions?.(false)).toEqual(['host-passphrase', 'device-passphrase']);
    expect(getPassphraseDialogActions?.(true)).toEqual([
      'host-passphrase',
      'device-passphrase',
      'attach-pin',
    ]);
  });
});
