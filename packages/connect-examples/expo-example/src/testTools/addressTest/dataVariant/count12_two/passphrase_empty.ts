import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase12-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392047',
  passphrase: '',
  passphraseState: 'n1wHog59hyJ8aABwa5hU5UCBjrgE5TWYSa',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1DAznPTmPfdWKfbet5FiQX2EGHxLeyzRQU",
        "0/A2147483647": "1KWG9pEia5r2d924LQ3SNhduxjbRsKG4JU",
        "0/A1": "18Dqj3g6kHVhQAFZf3FuG4bjDgXvvwrwag",
        "0/A2147483646": "1DJxTHk26tk9npd6YqiuJgCXEftqt6SXeX",
        "0/A45656668": "1B2MBEt9CPmphQkePhouPgzhA8cZY4jQ8e",
        "2147483647/A0": "18f1BMV694ZBQ98upCJQ8t6vmHGd8X3QKP",
        "2147483647/A2147483647": "18aCCrXKhSCrM6wu6c6ZiDDdm1i5Rdu4X",
        "2147483647/A1": "1KSWmeiS6MvV2fykn3FBUpQVc3o3DmuvAC",
        "2147483647/A2147483646": "1GUADwDHs4D5xn6jPbm5koLc34SSr688z4",
        "2147483647/A45656668": "1AZbanQzZDqaER4ayJdMz9r2QTqkqrKpeV",
        "1/A0": "1Fp9a7HeCGBh8knR6gf663KRB3EehKzMMW",
        "1/A2147483647": "1MjT2ENsLhyBVX54x1GwoGXbFACo7oqpsb",
        "1/A1": "1BmYBFCof9nSDN8rcypg8DAjeZja9T81BH",
        "1/A2147483646": "1Ao95mGmRriVVQfHQhUBcDGzWy9xXpnPWf",
        "1/A45656668": "1Dwz9qXkoNhMS7RVTcNzXJDdKwDyg2AyKi",
        "2147483646/A0": "1BzJ5kZnjeZx34JcY5Y6briLW5kMnmUkLy",
        "2147483646/A2147483647": "15pTPKftKNkTqwsV3PUtFrRC1RkJFR26C2",
        "2147483646/A1": "14mKDEQ1fCPDxC4PUPUQRBUYENU64qMRXG",
        "2147483646/A2147483646": "1Fshgv2oBySBxVKnSPCCE7BZ9Rk8W5zub9",
        "2147483646/A45656668": "12ZVHs3sNe3SuF6rLwBbdak4bhTxcGUzhL",
        "8974594/A0": "14WTGtPNApwzYUa8xHdUDekHKUVadLPJEL",
        "8974594/A2147483647": "1NKqnU63BTtJNPiQXmUu2vv79N2epBX9yn",
        "8974594/A1": "1Daq9auvWreAungEgjFENEEgzQ79jUdwK8",
        "8974594/A2147483646": "15qV8HNdZa5E1bExYfBmUJXib5SPekZKLA",
        "8974594/A45656668": "12tdDiXVpn16yhS4cvT2XxAXjSKZA5tC42"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3QtvowGBhhzMB6R8jh56K6Sc7TSdZ7kLqN",
        "0/A2147483647": "388cB39TvPkrG1skq9wGMevvU1kXzK4nup",
        "0/A1": "3Cj2hSDj6qGVcw372ZYbM7AiYtCACvn1z6",
        "0/A2147483646": "3JhL8oafkckFGk9tvFWFFUsQrK6PEih36d",
        "0/A45656668": "3PJKySsuqCo8e1ybrg9CJ2PZq4cKiynanZ",
        "2147483647/A0": "3C4VmLEU2Eu3gKXYwQt8WfrtsknVrW1qEi",
        "2147483647/A2147483647": "3LU9YpjKxiCtsiuoJu71MBszyGwSiVccT4",
        "2147483647/A1": "3Dqnuxw3q8PdGoMBGSGiHL7BqKKUk7uobJ",
        "2147483647/A2147483646": "37b9zGRAANsU6W5gxh9MsZRaveAbnfdZ27",
        "2147483647/A45656668": "36uYcx1JCSbRGCXXFACbdnnKxva7GpzcjJ",
        "1/A0": "35QeVNFPzjCVWfM8xS9yUx9G6ybN3nerqT",
        "1/A2147483647": "3Aaze719ZrStYSo9ziNTrtGwXpH3ZWvg1S",
        "1/A1": "3DqPohgfYAxRGHUUsGtc8FybPFadLaTYHd",
        "1/A2147483646": "3NHmmDaA754UGusFszSDWXeaNgLQibJALH",
        "1/A45656668": "3AdmCKAMEKuRdtM7ZVKrEhMv9C8P9h6xET",
        "2147483646/A0": "3DVHPiQm7iUDEejxFf2itbGWDvjby7uP8B",
        "2147483646/A2147483647": "3PRPb437WSB3ohMdrKtrevjNXxLU284ZtN",
        "2147483646/A1": "37agcXM2hwBK9ZzcawaD1oX9ULTCrMQjdh",
        "2147483646/A2147483646": "3DkCGPYpQtvjDGBUwD9sJwnRWLhUkynyLN",
        "2147483646/A45656668": "341wKgKWGGyZ1d7Qp8XvV3K7CfKeauX9c2",
        "8974594/A0": "36q6oWjcNBen5YBrYUySpTjfSDAAT5pbrv",
        "8974594/A2147483647": "3Pdrq4kCAtogv8uPP68TSqwNGmjM7wcq2M",
        "8974594/A1": "3QEk2J87GUsgeRttfPfiNQHyxefjg9ANnM",
        "8974594/A2147483646": "36uCjB1Lv38cB5cacJjWPAefKxAeCods2z",
        "8974594/A45656668": "3M1SUruzz72jbHWG4hjd198a7VwpMGqXz5"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q92jn2t9075makvet40avged7gau0kctj2v63et",
        "0/A2147483647": "bc1qqmnc6p3nzua6hav4495xfgyk8vhylkmtcazm3x",
        "0/A1": "bc1q7djxtnnjw4jsyzgwhza0944px38lgl0sgknjqz",
        "0/A2147483646": "bc1q6r3jr5rk542gjlfszqvqj8weyyyvv6rt0f8vvl",
        "0/A45656668": "bc1q3m5rle8vjs6z08k9fq0k48w4tate85k5mkwq95",
        "2147483647/A0": "bc1qeujeet8rhygxlkg4m8fs05sltvk7kkfe4z5w70",
        "2147483647/A2147483647": "bc1qwfderclmt2zz6qz0r90rxn6my3gvhqnwcntypt",
        "2147483647/A1": "bc1q3fg4wla38llantshys7rypu4n8kss6t4rvcq3e",
        "2147483647/A2147483646": "bc1qcvp7zcng4cyk6992yhujm28vqp8egcsay60ulm",
        "2147483647/A45656668": "bc1qcmg468g8pyupgzdkx7laflhzwky9dpfyems06l",
        "1/A0": "bc1qdyjalgjc4xk55nhxjpmex23zecltj9p0cgzht3",
        "1/A2147483647": "bc1qet2xwtyec04wemce2wv9xd4jrcf2l3pueaxe3z",
        "1/A1": "bc1q658zesk5u2p2fc6t7sn6qmmx4j8hg24ec7mxch",
        "1/A2147483646": "bc1qp0cvysq25c3rlahw996vnmflr087yp6x8zvp8e",
        "1/A45656668": "bc1qdvf4k5eae03y9gqfrw60sann05ev6g2rx8ydq5",
        "2147483646/A0": "bc1q9l6skzxlkhlp7m64q5e334uelmrvtzdfnnwynh",
        "2147483646/A2147483647": "bc1q5edp70pkpyx4xe4n74serj2ugjvlyucynzjn2v",
        "2147483646/A1": "bc1qatluhavpqagjvxxsqthf2vdg787fcus0s6mgkm",
        "2147483646/A2147483646": "bc1qy67s59sl6pagxcpvdy077t2jyx3f3gezyj6lfk",
        "2147483646/A45656668": "bc1q9935ktqqava4w2lw3lyylr65xcst3qt3whmdaq",
        "8974594/A0": "bc1qmceznzu2alhegj95z9trpleqqntljw9dkeat8a",
        "8974594/A2147483647": "bc1q20v3p6dwmjzuyakvrdusvssw5jr3gxw5yfs9a8",
        "8974594/A1": "bc1qzndnveqqcydykwum40kcvvvst8wzw6azat0tnv",
        "8974594/A2147483646": "bc1qzdpknjsqumd3jr9850w0lk7zsq5plvtmy0npfu",
        "8974594/A45656668": "bc1qx4kwfex5yvwzm5n4t733dp96588sxu4urf92ef"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pkza6swqdpq3tyu8rruznxf73ttuh0jrh6c76p3m7a4hqhw94xfwqzvydq6",
        "0/A2147483647": "bc1pep9jj58cj79es7k2p5jv0pfe05taxk555ycz4dgc7uncrew73dfqh3u957",
        "0/A1": "bc1pl69js8pkvtkxfhpf23cte58q9unvgh3we6dr93fcsmedh6k44g9s64uyl9",
        "0/A2147483646": "bc1prhlmt8tytfzr8h7t57rx044ymjn7m4ku7zgrf6ydw7sq3zgt7vpsl9ucvg",
        "0/A45656668": "bc1pyxh0pl2vh5qe9p26q2el0fry6m2rzadnexvnrpp7chc3wh7eszks0ec7sj",
        "2147483647/A0": "bc1pqsnykdll4tkard6q0atuasn6zgsnmktm9eps885eyuvnpafjhp3syuyqkj",
        "2147483647/A2147483647": "bc1p5cn40m5m9rphuu38d3tdj6p66gxyzy06406mqvv3454xk4sc5n7qlrcnhr",
        "2147483647/A1": "bc1pku22djhtc0n3nvfcmeht8ppdfxfs8glwee6gucrnq3hkzexakfsqmj3wam",
        "2147483647/A2147483646": "bc1p09zv5f64wes8nppqtj626vmyn90sm0recu2dr70tm6wjyrtzxnyq2cqwrk",
        "2147483647/A45656668": "bc1paaep7z0wnxseq8he70w3n8cwvt0jnk4ddgryc6wcw3nzuq8ps9hsgtt2t0",
        "1/A0": "bc1pl9f36a2rntut055063zxdeyvshqr9z45nwmuuaswh6l2am2xcnyqrxlhzt",
        "1/A2147483647": "bc1pdvsaqlurch2f9yx0wja7xj5tfsh5u3q3z6z38406zaddfhzmdelsc4krrv",
        "1/A1": "bc1pwlx690ajskmerd2cal24gkltacpgn8l5txy4wz4jp49r5nhn6des89qfjc",
        "1/A2147483646": "bc1pvvglsz3mqc3zkggmgfly72gn9288sa5tpszyn7gd6h8wam3ync6svvsuas",
        "1/A45656668": "bc1p54zm8ggqjhdsekc8m3h7tpz6yjzmf4cl8tccmls944j2m33s8kas0zpxqd",
        "2147483646/A0": "bc1ph8gyn8zwpd7m7mgk90t0gvxh3nc3gw22eu84htjjnuafczhtkz3sl7gk9l",
        "2147483646/A2147483647": "bc1py0j8nyfk9pjfeenqn9ngf4qwvj9k0fa8lqry5lyu6qw5jdfk80rsna2667",
        "2147483646/A1": "bc1pj94ama784sz9qdump4rg9kqj30gl7m3kq3mezdtd4ms6w4hu9ydsauu7an",
        "2147483646/A2147483646": "bc1pgpryphr4a0r6lxmqka5n0gskx05rq7254c9yzj2vaja8z9myhtzsr76g0e",
        "2147483646/A45656668": "bc1p4m609s84203j2u2nffwnehg00d89mjaalcuj6424yegdvp6ttspqkj8af4",
        "8974594/A0": "bc1pk6ddqkevlja6qurky3fzsx7xu2a4mxm3hqng6z4d2l0vlqs46mpqg2n0er",
        "8974594/A2147483647": "bc1ph6ayckag7fgmjgghth7pvg9tv84dqgqz6esegv5ch52h56vyzxnq9pd6n2",
        "8974594/A1": "bc1pu35k89ugfaag2x8pkuv7y9f4lzqjp7vq683eak0cn30gegknqdmsg5up5x",
        "8974594/A2147483646": "bc1pav2hvr3ra8a57lhuknfld6f4lq6jvut0wchn6l5a99u2nevjws0smjs3rw",
        "8974594/A45656668": "bc1pzwu9ztnc0rn7n9fdzc7y82ejmtg0yqavlatuhya9klqpslqmaxyq33xq08"
      }
    }
  ],
} as AddressTestCaseData;
