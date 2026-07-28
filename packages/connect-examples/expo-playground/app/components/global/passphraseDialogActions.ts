export type PassphraseDialogAction = 'host-passphrase' | 'device-passphrase' | 'attach-pin';

export function getPassphraseDialogActions(existsAttachPinUser: boolean): PassphraseDialogAction[] {
  return [
    'host-passphrase',
    'device-passphrase',
    ...(existsAttachPinUser ? (['attach-pin'] as const) : []),
  ];
}
