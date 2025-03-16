import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase12-密语1',
  passphrase: "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
  passphraseState: 'n3igG2n49CvSEt12j1jr4SKkp45oUWWmAT',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qym5md6lthdrwteeu333sy4ct3h44wyy0vqsp9eurlcs0rjcl09h7muqdppvwz5j6cemcc3nut0r8k5fkane56u6622sgy87gj',
        '1': 'addr1q8ceklkjxcyv7vehqxw0us8etev8uhjrf89hhkvmjy46y9lunj6zs05xxzer5g2dulmlycyhky9k0xeq8f8cfkcue9qqsc8h38',
        '21234567':
          'addr1qxachsqz87rj77vgv7mvzgpxac7fc2rx6kkv84pn0rnus67j0wv8ypj89xlnpr5f5cut352mph8lvtycglm74wqqj6dqhrxftr',
        '2147483646':
          'addr1qxq8ehw0mjc6kkfyce6mjfmw86nu9epqvhwys9w73s300gg9uwp5jechh64z5vp8pu8ny8z04hmzjmr084nq2k2dyj5stq9guc',
        '2147483647':
          'addr1q96kt85vk03d4qcdfy3qpjtrw5m3909aawfthl5wn7zavm5k3ahh5k2x8ejws5wqglwejupw0mz4xwnukgtmde8pgdkqhhasck',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'YAUBFJZBSZETOWS44R43BYRYYAKG5VBZH3SYJZLYMYD5XCWIR4OIXWBSHY',
        '1': 'YLI5GGXK2BP2WWQHELUMARVZGQJICALAQIEMA7WFRRTY45HWUKCITBZIZQ',
        '21234567': '2C3IKOUU2V3UR4M7CYZIFEDKDJMXADB5PU7EVKJ3HR5KTCXU657PELROSI',
        '2147483646': 'FHVZ7M2IWOIJRKS4YIWCJX3UNYJK2NCJJTZAYB7E5C6PZVFGHER34RELMQ',
        '2147483647': 'PO62KXWBXPGV6Z4QXHAQRANUD46SETQSWU7VOCFHS5JQ4TGDA6OK2KDIGM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xffc3f778efb1e40ddd84738d05a4f0f3c7c3dd4d5214a7936abb067c6913883d',
        '1': '0x2747a7121a2f682d82114a20f73e5a16b694de1b8e5eb0d4ed5c4f3f6acf0c9c',
        '21234567': '0x1bdaebe2fa914ae7fab8bd19a4669480044d78991ede385a5769b6c413f99394',
        '2147483646': '0x4ef970d06de36556a69c8ee774b47e55ef4580afa20a43f7384907bdb521e298',
        '2147483647': '0x47d14b486bb5a02562505241268ec44a99e33184f3774f94d0025d3138d2c15b',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1MWF2mC6xiY8VsioWRom4nq9JACmpCFvLk',
        '1': '1GwT9Ux2jJiDYEn9qE9CfDXUfroHGqn61A',
        '21234567': '1Lvbk8sTjNDZb77GELg72Q4LqXnWjAmd1b',
        '2147483646': '1EAV3BLHW4EPEkpfZpBhsb86LN5MYM9hsW',
        '2147483647': '1KwqBvNSgEdSPytAzbfUJQEapbirSS6ZcF',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '38Zv9tLDteBymR2qc7ZN4kUBgrt7e7fiFS',
        '1': '3GxSZyPfxk68KKrBQJBH9hjUCMrnwcr1Kc',
        '21234567': '3DycXf1ooVmST5Wk6YBQkv2vpnZojqjEcJ',
        '2147483646': '33JaFPVMpjW6PK1xHoRMTvHwLRVMajzRou',
        '2147483647': '386se3HB8fB261FEBRZGYyjDP3X2TnC3BF',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qqc5ps9vytynjktarajege0gfze6ejq8mzemhgt',
        '1': 'bc1qc8ym9k6hjxjkxwty4ffkd8uaprps02l5me0w6h',
        '21234567': 'bc1qrr7e68wlk4d4u7pxknpmf0rrg804jtqg0zyqjh',
        '2147483646': 'bc1qgg4xm08xxm8qyuxydfp04qh8gpnkd6vzed2ars',
        '2147483647': 'bc1qhyau0py3fsflhl068gcmewwxp428xjqvcgrxlv',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1p8tus88p49vm2rac67k78lakuxsvdzervaagrgvskfrqckys7cm5swk0xj3',
        '1': 'bc1pamrkm6cen20kafvk4l75s6x63t4j0h5xg8ta75gulgh2lsgxrh4q9htkay',
        '21234567': 'bc1plp0gjqmz50mahsm8s00t5ttuvw2nem7pwa0yrw57htj3getpa5as63dhme',
        '2147483646': 'bc1pzuhdqdu0ycpjdjj08nxmlyxne4hwxrkxdwysk3cfmdk2yykal4fq3spcyz',
        '2147483647': 'bc1pj4a9dqrj8edn9u0ykxknxjhtem9w32ew85wyfl8lf8ld2ntgz4asu4t4tg',
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
        '0': 'DGsrhf1WPmqK17vBAhrVbSVFE8UgeuWaKL',
        '1': 'DEhVNVeJ7yLYJboAvP2dQpqLGPyWGpbapR',
        '21234567': 'DFxQ2agKPY3njZUtRRX21T8jBWZuJPg4x6',
        '2147483646': 'DR3MKiZ3JtR1pxiNUoxbaFcL83u6LngT3X',
        '2147483647': 'DBdKG2jgXY6Mxb8eDkYaLGTrdPLjDViE7X',
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
        '0': 'bitcoincash:qrwcc6lnl40zzt6mqhxa97fnq7pwrf3fyq9pn8kzhx',
        '1': 'bitcoincash:qpycy628w6xwy8qd5fedqsksmqgu4lrzv5kel7dmez',
        '21234567': 'bitcoincash:qqa2q3srq6mgxhv2lqlj4xddj6kvjt73nqm4z2vdkq',
        '2147483646': 'bitcoincash:qpxma5cwh94ggessfskpnafkv937s0960v9zlzl3kw',
        '2147483647': 'bitcoincash:qzgx4rxd5d6pc9a9exrcutv8ml6m98ggms28w5qrlm',
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
        '0': 'LN2cWbczqZ9sPHAhNjMgUZJcXQfTLWW9Jd',
        '1': 'LZY1Q1oFrtn2SyNjM24XKrCXJw9fMfbNFp',
        '21234567': 'LcovRCnctBo1n3HkS5zDgHRhgwGpViYVPW',
        '2147483646': 'LN6UQQmVQhtiC7G6dtiF8wqQQd4VoQxKTA',
        '2147483647': 'LhprJGAwFq2q33NXtQ912cjrvopzkWEMXk',
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
        '0': 'M8QobNUK1xQH1hPc1X6ptoCQ8oDKREasHh',
        '1': 'MDotq5WNXnoQQ45MaTaUnkVka3DvdTXA91',
        '21234567': 'MPwoGRhvoKg9skokdGjL5hNJjbni59DdYM',
        '2147483646': 'MTx2dWHvnp2RsmBcDx58tms2jWhCt63nKU',
        '2147483647': 'MNWqpezEUcW4DpSmqZ4mHMPUF9X9ZaYK4B',
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
        '0': 'ltc1qr3yt25sksmfvswvrpydkdfw36528s5hzjpjm67',
        '1': 'ltc1qkhfkw5nlf2sr2rlymfqx0x6dk6p0naeff3n02x',
        '21234567': 'ltc1qlw9j9chgttavprm6yqca3mha89seqmrl3k2e4x',
        '2147483646': 'ltc1q759mn3536l848rm7ld5g923kuesvk2l383rlps',
        '2147483647': 'ltc1ql6yv0uvfw52pntypclfltnnmakhqpcqzytr38k',
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
        '0': 'NYSTb357abjPDH3VRbnFgNdgQWM6hH4o6V',
        '1': 'NcdKnVssdxjUxXz6ZWUGEMQgccNFXzobn7',
        '21234567': 'NUEdJhWW3Jy2ez3D8eT2hMzrC26sfABYq4',
        '2147483646': 'NUrEoTqeHV18zF7ucNE3bF4FWsLy3K8RJ5',
        '2147483647': 'NSxaB5Xn9Tj96sntfDiS4TPZVeBucvVtwG',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aapvwdf3krdxrkv44884hy88h8naux8gzjhfb0781j',
        '1': 'cfx:aak96bjwwrx0ubvmg0hef0hv39ujtfxmdeyx7m03p2',
        '21234567': 'cfx:aajwn9fe0g7dcc2u0j1udpy2aawxmx6pbug1frjc1y',
        '2147483646': 'cfx:aanrvrnv8db4uehx1feysvkrn9a1rb64dpxf00g8tu',
        '2147483647': 'cfx:aajjjyu6u78jfx35g35zgpc06dggs53s428kj97sy7',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1ct0hzch5vsux7gu687c82t4054p5j5wpaqd9tl',
        '1': 'cosmos1k3xuzyjdvpwmde6a5hkja977x8jg4nrtzq3f38',
        '21234567': 'cosmos1vqngc0m04ke9ap5ajkfudzszu3c2pl0rppv053',
        '2147483646': 'cosmos1whemlqhfp79n95497xuvpm9de9gmz63qevq3d0',
        '2147483647': 'cosmos1sqe5e00j6kaz662tuk5ca4h7t0ravmc45v0ts8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1ct0hzch5vsux7gu687c82t4054p5j5wpsmqzj9',
        '1': 'akash1k3xuzyjdvpwmde6a5hkja977x8jg4nrt0muwga',
        '21234567': 'akash1vqngc0m04ke9ap5ajkfudzszu3c2pl0rv6pgdt',
        '2147483646': 'akash1whemlqhfp79n95497xuvpm9de9gmz63q5hdk54',
        '2147483647': 'akash1sqe5e00j6kaz662tuk5ca4h7t0ravmc4ehzvfa',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1ct0hzch5vsux7gu687c82t4054p5j5wp9m9uhw',
        '1': 'cro1k3xuzyjdvpwmde6a5hkja977x8jg4nrt6mesdk',
        '21234567': 'cro1vqngc0m04ke9ap5ajkfudzszu3c2pl0re6ykgq',
        '2147483646': 'cro1whemlqhfp79n95497xuvpm9de9gmz63qphgg37',
        '2147483647': 'cro1sqe5e00j6kaz662tuk5ca4h7t0ravmc4vh8jvk',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1ct0hzch5vsux7gu687c82t4054p5j5wpwaypfg',
        '1': 'fetch1k3xuzyjdvpwmde6a5hkja977x8jg4nrt3acdns',
        '21234567': 'fetch1vqngc0m04ke9ap5ajkfudzszu3c2pl0rju9tkx',
        '2147483646': 'fetch1whemlqhfp79n95497xuvpm9de9gmz63q23f40c',
        '2147483647': 'fetch1sqe5e00j6kaz662tuk5ca4h7t0ravmc483x0js',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1ct0hzch5vsux7gu687c82t4054p5j5wp4m74ad',
        '1': 'osmo1k3xuzyjdvpwmde6a5hkja977x8jg4nrt2mze84',
        '21234567': 'osmo1vqngc0m04ke9ap5ajkfudzszu3c2pl0rf6llzr',
        '2147483646': 'osmo1whemlqhfp79n95497xuvpm9de9gmz63q3hnpma',
        '2147483647': 'osmo1sqe5e00j6kaz662tuk5ca4h7t0ravmc4uhumx4',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1ct0hzch5vsux7gu687c82t4054p5j5wptjw7vr',
        '1': 'juno1k3xuzyjdvpwmde6a5hkja977x8jg4nrt5jjjkm',
        '21234567': 'juno1vqngc0m04ke9ap5ajkfudzszu3c2pl0rhn05nd',
        '2147483646': 'juno1whemlqhfp79n95497xuvpm9de9gmz63q07r22n',
        '2147483647': 'juno1sqe5e00j6kaz662tuk5ca4h7t0ravmc4z7vshm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1ct0hzch5vsux7gu687c82t4054p5j5wpmyh9fl',
        '1': 'terra1k3xuzyjdvpwmde6a5hkja977x8jg4nrtyytfn8',
        '21234567': 'terra1vqngc0m04ke9ap5ajkfudzszu3c2pl0r89k0k3',
        '2147483646': 'terra1whemlqhfp79n95497xuvpm9de9gmz63qlg6300',
        '2147483647': 'terra1sqe5e00j6kaz662tuk5ca4h7t0ravmc4jg4tj8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1ct0hzch5vsux7gu687c82t4054p5j5wpl9evkr',
        '1': 'secret1k3xuzyjdvpwmde6a5hkja977x8jg4nrtq99qvm',
        '21234567': 'secret1vqngc0m04ke9ap5ajkfudzszu3c2pl0rrycxfd',
        '2147483646': 'secret1whemlqhfp79n95497xuvpm9de9gmz63qmf5csn',
        '2147483647': 'secret1sqe5e00j6kaz662tuk5ca4h7t0ravmc4kfmzdm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1ct0hzch5vsux7gu687c82t4054p5j5wpv2u43j',
        '1': 'celestia1k3xuzyjdvpwmde6a5hkja977x8jg4nrtn2qet2',
        '21234567': 'celestia1vqngc0m04ke9ap5ajkfudzszu3c2pl0rstalwu',
        '2147483646': 'celestia1whemlqhfp79n95497xuvpm9de9gmz63qgx3phz',
        '2147483647': 'celestia1sqe5e00j6kaz662tuk5ca4h7t0ravmc49x7m22',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'Xwnf9s2JvpAH9yH4qjukQUabKVY9DPdkPRocWmukeXXs4tz5Z6prxBNJBx4KxqnPNP16bB7zCB3UVgqk2z7DF9hi1WRE6XerU',
        '1': 'XwmwMnXvg9x1LXmq1hKKmbYhcGVZGTv1NMoWrEvkoNuYHdJX94UhyTYfnXEYJZ5rN4eak8n2bJ991MfUYbk6fvhq1ZB4WX3RS',
        '21234567':
          'XwoGgxJhxKnhD2UBo391p2dJ6WpzURmt1htExuwHZJnLhv5ojytrogR1NnRhTSYPwvFXhr3xKVs9jAbEVUsPbgen2L9HayUCz',
        '2147483646':
          'XwmpsYRYDMLjUE4H7f1ECp2jiXHdBqBHa7nCVcPrbpFZ6SR7Avb9MH9XUXDPorvanqbHbDuydtwErGyKpUJzHojs1LiLp49wF',
        '2147483647':
          'XwoSFcw5U4Dexi7xzAMfdeXHhF7CRT34Nc8paboGzQzjB33uP3qkWNmcnga1s6Scb1Jb9BmD6R5bW45urgsEW6PR35UbgpT2d',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x365Cd81f2978E7Be232ddB24d0516EeE5bDF3741',
        '1': '0x211BC895E91b6bF686B9E67d0E6a4AFD4062B7AB',
        '21234567': '0x995e0cb1e934401e6f788e2C6D50264A6153ee2a',
        '2147483646': '0x26b34331725c9922dea2d62899b39ADF5fE9eC26',
        '2147483647': '0xD9e27d88322e681ad7F45C57A0eF829283c7CA7e',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0xc966FF2b1F569736F5eB606033232e1eEEaAb268',
        '1': '0x77D78FAEcA1fF60F95149995fe4286F0e34B5382',
        '21234567': '0x0DCb00f2eC12F9482a8158Cf9dA1190e839Fa79f',
        '2147483646': '0xFa1C032e162aEEb5a4c5744c2089D8Fd1Fcb0fC3',
        '2147483647': '0x271e9fFEa88f8834B9444af67962D9Ac4748C0F5',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0xc966FF2b1F569736F5eB606033232e1eEEaAb268',
        '1': '0xE2306fc83087776B43eAA7c57dB2994539863d32',
        '21234567': '0xC833a4fb515CEB018b62F4a1Df6573e548F395aC',
        '2147483646': '0x8024956c56C78b1C1472f95Ca4f22aeF4D0a1Eec',
        '2147483647': '0x537c90F1E917870E34794A6D192E332A22433182',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1wba46orvunjca3loosvhxwgad3jxydku24qj4qi',
        '1': 'f14k5xulleawp4mvcsxa5cxbno2xtikhunjryym6q',
        '21234567': 'f1pmpvcj3uppkm4izeba52g6hrqqbdbpwnqnizyoy',
        '2147483646': 'f14svwfzxvio2wwihiblvqusnp4fxukpmjgmfy4gi',
        '2147483647': 'f1nrtnkfrsnp2wcziyzz6j7ife4dtnxwhrheafppi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qrcju2u4f87z3jrafz6f9vvnz5t498kccrgasljrfvnq97epfw4473fth0wze',
        '1': 'kaspa:qr7yn6wy9zx4arpe2kmdfsylvgmmje0nqd6m7a58uy29w2662y3gxwk7trtj5',
        '21234567': 'kaspa:qpkdjlv8stcy7v3xgc75ggre4ktlcpy6dwxn5vpewfr8vt07esrs2gdt97jtj',
        '2147483646': 'kaspa:qzcgja8v95unfygwl24l6lwz587re5um3vpwqs5ctqz0grc7yvyjshx7x3a0h',
        '2147483647': 'kaspa:qrej5790wp3ky399wd5r4cren2vqyqjexw5t7r5fe6rwdths49h0gup6348xs',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'f7995136d777b3e95932219a514193e9bbda55442bad497dd6735c409c2b30db',
        '1': '7acef7d04eee0f7499355e61db601cc0fbafaa8dc039b00d2d30c4bda9e4452d',
        '21234567': '08aeabf075515a103d92e05d0b5241200bd8e88b594014ca86afa37b5009c9eb',
        '2147483646': 'd88a5d7e58ab0f24d9e88d88f8f259be518b49b6335d4d78712a026fd8098195',
        '2147483647': '4ed4b3a17748e3ee6d0b704027884b325e524fb204a652615889c607f7c519fe',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyq2ev90yy5kumqjswy0ppe5xxtyjdw8ugus3cy75w',
        '1': 'ckb1qyqg4rygdk065n9x3h684fgn99q7h7z7v2cqzj0d9z',
        '21234567': 'ckb1qyq0gd5jl42hqjza6j7mk2qe69scqcc8v2yq2z07a0',
        '2147483646': 'ckb1qyq8nfqpfwjpmucn87q05js6akqwtynhy5xsrzjqsr',
        '2147483647': 'ckb1qyq9dfxz28zhdkmxhu5xtudx2fqg3se99chssptx94',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NAQEGX5KI67OVQV54GLKJ4ZSXKF5FF735IGWLX2G',
        '1': 'ND7KIEKE2VA3QT2TL42HQTMZIYWCCWA3EAZKTY3B',
        '21234567': 'ND5DT27FHDUU37XDWNQQNY7BXUPHACPXTPQIMHB5',
        '2147483646': 'NDGVL55GE4QTB4RBEHKETKNMQYGHJUEGXI45GN5I',
        '2147483647': 'NAVCEM22FYE5ZYXC54QJ22VVGRM5JAFIZJUUDU3Z',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g55ru4vh3c8kdcaqs4caeed7s9k6p8x3w33rqy4njs',
        '1': 'nexa:nqtsq5g5ulffzmas02ufnmc3md8g6jxdgzegzmvuscxhyzzk',
        '21234567': 'nexa:nqtsq5g5ra3vpqlrn2pqutnkrhy6709netxkgr9zavmajnj8',
        '2147483646': 'nexa:nqtsq5g5yd3f30z55afdvgn40hycj2zcrjvd4lcm4avdcxyu',
        '2147483647': 'nexa:nqtsq5g5me2r9feelzky4kxaghe7w0uqkujj2stmsvhgfz9a',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16gznoANGUmZhv5ttKUUhTrAzG464iGjBSLAv79JymCAe5Q',
        '1': '12sJXDN4TxEQuSA9Z54LFRv6j99ACuJupcwRkarAyiJMAXgU',
        '21234567': '14UJNzfmTfQuzrELHD47Sa9SUpi4WQzNiLUwi25Djaq9gQmY',
        '2147483646': '147TeVBMHxDPNkhAF5eaC1nhBDZXLKEzQy1N7yvw7nHrcZit',
        '2147483647': '12YkXsZJnhbsimp9WZC4rvjuC86oYxS6AGW39MzLzk9THBpk',
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
        '0': 'W2zHkWBHirQLzwQRYibNCnyQQyXMyrsftCzFLKedFjda5x8',
        '1': 'XobpB55PQc3gjBU5jTT8wFDxZrdUpTWmKi5q14gHzGnaMbd',
        '21234567': 'ZQbfxNnP7nYn9FeosTEL5UZiFRXnL8yf3FbnSHj3rob64wp',
        '2147483646': 'Z3kwStNDQb2A3iUmk3h5X7pQeGzcEPbMfn2CQ9SS4GJ23Di',
        '2147483647': 'XV3pqGKi9yWW4qU3DbBkS52RYpGpsah6yGhDnCrK27tgjgS',
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
        '0': 'Cg1Wmsy8rEDspj1hx5XEVzhTxYeCRyK74YbQHPkEgxAjGRh',
        '1': 'ESd3CSsEXysDYy5N8pP1ESx27RkKGZxCW3gyx8muRVKjAAL',
        '21234567': 'G3ctykaEFANJy3G6GpACNgHmnzecnFR6DbCwPMpfJ28EuET',
        '2147483646': 'FgnAUGA4XxqgsW649QcwpKYUBr7SgW2nr7dMMDY3VUqAwDy',
        '2147483647': 'E853re7ZHML2td5Kcx7cjGkV6PPfKh8Y9cJNjGwvTLRqxku',
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
        '0': 'j4RRJRVn4PCiKxnMKDDiABhLgqkLytejJNdLHPBA7BxtJddq1',
        '1': 'j4TBuwvLxUtTyJWbNsQT1xRnwPuE61VKwU4qNxqu8rhRTdY45',
        '21234567': 'j4UnuohefUbeUPvfZbYSo9a2H9anzK11QMnNtvH8BcZxG9ScK',
        '2147483646': 'j4US55CAFJtSwmq8PZR3Fu1fXqyeT8uG24QuKLEytzmQy5RBP',
        '2147483647': 'j4SsMxaYCodqS7rFNptakZvcjrtBjMYT7oiPzMd3JsjGZkB4n',
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
        '0': 'dfWehpHqh8oxzAhgYqaug1jL645tqmv72px2Y1iKuASBA4Jm7',
        '1': 'dfYRKLiQbEVidWRvcVmeXnTnLcEmwtkhfvPXdbP4vqAiK4b6X',
        '21234567': 'dfa2KCViJECu8bqzoDueJyc1gMvLrCGP8p759YpHyb3F7a2ex',
        '2147483646': 'dfZfUTzDt4VhbykTdBnEmj3ew4KCK2AdkWjbZxn9gyEhpWD6y',
        '2147483647': 'dfY6mMNbqZF66KmacTFnGPxc95DjbEoprG36EzAD6rCZRBBMe',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rE4B9T8GkzFiqDupHFHH5MGKmXoaWBnHkD',
        '1': 'rwnADBPDPjyetPMcqNfvgD9CiLQDTuvMzE',
        '21234567': 'rLD5mzjiFkdbnNcxGFJ25vLxdMhHU5f2BH',
        '2147483646': 'rD9LXbYe784iEsjmx1ARaaRUwoo8Xiz6X4',
        '2147483647': 'rahkYWpHGRRFufYxmr9A1eL6GhoH56GTsE',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '9FbUeT7UPTEkY5bdB4hS1kQCbcSnJBePWZsD2SHaFhMR',
        '1': 'EqPiEb7DUG168MGba9dE9eFtPSztE35t5MQnDw8w7h48',
        '21234567': '4nuqopnmWSBmUnUZ3Bt9xgDxtUwtzhujLBMpqmRvfZQw',
        '2147483646': '57uiwcyoYiui6EtAVHAnD845rNoZoVSpnu3w5to49EYC',
        '2147483647': 'BCVKPWUr6oZJ3pqxECxRpXp2Eg4V8AYjZubnfDHQmmnx',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x02c90653da07a060658f2cc1e2635d2e',
        '1': '0x229c09a302c6cc1f80deffb960f2ae72',
        '21234567': '0x58b1ad18046e80e583ac849d3f23bf54',
        '2147483646': '0xb350e0a26c722a815a7d7670d0df0900',
        '2147483647': '0xd2a61d25e0cbe86c739e9ae522901764',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GAHQ76KFGP5EDBJOGMCYBDSRQSS2V5HSDLUJCKIVV7TEI25YINLJHBO3',
        '1': 'GCW2IZXEJ5APFOQY33AIDMN756VIPA3APO6M45WYY5JPCYBM35QJM3WU',
        '21234567': 'GC734ZOYZSN6U3OHZRCCY4PKX6CJGCYYLUZOKPGZJN2YYSGD3SINVW5B',
        '2147483646': 'GBCI56KYTJWXVQEH56OPNB2BINJX5PEGBPDHB7P5P64YRIA7TZJ2GCRU',
        '2147483647': 'GB7NUXHAK2HHBQINH4EIEJUJ353IS4QUME5I2NYZXXWAIIGEQWLXZCY2',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xd73af1f9c55b88994a0c633e8bb3129ef447fc5e17a29b6fd1338da740365c36',
        '1': '0x8dd04fe03b67f182743e3e3bc6d87d6a39f5f3713bb6d6fcc2cba7238ee973fb',
        '21234567': '0x934bf234447ce3bc91f335306747853a13f718eb00c7390ba8633a3eef932639',
        '2147483646': '0xcd415e502738913c0ab84f7626d8cefb7cc17e4ae9b60ce4382ccdc96740acd9',
        '2147483647': '0xb2f877af1d004c5de8fdfdbb19e3656e655795f3e559220055f2f8d95bb089f2',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TNHAHGEw3xSemY6ZcnzY6rvYek5unzpYot',
        '1': 'TWBNsavDvN5ku36PSUQQ81DJxBvAis83wd',
        '21234567': 'TCcriMJrLEcKDS9zvncMBGbETXQTzaopgn',
        '2147483646': 'TUVYzN6hGhQH7dAPoUR4NqdXuP97xPz1e9',
        '2147483647': 'TLJQqC8iAMVXsCDZxqSraTTFz7KU9CvfTx',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC5996d4c6a609a4046a55de8cf69adc17b3d8b34eea8fe908a684df69f8d238c4c57f',
        '1': 'BFCfd971b4be078ba5a8fbdfedbd9683dbc637ce70f90b29c05510b90cc12ba71174654',
        '21234567': 'BFC0751e3c028b24b6f0468ec1d4a6ca8faac3dfe902990eab63b2554bfa4a21efe06e6',
        '2147483646': 'BFC451eb6959283fb3e7e1815e3e82d12c54029f8894129c15b9643fc3ff17d63144e58',
        '2147483647': 'BFC6552ce65776890a22cd85d878a18dc3bfbcd0475433d63fe4f6e48ab3d62144dd16a',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NXUYoWxqgELQySd7NkCWRJnhQRgYdCTvan',
        '1': 'NbtAXCzWFGGFc11FsWVnQUTgBHGNWMjnDJ',
        '21234567': 'NinQZ8QhLoS59cYLKWJG8temCPnwE2dbhW',
        '2147483646': 'NgQ9DVjbDtn3icSVm6UyvDLJSB4Xuho4Ga',
        '2147483647': 'NRxAxJ91f4xaey1wj1N7LBZPbVTgEAHNzY',
      },
    },
  ],
} as AddressTestCaseData;
