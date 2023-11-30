import type { TestCase } from './types';

export default {
  name: 'passphrase12-1',
  passphrase: "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
  passphraseState: 'n3igG2n49CvSEt12j1jr4SKkp45oUWWmAT',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  data: [
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
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '38Zv9tLDteBymR2qc7ZN4kUBgrt7e7fiFS',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qym5md6lthdrwteeu333sy4ct3h44wyy0vqsp9eurlcs0rjcl09h7muqdppvwz5j6cemcc3nut0r8k5fkane56u6622sgy87gj',
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
      method: 'evmGetAddress',
      expectedAddress: '0x365Cd81f2978E7Be232ddB24d0516EeE5bDF3741',
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
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g55ru4vh3c8kdcaqs4caeed7s9k6p8x3w33rqy4njs',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '16gznoANGUmZhv5ttKUUhTrAzG464iGjBSLAv79JymCAe5Q',
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
      method: 'suiGetAddress',
      expectedAddress: '0xd73af1f9c55b88994a0c633e8bb3129ef447fc5e17a29b6fd1338da740365c36',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TNHAHGEw3xSemY6ZcnzY6rvYek5unzpYot',
    },
  ],
} as TestCase;
