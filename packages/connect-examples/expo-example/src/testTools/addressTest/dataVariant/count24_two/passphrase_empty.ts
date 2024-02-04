import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase24-empty',
  passphrase: '',
  passphraseState: 'n2XDwPTRoTrLUxu25L6XDnyDBuDeXhjmoz',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "13WmVBjPamTJQfuGrjk7ffypXoXodorYke",
        "0/A2147483647": "18AW9gQN2paYEWPEE2mFtzLjddzDF62YJq",
        "0/A1": "138KqJiezXFAJ3CUfMg9LeDLsZvqnaJ4h2",
        "0/A2147483646": "19vyBSt1ApK15gzorFVEcg5qwEQK7RqgH4",
        "0/A45656668": "1KZLbRVnBfWynRyUXZQpiUyANwbouG7w9P",
        "2147483647/A0": "1DddyJeeJvHbDfPPLNHEggfbdAf7wDX53L",
        "2147483647/A2147483647": "13uTV8vXrZF2Bfg7k3bMXZJzmz3LZFYCBj",
        "2147483647/A1": "1P3hMFkZUKUUkSEPEP69M5KyGNkLpj8oc8",
        "2147483647/A2147483646": "13fD6PYyeUqKf4FM3YGfUCCfA6pSrFSPuY",
        "2147483647/A45656668": "1MxrY7oZoieTGEfbU8karbcBCNQjvD3oru",
        "1/A0": "1ekTqQ4EyKxRP34QRHiUDZpk8vrusvnnq",
        "1/A2147483647": "12RKkV4ZgLFVHSi9cteVRSy54mdhMTX1iR",
        "1/A1": "1MSAUxvsZbn3CF92UWfeeaTN8VXXA9FUh4",
        "1/A2147483646": "1KdznQn9xNvWf2zxbmXpYUgxiUZpjoB3V4",
        "1/A45656668": "12FohdJU8YMjYppePam1hCjWbCBwGCpN5n",
        "2147483646/A0": "12UxSoVU7bgdVdPnyZqi47WeurryzvJmVe",
        "2147483646/A2147483647": "17d9nwHdoQiRqe25GgPFfrhwaAe5HR7N7w",
        "2147483646/A1": "13jWcA7PMDijjhikYtCuW2ANAow7L8NUK1",
        "2147483646/A2147483646": "1BXAjKVcXBvAvbRZB3WN9SeY6xZMNNiFBx",
        "2147483646/A45656668": "1HB4E86dz6NTdKnBmgszTB1mTgLgYnV6Dz",
        "8974594/A0": "1NRENZF4L6dHDPoUPTfDdyJn37Ky4ZbrKb",
        "8974594/A2147483647": "1doLzcbGJHUospz4dkZhodhqAJnj3z6i3",
        "8974594/A1": "18F46kK86qHfYsn6PxHrjo8zh6MMBQyHtG",
        "8974594/A2147483646": "1NccYhYgsAqHa994cWDbScMBGSWfDRBuk9",
        "8974594/A45656668": "1Fut3sMQjsr3KxdH7GThaMv49iTYdQsxgD"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3GesPAeAZ2yivDVgnDW97mjJj7x2tQ4Pkd",
        "0/A2147483647": "3CdcsRsEL5qx4H5o7szyLWyxnEUZ758wpN",
        "0/A1": "3QT4qHhMdZqsrPk25dN6KQoB78rfQGRPVE",
        "0/A2147483646": "38sgaVqs1WTkMFFnyLzw7MKE8jsCvv47up",
        "0/A45656668": "3ALXs5raQjSm9LzoWyu93owv1FTKbzqP5e",
        "2147483647/A0": "3KX8quqjfWMWeCGzZ7t5djPV3s8v2gzaw5",
        "2147483647/A2147483647": "38PWSjpLBJfHzaiXr6RVCHyyYmyJpr8yg9",
        "2147483647/A1": "3DzLYeA7ky22PHwckuArZvVguuLmN8TwSt",
        "2147483647/A2147483646": "36AbVGCbp9X4KJ4GfXnixsnY1gFyKAqsqC",
        "2147483647/A45656668": "3HwqWHiBg4WN5Axcrw1uBWoNmtABG89eLx",
        "1/A0": "36Z1JqZwjP5XSZf91RnXNiVpmjJBMCjkPP",
        "1/A2147483647": "343JdXjihZaQG8o3PB6uiG6ADmpeqsUUjU",
        "1/A1": "395BKUC9r3RS8cid3omPgvd6hgpoA7yLFk",
        "1/A2147483646": "32iuJqsukLZ37kUXFiwHHb2FKNXUrTeVG8",
        "1/A45656668": "3CUi4ZTx8kSUpU9nMA1Bbg3FZdpNQrowkU",
        "2147483646/A0": "372Lyuu9huGsnoGziyiMmUeHUpUwfjhy19",
        "2147483646/A2147483647": "3Nn2KzmLUaxPjo2GpAPhaC7EwH1Jv47ibn",
        "2147483646/A1": "3DoYpUmoR94QG4uRK1cFuSbZz8xYzv4MJf",
        "2147483646/A2147483646": "3JatRH3x8HWaNUPUpZMCZtkyGX4tbCoYBa",
        "2147483646/A45656668": "3BHaeTG1BbVKYhfDQPx72NZBUKAwRwzFES",
        "8974594/A0": "38HGdLyRXp9LRQiNHxmDEyyJGQbiM6wDKN",
        "8974594/A2147483647": "3JL6TP3aq25PZkbK5Qo7Zto928EJsCuMKu",
        "8974594/A1": "3PdRi6nTB3kFnkhHk6rgtiLrBkZVkUqD4L",
        "8974594/A2147483646": "3HvWrnSWcTdJ99b6XT974F7eGctaYA5ufz",
        "8974594/A45656668": "399qjtGfdqZwJeeghHF1v6oinVELeR9Yrp"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1qee6lfj0we9z4g3n8jy3uwnf6gwtjlr6tllyqfk",
        "0/A2147483647": "bc1qm6ufad9xgazcjzw0dxp2vva5ap22r43jsc36na",
        "0/A1": "bc1qfspdzpt03j3m04tcruftpdmwas2yf0hd33umdm",
        "0/A2147483646": "bc1q695l9098eym02mauw60z2fwy8yreskvkmezl7f",
        "0/A45656668": "bc1q7fmmd244x0nyjt20zxs6unzyzr9584tk922q34",
        "2147483647/A0": "bc1qw4hhfjet49aeafmx682s280gdw3wvqfrqeqr74",
        "2147483647/A2147483647": "bc1q6fqs6n5lcqew2dpg97fy26jj4x6suszmk8hztg",
        "2147483647/A1": "bc1q3gk0jwnukuq2zcvel2hajn698qpu4vflq8nqlv",
        "2147483647/A2147483646": "bc1q3j98gccrnvusxd7dctmj76hzvka4ls7flwqv73",
        "2147483647/A45656668": "bc1qhpgrmgj9s9lzc9t0d7lv6tttc797d6klxnducp",
        "1/A0": "bc1qawxk6h9qy76jyutsj77yjd7gxt7cgzw622ynu8",
        "1/A2147483647": "bc1q50hu96mxstyf4f8g4r47yrh0lj6mpchc8affu2",
        "1/A1": "bc1qn0l34e0f240lk2l2mpsa7e5sspd8e3h0d6f898",
        "1/A2147483646": "bc1q395rask5h9ad78xwrxx3l4w9sqt9rpv5h6mxdg",
        "1/A45656668": "bc1q75f8pmhrlzcu34y6829f750v9sh0kjq3qvayvz",
        "2147483646/A0": "bc1qk5hxqme8x7sfrphdrl3tspse2c42c6xxec69ps",
        "2147483646/A2147483647": "bc1qssqre9namguwz27caq8hjwu6slyrkgc9mjld0c",
        "2147483646/A1": "bc1qgavh90v0jyu0k7y6y6y84q48y0mxuycqkn3dl5",
        "2147483646/A2147483646": "bc1q73k8nja8aze2dalrt0lz74x844qkv3e4yhpprt",
        "2147483646/A45656668": "bc1qv02sk4a46x3k987xuvg5c9pvju20qwpt0e6ewh",
        "8974594/A0": "bc1qqwmu4v9sqpjtcy4sty97reaejtzktnatgyn8vg",
        "8974594/A2147483647": "bc1q6vqwq0v3sx9ple6yg9lhfzuvzjwq8dd44q37fn",
        "8974594/A1": "bc1qnjpca73u9xpczmys5z39rlj6cygq6qcznd572r",
        "8974594/A2147483646": "bc1qrwy5264w4w9sedu4k8ewrlc6jrq2x8afdyjdz3",
        "8974594/A45656668": "bc1qayytggy0sgctvjg9qxxz3nhacax6q2nnmcysqt"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1p90ln8k6uvu9eezcnutd8wcudm9vjzt8cq08ga92rhrtmedxwxlwskc89d2",
        "0/A2147483647": "bc1pgg6lh97w9dqd4dc63qeuzrepgu5z2qhl2frwdpr8k9jeedte7pdqnyyt7l",
        "0/A1": "bc1pdgujwe588v7ya40dhldngf9ffltgr4h4vz3ha868y66uur529vssu73qdw",
        "0/A2147483646": "bc1pl4u8hyauw58sqg6ep0tjt84tq3xthaauhkmm522frcdxuflp5fuquzagvz",
        "0/A45656668": "bc1p6n87zd5fat34qex3k30qwm8kgslzqqzdnazghy39t40mad4439yswqyyta",
        "2147483647/A0": "bc1p6ur7p8mlte32ea3gvdhe2n7vpggny3aegpz59j74rl5y8ejsr2nqy757yj",
        "2147483647/A2147483647": "bc1pdfrgfq5446em2rzl6g72j8zp3gkhnmaalmzx7l6ypjd0lhusqg5sel3pgj",
        "2147483647/A1": "bc1ph5u5mp6n66nafc6wsrfjg0p5r7uxtqhw8278kucpxhujajpyqsdswlrfhd",
        "2147483647/A2147483646": "bc1psjzh5yf8f8d0shz7k8yyvm8hr6hyt374vrvutyerlqequdpjgt6scke8pd",
        "2147483647/A45656668": "bc1pwda202fnqsnl7xmuq8hg4jggmzh9955hgsvl2wz5vgadjjxvdtaq0z5tl7",
        "1/A0": "bc1pvs07gx4npax0ena4kjlzlut8l6r64s2en7apsn9pjcsj83shfghsjxrazm",
        "1/A2147483647": "bc1pht32rsdufwk8s4rzv2kg3nkmt5hlv6dr7zrz5pcu5ajx2q76dl7svc0g4k",
        "1/A1": "bc1psdwe3naxwmtzs6hepnw9lqh8pyd54clddjly49rpq3nzlzeylkhs8c3f82",
        "1/A2147483646": "bc1pz7yyygt2flhnml7cu430ghtgekvkrq7tj6lr8yns5gwzsgweyl9sd0vwxq",
        "1/A45656668": "bc1pma522snjqtmedxnmfhpjc7tk7rkurvxnwggjrgfqecgcuw2vlm9s4jfftu",
        "2147483646/A0": "bc1pqa5j2ck45tfsjnq2ywehxh5jph5gwxf08jqspye5kt05v6datkhq3a73wt",
        "2147483646/A2147483647": "bc1phc6qpgks8rht734m0vdn9sy245k32xa0w3s58rw0v8fn6696rtesmlmky0",
        "2147483646/A1": "bc1pt0vn4usn987qske958t4ed7knss3kywcxxpf2duuc5my083tfpzq85c8wv",
        "2147483646/A2147483646": "bc1p4mlyn9efwctc98mwjqlksecg9pmsccgs3vykheye87a0slhqrrkqtemgvl",
        "2147483646/A45656668": "bc1p5zm0ttu6xjlw2e7h27q9269vh32tpn7v7pm56henuyhmq5c6vtcslwe9d3",
        "8974594/A0": "bc1pqw2sgq77q4rn6v94ae635cg9m9gdxjz02n2mkktrx5hu5tpmz2fquumf04",
        "8974594/A2147483647": "bc1pmznm78fjl86f3c8a483zft9ch83re7a5v0umpdx0rl8lxwakuz3qa0w2vh",
        "8974594/A1": "bc1p0lc3cnv935yey5t4ld5lkmkv3v8zzn754dfya844qd3ntgdm4huq7rme3w",
        "8974594/A2147483646": "bc1pkt95j5xj78f8hsr5yjkrfkp6njk9nmyxcf72t0gp8j50m04qwrrs7zsp8y",
        "8974594/A45656668": "bc1pqs5v64slrp0xr73nfltxskj0txfgr73e5k5nlg7de48t6f3zy79sr0eyd3"
      }
    }
  ],
} as AddressTestCaseData;
