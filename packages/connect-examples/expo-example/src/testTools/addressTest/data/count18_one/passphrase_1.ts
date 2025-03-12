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
        '1': 'addr1q8gndfhfe34pg0pcdmyl5ptjveeskzfjwuahw2sv8s7shye83rhmunxqh4r94ae5gxmjtc4lhs3saya9raffr2lsdhds2npfjk',
        '100':
          'addr1q88mqknfcy8z8xcf49020ztdxg3qce3ysrnt3vpqa34f22gs2hrrxk3qtxp39px3f302puswqds2s75xspeetdtryufqlcf36w',
        '2147483646':
          'addr1q9pam34sqqvs850dwh804axnd56t7kzcsdza55mhv94pprpg72ar57u09p26f8qg0cueegu7lrckzw9wpwcd30fmuh2sqyr8wy',
        '2147483647':
          'addr1q89zsfg4dl8le9njy0r6c8tnt70jk3rk3tg9u8u30j76gzdyqyfylhw5sp20qs5sqqjdsmrxk5upr43h35gelped8c4qy67zgu',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'HWY5CFURDEGH6VIRAAMSZKN4I5UDXUKWLPNU2N45TSOGH3V4EOPFAT3IWU',
        '1': 'NURE6AUGPU5A35SBK2RUJQ2CND7RFN4VZPWQUGMR4TYFBYXW55U5EAA2GI',
        '100': 'NLN4MW4UM3JXOPHR33A2QN4LXONUXBXR3CVKLW6E44RD7FGKBZP6ZFQTOY',
        '2147483646': 'VN36IAADHE7KDLXJW6GIPQBBHLMB6AOTSYRBKMLDHIWBXQW2S436Q2Q35E',
        '2147483647': 'ENKZJML73EGZXWB2KMCTX2ZTMBUSBH2POLAYKUVRRZ6WTU6WS5XLNKIXSM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xf774947c40ed769fbf3cb8d297aa39fda9ab570c897f2ae7e995c1c7f37c90c4',
        '1': '0xa3ca94bdd90fd3608dc1916776f6652210e6d5c5b2036b535ef4676dcc7fe3dd',
        '100': '0xa5aeeacfa723fb7de9b5f60ef1fccaaec67459cac1f401cb5256e31977ab8984',
        '2147483646': '0x360368a6a6024a46a79c84853b9561d6ec20b98ab372cb9dd87abaeb219183bc',
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
        '1': '19dJTeaoQk7QJbRXEDY4K3YiTb1ooQB6Bv',
        '100': '15HfhoJdEqoVFdUxcJNb4VTvewB9auuSVL',
        '2147483646': '1Cb41ou3GkwRPo6Vzfz2mDxG8iBUL2XRXr',
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
        '1': '3QPVGh24E1wLANzm4VVrg8P9G6j9NwwdDH',
        '100': '35FHAqhVmZ9xKZsfFw4TfTYfHu1BC6uU2C',
        '2147483646': '3DGbwn9fFQQuHS6VGkNgn8MyQJSmJtpxUN',
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
        '1': 'bc1qs2jp80e8rpauf5mgpg26r6ck3k9cts98w7nl26',
        '100': 'bc1q7ey864htww26gmcff5840qufcetqz9kuy50znj',
        '2147483646': 'bc1qf2nfeehehjvw2dvvk4aupvwzk4pmcpyyhvrwdn',
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
        '1': 'bc1pq29edkus2nd4zanp9v4sxsfaq3zz8dsalruulj5c6lqsxq75q90snsywwt',
        '100': 'bc1p4zvwjwwme8cfz7jhunl0syddkfysjj9ffvn7uqyhvmlz6pjj0seqvrejln',
        '2147483646': 'bc1p2c053uttuscvu97yzferxw7xnt8dg4gw6eevqsv0v9q93w7uxr2se6hlma',
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
        '1': 'DS1awK96kyF9e6Mp5Jj3CArsic9edU21vr',
        '100': 'D9ckExUP9yRSsr4D6sdorCcDE8rBkBHwWG',
        '2147483646': 'DCQ8QT2mWvnuFe8ZUdtWtYjYLeXRE5NmTm',
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
        '1': 'bitcoincash:qzqfrufjma70d8jxg2e8wcmrsd0xkxgaus6usgazkn',
        '100': 'bitcoincash:qq7raw39ryz8mgkhan3289gksjym98s06cky4uvey5',
        '2147483646': 'bitcoincash:qqvtyg8kmp07v8tpheykpvqgx5ffyhugtyltf83zpw',
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
        '1': 'LVr2cJmG4mPNLzraq1TjVSPBjdr6dyaZgd',
        '100': 'LdNCJNSdX7tBojdF1EAgyAbAjbmMSKTPR4',
        '2147483646': 'LMCFqo5SxB26cA27AMWAXywbC5dYfTP7gU',
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
        '1': 'MKZ1xQs1vJRekipvB77c6M3YWYmU2kHhgc',
        '100': 'MGrFgFFHFG7zxWp9cAhgixpjbkqwXLQDfk',
        '2147483646': 'MGMnZ4t8xFuEe4qVzkdZJDKnvyMYeZf2eN',
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
        '1': 'ltc1q6q2lfac0zhst6gf2nx5tltk2ph0ef2jmfpcztz',
        '100': 'ltc1qq6qq9a8c7ae72w546j4eazcp20gxyws9jupjpx',
        '2147483646': 'ltc1qussh96qhwgyztl9n355pnk2x64h6uw8jxwxfwk',
        '2147483647': 'ltc1qserlxwquwnpzzjmaydr9emkzvkgxh5hjujkt7n',
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
        '0': 'NNRrSPyP7kdV3NC4k8hGcpPXovFmSMj5mB',
        '1': 'NRdbR5GAaHGjfkgRPq4HU8MzzhuL4vjBWa',
        '25': 'NSLKfovzAkWA8cC5VUXzQ3SU9DZnZ2vJXn',
        '2147483646': 'Nih9UJeL6vtsy9U1Tu8V6NNoDdo356QrvW',
        '2147483647': 'NX9ZKqNJLfbHrfQGeKohUAS812hGZUDFht',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyq2ljyukee6gr79srjhmzql4hfqtts6wx6qnkdd8t',
        '1': 'ckb1qyq0fueu24qm2uz2tr8lh7g5t2eet9e3g9cqxaq5kp',
        '25': 'ckb1qyq9gs303lm0mxx5eqn7z4xvquqclpce7hks95ye25',
        '2147483646': 'ckb1qyqt00jfjm8uy765586jche3ftts2ktx059qzh967c',
        '2147483647': 'ckb1qyqxneav6r5uway4ckddxuaele269q5l63msx4lhja',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aan6860z406w649bewvzj1me420skfcmae0eu53h0a',
        '1': 'cfx:aam71bwncvnnx181yhyjy87td0tvu3r1su62pt4h64',
        '100': 'cfx:aakpa97me5t0mk0zhjpgyubpgn5ff7kjheyvbgask2',
        '2147483646': 'cfx:aam3er8cftcxzcs1hesg6ry0d2a8xx983aezcvydyx',
        '2147483647': 'cfx:aajpb81vnnk850w0krwwmkhxjt1kuhwuz246rnm23b',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos10kcaj4cryvpln3pca39wwlc6cw0882ymfpk7j5',
        '1': 'cosmos1apvzanwnq2v80lfuq7weupwfncpte0j7qehl3q',
        '100': 'cosmos1n9sqq0djce80k4we23nfpg32gzd9wjeskapgn0',
        '2147483646': 'cosmos15lup75w96zt9nq4va2he7esp78q89tfkyx5t7s',
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
        '1': 'akash1apvzanwnq2v80lfuq7weupwfncpte0j7dz6cg6',
        '100': 'akash1n9sqq0djce80k4we23nfpg32gzd9wjesmxv024',
        '2147483646': 'akash15lup75w96zt9nq4va2he7esp78q89tfkfaev82',
        '2147483647': 'akash1jtrwx8g9g6fu30a86t0v9xs36nzt8hhtzfvncr',
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
        '1': 'cro1apvzanwnq2v80lfuq7weupwfncpte0j7czlxd3',
        '100': 'cro1n9sqq0djce80k4we23nfpg32gzd9wjeswxf307',
        '2147483646': 'cro15lup75w96zt9nq4va2he7esp78q89tfkuaujzp',
        '2147483647': 'cro1jtrwx8g9g6fu30a86t0v9xs36nzt8hhthffdag',
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
        '1': 'fetch1apvzanwnq2v80lfuq7weupwfncpte0j7ny7mnh',
        '100': 'fetch1n9sqq0djce80k4we23nfpg32gzd9wjes9qgv3c',
        '2147483646': 'fetch15lup75w96zt9nq4va2he7esp78q89tfkhma0u8',
        '2147483647': 'fetch1jtrwx8g9g6fu30a86t0v9xs36nzt8hhtu0gsrw',
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
        '1': 'osmo1apvzanwnq2v80lfuq7weupwfncpte0j7gzy08j',
        '100': 'osmo1n9sqq0djce80k4we23nfpg32gzd9wjes7xjc9a',
        '2147483646': 'osmo15lup75w96zt9nq4va2he7esp78q89tfkva8mgz',
        '2147483647': 'osmo1jtrwx8g9g6fu30a86t0v9xs36nzt8hht8fjyht',
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
        '1': 'juno1apvzanwnq2v80lfuq7weupwfncpte0j7kt5yku',
        '100': 'juno1n9sqq0djce80k4we23nfpg32gzd9wjesq0zn5n',
        '2147483646': 'juno15lup75w96zt9nq4va2he7esp78q89tfkj5hsev',
        '2147483647': 'juno1jtrwx8g9g6fu30a86t0v9xs36nzt8hhteqz0x9',
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
        '1': 'terra1apvzanwnq2v80lfuq7weupwfncpte0j7xadlnq',
        '100': 'terra1n9sqq0djce80k4we23nfpg32gzd9wjessemg30',
        '2147483646': 'terra15lup75w96zt9nq4va2he7esp78q89tfkzzwtus',
        '2147483647': 'terra1jtrwx8g9g6fu30a86t0v9xs36nzt8hhtfkm5re',
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
        '1': 'secret1apvzanwnq2v80lfuq7weupwfncpte0j7zurkvu',
        '100': 'secret1n9sqq0djce80k4we23nfpg32gzd9wjes5c4pwn',
        '2147483646': 'secret15lup75w96zt9nq4va2he7esp78q89tfkxrqzrv',
        '2147483647': 'secret1jtrwx8g9g6fu30a86t0v9xs36nzt8hhtdh4au9',
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
        '1': 'celestia1apvzanwnq2v80lfuq7weupwfncpte0j73nx0td',
        '100': 'celestia1n9sqq0djce80k4we23nfpg32gzd9wjes8hscfz',
        '2147483646': 'celestia15lup75w96zt9nq4va2he7esp78q89tfk4v9mya',
        '2147483647': 'celestia1jtrwx8g9g6fu30a86t0v9xs36nzt8hht7csym5',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwobGuKY8ZEKZdFip4ybgUXwRSTho3msHbMpK4n8sLKHg3L21gApy9j75WLBEx4oVwUvwzk3DPcpUMc5AVkv5SxW2qMdoiGS6',
        '1': 'Xwo23gMriSMauMuiNVpUHF9L1WoV1NYrAY5UAYhNihqaX1xBuXmp7C3SGe9wARcjc7MRuXUeER3CphvfeogGSiTh1SvExFVf8',
        '100':
          'XwnAfS2Y8o4hwxJZDjpCqiSb1iUDzodTf4QEd2BZDuQZMxQBQ5c15sLMmedfo9pP9zMm73BLz3jidVT5YzDjeYoN2xULrVVLP',
        '2147483646':
          'Xwo7D75xtGv1CS8hsLnrUZ1GHBLrRBcZbaLSnRPj5D9xETvExp89oogCXDScr6mydpadhihUi9JfRDj9ZRKrsg542sCmCZJvM',
        '2147483647':
          'XwnLsXaSGwUMqyn28u87SEEBJ4cEKq976XBF7mawyEtuMmAK6UF2eNCXZyVUc87XXTPYyYs41Gq2Y8Dpz9YPvxgT1Fmq3s1Xv',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x016c84bcbf792038eFA446b638AEcE729F8f603B',
        '1': '0x00b9b0EF2Df494A9633DF8D66C3fcFb8BBB207E4',
        '100': '0x2045D40f3Ba6aB5BA8ddF2fDe90319236e20d534',
        '2147483646': '0x683331f4AB4572d1B00A4F3879CBd177c7a5363f',
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
        '1': '0x65f22BD717C462e56889EA635CfDe69E7Fdf3f63',
        '100': '0x61399961b9d9E055B3ECf6D71a159eB720Ed131A',
        '2147483646': '0x9Dd2c5A5cFe5661f5DE8FC207210fe9Bd2f4F140',
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
        '1': '0xE98DaDefc2c751e1977828775716eCC0062Ec9FC',
        '100': '0xb810f64a0731d90BAe0d9d48230Bfb995D5A5eC8',
        '2147483646': '0x3aE1020A3AC7F2F1D22c9144e0e37D5bD21a4467',
        '2147483647': '0x45ffAB5c904b2Cc2BBC24DE6a672dD9151AFB786',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1rds7rsgfu4ilu7ceisi6x4vpwunvkyfu7sxbvkq',
        '1': 'f1hj6gqdxktfy3ldraclvimmsxwqbjv3li4vhpyoi',
        '100': 'f14wgtg5h2cnpmfqvvuk7yk22venslk3ij2t2hohi',
        '2147483646': 'f1smhxen3ga5lih2vkjcydhp42p2l3dzy5fm3vrka',
        '2147483647': 'f1in2u35mkb2pnqepmct3nkv2yguflp4vtomr3csy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpusvnp0w3n0ydpaxtjyzpr9yweq5v060378jjunafcpjgc49jn5s5h6aurmu',
        '1': 'kaspa:qzlt22auh02lsthelps7pcscuk9pfmf2xv3v2hc3dx5f6ts0e7c3v3h5cdxsf',
        '100': 'kaspa:qz2zd5slaex03w2hw9httjc4q26t6rmdljc9cqt7h6a56yx3du3kk2ylz0ap5',
        '2147483646': 'kaspa:qzxnuq699svemjw4yamqty4canzjtpee33733ql2ma4sszln38z2zfqqd2ew2',
        '2147483647': 'kaspa:qrrszutx8zk6227k8q7s2j0c7ej5upehgsnpapf7l3as0fkav4d9ytmkjfykq',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '6e2ef4f941606d8e0fd6a89ad0ba99bb855b4c9a7a4d8ccaa951276b31344dec',
        '1': '2f5d36b535aff6c6a0c122b0c7044a3a1b8856504655343b7330b90c19071050',
        '100': '19c35bd14535888f08b661e3d6cfdcf83e5dcdc40c6aadbb914ad4766bf12c75',
        '2147483646': '360d78e03fc57c47db4005777de96cdc0d04589afaba87790cd11cc1b7757357',
        '2147483647': '52e48627ecd56646864a11abd83797bbf8f339222df850e7895380c40e7d5a47',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NCVUSXAGEXYTD4GPSYS5AJMLA5HFQP5Q4MB4JZRG',
        '1': 'NC3NA524KMN4FZX4F52ZLFBD4NSBEW2CMCB7S5DL',
        '100': 'NBFJAV3FJBSWBENQNCVFMYYXMX5CGVAHS4UZMBGA',
        '2147483646': 'NDDXHTNLWOPLWLR3LPNUCXM6EYSMFDEWCTIAGDCW',
        '2147483647': 'NC2LNWY7TCUHURCOFB6XKXGCLDLW5LROOCHO4S6V',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5ugxljrnxrv3h3z6w0mdfuje2kcfg4gg3jj6vt78y',
        '1': 'nexa:nqtsq5g5y787mns6rq7vuh8vte543ryx7y9md2lyxl2da489',
        '100': 'nexa:nqtsq5g52f3tl39ys4acf9vc4jez7ry2exu4m77yga279s5y',
        '2147483646': 'nexa:nqtsq5g5vpreza68hxyq7v6kmwvaw06ptqlgfgcut4hy3g5p',
        '2147483647': 'nexa:nqtsq5g52da5f0cu8w633z7u73dqma072ccwn7czwhfe00p0',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16XHA4m4UpdkLgbBzhEcamhhcQBSPdxCinC7v6k7CfDBVNNz',
        '1': '15YwSu9Cw6kiX1XVRPvAPuLuXysVMhxs6sNT86XK521eBfo5',
        '100': '1xMj42WA8gt25u1umqHoVQZ7TjkVoomGjACkFJiADa36oHG',
        '2147483646': '163cJK6zakibYpRhZDhrLEwx7p1oZ672LDaXycxxd27az9Fz',
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
        '1': 'aVEjrrDrZ8MJJYox4KHHQg2mQaxdd7U3a97CWjpPHz5bPNh',
        '100': 'Wtf21jX5b4WoNvLSSEQgzjgLtTDmixNDRvrpfXDUVYUWVcz',
        '2147483646': 'ayubGp1WD6EL7T25t6yDkH5MEjGq1FdGvMC43BTwJ62PZGA',
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
        '1': 'H8FxtE1hgWAq8LRETgD9hskpxA5U5DuUkUiMTouzjCckUBA',
        '100': 'DXgF37JviSLLChwiqbLZHwQQS2LcB4oecGTycbK5vm1fedZ',
        '2147483646': 'HcvpJBoMLU3rwEdNHTu63UoQnJPfTN4i6goCzFZYjJZYeKV',
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
        '1': 'j4VsYsc86x2zGv5xijjJr6uDkCjxRAHytkKGQLMaGx18keoQ8',
        '100': 'j4SGy9m1QB4vSRALFE7DyWVHPnDpgJPpnvB49xWMg3Ch9ZvQZ',
        '2147483646': 'j4WNDj25tbgx9wtrvsZ6Y3Epnna6jMg83yfUVBt1vW1EhTC1G',
        '2147483647': 'j4VBNUqDhHJG89Q9d1tMtNHyYTQUiqknUVTPgd41Y1kMUFRHV',
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
        '0': 'dfc5HyZobFN7xwgMewPpp7oZwVVpE5VLxpYnKktxs47d9PEDt',
        '1': 'dfb6xGQBjheEw81HxN6WMvwD9R5WH3ZMdCdxextk4vURc5SGB',
        '25': 'dfZBn9PZKxS4fFPXrYGdJ9fpYE9Q9SHXMfkcsHqGreE1XUF78',
        '2147483646': 'dfbbd7p9XMJCp9pCAVvJ3sGpBzuebEwVnRzAjpRBiUUXYsp3J',
        '2147483647': 'dfaQmsdHL2uWnMKUreFZQCKxwfk2aj2ACwn5wFbBKzDeKg4ER',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rR9Z5Aq8wbSUym3E7fVa2YiFVuymBe2vH',
        '1': 'rpfQmBPyZL6L2NSHroKP1yfpdKKQTitx37',
        '100': 'rQpfBHnZDMdpeNsW1bCFsaeMDnkcaAkz8m',
        '2147483646': 'rn8S9rm238qppPSs2KCuoXsmBLRkwahWRX',
        '2147483647': 'rEMBWJ2CfBsHjTTUiSHQdhM9GRw8HK8qrr',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'urYxpB9MeSjWx6wXCh8wzdiXog2j7zKC6Y5jrUzGGVD',
        '1': '8nKhLiP3r8FLkpGjrWpiGUXtCdSRtwWcyp6g4uuEgniH',
        '100': '7xJJ3GvHuV3hLhd31v5GCmoBFaKciSWHToKeQCrtqW7s',
        '2147483646': 'GNKVerox9bHuDhnQMAJnuavkV8Y37K3KShH9x9pMaGUN',
        '2147483647': '56x4YYxSnhUahsYk2pgvFY6ErAW3yfXcvcipdQoVMThK',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x42cd9979e46ff8a11d14bd360ca8c260',
        '1': '0x56faeeb4631a78a023e61840b687e433',
        '100': '0x27f85d479a81b6ce1b03e465a11fd790',
        '2147483646': '0x0fbfda6a0deb092b31fb34f37abb17d0',
        '2147483647': '0x39665551ae81ab22fedf282f9e5fe792',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDA74MK7VP345QKZMYIQQK65ZVXCJLW6HM4CSW5XPQAQTQ3PGY5MMJMN',
        '1': 'GDEN33NEVRRALXDMPEHEE7YAVXTXKTXVBCWRLMD3GURPDCKI3GBLFDRZ',
        '100': 'GDJQQFS2DBQPB3IUSMEICACWLY76GFJQVW3KONIOHND5Y7ZYU65F4ACI',
        '2147483646': 'GBCB2Z4CSSOIERPRVAHPGVXXRRQXI6VH7Y2BVFJCXTDTGLGUU4P34QDD',
        '2147483647': 'GAWOYTXSMQJSB5NEEFQ6P2F4EVYGR5TPZLURGVSHQZJ47DO4FSUSQT4E',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xfbc2a310de4631c156c2ba64ea68d8904635b2f1dff362894464cb6784b29cd7',
        '1': '0x6ed50308c2df968d23374736114e7f0af1dd4ac01e199077cd0f697d4da6ad91',
        '100': '0xf6dd8cc585fabe779d4c346ec89995032ec233d7711f3bbc7caf78d5eea3dc30',
        '2147483646': '0xa0c0d29111d3bd9ebee99a0d876c8b64ed46b0e19a1e00a256dfe41394618807',
        '2147483647': '0x1db9efba0a218f9b93dfd692a97349e7ec9107b47d14828c15716d3907a54c1e',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TFVBJP1bemw5MKydgF4YU1ZjjnAFdUbh15',
        '1': 'TZA46z4CkiAJNa8ehZjVk4cY4kHToKbEL1',
        '100': 'TZ6W47FcX99ydQY7Xo7LXL62bQjhivFmSS',
        '2147483646': 'TXFyqeziVpUk74SCsiSVwUVLr3NBEDNHWk',
        '2147483647': 'TAaHzHQ54vL3L1TeGNpRxNZiH5KJZRtPUn',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCee6a5283888f7f7c46e358dbd1fe92a8a02b1e8a21707628c4dd70bd38555e1a7897',
        '1': 'BFC124d4767cc262b4d0e65ddc8e4eca0e0d7d17757d7410f1356caa14ced4c38d3c685',
        '100': 'BFCed5c785d7acc5deae1fc13891d179439f507cbd273e9c1a449dc7d842fa17db8b6fa',
        '2147483646': 'BFC6e40b1acb326f3940feba6bb4a9bc4dda53f3d2baee7c4766b9498b5794d457af99e',
        '2147483647': 'BFCc566b7a58c668e33cde4e5955758b34f2a11333062224fb7f8d4e9c11d365d768548',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NdaMjDR2d8LdVgTDiUoX9pLdgXeyYw8hwd',
        '1': 'NggnSnoXjm75kR58dcAczAYZYYrAjwqTzv',
        '100': 'NPr5KrVCqQA9PfhxsT5WheGfvS5gXy8AU9',
        '2147483646': 'NV6Ng2UKBLQYjLhSEHR2TJNNws3RwsLi5c',
        '2147483647': 'NN1M2EwZXkKxdW6LHL9zg78Q8chTz8pgfu',
      },
    },
  ],
} as AddressTestCaseData;
