import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'one-passphrase12-密语2',
  passphrase: 'jFhC5z@Dk%ya2edpvkECr~qr',
  passphraseState: 'mwtNPp4ak7Cj3bEdDsFqQ3bHityz2mFAT5',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162680',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "14ue1MTCznXrJV6rF42KzYRxhd9XLFUdBE",
        "0/A2147483647": "12gBKqFkk5aGjTKPBqu8UyzvVQAB38vY7k",
        "0/A1": "1AGCUGZNoatdhbFiiQrdAXC1WxUojKGoZ6",
        "0/A2147483646": "13wG3j2bnh2Mb4Tw89bQLdGBbrigGqFRiP",
        "0/A45656668": "15x8uF3ChUPxZEKNpUvRfp8L8skaZcR8dY",
        "2147483647/A0": "1MwQLS8wkLzdHXu2FLnEc295T934vzoRe4",
        "2147483647/A2147483647": "16GErT7d36xjRwa3RgxmeHsdteRCGFjqRB",
        "2147483647/A1": "1CswuYokZLWXXoYETFCFvonEEdjzo7QQk4",
        "2147483647/A2147483646": "1BmLCGNAmXwSrWK7RUz2aK21zaLj2u9GPA",
        "2147483647/A45656668": "1FFsSjyPxRgZ4QzHwE9rA8pBc5vjcCR97s",
        "1/A0": "1MG2N3oRwdHnWVQyJKNGLFHirYAsprSWwS",
        "1/A2147483647": "1LPjQHaNMss1HcZKEXYnmUynJdFsSL8bhB",
        "1/A1": "1HaVK1xQGR5dC9TsQE7uJ5KDQv7YqLz5mM",
        "1/A2147483646": "1M7vrNpB4YdHadoioY1eUJBArNo1xoCWH3",
        "1/A45656668": "1NVrgW3KGkaaGF5JwBv3KDm55biQXg4JtL",
        "2147483646/A0": "1DyB4vefVWNuMM7hecnMEZjefNh6etttc1",
        "2147483646/A2147483647": "125RFuYyETdTnUNpaYxVxjJdcCURfSWa2X",
        "2147483646/A1": "12T5UEt2ByMfktnQc99z3LGeVqhoivCJ58",
        "2147483646/A2147483646": "1B5ALGL7QCSr7pjKeddd7JFpYhTQVSqj2M",
        "2147483646/A45656668": "14Hi2ppXBoTGDSx7Pt8aH3bsYx3ygk24gn",
        "8974594/A0": "1GwFKRB7x5fVYfpzBuhmJ3KaRNdS7szFz1",
        "8974594/A2147483647": "1CBsk4yQzwNZmYjfM782Bfjn49EaHnQFcc",
        "8974594/A1": "1Cu83axcBLJ2Dmb3utVVMvsimh5w92J9GZ",
        "8974594/A2147483646": "1DSGSwL6pJBuHB5x6mZf6pw8osqPjcpTBP",
        "8974594/A45656668": "1BbQMs8RQat3iJYdz3CpwkWpnDpcuaryfK"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3B7b4H98rmC2GnGgEfabZK8cBxE3EMRjQP",
        "0/A2147483647": "3JCTRDNarbvnz2gL7wN9SXzUPHr3QpVDi9",
        "0/A1": "3D6hnqKrEgN4PeAudKEhLSMLTQFDsGgGMG",
        "0/A2147483646": "3QWYJkLiu7HNA1MGUEn4GNmAXunUHBSFN9",
        "0/A45656668": "3QtBqC5n9F3LHY2Xxdxmvev4sj1K4ps2di",
        "2147483647/A0": "3GE6bv6Mkqk2SayGA84u6TRUNsXopEp4yh",
        "2147483647/A2147483647": "3NpdHStyrJyw66cWHJtoyE1ycTXzMTNxR1",
        "2147483647/A1": "38kA6trmbuDahcStAHkC3r4cnoXSwbfyFj",
        "2147483647/A2147483646": "3HatE1A7VT1Ak6BtUgKhdo1iF5VecUVSWy",
        "2147483647/A45656668": "38EsLYUpEnmsC2Agv31EtY6RX4iosN6yYv",
        "1/A0": "3GMvPtK7BuoUSiayY7pB37L1tYNu9Hy7Ta",
        "1/A2147483647": "38Q3wDX3QXgcDte9bAVyeU1qKmZQfHykiN",
        "1/A1": "3MDeRJh8UPupfYeBbXTXKg3MpRvydVwWxc",
        "1/A2147483646": "3PYE3pjSJkhRTCMXGf6H6sbKzu53oWsoLk",
        "1/A45656668": "3Ncc7iL28G2EUNwTdQNWcKgKAhE5nPcHEu",
        "2147483646/A0": "343vwGqrGRxTtX1Zd8Lz8NjQdQhNj7oY1w",
        "2147483646/A2147483647": "32MMGGCmJ8tr8Z5ei3wanQnde22GjXPwBx",
        "2147483646/A1": "3CDp8L6CP3VnED2EuGztUnBjEzp1UVTWjD",
        "2147483646/A2147483646": "3DojZMvs2T4KmBwK2PUCEa9pzNqw2cNAbz",
        "2147483646/A45656668": "3LRSviu3HKdXi6YtdGLjtCUWzJd4m1pge1",
        "8974594/A0": "3LWoy8fmSTwycP8ucoPVvMohwUuogXFZUD",
        "8974594/A2147483647": "32hkUJQJp8zFPSMHEe2HotomtfaDQmaruh",
        "8974594/A1": "3F1gvC3E9Rf8HehgkuRueR2aA3ajsQExtJ",
        "8974594/A2147483646": "3KNmr6KFWtRnCXnVePnKLEHde4aKeoVK3U",
        "8974594/A45656668": "3NxTGRDWEN41wnCuw4uKP2nSXZsAUWDx17"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qr05zgfhuwy00r2ftyf6mv29avrw4nz5spgfeq8",
        "0/A2147483647": "bc1qpa947v9t9tsxvwdqj438tth5rnxqgqugpdxcl5",
        "0/A1": "bc1qkh8pp4y02euzzve70hcj4xns3d4gtf2vxl4agc",
        "0/A2147483646": "bc1qv85m2ekfj85j37gl9jw7ldnzwefv3w6mjux62x",
        "0/A45656668": "bc1qcwxe6rul5qj3w9f7wp946nk4zyeka7xqrjp4h5",
        "2147483647/A0": "bc1q5a2dqeuqvc5ugvdke5gd9aacyfull6d5zldjyk",
        "2147483647/A2147483647": "bc1qykfevnty7a2uucwhjzr5merjp78q34re4m39gs",
        "2147483647/A1": "bc1qfg5uqmwkux8qvh46msmej34e24trk67eczpurl",
        "2147483647/A2147483646": "bc1qn6425frpzwejxwa5xtd2aqmnpj3qtv6y30a5au",
        "2147483647/A45656668": "bc1q6maxnvpfshxzt400x3m8xzw7jewrgd639qgqe3",
        "1/A0": "bc1q6mh4ndhhamulcpglv6xme3vw9fcq3762rtf8sw",
        "1/A2147483647": "bc1q55h0ppdar5r2k5yflc3cmjrzwsj6t55d05mv93",
        "1/A1": "bc1qd0vjwa98urvf63tvs3vycjx44hdshf7jvhwdve",
        "1/A2147483646": "bc1qf7dnux3a2ck95ylq4m7cjlh9pun28adyrj5sz8",
        "1/A45656668": "bc1qf58uq96ptnmkxu3e73k84zfllzsk5getunx92z",
        "2147483646/A0": "bc1q3n6jj29tlh46af5mrwqdlrw03t60s9kcmhafmd",
        "2147483646/A2147483647": "bc1qszadwafh6cd38xzh39mj3ga8eavcjpqfeesakr",
        "2147483646/A1": "bc1qxmn7wultm7yma3ec3yh29ljlrfm8zptcsgny9t",
        "2147483646/A2147483646": "bc1q5wl7mhrysf7k36t64tuk3xnm7rrjhg2sndyuzh",
        "2147483646/A45656668": "bc1q52usd7stfv587ec48pcsnv5rht560t5mflkutz",
        "8974594/A0": "bc1qt8jj5w9uf6rwdv5l00hv07n7w0awknpuvme4dd",
        "8974594/A2147483647": "bc1qzezey0yaex83hddsm3zvxwecd8q47p6n9hxqx0",
        "8974594/A1": "bc1qdtnlm869peau5kwv6gnyry0ftc0dj98ame3trc",
        "8974594/A2147483646": "bc1qat8segf927f78uswvp8576p2am277qhlxnum7f",
        "8974594/A45656668": "bc1q3jjdulmfse3g5gt76t0smjgxgsatgtlevkw85z"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1p0v2wthygpk8md3gnkwe8emyjrlqy0zz6fsck5h3yc6j4tjng4cnqfnnnnt",
        "0/A2147483647": "bc1pfduzv3u4wcu5u597ajnn2hlvfr567h8v3f7etkf3mh905g2qf87qhh4295",
        "0/A1": "bc1pze0wzmeq39a449q7mv8lnqpfls92r3g9ug0khalj4ael77dww4xslg837u",
        "0/A2147483646": "bc1p8jz8yv7rp9gsr5hst36x77qkqy37sdrlchmfj49d4mw9hmatkkeqxpap8r",
        "0/A45656668": "bc1pwh0xlser850zdxetkgmm9zkstdtkllvg4z5qv0l43c0dv9xlpl5qeg7tu6",
        "2147483647/A0": "bc1p7sjseyha6z2gug6ss3d6efa8ntzglywgdtjkw92908zhr2znvyssxf82w4",
        "2147483647/A2147483647": "bc1pjp85jyykn33g6hlw49at96pjda4hj5v95n5yd9ppzs8telt3pj6qww82j7",
        "2147483647/A1": "bc1p37ha4zwdy39x6fen5zpx8q5wppsv234u4zmdqjquenmydeq3mf9sh5shu0",
        "2147483647/A2147483646": "bc1puqf7lkh6ljp2ezfgwmw00q0yw6ykzf0c9azhlxv2wuqrfwrkkz7s92fndw",
        "2147483647/A45656668": "bc1paunlcatmqxc7gyd2vj3djw3kg9mxltrl0jw2hux8ujdsmp0xgkdq3h7q62",
        "1/A0": "bc1pv5dquwpzz664aj40qesr8834ruadln7lqze4qundjp042lae77gsvf0jrs",
        "1/A2147483647": "bc1pj4wv7dxnsww5wmm2kaepe2wxnvjm2rd8jng8ud4m39824r9wklyqnf0wpr",
        "1/A1": "bc1padjz0xwem9v7fvszl98pm2ldrqmc06e9g5qqeqv3hzyuupe2lwzs0f7agk",
        "1/A2147483646": "bc1pjg9246zcv5dw58ynllp77ygrrvk62xd6lsdy2xdvwdxxtlt8njls84kf9v",
        "1/A45656668": "bc1pq6cmhfm9qda3nplqy8xlxmezatxhdn37v54jhfv0hwcdya72dzxsgshg7r",
        "2147483646/A0": "bc1pg4cct0stsn53c449le0xgy04yhj7x0tj8qz3hlzs3q5a54rpkhlqv0a8fe",
        "2147483646/A2147483647": "bc1pk2mlre5fqfc92a46c8dhx5vrdvdv0avae798xxjwzq2qle7hlydquhquee",
        "2147483646/A1": "bc1p99j4hz7yt8r7zs828temcns3g2psydgs3jmhmyd45lt2vzd7ydhs33llw7",
        "2147483646/A2147483646": "bc1pl93389grfzh75879u9aftrzd7tpp2pl85e6cs5zegnfrangj4vksf4yl52",
        "2147483646/A45656668": "bc1pfccfpd09pp3yas6dz2ereystgt9czusup9k0pmcck6da42lxhmus7tlc2p",
        "8974594/A0": "bc1pck33fmln5xy7kykswjm9vvnzdh66vger9xqjkj6e6yqs7eque7csalwqj2",
        "8974594/A2147483647": "bc1pyey0a8p6fduecwj557sye87kt0tnwz20vw3ex45uh4pq3wh6hqcqzy0jsc",
        "8974594/A1": "bc1phpk6r8dafr0nel0p5x0jxfae09n67gdzcp3hh7r3ykrfsp4fy8zsgpa7ua",
        "8974594/A2147483646": "bc1pw3vvqhuvt3km3f9j6mcg840pvjwv38zejh4t83dkkjjfgjew02wqlqmva7",
        "8974594/A45656668": "bc1pnvu0mt0zh2nwrh84hh6sa4t6nx72vmtav2uz2r02vjmty278v6aqy4emr6"
      }
    }
  ],
} as AddressTestCaseData;
