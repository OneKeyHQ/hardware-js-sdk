import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'one-passphrase24-密语2',
  passphrase: '$`%@@`&^~$',
  passphraseState: 'moP2GcZKGrjTk35r8BSRD4JTeQagvuKzzS',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1NyQmfY5ZgAXTLA5VgQCPfPgpt5v4KMWrZ",
        "0/A2147483647": "1APc2EqPnkKv7tejEQnNbkBeUod37xjbaR",
        "0/A1": "1F1EwNZcL1HmueAXHJ8L6UM9rsZJxTvEXL",
        "0/A2147483646": "1DpKMLB8ists95GjrKYqebQAEb5ujf4ofT",
        "0/A45656668": "17FaRupE2qzeEGEsuXxEmVTJTPMm9LWq5b",
        "2147483647/A0": "1DFkgDTbRTKxLgCKiUraxqweDhznufqK2e",
        "2147483647/A2147483647": "1DU5mT5yHXP89oWvYAKp5582GZQoGNWUnC",
        "2147483647/A1": "1CRNdqNxE19YTAL6uCjqUswLnRSWCDDLna",
        "2147483647/A2147483646": "1CJPAZyyAVnfaCCHQiPS9Y3qogfUbYFXGj",
        "2147483647/A45656668": "1ApQNFSdcyLyAm5H4onamuzdzqyo4eN5jf",
        "1/A0": "14a9D4m5kYFcXhSUqfqqB3UM11cKXHGXWT",
        "1/A2147483647": "1KXCQY3fvAnZsfGLpLxB2fAomVXLFpjBCx",
        "1/A1": "18owftwRh1Mag8ktrTHaBJ3PmNQj64zSor",
        "1/A2147483646": "1Dqg3epjpDtUbzph6FBXggBRwEGZxCXbdV",
        "1/A45656668": "1CZt3mtaU7HpWae6Wxv89bxXnSDWBtbeEs",
        "2147483646/A0": "1F4DP9MSTKDDkR1QTgr3XpqcQPt9xTPtTj",
        "2147483646/A2147483647": "1HJhDGMj5pE7oJjR8a6QaMuNmJqp9siLgz",
        "2147483646/A1": "1546YKLQNcqjrAE9NdGLqnnQHKEB5F5KEY",
        "2147483646/A2147483646": "1BF43hsiLdvWHdqzr2RnJ9QyzGFuVTgNgu",
        "2147483646/A45656668": "1PPxbFTUjd726hEhS6CUGzWfMvs812sc9E",
        "8974594/A0": "14T4k4b8mEMWgucDFRDsp2rUfHVfeMjnSf",
        "8974594/A2147483647": "1BkYvcLunQ6mt9VnRK2by1r5adiX2qbWt6",
        "8974594/A1": "1HNxLwYGQPyu4AZ3Pyo1n5Y14x7XmedieY",
        "8974594/A2147483646": "14nbBTaM6uXvpuCgVq8fMRweUk1j9TGUVd",
        "8974594/A45656668": "12QLzwMkVxYx4yb74cXqKb6p1rURzo4F6x"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3MqNybhh5TGkamqecb3uYHqvxXdoRYeUze",
        "0/A2147483647": "35vHzXRHDspxkML6HEV5VkntL4r4uiM3Hh",
        "0/A1": "3Ai5XtpAiaiEzPjUiVLGPsj54mcmGjzvz1",
        "0/A2147483646": "3JWzvWKBPPpbW4pC5mdSVvbdqk5f8nuyRt",
        "0/A45656668": "33RDJV2u5v2yYab8fPScQUfGDM4fUSrsRo",
        "2147483647/A0": "33g1BfSGhuRKexSC71JaoVQ66DioftzvWU",
        "2147483647/A2147483647": "37XtKNNDzkCcrApagphHLJZigkPB1D5e6w",
        "2147483647/A1": "3QnJLoAXawH5WkvFmPE4dkaeMfZpqePeak",
        "2147483647/A2147483646": "3NWUDsHDrwaFx53Uzc8YwWHk99TL1CbvRB",
        "2147483647/A45656668": "3JFsjtugWZHdHbhLZwZj8HSNKc4q1ZFzpE",
        "1/A0": "3JnC5AVFuqtGyUTsPtUYV9F4cQT9nVMXCF",
        "1/A2147483647": "3ESRbfNGyGt9zJHa1aH5bcZqhEcxPE2Aj2",
        "1/A1": "3BAuByfeMKKgjRbdo2Aj83UN78jn33nvE8",
        "1/A2147483646": "38n5wycjDPwAYgJr1C4xxXmbPt9eQTR11H",
        "1/A45656668": "3KmtbzWvjvhUE9pb4sGXi3WkadmBCp2rWJ",
        "2147483646/A0": "3LTQ9qNWQ8Bk62X14Ndw2K8Sno4fLAqEE9",
        "2147483646/A2147483647": "39rUUJj7ejiwcMnSDTwjMwNy2im6mzA5tq",
        "2147483646/A1": "38PPu44QV1g2sAkpY7p7aMtKN8vHwZgCAV",
        "2147483646/A2147483646": "3PR61B7p4jNstY1Dg2jJdxoDDUK76FRefR",
        "2147483646/A45656668": "3J5D6XPt1sBeMYyDAqhUWMpfGTB9iELpE3",
        "8974594/A0": "3AyDPNyZRNycFZCapDEP7gwaRQiZy2s2qE",
        "8974594/A2147483647": "3B4vMYQuxo34kjwV6Rc3mxX8Z2jj3A274u",
        "8974594/A1": "3MHF4yoLGgKN6UQjNT8bREG9sYMYqBj2RX",
        "8974594/A2147483646": "34YubE9GkohfWMfHUuwE6HGfw8UgQ3aUnM",
        "8974594/A45656668": "36LNBmUTUQohfhyB4biz1Uot3nLv8dTHVw"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qd69qp5qc4m06xry23smh7ndhj6n54s3cwjr0uq",
        "0/A2147483647": "bc1qjrpcjgexd5wmxtmsjlfkkt7r8svnp0v88fhgwx",
        "0/A1": "bc1qq6m2ahufr9kqau9dtjf2nmhckntcqx5cm5shj2",
        "0/A2147483646": "bc1qp9r0uvg5j3ytxf6zlhdh7v874rgq444u3d8zac",
        "0/A45656668": "bc1q2m76jsfxnl6zq5y68ve9lj47j3h0kdjqena02k",
        "2147483647/A0": "bc1qqq4jzf8dgef2tkk32wr2gpnsgktmedudanvxfz",
        "2147483647/A2147483647": "bc1q79hk5zkl77cs3mt4q79yceumy5wgwksnmwlaz7",
        "2147483647/A1": "bc1qc6cn2nneay0f5gv8nk50au5wly3eqs9thzutwc",
        "2147483647/A2147483646": "bc1quk7zjwmcuf3hy6rfz5nhpwsh6a735yk073y5a5",
        "2147483647/A45656668": "bc1qzp0up2q0fxcjvgrdzu90dy4m8u73tzqt40j7x9",
        "1/A0": "bc1qxsufrp3cnhelz8k7r7a8zdgskpcfhvrz4jl79f",
        "1/A2147483647": "bc1q3xcwh85m7fsewh0dwhujfuwkhm7uh6wtqy5r8x",
        "1/A1": "bc1qsj5ta6hurns7sdqrth0em9rmnp8t7c7e8ykxds",
        "1/A2147483646": "bc1q7lxfdaavp2cz0rxczhzt5qszple69xqd6hz2x7",
        "1/A45656668": "bc1q50aj4mnwd9szn06amn4ugc24zh0fgx7h4s8kcn",
        "2147483646/A0": "bc1q4qnzxqhjqe0a30f64n3qghqvf8zphak4mf7ew7",
        "2147483646/A2147483647": "bc1qg9mujk4jcwvx7xu84cz60s2djyspjxgck4ks0v",
        "2147483646/A1": "bc1q0v4fyqhcqhl4drkjku9trnya7n8942pcawp5e6",
        "2147483646/A2147483646": "bc1q2rehjynaq9wuvr4l4qealg8djrxay4cwz7y59w",
        "2147483646/A45656668": "bc1qcr9vekdmaruum5rjmf6gnxpw5f3ggsmscwaqhh",
        "8974594/A0": "bc1qqt2eh6z76z4fh9jt7a2f6jlh0s6w7lcnu5vy5e",
        "8974594/A2147483647": "bc1qayvghq2a9hau2h9wse4yyxrxm79dcpxt5t0l9e",
        "8974594/A1": "bc1qmx30fkps0sufhtpyrstglvragtz5kt3k5nell9",
        "8974594/A2147483646": "bc1qh4u5jhtgc3y9jvysdfufsm3v5ccvuqmmlg9rm7",
        "8974594/A45656668": "bc1qhnw6auhhmxuvxq2fzc6e2s38qfftdnnah04r3p"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1prwd704fqm0jrj0lepnsc0u3plrme6y4hd6c2xwk9dy0cm2y3rugszgap4w",
        "0/A2147483647": "bc1plqczpkmfc2u38f6ezehvn300x499kzzqjaxw7l5umh6z7t0sp5zqupwlsw",
        "0/A1": "bc1p8ewps49jcxp9fp6tl4ygzgpe2xgg9d0ukhcd3mc3ug7nyff3drusjr8zq9",
        "0/A2147483646": "bc1ps56lzys886uzmd84s3n2dthz23h8qjrzam27uv8xwy0exa985gdss7ytk0",
        "0/A45656668": "bc1psffqn0cdw6rjg5km5tnt0mxrzu9634zhqa4sv8w2cjxjgkz249zqwhpwts",
        "2147483647/A0": "bc1pn9jhkme06j2snwrf7w6uc2qmcjkkdqwrftgd7c255mxc5pfcs0nsmwxrqq",
        "2147483647/A2147483647": "bc1pynvddygls2s8rg4q0mn9xsu7jhuj49yvc5r05gx0ehd9rw8zmmjqnm2tlc",
        "2147483647/A1": "bc1p96wancyr9fjp53srj7aw8ssd9vtxwf2j0lvqgez9g39m9xqgaxrsfnf6dp",
        "2147483647/A2147483646": "bc1pu8jqszjtc4ylltcw8gltnlhxfyle83cdnpfelpdprz327t7whzzqn6s8r5",
        "2147483647/A45656668": "bc1pyw5apggwug9tg0722hfkg6my7nrnvfrmgpu42mu63w8hsav8depsw759x8",
        "1/A0": "bc1pgs9clnn36g8ll6wf8v04djnxgcdrnrwty7z05v6c8nw6d4xxe26qvgrq5d",
        "1/A2147483647": "bc1pkvr4csu2uwcd5gvlpwcjtz474fgevtcgq79mdaqmcts99kpwx23s0uwmae",
        "1/A1": "bc1p4ndlfdg850df5f2f2yx3cy4lxhe9vu8cf3uxxyvys97j3ef42l4q34st5u",
        "1/A2147483646": "bc1p3aj8ttvf2fvey7d27tnfuge7u7lqy6448uxwx63wk53lzwn9zzcq07sjpg",
        "1/A45656668": "bc1p66x9j2qyxp4xyje6jw0j2msm8ya5pcpu9lw5c4uhq7jt9um9reaqkm20ep",
        "2147483646/A0": "bc1pdz4xld06wepvr5glkvhhk3yp9jnjvulg8wu7gma38nx3graehrws2w5ar3",
        "2147483646/A2147483647": "bc1p82hm0ht5el3xdjg4qs5nql0gqdkrlxje5wtdgeavwgz8lmvy5z5q930wsc",
        "2147483646/A1": "bc1ppsru20knnx4ushv24ltww7u3nx97e0rc6wjad92y8lahddfzc46sflffk5",
        "2147483646/A2147483646": "bc1pm94jkmc7cqpltke5mzmwktzanm95zhr2rw6ahvd5t8h3k479dl8schzqxh",
        "2147483646/A45656668": "bc1p9rshecvlvusy2t62l92ffkfy4vz8vw56mv9g9rpfuskuw0lgregszn0wus",
        "8974594/A0": "bc1pwjnq450atllyl5ck8urg5hnt4v8w47uedh966lt6gljcj2gacc3qmum037",
        "8974594/A2147483647": "bc1pgtvhputgaywavn458sp74jhy0myk04aalle6rda88cvxslv2j5xqjwzga9",
        "8974594/A1": "bc1p03g8zyw8amuz339sl8pg52470yjkndgyue09zvhry9gegdg43lesh2aq6e",
        "8974594/A2147483646": "bc1p8x79edxddr8nj4ln0tjxehrc33n7njpkp4t9f63n2jentyv5au2slys4lv",
        "8974594/A45656668": "bc1pvzqvzpm3d3l6fzn0t8x548h4s6wppt07g59y7awn9dv2c9u6q5ps0f3c37"
      }
    }
  ],
} as AddressTestCaseData;
