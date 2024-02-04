import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase12-密语1',
  passphrase: '56789',
  passphraseState: 'n3EKBUnoqYtYqg7qdUyCpehKXsuq1tx3yY',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392047',
  
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1MVMtyLARR9ggLzXh38mPqFeUhA6sRrqUW",
        "0/A2147483647": "19yvXec1RNLU29VDS1gPM9iBrBkgkjFrSY",
        "0/A1": "15MPLVZCBwbqPL1yDHzFsaoLAoWR95kZWc",
        "0/A2147483646": "1A29nrZ1QCwAk4xZgFfPNzHB4xjEdF256a",
        "0/A45656668": "1Gdo1U2rTytoQxUWUyuf7G2WkXVxZ7AYw3",
        "2147483647/A0": "14DTtWGhgxsDZuwtVEnaMKKYX1raLzKJRz",
        "2147483647/A2147483647": "1CsTp7KpxPsYtY6CW5P71db7A8FK6YstAu",
        "2147483647/A1": "14PVyta56MpHeLRzWefMd7hPNhcqH6sf5U",
        "2147483647/A2147483646": "15nbeqNrRkvbPgBdsDwkyJB4BrY6oqyioC",
        "2147483647/A45656668": "138ez12ef3b55Z2pjcEwQeCDnDfdCGqmPy",
        "1/A0": "18y4kS5kWNSJDBRmvgbJnqRMQkVqH6KD3y",
        "1/A2147483647": "1GPbrutmjBbdxH3r443yL3YSiPX8UJ1MFz",
        "1/A1": "1GWEg4q9EBYDTthedwfAHK4u2ArbWDx94R",
        "1/A2147483646": "1M1JTc4ZUxySSTUHmUKeXixUERPjXMTXUt",
        "1/A45656668": "1NWetL5oChMVTW7AU9kLjibtb9aeM8d9wT",
        "2147483646/A0": "19YasBagEw6u2ZQjXE9bxyBNqVmU2MEvhu",
        "2147483646/A2147483647": "1DZfUfrDXL8uir5ADwt8A453PsMEpPhPZs",
        "2147483646/A1": "1AXvn9D9nJfzEjG1MB66APuP4rBUTjzRZ9",
        "2147483646/A2147483646": "1KJ3TQydx329CmxAXAQ45pkSEBPKxq6ncQ",
        "2147483646/A45656668": "1LcD8EPiVqWbK37CdMmM6gAKCe6dyDUtQi",
        "8974594/A0": "1NyWn6ehSRHvzhpvzSi2sgzq9dYcb9Bda7",
        "8974594/A2147483647": "1J8FVF4f3i6x97DM3zEAd2XkfH7aGW2Mgu",
        "8974594/A1": "1DDF4uLbQwL2ctjA58rf9dxbMBMfuBpL51",
        "8974594/A2147483646": "1PwrY8hsuvc6Bk39QwXmokpwXHhWaGbVCi",
        "8974594/A45656668": "123XSpgW53YarQAXfEmF6Udtb5k3mEepUd"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "32mD5xAt2TBjgqqS4APeGYwKZasUTuyXgc",
        "0/A2147483647": "37wYxQxwhdZFexwBckD1gxjsZ59FSt2X5K",
        "0/A1": "3NJZSGZai3T8mpcddkrhv81XLS6MTMJyDH",
        "0/A2147483646": "3MV6ghiMwchNoLGMyPZvAz75DzFAUnFwvx",
        "0/A45656668": "3KWqAhDE8y19gZDWhX9aZMV4aKJUwvVX6q",
        "2147483647/A0": "3BUQe55tN2XafrXZf3432tkhSqUAeWk1jn",
        "2147483647/A2147483647": "39zEcseLD28fgBzvi4pf1AWHMsxq47bkTb",
        "2147483647/A1": "3GUp9i1gbyM8fkP9MVSJhjsmoVxSkCYRdu",
        "2147483647/A2147483646": "32xcDPtx2bcg1DZmmG6xSvk6zoXRYoYjXS",
        "2147483647/A45656668": "3DFkEKjdFy41AUvixcHVAb26VNkgRHacXj",
        "1/A0": "3KiqKm4kcBqFaaMQEu9wDUmEoHjGgCF3Hk",
        "1/A2147483647": "3PJNEqfipX6xk2hQ6dTe36MiSP7nm1upaK",
        "1/A1": "37YnzWrsrG4psLHkn4HJoAhJ8gUPwudTJ5",
        "1/A2147483646": "38XZrwEzwn9i6qLB66nH7inErgfRSLoPj8",
        "1/A45656668": "3A3JV7jMRG7xgVVmkUyQkS9McdfCyWdsr2",
        "2147483646/A0": "34bwZCqBDpT71LdqvrqnDURrBLj5ouriJ9",
        "2147483646/A2147483647": "3CgrNhFU3qkqNuB2rAxta8TngkXvV9WFNF",
        "2147483646/A1": "3QMYGYobauL3qiArWAeY8RYYTFqPqeh4PS",
        "2147483646/A2147483646": "38TR93Mvx1F4NByvxJioVckvGV8pYhMcJG",
        "2147483646/A45656668": "3Kk7qA4oN9e6rc1zAFCssDRqYfSWoSjZVQ",
        "8974594/A0": "3EsPt4TQA8RhWXio5dzpawjxGqUG25nGhz",
        "8974594/A2147483647": "31iW5B2hse87MorcEx7U5uvhguTstFXAWZ",
        "8974594/A1": "3Aq6SECTzwx2hA3gbhKECm4g1BiLQVnVut",
        "8974594/A2147483646": "39dcECg9udYEBq4CE5Vw9RXHiiCdy8uepR",
        "8974594/A45656668": "38vUwZoT5AEXHc3nJsbR6gUmVih5Ay9pcu"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qwglnckz8n0907sk435gaa59zc94k6m75mpr297",
        "0/A2147483647": "bc1qf6h2w07yemk0aq229y6ejjxktjvnt37aq528rr",
        "0/A1": "bc1qyryhgudz6aedc54ntyxchrrz3flel6rvnc8xzs",
        "0/A2147483646": "bc1qtmw97mex35ex2qxr4k3xh0lghwx80zpalje4yj",
        "0/A45656668": "bc1qm28h79dpqn4n85fprk76akujlx4g79qs036wm4",
        "2147483647/A0": "bc1qzwmp5uyzvg4mz6jdds53h5xn4l8ja98z8eqsq6",
        "2147483647/A2147483647": "bc1qjzd6wfsqs6l0aua5yehlxuzh08x9nt43zz04wl",
        "2147483647/A1": "bc1q208tge7r6f8rrdtmhr2wdhvwl92kvqsq7mrc0e",
        "2147483647/A2147483646": "bc1q5hsr3ytsxq68rzry5eecewxnzyvakxqx3mrvlw",
        "2147483647/A45656668": "bc1qespx3nua2mt9q4q583seuy20t0vq94548mnyx9",
        "1/A0": "bc1qwezfv6m52melhl4v2h3n2xtc9keulmu8est95n",
        "1/A2147483647": "bc1qpqu8ycjpwd20w4fcs62xyn0gatry7uj0vgvh6w",
        "1/A1": "bc1q0mptq4qler67kw928fhdzmecznfp4h7yl2ph74",
        "1/A2147483646": "bc1qd2cpqc6a3jv5sk5fm25qsrwp7tg0zltl7jjj0n",
        "1/A45656668": "bc1q52e8u6usz7fazeh84qrg8m5yjcf94n0w0u2efv",
        "2147483646/A0": "bc1q7wqhsmtcqdnl9u70nr5dwdqwyz3alny340g3es",
        "2147483646/A2147483647": "bc1qr48lka232fng7aqk6zgcca0szyvcwlsc67f7gj",
        "2147483646/A1": "bc1q5cwxgxw7mq2lelrwdn2dhlcvjmv50hdegfya6y",
        "2147483646/A2147483646": "bc1qwkujdr9t74shjtql80dugch9els56fce8vjd25",
        "2147483646/A45656668": "bc1qvf7v5e4amkuh2zc76r3gyje084ux8mnjhw605c",
        "8974594/A0": "bc1q3e72z67kxt403c2v8elhqjf6d99ms4g9s0dme3",
        "8974594/A2147483647": "bc1qaa09vaqvsgek4ggcu44y6knn34taxk6req4zr2",
        "8974594/A1": "bc1qjpr3g0wvteg0q60jrygryu58654kpv4yf00h5u",
        "8974594/A2147483646": "bc1q38platn93ltf3ae6ntgtudd9p78amhj7wlwlm8",
        "8974594/A45656668": "bc1qlkw2g7e3drr86slm6trhvhhlawzzuxjx0wl6m7"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pklfzrxljcvsg2mpd7w2gv7j5ygpntp878jr87w6kv3yw49ay3yxqqec6c7",
        "0/A2147483647": "bc1p0tj7hqpe3t3zyp2jfzc8s95sfydm7q84v499qvhee76ksh23cwvsv0qs7h",
        "0/A1": "bc1plqt2wv7n99dtg04fa44d2vqf3gapl9whqewjmt5y0j2kc27engtse5ak99",
        "0/A2147483646": "bc1p9ssrchkh0w9fwqj05egk83hq8uwnll74u5yxptsukl2qrm7wy0dsverrh9",
        "0/A45656668": "bc1p40lxe96vlu2jmqy499yzw93c44hvt8hfdtmc7kl74ys07w52dxeqczv7l9",
        "2147483647/A0": "bc1pwm7n9hu2uajja67n4jv6mydnsyfwzneu4zkqtzs4sqe00s6ajansy7335c",
        "2147483647/A2147483647": "bc1p8xa2xrw9dy772mzwhyvp798wnv0jej7qw5r5pwmt90pnd53z638q5qxq8f",
        "2147483647/A1": "bc1prhl56zk83uh3r2lppgdvdj8l3ytc4urhnc35u874pgu90uzxlmuqjy3vc0",
        "2147483647/A2147483646": "bc1peaxg4lq0vtx5dz0zg7sxpxnlha3cnrjfstd6ym342lhar4jds4lqzwswt6",
        "2147483647/A45656668": "bc1pr7x48lnydc6tad34ffvv6h8zn7p4z7qzez8nnmk4qfpkg3euflesl6setz",
        "1/A0": "bc1pjny53gfw5stru2uwjqcg2eqhwtfpqw23hjfeqpzhqsnqvz35h09s53e7sh",
        "1/A2147483647": "bc1p0r2hswz7f49sdxm6hm6p48r6krm0n8j0z50lu80987qna0q5af0qttngty",
        "1/A1": "bc1pq3hxzljkc6hn5t24fsxeuemhk0h5pxgqnu7w5nrf3jgjp0g2t7yq9m4p30",
        "1/A2147483646": "bc1pujkwvtlkwfk7kfqfzdn5m09qpkpsp0ek4xedqzsh675zg2f9sk8smlqlsk",
        "1/A45656668": "bc1p9cj95h9dd8gqvywu5mwplv3zcjufkv9faf67kygyfyn44cp9zz9s02lwpl",
        "2147483646/A0": "bc1pv6uwug3ef74vshwesmx0a4gk89zytv9pndxv2cxje5lrsyjjyx0q9cd4dq",
        "2147483646/A2147483647": "bc1py274npgqsmuvpqezv25gcrkrrpakp96jrph547285syh8tpc209qwwqcss",
        "2147483646/A1": "bc1pmnt8clwq36cl2wgt2u7mwah7044hls2f3vm0jcffs9sp2u4xhx9suquacu",
        "2147483646/A2147483646": "bc1p6wc93rgtkewhfnkkj67e9vfvkmvrq0gmxfxrlhgx3qc4k29mcf8q7e5psh",
        "2147483646/A45656668": "bc1puhxqz4av8l42lw77w9g7py0aar4ymuqh2vejw2zt97gpk88aq37qj92pzl",
        "8974594/A0": "bc1pguvg3fuc7f752hp909k023a6c6zqxpw9kz2wg33cjyjwvrleuxzqq2sqf2",
        "8974594/A2147483647": "bc1p0g8jqmeuu5649g3qu4nm2wz9xxcv8wrujn2u7pcsn684a3zu4ccss4c2n3",
        "8974594/A1": "bc1p73svna7mhj9dlccemsdhfzncy6ggnt592jp25ku6jhras9gzra0qgzu332",
        "8974594/A2147483646": "bc1pff2ht04alwwjrxrq8kn85pqatvv9cke42lt0h2ede90gcwrztfxsqksdw8",
        "8974594/A45656668": "bc1pt34z2fz940mqt58rttwzkx8q6t2x520au7uzjnkrnhh2hvpyzj2qkgzy06"
      }
    }
  ],
} as AddressTestCaseData;
