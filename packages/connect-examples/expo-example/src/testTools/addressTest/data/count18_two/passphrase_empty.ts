import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase18-empty',
  passphrase: '',
  passphraseState: 'mgyRVtXdyGcWA8YTbDDPpMCqDxr994sZVG',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429817885',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qy3tyt95lgpy2q3ceugktx9z8n9mlmj56qqnrrq6dpv6q6wf7syucaemuuaftl975q9msgtuezzet9qujrxnvx4hkgns6gvtqq',
        '1': 'addr1qyytuzys9zldr0aqudh98dlf88rt2keju584x0tkpc842z0xshkjmsdfna8zgg852umxxdcu9lsrswtv5umhhjl0cs8sd26pv2',
        '30': 'addr1q8n9k7evgjsphtadldwllxxt0r84ag9xzg6xn27apjprluhwt3slqw3xz4jje7wc2ffnsg0dm5xt2x7gfm738kkp8w9srlk4qy',
        '2147483646':
          'addr1qyqn9633wqaqtvptxmdt95zgum2076yn62n42m88lq98s2x0uycnd9tep3mel57egu292e82mtlk9xl5srqteue4k9vskesxqz',
        '2147483647':
          'addr1q9l6089ufgj43t7fxy897mwzsfa9acvfte98s2wdnsrp2l39jz7ptm3mhcrqxkykq474swwyy5g4tcvnw470xzs7se2sap4jw8',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'YMVTH5ND3G6RI77G4CYBRLTJH6KTJREBM73ETN26AVYO2PQPW7TGWFYDQQ',
        '1': 'OYPO3RNDBBCNWZMD3OCMP6XIQAAUNEJKWGYKBIKQ7R7MIDHW3IYXJCAFD4',
        '30': 'ZV35IJPG5U46GRLXWPUFYL6MYYTIMNVFLYW7OMPPEVI2SB3VOPRHCD33HA',
        '2147483646': 'FBEBYVZ43WPYU6M7CLTJPDGYIKJTW5FYVGTWKP7FDI5ERJRUXGTVJS5QWM',
        '2147483647': 'OHIFDWDHPVCEEHH6MZYGUMI6IVFHMXM6V44NITGA5B6AAY6X46YXSPUYRY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x5a34f499ca3a75e3361674316a47557b65d1d5ea6b5c72a4d7fa0d02a8a03993',
        '1': '0x003b00409275c63dc4bcb8e994df3bbb9461d03c30f17ab2fade1007f03a8290',
        '30': '0x12d478ac5e81e2ef3e3bb4f304351ec3374bff7b6807f090c05b6fc82fce6ee2',
        '2147483646': '0xb7a70f4c80104bebc2d275caaa41e31d6534e2960c7aa98774bafccc90cb56e2',
        '2147483647': '0x236ce74e5c6dd9ef21f4f7628f37399c23139741107fceb860e187496c1a2ed4',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1AbPs6wKNLmhPEqvVGXo2mCeQbt3ac1u31',
        '1': '18sK4MDKj5fY8YHyWWUAn7xacdU7VdKQuy',
        '30': '1HbRivPZYwKVATX4Gye5a4JPG5CUdSdxkz',
        '2147483646': '1LUtHpZip4L1BRKSHyzLwo9vfJP55sxaWd',
        '2147483647': '1EwLSxfbWPjDvQG3GSbUBeGgEpZHBKXJWy',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3PDLusYsYKdTFpjAxmetJUkMbu1rzj7wvG',
        '1': '35bCETPSCRu8ddPtzQWFzw7j96vLq8r6Bx',
        '30': '3EB7JNvknngRqNevbNV8Eh4aaZPWGs8tDX',
        '2147483646': '3AjTU5p88mHsBFe6Z8wNbFwuT9MrvoSbBi',
        '2147483647': '37kM3tAh5sqs91ZRHV8MjRxczMDncU7iip',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q0lfpz3emnspkyjf9yxxnzr0ysuuu7x3ptn5une',
        '1': 'bc1q7hj84xpcdq25mt67yu9rhfadpdm6fd4c5u7cqd',
        '30': 'bc1q68uaneu6qcd7jd92favf78h9tpdfz8fwa0lw55',
        '2147483646': 'bc1qrks59q5w6x4zqp40atyp92erdk9t4jfpd5mygq',
        '2147483647': 'bc1q4v8u6wqhha5ls4ugplcywhq7v2ppkfyd8yg64y',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1ppeyn6km76kphw5la5jesjrvukdp4rngusvxp663xaglyk5zkdjlsnkxfnc',
        '1': 'bc1pj7h9hv3jfnfawuusuvvv2e2ysf5k0wnmqdts0mr9aft7fzfpyfvs83e37h',
        '30': 'bc1p7379rdv4a7lkcx8dcesmuaym6z39p83lkxngw207x575kqfyrp0sskssa5',
        '2147483646': 'bc1pwj7m4pu9jufqamd9gasel8fzssdzh2w0w86qr7c2y3sauln6hwhqz58usc',
        '2147483647': 'bc1p6a6ekmht3d0r7qd6p28p9zzalevu6e6lsh5qddp29s3k2zyhh65sdenkhw',
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
        '0': 'DBNWmpqPyaWnevetUokkUzgaZrECTSTmY6',
        '1': 'D6rDCDWg7jufJ1oWQmQ4tVXynh5j9hbK5q',
        '30': 'DLVAs4gTadcDDZtFsRyMdDRL5vTPTEwbNc',
        '2147483646': 'DHPdNxsx4gkwSdbGRJi6x4XchPvWMW6K9y',
        '2147483647': 'DDiEhDBREr41951UhEPpGXTPPaS2bNPqHB',
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
        '0': 'bitcoincash:qzr4w7zjl9d70l9xjug3dgwjwaupzcjcj56a5qx3gg',
        '1': 'bitcoincash:qzj70yjqda3fj6fhcttzqym8wqqmej5l6swwdluz3j',
        '30': 'bitcoincash:qpl7nj9jlkywr74ny47nrhryxwhx0mwa8uqxq2tq5q',
        '2147483646': 'bitcoincash:qqs2ue77p4sk6m6u7lc20zelsgc3g2nf858txnss0n',
        '2147483647': 'bitcoincash:qqj2c20c8kphz89k9v9h46v9xukmmpwg5qsnyhn5x9',
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
        '0': 'LVJxyFkFoUFAGZG4cLNN9oa32XePqLvzp1',
        '1': 'LP9Pu2x3cFAoAY1sUFEaNdbAXMb4Sodmib',
        '30': 'LS1v2PcPeq7m5PAKiZ6g1UShjwfMZKCRoP',
        '2147483646': 'LY1kNDGSomrxc2YyUosyJov4XwaiPP7aQG',
        '2147483647': 'LPBp8MDUxK8DbQseGm6k9DaddaoYow5xJ3',
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
        '0': 'MNoWdPBXnhsG2D4DQ89GTks98X9GitEP8z',
        '1': 'MPrFtFBdM2Vd6FMTfrWzB9u6hDdzgnfAcR',
        '30': 'MM2YASFUEehyKyvgnS4zqDoodPzYH5icrW',
        '2147483646': 'MMgGspZ9PfWZ34beX7Uy8tiS7tHU8GEvom',
        '2147483647': 'MNdHavxPR1n1jg3hkjE3d4uCaLYgJhuiag',
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
        '0': 'ltc1qj80p6hp90d9lmw0c9hrv4yh9uudzy33elfdx5e',
        '1': 'ltc1q8gwmylv505wq0yneztgzj8k7f6xuw8s65x0xhy',
        '30': 'ltc1qkj58pddf5s2tzqu8xkjd33mrs7xg9eyg7xr0wu',
        '2147483646': 'ltc1q4dnywa4txp6a9k6zwdchgph40fp3ahfkmv950m',
        '2147483647': 'ltc1ql2kflu88qg24gafnnlmz0aa2s4jmf5wshnnnge',
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
        '0': 'NWSkR51qv8U5jyfwD8AqERdqApituSjFKH',
        '1': 'NWe3WhoodeRR6dmkeFPUY7Zek1Eaf7Jorf',
        '30': 'Ng5DEbUQCzDVDzwhAcR5RvxT4VebX46uSG',
        '2147483646': 'NaYN6G4UAghd1qS2n7HhgLjTknoS1XXvVV',
        '2147483647': 'NU2jg6JCVczmLCgSXGSzV9L4umpvaaNWKd',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyq0p0cll8lsy9hug7hw5mt30uqkfrdqnjzsaqa22r',
        '1': 'ckb1qyqytsjhufg3f8w3eleaxftqsarxx5nxd7wqfh65wu',
        '30': 'ckb1qyq04fy6n6c688s48zm0l4vnrewa2gh3a0cqk72l7h',
        '2147483646': 'ckb1qyq99sp3ghxvd28rhex6ngt0wh0hr37xxc6qa7pgga',
        '2147483647': 'ckb1qyqz7dk9e3tvd2h9a3fu3mn7cj9uwdskpnfsa4e09w',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aat9jzxhhrs50jnhsg3jxk4rpmaexuwckpg1e1k048',
        '1': 'cfx:aakuna3ruj5n3bxzb41u5cdkw25sapg2sjh3vujdfb',
        '30': 'cfx:aajsn1k9p3wdrjmt0p7xwczrhmp2nwjynu6fna8r30',
        '2147483646': 'cfx:aatcvfw3h84m0zbc0bbzvbf59h01aa8t1yd883t7rx',
        '2147483647': 'cfx:aarrz15xdgd0k1m026s4k4327a36ays3cpsky20dtj',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1wwvzqvprvvvnveuurtlqquf577jpw8x7wu2eqf',
        '1': 'cosmos17qk8lpujecgq0u9jcyerxmgyalvrw2v2yg3x4j',
        '30': 'cosmos1gpcn9llkh7600kjuwcqgks5jkdaud29l9pq40f',
        '2147483646': 'cosmos18wphknl3ujg5lvyvtnms44k2zsql5c5ys5km2n',
        '2147483647': 'cosmos18920zsy6l5zn3czvh3dy8zgr6dznecgmdcfkrk',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1wwvzqvprvvvnveuurtlqquf577jpw8x7r887en',
        '1': 'akash17qk8lpujecgq0u9jcyerxmgyalvrw2v2fnupvg',
        '30': 'akash1gpcn9llkh7600kjuwcqgks5jkdaud29lg6djkn',
        '2147483646': 'akash18wphknl3ujg5lvyvtnms44k2zsql5c5ya0munf',
        '2147483647': 'akash18920zsy6l5zn3czvh3dy8zgr6dznecgmqry36v',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1wwvzqvprvvvnveuurtlqquf577jpw8x7k8zquc',
        '1': 'cro17qk8lpujecgq0u9jcyerxmgyalvrw2v2unelfr',
        '30': 'cro1gpcn9llkh7600kjuwcqgks5jkdaud29la6gvnc',
        '2147483646': 'cro18wphknl3ujg5lvyvtnms44k2zsql5c5yg07zkz',
        '2147483647': 'cro18920zsy6l5zn3czvh3dy8zgr6dznecgm4rp0l8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1wwvzqvprvvvnveuurtlqquf577jpw8x7apraz7',
        '1': 'fetch17qk8lpujecgq0u9jcyerxmgyalvrw2v2h4czh9',
        '30': 'fetch1gpcn9llkh7600kjuwcqgks5jkdaud29lkuf3d7',
        '2147483646': 'fetch18wphknl3ujg5lvyvtnms44k2zsql5c5yrfllgy',
        '2147483647': 'fetch18920zsy6l5zn3czvh3dy8zgr6dznecgm79qjpp',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1wwvzqvprvvvnveuurtlqquf577jpw8x7x8efkm',
        '1': 'osmo17qk8lpujecgq0u9jcyerxmgyalvrw2v2vnzkrq',
        '30': 'osmo1gpcn9llkh7600kjuwcqgks5jkdaud29ld6n9em',
        '2147483646': 'osmo18wphknl3ujg5lvyvtnms44k2zsql5c5yc09tup',
        '2147483647': 'osmo18920zsy6l5zn3czvh3dy8zgr6dznecgm9r6x4y',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1wwvzqvprvvvnveuurtlqquf577jpw8x7cwfz84',
        '1': 'juno17qk8lpujecgq0u9jcyerxmgyalvrw2v2j6jajw',
        '30': 'juno1gpcn9llkh7600kjuwcqgks5jkdaud29lnnrwg4',
        '2147483646': 'juno18wphknl3ujg5lvyvtnms44k2zsql5c5yxx4qd0',
        '2147483647': 'juno18920zsy6l5zn3czvh3dy8zgr6dznecgmm22dy2',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1wwvzqvprvvvnveuurtlqquf577jpw8x7gcsezf',
        '1': 'terra17qk8lpujecgq0u9jcyerxmgyalvrw2v2zvtxhj',
        '30': 'terra1gpcn9llkh7600kjuwcqgks5jkdaud29lr964df',
        '2147483646': 'terra18wphknl3ujg5lvyvtnms44k2zsql5c5yksvmgn',
        '2147483647': 'terra18920zsy6l5zn3czvh3dy8zgr6dznecgmtunkpk',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1wwvzqvprvvvnveuurtlqquf577jpw8x7ve7sa4',
        '1': 'secret17qk8lpujecgq0u9jcyerxmgyalvrw2v2xd90gw',
        '30': 'secret1gpcn9llkh7600kjuwcqgks5jkdaud29l8y5uj4',
        '2147483646': 'secret18wphknl3ujg5lvyvtnms44k2zsql5c5yj3zjh0',
        '2147483647': 'secret18920zsy6l5zn3czvh3dy8zgr6dznecgm0aal72',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1wwvzqvprvvvnveuurtlqquf577jpw8x7lkmf6y',
        '1': 'celestia17qk8lpujecgq0u9jcyerxmgyalvrw2v24zqk0l',
        '30': 'celestia1gpcn9llkh7600kjuwcqgks5jkdaud29l5t394y',
        '2147483646': 'celestia18wphknl3ujg5lvyvtnms44k2zsql5c5yp78ts7',
        '2147483647': 'celestia18920zsy6l5zn3czvh3dy8zgr6dznecgmujcxem',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwnyUcuwQxX3ESpKPH44axBT7dpGKXtVffCF6og9RoDFVkkD4FALAmiEanHfHzckZMiQQhz5pQ9uB7E7L1dDTW7X1R1cLNo3X',
        '1': 'XwnxpP4rd6zP4iFrunQBDfZei9Nr99AYUUAZgViq99NpNCdVReTQngAZuLW4fRPVveAd92ycfLqHDGQH2dgmfsDC1mHgqZ42X',
        '30': 'Xwo8Dbg7qUURsRxgY7nqqpJFrxdTN27vhNAMGprCfLMPVCt98Bxj4aJFySWV2xQAFJXMPBdqqdsKcPFG43uhZXft1qxAPYDd6',
        '2147483646':
          'XwonhBrLf3q5KytKrhf7Zz17WBJyD6KopPw5PfcY21if6JLjkhaquwqFp31ixiWWSSfeZ895zNEUgK8fr4SPEygF2EuoHp9MW',
        '2147483647':
          'XwnHtr72LNNChY5sZj164QUiiv7zpnydKPG7pgA1adB6eUMbKNrMD4NJweD86h1rSViUDopxaVG4z7gm3QxhhGZE2wYdSuu32',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x07335d36eB33B8d95Bf11e69C2C6621214cB7282',
        '1': '0xe08D3ba29bDb4C5eb48e9B8EAcA3b4C2D70f0A32',
        '30': '0x25eBad0c712d1DDe6D9413f2E2A3e990166b2D57',
        '2147483646': '0xB120fB905d28C310410206F07AE13Aa8Be4A6a23',
        '2147483647': '0x8FfCDaa3FD0c5234c21d1FADFCa05e8577e917AB',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x0BC95B209f77e7B014D8e71107De6D0FD412F028',
        '1': '0x04E9baC0E93B11E120F803A1318427fE942d3E2f',
        '30': '0x2aa938FC8464A7aCC183261E79517bf067656a7c',
        '2147483646': '0xe14b6915Cf142a502D8ce54e075301380D48769A',
        '2147483647': '0x888a0A06Cb96eB4722Df183D72c53d517b936a8F',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x0BC95B209f77e7B014D8e71107De6D0FD412F028',
        '1': '0xc09e74c3a0030b9e43E1C15fC7298b1692097552',
        '30': '0xd58b10D9528FEc78E893b506112A29EB1706c0F8',
        '2147483646': '0x6C33B9002f6A5a210F86b427f95f1E53849C3f7F',
        '2147483647': '0x03Fb19A4771fe92915976e97E6C7483Ce90fD095',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1aglbysgvhdfiubz7jebr3yg2p3bwqkolsl6wtva',
        '1': 'f1zc33dowejvs3jrfwmgolcz6ihnap3kkz57xe7ya',
        '30': 'f1efwcq7wmydjf54glct7gu32hoehtu6hyxfudo5y',
        '2147483646': 'f1h6nv34fz2rvyjzpwmrd5dervorbxdjfjajixuqq',
        '2147483647': 'f1hgcveq4xnyrmanhbockagc2hrysxkdj2fbfugba',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpm9w807nlrk4qmqv886p8zp2qc8zgu4athhxuxzdvmttyt9l3a0vz0syfma7',
        '1': 'kaspa:qzpmfryddcl5h94dz27jkdd796zca48anq62c842lf3hmv4l82m7jsg44ary6',
        '30': 'kaspa:qz4au70pfpkvk3zjcuhzu5tlvv7k873lthqtx9j8fj6ndkwcsakvs4z0pea7h',
        '2147483646': 'kaspa:qze5dx08t93ctwvfaj7zvmsmzuwhundshuewattsf9crz3fswarx7z7ah0gga',
        '2147483647': 'kaspa:qrqz7cxlcgg03mpgcfrrtutf6j7t7lw9wrt8cmplpjt9tnvr3g5fsfr5avz9u',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '51348eaa4b02be8293b36f031c531bf1ad9544086c05de66ae39722ba3f7b51f',
        '1': '3de9352ed34ac23225466c2246ce0eddd7ad018e38b35b5caba1663264303197',
        '30': '0117b72368670701a3f4fcfa80bd2930308e13507e0bfa238daa35951d89e628',
        '2147483646': '142732e5b9c30818b714b75e575e47210f4e98060ac8f390b26c74aed5361313',
        '2147483647': 'e9aa00dc37815de680c3f879d0fcab74fd4ba32a6a6bac377da10c71c35e1b3d',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NAPYHXIQZHXYAJZMWKRNOI2JMHVNJEIBNHH54QKL',
        '1': 'NAP4BBQIHCG374CSXWPZ5C4WWGPBRLML7KCK3QKG',
        '30': 'NCAE2QXVZILMCHYACJZ73GKWPFHGVM3ON42MWQQQ',
        '2147483646': 'NCER3MNX36BFU2YPNWIDCWL3VVLZMC3RGG5KI6SG',
        '2147483647': 'NCCM55UOMNKSPNNS36JVZMJFTGQ6BXO6UWJWJ4FZ',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5ejf9znxrdwqmm64plznv2r8fxplat995wxqape58',
        '1': 'nexa:nqtsq5g556ckw7dq00sd4k6hcql2ghjdl34x9mmrun8w9wdz',
        '30': 'nexa:nqtsq5g5l3r8umtyv5v358kzu5p2pwpz0snl2khagdk092da',
        '2147483646': 'nexa:nqtsq5g5vhugxu3pjv29rt87lhpd07jwvqq94n0ygyn3t9g9',
        '2147483647': 'nexa:nqtsq5g5mxpwvcycvhur2uy8s7kx9uragszxxcxxajcuhqrm',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '1HCVtnv2U1z1TPRvWLesgow2UqoUbY55ZvLQFapYeMRvQN1',
        '1': '163aQSRBsxQLA56CifGAEkFD2nxYSe2AKvCrRdZwsCsPTz83',
        '30': '14D7pTdULvZpyS3ucRB5g28jsYJznAwQgGZPfFs9aqizo59b',
        '2147483646': '15jwBXJmD4Fdh6RXLTvb2EFhBexcGQDHHyZDFtFcBgFmVB8V',
        '2147483647': '1upmafHSGSTTkuLUWNpRRT81LmcapEwXzMsTJwHzmbMvghZ',
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
        '0': 'WDVnrVvwvPcnkQkTAjmmC94FuZGkWgg2GgzUfoKrvKsKyP4',
        '1': 'ayshQ8CoQmxwN7XFKfH8FaLGDg1iZAmGcyWW3nTBUqpscXd',
        '30': 'Z9R7RLVGNwTkj5E95aCZXTs6y2U4661cyL3jg5eu7hSCdUr',
        '2147483646': 'agEUV1n8WdGUPSqs8KhujapR5g5YKMtEgKsLJU7VxECtgsf',
        '2147483647': 'Wr84YNJMip6F3vf1AmwJvnFEmV5rjPYUh8XXj9oK3ZoL8xg',
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
        '0': 'CrX1ssio3mSKaCMja6hdVLnKT8Paxo7TT2bdcsRUMYQV4Hk',
        '1': 'HctvRVzeY9nUBu8Xj2CzYn4KmF8Z1HChoK7ezrYnv4N2R1q',
        '30': 'FnSLSiH7WKHHYrqRUw8RpfbAWbatYCT49fetd9kWYuyMccN',
        '2147483646': 'HKFhWPZye161DET9Xgdn2nYUdFCNmUKfrfUVFYD7PSk3pMh',
        '2147483647': 'DV9HZk6CrBumsiGHa8sBDyyJK4ChBVyusU8ggDtvUnLVMc8',
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
        '0': 'j4Rbovbmp3QFYQXpfEqjLaggmhEvjHBZ6j1pHcWdnRdUYPFwf',
        '1': 'j4WNBq9Q5ttdtZ9XS2zeqwk83hZ3UFE3ByN6odtcukBzVw6hP',
        '30': 'j4UXjFAcNMroPNWV8vkZmP21aYJPvakxSKiTLsWv7Tpr7FzR2',
        '2147483646': 'j4W4YcEHfDzVC6ArkeoKGjE8XrR3Y4zEJwRTAU9Ja4fNsxNq2',
        '2147483647': 'j4SESCHeBTCg1rqLZnqmW8RKxg6rYPQFyBSFpfZzFskiUPfCh',
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
        '0': 'dfWqDKPqSo1WCcT9tsCvrQigAuaUbASvqBLWYF3oaQ6mPp2bD',
        '1': 'dfbbbDwTieVtYm4rffMrMmn7SutbL8VQvRgo4GRnhifHMMpkd',
        '30': 'dfZm8dxg17U43aRpNZ7mHD3zykdwnU2LAn39bW45uSJ8xgmEf',
        '2147483646': 'dfbHx12MHybjrJ6BzHAWnZG7w4kbPxFc3Pk9R6gUN38fjP7Wu',
        '2147483647': 'dfXTqb5hpCovg4kfoRCy1xTKMtSQQGfdhdkx5J7A3rE1KpaD5',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rNwJhxMjfmXXVZSr5jhCmCPhXH6FoDh6gZ',
        '1': 'rDTDisYPkU2EBotk3HbLyPshcrncQeUJei',
        '30': 'rM5yT7KhAwYHRVJ9NfyYnthb5ESB7JWFDV',
        '2147483646': 'rUY5ReuBoqmEZ3MP9Yc4mLnarktMHEBFUE',
        '2147483647': 'rMHqft3y6EFR6VNxbsF1fAAwTKoWcwTxMs',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'C6qsVWHrbaM1fHJPS19i6xdY9Wp3K1GWsuvVSGC9iths',
        '1': 'GMKErMXAVG2h93Z2JTTNKKnPjDJrMU3QaTQ9Gw8Hq7qK',
        '30': 'C6aRF2f8gBdLR4BsJyWNMngMxymbRwdke3CiK95E58m2',
        '2147483646': 'HWe2fWbQpWLLT72vL7P7rXCeiZJSoq86WPLJYAbqf3T6',
        '2147483647': '7bLUHe8gHEqhWqqzwEpb478XUdPJ1EJejs2SpDA9Bk5C',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xf7068f67e2ef549118f16ef9fba540ec',
        '1': '0x0ea8a75dc535af079541dd1320c986e8',
        '30': '0x5033f88adc3167d9a08a564580ff76d1',
        '2147483646': '0xb7537c1a8834e54c3445932419beb42c',
        '2147483647': '0x215a5b923fb02127a60456764508b9f4',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GA344NRALDFAHNR76EFOHVL5EWQDCKSPXAYCIAD6SXOY2XRZQFMSOW5X',
        '1': 'GB7ZH72676HD2CPOS7BF2HBI65EI7NSW55YX37BHOOQK34UGFVBSPIGU',
        '30': 'GBYMEQVTBPKXBOL6MSOCJQX7JDNSI42HFVGCEKPZFNEKMJEY3IX2WBCF',
        '2147483646': 'GCXKYDWMZKUU3N3BGJH4FVDSOBGZISV3MK3F4BCDI3HD5ONMBI3KY72J',
        '2147483647': 'GCQGJ4Z6SIKLG4QAJS5UDPXZFIFNARFNSCMSOV3LCFLJRXJLMDE6P2PQ',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xf7f970bf9cae49feb551e90281fe03cb42d86b12ac37fcf15d4842620024f68a',
        '1': '0xa49218fa2ab4711ec915305057aaa0f381f865b0f195945ee6400ccbcfaaadc0',
        '30': '0x8b92d7bf30fefd921c160b18c1de7a0800fa4b01b875f3fab1ec5d84f8538255',
        '2147483646': '0xd21032d8512862a620b07b7351fc221d54f6d7b3bf0d18409f03f604cb7c4f71',
        '2147483647': '0x47530b32cf1c216b4ee4b03786f32053a3717e00bcc7ca2263f03ba3be8f75ce',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TLYMEB5rnhDMwfY5Jm2BabuLFfUzrgyWyL',
        '1': 'TATr7ijZ6KGBXnoMgW65WFrLS6kofbaV9p',
        '30': 'TSa2a5zTbGQ4rV5W76zVJZYFzbt3C6vKkb',
        '2147483646': 'TBSFAGKcDjmh26ftoN1Hf5t7Qtrz9raPaS',
        '2147483647': 'THdRd5GWRMpf32ZnYKmPo1s2yJMvxPBmF9',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC97c42f5a908e5c83400e4ff8773eb51ac04429cad5ea9f9b120da1b5d53292745bf2',
        '1': 'BFC5f6bc37eef82eb31bfd4034e39951db4cf88d6473767f75a4e0c72cc6ed7477e79d1',
        '30': 'BFCf4d6422ef88f266b16167f701ebcef3b585f864d051e1717a4e10eada45a85158a1e',
        '2147483646': 'BFC2647af48534dc90414821a9966b82349b3efe3adbf4f4e32ad9942da0750dc9b066c',
        '2147483647': 'BFC77f256580e81bf98f4bc922e97db12c2d7a236d659029a8e82a27525ea400988f458',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NVod3WhR1QptQfZ1f8PCNEbR3eFCLz2FMD',
        '1': 'NfWyS7eeg48JWK6rhJuLZmMhxmFE6QVVMz',
        '30': 'NZbSZxX6C7zbkCiM3TYYryGfFWwpbQ2RFX',
        '2147483646': 'NPF2VjgkMBqTviEz7WFMEydYAGtFBNiYNr',
        '2147483647': 'NaXyhcrUX28rG6Pz1FD8xe5woumb6K5YBY',
      },
    },
  ],
} as AddressTestCaseData;
