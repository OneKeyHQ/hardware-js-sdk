import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase18-密语1',
  passphrase: 'xyz456',
  passphraseState: 'mwdeVF48d9APXPFNUcZD71JEGWHCKerED3',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1JLttAPMai8qNfJHPqLmTAE6Sfmj2fsb3p",
        "0/A2147483647": "1Kvm4wFUxV6idhDtbiyX1BgZ1NJFADFTDx",
        "0/A1": "16bzELFjDmz2SSAH6yD5z14rd3nzYqnJrP",
        "0/A2147483646": "12NUGGQVpLBVBC3ctHEXcbMinNVcRysi9n",
        "0/A45656668": "1KumF58YypJAA6Pu9CxNCDksQUnGHYC8HN",
        "2147483647/A0": "17Hwaw4S38hwbuqcSQueZUFBvvmbfc4B4H",
        "2147483647/A2147483647": "1KxXVEnuKe47gAp7iUuaao8rLrbGjRLMhs",
        "2147483647/A1": "19JvVVtorLxBT52r54KHRUaXJRN5xKshUt",
        "2147483647/A2147483646": "1LsW3jwKAfJoTbr4GYDpy4dopKwsH9uhm1",
        "2147483647/A45656668": "1ApjUUQEKRKbDbRwFEmoTykg3Mchd6Pnky",
        "1/A0": "16RJzszWYRYDyA7Hm51RJHXjJCEePbU6ey",
        "1/A2147483647": "1MT1SM7bsJVUTY4aJDGGdRxHEAhnN5xAyJ",
        "1/A1": "19SJw56gEvvqqTXoosby8WZ2Z3Uw1duai3",
        "1/A2147483646": "1CMh2AfpRSUCahrQxKhwp1GLzDhinWc4E7",
        "1/A45656668": "1PPMqvLS6t7mZ2rhPLp4Te2SdueqAjDEmR",
        "2147483646/A0": "1AQBwjgFJbxykFU2KTuiLacbmD5NDBsxKc",
        "2147483646/A2147483647": "17zbrs9wzgr96RxS15xshRcF3m7mZgENT6",
        "2147483646/A1": "15KV35zNwoy5jfipa4kQn6p9qrcH9sQ8Dq",
        "2147483646/A2147483646": "1MKhSeBziqGoKAQwxxshEj86Y4ec3hnZ8S",
        "2147483646/A45656668": "1NzZbVSSt6cLq9aKmkUrJjfaYXygwXvzJM",
        "8974594/A0": "1HbwmX9aXLAhBqP3UnvkBNu9ehxwVbizwE",
        "8974594/A2147483647": "1JkmXkjNm1R3dWnxQWwafbUupY3PHymCqw",
        "8974594/A1": "123XMMEPB67i5VKP5mLz6JQJu9QwQLRito",
        "8974594/A2147483646": "1AR1UbTvcUweWgAzVSfwEQLf1sGFaXGuzF",
        "8974594/A45656668": "1Pwu83zLCLQERTLFN4ZwxjZJn3qveTJPsR"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3KGedkWCBC8iZHU3ncLAaPbJfMKU5DYCit",
        "0/A2147483647": "34MhuQ6mTKhzx7DpTjuqAm9Q7E7VtT6kwH",
        "0/A1": "33j7gP6RmSHSLoaTU6UanqhtG1NQcooYBW",
        "0/A2147483646": "36DBjccQR6biMtU2wpDRK3tYHWF37NobRs",
        "0/A45656668": "3Gt1Gt5zABFRoyxwjD6mADiWVRGoRRpfqP",
        "2147483647/A0": "39VJVgfaoMY3rbx78Z9gzDoEd1YZ4nP7Zv",
        "2147483647/A2147483647": "3Mmt9GQTeRg97kmeQhVbmjWjUSGwnEhn4i",
        "2147483647/A1": "36GXmXBfzsnRXDhYQvN4rbnPZzHzyACe7j",
        "2147483647/A2147483646": "36u31bs2MUkpppK6mQH5secTtgjzgZ8rx5",
        "2147483647/A45656668": "3Ah8SVB9stJUK1jnU9aSV1CTLgvnySZmDJ",
        "1/A0": "3Fd1vqwfjwDmZzf899Xf7Pd93zqfqidVy4",
        "1/A2147483647": "3Lhs3nJuRKQ2iG85mPrQWB87sxQJMresN6",
        "1/A1": "32V1GLDTaBbmzj3CC2KNUBwYCHUE938ALw",
        "1/A2147483646": "35JMizHznx22T6Wmqt2wavzaJjPiUgHdC5",
        "1/A45656668": "3F3g1zh3GLw5WPTHWYkmN42H5rJ26zqxhC",
        "2147483646/A0": "355eskdGd6YiFpeS2ncaAAYaC4nMu6btPP",
        "2147483646/A2147483647": "3MSd82ksVsfh3fhZU8P4Ls89NKxmeyV9zA",
        "2147483646/A1": "3N56C7WwgKSxpo7poeY2kCD5XJoE2MV1EP",
        "2147483646/A2147483646": "33DawkrKgH9xkTcUAorJviZ7w4MNEuSqoZ",
        "2147483646/A45656668": "33a1ysATC9Gja3ZtuwkEnXwEKCeNYueJ1f",
        "8974594/A0": "3AiQCJtZtHd61UR8TqQLqzNtMeibz384hL",
        "8974594/A2147483647": "33mxbsrwZGx6DuRQznGse7b2VaL9nuKecs",
        "8974594/A1": "3PHDebwkTKHfcVQwBDgxFVBFKU2obgW5zN",
        "8974594/A2147483646": "3CmyFvnKDK4e1Vkr1NqyVaQ6NLjw6fFuZx",
        "8974594/A45656668": "3DSpBHGiKh8uVaNq5aNbUpVt2rU3aQVBWK"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q2ua42wp6wx22kujkulwpl75fnndp5rv3fv3eng",
        "0/A2147483647": "bc1qwand94h253z0zf6l49htsyr9q9xu6yf7jds779",
        "0/A1": "bc1qy8v5zwkczrrhpxpstm2fz7m08yqsjp02ca9kce",
        "0/A2147483646": "bc1qedxyd5dt20aln90wdqkpwqrmvxmzeyt5mmz0w2",
        "0/A45656668": "bc1qq7uva23mfeaae56adthhvxuqe9ltwjk7elxhmm",
        "2147483647/A0": "bc1q00repv73sng2frg5l2ypvx7450yu072ggfr9jv",
        "2147483647/A2147483647": "bc1ql9vwnzx4ycjxm00ukqrpde2wk972e6crrvz39c",
        "2147483647/A1": "bc1qp8k4xhs7gpjhlpzqpktnfkn6x6w60cm5fhh2za",
        "2147483647/A2147483646": "bc1qglc86rtfvhmkjwwx66u6u8z8k47pqg0l8exp82",
        "2147483647/A45656668": "bc1qmwchg7vrqvsjs3e9tuek5twj3wpstt25u6fnv8",
        "1/A0": "bc1q9g73tmsy0le6cvveu0z9qnx325xsedq67z9h3y",
        "1/A2147483647": "bc1qss9p6zr79neghpwagwmd539p4k8rwefhr6w9g8",
        "1/A1": "bc1q8mrslqgdpj8m85vuxug989tyz8t6unqyv6l9lc",
        "1/A2147483646": "bc1qgxhxlczms8td5wea06kgw7astxqt5cyn7c6ydz",
        "1/A45656668": "bc1qrp6pvw04qg0lg4jpypxc5twpau25ptjjmxu5jg",
        "2147483646/A0": "bc1q97naksn9gv4ztl2wwcnwr93c3qjpq2ggzr9u88",
        "2147483646/A2147483647": "bc1qq85q30gtl6c4c2vqd6jzwf5jwmwe97dmydc6jy",
        "2147483646/A1": "bc1qpq2xdplq4csu3qs8nlyrlgdmxrvtnzwhv73qcm",
        "2147483646/A2147483646": "bc1q9y7tse75y08wj2vdhxxjmlfra7g3j84zk9ha3e",
        "2147483646/A45656668": "bc1qu56qxk7j65hxgw738lcl0z0kuxjyh72qxhsq3m",
        "8974594/A0": "bc1qevpy7p3eqg27uh8aaegpd6s0w8dj7j92nec8cc",
        "8974594/A2147483647": "bc1qq0uyrhcrf4nmspru6xy04dpq8mp79r9qkdz3gx",
        "8974594/A1": "bc1qu98kej76psdwr5wy3cyh3683t7cmfq7gnd679n",
        "8974594/A2147483646": "bc1qxjhnkzzt7f5a0k84nuy9p32pdlaakxh06jmjyx",
        "8974594/A45656668": "bc1qnsefm9n2ne62wzjnn8afujm3wnq4rcj5zj3v2k"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pg9hdqquzk6daje9qvnmehnhdelw8j3pqwrxqh50r9d7l8pfwrlusklctyt",
        "0/A2147483647": "bc1pdl6q4caeppa43f5p02z6kq8ys6wpucqny4sqyvwf0rdg4050d6ksqxhezc",
        "0/A1": "bc1p6rpxn28sezqmhrvk2ctq8hewpdj30swfuam9epunj5n0nnslpessxdedw8",
        "0/A2147483646": "bc1pv9d7awmphy3v033vwz5mnkvt2zxvd6zx9lx5l6ty4s5ek3e2mrssmywjea",
        "0/A45656668": "bc1p6pskg87aawvs4gnms0tnlpvexdqpze6w3suc7784yz3zsc9wn69qdcq9kf",
        "2147483647/A0": "bc1ps2trxwzzsw3dxes7yq64g8g80ne3ylrz2aru8quur2t4t6h7yqmsv0m3e9",
        "2147483647/A2147483647": "bc1pdq5lpjfqyszqw5e5htah6hkkknw7r5shrjjjr7zrvgcuz3r9ppeqf2jdjn",
        "2147483647/A1": "bc1pvt7ap7hljehdjgeexv88d7n0zlq45xn6rf7r4dlmc3snmkzh9rrswl937g",
        "2147483647/A2147483646": "bc1pfrwgu92mmn9w2wq0srgkyr7p57ldwvrp8gnrudtf07rj7d9urm9shxmfh3",
        "2147483647/A45656668": "bc1pn6qdw7l8fksajdj7d0kja7a0t8a8nrnrdeg7ggerpfleqjx5cpyqtkdkd9",
        "1/A0": "bc1pyf4hztdtl9lrjx52jxsw0wa2t9k6jnjm8ykvgkqnupgersdu94gqgwmjsk",
        "1/A2147483647": "bc1ppp7tvffedkvc6f9d3zndwv56dsma90k2kgdnc2ngwdnccwj3hjqqcxazex",
        "1/A1": "bc1pyl9az7m6t57ekyq44sq3n4h4cnuh3s2k4xrtk66fnf032yye5afsmyd85w",
        "1/A2147483646": "bc1p3ewerxwh2pmu3avq8c5xt0exf0ecypmmgmghk7a2kr273w8fe8tsxzrpdl",
        "1/A45656668": "bc1pvjvzxg05a8uum6n7m6kp6h3aq0srywe4lgj20es2jvrgpu7cf5yq4aqenv",
        "2147483646/A0": "bc1prnavk7tyrfrtvuqym6e2skdu7jguxrf9q8yx2u638hkez0wk39xqjze833",
        "2147483646/A2147483647": "bc1p3g4ughnn2sxnrl0a0q7s8vs0rjvnnmq39ze7a2zjtnfrkeqpf8aq8l45t3",
        "2147483646/A1": "bc1p6vjaxejr7lhm343fkxyyw5feszs5a705h3ywhm95ywnzfjllewhqnutj4z",
        "2147483646/A2147483646": "bc1pwjuv4hkhd06m0zav3cfuqmyzvqu5l8g20f9km73cl98xkas7jj5s9pygxr",
        "2147483646/A45656668": "bc1p0t72zzks742x0avd2j0h5p5y5335esl9mra485u249f3nwdn63psrrpv4t",
        "8974594/A0": "bc1pxpkp0h7cqk9u0sqdr9twaqlkcaqq0hpnlvzfvk3h64tfx8grds5q4zxlcc",
        "8974594/A2147483647": "bc1p4dgtz07v5hmzmmx0lkvhwudje844npcykq255uq295wtnd9uvtfs6vvtg2",
        "8974594/A1": "bc1pz03tl8cencghkdlfgx49k6jtekqfrdw4ctlxagfd3e447f2zas7s3cn7ud",
        "8974594/A2147483646": "bc1pu24nrucarcvd6vkut45hy0xy65ecasad3exkx7rn2sxgapqg3qdq7cfvfc",
        "8974594/A45656668": "bc1pjpz32se88w2l0afszcsfvqfl39h5fczehz983d2ds9zwc8549ytsn330g3"
      }
    }
  ],
} as AddressTestCaseData;
