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
        '1': 'addr1qycwejyrqsjnsp2vpeluxuq3lthjg0vvsrrhlyens04ey4y3njedd9qk5hqn52jswehm0zlwluze9xggk38wm0errswqkzqn5c',
        '35': 'addr1q999dayvegzd8z0j2zkn75etnzz5pw8aljuvm9jcc3msxz08xxuehztllfcf4706ywaqgr5jherc744q32xkqhhxxr9qtp5e4f',
        '2147483646':
          'addr1qxelea0sjfjw34az9dnkempxqq8769y6f4k5qj548rnqumvzwdjrlc2hwzyh56j03gen3vunaydjn25w2y8wr8zu3j7sep6xsf',
        '2147483647':
          'addr1q849zatyy39gw5rv2hks42wr6y528hw865ju0x9geppezfjkkv00gqtzwev96wqk2qufrku22tkafxrrqms85fw3jx0skd9q5n',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'ORJRSY56O3M3W2OCTEIOSH4M3M7FHDX4AVIOOMQBC34LBLBZWEVK6I77TU',
        '1': 'S4ZBEC3BRXDPUYFMD6U6PIDBAGAPKVUGLPN5TLTBAPL3Y4UQDAASZZWVXQ',
        '35': 'JIGFBTKRSJLN3EB4RFKANAAQ2PGXG54KSU46KNWPF5OEQE2RFET5A7F5FU',
        '2147483646': 'S2THUNVWDQ7OQKH3GPQT66NCEYFDAOV5V4I6Z5QUT3P6I75HNJTM5QQC4I',
        '2147483647': '6R22C2THT2S4VYP32JSJZO6OW657DFZ7AK22QPE6VZ4M4U37VE7SJ5DHX4',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x1e512c376afec48c42a60219e67b07d149fd00d3b9f8b9e091e7d443cc9d9044',
        '1': '0xe948565171511b62851fd3ee9b388c35f3ced817ef3ba1a508862491cf0078e1',
        '35': '0x46b62424108e28839cddb3d47b5e84485035ce83f13eff066988571795e9e7d7',
        '2147483646': '0x23ab7301c1029aa2adeee0255760ae25685c2cd2a3eaab1b71ffab786cdb3821',
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
        '1': '1Ka75Sz1VCs6EUsrFWkSocZbKgAzWzCbej',
        '35': '14uTUwEoJNe3TAzkWDavJ1Lb89y46QrhVw',
        '2147483646': '1DNdHFTf3LsbZuiZU7KJBLh3MsUDMWdRzb',
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
        '1': '36K1WGVR8YgZtrVKXLXWQWGJPWvtvRgURH',
        '35': '3D5G1u4zRBdAfuJDTQjLtrFR3Q659Rts8R',
        '2147483646': '3FdpfufEoGXQ7hfG3A83vZH2Br9KhF9zbx',
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
        '1': 'bc1qfst00avev84lz57zjnqkjp7h4p823u30v2rcja',
        '35': 'bc1qwckp7dtduq4tvradlhc3k6zdzh2rgyax4zg6rr',
        '2147483646': 'bc1qkextq957m5c00xsr6nszq9s58nte4h9vt8ye48',
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
        '1': 'bc1pyl7wz8qf9v0ulapczxqljxrv0qver70e7xtzu0wxkjaqc2n5kujsmqs9wu',
        '35': 'bc1pyzvgz772wvsk9q42g787nyesgye6t4rzhx3st3wz5uz7htpx7sqsv7ywd2',
        '2147483646': 'bc1pwyeszypyzngwpqmrr6jqscfv2ht65u2903c75xen5t42dkth2pmq5xts9a',
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
        '1': 'DKgqohjcAhoAFGLx2dAX1YvHZYHkhsZoQo',
        '35': 'DFNBoyAe1WSTP2Zww8TVmf7s2XadqftkT4',
        '2147483646': 'D8qoWAbqA4VZTNGTeEZ5TdL8WuE1GsJeA2',
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
        '1': 'bitcoincash:qqst63d77p422f6sgyl67zwllunqcefxsvhxaae2zw',
        '35': 'bitcoincash:qq8ac8x6nm5jrge42pkvae2e5kdzztplkswz8d4f5k',
        '2147483646': 'bitcoincash:qzum6cxsn9rkanhuqnt4m47zx2h90szjjq2vf97279',
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
        '1': 'LhXC42PQNvwcmHukEstXEUpHxbQsaiKYPD',
        '35': 'LRMVEosuEskZx2CGCsJjcp2iUgWrVQfBMc',
        '2147483646': 'Lda5vkJRwMgAWvnwFprEy8nN7DNyTMosWo',
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
        '1': 'MBawrRrasVisMurDTPjnCnBMpn2RgwWjER',
        '35': 'M7vedVyAomLvvCc2t3yXgEZAnTagTqHzZs',
        '2147483646': 'MED4BjXecA4vESs66RGJj1tKgoCrPs2hYC',
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
        '1': 'ltc1q33rj2dj3jqx9d4h272awvwnxszk22ndjc3xex4',
        '35': 'ltc1q8yzr9mtd93yup6kc2efytemv4qnhevrh5ktky3',
        '2147483646': 'ltc1qe22k9y4qf4c0sk0mgvdvsm5gl5csz9hm7cymjc',
        '2147483647': 'ltc1q6rm4wufuhaxl3ntct7r0p4m0anyakfl3ws76n3',
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
        '0': 'NaK4imdYfxPWKuWcv6AAkRysAndnfxXNCJ',
        '1': 'NPsQpdL8XenZpe81Wty7dwMHGj4qn7ucp4',
        '35': 'NhsiYF3kdSZab1ExyLSC3uKsR9RhT6tLiP',
        '2147483646': 'NaR7KVqWCm1amNmymNN93zrE6FjGyBM8oi',
        '2147483647': 'NW6ZHtrn2iMQ4DfJmuaEDvchRvKNE2huFi',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aat3p1y69vvcwfts1dran8jant83wv9d7e9kn11raj',
        '1': 'cfx:aanv796bp3yxxb0279shzgmcdm8r2653bjjgm0fskw',
        '35': 'cfx:aaregva34tnp8x4jfpt3xrzv3bgr8bta2u3vauyxav',
        '2147483646': 'cfx:aajg5mr25xef519gfj2baayc4t9pzn6522crjz01ds',
        '2147483647': 'cfx:aame2p13wu50gm2sbfefzy6ekp0ub1pkau7gp27h0j',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1chnmqfl4746z050t7vtc8s7q6fwd5da3gh8045',
        '1': 'cosmos1m30jrlh3u2lcrpgfza99l6z5c8uxzejl3puxsj',
        '35': 'cosmos1fw37nj5j9jueff7e9ekytqtw5y702n433s23d4',
        '2147483646': 'cosmos10t0mqusymmgvs3rn2mm4u3wy4lp9px9rqjzd7g',
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
        '1': 'akash1m30jrlh3u2lcrpgfza99l6z5c8uxzejlu63pfg',
        '35': 'akash1fw37nj5j9jueff7e9ekytqtw5y702n43ut8k50',
        '2147483646': 'akash10t0mqusymmgvs3rn2mm4u3wy4lp9px9rdf028j',
        '2147483647': 'akash14gy6crget847rcjm9k9gkgrl58qpy6ej4kmu0w',
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
        '1': 'cro1m30jrlh3u2lcrpgfza99l6z5c8uxzejlf65lvr',
        '35': 'cro1fw37nj5j9jueff7e9ekytqtw5y702n43ftzg3y',
        '2147483646': 'cro10t0mqusymmgvs3rn2mm4u3wy4lp9px9rcf25ze',
        '2147483647': 'cro14gy6crget847rcjm9k9gkgrl58qpy6ejqk7z29',
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
        '1': 'fetch1m30jrlh3u2lcrpgfza99l6z5c8uxzejlzu4zj9',
        '35': 'fetch1fw37nj5j9jueff7e9ekytqtw5y702n43zdr40z',
        '2147483646': 'fetch10t0mqusymmgvs3rn2mm4u3wy4lp9px9rn0tful',
        '2147483647': 'fetch14gy6crget847rcjm9k9gkgrl58qpy6ejtsll5r',
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
        '1': 'osmo1m30jrlh3u2lcrpgfza99l6z5c8uxzejle60kxq',
        '35': 'osmo1fw37nj5j9jueff7e9ekytqtw5y702n43etepm8',
        '2147483646': 'osmo10t0mqusymmgvs3rn2mm4u3wy4lp9px9rgf3ag6',
        '2147483647': 'osmo14gy6crget847rcjm9k9gkgrl58qpy6ejsk9tqx',
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
        '1': 'juno1m30jrlh3u2lcrpgfza99l6z5c8uxzejl8nlahw',
        '35': 'juno1fw37nj5j9jueff7e9ekytqtw5y702n438zf22f',
        '2147483646': 'juno10t0mqusymmgvs3rn2mm4u3wy4lp9px9rkqpke5',
        '2147483647': 'juno14gy6crget847rcjm9k9gkgrl58qpy6ejwl4q3g',
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
        '1': 'terra1m30jrlh3u2lcrpgfza99l6z5c8uxzejlh9xxjj',
        '35': 'terra1fw37nj5j9jueff7e9ekytqtw5y702n43h5s304',
        '2147483646': 'terra10t0mqusymmgvs3rn2mm4u3wy4lp9px9rxkcdug',
        '2147483647': 'terra14gy6crget847rcjm9k9gkgrl58qpy6ej7fvm55',
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
        '1': 'secret1m30jrlh3u2lcrpgfza99l6z5c8uxzejlnyg0dw',
        '35': 'secret1fw37nj5j9jueff7e9ekytqtw5y702n43n47csf',
        '2147483646': 'secret10t0mqusymmgvs3rn2mm4u3wy4lp9px9rzhkyr5',
        '2147483647': 'secret14gy6crget847rcjm9k9gkgrl58qpy6ej6gzjtg',
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
        '1': 'celestia1m30jrlh3u2lcrpgfza99l6z5c8uxzejlqtdk2l',
        '35': 'celestia1fw37nj5j9jueff7e9ekytqtw5y702n43q6mphc',
        '2147483646': 'celestia10t0mqusymmgvs3rn2mm4u3wy4lp9px9r3cnay9',
        '2147483647': 'celestia14gy6crget847rcjm9k9gkgrl58qpy6ejf88tve',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwnPetuc6ENRQToLf9TiBS8cJaeE6nsrcEjxXmYeunVwbkffr5srepY548mzkKvLLvC5n7kKYAnkRB6AAhn9LAST11z41Ajrt',
        '1': 'XwnUkyjeipeNDibckdGMQY9btZU71vRJiH6749Mgj6tH9SXDWynRokSaZWGBtfrNja5r15TdAJ9fAEtodrhtwGHo1TDeSpkEw',
        '35': 'XwokB7tBKqm1GCEyeUwLwe1Ce9VbdM8F7Xf9Xtt86VsYEGGoAbK5wRr9aS7mhanaFCFec3yozazR2YYSbfj7t2Q41V4uDqRN2',
        '2147483646':
          'XwodfRyQc34BUycB38hTnyRZeft3aBB1bbPBsEoHC2PAWHDkuG3ZdBUZYj2cADh15CPuXBuqo8Mkz5TTbwNfiuvA1HYPxLDCN',
        '2147483647':
          'XwnyTyp8wbgjExUDu7XL3Ugt1w4TDFCpsDgLQZdKBQydK969PzrZBqRK7enKZHsRgEgArjS159PhNBF5zxLbczHo2MVQjZH4b',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x87fD604929902F43ae1794E1f19Df92c0aAdd506',
        '1': '0xB186e7286C9E9574Ce8e32260c18a82c45ab8327',
        '35': '0xE26C508fcD5a9b75a6e4256ACf85817CE2b46F6C',
        '2147483646': '0xC15c2C6Ce91b2dae3b11329b1573D907d569ac04',
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
        '1': '0x7B5Ff30d268e284649EACcb5aB8ba735fad93Ebd',
        '35': '0x9EcF2D6697783638C98FF82f92505D8E14229DF3',
        '2147483646': '0x4fd7703838527d3BA3f4EEC5e3d74c90DfB84b65',
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
        '1': '0x356690d4646197059046008be9AF47A09D69c030',
        '35': '0x500F08205d65FfCb23b96F9d458c4Ca9Db65Da0e',
        '2147483646': '0xC538DC9613936Cb456BFDfA5B7Dfd82Bcf041B3A',
        '2147483647': '0x89FC6Fe902D168aBcEF59B9168f9Cb25C64F7B19',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1hrr3l3rte6xtaqrhnfkoz2oyywdm7ywewjsdfvy',
        '1': 'f1lbp4ms7hokgqksafyb4wgr7nckui5fju7byueoy',
        '35': 'f1l3mephi2afbpiu6rzmberd6bnck3puwi3wsihha',
        '2147483646': 'f1fztezlgbtruf6altycc7yczkby4wk7lyrkpgnky',
        '2147483647': 'f1x4fyn543llfdp7g747jxhdr322actoa4ud6qpqy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qrv5gjus32lxapasun3p6hnvnyczkgjt8k8rk2kkp998yg9s4243jawrekxcz',
        '1': 'kaspa:qzzxnj34nsnvtc2af99vklw26u4tkz9rp4a8ft8f3zrfdm2crjwa20ry8fxue',
        '35': 'kaspa:qzugpxltrkcgsx2cdu7a8jvlrl9pyp3c0q3h2qky6fzxzqgc84y62v9unhd9e',
        '2147483646': 'kaspa:qphuut3w7vktx6a0vpcv2sfljrfudqpj4sgmtzhpy2z5d3qwt0tjx0xjlrqua',
        '2147483647': 'kaspa:qqpfps0anxp0tu7fw0lse6lfghv378sz49tl4yp93ddpm88g6lfpunvsnn8wl',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'adbd621adc808088509c811d1f28409a446a1bfed93376feb53d58d6513f646d',
        '1': '02f0dfc4ebe626ad1bcd94bb2780a2a46bf19136afdcf7321805681588bbbc93',
        '35': '4605601f543abbeed424dec1dab3e58881b32734845548eb1dd2f8d1f5445439',
        '2147483646': '289839035bbece71cb4018f9b71cb8afb40e6889ab6ff921ff935c5e8e82f9ee',
        '2147483647': 'ae54650b5298e045b2b43fc6fdd58d1482ebdd602f99a1f8d14cdd10cfa7449d',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqg9yr82zzyauav2hskl9qyh0sf5cys632qk0efna',
        '1': 'ckb1qyq2uzx74yqepl7wxw8cnllpgcxr6vvn6l5qxj4mqd',
        '35': 'ckb1qyq28933nvmjxk2x3r3p8hcm8zn2maq7rf2qtmr87g',
        '2147483646': 'ckb1qyqpdencjkqwky8dx2alu37yphr74jjmkgtsvkd5jn',
        '2147483647': 'ckb1qyq0ag893e323v0575s2ax2dk430wvl5rnuswa84yl',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NBSOSZZECZ26TNN5VHSSLINKZVIGOLMXAQWBOMM5',
        '1': 'NCCOJKTN2IRD2QPU2TOKYPJSITGUUU4X56SBFQ2O',
        '35': 'NDDXHRTAT2OQ57DEMOTKCTK56GMSAJYRUYWLF7R3',
        '2147483646': 'NBS5BK55TH7KLKRUE7ND6FALFAAA4OEM25T2J3BE',
        '2147483647': 'NC5V5VQCN22T7LYXGIXNEZFOIYRJMNO5F6XCTTAZ',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5hw4x0rymhslww06kk0n5a6f5cyru32h0529466md',
        '1': 'nexa:nqtsq5g5j56wx0jjclu3ya45kfp9fphlnz07cwhpehey9df2',
        '35': 'nexa:nqtsq5g5hhyt8glk98xlyjxl9rh9hxymec96yd2sr0wj2yuq',
        '2147483646': 'nexa:nqtsq5g5r4tz3uhesq72pymx0cvs97quczeuk5gxckec8gcl',
        '2147483647': 'nexa:nqtsq5g5sfskqdrt37692p97zqtk2pj4p4m7hjvl6jacszcr',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16T76VyNGJqN82Y8u5wtHDDwn2FpFYQjnFnBSiqae5ang9X8',
        '1': '15xNHxHNAuw3hVdcNenhMQtgcx5C7GrcKJynTLgx2VhZ47a4',
        '35': '14dBtQt1vCTrHuABTseK9BtK3YwrbaYBPv9BTqLyvmcNoLzK',
        '2147483646': '135pgd42FFyY7FE6zn9FsSiKq1suNjMNRS1HUhrapMJt8Tvz',
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
        '1': 'atfauzP6NJgUnevuKBpEvDorNnfPC1DG1kSXkuTLmfzTZxa',
        '35': 'ZZVBNb2qeqV5CBVzY3S2hDSGyfKsVgnLcuqYFZVF3apDAH4',
        '2147483646': 'Y27yam3AiMAtYFRXSYNkx3T4SbNeeVyN8mwZ8568dHKY1Vv',
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
        '1': 'HXgowNAwVgW1cSYBiYk7DRXuvMnDe7ehC63ghyYxCtXcp68',
        '35': 'GCWQPxpgnDJc1y7GwQMtzRALXEShwoDmoFShCdarUoMMuMb',
        '2147483646': 'Ef9Cc8q1qizRN32oquJdFFB7zAVV6cQoK7Yi59Bk4VrhCEC',
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
        '1': 'j4WGyifGGBrAc6a4qgzBP4QmXHiA7ursdxksjfbjuuUpfX5SS',
        '35': 'j4UwoK7ruw8hQgybQnD2zrBm9iK2nQAZD3N38g6PwokjVGJqq',
        '2147483646': 'j4TQS7L2vGCD6WKfLK7XwaSbAVmxqBKNQ4suEgxuYhLRzbPUi',
        '2147483647': 'j4WcEmtPmUiWcwLETad6HzoQqqeby6mAmAmueZskJCkts6CNT',
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
        '0': 'dfc17v11u2rKaj2JbqnY5pF6Bf7tbwPoVt2NPHX4LVXzkZkvH',
        '1': 'dfbWP7TKtwTRGJVQ5KMNttSkvW3hyo8FNR5ZzJ8uhsx7Wwv1w',
        '35': 'dfaBChuvYgjx4ttveQaEWgDkYveaeHRvwVgjPJdZjnE2LhLnk',
        '2147483646': 'dfYdqW86Z1oTkiEzZwUjTQUaZi7Wh4ak8XCbVKW5Lfoir2EGQ',
        '2147483647': 'dfbqeAgTQEKmH9FZhCzHopqQF3z9pz2YVd6buCQv6BEBiWuXy',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rn7xP3kRzriJZ5AxfrNheMrTLxB8LrFa2X',
        '1': 'rNzK42zX6AFxp2gogoqQfmn8rKtEwT4QKx',
        '35': 'rMJ1pLB7yHzMDSp8kPWSvnGkCnptvjautP',
        '2147483646': 'radWESRSdeqMZkKDaRfZG7n8nXwdXMb9CB',
        '2147483647': 'rpXroSy9zJzNSgdix4sN8oUdzTAQCs1sKw',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'oWLDaVvqp7R3FSNHcYtMZeiscceNJHbLJrf86LYcHFU',
        '1': '3MypigCkDVVTnnfLMT6538qtbCUafzrMSwqb4DrHNCFc',
        '35': '3VYBYN4tGkrFdmzWcZ3T4D18K1kJVxGvErbFU39pkSBx',
        '2147483646': '4eQJWFCEWd4yMYW3sg6opAwJJL3w2fsUqoJ4NhmzQVxp',
        '2147483647': 'HiwH11NRnzJTAoUE4T45AJqYu6r3B39yNsE5AMNCGYYE',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x1b08f4ad63b5e0ede887f0791e744d9b',
        '1': '0xf394635e8c7d70185d3e2e68d2527e65',
        '35': '0x39eec4024233c73f4067d319d10aeec1',
        '2147483646': '0x8a1cd64265f01a25c7b629573795e89f',
        '2147483647': '0x325c607dadd9334e7f21cfbeaac041a1',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GD37SZXF2GMY5WLF4JAOLBGSTP3OG3KPQQASNCKV5KIYYZWCWUEC4NTR',
        '1': 'GC3MV2MY4BL6LJ2ACL5HOHJ2S4N3CNXKPGIWT5RL4GUVRIW35FRAV45J',
        '35': 'GCCFCSDTCDKXXMYYRNITCFH4V4ZIFT6HQOTMSSLLOUW54S3EZM3ANS7E',
        '2147483646': 'GCNCGBNHXPM7RDZ5HRWLFCMOHKMMAKAASX7XGVRHB7ISGAY5KOGBSBNY',
        '2147483647': 'GCE5A5YLNGGVRPBQXUX34LQIOFISZT5COQU7U32SK5ME2O2C3XGXPIDD',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xed56642cf22f04e99eecb3b0de493ef0b74dea273dbf6ed25126cfa6b3ada9d2',
        '1': '0xae79826ea1aea1c0547e9dd7e760a4ca571b3ae52de20b6663fac55573758c42',
        '35': '0x8cc805e386b076056e5ba1b3ed18c18d73da5feb422e36afb88ffaa478bc9ed8',
        '2147483646': '0x3a3f504fb8ed52d148ef7f1ef11bfc064066170ae5fcdcd64e5b272901bbcd9a',
        '2147483647': '0x1705ef5d820b2aecfd2fe1a7234da5016896ccfbeb8940b866d4f3cbc1ad9159',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TKceNbwHDK1u7UK7NJQu9GNiox2hXVGBYy',
        '1': 'TUDFSbosDQ4JAVge7Q5DxUeGPYggJzePi4',
        '35': 'TDeUB3jQd19t8NEURVFzmQkAA7vYfMdvW6',
        '2147483646': 'TGTafKNDYi5ZdmUutR1Jtf2hbyuGVvbUiB',
        '2147483647': 'TEePSjxw7nRVSK1h7UomM3EemD2XDNtrWu',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCa32b60d9a0b34ef459fa7793ab9f5aed9612938685125e35a9108edaa407079f5705',
        '1': 'BFC4e45a44f602b492fe9911d05a244005f552e453c3ae23662cec070c2d95d10a9cad0',
        '35': 'BFC65b4573af540203ec787e89b83f9109967087ebef6fa0b7dcf09aa76db30e3d4d8cc',
        '2147483646': 'BFC8de6066df665b2db260a04f9a1e62a8cdc13d1adb726da3f5367f02d1dde1c8e053c',
        '2147483647': 'BFCe1c2bbeb28573fcbe001d1406395eda3b942d51bcc3f914b8272f120e58388b0dd50',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NMFXAuYxkXvFCbRXMHzqjdtA9gLZPBpuFG',
        '1': 'NNGsZhYKdi5i7yRTpDfiFP4JEPGpM8Fovq',
        '35': 'NZA8jAjGeGYiNkJVa4NDJ1RzCR5mb8hYvt',
        '2147483646': 'NgnNYrXSBYH9NyJtSuJzkzukny5MCu4WaX',
        '2147483647': 'NVgYfbYeCg4KucsABDpEhGsBJyHEZXvLV7',
      },
    },
  ],
} as AddressTestCaseData;
