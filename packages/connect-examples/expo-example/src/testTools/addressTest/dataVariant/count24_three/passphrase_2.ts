import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'three-passphrase24-密语2',
  passphrase: "ADxvB0383*3*%^%~./,';L",
  passphraseState: 'n1Kg8udanaFFE48Y8im6GmgCSzSUmGHxV4',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Legacy",
      "params": {
        "path": "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "12mX8CbpusXunASe5h3gtrSENEeEMFvgrE",
        "0/A2147483647": "1GRoYwhng6Votr2BfSEaxG9wZMBKzZndLF",
        "0/A1": "1Pz9J8v9aTJwzd8dYQrP1TvUU4VByqVSxr",
        "0/A2147483646": "16FaAyKtmBRN7azbWNHFVfJAp9e6mV73JR",
        "0/A45656668": "13B5RnAQr7DVvBBx47cJ8tfgWxDSVHTga6",
        "2147483647/A0": "16t7pfApbUEGyweNf76cZ8gErqwgtmvAoE",
        "2147483647/A2147483647": "16VgSd6yHQdKUaxVTgX4F4tqaPJWnqh7go",
        "2147483647/A1": "17p5K5KUKikJNLcMxCYtWqLETMqcHVmE4J",
        "2147483647/A2147483646": "1APU9tf4G74j9YZGjx8KmUaXjKKJ97qZZK",
        "2147483647/A45656668": "1Np71Us5EVcVWpDAQkxFXEBewuzBw53tnU",
        "1/A0": "16LzhFrDieTWzYkQE4GBMLcapFjNQWPQWU",
        "1/A2147483647": "12W3ZKBaQfcvZrLu9VoPoQWyoCSwjQQcny",
        "1/A1": "1M6BDS2XogUSox1WDDexVyrFNc3HmmqxJD",
        "1/A2147483646": "1NWe8zxASSVBkjFupFYkNKRPB1zmbonubd",
        "1/A45656668": "1HWaAH9zuZAJmPMCpg2P1MAdL3vnVhrRAu",
        "2147483646/A0": "1Jms9mX5xdTAHVMFrk1b7JSKhbQB7R5PAC",
        "2147483646/A2147483647": "12XJsez97gDi1ZCVV539TNkDkzATGaVSvf",
        "2147483646/A1": "1LKQKB9QiEsBt5pfUqWCyS8CGy66BG8Hvq",
        "2147483646/A2147483646": "1DQL5Bc9CfgPPzygLaS6D5EAT4NicFQhx5",
        "2147483646/A45656668": "19ybWVChFpYDyXCDAiHTpGGYnuuAwPz2fC",
        "8974594/A0": "15bfESG4nZyNyGpJjmFxchhGzFt9QdUBuY",
        "8974594/A2147483647": "1Bd9gfwPK8xB9zJZiYpN5pPzkpuoTMFZU1",
        "8974594/A1": "16kF49EtBfwkLQzjwiSqEaqyaueEseutN8",
        "8974594/A2147483646": "1FZ5jiAsQ78MjX4iAApLCU5QphA6kgpcVE",
        "8974594/A45656668": "1s391ahPcMGPyWnzp2wU9ZmLY3kgKNwRn"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Nested SegWit",
      "params": {
        "path": "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "3EXCE7hMQTxS67QXhukEcruGBWStrga89L",
        "0/A2147483647": "3CxeHqRuvqkXf9NXuwa3KCkcgk7ZLCVpLW",
        "0/A1": "3EPgr1bVnoNn2j3yhhwvroyKFfc8rE5k7f",
        "0/A2147483646": "3ELcxzgphTq12rVBpzzgkUUQh3NMASdA4Y",
        "0/A45656668": "33i3rHpGER8CVfpbqDG4xBwhufZEJRMwjm",
        "2147483647/A0": "3P5ZmQBWPQNhJoMnjJghHr67QRASPCKKY8",
        "2147483647/A2147483647": "3Dnb2FSbtfZbxNv4ECUHzcEdAkEV2nV4aP",
        "2147483647/A1": "38dh7PK536eX8Bmy6sj3yq5TFD4rNTm8fL",
        "2147483647/A2147483646": "3NxEwogNUkD45K9k4ZN8oFuA5KUZ2Tahb9",
        "2147483647/A45656668": "35JvyQVx1BsQmLdWvmAGCELWbFoTsZFDpV",
        "1/A0": "35NuDHELqrHH5YYsSC1xUGMzQMGUYydRcw",
        "1/A2147483647": "38UiuoAPgr1XcjBHsR478tpRST2gTzpWjD",
        "1/A1": "34FhvbQEZdN9DarKdMzsZAnMWGVfsByq2g",
        "1/A2147483646": "34wB4u5eqN6iKboJrGjMfTzk6C2X91hzqH",
        "1/A45656668": "3NE23sG3f29kJkvbCfbB68S9WSoywdKmP1",
        "2147483646/A0": "373kCycSW4Nb3seWB6NgyrejenN8NW8fdf",
        "2147483646/A2147483647": "3EPzyuf6xNt2zKY19dbfAbtCKHmiiF2Kyr",
        "2147483646/A1": "3MeFFvP82i74VVT7wgt4xtGfhm6HG7jSt2",
        "2147483646/A2147483646": "347A8NmTJnKX75F3GuDPynfJdmzAkToJwh",
        "2147483646/A45656668": "35vX7hqCnv4vicAfouV1GDM7zdjEPtotnc",
        "8974594/A0": "3EZc9Wqf2LAnFZ9huVVETBF4Kszpn7yYtY",
        "8974594/A2147483647": "39r8gE45agJvrNjWgfuPHRneTMadSw7Yen",
        "8974594/A1": "3LBqDMsx68KiKkdF7CQEVgYc7LX3ZYGKwg",
        "8974594/A2147483646": "32CADiXJeVhmQW8rZTXvqR3S51kYDbM4aN",
        "8974594/A45656668": "34EMcyLBKb9TBtSzRBgXgha9CtVLUvZG7L"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Native SegWit\"",
      "params": {
        "path": "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1q372wlk367ulgmvsgr86g9zhpgcxhhqhqdnvm7k",
        "0/A2147483647": "bc1q8zdmph6pf8hjw4ytknht86vqg4mjkqlm0c7gz6",
        "0/A1": "bc1qjnh88kdp6y8ly56x7nc863ag80shd4djmmt6n5",
        "0/A2147483646": "bc1qwuxjv49ff6s2fu9vcytvlr2ayps77h2tcal8sl",
        "0/A45656668": "bc1q7jmx5nkgsy6y8kf0c5ml4vdynwefc334zmgq4u",
        "2147483647/A0": "bc1qny4twcmyseqe4fdd2jjg0dvjc008q7nedt6thn",
        "2147483647/A2147483647": "bc1qehzwpx6mkvpstwt4fkqvqucfuzy0t3kujeymq2",
        "2147483647/A1": "bc1q9up79jcgx7fn72eek9ean0dpfwm628gy0khah2",
        "2147483647/A2147483646": "bc1q0tpvrmas80nnaaf2c3gcyzqjm90cvv3rlwya4h",
        "2147483647/A45656668": "bc1qxay6pvx89k6vrqve6v3nx8h2nxds3swjxv36s8",
        "1/A0": "bc1q440wxw77rfrr0hqquq9649quwcrq9d0kkflw2z",
        "1/A2147483647": "bc1qmswf8gjw347rwvz29ymdcfzwyfdsrqw35arrye",
        "1/A1": "bc1q326p3wukdny6t2rt5rws0a3hcc4ttdmpcef05a",
        "1/A2147483646": "bc1qs702q054sah84hf9zzq3vtg488k6qwux4s8s0j",
        "1/A45656668": "bc1qm9g2wauvc8k98y3twft30q5fcg234ny8yc57ld",
        "2147483646/A0": "bc1qym8qvcdrqr64c3lsg0cm78r6peyx76vvasl0a6",
        "2147483646/A2147483647": "bc1qvgtpts7vh5kkr9vjjcjgs26wr2xjvcnerxyx0g",
        "2147483646/A1": "bc1q9dgljr0arwj9dewrrvc6antdc8c4707lmvpgff",
        "2147483646/A2147483646": "bc1q9jz46jhdh2dgfz55a5q55vw9x9w9l5e33qdy2f",
        "2147483646/A45656668": "bc1q3md9jfz6zgk5ceq6kzz3cm3cpplq20fq7y62fc",
        "8974594/A0": "bc1q89hdsfrvzqv5ajjyph5srkw3xlmfu8uehzjhp9",
        "8974594/A2147483647": "bc1qqj2lvdrwzdyx2dg4mad962lvn4acnh5udkkvy9",
        "8974594/A1": "bc1qxs3wp6k6frzdxrnue8pg4zk479qych40p8hgfx",
        "8974594/A2147483646": "bc1qxp2xjmkxk220m9pqfvrt4l520vk55f3ecjhmma",
        "8974594/A45656668": "bc1qxlw0sqr0drnzpqyu4ssxfa23m4gkq0ukkxpjph"
      }
    },
    {
      "method": "btcGetAddress",
      "name": "btcGetAddress-Taproot\"",
      "params": {
        "path": "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$"
      },
      "expectedAddress": {
        "0/A0": "bc1pzuah6y8lsxyttjgkywtzjrh5t05sjvl8l8p2uur4u2tnhrr69mrqpn2e9c",
        "0/A2147483647": "bc1p9axeaju5vexrnkq3w7tzzzt542sn3kq3tdzpaaqvjycf3v2l9eusw6xy8k",
        "0/A1": "bc1p2k52ffd6mes57cnrlacec5gh5f8r0wcmr750cpk8zpnf3xvvg27ql7tyf6",
        "0/A2147483646": "bc1pq2z6dervhyd8zx6jkt4w9eh2ptljtada0xdjeqmahd6lcnlukyks3ggeac",
        "0/A45656668": "bc1p0vvjef4qzh3433n6wqgchl3428qq8hfxhnehvxj9dlcc72669cgse08v6z",
        "2147483647/A0": "bc1ppzvqy9ve3dvvwxzhrsantknn8glh9xtvt29kqtes0cg6ezpck9hs57cydc",
        "2147483647/A2147483647": "bc1paclj578yt4wjrfzvs4yemfylg0jgs32n7g8p5rm4p0u4msctfy2sdgjupe",
        "2147483647/A1": "bc1pk0g86tr3jjlus0hxkfmesznyzq4gmfmqhg4pej700qfqedlljh5shw6kw4",
        "2147483647/A2147483646": "bc1pv5wxry2rkkmw3ga44pzn2qf2hfeawkgkd2jm6nsnc7nzgcwxye5qh5j9yu",
        "2147483647/A45656668": "bc1pe84wrl3e8j5cgdq40feuyumpyndsdsgeddv7fchgf22vfnt6fchs6u958r",
        "1/A0": "bc1plskeexhe93yxjm4u7cue4vw8qxnucgwcnk63as7aagul28n6td8q98qu0p",
        "1/A2147483647": "bc1paeg9lzrweez93aa2h90ulelakhrwlklxfs347wa0qu60t5t68qrqutl3m6",
        "1/A1": "bc1p96ljpppaggl4gqk25au4yjcg58krhls75u8d682negxtnzl6z29qhwv5w9",
        "1/A2147483646": "bc1pysasg2vjxetr2684hs2ghn7r68yj025xmazly3wzdpvjz7xamnwq0u7elj",
        "1/A45656668": "bc1pgly5s26tf0pksk7q5zfvtfjmy66tyc2lmf5mph3mzwxgfpk8napsv0vqy2",
        "2147483646/A0": "bc1ppf2hag24f3gxajdyr6ywe0emdm8qxxka5aa4kdd3dfvjsxlkp3kslua5jy",
        "2147483646/A2147483647": "bc1pn58wxyqjtd02qqclxz5a0mg5p5nufykrhmfdznxvr8rkynypq25sw6cny0",
        "2147483646/A1": "bc1p8jxhzt5cz23h59mjcxlywgmqn8ehcrmjarmqwxjxc9hz2f2jxxlq6fsacu",
        "2147483646/A2147483646": "bc1p2xfzpmvkj9sfe5j8klakpcfzcf46xqjau5mnxf8u94qrrhqr239su4sr8y",
        "2147483646/A45656668": "bc1p2hw4dfxjj4al8tan8sf7l4nezf775sw8w2qlxa7drdkzpff8ptdqmw2fjj",
        "8974594/A0": "bc1p34fufkvq7fup0fcw8yk7eqe3ppxtxymqdr60c5h6xjuyfyyu57zsred2uh",
        "8974594/A2147483647": "bc1p8cz4qx8fc7r27lsda603v9u55uypy7z95cv5yfzx9evgn8s9pc5q277494",
        "8974594/A1": "bc1px2e6kz4ga5aggy3fx5w4vsc29unrn0x56mdha7frn8u35va334gqht0rlw",
        "8974594/A2147483646": "bc1pzudk2mmz27yr3famhxnyd62s4pcke8j8xmn2dhlpr4x4dq3uw8zsxfnhtl",
        "8974594/A45656668": "bc1pjlc3hr0ycz9n4s0tfz5ccqknd3900pclttcg8ut2rt2w3hp90h5qzcjy6h"
      }
    }
  ],
} as AddressTestCaseData;
