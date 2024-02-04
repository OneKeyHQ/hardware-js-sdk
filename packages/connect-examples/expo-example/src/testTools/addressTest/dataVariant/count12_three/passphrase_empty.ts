import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'three-passphrase12-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649',
  passphrase: '',
  passphraseState: 'mpERhxif9Eaovvh3PfStVMDKrwCc8ELwS9',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1BwB5Ccg2bpiaeDZVGe4C9ZfEaKsAdo5QP",
        "0/A2147483647": "1F7AEXkh1wEd8aNzDj2coZS7c1L6hCDdo4",
        "0/A1": "1BUPzG1EnD1pnfyzAye1CLSLsNcwYhTg6A",
        "0/A2147483646": "1CkZk8bXyXevtQByLxMu61PMzapSEL2y85",
        "0/A45656668": "1QCSDNaYp5yTtLa5hjJadjWTAZfz1tAfhs",
        "2147483647/A0": "1EqY6m3c6ufnuKkq436esBdbGwxUxeV9LS",
        "2147483647/A2147483647": "17ACLjvYCALGfuFWLyVmEnRnrBiEKNeuTB",
        "2147483647/A1": "1GkFdmjcyWg9m9xyNufF8ryugt7EwheJdr",
        "2147483647/A2147483646": "13QBDUBpb3Niwf2rSEYesa2TaPUxYHgVBC",
        "2147483647/A45656668": "1Mxoi7G8cmVNdGQ7rvgSubLobRnw3xRAjx",
        "1/A0": "1A9PrrHTndPdmU95eF3GF96s7oeUFDsNN9",
        "1/A2147483647": "17YVYrWKEUv15xdxPgnLFye7RXRYu2HhZx",
        "1/A1": "18kjj6ZU2TBVALfbuGjwXTDGtvZoFPWkY3",
        "1/A2147483646": "1CEZVoGhtw9ey4o38cMLoUE23fBM9JPuuu",
        "1/A45656668": "14EdxZ84g6jZHG6peQgPwm3PSSv6nQ4zLg",
        "2147483646/A0": "18HzSL75YJs7zgC3ZCEmR4cwMFyjH2qotR",
        "2147483646/A2147483647": "1CQ17BU3nT5MbTcGNHKvma5utcCvTQ6Ktk",
        "2147483646/A1": "1J2synEDJpnMkdUPLsnVvJD2x1oLaZhABY",
        "2147483646/A2147483646": "1J8K8U9VsWwMXLwjvgCx7tVcXa6cwuYCKW",
        "2147483646/A45656668": "17AXbnyqiSxJt9ryiXR7Mm8PkH4Q52oZJB",
        "8974594/A0": "1PY4JQsNsq5Qn35Y3X3AGsi8nZw6NLgMaP",
        "8974594/A2147483647": "19RzycXTqbZdjBCKJJbKok8ku2WJbtF49M",
        "8974594/A1": "13eR9zRLB5PQSWXpD83wJvqDKV7YKx25Bi",
        "8974594/A2147483646": "1BbAPuU7jRcQstvqgaEQLXrqvAZK94hCza",
        "8974594/A45656668": "14UAk8wDsNg55Bk1AMMMAk9THtNDq3jak6"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3ABPiv2fTPqfxZ8FFGc9RwKVAqRHrLdGtq",
        "0/A2147483647": "3Hku3bmctDn6UxFJ8z5gHHKCe85VfyvZ62",
        "0/A1": "3AedNthV1ufgbHFBfSfhnf4rz5QCdQAzqZ",
        "0/A2147483646": "36eBcBbHXdTXyyLanN4ey1dumAthK6Ramc",
        "0/A45656668": "3FjkW1U1W8c2vznfNYF7CgyeKzNVdaSR82",
        "2147483647/A0": "3KvghrJbi6Lj6qhBkcPyd7bSMM47jZ8EW9",
        "2147483647/A2147483647": "39EbEK3RoZ5mFsFkANNGfzNdsv1ghj6J1W",
        "2147483647/A1": "3A5dsye7Gj4NsjK2oLLMqpfdNxtx3tWgSB",
        "2147483647/A2147483646": "3QgSA5SWq3mqbYqC4r69DfisUBNY988PQP",
        "2147483647/A45656668": "3BmMJuKaHG617Vx8qJpHGqJeUENoPp8Uvi",
        "1/A0": "3BzeLyighXkD1h1rnjUG5iphFDSFaAFxfX",
        "1/A2147483647": "3Qmhb9jcJmZRCSoyJLH3hVk8hQ7TNkvgy9",
        "1/A1": "3Bu5eV7ZbXJgzxE2RAkoatdefuVjfB5b3x",
        "1/A2147483646": "3DWhYatp5kLgFnyLQyfvuPgBH68JcBGBLc",
        "1/A45656668": "3NYojFREH1kwMsf1zRUktMV6ThbvogDca8",
        "2147483646/A0": "3MkYJFb3Sz9a1eihoogjh5ovubv9PjkABB",
        "2147483646/A2147483647": "3Gy8auGGZ72e3qDu6JQZogdYUaSKV21nZD",
        "2147483646/A1": "39eN2GMoqjTh3CuGJEC3sCA3un1RupMaqh",
        "2147483646/A2147483646": "3PvKibgAW8DJs7F8NSqMW8btS4ZvoYUkeP",
        "2147483646/A45656668": "38jeDm4vTQcQoFfp1LiYTvwT4QZQuywTEz",
        "8974594/A0": "3LHL97nHZrKJHUaNPtZKmVnguFukJPiTXH",
        "8974594/A2147483647": "3GNx6v8fDBNefVeMXYPiDRmihe5KwpMk9u",
        "8974594/A1": "393smEhkVmcxRcxMrj265cvokpA8jGMjPK",
        "8974594/A2147483646": "32PSujGzYm8Z2XT5JNm38LBAicYpwrQ6L2",
        "8974594/A45656668": "3AUoDCJAnkwGQs9WXBsjvP7FceeTzv17Hr"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qcaj8l36vx0hlc8j74kpdrkxue8t4ljf75cfxfe",
        "0/A2147483647": "bc1qf5vkm5ru38eumggntsyjksyxgrgtckky95e4rt",
        "0/A1": "bc1qhvs0ct2zv87m2kpda2t88dfd8qukcl5w9mkxmq",
        "0/A2147483646": "bc1qkj3vvevung7h4l77r82tl80855t9d9x9qh4evr",
        "0/A45656668": "bc1q4zsn3y00824d9lc25y6644ggvyv0dam0k3hplz",
        "2147483647/A0": "bc1q89fwsdt9369e02w4nxhnszfne328elykkund09",
        "2147483647/A2147483647": "bc1qxwdmx2a8um4vjq7ksdzqqztjh67g2c8kx48ll5",
        "2147483647/A1": "bc1qxgpvmc543qylf8laqmf3ynn9lpq8dk4zv3u8ts",
        "2147483647/A2147483646": "bc1q0987px9pcml0qe4erxz885tu7k50czwf573rg5",
        "2147483647/A45656668": "bc1qnrvs6a3plkh9pk0szwpx6m4aeh730sx9gv3qc6",
        "1/A0": "bc1qa6sz3kz7xgrk3uhmhhpd729wssd0xv8h395sxu",
        "1/A2147483647": "bc1qmdehc5kxlrf6zvke3g8lwzh585gwfj2x245hnk",
        "1/A1": "bc1qtxsyfy7m5g9z3asrphpjfjtfzks6y6z087vnrm",
        "1/A2147483646": "bc1qq4qe4n09yarz476n7a8hnn374kdqg05zkyxdey",
        "1/A45656668": "bc1qagr9ds3cel0jet4khs59vg3evfsw52k2mjn9pz",
        "2147483646/A0": "bc1q09weu5w8564ne9tqfm0vwlwe93gprmyvna6rar",
        "2147483646/A2147483647": "bc1qqudq9ttkmq8p2zqqkxwl52saxkxd8g5lq5pgv0",
        "2147483646/A1": "bc1qyx3c7jsn8h4g3edslyszkrhtsy9j8snvjxpgsz",
        "2147483646/A2147483646": "bc1qsnltkuvetmnz6efsmm8hdkpfq7kv2m2f6y7ma5",
        "2147483646/A45656668": "bc1qmtusvxpn7txajapdsw776fd002mw2y82q3uqz6",
        "8974594/A0": "bc1qwycr370g0yhv4ax4y5z6ealsflfacx6qxcau6g",
        "8974594/A2147483647": "bc1q9fqsdpja0pa827wxafh4y5hd37cds2kfajpykf",
        "8974594/A1": "bc1q0nm9cftrd3e48mden08w9xzlttcwfhunv8mg9f",
        "8974594/A2147483646": "bc1qjmg342ausx9z4a9empqq8k67afcj6tr6956nzf",
        "8974594/A45656668": "bc1q7ujp3fcmkc9sdfpuemkmj2mskscrzgglu624cc"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pzqwafdyrw23ugksee8y509rkst4qjhzqqw8zmjdt6asx59y5amdsx53up4",
        "0/A2147483647": "bc1pk290deqtjg2527hx47vg73pps6w2qv2xmhgx2agn4285q5qljs2q3snpvd",
        "0/A1": "bc1pmhpruanw0hplgevx3zl3puj0zs8a3xr7hm87yls3f9dxv449sacqp4fr7m",
        "0/A2147483646": "bc1p9r2gamwu0f0x59u8njjzz8638ft47r53c8tnfruuuad680mvrpeq7ce36d",
        "0/A45656668": "bc1py7dwhp48dag0uurenfn9c2phaz4ju2602kl64sywek9gpr6hwpys0jc09y",
        "2147483647/A0": "bc1pxlurkdrej39k3kp5ye7zm6djc00755wkuh4anwhc7472n68mx4gqgu66pe",
        "2147483647/A2147483647": "bc1ptk2247mxrywr04cf8f9dau533xsucpchppp3xa8hrd47duvzdzeqs3jdn9",
        "2147483647/A1": "bc1pa366q23slkst0lh5d3a7cqk4apxt6q9htndph2uaa8w83543fmrsxcfrv9",
        "2147483647/A2147483646": "bc1p0pcwfjrnfvcsfm87uwac0wezgt4jq6smxcal66qv6ygx352ddq6qyzxafc",
        "2147483647/A45656668": "bc1prkqyydkgp70t7xcyf206rc3l0q43ckua9vqgdyfk6x78hthhgp5s36k7xc",
        "1/A0": "bc1pzvu58wyvsalnrj0v5dla7vgpg4su9xa4c4khncdjmmu49v2zv09snd5unu",
        "1/A2147483647": "bc1p2hsutf5wqmaxdc04j46eytturgp7rccppfp0m7mruy335n4qqlls7uwxha",
        "1/A1": "bc1pgy6dfd0lfauu64xl59u52sf5q296zsxsfd0enktteeghdthyn7hqnx49vv",
        "1/A2147483646": "bc1p45ml38y032t56hja42pmc5rucyc4gkyk6l2czd8q6zcpqaq4ldmsuuqw28",
        "1/A45656668": "bc1pkrkc3lkv2wmv9x53l96ctsadh7vqq96hzsmsuanng8f67mup40rs8vptk9",
        "2147483646/A0": "bc1p2fc3rv0wt6g8swk43794w0crea64yjstcrf2dewqxgrfmzy9gylsuu69t2",
        "2147483646/A2147483647": "bc1pkp6sfy6uflslpf7yn5fkhs8ztvgf52ue3gft3yp2hsfp8k90xd2sa2vqed",
        "2147483646/A1": "bc1p30acq50s20w2lnfqsmh4p8lc3xpfhfnl2ua2cxr7y9qrvguz2vmq4kg5cc",
        "2147483646/A2147483646": "bc1ptcvpys9uutwerqawxcsmcw9pgpjg9qtgdduqg6kcg2ytu9dkfwcsyqqxvq",
        "2147483646/A45656668": "bc1pqfcenzh0ysqtmyh7ysuwjk3wa9d4ju60zejr4glekfn5e74v5aash2vhl5",
        "8974594/A0": "bc1p63d4cl9vfnw7lc8n9q2nk3dzsq0avut7357fkq0zfp09pscm05eq3zkg3u",
        "8974594/A2147483647": "bc1pp2r2rvkaa0jnanm2kv622hvm4yfmt3tprvtn8sfrdxrd6xut09vq5m495h",
        "8974594/A1": "bc1px2kcfsnq5c7ljs48sz7sl9m6nv7gel83yqk2z2hf3jdalc5tummqpnegdc",
        "8974594/A2147483646": "bc1pg7jywdrhw70e6ggf5yypue4nam33ae6ew4vyu9mdvvm6na0gdu7sl7wugq",
        "8974594/A45656668": "bc1p0a3n6c4ch8anc2a7axfcmnu6r7mk8qj33n8enr9shy06uh4wy07snjsrju"
      }
    }
  ],
} as AddressTestCaseData;
