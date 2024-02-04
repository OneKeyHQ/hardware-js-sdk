import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'one-passphrase24-密语1',
  passphrase: 'asdfg7890',
  passphraseState: 'n4kk9unKaT8HBt5CgnarZLZSMyhk2SrsQE',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1HbEUb5CpwnjPbQsfKGXvr3SRofqczsj3o",
        "0/A2147483647": "1MqcHTVCh7SjDcQd8ofuEprr7s3kKpJSjF",
        "0/A1": "1AFnUdd25Rq3zjFEH69KxxYCFBBvaGq58A",
        "0/A2147483646": "1BjUTvviFAWBERZSxAtDzfpvSH8KT3hrSR",
        "0/A45656668": "1L8Xem5fLPosxRpZpRYuJWj49vQXPjhyaD",
        "2147483647/A0": "15QYq49GU1HTFeRpbEz6kKP1nWb2kaQNYH",
        "2147483647/A2147483647": "1LsbMBJX7sik9jAgdTrH5GmUScZSeNqsPb",
        "2147483647/A1": "15foPKhtF8rQwUo8Y6A6Z1Dk3PjjUrWQtj",
        "2147483647/A2147483646": "159b9F2rUMT6EJstbgEeY83cHByb36SBys",
        "2147483647/A45656668": "1KzSWrLuNXwM1hgSZ184tjySRVPweDm6WK",
        "1/A0": "1LVVTQ9FoBQg2UJHJGkcZzvVVnun9ErExE",
        "1/A2147483647": "1KfcCy1gzMfBc8E56c1F9vKrcgjMmioqQG",
        "1/A1": "1KdVP1XZDY6pZ6tfqejpDRSvfKrG61EVEk",
        "1/A2147483646": "1Az9N74T25s7rSYNYqYarHRDqos8XjLxoE",
        "1/A45656668": "1LpSzbrHfXQdP7Ki1W3ez2qD6UTAUYHzJH",
        "2147483646/A0": "1Kh2ZHeKXJSA62r9TGGU6tSNvSfeGKvqW7",
        "2147483646/A2147483647": "1JpsmqrNuri7yS5UFKVdWdxt3TdGr4uhLU",
        "2147483646/A1": "1MQSeB7ZYViqhZTX5ytQCoXVMXqLyj76sC",
        "2147483646/A2147483646": "17KzDuaSB22MfvV1cUQNV4YMnksZTmAaoV",
        "2147483646/A45656668": "1D6xCqTbzguM3wYkkMUKJCb9tgoKh8v9jm",
        "8974594/A0": "1CNaLGG8iMobxunyVeRFA2ukEwb562w8kj",
        "8974594/A2147483647": "1BaLLgZWHD8LMzThwwgBuPDvmoTD6KB2V4",
        "8974594/A1": "13cgaPqzt6tpaakWHK9V4tWCSiNEN8LjWX",
        "8974594/A2147483646": "1N5mBv1JfXjhEAqMUVg6vzsP4yfGjxLTxj",
        "8974594/A45656668": "1P8za5zfA1pSKkFHD5vXAroUda648WTg3F"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3Lb1ALnWnGex2WAgHxGh8knzWcRNSDZg7d",
        "0/A2147483647": "3AxtD7qSuuWiKSPpVFV8zjA6jxTfCQiXFF",
        "0/A1": "3GCawEVbaVZivMEfwqzRWaZYmy5Ah8XH5T",
        "0/A2147483646": "3NmcrVyx5KjtVcDp7Q2iBHcjKhhN6jWQqt",
        "0/A45656668": "3PEhCF1DBjibm9fbe4bfAfk9M3CuLkA7Lv",
        "2147483647/A0": "3PGBPD8hxtGPQpVrfkAMe6GFt9F1VeHK6c",
        "2147483647/A2147483647": "358or5D96LCxgsTfdkvme9fhFfcMLetXHD",
        "2147483647/A1": "3QhtFzYE5Pd3JCuTcKJ68TmcKiUA164edC",
        "2147483647/A2147483646": "3M3nM1z6oBmw4u97EtkxczVAYP3SCdPv3A",
        "2147483647/A45656668": "33dU1ebmUiFsjBAFoso3y2Jd4FjQAUpWF3",
        "1/A0": "3Daukht9kv2nMZaU7BNgdGt2hV6ztBAhS4",
        "1/A2147483647": "3LVyVk1SyNmRz65zAezaQTXQ2JEDPb7A9A",
        "1/A1": "37rNXyU2QwHPo9os2DKUzCvkqkXr1Lsydu",
        "1/A2147483646": "32g2Hhi7SwByn1g2ArRcp1TkkfaFRJMB2V",
        "1/A45656668": "3MSps3hVdVZ3GMGnwY2ysGSmKnkJhcRajP",
        "2147483646/A0": "35eGQeecUyecXjBScdCKLRPm7zEeUXwGnG",
        "2147483646/A2147483647": "3DQGUeVcYCsjnMgCuXS283KHVdKDKYUauU",
        "2147483646/A1": "3Fo1d97kWYFt5dA89zDzi7Kypuq8uFMKLL",
        "2147483646/A2147483646": "3AsZiyvqgJVPHx2WyHjYZyCgyeHEHgC2oz",
        "2147483646/A45656668": "3LoWrkak5rKfscEZD571EeDw8uDbpmvNRA",
        "8974594/A0": "36TaRb69NDNom4LnYUAyxNUethAM2NzkHH",
        "8974594/A2147483647": "33MwVeJhqtWgDofwkPGiQafoeUm4UxVcYY",
        "8974594/A1": "37jimk66YwCELLdSNNfMbTLUL4hJ5vXhuB",
        "8974594/A2147483646": "34E2F4wZbaCKyrt8NGbbgiCoC282XkTQsA",
        "8974594/A45656668": "3BXeaYneXhEAkdJYg4vdiKovdkWjwrh9aF"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qryxs2tnymvy6hlkcydzdunfp992jne9chrj6jf",
        "0/A2147483647": "bc1q9a84c7zmj2nk2r26n9l9dnk20zr3ga4z3c4dfc",
        "0/A1": "bc1qqn7h48qw7mqgep8zwnn0n03hul6e3yrxkalqvn",
        "0/A2147483646": "bc1qrqr8jpsptqt5rdy976vymtemryjl84ldsvh6cq",
        "0/A45656668": "bc1q6na9kzdfv6t6drw3n38kfmhysg779amxxplfan",
        "2147483647/A0": "bc1qlsd3qjnus804mpy3xkhg8yumfx4ydx820zrpxp",
        "2147483647/A2147483647": "bc1q05sddtn92ayta2nmte9ytjx8p83ff99hz64n78",
        "2147483647/A1": "bc1qf4yygywayqz0pp6yxa42f4ak2qkgpafvhahcwh",
        "2147483647/A2147483646": "bc1q8hj3md3y930nfdgl0esqgep3y6kd0x7wexxts6",
        "2147483647/A45656668": "bc1qhvlt7y7luugazxxd2jv9lg0s6ur7fwjsq9ye2p",
        "1/A0": "bc1q399xljy7accp2whd4ekvfj0q6e4x90aucqr29j",
        "1/A2147483647": "bc1q73c73t46svl7767s6vwpztanyr8rvl0pql02c3",
        "1/A1": "bc1q8jl73n5nwfypp7u00qxuhmwrfr9dcpx5ssxrah",
        "1/A2147483646": "bc1qgzayjq8l05lyp7fxp3gekjm28u90c3qxdswtl7",
        "1/A45656668": "bc1qdtzk4gcsyhj2v5fsq04ku0d68dfr34wkh5kem9",
        "2147483646/A0": "bc1qa9pxklru6lustf6ahtw22wr4d4cxazvcnzh7h6",
        "2147483646/A2147483647": "bc1q64r9u0n9hu3va25m6dugxvjvcwlqxuhhj4pjxe",
        "2147483646/A1": "bc1q7scvkn293egmsm972pwr0sugfyzt9nkx23dljv",
        "2147483646/A2147483646": "bc1qc3e07pkrthtkh7fhyhegaeehrn3vcz0rva4n2n",
        "2147483646/A45656668": "bc1qj5z00c2h2ughmtw9mlxdnlux4cy68qrmynlwu8",
        "8974594/A0": "bc1qvmmhgpxfejwkxnhyv8qdjfw8w587jx7uhecz44",
        "8974594/A2147483647": "bc1qkz25g06etlyn84lnzn68eqvue24h9t6grz6m57",
        "8974594/A1": "bc1q5t34l0fmthekz4sslg2pr845u2xe4u5y0hk68s",
        "8974594/A2147483646": "bc1qle28tsmhmapkmd8l4lyeclzn7hzrq5xh5tc02h",
        "8974594/A45656668": "bc1q8regj07kcjw0yh6ps7e70hx63xtphaj3lxskjz"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1psqfx6c5h0xwcejdnewmmhygc8tkuwe6e504yt4vwudwtewg66gcq38fjz7",
        "0/A2147483647": "bc1ptjq762p9p8asuvvkkflq8r2ewfxstyt92kqqze7yx92r03x7xnyqfshpuw",
        "0/A1": "bc1pg4v9kpsu0n893nm5u0pvagalqhth3mk8r3tuvvzyy2azn6qq706sd4anxd",
        "0/A2147483646": "bc1pkpk9lza22yvd6hnzzha9p9lsd7sca8q3f3sc5exz2kr4k3n7hdwsqz3xel",
        "0/A45656668": "bc1pz9f2gw6w9ea3qkpgvat0vq4jrtwkyvv2yrtwds3qzxmdk36j8f9snhmtw5",
        "2147483647/A0": "bc1ppqhxcs5k5tywc7f87dqfr5lpyxgqlaq3cpk4pz0qrwwwuhpmaxlq0v45ss",
        "2147483647/A2147483647": "bc1plmehmwvaqfhyav9vjy7qtflyf380axl8zfjww30jsnks6m03nt2s78zu5k",
        "2147483647/A1": "bc1pkcah4aplpknyze7atvkf5zuxrtjysfht5nrn6ntuvkhj3dx6jkuqccmlzp",
        "2147483647/A2147483646": "bc1p8pz6xs9ug0jcc5evsajppk44620zwex46gp8nndesjq0hjz5snwq8su5re",
        "2147483647/A45656668": "bc1p90drvpyshury3m4562naln5wyrs9lt0ke8mmakx5ydqj98vgcy5qt3ggez",
        "1/A0": "bc1p97ywmz2c787mfwccpd520hx2l482f3szczmjx0kmgxlyg05c77csvlfn3k",
        "1/A2147483647": "bc1pzjp9w7ypax9e6egk3xcvfmsrf3jskz69vchw9h3rukgn4w3nsf2s8ytsxg",
        "1/A1": "bc1plz5032g4s939zunk4q0hh3kexqg6ztdyhu3yqjnk86956qxnzeusex490t",
        "1/A2147483646": "bc1prjuh0l6vsfkw3vxgzkq00ulkpm6fsrsg7wplv6925kx8z8vrx87qz22k63",
        "1/A45656668": "bc1p520ntqlw9smjx4et3m840fglzn8yak6qj4twv0aj7854jdfrn26spv2s0z",
        "2147483646/A0": "bc1p8rj6rwgncmfle4cehj7jvksfqe3m628njg7gv4kaw62j3m6e272q2yxyfn",
        "2147483646/A2147483647": "bc1pa2apcdpzlkmvrhh77p87kruxqx4rhe4q7e3p4742hrx5p3hzdeaqq3e4sn",
        "2147483646/A1": "bc1p6w57xkw0670mp8h56kfwppj49tyvnux4t2ycx3nfcwcjre4vj6xs5taafl",
        "2147483646/A2147483646": "bc1pw8a0942mxdxf3g7g4zatxqjv6venr6t89wg757xusfhachdtpv3spyq2th",
        "2147483646/A45656668": "bc1p9mg2g8g4c947t3pmvkwmac6uldrn9ze68uaam25utk27fnl00aksykkagr",
        "8974594/A0": "bc1pgmx6ckdzru7qsdmemxz570kfnu6qw3fa3t27xpkwqmu87m73un7sn79090",
        "8974594/A2147483647": "bc1p7m44sax7mhs83a9rvdxrwegn0xvk2x37m0e79ktztt4htky9angqjpuahq",
        "8974594/A1": "bc1pefh77cf4a9djj0k4jeqzk2k9ek840wpdytt6nu7h7gdhjee2flaspwrend",
        "8974594/A2147483646": "bc1pm8l33zj5s4k84qqp95tr6yq9fldde42l9e23vxurhnlcc2d8p2wsp4hlu6",
        "8974594/A45656668": "bc1pxg3s4s6prsgd64s28gz0psq609ahw5fdr8c20u0yj2da5e3a49pqvr0df2"
      }
    }
  ],
} as AddressTestCaseData;
