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
        0: 'addr1qym5md6lthdrwteeu333sy4ct3h44wyy0vqsp9eurlcs0rjcl09h7muqdppvwz5j6cemcc3nut0r8k5fkane56u6622sgy87gj',
        1: 'addr1q8ceklkjxcyv7vehqxw0us8etev8uhjrf89hhkvmjy46y9lunj6zs05xxzer5g2dulmlycyhky9k0xeq8f8cfkcue9qqsc8h38',
        2123456789:
          'addr1qyclk2xdlrgzhe6rqqdj9utgc6hpqk8gcpu6nqgcfc85e4xlapjgjkdqyg9rnjwy9f6h0ndc0u0uwmrdgcuenwxz08ds05q0fv',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        0: 'YAUBFJZBSZETOWS44R43BYRYYAKG5VBZH3SYJZLYMYD5XCWIR4OIXWBSHY',
        1: 'YLI5GGXK2BP2WWQHELUMARVZGQJICALAQIEMA7WFRRTY45HWUKCITBZIZQ',
        212345678: '72TAJ7PGBUKUCLTU3BEUZP2ZJRQHOSCIGY3VWEWK43KUJ7PFQ6LFDAD3UE',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        0: '0xffc3f778efb1e40ddd84738d05a4f0f3c7c3dd4d5214a7936abb067c6913883d',
        1: '0x2747a7121a2f682d82114a20f73e5a16b694de1b8e5eb0d4ed5c4f3f6acf0c9c',
        21234567: '0x1bdaebe2fa914ae7fab8bd19a4669480044d78991ede385a5769b6c413f99394',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '1MWF2mC6xiY8VsioWRom4nq9JACmpCFvLk',
        1: '1GwT9Ux2jJiDYEn9qE9CfDXUfroHGqn61A',
        2123456: '1nDLfzzF2PSimSoewouoLMBkJfLpLUTZP',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: `m/49'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '38Zv9tLDteBymR2qc7ZN4kUBgrt7e7fiFS',
        1: '3GxSZyPfxk68KKrBQJBH9hjUCMrnwcr1Kc',
        212345: '358YxRjoZ8gmYvjSwrTsbST97Ty93Rz7FL',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: `m/84'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1qqc5ps9vytynjktarajege0gfze6ejq8mzemhgt',
        1: 'bc1qc8ym9k6hjxjkxwty4ffkd8uaprps02l5me0w6h',
        21234: 'bc1qj30k5ahqtqe6jgajnzm2k2yecg5ds2y5ftxsps',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: `m/86'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1p8tus88p49vm2rac67k78lakuxsvdzervaagrgvskfrqckys7cm5swk0xj3',
        1: 'bc1pamrkm6cen20kafvk4l75s6x63t4j0h5xg8ta75gulgh2lsgxrh4q9htkay',
        2123: 'bc1pnvl8w9a06tzlhekup4a2l3qe9k8qz486kyn0elnsedymg927p68qlszgt7',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: `m/44'/3'/${INDEX_MARK}'/0/0`,
        coin: 'doge',
      },
      expectedAddress: {
        0: 'DGsrhf1WPmqK17vBAhrVbSVFE8UgeuWaKL',
        1: 'DEhVNVeJ7yLYJboAvP2dQpqLGPyWGpbapR',
        2123456789: 'D8QrinqM8HAqJi8hRQ5mSAMkLVE1xDA4U5',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: `m/44'/145'/${INDEX_MARK}'/0/0`,
        coin: 'bch',
      },
      expectedAddress: {
        0: 'bitcoincash:qrwcc6lnl40zzt6mqhxa97fnq7pwrf3fyq9pn8kzhx',
        1: 'bitcoincash:qpycy628w6xwy8qd5fedqsksmqgu4lrzv5kel7dmez',
        212345678: 'bitcoincash:qpnlzhj7pe527snngnyh3cqjuctevkupvvkv56chyp',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: `m/44'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'LN2cWbczqZ9sPHAhNjMgUZJcXQfTLWW9Jd',
        1: 'LZY1Q1oFrtn2SyNjM24XKrCXJw9fMfbNFp',
        21234567: 'LcovRCnctBo1n3HkS5zDgHRhgwGpViYVPW',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: `m/49'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'M8QobNUK1xQH1hPc1X6ptoCQ8oDKREasHh',
        1: 'MDotq5WNXnoQQ45MaTaUnkVka3DvdTXA91',
        2123456: 'MRZw4f5SadV6UkvtPkrrE18oRhEPyivRWe',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: `m/84'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'ltc1qr3yt25sksmfvswvrpydkdfw36528s5hzjpjm67',
        1: 'ltc1qkhfkw5nlf2sr2rlymfqx0x6dk6p0naeff3n02x',
        212345: 'ltc1qpf3e6qhp8d98vd95802pp4knkmt45neuzwfa2w',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        0: 'cfx:aapvwdf3krdxrkv44884hy88h8naux8gzjhfb0781j',
        1: 'cfx:aak96bjwwrx0ubvmg0hef0hv39ujtfxmdeyx7m03p2',
        21234: 'cfx:aar4zxra15kxuhdjejfn0cw8380b33u6kj360xfpuk',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        0: 'cosmos1ct0hzch5vsux7gu687c82t4054p5j5wpaqd9tl',
        1: 'cosmos1k3xuzyjdvpwmde6a5hkja977x8jg4nrtzq3f38',
        2123456789: 'cosmos1204nhwgl66rk8avv4ef6a9wrxym7df5tmn6y8g',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        0: 'akash1ct0hzch5vsux7gu687c82t4054p5j5wpsmqzj9',
        1: 'akash1k3xuzyjdvpwmde6a5hkja977x8jg4nrt0muwga',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        0: 'cro1ct0hzch5vsux7gu687c82t4054p5j5wp9m9uhw',
        1: 'cro1k3xuzyjdvpwmde6a5hkja977x8jg4nrt6mesdk',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        0: 'fetch1ct0hzch5vsux7gu687c82t4054p5j5wpwaypfg',
        1: 'fetch1k3xuzyjdvpwmde6a5hkja977x8jg4nrt3acdns',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        0: 'osmo1ct0hzch5vsux7gu687c82t4054p5j5wp4m74ad',
        1: 'osmo1k3xuzyjdvpwmde6a5hkja977x8jg4nrt2mze84',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        0: 'juno1ct0hzch5vsux7gu687c82t4054p5j5wptjw7vr',
        1: 'juno1k3xuzyjdvpwmde6a5hkja977x8jg4nrt5jjjkm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        0: 'terra1ct0hzch5vsux7gu687c82t4054p5j5wpmyh9fl',
        1: 'terra1k3xuzyjdvpwmde6a5hkja977x8jg4nrtyytfn8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        0: 'secret1ct0hzch5vsux7gu687c82t4054p5j5wpl9evkr',
        1: 'secret1k3xuzyjdvpwmde6a5hkja977x8jg4nrtq99qvm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        0: 'celestia1ct0hzch5vsux7gu687c82t4054p5j5wpv2u43j',
        1: 'celestia1k3xuzyjdvpwmde6a5hkja977x8jg4nrtn2qet2',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        0: '0x365Cd81f2978E7Be232ddB24d0516EeE5bDF3741',
        1: '0x211BC895E91b6bF686B9E67d0E6a4AFD4062B7AB',
        2123456789: '0xBd4dE8cB019789bE3AFB122e3DEfdC7D91af3fEe',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: `m/44'/60'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '0x365Cd81f2978E7Be232ddB24d0516EeE5bDF3741',
        1: '0x9fAe99846AFb1c04D253523Ad4f67868306e428f',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: `m/44'/61'/0'/0/${INDEX_MARK}`,
      },
      expectedAddress: {
        0: '0xc966FF2b1F569736F5eB606033232e1eEEaAb268',
        1: '0xE2306fc83087776B43eAA7c57dB2994539863d32',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        0: 'f1wba46orvunjca3loosvhxwgad3jxydku24qj4qi',
        1: 'f14k5xulleawp4mvcsxa5cxbno2xtikhunjryym6q',
        212345678: 'f1jea737f2qyn5hbnh7asq7idiltd2jj2edqa5z5y',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        0: 'kaspa:qrcju2u4f87z3jrafz6f9vvnz5t498kccrgasljrfvnq97epfw4473fth0wze',
        1: 'kaspa:qr7yn6wy9zx4arpe2kmdfsylvgmmje0nqd6m7a58uy29w2662y3gxwk7trtj5',
        21234567: 'kaspa:qpkdjlv8stcy7v3xgc75ggre4ktlcpy6dwxn5vpewfr8vt07esrs2gdt97jtj',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        0: 'f7995136d777b3e95932219a514193e9bbda55442bad497dd6735c409c2b30db',
        1: '7acef7d04eee0f7499355e61db601cc0fbafaa8dc039b00d2d30c4bda9e4452d',
        2123456: '7a6e748c8f824192062d8f53a167ed48dc6ad5375c162fa3caae630e0889c692',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        0: 'NAQEGX5KI67OVQV54GLKJ4ZSXKF5FF735IGWLX2G',
        1: 'ND7KIEKE2VA3QT2TL42HQTMZIYWCCWA3EAZKTY3B',
        212345: 'NBIN3AQDBKAXEIYSYTEYY3KXHL7ALLHS7GNHOTIL',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        0: 'nexa:nqtsq5g55ru4vh3c8kdcaqs4caeed7s9k6p8x3w33rqy4njs',
        1: 'nexa:nqtsq5g5ulffzmas02ufnmc3md8g6jxdgzegzmvuscxhyzzk',
        2123456789: 'nexa:nqtsq5g5xmr007jngs9dyx983quf4q2tlc9r6zqxas7wa3t2',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        0: '16gznoANGUmZhv5ttKUUhTrAzG464iGjBSLAv79JymCAe5Q',
        1: '12sJXDN4TxEQuSA9Z54LFRv6j99ACuJupcwRkarAyiJMAXgU',
        2123: '16CYNdfjtLVfmYc3psG3LZs1GzftUg3g76B9Gt2FxouB46BF',
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
        0: 'W2zHkWBHirQLzwQRYibNCnyQQyXMyrsftCzFLKedFjda5x8',
        1: 'XobpB55PQc3gjBU5jTT8wFDxZrdUpTWmKi5q14gHzGnaMbd',
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
        0: 'Cg1Wmsy8rEDspj1hx5XEVzhTxYeCRyK74YbQHPkEgxAjGRh',
        1: 'ESd3CSsEXysDYy5N8pP1ESx27RkKGZxCW3gyx8muRVKjAAL',
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
        0: 'j4RRJRVn4PCiKxnMKDDiABhLgqkLytejJNdLHPBA7BxtJddq1',
        1: 'j4TBuwvLxUtTyJWbNsQT1xRnwPuE61VKwU4qNxqu8rhRTdY45',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        0: 'rE4B9T8GkzFiqDupHFHH5MGKmXoaWBnHkD',
        1: 'rwnADBPDPjyetPMcqNfvgD9CiLQDTuvMzE',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        0: '9FbUeT7UPTEkY5bdB4hS1kQCbcSnJBePWZsD2SHaFhMR',
        1: 'EqPiEb7DUG168MGba9dE9eFtPSztE35t5MQnDw8w7h48',
        212345678: '3beahnDck8Z5Di5Ttq3M9N7ZpywQe2VupyD36sfe9AXK',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        0: '0x02c90653da07a060658f2cc1e2635d2e',
        1: '0x229c09a302c6cc1f80deffb960f2ae72',
        21234567: '0x58b1ad18046e80e583ac849d3f23bf54',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        0: 'GAHQ76KFGP5EDBJOGMCYBDSRQSS2V5HSDLUJCKIVV7TEI25YINLJHBO3',
        1: 'GCW2IZXEJ5APFOQY33AIDMN756VIPA3APO6M45WYY5JPCYBM35QJM3WU',
        2123456: 'GC22LUSZLWMIBDWNEPLIST4SSTW3JK4Q4FMVWVRUJSKFFNOW4FXTG6ID',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        0: '0xd73af1f9c55b88994a0c633e8bb3129ef447fc5e17a29b6fd1338da740365c36',
        1: '0x8dd04fe03b67f182743e3e3bc6d87d6a39f5f3713bb6d6fcc2cba7238ee973fb',
        212345: '0x1b06f97f634ce9ec13a7069f636f297e0d62115fd525895354d31eeac2951f57',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        0: 'TNHAHGEw3xSemY6ZcnzY6rvYek5unzpYot',
        1: 'TWBNsavDvN5ku36PSUQQ81DJxBvAis83wd',
        21234: 'TEqsRv5YaM5EX1MDzZo5fwAQz4aPqGRbvK',
      },
    },
  ],
} as AddressTestCaseData;
