import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-empty',
  passphrase: '',
  passphraseState: 'mpZyZrARXurTXC6fhzHdQzs4xVNXCkCbxW',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392156',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qyvrvs4g6y6qythweswxfq5kxt2dwlnc8hletlp0qz988daluddclu3sl5yp97fyr4457tg6qz88jr3fq3uqkl8xczyqkqzmuw',
        '1': 'addr1q9y6w5sxhf7824ypse6magaa3fq3uttslpq0a3qzzl239eu5q35zhacdw5j30uk8k2n9jsgk2m3x4cxe208zxdrzputsrxalw2',
        '10': 'addr1q8c23jgvejdkqtgn0esyk04n0v2eh60ctld488lqpktqfjepkr4n7rqnxa70tkp6fmljxf5knrlccz59n3gv27qe72jqfhv7x4',
        '2147483646':
          'addr1q9fsuk5zsrqw4uae9jyqyxax2lkd563trkm8dxez3ld37vr07shn6qf393qqk2wfehc4486jl43w7jsygwzzm0va8p9sjvmjhs',
        '2147483647':
          'addr1qylzqvte8ljl7zlav7cnmys9z5th7leutl4mr4l0k0n4mz8ujg7tm0ukngd46mpzfhvkmp7d70567y77ctq6hm0nn9pq7c2kfx',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'MUTV5PWKQZCZM6COMD6GVEWJE3YW7E4NZA2BMG46EVHLWTPEQOZJAPVAAQ',
        '1': 'MD6LL2LO6WI5D3747UWKMHIXIR3G6TCHIC3EONTGTXRBVEPXCOVHZ2SFCQ',
        '10': 'QCUTPE5YFYHCDRKUAFD3K4QYRHVW3N77BJVG74B3UTQSWUKQWKUWMOPEU4',
        '2147483646': 'PKHACXMIE3C77AADBES3J2HNG3KRAQSP677CVRH656NL6QG7CJC5CTVR6Q',
        '2147483647': 'VEHGWJG6Y2TH4EDEUMF3OEEETKJRQIC3KLJSRCXGNKWGOJRMHB27CBSSRA',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x12d3cddd145e7cc4d613206d230e665e6c02d97b55ac453c1d403c368b71e286',
        '1': '0x12592132e80c337de7f1c7d75da15eebad8fedb1191882ff86073c7bee9c45df',
        '10': '0xc6da0dcc2876a43baf908fe97484ec39e92ac68b86057fe574221e84cc05b9cc',
        '2147483646': '0x3040d67b6e497b5918660cbe3621196ccfc36bf2b7b8c42f61d8c9a3f2bb725b',
        '2147483647': '0xd2cdc8db88af9065c4b4cf0db0e15466ece3753c248ed4c965e318131ad96ed5',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1BgNqbjKsGzBMhrAhMhkuZuPteRknqF2Bh',
        '1': '1CAE1mWdDqJxNYTjoSRFerz87xBXeAaW8T',
        '10': '18xkvPvMNKNfgjV4VPHNKuVSWbsxepRCXj',
        '2147483646': '1H9Txoy6SvXtxqn8g1P8vrmMZJFe3gumQF',
        '2147483647': '1KoPbS3STpwGR7X2wbYatQdL2k19W9uipo',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3JPMAcF4bagTsRMQJpVkDFAoNqGYkpAmQB',
        '1': '3LpYy7VHBpEdjB7KwMhkrv39GmMWPVGdTJ',
        '10': '3BdCebTkLFxadW94Eomg9PyC5bmLLxKqK3',
        '2147483646': '32jUxGS64QM4eH9fRdnQ6hZvYj7QCG4DCn',
        '2147483647': '3GuHk2xBwti7J5ogwF3BBnFdZjc2b5oKih',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q26yy0m6ww5jypvk4ldf9wwyhthq8qje6j3y9tf',
        '1': 'bc1q2dkvxmefq0ckeqsw6sp674lfjgswl874q7dwmh',
        '10': 'bc1q4fe9hmkgjc8keuugeghvxdnxashdpc6929p64f',
        '2147483646': 'bc1q9pmqj655apevkyex27t50te79f0emjppqznrj4',
        '2147483647': 'bc1qkzqnsu3nzl0gn3lrc77ahtp46yx88hfkgv4te7',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pcjrym9tnedqqac8gyn9k65xjeqw7zcklk80yp3djx0ekazdm8vuq3g9jah',
        '1': 'bc1pf8jdx5gcu5av7qw6hurnsnd4tzl9qv8j78plqnf3l0zjuhhzg3yscfpemf',
        '10': 'bc1pzy5a6x3y535kvwlxj4j04mc8yznq8jq30m27te5uz7gn69sj26dqetgfrm',
        '2147483646': 'bc1ph4ev7ztarrjuy8gc0787yw5ruh4v6wrdk433yzr7jsz3w448w7ls47gapf',
        '2147483647': 'bc1pcszdgcxxvus8z4c7yqqsdgqlvy43tpxuqft0ea8j0whd3r7r0xdqg80xhx',
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
        '0': 'DJntowJdt2mA19EYtXg8CL2sZaVu7ZaKwn',
        '1': 'DJBCM2HTzUpopp5vhY7btFZmEYqkMkNoEz',
        '10': 'DGRPpPYkbcg5yDPj4So2D1Z31SJftCjzeP',
        '2147483646': 'DFuZX7UKAJa562ZddCXvaLLiMEaJ8Jpdoi',
        '2147483647': 'D8Nn4CmsC6FaUrMTeN6AUw3ihZ4M51erUP',
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
        '0': 'bitcoincash:qqqlnc0qx2shm8um7nkrnznc2mvjxyqnvc8397n8s0',
        '1': 'bitcoincash:qq4qjckc9aqvgwcgx4hs2wkslnpcxfzd8qmy4repww',
        '10': 'bitcoincash:qq0qsfj5ls8rzmv9vz8tqa0xatqafdpj0geydj72ad',
        '2147483646': 'bitcoincash:qran4hcafwrlgxuctq4gnpcce2d3fzccsup0r446a6',
        '2147483647': 'bitcoincash:qrp9uyufrnk3qw3gzjrc4cxeagx6gknang6g38wk5u',
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
        '0': 'LXzUq1mRSZ4tgwhqbH1KkSi5fFkwvoP2xk',
        '1': 'LhdsZSx7vBXfb6GWDZu3b2ioRzgu1Mh2yj',
        '10': 'LUYZAG9CtWDUKpypUBmpSCWM38wTSdX3ND',
        '2147483646': 'LXPnhYXYkZZa9qzhzcj2LcRZTwXAPKqU2b',
        '2147483647': 'LehaCnsBGm6jKgJHdGGrCacMoMzqpk6jbD',
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
        '0': 'MUxGHWr4MrrX77o7Kt5gc7CUtiM96ZHjEu',
        '1': 'MVWwPP3VscnTYWcsKGQERe15w4gG1iKgcR',
        '10': 'MS2p978D2g4CPMGEWXvbQiwoWAXrtfQQre',
        '2147483646': 'MEnwqoAuySGYwtoVqFB8T34ckbWnjteUqy',
        '2147483647': 'MLnLdnwKVMzzY69joY5D3SP8N9L5TJxRxE',
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
        '0': 'ltc1qsr779gf5vkyruhsjqkfafl6jgl2nwaaquf8dtn',
        '1': 'ltc1q4n8325cwcw9sljm56hcwhzgt7g9k4kzyug6sg5',
        '10': 'ltc1qztnrhw0up7hv5fhzd6mjxzf3fxuqdqhwn8gzy5',
        '2147483646': 'ltc1q952hsjqlg0azk4c83309saey6uyvyz98g2a4kh',
        '2147483647': 'ltc1qp8xdq5sd54tgw0ptzu8vpevgx4kuyfttzv435c',
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
        '0': 'NM7gT5zh8BSnQ54H2y9Qddvt2DgP8zED53',
        '1': 'NY15w1BsyGppC2PAoQzvsbGiW7kgmN3JCk',
        '10': 'NYfnFVADECJvDPGrpzLrWQ1pm6EeBzoEtw',
        '2147483646': 'NRNeGuuE9QamWRpGu6zMUvN4vgDi3ZwPZP',
        '2147483647': 'NY5Guqgsh7QMA6rGP6GmWMR4cmaJDhnGVK',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqg5eaqr3lks98tunl5qf76p6walntvkd5sdt0w9m',
        '1': 'ckb1qyqr600z2s28yuazwyml0fzd8p5882lg9k6swc8j9h',
        '10': 'ckb1qyqrehsgp9wn2c0l2gqvvwglmm9lc427224s2xe4xa',
        '2147483646': 'ckb1qyq06dq7mev9ye5y6xn3hgfk3nmdvrnljlrqy4j2ta',
        '2147483647': 'ckb1qyq0u4nj7ue6wkw7xpwcky7zyfkhsjn5y3sqmsxzcg',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aanchehemx9h3r6d3as0mv9g5xpf13j6he3ed37a8t',
        '1': 'cfx:aas5we0hwk9faadrjnzc9emtc7cxwm3zbp8p91zfwd',
        '10': 'cfx:aak6xwcypuh3u1569w8ntxfdrn6xehktrp55htuaff',
        '2147483646': 'cfx:aapv2xntwz6kr0p0sfvmc3ew6s2fzk85dpdppfjf0j',
        '2147483647': 'cfx:aapnsvhvkt6hsdcztrb4xkmdufb6pfkpry2wcagmgu',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1v4q95yp7gw7t5exgt83rg27fng0zmk89tvedw6',
        '1': 'cosmos1xztueh0zm2pfy2fuzekkzaqfvtl0mzfh7qahtp',
        '10': 'cosmos109nnqcwgfr09ghd7yq94s6jdfnrn5c3uzpfnf4',
        '2147483646': 'cosmos1mxqf7z3tdrmxujkxam46uzzdyzzwq9tuv4dz34',
        '2147483647': 'cosmos18cgmqhrlv8ljrzgxnpsc9ykwdvlh2l66q935e6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1v4q95yp7gw7t5exgt83rg27fng0zmk89xh52hq',
        '1': 'akash1xztueh0zm2pfy2fuzekkzaqfvtl0mzfhnmssjm',
        '10': 'akash109nnqcwgfr09ghd7yq94s6jdfnrn5c3u06y5s0',
        '2147483646': 'akash1mxqf7z3tdrmxujkxam46uzzdyzzwq9tupwq9g0',
        '2147483647': 'akash18cgmqhrlv8ljrzgxnpsc9ykwdvlh2l66d7unqq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1v4q95yp7gw7t5exgt83rg27fng0zmk89nh35jt',
        '1': 'cro1xztueh0zm2pfy2fuzekkzaqfvtl0mzfhxm4whs',
        '10': 'cro109nnqcwgfr09ghd7yq94s6jdfnrn5c3u66p24y',
        '2147483646': 'cro1mxqf7z3tdrmxujkxam46uzzdyzzwq9tu5w9mdy',
        '2147483647': 'cro18cgmqhrlv8ljrzgxnpsc9ykwdvlh2l66c7ed9t',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1v4q95yp7gw7t5exgt83rg27fng0zmk89c3sfvd',
        '1': 'fetch1xztueh0zm2pfy2fuzekkzaqfvtl0mzfhda5nfk',
        '10': 'fetch109nnqcwgfr09ghd7yq94s6jdfnrn5c3u3uqhtz',
        '2147483646': 'fetch1mxqf7z3tdrmxujkxam46uzzdyzzwq9tulgyxnz',
        '2147483647': 'fetch18cgmqhrlv8ljrzgxnpsc9ykwdvlh2l66nccsmd',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1v4q95yp7gw7t5exgt83rg27fng0zmk89rh2acg',
        '1': 'osmo1xztueh0zm2pfy2fuzekkzaqfvtl0mzfhkmw8an',
        '10': 'osmo109nnqcwgfr09ghd7yq94s6jdfnrn5c3u266rl8',
        '2147483646': 'osmo1mxqf7z3tdrmxujkxam46uzzdyzzwq9tuyw7j88',
        '2147483647': 'osmo18cgmqhrlv8ljrzgxnpsc9ykwdvlh2l66g7zy0g',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1v4q95yp7gw7t5exgt83rg27fng0zmk89a76kfx',
        '1': 'juno1xztueh0zm2pfy2fuzekkzaqfvtl0mzfhgj7vva',
        '10': 'juno109nnqcwgfr09ghd7yq94s6jdfnrn5c3u5n2gwf',
        '2147483646': 'juno1mxqf7z3tdrmxujkxam46uzzdyzzwq9tu68wekf',
        '2147483647': 'juno18cgmqhrlv8ljrzgxnpsc9ykwdvlh2l66khj07x',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1v4q95yp7gw7t5exgt83rg27fng0zmk89dgrdv6',
        '1': 'terra1xztueh0zm2pfy2fuzekkzaqfvtl0mzfhcy8hfp',
        '10': 'terra109nnqcwgfr09ghd7yq94s6jdfnrn5c3uy9nnt4',
        '2147483646': 'terra1mxqf7z3tdrmxujkxam46uzzdyzzwq9tu23hzn4',
        '2147483647': 'terra18cgmqhrlv8ljrzgxnpsc9ykwdvlh2l66xpt5m6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1v4q95yp7gw7t5exgt83rg27fng0zmk89ffdynx',
        '1': 'secret1xztueh0zm2pfy2fuzekkzaqfvtl0mzfhu9f7ka',
        '10': 'secret109nnqcwgfr09ghd7yq94s6jdfnrn5c3uqya65f',
        '2147483646': 'secret1mxqf7z3tdrmxujkxam46uzzdyzzwq9tuwsetvf',
        '2147483647': 'secret18cgmqhrlv8ljrzgxnpsc9ykwdvlh2l66zq9ayx',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1v4q95yp7gw7t5exgt83rg27fng0zmk896xga5h',
        '1': 'celestia1xztueh0zm2pfy2fuzekkzaqfvtl0mzfh02v83v',
        '10': 'celestia109nnqcwgfr09ghd7yq94s6jdfnrn5c3untcrnc',
        '2147483646': 'celestia1mxqf7z3tdrmxujkxam46uzzdyzzwq9tualujtc',
        '2147483647': 'celestia18cgmqhrlv8ljrzgxnpsc9ykwdvlh2l6630qyrh',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwoZom35pMWbemxcKqWDeZbSTAF3FTRxjAodxb8ioBsmQtWafFrx4xrReBULDmX76YHzRmHA98ymrfjaL5Je2Jon1K9PALdNg',
        '1': 'XwmwHzLEW3HYP2Mkxycex3GMgshRBvztWVhL2UdVGTYBWUhwogLEBzzSJzYFFyVc17VXqSouc5vzdbasrxcybyya1vUt63TA2',
        '10': 'XwnmG27zk4dVHiDc88dwwX9NNKnAfXcTXRsCUVmmPYbmPjcawTXjFjL9agF51uM4YAcutov98WKa3aBhjPGi3Q4e29tW7Yip7',
        '2147483646':
          'XwmuhkYQhS3hAb7zATLYhLjcEJv5Yn8sPKK7vUjpC7fe3eAre7PqbYGHkzRg6wn5SZDTCxDi1HrAjA1nEcWVemVc23GqjVAFz',
        '2147483647':
          'Xwmww3m3N9H9gL94CUhshC6mkUA4zahTYNj8TeBnkqFK24AjuBAcC9K397A5RDS3JiVqMMHT5LYYt7CS8fL17YWM2oHY5TLnz',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x740218FC12f47a9a1463fBe5BE6ab7c56C8A8337',
        '1': '0xe3d5534A61524a968f5609E81AcD9dEA692568C7',
        '10': '0x2C54b3130e5bA2C20884040aB9A8C61999D80ccf',
        '2147483646': '0x58Dd12de4bA67fdec5F40A49f471c340848A1C7F',
        '2147483647': '0xBe9e78c32d383D6968C680Ee29a957620A796f32',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x26e8b175c70e56B10Dc8ae02784D5EB6EC934032',
        '1': '0xe159a64bbB7b0cC24733585D4446787710481c4c',
        '10': '0xb8fc51EBB12e28591b7Cb216a6e25DDC2f4Df503',
        '2147483646': '0x06317f7573ac1C6c4a948f7751EEB18387aC3808',
        '2147483647': '0x64a390DbB16Ac49A10c074CDC83069071DD90F3e',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x26e8b175c70e56B10Dc8ae02784D5EB6EC934032',
        '1': '0x5827C3278aEC82895ed6fCc07601dAB7c1B7256d',
        '10': '0x491B0bee936A4ceaAa72B449c90430dFeE259e6D',
        '2147483646': '0xc3b61aD7E96560A83A854a896aff49980258c9d9',
        '2147483647': '0x9568675EE715F7abC39204382e6Ec18CCdf8AEA7',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1awx4kwj4ixr6c5zxwkhf5sukutoyaeakjzywbny',
        '1': 'f1hphmrx3k24ozxhqoh7nhhbekjlabp2lgl2kuzwy',
        '10': 'f1huntphk4kc5gfw33rig5vfhmqyeyay5ukwwcwxq',
        '2147483646': 'f15db4hqyreegkeibqlk57rwduapfxsynzougo6sy',
        '2147483647': 'f1svmwjday3lzmyd25rwsrvekgrlpg4ifrh6ko6qa',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qrk094ak490ck7nc7cqs5hcmlpas2gxw2q3nwcaerlkf8lczrs6fwxxela96m',
        '1': 'kaspa:qrte2mcs2l57n9crkwgw5d8enkam3nljmfq0xpa7qmcfw9uzk56lc9zda6m6g',
        '10': 'kaspa:qr0uk5ugs3vu75q73ycjn343kuszg7x3zjn0gy27e5msuxdks7x85fjqmznf8',
        '2147483646': 'kaspa:qrk25q7lvsagjvet8sd0dv6q9hskd4g75tcvar8rdm37dls4qmcmuzrnulujc',
        '2147483647': 'kaspa:qrxna49zpxfc9kfsq2nuvh8xvh5ga8wl6g3q5s29au9t30mw2vww2sl347nr7',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '9de59a8f9a13aea92380684b6648da8c35fa68d2f7bb0d5d0ea5917a2ae222a4',
        '1': 'fd87ecf19375783246b68c9acc7faefd6d256eb88c07126585dd23c6d88cd780',
        '10': '5b55972277035aec812b8dc4389de0b683c8f4f38791bbe2cbbccbbca88c059e',
        '2147483646': '8bea644e88d9f861bbd2ad691f5c2199c5591a62580bde99a250a56b488fb741',
        '2147483647': '43e4d17bf3ff3f6d9294f97d631af369b9d6fc0c0453ee35127fc6fa6a543fd9',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NAR7LZA3GQYYMMSUQNCF6QLCJ4QFLNEQEFKHTYT7',
        '1': 'NCIH7BB6TGOW3EWF4Y6U4KW3PMOUYWCFCPBPWRRU',
        '10': 'NBANW524RXTMCRFRUX64VLTMCBJZUJOJ2AOW6FKG',
        '2147483646': 'NBDKTVTN3ZZWCQD67HFM444LXYK43N7P46PW3IMJ',
        '2147483647': 'NDYCUT7JPAVXAFWF3LO3TM3U2RU6NOLFW4TPSQCG',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5rkh7slxuyqwspan8wfapt6swag6l6vfeylqlg9nd',
        '1': 'nexa:nqtsq5g5709r6nppje7c5qhw78zt7fqrgap7qple75ptw7l7',
        '10': 'nexa:nqtsq5g5qc3gmvkszwatjf6ewxl3z3ug3mjy5jpfa8u9z4fy',
        '2147483646': 'nexa:nqtsq5g56fnjgydyrnp6ajt63tju3z7czh7r3ase7ewqwx4n',
        '2147483647': 'nexa:nqtsq5g58yrq0cpc04y804nearmg7ynv9jq43esqc7wf0n33',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16kqrnYYyfvSiKLkeLATaEdMSVnNggK2BosRxoxRiAffgj8a',
        '1': '17EejoYy7F8Nf7ckqDZXJHNhRnr8KUgYiZSy5cczoHQ5rmR',
        '10': '16MCEJhdQo7H7MkZjpwcZPWFF1SoEHqdFKKzeSgNfUiQqXkb',
        '2147483646': '135XYi7LrqdHsZ9XfG94e9c4RRk5NbGWG4t3qCmqBs1eQkKQ',
        '2147483647': '1mZ87d62UprruB3Jwkdrey4jpSvXdn4igQFuyaMUvttsFr7',
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
        '0': 'bh99kFZu8J5VcN5AzZaTjxUfvVqxbTd8We63EAw2Se76Ly8',
        '1': 'W3XwhWZtZcm9x8wHVcgQocVvrWKQEdHVRL73Vq8K5FqVURf',
        '10': 'bHVXGQeLFUutemtGVLjStqNUSAGWCzEC26eirtsykgrF8x9',
        '2147483646': 'Y1pqfpMnHzverArBvYBXewBerTYeWR7CmehuczLW8z5p8K9',
        '2147483647': 'WhrR5L6wwCVeCCMqc9kkAJByFAPoYvffPAuzPnroCsLGnCp',
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
        '0': 'JLANmdMkFfu2S9gTPvWL3ACjU4xo3a4ZgyhCBF2dsreFJyR',
        '1': 'CgZAitMjgzagmvYZtycH6pDzQ5SEgjivbfiCSuDvWUNebUZ',
        '10': 'HvWkHnSBNrjRUZVYthfKC36XyjPLf6fdCSFsoxybBuPQ7ZR',
        '2147483646': 'Eer4hC9dRNkBfxTUKu7Px8uiQ2fUxXYdwzK4a4S7aCcyPSn',
        '2147483647': 'DLse6hto4aKB1yy81WgcTVv2njWe1376ZWX9LrxQe5sRkSb',
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
        '0': 'j4X5THVXSzcA17PmyxfZ9HEWC7FsJVGL3qFmPB51Pb9nn9sq3',
        '1': 'j4RRr5SnSz3UgmjYr5AcFEJADNBsmvuViCATQBLfasnQWYvGB',
        '10': 'j4Wfof1gXRjLqWSBo4ALJGPP5umXj2sretmDwrhjLYTqXJUHG',
        '2147483646': 'j4TQ8yR6EsmrrGdakybXkM9Uu6Bq1BBHXuWn13Tpo4r8kseZw',
        '2147483647': 'j4S6AYpbz3R4RFycGdH9KZequQaXrLDo6N8JD8EdKMv21LBqi',
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
        '0': 'dfcJrgHb5kDQfKK7Db2kf7GVbKbRANXhnHaTdocBBZd5dafMB',
        '1': 'dfWfFUEr5jejLyet5hXom4L9caXRdpAsSeV9eosqNrFhMyiYy',
        '10': 'dfbuD3okABLbViMX2gXXp6RNV875av9EPM5vCVEu8Ww8NjQYn',
        '2147483646': 'dfYdYND9sdP7WUYuzbxjGBBUJJXNs4SfGMqUFfzzb3KRcJNC3',
        '2147483647': 'dfXKZwcfco2K5TtwWFeLqPgqJcv5iDVAppSzTkmo7LPJrkx1J',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rLksnpEXahnWiactgjrZAPdM8ryeZGoUGH',
        '1': 'rNghtEnjZx9GJ9R3Y3YohpxDBe9TSRLbnn',
        '10': 'rGSL915rhm31sppA2rrLviJ9EDqbDCMzZX',
        '2147483646': 'rMiqevwi7q1eMZgdvGP9TehTo9eg6rC6zy',
        '2147483647': 'rUMqUdyVRWjjpjiSNVsJaoRPFJMCZmpaJo',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '3fKk3HZh93knuUss9fPg1ja3X1WmLBiY6JxZXse3Esos',
        '1': '68YUPDw4d1M5jVGgamX9cVotzhHUwAmywqa5yM4KYE3M',
        '10': 'C8enTYyLHrmgBPJEtG7M4Hfj4AJx38qAhwYidZtScYi5',
        '2147483646': 'HE7cEk3xrFxZXh29nGmjypkZTGkCqo5yvrn1rupUmmsk',
        '2147483647': 'DFgAfjKYbditaqL6XZopLRfav2DBVb5on1N5eQYfhuGr',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x477332da193ab6e5784c29b2f5ea986b',
        '1': '0x001d12edb24e77c8f99dca25181065d2',
        '10': '0xb496613923924b9013bf73b7fbc6f7b3',
        '2147483646': '0x986370c59f515d97efd7e2575b3df669',
        '2147483647': '0x8e57b857095434cc21ad026b0034c57c',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GD7RXUE4CCZWKRVBKSMOUXRTC2Q5FS2FBX5MCZ5SKJTFD7H5H4U3JLEW',
        '1': 'GCLUZOGL3FMTCZE5ROUMM3BN7RHOCWNXTJP7I6J7HSNHLNSP74M4WRHX',
        '10': 'GAV35ESGXIFUD6HLS6LWFU7SZRXWXAY3MBQB7FLM2XRO5PCLMM5JE2WJ',
        '2147483646': 'GBGBFHIS77OODKG2624YG4NZQKXAVZOOQOEWDTJIXWYEF4RAVMWSGBUL',
        '2147483647': 'GCW3QSPLFSKTLSUPTTMCYI7DKSHCVNNZML6ZVMJ2SEPCC5APOB6D2GI3',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x27d89941e5e4d8abc2d48054b89194cff592329b51d139c2f40a443536ea168b',
        '1': '0xb5534da340d160c51f964cb8084e193232df58ae2bc9e61320c6c3def9bd07d5',
        '10': '0x940148aba8d54d1c6beb3c773379929cb04fbd13fbd0044cff679208e9dc33ba',
        '2147483646': '0xe15e1268971137fdde807eb19851f8684a0e6a8f5bc9efbfa9eec526e2a1c335',
        '2147483647': '0xee18a1c0270a34487d4a7c6eccfd2170a8fb415de831beabe20f5fbe203648fc',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TRZqVq5JrRTsRGrykspoSYiW9iC7bH56A7',
        '1': 'TMWvdcaST1mbnmazezim3NTuTmGuStPLdZ',
        '10': 'TXmRp3hEETqG1eyMa3H5Fo3yTsy8E99Ugx',
        '2147483646': 'TRXR1K9E8ZksUp21QpW7hoBAQPWw8wgjRA',
        '2147483647': 'TWFjr4of4Zc9QdFjNiksWpmTkfb3f7wSvF',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC3b9ac1cd4a3b45b12ef6f9f1d8725f64ce816cd077593891bc9da30db09212d09fbf',
        '1': 'BFC8be3cfc82fb0b818dfb7a276d30436e30ae76f600b9664ad09deb767bf6fbefa9420',
        '10': 'BFC6aed3d7f0377d7f644e8ef59897c7e805ac4f5012ac064e814c85b30f6a6d1c2417d',
        '2147483646': 'BFC9146b417b0a161b53ccb36597b9319af663860a0c5f2fbdc6b773cc1d545d06cfd36',
        '2147483647': 'BFC0fff21df0a8cfc8314128c751ba14aa24674837dd3e929946cae1f4a3aaa14592036',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'Ne15BuSrpxPDC427NNwWLf99oUC5fHHXqL',
        '1': 'Nd69XznjfHBr3b7Rm2pQPSNDoTFsUbCNbG',
        '10': 'NWHWakk1FcpsxogTp4Ao1ap2mJhitM2mR6',
        '2147483646': 'NN49TkytDUNjbWvhBied1zApxMnqL1h3pK',
        '2147483647': 'NeQyuGj5TzNnrHhGPSMdyKfZaECBJesvuw',
      },
    },
  ],
} as AddressTestCaseData;
