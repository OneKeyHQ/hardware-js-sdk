import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'one-passphrase18-密语1',
  passphrase: 'abcdf12345',
  passphraseState: 'mw4kcXbdNjkf6Zu7nU3oHpajXXCc9wkZNR',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490322',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1HvVxRB6qBVoa1rhToTnscWM5mfKxLdqSD",
        "0/A2147483647": "1Dc4aARcKyN32kgpREY8xXXZbYGzn6QFDT",
        "0/A1": "16sWqGE59ikHVqCjgD7sKpkVG6Ez7LYgCu",
        "0/A2147483646": "1FxSCF6fyKv3ALLf4aYobqUDkb7twxGb1w",
        "0/A45656668": "1HejxobR14B6Au4xZwe1F3PHrhrijbQbVp",
        "2147483647/A0": "18FpAC9bXGQjXCZ1GXvPKeyk3exs2ezsjB",
        "2147483647/A2147483647": "12UPAuTHScpDhGLYffEugCCX2uVXbcEdwK",
        "2147483647/A1": "13twEErLLhj1wCvmjLMQoPoeMgGXNmCmkN",
        "2147483647/A2147483646": "1FD99YVKbySTgA35iN1fb2L5ZR7vKa2m8s",
        "2147483647/A45656668": "1FjiTHBzC99fvK2oetybfq5qxvu6doRFSE",
        "1/A0": "19dJTeaoQk7QJbRXEDY4K3YiTb1ooQB6Bv",
        "1/A2147483647": "15BfhPRuXyUkakfn2dE2QMhyPRQ3u27VTv",
        "1/A1": "1DrCKkgzF2e65BtTkpK8nF9X6maSNu6Y4W",
        "1/A2147483646": "1PrpwLL5WU4JsPpLxqNz5p7bMxA7aqJi2e",
        "1/A45656668": "1AAJTqJ65SBsD7yhPWvVEfTa9Ws7tWmz3u",
        "2147483646/A0": "1Cb41ou3GkwRPo6Vzfz2mDxG8iBUL2XRXr",
        "2147483646/A2147483647": "138F4GuQx5WNQzRCJ92MZazgJxxxoeQao5",
        "2147483646/A1": "1Hw2J9EhxkVyMAQcvpaijnxn3StdFUVNEP",
        "2147483646/A2147483646": "1D3kmvLew5M2CQJHMBvL2c7SJdE9ZSMVw3",
        "2147483646/A45656668": "18P5VzoYGFwZ2oBrHDRXMBhE8TGWa86Ytr",
        "8974594/A0": "19PuE5YQzdj6v1PUDyq7Yr57aXW2gbY1mp",
        "8974594/A2147483647": "15hBVBJQMiEpfMCTooqQ3ccGGFzWnZdFuC",
        "8974594/A1": "1Ea25D2LPXxLivNLXsXAiGM65bvbhzfrVt",
        "8974594/A2147483646": "1DDPXGPqCHmPZQA6hhFpEPiCB65z9sRQac",
        "8974594/A45656668": "14pmsVUsH1TGZXs12WnxgsHJU8BLfSm9eR"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "35RrtiqvKuBnyQzHaqM1xTsQgNSsiULeBX",
        "0/A2147483647": "3GCCNpPyyjXz4jrSB1UnGPk3MGLp7S7v5w",
        "0/A1": "39piyhZg8EmP9B4mGaeBUeqxRqHR74w6eE",
        "0/A2147483646": "3PTTGKqC7Ra4kLKckqvuVe2Fv3f8ixoCZJ",
        "0/A45656668": "3NajrSRt3hpn5Jx7QHDAD2cgpmfnkAx9Wd",
        "2147483647/A0": "38wceYjxRHzCPzU6QnyGDR2Pomq6paXnFR",
        "2147483647/A2147483647": "3882eDXzTExCXRoyqbF3fdkCAM9ykdzBWs",
        "2147483647/A1": "3739T7UQD3nacV6Sh4jR99cgRnSSNBE1KK",
        "2147483647/A2147483646": "392At9ZeDkFGd4KBqe2oqfi1VYmqNWHKK7",
        "2147483647/A45656668": "3JLs1sEy1e1ow5KPHCXgfGs5FjJ2dwRmJi",
        "1/A0": "3QPVGh24E1wLANzm4VVrg8P9G6j9NwwdDH",
        "1/A2147483647": "3FK9N3oYW1L9d8A6vj4W3dBTqexdX9PuXG",
        "1/A1": "3Etnobg4z8gJP7c97qqM2XbZ1Q7BXU2g4K",
        "1/A2147483646": "37f6QtoB83GjYEp9q91VtHx1Z9F2MAByYb",
        "1/A45656668": "3HREZmyV7cHzNxN21vgmuodNxW1uMsBn71",
        "2147483646/A0": "3DGbwn9fFQQuHS6VGkNgn8MyQJSmJtpxUN",
        "2147483646/A2147483647": "362Hpc4bcYm3BrTpT37xtCvQvSFcxz8ahJ",
        "2147483646/A1": "3L4MDotXe2BXPAwfHotrJGTtqqyNYG448N",
        "2147483646/A2147483646": "33PuNbJvvpQGiyxU6va5GVJNw2gWuy2uMA",
        "2147483646/A45656668": "3KY5wyfsevGqkBgaQihA8ivDrfA3n9wan7",
        "8974594/A0": "3LRvc9y4eDWnz93i7Zy48oEz7pnqz8f3ND",
        "8974594/A2147483647": "34z87rr8EVTfG73T5sirmRumHcXxD1tGNJ",
        "8974594/A1": "37Bb1D4u2D62edjQGWNPC8xY7ivp7RQrSf",
        "8974594/A2147483646": "3H2YQdwLfMqFVB7beVFuD3h2TRQUNm2zZ4",
        "8974594/A45656668": "36x3W93exZsmpeKaajLanQPyEYyuqdrW7t"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qsp456wp997n3tyzhnjz40jlmmsrfuhl8rf20xn",
        "0/A2147483647": "bc1qxntqe8e7e62ldhr4xw4qrgx9nax73j8kvwn0jz",
        "0/A1": "bc1qllt3xf9khww2m6wd9zgydgnc6q9fvutll09e42",
        "0/A2147483646": "bc1qhp3d6set7tngt30myeqpc00gztt5w9ytuyt9mj",
        "0/A45656668": "bc1qdrp8vcwqffw44q5el0glqkxrusxlj4ehydax6l",
        "2147483647/A0": "bc1q7c3kdvz25jedwlzuggezqmguyhcwe49w8gkmvu",
        "2147483647/A2147483647": "bc1q44hmrw0fx5zh82madmmduch48q9t4jshqjh0x3",
        "2147483647/A1": "bc1q8762v0089yge5j60chk0800mph38r4649qelv5",
        "2147483647/A2147483646": "bc1ql07xdqxjs8d0s3pxzthvxaajd9r8r6mhz0nrx9",
        "2147483647/A45656668": "bc1qxe4jtqlzheh50glcvmk69pxcksaejfy8sm9jmn",
        "1/A0": "bc1qs2jp80e8rpauf5mgpg26r6ck3k9cts98w7nl26",
        "1/A2147483647": "bc1qeam94xddxzpf5l4pxsj6zw5seasmffl9ls2c7x",
        "1/A1": "bc1q4g75v7qpmqush34uhyp5uz5376n3ycx484lsxs",
        "1/A2147483646": "bc1qz8weved89d9a3sx4r4t8lg4x592fsr7ja2g3jn",
        "1/A45656668": "bc1q47v8w9j3ydm7rd45r77429wygfmkeesr9tuh39",
        "2147483646/A0": "bc1qf2nfeehehjvw2dvvk4aupvwzk4pmcpyyhvrwdn",
        "2147483646/A2147483647": "bc1qt66kqt74vn6krtk24pmwxa6manug0eezpp0myk",
        "2147483646/A1": "bc1q8kdhq5hent3pkwqclla9lj4968rly2xqv0rzee",
        "2147483646/A2147483646": "bc1qmz39nefzruv0gv44hp2kgrgv06shfdvn7yagau",
        "2147483646/A45656668": "bc1qcrkp6hq2f8wtm23ues4njeha87wgy4may8xl3l",
        "8974594/A0": "bc1q7mr6saqrtq5rclav6tkk2v7e7pqctzv77fcrmc",
        "8974594/A2147483647": "bc1qq4mtktamaxnyc60u6kv0nsw8t3hrh7zax7unm5",
        "8974594/A1": "bc1qa6t38hazjvxqpa280wyhqlp6p0hpt8zapag3qc",
        "8974594/A2147483646": "bc1qz4885g57p3nzvlm42yxmcmantl6tfx6lr7rrxj",
        "8974594/A45656668": "bc1qmae92atjl6js9qylw7dmn862j3uxt0fj7zzgqw"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1p70vhzf3tu0x56mup2qq8m0q5vd73hkxdj9v7xr7qqcvflmaflfws6zv6su",
        "0/A2147483647": "bc1p2r8u05ylkslsy9l5ytk7dq7du746k39m8805d70mmtjlsd3rz8eswvmqwy",
        "0/A1": "bc1pleq27qk6hup6mpk2eqyg7453mhf3ve23dvt924d0hrzthpj8tgdqgkf39f",
        "0/A2147483646": "bc1p5jpu4a7587z598w25ssu409uwx2qp783lr0kn52lhdnda9nyw5es89c2g4",
        "0/A45656668": "bc1p9nj6fyzmxzym3f3ztxrlh497wx0xhsclg06pn32s3d0qmnj0smusf47gy6",
        "2147483647/A0": "bc1p2hz8xwexwn2z0vqgughnvjgl2vklpryqm8yxj2frv4m9xaftj22srv0wya",
        "2147483647/A2147483647": "bc1pg4vynfvqx7hf0es9tp384k6j825sntr3s3l8cp2gwu6wzqpl52vst2p4fr",
        "2147483647/A1": "bc1py3q7aa8anlqdhwc49xd9g5tltak08sngekj0pg28gkpcwjx0uvfq02jndj",
        "2147483647/A2147483646": "bc1pjaelnw4gc08ly8y3sr2j2t3fyn86ykrxshwv4ffamw64de8gc53qm5g3z2",
        "2147483647/A45656668": "bc1p9q9sas0na425qs3035y6ysrj0ruhcl4j9tdd7pxrc2s0af6dg8zqt2lwrc",
        "1/A0": "bc1pq29edkus2nd4zanp9v4sxsfaq3zz8dsalruulj5c6lqsxq75q90snsywwt",
        "1/A2147483647": "bc1p55lnymfkakzgck2eneeqsauyd2pgnj86mynssllkw7fydspesvrqplsft7",
        "1/A1": "bc1p472sn7m99j7hy7l4z4kg3dcv8u3v5ukefpdvncjashejc63ncp9q7zc0xv",
        "1/A2147483646": "bc1pmhu02xkh777l933stxnsg38yv003cut4knmk56za4tnkxmnxhmjq728pzk",
        "1/A45656668": "bc1p9rm2v7qsrhn7272zmgjce7229q7yzwvkhsygt5wkjrh3gsl7y2qsjv6lgq",
        "2147483646/A0": "bc1p2c053uttuscvu97yzferxw7xnt8dg4gw6eevqsv0v9q93w7uxr2se6hlma",
        "2147483646/A2147483647": "bc1ppdpg8f20gswhfgj0eeapu0z7n28fmgk5s93t08he4sgsk6lwe0jq338843",
        "2147483646/A1": "bc1py93qe04k6c2ceygj3kuwcpjtwqnywwu46n7tlyp26ex6v9kexq9stzxvjw",
        "2147483646/A2147483646": "bc1paylkxt0pjt4em7u3krfl9wfy40yh7j5dt3nvjflfge37axlnkpwspc6ce7",
        "2147483646/A45656668": "bc1ppdc0rxdqehxu73wpxgtpdnmjpzdpcupdh9jkdp37jhmaqre9v7lsshf024",
        "8974594/A0": "bc1p2qxqa3nzke3a8hmjvjf52x9kxr4cxmm50vrrs8nc7tuv2egacjdq93xgel",
        "8974594/A2147483647": "bc1p04gku3h2m5yl7hx20zduwntz2eyu6lmpj4m20az5khznaq6555qs9lmuke",
        "8974594/A1": "bc1pe85xypatqws7hfwnjpqzl96chacryn8a5dzfy3mkuf7z9djkvnyq85rp85",
        "8974594/A2147483646": "bc1pzac6sd6528gl5cl8zf27er3u05gctw9taupack7q6xtnwscjlq9qukedtt",
        "8974594/A45656668": "bc1pnudyfglak988pdkgygjrqwy2v4xklfw4w6ru0qehfdcpwkzxxwus3eh6p5"
      }
    }
  ],
} as AddressTestCaseData;
