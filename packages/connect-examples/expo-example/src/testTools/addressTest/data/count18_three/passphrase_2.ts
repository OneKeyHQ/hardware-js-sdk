import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase18-密语2',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428114271',
  passphrase: '7789$$$add@@R@H',
  passphraseState: 'mp5EXTXF5h4QB2APmiRSEBi1xAX3H5ga3B',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qy0g467up0f909g2pq0uftmfclc59u7u6lmajr0sxytynxkjsd4wtyvthcl7z4ftj6c90evyrqsk2rvvnqd0etzda3jqz6rd54',
        '30': 'addr1q9w4r80fu9ls099rhffsgpfnuau6e5x97clz2zad8r6d77rlx760n7253dy7tlq4fgufgce5fs6zjnkwgudtd7luetlqx5s4cm',
        '2147483647':
          'addr1qy7ft3z0q5n9rpfnzxpft6sggg2e6fh8ms8kq33988gqa5gfnhz3w2rt880lfeuamdtt6peznd3unnk4xxht0wqwr2xsm6hulp',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'TQ636VDRJBVGZ2II62TKZ3SBWX2UNRXUWQSPUTQHS6NSOTMTMDLQQV5QCQ',
        '30': '3AVOHYJTM73L5WQGYAGCUUBFKBE3AK7RXGT6JLLSX7P6HU7XIVOF6XLHF4',
        '2147483647': 'GGJ6QONFIAI25UTZCESJK4WKOOLPXDW5U6K7PYDWVXB6Z7PCUDB5MEGZJM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x0c620f4ed3ac048c24f2c6295d3923645ec169659e7cdccc2b1b63fc8be22ea1',
        '30': '0xa96623a366dc434e4ec444dabdf61fb6f4bc57d3fc2e0a2177a666d431338b94',
        '2147483647': '0xb3f0c35e3a68c7c406bd214123ca810767732bfdfbcb903d2301de3182ff694d',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '19KfwU71AitNNYoPkeJiSRG64thaCUFhFc',
        '30': '1CE4DHh9HrTPUNLJ793CRcXL1aoTWvNwub',
        '2147483647': '17W9TakrkNgMroS1L13yuP72GTRxguJS7e',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3EsxQmYmQ33cE22KvJUyr8xv58D99rPfYz',
        '30': '3FAMDGmtfifX9egPrGWkatJ7Ez97uAX3g9',
        '2147483647': '3LEmNCPYWUufDVEMYj26wUo9jbf7JCjRzk',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qsw6cknnfqf6fs35k8kdl2x436zyhcrj4np9rkf',
        '30': 'bc1q72czfmjdmr3cc72tetmj5q39efrwgt5wgpwdye',
        '2147483647': 'bc1qxh6a8pjy27puynydmkw8lv60jn2npq5hvnx5cy',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pf8p2c7d5haqcfkzqmm9s8a7crq9awh8pz9a3r9f5gwj2eukuajxsgr9rwu',
        '30': 'bc1pcfawxfv64vey7msk23zmqse387h7hvgwcc6ag3rukm9vuwcmac5smt4kvz',
        '2147483647': 'bc1pey37kfhylsrny5xnmc8ua0392emkssqphq83r42a8rtt53j4522qpcswe8',
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
        '0': 'DQbi2oHwt4tvn9NN1KxyjKrpXcn3N1STLd',
        '30': 'DNBrcQ6Sr7rhfx18QjLJ5mYCxURzqEg6Xj',
        '2147483647': 'DG4i18xNSNy4phYzHuyge6oCE4mbUQGbFt',
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
        '0': 'bitcoincash:qp6rxupqgaf4sj0g2lp6uyhq0d3guvw6zsgcskk879',
        '30': 'bitcoincash:qragjk0sm45xg0u4prxmhwdjqf4n78xeg532f5mxgg',
        '2147483647': 'bitcoincash:qqq7cwf0xaa5v5ykx5qhs8x4z87pmy5t7qwgkhftqr',
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
        '0': 'LPqwF4qqPzdLBub5Eb2BM2PZgV8N1q4y2N',
        '30': 'LYNGHz3T7NMxTxTWMSVVw44iG7A3hQJwTF',
        '2147483647': 'LTHX8w53Yifgoe4wzr7VBjQcon9jY9T1kK',
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
        '0': 'MV3CQKPyqqaGN9HhaQS2Um8JA115GFhnEu',
        '30': 'MUX4EvcBBgdz4K2RdaAzPg9PceTydTUNJh',
        '2147483647': 'MU7wQSqzaqPTjFaSe7aN2w3yWags8xMD21',
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
        '0': 'ltc1q74hfedt49zv3anjd52rawh7mverzm7n98nxxc4',
        '30': 'ltc1qp6vw9arwxv3cshfd4day3pssdhanegfvc0drpr',
        '2147483647': 'ltc1ql9hqym9rwvtvve8w5vysad9yhnvjztdxau7pq7',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aam6hz637w2xws8f9vfgjv3ycd2w8gt8pe3p01abcm',
        '30': 'cfx:aatapf3dzaan0muhckhp4uh7c5kz3kemfjwgnsfsz8',
        '2147483647': 'cfx:aar8ga92td23eccz4mykuu43aywe33ysu25s5p45ya',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1crcprdmm5jy0uka5wrufd4pgtqgegqwggftyd6',
        '30': 'cosmos1j6ydvmlq5u6szh03x54lfrc6966zg045n77u6n',
        '2147483647': 'cosmos1cz2szjsncpdfansn8qg98ec3mu3r3489eguul2',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1crcprdmm5jy0uka5wrufd4pgtqgegqwg9jxr5q',
        '30': 'akash1j6ydvmlq5u6szh03x54lfrc6966zg04579nmrf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1crcprdmm5jy0uka5wrufd4pgtqgegqwgsjra3t',
        '30': 'cro1j6ydvmlq5u6szh03x54lfrc6966zg045t9k9xz',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1crcprdmm5jy0uka5wrufd4pgtqgegqwgm5zq0d',
        '30': 'fetch1j6ydvmlq5u6szh03x54lfrc6966zg045qrhccy',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1crcprdmm5jy0uka5wrufd4pgtqgegqwgqjc5mg',
        '30': 'osmo1j6ydvmlq5u6szh03x54lfrc6966zg045m9dvvp',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1crcprdmm5jy0uka5wrufd4pgtqgegqwg7mgl2x',
        '30': 'juno1j6ydvmlq5u6szh03x54lfrc6966zg0459va8a0',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1crcprdmm5jy0uka5wrufd4pgtqgegqwgwd3y06',
        '30': 'terra1j6ydvmlq5u6szh03x54lfrc6966zg04546yucn',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1crcprdmm5jy0uka5wrufd4pgtqgegqwg2vldsx',
        '30': 'secret1j6ydvmlq5u6szh03x54lfrc6966zg0453m2480',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1crcprdmm5jy0uka5wrufd4pgtqgegqwger65hh',
        '30': 'celestia1j6ydvmlq5u6szh03x54lfrc6966zg045z50vq7',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x6d64B86b387fBfE817C120F77D613ed0c2e7444D',
        '30': '0x995535e01Bd52A588FCC04174787A3B623644Fd9',
        '2147483647': '0xe5e7b8CA8b49958fd7910608CCbbCB616da74C30',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x14F9a0fcdfeb15636A99107Fdec0e258b3028F28',
        '2147483647': '0x912eC78c87463FEbfa925283b2aA7c4cD43d4171',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x14F9a0fcdfeb15636A99107Fdec0e258b3028F28',
        '2147483647': '0x8aBE16085d89e813fF793814A124B04C4AAECd5e',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1k3ki6kmjwn7j73oqswofmhddds5lpnfjhkq6xoi',
        '30': 'f1hxlc62bnkwjhgsh5cpap3kn7wcilfh3fld7k4sa',
        '2147483647': 'f1ft764liy5ake6r56hfdzf3jl4xmkvay6spyz77q',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpzg4ch0ytz053n89e3pyun52qgje2mwpy3exevg48ryts2d6wscu3x9a227j',
        '30': 'kaspa:qpa7j3qttvfdyxl60wlzqy2n9rwxrtrqeqnh37kdt53wnfkm6laqs6y7mn29y',
        '2147483647': 'kaspa:qzph5gpn9vdfkseftxk6zaday8l832qv0n04ewwuqp5ueggxz3m8zmw74d3qf',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '15d40738920caf7666f624983d35b760be1196f8689d037e706d8512b00cef13',
        '30': '5185658637a1f83c6b359fee5f583476562129bac65fe6d94a090e38a77b9429',
        '2147483647': '434f0a6739b1c3ae7abbc30ad06f05b2963d589ac3a6aa7da28e55b83c7b1809',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NCL2AADSEEAXDO46RMVQ2V6CQ4EPAUAHHVPSFWQ5',
        '30': 'NBTXNLRQ4744RZDGR6GUEPPWVIIT4GR4ZXNP4Q4E',
        '2147483647': 'NCQJOBAWJZYYNG4E3XMXYUFADLRSTZYS3ZX56HEK',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g547w6dfzh9rqpgcfthmurxd9kn4543x6aw84j4sga',
        '30': 'nexa:nqtsq5g58ae6h8ueh2sgakkd9rp3czytvjw390887ax2hkkn',
        '2147483647': 'nexa:nqtsq5g5p9dt57r2kllnpw2q426u8wt2n85nnfuu4epp74ez',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12E5Nw4J8oitXCHkBoT5qu8doCK7b9tdTgBtFiQkPcNZXjEy',
        '30': '12U6fUQXvZPPqigGdWVYfeQsvut6oGdXQX5NP4jsbcj53NGM',
        '2147483647': '124r5LEy6KhbhYkQKYz86FSMcoL5KTXshLeMkC4ujA6kyay5',
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
        '0': 'XANftmK4G6XJVK4iTrCjQTm2d2as53EQNxYL8dFhtLzwSfG',
        '2147483647': 'X19NHwz1n5EUqmirDPEykmUrE3YbNgUe3R1pcHR3S5CP2KS',
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
        '0': 'DoPtv96uPULqK6fzsD8bhfV6AbhhX9fqZJ9V5hMKKZY6QoW',
        '2147483647': 'DeAbKKmruT41fZL8ckAr3yCumcfRpnv5DkcyZMWesHjY7dP',
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
        '0': 'j4SYgoe3C9jxSvGiyW8qmYu1UTxQ3Pjuf785qTyTiGbVg175a',
        '2147483647': 'j4SPTW3Ds7FwA6dBddtNooFKCHZR183YuLnYJxT7sc9DsSPjh',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rLWgabVpnrdXVb8sVc5E7Td85rSQs3vcNv',
        '2147483647': 'rP7fgRmngJ7cqs8HUpyJFR4WrTTWgY1Khe',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '8rf3KDom9vnYiXZz7maZKkXUB5j5nj3tC7araPpTtamK',
        '30': 'FJxvEoyk6eXK2nGpBY7WMCmZSNAgYBMwgJwEc29NsT9H',
        '2147483647': '9aRiDoLKKCG5WMS38R2x5aQRZkDry2cZ4KR1iQ5Q5bYB',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x59ab9db9ac50ac983b88fef8166df41d',
        '30': '0x761dbc9b0eb64f495cd027981e95e85a',
        '2147483647': '0x2cc621307d4dc172b64d1508a12f1333',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GA2NZAHHCPV5AXEEQUURQ7CNGCTLIQYFKBVMWI3OU3ECXASUDWB737KF',
        '30': 'GCLYQWFCQPGVLE44MNMJZW5O4BYXKVGOUNPDFCACPZGQIKZIKXJB44PR',
        '2147483647': 'GDGJBPSOKRNAUZBBB6LZVM5QMO4MOBXZD52OZID4PNMGT53OGI5PUE5S',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x67ab654ad5c71d55152771c3f8ff3d3a9bf6500dbc11889ad35ed247fbc8c03b',
        '30': '0xfa7e14401e3c4a64cc3d2a54ebe423baa504a61f5e622889efe0ac4bb99fdbb4',
        '2147483647': '0x8ea12953bb1e710f5a92918660c5012af10b1eb79b1e99b5eddf48dbab017b64',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TPFaTZwCwSxtXf8CCezdo3Wt9LKt1zbzSx',
        '30': 'TEUj6Tc4VWUGEhVh6mfS1qs4EXUPBz3nTK',
        '2147483647': 'TBuVXCRn5o2aKHr5TdMvF9FW2vPtuh5Zt1',
      },
    },
  ],
} as AddressTestCaseData;
