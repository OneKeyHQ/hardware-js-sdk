import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase24-密语1',
  passphrase: 'temp10086',
  passphraseState: 'mgGpxhbSthC4jMPvS88CYL28dXH5sb46nc',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490457',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q8x9xglerdnmjjawrqjef47ajs5zynvry4nn4kcwpr7fnwcm2gzzdwz9elrs0crppn5j2lzv4enlmlrck9g8jc76efzqlljltr',
        '1': 'addr1qxh6m0muv9uyv2ctwyl0dyj6s39gy7w3a7j2k6vlk2ec66z2nzdjv56rdsy660d775w0mqqf76jmgr0rrrns88zzdcnsraryw0',
        '30': 'addr1q9ecdpjdlhy0jsd8dtgv0syvh43qdpxyt2tf4fjsc02x7etc0zu7s66hruwvfy7dndjl97uq0qunxqh08a9alf03qdhqcvh6pg',
        '2147483646':
          'addr1qy9grhfuvvcuwzxzpnx9c82z4dwcs8jceu7gs0ses34dn93n09dvyqu66ds7grcte58267dacu7xkx6pr858rfe4pnas0h45uq',
        '2147483647':
          'addr1qxan22kp7unxkevq5666lttyvp6yxxlkyyju5le8cuec7zh5w6v3zvtj9w7ymjeh38ehuts0vtuh759lzhwhuay4lezqvfssnw',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '7AJEMHDBJFVLUYP3AQCD5P4IDOA4K2M2VL43OXDDO3DOF556CUC3QFRZOQ',
        '1': 'LPBF7R45TAJRMUZG5RLJUIMU5TP2EB6DVRFR6NHWCND33OK4BBU3T3RILM',
        '30': '7HKONCDJP7WCVV64HIVLYK4PDIDS5K4VI2GAPQX57VGLZCDSCWFT6W5PTI',
        '2147483646': '7SAXIWEMBFDGKSLIB7JX7LH42QWP2RFVX34ZJP7A7BDCH4DDYWLXH6I5OQ',
        '2147483647': 'EWMBZ2CDECSIXIN4FXH3SETOSJJGU4ALG5UMZGNRUXHL5WWXRG3QUDHXHE',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x1518e8776f79d361b78c44fe1d778bc0bd796524d10430e8d64389f53f88097f',
        '1': '0xa48780a7b2dcce0d19132cbc08385f7a8dcc482c97bb25d2d4332e840bd41a44',
        '30': '0x60a98845d7f018baec8adecdd39926453a948f9228133e2c60a74e2939794324',
        '2147483646': '0x6271e1e97c8116a1e6167c3511349d958dc8303720518312e38183509aacfa55',
        '2147483647': '0x7e6ba9ca66d4029a5248c32819d2794b15a4ab3e853f1f078b92005ab3b49a13',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1CBL65xaeaKPHvMhmNDUzKEpUHEi7CTShL',
        '1': '16y13hRnrUseTUxok1UqYFkCzDPoS3h1tT',
        '30': '175Q5jeEvgXn5X6AHT1uFhx2FLyHMpGynH',
        '2147483646': '1BLV2o9UYUE3bJ7vPGcifaesJPG1SQWKht',
        '2147483647': '1CQKuHmvKDTx2WjKGQ7kTZiD7GFVd5FuY5',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '34DfyrxVGYfqnGmcapQ8v9EnTEWaiP4deV',
        '1': '327UNVRmLdV7pjC5kujJeVVf59gENvn3Ts',
        '30': '336Bw2SYjjuwTrAkDqJviGJQjQynaBfZbZ',
        '2147483646': '3A1W8NSiu7f5Bz1FVCqc6ncS18RwNfGWwc',
        '2147483647': '3Eewt5a1MX1d1hyUvuSYFuacx9SgmgydUz',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qc25nvpj54xyg5dtxz9sa26fav4e2zw9svsms67',
        '1': 'bc1qtnn67p3fe2mr6u8kwprjse0pe8e4zgdj487esc',
        '30': 'bc1qz9w0ss45mkuj0v5fx4qk9sh55c72eqwqc0k5ce',
        '2147483646': 'bc1qckqzdv59ltxsjcnfsyk7hvx435zfeljmmgyncp',
        '2147483647': 'bc1q3zhyt2zck08hnc7hfdv5zp7cp8rjly62l4ma92',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pmm9lcx08gy7l9uemk6kjnyghjma4ll8zl52jwsm5l5lwncn782rs0cexz6',
        '1': 'bc1pj5x4f2jywv939a00m06qmp8ax8hqcmdpwav39xkzutsl3xucxd5qh60cps',
        '30': 'bc1p62kx6d8pk3h675shhnze98x9pvz84jyk4ll7swpq353tu2t7clfq64k5n4',
        '2147483646': 'bc1phlhxguvvsywdwhndzltp2dluwp3axh87hte8fzph6kh4skmnddjshan7ja',
        '2147483647': 'bc1pjkwuyy35c3tqul6e6mlqqmp00y2ssu68z6mm6s7qwxa3l6jqe6xsevlqc0',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'/0/0",
        coin: 'doge',
      },
      expectedAddress: {
        '0': 'DR3sza4yjXbe7tTPqmaMUVadcEKmdik4z7',
        '1': 'DRDFQCnZY8KjuU1iivHnWt2s2biXerg5gC',
        '30': 'DDZNTfkvrh6jVdU58ZqvZZ7ZLVjw11C7eC',
        '2147483646': 'DKvBpan1qc8ke3Y2dL2oZdUZPP4c5WKhYK',
        '2147483647': 'DT5vsnVfy8dDAxtxu9YXz8AT2MUGxrkWMA',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: "m/44'/145'/$$INDEX$$'/0/0",
        coin: 'bch',
      },
      expectedAddress: {
        '0': 'bitcoincash:qzzzwp8yyq35sunqnx758j53ucp4p6k9j5uj3uspxt',
        '1': 'bitcoincash:qp4683jwhljgmvg5whcwc07yvmx4eevk6g8rzfw9mk',
        '30': 'bitcoincash:qqlh3hzldcs7en4sx0drx24sxm5cjevy5s60wxc22y',
        '2147483646': 'bitcoincash:qr6fu086rz6weleu8t46kkdasfq56u5xpgvzxrtyu3',
        '2147483647': 'bitcoincash:qq90vy56qsnzgk77jthsvndchlke5nfx7c3lvrgjjz',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: "m/44'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'LfjpiUP6JpMoTWEYcnzHXWQZi6dEacMJwj',
        '1': 'LWqEdXAHu5HMrvynoRv538eu1DZTxqmoBo',
        '30': 'LNTf6dMg8kATrBjmW2Ahp7R5gNEwVVGYQS',
        '2147483646': 'LedEHBzdY4gmEpL9UsqqRRK84Ez5fCrZmw',
        '2147483647': 'Lhpgj3EuNYLHTYdTLD1C6RZbtuGT3SuLHR',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'MPxAfhHHMYYWgqqAwaKeyVaNMXh81oRuqc',
        '1': 'MLadU6YEEpCZp11KpwoTPV4d8ut6F7tBiM',
        '30': 'MCy4x5nACS5J94xHS8V7oGFTVs9xkTGQYx',
        '2147483646': 'MHraR1SbBZtUZrf3cv9c7zNuGucvUqJaD4',
        '2147483647': 'MTC9iXSY2Qp6uVHYihAMK8diVp4b2k8VxL',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'ltc1q4ufkhz55cmknal4ck4jmnfdvhp7vs3efs9y0fs',
        '1': 'ltc1qr00mfdk6mhey6guytzdq2wlld8sgskclylfn6p',
        '30': 'ltc1qw52pnxvlvdftzl5w8zclhhc3900jrssp3xj9u9',
        '2147483646': 'ltc1qegue2jkueyqlntvlu46xafdz0h34mxnhhxqw4q',
        '2147483647': 'ltc1qvlht63p3qplxwlmfs4wxn9p62sey7jjmknkz9x',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Neurai',
      params: {
        path: "m/44'/1900'/$$INDEX$$'/0/0",
        coin: 'neurai',
      },
      expectedAddress: {
        '0': 'NUNF3avWmsvY7ypBJ9iSHSEKkFDo4qzQCA',
        '1': 'NWn2TSg1H9DXib9Sm9LLriNoNp55RED5zp',
        '30': 'NfuZ7wVerYgLHsCkp4pYkzbXf4LzkKJz1j',
        '2147483646': 'Nc3CcrwydTpher7a1yuHxJTWoZ1VPCu29p',
        '2147483647': 'NdktzDVrnJZr35wfQptf2UuDVfyc52bYxC',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqgr8afgcn4jj9rpj3xde5cjlq0dy6d7kaq4gzzjt',
        '1': 'ckb1qyqxlj7uw0evmxku4y0y7fu8rrn3j2pj8rcsznr68z',
        '30': 'ckb1qyqzay7s5fspjw0h3h8p7wn23u7ngsyq680qgnq2ux',
        '2147483646': 'ckb1qyqda8ddaa0tdy605ftecwhtvqt2lffss4fqnrsxvp',
        '2147483647': 'ckb1qyqxguxzp9ndqh7xry42wnqffyfjdwyt9h5q97fqvc',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aartym1hx6c0r3me401z0mfd09gca5a486z7716ytv',
        '1': 'cfx:aapg73mgtpecetzpba0um7uy4h4ftfp0n6gxdbs5t6',
        '30': 'cfx:aan8z29ekr4r8n5uzgkr9ubx39vsnhdf76vbum1s93',
        '2147483646': 'cfx:aanuf17azdxc8k3mcw5at9dnnxwre1hfdpbd55j702',
        '2147483647': 'cfx:aas03sg6320c2wa7smwxj9pcr26z1hhrpead2d5dha',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1vyusahs0v2f7p9tf5lytjt6e82h6guateertrr',
        '1': 'cosmos1e5cu2j2kk8q9mh9p2vun7eql7h67n0zch0sskk',
        '30': 'cosmos1hr5w7gkujhtae8jpfj96m3sd8huu0zws8p4rxl',
        '2147483646': 'cosmos1mnvsgwtyf64tezp2xpepdv6f6j2gprhp5x6he4',
        '2147483647': 'cosmos14vpc24sflpzkjrp52sppk58s2ds77w9n28d4q9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1vyusahs0v2f7p9tf5lytjt6e82h6guat5zwv6e',
        '1': 'akash1e5cu2j2kk8q9mh9p2vun7eql7h67n0zc65ah0v',
        '30': 'akash1hr5w7gkujhtae8jpfj96m3sd8huu0zws26cyl9',
        '2147483646': 'akash1mnvsgwtyf64tezp2xpepdv6f6j2gprhpeahsq0',
        '2147483647': 'akash14vpc24sflpzkjrp52sppk58s2ds77w9n8uqjel',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1vyusahs0v2f7p9tf5lytjt6e82h6guatpztjlj',
        '1': 'cro1e5cu2j2kk8q9mh9p2vun7eql7h67n0zc05cf28',
        '30': 'cro1hr5w7gkujhtae8jpfj96m3sd8huu0zwsl6a66w',
        '2147483646': 'cro1mnvsgwtyf64tezp2xpepdv6f6j2gprhpvajw9y',
        '2147483647': 'cro14vpc24sflpzkjrp52sppk58s2ds77w9nju9vu5',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1vyusahs0v2f7p9tf5lytjt6e82h6guat2y20p5',
        '1': 'fetch1e5cu2j2kk8q9mh9p2vun7eql7h67n0zcyje55p',
        '30': 'fetch1hr5w7gkujhtae8jpfj96m3sd8huu0zws5uu8yg',
        '2147483646': 'fetch1mnvsgwtyf64tezp2xpepdv6f6j2gprhp8mnnmz',
        '2147483647': 'fetch14vpc24sflpzkjrp52sppk58s2ds77w9ne6y3zj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1vyusahs0v2f7p9tf5lytjt6e82h6guat3zsm43',
        '1': 'osmo1e5cu2j2kk8q9mh9p2vun7eql7h67n0zcl5rqqy',
        '30': 'osmo1hr5w7gkujhtae8jpfj96m3sd8huu0zws06xnsd',
        '2147483646': 'osmo1mnvsgwtyf64tezp2xpepdv6f6j2gprhpuaf808',
        '2147483647': 'osmo14vpc24sflpzkjrp52sppk58s2ds77w9nzu79kh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1vyusahs0v2f7p9tf5lytjt6e82h6guat0tqsyl',
        '1': 'juno1e5cu2j2kk8q9mh9p2vun7eql7h67n0zcpant32',
        '30': 'juno1hr5w7gkujhtae8jpfj96m3sd8huu0zws3nkcpr',
        '2147483646': 'juno1mnvsgwtyf64tezp2xpepdv6f6j2gprhpz5ev7f',
        '2147483647': 'juno14vpc24sflpzkjrp52sppk58s2ds77w9nu4ww8e',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1vyusahs0v2f7p9tf5lytjt6e82h6guatlaetpr',
        '1': 'terra1e5cu2j2kk8q9mh9p2vun7eql7h67n0zc3t2s5k',
        '30': 'terra1hr5w7gkujhtae8jpfj96m3sd8huu0zwsp90ryl',
        '2147483646': 'terra1mnvsgwtyf64tezp2xpepdv6f6j2gprhpjzqhm4',
        '2147483647': 'terra14vpc24sflpzkjrp52sppk58s2ds77w9nvrh4z9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1vyusahs0v2f7p9tf5lytjt6e82h6guatmuhz7l',
        '1': 'secret1e5cu2j2kk8q9mh9p2vun7eql7h67n0zc42yet2',
        '30': 'secret1hr5w7gkujhtae8jpfj96m3sd8huu0zws9yp2mr',
        '2147483646': 'secret1mnvsgwtyf64tezp2xpepdv6f6j2gprhpkrw7yf',
        '2147483647': 'secret14vpc24sflpzkjrp52sppk58s2ds77w9ngzeuae',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1vyusahs0v2f7p9tf5lytjt6e82h6guatgnjmew',
        '1': 'celestia1e5cu2j2kk8q9mh9p2vun7eql7h67n0zcx9pqvm',
        '30': 'celestia1hr5w7gkujhtae8jpfj96m3sd8huu0zwsktynuj',
        '2147483646': 'celestia1mnvsgwtyf64tezp2xpepdv6f6j2gprhp9vt8rc',
        '2147483647': 'celestia14vpc24sflpzkjrp52sppk58s2ds77w9nmdu96g',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'Xwn4CGY1i88SAKQj6T3M3h3YrTS7oESjd6UnRseRiwEu6CV2guzwbAuPjxWS2QVDHufcea8PUtt5jAo48i6WvscT38DD1q7oF',
        '1': 'XwncvCaRdTZ2TLZEq6U1sf8jbCRe7gNYgXr1wy5MHPQKYvf7p4n7UcHMyJKBrLw6R6CPrEkBUM7iYKS5sRa2FpwZ1jbctLsJ1',
        '30': 'Xwo31yHsM3FdaPL2QpVMU6Vj1VWnTdgVnaFbhn5jVujz2kGoyv5DEV2aoni4N3AdBRYzLyGMaJVB5Fazj8wja2ps2JiiKJ5nK',
        '2147483646':
          'Xwnm58jftKuChZDW3o9u5AFh6GSnRWF933rc1twSAGRfAhfLVBsRcNoYCskmLPrQwgcKFxkaGwFxfEfYaV1NrxGT2E5NytNrz',
        '2147483647':
          'XwogzkhtG1rGjJPEhmuMT1Xx5GxrFy95sQc1w9FQ89STLZssb2NmJGB5SE43W2Km7sV5KJCtejxv91PZTKrAVWs312ypPCXx8',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xbc34075D5a1b594a477d1F172FB007FEF986D912',
        '1': '0xaB4dAe2B3B2609CC5dD5d5BAc91f27e2812C2cBd',
        '30': '0xCD5121d2A28190a59AA9B8c49D4AeA45dAda9A57',
        '2147483646': '0xd21acb9A317DF3d5666281dD97a3D6511231958E',
        '2147483647': '0x53207B47C99A0921505Ca8Ee2c2c3E4584844E11',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x5E28393D50E59eD977BB73ED0939eE341dc23166',
        '1': '0xC240Ae2eA231C460A36e2Ab7a0033B073956C758',
        '30': '0xf6ef3A19e1029f098B0b60b1BFAaacaD33AC4343',
        '2147483646': '0x959Df853BECee243d9BE4903900140FDC16d525A',
        '2147483647': '0x9658B717776d0ff8715Af313BF103674d4774bd3',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x5E28393D50E59eD977BB73ED0939eE341dc23166',
        '1': '0x549aC1d66123C0E1186D01E61df27E424E3831A0',
        '30': '0xa0875e5201666CA0f20E08b23f4624744Ea417cF',
        '2147483646': '0xdF65F14d81f8B881D0Af236C19f83f3639D33FC5',
        '2147483647': '0x4DA279FC13E27274727736b50A2E0F973c4DF520',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1dhk2kl7zje23f75ksbc5wy3rdwkcapekjyblmcq',
        '1': 'f1r3slhou2yefz5rmxws5auqnfst7lxk6imkyjf6i',
        '30': 'f13z7kgup2t5epycijcw3kpu5zcspddt6gapfzloa',
        '2147483646': 'f1aoelahvwm4keg7o3zo7qyfotien2fudt5hxrmda',
        '2147483647': 'f1oa6x2c4eknlatzrowv45tghabj3olb2hfxlxx6y',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qp4vrdpufw29qff69v3kqnm0swk3weqtzty7lzc92e7qmdztx4ksyfhuxgxg4',
        '1': 'kaspa:qq7luz3nu8epw406hac8asg568w88346tp8c3yfaz75rahet8mt668p36f09q',
        '30': 'kaspa:qqergctgpv3xpckl33qspxwktt2v7l54k6ysmgt42vq739nvq508xxfmaggpc',
        '2147483646': 'kaspa:qp2fr6zeyzpzlwwe7y5cnneja38yzetdwjycj4twjd5h5nkwy8gcqsd300slg',
        '2147483647': 'kaspa:qryk02ls2gm0xn7u424fjp5jdahd4fj45rldtgscf4dy94tcz9z46l6e5eezy',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '7cb601d4170790d031aa2ac6010a05ef39eef27c6154e99721887b94bb13f854',
        '1': 'aaa747b1e3cd0a31beda9d5f19f973b9ac4e62a463c1b81637a59220473c0ce1',
        '30': 'd30368eabbec921f9aff39cfb2c58eed2b41a8bc00bf37459f9b3ac2fc67d203',
        '2147483646': 'aa96a06170b9910a41e9e6760047092b48a0992f3512d6e50ddeb18eb718535e',
        '2147483647': 'b81504c9ef40f6a8c80c820555caa79b9a7a2ca9acae490c3b3e0e190b7f1493',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NCHRBEZQDMG63UU5EISXLAALQ4I6S74MNETDQ25J',
        '1': 'NAGZGRST6SYQ5E3I4WSTC3HC3DO6SAAIRIX3IMRO',
        '30': 'NB2DYRASSFZDPPEVCSW5FMMIDUA7N6CR5EOPN5AY',
        '2147483646': 'NAFOERWJOA4YNT74ZZ7TH6JU6W6K4ZGOFV7ENUAV',
        '2147483647': 'ND2RNWFM3XQ5QAV6Q5IT3JHSWMR3JPO7JSWOGU2F',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5vj5cu0nd97rxlktvvqsrjk8a55r0g2zf8ajtswdh',
        '1': 'nexa:nqtsq5g55wlyh5unfsm8ycvq4sdyg6gsaws2nfdx7ph0jvpv',
        '30': 'nexa:nqtsq5g5ahcprfc23ph63j2j2ugpvkcg2wg3jwvnf544wlyc',
        '2147483646': 'nexa:nqtsq5g5m9tw6wvas5zcq9slmrws946ul9z45mwsfy40hqs8',
        '2147483647': 'nexa:nqtsq5g5fcpdrmvnqcsuxc2ay8kepvrlwp037mwk8mk7gxng',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15ctTJc8xgmEhwG3FYg5DR443E6RZySFt7oZPQsfPFdWP5EU',
        '1': '14NsuuVQt8kPWSzPQRvs1Krcp2MdruHa3vKu2FBWrdmWjoAN',
        '30': '1eaLza3bompJGeVdYSEzH7aYYAAEYdDigUZBYtkKmANCqUF',
        '2147483646': '1TQPMoedUcfB17kj1qNaDCrSTEWEv7QjyKsRPxWb1qLb9KF',
        '2147483647': '13JvCRHhLNLwxRhmwsssKG3ahvktySk52xfBhbCvmWpJeCaw',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-astar',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: {
        '0': 'aZBkGK9t98sVEHMnD5C6vPBGeotqtarppaDTq6AhXbwnrtX',
        '1': 'ZKBCsCRob82Hk1hw6KytqBk3T578pSAzd6Z6fQ2Aujx9NgA',
        '30': 'WasdxH4XG9T5ZfpACqMsnShmxsdWTmpfPFDFy7Fe38ocKfU',
        '2147483646': 'WPhgKWfYvzHxJ95FgEVTiXyfswyWqG1gg6XVpB1uHomzkKm',
        '2147483647': 'YFDVNziFpiajij6UYGzCmNhwMUNFMtfyfRqn1RS5nnk3YW4',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-kusama',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: {
        '0': 'HCCyHgwjGWh244y4cS7yDauLCP1gLhJFzupcnAGJxpUwr3Q',
        '1': 'FxCRtaDeiVqpZoKDVgum8PU6zeDyGYcRoSAFcU7nLxVJdmZ',
        '30': 'DDtryerNPXGcPTRScCHk5eRqWSkLutG6ZapQvBMFUMLmVhr',
        '2147483646': 'D2iuLtTQ4N7V7vgY5bRL1jhjRX6MHNT7rS8emF7Wj2K9eJa',
        '2147483647': 'EtEiQNW6x6QGYWhkwdv54aRzu3V5p17QqmSvxVXhE1HCf2R',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-joystream',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: {
        '0': 'j4VwVt1b2yczo71hGZt4kvQvthzBMNZTHXZhWbfvdGEkcrDLx',
        '1': 'j4UhVLcUJu4ywuXRcimKYiKjTUnSZfVJbhNDrEWEUjctdCxFa',
        '30': 'j4RyBmhYwck1NhM5iwspvhGzRDJF638eFN8NWPowiCkHUfhh2',
        '2147483646': 'j4Rn1p4nYeQrDa5Yz3ME4HD5h7DKS3W8SPRDpdf1UTzxT3wHo',
        '2147483647': 'j4TdXd8GbMJaWMW91GDGZ2FvRNgqpn2m6gQZ8urFteVwR71Xu',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-manta',
      params: {
        prefix: '77',
        network: 'manta',
      },
      expectedAddress: {
        '0': 'dfbAuGoefjEFTJw2WCFGGkSvHvKjDFpq1ytPmED6REi3UH57d',
        '1': 'dfZvtjQXwegEc7SkrM8X4YMirh7zRYkgL9gv6s3QGi6BUdvJZ',
        '30': 'dfXCbAVcaNMG2uGQxaF2SXJypRdnwvQ1ypT4m2M7WBDaL6gic',
        '2147483646': 'dfX1RCrrBQ26smztDfiRa7F56KYsHvmWAqjv5GCBGSUFJV13N',
        '2147483647': 'dfYrw1vLE6uqAZRUEtaU4rHupb2PgfJ8q8jFPYPRgcyEGXvpi',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rJuCpqZW9s7oPgbX1GPGZJswWBoWE9xuC2',
        '1': 'rnxLGV3eSKJ7agrYtt2M1LXeuyhuuhGqdM',
        '30': 'rUbnWh3WfqpNrRrTjC2A4Ku1JeREnwwBfZ',
        '2147483646': 'rMLT6WjRVWg3UdqRYfY8QNtg3hcV8SoMFx',
        '2147483647': 'rMy1ubn1YELtHmfRXSqmvt5gAxWwFbD64s',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '9QxMSPS5G6ijXUuSf4VqoDfB8xSEykjRyRo2jLsB267e',
        '1': 'GwXcHTGmsyu1LbXvQaSahPEzyEbi2AHBRyGvW1uxFDev',
        '30': 'FaLGisdW1u3p9aoxzykDFhveRBFyys6DovPozzYnneNf',
        '2147483646': '96pPucQk9iS76XJiFbHA6HYDvKkCCEcoRf4TE1nh1Lzy',
        '2147483647': '25j9ioySWYsDX9P7iUosJXCEw6SZm8f3U5oiKnHcz61S',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x07a1fe049c122a087a336be0e716b225',
        '1': '0xff0b852d91be3fd44e144846dad90afe',
        '30': '0x19a121f6b670ac8c4d9294c2dde514a1',
        '2147483646': '0xb5eee9f965a9f1c566e0d6a12f36904f',
        '2147483647': '0xb8ff38acdacca794a1a5fe37cbce286d',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GD4SK23B3HV4SHYTRIMSL3ELYFDQEC56MG53YDGQ3SVFWMMPSA3JCGBD',
        '1': 'GCJ6EA4OUVKR7NISTLU2RSA74DF7GPUDIGHRZMLLER43IEJ46QHRM7JT',
        '30': 'GBGAVF3U7FRZ3XZNVZJPGEIZ3OLTXA3TPQYASIVOETSTKDEMJTO6T726',
        '2147483646': 'GDB4BFHWAERLW3YUN2KYVYLNUVLTH4X6YUDYWDKNJ7QRTSAIUNYCCVUP',
        '2147483647': 'GA5G4MG56G6N6OIY5JBQPHJBNY2BMJLOB5FA4EANUKSA4D4KEMMYBF7S',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xdf7925bbbda66b7397f8ee1b0c54cd5a7d0a5c48c2d0bafab36e9e9ce8480901',
        '1': '0x3c9790e82f8b5666dfceeb08fd11060a443864874f709eb08653fd7750f1d182',
        '30': '0xb0a94d317eca42bf4789df2398a3c4f33cb3f1595e71a5016a985b81f94e11a9',
        '2147483646': '0xdb71d31f386c56212cc82a9c0355f703c6eb5529b862f92a708148ecbe97a0b6',
        '2147483647': '0xe3713dda4a0d716b748625d7f2f68ac7ab32f57584ab2876221a16fd222c54ca',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TGZKdPwyLSfq6Sji1ZGSxWhW5j7acTv7t3',
        '1': 'TNDSbh3U5b6GgRGdYSqA3QxSwVkpANpajf',
        '30': 'TMFcjvhi8yU2WAmwpWLfnAnEPFDQbumBAP',
        '2147483646': 'TP32rderTgbgXWhcY7MaReHGHsKyDenVhS',
        '2147483647': 'TKZCWFt83akRsGXhjFpLyaVSAMBxqxF3Yh',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCd5cc46c64f7e8bbb9d50e99b0dd40bda3cd8490337bb80c319126ada717b705d95b8',
        '1': 'BFCd9eff94a747c0b1bce4f13c6fb24dfa0c0d433c6f102f10dc4d796a71afae446606c',
        '30': 'BFC16a3b29584c406323a1398b4455f1f237f59e35c3f7ff446231bf9cb398809f3470b',
        '2147483646': 'BFCa205e7a1ea51ee7b84ba9e012486be5e126c75f26112f8ed0f25e3222c0054782e3b',
        '2147483647': 'BFC837db56a0b9d9474074e28cc674d47c9f364c5aab53a6c1efe203dd45d64ad086aac',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NTe8Mqp9Hm6kQwm1mpw2AEfNQGF9xDiuHz',
        '1': 'NgrERMRaVPkKeVYqv6DMJBugn4Dpgi8JBi',
        '30': 'NLLCjb7uRzeeQaP139vzQwnhaeYfuk6LQf',
        '2147483646': 'NLwynT47mgSwoZDzGCpXyzGx6NzP1t9yTq',
        '2147483647': 'NaPrxLYJgxruwdfs195U8vEBuC3CzvgPLV',
      },
    },
  ],
} as AddressTestCaseData;
