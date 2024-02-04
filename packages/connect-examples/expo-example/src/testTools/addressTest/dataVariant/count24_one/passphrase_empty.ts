import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'one-passphrase24-empty',
  passphrase: '',
  passphraseState: 'mpZyZrARXurTXC6fhzHdQzs4xVNXCkCbxW',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1BgNqbjKsGzBMhrAhMhkuZuPteRknqF2Bh",
        "0/A2147483647": "1A5krjSc3ANe9dC1GRkn7vjTnF2dPsFd1C",
        "0/A1": "1EV6C5tmreE46WQ8v7EFSXsQAgs6WrUhD3",
        "0/A2147483646": "1CXXohCHpmrcN2wyF1L9RR47ucdH5W3Jve",
        "0/A45656668": "18UcFHeL8Xn1KNkHbFRUUW1iUqKE5ucDYV",
        "2147483647/A0": "1KoPbS3STpwGR7X2wbYatQdL2k19W9uipo",
        "2147483647/A2147483647": "1PuLknUgnxxco5ecLLuRsdTojmxZrhBgX3",
        "2147483647/A1": "1AQvQ6fejjfmnC2b4Sa8yGaxBAru7ZobDu",
        "2147483647/A2147483646": "1EoasJHc4EGdF9br2wD9zJycgP5L6yK85H",
        "2147483647/A45656668": "1GSTH56E9hwSCQgdYrLLbLvez2vWJyLhgd",
        "1/A0": "1CAE1mWdDqJxNYTjoSRFerz87xBXeAaW8T",
        "1/A2147483647": "1DPSPF1x1tfjJsjHPbYbLPbLHTYoQikNrZ",
        "1/A1": "19vSKoW6rqHJrubKL3fNRhjoE8MmaarTWD",
        "1/A2147483646": "1GXaHbMnk6kJDjJ2vs97rbrsenE6Ke9L1w",
        "1/A45656668": "151DhjSSi1PRbpH4UDTTJTU3Sm3mgTG5Vf",
        "2147483646/A0": "1H9Txoy6SvXtxqn8g1P8vrmMZJFe3gumQF",
        "2147483646/A2147483647": "16TsFD6zEzrCRaBgFSApkjfgBwne8yHiSk",
        "2147483646/A1": "1Uonnjjyr6u9uoKMCCaqNUX5r3towF5VW",
        "2147483646/A2147483646": "1EgegMz1sfUtu2tKSSRouQTp9A3Snu9r7A",
        "2147483646/A45656668": "1GTwcvzWJDQLPZTGqUA5ZVwS8NJ8X7oR3T",
        "8974594/A0": "18dpecgi1Y74kjxrD8aieHRRTUKeHmQAq5",
        "8974594/A2147483647": "1FmBnTUitfVwsoXXGXMNLEnPFRRQCqNpgY",
        "8974594/A1": "161EHfj588h8cf6pYBPd7xW4BpWsaNnmo9",
        "8974594/A2147483646": "1F5Ba3iLonXtBa5A1KTYYcFhLk94oBitJQ",
        "8974594/A45656668": "127ug4bDypUEn1bdhkpmrAJifgirtP15st"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3JPMAcF4bagTsRMQJpVkDFAoNqGYkpAmQB",
        "0/A2147483647": "38jXoF7gVTWv8msGpcDRJvSnYCLsxKtMw7",
        "0/A1": "34WM7MsVG1oSPMzj7A9FrgXqqGw2ZLhw6M",
        "0/A2147483646": "3FHKN65MVT8df37HZijr8vSKB7bv62XyU3",
        "0/A45656668": "37Vng75k9XHR6DEhE3Zxmuvh6TstBAXfPD",
        "2147483647/A0": "3GuHk2xBwti7J5ogwF3BBnFdZjc2b5oKih",
        "2147483647/A2147483647": "3QTJq3T1C5EsGGUgvYgmx7rBqn5ziuJtMi",
        "2147483647/A1": "33PQ1mMzjqjv2fQ3C42sBigfcc65Dk8dcY",
        "2147483647/A2147483646": "3BGJBMWUjeEob5zgB1MgmDWuCbSSDVpgVb",
        "2147483647/A45656668": "3QQkkP8NWtR4W1r8rkw7HH9QjiApFg4aLX",
        "1/A0": "3LpYy7VHBpEdjB7KwMhkrv39GmMWPVGdTJ",
        "1/A2147483647": "34bVWnnk3wGq7oxjvmpBhZu61U5ichzDjm",
        "1/A1": "3FEJRJmnVetjyxwhPbQZQMSo7Y7sU4KfG7",
        "1/A2147483646": "391XozvcxK3V4WYGQKMzkqk2wHYxMBwY4i",
        "1/A45656668": "3Q4XYUW2CyJ5PmtW5z6e6CK7iCokTSChJ2",
        "2147483646/A0": "32jUxGS64QM4eH9fRdnQ6hZvYj7QCG4DCn",
        "2147483646/A2147483647": "3GRvkThEfHyFUk1h2fq3uymCeo1VgF3rH3",
        "2147483646/A1": "3QcxBoV5957e121DQvayG3ZaCUzzujh9WK",
        "2147483646/A2147483646": "3FbJAACvq11g1fyai22fJjgKE7LWVVRFzk",
        "2147483646/A45656668": "3KjB31QVfdZx1UP6XbtZzLA8PuniqBnXkZ",
        "8974594/A0": "3PQqXbwBRMrnEBRBhQdRFY5hXhLdwFfNsQ",
        "8974594/A2147483647": "3CiXesP1PfZF3eJdqSkyva4toSSWjSWt39",
        "8974594/A1": "3QYaMmcujWDYssh62qd6TxUST2iiG3z3RJ",
        "8974594/A2147483646": "31mKeKz6QNvf1zhyPaEdS524fxGYrHHMzX",
        "8974594/A45656668": "32p1F3XSmcjEfuj3ZHcsxWY55yuc5MMCep"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q26yy0m6ww5jypvk4ldf9wwyhthq8qje6j3y9tf",
        "0/A2147483647": "bc1q0n8pc6jp7s5wsyt5qkzq5wrcaqh7sggd9y9wwr",
        "0/A1": "bc1q8c8rm6udnk7e2vqpspzrgq0lnzj96eyc6698eq",
        "0/A2147483646": "bc1q0npmprs2hlnchgrxfy0qur85u2zse3aq8hrwm7",
        "0/A45656668": "bc1qjs9pclgl7wp8m5xptdc33nxgfv2efax3ssc8dj",
        "2147483647/A0": "bc1qkzqnsu3nzl0gn3lrc77ahtp46yx88hfkgv4te7",
        "2147483647/A2147483647": "bc1qr4t4mn4qcvq0z7zjwnfqcfz58vgv3vt52pq7wt",
        "2147483647/A1": "bc1qardrzc7zhj9ygteqhwszem45ezvglks6vdzm2k",
        "2147483647/A2147483646": "bc1q6d40ah49ln5k6ywaum0mqw677u6rukgfkkc7e2",
        "2147483647/A45656668": "bc1qyastx54g0d4ftgdwwcq0mes37hwdepv6xvuqgh",
        "1/A0": "bc1q2dkvxmefq0ckeqsw6sp674lfjgswl874q7dwmh",
        "1/A2147483647": "bc1qw95u2kpjgsndtsge028wu4q3z7lccv20u666pq",
        "1/A1": "bc1qnxjnarjtnafmra4pklfju4yej4az7le9krldpd",
        "1/A2147483646": "bc1qprftq6x7llq47vvhfgdzmkhlmqjm3vz87affty",
        "1/A45656668": "bc1qwvkp53z0jjkzm4q7tnmvheuhzp04n2puzch2es",
        "2147483646/A0": "bc1q9pmqj655apevkyex27t50te79f0emjppqznrj4",
        "2147483646/A2147483647": "bc1q5yedkfhy6augdqfnsekzf2wg8u5hqflzg438cf",
        "2147483646/A1": "bc1qy4vdfek7m439pqq7p8l0c93maf9w38g8udzj9l",
        "2147483646/A2147483646": "bc1qe6v0guelqhrz9wfjc9nsh342cuqqfetu6jqq4c",
        "2147483646/A45656668": "bc1qhdtucu2683aydju92ws8umtlt74t09zw5za64t",
        "8974594/A0": "bc1qux74lrfvp0fgp609jzlav0ffsshl5vn40mh8k6",
        "8974594/A2147483647": "bc1qznrfe0cuzy4yrdphly943vcq7mtcgwcgl83gp6",
        "8974594/A1": "bc1qtfgu3zvgg0asxfay2uyn7t6w4ym4na4q0n0jhr",
        "8974594/A2147483646": "bc1qg4m4u0ssl0xfh4kkxcm5q5fxytmtxss4vkqgx3",
        "8974594/A45656668": "bc1qc3ztc34xwwdzga0sfxegjgju8p83ma8pglcj80"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pcjrym9tnedqqac8gyn9k65xjeqw7zcklk80yp3djx0ekazdm8vuq3g9jah",
        "0/A2147483647": "bc1pk4f6mnnqtusm4a7f4rdmz5w2ssjydt7zezxlt44f4uemvmrr2h2su8zcyj",
        "0/A1": "bc1p89yehzcl4vg08huuuzh500huzxuzu3ww9adhk6dc0x6hguwz2x8s29vwjw",
        "0/A2147483646": "bc1py9an6xesgx6rhdwezv88n6ejzld7349n5gdgjvggdwhkefsx2nnseqrc4m",
        "0/A45656668": "bc1pkmu8n2t34z9a566eq70mc983zlz4dhjv7y66led3tmzjpjktj8rqrwhp2u",
        "2147483647/A0": "bc1pcszdgcxxvus8z4c7yqqsdgqlvy43tpxuqft0ea8j0whd3r7r0xdqg80xhx",
        "2147483647/A2147483647": "bc1p7skp3g7l8wa4a64ead9u6wejtfs0dw9rjlvf4wqss8ntyzynrzuq93flu0",
        "2147483647/A1": "bc1p93svrn9t0f8ygek2x3l5rncdrc5wmxw79v4swpp9ptpjpzwnksjshu3m90",
        "2147483647/A2147483646": "bc1p9ysyemjmppve5g2wyrmcu5ep0a59h3lc7utg48e2zzw6tv2z842qk7lxqk",
        "2147483647/A45656668": "bc1pfc5j6na5yldslgv06wzau78acy9gwl23jrccnzz952k68j76gq6skqyu6a",
        "1/A0": "bc1pf8jdx5gcu5av7qw6hurnsnd4tzl9qv8j78plqnf3l0zjuhhzg3yscfpemf",
        "1/A2147483647": "bc1pndt3yqmedjj6qqdsyagwyw0ylcqslqtssmpr02zvxylmapr94yvshq74qq",
        "1/A1": "bc1pkjndjxcteye6r9xxrja6a6rmy7t9j4uz98pyt3r9uuuyu98x0leqh2ykfz",
        "1/A2147483646": "bc1pmvfn45rgdvylt55ze9hr4hf0am75d3lhv5c2vxpygaufdyj7qdnqy02sxp",
        "1/A45656668": "bc1php7fqwthn3q6z4ndhm2acym9g7dpfrsszangnrps720tw68qrzzq8jyn54",
        "2147483646/A0": "bc1ph4ev7ztarrjuy8gc0787yw5ruh4v6wrdk433yzr7jsz3w448w7ls47gapf",
        "2147483646/A2147483647": "bc1pe6gweajg3cyk82pcdmx0224cmcvwlf2hwjxqh5m8kzahuvh76mnsnsdthq",
        "2147483646/A1": "bc1p0kjhwtjf0wudpzau8204rvv5c90lrm93q5hyl57p3xsg6xucyylqwqgnyp",
        "2147483646/A2147483646": "bc1pcllw70hqzjp6dq3arhfr0jjer639zfxdgldp7hp739w7f8083vxsnkm6zj",
        "2147483646/A45656668": "bc1pk23h84gnmnlsc3s4cjvxlfut5x9fuk3r2eqh6qcnv9knf8clfqzqk9wptt",
        "8974594/A0": "bc1p2kag0nu6jdkqevwsz45le6tv6tcezvy8t7p0kpqtwerz5945zdcq20853p",
        "8974594/A2147483647": "bc1pj4az4fpy3md2a0gdt97kr77z92gjhruspnzj6dyvxtyu3wdv9kjshvs4ny",
        "8974594/A1": "bc1pyycqf3n7krsc4vqffj7ynty2a6rck4pdsmggd8yely56magrv73sqlus39",
        "8974594/A2147483646": "bc1p2eyxgmuxhu4njztmrat6jmgucfl8rtvhmflz5uelqqzwypujdy2s4n5594",
        "8974594/A45656668": "bc1p99mslgwrrrjc95an2ysqlykj9f5w3fhklmhxwqzx6nua0tsd9yzsce77sf"
      }
    }
  ],
} as AddressTestCaseData;
