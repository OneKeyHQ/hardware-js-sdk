import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'one-passphrase12-empty',
  passphrase: '',
  passphraseState: 'miDg8hbtpECMgje9jQRxhgvN9kQoA29DDm',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "1AztpmzfQdpZNM5Yshczadx5pzcLfDTox7",
        "0/A2147483647": "1JAXCx88d1E6W4F7tpprv8ftWoC9eNUy3T",
        "0/A1": "1JTViKSa28NR22KfosoE4BpsAyAYWoMS6R",
        "0/A2147483646": "15JDCzU96tDjYBfmYPuWjGayLahHoJmgMS",
        "0/A45656668": "176bQUz5Nu2sneWZK7446eeR8iwJze1KZY",
        "2147483647/A0": "1PJN7cd66B4Y36thasJSfS3K5EZvAfYgMF",
        "2147483647/A2147483647": "153eLXDw3c7VxiapE4XQLdoetQxcVTP2Me",
        "2147483647/A1": "1PMvxeqSKkccDJ3Lj2BT7jyyCngJqDZrxi",
        "2147483647/A2147483646": "1FtdpqtShsZog2twiV5N6imC2JwCdtnou9",
        "2147483647/A45656668": "12NqLCjaBhvb7bEynZ9Hf5z4uPz44jSKL1",
        "1/A0": "12jkNt56fEYrFoAuNwgEZdjFCuu6L1XiRp",
        "1/A2147483647": "14bWu2QqibucGEMBhBVtUH8Y35x7YXCc1M",
        "1/A1": "1GwZiQ5jMFC6GHSdMKCdUpiRPo6V5mGgUH",
        "1/A2147483646": "1N54cRz3xR91pwqyRv1yNFyqgpv34CotgJ",
        "1/A45656668": "1GnUuFfwnb32rdBVzWwbsEzNsTYxJyDP64",
        "2147483646/A0": "1F9nThLS7ZLG517vsXAjfx9otPPLMb741e",
        "2147483646/A2147483647": "1JoBZgbQkFTDGcg2TaUWUoBc5Fsg2N5SkT",
        "2147483646/A1": "1GZ6rbL7UG5yDPJqxRT5YCrKfuXf6CK3A5",
        "2147483646/A2147483646": "12hE99rkkrMjNbkhpVh4FDKxdDkzQTV7ax",
        "2147483646/A45656668": "161di7ANEgyKVtfyaLtJGSi7bbzm3mbUWw",
        "8974594/A0": "15gx8FzVZ6szavnAdyKvgHbWUqPHvCiBhs",
        "8974594/A2147483647": "1FtAy4GouGCtLRM7VHkuZgY4u5eAv2NmkV",
        "8974594/A1": "1DbYCesJmoWMQsmmTmEE1PrX152QyW6GDi",
        "8974594/A2147483646": "1G3EEQ724eZMujWa1PHSsHfaFPnBASbGdC",
        "8974594/A45656668": "1PE3ktzrQdTqrtJ58nTE5kw2DANXvf7wUn"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "38Xegnipu2RhZouctnGnwmDRk2bLXfDHf4",
        "0/A2147483647": "3BqNxWAbUtCq2NgJu15vpi3pui1Am6o6B9",
        "0/A1": "399agVPPGEa8tDhMnNwwHKRVpwzJdEjhA5",
        "0/A2147483646": "3HcXD5XNTs4wxLiuedWtaTjq92nQ9enGXB",
        "0/A45656668": "39gmL661A9cqLwxGDKTN8s6PGzDbmA58U6",
        "2147483647/A0": "3EVwYDUfFyJTRy27b4Vf4gFei8Q8kU97Co",
        "2147483647/A2147483647": "33VHgn9ZVPHoNpU6hFg3kLtazeWNPpANn4",
        "2147483647/A1": "3N9bJiycqAvTDNAUAeczPHMocJx4Di87mf",
        "2147483647/A2147483646": "35FdrDD462TaMXxWPpKhyzoZyjeGUTKir4",
        "2147483647/A45656668": "3EpyMkt9JY4AqH2DTHCCV96DmwXm3HeGm3",
        "1/A0": "3Gc49NTGVxLodbpRDAHrTM2Uw9svy9aqBn",
        "1/A2147483647": "343eP35vFqGnqgrLbP7eotyoF51aaMMQ4L",
        "1/A1": "35yH1g1mTzREvrpxraKAf3LFVQpna3LZuX",
        "1/A2147483646": "3JSVWHbe9FSn4VdRYnbriYt49AWeWm5gVa",
        "1/A45656668": "3GzGVjhgKb16wEpL1EhNu86wnMxJvQvtBR",
        "2147483646/A0": "3PTfpApbCrLouC7osRAat3CmLDHxWkmU5J",
        "2147483646/A2147483647": "3BtfoHihUR9J1kcWW2ri59SNLKtn8MWSaj",
        "2147483646/A1": "38tHnQxRKip61oecPo71NCgS6BLH7xnp23",
        "2147483646/A2147483646": "3DjpNJe4JaPEcaQqgyj4nSBxBdhAnbJ1FH",
        "2147483646/A45656668": "32XyqnQwt9sAGER6G9rDfeAZFUX73dMuzK",
        "8974594/A0": "37hEiEf2wceMW7xDEgk29C3HumagEue5Vw",
        "8974594/A2147483647": "3EXxVvHZNQu4R2ynC68TyyAq8KHAyXsUef",
        "8974594/A1": "3PrpocLR4tiDS642hJcEgwwV1H9vuhu9jT",
        "8974594/A2147483646": "3BpabB2cSdZEi4kyTCrujXsFd1k5aKvWUp",
        "8974594/A45656668": "3EMdntZk93ehK9qiXzer9vGjRXzQTLbNwB"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qjclx3t2ykepvcqegx8tmn3nwd5ahsswenrvd90",
        "0/A2147483647": "bc1q5rf4dtt63jvwtw85kv7yuyuj269la5t6zm20ls",
        "0/A1": "bc1qxv30d0axth653mnzm0glxdkhx0hx5eav99xxrv",
        "0/A2147483646": "bc1qmg4lcskads5v43jzd4sjxywgghjzctvzuv2370",
        "0/A45656668": "bc1qtql8wnk35nwkt5e0hscxsm02v2f2dxah67da89",
        "2147483647/A0": "bc1qe9f6haplqtl5khz36pjcrzjwl5ma2tjqup34f9",
        "2147483647/A2147483647": "bc1qvfzj7mf808ajf09yhpqwre7l0tvxrsl2phctl7",
        "2147483647/A1": "bc1qmmuynp6ca2lgu000c38kz8zzljj9as3ky754cc",
        "2147483647/A2147483646": "bc1qap3q2sgalm26m6wdzlw4uwp2kze76qmyr357ev",
        "2147483647/A45656668": "bc1qm0f5ky0fuduy3jr3ys6kptzexmfndlfcu7ex3f",
        "1/A0": "bc1qtv75pxvw62aad3prkk2sxcz4ynqft7dt0prgnw",
        "1/A2147483647": "bc1qdn4t3jgenyfyralywhta0xdupkcgmuzqex8fzf",
        "1/A1": "bc1qcp7fxdqpvs9cj6cfd986t4kefqmmsl9l7zqpzt",
        "1/A2147483646": "bc1qujpkr3f6p7wrz9zs5l77lcu7esr8alatja2sqv",
        "1/A45656668": "bc1qv92myvah7amh78t0lh6y06rl47fywgy5jejyv0",
        "2147483646/A0": "bc1qykjy6zld2tkez28rgl2c8c63fvnw6g95zjkj0c",
        "2147483646/A2147483647": "bc1qzhutyzxk0se557yeggldh06aes5gah80zlkuj4",
        "2147483646/A1": "bc1q5gv85mxmgf9j8ne8khaaz9h4rlzpz05qmtfksu",
        "2147483646/A2147483646": "bc1qlc92hdgp9wg8xfpc2guxftuz7vvy8dl5lqhxtc",
        "2147483646/A45656668": "bc1q8xxtl28hu274nqttsv3gmr389ujwe4j3l9p9cc",
        "8974594/A0": "bc1qn74gx0fjuzm2rg9y5m840g9vdm0kncmkhjzft6",
        "8974594/A2147483647": "bc1q64h8yljrcjx30wwhgr23wnrvecwnmyf3zket4k",
        "8974594/A1": "bc1qn2gf53zqcjn6p956c6rcm2xfu8828rhzqg5u9c",
        "8974594/A2147483646": "bc1qrkwf0zkw6fyx6yn3rl9thfkhy07cwmpknzaug3",
        "8974594/A45656668": "bc1q94jknsz7wnazd2m4yf65sgpwf6wjal66hrdsh0"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1ppskree0erhqyptsx8hufkt98wxvuv6gla8hpep8euq6cex2k4h9svg2en3",
        "0/A2147483647": "bc1pw396rh24w64f4fnee6cjhpnnaavnhf6mm5z4j3rgkut2pa2rtpnsdrkw62",
        "0/A1": "bc1p5mhdf9zv7rf60natsyqu4p8qefz2zwqt2jd6pl22sqrrxyq8l2vq0q48y3",
        "0/A2147483646": "bc1pxty7ssn9vuv2eenhs57k5ywdhtl6m6g5wtnlkw0c3rqmtkazahvqunpac0",
        "0/A45656668": "bc1pcqntma46mnlwsphq5j97063vdcy77a9ay34r87wukq8jeyll6deqm8zh6j",
        "2147483647/A0": "bc1psylrcjazd3twqy7tgz29k8md6caemv0lfqpj6x5cp0pjy9wnem0q2qtdzq",
        "2147483647/A2147483647": "bc1p25su04yh68g7v4ufw29jyp0yc7uv8x547fus2cx5y6kxhg2kqvws2gga85",
        "2147483647/A1": "bc1pxc50f8vhl0dfxrjrwvw6z9yzdv2zc3zhlghjqnak75f8uc0r7mxqfye8mc",
        "2147483647/A2147483646": "bc1p35qt9mpapgxm2tgfsyt7r036wu93zyr5wtdvfkjnmkyvn2294vyqqpujr6",
        "2147483647/A45656668": "bc1pxhfp9tcm0t9kk9atd4598ym42gu29zada99auzeaep8rj6rgvfvqghkkeh",
        "1/A0": "bc1pvtwcttx7uhzksh5pe45fxtp9keps78rhu0qjw3e04xxxsmt0kd7sjqrtth",
        "1/A2147483647": "bc1pm326pqesarw6wds5r8kvxwq4t6ne052kw02tdgz03gjtxujw7ecsktlxl0",
        "1/A1": "bc1p8289yk9xjwm75nzwwrv2q6w8mkgffywkkhwef9ncr082lap4x7lqypnu5v",
        "1/A2147483646": "bc1p5x3xl9a86gpqupkr7x4kxveeh5tpes6xkn87gr8v2mz4sfq7an6qj7ehlw",
        "1/A45656668": "bc1p5gkpvudlcs5fqxkwpdph2v5yhspafy7att4xc0gfp5udy7v8aecqndagwh",
        "2147483646/A0": "bc1pgn8zd8gx7tawn9fyuzv2grem2j3hzmvewxxycja2hz6327jg569qfmx4ha",
        "2147483646/A2147483647": "bc1p2udymmkrckkm3u7jja9wd6cgkljylgyk2fvk98ywcy82dps4hmlsxdd42c",
        "2147483646/A1": "bc1p7tduwwse0lqrw6gcjlv0rff3wxt0207l5r95wjf97jsa59tcwa2sj3602z",
        "2147483646/A2147483646": "bc1ptrgl5t7pqmp5cfaqe6qvelpk2acmv5v582zmgam62tetflesuxaqmpqhpm",
        "2147483646/A45656668": "bc1p9qdl6lpckyarf7r9glj59h9p7dppr8zsjx6xuyrhyep6c7ucaacst3h5s5",
        "8974594/A0": "bc1p8v0hulnge5zs5aahjcvkl6kwvjr79uzdhda7fxs3kdkhqy63ej7sctgq6c",
        "8974594/A2147483647": "bc1pdk37ycfajv6jqmu8lm9qv0duye37mlrd74wsrphta4xqw8th6xqqqqk6sv",
        "8974594/A1": "bc1plnpwpv7ak3h252jztmdh38wxfuk4atnqvw7f7wnaxnec2qxecd5qttlxty",
        "8974594/A2147483646": "bc1pymwdgfkln0dvdka35akfvqp3xz3zk6h3d2vsnj8v6qgyf2tmd73q33mxny",
        "8974594/A45656668": "bc1p62uv6s34t0jfn6r9357jqcvgvzrs6freuhdmj5lj7weh7rkhmc7qq4cgle"
      }
    }
  ],
} as AddressTestCaseData;
