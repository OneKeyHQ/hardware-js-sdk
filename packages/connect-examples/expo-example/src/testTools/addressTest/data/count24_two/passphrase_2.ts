import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase24-密语2',
  passphrase: '^~$5@237~##94$$@',
  passphraseState: 'mnGZUpnZziAxyG449oZh3yzytw1igfS4N5',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490457',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q9vfy03nhh2385hzzz34y6sqtdp9vg2n2k4cnwt8uzy9lj60u93j6atmqa68ja7fvrfwpcvqt33amflyspfvn0hhgn7qrnfetg',
        '1': 'addr1q9mzdudfw8562h864pm3frnkaztd8vcj4d4h3p056pescux7f3rzssr0gc5tupmjg0arc7504ltcpqxtdex2jmrca04smswc3l',
        '30': 'addr1qydyr6ka4cts76uzr62mkz8kds90wzj20524u3mzfy2hw0wg2yj2r6ej9hhphrwaqq3x2c9lhhlp2jqxfr5x377n7heqs07ayj',
        '2147483646':
          'addr1q9rwlckx9ms8nyvlv4lufgx6h6zl2d220vvzy4ntjwh8z2j2nq96xej72h5vld4jk4xvzvsh0qjw0x2ruzhrk57xravqv3yp56',
        '2147483647':
          'addr1q8fgkxr2mg0ejxrqtvs8wkjdnlzwffstm72fpd0t653z4q8e0wscmypgg3r7e6k7l872y4rxcxhg6gcdqtmchmrnpeysmuwnwq',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'B6G7VTGZLU2J5B5D3JGEABRUPQGBRN6ROAXGNMVHAUEICDHZIQD77IGBZM',
        '1': 'OKGCGMJLBEBCN5KC6ADZYDOY545NOKW6QLN437JGMQ7QEHLASQJTACFY3Y',
        '30': '36MUVTB5YTJDGVU3H3UO4JKQLPBY7KEQ57PKKY7HQAE5QOICXBRLKVIFKI',
        '2147483646': 'C5OZEVERGB6B6ISXEH3GBCXTST5U3H7UCLI4SSVMVRRRBMFUNEJC2V4SQ4',
        '2147483647': 'XDAXT66PDVBHXIBPZBJLZKRDUZKST6SY35SPOAQF3IIGO5IQ5ULEPPPFS4',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xf0015ce59ac1223d4a7d882239a9dc1283f49f6a67881f05e6127300dbb0195b',
        '1': '0xdbcaeee9a0349b9da017e08189003f2fbfa117bfff818ea7ee738f5777b43ff4',
        '30': '0x06043771595fb2ff7c794cd413934fa78e521ffa48510e63cd8a2efc25767105',
        '2147483646': '0xf65831a458b67fbb8d1452dc34c4e72d8f6ee4fc27bcd9baaadffc04a37bf567',
        '2147483647': '0x491144fcb18261c3d6fa3673cf799dd20597db154eac8ddb8d578f642d902c0b',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '13T1MuhCp82D9wVgPYkmCax3GhPCJACPv6',
        '1': '1Kt6MSabbNY59nLropnLQp6nnfh3xXqp2J',
        '30': '17zUMJMBc6eiUQu2FWqjdfTjPEY8RwXzdV',
        '2147483646': '15hQmFEGhwfgTaR9u9mKnmBgUCXYuM3V2m',
        '2147483647': '19cGKjuyFxuoRYP28yJZXx3GM56rvTKTwb',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3CYLeFYQjj7duL1AyWoYf3LHmjH6QKsQKA',
        '1': '3JASF6WzBGAP3Z8ZEH92iuGZUnxuFcPgfB',
        '30': '3G2bGR49H9LQMvogwPQsoo1iWwu2cSdVcm',
        '2147483646': '3AHQLrHXGGPAViFY5SyXXRqjLdNToMvT2z',
        '2147483647': '32Ro81DSacfXruLKM1YS6YLkdUfYEhZtKa',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qmqvykvf6m3n700s6haufg0ehe4puxc4hv62f6s',
        '1': 'bc1qh47fk6luhprvd95cluayacferyxrhx2m7cx8gd',
        '30': 'bc1qed0nwm0yxc060t5h6nwy6k2az9j9ym9saqz2tv',
        '2147483646': 'bc1qcls00ydvxyfauprp4mj53udlql6utxmy98s0kw',
        '2147483647': 'bc1q5ngxzq48pwl8nnf0j8cuew0r5l2h6c47k2sluc',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pr9pgtmuggdlkuw6p9vvfkurw5dxh6qygmjfxyj87rj9sz5pkvljscvpvn3',
        '1': 'bc1p7ethql3gsd53cxaw6q8hw5yex4rdyled2y0zcl8v6kwlgjvzce6qxva6gq',
        '30': 'bc1p5cfgwd2sjghd2q6m90th8d8k9demuk4r5qjxrkf5x7ca3yuw8n5qfpp745',
        '2147483646': 'bc1pjm6x0jnhwkqvr8j23s4fkfxj2gjswjuj3srgdhk6vl4w347yk3qsy640k4',
        '2147483647': 'bc1p5u998e523y9hx92rqfhclf6altwaqpejzztwmgqx0uum32x8pxescdjafs',
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
        '0': 'DKVaBRZ2aq3Y7h95XQVnxbAYX35HhFSw3k',
        '1': 'DLPPN1osMnLztMAYLntUDPcRgvG635F1aD',
        '30': 'D9KtHjKWG767wZi3tow8bCpQWTwaJWoLUk',
        '2147483646': 'DMyUGstpUz1jXvg6A4PrVbM34VmhBrdKt7',
        '2147483647': 'DCTvMoHYRP7594eaUY9aqncbvSBPRBswca',
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
        '0': 'bitcoincash:qzkf89lyu0h976kwmxk8nsvqvepf56vmjykg7cd9f2',
        '1': 'bitcoincash:qpplqg0edjm0yh4gvans2pp2la5ryklh6ylpfvfeqv',
        '30': 'bitcoincash:qq9q0rlngfzhy4m9h2wd6td57d0kunhzfya9ne0xx5',
        '2147483646': 'bitcoincash:qp36llwe6n8luatxnmyjmwn2xs6dd7fxruveccfv9a',
        '2147483647': 'bitcoincash:qqey8f4g9u7wkv9jr792gxymawncj05uwgn0s69l7q',
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
        '0': 'LRaKjGEpDG9UJy2jiG85raEeBfL7bNZn7c',
        '1': 'LNS2F2FNuhd4GyfrmyXmXPgVEA8xNjhRqF',
        '30': 'LWWFqBvsWTC7YfVFUGWcDTGGVzQRLViLZ6',
        '2147483646': 'LU13B8dLQFhVpmk8N8NSdRBQyaHHxrsPTf',
        '2147483647': 'Lhhrm7RbjSFHnFo2Ncwvr8vct8WTsXA5xN',
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
        '0': 'MVhrxzqsSviWtHeAEm8Y9hoBZtsoergBnY',
        '1': 'MKd1MBCS812Puo5xzP3oKecg2mwZLbMpx8',
        '30': 'MG8VEobckm7W4QhUS5mgMrEv1q93w2e91i',
        '2147483646': 'MEvoCxrQjQoUS3opieehqgNbDrL2ZKKrev',
        '2147483647': 'MWBqaVV53PYLtjqLnWJqzPrUB5KDWLwn1m',
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
        '0': 'ltc1qs6xgvyw5q8a9r23vtn3xsqfmz63v5wlnw6lu4y',
        '1': 'ltc1qnjyfk3j57eeaq2qakq2gp7egpg9jn6js8cnm7l',
        '30': 'ltc1q2mvqf4nee2sdmr0jgsjuwmjnka97xd4xf32n2c',
        '2147483646': 'ltc1q3n6zv4uj48a0zpxerf0ue23ct2kp76r842kky9',
        '2147483647': 'ltc1q3xy3n8f3474ga90cg3jmhgc07j5z5hv56zfr70',
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
        '0': 'NZeLMapwF6tFPFFt26fpiYRru328B6ZJcN',
        '1': 'NUSbnfB2Awgjv31YWYNeeJ6svUxQV98PEG',
        '30': 'NL5BmKcBzvLUUargD3Rm55j4jXjHRPJ2vS',
        '2147483646': 'Nff9Z6K8ZGB2PuFq99wXjfU15ejNNysXo9',
        '2147483647': 'NhwcoZAmfpxx5cSSD7nXDd9MHu8JjXawfD',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqwswtkuzauvguqme2gr22nxl3klkwpt2tqjel23s',
        '1': 'ckb1qyq039kdmyx6zymnwx82eja069qh0pwva6xqz7mm56',
        '30': 'ckb1qyqpjxrs6hsqclcvzlzdvx36nvz6t3qfgvhqz334lm',
        '2147483646': 'ckb1qyqgy3454d5v704see3d2jdn4s5kthtn5ttsrjm2qg',
        '2147483647': 'ckb1qyqqgxvj3qvsc7szv5xm87nwp0k9d3ddq7pssfnxhe',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aanasvvt2pacsnrj6z9wubm2v11cke55xyrk1nt472',
        '1': 'cfx:aakyx7yzb9cw5p2ykryjvs5ua00f3hymwpbjn13xn9',
        '30': 'cfx:aar3b7x8t2hn3rktaurkrj62a2ze5wcvzu5agr5b59',
        '2147483646': 'cfx:aasypvhc4yxhs00apar4g6znhkznmy05dpghgvfv86',
        '2147483647': 'cfx:aanj5mzcdsk4bbezuxzp4brehsxsu19grjxvhkchcc',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1vmsdp4wkrl0epn547ksctcy8r7ut9fnfwkpyg0',
        '1': 'cosmos1k907u748zykglkut2a7v9vjykphdq4p2v560cs',
        '30': 'cosmos168aep0xdnp3h30zm9f4mmp7ynuy3udgr2yqprn',
        '2147483646': 'cosmos1delp8c9xnq9qz7yn4ex5rfjk6jxjjdg2ndvez3',
        '2147483647': 'cosmos15ewj4xqecmm2p5tsm5tj7p25035qpl8xm2fqm9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1vmsdp4wkrl0epn547ksctcy8r7ut9fnfrdvr34',
        '1': 'akash1k907u748zykglkut2a7v9vjykphdq4p2p0hgp2',
        '30': 'akash168aep0xdnp3h30zm9f4mmp7ynuy3udgr8ldx6f',
        '2147483646': 'akash1delp8c9xnq9qz7yn4ex5rfjk6jxjjdg27kp7mt',
        '2147483647': 'akash15ewj4xqecmm2p5tsm5tj7p25035qpl8xk3y8zl',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1vmsdp4wkrl0epn547ksctcy8r7ut9fnfkdfa57',
        '1': 'cro1k907u748zykglkut2a7v9vjykphdq4p250jkyp',
        '30': 'cro168aep0xdnp3h30zm9f4mmp7ynuy3udgrjlgclz',
        '2147483646': 'cro1delp8c9xnq9qz7yn4ex5rfjk6jxjjdg2tkyq7q',
        '2147483647': 'cro15ewj4xqecmm2p5tsm5tj7p25035qpl8xr3pe85',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1vmsdp4wkrl0epn547ksctcy8r7ut9fnfatgq2c',
        '1': 'fetch1k907u748zykglkut2a7v9vjykphdq4p2lfnt68',
        '30': 'fetch168aep0xdnp3h30zm9f4mmp7ynuy3udgreef9py',
        '2147483646': 'fetch1delp8c9xnq9qz7yn4ex5rfjk6jxjjdg2qs9aqx',
        '2147483647': 'fetch15ewj4xqecmm2p5tsm5tj7p25035qpl8xghqyej',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1vmsdp4wkrl0epn547ksctcy8r7ut9fnfxdj57a',
        '1': 'osmo1k907u748zykglkut2a7v9vjykphdq4p2y0flwz',
        '30': 'osmo168aep0xdnp3h30zm9f4mmp7ynuy3udgrzln34p',
        '2147483646': 'osmo1delp8c9xnq9qz7yn4ex5rfjk6jxjjdg2mklf5r',
        '2147483647': 'osmo15ewj4xqecmm2p5tsm5tj7p25035qpl8xn36sdh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1vmsdp4wkrl0epn547ksctcy8r7ut9fnfcyzl0n',
        '1': 'juno1k907u748zykglkut2a7v9vjykphdq4p26xe5lv',
        '30': 'juno168aep0xdnp3h30zm9f4mmp7ynuy3udgrukr6y0',
        '2147483646': 'juno1delp8c9xnq9qz7yn4ex5rfjk6jxjjdg29l0z9d',
        '2147483647': 'juno15ewj4xqecmm2p5tsm5tj7p25035qpl8xdc2mue',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1vmsdp4wkrl0epn547ksctcy8r7ut9fnfgjmy20',
        '1': 'terra1k907u748zykglkut2a7v9vjykphdq4p22sq06s',
        '30': 'terra168aep0xdnp3h30zm9f4mmp7ynuy3udgrvq6ppn',
        '2147483646': 'terra1delp8c9xnq9qz7yn4ex5rfjk6jxjjdg24fkeq3',
        '2147483647': 'terra15ewj4xqecmm2p5tsm5tj7p25035qpl8xawnqe9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1vmsdp4wkrl0epn547ksctcy8r7ut9fnfvn4d4n',
        '1': 'secret1k907u748zykglkut2a7v9vjykphdq4p2w3wx9v',
        '30': 'secret168aep0xdnp3h30zm9f4mmp7ynuy3udgrgp5g70',
        '2147483646': 'secret1delp8c9xnq9qz7yn4ex5rfjk6jxjjdg23gcsld',
        '2147483647': 'secret15ewj4xqecmm2p5tsm5tj7p25035qpl8xe0afxe',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1vmsdp4wkrl0epn547ksctcy8r7ut9fnflus5jz',
        '1': 'celestia1k907u748zykglkut2a7v9vjykphdq4p2a7tlza',
        '30': 'celestia168aep0xdnp3h30zm9f4mmp7ynuy3udgrmw33e7',
        '2147483646': 'celestia1delp8c9xnq9qz7yn4ex5rfjk6jxjjdg2z8afcu',
        '2147483647': 'celestia15ewj4xqecmm2p5tsm5tj7p25035qpl8x2qcspg',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwmjH4KDMrPKSo5BHQe8Vqh7eMK7VTppLhj7ZQeRt8AtayvwpNBNcqrj88qdtcTLq4Nby2Jxg6cjGaxECskhTLuZ35GAjAoqu',
        '1': 'Xwnayam1uEvfdz7hucuyHtZKcX6h7hEXuTufyhXgLZiRQFVjJKBqiC9A1i2bmha6qCbBrq3Zph7gsAMobMAQKkeU16jbqfVEK',
        '30': 'XwoTGYKwoNq9GKyLSKzjS7WpifPa6CUv2XZKQLMi9FbN9yX9CtpD6vUdAxZUDZaWHhDY8ZfdCc28ALXhVT8axAyL1Ddt8KTJ6',
        '2147483646':
          'XwoTg43matuVSomLvH4SP1ALwayQYjDppEGc5y1xzLhmevA7VaFgCrJ9F8LFBFDaumUhmNYjQBjVdTezUtkZ94j232qY3tVEg',
        '2147483647':
          'Xwmx8JpJFAVDfc6U4BDbCtLkwJRfb6Hr8cHhf2Wne69uVrhGUx5bm5fjHxNg6ABjVcU9ehxL3DGQHZcUJwjBYJy42fMEi95H9',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x474E5b269063c547a32882f28d94e1E653496E78',
        '1': '0xb9877B353Ed98351d7769243b848cfbb055154fB',
        '30': '0xa27eaB49b99E3f1ba8BA5F4E2bF56C9675aF011d',
        '2147483646': '0x2854ABb1f4743A5f589eF868AB4a3E11eD04FFC3',
        '2147483647': '0x8f315415cfe2f445195b93f661a8eFD33d92a817',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0xEED51327dAe90fF3635643a5B03C48D373885Fb5',
        '1': '0xe084F8226dc904c507F01dd841424b6d9d6b222e',
        '30': '0x1c053aB3D7C944cEFce5E1b03A53Dff8523230D6',
        '2147483646': '0x3e8E06463e1e06460fF766477277442DE8fd4c55',
        '2147483647': '0xf363C66aF29B5209955317e69592b858A0814948',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0xEED51327dAe90fF3635643a5B03C48D373885Fb5',
        '1': '0x599Ae19881f0924316C8a93855BB00674E9202a3',
        '30': '0x84d4cd696F01e896c4DfEB0dBF2bf19f986d53e8',
        '2147483646': '0x10056A85955eB86ae3958af4C108F54b17AF3046',
        '2147483647': '0x9e9022971045eee288774fBf623111441429D005',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f15eisrfxjs7bvgf2gsyxjilfpbaydkh5rlia5jxa',
        '1': 'f1bthwvbookpqnltzxuv4blv7omydsxcv747xn4sa',
        '30': 'f1n265z5esgtyix5bsvkhycwadeafq2c2jx2mrjnq',
        '2147483646': 'f1ddlsempnro3aolhghyo5byibpbs7boxhbim5rjy',
        '2147483647': 'f14jv3hp443usbnit4cn7al2thxnxsffl7dilhvwy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qzd9ec8nhhqhjupj94ztwgwd6ajzxgqw0za0z4qtjp89r325e9vdw4fmz8x8p',
        '1': 'kaspa:qpcj7lfnq09422efxgfyuuajlg8gvz5dceeulqatlkpptr0gwpnxuemyfny3f',
        '30': 'kaspa:qpu6xvsjytu47r2g9z8hsds3lmu0255l294g9dgw3x6x6yuvtwvs5a4d6vfmg',
        '2147483646': 'kaspa:qr8njrmt98slp2036pemyms92cwtq7wlnydv9q50026znetn74yvvm2083llg',
        '2147483647': 'kaspa:qzc38qu0p8tml56l0pls38zyrdsjll46tyvq4aadrgm60t9a6cmec33cas9q7',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '7fb8b2955a62c90a5e3082f518a9b29b1815cd481bbb9900b200521ca0c8c0a2',
        '1': 'd83b24269d77a125e98486e299a3c2b8d481ab5c582442b366f49d09385d4bc7',
        '30': '21ef1060c0b098a4be6072695f9cc8fb2897e655d523b6e50b14986eaa6b8836',
        '2147483646': 'b3b98bc24adf02a09b31b8a5667c938ca05c715233904c4c847146cf54254b68',
        '2147483647': 'e842c28a7625d2c9356ca378713e9c7f1e21352776d329e57687324ce7b52f6a',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'ND3S3BSY4JJ2LVPMIFHVEF6JWUR2KPKIBXI7PZV7',
        '1': 'ND5JNMD7DD3BNX5WJQNJT5NICVNUTUEGI4K2L7ZU',
        '30': 'NB27SK5OQSGWZUNMSFXC5OLCWJMEY5XEFFT4QYN3',
        '2147483646': 'NBSW3XTXEIQLGNURKIGNTOP7YJCKCVY236442KJX',
        '2147483647': 'NBZIJIV6QZR2KDYVG3H7UVC7KEZZPEL57T424YY7',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5n0l2s6982wu8afjlx0k8sj2cergwhuyzq66f5hra',
        '1': 'nexa:nqtsq5g5t9tkk9sfuq7cttzqazcj38gyrne226m67k3ttpxs',
        '30': 'nexa:nqtsq5g5t558a0sr4vytn5twpwttl3c6mp8cgusmqcljx33x',
        '2147483646': 'nexa:nqtsq5g5tavg6u9vss2252wva6ymuswjten0l0h9hex0dshk',
        '2147483647': 'nexa:nqtsq5g5f0c3sjr5qe9wf3e2ev2r52xgk24kl5wr09rd460a',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12fgQAyD9UQHhVZfqqvRNDX6oF6kXGXAWDcrxqSuobLL1SsJ',
        '1': '129HGW6euftKWkbnqcVnbyzhPxKKtbqwbhHNsxi8vNem5Pvy',
        '30': '1gQxbopG6suRkc9uKoj9Say2hnpawkkVjuWJixAC41VEV23',
        '2147483646': '13kaABTDBDot8qYg5wZ4E8kMfUErhX5qgAi23L1KKHtWHXPx',
        '2147483647': '16fEfVE1ccammi4y3WWN3WjcEd7bzjQsoF4YENimHZHgEfTv',
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
        '0': 'Xbyh8gE4vmvUnazNWKYFirE2fpDoBfmSvPX3FfR7sJmRFWd',
        '1': 'X5aZTofq8FxJ3d7NGtuVVKpdP2oAWzYYQ42xNveEedCV939',
        '30': 'WciFZWqBZFYD3dURzCr2wv6G8WHrruMSSgAP9AfWKyve4TT',
        '2147483646': 'YgsT9AE6gBWv8ZzcbxB7e5UttxKySEScsUg7kDpdZrwhDK3',
        '2147483647': 'bbXxSw2Y4xQZ16HaAuUw24jU3q5GeZUjwqCJnwGbqG7e5Qw',
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
        '0': 'EEzvA41v49k1cNbeugU823x6DPLddnCt6j8CCjWjJXJaHLH',
        '1': 'DibnVBTgFdmpsQiegFqMnXYgvbuzy6yyaPe7Kzjr5qjeF6P',
        '30': 'DFjUatd2gdMjsR5iPZmuF7pKg5QhK1nsd1mY6Em7mCToDjF',
        '2147483646': 'FKtgAY1woZLSxMbu1K6ywHCxSXSotLt43pHGhHvF15UrFuP',
        '2147483647': 'JEZBUJpPCLE5pstraGQoKGTXbQC76fvB8AoTk1NDGUeo6Wv',
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
        '0': 'j4SzHpsx7AQdr6ZzuABK75DPwU1BgKrYC9fWpB6VsgaTSUXe7',
        '1': 'j4STthD5Yvc7suq329wtUJysY4iQFhBryF9BL6Dm6oMmsYXCC',
        '30': 'j4S12PJniH37Tpq3PDfCQrSTohTskPXmn9BoTWz18538bhTns',
        '2147483646': 'j4U5BatS7CA3SXuyuQGwjw8dCLEKnW76sKcbyFb4HCH1ckg5m',
        '2147483647': 'j4Wyr6CCudYpLAnWCMqu3kWcSuPCXoKRuSgxVSdmjAYQnhd2n',
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
        '0': 'dfYDhDg1jv1tWJVL8nYWcuFPLgLjYD7uvbzD4odfff3kHuVXT',
        '1': 'dfXhJ619BgDNY7kNFnK5z91rwH3x7aTEhhTsaikvtmq4iyHzX',
        '30': 'dfXERn6rM2eN82kNcr2PvgUTCuoRcGo9WbWVi9XAv3WRT8BXX',
        '2147483646': 'dfZJaygVjwmJ6jqK92e9FmAcbYZsePNUbmwJDt8E5AkJUBSvn',
        '2147483647': 'dfcDFUzGYPA4zNhqRzD6ZaYbr7ikPgaodu1ek5AwX91he8Th5',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'r41J7MizYaf1QNxGFFn8DTUvHYCxQGub5S',
        '1': 'rHEopdi8XrFrgWfD8XrjkuFg56a1mQsF9',
        '30': 'rwS1WT75SU8Ab8vD2zEVBPC5795X4inwRR',
        '2147483646': 'rPMm6zzrrjtwPZk4AKjg6pvpXZvNep33DH',
        '2147483647': 'r9nws3LQqm69LdSamt1Ns2BTTwnmJC3ASA',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '8grQeUzJiu1dpneN4BwkpTr93bLeAKJcYjvRb3cWukdh',
        '1': 'Dz4dAZY5jgC4JZejwpGmRBQR9NP4PGM9r3778kdZ2EQg',
        '30': 'Gmxkort5KhTypX5a2nJuwy6NtWRKd1jdozzwizQLriMD',
        '2147483646': '796Mc5c13Zv78iN8t2KNjnYzSJvSt9W83oCc7BzWekKf',
        '2147483647': '3SpEKm4msuWWRjdgReEUvefoR5BHeM9mbDGGCBJkEcxV',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xbd62555f7fb3c61c040c8caec88dfb06',
        '1': '0xb01196431774d8bb5280c504cec5e899',
        '30': '0xccec0be1621614c7dbc9229a3da4d5ec',
        '2147483646': '0xa451350c0a89b5711dce692063db002d',
        '2147483647': '0x3ff39cca5d313e7e207ec69b48f09bc1',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDHM4WXLBDSJ7MM3HDUDNUXWGGHSEWI5OGYAZXZIEE3ZUGILXL4D62HG',
        '1': 'GATL2EKWXCUXA6OK5O6S2GXN5L2IIZKMBS5MZ25W74WTQRJWVQBD2MKZ',
        '30': 'GCL4IJVBZWT4V7YAW7GB6QSCZ2IEVYRJPSYKBIXSLK6OGEXSQTVZDNLQ',
        '2147483646': 'GA57DMYKLLHTLK5Z22WNATA677HMS4NKYI66FO6FQAQG7B2DQQ3R73X4',
        '2147483647': 'GDW63ZSIRM5WMORWVVOO5PYYGIPAIOEMQF5RJXTNGP7LBTEMGVWDYPKR',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x30f9a9a9903eee0f665189646a14e7fbfabcccf12989817e08d14301d317b985',
        '1': '0x96c22cc4b6aa8ea1758ffaf47095776e4883fa819a89f699843331c0d699b121',
        '30': '0x60816e544c40edd0d659cabda918176d0371f917f030d11d24e47341e97f78f8',
        '2147483646': '0xe4fdecc56dede775bc53739b50f5b1596fed2542471cc01c5bca21840e8254b6',
        '2147483647': '0x3d8c858103344894a736e0f981d8f2ea129e899842887cfd0ca3ccc3eae76fd8',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TKmRddgcJTeop8jh5mEi5TtfRf48Zauq76',
        '1': 'TQr1sqV4mdsBqWjhb5t3z2hb4tjo8DRAyS',
        '30': 'TPd2vAhtggV58LRhu959CPwVGFKYRUvBYG',
        '2147483646': 'TNYZxbZgtAZJupJKZTqRchN1FSuVto1cgg',
        '2147483647': 'TSq7txCpfWUD5jUcrq2y94MrbvGZBedeRE',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCf534f5b046394ef3f3729143b3ed4d2fe707a453b25f24fc57b11232778c5ce838fe',
        '1': 'BFCccc3b2219f21a38d3b89a2e4c60fdfdbfb01ae9d6dff5d48613d0071748eb5df8d37',
        '30': 'BFCf0d2047827f39c8ed3b455a241a23fa37b342e1511a81d2359f54c60bac12717155d',
        '2147483646': 'BFCbc239c2e55318a9a29ce14fc37060a3fcd31bb382dbd329179762e13b141ea5ddf76',
        '2147483647': 'BFC369ebea105e90abe002403854095bccda6032d95a62a4f0cbee647fb96b072b90344',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NZ9iyDU2Y2mCTc1qVKzJ7oyzNQ5bx6VD2M',
        '1': 'NLwbJDsNUqWRqXgCHt85eNyNUAtZr5rXdg',
        '30': 'NLajkdopkz1Kri2VFGbUjCYavKnZ75R1ry',
        '2147483646': 'Nb4psWz8YfPFXa4B96aJmEFpLqyxW2CaNe',
        '2147483647': 'NhBvDq2MwzLckidj8Xa5pipQ78HQjtVvnq',
      },
    },
  ],
} as AddressTestCaseData;
