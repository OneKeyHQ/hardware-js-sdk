import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase18-empty',
  passphrase: '',
  passphraseState: 'mgyRVtXdyGcWA8YTbDDPpMCqDxr994sZVG',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1AbPs6wKNLmhPEqvVGXo2mCeQbt3ac1u31",
        "0/A2147483647": "1N8aXLmHWxbskcyHYkiG39pwuLfoSYhQ2T",
        "0/A1": "13baukZF319qfu3Ykeg4WcS3CV4sVLPuWv",
        "0/A2147483646": "1GyUEJakj8zACwP8eyKfBsmwVuxHbRGxAC",
        "0/A45656668": "1NqCnxk3v51G2EFTnWSj7hD5QAaxuJp1ru",
        "2147483647/A0": "1EwLSxfbWPjDvQG3GSbUBeGgEpZHBKXJWy",
        "2147483647/A2147483647": "1LRcoRWjDXqAjsEYKXoeYd6WpNJJ4X5juw",
        "2147483647/A1": "1Q2hV3G2YKcfnKzpqL9aW2K9h1NXkocNAh",
        "2147483647/A2147483646": "1FhvvgTYHbCQ1tkBziQtt7cZC4hSvxtZmo",
        "2147483647/A45656668": "1BYdQxHqe4oGiUWTbZefUUobLRgfQR9XML",
        "1/A0": "18sK4MDKj5fY8YHyWWUAn7xacdU7VdKQuy",
        "1/A2147483647": "14XWAPD5mne9arNkNaf2TVCMTwArnBDMrc",
        "1/A1": "12YVKdGjqe5Yxari5BwbrbJWb9pC1tRhFc",
        "1/A2147483646": "1N4kfGcu1TAaQVFByLmPAbyM7JzDWV1B8t",
        "1/A45656668": "135x71ZPaCdGerc34AiYj2CML7kAvmPBBr",
        "2147483646/A0": "1LUtHpZip4L1BRKSHyzLwo9vfJP55sxaWd",
        "2147483646/A2147483647": "141qC5JGqkj5AEJ6kunYc7Y2csSfWistab",
        "2147483646/A1": "1GnJQkioy4AzNYdKbTbaH2K19fTwaY4Cqj",
        "2147483646/A2147483646": "1N9k64uKT6LSe3oUqUmXaHT1p255FNuZWV",
        "2147483646/A45656668": "1GoZWHwiXMGjiABFJAgtqKA7SCZ7cN56Rz",
        "8974594/A0": "1A6XDy7BxbNUgqoax6vruEG2t7iwrY5yWw",
        "8974594/A2147483647": "1LWrpLDhUimSGXk78ZviUZGUQizMRauKuU",
        "8974594/A1": "1FCuAXTVLbozygKF1HrD7JWkCESVzgxNef",
        "8974594/A2147483646": "15GygxmfivPMpfNB9ctCjhK6jJxZUL7xw4",
        "8974594/A45656668": "17EqBWAXNKRv16THy8TVwxkshitf1sKvu3"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3PDLusYsYKdTFpjAxmetJUkMbu1rzj7wvG",
        "0/A2147483647": "3J4tTtcCbR91b5yqxAp4thUSSwH9P7cmUK",
        "0/A1": "3PVAzwGiT28rmTdeXsoZViPvMy83v2s3bg",
        "0/A2147483646": "3NDfPipncAGaub3Hz86D5LENF429GaYqMD",
        "0/A45656668": "35L4kJnBUbMdgfhXzBSHq98TBTuJv24ros",
        "2147483647/A0": "37kM3tAh5sqs91ZRHV8MjRxczMDncU7iip",
        "2147483647/A2147483647": "3PStCnRfaRDnarMxo2qYDQRpmwCATBbhsp",
        "2147483647/A1": "34fsLxo5nJf3uga3JwfRA9xioqkPuxRevG",
        "2147483647/A2147483646": "33mLEiDqde7S69oYvUp6eNtyzaR5XRUw1v",
        "2147483647/A45656668": "3Na2HL4jm5LrUjYxtLoxZkEbi1aq9J63RX",
        "1/A0": "35bCETPSCRu8ddPtzQWFzw7j96vLq8r6Bx",
        "1/A2147483647": "3Gh1arqnk5FUDDJKVu8ECs6ZjSqFLhP7EK",
        "1/A1": "3Kf76FU9G4pE4AK5if7CZiR6c9VD8QYdj7",
        "1/A2147483646": "3QSk9KQ6xu3DpLVCK5omsTwXFEJSGjxg3k",
        "1/A45656668": "3NcBhMRFbD7ocNfTUZnZD6LuemUGTPs5D8",
        "2147483646/A0": "3AjTU5p88mHsBFe6Z8wNbFwuT9MrvoSbBi",
        "2147483646/A2147483647": "3JfuWTYPthzGnRt5vMBsJW8T7Asf3mF46N",
        "2147483646/A1": "32Pu2VAQkdsVRvCotyEq2F2VhXu33WKwRP",
        "2147483646/A2147483646": "3Ka2Y7Xj6fPCNFNXNmm96QB9uYSwSy9w7G",
        "2147483646/A45656668": "38nSHTZZtbzdWVT7PyFbFoZQsexpkjgtJH",
        "8974594/A0": "3HL89twYpt6fyCB3weBnqZbRgYhgShJQjG",
        "8974594/A2147483647": "36q6Abpwm8McVsxbbqqGa4ZqLd8XNRnbos",
        "8974594/A1": "3Frwcitaa8P5dnQPEGaaiXRHPQaWhXDjfG",
        "8974594/A2147483646": "3KDKbGXoth4HKFiomNzwLdWwMKMjtnfEHt",
        "8974594/A45656668": "32yydF4PHZA6TMzxJNoU4ipP5UEFP2gD8X"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q0lfpz3emnspkyjf9yxxnzr0ysuuu7x3ptn5une",
        "0/A2147483647": "bc1q75sysa3cjnk4mz6zgh9c8d0gyzsvc6thna5k33",
        "0/A1": "bc1qqwz20kx8q8h0g4yekejryvs9rg7p5x5lumw02l",
        "0/A2147483646": "bc1qeu8gyv6s55fyqccq8t2vaxrrg9ft0gzvdzcvvj",
        "0/A45656668": "bc1ql4rsupetthwj5hnxcmz3k45h9pdees99272xps",
        "2147483647/A0": "bc1q4v8u6wqhha5ls4ugplcywhq7v2ppkfyd8yg64y",
        "2147483647/A2147483647": "bc1q2wcc49tk6mlau9kssrzgy8evp722j0w5ssd3ld",
        "2147483647/A1": "bc1q8n50fc8ksprlpk2ykz9s2ehm23msq0t8te7v4x",
        "2147483647/A2147483646": "bc1qkg760jpwh6uremnturt7y4khq5jwpz52klszss",
        "2147483647/A45656668": "bc1q6sc5ngtyuyqf978fqlfwyppnr72ccsl4em8f5n",
        "1/A0": "bc1q7hj84xpcdq25mt67yu9rhfadpdm6fd4c5u7cqd",
        "1/A2147483647": "bc1qa25upux0073ls5lkp8qww59famawez3lt0q97r",
        "1/A1": "bc1q5hlpml94egy7780rd38kwgp6fyj76g4c80n8hh",
        "1/A2147483646": "bc1qua0tt7mpldjg455053ccyh2l9wgkjqdllsyz96",
        "1/A45656668": "bc1qt7ygpc8xt8tpcrm0l63s5fyjtnyajexq0wzzum",
        "2147483646/A0": "bc1qrks59q5w6x4zqp40atyp92erdk9t4jfpd5mygq",
        "2147483646/A2147483647": "bc1qcf873u2xyamlal3jtpkstmhe4hs3z84sgfmnkm",
        "2147483646/A1": "bc1quts8fd3jctmjl7n3msvy39ka52cqxeq9rh3xvp",
        "2147483646/A2147483646": "bc1q7awr3gyjfk5xfhwjt5mf8xakhf26xex2w5tkdy",
        "2147483646/A45656668": "bc1q3spspauarqrrer9alslhxtjuvw3v35vnhttdff",
        "8974594/A0": "bc1qnftugk560g3gqxt0krcp0nm7m098y9kt0agy3q",
        "8974594/A2147483647": "bc1qrpcdch7ysap85gg48scczlldmgefdf8hm33k4v",
        "8974594/A1": "bc1qpdn7grl4lxsmpls628syt6j7tcry5sjuxauh0h",
        "8974594/A2147483646": "bc1qypl4w6snxy4a4jpa8d94k87t4zcsjh8rtkq7w5",
        "8974594/A45656668": "bc1ql7q8y7qyt3x2urqd654kkk2wxk8nzym6rm2dqx"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1ppeyn6km76kphw5la5jesjrvukdp4rngusvxp663xaglyk5zkdjlsnkxfnc",
        "0/A2147483647": "bc1p2nfpvkkx2tv2d9ng9gdlq2hqax7ts5gpqaz3434xxvqanylurykqyyerpf",
        "0/A1": "bc1pulcmcgaly6aml99mfc9ljevk4wy75mvy9ec2dtmt2tx579nfnjys8l3hzl",
        "0/A2147483646": "bc1pkygkr9wur54ggzu5trns5p5pwffm5273kty0say3jtyhxu04g7uqtuvzks",
        "0/A45656668": "bc1p33wvedanphqj52f72lh9mam85mdg06d9x9cj2xt8tf4dmv4r3zrq7yrr4f",
        "2147483647/A0": "bc1p6a6ekmht3d0r7qd6p28p9zzalevu6e6lsh5qddp29s3k2zyhh65sdenkhw",
        "2147483647/A2147483647": "bc1pjchvdyf3nsm84077949xf3efx5hv5fg3wj4zg94ecwh65tmy39cs6yzxu3",
        "2147483647/A1": "bc1p7xm3qdqx6d34ysjlcn38zcc8fmjt493tzswgqdhwkqpt27qsfnsqe4edym",
        "2147483647/A2147483646": "bc1psaxs20yq8rmraffcxgm2tqfumu3gchuxkamdknypl62flkykq43q2e3m07",
        "2147483647/A45656668": "bc1pv0g7zynp78zy3uf5s8487q5vv4eg384lmr9wwxnxjp352r9y2syqxqt0jw",
        "1/A0": "bc1pj7h9hv3jfnfawuusuvvv2e2ysf5k0wnmqdts0mr9aft7fzfpyfvs83e37h",
        "1/A2147483647": "bc1p3ca36afv5pxuafggxfe3puw3dly5t206jndxy88jdcgy7rs2yq0qd7ckqc",
        "1/A1": "bc1p3uh8we2gcypd880u9dnqptsxuwdwac6kjlm3ua4shyrel8ylyv4seff8ma",
        "1/A2147483646": "bc1p3tkr3gyg48ech8at5p8nwa9pfpz56yfgqrxrz2n5wswmay3r5pmq8qv2ew",
        "1/A45656668": "bc1p4p4hyazl8vgjndfuvr22nm9aavdfxnf8xacgj5wkrf2a5hq5qslskx4fly",
        "2147483646/A0": "bc1pwj7m4pu9jufqamd9gasel8fzssdzh2w0w86qr7c2y3sauln6hwhqz58usc",
        "2147483646/A2147483647": "bc1pj2px0lcpczfmhwggfp7jy4hra9vtt30a7jgfv7uta3pvprqgk9jqpa4q6n",
        "2147483646/A1": "bc1p8a9x2rhjk0kr26ps6658kc3s3vwxzr8xr7rhvm3yr522mer325use0fwzy",
        "2147483646/A2147483646": "bc1pv9vdukal2u7n8260zg67enqgukhcdl0h66q685jecwxwfxfjhd9qfrygrk",
        "2147483646/A45656668": "bc1pcly923kra3q0gxjw6cunaylf2gncwspdrqrjwn40y08hkxhrvduq6zflrd",
        "8974594/A0": "bc1pwhmxrum5xmst30z4z6n7quklwr7y4j7tz6cwhyj5n4td64thm9wsudx0dk",
        "8974594/A2147483647": "bc1pave2a9ugklkkk9wjxghs6j2n9zgp2x99ql9hdhl3epav5zsjkt8szce3xw",
        "8974594/A1": "bc1pnvu9h6luc2mpzn4sadedg3uhslmw08wadansewu4zeu6g7ph3nuqhz5qg8",
        "8974594/A2147483646": "bc1pjced3mtmhh8shapppheswu5m8g4r7k0jxssesl2ufhvwprlwv3xq6tue0d",
        "8974594/A45656668": "bc1pwlpxflc5qkkv7hd0hvyvj0402n7ccqaqjkc80uq8pl7rvm8gjx4salnfkq"
      }
    }
  ],
} as AddressTestCaseData;
