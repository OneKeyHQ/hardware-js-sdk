// SLIP39 utility functions and constants
import * as crypto from 'crypto';

/* eslint-disable no-bitwise, no-useless-constructor, no-empty-function, @typescript-eslint/no-non-null-assertion */

// Constants from slip39-js
const RADIX_BITS = 10;
const ID_BITS_LENGTH = 15;
const ITERATION_EXP_BITS_LENGTH = 4;
const EXTENDABLE_BACKUP_FLAG_BITS_LENGTH = 1;
const ITERATION_EXP_WORDS_LENGTH = Math.floor(
  (ID_BITS_LENGTH +
    EXTENDABLE_BACKUP_FLAG_BITS_LENGTH +
    ITERATION_EXP_BITS_LENGTH +
    RADIX_BITS -
    1) /
    RADIX_BITS
);
const MAX_ITERATION_EXP = 2 ** ITERATION_EXP_BITS_LENGTH;
const MAX_SHARE_COUNT = 16;
const CHECKSUM_WORDS_LENGTH = 3;
const DIGEST_LENGTH = 4;
const CUSTOMIZATION_STRING_NON_EXTENDABLE = 'shamir';
const CUSTOMIZATION_STRING_EXTENDABLE = 'shamir_extendable';
export const MIN_ENTROPY_BITS = 128;
const METADATA_WORDS_LENGTH = ITERATION_EXP_WORDS_LENGTH + 2 + CHECKSUM_WORDS_LENGTH;
const MNEMONICS_WORDS_LENGTH = Math.floor(
  METADATA_WORDS_LENGTH + (MIN_ENTROPY_BITS + RADIX_BITS - 1) / RADIX_BITS
);
const ITERATION_COUNT = 10000;
const ROUND_COUNT = 4;
const DIGEST_INDEX = 254;
const SECRET_INDEX = 255;
const BIGINT_WORD_BITS = BigInt(8);

// SLIP39 wordlist
export const WORD_LIST = [
  'academic',
  'acid',
  'acne',
  'acquire',
  'acrobat',
  'activity',
  'actress',
  'adapt',
  'adequate',
  'adjust',
  'admit',
  'adorn',
  'adult',
  'advance',
  'advocate',
  'afraid',
  'again',
  'agency',
  'agree',
  'aide',
  'aircraft',
  'airline',
  'airport',
  'ajar',
  'alarm',
  'album',
  'alcohol',
  'alien',
  'alive',
  'alpha',
  'already',
  'alto',
  'aluminum',
  'always',
  'amazing',
  'ambition',
  'amount',
  'amuse',
  'analysis',
  'anatomy',
  'ancestor',
  'ancient',
  'angel',
  'angry',
  'animal',
  'answer',
  'antenna',
  'anxiety',
  'apart',
  'aquatic',
  'arcade',
  'arena',
  'argue',
  'armed',
  'artist',
  'artwork',
  'aspect',
  'auction',
  'august',
  'aunt',
  'average',
  'aviation',
  'avoid',
  'award',
  'away',
  'axis',
  'axle',
  'beam',
  'beard',
  'beaver',
  'become',
  'bedroom',
  'behavior',
  'being',
  'believe',
  'belong',
  'benefit',
  'best',
  'beyond',
  'bike',
  'biology',
  'birthday',
  'bishop',
  'black',
  'blanket',
  'blessing',
  'blimp',
  'blind',
  'blue',
  'body',
  'bolt',
  'boring',
  'born',
  'both',
  'boundary',
  'bracelet',
  'branch',
  'brave',
  'breathe',
  'briefing',
  'broken',
  'brother',
  'browser',
  'bucket',
  'budget',
  'building',
  'bulb',
  'bulge',
  'bumpy',
  'bundle',
  'burden',
  'burning',
  'busy',
  'buyer',
  'cage',
  'calcium',
  'camera',
  'campus',
  'canyon',
  'capacity',
  'capital',
  'capture',
  'carbon',
  'cards',
  'careful',
  'cargo',
  'carpet',
  'carve',
  'category',
  'cause',
  'ceiling',
  'center',
  'ceramic',
  'champion',
  'change',
  'charity',
  'check',
  'chemical',
  'chest',
  'chew',
  'chubby',
  'cinema',
  'civil',
  'class',
  'clay',
  'cleanup',
  'client',
  'climate',
  'clinic',
  'clock',
  'clogs',
  'closet',
  'clothes',
  'club',
  'cluster',
  'coal',
  'coastal',
  'coding',
  'column',
  'company',
  'corner',
  'costume',
  'counter',
  'course',
  'cover',
  'cowboy',
  'cradle',
  'craft',
  'crazy',
  'credit',
  'cricket',
  'criminal',
  'crisis',
  'critical',
  'crowd',
  'crucial',
  'crunch',
  'crush',
  'crystal',
  'cubic',
  'cultural',
  'curious',
  'curly',
  'custody',
  'cylinder',
  'daisy',
  'damage',
  'dance',
  'darkness',
  'database',
  'daughter',
  'deadline',
  'deal',
  'debris',
  'debut',
  'decent',
  'decision',
  'declare',
  'decorate',
  'decrease',
  'deliver',
  'demand',
  'density',
  'deny',
  'depart',
  'depend',
  'depict',
  'deploy',
  'describe',
  'desert',
  'desire',
  'desktop',
  'destroy',
  'detailed',
  'detect',
  'device',
  'devote',
  'diagnose',
  'dictate',
  'diet',
  'dilemma',
  'diminish',
  'dining',
  'diploma',
  'disaster',
  'discuss',
  'disease',
  'dish',
  'dismiss',
  'display',
  'distance',
  'dive',
  'divorce',
  'document',
  'domain',
  'domestic',
  'dominant',
  'dough',
  'downtown',
  'dragon',
  'dramatic',
  'dream',
  'dress',
  'drift',
  'drink',
  'drove',
  'drug',
  'dryer',
  'duckling',
  'duke',
  'duration',
  'dwarf',
  'dynamic',
  'early',
  'earth',
  'easel',
  'easy',
  'echo',
  'eclipse',
  'ecology',
  'edge',
  'editor',
  'educate',
  'either',
  'elbow',
  'elder',
  'election',
  'elegant',
  'element',
  'elephant',
  'elevator',
  'elite',
  'else',
  'email',
  'emerald',
  'emission',
  'emperor',
  'emphasis',
  'employer',
  'empty',
  'ending',
  'endless',
  'endorse',
  'enemy',
  'energy',
  'enforce',
  'engage',
  'enjoy',
  'enlarge',
  'entrance',
  'envelope',
  'envy',
  'epidemic',
  'episode',
  'equation',
  'equip',
  'eraser',
  'erode',
  'escape',
  'estate',
  'estimate',
  'evaluate',
  'evening',
  'evidence',
  'evil',
  'evoke',
  'exact',
  'example',
  'exceed',
  'exchange',
  'exclude',
  'excuse',
  'execute',
  'exercise',
  'exhaust',
  'exotic',
  'expand',
  'expect',
  'explain',
  'express',
  'extend',
  'extra',
  'eyebrow',
  'facility',
  'fact',
  'failure',
  'faint',
  'fake',
  'false',
  'family',
  'famous',
  'fancy',
  'fangs',
  'fantasy',
  'fatal',
  'fatigue',
  'favorite',
  'fawn',
  'fiber',
  'fiction',
  'filter',
  'finance',
  'findings',
  'finger',
  'firefly',
  'firm',
  'fiscal',
  'fishing',
  'fitness',
  'flame',
  'flash',
  'flavor',
  'flea',
  'flexible',
  'flip',
  'float',
  'floral',
  'fluff',
  'focus',
  'forbid',
  'force',
  'forecast',
  'forget',
  'formal',
  'fortune',
  'forward',
  'founder',
  'fraction',
  'fragment',
  'frequent',
  'freshman',
  'friar',
  'fridge',
  'friendly',
  'frost',
  'froth',
  'frozen',
  'fumes',
  'funding',
  'furl',
  'fused',
  'galaxy',
  'game',
  'garbage',
  'garden',
  'garlic',
  'gasoline',
  'gather',
  'general',
  'genius',
  'genre',
  'genuine',
  'geology',
  'gesture',
  'glad',
  'glance',
  'glasses',
  'glen',
  'glimpse',
  'goat',
  'golden',
  'graduate',
  'grant',
  'grasp',
  'gravity',
  'gray',
  'greatest',
  'grief',
  'grill',
  'grin',
  'grocery',
  'gross',
  'group',
  'grownup',
  'grumpy',
  'guard',
  'guest',
  'guilt',
  'guitar',
  'gums',
  'hairy',
  'hamster',
  'hand',
  'hanger',
  'harvest',
  'have',
  'havoc',
  'hawk',
  'hazard',
  'headset',
  'health',
  'hearing',
  'heat',
  'helpful',
  'herald',
  'herd',
  'hesitate',
  'hobo',
  'holiday',
  'holy',
  'home',
  'hormone',
  'hospital',
  'hour',
  'huge',
  'human',
  'humidity',
  'hunting',
  'husband',
  'hush',
  'husky',
  'hybrid',
  'idea',
  'identify',
  'idle',
  'image',
  'impact',
  'imply',
  'improve',
  'impulse',
  'include',
  'income',
  'increase',
  'index',
  'indicate',
  'industry',
  'infant',
  'inform',
  'inherit',
  'injury',
  'inmate',
  'insect',
  'inside',
  'install',
  'intend',
  'intimate',
  'invasion',
  'involve',
  'iris',
  'island',
  'isolate',
  'item',
  'ivory',
  'jacket',
  'jerky',
  'jewelry',
  'join',
  'judicial',
  'juice',
  'jump',
  'junction',
  'junior',
  'junk',
  'jury',
  'justice',
  'kernel',
  'keyboard',
  'kidney',
  'kind',
  'kitchen',
  'knife',
  'knit',
  'laden',
  'ladle',
  'ladybug',
  'lair',
  'lamp',
  'language',
  'large',
  'laser',
  'laundry',
  'lawsuit',
  'leader',
  'leaf',
  'learn',
  'leaves',
  'lecture',
  'legal',
  'legend',
  'legs',
  'lend',
  'length',
  'level',
  'liberty',
  'library',
  'license',
  'lift',
  'likely',
  'lilac',
  'lily',
  'lips',
  'liquid',
  'listen',
  'literary',
  'living',
  'lizard',
  'loan',
  'lobe',
  'location',
  'losing',
  'loud',
  'loyalty',
  'luck',
  'lunar',
  'lunch',
  'lungs',
  'luxury',
  'lying',
  'lyrics',
  'machine',
  'magazine',
  'maiden',
  'mailman',
  'main',
  'makeup',
  'making',
  'mama',
  'manager',
  'mandate',
  'mansion',
  'manual',
  'marathon',
  'march',
  'market',
  'marvel',
  'mason',
  'material',
  'math',
  'maximum',
  'mayor',
  'meaning',
  'medal',
  'medical',
  'member',
  'memory',
  'mental',
  'merchant',
  'merit',
  'method',
  'metric',
  'midst',
  'mild',
  'military',
  'mineral',
  'minister',
  'miracle',
  'mixed',
  'mixture',
  'mobile',
  'modern',
  'modify',
  'moisture',
  'moment',
  'morning',
  'mortgage',
  'mother',
  'mountain',
  'mouse',
  'move',
  'much',
  'mule',
  'multiple',
  'muscle',
  'museum',
  'music',
  'mustang',
  'nail',
  'national',
  'necklace',
  'negative',
  'nervous',
  'network',
  'news',
  'nuclear',
  'numb',
  'numerous',
  'nylon',
  'oasis',
  'obesity',
  'object',
  'observe',
  'obtain',
  'ocean',
  'often',
  'olympic',
  'omit',
  'oral',
  'orange',
  'orbit',
  'order',
  'ordinary',
  'organize',
  'ounce',
  'oven',
  'overall',
  'owner',
  'paces',
  'pacific',
  'package',
  'paid',
  'painting',
  'pajamas',
  'pancake',
  'pants',
  'papa',
  'paper',
  'parcel',
  'parking',
  'party',
  'patent',
  'patrol',
  'payment',
  'payroll',
  'peaceful',
  'peanut',
  'peasant',
  'pecan',
  'penalty',
  'pencil',
  'percent',
  'perfect',
  'permit',
  'petition',
  'phantom',
  'pharmacy',
  'photo',
  'phrase',
  'physics',
  'pickup',
  'picture',
  'piece',
  'pile',
  'pink',
  'pipeline',
  'pistol',
  'pitch',
  'plains',
  'plan',
  'plastic',
  'platform',
  'playoff',
  'pleasure',
  'plot',
  'plunge',
  'practice',
  'prayer',
  'preach',
  'predator',
  'pregnant',
  'premium',
  'prepare',
  'presence',
  'prevent',
  'priest',
  'primary',
  'priority',
  'prisoner',
  'privacy',
  'prize',
  'problem',
  'process',
  'profile',
  'program',
  'promise',
  'prospect',
  'provide',
  'prune',
  'public',
  'pulse',
  'pumps',
  'punish',
  'puny',
  'pupal',
  'purchase',
  'purple',
  'python',
  'quantity',
  'quarter',
  'quick',
  'quiet',
  'race',
  'racism',
  'radar',
  'railroad',
  'rainbow',
  'raisin',
  'random',
  'ranked',
  'rapids',
  'raspy',
  'reaction',
  'realize',
  'rebound',
  'rebuild',
  'recall',
  'receiver',
  'recover',
  'regret',
  'regular',
  'reject',
  'relate',
  'remember',
  'remind',
  'remove',
  'render',
  'repair',
  'repeat',
  'replace',
  'require',
  'rescue',
  'research',
  'resident',
  'response',
  'result',
  'retailer',
  'retreat',
  'reunion',
  'revenue',
  'review',
  'reward',
  'rhyme',
  'rhythm',
  'rich',
  'rival',
  'river',
  'robin',
  'rocky',
  'romantic',
  'romp',
  'roster',
  'round',
  'royal',
  'ruin',
  'ruler',
  'rumor',
  'sack',
  'safari',
  'salary',
  'salon',
  'salt',
  'satisfy',
  'satoshi',
  'saver',
  'says',
  'scandal',
  'scared',
  'scatter',
  'scene',
  'scholar',
  'science',
  'scout',
  'scramble',
  'screw',
  'script',
  'scroll',
  'seafood',
  'season',
  'secret',
  'security',
  'segment',
  'senior',
  'shadow',
  'shaft',
  'shame',
  'shaped',
  'sharp',
  'shelter',
  'sheriff',
  'short',
  'should',
  'shrimp',
  'sidewalk',
  'silent',
  'silver',
  'similar',
  'simple',
  'single',
  'sister',
  'skin',
  'skunk',
  'slap',
  'slavery',
  'sled',
  'slice',
  'slim',
  'slow',
  'slush',
  'smart',
  'smear',
  'smell',
  'smirk',
  'smith',
  'smoking',
  'smug',
  'snake',
  'snapshot',
  'sniff',
  'society',
  'software',
  'soldier',
  'solution',
  'soul',
  'source',
  'space',
  'spark',
  'speak',
  'species',
  'spelling',
  'spend',
  'spew',
  'spider',
  'spill',
  'spine',
  'spirit',
  'spit',
  'spray',
  'sprinkle',
  'square',
  'squeeze',
  'stadium',
  'staff',
  'standard',
  'starting',
  'station',
  'stay',
  'steady',
  'step',
  'stick',
  'stilt',
  'story',
  'strategy',
  'strike',
  'style',
  'subject',
  'submit',
  'sugar',
  'suitable',
  'sunlight',
  'superior',
  'surface',
  'surprise',
  'survive',
  'sweater',
  'swimming',
  'swing',
  'switch',
  'symbolic',
  'sympathy',
  'syndrome',
  'system',
  'tackle',
  'tactics',
  'tadpole',
  'talent',
  'task',
  'taste',
  'taught',
  'taxi',
  'teacher',
  'teammate',
  'teaspoon',
  'temple',
  'tenant',
  'tendency',
  'tension',
  'terminal',
  'testify',
  'texture',
  'thank',
  'that',
  'theater',
  'theory',
  'therapy',
  'thorn',
  'threaten',
  'thumb',
  'thunder',
  'ticket',
  'tidy',
  'timber',
  'timely',
  'ting',
  'tofu',
  'together',
  'tolerate',
  'total',
  'toxic',
  'tracks',
  'traffic',
  'training',
  'transfer',
  'trash',
  'traveler',
  'treat',
  'trend',
  'trial',
  'tricycle',
  'trip',
  'triumph',
  'trouble',
  'true',
  'trust',
  'twice',
  'twin',
  'type',
  'typical',
  'ugly',
  'ultimate',
  'umbrella',
  'uncover',
  'undergo',
  'unfair',
  'unfold',
  'unhappy',
  'union',
  'universe',
  'unkind',
  'unknown',
  'unusual',
  'unwrap',
  'upgrade',
  'upstairs',
  'username',
  'usher',
  'usual',
  'valid',
  'valuable',
  'vampire',
  'vanish',
  'various',
  'vegan',
  'velvet',
  'venture',
  'verdict',
  'verify',
  'very',
  'veteran',
  'vexed',
  'victim',
  'video',
  'view',
  'vintage',
  'violence',
  'viral',
  'visitor',
  'visual',
  'vitamins',
  'vocal',
  'voice',
  'volume',
  'voter',
  'voting',
  'walnut',
  'warmth',
  'warn',
  'watch',
  'wavy',
  'wealthy',
  'weapon',
  'webcam',
  'welcome',
  'welfare',
  'western',
  'width',
  'wildlife',
  'window',
  'wine',
  'wireless',
  'wisdom',
  'withdraw',
  'wits',
  'wolf',
  'woman',
  'work',
  'worthy',
  'wrap',
  'wrist',
  'writing',
  'wrote',
  'year',
  'yelp',
  'yield',
  'yoga',
  'zero',
];

const WORD_LIST_MAP = WORD_LIST.reduce((obj, val, idx) => {
  obj[val] = idx;
  return obj;
}, {} as Record<string, number>);

// Precomputed exponent and log tables for GF(256)
const EXP_TABLE = [
  1, 3, 5, 15, 17, 51, 85, 255, 26, 46, 114, 150, 161, 248, 19, 53, 95, 225, 56, 72, 216, 115, 149,
  164, 247, 2, 6, 10, 30, 34, 102, 170, 229, 52, 92, 228, 55, 89, 235, 38, 106, 190, 217, 112, 144,
  171, 230, 49, 83, 245, 4, 12, 20, 60, 68, 204, 79, 209, 104, 184, 211, 110, 178, 205, 76, 212,
  103, 169, 224, 59, 77, 215, 98, 166, 241, 8, 24, 40, 120, 136, 131, 158, 185, 208, 107, 189, 220,
  127, 129, 152, 179, 206, 73, 219, 118, 154, 181, 196, 87, 249, 16, 48, 80, 240, 11, 29, 39, 105,
  187, 214, 97, 163, 254, 25, 43, 125, 135, 146, 173, 236, 47, 113, 147, 174, 233, 32, 96, 160, 251,
  22, 58, 78, 210, 109, 183, 194, 93, 231, 50, 86, 250, 21, 63, 65, 195, 94, 226, 61, 71, 201, 64,
  192, 91, 237, 44, 116, 156, 191, 218, 117, 159, 186, 213, 100, 172, 239, 42, 126, 130, 157, 188,
  223, 122, 142, 137, 128, 155, 182, 193, 88, 232, 35, 101, 175, 234, 37, 111, 177, 200, 67, 197,
  84, 252, 31, 33, 99, 165, 244, 7, 9, 27, 45, 119, 153, 176, 203, 70, 202, 69, 207, 74, 222, 121,
  139, 134, 145, 168, 227, 62, 66, 198, 81, 243, 14, 18, 54, 90, 238, 41, 123, 141, 140, 143, 138,
  133, 148, 167, 242, 13, 23, 57, 75, 221, 124, 132, 151, 162, 253, 28, 36, 108, 180, 199, 82, 246,
];

const LOG_TABLE = [
  0, 0, 25, 1, 50, 2, 26, 198, 75, 199, 27, 104, 51, 238, 223, 3, 100, 4, 224, 14, 52, 141, 129,
  239, 76, 113, 8, 200, 248, 105, 28, 193, 125, 194, 29, 181, 249, 185, 39, 106, 77, 228, 166, 114,
  154, 201, 9, 120, 101, 47, 138, 5, 33, 15, 225, 36, 18, 240, 130, 69, 53, 147, 218, 142, 150, 143,
  219, 189, 54, 208, 206, 148, 19, 92, 210, 241, 64, 70, 131, 56, 102, 221, 253, 48, 191, 6, 139,
  98, 179, 37, 226, 152, 34, 136, 145, 16, 126, 110, 72, 195, 163, 182, 30, 66, 58, 107, 40, 84,
  250, 133, 61, 186, 43, 121, 10, 21, 155, 159, 94, 202, 78, 212, 172, 229, 243, 115, 167, 87, 175,
  88, 168, 80, 244, 234, 214, 116, 79, 174, 233, 213, 231, 230, 173, 232, 44, 215, 117, 122, 235,
  22, 11, 245, 89, 203, 95, 176, 156, 169, 81, 160, 127, 12, 246, 111, 23, 196, 73, 236, 216, 67,
  31, 45, 164, 118, 123, 183, 204, 187, 62, 90, 251, 96, 177, 134, 59, 82, 161, 108, 170, 85, 41,
  157, 151, 178, 135, 144, 97, 190, 220, 252, 188, 149, 207, 205, 55, 63, 91, 209, 83, 57, 132, 60,
  65, 162, 109, 71, 20, 42, 158, 93, 86, 242, 211, 171, 68, 17, 146, 217, 35, 32, 46, 137, 180, 124,
  184, 38, 119, 153, 227, 165, 103, 74, 237, 222, 197, 49, 254, 24, 13, 99, 140, 128, 192, 247, 112,
  7,
];

// Utility functions
function stringToBytes(str: string): number[] {
  const bytes = [];
  for (let i = 0; i < str.length; ++i) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}

function bytesToString(bytes: number[]): string {
  return bytes.map(byte => String.fromCharCode(byte)).join('');
}

function decodeBigInt(bytes: number[]): bigint {
  let result = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    const b = BigInt(bytes[bytes.length - i - 1]);
    // eslint-disable-next-line no-bitwise
    result += b << (BIGINT_WORD_BITS * BigInt(i));
  }
  return result;
}

function encodeBigInt(number: bigint, paddedLength = 0): number[] {
  let num = number;
  const BYTE_MASK = BigInt(0xff);
  const BIGINT_ZERO = BigInt(0);
  const result = [];

  while (num > BIGINT_ZERO) {
    // eslint-disable-next-line no-bitwise
    const i = Number(num & BYTE_MASK);
    result.unshift(i);
    // eslint-disable-next-line no-bitwise
    num >>= BIGINT_WORD_BITS;
  }

  // Zero padding to the length
  for (let i = result.length; i < paddedLength; i++) {
    result.unshift(0);
  }

  if (paddedLength !== 0 && result.length > paddedLength) {
    throw new Error(
      `Error in encoding BigInt value, expected less than ${paddedLength} length value, got ${result.length}`
    );
  }

  return result;
}

export function bitsToBytes(n: number): number {
  return Math.floor((n + 7) / 8);
}

function bitsToWords(n: number): number {
  return Math.floor((n + RADIX_BITS - 1) / RADIX_BITS);
}

function randomBytes(length = 32): number[] {
  const randoms = crypto.randomBytes(length);
  return Array.prototype.slice.call(randoms, 0);
}

export function generateIdentifier(): number[] {
  const byteCount = bitsToBytes(ID_BITS_LENGTH);
  const bits = ID_BITS_LENGTH % 8;
  const identifier = randomBytes(byteCount);
  // eslint-disable-next-line no-bitwise
  identifier[0] &= (1 << bits) - 1;
  return identifier;
}

function xor(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error(
      `Invalid padding in mnemonic or insufficient length of mnemonics (${a.length} or ${b.length})`
    );
  }
  // eslint-disable-next-line no-bitwise
  return a.map((val, i) => val ^ b[i]);
}

function getSalt(identifier: number[], extendableBackupFlag: number): number[] {
  if (extendableBackupFlag) {
    return [];
  }
  const salt = stringToBytes(CUSTOMIZATION_STRING_NON_EXTENDABLE);
  return salt.concat(identifier);
}

function roundFunction(
  round: number,
  passphrase: number[],
  exp: number,
  salt: number[],
  secret: number[]
): number[] {
  const saltedSecret = salt.concat(secret);
  const roundedPhrase = [round].concat(passphrase);
  // eslint-disable-next-line no-bitwise
  const count = (ITERATION_COUNT << exp) / ROUND_COUNT;

  const key = crypto.pbkdf2Sync(
    Buffer.from(roundedPhrase) as any,
    Buffer.from(saltedSecret) as any,
    count,
    secret.length,
    'sha256'
  );
  return Array.prototype.slice.call(key, 0);
}

export function crypt(
  masterSecret: number[],
  passphrase: string,
  iterationExponent: number,
  identifier: number[],
  extendableBackupFlag: number,
  encrypt = true
): number[] {
  if (iterationExponent < 0 || iterationExponent > MAX_ITERATION_EXP) {
    throw Error(
      `Invalid iteration exponent (${iterationExponent}). Expected between 0 and ${MAX_ITERATION_EXP}`
    );
  }

  let IL = masterSecret.slice(0, masterSecret.length / 2);
  let IR = masterSecret.slice(masterSecret.length / 2);

  const pwd = stringToBytes(passphrase);
  const salt = getSalt(identifier, extendableBackupFlag);

  const range = Array.from({ length: ROUND_COUNT }, (_, i) => i);
  const rounds = encrypt ? range : range.reverse();

  for (const round of rounds) {
    const f = roundFunction(round, pwd, iterationExponent, salt, IR);
    const t = xor(IL, f);
    IL = IR;
    IR = t;
  }

  return IR.concat(IL);
}

function createDigest(randomData: number[], sharedSecret: number[]): number[] {
  const hmac = crypto.createHmac('sha256', Buffer.from(randomData) as any);
  hmac.update(Buffer.from(sharedSecret) as any);
  const result = hmac.digest();
  return Array.prototype.slice.call(result.slice(0, 4), 0);
}

function interpolate(shares: Map<number, number[]>, x: number): number[] {
  const xCoord = new Set(shares.keys());
  const sharesValueLengths = new Set(Array.from(shares.values()).map(v => v.length));

  if (sharesValueLengths.size !== 1) {
    throw new Error('Invalid set of shares. All share values must have the same length.');
  }

  if (xCoord.has(x)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return shares.get(x)!;
  }

  // Logarithm of the product of (x_i - x) for i = 1, ... , k.
  let logProd = 0;
  shares.forEach((_, k) => {
    // eslint-disable-next-line no-bitwise
    logProd += LOG_TABLE[k ^ x];
  });

  const valueLength = Array.from(sharesValueLengths)[0];
  const results = new Array(valueLength).fill(0);

  shares.forEach((v, k) => {
    // The logarithm of the Lagrange basis polynomial evaluated at x.
    let sum = 0;
    shares.forEach((_, kk) => {
      // eslint-disable-next-line no-bitwise
      sum += LOG_TABLE[k ^ kk];
    });

    // eslint-disable-next-line no-bitwise
    const basis = (logProd - LOG_TABLE[k ^ x] - sum) % 255;
    const logBasisEval = basis < 0 ? 255 + basis : basis;

    v.forEach((item, idx) => {
      const shareVal = item;
      const intermediateSum = results[idx];
      const r = shareVal !== 0 ? EXP_TABLE[(LOG_TABLE[shareVal] + logBasisEval) % 255] : 0;
      // eslint-disable-next-line no-bitwise
      results[idx] = intermediateSum ^ r;
    });
  });

  return results;
}

export function splitSecret(
  threshold: number,
  shareCount: number,
  sharedSecret: number[]
): number[][] {
  if (threshold <= 0) {
    throw Error(`The requested threshold (${threshold}) must be a positive integer.`);
  }

  if (threshold > shareCount) {
    throw Error(
      `The requested threshold (${threshold}) must not exceed the number of shares (${shareCount}).`
    );
  }

  if (shareCount > MAX_SHARE_COUNT) {
    throw Error(
      `The requested number of shares (${shareCount}) must not exceed ${MAX_SHARE_COUNT}.`
    );
  }

  // If the threshold is 1, then the digest of the shared secret is not used.
  if (threshold === 1) {
    return Array.from({ length: shareCount }, () => sharedSecret);
  }

  const randomShareCount = threshold - 2;
  const randomPart = randomBytes(sharedSecret.length - DIGEST_LENGTH);
  const digest = createDigest(randomPart, sharedSecret);

  const baseShares = new Map<number, number[]>();
  const shares = [];

  if (randomShareCount) {
    for (let i = 0; i < randomShareCount; i++) {
      const randomShare = randomBytes(sharedSecret.length);
      shares.push(randomShare);
      baseShares.set(i, randomShare);
    }
  }

  baseShares.set(DIGEST_INDEX, digest.concat(randomPart));
  baseShares.set(SECRET_INDEX, sharedSecret);

  for (let i = randomShareCount; i < shareCount; i++) {
    const rr = interpolate(baseShares, i);
    shares.push(rr);
  }

  return shares;
}

function recoverSecret(threshold: number, shares: Map<number, number[]>): number[] {
  // If the threshold is 1, then the digest of the shared secret is not used.
  if (threshold === 1) {
    return Array.from(shares.values())[0];
  }

  const sharedSecret = interpolate(shares, SECRET_INDEX);
  const digestShare = interpolate(shares, DIGEST_INDEX);
  const digest = digestShare.slice(0, DIGEST_LENGTH);
  const randomPart = digestShare.slice(DIGEST_LENGTH);

  const recoveredDigest = createDigest(randomPart, sharedSecret);
  if (!digest.every((val, i) => val === recoveredDigest[i])) {
    throw new Error('Invalid digest of the shared secret.');
  }
  return sharedSecret;
}

function rs1024Polymod(data: number[]): number {
  const GEN = [
    0xe0e040, 0x1c1c080, 0x3838100, 0x7070200, 0xe0e0009, 0x1c0c2412, 0x38086c24, 0x3090fc48,
    0x21b1f890, 0x3f3f120,
  ];
  let chk = 1;

  data.forEach(byte => {
    // eslint-disable-next-line no-bitwise
    const b = chk >> 20;
    // eslint-disable-next-line no-bitwise
    chk = ((chk & 0xfffff) << 10) ^ byte;

    for (let i = 0; i < 10; i++) {
      // eslint-disable-next-line no-bitwise
      const gen = ((b >> i) & 1) !== 0 ? GEN[i] : 0;
      // eslint-disable-next-line no-bitwise
      chk ^= gen;
    }
  });

  return chk;
}

function getCustomizationString(extendableBackupFlag: number): string {
  return extendableBackupFlag
    ? CUSTOMIZATION_STRING_EXTENDABLE
    : CUSTOMIZATION_STRING_NON_EXTENDABLE;
}

function rs1024CreateChecksum(data: number[], extendableBackupFlag: number): number[] {
  const values = stringToBytes(getCustomizationString(extendableBackupFlag))
    .concat(data)
    .concat(new Array(CHECKSUM_WORDS_LENGTH).fill(0));
  // eslint-disable-next-line no-bitwise
  const polymod = rs1024Polymod(values) ^ 1;
  const result = [];
  for (let i = 0; i < CHECKSUM_WORDS_LENGTH; i++) {
    // eslint-disable-next-line no-bitwise
    result.push((polymod >> (10 * i)) & 1023);
  }
  return result.reverse();
}

function rs1024VerifyChecksum(data: number[], extendableBackupFlag: number): boolean {
  return (
    rs1024Polymod(stringToBytes(getCustomizationString(extendableBackupFlag)).concat(data)) === 1
  );
}

function intFromIndices(indices: number[]): bigint {
  let value = BigInt(0);
  const radix = BigInt(2 ** RADIX_BITS);
  indices.forEach(index => {
    value = value * radix + BigInt(index);
  });
  return value;
}

function intToIndices(value: bigint, length: number, bits: number): number[] {
  // eslint-disable-next-line no-bitwise
  const mask = BigInt((1 << bits) - 1);
  const result = [];
  for (let i = 0; i < length; i++) {
    // eslint-disable-next-line no-bitwise
    result.push(Number((value >> (BigInt(i) * BigInt(bits))) & mask));
  }
  return result.reverse();
}

function mnemonicFromIndices(indices: number[]): string {
  return indices.map(index => WORD_LIST[index]).join(' ');
}

function mnemonicToIndices(mnemonic: string): number[] {
  if (typeof mnemonic !== 'string') {
    throw new Error(
      `Mnemonic expected to be typeof string with white space separated words. Instead found typeof ${typeof mnemonic}.`
    );
  }

  const words = mnemonic.toLowerCase().split(' ');
  const result = [];
  for (const word of words) {
    const index = WORD_LIST_MAP[word];
    if (typeof index === 'undefined') {
      throw new Error(`Invalid mnemonic word ${word}.`);
    }
    result.push(index);
  }
  return result;
}

function groupPrefix(
  identifier: number,
  extendableBackupFlag: number,
  iterationExponent: number,
  groupIndex: number,
  groupThreshold: number,
  groupCount: number
): number[] {
  // eslint-disable-next-line no-bitwise
  const idExpInt = BigInt(
    (identifier << (ITERATION_EXP_BITS_LENGTH + EXTENDABLE_BACKUP_FLAG_BITS_LENGTH)) +
      (extendableBackupFlag << ITERATION_EXP_BITS_LENGTH) +
      iterationExponent
  );

  const indices = intToIndices(idExpInt, ITERATION_EXP_WORDS_LENGTH, RADIX_BITS);
  // eslint-disable-next-line no-bitwise
  const index2 = (groupIndex << 6) + ((groupThreshold - 1) << 2) + ((groupCount - 1) >> 2);
  indices.push(index2);
  return indices;
}

export function encodeMnemonic(
  identifier: number[],
  extendableBackupFlag: number,
  iterationExponent: number,
  groupIndex: number,
  groupThreshold: number,
  groupCount: number,
  memberIndex: number,
  memberThreshold: number,
  value: number[]
): string {
  const valueWordCount = bitsToWords(value.length * 8);
  const valueInt = decodeBigInt(value);
  const newIdentifier = Number(decodeBigInt(identifier));

  const gp = groupPrefix(
    newIdentifier,
    extendableBackupFlag,
    iterationExponent,
    groupIndex,
    groupThreshold,
    groupCount
  );

  const tp = intToIndices(valueInt, valueWordCount, RADIX_BITS);
  // eslint-disable-next-line no-bitwise
  const calc = (((groupCount - 1) & 3) << 8) + (memberIndex << 4) + (memberThreshold - 1);
  gp.push(calc);
  const shareData = gp.concat(tp);

  const checksum = rs1024CreateChecksum(shareData, extendableBackupFlag);
  return mnemonicFromIndices(shareData.concat(checksum));
}

function decodeMnemonic(mnemonic: string) {
  const data = mnemonicToIndices(mnemonic);

  if (data.length < MNEMONICS_WORDS_LENGTH) {
    throw new Error(
      `Invalid mnemonic length. The length of each mnemonic must be at least ${MNEMONICS_WORDS_LENGTH} words.`
    );
  }

  const paddingLen = (RADIX_BITS * (data.length - METADATA_WORDS_LENGTH)) % 16;
  if (paddingLen > 8) {
    throw new Error('Invalid mnemonic length.');
  }

  const idExpExtInt = Number(intFromIndices(data.slice(0, ITERATION_EXP_WORDS_LENGTH)));
  // eslint-disable-next-line no-bitwise
  const identifier =
    idExpExtInt >> (ITERATION_EXP_BITS_LENGTH + EXTENDABLE_BACKUP_FLAG_BITS_LENGTH);
  // eslint-disable-next-line no-bitwise
  const extendableBackupFlag =
    (idExpExtInt >> ITERATION_EXP_BITS_LENGTH) & ((1 << EXTENDABLE_BACKUP_FLAG_BITS_LENGTH) - 1);
  // eslint-disable-next-line no-bitwise
  const iterationExponent = idExpExtInt & ((1 << ITERATION_EXP_BITS_LENGTH) - 1);

  if (!rs1024VerifyChecksum(data, extendableBackupFlag)) {
    throw new Error('Invalid mnemonic checksum');
  }

  const tmp = intFromIndices(
    data.slice(ITERATION_EXP_WORDS_LENGTH, ITERATION_EXP_WORDS_LENGTH + 2)
  );
  const indices = intToIndices(tmp, 5, 4);

  const groupIndex = indices[0];
  const groupThreshold = indices[1];
  const groupCount = indices[2];
  const memberIndex = indices[3];
  const memberThreshold = indices[4];

  const valueData = data.slice(ITERATION_EXP_WORDS_LENGTH + 2, data.length - CHECKSUM_WORDS_LENGTH);

  if (groupCount < groupThreshold) {
    throw new Error(
      `Invalid mnemonic: ${mnemonic}.\n Group threshold (${groupThreshold}) cannot be greater than group count (${groupCount}).`
    );
  }

  const valueInt = intFromIndices(valueData);

  try {
    const valueByteCount = bitsToBytes(RADIX_BITS * valueData.length - paddingLen);
    const share = encodeBigInt(valueInt, valueByteCount);

    return {
      identifier,
      extendableBackupFlag,
      iterationExponent,
      groupIndex,
      groupThreshold: groupThreshold + 1,
      groupCount: groupCount + 1,
      memberIndex,
      memberThreshold: memberThreshold + 1,
      share,
    };
  } catch (e) {
    throw new Error(`Invalid mnemonic padding (${e})`);
  }
}

// Helper functions for combining mnemonics
export function combineMnemonics(mnemonics: string[], passphrase = ''): number[] {
  if (!mnemonics || mnemonics.length === 0) {
    throw new Error('The list of mnemonics is empty.');
  }

  const decoded = decodeMnemonics(mnemonics);
  const {
    identifier,
    extendableBackupFlag,
    iterationExponent,
    groupThreshold,
    groupCount,
    groups,
  } = decoded;

  if (groups.size < groupThreshold) {
    throw new Error(
      `Insufficient number of mnemonic groups (${groups.size}). The required number of groups is ${groupThreshold}.`
    );
  }

  if (groups.size !== groupThreshold) {
    throw new Error(
      `Wrong number of mnemonic groups. Expected ${groupThreshold} groups, but ${groups.size} were provided.`
    );
  }

  const allShares = new Map<number, number[]>();
  groups.forEach((members, groupIndex) => {
    const threshold = Array.from(members.keys())[0];
    const shares = Array.from(members.values())[0];
    if (shares.size !== threshold) {
      const prefix = groupPrefix(
        identifier,
        extendableBackupFlag,
        iterationExponent,
        groupIndex,
        groupThreshold,
        groupCount
      );
      throw new Error(
        `Wrong number of mnemonics. Expected ${threshold} mnemonics starting with "${mnemonicFromIndices(
          prefix
        )}", but ${shares.size} were provided.`
      );
    }

    const recovered = recoverSecret(threshold, shares);
    allShares.set(groupIndex, recovered);
  });

  const ems = recoverSecret(groupThreshold, allShares);
  const id = intToIndices(BigInt(identifier), ITERATION_EXP_WORDS_LENGTH, 8);
  const ms = crypt(ems, passphrase, iterationExponent, id, extendableBackupFlag, false);

  return ms;
}

function decodeMnemonics(mnemonics: string[]) {
  if (!Array.isArray(mnemonics)) {
    throw new Error('Mnemonics should be an array of strings');
  }

  const identifiers = new Set<number>();
  const extendableBackupFlags = new Set<number>();
  const iterationExponents = new Set<number>();
  const groupThresholds = new Set<number>();
  const groupCounts = new Set<number>();
  const groups = new Map<number, Map<number, Map<number, number[]>>>();

  mnemonics.forEach(mnemonic => {
    const decoded = decodeMnemonic(mnemonic);

    identifiers.add(decoded.identifier);
    extendableBackupFlags.add(decoded.extendableBackupFlag);
    iterationExponents.add(decoded.iterationExponent);
    const { groupIndex } = decoded;
    groupThresholds.add(decoded.groupThreshold);
    groupCounts.add(decoded.groupCount);
    const { memberIndex } = decoded;
    const { memberThreshold } = decoded;
    const { share } = decoded;

    const group = groups.get(groupIndex) || new Map();
    const member = group.get(memberThreshold) || new Map();
    member.set(memberIndex, share);
    group.set(memberThreshold, member);
    if (group.size !== 1) {
      throw new Error(
        'Invalid set of mnemonics. All mnemonics in a group must have the same member threshold.'
      );
    }
    groups.set(groupIndex, group);
  });

  if (identifiers.size !== 1 || extendableBackupFlags.size !== 1 || iterationExponents.size !== 1) {
    throw new Error(
      `Invalid set of mnemonics. All mnemonics must begin with the same ${ITERATION_EXP_WORDS_LENGTH} words.`
    );
  }

  if (groupThresholds.size !== 1) {
    throw new Error('Invalid set of mnemonics. All mnemonics must have the same group threshold.');
  }

  if (groupCounts.size !== 1) {
    throw new Error('Invalid set of mnemonics. All mnemonics must have the same group count.');
  }

  return {
    identifier: Array.from(identifiers)[0],
    extendableBackupFlag: Array.from(extendableBackupFlags)[0],
    iterationExponent: Array.from(iterationExponents)[0],
    groupThreshold: Array.from(groupThresholds)[0],
    groupCount: Array.from(groupCounts)[0],
    groups,
  };
}

export function validateMnemonic(mnemonic: string): boolean {
  try {
    decodeMnemonic(mnemonic);
    return true;
  } catch (error) {
    return false;
  }
}

// Export functions
export { stringToBytes, bytesToString };
