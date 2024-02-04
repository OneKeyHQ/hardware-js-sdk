import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'three-passphrase24-密语1',
  passphrase: '0987654321QWERtyuioplkjhgfdsamnbvcxz@!###$$$%%%^&*',
  passphraseState: 'msnViVktp8SWFH4hjf5EYmXzTAiD6J89AB',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "18WVQA7ndtSpiVi5JpdBWWeM8n1FbMCNQV",
        "0/A2147483647": "13JkXs8wApJg2yy7Dsr3pSuoi7eBaxieFJ",
        "0/A1": "1MZSg5y7F9R5VepWqCyEVeXdos9vcXSudy",
        "0/A2147483646": "1kU5JwcuhekcmS2y1tZcYWNU26qXi3uKu",
        "0/A45656668": "15GrfeTKtUkKac9mYq9RQj976rQLs2y64c",
        "2147483647/A0": "1HQH63hBp6TdYKJwG8isBVHz1uFgmPjVpH",
        "2147483647/A2147483647": "18Fb6znvcVYM1F2YcXnc1iuE6z9yeR4re5",
        "2147483647/A1": "1Atn6Rvrxfa8AurrrTXdav5WxhBPHB12Na",
        "2147483647/A2147483646": "1GUVLXvU46ynSALpUPY6HDxwUzdDjegWL6",
        "2147483647/A45656668": "1DAbWoh5c1xNFoXCk2oAzBjP5KcXhwm7p6",
        "1/A0": "17gMaVG6SGz7cX5gCXec9NMtbdVUNU3c7b",
        "1/A2147483647": "1CEbn2cTpbJZJGGwYLixJFmTGB8KjK8otN",
        "1/A1": "1GfncYe71pWnmU9ERZkvf6id7CvRjDXuQe",
        "1/A2147483646": "18AQYy7NfTeSpPZcW5FSzNR8FuxxUsmGv3",
        "1/A45656668": "17MZCdTVT9JpBuqAdLFFxaRuoGH3Z3SeZY",
        "2147483646/A0": "1L4ttC4HgDViehiPmVgKYLxJ13w78C21Tw",
        "2147483646/A2147483647": "1NxyVQgZqwQcienFGZ3CtvgAHSkNs3Z6YU",
        "2147483646/A1": "13BNBWvADWkgDbsCiHTyqYUGp35sahfJi6",
        "2147483646/A2147483646": "1GMUMeB9STqZMFG4yBEZL37u8X8NcX9CNn",
        "2147483646/A45656668": "1D8gP8mT2Ur36ZtSDSVyrttpgo34dnP7wh",
        "8974594/A0": "1448uZNG7P2vtuduVZaoLktRC4RPgvygP4",
        "8974594/A2147483647": "139urvnDSmFbc3NisCzSBmcXmS9FuLr1VT",
        "8974594/A1": "17tYLXL2yR3vJFDa2PivBbP2Rw9kWMyoYe",
        "8974594/A2147483646": "133ig5CbRBoHV9WcDiWATqGL2HexNWYPCE",
        "8974594/A45656668": "1Pwz5ZVubh94t3Y8jJFeJosGScHePMvPFi"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3FmHVmJUngzT6da4dnXfLPdV9JZxLqrVPa",
        "0/A2147483647": "3GEPurNzT6WNjGeBrcc1qKwGUk6P4Uggyp",
        "0/A1": "3AZRCEKu7Vh26WzM86MLtHfC3nBVUwxnui",
        "0/A2147483646": "3KMm3tUxxq7LDvCW7mvFPMMuAm5VRJMzWG",
        "0/A45656668": "33Dx9PeZEYVW4PJfa6LAL4jkFqwVxFYrbR",
        "2147483647/A0": "3QEexa3ZGKR4PQPCcqcnWBMQ62DtmzFgsA",
        "2147483647/A2147483647": "347yQfcbMdv7KaJ3ZhT5n1wL5viWXBfcK4",
        "2147483647/A1": "3CWf3hehL5EC7MmjutpMV3hyNpoErEbshH",
        "2147483647/A2147483646": "3EhgQr669vmYjGKhHKoPKRHCTbC6xFreuH",
        "2147483647/A45656668": "3BK9h8e5ddru9uWSqm4XRButptbGGCK3Xk",
        "1/A0": "3JFE2MeE3znrbF325YNuS1GoMrQgXWV665",
        "1/A2147483647": "3NasWNevzxgBMXtdxxZzsmA1C4PN2fo37C",
        "1/A1": "3Nwp5EHg2fYn1wKSQQ7Vf9GFkMoyZ2hKbp",
        "1/A2147483646": "359aKfMvHDL9KeKQRhPKbEqpd1yxzBmHUu",
        "1/A45656668": "3Q2fscc4eSkgE3fLLNUbfKXskhkrbN6n7Z",
        "2147483646/A0": "39jWcjZx8PYAzNKUaA9f4UN3ScvjC52aTJ",
        "2147483646/A2147483647": "3PvVrF3YBXp9CJqT7ked5FmFsRSCuMjyDh",
        "2147483646/A1": "3HYuWh76FGQ5T6xvNHt2N5A7NbEPyQkJuq",
        "2147483646/A2147483646": "35rKBg4dsryk9Xrv7e146gL11JWVL2jpJ8",
        "2147483646/A45656668": "3AnqMBLyPSgXgb1ShejEUCg5pR4i7p6wqR",
        "8974594/A0": "3N5mzpBBMFKcTrkYaekTRTEe3mDHYyVuu3",
        "8974594/A2147483647": "36XRwDQ4nWuZcDAdJ7QRWKHzV4YSJ7NZCW",
        "8974594/A1": "3Mw3o7sc7QJQg9nv2TFssN7P8DWnDvSPq3",
        "8974594/A2147483646": "3AChx5ukkN4PhRh121oK4mYLeRN5Ttu98R",
        "8974594/A45656668": "3Meh3VxUgSrCDHv7JKTaJ2Z4MGMXRD9DKz"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q76k9luedd4tftccks0qfavzfsyxt0dw968qd6q",
        "0/A2147483647": "bc1qw2m0739mgj89k249ntzqsdje9julvl7qfh09pc",
        "0/A1": "bc1q9qrt63zmr0gzu8f8djas0rk7dk80ty3v66r0uh",
        "0/A2147483646": "bc1qwfqcl9vgsaf8v4m7aceyg66dtydwrx7zzcvpjr",
        "0/A45656668": "bc1q9ry8q6vygtcap0972nd4kpcjudmjkz6k3zvltp",
        "2147483647/A0": "bc1qml9t369jwjpjqv62x7kcscdq8m7jltjt6c2l2f",
        "2147483647/A2147483647": "bc1qmkc75nttw0vx0em2hpwujnekyexd93a50xynvr",
        "2147483647/A1": "bc1quxtrt4vastunc9kz6mkuk9ckv2zvdxevh5klqp",
        "2147483647/A2147483646": "bc1qw8lknf6l5ht7h20ukm6pcnf32zgzkxm3ydrmdm",
        "2147483647/A45656668": "bc1q5qa2zjt3lewgz3xhtj6qvlrtczgayul6rfhfl7",
        "1/A0": "bc1qdnat09c3uu7tztxg8d62xpqdksmkwzrtvlk3ue",
        "1/A2147483647": "bc1qg95cwhvz89ydd353m0cat68mcyy82ycz2j25vh",
        "1/A1": "bc1qkpjelk59l8ur4ktnyfqhctpjk8kpkhfmd9ml66",
        "1/A2147483646": "bc1qzwcz9cla3vvxlu2cvwkg22ta3m54rcuqm4lq0n",
        "1/A45656668": "bc1q2hww8sj3c3hux7sh76tg983vsacjzy0jwjvjmz",
        "2147483646/A0": "bc1qfxpv490lqvlcl2ky3fuvcncmg0dc27460g7xxn",
        "2147483646/A2147483647": "bc1q599lhdhthgzxluay96c7x8dyrqq7p93lvezlmy",
        "2147483646/A1": "bc1qcwv92mpp8nr8sr8xwdjrxeg5tv595gy6q9f6ud",
        "2147483646/A2147483646": "bc1qwdvf2tlkl4wwtzc095swldtvcqzayq588gt8wm",
        "2147483646/A45656668": "bc1qvy3hf8lcg2frecqqk7we74u6lk98fm2xxdvnac",
        "8974594/A0": "bc1q2sa4cc6jqfelncdyzxad5j6n2yup89xchhv4gh",
        "8974594/A2147483647": "bc1qwd4n358s4lffwwdv643pd8au96lc04t5ckayyf",
        "8974594/A1": "bc1q2z40zpadlgruckguk4835es4fdcck6z0hdarsm",
        "8974594/A2147483646": "bc1qk30kreedvz7e375tqn0c784yeqgx23szvr2n08",
        "8974594/A45656668": "bc1qd7h2s906wm4hh0267kxzrgnasu7nfnet4yken0"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pc0jlqs8mzeaz2tyms6rspjca9nw9gc6q6ln3tcvc8ueztcappwsqp2cdz0",
        "0/A2147483647": "bc1p6uh5fm4n3c2jg696sgygn0mtw2etq8apsths6ku2qrf4hyrjzhuss5qp2p",
        "0/A1": "bc1psyhdxmr83scxj66fa4kmacs0k6gtn75s40ju4c4n52gajguwlpxssxthwj",
        "0/A2147483646": "bc1pnpga330shu9z0fcx8x2z0xtpvjhmnad0dgvdhgu5vneshjh0ur2sl2ett8",
        "0/A45656668": "bc1prs2rwn5w56xagum89g5ssd6u5am4swpq0smhhtxsyuh9edv6xqgqq5u406",
        "2147483647/A0": "bc1pzt5jx904jpag9043mtk5xq0w6d8kl45kkflyrumk9xg8nutjq0fq05n3h9",
        "2147483647/A2147483647": "bc1pkw6dx00u4hphtuh9ddeqtrzgjqplscyvdx9t5t9vh2rgx0cyasjqaf5rqx",
        "2147483647/A1": "bc1pd7cuswqf72lrskq50huksk98mzskz2d8rgt4klk5h3jsdpmutelsk7dwgz",
        "2147483647/A2147483646": "bc1pwz2vz80dfxpw3j5kvpc0amqj0ua87lvc27l8p6tvl37009mht9cs4cp0hp",
        "2147483647/A45656668": "bc1p3l09yc44jfppher77ya85r9sq0kl5gnakjlu6pplj7c2qkzmqz4qy524j7",
        "1/A0": "bc1pv84m0sjy7fm8mpvzxwqf442zsg8jchxnlp5uf5k74hzspwzedp5qf7trxk",
        "1/A2147483647": "bc1pzdxcdexcw8fyy0293dggtuhpr7jtq7gn534nk0nvpdwdhpx62r7qmn5kf9",
        "1/A1": "bc1punv7jpt9jukxn9way93z3wh5vysa6jayry7z94avqu0y0mzjdm4sul0v97",
        "1/A2147483646": "bc1p6s08avqrg0n7fynuw24tmpw675zu8g03hqjxp0g60yrva6hfgfkshm56ej",
        "1/A45656668": "bc1pcp2yq7m04pwrp25x2wjslxd9cd7ftvugvdn9davnttmn9cmekupqgs0pdz",
        "2147483646/A0": "bc1pddz9ntpq9xfu35dclua32smvfcdeqsa65pmw0flkvx7uchptzajs4569hn",
        "2147483646/A2147483647": "bc1pgcdsz9yzk8y2z6tyjatddyscy3r4252d75uhc3n2axg9c9nql6dqfwpzad",
        "2147483646/A1": "bc1ph684k8wzxp5232dk4k3rgnt6pkflef7qp28hhnpcw90atlw3d5dqmf3jg4",
        "2147483646/A2147483646": "bc1pwl5krg9adgng8mukmwfnl795zhek98qhek4eexkv5pk2phqpfm9qn2dm7v",
        "2147483646/A45656668": "bc1pr9va7pyaw8ndfu9y8kzrda4d2a6n0xsy6xnwrq4cunlx8sn3njlsefqs4w",
        "8974594/A0": "bc1p64w9smhjjf6wy0zmfdmwv0zz9szrt9vp5luewlcjlgydgm0awnksamcmtn",
        "8974594/A2147483647": "bc1prd0zdjp6mgw0u2uzsk4940pvuk697ay8pm799j3ymz80f7g0wu2qlgckp8",
        "8974594/A1": "bc1p5r9pf6lhxca2387d9erdn5gzp9xy95vagze694fkrf50v2e6p76sdc5hsw",
        "8974594/A2147483646": "bc1pwxdeunhxz7k03l9y4k2uzjcmannx8s0q8r49khd276ywdf3d46hq0gz0kd",
        "8974594/A45656668": "bc1p2kuu084adn0amlt2ldj6jwq7y9jg0y83u2g95csxvk9frzesgw2q8e0cw8"
      }
    }
  ],
} as AddressTestCaseData;
