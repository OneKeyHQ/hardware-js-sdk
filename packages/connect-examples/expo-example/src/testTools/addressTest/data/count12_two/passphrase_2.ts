import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase12-密语2',
  passphrase: '~~##^$$~^`',
  passphraseState: 'mrMdgz2K5pePtQEJvu2VvMkfDh7vS9oAnP',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392047',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qx9cu53ffuq7nu49mfh3yafcs74kudazgvxj7a9l62rapg9ma50nxq33tvwkznls4f4rrguhc2ppyfxv7s3ckm7waf2qv2glgw',
        '35': 'addr1q999dayvegzd8z0j2zkn75etnzz5pw8aljuvm9jcc3msxz08xxuehztllfcf4706ywaqgr5jherc744q32xkqhhxxr9qtp5e4f',
        '2147483647':
          'addr1q849zatyy39gw5rv2hks42wr6y528hw865ju0x9geppezfjkkv00gqtzwev96wqk2qufrku22tkafxrrqms85fw3jx0skd9q5n',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'ORJRSY56O3M3W2OCTEIOSH4M3M7FHDX4AVIOOMQBC34LBLBZWEVK6I77TU',
        '35': 'JIGFBTKRSJLN3EB4RFKANAAQ2PGXG54KSU46KNWPF5OEQE2RFET5A7F5FU',
        '2147483647': '6R22C2THT2S4VYP32JSJZO6OW657DFZ7AK22QPE6VZ4M4U37VE7SJ5DHX4',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x1e512c376afec48c42a60219e67b07d149fd00d3b9f8b9e091e7d443cc9d9044',
        '35': '0x46b62424108e28839cddb3d47b5e84485035ce83f13eff066988571795e9e7d7',
        '2147483647': '0x88b2790facc1043685aee3f81ee523ad61b86483f1baa2366241fc8846a54180',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1Bq5DS1i3jiDz1ja64MmM9fNwpkcd7omsW',
        '35': '14uTUwEoJNe3TAzkWDavJ1Lb89y46QrhVw',
        '2147483647': '1CET9greUEbGx4ms1BxZKYmk6yAaZAXhUF',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '38WeUVCijmykAnFcQLKsWBNcH8wrGX7ADL',
        '35': '3D5G1u4zRBdAfuJDTQjLtrFR3Q659Rts8R',
        '2147483647': '34gTx5Ky1MTdbDaFugeBn6XirS3e8uKBMM',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q7p2yv8vugrtcldln8fmlgyht203xe3c2lvej9v',
        '35': 'bc1qwckp7dtduq4tvradlhc3k6zdzh2rgyax4zg6rr',
        '2147483647': 'bc1qjtjflp286fzu9uh0ky86rksy7kswr6nmzsfqan',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pzgs5mutleynl427cgrdszm9x0fynq5m5u28ntd3jvr2r985wtkes5ghzdx',
        '35': 'bc1pyzvgz772wvsk9q42g787nyesgye6t4rzhx3st3wz5uz7htpx7sqsv7ywd2',
        '2147483647': 'bc1pc9tfsf4925099clj9g8szq495p3rl3wgcqjhxn8ptysqrrlgyupqgmzrcm',
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
        '0': 'DHuTszUvxPgyZueLjuFzrNaHvsUrRCjJP8',
        '35': 'DFNBoyAe1WSTP2Zww8TVmf7s2XadqftkT4',
        '2147483647': 'DGanvd3y7Ljhp9Ls67JSxqUy7xsjp4rKKx',
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
        '0': 'bitcoincash:qrpf24uc6urcwcten607g30yykfww35ef5vn9w9zuk',
        '35': 'bitcoincash:qq8ac8x6nm5jrge42pkvae2e5kdzztplkswz8d4f5k',
        '2147483647': 'bitcoincash:qrwgju0yxggvscmdzdchwjmdtefxxax72urk2zv5xv',
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
        '0': 'LddK5YULSZBLVA5LYsmjp7ZfQFm8o5knu1',
        '35': 'LRMVEosuEskZx2CGCsJjcp2iUgWrVQfBMc',
        '2147483647': 'LhgMVyArYrKJcgCJXYT2KfXYKJeBPYe7bc',
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
        '0': 'MQ8LBLnLdV8x7yQF5YobYc21ovPK74BssN',
        '35': 'M7vedVyAomLvvCc2t3yXgEZAnTagTqHzZs',
        '2147483647': 'MEgsCX72LnfcoN87vKXPYuzrj4tmF39MWZ',
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
        '0': 'ltc1qf4gk2400er6v2aftq8tfxtqter6dptg43trzuf',
        '35': 'ltc1q8yzr9mtd93yup6kc2efytemv4qnhevrh5ktky3',
        '2147483647': 'ltc1q6rm4wufuhaxl3ntct7r0p4m0anyakfl3ws76n3',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aat3p1y69vvcwfts1dran8jant83wv9d7e9kn11raj',
        '35': 'cfx:aaregva34tnp8x4jfpt3xrzv3bgr8bta2u3vauyxav',
        '2147483647': 'cfx:aame2p13wu50gm2sbfefzy6ekp0ub1pkau7gp27h0j',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1chnmqfl4746z050t7vtc8s7q6fwd5da3gh8045',
        '35': 'cosmos1fw37nj5j9jueff7e9ekytqtw5y702n433s23d4',
        '2147483647': 'cosmos14gy6crget847rcjm9k9gkgrl58qpy6ejcdkmk5',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1chnmqfl4746z050t7vtc8s7q6fwd5da39v2gvw',
        '35': 'akash1fw37nj5j9jueff7e9ekytqtw5y702n43ut8k50',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1chnmqfl4746z050t7vtc8s7q6fwd5da3sv0kf9',
        '35': 'cro1fw37nj5j9jueff7e9ekytqtw5y702n43ftzg3y',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1chnmqfl4746z050t7vtc8s7q6fwd5da3m2wthr',
        '35': 'fetch1fw37nj5j9jueff7e9ekytqtw5y702n43zdr40z',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1chnmqfl4746z050t7vtc8s7q6fwd5da3qv5lrx',
        '35': 'osmo1fw37nj5j9jueff7e9ekytqtw5y702n43etepm8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1chnmqfl4746z050t7vtc8s7q6fwd5da379y5jg',
        '35': 'juno1fw37nj5j9jueff7e9ekytqtw5y702n438zf22f',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1chnmqfl4746z050t7vtc8s7q6fwd5da3wna0h5',
        '35': 'terra1fw37nj5j9jueff7e9ekytqtw5y702n43h5s304',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1chnmqfl4746z050t7vtc8s7q6fwd5da32jnxgg',
        '35': 'secret1fw37nj5j9jueff7e9ekytqtw5y702n43n47csf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1chnmqfl4746z050t7vtc8s7q6fwd5da3eakl0e',
        '35': 'celestia1fw37nj5j9jueff7e9ekytqtw5y702n43q6mphc',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x87fD604929902F43ae1794E1f19Df92c0aAdd506',
        '35': '0xE26C508fcD5a9b75a6e4256ACf85817CE2b46F6C',
        '2147483647': '0xEa1917257EA713Fb60996dd65e16255d98C282D1',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0xEDAf6Ed17353e2c653A2B81707da32D3cc2ae487',
        '2147483647': '0x7E874f669E500F572Ec220D44048C569426DB759',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0xEDAf6Ed17353e2c653A2B81707da32D3cc2ae487',
        '2147483647': '0x89FC6Fe902D168aBcEF59B9168f9Cb25C64F7B19',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1hrr3l3rte6xtaqrhnfkoz2oyywdm7ywewjsdfvy',
        '35': 'f1l3mephi2afbpiu6rzmberd6bnck3puwi3wsihha',
        '2147483647': 'f1x4fyn543llfdp7g747jxhdr322actoa4ud6qpqy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qrv5gjus32lxapasun3p6hnvnyczkgjt8k8rk2kkp998yg9s4243jawrekxcz',
        '35': 'kaspa:qzugpxltrkcgsx2cdu7a8jvlrl9pyp3c0q3h2qky6fzxzqgc84y62v9unhd9e',
        '2147483647': 'kaspa:qqpfps0anxp0tu7fw0lse6lfghv378sz49tl4yp93ddpm88g6lfpunvsnn8wl',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'adbd621adc808088509c811d1f28409a446a1bfed93376feb53d58d6513f646d',
        '35': '4605601f543abbeed424dec1dab3e58881b32734845548eb1dd2f8d1f5445439',
        '2147483647': 'ae54650b5298e045b2b43fc6fdd58d1482ebdd602f99a1f8d14cdd10cfa7449d',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NBSOSZZECZ26TNN5VHSSLINKZVIGOLMXAQWBOMM5',
        '35': 'NDDXHRTAT2OQ57DEMOTKCTK56GMSAJYRUYWLF7R3',
        '2147483647': 'NC5V5VQCN22T7LYXGIXNEZFOIYRJMNO5F6XCTTAZ',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5hw4x0rymhslww06kk0n5a6f5cyru32h0529466md',
        '35': 'nexa:nqtsq5g5hhyt8glk98xlyjxl9rh9hxymec96yd2sr0wj2yuq',
        '2147483647': 'nexa:nqtsq5g5sfskqdrt37692p97zqtk2pj4p4m7hjvl6jacszcr',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16T76VyNGJqN82Y8u5wtHDDwn2FpFYQjnFnBSiqae5ang9X8',
        '35': '14dBtQt1vCTrHuABTseK9BtK3YwrbaYBPv9BTqLyvmcNoLzK',
        '2147483647': '16HdMBQsTnH4YFoEGHhcHoY1AtX3JB9jXL1hMchLKmmkdL27',
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
        '0': 'bPQPTgPBmCzuKZTRkM1AiZ51SyHXTZLixYqX945xMZE5mnT',
        '2147483647': 'bDve97tPEehKYpYnx6jBJs8QKEWa6JLU2nMS2uqe3kC2ukK',
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
        '0': 'J2RcV4B2tapS9M4i9hw31ko4zYQMufnA8tSg68BZnmmEdtP',
        '2147483647': 'HrwsAVgEN2WrNcA5MTf3c4rTrodQYQmuD7xayywFUxjC1TD',
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
        '0': 'j4WmiXCxGHF4vX6yNDRLZzD6nSnLk48RmRhg8eytYX4hu9JJa',
        '2147483647': 'j4WcEmtPmUiWcwLETad6HzoQqqeby6mAmAmueZskJCkts6CNT',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rn7xP3kRzriJZ5AxfrNheMrTLxB8LrFa2X',
        '2147483647': 'rpXroSy9zJzNSgdix4sN8oUdzTAQCs1sKw',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'oWLDaVvqp7R3FSNHcYtMZeiscceNJHbLJrf86LYcHFU',
        '35': '3VYBYN4tGkrFdmzWcZ3T4D18K1kJVxGvErbFU39pkSBx',
        '2147483647': 'HiwH11NRnzJTAoUE4T45AJqYu6r3B39yNsE5AMNCGYYE',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x1b08f4ad63b5e0ede887f0791e744d9b',
        '35': '0x39eec4024233c73f4067d319d10aeec1',
        '2147483647': '0x325c607dadd9334e7f21cfbeaac041a1',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GD37SZXF2GMY5WLF4JAOLBGSTP3OG3KPQQASNCKV5KIYYZWCWUEC4NTR',
        '35': 'GCCFCSDTCDKXXMYYRNITCFH4V4ZIFT6HQOTMSSLLOUW54S3EZM3ANS7E',
        '2147483647': 'GCE5A5YLNGGVRPBQXUX34LQIOFISZT5COQU7U32SK5ME2O2C3XGXPIDD',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xed56642cf22f04e99eecb3b0de493ef0b74dea273dbf6ed25126cfa6b3ada9d2',
        '35': '0x8cc805e386b076056e5ba1b3ed18c18d73da5feb422e36afb88ffaa478bc9ed8',
        '2147483647': '0x1705ef5d820b2aecfd2fe1a7234da5016896ccfbeb8940b866d4f3cbc1ad9159',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TKceNbwHDK1u7UK7NJQu9GNiox2hXVGBYy',
        '35': 'TDeUB3jQd19t8NEURVFzmQkAA7vYfMdvW6',
        '2147483647': 'TEePSjxw7nRVSK1h7UomM3EemD2XDNtrWu',
      },
    },
  ],
} as AddressTestCaseData;
