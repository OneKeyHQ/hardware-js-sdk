import { EConnectorInteraction } from '@onekeyfe/hwk-adapter-core';

/**
 * Strip the "m/" prefix from BIP-44 derivation paths.
 * Ledger DMK requires paths without the "m/" prefix.
 */
export function normalizePath(path: string): string {
  return path.startsWith('m/') ? path.slice(2) : path;
}

/**
 * Collapse Ledger DMK's raw `requiredUserInteraction` strings into the
 * 4-value EConnectorInteraction union exported by this SDK.
 *
 * DMK emits chain-signer-specific strings like "verify-address",
 * "sign-transaction", "sign-typed-data", "sign-personal-message" — they
 * all mean "the user must act on the device screen", i.e. ConfirmOnDevice
 * per the public ConnectorUiEvent type contract. Leaking raw DMK strings
 * out of the SDK would break consumers that switch on EConnectorInteraction.
 */
export function collapseSignerInteraction(
  interaction: string,
): EConnectorInteraction {
  switch (interaction) {
    case 'confirm-open-app':
      return EConnectorInteraction.ConfirmOpenApp;
    case 'unlock-device':
      return EConnectorInteraction.UnlockDevice;
    case 'interaction-complete':
      return EConnectorInteraction.InteractionComplete;
    default:
      return EConnectorInteraction.ConfirmOnDevice;
  }
}
