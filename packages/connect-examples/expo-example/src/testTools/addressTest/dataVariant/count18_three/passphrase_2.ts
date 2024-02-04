import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'three-passphrase18-密语2',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428114271',
  passphrase: '7789$$$add@@R@H',
  passphraseState: 'mp5EXTXF5h4QB2APmiRSEBi1xAX3H5ga3B',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "19KfwU71AitNNYoPkeJiSRG64thaCUFhFc",
        "0/A2147483647": "1V6Gma33DpeASoFQBbzUt4M2x9sCjhqcL",
        "0/A1": "16cq5V5fVYnSW5KZeeZsK1k1k7X44o5k7x",
        "0/A2147483646": "1BNGifitW5c4yacwwfmarKG2zz3VosK4qj",
        "0/A45656668": "18kKryGAAmZDke9qNU4fyNVFev1G4Fdjot",
        "2147483647/A0": "17W9TakrkNgMroS1L13yuP72GTRxguJS7e",
        "2147483647/A2147483647": "13uQVziXYEKetwpoJFi3EmxWH2SkxWsMB4",
        "2147483647/A1": "1GqqGL9togqgytVztucpDVWDY8kiyvytBv",
        "2147483647/A2147483646": "19NgtFP2KRpg9jDN4e737iWbapqV2HT3Bb",
        "2147483647/A45656668": "19EcsurBK3ZvvHpiuC817r2nUMdre1ior8",
        "1/A0": "1DvugtfmxAhsbBmrB9xYn22sM9ofHywVMD",
        "1/A2147483647": "1B6EU2PdqtmheK7HHBPQxkXeTMvyFAxSiH",
        "1/A1": "13HUNqLw6bCzQ8YQEpJEBCMrNhszJHQKNN",
        "1/A2147483646": "1AYi4jm6fCB5uemQgPpPLX1Gbg7m9FWj34",
        "1/A45656668": "1C6EufaRhrY4kqy7CYYYY6dNPSMeLaijAe",
        "2147483646/A0": "1AAjubbzWHcCM6VaxptSvqSmdsNT51cEMR",
        "2147483646/A2147483647": "17rwqavs2iVikFLBSCRkwce8BMBB1rP8Zs",
        "2147483646/A1": "1EBCa85QGd1itrppearxKJabb422MfQDcp",
        "2147483646/A2147483646": "18NDzFs3ydecWsVEekiSpS1sT6eXmuDhgd",
        "2147483646/A45656668": "15yKiVYJB3WGUiVttVXg4wSjvYj545mS4e",
        "8974594/A0": "1Fy8tG2cbRzpjzNhRCdkCEQRVLFVKHm62Q",
        "8974594/A2147483647": "13qqzJirZoBPLSdN24wUVVYDR7K7FzVGyg",
        "8974594/A1": "1NK9nizjMJhwNhc741RXHksK7sx8KX2vX4",
        "8974594/A2147483646": "18cCkwBEb12aPSKjnwRFLwa9supYUXvzoA",
        "8974594/A45656668": "1K1zQeysBe9JcMYdJuLMixcTjSUCDghERh"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3EsxQmYmQ33cE22KvJUyr8xv58D99rPfYz",
        "0/A2147483647": "3NtVXSyarASF14gowbzCmKEva2nnpFwWMc",
        "0/A1": "3D5y71tgth9YrKnNPwn4qKLFdnfauGoDe7",
        "0/A2147483646": "3E8sY2SeLmJLC1dWJKXUpePc2oJQAnVMZN",
        "0/A45656668": "3D7u7grSFk1qhQ5bTNyKbZpNdDnEbQxj7W",
        "2147483647/A0": "3LEmNCPYWUufDVEMYj26wUo9jbf7JCjRzk",
        "2147483647/A2147483647": "3JnS8B2r4K6TmyKGXkPzRMCJC1MPJ96kcF",
        "2147483647/A1": "39XYrgkgwhbn2qyjG46GqFCYpLXovSQdxT",
        "2147483647/A2147483646": "3G5gmxFVXaNBKRwAZasCHztt3BCvXMqziC",
        "2147483647/A45656668": "34LqJJ3RJpc5wbgkb7zGv7TpDvmDZU4r2u",
        "1/A0": "3Pckizug9QcuGsZnaLCrjFwAqcZjB8CKKn",
        "1/A2147483647": "3KcfrbkY5vJqsMNSAWmj3wjiGuZdPV5rfH",
        "1/A1": "3L4z5XedKfXj9hQ7MfVfuYEkRZc22SXcWD",
        "1/A2147483646": "3D8xKAoPkZKe3xuXLcP4d36mxJnrcoaUw1",
        "1/A45656668": "3Ctq8MSSjjWqMC4Mhp9i5J2u5aTVQzxrNF",
        "2147483646/A0": "3HYEEMPue66fRHQ97kk7tbCsDQzfwqctha",
        "2147483646/A2147483647": "3P233pYmAizbouHQ31oQsAZVYTT3BQS6Lx",
        "2147483646/A1": "3AqmvFyA14BYyPXMNXKAip9ewxJ7mXE49x",
        "2147483646/A2147483646": "3HDkBM3755KpfnbBVNCHppwPhvSPbrtKzw",
        "2147483646/A45656668": "3CZGeMsf1w5bDC5hcsuaX8zmw4hWwHDwqK",
        "8974594/A0": "3PwU1yaUNnAQfYTzUDvj4cLhSbx3sUFoiL",
        "8974594/A2147483647": "3Q7gaTu2MG9pAsj49bf5UrH8QtavoZWFoV",
        "8974594/A1": "3N4UiBhazKLtx5fHktqnqwf4dahXZztRCF",
        "8974594/A2147483646": "38yhkHq5XHnXiy7yU31tALfYxB9WUA5GYq",
        "8974594/A45656668": "3L972o9zt4g872EfwjEPmxbyEK14wQaGzG"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qsw6cknnfqf6fs35k8kdl2x436zyhcrj4np9rkf",
        "0/A2147483647": "bc1q9plzlwu7jdj6swd0lje6r247azu0rt6q6j5m83",
        "0/A1": "bc1qltzfg2ny4j3gen4xluus2csgwj0aynywn5q42z",
        "0/A2147483646": "bc1q09ectz8thgvpwzaaz45cdt5mht0cfggg399l4z",
        "0/A45656668": "bc1qlwdntcvqcp85uyl7jv5sz92997nr0qwfmxme7g",
        "2147483647/A0": "bc1qxh6a8pjy27puynydmkw8lv60jn2npq5hvnx5cy",
        "2147483647/A2147483647": "bc1qd9ztyhhd923u0r3af37k5k3g43fkrpwed4xjwx",
        "2147483647/A1": "bc1q5mj3dyzm9qq9hl9ve3p92f36mrr6ewxg83k3jk",
        "2147483647/A2147483646": "bc1qjdezdr8rt0r3p56s37fgj252twh26wmeja8ahz",
        "2147483647/A45656668": "bc1qhkl87kfrc5smjgmw92w5v0vr6ksk3yzx3p02fr",
        "1/A0": "bc1qeh0yndq5x6wzk0fjz3l266yncedsxzq2vgun6z",
        "1/A2147483647": "bc1qs7yny6hn5cc8ywwd0d72vln67szcxtmksmlrhn",
        "1/A1": "bc1qjgkajd9qgxae02qweazvmdal09vg8kzqcewj8p",
        "1/A2147483646": "bc1q5kepppzyey5ep354p6vhrww06pte5jqhqrc3h0",
        "1/A45656668": "bc1qvv34g24tzvd3w278nd7jgd9x582lv8m6hqm3qt",
        "2147483646/A0": "bc1qmwlulxf08859st563j65z9d7zswlgvy3egl7d2",
        "2147483646/A2147483647": "bc1qqpjnaswmxj0fcdae76zyml5y5w5gaul5a6x4tg",
        "2147483646/A1": "bc1qt2wtakhkjfvx4c0j3ezk29whq2mp8rk3sr2few",
        "2147483646/A2147483646": "bc1qka49e37q29vjrayxkm0yj5l24ryrha3s6taspv",
        "2147483646/A45656668": "bc1qy52qhtguuvwdfk8z0y5xx78tsyujxn8jnplgwr",
        "8974594/A0": "bc1qr2ykruwx5unnukdrndu7n9qd3c5ty3sytjp64t",
        "8974594/A2147483647": "bc1qq3mys3jvs6cvj79dh00az9dreyrtlctrd0uaty",
        "8974594/A1": "bc1qxxhggc4uv3lq6sxj8prgmvkxgcauzq42tvvm0w",
        "8974594/A2147483646": "bc1qntuvpzh66t8yfnk99ue3yw3295craph2wzuzg8",
        "8974594/A45656668": "bc1qvf7xg4k6arnf8yqup4av8al6k76436ks9l4snq"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pf8p2c7d5haqcfkzqmm9s8a7crq9awh8pz9a3r9f5gwj2eukuajxsgr9rwu",
        "0/A2147483647": "bc1pxk602lsndvjj5t22xq7f8ymuezhpfxz0v94hmcss0efp4tmuvmkspwjacv",
        "0/A1": "bc1pef58y4z8e44qlqnnf6umuu3n3cv99fgq7hc9ha4qjugu06tyu8hqkxev2v",
        "0/A2147483646": "bc1puaut52vctjxsqcscyngtjteww9hukdjtsw8xd9nzjz5g7nwymv6q4yxlht",
        "0/A45656668": "bc1p2x9pdldsswlct9tzdwgfgsmfm35g2y46nz6wzq5swuhhrd0vlllqdquhsv",
        "2147483647/A0": "bc1pey37kfhylsrny5xnmc8ua0392emkssqphq83r42a8rtt53j4522qpcswe8",
        "2147483647/A2147483647": "bc1plsk6j9acr04lfxa4e9m43rzza3wdmxufvfujq3pwgug5yagyxclsqe7fnj",
        "2147483647/A1": "bc1pepalp02860m3ar2zzuhttp3cld0rxge4q5xr7ka25ru7e78hd7cs7ecfm2",
        "2147483647/A2147483646": "bc1prn9p064ghuz8rvs8xvgzln6qh7y2w935pzeu7jj60u8vgprluf2sg6cng0",
        "2147483647/A45656668": "bc1pr9gcx9z65kht6d53mmw2gzv25hk3hwqex0dpm7tx26t53w344ekqn4sue5",
        "1/A0": "bc1p5cxalrdv23z253jg8vepaqhz6mqyef8zrt6d9syjjwt30hjew04sdk0hd3",
        "1/A2147483647": "bc1p065ka279lfrg8hfvjw3xz99laummf06d44ghexzyrr82qmz6ua8se0xf9f",
        "1/A1": "bc1pvu7ys2hsxjsnmgt4pwjup0r52wxvqyrk4xeg8wmd7kha0fh7cr5q7x2t00",
        "1/A2147483646": "bc1pf89wc5s556xrdnv7035jqx997ungeg6rew6l4k2jjekraf2p80qqt7lnxl",
        "1/A45656668": "bc1pa4cqljqxl3nquh6rwfeu2eelx7ltt93qnrxrlfd2f85x2czwz4yswpdpk0",
        "2147483646/A0": "bc1pfug9au2hg7ncs60phyvtgjdm2dt0flc5z5xapj0mujs6pwepj7esn8jne8",
        "2147483646/A2147483647": "bc1p6qdqkldmvjpltea4q889eys6et40j9fs43z82f79w4kv5yegqxesuqktx8",
        "2147483646/A1": "bc1pr3epknqyp9y5u4vn7j8q2djwp57e5uckj9wkm7p2gpyzrtdgrmtqn6ygrf",
        "2147483646/A2147483646": "bc1p6mnete0tppzeevjjwe53rhnu67qsew6tpad79dnznjzkcyfpk2pqy37qae",
        "2147483646/A45656668": "bc1prsyndzdkazguklqtwhr3fv67mkurs3cmx5n9mkvqdqy6js4f6t7sc6aej7",
        "8974594/A0": "bc1pf5u8kcm8d2mnrptd9sr0qqrgn9p6qnhxsefcctjw93qtdjffsf9qu2cta9",
        "8974594/A2147483647": "bc1py69az8m9zf93kwx84kc6753nwu0dfx2xue2pxj7jf0lnpt4mjkrq5azhmj",
        "8974594/A1": "bc1pch7vn0hmeugp0h4q9ujqsl64s6h3kuvdhndz97zsxjh4esmn7tkqj923ze",
        "8974594/A2147483646": "bc1pzwkn42py4c30jf5amehq928say7g6dgumecuh267mw73wl5mnqvqcvsnl5",
        "8974594/A45656668": "bc1pev6d36rez9qjcr7u4j5z90w264zhd82y4tpdql32y93q02s6xueq7kduge"
      }
    }
  ],
} as AddressTestCaseData;
