import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-密语1',
  passphrase: '12345',
  passphraseState: 'mwfiTkMnz8ed9txm7yybKCqRr4bndeTohm',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162680',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q8md26srhz4kjqlep8kwwnvf4gccjvje74t0s4t7zqjq6q7sa390h3p20hvn9c2jjms0qswze8nq0x83752rpj98099sd30sqn',
        '25': 'addr1q82d2yvzjljpvsx07m6056yfhlld638m9yzgwe5rj2fwl0a9r7gznx4j2tr7nav2x7ms6fhf74t6h37eula4klju0z7sfshjt6',
        '2147483647':
          'addr1q8shc25qzjc9rmaftrvssgpwerv9yz6p6fmqf8g0dpmpgjclcqg0hagpqexw647t5yxy2levvtmppdrt0rx322htwdxseazz8w',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '6T7X4L2JCJQAKROMAOUODI6MH6QAAMPX6ETOL3N5MROCV27N4PUCAGBSLQ',
        '25': 'ZFFZ3TVNTWIEJWF4MHO234VLZMWISPKMSOEESVC5LPED5T7XVENXSE5EOY',
        '2147483647': '45D64GZXCP4N6L222ZEJXNKMFOOZ3MQGDU3WJ5R6DYIK6DMFRR4U7B7CQQ',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x819a77ce04dbb1924fea37294214391a9d9f7759e35d3a034ac365e7be645e1c',
        '25': '0x93f4a274c69821461ca88f22b6c527304c1857398ff7868e4b3af3f9541678bf',
        '2147483647': '0x571c69e8293ef20efe701bc7b99ac127e6d581dbd17620f8acdebf779f2798d1',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1KvdWRia4GCG6mxBrUrg79Q7zdTBKH8o67',
        '25': '1JJXccjfoAasbqSKTjK3abW488eiY7yvxZ',
        '2147483647': '157rUMRu5LJ2Pox8mFt2uMr8r4JNAZHriL',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '37RpdnzsZY7GEqYoGNTkNSKYJ8eu2oLo8p',
        '25': '3Cx2XVQ9MW64xjXNxdTKPSa8Dm5nZMbyyT',
        '2147483647': '32eLtwAYPqYNNgnZWuYw8wJP4qgRxFXV4K',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q3gw5x8vh3y7e4zx7kd38kug5te5slw9ssjhkwj',
        '25': 'bc1qwqxpwwyf63kuq6zvfpt9vmw92sl3hl4eaf778g',
        '2147483647': 'bc1qxjjayvegznd5v9dunlnlxqjrhtc62jzpvrdxn7',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1psyekgpzq6v9082vv0hznnjlejt2vq0aqkk0c7cdfmsmu5x66wxvsdsxlq9',
        '25': 'bc1pxr4csmgvgvvceueju6h2uuuwph63s3zl4f4jzp0dsns0j7r2gxasv2rx6z',
        '2147483647': 'bc1pmwdg8xh9s8acdqgqxa8mz2jv32kr2qhmjf6r5gvw3ag7r004897q5pu643',
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
        '0': 'D9L8CRsxt6tZfNw82zF2Gm2ecnrH5btSrj',
        '25': 'DLwcjVxHr3ZnEL2J49pq2YR57YJy5q3Yxp',
        '2147483647': 'DK5UJFsvhM8UCsuownwKugin2zTZUqVsJM',
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
        '0': 'bitcoincash:qrqa8344fgnkx3h4z0pxm69fy3y72d4acgukq2sd0q',
        '25': 'bitcoincash:qp98cql6rplh23jpc9rt8pycllq626ky9vk9ug3x87',
        '2147483647': 'bitcoincash:qqnhpt5v378z5nqcgs0x9f0z9yja3qvpmvsr3ac4j0',
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
        '0': 'LhqX1J8pv2NA9Tn9Ft7okNhCEen1DFfQve',
        '25': 'Ld6daWUZwSfybKp3vEriW8GwyeJ6ovQHXV',
        '2147483647': 'Lfx1gUNfrdUYQjRazx2k7tLz5rd1vafxMN',
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
        '0': 'MSQ6Ygp2g8woutJz2imEYoCu8BGAReeqzS',
        '25': 'M9g2ZXU9mbvFAKmYgVkWZHZk5VVpCtrP2u',
        '2147483647': 'MMouGec1QHU2ebnMB6Rdh29jExTRyh2sg4',
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
        '0': 'ltc1qzqgl4kj7pen8azn4q9a3rlxr55ahuhkr2g5tc9',
        '25': 'ltc1qqp2m40jkwmwsg6d3wd8atrnxu2ph5any6y8jpu',
        '2147483647': 'ltc1qly7nc5sr5k30hz2xjdct6fm574s5t6eggs8c22',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aajdw67ej3ng7202wpgenbn7m5tkegw8juakz5c5y9',
        '25': 'cfx:aakumm7ydbph0yd2d4e95km9hy73357jgeu2t4ah2v',
        '2147483647': 'cfx:aam1ak63g794fpurf0k968w5eknevthy0jwksht54v',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1jj2mkftu80lrg5ehgnr4qlghptg66c52nsq3a7',
        '25': 'cosmos1dnamp9p8ufqwtfl36dapxt2zl3sr38g95j54jz',
        '2147483647': 'cosmos1x95uy3pqe5pljmcva53r5gfmheadsuyady2ulm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1jj2mkftu80lrg5ehgnr4qlghptg66c527tdkyy',
        '25': 'akash1dnamp9p8ufqwtfl36dapxt2zl3sr38g9efejtc',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1jj2mkftu80lrg5ehgnr4qlghptg66c52ttggp0',
        '25': 'cro1dnamp9p8ufqwtfl36dapxt2zl3sr38g9vfuvwn',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1jj2mkftu80lrg5ehgnr4qlghptg66c52qdf4lf',
        '25': 'fetch1dnamp9p8ufqwtfl36dapxt2zl3sr38g980a3s4',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1jj2mkftu80lrg5ehgnr4qlghptg66c52mtnptv',
        '25': 'osmo1dnamp9p8ufqwtfl36dapxt2zl3sr38g9uf89ys',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1jj2mkftu80lrg5ehgnr4qlghptg66c529zr26z',
        '25': 'juno1dnamp9p8ufqwtfl36dapxt2zl3sr38g9zqhw47',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1jj2mkftu80lrg5ehgnr4qlghptg66c524563l7',
        '25': 'terra1dnamp9p8ufqwtfl36dapxt2zl3sr38g9jkw4sz',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1jj2mkftu80lrg5ehgnr4qlghptg66c52345cqz',
        '25': 'secret1dnamp9p8ufqwtfl36dapxt2zl3sr38g9khqu07',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1jj2mkftu80lrg5ehgnr4qlghptg66c52z63p8n',
        '25': 'celestia1dnamp9p8ufqwtfl36dapxt2zl3sr38g99c99g0',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x52Bb574655391398b1CA8753514559Ce52b54728',
        '25': '0x03eF7b6aE9216cB3824f871De81F95B9D918eFE9',
        '2147483647': '0x6f6daEedf6F02FeFaf465a0b643941e263Db770D',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x1A0d128e259335726bBA36999b9262B6e73AA76d',
        '2147483647': '0xd738B85d1a5769A90B98c5c1dB0092164B271E70',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x1A0d128e259335726bBA36999b9262B6e73AA76d',
        '2147483647': '0x16F2ec7B238b798c78eF64C876a4d7A02da83c7b',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1gn5qm5rumeom6bcotlvdncandvvpwb4x753wweq',
        '25': 'f1se6ex6izxfrtxyesdwnppfvz5l2m7cbvf5qvpjq',
        '2147483647': 'f1twf3fjruem4jvwrxawmn66cw5npjkuxgekchn6q',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qr9c034atcxe44d8uaahr0vpn4uq7evkdklkw2u7ndvp5wl56y08ufhr7fdyq',
        '25': 'kaspa:qzvtmgyxazan9ukxcpa0ytypylq4qcc2uz6cw6jv94elp0ffuenak0mgtsyy4',
        '2147483647': 'kaspa:qzcf40cnsjl7gjuqppf5sg3x7ndg4nus7p2ctutdgy8z2qntnramjn2hegtqu',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '0510cd6a25885d3b92ca68c3c65ba0867e26ddf645edb135af4f216135ecc394',
        '25': '6329ebaf44a443db7b86b7aa91d7ed034f09e1a1c8faa8d1745fde97a739170f',
        '2147483647': '969c4dfe5c5337c25639e3fe2fd33171a9f250621a01833537863e24c8c58bc5',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDX6EZNIQ36RYPTT3NYPTA7FICZTVUSSGRAW23ME',
        '25': 'NBOJ624HSGHJAEIGTNKNQ5FXHFXCI63YYZ7QQ2YJ',
        '2147483647': 'NDO3SCFNC64I27AZCMKGUIYB4U24V4SQZM26MLMW',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5pmldr4u66xyvzt76q5jmlja63eup35dhn5yq234m',
        '25': 'nexa:nqtsq5g5e0scfvz4uqthmh8u95rsc579d4chklm2cvc75wat',
        '2147483647': 'nexa:nqtsq5g5yjlugdev0wzm2wqggxnz029hv62hz4xdwg6k3fet',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12UX1Vqh88tNkko8PAkLJuoxNmL5Lvs7WeCbecKS7YNR3Lwh',
        '25': '14jHPtNBSAS99iPfm2QDkmVjVexvWw5eMGYXH3kgiUyEEdd3',
        '2147483647': '12BbN16Ko16wimKQbrf5W1XdkKEEmX9mj5FiiihxyUCfg8dP',
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
        '0': 'XQpJTYi3bG1Y3pSuq9TCR95cC3Ycr1iTLyFj2XwRpLrSzj4',
        '2147483647': 'X7texoLiTUaW4Lj8X4CPWrkyjwi3SJNfn2No8vUHkB75ncz',
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
        '0': 'E3qXUvVtidq4sc4CEWP4iLofjcfTJ89tXJrsyc33FZPc3dE',
        '2147483647': 'DkuszB8ZarQ2t8LQvR8Fp4V3HWpstQp6xMyx5zZuBPeEp6g',
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
        '0': 'j4So8SCpb957w9qEMhW921ugo3XR19Wt9A66YrsNPzXVXWR71',
        '2147483647': 'j4SWCni5DowLW7qkdvC3mD1QUR5KAa7AoNX9fvykvrTKn9FoN',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rhVoS2BhBpaFpMdZz79hEAgfEr82Cux2t8',
        '2147483647': 'r9HrzgZbaiSeVHvNfLmww8yYgXzYtv4MLB',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'ESffVecegLvTv5jjSaR1tcNAfFNe25Cu8rCq84tddd6n',
        '25': '7eB55bzYzGo5hCVqtLsXcj84i92rWFjGkvN4FNHVymt3',
        '2147483647': 'BumPh5i3qM8BZ5mxzajWFrRfy7XHUihsLNchMgmbEKya',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xb711bc37a10a54b9c0de2ff919131515',
        '25': '0x66bd6d917a214bd4465d8adcd970b6a0',
        '2147483647': '0xbe6c43f08a89a831685e108215ba0d1c',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GBWLIFWMUQKSRU3TSOEN5IRAZ5X7YZQWVS43FSELW7IPOXNE3HNHOJ5S',
        '25': 'GBXOSIWEZPBW2TPNKM7R6OC2I2B5B3W3EHRQDR65A46NUBOM36W4DDAE',
        '2147483647': 'GAD5CFWDHBZKEBC3F2KGOVC64UQIGQIGV3XIMQPRAK7MJTFWBBYKOKCI',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xb67347342e588aada1208c24910f56af4dc0f7dc24e1233df0f56e89a9bd3ce5',
        '25': '0xa4ff93cd58b534778554b904bc1260e25fe08cf3e39fd4f1d467512513c45cae',
        '2147483647': '0x6ef3acc7363a8da2fa0a0dfc635fb3dc784ce14565c94d3354ea234e2fb5c321',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TVv1B9fRd4uo9SMQWpLgxBfYgGchXL9vZb',
        '25': 'TQY2nLxN81qyzrcsDFjFUW2K8HE9rxeJXZ',
        '2147483647': 'TBnXbdxn35DuECbDdr2uppdTYDHJLSGA3h',
      },
    },
  ],
} as AddressTestCaseData;
