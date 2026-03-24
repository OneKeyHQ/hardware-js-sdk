import { batchAddressTestCount12One } from '../addressTest/data/count12_one';
import { batchAddressTestCount12Three } from '../addressTest/data/count12_three';
import { batchAddressTestCount12Two } from '../addressTest/data/count12_two';
import { batchAddressTestCount18One } from '../addressTest/data/count18_one';
import { batchAddressTestCount18Three } from '../addressTest/data/count18_three';
import { batchAddressTestCount18Two } from '../addressTest/data/count18_two';
import { batchAddressTestCount24One } from '../addressTest/data/count24_one';
import { batchAddressTestCount24Three } from '../addressTest/data/count24_three';
import { batchAddressTestCount24Two } from '../addressTest/data/count24_two';
import { batchPubkeyTestCount12One } from '../pubkeyTest/data/count12_one';
import { batchPubkeyTestCount12Three } from '../pubkeyTest/data/count12_three';
import { batchPubkeyTestCount12Two } from '../pubkeyTest/data/count12_two';
import { batchPubkeyTestCount18One } from '../pubkeyTest/data/count18_one';
import { batchPubkeyTestCount18Three } from '../pubkeyTest/data/count18_three';
import { batchPubkeyTestCount18Two } from '../pubkeyTest/data/count18_two';
import { batchPubkeyTestCount24One } from '../pubkeyTest/data/count24_one';
import { batchPubkeyTestCount24Three } from '../pubkeyTest/data/count24_three';
import { batchPubkeyTestCount24Two } from '../pubkeyTest/data/count24_two';
import { batchAddressTests } from '../slip39Test/addressData';
import { allPubkeyTestCases } from '../slip39Test/pubKeyData';

import type {
  AutomationScenario,
  PassphraseVariantId,
  Slip39DatasetId,
} from '../../services/phonePilotMcp/types';
import type { AddressBatchTestCase } from '../addressTest/types';
import type { PubkeyBatchTestCase } from '../pubkeyTest/types';
import type { SLIP39TestCaseData } from '../slip39Test/types';

const BIP39_CREATE_PASSPHRASE_LITERALS: Partial<Record<PassphraseVariantId, string | undefined>> = {
  normal: undefined,
  passphrase_empty: '',
  passphrase_1: 'asdfg7890',
  passphrase_2: '1234567890qwertyuiopasdfghjklzxcvbnm',
};

const SLIP39_PASSPHRASE_LITERALS: Partial<Record<PassphraseVariantId, string | undefined>> = {
  normal: undefined,
  passphrase_empty: '',
  passphrase_1: '12345',
  passphrase_2: 'onekey',
};

const BIP39_IMPORT_VARIANT_INDEX: Record<PassphraseVariantId, number> = {
  normal: 0,
  passphrase_empty: 1,
  passphrase_1: 2,
  passphrase_2: 3,
};

export interface AutomationSdkMethodCase {
  method: string;
  name?: string;
  params?: any;
  expectedByPath: Record<string, unknown>;
}

export interface AutomationSdkCase {
  id: string;
  name: string;
  description: string;
  passphrase?: string;
  passphraseState?: string;
  data: AutomationSdkMethodCase[];
}

type Bip39BatchTestCase = AddressBatchTestCase | PubkeyBatchTestCase;

function toSlip39DataCaseMap(dataList: SLIP39TestCaseData[]): Record<string, SLIP39TestCaseData> {
  return Object.fromEntries(dataList.map(item => [item.id, item]));
}

function normalizeBip39BatchCase(testCase: Bip39BatchTestCase): AutomationSdkCase {
  return {
    id: testCase.id,
    name: testCase.name,
    description: testCase.description,
    passphrase: testCase.extra?.passphrase,
    passphraseState: testCase.extra?.passphraseState,
    data: testCase.data.map(item => ({
      method: item.method,
      name: item.name,
      params: item.params,
      expectedByPath: item.result,
    })),
  };
}

const BIP39_IMPORT_ADDRESS_CASE_GROUPS: Record<string, AddressBatchTestCase[]> = {
  'one-normal-12': batchAddressTestCount12One,
  'two-normal-12': batchAddressTestCount12Two,
  'three-normal-12': batchAddressTestCount12Three,
  'one-normal-18': batchAddressTestCount18One,
  'two-normal-18': batchAddressTestCount18Two,
  'three-normal-18': batchAddressTestCount18Three,
  'one-normal-24': batchAddressTestCount24One,
  'two-normal-24': batchAddressTestCount24Two,
  'three-normal-24': batchAddressTestCount24Three,
};

const BIP39_IMPORT_PUBKEY_CASE_GROUPS: Record<string, PubkeyBatchTestCase[]> = {
  'one-normal-12': batchPubkeyTestCount12One,
  'two-normal-12': batchPubkeyTestCount12Two,
  'three-normal-12': batchPubkeyTestCount12Three,
  'one-normal-18': batchPubkeyTestCount18One,
  'two-normal-18': batchPubkeyTestCount18Two,
  'three-normal-18': batchPubkeyTestCount18Three,
  'one-normal-24': batchPubkeyTestCount24One,
  'two-normal-24': batchPubkeyTestCount24Two,
  'three-normal-24': batchPubkeyTestCount24Three,
};

const slip39AddressCaseMap = toSlip39DataCaseMap(batchAddressTests);
const slip39PubkeyCaseMap = toSlip39DataCaseMap(allPubkeyTestCases);
const SLIP39_CREATE_TEMPLATE_CASE_ID = 'count20_one_normal';

function buildSlip39CaseId(datasetId: Slip39DatasetId, variantId: PassphraseVariantId): string {
  const suffixMap: Record<PassphraseVariantId, string> = {
    normal: 'normal',
    passphrase_empty: 'passphrase_empty',
    passphrase_1: 'passphrase_1',
    passphrase_2: 'passphrase_2',
  };
  return `${datasetId}_${suffixMap[variantId]}`;
}

function getBip39ImportCaseGroup(
  scenario: AutomationScenario,
  caseType: 'address' | 'pubkey'
): Bip39BatchTestCase[] {
  if (scenario.walletType !== 'bip39' || scenario.flowType !== 'import') {
    return [];
  }

  return caseType === 'address'
    ? BIP39_IMPORT_ADDRESS_CASE_GROUPS[scenario.phonePilotSequenceId] || []
    : BIP39_IMPORT_PUBKEY_CASE_GROUPS[scenario.phonePilotSequenceId] || [];
}

export function resolveBip39ImportSdkCases(
  scenario: AutomationScenario,
  selectedPassphraseVariantIds: PassphraseVariantId[],
  caseType: 'address' | 'pubkey'
): AutomationSdkCase[] {
  const caseGroup = getBip39ImportCaseGroup(scenario, caseType);

  return selectedPassphraseVariantIds
    .map(variantId => caseGroup[BIP39_IMPORT_VARIANT_INDEX[variantId]])
    .filter((item): item is Bip39BatchTestCase => Boolean(item))
    .map(normalizeBip39BatchCase);
}

export function resolveSlip39SdkCases(
  scenario: AutomationScenario,
  selectedPassphraseVariantIds: PassphraseVariantId[],
  caseType: 'address' | 'pubkey'
): SLIP39TestCaseData[] {
  if (!scenario.slip39DatasetId) {
    return [];
  }

  const datasetId = scenario.slip39DatasetId;
  const caseMap = caseType === 'address' ? slip39AddressCaseMap : slip39PubkeyCaseMap;

  return selectedPassphraseVariantIds
    .map(variantId => caseMap[buildSlip39CaseId(datasetId, variantId)])
    .filter((item): item is SLIP39TestCaseData => Boolean(item));
}

export function getSlip39CreateTemplateCase(
  caseType: 'address' | 'pubkey'
): SLIP39TestCaseData | null {
  const caseMap = caseType === 'address' ? slip39AddressCaseMap : slip39PubkeyCaseMap;
  return caseMap[SLIP39_CREATE_TEMPLATE_CASE_ID] || null;
}

export function getScenarioPassphraseLiteral(
  scenario: AutomationScenario,
  variantId: PassphraseVariantId
): string | undefined {
  if (scenario.walletType === 'slip39') {
    return SLIP39_PASSPHRASE_LITERALS[variantId];
  }

  if (scenario.flowType === 'import') {
    return resolveBip39ImportSdkCases(scenario, [variantId], 'address')[0]?.passphrase;
  }

  return BIP39_CREATE_PASSPHRASE_LITERALS[variantId];
}
