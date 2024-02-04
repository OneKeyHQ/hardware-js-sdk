import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'three-passphrase18-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428114271',
  passphrase: '',
  passphraseState: 'n2BKLUzeWAiE1WTVWoLgshKW3sqdiaECWE',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1CEPnHbQ7VumTJgCo82cxqcuJhDiQKe1NY",
        "0/A2147483647": "1Fy4E2D7z8fooa5kqpzTTM754pWDw39aen",
        "0/A1": "16Jt3P95HEbhbvTejfyUAQ6KVaBaWoZU5B",
        "0/A2147483646": "1EFoqRnKFiUpUmJV9EiMHKnX41boHALxGQ",
        "0/A45656668": "1ACXhJGoRNx3asGwNKQoj3mHTFutXFehJt",
        "2147483647/A0": "1PT8Qe43uG9dmqEEvZFLhP4M2FJvU9vRUR",
        "2147483647/A2147483647": "1B83GWnG4rA2Rw9SCpmzLdK8TzxypoZ87R",
        "2147483647/A1": "1BvUxXRE7bYkGUtaKXd2XepFTbPU8sv2Ud",
        "2147483647/A2147483646": "1MvdPB8bWz47nfbm2zAHFodVGwUr4Aa7yN",
        "2147483647/A45656668": "14Z1MuXxfhj5Nwhh3HkE3DSygKPKAZ68cz",
        "1/A0": "1CN21jZAXWBJDDFjyPS6dWoy8orgP9AVwZ",
        "1/A2147483647": "1PvfmCiq8pseinuvKTYN24b68nnC6NVMM3",
        "1/A1": "19BXrNwWw4WmKNQk2bBHkavqiNQz6GreLw",
        "1/A2147483646": "14Qd8LYj1ZgqriFog5MayZbet4F7KYGY8u",
        "1/A45656668": "1HQVtLod6tzojJrbwrjYmJCUymDZKbfhF5",
        "2147483646/A0": "1A8Z2vyqfNz5yw71y5XXUr9Z6CpcMQWnrd",
        "2147483646/A2147483647": "16eNFALBdDqkxXuBPina1tyandWvqcYwxB",
        "2147483646/A1": "1KwJqaXbukf69TCSCSjWvYHpQnKSnmbCWw",
        "2147483646/A2147483646": "1LLjfzeKAYKE3jn5trnrRB8xMtFGoL3vyy",
        "2147483646/A45656668": "1P8rhTjeSbjSSWpHvawEkAcX72ALeWvbZn",
        "8974594/A0": "1CRHui8cz6X9Pf8yVWwALYwh7cQWYdx482",
        "8974594/A2147483647": "1FVdxWBEr98uXgxpfXK3LtXLd4drdqp4CR",
        "8974594/A1": "18KFKBeKaWhFw43v6F8jDfscAYpMvUTvCz",
        "8974594/A2147483646": "12EtB9UYs6wyqCmi6CCYFvYTSq3nJqzaVm",
        "8974594/A45656668": "1Jheua7TZV6oXUzvmvWppqHTi2StBa7bBQ"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3KQss93Mn49iyjJad3QD8n9dqyTV23zE9j",
        "0/A2147483647": "3HP27e5LrZEcrkoQ2dmbXYSPjiHs87qh4o",
        "0/A1": "3Jkyqt8EkoGqWV6hkrca7RquAHEweJc8p8",
        "0/A2147483646": "3AYTmNWg1zG7cVaX3Ac2ArngypLDZquxbv",
        "0/A45656668": "3BpxiBYWTFo26V4ruRTQy7FuXmuEhZvPHQ",
        "2147483647/A0": "3NtR3cgJXLdjT5HjrwpWDHE5JPZ722BdpG",
        "2147483647/A2147483647": "35YHPY1Ud4iXCuUY2KMa93AWio6ZfUsE8W",
        "2147483647/A1": "3MSh7p2AegAFDHQbEfUKc2fDD8yi53jF1X",
        "2147483647/A2147483646": "3L5NVJ4ANvM3ECJBGLo7ytJ9EFf2SjTySG",
        "2147483647/A45656668": "3ER2GYCJXWXQNNTbnK1YVNsMGXaGeCwkw8",
        "1/A0": "348XW6CHY5M6uvfYVr33es2ZokC8opDuB7",
        "1/A2147483647": "33dNvnRaWS4Hw58q5kpmTgEQ9TwWuoK39B",
        "1/A1": "3AS37Gb8NKVQ8dot3HGCXcpj6uLt3V21fG",
        "1/A2147483646": "3DP4E1sjfVbcn2J9MZfbAQsM8ekAb2sxSG",
        "1/A45656668": "3AxGkvcJHg8Wrwp5wmB5N9TeuL95NEcvKS",
        "2147483646/A0": "36WejMS5j4tB8KSLPVgzbUtYF7Zktwb5F2",
        "2147483646/A2147483647": "35PeU8HuxuDaCrrpboqw5vSiVD6iJw6RTW",
        "2147483646/A1": "348cD1vrHLH25wiDgoQug9terC7G5PXKuq",
        "2147483646/A2147483646": "3HU4ayfy1JWmVLJpHjbboSxexWV2stmMus",
        "2147483646/A45656668": "3PsGdAA9mgH7HhZhujcAe4E4gHJWvH9PjK",
        "8974594/A0": "39TN6cdtKwJzwqJNrWAqDGR73WJVs3wsbk",
        "8974594/A2147483647": "31oqSxLzdx6EKdms7ZWwDDC2dG5rXXcCAS",
        "8974594/A1": "34x8QudnNyrhweWnFzPzXHPqEnDPakAPb5",
        "8974594/A2147483646": "38988ERovPQNUKgamXivraYNLs8orKbxLw",
        "8974594/A45656668": "3AtZenNqNcVHMhQVL9CciuipU2qVy4EJN6"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qv2zm83y5q4l0dhrc6tchkmj3q97kwyxxy6gkjt",
        "0/A2147483647": "bc1qteqj3tu43zse9ud706emxr87nu4g3r3vmj8fx6",
        "0/A1": "bc1qw2eu76pp8e32ep9c7v8z3wvt3evpx0pfgn36x9",
        "0/A2147483646": "bc1q6932d5u9nly7s30eg5sdc6z4ht0dlhf7a7rg28",
        "0/A45656668": "bc1qgvl5wqkj5khgvnz8hhdajxn304uktffnqfgsql",
        "2147483647/A0": "bc1qncea8t9v3x9t488urq9uwxcu7pyagu8p6l7gyc",
        "2147483647/A2147483647": "bc1qk54szxfs60kyfcu8utlfux700e44d37w5fxfw7",
        "2147483647/A1": "bc1qw3kg74vuumhhxju8thx80swhfkd0qugjt3dchd",
        "2147483647/A2147483646": "bc1qnyk6p6mp28qrde0hlzweu8msfprn26wwm09n0r",
        "2147483647/A45656668": "bc1qcjh5rf9k3r49styph7ltsuwjrm95lu5z2fzxtl",
        "1/A0": "bc1qeqdmlvvv982dc9q6ms0j8dcsnrtamutgu4uyuv",
        "1/A2147483647": "bc1qz8van63g07mxmry04jdqvj5ltgd7knre0s5gcn",
        "1/A1": "bc1q9vcl8yk3wfsvefasrxrrycm5e6ys9mma3udanz",
        "1/A2147483646": "bc1qfcmvn7hkmr2k7hu9xlga8pjrx7d4k2ksfs8d8l",
        "1/A45656668": "bc1qm5n7l535c8crt8l2zpw7w5p4zu2d7tpp04r3t0",
        "2147483646/A0": "bc1qcw79y59n45y5zwttjvlwkfl70mrzkljyvp2tfd",
        "2147483646/A2147483647": "bc1qc4rv4y89zaru4s6whefdnda0fywvpcst7w6jyy",
        "2147483646/A1": "bc1qnq6phqvuap9zvcc9lg8rgn86pqpq0hlaakaymk",
        "2147483646/A2147483646": "bc1q67sddq2v8w6v4rc33ywvsccmedavva4w7fv09s",
        "2147483646/A45656668": "bc1q7039qg856cvlk9ggkzy0y665mpq79dxezsx85m",
        "8974594/A0": "bc1qwz5n9ay83s260gelwz7f0q4dra0v4a2ty6s46z",
        "8974594/A2147483647": "bc1qfk3paxqn3467u0cqlny8krjsjeffwm2kaq7rmd",
        "8974594/A1": "bc1q394lc3jmwmpc57xrmhgtfxn60h8ykufsl2elxh",
        "8974594/A2147483646": "bc1qqw6eke9x59rq34q4rrsqfu9mzpl070dxx7fzp6",
        "8974594/A45656668": "bc1quf0yj02xe5zgax8fuzc0q957rfzr7m6uu83udz"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1ppuksfx3xwnjxc8c689e2lddqh8r47frrd6rm32tjrmfltfmmutmq7ceygk",
        "0/A2147483647": "bc1pvrywzc9ztkvt3n6h9l2pacdrd4gv2rwe90a62e6dssv9y2ecx5us6eu5g2",
        "0/A1": "bc1pztkr9amja66587uv2cnt9wucru0r20elm8usuplqcndtwlxuwpns6znl35",
        "0/A2147483646": "bc1p863z2zwkzszkmhuwr9nmg4m9d6m0849vww25nu3tx3cr88w06pwsccxzkd",
        "0/A45656668": "bc1pr3j3l8sg2rslgs6qmmykuw4g79vx76sawcxtrn4xthvqhc25qvgq20efaw",
        "2147483647/A0": "bc1p98axy6acg82p83827846f5w7njuewlexc2jucm8c8drstpv4f7aqgc6u36",
        "2147483647/A2147483647": "bc1pkdhafvzxv5g5upq4ujpc6w9nadjfg07c8u3qxd95mfz6pv90xl7s0uj27w",
        "2147483647/A1": "bc1pfvs8g73mzhcejrg6g9s9req49s5m6649kx3n63vsqrz6xpc50tuqw87g3f",
        "2147483647/A2147483646": "bc1pk3lrqqj7jzka6asvjnmrwf25luc2qv86wz5fx7jk0rw6vkxq7uesqmqnka",
        "2147483647/A45656668": "bc1pkqjhtlkd34lg06q6qpg2r6aj8x96gse0zvw7xas0eu5hxrynl9dqzqxahx",
        "1/A0": "bc1pdvhfsdt5ykr8v4sta98xf4n2hdsyj5sdq80h8waxalz5fpyy2mqqfhzhqh",
        "1/A2147483647": "bc1pspqlnsltk2h7c76etg6z9lj6k077355v9tw8ly5w4n8sn26lqc6sed7rel",
        "1/A1": "bc1p2w0m7pv0qmwd95yedphg2qyrm853x2ld4u9as5yuuq5uelcjfmrs2dazre",
        "1/A2147483646": "bc1p6mmz48gvyj5flqu96np3cxt4zvysz6ud2778uta4vhksmj4usx4qxjec6y",
        "1/A45656668": "bc1pgjda5746njpfwmuhzrqhs603pqk8n5w3afur5dl0tqhzan05jdnsrgx3qf",
        "2147483646/A0": "bc1pcypewmqjyw0507kpx4302p4zd6uyuusw8lcl66gyt4qltr00kyeqvf2la6",
        "2147483646/A2147483647": "bc1pkq4p449g9ncx22q3ddx6ra6yhqnt4jyn5utprkqjjg23gylwgjyqrx9ncp",
        "2147483646/A1": "bc1pa6n9cnuma3l5spz86ljkdj6lfpnwgc768gfcec8lw2g2e6cs88wqzs0aev",
        "2147483646/A2147483646": "bc1pej33u89upmw77206l49tc66308qqcrh2jd5e5hqc43ym7xj0ap9sp6drq5",
        "2147483646/A45656668": "bc1pn0wp4njndpefl6haswkjtwxx50960xu6nks7edwweumwsz7g4meqggg6we",
        "8974594/A0": "bc1py6xwfuqzkz8tyfgee4q7472rcvj9k2ssha87qurzj5ptldvrr90sslq6hc",
        "8974594/A2147483647": "bc1ppy2gkx9g9tr502p5q9acfn0z3s4sscemnnar07p7zkvkw63zkrwsuxdvdv",
        "8974594/A1": "bc1p87xymdpzz67w8yu87s8x0pz7fk93feh3fckquqf0eyu03rwmzz6sqfnu3c",
        "8974594/A2147483646": "bc1p682hz39gc83vgcrswg9vp5wxj5em7qsylfx3argfc7l9njsnxzlsj37qyr",
        "8974594/A45656668": "bc1pr05c4ajk7k7t7dsxdgmmr3xnyxng40dr6fxve5jj7l8cd3grwzjsgwtkum"
      }
    }
  ],
} as AddressTestCaseData;
