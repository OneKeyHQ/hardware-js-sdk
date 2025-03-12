import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语2',
  passphrase: '$`%@@`&^~$',
  passphraseState: 'moP2GcZKGrjTk35r8BSRD4JTeQagvuKzzS',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392156',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q8k2kehf7wk7w2udayleh3mrr2eqzt4dspyn5c5jwhe4xzyg07tlzg2kgdn8yyh5gd9dgve8fx6aw8eqrawqu5j83yqs2mw8qt',
        '1': 'addr1qy6avvjtp3gghptrlh3w48vhm8nvrl7qmsalgeuecws22pmyv5j6zjywr7uws28w39lm7v6hm4srwha43dwwyzwd9y4qjay442',
        '10': 'addr1qyq2tgtf8ss4rxjgkc3t7agwftlv62zu3yrjz506u2m9gzsdux5k0vksz9dz0aa0jncyhw6m2lyfdvaf8eque552lwps37sgms',
        '2147483646':
          'addr1qx6g5qetfn3pntn37vd3rpe5am0ne4tymyq8ldejn7lhmtf5tt2plluztf4hfwhjd0shhm39r9gjwqn2l3sd28m0ce4sahdzrr',
        '2147483647':
          'addr1q9k9p40cg8zt8wdzzkhenek90zqcnk67h4yazxp5p6rthx9dvfw70p8curtqlvp56xv8p7a0nhhyfwxrkv4rr0cczknq8fzsd7',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'VPUH3KS4VZEZK6D4HAPNDHWQZ7OTW46S6SLQ5EJOC4R7FZDDJ2EYK7HNDI',
        '1': 'AKSCO3QITLILBQULR3FOG4Y2SMAPCKLZ7AQORZ4WGGQICWKRLAQCQK5RPI',
        '10': 'QPXQRPEPDJOMSIVZIPAUHH5VOKUIMWOD6N5H7UUPTD7YND4B22UWIEICU4',
        '2147483646': 'FBLV6L37NQJM4JQMRE5NEUY6R26OH5V4IXQJDLJZHM6M4GIS4DUOV2A4HA',
        '2147483647': 'FHBPQ5Z3RDGX4I6SEPW2BVPODZWDV5WTSPJ4EZZDKMZPGG3I7MMCSPY5FA',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x5f9f7e0d87b800f0b66088c4256d32493c788dbc339bc4556016f9924764a689',
        '1': '0xeaa71acc6a0ff1f5e43753e7efc18a4cecde48b15421da76d9293bec32816234',
        '10': '0xb5b37ae106a2dfefefcc774ac96c82b6f990cb3e089002fdb9dd10a1be458592',
        '2147483646': '0x00591401ce3292d1eed532667a68ce2697e7bccf14477cb560fe8587a407620e',
        '2147483647': '0xe5a6712f55d8a74893905b4bb423efb0cc0f14596314791c9d25495c90fd9cb2',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1NyQmfY5ZgAXTLA5VgQCPfPgpt5v4KMWrZ',
        '1': '14a9D4m5kYFcXhSUqfqqB3UM11cKXHGXWT',
        '10': '1Jt4m8LjjYNJ5A6YR4UEhwb2SzALgSx3xM',
        '2147483646': '1F4DP9MSTKDDkR1QTgr3XpqcQPt9xTPtTj',
        '2147483647': '1DFkgDTbRTKxLgCKiUraxqweDhznufqK2e',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3MqNybhh5TGkamqecb3uYHqvxXdoRYeUze',
        '1': '3JnC5AVFuqtGyUTsPtUYV9F4cQT9nVMXCF',
        '10': '34X8ELjSvidTJeTWb7Ax6Ekk25vQ7ktfuu',
        '2147483646': '3LTQ9qNWQ8Bk62X14Ndw2K8Sno4fLAqEE9',
        '2147483647': '33g1BfSGhuRKexSC71JaoVQ66DioftzvWU',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qd69qp5qc4m06xry23smh7ndhj6n54s3cwjr0uq',
        '1': 'bc1qxsufrp3cnhelz8k7r7a8zdgskpcfhvrz4jl79f',
        '10': 'bc1qy7274jufqvjl0zlealllwl7ctsg3xfynd9g0uc',
        '2147483646': 'bc1q4qnzxqhjqe0a30f64n3qghqvf8zphak4mf7ew7',
        '2147483647': 'bc1qqq4jzf8dgef2tkk32wr2gpnsgktmedudanvxfz',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1prwd704fqm0jrj0lepnsc0u3plrme6y4hd6c2xwk9dy0cm2y3rugszgap4w',
        '1': 'bc1pgs9clnn36g8ll6wf8v04djnxgcdrnrwty7z05v6c8nw6d4xxe26qvgrq5d',
        '10': 'bc1pyqgwtlurpcrc9p2m34le03l980muqehf5eral496pd8jyl2vy75sjv2yl5',
        '2147483646': 'bc1pdz4xld06wepvr5glkvhhk3yp9jnjvulg8wu7gma38nx3graehrws2w5ar3',
        '2147483647': 'bc1pn9jhkme06j2snwrf7w6uc2qmcjkkdqwrftgd7c255mxc5pfcs0nsmwxrqq',
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
        '0': 'D82bFxiE6UcnCCBBSn6JmLU8xNsC32cci3',
        '1': 'D8CZYhDK8v8CA1LLvLQddVegibEtkqoEhH',
        '10': 'DP9H4zS87C9Xb83TxB8hwvbztMhBUsK8G7',
        '2147483646': 'DPgZ8AitDMjUwcqmTsP3ExRSeAxTk3ng65',
        '2147483647': 'DUCKGv1i5oUxpbekXfZ4B77G741rsiNN83',
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
        '0': 'bitcoincash:qpe86ut8pm0lfxaqx936yfkj4w0s4salw523h3fpe0',
        '1': 'bitcoincash:qrcn0dd0gnfhu6t37uuy88sh3qfdnjwk3uhzltces5',
        '10': 'bitcoincash:qqedruznk725la0nuzvv4sh6v7x5q7t43ghy4gs5pm',
        '2147483646': 'bitcoincash:qph0fz68q3j4v6cd3tx6p7xag3kj87976y88dr3xdh',
        '2147483647': 'bitcoincash:qq60jgfdq2d9sf9e4vupvqc6devdegcj2qfahjc7ju',
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
        '0': 'LX5CjVw27sBMYg3LewxkLf3juJUbq6JKG4',
        '1': 'LVpVyhVJHcnUTVhSeFn1GvZuyiMKVsn54W',
        '10': 'LKnHYM7x4BRyWJUogkqTYT6ETi9SYz1L1z',
        '2147483646': 'Leg6yKhXsiUC8SicD3mj4Y1PUuyZs8zgd4',
        '2147483647': 'LSEtDgCdEHM75ZSvjniSWA6e9nyvVFyASj',
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
        '0': 'MPRS3Xy8UwWSZ56HAk2nSC7bwRqmbvRxj1',
        '1': 'MPNTKEps85FSzyymujTNTCjGWZVHmtzkPC',
        '10': 'MVweke8pgN21Ya4PdKvtg7FZPauDECe2vJ',
        '2147483646': 'MJAnPVmw5ZgopooV26mkDjsU7maXTYCzZX',
        '2147483647': 'MWhoyRhPgZroC7Xm7c2tARsHmGwP8G1rXc',
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
        '0': 'ltc1qt24w55rvn0sfnm48ws3u2fc6kg2vk7eqhqgwll',
        '1': 'ltc1qqk5yp3vget3h8f3w5uey7xtdnkylqv72kqk4xr',
        '10': 'ltc1qqffumg2u5vrseez8auf08lr3p34e5lcrek0a09',
        '2147483646': 'ltc1qczagekctd2jxsgvpu48k3aja60j9qdnstvrdfn',
        '2147483647': 'ltc1qgucvn982ceqd2dxzw4e75a3waw9g7sl036ja5p',
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
        '0': 'NY6YuaMLThkQrSXxtCzTBbSMks95g1gqJK',
        '1': 'NZtyedSZAfWdK6EUpjy4UYHpDPq3s6d2VC',
        '10': 'NMb6jmT9BpWqmhJw42uFkSjzi7MZghtZRM',
        '2147483646': 'NXsS8FuYNzgqxzYVx8rcyfRtT3qjvoSdYr',
        '2147483647': 'NLHEF552kWohVHpJ7qWUkmFo51j3G8Yidw',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqgyhp6ua75fa7v8cy5vgju9yzwg39m9wss3y99ch',
        '1': 'ckb1qyqxrj0g7c9vvgywkv9kuc5vzujljqv3h3qqkd93fu',
        '10': 'ckb1qyqdtnef4ulc643tag3pylnmsxm8w9dn6n5s2hxcnn',
        '2147483646': 'ckb1qyq0fy83lnwc7nda0lm9x3rufdyta0zkxtssxk96rl',
        '2147483647': 'ckb1qyq0gw3ec9wmxuhfmu68hrmz8hxj986snqtq70urag',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aaj639f78tbtr787d88sb4yn2m4rytt33248t84pjk',
        '1': 'cfx:aamer49haw4a03m38fz9uryasgu9vafyveeah1ncn9',
        '10': 'cfx:aak45e0ydv3s244y3d27r8tt3731uj3tj2ybmh82yd',
        '2147483646': 'cfx:aajsnrjs42kwcfgn6m35t7wkupkmh8d6kjybs4svry',
        '2147483647': 'cfx:aas6bwm3kczutcs1kk0tfdmdcy7cf4s0ea5yfhp93w',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1fuejvffey6skhwutm50h6zaecmlu3hpj2hyhkg',
        '1': 'cosmos1tyr37l05xmtm53qnfzr87z4y9yzk4gftxemrvp',
        '10': 'cosmos1qgl7vp5ncg4v9jsc2uvd9htxycene24r8sgd0j',
        '2147483646': 'cosmos1x757ac688rxl7zw94jdmll5r0pqwshf30xz9gk',
        '2147483647': 'cosmos1h3uzndzgwhf44swvmare9d3ughrpj804scx85g',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1fuejvffey6skhwutm50h6zaecmlu3hpj8vfs0j',
        '1': 'akash1tyr37l05xmtm53qnfzr87z4y9yzk4gfttzky4m',
        '10': 'akash1qgl7vp5ncg4v9jsc2uvd9htxycene24r2t92kg',
        '2147483646': 'akash1x757ac688rxl7zw94jdmll5r0pqwshf3za0z3v',
        '2147483647': 'akash1h3uzndzgwhf44swvmare9d3ughrpj804artqdj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1fuejvffey6skhwutm50h6zaecmlu3hpjjvvw2e',
        '1': 'cro1tyr37l05xmtm53qnfzr87z4y9yzk4gft7zn6ss',
        '10': 'cro1qgl7vp5ncg4v9jsc2uvd9htxycene24rltq5nr',
        '2147483646': 'cro1x757ac688rxl7zw94jdmll5r0pqwshf3ha2u58',
        '2147483647': 'cro1h3uzndzgwhf44swvmare9d3ughrpj804grw7ge',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1fuejvffey6skhwutm50h6zaecmlu3hpje2dn5l',
        '1': 'fetch1tyr37l05xmtm53qnfzr87z4y9yzk4gft4yj8wk',
        '10': 'fetch1qgl7vp5ncg4v9jsc2uvd9htxycene24r5dpfd9',
        '2147483646': 'fetch1x757ac688rxl7zw94jdmll5r0pqwshf3umtp2p',
        '2147483647': 'fetch1h3uzndzgwhf44swvmare9d3ughrpj804r90rkl',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1fuejvffey6skhwutm50h6zaecmlu3hpjzvh8q6',
        '1': 'osmo1tyr37l05xmtm53qnfzr87z4y9yzk4gftwzgn6n',
        '10': 'osmo1qgl7vp5ncg4v9jsc2uvd9htxycene24r0tmaeq',
        '2147483646': 'osmo1x757ac688rxl7zw94jdmll5r0pqwshf38a347y',
        '2147483647': 'osmo1h3uzndzgwhf44swvmare9d3ughrpj804cr4hz6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1fuejvffey6skhwutm50h6zaecmlu3hpju98v35',
        '1': 'juno1tyr37l05xmtm53qnfzr87z4y9yzk4gftstccta',
        '10': 'juno1qgl7vp5ncg4v9jsc2uvd9htxycene24r3ztkgw',
        '2147483646': 'juno1x757ac688rxl7zw94jdmll5r0pqwshf3e5p702',
        '2147483647': 'juno1h3uzndzgwhf44swvmare9d3ughrpj804x29un5',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1fuejvffey6skhwutm50h6zaecmlu3hpjvn7h5g',
        '1': 'terra1tyr37l05xmtm53qnfzr87z4y9yzk4gftqaprwp',
        '10': 'terra1qgl7vp5ncg4v9jsc2uvd9htxycene24rp5jddj',
        '2147483646': 'terra1x757ac688rxl7zw94jdmll5r0pqwshf3fzc92k',
        '2147483647': 'terra1h3uzndzgwhf44swvmare9d3ughrpj804kuu8kg',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1fuejvffey6skhwutm50h6zaecmlu3hpjgjs7t5',
        '1': 'secret1tyr37l05xmtm53qnfzr87z4y9yzk4gftyu023a',
        '10': 'secret1qgl7vp5ncg4v9jsc2uvd9htxycene24r94uyjw',
        '2147483646': 'secret1x757ac688rxl7zw94jdmll5r0pqwshf3drkv42',
        '2147483647': 'secret1h3uzndzgwhf44swvmare9d3ughrpj804jajwf5',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1fuejvffey6skhwutm50h6zaecmlu3hpjma48v9',
        '1': 'celestia1tyr37l05xmtm53qnfzr87z4y9yzk4gfthn2nkv',
        '10': 'celestia1qgl7vp5ncg4v9jsc2uvd9htxycene24rk6ea4l',
        '2147483646': 'celestia1x757ac688rxl7zw94jdmll5r0pqwshf37vn4jm',
        '2147483647': 'celestia1h3uzndzgwhf44swvmare9d3ughrpj804pjhhw9',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'Xwnwd7VDH7vAmTEN1KLinRNbsay49h4U8bhiRN6vUnNbaDugvgP4SJW2J3xdCiPYsJAAVypqNSn5bAFsovh8UjZJ1i4cqWiGv',
        '1': 'XwnaseZtxmc5vQnHkugWUpirqgARP93KmE7x42air2p6icZQiZjL4P3f2R1os71ForCi2xgEvaKKy8YsR1VcZ1c92nWUb9waN',
        '10': 'XwnoRawo3k7VapZ3CW1YcpWY44kkEM1LfUgBjR3GDMicK2VPq7dZAxMG61qMutVNjw4qgyC7w6WohfMxm196SFKe2nwkR6AUc',
        '2147483646':
          'XwnCk1PTqtF32bcGBjMsSHJ8NYb9x3FjiNdRA7gUJCb3NacApNB3xv5VqHaZvW2qXKUDCMFfH6vYkd2TaPcyk2Dh1nqXmtEzi',
        '2147483647':
          'Xwoox1N9KVUcWkcgLNZaqPHdJpnEcCT3sJY1xXMk7S68RhjJf7EWYDeMm59GCESKrZASXSuXUDDdkaGEgzY11eEJ13hsYxMAP',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x2079f77Bb051E7608fa5541ABCc313E2C4c99fD9',
        '1': '0x9B15E50b2c35B4343bc1741d91704f0B90FDDBA0',
        '10': '0x2dBe941102C076DA417408FEf96E570136061A22',
        '2147483646': '0x68AF8A72A816256f011a24E26664da164F720D0F',
        '2147483647': '0x2989930b46E7F5Ebf9FEddE2169579c72311aac1',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0xf0F56C62EBec6eD5AC23A38dA0B2cAe9CA518D4c',
        '1': '0xcf58fEE71eD5A6c5A2C56775c511FcC37c874c9D',
        '10': '0xC54C688F1dbDB703B875fc6083502eBB112edB4A',
        '2147483646': '0x27c9102B179e1EBF01D180dD9a1dB76D343bB333',
        '2147483647': '0x75c83beDd22FC1cF64AD7910844c6A7640BD93e0',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0xf0F56C62EBec6eD5AC23A38dA0B2cAe9CA518D4c',
        '1': '0x0FB97b178DD51c38bd9aF0d66bda125254194518',
        '10': '0xe3849b272D986BF27228384BCb7401Dc534f413f',
        '2147483646': '0xd8f59fCD20c8A0A5B8123a7ac4EfA3e66b0c0A3e',
        '2147483647': '0xee36f0F2018dC56DcE68F64fbd0C40a15ed70954',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1tpanxxjngzxjhcgfno7y2sgj7klzj2exmgl7iha',
        '1': 'f1nb6jypcps27chah6ypy3ps5sbp6drvqpbkih2lq',
        '10': 'f145ix4h33eicxjf6qztix4hp2lalimvkiycw2ydi',
        '2147483646': 'f1ibdrjruqsdgxbrq6vmvdznq5tc7al2h7k3zzvyy',
        '2147483647': 'f1fv4bm5g4rgvkpa6pc7pbbgewarvbu5szc6dsxvi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qryltk6t6pl2agy0v7lwezlyv8egz7sxmtftfwlwphe0y7095t34wtz6pwygc',
        '1': 'kaspa:qzwf5zddnl64g8aah706j4q7pks2g9t797anx8mstp2latjuc92s2779zh8ms',
        '10': 'kaspa:qzfmv76xdn9an9j6an3yljv63lhc0vgu8ecrhjv3vm254p4za27ssavtavzke',
        '2147483646': 'kaspa:qzt7f67w4z3mwt8wmgdn7ndhjkcyl34zk884sezzt6lmes4sxj0h5ejk9zwss',
        '2147483647': 'kaspa:qzf362e66ruxwy77hknyfqr7jq6nwrll3rx9x4wnp5pz8qkc34ysu87rtlrdv',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '05f4a4c3ade3cd83edc216572386cd43cfdfbaeb1fcecd951559efd15930553c',
        '1': 'c4d4eba446566bf489f8cc7f05f351af00dc65ea6efbc5b622cb284e6870268a',
        '10': '0f262a79e8358f54b12521c64424056991f279e02f3002ce8792939b7bb5f85a',
        '2147483646': '0612b8f5f22c39befe2090bdcd70f9cc2439d41e4e192f7046f28d49f5944b65',
        '2147483647': '6bb5cc2198202ac3825ab7da0f444a5f17348b3366b69daad8d014db423704bc',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDYQPQTYL2T7MY3VQDELJDPJZV4OAHQICCKP2F6B',
        '1': 'NDU2ICPL47A4BDNXMWWT2L5V3CTWK2SO67P2WSNT',
        '10': 'NBGK63TXIEAJ6JUJEJFSCII5JH5XH5XGH44MCCDB',
        '2147483646': 'NDV25VZLOQXFBBUAVPKLKRVX2FWGKPL25V6KAOCT',
        '2147483647': 'NBOY4RZRYOQBUA3NQ6BF7C7XZ6BMD3RJD5MTL4BL',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g530c25apqwtna23ay2hwkg3pljwayrahjlre4w7j2',
        '1': 'nexa:nqtsq5g5ddxgge76jczsve4mjkhpwwr49w47qpxgl48vtlma',
        '10': 'nexa:nqtsq5g5p40x3y30mct494hfwrr4kehnrqsk05tcp56c6ryg',
        '2147483646': 'nexa:nqtsq5g5xa2gwg3tp689v872sawtez3fmxvmfcwgfhx3ln80',
        '2147483647': 'nexa:nqtsq5g5jykp2mfsc2448e2z6dpufpxfxtxw6nqsvfet8yzp',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16d2cjEEQqGhH2iNJAZdeUVkV6KgUW6c1G5e5LzEATa7s94w',
        '1': '12x9ZuHZHDFGcWA7YpwBfwNWqByJXsxB3K2Y9dCcqNJdxFX8',
        '10': '14DLQRC3YTmdcfUt8Z8qjJuHgYVhgVuhNwWVMzYutfZLgs3c',
        '2147483646': '16QPRGpQXmGB4aFDHFbuZyDVuY6iFnZwzNNVqDrG9dYcSByB',
        '2147483647': '14oXctMz1AB7nanvLeKWiBFvgtbpJQQfKdYY8TQM9dDTmqNu',
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
        '0': 'bZKugwFLHeL4KjgppxkXypsiX39kRFCwxrJ9mCjUjYZGXdg',
        '1': 'XtSrrzaCfcuPoBS5VLJZShe4cgmoo6mz1oCE3R89eH5MzJU',
        '10': 'Z9dhNu4Tv9GPxWCfDXxcpEQuyDAxR4JKeH9SQmRCwXn6HMy',
        '2147483646': 'bLgiEXRTDdoqsGXov12TUYd8xpBXhiYw599ue4mTuX3qxDd',
        '2147483647': 'Zjpur4zvcYkZspEsJidbgb3vKKHaKZGGLKCCscrTuBuBPat',
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
        '0': 'JCM8iK3BR29b9XJ7EKgQH2bn4cGasMeP9BuJiGq6Am6RhGm',
        '1': 'EXU5tNN3nzivcy3MthERjuN8AFteFDDRC8oNzVDm5VcX49X',
        '10': 'FnevQGrK3X5vnHowcttV7S8yWnHnsAjkpckbMqWpNkKFKkC',
        '2147483646': 'HyhwFuDJM1dNh496KMxKmkMCWPJN9pzNFUm4b8s5LjazznU',
        '2147483647': 'GNr8sSnmjva6hbr9i5ZTynmyrtQQmfhhWeoMpgx5LQSLE6X',
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
        '0': 'j4Wwe3SD8RmWFg79bcVxKMUNb9rQcH67dehybHc3C3ShEL5Az',
        '1': 'j4TGkzcGTJ9Uq1abLsAKsNwFMVx4ELTyCgkvVMtFaiMRkRZCq',
        '10': 'j4UXwq8AwZQ1C1jv7StXXSJn8MJadV5vj2PQSaFbsmegT9jNR',
        '2147483646': 'j4WizqyoJYhVjTegSbazbGy6LaJBe4NaydpGT3UuE2cfiuHBW',
        '2147483647': 'j4V893bLt26QgBfE9eyiCRB8mMegk6zRgy5SVLiTK2cLaEdss',
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
        '0': 'dfcB3SEGmBNkut2UqEs9qBWMzNBxUAMVN72fqv9Cz1uz5m116',
        '1': 'dfYWAPQL63kjVDVvaVXXPCyEkiHc6DjLw95cjzRRNgpibrLYo',
        '10': 'dfZmMDvEaK1FrDfFM5Fj3GLmXZe8VNMJTUi6hCnmfk7yJafaE',
        '2147483646': 'dfbxQEmrwJJkPfa1gDxC7715jndjVwdxi68xhg25215xaL2NQ',
        '2147483647': 'dfaMYSPQWmhfLPaZPHLuiFD8AZzEbzFoRRQ8jyFd715dRfTqa',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rLZEodVdLKRvUmG7MEFFiqoVR8mGeJQSDx',
        '1': 'rnuLjkjSGZyGEogDq1vW84HCgZKTAiL95h',
        '10': 'rL4wcnVjGY8CAzMZdHDZKSCiQ3qcnoMFkR',
        '2147483646': 'rH7E7m7nREwxgXg3sK9CHnmivVC9fJi6Sp',
        '2147483647': 'r3NkQNBUPYLWEzUHeR7tQVdzwY6k4VPBaW',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '69XRUrgavi7huZbdzJFwHbH2kAz6qgozU2LzQRP5sM47',
        '1': 'Gveh9t6vydu32F1A76kNZm3bCgeeMffNfbqpRqRECcEt',
        '10': '5YMr7JFPD4FMp3wBYoMJi2Uw5ALu7DxYJMv65SMDfBpP',
        '2147483646': 'mWBbVvKXe5U7spC1HfLh6qyCJDFkaSvGzGFLwxyeBWC',
        '2147483647': '54Dn9mBGJKcZ4kBS15cuNgK7cGAX4B4PNAaq8bAZwBeu',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xda5fe1d6154543d2e4d68a07163e95b8',
        '1': '0x5d470545b09774c91468ecde12d1e01c',
        '10': '0x9f3192b2ea88fd26f7bc4d2afbc7cf4a',
        '2147483646': '0x1a07ffe1b5838028476d06903f54f402',
        '2147483647': '0x869a721ef49fb83f4f6ec8bd71aa8bcc',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDK3LVBYSABWONCBARK6SDMCBETSIIILFQZAQTUEJEL7Y3MVASBQ7V5U',
        '1': 'GAD7MKWZGWTXP5F6GI3SBDQWDAB6FBOP2NNBKKBWL2I7BY6CLVU6VWHC',
        '10': 'GCMKI56XNYQP7RZ4PCHTF7VDMDAFTUXZEOKE4EGI5U2E454MU7DPORYA',
        '2147483646': 'GCDEHDAWTILOFYMACBHKVPOTOQH7Y2IKO6K7MPFPKOGNZKDBDSKALIXY',
        '2147483647': 'GCLM57SFODVQ46BPCBNG2RSW5TIEBFFDESOSD6XEL2CQ2XYDP4YJZRJL',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x795d640b8e8f775178c5e342f57bf6446c7412ad849b44663bc047d22103cab3',
        '1': '0xa51edfc64e22847cf238026d480ec4544439b4963024bcf031af535f7fd44e0f',
        '10': '0x71b616f4c8f9f0ed1ccf6f6ee9e9525e8f3c2bb1515284b515d14b9019797d0d',
        '2147483646': '0x67ecbdeaf0c149da6bc06e8d3b717966ebb114dfa44835f0738df7979eebdc70',
        '2147483647': '0x7b251448e1d628206ffa40d415a12d0c35b2b000ca488521ef31367b7b89b0ff',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TSdDKfQXUMd48h1TkwfYJRR6rXrRTzN9Gq',
        '1': 'TT5eRhYioxFZLG1DxgR9ZYMqLmhXCU4RhM',
        '10': 'TQKwSjNPb44pEeEbZf5SKmunU1YwrAoxxd',
        '2147483646': 'TJzKKuSVGSx4DYBpuNs9YZDf28ELAu8bG8',
        '2147483647': 'TS9XAR3tKoiGMdDJm6ijVCgdvt6SmTLbJY',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCcd484bb0ba4124e9807036bd75d061747fdf3ae354c88a5ca5e376d41c0076a0fc4b',
        '1': 'BFC7b7e6512f23b452be033c83ddc5e117bebf7d68d65b69dce9ddeba6eba24edfb1ded',
        '10': 'BFCb129cc97a1064ce0f12074af5b4bb5ff372e005e0c5e8cb2aa15da326b3d3af8ed59',
        '2147483646': 'BFC88fbab6fad925c6f49ff010d8108849f4fa8d5fabb9d8a58188dbc08fdd0a7019bc8',
        '2147483647': 'BFC07d877cc034c72b678d8cb9d0f8221138b70435e6ef31bc50610e478dcd41216fcbc',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NggbA72hXzwFjga8vGc6PrPTLYp7NkNNBo',
        '1': 'NTJtmSioanZ7DcYeCfRxtg4RfpWLrbZdNf',
        '10': 'Na34R5VHTTQdZvCHBoppSN9kL4DCYx3VT9',
        '2147483646': 'NXtqCrCTDaX5y34LT7TxsvXVFQZnH3TNC5',
        '2147483647': 'NL6tZahsbZGpGPzviEAaL4wLyDMf6vg6aw',
      },
    },
  ],
} as AddressTestCaseData;
