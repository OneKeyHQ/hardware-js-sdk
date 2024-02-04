import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'three-passphrase12-密语2',
  passphrase: '11111111',
  passphraseState: 'ms8QNM6uuo3zbo4SM9YqrsxPRGv3b3HmuQ',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "14ox6PqPnEEzfnQrcszLUb4HiKhSkdzQAC",
        "0/A2147483647": "19NgmcyCsepPfUpQoySsS6KzYnAAvc9Seo",
        "0/A1": "1MB4homtqYcrHG6vVcGP9TJdprnxM99i9R",
        "0/A2147483646": "1GSAtKEscQCT4H5LUdsYYzsiCp8CZmFRM2",
        "0/A45656668": "15fQSR2XjBDhba3niGyn54591Jfyn5k8yA",
        "2147483647/A0": "1KUxarQuQ8MDYedMebwcLURyuyvnsZpcxU",
        "2147483647/A2147483647": "1PnS3ooytNdhx6Dg5Sr1zucEnvGdoe8gme",
        "2147483647/A1": "1K6aBoixqBN1rjZg38iQBP1gV7mJeoJRCH",
        "2147483647/A2147483646": "1F8Sj4P2qroxD7kf4N6ipoL3gdsWEDNnm9",
        "2147483647/A45656668": "1i6U8c4NcqNxeLepLy6LkZBAYiZaaoYyn",
        "1/A0": "1MoT4Q5UtdwAh2q1WbB3Mud4Qo9THbdg8F",
        "1/A2147483647": "1GzsEdsuTHsPBPNanvw9iNpUeugXwqoGw6",
        "1/A1": "1vvkKTzE5AYVUBkK9tzNZinb1TkP3oKSR",
        "1/A2147483646": "17PopTPVANwcqXEXbyp9am54se41KopZ7F",
        "1/A45656668": "13ALbNUfvzgteTzBzqLboJVf6Sx2F336Dz",
        "2147483646/A0": "14AEN8W24MSnCpwo7RGvhBufsoiyADy5Lf",
        "2147483646/A2147483647": "1JNDGXaJSXtEJNBjiiKDccKvhxMdLjCctD",
        "2147483646/A1": "1HMfm3XRR7wFpXqTMSx275XmP83JKzmZ8U",
        "2147483646/A2147483646": "1EhNLKvUGe7YdpjcgRtnpbrnLgbwEGPjVg",
        "2147483646/A45656668": "1LMD7J8jUYhXQPM29VkTQjVDJYZZR1i6Vj",
        "8974594/A0": "1DLxWGpezmtszLpuhRTqAM7coRMBqAyW8h",
        "8974594/A2147483647": "1NrFLEhoeyuX87gvGFj6gCaZ4dM1pesWBs",
        "8974594/A1": "1K1hStijBhJpn5opLAk1Xuk65WQtbwSDG5",
        "8974594/A2147483646": "1B5qtVHtdzn4t2VM43nBECvyQBNmzpyUSR",
        "8974594/A45656668": "1PiCKmFdSaV1qtmAqSovpPiiRYgdMwBwBz"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3HgHMHhh871x6hxcuSGtfmLfyJRxbyyhTr",
        "0/A2147483647": "32v26i2XBke2mHEoq7Umxa82CMinXLkwt3",
        "0/A1": "3BxuJ5H9i6CSkKEqbRuGxpTBufvHYEfSKX",
        "0/A2147483646": "3JEuznaU9MPi66w1NkGvZX2HyTn24L5i7z",
        "0/A45656668": "3KMBoN2B1TDdVo3SxaNp1s42U53C2Lj3WA",
        "2147483647/A0": "3FzzwezqihRaDj9kVXYQM3Zy2KgTXgxnv6",
        "2147483647/A2147483647": "3FUobc89a8q4iWqdjsRUMBkG5drhpSvhRJ",
        "2147483647/A1": "35xPdXFgEWErbjfVka9ARgePaCJeeLPWEL",
        "2147483647/A2147483646": "3BXJ6JRn6df3WbZsTWgqehmbnRkBC64wXA",
        "2147483647/A45656668": "3AkrRhAyomJ79CUZje5NkV3Acqv1bDA5w7",
        "1/A0": "3HowNofsgJ21UFtEQZzRQ9BLTbRkn1wNGK",
        "1/A2147483647": "3HHV3ND9U1eUqPBWi5i3mQMogRuX2P4pzh",
        "1/A1": "31kNBdNXqXyXGFmL9FWDttpeavH4k5vRKf",
        "1/A2147483646": "3QkjPh7cCjAcawCJ7qWy123EH94712dTDk",
        "1/A45656668": "3AJfmDmAasUTw61qcZxH1RNBnhAa9o9WLB",
        "2147483646/A0": "3JxuX9ZDtJpwPrXDb129dtwR72sTSHFKT3",
        "2147483646/A2147483647": "35eyX536vVrJZewJTVxyiDR224MDRzuoYJ",
        "2147483646/A1": "3G3QezspSEPXUNyWjsLBvrCT4MqaRdPWTs",
        "2147483646/A2147483646": "387kqCgLkpmdnfoKzaLbEHnmxcacYUL8Sy",
        "2147483646/A45656668": "3F8VGXzw2pc6iP4ADcvKDXN4LhqqG9aM9U",
        "8974594/A0": "33X7CLqZUNJipdpDiqRcsz6xSftVomLxvD",
        "8974594/A2147483647": "36kogMdUf6r3BpadacLNGgdKX797kJg4C2",
        "8974594/A1": "3CDwUAThCty3ukBVB14xNPKWd5w6snaduW",
        "8974594/A2147483646": "368qfJp64etHdcvtDdhgx6u6zFLxVSxuQx",
        "8974594/A45656668": "3HTrxUuuboRsUNYbCtC7iwBGLdxsnrYcEQ"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q56d5cjs2a2qjvjnfr34r34d9lqgstdp8fedlse",
        "0/A2147483647": "bc1qnldxv72ycush3tskxd8gfn45qefanvsg3g2zss",
        "0/A1": "bc1qpqetgzw94u8h09khkzsumz289tu3vkqvhm5lgt",
        "0/A2147483646": "bc1quqf530dwx2n40a7txvuemwwlucj0fjjyg8m25t",
        "0/A45656668": "bc1q0ds0sr5z9lzg3aas3uqdsxzl4xysemgs7epqw4",
        "2147483647/A0": "bc1qla0at64yhlndxhflw8vces0hyef6txlss7xz0j",
        "2147483647/A2147483647": "bc1ql6zm2lytzj7ydpdrt5c4mtuws5gffl6n09t0p0",
        "2147483647/A1": "bc1qug99sfdkekhhscd4932249s2wtf7r9kvr7nz08",
        "2147483647/A2147483646": "bc1qe8fsfnm4237qvj0whaerj9ytu4lq3q5kr2utrx",
        "2147483647/A45656668": "bc1qqtr0rj9luwtdmg3u35dex60hkq3ds4awvh67r4",
        "1/A0": "bc1qdg5g8vpfmrx6vw6zclsarc04z40xq0xeeswqhg",
        "1/A2147483647": "bc1q2kljg695hfmyne9l98pahugrh6zsw055ay0p66",
        "1/A1": "bc1qtf2w02ct9pvzhrn07454ph5c3nl2cj4eh9phgy",
        "1/A2147483646": "bc1qexgq7ayj6p5ac905hflfhnydy7lw9srngw2ylh",
        "1/A45656668": "bc1qr96g4navrtt7j8uy5sx5tgw9clnf3p63rv34gf",
        "2147483646/A0": "bc1qvzhafgnapagzfrwnk5jauevqvyvsc7v2pajp36",
        "2147483646/A2147483647": "bc1qrnyw2qrr26j4wel3yq7ca3g6zmt0kll30npmw3",
        "2147483646/A1": "bc1qq3x2sz75p682y5mpnh4r9c6wtva6xrpj8c822t",
        "2147483646/A2147483646": "bc1qpk8493dcszknr29a6y2rxqu9ek270vl69xft3v",
        "2147483646/A45656668": "bc1qne97z55p7ydpcc4myrv05p5rhtqhz4hzqetetg",
        "8974594/A0": "bc1qg3kwyctze5du3g7eg6knmlq0peqm7d4wg09ggd",
        "8974594/A2147483647": "bc1qd86s23mn04s5fshrslx5fkn8vs0lkrxet5hl50",
        "8974594/A1": "bc1qalfwal8t7nak75swycwfc5566fu4ydp8nn9cpg",
        "8974594/A2147483646": "bc1qwxthg669rmf7rvcz5zdz9mn2jref9ak87gegxs",
        "8974594/A45656668": "bc1q365kp5w0zcc8hsw0jvgxvn0hly30687dvgw0xn"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1p5xxd6ukcdrw80ly466g9xu8entahpjj0gtqsqpunpc3cksc6t2nsyruvmz",
        "0/A2147483647": "bc1pksvmy5f3x8rs9ekffvyxa0rtcevf44stxtpqvrpecrl3dhtlqzssqdwk7e",
        "0/A1": "bc1p7nnck7x5h0wmak64z982cjqur46dzmufke253xsdwd6406jg55lqhfg2lm",
        "0/A2147483646": "bc1p69vqykwvxnsn07hhsynev9khzjshrnuqu2km0wajq7a5ku47j8ksju2zzp",
        "0/A45656668": "bc1plfu8ry0kxrwptscl7umlrd3l8h8ahqvg4j6wqv55qral0ndj73rqpx77tv",
        "2147483647/A0": "bc1p6992gh9jkpc9cjc2d0gumnghnjyc0cpmycgq5kx7v6w0s0cutjvsyj4vhc",
        "2147483647/A2147483647": "bc1p8ww2k8efr6hcggtmdynh3puwjpvpslpqyskmnrxxt6jeh82ctvyq9kyafs",
        "2147483647/A1": "bc1pg9mgcf5e0qgrlm08sc47efgm2ujyszm6ncf6c9x9e43qkx2up0hsx2xjmz",
        "2147483647/A2147483646": "bc1pgvpegaw2er06x08h3aqjr7yyhf6565w9gapuepzt036rwequv4zsrnwdu8",
        "2147483647/A45656668": "bc1psan2zk7v98c9acrd5j44r3qjm2wymrj9mkvn9kka9g8pst8n7akqhtezgs",
        "1/A0": "bc1pfc6xn0xvraghlw40w3w7apsj7t9l3a3aa0zf8f6cd6kasv7ymupsq7n3du",
        "1/A2147483647": "bc1p6yvdgt09n3k3symcs5p9g3pfe6h49fehk2vvvnctuum6avx0j0rst2v44p",
        "1/A1": "bc1pwxtgq2yn6suvtgan8f3cd39uj8588dcjkq4ycsl4c987rv0hhzdsvkr5qh",
        "1/A2147483646": "bc1pxjm37lqssax8dx23lsj03j864schhgs8rchlrqafmqj62y4ve3hqrg308y",
        "1/A45656668": "bc1pyldpgl0utn0pf53knv8upexj5umm98z3pdcukfz9c2ah9qhhl65qccplud",
        "2147483646/A0": "bc1pwadlywcyv76phcwa4senpjqgj94c4znp7pwz26qx422erfqkugsscevl2j",
        "2147483646/A2147483647": "bc1pextdv8thanjg2dqq4qfkyfgr6t7vqfvqkfgf52p60p5dq2r6vssqsmgrl8",
        "2147483646/A1": "bc1puztdzlakjsdydw2n82zyzluvp63hn5pqgt6n2lgr5sycnhxt2lkss6yryf",
        "2147483646/A2147483646": "bc1psyq39shpqxa4ewvp64czjmg0akmdqx2q67eelk97ku3mc6x946ksysgne8",
        "2147483646/A45656668": "bc1p6frt9z5qgznlwf352pa0tlhj2f526ty5ufxtymhl6fzlcu43fk0szgsxc6",
        "8974594/A0": "bc1pej4h59fjcyszlfdk2z2ej9frlqsp3e8uv4vcsgvafu8w809k70us5l6qyk",
        "8974594/A2147483647": "bc1pk247mweutsgttwngnfdu8qm4qxzfq2jt2fg5qq4ctjs5e7ycddeqaqlswf",
        "8974594/A1": "bc1p2q9c5m0rmunmtpzv9ln5n7ymnrgmmrmx3e4fdslkcy0kz67t95tqksd2xr",
        "8974594/A2147483646": "bc1pkj74d5tuq7n0rhjjt6sqvlzlh6yp8cehu45r0dme0e7rw4n9vysqluuvmq",
        "8974594/A45656668": "bc1pgme3y5vt7kqga43j08flu0lsfh5cg9rlahaxvvfflnwcnz57ks8sqqfmku"
      }
    }
  ],
} as AddressTestCaseData;
