import { Check as CheckIcon } from '@tamagui/lucide-icons';
import { Checkbox, Text, XStack, YStack } from 'tamagui';

import {
  ALL_PASSPHRASE_VARIANT_IDS,
  PASSPHRASE_VARIANT_INFO,
} from '../../../services/phonePilotMcp/types';
import { toggleValue } from '../utils';
import { PanelActions } from './PanelActions';

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
    <YStack gap="$2">
      <XStack justifyContent="space-between" alignItems="center" gap="$3" flexWrap="wrap">
        <Text fontSize={14} fontWeight="700">
          Passphrase 变体
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
      <XStack flexWrap="wrap" gap="$2">
        {ALL_PASSPHRASE_VARIANT_IDS.map(variantId => {
          const checked = config.passphraseVariants.includes(variantId);
          return (
            <XStack
              key={variantId}
              alignItems="center"
              gap="$2"
              paddingVertical="$2"
              paddingHorizontal="$2.5"
              borderRadius="$3"
              borderWidth={1}
              borderColor={checked ? '$blue8' : '$gray5'}
              backgroundColor={checked ? '$blue2' : 'transparent'}
              opacity={isRunning ? 0.5 : 1}
              cursor={isRunning ? 'not-allowed' : 'pointer'}
              onPress={isRunning ? undefined : () => togglePassphraseVariant(variantId)}
            >
              <Checkbox
                size="$3"
                checked={checked}
                disabled={isRunning}
                pointerEvents="none"
                borderWidth={1.5}
                borderRadius="$2"
                borderColor={checked ? '$blue8' : '$gray7'}
                backgroundColor={checked ? '$blue3' : 'transparent'}
                width={18}
                height={18}
                minWidth={18}
              >
                <Checkbox.Indicator>
                  <CheckIcon size={12} />
                </Checkbox.Indicator>
              </Checkbox>
              <Text fontSize={12} fontWeight="500">
                {PASSPHRASE_VARIANT_INFO[variantId].label}
              </Text>
            </XStack>
          );
        })}
      </XStack>
    </YStack>
  );
}
