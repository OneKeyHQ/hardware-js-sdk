import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase18-密语2',
  passphrase: 'E4j4fjFFA~',
  passphraseState: 'mssaQmy8Mt5LoZQaEdqJQbQ4RwUojJGjwL',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1aMKedvT86qpVz58osnto1ag1baHBRm76",
        "0/A2147483647": "1L4Zk8t9PnQhpai5v3pB11V3viCrJbU5KP",
        "0/A1": "1AHTNx4ADCUeJBcv8QVb5gSBuPmwYqf9Zv",
        "0/A2147483646": "1Mzad45nt5LpcKbAbc6jt6MorGojsbWhqk",
        "0/A45656668": "15pC2FS5QXGkWns45UahMY2tqCLVbrYHXN",
        "2147483647/A0": "157TXNVbvjzW32yQVyeTScSSpxC7RUTAAF",
        "2147483647/A2147483647": "1E7VsrzsKzADt7f8sCeDeGMvLBdPB38CLZ",
        "2147483647/A1": "19uymqaTg6atw7FHYNpVaLkJpMJmXN1uEs",
        "2147483647/A2147483646": "1GMFgwp43wteAo9rpA3jm7MTBHnSV3LrhM",
        "2147483647/A45656668": "1JLxaGC8YmjinixuxtD9PcGsot6aeZFgbt",
        "1/A0": "14MxM1ZencQZacphAcCXdVZ6ZrArXCEXQt",
        "1/A2147483647": "1HSQbHjDXaa6imabKes6TBx6R6athhrGf6",
        "1/A1": "12yp28kKkQR4ktZ99ZtszgAwjc5m1g56YJ",
        "1/A2147483646": "1Ln5wLJtARiHgoxy3bzaRmGQdn876VjvxM",
        "1/A45656668": "131fgxGF6MCLugRVGPsGagM4RAaofCZbUq",
        "2147483646/A0": "1MHpKF8YJhVvTxQ1XsdgspY5S1WTd7Ais7",
        "2147483646/A2147483647": "19KgdaxJG59MYVscZq782uFs5LJL1i5yPu",
        "2147483646/A1": "1FWYrKRNQSFUivZ6BSfcQ9wjuAXQ3sxYY5",
        "2147483646/A2147483646": "13Dus81LcjSJzqNZysB4gNJjMGDpcu47Bv",
        "2147483646/A45656668": "1bdMhSu7VME7nXP5mqtX8rYU5HTTTSxRn",
        "8974594/A0": "12f2a4BW1zgB5tssnA1P7FeRxb4R7NK8Lz",
        "8974594/A2147483647": "1GXCHv7wNgsKaUPdn3uVapJDF2XmGTPHYR",
        "8974594/A1": "1D3dKe46DdVeM1P3EFqWbVR5F7WWfuhqwJ",
        "8974594/A2147483646": "1Gsdv3ausYtD4FZC9bHhYDCCpMsrES9gk8",
        "8974594/A45656668": "1AdW5Bh1YrMrwJAj7e8apTzpn23haqqkoE"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3F3ZLCqrJURbpqkqxC6NgqvPzWPaqyyz85",
        "0/A2147483647": "3L3ZyC49um2KPbPA5DAuHCVVWL96zqnzJM",
        "0/A1": "3LQxnxU8MBsvbZEApXfWZTLbYvGkfU7oF2",
        "0/A2147483646": "39RpTptn28yhXZDajbgJearvcSm2hgLggP",
        "0/A45656668": "31jfu6cqHShPt4EZqY1zwRvKRPmZwTcLSe",
        "2147483647/A0": "32WY191WteTKMHXRG4bMYUN8V9Z54NtpBY",
        "2147483647/A2147483647": "3KZ1g7pLLM8w9cw2Mue1DZ3aKnAFQDnfGs",
        "2147483647/A1": "3KnUKnRXvz9S7AyGG1XGJRkmWvGz1FZcj5",
        "2147483647/A2147483646": "34pKPkzRbK6qQA2egyqKLUs9zHXnx3ukuF",
        "2147483647/A45656668": "329cSMLD7JQsUuYYcwmqMHxFaJhj5a62w6",
        "1/A0": "3GgBjDEoQyzSYrw1BtzRSaWH9aKofkWJEH",
        "1/A2147483647": "33PrjwtYemoL4UfYauY3Uhapcd5Q1aqsY2",
        "1/A1": "3P5wuh3Q7ATSMGYqA9WeM591zpaZjh6HjP",
        "1/A2147483646": "36d6mwMv2Mjq9kAybX9mGiprykvoocCU5t",
        "1/A45656668": "3Kc8XdwaniKJzx6tGbxs2GmLNc5eAePgsF",
        "2147483646/A0": "35VFeTZhz1RPSUJDwCZgwqThM6JAzpnU7D",
        "2147483646/A2147483647": "37khPBTim13LRTcjYx7G4AhXBs6Y1qsnnh",
        "2147483646/A1": "3PCtDLiaxj5engrxkdSSdSw3WPQVVkUFTd",
        "2147483646/A2147483646": "3DhQg2sqtQxyJhdosmJqyYHqGrRo2A1W2i",
        "2147483646/A45656668": "3ABbcnHqVUaDrVr7Pg1hg8nNrmcEN5nN1e",
        "8974594/A0": "3LWP11HLzcWQxs16n2s74UK2xDaZyrsr5N",
        "8974594/A2147483647": "31jDesaCaP4SzPkDDQP2kVktyryoNW9Bup",
        "8974594/A1": "3C3WJEqghmHeerMS3g2ePP6M9AQmvbpH62",
        "8974594/A2147483646": "3CQ74eSBYcSdrMDPrF2mxrWe7rANPHaw7h",
        "8974594/A45656668": "3FKG5FyAUnFFo5q38AK7Jby1zy1ybXbGTy"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q7sfdjkvzfv6c6euvtee06vfshzpjycefcjel22",
        "0/A2147483647": "bc1q5vpm324q8tl830edex5d2862hr5uavu5vz04eh",
        "0/A1": "bc1qfme0eumg9wn8uwggek7680mxca8sr72gksnhgx",
        "0/A2147483646": "bc1q9h4pwyewdkppfl9mc3ta92u08sp0axaqfkye7t",
        "0/A45656668": "bc1q4v53lywvy4c20n5npypm229avq2wv0shtlz6qq",
        "2147483647/A0": "bc1qwqctqmlda3c62uauk5hqsaylnjparecxdg2ckq",
        "2147483647/A2147483647": "bc1qc8qdg8dm5jckewefwanfmxdd9smmq35dnfd8qy",
        "2147483647/A1": "bc1qjf074c0dy8d7jzuf2xag0460wlwyp42vm0y2mu",
        "2147483647/A2147483646": "bc1qrle0y93a73ttc0pcnxuak9s23smlfj8e240rk5",
        "2147483647/A45656668": "bc1qzl4m20qcsffjc090as4nu008uc0m94er85yyc2",
        "1/A0": "bc1qq3lf74hjxafwwtmy2y9857nrwnj2ed3q5d0gwz",
        "1/A2147483647": "bc1qc6fu3akspyspdyvtfnakpnd4qrkx3hvm8wj4u3",
        "1/A1": "bc1qn3tkdftx0w0ss9787n9cgf2cutchtgn3azuymx",
        "1/A2147483646": "bc1qupdukk27cvlunxx75hsgl0z0f6gap7m9ccsx53",
        "1/A45656668": "bc1qx4r2hgezvjg2cykrvmsnzzq42s4057tc0h6h44",
        "2147483646/A0": "bc1q3jthvvu0u9hmpk4ttdmy64vag9r4gxhfdjpjc7",
        "2147483646/A2147483647": "bc1q3smrvnd6qsrtmz660wjzweytyj4zw2zsy3nc6t",
        "2147483646/A1": "bc1q8qf8mre8rw38kudwlhlfydfulpj629nvncdlhw",
        "2147483646/A2147483646": "bc1qc7z5dwqmgxfyd5d4ejh9hprwuxgrx63evwr4qm",
        "2147483646/A45656668": "bc1qljqlcyr5nress4gmg73nf9rg7ltz3g2qmz30dq",
        "8974594/A0": "bc1qkam7sqwwhn2rqgnegw92jf4g7a32xupahu9nez",
        "8974594/A2147483647": "bc1q6xe0wmrdxgskzkmp98wjstrhau62as5hhfn8u2",
        "8974594/A1": "bc1qxj3q6hgjme4cf4ckqqp7hv5vrfz70nqf9c9xf6",
        "8974594/A2147483646": "bc1qu5l94p6xe9v534n5qc2dlaee740z242jr2vy7h",
        "8974594/A45656668": "bc1qwv5dgnmfeh3uv9fq46a5x95fv2p5svst9dak5q"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1p7ac38cfyuex0zr2v9cyqv5fc6hzth3d9jvgau0uh858ewnyzjmjsy82tl8",
        "0/A2147483647": "bc1p70r0t77d2zyxrau5u58m2xcg8vyxdl4npun8420yewlsj0s3lk4qe92ek2",
        "0/A1": "bc1pcxuz6cz34ty04ta8q54vjuyccn5lt446706yg854hewg83frvmxsaq8ly4",
        "0/A2147483646": "bc1pgqy2mxlsdgaxmx7d4awhkjgxg8dlhnmsf9eczn9y03k0q0f0j8cs3avu9l",
        "0/A45656668": "bc1p9temz6pklsg6ygehrmwj073mh0emg8q2qvtf7c554e83k4puxnpqwjxhqr",
        "2147483647/A0": "bc1phwfeyzzv62dnx06fywwkmn0wyuhr8kxt27dp2qlxt5kpld4u2hrsmttu75",
        "2147483647/A2147483647": "bc1pvn3pf687d0cq4n6nt3uw8htr3p4lqa3v836zlfsp0g3vv4jf2cqqzc2tpz",
        "2147483647/A1": "bc1pa0c97ux7d9z3j8kfl2e5a4t5uhzu6wjpyufx6vta78fu9m3aqersyfvm2e",
        "2147483647/A2147483646": "bc1pafayxuvc69eg442e68arkj7vzkfhexpgff7ut6r9r2aq53avu68skfut82",
        "2147483647/A45656668": "bc1p3lqg24vp5hs6ssgu7c3fyamgr82kv7y27zd665c55rjv3dm8dglq6dx6sr",
        "1/A0": "bc1perf92efkgjxpjspsagm4rzelz75jktxtw3tlhjx5pyvhyahmgpfs0dy0xe",
        "1/A2147483647": "bc1pfu0rau6zvv5vvnzshqheagvr7aqxny6gjg9987mrxlfh96802d8s5svldl",
        "1/A1": "bc1p0djzw85clyyxcu0drngsj40478gy9hm2psrqjyphrkzflk05we0qsjcymc",
        "1/A2147483646": "bc1pe9609q986es5qtu3zupkzdwat5pnykh428vuuuwfzgsvv72xrr2sz7p568",
        "1/A45656668": "bc1p7tkqs6ys2xwjxfwn8td0u9mgqras6rnnmlf7vmjnsa864j6l48ps4zhee2",
        "2147483646/A0": "bc1pshlfg8seyulyzuw6ump7qsswtvrf4mweam8gw796re7ta7ud36mq8xw3ug",
        "2147483646/A2147483647": "bc1pxmylk3lgkv98v3hdsdg5fuhlu6sl6878lv88s8dqs56ntr2w98dsn80tll",
        "2147483646/A1": "bc1pmtu0lnt7kmmlupft7gjtrvmq83j6djysaygqzs3c28e6rdfpm55qc6d0mz",
        "2147483646/A2147483646": "bc1pye24mw4jfgsg8kxrrschfvtsj4u5g5msxkx8n2gtrq3aljjtcmks7mdedd",
        "2147483646/A45656668": "bc1p90vuk2n2dqs9y6vmu6slzf6tquxm4l8estlmygxrcrzzp8q8yh2q25uwj6",
        "8974594/A0": "bc1p42w7vwh43jalp59ane6kllquthymd7mdca8rdn9j9geeep9kvr0qfv8z8l",
        "8974594/A2147483647": "bc1pdshky62um80jezfjsgvju5zjz0es48cug2wy28upkhrcn6qzrjrsrwruxk",
        "8974594/A1": "bc1pkd3fjhs4ddwkx8h72ra4e53urrvqy5va87wyr5va5euzakl9ltgsrf45kw",
        "8974594/A2147483646": "bc1pe74ycd8p4026ju8muzehkn8cglxfzwhxfdearrjlftuqc5yyrx6sxpay0h",
        "8974594/A45656668": "bc1ph22cx30x7zxg545dfffut6wyx3nw4rjea7nlue4aq6j23z6d2pvs7p64je"
      }
    }
  ],
} as AddressTestCaseData;
