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
        '1': 'addr1qx7u8vtchw0ut77kqsfgakfs8xf8ml7k7zvmyufyup2qsjhee77t9dzl2qpz5tlfx0w5me0r5q0lccp424ttathq0ggsxt753k',
        '30': 'addr1q9w4r80fu9ls099rhffsgpfnuau6e5x97clz2zad8r6d77rlx760n7253dy7tlq4fgufgce5fs6zjnkwgudtd7luetlqx5s4cm',
        '2147483646':
          'addr1q8sdqw388zleadr60p43ycq5d2hg375shjz7fuhzdwlm5aldcpltwq23drkmgvzhyst9v9emtwwh9cp72vjhgx0er2gqty93rm',
        '2147483647':
          'addr1qy7ft3z0q5n9rpfnzxpft6sggg2e6fh8ms8kq33988gqa5gfnhz3w2rt880lfeuamdtt6peznd3unnk4xxht0wqwr2xsm6hulp',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'TQ636VDRJBVGZ2II62TKZ3SBWX2UNRXUWQSPUTQHS6NSOTMTMDLQQV5QCQ',
        '1': 'SHZKIL3Z3OTBCMGKFDB7IFSIA3QW4EXJV6DI4Y6CAMYOKMV3Y7GXMUQDUQ',
        '30': '3AVOHYJTM73L5WQGYAGCUUBFKBE3AK7RXGT6JLLSX7P6HU7XIVOF6XLHF4',
        '2147483646': 'OC6FTIEO4C3ZXFFDVY6KAGWNBBSHVZD2QSCABQD6XRAREBMSKGLY62NIPQ',
        '2147483647': 'GGJ6QONFIAI25UTZCESJK4WKOOLPXDW5U6K7PYDWVXB6Z7PCUDB5MEGZJM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x0c620f4ed3ac048c24f2c6295d3923645ec169659e7cdccc2b1b63fc8be22ea1',
        '1': '0xf25016b7c045e1af78b4a0f168d63dd425dd06edcc07329581d2b5a4e1eb7b70',
        '30': '0xa96623a366dc434e4ec444dabdf61fb6f4bc57d3fc2e0a2177a666d431338b94',
        '2147483646': '0x510909e832760bc9bf5dfb3e6a018e64462a114a6a9f975c443f28f4b5671ab5',
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
        '1': '1DvugtfmxAhsbBmrB9xYn22sM9ofHywVMD',
        '30': '1CE4DHh9HrTPUNLJ793CRcXL1aoTWvNwub',
        '2147483646': '1AAjubbzWHcCM6VaxptSvqSmdsNT51cEMR',
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
        '1': '3Pckizug9QcuGsZnaLCrjFwAqcZjB8CKKn',
        '30': '3FAMDGmtfifX9egPrGWkatJ7Ez97uAX3g9',
        '2147483646': '3HYEEMPue66fRHQ97kk7tbCsDQzfwqctha',
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
        '1': 'bc1qeh0yndq5x6wzk0fjz3l266yncedsxzq2vgun6z',
        '30': 'bc1q72czfmjdmr3cc72tetmj5q39efrwgt5wgpwdye',
        '2147483646': 'bc1qmwlulxf08859st563j65z9d7zswlgvy3egl7d2',
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
        '1': 'bc1p5cxalrdv23z253jg8vepaqhz6mqyef8zrt6d9syjjwt30hjew04sdk0hd3',
        '30': 'bc1pcfawxfv64vey7msk23zmqse387h7hvgwcc6ag3rukm9vuwcmac5smt4kvz',
        '2147483646': 'bc1pfug9au2hg7ncs60phyvtgjdm2dt0flc5z5xapj0mujs6pwepj7esn8jne8',
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
        '1': 'D7KwrRB2cR4Xc72HhWGdPP1XdKFj9e2u7f',
        '30': 'DNBrcQ6Sr7rhfx18QjLJ5mYCxURzqEg6Xj',
        '2147483646': 'DFLsCkQcUbDyWTjxmahqnyxLo4z35Ts6jq',
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
        '1': 'bitcoincash:qr7sndrceck6fjac0p09uwlp9vlutuchhc89fwkrkk',
        '30': 'bitcoincash:qragjk0sm45xg0u4prxmhwdjqf4n78xeg532f5mxgg',
        '2147483646': 'bitcoincash:qq0trr6q7re5w8wzdcnyhuy4nfggra9fpss3ga78qv',
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
        '1': 'LNKKriB47VyBZWZJ9tCjbLRqeWCvUPhcnK',
        '30': 'LYNGHz3T7NMxTxTWMSVVw44iG7A3hQJwTF',
        '2147483646': 'LSRTD9DnKnZsJbrspejYenEJcC2QpNWZ2n',
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
        '1': 'MRmizuMtmKwocjLbKaQnLMsF1Yw5hr3xv7',
        '30': 'MUX4EvcBBgdz4K2RdaAzPg9PceTydTUNJh',
        '2147483646': 'MHzLXVQ4ataLnwPmv5SjeNXwjK2K3oL7ZX',
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
        '1': 'ltc1qk449psu6fhnttp3cxwdhm7a2q059mly0spymd2',
        '30': 'ltc1qp6vw9arwxv3cshfd4day3pssdhanegfvc0drpr',
        '2147483646': 'ltc1qjvkfppl2latv5g30l5k5f7hdyr8zc8jxluychg',
        '2147483647': 'ltc1ql9hqym9rwvtvve8w5vysad9yhnvjztdxau7pq7',
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
        '0': 'NiEcwV1mKc6m85GNkbNPQwuKUDeD8AX4BC',
        '1': 'NVq17Fw57FBk1cRswacYYWhfUrVQrnwGEK',
        '30': 'Nj5BTNtbsXeVSndp8W5McxARcSDgpxtnBo',
        '2147483646': 'NdL3KeeYWLRXjD2YKt4FLmCDY3Adzoo1S5',
        '2147483647': 'NPQ1pDhqCQMraBaVexkyjpHnbkCuYS3waY',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyq0vzpf3puv6pawc48gvk24p2ez0gsynn5qxq4lek',
        '1': 'ckb1qyqvx4tyzy5mrhnes4ncgaekmf45lv86mvps9zffx3',
        '30': 'ckb1qyqpmtfauq7ya8tcs98xldym3xz42xynw4tqy6h9f3',
        '2147483646': 'ckb1qyqfrn3zwvx4hxc7gmk909cq8dtwgx2d4r9syu2se5',
        '2147483647': 'ckb1qyqzyj8s9zwp0yrzmnenh2hdhtk556syt8uq8yt7z2',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aam6hz637w2xws8f9vfgjv3ycd2w8gt8pe3p01abcm',
        '1': 'cfx:aajgm04vsk7kmu9bzx8e8jbvcmu1akph0y4gy1myv4',
        '30': 'cfx:aatapf3dzaan0muhckhp4uh7c5kz3kemfjwgnsfsz8',
        '2147483646': 'cfx:aapnurrjpyg1nxtzz97w7y40zs8pu9zhrpkcbrc3ze',
        '2147483647': 'cfx:aar8ga92td23eccz4mykuu43aywe33ysu25s5p45ya',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1crcprdmm5jy0uka5wrufd4pgtqgegqwggftyd6',
        '1': 'cosmos165vrm0um7e4xj04wmhn0f2tk5vedr4pcn8sd4z',
        '30': 'cosmos1j6ydvmlq5u6szh03x54lfrc6966zg045n77u6n',
        '2147483646': 'cosmos1ml4s3ma947ngk3k87l90cyfaf8wqrle4a7jvq8',
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
        '1': 'akash165vrm0um7e4xj04wmhn0f2tk5vedr4pc7ua2vc',
        '30': 'akash1j6ydvmlq5u6szh03x54lfrc6966zg04579nmrf',
        '2147483646': 'akash1ml4s3ma947ngk3k87l90cyfaf8wqrle4s9ltea',
        '2147483647': 'akash1cz2szjsncpdfansn8qg98ec3mu3r34895n3mxs',
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
        '1': 'cro165vrm0um7e4xj04wmhn0f2tk5vedr4pctuc5fn',
        '30': 'cro1j6ydvmlq5u6szh03x54lfrc6966zg045t9k9xz',
        '2147483646': 'cro1ml4s3ma947ngk3k87l90cyfaf8wqrle49964uk',
        '2147483647': 'cro1cz2szjsncpdfansn8qg98ec3mu3r3489pn59rm',
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
        '1': 'fetch165vrm0um7e4xj04wmhn0f2tk5vedr4pcq6efh4',
        '30': 'fetch1j6ydvmlq5u6szh03x54lfrc6966zg045qrhccy',
        '2147483646': 'fetch1ml4s3ma947ngk3k87l90cyfaf8wqrle4wrmgzs',
        '2147483647': 'fetch1cz2szjsncpdfansn8qg98ec3mu3r3489244caa',
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
        '1': 'osmo165vrm0um7e4xj04wmhn0f2tk5vedr4pcmurars',
        '30': 'osmo1j6ydvmlq5u6szh03x54lfrc6966zg045m9dvvp',
        '2147483646': 'osmo1ml4s3ma947ngk3k87l90cyfaf8wqrle449puk4',
        '2147483647': 'osmo1cz2szjsncpdfansn8qg98ec3mu3r34893n0vfc',
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
        '1': 'juno165vrm0um7e4xj04wmhn0f2tk5vedr4pc94nkj7',
        '30': 'juno1j6ydvmlq5u6szh03x54lfrc6966zg0459va8a0',
        '2147483646': 'juno1ml4s3ma947ngk3k87l90cyfaf8wqrle4tv3h8m',
        '2147483647': 'juno1cz2szjsncpdfansn8qg98ec3mu3r348906l8ck',
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
        '1': 'terra165vrm0um7e4xj04wmhn0f2tk5vedr4pc4r2dhz',
        '30': 'terra1j6ydvmlq5u6szh03x54lfrc6966zg04546yucn',
        '2147483646': 'terra1ml4s3ma947ngk3k87l90cyfaf8wqrle4m6gvz8',
        '2147483647': 'terra1cz2szjsncpdfansn8qg98ec3mu3r3489lvxua2',
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
        '1': 'secret165vrm0um7e4xj04wmhn0f2tk5vedr4pc3zyyg7',
        '30': 'secret1j6ydvmlq5u6szh03x54lfrc6966zg0453m2480',
        '2147483646': 'secret1ml4s3ma947ngk3k87l90cyfaf8wqrle4lmx9am',
        '2147483647': 'secret1cz2szjsncpdfansn8qg98ec3mu3r3489mdg4zk',
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
        '1': 'celestia165vrm0um7e4xj04wmhn0f2tk5vedr4pczdpa00',
        '30': 'celestia1j6ydvmlq5u6szh03x54lfrc6966zg045z50vq7',
        '2147483646': 'celestia1ml4s3ma947ngk3k87l90cyfaf8wqrle4v5ru62',
        '2147483647': 'celestia1cz2szjsncpdfansn8qg98ec3mu3r3489gzdv98',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwoMQupFasdLjLtU53kWsT2dksagFQansbuDShQDtf5PB7pKD74JV1QED91Pwg9u6BfjsniLfXc2SMKA3kqiMXWK1cauKGjBU',
        '1': 'XwobeFmQA3K8xvWhFaNLQY3bTQSgnqtER5NZJ7gFiBKtPdAGM4UYF4D3fVLm9Mo5sn1Hx6tUDaALCSz535jVqkTc2Y2T6FMNo',
        '30': 'XwoGhTTL9PbMN2jYAmz1mNdHj4CAVj2F76fUaFVbDcsjg5EKSL8KnXZTR9Hhiwqj45JmSQrcMBjG2H7MHADAyNCM34XLTaw4n',
        '2147483646':
          'Xwoq7vV9B2BK7KrcAgCgXJFaRERBp92Eo4Tw6kSVFHPqZCittTdGzPN82EBLRPmUrF85FK5iRpmSVAFAxqznvcTe2uAKpgfnu',
        '2147483647':
          'Xwo8TuzDiGyTyZKw8Wkv4AJx41c2tKSPzLg5omEn6e1gVM7fjqhEfnJ3WfbwJHdPp2MoMNhf5wFmjZrHiLDS38SQ1tebn4nFW',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x6d64B86b387fBfE817C120F77D613ed0c2e7444D',
        '1': '0x6d039CC3501e3b6E9749F3d7F5682EFE91F657c2',
        '30': '0x995535e01Bd52A588FCC04174787A3B623644Fd9',
        '2147483646': '0x0a6255457D2Ff7fc821ce0D19C172fAba2845925',
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
        '1': '0x50598c510295aedE97f7DDdd72aA190a12283A28',
        '30': '0xe416b5f09fFE98A159460f0a0cD48186e7D48AC6',
        '2147483646': '0x0C13d3d157119C7cBfE1BC7242c7F68F635626be',
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
        '1': '0xeE92a8c5FaFD9e7558E6444C611aA2cED2880baD',
        '30': '0xb73f95F18EA218aC5f2B7Be5bDdB837609e9d7bb',
        '2147483646': '0xd526aeF3c5e2Dd00962a4e7a902eB46D803eBBd5',
        '2147483647': '0x8aBE16085d89e813fF793814A124B04C4AAECd5e',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1k3ki6kmjwn7j73oqswofmhddds5lpnfjhkq6xoi',
        '1': 'f1ggkjyr7pltgt455tezq6lkgw3vr3y4wzdt7joby',
        '30': 'f1hxlc62bnkwjhgsh5cpap3kn7wcilfh3fld7k4sa',
        '2147483646': 'f1hh356w7rtqjph4tsb7z2zxuyrat2k35e4f4abjq',
        '2147483647': 'f1ft764liy5ake6r56hfdzf3jl4xmkvay6spyz77q',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpzg4ch0ytz053n89e3pyun52qgje2mwpy3exevg48ryts2d6wscu3x9a227j',
        '1': 'kaspa:qremchal6sc03e2tlfkc07xxventym06j7x7xgmftfgyyykkyyjrs8htytwlm',
        '30': 'kaspa:qpa7j3qttvfdyxl60wlzqy2n9rwxrtrqeqnh37kdt53wnfkm6laqs6y7mn29y',
        '2147483646': 'kaspa:qqf2gdmg43ph9v2pkfwpg9ehw4pzjws8quznyfedyay0nrj0kwnk2tj05ycrs',
        '2147483647': 'kaspa:qzph5gpn9vdfkseftxk6zaday8l832qv0n04ewwuqp5ueggxz3m8zmw74d3qf',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '15d40738920caf7666f624983d35b760be1196f8689d037e706d8512b00cef13',
        '1': 'b0f0efcd0020765a8e77ce9703e137c4e4d29f04ee0e0d05c3dc746f44bcc6dc',
        '30': '5185658637a1f83c6b359fee5f583476562129bac65fe6d94a090e38a77b9429',
        '2147483646': '8f8371de9b2ba6f6d8b9b820c3160538cc4aff7be15d57ffdca91e1f33cece4f',
        '2147483647': '434f0a6739b1c3ae7abbc30ad06f05b2963d589ac3a6aa7da28e55b83c7b1809',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NCL2AADSEEAXDO46RMVQ2V6CQ4EPAUAHHVPSFWQ5',
        '1': 'NB34XEEP25XNVYESQATTS6EHVAQQM5WJEOC3EZDE',
        '30': 'NBTXNLRQ4744RZDGR6GUEPPWVIIT4GR4ZXNP4Q4E',
        '2147483646': 'NASGRR2XWBXZARDRLYOH5VSBXL7SHBF2TB32QQMP',
        '2147483647': 'NCQJOBAWJZYYNG4E3XMXYUFADLRSTZYS3ZX56HEK',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g547w6dfzh9rqpgcfthmurxd9kn4543x6aw84j4sga',
        '1': 'nexa:nqtsq5g5kx6jvz2y0jr8x7qnlt60qvtv4th39vp0ull88j2g',
        '30': 'nexa:nqtsq5g58ae6h8ueh2sgakkd9rp3czytvjw390887ax2hkkn',
        '2147483646': 'nexa:nqtsq5g53hape0pnszkj2wqmg0w5377fhfgh35td4h4c9qny',
        '2147483647': 'nexa:nqtsq5g5p9dt57r2kllnpw2q426u8wt2n85nnfuu4epp74ez',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12E5Nw4J8oitXCHkBoT5qu8doCK7b9tdTgBtFiQkPcNZXjEy',
        '1': '12E1YyHTrp6VS55QVmKdPYisbU3UuduZbkpJ4dfTx1MkwsmD',
        '30': '12U6fUQXvZPPqigGdWVYfeQsvut6oGdXQX5NP4jsbcj53NGM',
        '2147483646': '19B5BeFzihZzwdVFjUNJv5JDTrk9gKhfKLiSgMytTpRjUhU',
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
        '1': 'XAJqvzUnGU8DN6j2RikH43zptkxBZ4AYTax93syGHLCMgG9',
        '30': 'XQPxS7Yr1m2d1hbAAtfZ9k1ALba5Bn8MDr2TUxNuthWTHF9',
        '2147483646': 'W5UN9MGvB5CnEeonPsVCRQRStaDRbUJc27NX6aVCjns91uw',
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
        '1': 'DoL4xNGdPqwkBtLJq5g9MFitSL521AbydvZHzx4siYjWZkF',
        '30': 'E3RBTVLh98r9qVCSaFbRSwjDtAgudtZnQBdcS2UXKv3cHyo',
        '2147483646': 'CiVbAj4mJT2K4SR4oER4ic9WS9LG3ak3CSyg3eapB1QHuhG',
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
        '1': 'j4SYcygGMskL3q9Wdp6iK6YbiGE8QiDvbFCiFGtiRpzUsR2TB',
        '30': 'j4Sni6BPRwVcxEo7VwqtENeHibfy2breZ3xyKbKnqUbrBWgik',
        '2147483646': 'j4RTnVtdA1ew8Q24ia4s41ux8tDwfxGLjJmEfewQwmSwYCEJt',
        '2147483647': 'j4SPTW3Ds7FwA6dBddtNooFKCHZR183YuLnYJxT7sc9DsSPjh',
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
        '0': 'dfXn6CS6puMD78C4D8W3HNvzsgHwuH1HPZSn66WdWF4nXRsVA',
        '1': 'dfXn2NUKzdMai34qsSTupvab7UZgGbVJKhXQVuRtDoTmiqjDq',
        '30': 'dfY27UyT4h6scSiSjaD5kCgH7p1WtV82HWHfaDrxdT592wUvz',
        '2147483646': 'dfWhBtggnmGBnbwPxCS4ZqwwY6ZVXqXiTm5vvHUajjvEPd3U8',
        '2147483647': 'dfXcrtqHVrsBpJYWsGFaKdHJbVtxs1Jvdo7EZazHfacWisE2G',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rLWgabVpnrdXVb8sVc5E7Td85rSQs3vcNv',
        '1': 'rKPRbpx5sNbT5wGQpXvveXdPzRgjg6JP7d',
        '30': 'rKPFardTZQnz2Bk1soDcQG2HudXBvhGiCQ',
        '2147483646': 'rwsEkzeTZgxUAonsquHPymHxCv4MGevQdQ',
        '2147483647': 'rP7fgRmngJ7cqs8HUpyJFR4WrTTWgY1Khe',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '8rf3KDom9vnYiXZz7maZKkXUB5j5nj3tC7araPpTtamK',
        '1': '6GCZ5kzANRFppa8iWDx1tTNoyU1D5Y4xEMyCb4sR7xUo',
        '30': 'FJxvEoyk6eXK2nGpBY7WMCmZSNAgYBMwgJwEc29NsT9H',
        '2147483646': '8WEANunE7wEdZsXcFE8KRisYHKju9V35cFXSx78pAr6P',
        '2147483647': '9aRiDoLKKCG5WMS38R2x5aQRZkDry2cZ4KR1iQ5Q5bYB',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x59ab9db9ac50ac983b88fef8166df41d',
        '1': '0x16f17711231e6cafd3538ac3e5a65591',
        '30': '0x761dbc9b0eb64f495cd027981e95e85a',
        '2147483646': '0x6558b18fe56072efaa1fba6fa4fd704b',
        '2147483647': '0x2cc621307d4dc172b64d1508a12f1333',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GA2NZAHHCPV5AXEEQUURQ7CNGCTLIQYFKBVMWI3OU3ECXASUDWB737KF',
        '1': 'GCSTHVBQXV4SLB7ZEKCNP2T6O3C2VJF6F2EW2LY2F2HIKYB3UNIWUQHY',
        '30': 'GCLYQWFCQPGVLE44MNMJZW5O4BYXKVGOUNPDFCACPZGQIKZIKXJB44PR',
        '2147483646': 'GAX4WGZ2NKSZCAFH65B3HZD7K23NUGVIMOVET62KMQD22LR6VMPUOLX5',
        '2147483647': 'GDGJBPSOKRNAUZBBB6LZVM5QMO4MOBXZD52OZID4PNMGT53OGI5PUE5S',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x67ab654ad5c71d55152771c3f8ff3d3a9bf6500dbc11889ad35ed247fbc8c03b',
        '1': '0x5ebbf507d8dd7f635e8c6b0cc7e169190a0943572014e95f634758658d884d8d',
        '30': '0xfa7e14401e3c4a64cc3d2a54ebe423baa504a61f5e622889efe0ac4bb99fdbb4',
        '2147483646': '0xaa4443a5cd67f5d66ae93eb7c07f8fab8feb1c68afb952efa4679a51e6d09917',
        '2147483647': '0x8ea12953bb1e710f5a92918660c5012af10b1eb79b1e99b5eddf48dbab017b64',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TPFaTZwCwSxtXf8CCezdo3Wt9LKt1zbzSx',
        '1': 'TJuVtDL4Qgi3xr7niQXrSGXG27LQhXQySk',
        '30': 'TEUj6Tc4VWUGEhVh6mfS1qs4EXUPBz3nTK',
        '2147483646': 'TVaJXE9Yjb9q418mCrrx8KDYELGKt95PLw',
        '2147483647': 'TBuVXCRn5o2aKHr5TdMvF9FW2vPtuh5Zt1',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC69cb6a70063f981a57103c76a423b8f4fecc37bf56c813b16a88acb4bb2257b8a0e0',
        '1': 'BFCf17e507399aff90e272df0f2a7cf7be774bc4e1c35f4459696061ea4e1f13c8dd0b8',
        '30': 'BFC2b7b8a95b25dd93002aa951b3b3446d257c7edba2ba868025ec3630eaba4146b3f01',
        '2147483646': 'BFC61825bd07fdf7818e07b8fba1e42323a0582e16d7b4b1b9d15bcdb0ecd8638c8a6b9',
        '2147483647': 'BFCed94a37303493de54a50f3923b7e7bdc393fdeb010f9321b4fd84ca0222a5c72cdcf',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NVxQ31Hmkf3BFRmg96PXGALtTnC8wDC5ri',
        '1': 'NcvR7vLoEYzbsteF9uNf8PqbrAnKtyx2HM',
        '30': 'NYnHajnNm6jrw1LC8U9nkCQ6x2Yxq4n8ug',
        '2147483646': 'NXrVXGyNt8VKGFj8Nc2QQFcrAXR2PuD5dg',
        '2147483647': 'NSkeoPZPdxf8kfVT7qngYkXzwrSXGRwXWn',
      },
    },
  ],
} as AddressTestCaseData;
