import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'one-passphrase18-密语2',
  passphrase: '@CuihsC5',
  passphraseState: 'moZqDJs2wgTz4TY39eXAhhrWGD5fQZo46R',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490322',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "18FZXQPsQVJYDPsY8P6D2NcXTdzHBBFdCD",
        "0/A2147483647": "1C4vHQ1A44JcqPuHFwktePrktKKrKRPHQy",
        "0/A1": "13adpBwpmEWLacmn72gfXSjTY3MDekJn5c",
        "0/A2147483646": "1PoxrpwrrGB5jPLrj6r8voLoThGod57B75",
        "0/A45656668": "1B4sw1AJwe6XSSwD1mZpCjbv6xeFcHjmcx",
        "2147483647/A0": "19vNgdcgLr1FZBJB9QxU87deKwy5Y6aTWB",
        "2147483647/A2147483647": "1MnAz2jQwEe3mmc5WiGK2F91ppJgAmTbz4",
        "2147483647/A1": "1HKcaFKiUYMHZjW19rkfJRhwq6T4tD4r1A",
        "2147483647/A2147483646": "16SD4EaHt8SVoNoLkc1cew9Q6jKfpcFmwz",
        "2147483647/A45656668": "14mdwmrinsDMFV6bxBqg9ps7xYNJtP7Box",
        "1/A0": "14gSXiT7sWPR8xDsTNurPnuT2sCqgTTaok",
        "1/A2147483647": "1PCLwWUskq6YCsVogdfsoyrjBu65YjczMY",
        "1/A1": "19cqf9Dk4taGZYd6oKrAXixQk7KyBzQjDP",
        "1/A2147483646": "1QBLjoy6NUp7xB3C6cM66WfncRQFbwXQTo",
        "1/A45656668": "1HRmwMr6NCPScFPkpQuK7P5Np8GqWyWjbK",
        "2147483646/A0": "1Esh9QViut2jvqXS5Mfkh43wZoZNzxxCE3",
        "2147483646/A2147483647": "1KmNoifBNsYQFMNz3gjJCibHi1vkZiFXFj",
        "2147483646/A1": "19UjaeRpq11wxgq1teenM7euHYojzkuJeZ",
        "2147483646/A2147483646": "1Lckpz7FdBPfU9cLu1gH1AUY4YaU45NzS",
        "2147483646/A45656668": "1FE6PBULi3546TcHxxkfPbiAZzzkJzXREr",
        "8974594/A0": "1GM1B7isZfAMFJA4digXFxMbCWjumj7wnZ",
        "8974594/A2147483647": "1LKVbVCRojpRgaT1J31Dt2gSJdXGGbPEHQ",
        "8974594/A1": "16MzN2EqodXv3j2M5MGmqWHT5QNAuFWhC3",
        "8974594/A2147483646": "1GBSJi9JTLQnDz4cRvv4744xC9evjs1xQ9",
        "8974594/A45656668": "13jSoUDynN6LRBsveNcEwEHffz5sHk4bKU"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "35dYPAyzMouKK1Zn2FyCgBqmAp5HKuMTvJ",
        "0/A2147483647": "3Mwy8WgbLjmXrQCdjHenNrMCGSUdg16vfE",
        "0/A1": "321scmfZwwV7CMiuusrATAfRFmh1Hdm4gN",
        "0/A2147483646": "3Dj6hQWxC4t3cdjKoZhmfkqa155Ak3WwZW",
        "0/A45656668": "3FQuGzVPHhdzsQM9pkFPEA2U236EoLL2TL",
        "2147483647/A0": "3F3otePsp6ehFwG83mkzLuMjmGC2UWHiaK",
        "2147483647/A2147483647": "3Ls9u8yd7A1yA7ZMnRnZ9DSrpQptR5LsWu",
        "2147483647/A1": "3QzNTjPQVFmb3XJhnGkiUTS6vtMJo7QGWw",
        "2147483647/A2147483646": "36p6GyLXsAWJxb3vCAobhMKsUdqZGr3DLf",
        "2147483647/A45656668": "3AfjdveJUaBxe6dLjhGBvuYRFJLKtSnLGL",
        "1/A0": "3MQGjy4exJUL74GGG6DsYQDr8FGobBBTxD",
        "1/A2147483647": "32EiDXP4F5J4YP7eRGNKzGxdx9beaiwmLk",
        "1/A1": "39WkcA5gzhDuT6L4tEwsSwGsyWsGjVK2FA",
        "1/A2147483646": "3LoifAeWJbXqSz5eq2LV1QuE8AUyiSupCN",
        "1/A45656668": "33gvWsKJLnmgPeoTxETEuwcXL8QMpnBeRU",
        "2147483646/A0": "32i8a14ymZ2wjYt2ZReM5P7AjQSrtW52Qj",
        "2147483646/A2147483647": "3GCfggps5c7LDEoMNKc3LW2DoU5mN34oqm",
        "2147483646/A1": "3NdB4sEFtjcebBW8WvNYvbfguXG4guWAnZ",
        "2147483646/A2147483646": "3J3MLHaNohrrqzg8m6iKfgxM8g8dGEa3m8",
        "2147483646/A45656668": "3Jfvhy6ihYa6Hns5x9NfTA4GmF3r2usLWK",
        "8974594/A0": "3M91RqAQkVR6UYeZq4ZK4yeWv8q5Nz9xMx",
        "8974594/A2147483647": "3HfUWSKrHcVCLEV95Fodhnfs2U46gWZZrb",
        "8974594/A1": "3JhXRMkUvmMWXArSFM4XLHNFYBvjGjVpzY",
        "8974594/A2147483646": "39K7JYjTCGvuGXHu8TgBM4B9ZdyyZ5x34T",
        "8974594/A45656668": "3FxjjPj4wWgWxAKR7oD83U6UddSVbd2ycb"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qe40gjdf3nguzcy5t64k7h2vg59al6l207cy4uc",
        "0/A2147483647": "bc1q4egku8jufz6d4pj3zduqkywwr7nyrhdvft72kp",
        "0/A1": "bc1q34yd49hwzg0m9q5wt2mmtrz39jqtv3stephnus",
        "0/A2147483646": "bc1qgm0kn0vpe4pp9grqjwc8t0mj0e8jwe7ya8xptw",
        "0/A45656668": "bc1qydy7fhl8zwzjef402cau3h0xrxv8swldqez6t6",
        "2147483647/A0": "bc1qgecjz7yq9xupg44fzl3v9mehj9nmnwk4lssa4z",
        "2147483647/A2147483647": "bc1qjq4cmlsjkvj7yuujhk3y6e77ww7wq5trqgh8an",
        "2147483647/A1": "bc1qse9fsgnj7dwa7la3ujdqevstvuve788rtn646l",
        "2147483647/A2147483646": "bc1qrgwyyp6w7mshka90emwktmkmq3rhdjt7w9rh4v",
        "2147483647/A45656668": "bc1q8zqfujjxkv8vvgntqgg0w3nry23q6twvcp4x45",
        "1/A0": "bc1qe0vx89f3ms3c69cevrwy6w86vspwymu4j8z5ea",
        "1/A2147483647": "bc1qxen5waxgt9mzhj442ntqx4s3g2rp8c8tvvqj3e",
        "1/A1": "bc1qtrx3ls8e2rt5fp07z9h9g7h4wsm57wscws9z24",
        "1/A2147483646": "bc1qlypahx9jnuq3jklc93lp9zv64dtuvpsg8fkx55",
        "1/A45656668": "bc1qdl6crr5pl0aeq7urmtdw9ptfcxty76988jtvx4",
        "2147483646/A0": "bc1q20l3gr59qatdg6w9mnwshufh5qjmn90fw9hglv",
        "2147483646/A2147483647": "bc1qy0g9755xjgurtk4jdnj4t03ug885mkmavq2esj",
        "2147483646/A1": "bc1q6jeuz7jy0s5tnc67g2gwwgy0u3gfwfwn4gqnpn",
        "2147483646/A2147483646": "bc1qg2zeude7n58x5rxx5ld2p7tr06jz0ldjku3q2x",
        "2147483646/A45656668": "bc1qs74pj6vtyhdygydrzah5777krsm07zyh270lq2",
        "8974594/A0": "bc1qsgqe39cevdpy064rnvvcqw9flnmqnd0zjeewl5",
        "8974594/A2147483647": "bc1qnrgy4k2kp6htcwxs9u7sjlmkkkfa7ffvdjnkha",
        "8974594/A1": "bc1qct74wuul8xey40khxrs27euxegm6n06g4dmhnx",
        "8974594/A2147483646": "bc1q9rk3fmuprcnt9xkud9mvckqz5j69xk4l96cf75",
        "8974594/A45656668": "bc1qda4d82xlsjncd36rwrwl34yt5l6mxwth6r5qkf"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pyjfqxuefk2tf67etgr5p9cgn4g4622ygcxry93srn09lazv4c03qay3plx",
        "0/A2147483647": "bc1ps0hf3upqvymqjlk59q6rejkesemwd67768qhnsfeywpxl53fy03q4crkhl",
        "0/A1": "bc1phqeh23yxvn9pwsl6d54evd3hl0usd5fxuw66hmtmy929srpp6kwspk0y9s",
        "0/A2147483646": "bc1pjussg482p3ke8rxr4yk648rpm2aas37kae0h9cdca6j6c5c8atps2sduyk",
        "0/A45656668": "bc1ps8dxg34tna2ka87uxkamgmp2deefqq5ketnm7pemcyr56vgdfjrqmv9sf5",
        "2147483647/A0": "bc1px907y80lcy9fwgdwcxmnxutvtwj6g7np3yaxrlewnaxeexruj48q5usc2j",
        "2147483647/A2147483647": "bc1pymd44u9nd5elyetre3gwjkkxty7qxj8ftfxctt4v4egk6gj3vxtqtfte6a",
        "2147483647/A1": "bc1pzsfkde9rm4z2kt679g40ddsaqkek8rs3c4g2p45ge5gr387gncesvry773",
        "2147483647/A2147483646": "bc1p9yfljtp56ahzmpdhvgy7cdep54fh6tc9v3eq83c6wva7s9d5ydmscgu2wx",
        "2147483647/A45656668": "bc1p0evppupdwa9kljghgngdfnkly7yk8yef0a5djlke3g9du607wd8s2lw7ql",
        "1/A0": "bc1pl6nem37mu249y2lmqxfll5xyajrts65pd8nsk7m0pnlap92um5tsr2kwe0",
        "1/A2147483647": "bc1pmjhspv9lpendhu29u24jln27fy8p2y3a93dya4ktzdmm2kaav9fqyqedsu",
        "1/A1": "bc1p0hp93wl4qq5uzqt4c5rz0rujhfccylv7npq4jhvd5pklukl88cfqj0tmjy",
        "1/A2147483646": "bc1pp65gz89vv4quav08yvmcjswwc2ag3yw03a35zy20tv8vf27708dq9hv9pr",
        "1/A45656668": "bc1p0lmzanyknp94z4es5ktn0syexfccrzffvum4t6xr6np385k7tsfsvev8tk",
        "2147483646/A0": "bc1pexeqnrsljhf2l96pxfzck0t7zl60mmmzc5nmupu0knpnsdp020zsh7ra6g",
        "2147483646/A2147483647": "bc1punrs6ut9urt9ysd2jgklcgmevz9tsltz04su8lfj58h23ratrt3q8qqlrp",
        "2147483646/A1": "bc1pprxg8hu4nqyjtj7avp4ymgpqk7rkg8dhls4f8yww4pp90d40clcsal7fr3",
        "2147483646/A2147483646": "bc1pc3h89ushuejxcw5q6dse4fsw3ml0mmre9vpw6gzkld5h5md8a27q0admjl",
        "2147483646/A45656668": "bc1pqda7g3uyqddfk5kpksvsmy2k7qn3lgnfsnr7wn4lwhgpnwdhnzdqfe8mcf",
        "8974594/A0": "bc1pjw4m0dqxtzc3tw63d4kplhf3eft5xw2dxvgu2zq35t6v5ynlpyzsy5y5ap",
        "8974594/A2147483647": "bc1pekrpdr952la8tmrhpwueac9ktp6am4mv74wn66e5f044qyykdxcseh9edu",
        "8974594/A1": "bc1pk3ztaav0nsevz43kcjgcylqcv7crnyxxpv739pm7a9tpft8z9ztsn5qpvq",
        "8974594/A2147483646": "bc1pj9d6m9umnjwl52rmn8cnrvsya6fg44tjhhly2st7c2p5wsaawtrs0w5txy",
        "8974594/A45656668": "bc1pm9kq5w2gtpgn03xzrqclkyszs59yyl7jvcn5fglgwuqk89njjlzs58ehkt"
      }
    }
  ],
} as AddressTestCaseData;
