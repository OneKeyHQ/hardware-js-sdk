import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'three-passphrase18-密语1',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428114271',
  passphrase: 'fhsdkhf^&%#4366ghhj<<>>$$$',
  passphraseState: 'mkXCUesRyVY1hZCemmXxGqEne6Jc7u9LbY',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1KgvAJ6CA8BhzJK1d1CZ32FPTC4GwnrXiH",
        "0/A2147483647": "156sYFB734XCVnikNuugyQBYQbDFoZJgWs",
        "0/A1": "122WK3bwAFC2GrjPCNGgMyYi537dkKEPHe",
        "0/A2147483646": "1Cmk7poAi26J66NNmEp2jhHttYGtJA7whX",
        "0/A45656668": "1PQcBPFKcFYUScYFgyhPNXnHeK9jnLtMF4",
        "2147483647/A0": "1DPC99U7ebY883YMXhCwsyVSroaDrsY7TF",
        "2147483647/A2147483647": "1KAyPpkbEvoCLfJE3be1yka4hYEqtbmvow",
        "2147483647/A1": "1FiNQbpGJREApXyYA7Gigvx2vyK4ud8JYZ",
        "2147483647/A2147483646": "1BKQo2Lhf6DVeXPWaaFNk6tYY43yLX5DDz",
        "2147483647/A45656668": "1AeRrGQZ34dMKLjkZ7vg6yDYyorShqtrWR",
        "1/A0": "1HCpjDgfejrzoukduumQwwCDv5pZcpBd2d",
        "1/A2147483647": "13QeGpqnsa6qEGx15ZvsaEqAH3gnmeKDUz",
        "1/A1": "1P6eLhKvdXuZmse7WojBVdvVzxG2TNvWqQ",
        "1/A2147483646": "18Wrgn2tkwsgFK6FjYZsV4PLScp7F349y8",
        "1/A45656668": "1K5jZjaSGG9WGaKEup4HQMjPqgrD4gHgkc",
        "2147483646/A0": "192bvXfpUXsU2vSsb3hzT65gi4o5NWCvV9",
        "2147483646/A2147483647": "1D6qVTYo1RKTKSxjm7c93EMgK5gmkcD6p6",
        "2147483646/A1": "1LcpQPw9YNb4GXVpJtvbwhd1PtVHjchxET",
        "2147483646/A2147483646": "13dqM5CSyXNM7ErRPxGkzXKDUPjy8weeSL",
        "2147483646/A45656668": "12PBovN6mvC62PM4FhmUbacv4ZQpd8SB8k",
        "8974594/A0": "1C3F9FzCcpDXXMt1RpbRxGzzUqBL1uWWB8",
        "8974594/A2147483647": "1FsFFwS1BbNe68zxwvwV7wDub6VSMDPHuo",
        "8974594/A1": "16nH8Rk6dWxFKf8fX6uD7HhgerdUrY4vtN",
        "8974594/A2147483646": "1Dt7U1BFBVyyunkLqC2zefoyWd9PbijiM3",
        "8974594/A45656668": "17ai7sA89EcDSirTEmXJE3QTM17SJr12ZU"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3JpbbRQJUnJX3rUxurNo7U87kdZkCKXNQ2",
        "0/A2147483647": "3MQK9RPfnGBHuSJgW6Ve9WhnNgNTtVS8Cm",
        "0/A1": "3HjUMC7FGDQfxXsoeQ3z56WCPbFV8q5m3A",
        "0/A2147483646": "36XEv6UyL2aSQFEybX8tcqm9rw6hUYMbSv",
        "0/A45656668": "3LaDmuTyMbp9W91zfmug94ymVHxPA752EH",
        "2147483647/A0": "3QGFpyrux2QYgDccr9wqmdGFNzFAH4Qiux",
        "2147483647/A2147483647": "3KvvqYtKXaskwgNJ2QiNKBfP27PJk41Vji",
        "2147483647/A1": "3NXLxsjHCPfePKq99kHBs2Y7cm4nBASNAQ",
        "2147483647/A2147483646": "3EUJGZKRBiWfjGzt3YbSAqCj2MA1km6BRf",
        "2147483647/A45656668": "3FCZLZB7K3PVrTAh2gqcrg8XD4ofsic1an",
        "1/A0": "39y38p2VT3rYfoxhEDGYXwWu53eJio9bk4",
        "1/A2147483647": "3NFShagdww4SHgqAiTNo29V3Y2eYD4ZZSZ",
        "1/A1": "37w6PLrBTmuKMh9VYgbheohn3xL8BTBVX5",
        "1/A2147483646": "3QCNaThDaGmZB7FYZvpLz6HN2zdoeXs2pC",
        "1/A45656668": "33Nhhvz9YRQo6HRvUYb3XHHxPRBLGhkDvu",
        "2147483646/A0": "3E9FphBzB1S6PmrMdwfqweymiz6RZeDrXR",
        "2147483646/A2147483647": "3ASHMCrF45UvPjyFrYn4oD1sTPGGK2ts38",
        "2147483646/A1": "3PWsy7LugbcB1f7BJRVTgVb351S5pDZHnB",
        "2147483646/A2147483646": "3HHrdVyJV3XVnPUk7pnpmenjVg2mhiLxow",
        "2147483646/A45656668": "3A9c4gi2qWXtKeaN5QV7xoXhH4uQudXFw2",
        "8974594/A0": "3G3tqEt8ToPLs7hDYnCayH9UQ55Mt7VAzF",
        "8974594/A2147483647": "3J7N4DpwJs5jBre3gKBVmQuKrV53xY1Wce",
        "8974594/A1": "3EpJkRi7uEZ5i3KVxbjNPyTAShH4EEz4Fw",
        "8974594/A2147483646": "36NEv46ATdcnB41dNmRyyZPxQn2FnvQmwH",
        "8974594/A45656668": "3BaTNwkaZkzAEW553M3Bn5563d5x6zCaZ9"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qg7tkg6pey9gycfuawcj7f8xrzlnn8zsp9q8lvr",
        "0/A2147483647": "bc1qc8v2d85npaxlcu93e9efe0l0w302dmgmccyh6c",
        "0/A1": "bc1qrmpceq2h0se83yksye7z8j3qyymejfp5evk7wl",
        "0/A2147483646": "bc1q6hmhw26vkp5xfyk2w9rcm40ten9gqtvg40rs4j",
        "0/A45656668": "bc1qp9l4m0zue8kzherynxjqhsn364xhutx3hayqdk",
        "2147483647/A0": "bc1qvgm7nw80xvtttwlx9lkek54kvw7xr0994f9nm3",
        "2147483647/A2147483647": "bc1qwgym2svnhl80eu5mtjq8nncffdk30ahyzmew55",
        "2147483647/A1": "bc1qqu78a0rtvee2403mprm4jhdv7su6k23fu2zk73",
        "2147483647/A2147483646": "bc1qcr432wen6k6dzlfre2vyq3rse3yu0dv8rsvke9",
        "2147483647/A45656668": "bc1qtxankw4n0a4j30cfzz7zv77rzgmtl25m9x7tnm",
        "1/A0": "bc1qkuwdu6cefk3t73dqyrjng4skfkjtatg9uu6gvx",
        "1/A2147483647": "bc1q0zznd02rq98w58majka0a9q8mmg6xfyp2qd3d3",
        "1/A1": "bc1qj6x26lzv5hejxr878hrswzajd0y07u07sdl8pn",
        "1/A2147483646": "bc1q06tq6ernh5tsls4n9527rku9p5juadslw2m2vc",
        "1/A45656668": "bc1qzdq9zt9u4anhk50eyr624wml4vrv06wjznytsd",
        "2147483646/A0": "bc1qlf2ys037ulkxz3p3acvqg4rpask9yk6x88evpw",
        "2147483646/A2147483647": "bc1qu4dnn6q0ecwmev9m2axnhg5h0awtem8e4fs2rr",
        "2147483646/A1": "bc1qlnphj8flpt8xpvmmjrreh4cz3v63scemry28ga",
        "2147483646/A2147483646": "bc1q6p0anf44c9pf6lp9hunqhxd7ce9cu79wd2fudv",
        "2147483646/A45656668": "bc1qm73defjhq38etgrxj28evle9azv8wg3sp4mx6a",
        "8974594/A0": "bc1q8ucjw6k9q4ssk30k96v3xdvkdne2epeug02czx",
        "8974594/A2147483647": "bc1q53tus234q8q6zkafwge5c75cfq0lc287942k3y",
        "8974594/A1": "bc1q96q25mnxjs2gl3gamtlrh4lky9yrp6qywvrjnx",
        "8974594/A2147483646": "bc1qsgg9u9z24h3dk9gzv3k3sc6m4k6g5c9udxzyap",
        "8974594/A45656668": "bc1q3ukn5607evqs7u2fqp0tll53sarmqnnfs3sx74"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1prtx6yta734ufuuez8pazd70el0d8ea2pr3h9cfk3c4uv28mx0kwq5q5452",
        "0/A2147483647": "bc1pe5y2l83s3hewajhs2prktpzjequhuev5dwtn5xjmx2c83v04ulws9n9hr0",
        "0/A1": "bc1pjk9p8zjmjrme0n2l6rull5kw9d22us3t4m8e2pnrhqrtx8c7e9aqmdfxem",
        "0/A2147483646": "bc1pefk4q6lrf2fnez9e239frmv7jqtmmmk3cxpdsvclv8jpvxyuadgqywnqu2",
        "0/A45656668": "bc1p58hm88739gt65etwwtwzp4cp0rp3a8gw4kw0lvm4crsw9tzkkjuqp6ykec",
        "2147483647/A0": "bc1phpjnmtl9sm33t9mswmf4attcphlk9hwl0eekwuymky3ll3lm47nqxy9afm",
        "2147483647/A2147483647": "bc1p8sse4ccvwcxztwfeh0ut0j3ktfwur4f7q2hqwwlqnh03a37ngfms0thnky",
        "2147483647/A1": "bc1peflhvjrayl2evhhwdpt92dm895apyy25sdxzfm9tmgfp6rehpmtqdy3lq4",
        "2147483647/A2147483646": "bc1pv4x4g4x7eslak8un6cc8v7mh7ums9j9valh5ueav0rv799t3wd0sjxr4xt",
        "2147483647/A45656668": "bc1p4jjk0yr5k6232d5wvq428tvsmz0an3s3qvafszjayl0em0t2tq9spf808f",
        "1/A0": "bc1pv4rr8ucdavcmglzpx658l42vmw3ungarw7r2e52qmccnv2n665fqv8upzc",
        "1/A2147483647": "bc1pq9653nvrxqngay45vrjygladpdx7c9qvq6jve4gjhlpcv2nmekyq0t4pzn",
        "1/A1": "bc1prz7x9yk5tf2x8m6h25cvt0y89l9apegy0w48dg4x8a9jakvlj2rqjgnp38",
        "1/A2147483646": "bc1pglu856ndyursnagcaxz7p4r7w8r0dxnfk2yrpzjuapwhzxkyak0s8jfhq3",
        "1/A45656668": "bc1p7mhpumwy2729uk2hzjsdhjr4hxax8ddmhzcl9afjg7kjdsj5uv4sxgnp88",
        "2147483646/A0": "bc1p5ct63a6nhcg74c7c0eys6wfa8epm3vs3eqfnsv80khpgnd7xswdqx7sfkv",
        "2147483646/A2147483647": "bc1preqw303v8hrzwe676wva43mruwvhj5h233c25c4re50d3qk5h8lqruc0pa",
        "2147483646/A1": "bc1pjqgl6vsf4v60apxz5phlxtv7wdvjehv9qepju4gwut599vgypguqkq44uy",
        "2147483646/A2147483646": "bc1p26wyw45xd3kt5gvqmkvm268gj5h6q53pu7emel43gr3ujh8ck57qpjnayd",
        "2147483646/A45656668": "bc1p56lvne0am5t0x53zpyeq0j0tv5r6x6s67pxwp8t6z6zls0843n4sueww89",
        "8974594/A0": "bc1pxaegwm6kngflaj9amcgd2lymdl6jex6nqfpgr62z0fyp2w09d83s4fg0m2",
        "8974594/A2147483647": "bc1pmz5z370qdlpx32sz8jsl6r5kjk69rmw6t85dvkgzndue45hh4gxqdfm374",
        "8974594/A1": "bc1pyuq359l5yx4sfy2pymvfjdyku5rxgh6px34dtk2gx9mdmt5qy5qqpkzjer",
        "8974594/A2147483646": "bc1pdf7fns94ufe5yedd492t5uw6gtp8sunt8a0tsw4xetngk05rk83qn7lq5c",
        "8974594/A45656668": "bc1pznxzkfgapqytff2n3djy6e6dg4wnx5kaqku6ue8yyg4mya3jy4nsz5ffxk"
      }
    }
  ],
} as AddressTestCaseData;
