import type { SLIP39TestCaseData } from '../../types';

export const count33OneNormal: SLIP39TestCaseData = {
  id: 'count33_one_normal',
  name: 'count33_one_normal',
  description: '1-of-1 (33 words) + normal',
  shares: [
    'station industry academic academic aunt similar picture filter chubby vintage insect hairy charity priority ugly mandate credit faint segment mobile cage junior receiver reject crazy sympathy extra helpful expand force counter lamp rescue',
  ],
  data: [
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
      },
      expectedAddress: {
        "m/44'/0'/0'/0/0": '17oDhcJaT46RkfLBFhtUvD1sQ5hgPsB9bE',
        "m/44'/0'/1'/0/0": '1MtdrucTTCbua3D4rEvCAyddW6RjpG7xaY',
        "m/44'/0'/21234567'/0/0": '17m7XBMA51rMoquVjWigH6u7VoDsakmtwG',
        "m/44'/0'/2147483646'/0/0": '1VXLBKYngyZR1m1TajtG4soon5VWGdVek',
        "m/44'/0'/2147483647'/0/0": '198q5cDix2mtsMbZyLGX5QPDx4LSaiZiUJ',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/0'/0'/0/0": '3CQp5hDNpjoP7mTQQsTnkfhxqF33jMCxn5',
        "m/49'/0'/1'/0/0": '33PthJ62Hw6SmXk91p8SBVugV912Fa3eH6',
        "m/49'/0'/21234567'/0/0": '3JoEBLrHUfmFEfSJkYPMddtgaokSEgRM1G',
        "m/49'/0'/2147483646'/0/0": '3A7WmXYGYRaJKEamxZPw25pbMKwcYbDbHr',
        "m/49'/0'/2147483647'/0/0": '3HL1zEcw3i8eMec6Y1rg1BQafDNmoxwZUp',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/0'/0'/0/0": 'bc1q8hstcwnklw255cag04rkw6vjuh7yzttue9f2v3',
        "m/84'/0'/1'/0/0": 'bc1q3faj4ueavs2vs8wmsj2j6qpfnlxeg28a2cn4t0',
        "m/84'/0'/21234567'/0/0": 'bc1qfpc6y2fve5calvwpxpdrymjvvgm7g0wpmlvet2',
        "m/84'/0'/2147483646'/0/0": 'bc1qmjcm5zd2gfdnhvwjxtrcrtxmyrz9u6hkk338zd',
        "m/84'/0'/2147483647'/0/0": 'bc1qpknhjm8qm4755gdjhdaf5qmjfw583nwu5l04j4',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDTAPROOT',
      },
      expectedAddress: {
        "m/86'/0'/0'/0/0": 'bc1pqwletew6d9d9uh75x80dazaze8qc4kk95m9x5wpyy3r34cckuc5qy4vhdq',
        "m/86'/0'/1'/0/0": 'bc1px00yyg5cxyea0tw3dp06phv7t95vqlgv2ez6vy87ctw9yy5prm0snssvcm',
        "m/86'/0'/21234567'/0/0": 'bc1ph2kppw7al75ptgl83yt67094h03t8j984nhaqfuxmrkea73rn4lq20cxjy',
        "m/86'/0'/2147483646'/0/0":
          'bc1pkxwaeh965hsc5sdt6fs80gyxzhcgd3krvt50kan52pdhajptcmps58qnwn',
        "m/86'/0'/2147483647'/0/0":
          'bc1pc9vn2zq35pr4l73wxv7jktshkhytuywe9tckczluquxzew6x496smudphz',
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
        "m/44'/3'/0'/0/0": 'D5BTHZKzEetc6rzSCBeLuybR4zJBYYNMXK',
        "m/44'/3'/1'/0/0": 'D5QKqmLRGm9VbCBMo1k3rbPvhCwyu9iDoJ',
        "m/44'/3'/21234567'/0/0": 'DC8NRqPfH7dptW5eAD4bf656ATbJnCo43W',
        "m/44'/3'/2147483646'/0/0": 'DQhSSohcxFjvBaFzVW4m2moaFv8cMkB2ut',
        "m/44'/3'/2147483647'/0/0": 'DGcxz7TUvEH1VXmHeziRa5R4Amth8sYst5',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qzyf8vfwcmm7gxkgjsp65r023nge9067yvegj3acqy',
        "m/44'/145'/1'/0/0": 'bitcoincash:qp8w4k7yvj96hd5g87p7tuq07q8d7jktzufnafstyy',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qphm2akhj7wg0fgwhzw0kc89wl7ahkv60v6t2fa8p8',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qq00c9dcvtc27790247an403f37efe00fgezk94mnq',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qp4zajcxksm0d5tzapr8dr6tgznqglxmnyrksszhrd',
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
        "m/44'/2'/0'/0/0": 'LRAx8S7n1Bt4p513LVTeRdR3wMZRSY8MLg',
        "m/44'/2'/1'/0/0": 'LedHb86rCu9jffcPZtsUqNYsKNvLydyKBu',
        "m/44'/2'/21234567'/0/0": 'LNZbF48kNfjmKBNtYtQFh3So3EBEJ3Rgff',
        "m/44'/2'/2147483646'/0/0": 'LMZtxxqd7FUgBH6dPnvij6WXD9rY5Gbyx3',
        "m/44'/2'/2147483647'/0/0": 'LaBVsrkxd8bFTtpzrsKPDye933YW8iAKHu',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/2'/0'/0/0": 'MPZAyKWP2CBE7NPdfNMPfeWhL8BQAxcp7p',
        "m/49'/2'/1'/0/0": 'M9HAKSMabHxLhjtPYFkEXRBSiFqY2aN1wj',
        "m/49'/2'/21234567'/0/0": 'MSXduRJr7fe3BA69Mz2PQNMkwERwZEFgNA',
        "m/49'/2'/2147483646'/0/0": 'MVM2tM56D2kb5LKchoJ6eZrsYYiHLCbRqt',
        "m/49'/2'/2147483647'/0/0": 'MJW71zqWrjt9ZitdkLpwwsJ2WqXJu9KoQJ',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/2'/0'/0/0": 'ltc1qq53q0zn202f8a5sq2d4ry799ptp8rg672wzmkf',
        "m/84'/2'/1'/0/0": 'ltc1qhw354hyn9u5kmul3ppkpzck2k6fglqgndv3zpt',
        "m/84'/2'/21234567'/0/0": 'ltc1q738v9ufmdgdflrnp7sjcjlyeaqgq6szp36r92c',
        "m/84'/2'/2147483646'/0/0": 'ltc1qv4qcuu4d4vl5xwvnjzqfayypda93hqr88wjrgg',
        "m/84'/2'/2147483647'/0/0": 'ltc1qat0z5spzr8ddttcgxe3zuak5rgt8sm4cgz3qs8',
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
        "m/44'/1900'/0'/0/0": 'NYSr8VAaAfnVd3VvBzMCEKSMk59EZAScJ2',
        "m/44'/1900'/1'/0/0": 'NRfdksNGe1KTUfC1yw4X2a5qbPFsCbvo2H',
        "m/44'/1900'/21234567'/0/0": 'NRSmQxRBfavLYRudxmmBhpRLVzGWuoS3C2',
        "m/44'/1900'/2147483646'/0/0": 'NSprxHLpNryRHAp7x1DCtjdQMdAeP8ciQZ',
        "m/44'/1900'/2147483647'/0/0": 'NfTafmVmek6sekF5EKiSA6CPs2xtpqE11s',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0xD1Dd22c4D8FFf4502B6f27ee4F4001F0DDA9246A',
        "m/44'/60'/1'/0/0": '0x5aAF8F17A1aA53C19d5D67FAAA31468C7d8aAbdf',
        "m/44'/60'/21234567'/0/0": '0xFcB211b77546D2068b569576384387B3d88f1606',
        "m/44'/60'/2147483646'/0/0": '0xDD57ea866606BE96ab913A1aD6D4595B93F05AD2',
        "m/44'/60'/2147483647'/0/0": '0x0659EC84e84C0EAA21b627Ff7d4d33C0F5232927',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0xEbDdD96e9Eac9730D810243d73f5162Ec9a46235',
        "m/44'/61'/1'/0/0": '0x473985bBcA8797b97D48D187a0CE62a80C1248DD',
        "m/44'/61'/21234567'/0/0": '0x5d51B5Df502D27A33a528F9B3e8e3e8EA83a541D',
        "m/44'/61'/2147483646'/0/0": '0x79bC4f82cA178663D01b7Aaf4DcC39B0e0872059',
        "m/44'/61'/2147483647'/0/0": '0xC9994AEB6F4418c3924deBCDe7dbB2f1622Ad17a',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-cosmos',
      params: {
        hrp: 'cosmos',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cosmos1km48qfx54ngywcazd4qru2xvv5vjcr4q5tdswt',
        "m/44'/118'/1'/0/0": 'cosmos1zzannxldjrw5cq445yzd43t6gq0ge5plvsphuh',
        "m/44'/118'/21234567'/0/0": 'cosmos1jd0v3czlh29vx2rsu9kw2dhxpp5nzx88zk85t6',
        "m/44'/118'/2147483646'/0/0": 'cosmos15d9q87lnnylpclnnpdvv3nrdp6eeaphm4jhh2r',
        "m/44'/118'/2147483647'/0/0": 'cosmos1mpj9t4879cm7w3m5csfshh3xxnxtec67fnyuy8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'akash1km48qfx54ngywcazd4qru2xvv5vjcr4qesqhh3',
        "m/44'/118'/1'/0/0": 'akash1zzannxldjrw5cq445yzd43t6gq0ge5plptvs9d',
        "m/44'/118'/21234567'/0/0": 'akash1jd0v3czlh29vx2rsu9kw2dhxpp5nzx880d2njq',
        "m/44'/118'/2147483646'/0/0": 'akash15d9q87lnnylpclnnpdvv3nrdp6eeaphmcf6sne',
        "m/44'/118'/2147483647'/0/0": 'akash1mpj9t4879cm7w3m5csfshh3xxnxtec67ygfmaa',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cro1km48qfx54ngywcazd4qru2xvv5vjcr4qvs9fj6',
        "m/44'/118'/1'/0/0": 'cro1zzannxldjrw5cq445yzd43t6gq0ge5pl5tfwqx',
        "m/44'/118'/21234567'/0/0": 'cro1jd0v3czlh29vx2rsu9kw2dhxpp5nzx886d0dht',
        "m/44'/118'/2147483646'/0/0": 'cro15d9q87lnnylpclnnpdvv3nrdp6eeaphmdflwkj',
        "m/44'/118'/2147483647'/0/0": 'cro1mpj9t4879cm7w3m5csfshh3xxnxtec673gv9ck',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'fetch1km48qfx54ngywcazd4qru2xvv5vjcr4q8ky5vu',
        "m/44'/118'/1'/0/0": 'fetch1zzannxldjrw5cq445yzd43t6gq0ge5plldgn7q',
        "m/44'/118'/21234567'/0/0": 'fetch1jd0v3czlh29vx2rsu9kw2dhxpp5nzx883twsfd',
        "m/44'/118'/2147483646'/0/0": 'fetch15d9q87lnnylpclnnpdvv3nrdp6eeaphmx07ng5',
        "m/44'/118'/2147483647'/0/0": 'fetch1mpj9t4879cm7w3m5csfshh3xxnxtec676wdcxs',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'osmo1km48qfx54ngywcazd4qru2xvv5vjcr4qus7qce',
        "m/44'/118'/1'/0/0": 'osmo1zzannxldjrw5cq445yzd43t6gq0ge5plytj829',
        "m/44'/118'/21234567'/0/0": 'osmo1jd0v3czlh29vx2rsu9kw2dhxpp5nzx882d5yag',
        "m/44'/118'/2147483646'/0/0": 'osmo15d9q87lnnylpclnnpdvv3nrdp6eeaphmafy8u3',
        "m/44'/118'/2147483647'/0/0": 'osmo1mpj9t4879cm7w3m5csfshh3xxnxtec67pghvj4',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'juno1km48qfx54ngywcazd4qru2xvv5vjcr4qzewtfh',
        "m/44'/118'/1'/0/0": 'juno1zzannxldjrw5cq445yzd43t6gq0ge5pl6zzvmt',
        "m/44'/118'/21234567'/0/0": 'juno1jd0v3czlh29vx2rsu9kw2dhxpp5nzx885yy0vx',
        "m/44'/118'/2147483646'/0/0": 'juno15d9q87lnnylpclnnpdvv3nrdp6eeaphmrq5vdl',
        "m/44'/118'/2147483647'/0/0": 'juno1mpj9t4879cm7w3m5csfshh3xxnxtec67lp88rm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'terra1km48qfx54ngywcazd4qru2xvv5vjcr4qj0hsvt',
        "m/44'/118'/1'/0/0": 'terra1zzannxldjrw5cq445yzd43t6gq0ge5pl25mh7h',
        "m/44'/118'/21234567'/0/0": 'terra1jd0v3czlh29vx2rsu9kw2dhxpp5nzx88yja5f6',
        "m/44'/118'/2147483646'/0/0": 'terra15d9q87lnnylpclnnpdvv3nrdp6eeaphmnkdhgr',
        "m/44'/118'/2147483647'/0/0": 'terra1mpj9t4879cm7w3m5csfshh3xxnxtec670h7ux8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'secret1km48qfx54ngywcazd4qru2xvv5vjcr4qkweenh',
        "m/44'/118'/1'/0/0": 'secret1zzannxldjrw5cq445yzd43t6gq0ge5plw447pt',
        "m/44'/118'/21234567'/0/0": 'secret1jd0v3czlh29vx2rsu9kw2dhxpp5nzx88qnnakx',
        "m/44'/118'/2147483646'/0/0": 'secret15d9q87lnnylpclnnpdvv3nrdp6eeaphmhhr7hl',
        "m/44'/118'/2147483647'/0/0": 'secret1mpj9t4879cm7w3m5csfshh3xxnxtec67tks4em',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'celestia1km48qfx54ngywcazd4qru2xvv5vjcr4q9puq5x',
        "m/44'/118'/1'/0/0": 'celestia1zzannxldjrw5cq445yzd43t6gq0ge5pla6s8x6',
        "m/44'/118'/21234567'/0/0": 'celestia1jd0v3czlh29vx2rsu9kw2dhxpp5nzx88nuky3h',
        "m/44'/118'/2147483646'/0/0": 'celestia15d9q87lnnylpclnnpdvv3nrdp6eeaphmycx8sw',
        "m/44'/118'/2147483647'/0/0": 'celestia1mpj9t4879cm7w3m5csfshh3xxnxtec67ce4v72',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0x74d1b7e6969b5db462d19b1977e4f4673a9790abc7353b66f3664123298b280e',
        "m/44'/784'/1'/0'/0'": '0xcc751726f45a0babe06fc581c554650c5c43c3a0ba94b58c835a424f4b7ad25e',
        "m/44'/784'/21234567'/0'/0'":
          '0xab55c0e7d3230569e57f9e9bc6cecca4d516ad17700449ded2fa7de921fa98ad',
        "m/44'/784'/2147483646'/0'/0'":
          '0x55bf6235e12753bdd5379a27b8f3e534e79a4ed92056a43faeccdd3555fde043',
        "m/44'/784'/2147483647'/0'/0'":
          '0x4e3e5559c8bca161b1965b6ffea600f0998e537e43cbc156181fdeacf4fc382f',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'r9ZnGbQ4EMGDrr32RiJh3FBJg7cDiYw4Lx',
        "m/44'/144'/1'/0/0": 'rGBeGJxkaMfY1zYZHeFarFy534h9mxz9o4',
        "m/44'/144'/21234567'/0/0": 'r38oCNP2s4DMKdGExB9JfGpcUVzep1UUSg',
        "m/44'/144'/2147483646'/0/0": 'rfdfFn3dQ1UidrRfFXRRzEW4w7g5FeXW7V',
        "m/44'/144'/2147483647'/0/0": 'rEjabYFdgKToBJCzuXgRtPXd7vpggBRELV',
      },
    },
    {
      method: 'benfenGetAddress',
      name: 'benfenGetAddress',
      params: {
        path: "m/44'/728'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/728'/0'/0'/0'":
          'BFC0417c3b50e4df1a3e831755b733539ab54898f3fcc47f336066c42edeceb04d70bcd',
        "m/44'/728'/1'/0'/0'":
          'BFC79429eb55446de4e5e2cb6af9ada3ec5b52c0139605a20c966c0b684e88ed21a3d79',
        "m/44'/728'/21234567'/0'/0'":
          'BFCde2d46d6aed6e342ecb27befb7612433f194353bbd5c2e002881bbe7676317010200',
        "m/44'/728'/2147483646'/0'/0'":
          'BFCf3f750e940e01b5100d0ec2b7aa608f3d0f35984ddb1ad001a88c9a951d00eec0d38',
        "m/44'/728'/2147483647'/0'/0'":
          'BFC44c026b37ed4dde7604c85a73a17e5cd8b68b4d09252b166bfe5c5be9b5244d5d901',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '13b8d8oeLVYcUsxsAjs4Hbg5UYjv3i68rmi6HhF2g7Zdm',
        "m/44'/1234'/1'/0/0": '1AcFdYcyrBQacd9sqcWfSGb74aPbDyyg7Wzd99rc1QaGu',
        "m/44'/1234'/21234567'/0/0": '15yEbk9V2GeyYNgwvCatB2dTv4iYF7qLWJH7jgAS7gafG',
        "m/44'/1234'/2147483646'/0/0": '1DiFeZMgAG1V2RQS9HaaYJuuPH1aG8ZyYenUS88hgCZuF',
        "m/44'/1234'/2147483647'/0/0": '16nztosfzJUSk88FxReYRBxTWMz9MrwZRmw3tZhZ1vdit',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'ILU3IJQUGHXDIL5CDXAXTV5P6JNALNGG6LAKQ5OQ23RDQWFD25I6YB7LF4',
        "m/44'/283'/1'/0'/0'": 'JOSYPAHS5A67EBKPI7PNIF76327MRJDBYG3RKBADDL4IT6A3IB5EQLPSZE',
        "m/44'/283'/21234567'/0'/0'": 'GPRN7UGY6JYYIWP5CJHSEI5EBAYDH663BNE3GTQXRFCZ3AH3S4UMSDULS4',
        "m/44'/283'/2147483646'/0'/0'":
          '4VTTCX3W3HLM32WBEMOGVVXEAQCKVGTKP7VR7KZQG4UU4YLL4JRFIUYRZQ',
        "m/44'/283'/2147483647'/0'/0'":
          'MLBSAJ2UMNRHFRQFKETEZ6HTGKSVDWWSM35A4CUTPDPR3I3UFVHMTLLRFQ',
      },
    },
    {
      method: 'tonGetAddress',
      name: 'tonGetAddress',
      params: {
        path: "m/44'/607'/$$INDEX$$'",
        walletVersion: 3,
        isBounceable: false,
        isTestnetOnly: false,
        workchain: 0,
        walletId: 698983191,
      },
      expectedAddress: {
        "m/44'/607'/0'": 'UQAdj0WAg-OVtMWuQ0f-flTzUg4HFfLhJf5Hn4rGbWxrYbTN',
        "m/44'/607'/1'": 'UQB5duhrHag-n_S3pv9Aa4ntykUfNQivZoJuytd2DSITXLsm',
        "m/44'/607'/21234567'": 'UQD2YNWimKVS0jHHNur64waCK4mya-pisMXgp3Tl-CPc-TQ3',
        "m/44'/607'/2147483646'": 'UQBIkh88T9ldN2wDTdpc1jZ_ohO486wlL_egxPdOM1gujc-B',
        "m/44'/607'/2147483647'": 'UQA9r4GJ7PHMpAobeRl7RiIxL97Y651M73QyWKl1eltfxvvM',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
        network: 'ckb',
      },
      expectedAddress: {
        "m/44'/309'/0'/0/0": 'ckb1qyqqjjhlxkq9u9gdxf2c7u6uvzxvwugwj2zqel3yyr',
        "m/44'/309'/1'/0/0": 'ckb1qyqqn62dndcmlay3jq2jz0quea99t8u0rvwqrjwrls',
        "m/44'/309'/21234567'/0/0": 'ckb1qyqwm7n5tzlc0t99cxmqc4ctsegyfumphe4shm4fy0',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqyg3709ja0qj8urfsc7arzhedavvjl7d5qcg98l7',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyqypph3yf6h3lygz9rdweethks445xdkels7f5vsz',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g522m9frtrw3eawemxxy0dxqkt9rna6quzadvmc8s9',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5rkluf23s30ys7346nvvxrgk8zgtvj88a5rjn7wl9',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5dudq283a6m2epwx2n5d6z3lr6yj8u5qurckujuut',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5tn2kk6fq4u560su9wvl8f6wqs9jy44gqj7vkmmww',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g5dkw0u7ytkx6fwvez6ncqf2nk6up0ray4urgs8p44',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'r9ZnGbQ4EMGDrr32RiJh3FBJg7cDiYw4Lx',
        "m/44'/144'/1'/0/0": 'rGBeGJxkaMfY1zYZHeFarFy534h9mxz9o4',
        "m/44'/144'/21234567'/0/0": 'r38oCNP2s4DMKdGExB9JfGpcUVzep1UUSg',
        "m/44'/144'/2147483646'/0/0": 'rfdfFn3dQ1UidrRfFXRRzEW4w7g5FeXW7V',
        "m/44'/144'/2147483647'/0/0": 'rEjabYFdgKToBJCzuXgRtPXd7vpggBRELV',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S01b32864c15d04d6ae0336b5ddc606492b8ff441',
        "m/44'/541'/1'/0/0": '1S0113f214a3079c47cd2d30ed63c0b721fb171531',
        "m/44'/541'/21234567'/0/0": '1S01dea0121026d7f702bd9bb921dc02bb6b27c581',
        "m/44'/541'/2147483646'/0/0": '1S01584253a100a67923ec03466261c700e7d27c81',
        "m/44'/541'/2147483647'/0/0": '1S01311de7dfd071891669e664e5bd1c117233af61',
      },
    },
  ],
};
