import type { SLIP39TestCaseData } from '../../types';

export const count20TwoNormal: SLIP39TestCaseData = {
  id: 'count20_two_normal',
  name: 'count20_two_normal',
  description: '2-of-3 (20 words each) + normal',
  shares: [
    'network vexed academic acid alive forbid database equation average advocate golden careful exhaust dance texture satisfy lair negative earth flash',
    'network vexed academic agency calcium memory elegant merchant welcome oral evidence bulb union company suitable spend loud miracle story withdraw',
  ],
  data: [
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
      },
      expectedPublicKey: {
        "m/44'/0'/0'/0/0": '023b964f624177ba39ae9559d67dd65d23e238650bf0b23f3d1d135ae122c500bd',
        "m/44'/0'/1'/0/0": '02417da471ff535c8c9d2550653ab6110ddeeda60b7c007e15f766b0420ded815f',
        "m/44'/0'/21234567'/0/0":
          '02565ec89aa337345dd0283ec9265b2feaf91c0bcf3e7330ce78aacdc440741aae',
        "m/44'/0'/2147483646'/0/0":
          '03d2cd3a5ed441c66b9fddeb0f4ac39c765a985424d3c8bc3fc233363fbf8de4be',
        "m/44'/0'/2147483647'/0/0":
          '027385cf0d6c5846f968479823fabe0656f7183898896f2e19edc8292bfd39ca93',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedPublicKey: {
        "m/49'/0'/0'/0/0": '03a83966f77a3ee841a45749c6c49254671189ac04d6998e28df381055552098c7',
        "m/49'/0'/1'/0/0": '0337867d4eac990de640d7629f73a62c473e3f295e9700d0a9c54903242a2a4ef7',
        "m/49'/0'/21234567'/0/0":
          '035e872ec70075916d9ebc8f52322863e99ded6ff9f194a1b30b34c09e05f53e6d',
        "m/49'/0'/2147483646'/0/0":
          '03cf4516ce106b47a802573e236b1d3db22f6dc43be5ba2e6a9861496696cb277f',
        "m/49'/0'/2147483647'/0/0":
          '02758a57902c50e80ea213074be38a45bdc9b368009ed91b4958634f2d548944c4',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDWITNESS',
      },
      expectedPublicKey: {
        "m/84'/0'/0'/0/0": '02b66e343785cceec02ed6ecddae4cf4f07d8aa0a08ec154bb68b73262fbb0f490',
        "m/84'/0'/1'/0/0": '031e52e5365e876c05d1d4d9534eac287b9ae5c6636bc80c297b5a123e36ed9c86',
        "m/84'/0'/21234567'/0/0":
          '02f697981e3eef1bfb08e7c0405b045db603172fd42e36ffbf76bd1bea7838f9ee',
        "m/84'/0'/2147483646'/0/0":
          '03c9305dbfe4e13086a05326d3f0dff8b2ff20db8a85c145887855bcadf7aea4b8',
        "m/84'/0'/2147483647'/0/0":
          '03a804b36cc945de2ce762cacf2f036c1e47a42309c2fecff1b58bfc0d2d9c5f78',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDTAPROOT',
      },
      expectedPublicKey: {
        "m/86'/0'/0'/0/0": '028f487d48ff35dd0c860cc5e54e58912c0851705fb827fc5a473d888baead2c74',
        "m/86'/0'/1'/0/0": '036e757db94a8df505c6985b43dc1023fe2c1ab52c9f2112d3b573d2d9eb256c34',
        "m/86'/0'/21234567'/0/0":
          '030878e4b8da2d17d10194f28b3573d75dcbc69cce6eaec882534edc6957a17873',
        "m/86'/0'/2147483646'/0/0":
          '03aefaa77690ded12d9b6c26c8093af6440c199efb77e7fb014b2ae0afd859f8ce',
        "m/86'/0'/2147483647'/0/0":
          '02cf0c228e66c58d66e0a0311a15009c650a72a12f9057ff9d043bc95557c04305',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x03ce7e525e88f94a8b856cdada60d30e6f19e6c3922ab9818cb9cbddf2ddd8499b',
        "m/44'/60'/1'/0/0": '0x03274f36e50cd41886d16cdd39e32ce203aeb50d926aced20c8dd09ed83f49ad50',
        "m/44'/60'/21234567'/0/0":
          '0x0357b71c1875f60b0859fb8244bb32d30332a0021e03946be16cf849e1a11cc06e',
        "m/44'/60'/2147483646'/0/0":
          '0x02ce091d91ab3ed5fa7c9a3682fb0fdcffc49a703b5b415120f6ab6376f8d58f35',
        "m/44'/60'/2147483647'/0/0":
          '0x03bf47188fbe4b305ef76ec750994811a899ff6348fd17f09d91ffcd476e6c942e',
      },
    },
    {
      method: 'cosmosGetPublicKey',
      name: 'cosmosGetPublicKey-cosmos',
      params: {
        hrp: 'cosmos',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/118'/0'/0/0": '020083a68f6e50cbd3c239361d813d322e99aa0ca9f2699a699e639fa145ef8c05',
        "m/44'/118'/1'/0/0": '02b64cb7ffce9f9e39e119defbceb5cebb43193421fc0dcea8ebeaeb46c40085c6',
        "m/44'/118'/21234567'/0/0":
          '032e9635a997eab80817ce2dbaece409d304ccf7fa2a2a05d9051711dbced9d6a4',
        "m/44'/118'/2147483646'/0/0":
          '02188ad03d2b0d94c5ae862b8909f4e248bd6c96bd44861fc049ec07c02c037070',
        "m/44'/118'/2147483647'/0/0":
          '020353d8169f520cb1636d4297fe671d9be818fbd9f10079b4fee844948c60e806',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '00143aedd0d52f9f44a15a0fa2ca99da501bd3f6b24cc8cb8e5e2c05e879fa4fc0',
        "m/44'/784'/1'/0'/0'": '00d4d337f202a90a86cce1d487f802149a8401a8598c4de8cfea8167617ae540f2',
        "m/44'/784'/21234567'/0'/0'":
          '00f6e8e89071742a01b7e981b6da8557dce864326bc203d13511ebf3cea488607c',
        "m/44'/784'/2147483646'/0'/0'":
          '0014736272dd7663c03db549279304a6e280813ce130e5afca980084d2d93b1fcb',
        "m/44'/784'/2147483647'/0'/0'":
          '009c332f959d7517a4aa7d31e6d2915eab19e2d943169446124de0d3ec31595d25',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": 'f2865c8398d5847c7b0dcf150e2779e44db9da6506eb9c43fa5947ba3023a576',
        "m/44'/637'/1'/0'/0'": '1c010381385274521cd75ec85577dcfa52239845361575fcf13087e85a59e913',
        "m/44'/637'/21234567'/0'/0'":
          'a544bacc43199c54a1fe0d934ff3f0bb79f3465e4893da4b36aba87ea72d3ad9',
        "m/44'/637'/2147483646'/0'/0'":
          '31eee816640b36b134ef50361712fe223e650b7289de4d18af7e361154b3fb74',
        "m/44'/637'/2147483647'/0'/0'":
          'c795555410956db74e2de1f32c76a0dc53a2726da59173c154e63eac230fcb9d',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '62da2ae6660c5c12302b42d96cafcd56b381626d32ba9302db685206f71e2571',
        "m/44'/1237'/1'/0/0": 'f87ac803c8585bfdf89d6d3c6b710a246d425771ec79f0506f0e77436253dfa5',
        "m/44'/1237'/21234567'/0/0":
          '8a746dd232f9c0627c1d4f1279eeb5009a020780f3b217f097854318dd246f73',
        "m/44'/1237'/2147483646'/0/0":
          '5fff2d85706686e80a4c3f81676e87ce6a2b4d10f5412f67b5ebe4cdf2839341',
        "m/44'/1237'/2147483647'/0/0":
          '4303cec393566887a8dac71a211a690b026d7f86a23c2d39c9bbd39ac65c0797',
      },
    },
  ],
};
