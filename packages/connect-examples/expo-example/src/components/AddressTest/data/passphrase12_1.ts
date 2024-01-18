import type { TestCase } from './types';

export default {
  name: 'passphrase12-1',
  passphrase: "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
  passphraseState: 'n3igG2n49CvSEt12j1jr4SKkp45oUWWmAT',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qym5md6lthdrwteeu333sy4ct3h44wyy0vqsp9eurlcs0rjcl09h7muqdppvwz5j6cemcc3nut0r8k5fkane56u6622sgy87gj',
    },
    {
      method: 'algoGetAddress',
      expectedAddress: 'YAUBFJZBSZETOWS44R43BYRYYAKG5VBZH3SYJZLYMYD5XCWIR4OIXWBSHY',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0xffc3f778efb1e40ddd84738d05a4f0f3c7c3dd4d5214a7936abb067c6913883d',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/0'/0'/0/0",
      },
      expectedAddress: '1MWF2mC6xiY8VsioWRom4nq9JACmpCFvLk',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '38Zv9tLDteBymR2qc7ZN4kUBgrt7e7fiFS',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/0'/0'/0/0",
      },
      expectedAddress: 'bc1qqc5ps9vytynjktarajege0gfze6ejq8mzemhgt',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/86'/0'/0'/0/0",
      },
      expectedAddress: 'bc1p8tus88p49vm2rac67k78lakuxsvdzervaagrgvskfrqckys7cm5swk0xj3',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/3'/0'/0/0",
        coin: 'doge',
      },
      expectedAddress: 'DGsrhf1WPmqK17vBAhrVbSVFE8UgeuWaKL',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/145'/0'/0/0",
        coin: 'bch',
      },
      expectedAddress: 'bitcoincash:qrwcc6lnl40zzt6mqhxa97fnq7pwrf3fyq9pn8kzhx',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'LN2cWbczqZ9sPHAhNjMgUZJcXQfTLWW9Jd',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'M8QobNUK1xQH1hPc1X6ptoCQ8oDKREasHh',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'ltc1qr3yt25sksmfvswvrpydkdfw36528s5hzjpjm67',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aapvwdf3krdxrkv44884hy88h8naux8gzjhfb0781j',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1ct0hzch5vsux7gu687c82t4054p5j5wpaqd9tl',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'akash',
      },
      expectedAddress: 'akash1ct0hzch5vsux7gu687c82t4054p5j5wpsmqzj9',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'cro',
      },
      expectedAddress: 'cro1ct0hzch5vsux7gu687c82t4054p5j5wp9m9uhw',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: 'fetch1ct0hzch5vsux7gu687c82t4054p5j5wpwaypfg',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: 'osmo1ct0hzch5vsux7gu687c82t4054p5j5wp4m74ad',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'juno',
      },
      expectedAddress: 'juno1ct0hzch5vsux7gu687c82t4054p5j5wptjw7vr',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'terra',
      },
      expectedAddress: 'terra1ct0hzch5vsux7gu687c82t4054p5j5wpmyh9fl',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'secret',
      },
      expectedAddress: 'secret1ct0hzch5vsux7gu687c82t4054p5j5wpl9evkr',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: 'celestia1ct0hzch5vsux7gu687c82t4054p5j5wpv2u43j',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0x365Cd81f2978E7Be232ddB24d0516EeE5bDF3741',
    },
    {
      method: 'evmGetAddress',
      params: {
        path: "m/44'/61'/0'/0/0",
      },
      expectedAddress: '0xc966FF2b1F569736F5eB606033232e1eEEaAb268',
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: 'f1wba46orvunjca3loosvhxwgad3jxydku24qj4qi',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qrcju2u4f87z3jrafz6f9vvnz5t498kccrgasljrfvnq97epfw4473fth0wze',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: 'f7995136d777b3e95932219a514193e9bbda55442bad497dd6735c409c2b30db',
    },
    {
      method: 'nemGetAddress',
      expectedAddress: 'NAQEGX5KI67OVQV54GLKJ4ZSXKF5FF735IGWLX2G',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g55ru4vh3c8kdcaqs4caeed7s9k6p8x3w33rqy4njs',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '16gznoANGUmZhv5ttKUUhTrAzG464iGjBSLAv79JymCAe5Q',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: 'W2zHkWBHirQLzwQRYibNCnyQQyXMyrsftCzFLKedFjda5x8',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: 'Cg1Wmsy8rEDspj1hx5XEVzhTxYeCRyK74YbQHPkEgxAjGRh',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: 'j4RRJRVn4PCiKxnMKDDiABhLgqkLytejJNdLHPBA7BxtJddq1',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rE4B9T8GkzFiqDupHFHH5MGKmXoaWBnHkD',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '9FbUeT7UPTEkY5bdB4hS1kQCbcSnJBePWZsD2SHaFhMR',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x02c90653da07a060658f2cc1e2635d2e',
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: 'GAHQ76KFGP5EDBJOGMCYBDSRQSS2V5HSDLUJCKIVV7TEI25YINLJHBO3',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0xd73af1f9c55b88994a0c633e8bb3129ef447fc5e17a29b6fd1338da740365c36',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TNHAHGEw3xSemY6ZcnzY6rvYek5unzpYot',
    },
  ],
} as TestCase;
