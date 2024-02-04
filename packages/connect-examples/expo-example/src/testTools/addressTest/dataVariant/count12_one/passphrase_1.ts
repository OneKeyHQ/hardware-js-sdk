import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'one-passphrase12-密语1',
  passphrase: '12345',  
  passphraseState: 'mwfiTkMnz8ed9txm7yybKCqRr4bndeTohm',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162680',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1KvdWRia4GCG6mxBrUrg79Q7zdTBKH8o67",
        "0/A2147483647": "1MJ7RyKyeVGFnDFcTrRp3htAQvfajK5HWB",
        "0/A1": "1N6yciMijHuv7aRFDodoxpaSnGUSBhAL6v",
        "0/A2147483646": "13F7vYbRJdMDUQMUJiPDMowT12PPZ5h48Y",
        "0/A45656668": "1J7dSuEw7zX9hxR1d7WFiFwG9N4q8iUmxV",
        "2147483647/A0": "157rUMRu5LJ2Pox8mFt2uMr8r4JNAZHriL",
        "2147483647/A2147483647": "12Qi3YY7zJodWynj7coZgeJmZ1QzQNzaJg",
        "2147483647/A1": "1FARjBn19MvsNcpAz1T988bQsDwFRkXQTk",
        "2147483647/A2147483646": "16zqZHFwxjFMRBoCNfehfyT9dAVKqvsxdQ",
        "2147483647/A45656668": "1JmKZYgxtb1mgnUckZ48jdDzjNS2aSoxPn",
        "1/A0": "18m9Ke1Xb9fEyKwJJD4c4oLzfdznkbHcCN",
        "1/A2147483647": "1GSomFJ3xEVd1mYF5P3JCxkpHzPJtgU7vH",
        "1/A1": "19osV2s7YX4svHSWYuWbtAvssXw6NqTUoG",
        "1/A2147483646": "1AkBxG5K6bg6vPQ7FEpBa58LDcYNjWRtAg",
        "1/A45656668": "1HFFEb9a8tYhMz16JE6sWncBAz3yy9caU3",
        "2147483646/A0": "1NAEjXTZyk5u7wh6MRQPtshhdvzYuXwFRo",
        "2147483646/A2147483647": "1PVkPC11wkfW8dBQwxkYjnmv24qXuNkvy5",
        "2147483646/A1": "1JKq1wfqbjdsPy8ZaXdZnZcHtbMe9bQraX",
        "2147483646/A2147483646": "16N8SsRWiGJrBQuUYrWeR8ug4WGCfZcvke",
        "2147483646/A45656668": "18oBrDXvTg6DPM7WG2KFstB8L3ejFvveEB",
        "8974594/A0": "1H73sfKSu8hEih6oVbTm1v9sQGaHmXtWpm",
        "8974594/A2147483647": "1KDeNLAF36E11siNf6rzxcSgbGQiYu2hBV",
        "8974594/A1": "1EdienCu95T5VTCzCv7TKUZANXDiV9XdxB",
        "8974594/A2147483646": "1LYyJaETVNQkoAr6SZJTCZB2cYZxpRAfgj",
        "8974594/A45656668": "1CVLUS3duvatAF5Tvad5F4LQPXmSrMCmx4"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "37RpdnzsZY7GEqYoGNTkNSKYJ8eu2oLo8p",
        "0/A2147483647": "38Bu1TARt7tWGZRg24TQ5qWTLNWT6Pfd2M",
        "0/A1": "36BvHtnBP41HVRiP61594cY3PzpRhLtmRY",
        "0/A2147483646": "32tmsd3qkDrdWzdPstZToHY9i4cqWWP5AB",
        "0/A45656668": "3CK7vBUDU3EhUGKe9Y3kadhJ1whScBP38i",
        "2147483647/A0": "32eLtwAYPqYNNgnZWuYw8wJP4qgRxFXV4K",
        "2147483647/A2147483647": "3ApG9Hi7Tsq2wVCnSAm9qUhWC3z3MHh6fM",
        "2147483647/A1": "39e13FsFgFRDgsvoLxyS28BrTTjeLMNevv",
        "2147483647/A2147483646": "3QJgZqFiDHoUYbfZ4YZiesZmo6X7NRjjTU",
        "2147483647/A45656668": "3R2Mb1i74wq18t9ZAcEfGayKweEQK4rb4D",
        "1/A0": "3ExvGMkKD6jWu8xw2Cwt9af4DoUW9fDkA5",
        "1/A2147483647": "3MGCFamuXJ7oQJgPvKyjhRtmd4hkAdAAzn",
        "1/A1": "34G428LjYYTska5sBM5SbkedeFJdshJkhy",
        "1/A2147483646": "3BB3DPLYsWFtiNGPRGALm7jECRECL32Sdf",
        "1/A45656668": "3HzQPke3m4sSHd8DSX32pJ9ubaCSdxzcuo",
        "2147483646/A0": "391hwUHishADhKso6KrhcbHnxo79Ty8j3S",
        "2147483646/A2147483647": "3M1CykkUaxTtkyMeLp9ePSKVTtJ6XgNJdy",
        "2147483646/A1": "3GGxsMQt5YNUtGA38fkhe4nF4tkYMZ6mMV",
        "2147483646/A2147483646": "3JnDDBw6Bx47UxKNZBHX1NKdRShmhAdRkm",
        "2147483646/A45656668": "3GfHULsNAXZhWvrnqwd4kjKfvqgavgAkwg",
        "8974594/A0": "3CHD1AhdfBFQtSEU5X1oGLvRJ8Raj7auW7",
        "8974594/A2147483647": "3MM98MZoUbKhPpgsxEaHsfa31fRH5XbDWP",
        "8974594/A1": "38WxbQiEJMRcvQtt4zModc88HtZY37QW6s",
        "8974594/A2147483646": "3F7Hq7WbVwftMd1cjRcMuJR4hHibxYAEXp",
        "8974594/A45656668": "3EE8qfDRU1c5Gd7SN14HujJM23uv48uwQQ"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q3gw5x8vh3y7e4zx7kd38kug5te5slw9ssjhkwj",
        "0/A2147483647": "bc1qdwt5ykgegluwuc5cn7ud6t4mn475al4hg0zp7p",
        "0/A1": "bc1qs7ywpj7ddmw6t977geczc626magqp4m7d62eqv",
        "0/A2147483646": "bc1qa7rx8svtkp4s5ka6egl6v8neyx4pn76w4kljta",
        "0/A45656668": "bc1qjglmhnrhwt746r3qdf73nc9t0w6es5vfdud3p3",
        "2147483647/A0": "bc1qxjjayvegznd5v9dunlnlxqjrhtc62jzpvrdxn7",
        "2147483647/A2147483647": "bc1qt45wutlv3pja6g6c6xzk6wfda8yrt9uyczv8q0",
        "2147483647/A1": "bc1qvwazrcxxddpdg2r47qkhw8vt48vpqxre02vt8w",
        "2147483647/A2147483646": "bc1qfurnw6zevfkkw0q2flhpmn6lxyuvy0upqnyh0f",
        "2147483647/A45656668": "bc1qy76d5hecpka34560c4ypayc9fqwx3xgjfcns0s",
        "1/A0": "bc1qvf0jfsz8v96rl5zyqmaqjj3f0pfuf6taywgnjw",
        "1/A2147483647": "bc1qdpd79dvh64tj63h4a7e5y3nd55tu4y3vy8mjvt",
        "1/A1": "bc1qup7p563m99yfmkzy2nq0thz5znns3k05k8tq38",
        "1/A2147483646": "bc1q0kv00juyqwxderrth5xxr65fvwmwch0jr062jm",
        "1/A45656668": "bc1qsn69hdegrvekv8h3deu9gt7yr244q6vd8zxqgf",
        "2147483646/A0": "bc1qml7lfj7m9s2dhz787at6m7pd887rrt79mmm6xq",
        "2147483646/A2147483647": "bc1qy7vuq5n475dczfmvv7pdmx6mmu26vqaeqhn70a",
        "2147483646/A1": "bc1qzqq82q38cew240ukza4aa024sh38wzge5n5rje",
        "2147483646/A2147483646": "bc1qex7a3vle77neqru8ufxdmsrvs9p695k66qzx4n",
        "2147483646/A45656668": "bc1qqvl2pv8tunsadfhmdwzs2d9a9h8053ewr7jluz",
        "8974594/A0": "bc1qj0p9s7mmqgtteekjcyk5mfvqwc6sa5vv6c2rkc",
        "8974594/A2147483647": "bc1qlut6fhv8rmu0tjxt6y93vs2ry8u6ngzatq3fyy",
        "8974594/A1": "bc1q0ysvket4mws6l3n5strztazsnm35mj85kr58gj",
        "8974594/A2147483646": "bc1q0q0wn63wtheuvqu8p4rghaqq0y8rwq9x26wlj5",
        "8974594/A45656668": "bc1qt9g6djv6dl9yrlmgqqfexgpfvn7lq6us3hxw96"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1psyekgpzq6v9082vv0hznnjlejt2vq0aqkk0c7cdfmsmu5x66wxvsdsxlq9",
        "0/A2147483647": "bc1ptufhjcv3rylzvgu5na8rcu6xwh3m3exxd6ppsq76lhuuulguswxq4zd86h",
        "0/A1": "bc1pc3week6r4rwm7ll64tp4khy7lzjdx9msneenmerc8lsj7rwhqzss2ygcq7",
        "0/A2147483646": "bc1ppvcxcfyd8z4vmn88jwvjvpyykdkayxsm2n7xc6mk0sr9hs9ck58sxval0s",
        "0/A45656668": "bc1p5ggyuxqk8q5hd6z2zxjsw5y8vyrhc9rkg9ewhyjezpfg7h6z2ces7pwds3",
        "2147483647/A0": "bc1pmwdg8xh9s8acdqgqxa8mz2jv32kr2qhmjf6r5gvw3ag7r004897q5pu643",
        "2147483647/A2147483647": "bc1puher8wff0z0v9urp2ytqge706ksge5rk9pak4dnkaq2cw5yc8cnsuv6hue",
        "2147483647/A1": "bc1p9h92ygl2sh3nq4mtdc7xhrxunuja6nykhq2u80qhrhhlkzv9hjlq7vu85d",
        "2147483647/A2147483646": "bc1p0dac6ua0fjvvnzae6ecj8wsl8ph2m254dajc5zhjldegejup990q7pjjzp",
        "2147483647/A45656668": "bc1pet0stc245d7nnjdstnenjduljnrr5yeyvrlfudzseqdjgr7vrhfqqkhf92",
        "1/A0": "bc1p7c5wsxnzh3000egpxac2q85plk5d2jhdquymhx30fts9sfrjknrq8dj955",
        "1/A2147483647": "bc1pwwtjz6jm9fzp6xvxh7vwx3886ezqjsjpxgndygp6d0nnrjcyk6sssnd3e4",
        "1/A1": "bc1pvqy0yqmfa32qr2mujt4g8metlhuzmpr7yp4enlhewemq9puc8yss2rxplu",
        "1/A2147483646": "bc1pk0hdvfcdvmckw3j4ftw94vve84vluukacwdq5j4fmxgphyug0taqmjvz5j",
        "1/A45656668": "bc1p9ekn40gk7ag4dp60ykm08ru9gejlad4hjt0ea0p0l590gzn94ryqejd8vx",
        "2147483646/A0": "bc1pjsg4xtn5dn60va6x5k8fwjcyjcr8czfqvsknlv6dal4rqskvthps7yw8kl",
        "2147483646/A2147483647": "bc1pf88j9z4jk7u49egdhteyx4svkz2ny6c43h94uwjz7y8lwlf45dfqjes20j",
        "2147483646/A1": "bc1p9sj4wjnxpr99zsuqwquyhu69rx92wvp7due0rzdtcqgraz8yrdns2z3ss2",
        "2147483646/A2147483646": "bc1pgjcfrwakfxhuv5zs3gs8qt3ld3xyyqf5rryssgf9x8trdfmlacrqshe5y8",
        "2147483646/A45656668": "bc1py7dhj4rd4lju2jjt9x5n5ge0j6vfjndyn008f26mj75eusdqqplq8k9qy9",
        "8974594/A0": "bc1pff38ltx5umxyfl6r38362aqkumx3j3nskl52q3lq49z4semz7vjs35zxas",
        "8974594/A2147483647": "bc1p8prlcy9q6cn9apxwmurhqh2wx0gr9ewevrze58qjjk8vnwdq5hpst965ae",
        "8974594/A1": "bc1pyut27mlj4ctrkd8r80rju7893xa7m9vpxxmh0xzv9qwyj02u55pqdsxf8z",
        "8974594/A2147483646": "bc1pd4ezrm5kgvtjl3rwsg0qhjdlx62lgc3ylw6xkdft3vycj5wqstwsudd2eq",
        "8974594/A45656668": "bc1p4zlpya9ukwemvryutlj8exq06n8zq8ytnrdxlsf60v382r464p2q3pvrf5"
      }
    }
  ],
} as AddressTestCaseData;
