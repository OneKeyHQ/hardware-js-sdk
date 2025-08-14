#!/usr/bin/env tsx

/**
 * 统一的 SLIP39 测试数据生成脚本
 * 支持同时生成地址和公钥测试数据
 * 用法: npx tsx generateUnifiedSLIP39Data.ts [--type=address|pubkey|both]
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  generateMultiChainAddressFromSLIP39,
  generateMultiChainPublicKeyFromSLIP39,
  analyzeSLIP39Shares,
  getSupportedMethods,
} from './slip39Utils';
import { SLIP39TestConfig, SLIP39PassphraseConfig, SLIP39TestCaseData } from './types';
import { batchAddressTests } from './addressData';
import { allPubkeyTestCases } from './pubKeyData';

// 统一的 SLIP39 配置数据
const SLIP39_CONFIGS: SLIP39TestConfig[] = [
  {
    name: 'count20_one',
    description: '1-of-1 (20 words)',
    threshold: 1,
    shares: [
      'fake kidney academic academic dwarf orange primary secret mixed auction priority daughter script smell smear judicial ceramic glen theory emphasis',
    ],
  },
  {
    name: 'count20_two',
    description: '2-of-3 (20 words each)',
    threshold: 3,
    shares: [
      'network vexed academic acid alive forbid database equation average advocate golden careful exhaust dance texture satisfy lair negative earth flash',
      'network vexed academic agency calcium memory elegant merchant welcome oral evidence bulb union company suitable spend loud miracle story withdraw',
      // 'network vexed academic always debut unhappy veteran trust goat cluster easel penalty entance drift mild uncover short sack excuse kitchen',
    ],
  },
  {
    name: 'count20_three',
    description: '16-of-16 (20 words each)',
    threshold: 16,
    shares: [
      'platform helpful academic afraid custody blind shaft burning visual prune knit clay mason genuine march crisis smug wits woman taught',
      'platform helpful academic alto armed theory alpha paces welcome quick quiet device craft strike chemical ocean briefing space phantom legal',
      'platform helpful academic anxiety cage sympathy dramatic western acrobat transfer oral spew package style scroll pajamas curious grant center alto',
      'platform helpful academic award cards category salt guest pharmacy devote pistol focus identify infant evoke recall shaft empty hazard romantic',
      'platform helpful academic bike clogs estate duke thank bolt floral race phrase preach seafood strategy industry crowd length grant yield',
      'platform helpful academic bracelet clock daughter memory visitor result blanket garbage starting speak clay junction pitch ladybug jacket fluff ultimate',
      'platform helpful academic burning credit install sidewalk level museum evening permit duke cards findings aunt document improve woman general august',
      'platform helpful academic carve ajar edge similar glance darkness random envelope glen ancestor gums view venture wealthy learn ivory exotic',
      'platform helpful academic class depend gather story empty harvest overall craft leaves nuclear reject kernel that temple width presence speak',
      'platform helpful academic company adequate western resident dismiss mortgage emperor coastal sack example ancestor mason length mama timber rhythm buyer',
      'platform helpful academic crucial domain bedroom violence mental multiple language sympathy grin beaver salt excuse pants worthy vegan prepare unfold',
      'platform helpful academic deadline crush depart thank pregnant treat salon ambition miracle sidewalk speak practice taxi soldier scholar vitamins junk',
      'platform helpful academic deploy chemical afraid justice undergo deny excuse famous entrance scene early photo glance salon platform wildlife ladle',
      'platform helpful academic diploma cricket trend loud replace rapids payment paces theory easel spine cultural dictate hormone necklace blimp exact',
      'platform helpful academic dragon company true volume carve dough endorse force plot cinema remember skin transfer criminal hunting axle mayor',
      'platform helpful academic easel deadline evil museum spill funding muscle retreat smart timely oven transfer grownup deal armed merchant flash',
    ],
  },
  {
    name: 'count33_one',
    description: '1-of-1 (33 words)',
    threshold: 1,
    shares: [
      'station industry academic academic aunt similar picture filter chubby vintage insect hairy charity priority ugly mandate credit faint segment mobile cage junior receiver reject crazy sympathy extra helpful expand force counter lamp rescue',
    ],
  },
  {
    name: 'count33_two',
    description: '2-of-3 (33 words each)',
    threshold: 2,
    shares: [
      'yoga racism academic acid average silent year kind package pitch bracelet desert aide guilt render belong density forbid spark benefit trend junior fake dough silver spray adequate western liberty hearing strike prepare various',
      'yoga racism academic agency antenna aircraft nervous biology buyer invasion satoshi angry darkness skin guilt market fatal violence item platform painting width involve marathon parking duration pancake wildlife should execute silver metric oven',
      // 'yoga racism academic always album fitness demand priority negative both percent ceramic vegan pickup ajar cricket ecology engage owner glance sunlight replace canyon drink rocky living fridge move adjust phrase fatigue counter erode',
    ],
  },
];

// 候选密码短语池 - 从 addressTest 中提取的各种 passphrase
const CANDIDATE_PASSPHRASES = [
  '12345',
  'onekey',
  '#$%^&*()',
  'jFhC5z@Dk%ya2edpvkECr~qr',
  "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
  'Passw0rd!@#',
  '$`%@@`&^~$',
];

// 随机选择两个不同的密码短语
function getRandomPassphrases(): { passphrase1: string; passphrase2: string } {
  const shuffled = [...CANDIDATE_PASSPHRASES].sort(() => Math.random() - 0.5);
  return {
    passphrase1: shuffled[0],
    passphrase2: shuffled[1],
  };
}

// 生成密码短语配置（每次生成时随机选择）
function generatePassphraseConfigs(): SLIP39PassphraseConfig[] {
  const { passphrase1, passphrase2 } = getRandomPassphrases();

  return [
    {
      name: 'normal',
      passphrase: undefined,
    },
    {
      name: 'passphrase_empty',
      passphrase: '',
    },
    {
      name: 'passphrase_1',
      passphrase: passphrase1,
    },
    {
      name: 'passphrase_2',
      passphrase: passphrase2,
    },
  ];
}

// 统一的方法配置 - 支持地址和公钥测试
interface UnifiedMethodConfig {
  method: string;
  name?: string;
  params?: any;
  supportedTypes: ('address' | 'pubkey')[];
}

const UNIFIED_METHOD_CONFIGS: UnifiedMethodConfig[] = [
  // Bitcoin methods - support both address and pubkey (btcGetPublicKey for pubkey)
  // Legacy (P2PKH) - BIP44
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-Legacy',
    params: { path: "m/44'/0'/$$INDEX$$'/0/0", coin: 'btc' },
    supportedTypes: ['address'],
  },
  {
    method: 'btcGetPublicKey',
    name: 'btcGetPublicKey-Legacy',
    params: { path: "m/44'/0'/$$INDEX$$'/0/0", coin: 'btc' },
    supportedTypes: ['pubkey'],
  },

  // Nested SegWit (P2SH-P2WPKH) - BIP49
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-Nested SegWit',
    params: { path: "m/49'/0'/$$INDEX$$'/0/0", coin: 'btc', scriptType: 'SPENDP2SHWITNESS' },
    supportedTypes: ['address'],
  },
  {
    method: 'btcGetPublicKey',
    name: 'btcGetPublicKey-Nested SegWit',
    params: { path: "m/49'/0'/$$INDEX$$'/0/0", coin: 'btc', scriptType: 'SPENDP2SHWITNESS' },
    supportedTypes: ['pubkey'],
  },

  // Native SegWit (P2WPKH) - BIP84
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-Native SegWit',
    params: { path: "m/84'/0'/$$INDEX$$'/0/0", coin: 'btc', scriptType: 'SPENDWITNESS' },
    supportedTypes: ['address'],
  },
  {
    method: 'btcGetPublicKey',
    name: 'btcGetPublicKey-Native SegWit',
    params: { path: "m/84'/0'/$$INDEX$$'/0/0", coin: 'btc', scriptType: 'SPENDWITNESS' },
    supportedTypes: ['pubkey'],
  },

  // Taproot (P2TR) - BIP86
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-Taproot',
    params: { path: "m/86'/0'/$$INDEX$$'/0/0", coin: 'btc', scriptType: 'SPENDTAPROOT' },
    supportedTypes: ['address'],
  },
  {
    method: 'btcGetPublicKey',
    name: 'btcGetPublicKey-Taproot',
    params: { path: "m/86'/0'/$$INDEX$$'/0/0", coin: 'btc', scriptType: 'SPENDTAPROOT' },
    supportedTypes: ['pubkey'],
  },

  // Other Bitcoin-based coins
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-Doge',
    params: { path: "m/44'/3'/$$INDEX$$'/0/0", coin: 'doge' },
    supportedTypes: ['address'],
  },
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-BCH',
    params: { path: "m/44'/145'/$$INDEX$$'/0/0", coin: 'bch' },
    supportedTypes: ['address'],
  },
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-LTC Legacy',
    params: { path: "m/44'/2'/$$INDEX$$'/0/0", coin: 'ltc' },
    supportedTypes: ['address'],
  },
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-LTC Nested SegWit',
    params: { path: "m/49'/2'/$$INDEX$$'/0/0", coin: 'ltc', scriptType: 'SPENDP2SHWITNESS' },
    supportedTypes: ['address'],
  },
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-LTC Native SegWit',
    params: { path: "m/84'/2'/$$INDEX$$'/0/0", coin: 'ltc', scriptType: 'SPENDWITNESS' },
    supportedTypes: ['address'],
  },
  {
    method: 'btcGetAddress',
    name: 'btcGetAddress-Neurai',
    params: { path: "m/44'/1900'/$$INDEX$$'/0/0", coin: 'neurai' },
    supportedTypes: ['address'],
  },

  // EVM methods - evmGetAddress for address, evmGetPublicKey for pubkey (if exists)
  {
    method: 'evmGetAddress',
    name: 'evmGetAddress-Ethereum',
    params: { path: "m/44'/60'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'evmGetPublicKey',
    name: 'evmGetPublicKey-Ethereum',
    params: { path: "m/44'/60'/$$INDEX$$'/0/0" },
    supportedTypes: ['pubkey'],
  },
  {
    method: 'evmGetAddress',
    name: 'evmGetAddress-Ethereum Classic',
    params: { path: "m/44'/61'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },

  // Cosmos ecosystem - separate methods for address and pubkey
  {
    method: 'cosmosGetAddress',
    name: 'cosmosGetAddress-cosmos',
    params: { hrp: 'cosmos', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'cosmosGetPublicKey',
    name: 'cosmosGetPublicKey-cosmos',
    params: { hrp: 'cosmos', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['pubkey'],
  },
  {
    method: 'cosmosGetAddress',
    name: 'cosmosGetAddress-akash',
    params: { hrp: 'akash', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'cosmosGetAddress',
    name: 'cosmosGetAddress-crypto',
    params: { hrp: 'cro', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'cosmosGetAddress',
    name: 'cosmosGetAddress-fetch',
    params: { hrp: 'fetch', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'cosmosGetAddress',
    name: 'cosmosGetAddress-osmo',
    params: { hrp: 'osmo', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'cosmosGetAddress',
    name: 'cosmosGetAddress-juno',
    params: { hrp: 'juno', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'cosmosGetAddress',
    name: 'cosmosGetAddress-terra',
    params: { hrp: 'terra', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'cosmosGetAddress',
    name: 'cosmosGetAddress-secret',
    params: { hrp: 'secret', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'cosmosGetAddress',
    name: 'cosmosGetAddress-celestia',
    params: { hrp: 'celestia', path: "m/44'/118'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  // Sui - separate methods
  {
    method: 'suiGetAddress',
    params: { path: "m/44'/784'/$$INDEX$$'/0'/0'" },
    supportedTypes: ['address'],
  },
  {
    method: 'suiGetPublicKey',
    params: { path: "m/44'/784'/$$INDEX$$'/0'/0'" },
    supportedTypes: ['pubkey'],
  },

  {
    method: 'confluxGetAddress',
    params: { path: "m/44'/503'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'dnxGetAddress',
    params: { path: "m/44'/29538'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'filecoinGetAddress',
    params: { path: "m/44'/461'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'kaspaGetAddress',
    params: { path: "m/44'/111111'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'nearGetAddress',
    params: { path: "m/44'/397'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'nemGetAddress',
    params: { path: "m/44'/43'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'xrpGetAddress',
    params: { path: "m/44'/144'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'solGetAddress',
    params: { path: "m/44'/501'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'starcoinGetAddress',
    params: { path: "m/44'/101010'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'stellarGetAddress',
    params: { path: "m/44'/148'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'tronGetAddress',
    params: { path: "m/44'/195'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'benfenGetAddress',
    params: { path: "m/44'/728'/$$INDEX$$'/0'/0'" },
    supportedTypes: ['address'],
  },
  {
    method: 'neoGetAddress',
    params: { path: "m/44'/888'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },

  // Polkadot ecosystem - polkadotGetAddress for address, polkadotGetPublicKey for pubkey
  // {
  //   method: 'polkadotGetAddress',
  //   name: 'polkadotGetAddress-polkadot',
  //   params: { prefix: 0, path: "m/44'/354'/$$INDEX$$'/0'/0'" },
  //   supportedTypes: ['address'],
  // },
  // {
  //   method: 'polkadotGetPublicKey',
  //   name: 'polkadotGetPublicKey-polkadot',
  //   params: { prefix: 0, path: "m/44'/354'/$$INDEX$$'/0'/0'" },
  //   supportedTypes: ['pubkey'],
  // },
  // {
  //   method: 'polkadotGetAddress',
  //   name: 'polkadotGetAddress-kusama',
  //   params: { prefix: 2, path: "m/44'/434'/$$INDEX$$'/0'/0'" },
  //   supportedTypes: ['address'],
  // },
  // {
  //   method: 'polkadotGetPublicKey',
  //   name: 'polkadotGetPublicKey-kusama',
  //   params: { prefix: 2, path: "m/44'/434'/$$INDEX$$'/0'/0'" },
  //   supportedTypes: ['pubkey'],
  // },

  // Specialized pubkey methods
  {
    method: 'aptosGetPublicKey',
    params: { path: "m/44'/637'/$$INDEX$$'/0'/0'" },
    supportedTypes: ['pubkey'],
  },
  {
    method: 'nostrGetPublicKey',
    params: { path: "m/44'/1237'/$$INDEX$$'/0/0" },
    supportedTypes: ['pubkey'],
  },

  // Other address-focused methods
  {
    method: 'alephiumGetAddress',
    params: { path: "m/44'/1234'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'algoGetAddress',
    params: { path: "m/44'/283'/$$INDEX$$'/0'/0'" },
    supportedTypes: ['address'],
  },
  {
    method: 'dnxGetAddress',
    params: { path: "m/44'/29538'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'tonGetAddress',
    params: {
      path: "m/44'/607'/$$INDEX$$'",
      walletVersion: 3, // V4R2
      isBounceable: false,
      isTestnetOnly: false,
      workchain: 0, // BASECHAIN
      walletId: 698983191, // 默认walletId
    },
    supportedTypes: ['address'],
  },
  {
    method: 'nervosGetAddress',
    params: { path: "m/44'/309'/$$INDEX$$'/0/0", network: 'ckb' },
    supportedTypes: ['address'],
  },
  {
    method: 'nexaGetAddress',
    params: { path: "m/44'/29223'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'xrpGetAddress',
    params: { path: "m/44'/144'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
  {
    method: 'scdoGetAddress',
    params: { path: "m/44'/541'/$$INDEX$$'/0/0" },
    supportedTypes: ['address'],
  },
];

// 测试索引范围
const TEST_INDICES = [0, 1, 21234567, 2147483646, 2147483647];

// 生成统一测试数据
async function generateUnifiedTestData(
  config: SLIP39TestConfig,
  passphraseConfig: SLIP39PassphraseConfig,
  testType: 'address' | 'pubkey'
): Promise<SLIP39TestCaseData> {
  console.log(
    `\n=== Generating ${testType} data for ${config.name} + ${passphraseConfig.name} ===`
  );

  const testName = `${config.name}_${passphraseConfig.name}`;
  const analysis = analyzeSLIP39Shares(config.shares);

  if (!analysis.isValid) {
    throw new Error(`Invalid SLIP39 shares for ${testName}: ${analysis.errors.join(', ')}`);
  }

  // Filter methods based on test type using optimized utilities
  const allSupportedMethods = getSupportedMethods(testType);
  const supportedMethods = UNIFIED_METHOD_CONFIGS.filter(
    methodConfig =>
      allSupportedMethods.includes(methodConfig.method) &&
      methodConfig.supportedTypes.includes(testType)
  );

  const methodData = [];

  for (const methodConfig of supportedMethods) {
    console.log(`Processing method: ${methodConfig.name || methodConfig.method}`);

    try {
      const result: Record<string, any> = {};

      // Generate test data for each index
      for (const index of TEST_INDICES) {
        const params = { ...methodConfig.params };

        // Replace $$INDEX$$ placeholder
        Object.keys(params).forEach(key => {
          if (typeof params[key] === 'string' && params[key].includes('$$INDEX$$')) {
            params[key] = params[key].replace('$$INDEX$$', index.toString());
          }
        });

        const path = params.path || `m/44'/0'/${index}'/0/0`;

        try {
          let generated: any;

          if (testType === 'address') {
            generated = await generateMultiChainAddressFromSLIP39({
              shares: config.shares,
              passphrase: passphraseConfig.passphrase,
              method: methodConfig.method,
              params,
            });
          } else {
            generated = await generateMultiChainPublicKeyFromSLIP39({
              shares: config.shares,
              passphrase: passphraseConfig.passphrase,
              method: methodConfig.method,
              params,
            });
          }

          if (generated.success && generated.payload) {
            result[path] =
              testType === 'address'
                ? generated.payload.address || generated.payload
                : generated.payload.publicKey || generated.payload.pub || generated.payload;
          } else {
            result[path] = `ERROR: ${generated.error || 'Generation failed'}`;
          }
        } catch (error) {
          result[path] = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      methodData.push({
        method: methodConfig.method,
        name: methodConfig.name || methodConfig.method,
        params: methodConfig.params,
        ...(testType === 'address' ? { expectedAddress: result } : { expectedPublicKey: result }),
      });
    } catch (error) {
      console.error(`Error processing ${methodConfig.method}:`, error);

      // Add error case
      const errorResult: Record<string, string> = {};
      TEST_INDICES.forEach(index => {
        const path =
          methodConfig.params?.path?.replace('$$INDEX$$', index.toString()) ||
          `m/44'/0'/${index}'/0/0`;
        errorResult[path] = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
      });

      methodData.push({
        method: methodConfig.method,
        name: methodConfig.name || methodConfig.method,
        params: methodConfig.params,
        ...(testType === 'address'
          ? { expectedAddress: errorResult }
          : { expectedPublicKey: errorResult }),
      });
    }
  }

  return {
    id: `${config.name}_${passphraseConfig.name}`,
    name: testName,
    description: `${config.description} + ${passphraseConfig.name}`,
    passphrase: passphraseConfig.passphrase,
    shares: config.shares,
    data: methodData,
  };
}

// 转换名称为 camelCase
function toCamelCase(name: string): string {
  return (
    name
      // 先处理下划线后跟字母的情况
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      // 处理下划线后跟数字的情况
      .replace(/_(\d)/g, (_, digit) => digit)
      // 处理其他下划线
      .replace(/_/g, '')
  );
}

// 生成 TypeScript 文件
function generateTypeScriptFile(data: SLIP39TestCaseData, outputPath: string): void {
  const camelCaseName = toCamelCase(data.name);
  const content = `import type { SLIP39TestCaseData } from '../../types';

export const ${camelCaseName}: SLIP39TestCaseData = ${JSON.stringify(data, null, 2)};
`;

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`Generated: ${outputPath}`);
}

// 生成索引文件
function generateIndexFile(
  configs: SLIP39TestConfig[],
  passphrases: SLIP39PassphraseConfig[],
  testType: 'address' | 'pubkey',
  outputDir: string
): void {
  const imports: string[] = [];
  const exports: string[] = [];

  configs.forEach(config => {
    passphrases.forEach(passphrase => {
      const testName = `${config.name}_${passphrase.name}`;
      const camelCaseName = toCamelCase(testName);
      imports.push(`import { ${camelCaseName} } from './${config.name}/${passphrase.name}';`);
      exports.push(`  ${camelCaseName},`);
    });
  });

  const arrayName = testType === 'address' ? 'batchAddressTests' : 'allPubkeyTestCases';

  const content = `import type { SLIP39TestCaseData } from '../types';

${imports.join('\n')}

export const ${arrayName}: SLIP39TestCaseData[] = [
${exports.join('\n')}
];
`;

  const indexPath = path.join(outputDir, 'index.ts');
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log(`Generated index: ${indexPath}`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find(arg => arg.startsWith('--type='));
  const testType = typeArg ? (typeArg.split('=')[1] as 'address' | 'pubkey' | 'both') : 'both';

  console.log(`🚀 Starting unified SLIP39 data generation (type: ${testType})`);

  const typesToGenerate: ('address' | 'pubkey')[] =
    testType === 'both' ? ['address', 'pubkey'] : [testType];

  for (const currentType of typesToGenerate) {
    console.log(`\n📊 Generating ${currentType} test data...`);

    // 每次生成时随机选择 passphrase
    const PASSPHRASE_CONFIGS = generatePassphraseConfigs();
    console.log(
      `🎲 Selected passphrases: "${PASSPHRASE_CONFIGS[2].passphrase}" and "${PASSPHRASE_CONFIGS[3].passphrase}"`
    );

    const outputDir =
      currentType === 'address'
        ? path.join(__dirname, 'addressData')
        : path.join(__dirname, 'pubKeyData');

    // Ensure output directories exist
    for (const config of SLIP39_CONFIGS) {
      const configDir = path.join(outputDir, config.name);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
    }

    // Generate test data
    for (const config of SLIP39_CONFIGS) {
      for (const passphraseConfig of PASSPHRASE_CONFIGS) {
        try {
          const testData = await generateUnifiedTestData(config, passphraseConfig, currentType);
          const outputPath = path.join(outputDir, config.name, `${passphraseConfig.name}.ts`);
          generateTypeScriptFile(testData, outputPath);
        } catch (error) {
          console.error(`❌ Failed to generate ${config.name}_${passphraseConfig.name}:`, error);
        }
      }
    }

    // Generate index file
    generateIndexFile(SLIP39_CONFIGS, PASSPHRASE_CONFIGS, currentType, outputDir);
  }

  console.log(`\n✅ Unified SLIP39 data generation completed!`);
}

// 导出函数供其他模块使用
export function generateUnifiedSLIP39Data(testType: 'address' | 'pubkey') {
  // 返回现有的测试数据
  if (testType === 'address') {
    return batchAddressTests || [];
  }

  return allPubkeyTestCases || [];
}

// 执行脚本
if (require.main === module) {
  main().catch(console.error);
}
