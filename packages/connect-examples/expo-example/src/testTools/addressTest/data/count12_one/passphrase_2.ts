import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-密语2',
  passphrase: 'jFhC5z@Dk%ya2edpvkECr~qr',
  passphraseState: 'mwtNPp4ak7Cj3bEdDsFqQ3bHityz2mFAT5',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162680',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qysxa3psfysjqn9thpdsh6mu3zl7accuts9pgk897f5dwh6exnsw477v78753974lm443any46tt9u2czax3mrxnavlspcff8h',
        '1': 'addr1qy23d0ewcdk27eh6x89wmtzzjnn6jujwwg3qljvtp6y0ugqf4jh3vxksvvyprypkz2hwtadh29kdakmp2f2m4l8fjfks8mql49',
        '25': 'addr1qxsw978fugu6fupj4upn8dnvm5xuwf2rz9hc6llkukzud5wyww2ktd5nxxwcah8zq9vdau8rz9200sks9mdvq9yl0ltsvv4nk2',
        '2147483646':
          'addr1q99xgsukfegkyk69h64g9umkxjxq6840nnqvyhruycsrxqk4ju7zrausm0q3lgrfj5jg023akmpzqea9vqfzp50mnutsaj2vxz',
        '2147483647':
          'addr1qyya8stt5xgkl08qnkx5shxwnwl0gsksr4gjnzkkhs9wjjakd8dsg2ddy6ts4qtnxu2ss5887qxyugccah097q9uclyqsjfc4x',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'EMLA73ODZWMPQ2MYUN2KUZ2CXQHWUJKHME2NG2NKP66UO64QWSJNDHKCEQ',
        '1': '5GF3BHVEPAXONS2LPYOFKPUA5NRG66QK2NCGVVG3QSCJ7DRKRWP3G4IHGY',
        '25': 'TZ3YXXX6RSPU2T2RJBUGJCPQYMYWQKNEPUUDYSJHED5N2S3FAOQ4F6XOKQ',
        '2147483646': 'GZK3UKRRQD52MCUGQSF2FF5WAKMSCAZ3AYTJ6ZE5UI7P3Z6RVR4TG67ZUQ',
        '2147483647': 'C6OQJNLPWQ7GWSDMC4QBLDXPI7PWRLPRFRVAT5MQSYGW3VDCNJLSUYJMFQ',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x9c1f0b456b8931b25540f0f2f014628b80bed6aa2722ad91638379237f64d9c5',
        '1': '0xa0920aa64f3b760d17fc2cad4a8d5412ba9496dd2fd1663a70a83de27ea077a9',
        '25': '0xcee46db243bc76f2fc8e3934b9dcca4ed588db00b769b4d5e272c2f91348e8f7',
        '2147483646': '0xd22bba822589776b85b04bce55655b794b3932b66b668dd25363c36128050ebb',
        '2147483647': '0x5f5e6ef62625559bb331b9d5c105b11451d2c8df9f1ae154ffa12d798de9c2fd',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '14ue1MTCznXrJV6rF42KzYRxhd9XLFUdBE',
        '1': '1MG2N3oRwdHnWVQyJKNGLFHirYAsprSWwS',
        '25': '1NDBfmJBTupXhf5enxJ1sYtVXqb1YWc3P6',
        '2147483646': '1DyB4vefVWNuMM7hecnMEZjefNh6etttc1',
        '2147483647': '1MwQLS8wkLzdHXu2FLnEc295T934vzoRe4',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3B7b4H98rmC2GnGgEfabZK8cBxE3EMRjQP',
        '1': '3GMvPtK7BuoUSiayY7pB37L1tYNu9Hy7Ta',
        '25': '3HjfJxjABJGXJyPk6of6fPmbhugVsbXvgf',
        '2147483646': '343vwGqrGRxTtX1Zd8Lz8NjQdQhNj7oY1w',
        '2147483647': '3GE6bv6Mkqk2SayGA84u6TRUNsXopEp4yh',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qr05zgfhuwy00r2ftyf6mv29avrw4nz5spgfeq8',
        '1': 'bc1q6mh4ndhhamulcpglv6xme3vw9fcq3762rtf8sw',
        '25': 'bc1q3xllj3mlm7c7ank56ndq55zld463zrqz3f8drs',
        '2147483646': 'bc1q3n6jj29tlh46af5mrwqdlrw03t60s9kcmhafmd',
        '2147483647': 'bc1q5a2dqeuqvc5ugvdke5gd9aacyfull6d5zldjyk',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1p0v2wthygpk8md3gnkwe8emyjrlqy0zz6fsck5h3yc6j4tjng4cnqfnnnnt',
        '1': 'bc1pv5dquwpzz664aj40qesr8834ruadln7lqze4qundjp042lae77gsvf0jrs',
        '25': 'bc1pd4f5t97s7w2n982ktyvnfqgleq5h08qza4x7l2ans93unwzczalsl6wz0y',
        '2147483646': 'bc1pg4cct0stsn53c449le0xgy04yhj7x0tj8qz3hlzs3q5a54rpkhlqv0a8fe',
        '2147483647': 'bc1p7sjseyha6z2gug6ss3d6efa8ntzglywgdtjkw92908zhr2znvyssxf82w4',
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
        '0': 'DKhTKEeVzq248vbe9wtXeqZVBxXcMQZtD8',
        '1': 'DE6FnjbricjjLkYki7HuCKEyGoi7La2i1J',
        '25': 'DTMrThou4QhQiMepvTihtTxqiXiePPfxEr',
        '2147483646': 'DD8PacCsho2EmmMoojA8Q5h5SYfVETkw6m',
        '2147483647': 'DC97YUhFRjH9YNmdseeP36BVwLL1xKL4vT',
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
        '0': 'bitcoincash:qqeu0xp00cxhel4akml3wv908lgm2ms75c9w0hyzwg',
        '1': 'bitcoincash:qr7f93p3qzf7rtm9mzz6asagwytm0tt5wu4u8jn2kx',
        '25': 'bitcoincash:qp8325hsqewj92w8spscwd27lgu8krve5cl08v2qh3',
        '2147483646': 'bitcoincash:qr6sj4hclv6xzpnetsm46klmu8jvhtmn4czw975f0f',
        '2147483647': 'bitcoincash:qq57w8u72e6ftnh3v0nql2p0th8ufc5whcxfngm5vd',
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
        '0': 'LPVpr4zPUNcvQZUMLay9iHPyePTUJXg1Ew',
        '1': 'Ld5xkDz3XvtWUNVS4jk6Rzkfypu7kc951b',
        '25': 'LeHyNfjFogR2vxqwRyZhbdNM74VU6FsSZ3',
        '2147483646': 'LUtPfvzfpS5EkRfvdzQ4hMqVop6bgiTWi7',
        '2147483647': 'LR5P15oQ9ztoUpKLVuVLZisFTLLiUUt4Rg',
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
        '0': 'MWEWNUEDwjyXUgNEn3sCD6za7FpEUCne3i',
        '1': 'MM4om2XHE5CYpYMohbN632Go6hx2F6XK5P',
        '25': 'MM5U85RT8LdoamZrFEPMZAwNdxtVGx2oQy',
        '2147483646': 'MHaMxPPpBZy9ps5qxNVr2tUzxmCbNQmNsf',
        '2147483647': 'MFiLav1UDqnFS7fNEEuRR3ThxwzUMqjva2',
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
        '0': 'ltc1q64gfnhnurp9rldcfhd7lw8sxsur2hxjt409leg',
        '1': 'ltc1ql70fyqr9uhq8lcannv4dq7nj3dg9k4qv48ae2r',
        '25': 'ltc1qesxuhgewwgzuv0e9wu4887apma00gyrmlxj2hl',
        '2147483646': 'ltc1qnu2udhn3lyrdn4wfsu73szy968rlfq2jk6ck8y',
        '2147483647': 'ltc1qmyu3j8dt8pefg98vk3kvr09097gq0t6qa3jd5g',
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
        '0': 'Nb4i5Fdv1sW57LuW3PzUTTJ5onToU2ooMb',
        '1': 'NZGG8P4Rp8gTeGwHYHW6CmZFbBFXHyzniG',
        '25': 'NUDq511D6egFquJN1hToVVwRXL7QxYUEmw',
        '2147483646': 'Na5bGdqbCJb5uH5CW1QHV6MANxjoTF57xB',
        '2147483647': 'Nfgxk8pwL9dEEPXTWqjSKkDBsyoPSR9DGo',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aan8t4v8a49aftxp803ryb9bb6wwf3ae2ycah22e4d',
        '1': 'cfx:aarmem0m1xrtc4n3x0wuc100n2e5uv2rgpjgr2z4j5',
        '25': 'cfx:aaprdg45ngen6p6ftvrp26dy3k9zukwpya9s42astd',
        '2147483646': 'cfx:aart8tzp3cwkpdcbdj8n4h9n9f3cdxwe36f16rus2n',
        '2147483647': 'cfx:aarv0a62x3e8wbcpmv7na83wvtt5n6c9cuf7rrjkj0',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos14920vuzm4acamhsha9x56cxplzx4tnjphp42ps',
        '1': 'cosmos1aag9erlfks65dt3uypr8vz3cmrplxczu7ytt9j',
        '25': 'cosmos1ctfppeshf2mzvt046gar9lvvwamkqed23jp38t',
        '2147483646': 'cosmos1kwnkqwtzyhge6v0zdfkygplr09xjz6c6ruvc68',
        '2147483647': 'cosmos1csntkkfled9mt96cpe89zdlh80cts84nrspatu',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash14920vuzm4acamhsha9x56cxplzx4tnjp66cdc2',
        '1': 'akash1aag9erlfks65dt3uypr8vz3cmrplxczunlxvug',
        '25': 'akash1ctfppeshf2mzvt046gar9lvvwamkqed2ufvk73',
        '2147483646': 'akash1kwnkqwtzyhge6v0zdfkygplr09xjz6c6w8plra',
        '2147483647': 'akash1csntkkfled9mt96cpe89zdlh80cts84nwtv6jx',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro14920vuzm4acamhsha9x56cxplzx4tnjp06anap',
        '1': 'cro1aag9erlfks65dt3uypr8vz3cmrplxczuxlrjer',
        '25': 'cro1ctfppeshf2mzvt046gar9lvvwamkqed2fffgm6',
        '2147483646': 'cro1kwnkqwtzyhge6v0zdfkygplr09xjz6c6m8ypxk',
        '2147483647': 'cro1csntkkfled9mt96cpe89zdlh80cts84nmtfyhd',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch14920vuzm4acamhsha9x56cxplzx4tnjpyuuwr8',
        '1': 'fetch1aag9erlfks65dt3uypr8vz3cmrplxczudez089',
        '25': 'fetch1ctfppeshf2mzvt046gar9lvvwamkqed2z0g49u',
        '2147483646': 'fetch1kwnkqwtzyhge6v0zdfkygplr09xjz6c6sp9ucs',
        '2147483647': 'fetch1csntkkfled9mt96cpe89zdlh80cts84nsdgeft',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo14920vuzm4acamhsha9x56cxplzx4tnjpl6x6hz',
        '1': 'osmo1aag9erlfks65dt3uypr8vz3cmrplxczuklcmnq',
        '25': 'osmo1ctfppeshf2mzvt046gar9lvvwamkqed2efjp3e',
        '2147483646': 'osmo1kwnkqwtzyhge6v0zdfkygplr09xjz6c6t8lgv4',
        '2147483647': 'osmo1csntkkfled9mt96cpe89zdlh80cts84nttjdaw',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno14920vuzm4acamhsha9x56cxplzx4tnjppnk3xv',
        '1': 'juno1aag9erlfks65dt3uypr8vz3cmrplxczugkgszw',
        '25': 'juno1ctfppeshf2mzvt046gar9lvvwamkqed28qz2qh',
        '2147483646': 'juno1kwnkqwtzyhge6v0zdfkygplr09xjz6c64w0ram',
        '2147483647': 'juno1csntkkfled9mt96cpe89zdlh80cts84n4zzxvq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra14920vuzm4acamhsha9x56cxplzx4tnjp3902rs',
        '1': 'terra1aag9erlfks65dt3uypr8vz3cmrplxczucq3t8j',
        '25': 'terra1ctfppeshf2mzvt046gar9lvvwamkqed2hkm39t',
        '2147483646': 'terra1kwnkqwtzyhge6v0zdfkygplr09xjz6c69ckcc8',
        '2147483647': 'terra1csntkkfled9mt96cpe89zdlh80cts84n95mafu',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret14920vuzm4acamhsha9x56cxplzx4tnjp4ypruv',
        '1': 'secret1aag9erlfks65dt3uypr8vz3cmrplxczuuplzcw',
        '25': 'secret1ctfppeshf2mzvt046gar9lvvwamkqed2nh4c6h',
        '2147483646': 'secret1kwnkqwtzyhge6v0zdfkygplr09xjz6c6pec38m',
        '2147483647': 'secret1csntkkfled9mt96cpe89zdlh80cts84np445kq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia14920vuzm4acamhsha9x56cxplzx4tnjpxty6ma',
        '1': 'celestia1aag9erlfks65dt3uypr8vz3cmrplxczu0w6mll',
        '25': 'celestia1ctfppeshf2mzvt046gar9lvvwamkqed2qcspax',
        '2147483646': 'celestia1kwnkqwtzyhge6v0zdfkygplr09xjz6c6jkagq2',
        '2147483647': 'celestia1csntkkfled9mt96cpe89zdlh80cts84nj6sd33',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwmtocxRLhJeqXPJadCcKuMHJ1RVVGYXmfidSqNNex2mWffV2Skw2Cx8Ey4DmY4tQYYXMknxmWPgCAmKA6iyPg7N1qZtpqByB',
        '1': 'XwmjDVgJDxu4pDdU8EbRTb9dvLiv2RRizN9v7ptf3SnK26835FQ4xbC6m3d1x8gLxGTxzLVEHyJ435B6wdAAHoYQ2RTibDk92',
        '25': 'XwnT4xkt4ni4CjSVtGRnBZGrfKCz5SAqkDmdjHCP4bUjPW6K5Yz7CFcSJ7bUxDLkshigEdqrm9yF69nUAzXanwf12AfntFo9A',
        '2147483646':
          'Xwo7WaZZV4YaRGGwTTwWFh8JHeHELo4qz7hnkAj3zHcEbt9UiSDtGtYBypokn9pfvuMqPuKmoK5KF7A5ftist9B71V3EgZTjN',
        '2147483647':
          'XwofuJYrbFE8ZEeBiE1y9gbipWPV2PjMe5tiMkDUZL8w3JuuHNea824fjZKvsAa8JUX8D7EnUzWRuE7tBYhhcFrg3BM2WoVSp',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x81f2A434b6E87008c2ABc1241E3519256fB18B3c',
        '1': '0xB09C6C950eB93fc1700aC63dCe2E691367Bfbde3',
        '25': '0x52A213aDDBbF2AD3d34067eAaF7906466eB75769',
        '2147483646': '0xC0B20c141C731BE64797912C56f121951e3d3E18',
        '2147483647': '0x94A616569CDBFae9bAB7256f2C7A827B815800aa',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x5e89cBbed9E2E90fa483B030BC6140f6989a58c7',
        '1': '0xC237972c6BF82681671CBe95Ca75A7D0fF908680',
        '25': '0xc0adDdB10A0F8e3A5778583a6bf007aC2aa2d26D',
        '2147483646': '0xCdF1ea9894861c650Db6082793fc2288606ED660',
        '2147483647': '0x338832e6d13a58062D37e763616c5b8d868d9A90',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x5e89cBbed9E2E90fa483B030BC6140f6989a58c7',
        '1': '0x80eD6DE71a70a336273692036180f5Cc78148cB4',
        '25': '0x0F434f74975D5c1588F13AefAbD55318e97Af08B',
        '2147483646': '0x2b0E908edd71bE1e2815b719B0Dd2FA199077fAA',
        '2147483647': '0x55C4D3Ddb71A4e9b76B7c134C7B6f4A09ac4C24F',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1s7vmpthr3thmulladbgl2jfmxhzrrv5lwm4onia',
        '1': 'f1mmo5tywcn7j2qnya4d4sh7cg3veq5k4w2lze2pq',
        '25': 'f1xkhj3ludpnynmaifz6uqasqwqn4sf7frdbistpy',
        '2147483646': 'f1ycafhwlm3uhaai2x5ajiq7fhxvghwd45abq3bny',
        '2147483647': 'f1xbtwslm64jrwyhprec7ezvqez4mqnkwdkt3ceqy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qz0u4qxc299kydjr5wugrvlhelx6wrh63umhkk3306memymqyfj0cq2uxx8f2',
        '1': 'kaspa:qr993n6pdqtckpw0sjdsphafnm037wruhrp4djc7efwgc6ksr2aaww4dle0zc',
        '25': 'kaspa:qz484szcs7v69hqf4drtdvs7ty260y4h2gq7zq9k6w092q0lkek3724p3z8vw',
        '2147483646': 'kaspa:qqr8gqkv3gwtvxjp6kmd3qzjd7jpuzr8xvzlvm5h7s52re9lujzzcynymrhjx',
        '2147483647': 'kaspa:qpzdghtp32x5lqhhg9zr8ra436x6zjv9x4z8u8r3tvael3vmhsslknhrrzd59',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '238dd99983b04389bdbfb433477f0e8f799f9e391e7c160f7e8b1918d5f4bf69',
        '1': '9c743767d4be492fc1e24546275c910425d47f2ba9b92d6440631a57c1c0382d',
        '25': '79510bccca6671f0813b523bc9ffb5665d3bba9836dff896294c2693a6177b87',
        '2147483646': 'f39e078731d835b49394591049970a5624697a4383b084a72f21e41c46dfbe29',
        '2147483647': 'f28a180b87b86f623a6b7614a6b605ba8776328d1ffab8e1fe119cca260395fc',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqrsjw9r086zk04h2ysvudhsyvhmudhw8jq2dusxz',
        '1': 'ckb1qyqfhpm4jq28tzsmljwzuwq67gvctnv95wmqwd484d',
        '25': 'ckb1qyqw9c8fsahhmsw09nrkznp9xx74wxnqc3zsjhu00u',
        '2147483646': 'ckb1qyqt00cjrgt8uu25mnfrrutasx7yhxvq039qa2nn9u',
        '2147483647': 'ckb1qyqghw0kc3vymnc6ytam68gfrv4zz9kkmchsm6r7my',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NBJ75AS35ZRDRITF3TRB6EEMVRFB76FOWB7AQISB',
        '1': 'NCHBEI3REQEUAQWNDUCULOTVX26BG5PF4QUQMB2J',
        '25': 'NABW5UO3GLPMCRUJDYVMMZQAY43Q6S3DGJI52QI2',
        '2147483646': 'NB3JCZRQ53LIXWNZZRAVFWZF7UDVJR3QKNG3FMYA',
        '2147483647': 'NAWRBVXTDLC5JJT6MFJWYKSXRH7UCOLORZBVZRZS',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5ytv3fr73ddgvf659f7efqw8w4g3h6hwrujqns39n',
        '1': 'nexa:nqtsq5g54u48j04tlqq77y5xr0fs0wvs7g6r5equ9uqldw8r',
        '25': 'nexa:nqtsq5g5pymquhwasjuw3fg44r9agfvfk8jh9qff3l64jrje',
        '2147483646': 'nexa:nqtsq5g5tmj3lnppcvmaajdaq0gmn07fesyrjtp0wu93vtjy',
        '2147483647': 'nexa:nqtsq5g5jtk3p6raufwlqkl7qs5vt97v8l8jcn0we2vs2nqm',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '13jpQwS9UBPQVkdamA546kkzuoL6aV6wts8N7uY699UQirn5',
        '1': '1nTKAwZ9Y7asJ8D5BaMRLmFtP3Wi4qypFxiXFRvcr1CNMX2',
        '25': '16izVdp1TQiDwBSzhLdu4jXLG7oJEHnEsYi9aNASCFMZLGpR',
        '2147483646': '15YEhDVBBNuocU719ZwVvqomzHgAAX9Ykut8c2cMQhDxeTC2',
        '2147483647': '1WyWrb4aq2XMYJS5YTFuGABUfidxP713NYV4PjPVixLaf2A',
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
        '0': 'Yg7hu9APdm3H3euHpUAzG689E3ZrQFYqZu2CKkbTRSr8ZdK',
        '1': 'Wikc8ea4zVDeb9XbqyUJr6P7okyyyzakxjNbfeRw7ydnJTC',
        '25': 'bfHnbX2Ns5riUUKE131xErTVYWmWCvqpFUoenNwWXKzk9k3',
        '2147483646': 'aUXzBCC6qHSPm8KgELcpM8uDiPdSSJ9hcengSpriyCQ4BE4',
        '2147483647': 'WTGopJ5WHQA8qKkcCrNnmVJi6S7EJFbz5K98owtozvmzSQa',
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
        '0': 'FK8vvWxEm8rosSWaDq6rZHrCmcggrMzGkEdMGph4rfPHfjr',
        '1': 'DMmqA2Mv7s3BQw8tFLQB9J7BML6pS72C94ykciXYZCAwJrv',
        '25': 'JJK1ctpDzTgFJFvWQPwpY4BZ65tLf3HFRpQojT37xYXu4RU',
        '2147483646': 'H7ZDCZywxfFvauvxdhYgeLdHFxkGtQb8nzPqPtxLQQwDCxn',
        '2147483647': 'D6J2qfsMQmyff7MtcDJf4h2me1E4kN3RFekHm1zRS9K9PWF',
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
        '0': 'j4U4RqeR3V7cxtq4p5VTjokdqaZR2P57yYK2KLAb428bXBvqx',
        '1': 'j4S74jsvTAUM9GNZSPWy38Le6Z98SWes1ThrfjWUtVq8Jqhvi',
        '25': 'j4X3bvLnuULwnLFtE1g2amjQAvstE2soGWzc6ndDQ5EUfoVgf',
        '2147483646': 'j4Vrr7vU5CK9N1YYETuLBdqgcf3m5y7AaQMn5pHfKHgM57Zrj',
        '2147483647': 'j4RqawZZxbmG5kcjfPsqwcG329RoZky82gpSSGenMNi5T3gLA',
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
        '0': 'dfZHqESUgEisd6kQ3hrfFdndEntxtGLVhzdiZxhkqzbtNctqT',
        '1': 'dfXLU8fz5v5boUHtg1tAYxNdVmUgJPvEjv2YvN3egUJRAGWNP',
        '25': 'dfcH1K8rYDxCSYBDTe3E6bmPa9DS5v9AzyKJMRAPC3hmXEA2J',
        '2147483646': 'dfb6FWiXhwvQ2DTsU6GXhTsg1sPJwrNYJrgULSpq7G9dvYBqd',
        '2147483647': 'dfX4zLMdbMNWjxY4u2F3TSJ2RMmMReEVm998guBx9MBNJUiaM',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rfmLFYsBJ6nUKQRYFZgTrDj6N5ntyRRLBy',
        '1': 'rnByLxLzkV2MN2s4p41t2vA4LsjQcxLGkk',
        '25': 'raxZK4PjdYJEENYWhZrRsLzVt3MwXU9Y58',
        '2147483646': 'rKrhz8ENg781hy6n1MnpaD8JM52Px6LSq2',
        '2147483647': 'rHkPg9WRTRwyzoGyiKHAfdC3cCf6HmUrf6',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '6MBCyLJkWz1PSiSqK4n1tf2bSzTXjPXxiSPCNickQqa',
        '1': 'BpnFnNBBNUxUjnxoNZBmHnnqaZNzV2Ukg3a4c8HwVfi6',
        '25': 'Aju8pYu3ZCyRcZXidxFNqMCQNsz8epEgKkcGtXj4ac88',
        '2147483646': 'CjvHPTzxaS7rchHVk7ipBaU71xTHNex4uWteNjN5yEiy',
        '2147483647': '2yfyG9QGDgR86U9PSouvaaozXgbqeqJ6WaJZkiUWTtBU',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x4a8965b3eaeccad3bd0a1e53e22274a6',
        '1': '0x98a55f91068196e4cb55de0290de4450',
        '25': '0x9f53837476a5fae78d8475d8bc2e5ae9',
        '2147483646': '0x86c7f0e44ae385a7ff6c330752cb9dde',
        '2147483647': '0xc7d58b33b8065fa31be1e4bae23db921',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GBKYRUDNEHBBSN5BFSVWW6E2U2XK6CKOFCYHG5KVMBSK5BMKHCWUYI23',
        '1': 'GDHN6FWA6DAU6VIZ4BQBZRBCD2IETE3DDUH5QOETJF5SZCKESUBAVT3C',
        '25': 'GAZSFIA5J5EKJUXJP764PR57UUVY6LLWMKBKZ77T5WGKXAZ6AC4O5NUL',
        '2147483646': 'GC56C4MTO7MM5XKXLIEOZGH2JTWSJOY6JTVETDVDVFADCM4OTJX4YHLB',
        '2147483647': 'GDHSK7BJQDO2VIW5HOBZVQHDE5N56GQMZ3ZUZF5IYCTVNKYEYUUIWOFB',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xf26dd435784744d4666558447c5102ec56e6f4b7069e503f12ab849d89a758a8',
        '1': '0x5f66d6ff8dbebad706292518d3cf51936f813ae60538dcb100798b86d1499ddf',
        '25': '0xd8f50a4cdabc2e43487ed3622db96b391ba40b0ff2693944c6cdf92eaba3080c',
        '2147483646': '0x949afb0f11c002b6af764dc22a3ac77708b99dd9ffc8cc0d4e701fb201b56d38',
        '2147483647': '0xb7ca2399a2e1cce17ff7b9b6a3edcc01156117dc1118ed63fae3a654ac499a0a',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TBUfdsgaHtm59vNML8rgEahqjP844CAFXL',
        '1': 'TNqGXXfEGdSfMDycKmEn2roJ5xKMrkjSD1',
        '25': 'TVYVTytB2H9Ay8Q933AKoZoF4YpzAxV6B3',
        '2147483646': 'TTb4nasY7da1EdGxzXYFpYPqySDjhFRSqN',
        '2147483647': 'TTpd2BUBaCuMqHtBhTCJe9dgXVnHBtbqXf',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCf0544bfaea4439a347834b19f513ba833083715d1904e4ddd37f7af8b1736cd50a0a',
        '1': 'BFCe6d2d32fc97c3bede6215d069e6fd33fe11c1dbc7894727eff9a18516480dfbddcf2',
        '25': 'BFCa9e0144e421bea592796f99e34e3edb555bdc5f3848870cc4f05cc0fca8768b1f1ac',
        '2147483646': 'BFC87c31999cb11b361372198e60e5d39509767d48c79db65efacb805b83822848cf21d',
        '2147483647': 'BFCbfccaaa7c3e488af03164d2d7d1a20cc2ee7a008505d36bd60b74ad70c4588569018',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NbkuYGVqDRh4ZitQhHbLie3a38T7b8RqA7',
        '1': 'NiN8bBBCwsDqh86UssPZ817Dzu6H7jUELU',
        '30': 'Nj8H2vzxyxshVwfgAvf6p4VQxFQm77tTPW',
        '2147483646': 'NTZ4u2g9MRdaSHxKf8iUxtaEL5TEF1R35k',
        '2147483647': 'NYc4EU8xJHS3CoFasbBSvyMnNQVQv4aGXb',
      },
    },
  ],
} as AddressTestCaseData;
