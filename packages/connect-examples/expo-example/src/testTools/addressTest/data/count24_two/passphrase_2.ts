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
        '30': 'addr1qydyr6ka4cts76uzr62mkz8kds90wzj20524u3mzfy2hw0wg2yj2r6ej9hhphrwaqq3x2c9lhhlp2jqxfr5x377n7heqs07ayj',
        '2147483647':
          'addr1q8fgkxr2mg0ejxrqtvs8wkjdnlzwffstm72fpd0t653z4q8e0wscmypgg3r7e6k7l872y4rxcxhg6gcdqtmchmrnpeysmuwnwq',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'B6G7VTGZLU2J5B5D3JGEABRUPQGBRN6ROAXGNMVHAUEICDHZIQD77IGBZM',
        '30': '36MUVTB5YTJDGVU3H3UO4JKQLPBY7KEQ57PKKY7HQAE5QOICXBRLKVIFKI',
        '2147483647': 'XDAXT66PDVBHXIBPZBJLZKRDUZKST6SY35SPOAQF3IIGO5IQ5ULEPPPFS4',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xf0015ce59ac1223d4a7d882239a9dc1283f49f6a67881f05e6127300dbb0195b',
        '30': '0x06043771595fb2ff7c794cd413934fa78e521ffa48510e63cd8a2efc25767105',
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
        '30': '17zUMJMBc6eiUQu2FWqjdfTjPEY8RwXzdV',
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
        '30': '3G2bGR49H9LQMvogwPQsoo1iWwu2cSdVcm',
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
        '30': 'bc1qed0nwm0yxc060t5h6nwy6k2az9j9ym9saqz2tv',
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
        '30': 'bc1p5cfgwd2sjghd2q6m90th8d8k9demuk4r5qjxrkf5x7ca3yuw8n5qfpp745',
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
        '30': 'D9KtHjKWG767wZi3tow8bCpQWTwaJWoLUk',
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
        '30': 'bitcoincash:qq9q0rlngfzhy4m9h2wd6td57d0kunhzfya9ne0xx5',
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
        '30': 'LWWFqBvsWTC7YfVFUGWcDTGGVzQRLViLZ6',
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
        '30': 'MG8VEobckm7W4QhUS5mgMrEv1q93w2e91i',
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
        '30': 'ltc1q2mvqf4nee2sdmr0jgsjuwmjnka97xd4xf32n2c',
        '2147483647': 'ltc1q3xy3n8f3474ga90cg3jmhgc07j5z5hv56zfr70',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aanasvvt2pacsnrj6z9wubm2v11cke55xyrk1nt472',
        '30': 'cfx:aar3b7x8t2hn3rktaurkrj62a2ze5wcvzu5agr5b59',
        '2147483647': 'cfx:aanj5mzcdsk4bbezuxzp4brehsxsu19grjxvhkchcc',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1vmsdp4wkrl0epn547ksctcy8r7ut9fnfwkpyg0',
        '30': 'cosmos168aep0xdnp3h30zm9f4mmp7ynuy3udgr2yqprn',
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
        '30': 'akash168aep0xdnp3h30zm9f4mmp7ynuy3udgr8ldx6f',
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
        '30': 'cro168aep0xdnp3h30zm9f4mmp7ynuy3udgrjlgclz',
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
        '30': 'fetch168aep0xdnp3h30zm9f4mmp7ynuy3udgreef9py',
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
        '30': 'osmo168aep0xdnp3h30zm9f4mmp7ynuy3udgrzln34p',
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
        '30': 'juno168aep0xdnp3h30zm9f4mmp7ynuy3udgrukr6y0',
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
        '30': 'terra168aep0xdnp3h30zm9f4mmp7ynuy3udgrvq6ppn',
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
        '30': 'secret168aep0xdnp3h30zm9f4mmp7ynuy3udgrgp5g70',
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
        '30': 'celestia168aep0xdnp3h30zm9f4mmp7ynuy3udgrmw33e7',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x474E5b269063c547a32882f28d94e1E653496E78',
        '30': '0xa27eaB49b99E3f1ba8BA5F4E2bF56C9675aF011d',
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
        '2147483647': '0x9e9022971045eee288774fBf623111441429D005',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f15eisrfxjs7bvgf2gsyxjilfpbaydkh5rlia5jxa',
        '30': 'f1n265z5esgtyix5bsvkhycwadeafq2c2jx2mrjnq',
        '2147483647': 'f14jv3hp443usbnit4cn7al2thxnxsffl7dilhvwy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qzd9ec8nhhqhjupj94ztwgwd6ajzxgqw0za0z4qtjp89r325e9vdw4fmz8x8p',
        '30': 'kaspa:qpu6xvsjytu47r2g9z8hsds3lmu0255l294g9dgw3x6x6yuvtwvs5a4d6vfmg',
        '2147483647': 'kaspa:qzc38qu0p8tml56l0pls38zyrdsjll46tyvq4aadrgm60t9a6cmec33cas9q7',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '7fb8b2955a62c90a5e3082f518a9b29b1815cd481bbb9900b200521ca0c8c0a2',
        '30': '21ef1060c0b098a4be6072695f9cc8fb2897e655d523b6e50b14986eaa6b8836',
        '2147483647': 'e842c28a7625d2c9356ca378713e9c7f1e21352776d329e57687324ce7b52f6a',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'ND3S3BSY4JJ2LVPMIFHVEF6JWUR2KPKIBXI7PZV7',
        '30': 'NB27SK5OQSGWZUNMSFXC5OLCWJMEY5XEFFT4QYN3',
        '2147483647': 'NBZIJIV6QZR2KDYVG3H7UVC7KEZZPEL57T424YY7',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5n0l2s6982wu8afjlx0k8sj2cergwhuyzq66f5hra',
        '30': 'nexa:nqtsq5g5t558a0sr4vytn5twpwttl3c6mp8cgusmqcljx33x',
        '2147483647': 'nexa:nqtsq5g5f0c3sjr5qe9wf3e2ev2r52xgk24kl5wr09rd460a',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '12fgQAyD9UQHhVZfqqvRNDX6oF6kXGXAWDcrxqSuobLL1SsJ',
        '30': '1gQxbopG6suRkc9uKoj9Say2hnpawkkVjuWJixAC41VEV23',
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
        '2147483647': 'j4Wyr6CCudYpLAnWCMqu3kWcSuPCXoKRuSgxVSdmjAYQnhd2n',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'r41J7MizYaf1QNxGFFn8DTUvHYCxQGub5S',
        '2147483647': 'r9nws3LQqm69LdSamt1Ns2BTTwnmJC3ASA',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '8grQeUzJiu1dpneN4BwkpTr93bLeAKJcYjvRb3cWukdh',
        '30': 'Gmxkort5KhTypX5a2nJuwy6NtWRKd1jdozzwizQLriMD',
        '2147483647': '3SpEKm4msuWWRjdgReEUvefoR5BHeM9mbDGGCBJkEcxV',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xbd62555f7fb3c61c040c8caec88dfb06',
        '30': '0xccec0be1621614c7dbc9229a3da4d5ec',
        '2147483647': '0x3ff39cca5d313e7e207ec69b48f09bc1',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDHM4WXLBDSJ7MM3HDUDNUXWGGHSEWI5OGYAZXZIEE3ZUGILXL4D62HG',
        '30': 'GCL4IJVBZWT4V7YAW7GB6QSCZ2IEVYRJPSYKBIXSLK6OGEXSQTVZDNLQ',
        '2147483647': 'GDW63ZSIRM5WMORWVVOO5PYYGIPAIOEMQF5RJXTNGP7LBTEMGVWDYPKR',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x30f9a9a9903eee0f665189646a14e7fbfabcccf12989817e08d14301d317b985',
        '30': '0x60816e544c40edd0d659cabda918176d0371f917f030d11d24e47341e97f78f8',
        '2147483647': '0x3d8c858103344894a736e0f981d8f2ea129e899842887cfd0ca3ccc3eae76fd8',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TKmRddgcJTeop8jh5mEi5TtfRf48Zauq76',
        '30': 'TPd2vAhtggV58LRhu959CPwVGFKYRUvBYG',
        '2147483647': 'TSq7txCpfWUD5jUcrq2y94MrbvGZBedeRE',
      },
    },
  ],
} as AddressTestCaseData;
