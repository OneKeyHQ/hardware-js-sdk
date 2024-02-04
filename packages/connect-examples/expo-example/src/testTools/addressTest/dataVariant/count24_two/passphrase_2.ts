import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase24-密语2',
  passphrase: '^~$5@237~##94$$@',
  passphraseState: 'mnGZUpnZziAxyG449oZh3yzytw1igfS4N5',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490457',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "13T1MuhCp82D9wVgPYkmCax3GhPCJACPv6",
        "0/A2147483647": "1D5CvnroWLgQ63ycqCXn123JznmsBsazeB",
        "0/A1": "16tt7D2wE9DeQbaDc9XZZ5SiufDjDnjEt8",
        "0/A2147483646": "1KTyinAwkyLosMxXjQkWkzFRJkfnjgYTvj",
        "0/A45656668": "1Cmh97iMMcnRskPBs5iboxNjNhLqPDMaQk",
        "2147483647/A0": "19cGKjuyFxuoRYP28yJZXx3GM56rvTKTwb",
        "2147483647/A2147483647": "1Cq6nXJaLEYUfhabThiSYNuorpifsurJJy",
        "2147483647/A1": "1ELYmf3R3FjxSoBgQFBjsqqiyBLav5osHt",
        "2147483647/A2147483646": "189DYNpHT41QLb8AVnaJK5QMu5iTnaJpfS",
        "2147483647/A45656668": "168VPJTfyp44PFCbsRU4FXWnT2b6EvFD8B",
        "1/A0": "1Kt6MSabbNY59nLropnLQp6nnfh3xXqp2J",
        "1/A2147483647": "17DLxJFUPyEfRBzfYTwre1LyRXDuNshJNF",
        "1/A1": "1DFHqT2hnuAXsVdnfgNnbHJ7puLJtERMoM",
        "1/A2147483646": "19v6kUyE16gN9kLcBpb8GTCcNPecSJyJDL",
        "1/A45656668": "1F4qN2FtomgYJf42ygLq8ufVBwANFQKyH5",
        "2147483646/A0": "15hQmFEGhwfgTaR9u9mKnmBgUCXYuM3V2m",
        "2147483646/A2147483647": "1ErGnGHrcMSYmziibKizNkvGNA98Jz8rJX",
        "2147483646/A1": "12GayuA64MjwPEgZA6jZa5mrnvNrFP7pE2",
        "2147483646/A2147483646": "13f7aSsoRejz1d8wugkn2Re75yS2Bd77bw",
        "2147483646/A45656668": "1ACNZgii5Xv3GgkfeWuqDFeFx8Ub9kzZnT",
        "8974594/A0": "16zx8NxEm5hg2fnuBSA8JgRZUNewMDydrv",
        "8974594/A2147483647": "17hsgKn39yKk3kky2CXm9JvtMKcB6J1xki",
        "8974594/A1": "1HNp1SggbZR2N5zgyY4Fh64fWKhBSHMhoh",
        "8974594/A2147483646": "1NZ4nuvqdrFBDQT9m1VjueD94Ki1CXoayy",
        "8974594/A45656668": "13Co7zCiDnUHLiGBh2h2wcgXGBgc9yocW8"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3CYLeFYQjj7duL1AyWoYf3LHmjH6QKsQKA",
        "0/A2147483647": "3JqaQs6UPa6mEkvkJWHWPvPoAjDzBYvvce",
        "0/A1": "33tgwe1AiPjogLMLqdNq29r7Gj7xLNAicR",
        "0/A2147483646": "3J1jiumi7qaqKxEZcTLgBZyMrVR367DUS7",
        "0/A45656668": "39RWr195z1u62Dw8JGNnxM34uqBK3FKvpj",
        "2147483647/A0": "32Ro81DSacfXruLKM1YS6YLkdUfYEhZtKa",
        "2147483647/A2147483647": "3CxH97A46FB7JnkpvAmyQXs1tviWgxGkhQ",
        "2147483647/A1": "3Ct5e8rb4kD9cBVJhQskqLB5zsq2cEf9Rd",
        "2147483647/A2147483646": "3DtfamAwiBKqvh2Y4L2WSwc4ysdyaeLtbF",
        "2147483647/A45656668": "32DsiA3Emc919aqB3ktVSQHa5N5boBFn4x",
        "1/A0": "3JASF6WzBGAP3Z8ZEH92iuGZUnxuFcPgfB",
        "1/A2147483647": "36fBt6SotaLJPaDfwnoRMJ9Y3Bfy2UgxLd",
        "1/A1": "3P97cEfZzV9T45jAusLoeD3QwgCEhvmCye",
        "1/A2147483646": "32eNqoNpBbqfAVSVNvisyiZdWZjZEi8gZb",
        "1/A45656668": "35KhrXQNKVjZbSMMu93wBpWREkhkdkgfpk",
        "2147483646/A0": "3AHQLrHXGGPAViFY5SyXXRqjLdNToMvT2z",
        "2147483646/A2147483647": "37mLzdSgUyvEWsNQbHVBjyRc3PDz5qjk2w",
        "2147483646/A1": "3GcnR1Whwgzgw8DU8Arc7Za9QyNEJ2CpPo",
        "2147483646/A2147483646": "3B8CTMFFRn9oGbjkCNoe6QQd4oxPhwMVJ1",
        "2147483646/A45656668": "3AT9zPjXK8rrPWfc4LNLw4p8x1KaHftnkr",
        "8974594/A0": "36o6wEYPkvZ4JmDT35EGkkDuVKnd1ywiJ2",
        "8974594/A2147483647": "3Pdprr34fMvLDDf3L6LJLZfKsKufQMjtze",
        "8974594/A1": "3MbZNP7QemDuGCo9pspXLHB24kWKfr5Fxr",
        "8974594/A2147483646": "3PLgJWjciQj9QJkSpAmX2SFZ1CdLhw2Eee",
        "8974594/A45656668": "3GHL839jkj5HKT51hag6Nh6SSpK9JpKqU4"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qmqvykvf6m3n700s6haufg0ehe4puxc4hv62f6s",
        "0/A2147483647": "bc1qzrdqtsryx2juqssvsnk2p6wrt56kypj2jp2hq4",
        "0/A1": "bc1qx8gw52rz3c8k2xt47r2nqsul8sn3dc7ym2d5h2",
        "0/A2147483646": "bc1q5ym3e4a0f6vl0uu4acgqd6l2n4zfmwfg3ejkg5",
        "0/A45656668": "bc1qupglzkczu69x2rg2tstg8rwhkaes92p2s2pmky",
        "2147483647/A0": "bc1q5ngxzq48pwl8nnf0j8cuew0r5l2h6c47k2sluc",
        "2147483647/A2147483647": "bc1qmj3pquqkdyar5c6az4pr6hm80gf9rvd2zqdavr",
        "2147483647/A1": "bc1qd2ksctutmk4n35ev9whzp79q35gauppx5ywgk7",
        "2147483647/A2147483646": "bc1q4w6mpkwanw0k3gjl2m5uy4zmp82h94llmuyzw0",
        "2147483647/A45656668": "bc1qc3s4m96cxl0l83jz78f8l62w82xsxm7m8pyqum",
        "1/A0": "bc1qh47fk6luhprvd95cluayacferyxrhx2m7cx8gd",
        "1/A2147483647": "bc1qyq3yglahng84p3pq2e5usuj6wv25uc7l69l49r",
        "1/A1": "bc1q03say7th36cuhduwawgzgkfauftmkh5zpxwfeu",
        "1/A2147483646": "bc1q50cr8v5uzaq4j54lzesmtvh7l2ecfsd5ctd29y",
        "1/A45656668": "bc1qg504l09nxxz7r2w53qpmjf8xdl8vv8usw7n77p",
        "2147483646/A0": "bc1qcls00ydvxyfauprp4mj53udlql6utxmy98s0kw",
        "2147483646/A2147483647": "bc1qedas0n7qrg2mhfl6plxqet8hz9zhnxu96hjz2r",
        "2147483646/A1": "bc1qnd0m9ggpzggusjth5awa33arg480ht5jc6jere",
        "2147483646/A2147483646": "bc1qf8ywdv8x37m7vn5csfg92y5dfuvha79jtzvl93",
        "2147483646/A45656668": "bc1qgwgs4uwntqupm9azvxzw4m2s8n2mrlaczyscx5",
        "8974594/A0": "bc1qxphqx32vel2e8chnd5mnf8e6p83h5g7vfzkpya",
        "8974594/A2147483647": "bc1qpjcadf5djkmparccpt2zlup54nmxft3njf4zuj",
        "8974594/A1": "bc1qc6dagmgvr8cyen8xjwwmpcfr8lesvkj7dcwlkd",
        "8974594/A2147483646": "bc1qvrgq7zc9aj2p9nxmk5y45uth6200q66ft2l6jt",
        "8974594/A45656668": "bc1qyyx8n6uekurd5knn84f27qf8e9pk572m8kzxyd"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pr9pgtmuggdlkuw6p9vvfkurw5dxh6qygmjfxyj87rj9sz5pkvljscvpvn3",
        "0/A2147483647": "bc1p49svhue6j4v3tpyx4460srfnd6k9hfqflh4tma4scqgel6kad3pq5vet60",
        "0/A1": "bc1pkkz57ahjzwe3mrq3yfcwmqnvjr8hcy48ym0nslch2gd4sn7vrwlqzdqg5l",
        "0/A2147483646": "bc1pnakpdr3zv3u2xd6nay4w38ak9t7axnq23pjq9m3rr3p4sg8zuvaqst23lt",
        "0/A45656668": "bc1pk0sc6096tfjevjku3mke2v27zdmqqh0tql0wpj3r3d52z4764s4qewchz8",
        "2147483647/A0": "bc1p5u998e523y9hx92rqfhclf6altwaqpejzztwmgqx0uum32x8pxescdjafs",
        "2147483647/A2147483647": "bc1p5yyk024jthuc5g4n6x9q88p2d8mnvgp4n560gac9n2aeqznj5f2qqlyg3x",
        "2147483647/A1": "bc1pa463wy6u937xe89mxakuepf2xdzydnlkmdqzsp5q02hmh7ch7y5q2423c6",
        "2147483647/A2147483646": "bc1plwdwuecgsh7d93etq0t3ssxsmk7amrye6evxade3w247v27a7e2qevhela",
        "2147483647/A45656668": "bc1p9nskrp8auanrz7kkkhknft33mhxalj3tynckmhuqn90vsvlda3gsw5t0sj",
        "1/A0": "bc1p7ethql3gsd53cxaw6q8hw5yex4rdyled2y0zcl8v6kwlgjvzce6qxva6gq",
        "1/A2147483647": "bc1pk6ehzd23wyfg9tf29ezn57a84n8p50cqslrtnmlf0xedd43vnjgsp7kx98",
        "1/A1": "bc1pazccryjae7fyhey4vl4lrxax7ft2zfu96knf60dxhmelz87htqgsa2k7uj",
        "1/A2147483646": "bc1p0pp2x3va8gh3t95g6cgekafll2lcpqsee86dccc5jy5pvve4dt5qpu78cm",
        "1/A45656668": "bc1pcqyty8mqt6pvrjpy0nz8xh5xcgxmtjynzgsqx68rxvyhcd2ph0wszm2m36",
        "2147483646/A0": "bc1pjm6x0jnhwkqvr8j23s4fkfxj2gjswjuj3srgdhk6vl4w347yk3qsy640k4",
        "2147483646/A2147483647": "bc1p63u0cy774nuxjnmxl92zt39v0hvxl8fhxxpqu2h6ezcqrphyxtcqjc454x",
        "2147483646/A1": "bc1p4az7zp4qf2amn6dwnspjevhf75q5uvkqjtjvr682akdllrfdwxcswkgm03",
        "2147483646/A2147483646": "bc1pgu6p9aaqp0n99rhj90hpl4ujzrntsjzhp33kxcn8c27uwwxwqxzqtge3kh",
        "2147483646/A45656668": "bc1pyzk0wt3enxzxlgpsuvvry75rm259wldnz0rkyuztnw54deyrmgks4333qd",
        "8974594/A0": "bc1pvk38z9pyerqa9rp35808zsm3js2376cvyuuxka5vpjcemtpcnnjsckz6gy",
        "8974594/A2147483647": "bc1pzuvpuk909zrnqjfaqudwuzwxn85457rzcwh6lzvwy5uu2ttk4ccqvyxumv",
        "8974594/A1": "bc1pdt53zh6ww7udx9tx9kh80kngnmh9z28j84xcttqh95uedyw86vjs4scfhf",
        "8974594/A2147483646": "bc1prlf2ktun984uwxxj7msx3vhs7ah8vwy275dsmxln8kmy5gsvf2tqhd3a2v",
        "8974594/A45656668": "bc1pqkztxudv7kxwauhrpu9gxk47unl6yhnhxxcmlpn96hm3ltr46ueqz0szpx"
      }
    }
  ],
} as AddressTestCaseData;
