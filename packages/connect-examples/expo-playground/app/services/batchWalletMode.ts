export const BatchWalletMode = {
  Standard: 'standard',
  SelectHidden: 'select-hidden',
  ResumeHidden: 'resume-hidden',
} as const;

export type BatchWalletModeValue = (typeof BatchWalletMode)[keyof typeof BatchWalletMode];

export type BatchWalletSelection = {
  mode: BatchWalletModeValue;
  passphraseState?: string;
};

export const DEFAULT_BATCH_WALLET_MODE = BatchWalletMode.Standard;

function normalizePassphraseState(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function getBatchWalletSelectionError(selection: BatchWalletSelection): string | null {
  if (
    selection.mode === BatchWalletMode.ResumeHidden &&
    !normalizePassphraseState(selection.passphraseState)
  ) {
    return 'Enter a passphraseState to resume a hidden wallet.';
  }

  return null;
}

export function applyBatchWalletSelection(
  params: Record<string, unknown>,
  selection: BatchWalletSelection
): Record<string, unknown> {
  const nextParams: Record<string, unknown> = {
    ...params,
    useEmptyPassphrase: selection.mode === BatchWalletMode.Standard,
  };
  const passphraseState = normalizePassphraseState(selection.passphraseState);

  if (selection.mode === BatchWalletMode.Standard || !passphraseState) {
    delete nextParams.passphraseState;
  } else {
    nextParams.passphraseState = passphraseState;
  }

  return nextParams;
}

export async function resolveBatchWalletSelection(
  selection: BatchWalletSelection,
  selectHiddenWallet: () => Promise<string>
): Promise<BatchWalletSelection> {
  const validationError = getBatchWalletSelectionError(selection);
  if (validationError) throw new Error(validationError);

  if (selection.mode !== BatchWalletMode.SelectHidden) {
    return {
      ...selection,
      passphraseState: normalizePassphraseState(selection.passphraseState),
    };
  }

  const passphraseState = normalizePassphraseState(await selectHiddenWallet());
  if (!passphraseState) {
    throw new Error('The device did not return a passphraseState for the hidden wallet.');
  }

  return {
    mode: BatchWalletMode.SelectHidden,
    passphraseState,
  };
}
