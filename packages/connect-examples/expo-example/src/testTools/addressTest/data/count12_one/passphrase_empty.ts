import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162680',
  passphrase: '',
  passphraseState: 'miDg8hbtpECMgje9jQRxhgvN9kQoA29DDm',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qyr8t5k9g7ggfsmfqwkf5gjcxtpag0xjkyctvnx0ljv8cxe0y0g30qkd85njeekrwsfxvt44z3r5drtgywdwnx0a8p5sak4p7t',
        '1': 'addr1q8e3g3vcs7qfrclr4wt5wwy4krx5cgldthgkkrhtj6876d3e7emjtf98f5nazt6e7prz7ptl2d4pzkfgfx87cp3tejcqv3hfh9',
        '25': 'addr1q8ehn4xcp5nz4j0qkr53t5j04gysld9zefm3duk5cax3wmr9vqjhgysxdyz3ehfcty0nvzp47a3k056dfx6qfw38mhsqp4hqcn',
        '2147483646':
          'addr1q95cpkttns2v0jc6vpmeefjc3n36f89yfnsezezsktqrcd4t4r85luc0n3us789e9xt5tzr9t85ae60mmvj23ctz7n7q02yysf',
        '2147483647':
          'addr1qyj879xfe7ql8kk0tyryc9qg543ha5qf3nq296mmchsk2d0qud7ekc773zxwzjzyn3wj4eggpu25pmnxpl2eaaxeupvsfcwzs8',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '7ZVKIHADZGRZJ7A52B7DZTOP4JXAOPK2M2FQTXK3D3T3A2HFOPUOGKGAVM',
        '1': 'HRHFUECRQAFGZ357TQLLVY7KNR2WKR46JCTFMRW6YGXLAB4ISN65B2RNT4',
        '25': 'QD3MZ27TH7537AKKDLWJU7AICQQWCMIRT3TNUM7LVISUJQJ2QZECIMT66Y',
        '2147483646': 'EHCFACFJUL3INZ7WNZGRJWCWGEEZG76VAYSTVZH6KVTYBGL7D46GA3JV6M',
        '2147483647': '2VMU3IKPKELMEDUIALFRVYYDBZW3BFKSRTDVCQGPZTLFKQYLPZLU4M36VM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x60e800a8839a86be1ca6c0b17ecb10f2a2af8b3b7c5f212bbeb64471c4f00bd8',
        '1': '0x0e9a30c16904600284473a06b2fb3db8a4927d20f12a4d1c391798a091b1e221',
        '25': '0xef40c4ccef00f15147c3403b6b8c2417dfeda0cec170edc1ca182b709a16eeed',
        '2147483646': '0x3c3e505fcedb8bb82c432d1dc0f5d8d84388d16e7aded65817ce339b1568b4ff',
        '2147483647': '0x3479d1223e9612d40ee2bc8d540aff11966af9b09fe97995bd2250480c6ef458',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1AztpmzfQdpZNM5Yshczadx5pzcLfDTox7',
        '1': '12jkNt56fEYrFoAuNwgEZdjFCuu6L1XiRp',
        '25': '1J624maH4iktxKdEkeEdJ7JTFV9aUkSxzR',
        '2147483646': '1F9nThLS7ZLG517vsXAjfx9otPPLMb741e',
        '2147483647': '1PJN7cd66B4Y36thasJSfS3K5EZvAfYgMF',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '38Xegnipu2RhZouctnGnwmDRk2bLXfDHf4',
        '1': '3Gc49NTGVxLodbpRDAHrTM2Uw9svy9aqBn',
        '25': '3AfzaZqwQgoULAn9qieaV5SMh8Q9DYwqmi',
        '2147483646': '3PTfpApbCrLouC7osRAat3CmLDHxWkmU5J',
        '2147483647': '3EVwYDUfFyJTRy27b4Vf4gFei8Q8kU97Co',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qjclx3t2ykepvcqegx8tmn3nwd5ahsswenrvd90',
        '1': 'bc1qtv75pxvw62aad3prkk2sxcz4ynqft7dt0prgnw',
        '25': 'bc1qp7rf5t8yp6439c265uvqlhtgmlgzv8kvgx8fvm',
        '2147483646': 'bc1qykjy6zld2tkez28rgl2c8c63fvnw6g95zjkj0c',
        '2147483647': 'bc1qe9f6haplqtl5khz36pjcrzjwl5ma2tjqup34f9',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1ppskree0erhqyptsx8hufkt98wxvuv6gla8hpep8euq6cex2k4h9svg2en3',
        '1': 'bc1pvtwcttx7uhzksh5pe45fxtp9keps78rhu0qjw3e04xxxsmt0kd7sjqrtth',
        '25': 'bc1pwgh3ah2c2evxur25uaxg5kzxyhcdf7f4vuwjf45ssxjeu07pdx5sz6w7q3',
        '2147483646': 'bc1pgn8zd8gx7tawn9fyuzv2grem2j3hzmvewxxycja2hz6327jg569qfmx4ha',
        '2147483647': 'bc1psylrcjazd3twqy7tgz29k8md6caemv0lfqpj6x5cp0pjy9wnem0q2qtdzq',
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
        '0': 'D5UJ81u33vJBco3fMZxpaHrSrbwCyMejcY',
        '1': 'DNmuHigrHSAFC8e2rHqsGHSkwF7dL2aokd',
        '25': 'DTYdbEErk8SPoXt9h3oR7f6vAtbnUeRp5Y',
        '2147483646': 'DTdkJzUv2tRUAmZuk1qafwAJ734WKagzxT',
        '2147483647': 'DEfXtCPcbmKvnFgCTb3TnMwFAGmsageYLM',
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
        '0': 'bitcoincash:qz6kmmtek6vvly474p65cz9n77xfd9tykutafetr5k',
        '1': 'bitcoincash:qr8xmz3ncg89mjxslzzu4xvh7fnhkeq9pyfu0rc47y',
        '25': 'bitcoincash:qzq5fdv75hh5qr92ws4ruj62w7qqatjhwstn4h4yfr',
        '2147483646': 'bitcoincash:qzehg9jyjslvp7pk36pue5c4pcg4g669kgkk9u4thq',
        '2147483647': 'bitcoincash:qrgxuqea6s503tfp7wmvznu88p5pylhv2v27h66z22',
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
        '0': 'LYVggHGrbF1NxbKySUzkbUHQ6EmgzSo2UL',
        '1': 'LMyokkUSJypaHPC2jGNg4xQ8GSSbf11vJ2',
        '25': 'LYTwJhFZ1S9PqAxiXz6zsEeVW9ULzzdUMx',
        '2147483646': 'LWE5C99Vmex2DczPhYAqqY6uzHRHJN8CFy',
        '2147483647': 'Lf97n3TXB1ZKRT458D53TUkYyTCZatKDNJ',
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
        '0': 'MRTehAWcZgZm6fnVj3kDzizaCtiybPHt3V',
        '1': 'MLhniPsKJ2A7xkwo7gApuJKE6RcKHgm57W',
        '25': 'MWUewTyDE8PCEQ4fXVpkQoCnjKYHzB1375',
        '2147483646': 'MSgxEUJymE8gHqMEaSvK4RZ5VmNgFV4fkE',
        '2147483647': 'MJa7Yhin6LtD5bBqucK85LTzwLrvfw27bh',
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
        '0': 'ltc1q5qzknn7arkxvwf53cy6dnjvx8w9ty5u4ujmprk',
        '1': 'ltc1q3gru0p5tdmp0sldv2uk0c2jt6z40d0hl8fyjwn',
        '25': 'ltc1qejpj2k7e2y0xj8l0cvvcy06auhm8cg32py4xjj',
        '2147483646': 'ltc1qvqzpu7lrzjrr4y9km2wx9tcc0ym6k6cd4qeksq',
        '2147483647': 'ltc1qhzgskddf2edcy878dj92ucsrgu3xzl52vpj4xp',
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
        '0': 'NQGSM97dYfWXZtHu6zfN7kQwZcMz8wdbwq',
        '1': 'NPgUBacxaL3mySvhCLJcpsGB6M5gK8jr1g',
        '25': 'NYaSDK3cgYy1X2VMggqcpQ1PFe3VM9b4vo',
        '2147483646': 'NT8hEvqtpp1TZqev6fcSccTT141g6xEhns',
        '2147483647': 'NN9AjfR5JjGAhnaZFptstKSpSBGjaRDxum',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aapggywhe9bbab6g7swd9m6r0491g6z3ejup0bkug7',
        '1': 'cfx:aamtb3t7prg0ww7pje6xew1npjksvdr8x6k9hw2bbw',
        '25': 'cfx:aatfghxc9t48y98tdum823tf8sw6dwvuhurxmx1y8k',
        '2147483646': 'cfx:aamwjesnwuaj1ndbbschnhj6gxgk0bab0en8cxamrg',
        '2147483647': 'cfx:aajpbcy2hk5jtpeag4990ugvrf09p2ry3ah7xe2z2a',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1l65dl2stwxk4w9gf0vt2mnxhst48ygys50evrj',
        '1': 'cosmos1skd8n4ur086zaz3xqzmsxxh2dp77qtcdk8enyh',
        '25': 'cosmos10dj5g7m7yknvh69wgyndh6hx2yj7jl4qekvngn',
        '2147483646': 'cosmos1zqquvfpfe65srynwstsrmkd0x2r4wh5a7cza64',
        '2147483647': 'cosmos1kk249tgf0vre3uj3x9fk2l57xdq7nf9fhyyhmq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1l65dl2stwxk4w9gf0vt2mnxhst48ygyse55t6g',
        '1': 'akash1skd8n4ur086zaz3xqzmsxxh2dp77qtcdmu55ad',
        '25': 'akash10dj5g7m7yknvh69wgyndh6hx2yj7jl4q5dp53f',
        '2147483646': 'akash1zqquvfpfe65srynwstsrmkd0x2r4wh5anr06r0',
        '2147483647': 'akash1kk249tgf0vre3uj3x9fk2l57xdq7nf9f6lfsz6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1l65dl2stwxk4w9gf0vt2mnxhst48ygysv534lr',
        '1': 'cro1skd8n4ur086zaz3xqzmsxxh2dp77qtcdwu32cx',
        '25': 'cro10dj5g7m7yknvh69wgyndh6hx2yj7jl4qpdy25z',
        '2147483646': 'cro1zqquvfpfe65srynwstsrmkd0x2r4wh5axr2yxy',
        '2147483647': 'cro1kk249tgf0vre3uj3x9fk2l57xdq7nf9f0lvw83',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1l65dl2stwxk4w9gf0vt2mnxhst48ygys8jsgp9',
        '1': 'fetch1skd8n4ur086zaz3xqzmsxxh2dp77qtcd96shxq',
        '25': 'fetch10dj5g7m7yknvh69wgyndh6hx2yj7jl4q2t9h2y',
        '2147483646': 'fetch1zqquvfpfe65srynwstsrmkd0x2r4wh5ad9tecz',
        '2147483647': 'fetch1kk249tgf0vre3uj3x9fk2l57xdq7nf9fyedneh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1l65dl2stwxk4w9gf0vt2mnxhst48ygysu52u4q',
        '1': 'osmo1skd8n4ur086zaz3xqzmsxxh2dp77qtcd7u2rj9',
        '25': 'osmo10dj5g7m7yknvh69wgyndh6hx2yj7jl4q3dlr7p',
        '2147483646': 'osmo1zqquvfpfe65srynwstsrmkd0x2r4wh5akr3dv8',
        '2147483647': 'osmo1kk249tgf0vre3uj3x9fk2l57xdq7nf9fllh8dj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1l65dl2stwxk4w9gf0vt2mnxhst48ygysza6hyw',
        '1': 'juno1skd8n4ur086zaz3xqzmsxxh2dp77qtcdq46grt',
        '25': 'juno10dj5g7m7yknvh69wgyndh6hx2yj7jl4q0y0g00',
        '2147483646': 'juno1zqquvfpfe65srynwstsrmkd0x2r4wh5ag2pxaf',
        '2147483647': 'juno1kk249tgf0vre3uj3x9fk2l57xdq7nf9fpk8vuu',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1l65dl2stwxk4w9gf0vt2mnxhst48ygysjtrvpj',
        '1': 'terra1skd8n4ur086zaz3xqzmsxxh2dp77qtcdsrrnxh',
        '25': 'terra10dj5g7m7yknvh69wgyndh6hx2yj7jl4qljkn2n',
        '2147483646': 'terra1zqquvfpfe65srynwstsrmkd0x2r4wh5acucac4',
        '2147483647': 'terra1kk249tgf0vre3uj3x9fk2l57xdq7nf9f3q7heq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1l65dl2stwxk4w9gf0vt2mnxhst48ygysk2d97w',
        '1': 'secret1skd8n4ur086zaz3xqzmsxxh2dp77qtcd5zd6et',
        '25': 'secret10dj5g7m7yknvh69wgyndh6hx2yj7jl4qmnc640',
        '2147483646': 'secret1zqquvfpfe65srynwstsrmkd0x2r4wh5auak58f',
        '2147483647': 'secret1kk249tgf0vre3uj3x9fk2l57xdq7nf9f4ps7xu',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1l65dl2stwxk4w9gf0vt2mnxhst48ygys99guel',
        '1': 'celestia1skd8n4ur086zaz3xqzmsxxh2dp77qtcd8dgr76',
        '25': 'celestia10dj5g7m7yknvh69wgyndh6hx2yj7jl4qguarj7',
        '2147483646': 'celestia1zqquvfpfe65srynwstsrmkd0x2r4wh5a0jndqc',
        '2147483647': 'celestia1kk249tgf0vre3uj3x9fk2l57xdq7nf9fxw48pd',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'Xwo6CFYgd4TQEMhvgh9jy2XWdXiEQhd6DEdMAGWRWUNLJJKr1or8xjjKswVhgeWDTfeJeEXe5udsJehqvxaHGQvn13tnb32BX',
        '1': 'Xwnozcq1cFd3MrS1nuR1JNUPHeBt2yjfa26WcJDpGMPNEGw2urxKkAReDjmL95nVWQdWF9uQBJtu1HJwQz5iQD4R2WQELRURT',
        '25': 'Xwmiz5Gr25Qf55u67yeVrnKhkByeNLCXJ9vGazWHSMcPT95xG6ESBS8W3yCCuXRsjaStrwQ4wv7gpHvJpjXei5Ce1daWF5QJL',
        '2147483646':
          'XwoG3VN798a9UPJG3jTTs8Ty1gaGaYRc8SrBf97DvLg36k2Tb3AugTZSbMYV4j3AKQMx2weNkdN2JTdCrLsdki4a1S2qHKmUs',
        '2147483647':
          'XwmwmYjMbwpBXMh4vajbU2eWyjzz1LJryWQhyvwA8dUyDzTgkL5tUBa93Z18hAkpnTYneQx39VEDS3qycNNZHWPM1rFeQdCMh',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x4cf1495a7786cEbE16b92671e8Ff98bc710B0A83',
        '1': '0x9132831eb29B77603bfF4E8B57cfB1f861f50e3E',
        '25': '0xd84ad17e72Ef5989Cc854c0a245a63A12044A2A2',
        '2147483646': '0x9B8C8C52B860E6199a0738648395973aFE1b6057',
        '2147483647': '0xFdFbC4041dDB39C3BbE3861A00a76Ec7F801514F',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x9E29B715Fdf15e9aD7CE4c183ae82bd08aaC4f1e',
        '1': '0xcd756f300DD51F74CAde31C431cc26243284F4f9',
        '25': '0x6Fb068E1Dbe1244298af8305d389Ed86E3010965',
        '2147483646': '0xdbd1Ad162BA1864E3ef3Af265a9dD0C155C0320F',
        '2147483647': '0x495af699Bf9b9BDF985882bDb3aa98777DEe894E',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x9E29B715Fdf15e9aD7CE4c183ae82bd08aaC4f1e',
        '1': '0xd8B6eb920F6D3e882Ffbc36563Eea5631E762b8c',
        '25': '0x8ED6043Ef7FD06fb69c51038658E2eC0db5b616c',
        '2147483646': '0xDfd3F060942679cBA698b84C26E8a71073df3142',
        '2147483647': '0x783954f2B55562a29799f0ebfA0137F379ec4F9e',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1qx24etmdkfpaqrxm5daj2cfe6ymu4eh5mbyamyy',
        '1': 'f1vu2ottl2nby3z27mbev77xgy5dwsrtnxtcwvksi',
        '25': 'f1oftf6qyi4yeadmauiukku6dsb4i6gmyhko6e4ki',
        '2147483646': 'f1ys72erbjwe2kscrq5k3dmhpoixtlhmoi7vu6ssi',
        '2147483647': 'f1ebycpqukvtqwo5ky2sfhkpwiamup7o3ignn62nq',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpyzj30sk5jvrh0n6zxwgy8w7h3dnxxgy5yc5jz3eusp7g55wxcx6kcp6hhc9',
        '1': 'kaspa:qrd7h6u4qv7z5rq5463z05f8hf9umv998flqtwl9ph6j9ehukycsv0p8h7kdn',
        '25': 'kaspa:qphaul76y4shjuhdpdyvs2gjx5jmcj7kghyxtm2czdt0w23wrwmvcff2qkm2f',
        '2147483646': 'kaspa:qqcuskxn32fa0jdztv48wxxy8nz0wy9sp3uce5yes55lnah8vfj3x304aa00g',
        '2147483647': 'kaspa:qrz67k4vc5ml0nggphzv2g7l2zgy7vph8xqk7f7rnxkqz4dshzxrsk84hpmfa',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'd7be27229b157122eae4e1329fabe67272dcb4ba186378f5f788f245cc1c10d2',
        '1': '71191a5e9397b1b0cf844671960925031ef075ff9320f803bab350c4c86c2fba',
        '25': 'a2b0514ad1b59478fab2a7dad53a190bca73f230dfb29fac412cfc95399398b6',
        '2147483646': 'd8316b58f749496aba735828c204bf4034518ebea70d7d92697c8ac1c9c4e989',
        '2147483647': '6abdf8ce662df010165f57e3f4b8d73bd593b168ad15e074614b1c1949caf0cf',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyq9qqyurg2k9w8dvn8d62lsf89ca69rqv5qnwd9dc',
        '1': 'ckb1qyqqz5w33lm8w6gryxdvenhcc6ularpa4x9qwmqwmn',
        '25': 'ckb1qyqgfcf3c8quk69r6qyeyftznz70dsczjd0s487pfl',
        '2147483646': 'ckb1qyq2xt6t5ndhymjzwpp55pt5ckdvq3ev80vqjgv5xv',
        '2147483647': 'ckb1qyqf9s7ur894zn462wpdr0xhekjtpzm54l6slakmrt',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NA43KIC4SBMGB2ZZ5AJ4VYXNECALFJQALRTP6HHU',
        '1': 'NCF2XIZSOWKWRLO5BVRFRPHGMIJDAWLILELN5INN',
        '25': 'NBH6CQ4VN6OK3VWNXQUNX2WGTDIUFGVV5DRZEJ5X',
        '2147483646': 'NCTDE7GVEW2X7NF6BTAMBTA7PXOE2TOXD5CWUVJ7',
        '2147483647': 'NC2GMZ66IARS7ZVN6GV5C6VMIBMEALC2YXDSKXPW',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5e47yv33ek75g5j234acq43u8damwre2mp3zc2trf',
        '1': 'nexa:nqtsq5g5rxt6t9mnpfx943l4aat07jntyhfrwfknp8zhcwsf',
        '25': 'nexa:nqtsq5g5q4mm40kzd5pu4tg6s6xxrjv7m5689ykf3d5r6v4p',
        '2147483646': 'nexa:nqtsq5g57ly0fqd6hrefz24zjqp4k5s6xvl57pkpp3udvkrp',
        '2147483647': 'nexa:nqtsq5g5emucd9q54z9jw50ekjc7adkl3jss8z2nvtpgvrr8',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15Zv9wuuj921BLAVX3iKxHN32gZS21hA4KsA3YsWkc79brEu',
        '1': '1rSyKHrPa134sir7KfYXC9xMXV9fiacf4gmazHUJVSutajq',
        '25': '14kk58Q5zaEJkeu5UJ1ADtemFrJ99BSgSsCbjKkgk1sMdoBt',
        '2147483646': '14o8s7MB19cGAf4y5HXSXb7Hx9fe3NHuQQ8o8XYUBH6Fs23o',
        '2147483647': '13bh26UxZFDeMyESz6Kz6nzhzJjpgZogYkjnK13bWeXqxiGw',
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
        '0': 'aWDSucvebPdxdBp3i7SqnhAG7GuHvqm12dp7y624t5b1Xex',
        '1': 'WnkGGzsK2NfrAkAdz4fQhV5axCcwdjDbmTRfQVycmRMJGP6',
        '25': 'Zh3N676v2bwXwvPzxQH7PytVH1cR6bHPZyFojyC4Hqo3Wuf',
        '2147483646': 'ZjSA54Bvbytwx6HbwvZR6SRBaP7KHSWM6uTCwkyVZ4hGohY',
        '2147483647': 'YXzK4ByUhbH9GFmWkj6zJKqDjTHxUxHVTWSPRG6pvWHNDey',
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
        '0': 'H9EfvziVimTVSyRL7UNi5ttKer28NxCSCyRGvA7gKJ8APBy',
        '1': 'DRmVJNfA9kVNzXmvPRbGzgoeVmjn5qf2wo2pMa5ECdtTCAJ',
        '25': 'GL4b7Utm9ym4mi1HMmCyhBcYpajFYhipkJrxh3Hfj4LCdmq',
        '2147483646': 'GNTP6RymjMiUmsttMHVHPe9F7xE9jYwnHF4Mtq56zHERjc8',
        '2147483647': 'FB1Y5ZmKpy6g63NoA62rbXZHH2Qnw4ivdr3YNLCSMipXD2E',
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
        '0': 'j4VtXaetok5FZaQbiqP71fHEshSeMpbiBhmm7FovUdbEG512F',
        '1': 'j4SB4Q2GkQWEbTxA5Rf4EEC2o2Ha5UJbeJWaioFLSBUa2Mfkd',
        '25': 'j4V5MVqNz1WTs9jLJndPqvtXbvcP4wmTi6K6YwaoeczzU75M9',
        '2147483646': 'j4V7kHpL525qpZjWCPcv8Eaz8cukZqxJw3r2kLnbS4GDNLDTH',
        '2147483647': 'j4TvJSoTraBTCm3fgJRifonsYf4pkV9piCCdjXG6ZPdexRkdg',
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
        '0': 'dfb7vySxSVgWDnKvxTkJXVKEGunCDhs5vA6TMtM6Gc4X7Vtne',
        '1': 'dfXQTnpLPA7VFfsVK42Fk4E2CEd7wMZyNkqGyRnWE9wrsnH1f',
        '25': 'dfaJktdScm7iXMefYQzbMkvX18wvvq2qSYdnoa7ySbUHKXYk7',
        '2147483646': 'dfaM9gcPhmh6UmeqS1z7e4cyXqFJRjDgfWAizyKmE2jWDm5QP',
        '2147483647': 'dfZ9hqbXVKnhrxxzuvnvBdprwsQNcNRCSeXKz9oGMN6worZTV',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'r9D1JTDPkWTZ9qfezpALSi2aiTytQ58Zy6',
        '1': 'rKidUHQbms3Tt81XxAXaqemFgAhsLsNKmb',
        '25': 'rnvW6eEzP4dve7UqZ5yp7EpQDZGyGmsUbd',
        '2147483646': 'rBeCiegeAZVwQJj5mXpVCUPp7r3md867Tf',
        '2147483647': 'rJbE86wJ6AsezwWvxfa5LVkwzxxsQgygig',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'FdrzyiRBdL1sNzPYbDdwgMWRfmBn9pS33uvn2vr7NNzH',
        '1': 'Fs9D3kmTYHSGhPUxSSqR1y82PLZpCowCQBWHy8Nnmwq5',
        '25': 'EadgeNarDdbQJ7Pn2XKY7aW5AT2B5qrw54p6oHrj7AdB',
        '2147483646': 'J2dXSUFoaGJTcNgpW1DAkTvsU48LRbTi6WsAp87JMHTM',
        '2147483647': '4PPywjfLFF7goH65Ro7Ad49wz11LZ7a8NtebDJs2wyHe',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x47ae03920bc534f67df801b008be486d',
        '1': '0x4858ff2f9f77d8ecb729e3228124319b',
        '25': '0xd7ddeac86476a1ff08fa8bd23ef32a62',
        '2147483646': '0x147d21929ad4ef6d7c1b80ce8e373e54',
        '2147483647': '0x4097ec8fea4b9b7daabf2d1fef1d4cd4',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GBMVJNK4T6S2PYIPC5XJCWR2TUVEVYNZ6G6KRRZ5N62K6YTN3OZB77BK',
        '1': 'GCW3XMHQYGEWIWT2LQXJSLVIDL6OVDBY5YYLLUKK3PRF6TQ4PX2QVHFD',
        '25': 'GBF3LBUBQKPUOH33CIETS5RXYTIY7JRDSNEBKLV3IOA3THKVE4EG3CBT',
        '2147483646': 'GB4UCHXB4UPEOTAILBRIM6BYI5ZHXXARC5PEASWISKU44ZEYKECFT4VA',
        '2147483647': 'GDLALZJOILBMK3ZLUMLLUKQM32XAQMCBN24YRX4PVZ7NRINZYFWHHEOX',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xbfd0a6d5c3dd77bb27e1320e7ccc39d33f53056592f7165031d2893c07812bfe',
        '1': '0x4c124b471080a0d0d12984c15638a5859b66306b638a257d2f89b57a3923f72c',
        '25': '0xc85905746254bafebc36f1684c4a220f34ea680501304929ebeddd79fbea98a4',
        '2147483646': '0x551b618c244d83a846c36f8ab76d49b163c5244202a02d396b888d3e9248bc30',
        '2147483647': '0x291c1eef951f188406365c0d8154da4cd0df0b465165ea4236d5e33ef61d3942',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'THXNjn3TN6n58cD1Ry6mmzPzbgQiZ92whR',
        '1': 'TPq9c75jnQJ2ZxiZaLyCJTZJ4navYKwGCn',
        '25': 'TJmH9sHce76JPnRGzncoHDDUSyLetYDECM',
        '2147483646': 'TB78RJTnktDuwQrpNhjoav5sDKy7uw4L8B',
        '2147483647': 'TUKjDFGmLHw6NLbYuy4bpt2d6MBpKYtiYR',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC1c5404fc4c215d1f9d0630c61691b588bbd88fd4a2bcdc2fd74689720bb6cfb84820',
        '1': 'BFCff2d2498ce365a4ba6b5e90edf54bb174798540493c15af1910375d958f1ddf8f3f4',
        '25': 'BFC7774cf91db3f17c19ccb8783654191c2519a7041057ca5c5aaa192c715a3018dbec3',
        '2147483646': 'BFCf0960edd2ef00bd36e6b4190d1cd8e98ad4a37a90fe1ec7ef8964b223cda3a6d50fd',
        '2147483647': 'BFC28834bfc0be1b5eed1583b814fb4a698e56850ce3a603eafbd91c57542b6f17ec0f6',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NaRAttMCnmEUBhHUQXtWnNgZyKaoifxx1q',
        '1': 'NcFmfyXgMt2UgYBF7Q1cXVsSnSVbRdTE6w',
        '30': 'NabkPptMvXxqZRkrZwQmR8w5JZwmug4quW',
        '2147483646': 'NcAwNtngKbhVcAEWuTh7AXvewxK4RRRCa3',
        '2147483647': 'NaSr6dadXk3KYNvGdFrGEkLsM66BxAbe8P',
      },
    },
  ],
} as AddressTestCaseData;
