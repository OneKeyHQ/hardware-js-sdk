import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase12-密语1',
  passphrase: '56789',
  passphraseState: 'n3EKBUnoqYtYqg7qdUyCpehKXsuq1tx3yY',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392047',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qyusrwcd5afjhq2yhv80c0tqflfv75ln46xna3f76le9cf3ge3akd6j562l60h5dj048elj63kay8sugey3w5g7c8nkq6p9p95',
        '35': 'addr1q8q0kfp7trkq5hrr4kwzh2453nl2dttky66cep7g0hfzx8rkxqrnwthlzxme0sqqnmze0kenyyqk0hd4mtpzwnfxshpsn27zdm',
        '2147483647':
          'addr1qx2h42efrh55rgsksawrwacwdtdztyywuucw4qx8kkxf9mn9tt76vf257u77lzj5ys60hc4ylg5l9qehcrmncf0jrdssnc670u',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '4VVQHV734VQDTRT2BFBASSZPUBU4RKKYYDT6Y2PBQMWYRAUA7MPKMENB3E',
        '35': 'KVBJLN6YZG3VMTPVBHVIYHMEU5GPCOSUVS6TALQXGEHDBT7MNPD44GHKFY',
        '2147483647': '3DOPB6HX5XR7XXWXZZY3PDH2DSHFUMTIIR7EYLYIZK3OFPTSHOKM4HJGBU',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xf978b8997f2ce53427621a6cda0173844cd0b2c4ef0ae2a1d8d2aaa2bbeadae5',
        '35': '0x6d3baf8cad85402e7fb02f7247a4dd1521e44d83ee189c23910c1957f2903d40',
        '2147483647': '0xdca2a60fe5d407ac6288008ac57d60c3607b2f24db667d703fb8d2d75d44d0dc',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1MVMtyLARR9ggLzXh38mPqFeUhA6sRrqUW',
        '35': '18h8mTvW3yTgW9xh7ZKY56qCM8iQ4Z6ssd',
        '2147483647': '14DTtWGhgxsDZuwtVEnaMKKYX1raLzKJRz',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '32mD5xAt2TBjgqqS4APeGYwKZasUTuyXgc',
        '35': '3JbZqErUDMdCVyVWEgnyR7vk2Mx567ytzf',
        '2147483647': '3BUQe55tN2XafrXZf3432tkhSqUAeWk1jn',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qwglnckz8n0907sk435gaa59zc94k6m75mpr297',
        '35': 'bc1qm4ya3nduejw0yf98txs0kwgv4us7ae8g6mqqfv',
        '2147483647': 'bc1qzwmp5uyzvg4mz6jdds53h5xn4l8ja98z8eqsq6',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pklfzrxljcvsg2mpd7w2gv7j5ygpntp878jr87w6kv3yw49ay3yxqqec6c7',
        '35': 'bc1pwwvf0vagey6eqcu870j48fs9a63uelp49jfy0uq84zv8s0pzpsws0csf49',
        '2147483647': 'bc1pwm7n9hu2uajja67n4jv6mydnsyfwzneu4zkqtzs4sqe00s6ajansy7335c',
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
        '0': 'DN4EP8bHHTm5sAFz6FPM6YWTKmznFBbxrV',
        '35': 'DKQg6YzwavwELqq2ya3cGH7GsXSah1NEQq',
        '2147483647': 'DDJ6FjCSyzDf18Sg2jvjAxQ1uGjaWsTRcY',
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
        '0': 'bitcoincash:qrr6yg9ptyp6x4fg5l4e73qzvu2fvj0wws4wj875qz',
        '35': 'bitcoincash:qzn6uugr0cjmxf7k7qhuyq2uckdlyg0ulugxpx89ly',
        '2147483647': 'bitcoincash:qzxlts2f2u24jnr88y48whsfvpt5vyntsv8vuxwqhc',
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
        '0': 'LL1GNs4vicdcavUYmaasS5gtcgLqvhwQPK',
        '35': 'LKpkY7GTevS9Zg5KGeS6ywvH3w6Z4qmCs3',
        '2147483647': 'LhgrU1ZJpyvc92EWtfXoVqx3DwKQtMiZc5',
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
        '0': 'MBQRLgxTvXonHJbe3P6YK2JGi3n1LCbqfM',
        '35': 'MC13vhx9JAWgwWSv34GTbxw4eMqYioJ3XX',
        '2147483647': 'MN5swkkjRCVbSLs954aS8xihCVX8wVqWWX',
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
        '0': 'ltc1q7fy3ehhzs867wy5x858jw5sfn2w27wr4r0vpf7',
        '35': 'ltc1qmw0hjd22q4kegvxky8senn6xhygaeqc0evejsk',
        '2147483647': 'ltc1q23tygvgzfjver9ygnx4z7pvajuhz03er3ux9qf',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aatt04ca45h5vrgwndehwnb9drtsc158w29fkm8g3d',
        '35': 'cfx:aanua08sfebastdncs5h0akw3r7p0avx62z6h7fc0e',
        '2147483647': 'cfx:aat55v1w7yttueksvcjp8ppxndu8e1fvajpce9j2th',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos14w0syc087acvpa9z3zp8yv4yp973tph7p9jms4',
        '35': 'cosmos19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhuhsgq34',
        '2147483647': 'cosmos1shlksph4tgz4j9cqd3y3cwvnaml99wywf64svw',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash14w0syc087acvpa9z3zp8yv4yp973tph7v7luf0',
        '35': 'akash19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhu6t98g0',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro14w0syc087acvpa9z3zp8yv4yp973tph7e76zvy',
        '35': 'cro19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhu0tqedy',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch14w0syc087acvpa9z3zp8yv4yp973tph7jcmljz',
        '35': 'fetch19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhuydpynz',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo14w0syc087acvpa9z3zp8yv4yp973tph7f7ptx8',
        '35': 'osmo19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhultms88',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno14w0syc087acvpa9z3zp8yv4yp973tph7hh3qhf',
        '35': 'juno19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhupztmkf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra14w0syc087acvpa9z3zp8yv4yp973tph78pgmj4',
        '35': 'terra19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhu35jqn4',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret14w0syc087acvpa9z3zp8yv4yp973tph7rqxjdf',
        '35': 'secret19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhu44ufvf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia14w0syc087acvpa9z3zp8yv4yp973tph7s0rt2c',
        '35': 'celestia19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhux6estc',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x1ccDDB9A79301163F448d166e1bAb3b3FBc1bBdF',
        '35': '0x5635bfcdfd352d501409CB8c9AC3103a27C3eBf6',
        '2147483647': '0x0bb88077e1fb5C1487BB57148BDB6c9629Aa9C9e',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0xc822bA41355dc67b6c98b32bc3485BE68f978CCa',
        '2147483647': '0xCdb97F576852E747d27AC423dA564FbCf587f226',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0xc822bA41355dc67b6c98b32bc3485BE68f978CCa',
        '2147483647': '0x5B52Cf7770f4805A1ed896BFcfEBF38e06CcA2D0',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1hrrmdjzr3gxle6x652aqusr4cwv4xad7jigwvhq',
        '35': 'f1ry2dg5aovdltcmbor4vgp2oid74pajzwnkei6ni',
        '2147483647': 'f1mqhpdq4x2rvabuulbcgcojbz3o4ophloiyi4h4a',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qr4xr7rjk5t7pqwsgq76kk9mcjffa6wuk6hhn55kjwc5hkn7xlesj274s5kay',
        '35': 'kaspa:qzu82pkgsgky0rz0kr8wn82vlhdktpfx8evt6z9crcf4pnpkrfvl7tp3u7xdz',
        '2147483647': 'kaspa:qrlwasqga5kypwvca2nxxp4vns9sgwrsadn8a7pnt4vdk2x6ehc5xaa90xuxu',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'c641694868c2a79f252173a22fd9363b771d323bb8839a84850f43e09703cd77',
        '35': '1df63b7e57f2eba692bb87b79c530b9f4286043b143070163b8096fb69eb029c',
        '2147483647': 'fd4f5968945d27521761932f8009c63d705829791dbd229642881c0c471c0b29',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NBM3YLDEFQOHVQ656CXJPZTSSSUIO7T66AUEHHAM',
        '35': 'NC335ZHJ757EDHXZVUMCOJH5C3KZ2Y6M6VOPB4VJ',
        '2147483647': 'NDMZSI4EGKZFXX7BEFCNBPTGWITGUES3U723MHFR',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5cvcan5dp7mu2kvtarh49auz9gfsuyf4h4h7pq8ud',
        '35': 'nexa:nqtsq5g5wul48jmmtqkktgu0zttffjvrxp27yrj7r5ykxutg',
        '2147483647': 'nexa:nqtsq5g5x0pjgj2telj8943vskhkzrujwsfrsxztyrkudtme',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '147p9PW9czsgCqeKaQUkhSqWQoGfnozXeakptcnFZjGnne9r',
        '35': '15fJsaoFHZAWu9qtwtquczA6Twemk5Fr83GEus7MQ9R1jZ9Z',
        '2147483647': '142ehDyjA1qRrWTHK1PrbnKSFn6pk8LVwcr3sCB9cYCjpaR',
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
        '0': 'Z47SMDAYTFJz8fe74ssaxAdeDz94j98bHXUy2zkt1FECBuy',
        '2147483647': 'VzKwevzecPUD9XmoyQWk77SfgVa6fGwSePW8HQgTtWe9Ymj',
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
        '0': 'Fh8fNaxPad8WxTFPUEoTFNMhmZFuBFa2Ts67z4rVSTmMEZr',
        '2147483647': 'CdMAgJnVjmHjyKP6NmScQKAjE4gw7PNspj7HEUn5KjBJhXk',
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
        '0': 'j4USRa6V3dw7Ebv5YtjsSQSiM5ZMbbQ1ZJ2en6sqDSiPuFvcP',
        '2147483647': 'j4RNe5QCsk6FPpvwgbeQ5ZbfA71s2dL9N9PWoG8F92bfKCxeR',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rawqynwb64GDfLER6Xi5JJv2GEYeEY819K',
        '2147483647': 'rnFLJ4yYySKi9jc9qj9KMrLuFT9BahDXSQ',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'AcPL8anXmx8DUoMKX4vjBoje7RZLD9ZaZCsuzw6dChE7',
        '35': '6cJFfb8pBkLSmeD7jkQn6sBruqcsojWzEKduGbQ7yhJv',
        '2147483647': '5d7JQo3oskcMZuxYYAJ1bKWjeigWuyWKLMisZaq8TqWD',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x28199f5c33740eda770224457d52e73b',
        '35': '0x7dd4864154648745c2fe35d84e30c278',
        '2147483647': '0x00544d4b2abc2541fa3b9cdc54290a91',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GC2D7ICANJPDJQLV4BVCPEO7CD4H2M6L6VEIWW2FBYJBK72GRNHZNMVU',
        '35': 'GDFI7TZDRUHYLSOJR4GAD7R7YDHLDF5VGGD7KJWN5UC5MBG4MQEHKHY4',
        '2147483647': 'GBYK4IZWAWCKNCHTCDIAZX5IHA6SJD65C4F53GBMZJP464MOY3GVVNS6',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xaef4723996b93d949d3e79b21a9478368603ab6ccaf719e406844032a7167204',
        '35': '0x8e2de6f4fdab20858c2e6abb15d398f4264370e9715c391f18f4517ba8eb7e6b',
        '2147483647': '0x285ed4fc03200b04dc26b4df1aa065ccc12476ed5e2ff269f0dc0a9536531090',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TSVdrD2Ue9TTAT3Z29Zbb5gdEQZbWq3Z6c',
        '35': 'TG5cxhqgTmy9WLq1dc7mV8sifhng1UHc7m',
        '2147483647': 'TPu6YTHSMkUtLvh1Rs6k47NtTx1c1JyLhY',
      },
    },
  ],
} as AddressTestCaseData;
