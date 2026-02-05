/**
 * Mnemonic Groups Configuration
 *
 * Maps test mnemonics to PhonePilot sequences.
 * Each group corresponds to a specific mnemonic that PhonePilot can restore on the device.
 */

import type {
  MnemonicGroup,
  MnemonicGroupId,
  PassphraseVariant,
  PassphraseVariantId,
} from '../../services/phonePilotMcp/types';

// ============================================================================
// Standard Mnemonics (12/18/24 words)
// These match the mnemonics defined in PhonePilot ControlPanel.tsx
// ============================================================================

/** 12-word mnemonics */
const MNEMONIC_12_1 = 'air census life sheriff attack include paper provide fantasy left opera sauce'.split(' ');
const MNEMONIC_12_2 = 'relief exchange burst bullet topple manage impose dumb raise panther sibling shove'.split(' ');
const MNEMONIC_12_3 = 'pyramid enforce season tide flag brisk law anchor refuse require reward negative'.split(' ');

/** 18-word mnemonics */
const MNEMONIC_18_1 = 'slab canyon coffee wine gold bronze rigid peace output security boy quick vital cat become stove tape super'.split(' ');
const MNEMONIC_18_2 = 'arrange private session nose dial echo skull robust erode rain odor mango solve angle festival amazing decorate menu'.split(' ');
const MNEMONIC_18_3 = 'riot fee raise forget always city spring million spike purse tackle impose faith remove hover snap leopard kitchen'.split(' ');

/** 24-word mnemonics */
const MNEMONIC_24_1 = 'gorilla absent bone address stay minimum artist train piano coil gadget truck almost voice runway drip pony pizza uncover expose country enlist avocado hotel'.split(' ');
const MNEMONIC_24_2 = 'jazz cactus tower knee gift crazy tourist exile valid short exhibit cute asthma segment dragon write jacket ribbon cheese ignore use dwarf small dove'.split(' ');
const MNEMONIC_24_3 = 'post flock violin raven size harvest media cash divide blade scale eternal action comic ball increase track unhappy ask speed timber exist trim expose'.split(' ');

// ============================================================================
// SLIP39 Mnemonics
// ============================================================================

/** slip39 20-word (1 share) */
const SLIP39_20_1 = [
  'fake kidney academic academic dwarf orange primary secret mixed auction priority daughter script smell smear judicial ceramic glen theory emphasis'.split(' '),
];

/** slip39 20-word (2-3: 3 shares, need 2) */
const SLIP39_20_2 = [
  'network vexed academic acid alive forbid database equation average advocate golden careful exhaust dance texture satisfy lair negative earth flash'.split(' '),
  'network vexed academic agency calcium memory elegant merchant welcome oral evidence bulb union company suitable spend loud miracle story withdraw'.split(' '),
  // Third share available but only 2 needed: 'network vexed academic always debut unhappy veteran trust goat cluster easel penalty entrance drift mild uncover short sack excuse kitchen'.split(' '),
];

/** slip39 20-word (16-16: 16 shares, need 16) */
const SLIP39_20_16 = [
  'platform helpful academic afraid custody blind shaft burning visual prune knit clay mason genuine march crisis smug wits woman taught'.split(' '),
  'platform helpful academic alto armed theory alpha paces welcome quick quiet device craft strike chemical ocean briefing space phantom legal'.split(' '),
  'platform helpful academic anxiety cage sympathy dramatic western acrobat transfer oral spew package style scroll pajamas curious grant center alto'.split(' '),
  'platform helpful academic award cards category salt guest pharmacy devote pistol focus identify infant evoke recall shaft empty hazard romantic'.split(' '),
  'platform helpful academic bike clogs estate duke thank bolt floral race phrase preach seafood strategy industry crowd length grant yield'.split(' '),
  'platform helpful academic bracelet clock daughter memory visitor result blanket garbage starting speak clay junction pitch ladybug jacket fluff ultimate'.split(' '),
  'platform helpful academic burning credit install sidewalk level museum evening permit duke cards findings aunt document improve woman general august'.split(' '),
  'platform helpful academic carve ajar edge similar glance darkness random envelope glen ancestor gums view venture wealthy learn ivory exotic'.split(' '),
  'platform helpful academic class depend gather story empty harvest overall craft leaves nuclear reject kernel that temple width presence speak'.split(' '),
  'platform helpful academic company adequate western resident dismiss mortgage emperor coastal sack example ancestor mason length mama timber rhythm buyer'.split(' '),
  'platform helpful academic crucial domain bedroom violence mental multiple language sympathy grin beaver salt excuse pants worthy vegan prepare unfold'.split(' '),
  'platform helpful academic deadline crush depart thank pregnant treat salon ambition miracle sidewalk speak practice taxi soldier scholar vitamins junk'.split(' '),
  'platform helpful academic deploy chemical afraid justice undergo deny excuse famous entrance scene early photo glance salon platform wildlife ladle'.split(' '),
  'platform helpful academic diploma cricket trend loud replace rapids payment paces theory easel spine cultural dictate hormone necklace blimp exact'.split(' '),
  'platform helpful academic dragon company true volume carve dough endorse force plot cinema remember skin transfer criminal hunting axle mayor'.split(' '),
  'platform helpful academic easel deadline evil museum spill funding muscle retreat smart timely oven transfer grownup deal armed merchant flash'.split(' '),
];

/** slip39 33-word (1 share) */
const SLIP39_33_1 = [
  'station industry academic academic aunt similar picture filter chubby vintage insect hairy charity priority ugly mandate credit faint segment mobile cage junior receiver reject crazy sympathy extra helpful expand force counter lamp rescue'.split(' '),
];

/** slip39 33-word (3-2: 3 shares, need 2) */
const SLIP39_33_2 = [
  'yoga racism academic acid average silent year kind package pitch bracelet desert aide guilt render belong density forbid spark benefit trend junior fake dough silver spray adequate western liberty hearing strike prepare various'.split(' '),
  'yoga racism academic agency antenna aircraft nervous biology buyer invasion satoshi angry darkness skin guilt market fatal violence item platform painting width involve marathon parking duration pancake wildlife should execute silver metric oven'.split(' '),
  // Third share available but only 2 needed
];

// ============================================================================
// Mnemonic Groups Configuration
// ============================================================================

/**
 * All available mnemonic groups
 * Each group maps to:
 * - A specific mnemonic or SLIP39 shares
 * - A PhonePilot sequence ID for device restoration
 * - Test data folders in addressTest/data/
 */
export const MNEMONIC_GROUPS: Record<MnemonicGroupId, MnemonicGroup> = {
  // 12-word groups
  count12_one: {
    id: 'count12_one',
    name: '12词-1 (air census...)',
    type: 'standard',
    wordCount: 12,
    mnemonic: MNEMONIC_12_1,
    phonePilotSequenceId: 'one-normal-12',
  },
  count12_two: {
    id: 'count12_two',
    name: '12词-2 (relief exchange...)',
    type: 'standard',
    wordCount: 12,
    mnemonic: MNEMONIC_12_2,
    phonePilotSequenceId: 'two-normal-12',
  },
  count12_three: {
    id: 'count12_three',
    name: '12词-3 (pyramid enforce...)',
    type: 'standard',
    wordCount: 12,
    mnemonic: MNEMONIC_12_3,
    phonePilotSequenceId: 'three-normal-12',
  },

  // 18-word groups
  count18_one: {
    id: 'count18_one',
    name: '18词-1 (slab canyon...)',
    type: 'standard',
    wordCount: 18,
    mnemonic: MNEMONIC_18_1,
    phonePilotSequenceId: 'one-normal-18',
  },
  count18_two: {
    id: 'count18_two',
    name: '18词-2 (arrange private...)',
    type: 'standard',
    wordCount: 18,
    mnemonic: MNEMONIC_18_2,
    phonePilotSequenceId: 'two-normal-18',
  },
  count18_three: {
    id: 'count18_three',
    name: '18词-3 (riot fee...)',
    type: 'standard',
    wordCount: 18,
    mnemonic: MNEMONIC_18_3,
    phonePilotSequenceId: 'three-normal-18',
  },

  // 24-word groups
  count24_one: {
    id: 'count24_one',
    name: '24词-1 (gorilla absent...)',
    type: 'standard',
    wordCount: 24,
    mnemonic: MNEMONIC_24_1,
    phonePilotSequenceId: 'one-normal-24',
  },
  count24_two: {
    id: 'count24_two',
    name: '24词-2 (jazz cactus...)',
    type: 'standard',
    wordCount: 24,
    mnemonic: MNEMONIC_24_2,
    phonePilotSequenceId: 'two-normal-24',
  },
  count24_three: {
    id: 'count24_three',
    name: '24词-3 (post flock...)',
    type: 'standard',
    wordCount: 24,
    mnemonic: MNEMONIC_24_3,
    phonePilotSequenceId: 'three-normal-24',
  },

  // SLIP39 20-word groups
  slip39_20_one: {
    id: 'slip39_20_one',
    name: 'SLIP39-20词-1份',
    type: 'slip39',
    wordCount: 20,
    slip39Shares: SLIP39_20_1,
    phonePilotSequenceId: 'count20_one_normal',
  },
  slip39_20_two: {
    id: 'slip39_20_two',
    name: 'SLIP39-20词-2/3',
    type: 'slip39',
    wordCount: 20,
    slip39Shares: SLIP39_20_2,
    phonePilotSequenceId: 'count20_two_normal',
  },
  slip39_20_three: {
    id: 'slip39_20_three',
    name: 'SLIP39-20词-16/16',
    type: 'slip39',
    wordCount: 20,
    slip39Shares: SLIP39_20_16,
    phonePilotSequenceId: 'count20_three_normal',
  },

  // SLIP39 33-word groups
  slip39_33_one: {
    id: 'slip39_33_one',
    name: 'SLIP39-33词-1份',
    type: 'slip39',
    wordCount: 33,
    slip39Shares: SLIP39_33_1,
    phonePilotSequenceId: 'count33_one_normal',
  },
  slip39_33_two: {
    id: 'slip39_33_two',
    name: 'SLIP39-33词-3/2',
    type: 'slip39',
    wordCount: 33,
    slip39Shares: SLIP39_33_2,
    phonePilotSequenceId: 'count33_two_normal',
  },
};

/**
 * Passphrase variants for each mnemonic group
 * These match the test data files: normal.ts, passphrase_empty.ts, passphrase_1.ts, passphrase_2.ts
 */
export const PASSPHRASE_VARIANTS: Record<MnemonicGroupId, PassphraseVariant[]> = {
  count12_one: [
    { name: 'normal', passphrase: '', passphraseState: '' },
    { name: 'passphrase_empty', passphrase: '', passphraseState: 'n4KZ2aKvYzJzWM6eG1YhNiP1iuGJiYbEh3' },
    { name: 'passphrase_1', passphrase: 'asdfg7890', passphraseState: 'mxM4v8Eyo9S5BPCB1xbvmDBLXfACf4rPDK' },
    { name: 'passphrase_2', passphrase: '1234567890qwertyuiopasdfghjklzxcvbnm', passphraseState: 'myRpmVHzDdYd1yDm51hghVKKrZrHo9B5HG' },
  ],
  count12_two: [
    { name: 'normal', passphrase: '', passphraseState: '' },
    { name: 'passphrase_empty', passphrase: '', passphraseState: 'n3gj4cYqaL2oV2Kqp5kpDtMkfHFNpVLHq2' },
    { name: 'passphrase_1', passphrase: 'asdfg7890', passphraseState: 'mwZpVpJjjYu1NNxfwNRcpM9vVwKJVYpSn4' },
    { name: 'passphrase_2', passphrase: '1234567890qwertyuiopasdfghjklzxcvbnm', passphraseState: 'mnyqRXNUGn52LJKgxz6LWv9nRoYLc5D41B' },
  ],
  count12_three: [
    { name: 'normal', passphrase: '', passphraseState: '' },
    { name: 'passphrase_empty', passphrase: '', passphraseState: 'n3H8jZ9iSfPCpWGVMWJT4Y5LoMRSPKoEiy' },
    { name: 'passphrase_1', passphrase: 'asdfg7890', passphraseState: 'mxC7kcQhHvWHTBKLovKdhKnzDHMrFJCGFR' },
    { name: 'passphrase_2', passphrase: '1234567890qwertyuiopasdfghjklzxcvbnm', passphraseState: 'n3wC2CfMy4sD5xnRBVwVq4QeFzaBQPEoEp' },
  ],
  count18_one: [
    { name: 'normal', passphrase: '', passphraseState: '' },
    { name: 'passphrase_empty', passphrase: '', passphraseState: 'n3SnW2LPPXgRwT9LxLvxjWVJpNvRFj1bMw' },
    { name: 'passphrase_1', passphrase: 'asdfg7890', passphraseState: 'msSBAbDfbRHgBF6xBgaEd6YupR3qdVBu9H' },
    { name: 'passphrase_2', passphrase: '1234567890qwertyuiopasdfghjklzxcvbnm', passphraseState: 'muuXRoW6N8LZ4SDNMW1g1nvvGNV5e7T42x' },
  ],
  count18_two: [
    { name: 'normal', passphrase: '', passphraseState: '' },
    { name: 'passphrase_empty', passphrase: '', passphraseState: 'mzUAusDxuKwPhyLxMJwmPGpThiX1qWYJfK' },
    { name: 'passphrase_1', passphrase: 'asdfg7890', passphraseState: 'n2MpHzYuEaWL81tT2p5LhkjDQgNGYEywcS' },
    { name: 'passphrase_2', passphrase: '1234567890qwertyuiopasdfghjklzxcvbnm', passphraseState: 'mzHxQYjvjJLKQoaDZv2VXYwHy5RAXNvMwH' },
  ],
  count18_three: [
    { name: 'normal', passphrase: '', passphraseState: '' },
    { name: 'passphrase_empty', passphrase: '', passphraseState: 'mz2jx4mxw6qfYNJh5oAxLSz7bYsFFqYD9S' },
    { name: 'passphrase_1', passphrase: 'asdfg7890', passphraseState: 'n2NopY1LPRWVGsLTRyMgL8SWXNzxVVNz2A' },
    { name: 'passphrase_2', passphrase: '1234567890qwertyuiopasdfghjklzxcvbnm', passphraseState: 'n3Dj7NJPENKNkXCW78EUK4vX7JXCdvLVTK' },
  ],
  count24_one: [
    { name: 'normal', passphrase: '', passphraseState: '' },
    { name: 'passphrase_empty', passphrase: '', passphraseState: 'mpZyZrARXurTXC6fhzHdQzs4xVNXCkCbxW' },
    { name: 'passphrase_1', passphrase: 'asdfg7890', passphraseState: 'n2LkLQUmqRAFpjBwVAbwLmpnC3C43u1uv6' },
    { name: 'passphrase_2', passphrase: '1234567890qwertyuiopasdfghjklzxcvbnm', passphraseState: 'n3dRrM9B4ZtEVNUiHF18LXNh5UUpZ1h8Zd' },
  ],
  count24_two: [
    { name: 'normal', passphrase: '', passphraseState: '' },
    { name: 'passphrase_empty', passphrase: '', passphraseState: 'n2ygQ1UrZsUdQQb9VKsKcvCYm9yzRXmWPm' },
    { name: 'passphrase_1', passphrase: 'asdfg7890', passphraseState: 'mxeLmYLWevRtZ2nKkQ1qFjWQ8Q2dX3dU97' },
    { name: 'passphrase_2', passphrase: '1234567890qwertyuiopasdfghjklzxcvbnm', passphraseState: 'mzCw8LvNMSYZzQmgKz4BLQFZfCL9MUH3Ln' },
  ],
  count24_three: [
    { name: 'normal', passphrase: '', passphraseState: '' },
    { name: 'passphrase_empty', passphrase: '', passphraseState: 'n2bVqSJcvGDrPcT11tCPE6x1nLUVVyAfKF' },
    { name: 'passphrase_1', passphrase: 'asdfg7890', passphraseState: 'mvCcxPqVVJvbFLKJfvYHvCwD7FdqxGBjUx' },
    { name: 'passphrase_2', passphrase: '1234567890qwertyuiopasdfghjklzxcvbnm', passphraseState: 'n19rHMPLTuHxFBQnq5NMSkKMvPvWhjBpCY' },
  ],
  // SLIP39 groups - typically only test with normal/empty passphrase
  slip39_20_one: [
    { name: 'normal', passphrase: '', passphraseState: '' },
  ],
  slip39_20_two: [
    { name: 'normal', passphrase: '', passphraseState: '' },
  ],
  slip39_20_three: [
    { name: 'normal', passphrase: '', passphraseState: '' },
  ],
  slip39_33_one: [
    { name: 'normal', passphrase: '', passphraseState: '' },
  ],
  slip39_33_two: [
    { name: 'normal', passphrase: '', passphraseState: '' },
  ],
};

/**
 * Get mnemonic group by ID
 */
export function getMnemonicGroup(id: MnemonicGroupId): MnemonicGroup {
  return MNEMONIC_GROUPS[id];
}

/**
 * Get passphrase variants for a mnemonic group
 */
export function getPassphraseVariants(id: MnemonicGroupId): PassphraseVariant[] {
  return PASSPHRASE_VARIANTS[id] || [];
}

/**
 * Get all standard (non-SLIP39) mnemonic group IDs
 */
export function getStandardMnemonicGroupIds(): MnemonicGroupId[] {
  return Object.keys(MNEMONIC_GROUPS).filter(
    (id) => MNEMONIC_GROUPS[id as MnemonicGroupId].type === 'standard'
  ) as MnemonicGroupId[];
}

/**
 * Get all SLIP39 mnemonic group IDs
 */
export function getSlip39MnemonicGroupIds(): MnemonicGroupId[] {
  return Object.keys(MNEMONIC_GROUPS).filter(
    (id) => MNEMONIC_GROUPS[id as MnemonicGroupId].type === 'slip39'
  ) as MnemonicGroupId[];
}

/**
 * Get all mnemonic group IDs
 */
export function getAllMnemonicGroupIds(): MnemonicGroupId[] {
  return Object.keys(MNEMONIC_GROUPS) as MnemonicGroupId[];
}

/**
 * Mnemonic organization by word count
 */
export interface MnemonicsByWordCount {
  wordCount: number;
  label: string;
  type: 'standard' | 'slip39';
  groups: Array<{
    shareLabel: string;
    id: MnemonicGroupId;
  }>;
}

/**
 * Get mnemonics organized by word count for UI display
 */
export function getMnemonicsOrganizedByWordCount(): MnemonicsByWordCount[] {
  return [
    {
      wordCount: 12,
      label: '12-word',
      type: 'standard',
      groups: [
        { shareLabel: 'one', id: 'count12_one' },
        { shareLabel: 'two', id: 'count12_two' },
        { shareLabel: 'three', id: 'count12_three' },
      ],
    },
    {
      wordCount: 18,
      label: '18-word',
      type: 'standard',
      groups: [
        { shareLabel: 'one', id: 'count18_one' },
        { shareLabel: 'two', id: 'count18_two' },
        { shareLabel: 'three', id: 'count18_three' },
      ],
    },
    {
      wordCount: 24,
      label: '24-word',
      type: 'standard',
      groups: [
        { shareLabel: 'one', id: 'count24_one' },
        { shareLabel: 'two', id: 'count24_two' },
        { shareLabel: 'three', id: 'count24_three' },
      ],
    },
    {
      wordCount: 20,
      label: 'SLIP39-20',
      type: 'slip39',
      groups: [
        { shareLabel: 'one', id: 'slip39_20_one' },
        { shareLabel: 'two', id: 'slip39_20_two' },
        { shareLabel: 'three', id: 'slip39_20_three' },
      ],
    },
    {
      wordCount: 33,
      label: 'SLIP39-33',
      type: 'slip39',
      groups: [
        { shareLabel: 'one', id: 'slip39_33_one' },
        { shareLabel: 'two', id: 'slip39_33_two' },
      ],
    },
  ];
}

/**
 * Get passphrase variants filtered by selected variant IDs
 */
export function getFilteredPassphraseVariants(
  mnemonicGroupId: MnemonicGroupId,
  selectedVariantIds: PassphraseVariantId[]
): PassphraseVariant[] {
  const allVariants = PASSPHRASE_VARIANTS[mnemonicGroupId] || [];
  return allVariants.filter((variant) =>
    selectedVariantIds.includes(variant.name as PassphraseVariantId)
  );
}

/**
 * Get available passphrase variant IDs for a mnemonic group
 */
export function getAvailablePassphraseVariantIds(mnemonicGroupId: MnemonicGroupId): PassphraseVariantId[] {
  const variants = PASSPHRASE_VARIANTS[mnemonicGroupId] || [];
  return variants.map((v) => v.name as PassphraseVariantId);
}

/**
 * All passphrase variant IDs
 */
export const ALL_PASSPHRASE_VARIANT_IDS: PassphraseVariantId[] = [
  'normal',
  'passphrase_empty',
  'passphrase_1',
  'passphrase_2',
];
