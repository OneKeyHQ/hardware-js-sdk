import type {
  AutomationScenario,
  AutomationScenarioId,
  Slip39DatasetId,
  TestSuiteType,
} from '../../services/phonePilotMcp/types';

const BIP39_CREATE_SUITES: TestSuiteType[] = ['deviceFlow'];
const BIP39_IMPORT_SUITES: TestSuiteType[] = [
  'deviceFlow',
  'sdkAddressBatch',
  'sdkPubkeyBatch',
  'specialPassphrase',
];
const SLIP39_CREATE_SUITES: TestSuiteType[] = ['deviceFlow'];
const SLIP39_IMPORT_SUITES: TestSuiteType[] = ['deviceFlow', 'sdkAddressBatch', 'sdkPubkeyBatch'];

const BIP39_IMPORT_VECTORS = {
  12: {
    one: {
      sequenceId: 'one-normal-12',
      words: 'air census life sheriff attack include paper provide fantasy left opera sauce'.split(
        ' '
      ),
    },
    two: {
      sequenceId: 'two-normal-12',
      words:
        'relief exchange burst bullet topple manage impose dumb raise panther sibling shove'.split(
          ' '
        ),
    },
    three: {
      sequenceId: 'three-normal-12',
      words:
        'pyramid enforce season tide flag brisk law anchor refuse require reward negative'.split(
          ' '
        ),
    },
  },
  18: {
    one: {
      sequenceId: 'one-normal-18',
      words:
        'slab canyon coffee wine gold bronze rigid peace output security boy quick vital cat become stove tape super'.split(
          ' '
        ),
    },
    two: {
      sequenceId: 'two-normal-18',
      words:
        'arrange private session nose dial echo skull robust erode rain odor mango solve angle festival amazing decorate menu'.split(
          ' '
        ),
    },
    three: {
      sequenceId: 'three-normal-18',
      words:
        'riot fee raise forget always city spring million spike purse tackle impose faith remove hover snap leopard kitchen'.split(
          ' '
        ),
    },
  },
  24: {
    one: {
      sequenceId: 'one-normal-24',
      words:
        'gorilla absent bone address stay minimum artist train piano coil gadget truck almost voice runway drip pony pizza uncover expose country enlist avocado hotel'.split(
          ' '
        ),
    },
    two: {
      sequenceId: 'two-normal-24',
      words:
        'jazz cactus tower knee gift crazy tourist exile valid short exhibit cute asthma segment dragon write jacket ribbon cheese ignore use dwarf small dove'.split(
          ' '
        ),
    },
    three: {
      sequenceId: 'three-normal-24',
      words:
        'post flock violin raven size harvest media cash divide blade scale eternal action comic ball increase track unhappy ask speed timber exist trim expose'.split(
          ' '
        ),
    },
  },
} as const;

function createBip39CreateScenario(
  id: AutomationScenarioId,
  caseLabel: string,
  wordCount: number,
  sequenceId: string
): AutomationScenario {
  return {
    id,
    jiraKey: 'OK-26053',
    title: `BIP39 创建 / ${caseLabel}`,
    flowType: 'create',
    walletType: 'bip39',
    caseLabel,
    wordCount,
    phonePilotSequenceId: sequenceId,
    supportedSuites: BIP39_CREATE_SUITES,
  };
}

function createBip39ImportScenario(
  id: AutomationScenarioId,
  caseLabel: string,
  wordCount: 12 | 18 | 24,
  vectorKey: 'one' | 'two' | 'three'
): AutomationScenario {
  const vector = BIP39_IMPORT_VECTORS[wordCount][vectorKey];

  return {
    id,
    jiraKey: 'OK-26054',
    title: `BIP39 导入 / ${caseLabel}`,
    flowType: 'import',
    walletType: 'bip39',
    caseLabel,
    wordCount,
    phonePilotSequenceId: vector.sequenceId,
    supportedSuites: BIP39_IMPORT_SUITES,
    bip39ImportMnemonicWords: [...vector.words],
  };
}

function createSlip39CreateScenario(
  id: AutomationScenarioId,
  caseLabel: string,
  wordCount: number,
  shareCount: number,
  threshold: number,
  sequenceId: string
): AutomationScenario {
  return {
    id,
    jiraKey: 'OK-5504',
    title: `SLIP39 创建 / ${caseLabel}`,
    flowType: 'create',
    walletType: 'slip39',
    caseLabel,
    wordCount,
    shareCount,
    threshold,
    phonePilotSequenceId: sequenceId,
    supportedSuites: SLIP39_CREATE_SUITES,
  };
}

function createSlip39ImportScenario(
  id: AutomationScenarioId,
  caseLabel: string,
  wordCount: number,
  shareCount: number,
  threshold: number,
  sequenceId: string,
  datasetId: Slip39DatasetId
): AutomationScenario {
  return {
    id,
    jiraKey: 'OK-40090',
    title: `SLIP39 导入 / ${caseLabel}`,
    flowType: 'import',
    walletType: 'slip39',
    caseLabel,
    wordCount,
    shareCount,
    threshold,
    phonePilotSequenceId: sequenceId,
    supportedSuites: SLIP39_IMPORT_SUITES,
    slip39DatasetId: datasetId,
  };
}

export const AUTOMATION_SCENARIOS: Record<AutomationScenarioId, AutomationScenario> = {
  ok26053_bip39_create_12: createBip39CreateScenario(
    'ok26053_bip39_create_12',
    '12-word',
    12,
    'create-wallet'
  ),
  ok26053_bip39_create_18: createBip39CreateScenario(
    'ok26053_bip39_create_18',
    '18-word',
    18,
    'create-wallet-18'
  ),
  ok26053_bip39_create_24: createBip39CreateScenario(
    'ok26053_bip39_create_24',
    '24-word',
    24,
    'create-wallet-24'
  ),
  ok26054_bip39_import_12: createBip39ImportScenario(
    'ok26054_bip39_import_12',
    '12-word / one',
    12,
    'one'
  ),
  ok26054_bip39_import_12_two: createBip39ImportScenario(
    'ok26054_bip39_import_12_two',
    '12-word / two',
    12,
    'two'
  ),
  ok26054_bip39_import_12_three: createBip39ImportScenario(
    'ok26054_bip39_import_12_three',
    '12-word / three',
    12,
    'three'
  ),
  ok26054_bip39_import_18: createBip39ImportScenario(
    'ok26054_bip39_import_18',
    '18-word / one',
    18,
    'one'
  ),
  ok26054_bip39_import_18_two: createBip39ImportScenario(
    'ok26054_bip39_import_18_two',
    '18-word / two',
    18,
    'two'
  ),
  ok26054_bip39_import_18_three: createBip39ImportScenario(
    'ok26054_bip39_import_18_three',
    '18-word / three',
    18,
    'three'
  ),
  ok26054_bip39_import_24: createBip39ImportScenario(
    'ok26054_bip39_import_24',
    '24-word / one',
    24,
    'one'
  ),
  ok26054_bip39_import_24_two: createBip39ImportScenario(
    'ok26054_bip39_import_24_two',
    '24-word / two',
    24,
    'two'
  ),
  ok26054_bip39_import_24_three: createBip39ImportScenario(
    'ok26054_bip39_import_24_three',
    '24-word / three',
    24,
    'three'
  ),
  ok5504_slip39_create_20_1of1: createSlip39CreateScenario(
    'ok5504_slip39_create_20_1of1',
    '20(1-1)',
    20,
    1,
    1,
    'create-slip39-single-template'
  ),
  ok5504_slip39_create_20_2of2: createSlip39CreateScenario(
    'ok5504_slip39_create_20_2of2',
    '20(2-2)',
    20,
    2,
    2,
    'create-slip39-multi-2of2-template'
  ),
  ok5504_slip39_create_20_8of8: createSlip39CreateScenario(
    'ok5504_slip39_create_20_8of8',
    '20(8-8)',
    20,
    8,
    8,
    'create-slip39-multi-8of8-template'
  ),
  ok5504_slip39_create_20_16of2: createSlip39CreateScenario(
    'ok5504_slip39_create_20_16of2',
    '20(16-2)',
    20,
    16,
    2,
    'create-slip39-multi-16of2-template'
  ),
  ok40090_slip39_import_20_1of1: createSlip39ImportScenario(
    'ok40090_slip39_import_20_1of1',
    '20(1-1)',
    20,
    1,
    1,
    'count20_one_normal',
    'count20_one'
  ),
  ok40090_slip39_import_20_3of2: createSlip39ImportScenario(
    'ok40090_slip39_import_20_3of2',
    '20(3-2)',
    20,
    3,
    2,
    'count20_two_normal',
    'count20_two'
  ),
  ok40090_slip39_import_20_16of16: createSlip39ImportScenario(
    'ok40090_slip39_import_20_16of16',
    '20(16-16)',
    20,
    16,
    16,
    'count20_three_normal',
    'count20_three'
  ),
  ok40090_slip39_import_33_1of1: createSlip39ImportScenario(
    'ok40090_slip39_import_33_1of1',
    '33(1-1)',
    33,
    1,
    1,
    'count33_one_normal',
    'count33_one'
  ),
  ok40090_slip39_import_33_2of3: createSlip39ImportScenario(
    'ok40090_slip39_import_33_2of3',
    '33(2-3)',
    33,
    3,
    2,
    'count33_two_normal',
    'count33_two'
  ),
};

export const ALL_AUTOMATION_SCENARIO_IDS = Object.keys(
  AUTOMATION_SCENARIOS
) as AutomationScenarioId[];

export function getAutomationScenario(id: AutomationScenarioId): AutomationScenario {
  return AUTOMATION_SCENARIOS[id];
}

export function getAllAutomationScenarios(): AutomationScenario[] {
  return ALL_AUTOMATION_SCENARIO_IDS.map(id => AUTOMATION_SCENARIOS[id]);
}
