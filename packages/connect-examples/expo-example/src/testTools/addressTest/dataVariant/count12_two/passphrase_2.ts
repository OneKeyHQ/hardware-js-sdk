import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase12-密语2',
  passphrase: '~~##^$$~^`',
  passphraseState: 'mrMdgz2K5pePtQEJvu2VvMkfDh7vS9oAnP',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392047',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1Bq5DS1i3jiDz1ja64MmM9fNwpkcd7omsW",
        "0/A2147483647": "1P91cqmnQRQ7ztrNQkMiA6egcgKKvz4XPC",
        "0/A1": "1Vh3B7ABVTTj48NGmLrLS5bD9G8UJt981",
        "0/A2147483646": "194qwoX5GJEVWN62tqrZ8F8yvVKV1kWjws",
        "0/A45656668": "1JGWmW2Be1mGCguYugjkFGQPSesCbKf4Sj",
        "2147483647/A0": "1CET9greUEbGx4ms1BxZKYmk6yAaZAXhUF",
        "2147483647/A2147483647": "1FWBeBwgdfZ4yc3cCv3QCSpwKjVHHWt3cN",
        "2147483647/A1": "1MVLpmnm5UVjpzBr1Zsw5CmoNTBdPbNZgr",
        "2147483647/A2147483646": "179JEhXYy6qH4UoPHvRyrh35Q9fnzfYsmD",
        "2147483647/A45656668": "14qupddZMN3rs7aHrXrESAY5miozdmV3mH",
        "1/A0": "1Ka75Sz1VCs6EUsrFWkSocZbKgAzWzCbej",
        "1/A2147483647": "1L3agQ2QxgzVoigcuTeUdhxhhDYtuFPy8H",
        "1/A1": "1KNJuVCBVF4SnvkFvTSuhEPwfHutL8A7zV",
        "1/A2147483646": "1A1Wxi4djCVUaDTS3m6wvpB4eVGMnziWRR",
        "1/A45656668": "1Kyaf4N9Kbrkj8d7fsgMQJFB7MeCVy1g8E",
        "2147483646/A0": "1DNdHFTf3LsbZuiZU7KJBLh3MsUDMWdRzb",
        "2147483646/A2147483647": "1MD1T28SwjB18u4GcTYKeXCxdgvkBJvJL9",
        "2147483646/A1": "1LcLdkiYnu8Dur9bG6tvWNiTJntTwop6V7",
        "2147483646/A2147483646": "1Jq7sXudaFV1NmdLAN9sEmQ8Jf9uJvgDD4",
        "2147483646/A45656668": "1JpiCorXo3AqcRuPDDWb8dQTajJZ549Yxn",
        "8974594/A0": "15kV3sNTRziNyhhGkMDUibZpdrKHdLrMmD",
        "8974594/A2147483647": "1K9DfCMgvpwQTCBPsS74C8u32Au84cYXJU",
        "8974594/A1": "1GCsLUTuutsZL3bnmwGdSp1z3QEwN9JtXc",
        "8974594/A2147483646": "18X9Hmd2qUVYk5xiqDusjHbe74KD68XFtF",
        "8974594/A45656668": "1QDosEqapV7z2JBWS7DyUNv4nwRFqDHgzZ"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "38WeUVCijmykAnFcQLKsWBNcH8wrGX7ADL",
        "0/A2147483647": "37BhuRjLQ3Uy26bamShHST7XDg2ZAuGn3Q",
        "0/A1": "34na6HHA1W3aKtG1AWPbQUxwxxQGYmic6u",
        "0/A2147483646": "385Tagn9YZaqvM2v2Y77wabjm9Q5wXYaPv",
        "0/A45656668": "32t5MRW8j3wH7biEf5aqWBUHtWFfgct4MZ",
        "2147483647/A0": "34gTx5Ky1MTdbDaFugeBn6XirS3e8uKBMM",
        "2147483647/A2147483647": "3Doinr9bCUBgzopewByfQN5kf9j4xoknfF",
        "2147483647/A1": "38PAPqTdhihZZM9WGXGcmQUSYpqnj3QJLf",
        "2147483647/A2147483646": "3LQq8DyZwQqA5emqkjC8MuHd5e42SxU8kV",
        "2147483647/A45656668": "3MgvpZbHDu6perVVXsy2YRKXkCohpiYqWy",
        "1/A0": "36K1WGVR8YgZtrVKXLXWQWGJPWvtvRgURH",
        "1/A2147483647": "3FWdP2bM84ZCa8Mi5FBAweBm67aFBajr8U",
        "1/A1": "3JEg7SgEC4o2QKMmHogkNzwJ8RTu271Qg4",
        "1/A2147483646": "3GgHZaRVeBvqmqGn5pij55c8ubS8T8PUs8",
        "1/A45656668": "31xWi12oqzfhYT6i9FnVpjBFvDz5QdBG3h",
        "2147483646/A0": "3FdpfufEoGXQ7hfG3A83vZH2Br9KhF9zbx",
        "2147483646/A2147483647": "39tfZCejSEfEkQbtcq6eMAwPtFofxhNFAD",
        "2147483646/A1": "38whWjq5zdPmY4iH7vW6fch142Y7eZA7u2",
        "2147483646/A2147483646": "3NAWZWM81L4e4M2YtCHcj7wPCArvyYVp3V",
        "2147483646/A45656668": "3FLZmCj4cc2Kp3yKqHucDmb2aaYkCa7Wn7",
        "8974594/A0": "3QikXa7cvMJxP9KpQaoexYujQMmtG6EhRn",
        "8974594/A2147483647": "3DNZWnfz7uwU23TX5V3gPunQSDrXrHXmtK",
        "8974594/A1": "3Mc81dEDxCVDXmpbEF2NzkeoV1sce2ZkT2",
        "8974594/A2147483646": "3AVg3NoPCSgYhvjdmu7bAbCLJfcgA6oMuS",
        "8974594/A45656668": "3DYhnPwgRZhgMuwSvM8qWo2PQZLxfjyJWz"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q7p2yv8vugrtcldln8fmlgyht203xe3c2lvej9v",
        "0/A2147483647": "bc1qhdlaznjdnzs9379qn9wh0xz4eclnyxh9fncp7e",
        "0/A1": "bc1qc8ss2dh6dggd9ag4vzsfjmhv0awa6yetvxx48f",
        "0/A2147483646": "bc1qggpty43v2pr3z6rs57v44x70kymqfkxqk00lu5",
        "0/A45656668": "bc1q9d2nldnaj9cvj4lh0jzsjh0l8njrzrjs4kl7qr",
        "2147483647/A0": "bc1qjtjflp286fzu9uh0ky86rksy7kswr6nmzsfqan",
        "2147483647/A2147483647": "bc1qynafjl2jmachpwmhqleuf4qvy3w9yn5wujxu93",
        "2147483647/A1": "bc1qja7wtysjjkdydha5ee0pwgn22uzqfu93g2sf7k",
        "2147483647/A2147483646": "bc1qtj35zv6ghvg839qs36wuzzuqf22qsczd72jjq3",
        "2147483647/A45656668": "bc1qvcys6fk60mzjn7fe9ywy249pmlm658p8skkss0",
        "1/A0": "bc1qfst00avev84lz57zjnqkjp7h4p823u30v2rcja",
        "1/A2147483647": "bc1qdtv49pfdxkkm9p49pdz3fyv9z4grgdgn0vn5n3",
        "1/A1": "bc1qffmk25zqhxfjjfd9xmmupp6pkjp55kxvn0rscf",
        "1/A2147483646": "bc1qqx0mcy0sjf68jw0v23swqem6adwh8wjdk30qgc",
        "1/A45656668": "bc1qeen8nh9jre3yykrker76xntkhauwfkls5v2jvx",
        "2147483646/A0": "bc1qkextq957m5c00xsr6nszq9s58nte4h9vt8ye48",
        "2147483646/A2147483647": "bc1qfdl3rry3qzzdr0v6823feajsgq8e3ykrf7vcap",
        "2147483646/A1": "bc1qrwmyktf0s00g4nn69tr7l3fyakcsaley9a9zxf",
        "2147483646/A2147483646": "bc1q9qumfemehvhnuuk4lh2w2lzrahl47r6s366f3t",
        "2147483646/A45656668": "bc1q4l50ytgqmdxrrfkvdpmxsyue6vlwfq9w58sgmp",
        "8974594/A0": "bc1qkm67ldxr3crz7a467xypgdxfzllee0ez6dk227",
        "8974594/A2147483647": "bc1q5me5exu4hd550l5py965z9cdt7ugxtw5rs7msl",
        "8974594/A1": "bc1qd0lzjxuuamkakdqkduru8anj89ahtxhgh4c5gn",
        "8974594/A2147483646": "bc1qgdwn0dd020p5vpxep08xgktntlgzetygztjt5h",
        "8974594/A45656668": "bc1qzda34edrwwwhnmep5cakduxdey0wcumuzvn85n"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pzgs5mutleynl427cgrdszm9x0fynq5m5u28ntd3jvr2r985wtkes5ghzdx",
        "0/A2147483647": "bc1p58nnhdu5ly7ztfg9wuqnfcn624fttxmcucja7xqqnq669v70yt2q7qzpfe",
        "0/A1": "bc1p625zfd8fh290fjtu7qtzh4xdqlg7t8hxcgp73ncgap9npvzslz7s3l4pry",
        "0/A2147483646": "bc1pjgqalxgqpk9jagc8jzlmmzcz6xcdenjavrv3a53cyytdawcgt7psmfrqf7",
        "0/A45656668": "bc1pqavx9n8hp4hptnltr4gkr56u5mrv42f6dd4fszswrf22qsdud8tstvfy8z",
        "2147483647/A0": "bc1pc9tfsf4925099clj9g8szq495p3rl3wgcqjhxn8ptysqrrlgyupqgmzrcm",
        "2147483647/A2147483647": "bc1plcn3ew9za93un7z53spayp858qgcqdkt49wjkklv4rzcqk6c533s70dhr3",
        "2147483647/A1": "bc1pmupgyjaq8flglv7gvyjpk29p04x8y627rxwyndcukealgyz0l70sff6wdx",
        "2147483647/A2147483646": "bc1p5jcwqrxdu86k3y08h4k3u6lgwvlgs3pgkneujr2rqctvg3uq9xrqtfn0n9",
        "2147483647/A45656668": "bc1pvljfgkfce78cyrdgu6enpnag5qgrskez64533h20wa2ywh8n0xeqdh3fp0",
        "1/A0": "bc1pyl7wz8qf9v0ulapczxqljxrv0qver70e7xtzu0wxkjaqc2n5kujsmqs9wu",
        "1/A2147483647": "bc1p40w3e5mlrccsecjdc5n8gncy9edg7423khy5pyvahnynlk0ul3lqs2qt3h",
        "1/A1": "bc1p0u4t8ehdsdafle9snc9zc9v568656jpcgyjsh38tc6al2rpnyfhq5a86yk",
        "1/A2147483646": "bc1pghd928slmnu6yck34lsuym6r36czv5hh27vt05c0hzrh3srkxmussqmqpp",
        "1/A45656668": "bc1phygt6264ptwz0g3hjupm7fkyzdu23z9h8p6hxctkyscq2f75mg6s5rykf6",
        "2147483646/A0": "bc1pwyeszypyzngwpqmrr6jqscfv2ht65u2903c75xen5t42dkth2pmq5xts9a",
        "2147483646/A2147483647": "bc1purjcek6lf49f00an6jq029sd7uk0cc7as2autkkaksj3z2e7flkquzdvcc",
        "2147483646/A1": "bc1pqlazkv5twg3uhw2unpah52jds0zkg2qyead2mq6m3zdzzyd4usnqqm0qv4",
        "2147483646/A2147483646": "bc1pavxggw4l9gjmk5269ax9trqc6mhw09cqhng4hmfw93na3e3lznjqaav0el",
        "2147483646/A45656668": "bc1ptnxdpg9m0xp2g6tan8kx7gshepl0fpggrqfx7y3rkuslm64wk5ks4s2jpx",
        "8974594/A0": "bc1p8hjkzqwwvuq394tu0ffe39kd40ynqxvcpdh8geezkrask7r6p7usjj06gw",
        "8974594/A2147483647": "bc1pzk0hd6v65rmrxdnhutjfxdv24u2ez7nmq9cua4p88fk0mcnque7sk05wsq",
        "8974594/A1": "bc1pr9ahau5sj2ezpzflu5kfks9d2vwamywl9vkaz30kcaw343zvp38qvk2x64",
        "8974594/A2147483646": "bc1pqhatnln6xfcywvzgfgrldvnzzp4fexpsrndc9tmxn5zt3gkh9sqqnqqff5",
        "8974594/A45656668": "bc1pm693wr8h7khuw46hdwlyv8few6c74cnvxehhggk3w93xspxkmlcsj7zyy8"
      }
    }
  ],
} as AddressTestCaseData;
