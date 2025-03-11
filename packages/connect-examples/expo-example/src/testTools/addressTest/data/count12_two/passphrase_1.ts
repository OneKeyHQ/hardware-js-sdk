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
        '1': 'addr1qxdc9hqp7dxfs85q4s9dsl9jpw6x9vqw9dhrx66nnaes4r7glunt3luwh8dkh9cf0jrfwa6nph3svk2f3fftlkah99zq3gzddp',
        '35': 'addr1q8q0kfp7trkq5hrr4kwzh2453nl2dttky66cep7g0hfzx8rkxqrnwthlzxme0sqqnmze0kenyyqk0hd4mtpzwnfxshpsn27zdm',
        '2147483646':
          'addr1qxc4tzcppvc65k5p22ve5vhx9s0cqg362mkpck4j2kv6ztguqwzk9evwp6fgt5s6ahvrmegvwt692pwn3agtxk08qxzsmlrf54',
        '2147483647':
          'addr1qx2h42efrh55rgsksawrwacwdtdztyywuucw4qx8kkxf9mn9tt76vf257u77lzj5ys60hc4ylg5l9qehcrmncf0jrdssnc670u',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '4VVQHV734VQDTRT2BFBASSZPUBU4RKKYYDT6Y2PBQMWYRAUA7MPKMENB3E',
        '1': 'SK3GBZKOHZOJLI7K3WUJ74XWFWWWJJOLGBQ6WUEIG7EWINLDYOM63OGCWA',
        '35': 'KVBJLN6YZG3VMTPVBHVIYHMEU5GPCOSUVS6TALQXGEHDBT7MNPD44GHKFY',
        '2147483646': 'ZUFSKZUWFMEPB3PJ23ARWTOKDXET342IORYCHVUKKH4Y7NKOUHHEKQRIOM',
        '2147483647': '3DOPB6HX5XR7XXWXZZY3PDH2DSHFUMTIIR7EYLYIZK3OFPTSHOKM4HJGBU',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xf978b8997f2ce53427621a6cda0173844cd0b2c4ef0ae2a1d8d2aaa2bbeadae5',
        '1': '0xd7460806b5f27af960e652745429baaf07241a27fa4ae499e5d2fb393c822510',
        '35': '0x6d3baf8cad85402e7fb02f7247a4dd1521e44d83ee189c23910c1957f2903d40',
        '2147483646': '0x3c8bbeb2078c5c80899523316b2ea97a080788a054e76ec81db82922f8fa698a',
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
        '1': '18y4kS5kWNSJDBRmvgbJnqRMQkVqH6KD3y',
        '35': '18h8mTvW3yTgW9xh7ZKY56qCM8iQ4Z6ssd',
        '2147483646': '19YasBagEw6u2ZQjXE9bxyBNqVmU2MEvhu',
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
        '1': '3KiqKm4kcBqFaaMQEu9wDUmEoHjGgCF3Hk',
        '35': '3JbZqErUDMdCVyVWEgnyR7vk2Mx567ytzf',
        '2147483646': '34bwZCqBDpT71LdqvrqnDURrBLj5ouriJ9',
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
        '1': 'bc1qwezfv6m52melhl4v2h3n2xtc9keulmu8est95n',
        '35': 'bc1qm4ya3nduejw0yf98txs0kwgv4us7ae8g6mqqfv',
        '2147483646': 'bc1q7wqhsmtcqdnl9u70nr5dwdqwyz3alny340g3es',
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
        '1': 'bc1pjny53gfw5stru2uwjqcg2eqhwtfpqw23hjfeqpzhqsnqvz35h09s53e7sh',
        '35': 'bc1pwwvf0vagey6eqcu870j48fs9a63uelp49jfy0uq84zv8s0pzpsws0csf49',
        '2147483646': 'bc1pv6uwug3ef74vshwesmx0a4gk89zytv9pndxv2cxje5lrsyjjyx0q9cd4dq',
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
        '1': 'DUNjXeWRP7Rfi37S4ZN2Y5kw9Z7CPR1ipN',
        '35': 'DKQg6YzwavwELqq2ya3cGH7GsXSah1NEQq',
        '2147483646': 'DGBdzqyub5s2kEtnz3J9gpLxoZASBXE3MT',
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
        '1': 'bitcoincash:qzt7f5v9g82hp4k8qnwuqx36dp5xgdxqy5t8jcuy0v',
        '35': 'bitcoincash:qzn6uugr0cjmxf7k7qhuyq2uckdlyg0ulugxpx89ly',
        '2147483646': 'bitcoincash:qqr24j4q9ryf6y3c0p47lg7c0d0428x3dgkuyqpedr',
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
        '1': 'LiBcXvvoyiWY4uhTKiqwTuihkT6gkZoV6Y',
        '35': 'LKpkY7GTevS9Zg5KGeS6ywvH3w6Z4qmCs3',
        '2147483646': 'LbAGtGq84XgrXVx8ccPyD9MMwmpphV2iQm',
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
        '1': 'MPUfiaKYetW6qYGVKFzWG8DxyvB3aFXkbY',
        '35': 'MC13vhx9JAWgwWSv34GTbxw4eMqYioJ3XX',
        '2147483646': 'MQkmMdgDgtFPziwLcwQidfwEYXtubM4qfp',
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
        '1': 'ltc1qrghxe89ccqdw90dkmmtklsvh4hnnkh4pcv4ntu',
        '35': 'ltc1qmw0hjd22q4kegvxky8senn6xhygaeqc0evejsk',
        '2147483646': 'ltc1qh2txnw2phtfeg99q9ua7la2ck2yr8fxjgk7d23',
        '2147483647': 'ltc1q23tygvgzfjver9ygnx4z7pvajuhz03er3ux9qf',
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
        '0': 'NVLP9pRpDzommFC4U769L1bCpiuD2yYpAF',
        '1': 'NLD2yNX8UeV6bqV43gNstC7qXi4RVRkcYo',
        '35': 'NWVva4q5TDj3sF3VhKCgYPUoYrrHrjKVx1',
        '2147483646': 'NYGADonj21XvcTsAHG6j6e162iLKCM5nNG',
        '2147483647': 'NeKpywYSCk1uUSKg8FLk5SHpDkAqdjK2AL',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aatt04ca45h5vrgwndehwnb9drtsc158w29fkm8g3d',
        '1': 'cfx:aajc8xa0m2pn9m3vbthca7chtwjcbg4hneugkpe91a',
        '35': 'cfx:aanua08sfebastdncs5h0akw3r7p0avx62z6h7fc0e',
        '2147483646': 'cfx:aam9tyxgftm259gceeetcgh20p8855tf4j3tzcfwke',
        '2147483647': 'cfx:aat55v1w7yttueksvcjp8ppxndu8e1fvajpce9j2th',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos14w0syc087acvpa9z3zp8yv4yp973tph7p9jms4',
        '1': 'cosmos1ry0s7xwan7wz7h24gmdsp807gnvdhtr2wgjrxv',
        '35': 'cosmos19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhuhsgq34',
        '2147483646': 'cosmos17secwas2np9w2cpkql4grppj9ns93k6dqj69uv',
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
        '1': 'akash1ry0s7xwan7wz7h24gmdsp807gnvdhtr2rnlylk',
        '35': 'akash19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhu6t98g0',
        '2147483646': 'akash17secwas2np9w2cpkql4grppj9ns93k6ddfhz9k',
        '2147483647': 'akash1shlksph4tgz4j9cqd3y3cwvnaml99wywypch45',
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
        '1': 'cro1ry0s7xwan7wz7h24gmdsp807gnvdhtr2kn666a',
        '35': 'cro19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhu0tqedy',
        '2147483646': 'cro17secwas2np9w2cpkql4grppj9ns93k6dcfjuqa',
        '2147483647': 'cro1shlksph4tgz4j9cqd3y3cwvnaml99wyw3pafsl',
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
        '1': 'fetch1ry0s7xwan7wz7h24gmdsp807gnvdhtr2a4m8ym',
        '35': 'fetch19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhuydpynz',
        '2147483646': 'fetch17secwas2np9w2cpkql4grppj9ns93k6dn0np7m',
        '2147483647': 'fetch1shlksph4tgz4j9cqd3y3cwvnaml99wyw68u5we',
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
        '1': 'osmo1ry0s7xwan7wz7h24gmdsp807gnvdhtr2xnpns7',
        '35': 'osmo19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhultms88',
        '2147483646': 'osmo17secwas2np9w2cpkql4grppj9ns93k6dgff427',
        '2147483647': 'osmo1shlksph4tgz4j9cqd3y3cwvnaml99wywppxq6u',
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
        '1': 'juno1ry0s7xwan7wz7h24gmdsp807gnvdhtr2c63cps',
        '35': 'juno19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhupztmkf',
        '2147483646': 'juno17secwas2np9w2cpkql4grppj9ns93k6dkqe7ms',
        '2147483647': 'juno1shlksph4tgz4j9cqd3y3cwvnaml99wywlgkttj',
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
        '1': 'terra1ry0s7xwan7wz7h24gmdsp807gnvdhtr2gvgryv',
        '35': 'terra19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhu35jqn4',
        '2147483646': 'terra17secwas2np9w2cpkql4grppj9ns93k6dxkq97v',
        '2147483647': 'terra1shlksph4tgz4j9cqd3y3cwvnaml99wyw070sww',
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
        '1': 'secret1ry0s7xwan7wz7h24gmdsp807gnvdhtr2vdx2ms',
        '35': 'secret19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhu44ufvf',
        '2147483646': 'secret17secwas2np9w2cpkql4grppj9ns93k6dzhwvps',
        '2147483647': 'secret1shlksph4tgz4j9cqd3y3cwvnaml99wywtlpe3j',
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
        '1': 'celestia1ry0s7xwan7wz7h24gmdsp807gnvdhtr2lzrnup',
        '35': 'celestia19j7zyvhw4ayy7ycnuklr5j8rkk2xgxhux6estc',
        '2147483646': 'celestia17secwas2np9w2cpkql4grppj9ns93k6d3ct4xp',
        '2147483647': 'celestia1shlksph4tgz4j9cqd3y3cwvnaml99wywcsyqkr',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwodtGbVdAscgsrCGW6gc2CEue7wHc6KUA4eguezw1FHMurEV1aQ3vbKpUihcjrZ1CV815TDDpvczGmWVPszTvze234fQXSWL',
        '1': 'Xwn7zUFSpoHFouBmMgrX4qAP8iniZsu7aDekEsCHb2NhfgAmGMguGpRAWCcEPgyCLKdTkWAXTRwY9VniyVoMnJoG2zNgVUw53',
        '35': 'XwnAoWGZS8e76skBVXqEiqgcEHRxZADvNPP9hYoNGcVdAjzx5DzsEHEgmH35CQZrANY1iXmoXCL3NXz7cqA3Ym5V1LDETyG35',
        '2147483646':
          'XwnuGLqjcrKAmxsu5eJBURZ3r7GNF6ekNgUdJRGhZkMpPMwCCGZyBe6EVRJt7MnxyiXKSAW7Zwz9o2Q3cjuZ8Ktx2sfeiBh8p',
        '2147483647':
          'XwoAww4eaFjLv4tah5EV2fc99NdVDJ2McBPp6c2TSo7UPQnb5v7DHGW7MBkMknmTqujXET4g6AiR6CjnP9qpy96Q1DJqCyAoe',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x1ccDDB9A79301163F448d166e1bAb3b3FBc1bBdF',
        '1': '0xb4A2c70cdb182339a37584a3dA02369FAD0Eb400',
        '35': '0x5635bfcdfd352d501409CB8c9AC3103a27C3eBf6',
        '2147483646': '0xd220a26E159DcB192276c9c825b36a49a9C66002',
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
        '1': '0xdD8223d6BA3124b4904f87c3e3564fE91a84BEC4',
        '35': '0xCB2E882Ee40C11d1D073811A1cd632AC4E595f3A',
        '2147483646': '0xeE59E36050b95117391fe149f0FF45d0bb104ad7',
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
        '1': '0x6baD1cf1059D97960293f7433f175C211795216d',
        '35': '0x0052a229ecC1aA28fa74a08d63CB91ab6a18339d',
        '2147483646': '0x65e139936D38F8Ea570DB35608088268595574d3',
        '2147483647': '0x5B52Cf7770f4805A1ed896BFcfEBF38e06CcA2D0',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1hrrmdjzr3gxle6x652aqusr4cwv4xad7jigwvhq',
        '1': 'f1fh4jyjc6pqm5aatwf6zhx7q3bl6z5drm2j57cni',
        '35': 'f1ry2dg5aovdltcmbor4vgp2oid74pajzwnkei6ni',
        '2147483646': 'f1h62cywug3i7g6gzoic3ta3dkg5d5pavi37y5boi',
        '2147483647': 'f1mqhpdq4x2rvabuulbcgcojbz3o4ophloiyi4h4a',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qr4xr7rjk5t7pqwsgq76kk9mcjffa6wuk6hhn55kjwc5hkn7xlesj274s5kay',
        '1': 'kaspa:qzfdy69n36hrksae5mz66mh0d9e6cqk6hy4l5g5mau2lx8k3tuzcclfg8c5yk',
        '35': 'kaspa:qzu82pkgsgky0rz0kr8wn82vlhdktpfx8evt6z9crcf4pnpkrfvl7tp3u7xdz',
        '2147483646': 'kaspa:qp34tg8gank3eftsq6pefc063uatqh3vaf97c473zd6w3cukveljg3uxyjcmh',
        '2147483647': 'kaspa:qrlwasqga5kypwvca2nxxp4vns9sgwrsadn8a7pnt4vdk2x6ehc5xaa90xuxu',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'c641694868c2a79f252173a22fd9363b771d323bb8839a84850f43e09703cd77',
        '1': '52f71009433460d8365a6d16c8b474a4b5edaee9cce2f3d482d6342e45348b13',
        '35': '1df63b7e57f2eba692bb87b79c530b9f4286043b143070163b8096fb69eb029c',
        '2147483646': '9cb73d2bdd1a95249ebb5548ba4a2e81b0b2150c30c8aa7593e47ea090390469',
        '2147483647': 'fd4f5968945d27521761932f8009c63d705829791dbd229642881c0c471c0b29',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqyznqp0y9wa07jhayskvd25ztwwxrjmz0sk49m5f',
        '1': 'ckb1qyq0f8fmjvqy2xy0ajdtpl5gx7n8vzt4ydyq4a8ch2',
        '35': 'ckb1qyqtx3ngj6h52m0klj53gu3r33fd9vrlqxesyww5ra',
        '2147483646': 'ckb1qyqq0cd2qugng8je8utz0w9gvx6wmf3dux5qspw9jg',
        '2147483647': 'ckb1qyqzkykfzr6yrapx2lwcctldn30p3ek629ds32kjg8',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NBM3YLDEFQOHVQ656CXJPZTSSSUIO7T66AUEHHAM',
        '1': 'NCIQYTXMZVEQBLH2A7UY4RGVMKU22HIFOBODUE4Q',
        '35': 'NC335ZHJ757EDHXZVUMCOJH5C3KZ2Y6M6VOPB4VJ',
        '2147483646': 'NDLSBMMZGCVIQYRIXLSWNOSTAMW2SPXVIRIQ5YLI',
        '2147483647': 'NDMZSI4EGKZFXX7BEFCNBPTGWITGUES3U723MHFR',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5cvcan5dp7mu2kvtarh49auz9gfsuyf4h4h7pq8ud',
        '1': 'nexa:nqtsq5g5r8hex7t6a3fy9qhfpe285fhp7xrctya06yj4uww2',
        '35': 'nexa:nqtsq5g5wul48jmmtqkktgu0zttffjvrxp27yrj7r5ykxutg',
        '2147483646': 'nexa:nqtsq5g5u5zaafsagmxnjr6x4aws0xxa00hmujxr4436jsky',
        '2147483647': 'nexa:nqtsq5g5x0pjgj2telj8943vskhkzrujwsfrsxztyrkudtme',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '147p9PW9czsgCqeKaQUkhSqWQoGfnozXeakptcnFZjGnne9r',
        '1': '12q7yrqc6sXdfRzVkFhCgG5BAQrhxge89a2RmeWSt1smXeVe',
        '35': '15fJsaoFHZAWu9qtwtquczA6Twemk5Fr83GEus7MQ9R1jZ9Z',
        '2147483646': '1U49ZefKkN9zvZ7JZNtJ9RWHEaS4myNXdTzC7afAkDXvqTD',
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
        '1': 'XmRGpYd2KuGSj1pGv6KZmQJPqaBEbnj6Go5r4ixCHrCw17B',
        '35': 'abcAYWGD1Y9gSsDUZF2WVVDhNNF1zQT4k2tzHKriRPT9Qmt',
        '2147483646': 'WQMSXMgFCjnnDaRqDn1BekdWfHuLh7yULEeGXoAV2ByLbFe',
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
        '1': 'EQSVqvQsTH5yYoRZKTFS4c2TP9J53uAXT8h11o3oj4k6BV3',
        '35': 'HEdPZt448uyDGepkxbxNngwkuwMrSWtVvNW9EPxKrbzJJ9K',
        '2147483646': 'D3NfYjU6L7cK3N37d8w3wxMaCs2B9EQuWaFRUsG6TQWVczH',
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
        '1': 'j4T9jQZpW7omC4WRj4b5tPFx1qAwdmGf9o1vNyuZQkzzszhEc',
        '35': 'j4VyvJHn9JVQ5JEH8GEEbKz2w8hjhYfGsmVAC88AKH8Y8Cfkq',
        '2147483646': 'j4RnfaGdZLgbiPzzLctma19JLwzfMsMzQB5MwQNdd3jLeQ2WZ',
        '2147483647': 'j4RNe5QCsk6FPpvwgbeQ5ZbfA71s2dL9N9PWoG8F92bfKCxeR',
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
        '0': 'dfZfpxtYgPYMtoqQnX74xEUhkHtuTUfPHkMM2jR11RBgkgdSm',
        '1': 'dfYP8oMt8sR1rGRkxgxHQDHwR3WVVeY2tFLcdcSjCjUHjRC98',
        '35': 'dfbDKh5qn46ejW9cMtbS7A22LM3HZRvecDorSkfL7FbpydXws',
        '2147483646': 'dfX24y4hC6HrNbvKaFFy5qBHkALDDkdN8dQ4C2uoR2CdVpkmg',
        '2147483647': 'dfWc3UCGWVhW42rGvE1bbPdeZKMQtWbX6biD3tfQw14xAdgvK',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rawqynwb64GDfLER6Xi5JJv2GEYeEY819K',
        '1': 'rPcpTZVaYoWHQDM7sTZPRLcyx3USaxxXVF',
        '35': 'rDthFBjV6d9VHhUhLamYDzvZjNwTJS6tE1',
        '2147483646': 'rCundciDbQokN6EfDSASUWoP3E98xMbwv',
        '2147483647': 'rnFLJ4yYySKi9jc9qj9KMrLuFT9BahDXSQ',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'AcPL8anXmx8DUoMKX4vjBoje7RZLD9ZaZCsuzw6dChE7',
        '1': 'HftAQL2xiMEU9hReX161PC5DfQ6k3i6LFb5G4Aqp7fKW',
        '35': '6cJFfb8pBkLSmeD7jkQn6sBruqcsojWzEKduGbQ7yhJv',
        '2147483646': '9y8A8BAfAdrk1N3hB7GNiXmgyNChMhMhhZytoCnceFWr',
        '2147483647': '5d7JQo3oskcMZuxYYAJ1bKWjeigWuyWKLMisZaq8TqWD',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x28199f5c33740eda770224457d52e73b',
        '1': '0x8b1e7c6e38a8a181ecc76bf994824425',
        '35': '0x7dd4864154648745c2fe35d84e30c278',
        '2147483646': '0x497e6fe2c4cf8cecd241df150c5376f8',
        '2147483647': '0x00544d4b2abc2541fa3b9cdc54290a91',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GC2D7ICANJPDJQLV4BVCPEO7CD4H2M6L6VEIWW2FBYJBK72GRNHZNMVU',
        '1': 'GCGWEL6CBIEAVKIFZRIPTQXI2AKCUQHDGGXXXRTMJCD4XQCUAJWV5X5M',
        '35': 'GDFI7TZDRUHYLSOJR4GAD7R7YDHLDF5VGGD7KJWN5UC5MBG4MQEHKHY4',
        '2147483646': 'GC2IDL2HKSRVA2BOKKHOUBDZYHVRBVAAQQTMXY5C2FTLUNSJFQGLQGI5',
        '2147483647': 'GBYK4IZWAWCKNCHTCDIAZX5IHA6SJD65C4F53GBMZJP464MOY3GVVNS6',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xaef4723996b93d949d3e79b21a9478368603ab6ccaf719e406844032a7167204',
        '1': '0x20414683e72554ad8f41c79816911758ce3dbf288470397f86eb422d8f31f957',
        '35': '0x8e2de6f4fdab20858c2e6abb15d398f4264370e9715c391f18f4517ba8eb7e6b',
        '2147483646': '0xbe74e1b5b39f66eb2943b6f471fbfad3e7b93716f4744c0f9952511450d3632e',
        '2147483647': '0x285ed4fc03200b04dc26b4df1aa065ccc12476ed5e2ff269f0dc0a9536531090',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TSVdrD2Ue9TTAT3Z29Zbb5gdEQZbWq3Z6c',
        '1': 'TErrEz5QRK4hTvr6yGvTGBEDuJNnfLj5Rk',
        '35': 'TG5cxhqgTmy9WLq1dc7mV8sifhng1UHc7m',
        '2147483646': 'TQYnEwvDj7aWSFNi2wUw6uv3xzcGZ7F4EF',
        '2147483647': 'TPu6YTHSMkUtLvh1Rs6k47NtTx1c1JyLhY',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC54b56e9154ddfef6b5c24cd3dc6c27d47e4ca0009aff7539de26e9a29b39082bdf53',
        '1': 'BFCd7390848080ed9eb8abf26b8a7fc1642362747e44dbf0ec7ba21b8a6a81ab772baaf',
        '35': 'BFCc5bb39f5af2d76c1a856fbab810f47fd8099db3c038e0ab8cf8e27bb1a4212bce39d',
        '2147483646': 'BFCa49bf90d5deaf2376e80540029f27107fae8435f982ac7c2e0e054df4b1321c70a2f',
        '2147483647': 'BFC914ac4146474c24667b2ce5fc6d32e3b81903e0554244c84fcac804531c63cb61d2b',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NQcDoJJSGTeBzU9iXgjLSgbusfgzuGqqYi',
        '1': 'NXPupAUDAEWmjoxYrGCHz6dkX5zcF2o8ZM',
        '35': 'NPCScg4hVx4PmaiJRpYa5rBWBpH36qKgq2',
        '2147483646': 'NaJKpZM45qbFhTBtjnEZRoCBVJGpctp4da',
        '2147483647': 'NV2PLpaZxsMBVNLRXDHfAfTVgdQofGAinm',
      },
    },
  ],
} as AddressTestCaseData;
