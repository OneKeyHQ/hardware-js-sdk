import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase18-密语1',
  passphrase: 'abcdf12345',
  passphraseState: 'mw4kcXbdNjkf6Zu7nU3oHpajXXCc9wkZNR',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490322',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qxnkpd4dwrwjrztk4mdyq6fzkjudpghw6je7gvz42gjgyxq4fr2g0xxk6hlcwnjanc942y0fg2rjshs7777kvtrdf9aqcyz43k',
        '100':
          'addr1q88mqknfcy8z8xcf49020ztdxg3qce3ysrnt3vpqa34f22gs2hrrxk3qtxp39px3f302puswqds2s75xspeetdtryufqlcf36w',
        '2147483647':
          'addr1q89zsfg4dl8le9njy0r6c8tnt70jk3rk3tg9u8u30j76gzdyqyfylhw5sp20qs5sqqjdsmrxk5upr43h35gelped8c4qy67zgu',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'HWY5CFURDEGH6VIRAAMSZKN4I5UDXUKWLPNU2N45TSOGH3V4EOPFAT3IWU',
        '100': 'NLN4MW4UM3JXOPHR33A2QN4LXONUXBXR3CVKLW6E44RD7FGKBZP6ZFQTOY',
        '2147483647': 'ENKZJML73EGZXWB2KMCTX2ZTMBUSBH2POLAYKUVRRZ6WTU6WS5XLNKIXSM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xf774947c40ed769fbf3cb8d297aa39fda9ab570c897f2ae7e995c1c7f37c90c4',
        '100': '0xa5aeeacfa723fb7de9b5f60ef1fccaaec67459cac1f401cb5256e31977ab8984',
        '2147483647': '0xb694c680fd53eae86dca1918851d8613b3bd7ed587417508ac7fe5eda2ae47a8',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1HvVxRB6qBVoa1rhToTnscWM5mfKxLdqSD',
        '100': '15HfhoJdEqoVFdUxcJNb4VTvewB9auuSVL',
        '2147483647': '18FpAC9bXGQjXCZ1GXvPKeyk3exs2ezsjB',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '35RrtiqvKuBnyQzHaqM1xTsQgNSsiULeBX',
        '100': '35FHAqhVmZ9xKZsfFw4TfTYfHu1BC6uU2C',
        '2147483647': '38wceYjxRHzCPzU6QnyGDR2Pomq6paXnFR',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qsp456wp997n3tyzhnjz40jlmmsrfuhl8rf20xn',
        '100': 'bc1q7ey864htww26gmcff5840qufcetqz9kuy50znj',
        '2147483647': 'bc1q7c3kdvz25jedwlzuggezqmguyhcwe49w8gkmvu',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1p70vhzf3tu0x56mup2qq8m0q5vd73hkxdj9v7xr7qqcvflmaflfws6zv6su',
        '100': 'bc1p4zvwjwwme8cfz7jhunl0syddkfysjj9ffvn7uqyhvmlz6pjj0seqvrejln',
        '2147483647': 'bc1p2hz8xwexwn2z0vqgughnvjgl2vklpryqm8yxj2frv4m9xaftj22srv0wya',
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
        '0': 'D6ne169rX3dPWgApZe36zvdqDzaCTft3n3',
        '100': 'D9ckExUP9yRSsr4D6sdorCcDE8rBkBHwWG',
        '2147483647': 'DNFqj6Hy9va94RCGVhLUG1vDTA8t8EAtia',
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
        '0': 'bitcoincash:qrdvtja6lytfw3hfprcq7j5m2jyvuaygku4kutg8p2',
        '100': 'bitcoincash:qq7raw39ryz8mgkhan3289gksjym98s06cky4uvey5',
        '2147483647': 'bitcoincash:qrz6cuj5mwlasv5dnyfrqn4spzdvqh3k5ggh2lyl46',
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
        '0': 'LaHdZUJ6HuBwkFSGrd4aHYydL9cRbT2wQx',
        '100': 'LdNCJNSdX7tBojdF1EAgyAbAjbmMSKTPR4',
        '2147483647': 'LP4fkzMrKWLXxeYUZFSVQ6GJ9ZTtNunzzY',
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
        '0': 'MFqBqgXChWJBfU6nSZtNYjwYguPyouce5y',
        '100': 'MGrFgFFHFG7zxWp9cAhgixpjbkqwXLQDfk',
        '2147483647': 'M85Tbn6G6Dh2dJnE6dgCBrvs2156PySoKN',
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
        '0': 'ltc1qzf0x2vw8r4w9tsgwzelrem6jmckehy29yz9nxf',
        '100': 'ltc1qq6qq9a8c7ae72w546j4eazcp20gxyws9jupjpx',
        '2147483647': 'ltc1qserlxwquwnpzzjmaydr9emkzvkgxh5hjujkt7n',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aan6860z406w649bewvzj1me420skfcmae0eu53h0a',
        '100': 'cfx:aakpa97me5t0mk0zhjpgyubpgn5ff7kjheyvbgask2',
        '2147483647': 'cfx:aajpb81vnnk850w0krwwmkhxjt1kuhwuz246rnm23b',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos10kcaj4cryvpln3pca39wwlc6cw0882ymfpk7j5',
        '100': 'cosmos1n9sqq0djce80k4we23nfpg32gzd9wjeskapgn0',
        '2147483647': 'cosmos1jtrwx8g9g6fu30a86t0v9xs36nzt8hht0jp5pe',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash10kcaj4cryvpln3pca39wwlc6cw0882ymy6metw',
        '100': 'akash1n9sqq0djce80k4we23nfpg32gzd9wjesmxv024',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro10kcaj4cryvpln3pca39wwlc6cw0882ym3678w9',
        '100': 'cro1n9sqq0djce80k4we23nfpg32gzd9wjeswxf307',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch10kcaj4cryvpln3pca39wwlc6cw0882ym6ul6sr',
        '100': 'fetch1n9sqq0djce80k4we23nfpg32gzd9wjes9qgv3c',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo10kcaj4cryvpln3pca39wwlc6cw0882ymp69wyx',
        '100': 'osmo1n9sqq0djce80k4we23nfpg32gzd9wjes7xjc9a',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno10kcaj4cryvpln3pca39wwlc6cw0882ymln494g',
        '100': 'juno1n9sqq0djce80k4we23nfpg32gzd9wjesq0zn5n',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra10kcaj4cryvpln3pca39wwlc6cw0882ym09v7s5',
        '100': 'terra1n9sqq0djce80k4we23nfpg32gzd9wjessemg30',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret10kcaj4cryvpln3pca39wwlc6cw0882ymtyzh0g',
        '100': 'secret1n9sqq0djce80k4we23nfpg32gzd9wjes5c4pwn',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia10kcaj4cryvpln3pca39wwlc6cw0882ymct8wge',
        '100': 'celestia1n9sqq0djce80k4we23nfpg32gzd9wjes8hscfz',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x016c84bcbf792038eFA446b638AEcE729F8f603B',
        '100': '0x2045D40f3Ba6aB5BA8ddF2fDe90319236e20d534',
        '2147483647': '0x6dfea69317208b4d013A0fE3794435720C61827E',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x076ea3b56E02537db5EC1d565649238238303B0A',
        '2147483647': '0xaB12eD68F6A4f9459E8B051f47e90616149977a7',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x076ea3b56E02537db5EC1d565649238238303B0A',
        '2147483647': '0x45ffAB5c904b2Cc2BBC24DE6a672dD9151AFB786',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1rds7rsgfu4ilu7ceisi6x4vpwunvkyfu7sxbvkq',
        '100': 'f14wgtg5h2cnpmfqvvuk7yk22venslk3ij2t2hohi',
        '2147483647': 'f1in2u35mkb2pnqepmct3nkv2yguflp4vtomr3csy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpusvnp0w3n0ydpaxtjyzpr9yweq5v060378jjunafcpjgc49jn5s5h6aurmu',
        '100': 'kaspa:qz2zd5slaex03w2hw9httjc4q26t6rmdljc9cqt7h6a56yx3du3kk2ylz0ap5',
        '2147483647': 'kaspa:qrrszutx8zk6227k8q7s2j0c7ej5upehgsnpapf7l3as0fkav4d9ytmkjfykq',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '6e2ef4f941606d8e0fd6a89ad0ba99bb855b4c9a7a4d8ccaa951276b31344dec',
        '100': '19c35bd14535888f08b661e3d6cfdcf83e5dcdc40c6aadbb914ad4766bf12c75',
        '2147483647': '52e48627ecd56646864a11abd83797bbf8f339222df850e7895380c40e7d5a47',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NCVUSXAGEXYTD4GPSYS5AJMLA5HFQP5Q4MB4JZRG',
        '100': 'NBFJAV3FJBSWBENQNCVFMYYXMX5CGVAHS4UZMBGA',
        '2147483647': 'NC2LNWY7TCUHURCOFB6XKXGCLDLW5LROOCHO4S6V',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5ugxljrnxrv3h3z6w0mdfuje2kcfg4gg3jj6vt78y',
        '100': 'nexa:nqtsq5g52f3tl39ys4acf9vc4jez7ry2exu4m77yga279s5y',
        '2147483647': 'nexa:nqtsq5g52da5f0cu8w633z7u73dqma072ccwn7czwhfe00p0',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16XHA4m4UpdkLgbBzhEcamhhcQBSPdxCinC7v6k7CfDBVNNz',
        '100': '1xMj42WA8gt25u1umqHoVQZ7TjkVoomGjACkFJiADa36oHG',
        '2147483647': '14rm48EoGN2ZkKiPhYyCfJ6hnePo3AmSr1VjQnxa8mEMnDQi',
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
        '0': 'bTaT2U5QH1P7ycWXMdjUH2pqptufZ6ofUxmzWxcWwBcu1Lt',
        '2147483647': 'Zo4M5wpBpQCXcjiEDNKYoRq257GK5v3niGPVDB5T3CoC4L2',
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
        '0': 'J6bg3qsFQPCeoQ7okzfLaEYuNU2W1DF6fJP9U2i8NQA3x56',
        '2147483647': 'GS5a7Kc2wn24SXKWcjFR6dZ5cgP9Y2VDtbzeAFB4URLM99d',
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
        '0': 'j4WqtamjxVksJjm2RK2dJHmaYHAGNCDyENE658Mo55eLHxKQm',
        '2147483647': 'j4VBNUqDhHJG89Q9d1tMtNHyYTQUiqknUVTPgd41Y1kMUFRHV',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rR9Z5Aq8wbSUym3E7fVa2YiFVuymBe2vH',
        '2147483647': 'rEMBWJ2CfBsHjTTUiSHQdhM9GRw8HK8qrr',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'urYxpB9MeSjWx6wXCh8wzdiXog2j7zKC6Y5jrUzGGVD',
        '100': '7xJJ3GvHuV3hLhd31v5GCmoBFaKciSWHToKeQCrtqW7s',
        '2147483647': '56x4YYxSnhUahsYk2pgvFY6ErAW3yfXcvcipdQoVMThK',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x42cd9979e46ff8a11d14bd360ca8c260',
        '100': '0x27f85d479a81b6ce1b03e465a11fd790',
        '2147483647': '0x39665551ae81ab22fedf282f9e5fe792',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDA74MK7VP345QKZMYIQQK65ZVXCJLW6HM4CSW5XPQAQTQ3PGY5MMJMN',
        '100': 'GDJQQFS2DBQPB3IUSMEICACWLY76GFJQVW3KONIOHND5Y7ZYU65F4ACI',
        '2147483647': 'GAWOYTXSMQJSB5NEEFQ6P2F4EVYGR5TPZLURGVSHQZJ47DO4FSUSQT4E',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xfbc2a310de4631c156c2ba64ea68d8904635b2f1dff362894464cb6784b29cd7',
        '100': '0xf6dd8cc585fabe779d4c346ec89995032ec233d7711f3bbc7caf78d5eea3dc30',
        '2147483647': '0x1db9efba0a218f9b93dfd692a97349e7ec9107b47d14828c15716d3907a54c1e',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TFVBJP1bemw5MKydgF4YU1ZjjnAFdUbh15',
        '100': 'TZ6W47FcX99ydQY7Xo7LXL62bQjhivFmSS',
        '2147483647': 'TAaHzHQ54vL3L1TeGNpRxNZiH5KJZRtPUn',
      },
    },
  ],
} as AddressTestCaseData;
