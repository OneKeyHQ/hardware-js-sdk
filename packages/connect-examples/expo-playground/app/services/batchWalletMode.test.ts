import { describe, expect, jest, test } from '@jest/globals';

import {
  applyBatchWalletSelection,
  BatchWalletMode,
  DEFAULT_BATCH_WALLET_MODE,
  getBatchWalletSelectionError,
  resolveBatchWalletSelection,
} from './batchWalletMode';

describe('批量测试钱包模式', () => {
  test('默认使用标准钱包并移除旧隐藏钱包状态', () => {
    expect(DEFAULT_BATCH_WALLET_MODE).toBe(BatchWalletMode.Standard);
    expect(
      applyBatchWalletSelection(
        {
          path: "m/44'/60'/0'/0/0",
          useEmptyPassphrase: false,
          passphraseState: 'stale-hidden-state',
        },
        { mode: DEFAULT_BATCH_WALLET_MODE }
      )
    ).toEqual({
      path: "m/44'/60'/0'/0/0",
      useEmptyPassphrase: true,
    });
  });

  test('选择隐藏钱包前不复用旧状态，选择完成后绑定本次状态', async () => {
    const selectHiddenWallet = jest.fn(async () => ' selected-hidden-state ');
    const initialSelection = {
      mode: BatchWalletMode.SelectHidden,
    } as const;

    expect(
      applyBatchWalletSelection(
        { passphraseState: 'stale-hidden-state' },
        initialSelection
      )
    ).toEqual({ useEmptyPassphrase: false });

    const resolvedSelection = await resolveBatchWalletSelection(
      initialSelection,
      selectHiddenWallet
    );

    expect(selectHiddenWallet).toHaveBeenCalledTimes(1);
    expect(resolvedSelection).toEqual({
      mode: BatchWalletMode.SelectHidden,
      passphraseState: 'selected-hidden-state',
    });
    expect(applyBatchWalletSelection({}, resolvedSelection)).toEqual({
      useEmptyPassphrase: false,
      passphraseState: 'selected-hidden-state',
    });
  });

  test('恢复隐藏钱包要求输入状态，并且不会再次选择钱包', async () => {
    const selectHiddenWallet = jest.fn(async () => 'unexpected-state');

    expect(
      getBatchWalletSelectionError({ mode: BatchWalletMode.ResumeHidden })
    ).toBe('Enter a passphraseState to resume a hidden wallet.');

    const resolvedSelection = await resolveBatchWalletSelection(
      {
        mode: BatchWalletMode.ResumeHidden,
        passphraseState: ' cached-hidden-state ',
      },
      selectHiddenWallet
    );

    expect(selectHiddenWallet).not.toHaveBeenCalled();
    expect(resolvedSelection).toEqual({
      mode: BatchWalletMode.ResumeHidden,
      passphraseState: 'cached-hidden-state',
    });
  });
});
