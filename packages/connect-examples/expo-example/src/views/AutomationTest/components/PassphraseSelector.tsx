import { Card, Text, XStack, YStack } from 'tamagui';

import {
  ALL_PASSPHRASE_VARIANT_IDS,
  PASSPHRASE_VARIANT_INFO,
} from '../../../services/phonePilotMcp/types';
import { toggleValue } from '../utils';
import { PanelActions } from './PanelActions';
import { SelectableRow } from './SelectableRow';

import type {
  AutomationTestConfig,
  PassphraseVariantId,
} from '../../../services/phonePilotMcp/types';

export function PassphraseSelector({
  config,
  isRunning,
  setConfig,
}: {
  config: AutomationTestConfig;
  isRunning: boolean;
  setConfig: (
    updater: AutomationTestConfig | ((prev: AutomationTestConfig) => AutomationTestConfig)
  ) => void;
}) {
  const togglePassphraseVariant = (variantId: PassphraseVariantId) => {
    setConfig(prev => ({
      ...prev,
      passphraseVariants: toggleValue(prev.passphraseVariants, variantId),
    }));
  };

  return (
    <YStack gap="$3">
      <XStack justifyContent="space-between" alignItems="center" gap="$3" flexWrap="wrap">
        <Text fontSize={14} fontWeight="700">
          隐藏钱包密码短语变体
        </Text>
        <PanelActions
          disabled={isRunning}
          onSelectAll={() =>
            setConfig(prev => ({
              ...prev,
              passphraseVariants: [...ALL_PASSPHRASE_VARIANT_IDS],
            }))
          }
          onClear={() => setConfig(prev => ({ ...prev, passphraseVariants: [] }))}
        />
      </XStack>
      <Card bordered padding="$3" backgroundColor="$gray1">
        <Text fontSize={12} color="$gray10">
          当前自动化报告会展示 literal。SLIP39 约定：`passphrase_1 = 12345`，`passphrase_2 =
          onekey`。
        </Text>
      </Card>
      <YStack gap="$2">
        {ALL_PASSPHRASE_VARIANT_IDS.map(variantId => (
          <SelectableRow
            key={variantId}
            checked={config.passphraseVariants.includes(variantId)}
            disabled={isRunning}
            title={PASSPHRASE_VARIANT_INFO[variantId].label}
            description={PASSPHRASE_VARIANT_INFO[variantId].description}
            onToggle={() => togglePassphraseVariant(variantId)}
          />
        ))}
      </YStack>
    </YStack>
  );
}
