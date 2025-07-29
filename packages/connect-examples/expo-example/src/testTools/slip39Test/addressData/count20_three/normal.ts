import type { SLIP39TestCaseData } from '../../types';

export const count20ThreeNormal: SLIP39TestCaseData = {
  id: 'count20_three_normal',
  name: 'count20_three_normal',
  description: '16-of-16 (20 words each) + normal',
  shares: [
    'platform helpful academic afraid custody blind shaft burning visual prune knit clay mason genuine march crisis smug wits woman taught',
    'platform helpful academic alto armed theory alpha paces welcome quick quiet device craft strike chemical ocean briefing space phantom legal',
    'platform helpful academic anxiety cage sympathy dramatic western acrobat transfer oral spew package style scroll pajamas curious grant center alto',
    'platform helpful academic award cards category salt guest pharmacy devote pistol focus identify infant evoke recall shaft empty hazard romantic',
    'platform helpful academic bike clogs estate duke thank bolt floral race phrase preach seafood strategy industry crowd length grant yield',
    'platform helpful academic bracelet clock daughter memory visitor result blanket garbage starting speak clay junction pitch ladybug jacket fluff ultimate',
    'platform helpful academic burning credit install sidewalk level museum evening permit duke cards findings aunt document improve woman general august',
    'platform helpful academic carve ajar edge similar glance darkness random envelope glen ancestor gums view venture wealthy learn ivory exotic',
    'platform helpful academic class depend gather story empty harvest overall craft leaves nuclear reject kernel that temple width presence speak',
    'platform helpful academic company adequate western resident dismiss mortgage emperor coastal sack example ancestor mason length mama timber rhythm buyer',
    'platform helpful academic crucial domain bedroom violence mental multiple language sympathy grin beaver salt excuse pants worthy vegan prepare unfold',
    'platform helpful academic deadline crush depart thank pregnant treat salon ambition miracle sidewalk speak practice taxi soldier scholar vitamins junk',
    'platform helpful academic deploy chemical afraid justice undergo deny excuse famous entrance scene early photo glance salon platform wildlife ladle',
    'platform helpful academic diploma cricket trend loud replace rapids payment paces theory easel spine cultural dictate hormone necklace blimp exact',
    'platform helpful academic dragon company true volume carve dough endorse force plot cinema remember skin transfer criminal hunting axle mayor',
    'platform helpful academic easel deadline evil museum spill funding muscle retreat smart timely oven transfer grownup deal armed merchant flash',
  ],
  data: [
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
      },
      expectedAddress: {
        "m/44'/0'/0'/0/0": '12c8HEzTch1nhyqXzd6eQtaHsLTW4hrLUK',
        "m/44'/0'/1'/0/0": '1CtyRf2td3X9shqUMZQsaqWE7eQ7DBTWyx',
        "m/44'/0'/21234567'/0/0": '12BxCq7UPHZ4tPHQZwYJWjgY7r7FDSN6W5',
        "m/44'/0'/2147483646'/0/0": '1MmPUDEqpYCmEaQiZdqpR6Wq1qy1LaActL',
        "m/44'/0'/2147483647'/0/0": '1MzGhadzLRKJJwJU1BrVd4N5rPxE9GPMZq',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/0'/0'/0/0": '3Gc3SXfcWB29MtyurLxUXYqE6Y5HTvGvhr',
        "m/49'/0'/1'/0/0": '3H6yWJ7GznsevAS8ZUtwyeXBt5RnZdACK2',
        "m/49'/0'/21234567'/0/0": '38CmgwAf56WcoR376fP7pkMYnFJqGrCE3M',
        "m/49'/0'/2147483646'/0/0": '3QAMdejEYwTGUA5KCRvmZkFcjck2CkkNss',
        "m/49'/0'/2147483647'/0/0": '3FL5LYkEt6pSQQ7ij4Cgr9x2E63AsHeKMy',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/0'/0'/0/0": 'bc1qy7stxuz65ntwkr0dh8l0r3a3rhvychdrw7zjyu',
        "m/84'/0'/1'/0/0": 'bc1q064k60x84af5j4qyt867p9csktzfudlw2vp9n9',
        "m/84'/0'/21234567'/0/0": 'bc1qz9pr3qn230l9nej8367vdy8c0r2cg7pmsyhmnv',
        "m/84'/0'/2147483646'/0/0": 'bc1qdcw6h99tg64gqd53wsc0vql7mgunqnhxq2pexy',
        "m/84'/0'/2147483647'/0/0": 'bc1qxh0h04x4al6y9ege4scnkfk2rlzw55nyytxmse',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDTAPROOT',
      },
      expectedAddress: {
        "m/86'/0'/0'/0/0": 'bc1pt6lgsducdr68xwsvm0mm8ff85ytuau2uu954f8pxv5my6ulh5ylqs08gmq',
        "m/86'/0'/1'/0/0": 'bc1p5g0uh0r72m8s52apc37zln2w90an0xcyx7pvu7xrl2eptlarrynskcczqj',
        "m/86'/0'/21234567'/0/0": 'bc1pe9wxfx4m6gd07wca3tgh9leemaefmha8x96a8dzg9hpnq9kl4xsqqljkdh',
        "m/86'/0'/2147483646'/0/0":
          'bc1pdw8qyahanc7s5slv55klx9pewmqa55sa6qns2sw7qhku4kqc5ypqkcq5f4',
        "m/86'/0'/2147483647'/0/0":
          'bc1ptt858mvzjahptdmmjqd9waf65p7mvh350ukrfzzdqeh0h4k4eqss6mdrlf',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'/0/0",
        coin: 'doge',
      },
      expectedAddress: {
        "m/44'/3'/0'/0/0": 'DLUL7cSJwb2eNhoduwVukGPtR54pf2bBHW',
        "m/44'/3'/1'/0/0": 'DC4yDLownHrfZbDRSe1wzQi8KrRVdiq1Vn',
        "m/44'/3'/21234567'/0/0": 'DBV4wv1LyUq3sFyeF1G4eseiuXm7TLAptx',
        "m/44'/3'/2147483646'/0/0": 'DK64BAn3CTg1y4PncEUbisTMzTg8kkpMPp',
        "m/44'/3'/2147483647'/0/0": 'DCScXJF9PhH4EBubfSsuvrsBjrVMxpbcci',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: "m/44'/145'/$$INDEX$$'/0/0",
        coin: 'bch',
      },
      expectedAddress: {
        "m/44'/145'/0'/0/0": 'bitcoincash:qq7ucfdts2ca2tg40xc7n3q52hef273ug5emp2gkdx',
        "m/44'/145'/1'/0/0": 'bitcoincash:qz9rw7upnfslmfjhks6ehyqlya04f7yzeqjy8lwh5q',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qpdnsn03ug4n6ze588z7x8scxx3fqpgqsc7f96uujd',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qqc0vagn6uaqjwxkkad6rmgnwpr2f7fq6slh8efhqs',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qrex48lrf8ahp3d0gghpd7nhe6wupjhjkvfc0u77cd',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: "m/44'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        "m/44'/2'/0'/0/0": 'LRgvex1g35EN8Efxj6cUS68XpWio3Y9wmt',
        "m/44'/2'/1'/0/0": 'LYjc29pTfyBdEevLDVt5ZVsYfU7Gbmzc5b',
        "m/44'/2'/21234567'/0/0": 'LMSrsCAiJXrZyjgKhjNHcMjJaD8rXvQuLR',
        "m/44'/2'/2147483646'/0/0": 'LW1mFjKXpd4E4WKbmUtq1yw6oyrJ1GgLTY',
        "m/44'/2'/2147483647'/0/0": 'LV2dVLJBU1r92ynBuAHvMUY8npGC7u7wZG',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/2'/0'/0/0": 'MFHrY3w365PU9GGmPQzwFe1E3NAxpTKHzE',
        "m/49'/2'/1'/0/0": 'MQVGmHy7qyvXL9cAShojEUZkjX6PcCFUsd',
        "m/49'/2'/21234567'/0/0": 'MQE8MLBAGgWXqUifTA5a6WixEaLneZBGZf',
        "m/49'/2'/2147483646'/0/0": 'MTpo5LHjo9cApJEN329Xeh1ppUZt4VRFJX',
        "m/49'/2'/2147483647'/0/0": 'MMK9KobSkbFJrtg9g7iZa1bThsfVAkoygd',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/2'/0'/0/0": 'ltc1qru4567wpqezvksuhe9j53jwuysugft95l3a8tf',
        "m/84'/2'/1'/0/0": 'ltc1qm2lhtzgt2mdkt6a334z24jjz8v4r86ye4gnwnx',
        "m/84'/2'/21234567'/0/0": 'ltc1q676rnq8tgraxwc9uuv333kd8kkgu0hrawewerf',
        "m/84'/2'/2147483646'/0/0": 'ltc1qgl4nrv9034fhpwcywj6mvxq8fw8v0sl6w3f2ft',
        "m/84'/2'/2147483647'/0/0": 'ltc1q7mdwmdg9wmygn6tz5jnafhd6mtn0n4k00jaqgx',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Neurai',
      params: {
        path: "m/44'/1900'/$$INDEX$$'/0/0",
        coin: 'neurai',
      },
      expectedAddress: {
        "m/44'/1900'/0'/0/0": 'NLGZqPjpdkwGJfeGQuM64UYpQkYWX9BugJ',
        "m/44'/1900'/1'/0/0": 'NRo8VXhtvu4dfe8Yf8UU7MU1qEYptM9m2T',
        "m/44'/1900'/21234567'/0/0": 'NMwsWRpmPBPjsaVHHvCGnUnEqCgj9Lx8H5',
        "m/44'/1900'/2147483646'/0/0": 'Nfxff7aUmsjZC4rspzP2jfk92QFgFe4mae',
        "m/44'/1900'/2147483647'/0/0": 'NPf9x4dragNX5UAeehgFt5iP4d3pUetyw6',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0xdeFba6feb7F15fD66c464B74700AEdA9C31492AF',
        "m/44'/60'/1'/0/0": '0xf81E6683C91648aF20b61b411b9A3d4bF25D6F95',
        "m/44'/60'/21234567'/0/0": '0xdF45e9504Ef904A3c81339612deB7dFE4cD40291',
        "m/44'/60'/2147483646'/0/0": '0x9345e540C3341785161CD65983DB447Dd26091E3',
        "m/44'/60'/2147483647'/0/0": '0x0820d8554977fd780a5A66514Ee2b3185C260eC3',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0x320c06a1FD9FA7CBe546e40F5B25d49c30FD2adC',
        "m/44'/61'/1'/0/0": '0x6c8377D82CbC6b22D1C63353883F11F7C5Aa96b7',
        "m/44'/61'/21234567'/0/0": '0xC843408bF8F4AB170C003AfD890693EC278C2DA9',
        "m/44'/61'/2147483646'/0/0": '0x2DD6bbF9F7924B362980bFfd31fF6322147C8623',
        "m/44'/61'/2147483647'/0/0": '0x400EFCA57beD4a0396f257981294056dfF285D12',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-cosmos',
      params: {
        hrp: 'cosmos',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cosmos1vkxewp3p7hfnyzzs3q74gym7q7xt7r7a7ga7c8',
        "m/44'/118'/1'/0/0": 'cosmos1xzueyvhrt0efrtvtfphngdnaqn5rvc3n8qv6z4',
        "m/44'/118'/21234567'/0/0": 'cosmos16z7lkyx9vk2cewwxlmtyehudlx9xhjdue0xqx8',
        "m/44'/118'/2147483646'/0/0": 'cosmos130vs3v0kq2vx4wva6y3n7rxtrh3e2ek9xvt40q',
        "m/44'/118'/2147483647'/0/0": 'cosmos1dp5t6hqrkf6vfcmcxp07y75ezmmkvs4uxz392r',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'akash1vkxewp3p7hfnyzzs3q74gym7q7xt7r7annsepa',
        "m/44'/118'/1'/0/0": 'akash1xzueyvhrt0efrtvtfphngdnaqn5rvc3n2mpam0',
        "m/44'/118'/21234567'/0/0": 'akash16z7lkyx9vk2cewwxlmtyehudlx9xhjdu55t8la',
        "m/44'/118'/2147483646'/0/0": 'akash130vs3v0kq2vx4wva6y3n7rxtrh3e2ek9thxjk6',
        "m/44'/118'/2147483647'/0/0": 'akash1dp5t6hqrkf6vfcmcxp07y75ezmmkvs4uteuzne',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cro1vkxewp3p7hfnyzzs3q74gym7q7xt7r7axn48yk',
        "m/44'/118'/1'/0/0": 'cro1xzueyvhrt0efrtvtfphngdnaqn5rvc3nlmyr7y',
        "m/44'/118'/21234567'/0/0": 'cro16z7lkyx9vk2cewwxlmtyehudlx9xhjdup5we6k',
        "m/44'/118'/2147483646'/0/0": 'cro130vs3v0kq2vx4wva6y3n7rxtrh3e2ek97hrvn3',
        "m/44'/118'/2147483647'/0/0": 'cro1dp5t6hqrkf6vfcmcxp07y75ezmmkvs4u7eeukj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'fetch1vkxewp3p7hfnyzzs3q74gym7q7xt7r7ad4566s',
        "m/44'/118'/1'/0/0": 'fetch1xzueyvhrt0efrtvtfphngdnaqn5rvc3n5a97qz',
        "m/44'/118'/21234567'/0/0": 'fetch16z7lkyx9vk2cewwxlmtyehudlx9xhjdu2j0yys',
        "m/44'/118'/2147483646'/0/0": 'fetch130vs3v0kq2vx4wva6y3n7rxtrh3e2ek943z3dh',
        "m/44'/118'/2147483647'/0/0": 'fetch1dp5t6hqrkf6vfcmcxp07y75ezmmkvs4u4lcpg5',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'osmo1vkxewp3p7hfnyzzs3q74gym7q7xt7r7aknwww4',
        "m/44'/118'/1'/0/0": 'osmo1xzueyvhrt0efrtvtfphngdnaqn5rvc3n0ml258',
        "m/44'/118'/21234567'/0/0": 'osmo16z7lkyx9vk2cewwxlmtyehudlx9xhjdu354ss4',
        "m/44'/118'/2147483646'/0/0": 'osmo130vs3v0kq2vx4wva6y3n7rxtrh3e2ek9whc9ej',
        "m/44'/118'/2147483647'/0/0": 'osmo1dp5t6hqrkf6vfcmcxp07y75ezmmkvs4uwez4u3',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'juno1vkxewp3p7hfnyzzs3q74gym7q7xt7r7ag679lm',
        "m/44'/118'/1'/0/0": 'juno1xzueyvhrt0efrtvtfphngdnaqn5rvc3n3j0p9f',
        "m/44'/118'/21234567'/0/0": 'juno16z7lkyx9vk2cewwxlmtyehudlx9xhjdu0a9mpm',
        "m/44'/118'/2147483646'/0/0": 'juno130vs3v0kq2vx4wva6y3n7rxtrh3e2ek9s7gwgu',
        "m/44'/118'/2147483647'/0/0": 'juno1dp5t6hqrkf6vfcmcxp07y75ezmmkvs4ussj7dl',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'terra1vkxewp3p7hfnyzzs3q74gym7q7xt7r7acv8768',
        "m/44'/118'/1'/0/0": 'terra1xzueyvhrt0efrtvtfphngdnaqn5rvc3npyk6q4',
        "m/44'/118'/21234567'/0/0": 'terra16z7lkyx9vk2cewwxlmtyehudlx9xhjdultuqy8',
        "m/44'/118'/2147483646'/0/0": 'terra130vs3v0kq2vx4wva6y3n7rxtrh3e2ek9qg34dq',
        "m/44'/118'/2147483647'/0/0": 'terra1dp5t6hqrkf6vfcmcxp07y75ezmmkvs4uqxt9gr',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'secret1vkxewp3p7hfnyzzs3q74gym7q7xt7r7audfh9m',
        "m/44'/118'/1'/0/0": 'secret1xzueyvhrt0efrtvtfphngdnaqn5rvc3n99cnlf',
        "m/44'/118'/21234567'/0/0": 'secret16z7lkyx9vk2cewwxlmtyehudlx9xhjdum2jfmm',
        "m/44'/118'/2147483646'/0/0": 'secret130vs3v0kq2vx4wva6y3n7rxtrh3e2ek9yfluju',
        "m/44'/118'/2147483647'/0/0": 'secret1dp5t6hqrkf6vfcmcxp07y75ezmmkvs4uy89vhl',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'celestia1vkxewp3p7hfnyzzs3q74gym7q7xt7r7a0zvwz2',
        "m/44'/118'/1'/0/0": 'celestia1xzueyvhrt0efrtvtfphngdnaqn5rvc3nk2a2cc',
        "m/44'/118'/21234567'/0/0": 'celestia16z7lkyx9vk2cewwxlmtyehudlx9xhjdug9hsu2',
        "m/44'/118'/2147483646'/0/0": 'celestia130vs3v0kq2vx4wva6y3n7rxtrh3e2ek9hx694d',
        "m/44'/118'/2147483647'/0/0": 'celestia1dp5t6hqrkf6vfcmcxp07y75ezmmkvs4uhgq4sw',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0xeebb6cb4b8df26e8aa9cb5c1a5e8693812cdd98056f96150c91d4fd7165179af',
        "m/44'/784'/1'/0'/0'": '0x1d79f0a88ef229fe3b2e5e11fe26648b7bba15bc6ddf99f8904f87f8085ea176',
        "m/44'/784'/21234567'/0'/0'":
          '0x0eca6b71e1cfe03b5e35ab7d31c6b0e69fce0a13b5407c1d1d68aad686d2a67e',
        "m/44'/784'/2147483646'/0'/0'":
          '0x35a94cd455d231b1144c50cf778f01e9866caec6d181afdebcd9fec2a6b4a66e',
        "m/44'/784'/2147483647'/0'/0'":
          '0xe75322c00c627addc2b8c5ed4b62d4ea98727a1dfefda5ce57d363ddb81bbee2',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rLScVBmRTghjWoL99VJwKt5pnRfn7baKfb',
        "m/44'/144'/1'/0/0": 'rMAZFUcJQcZFTrWhjS7mEbcfudrDEYYWek',
        "m/44'/144'/21234567'/0/0": 'rEvKgTYJfLuaSzjvQhmFawacWzsKYghRDq',
        "m/44'/144'/2147483646'/0/0": 'rfKeVS3WPMgfQScrYZigKeWvavrzeuAd7y',
        "m/44'/144'/2147483647'/0/0": 'rGwiaRLNKWgw2oTzvcoDxrBvLeGim7uHL8',
      },
    },
    {
      method: 'benfenGetAddress',
      name: 'benfenGetAddress',
      params: {
        path: "m/44'/728'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/728'/0'/0'/0'":
          'BFC984b0eeb7d229bef420edf562e25d192affd3a32060afe0ba693b10a598115afcb38',
        "m/44'/728'/1'/0'/0'":
          'BFCa9c5249c0b581568461665ea837abafba4ae0173fcb1179ce3aa4fa6185177546d77',
        "m/44'/728'/21234567'/0'/0'":
          'BFC657a1997596e4515761a115a376d37cba301f860cb5a731e166997754c42ef88b7bf',
        "m/44'/728'/2147483646'/0'/0'":
          'BFC5c712e8c8bcd9dfa719e65342ab9fb7c8b717956e670f4779f4fa49fb897f13daa37',
        "m/44'/728'/2147483647'/0'/0'":
          'BFCfbd17ff8dba77fccad1f724983144160685008f0bf60bfd80ab448f29074d8c97a4c',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '1FqPBhFxoKBQivdSCG5sAHoBsJVvxs3cPSusvnQjqoUJ9',
        "m/44'/1234'/1'/0/0": '15Cn1advWcJNsZoCGvSQg9ZTiEuGLUFrdvLMv3iLHhsVK',
        "m/44'/1234'/21234567'/0/0": '12JiPhgeSspsVxDpPySV6Z9BedDNqv4an685XGXVEXn9v',
        "m/44'/1234'/2147483646'/0/0": '1DZVC8R6KKGa9vHmmnFqdT7M4KcNiWjVfPEp5oYdd7esm',
        "m/44'/1234'/2147483647'/0/0": '1DDtrygDKzKLuPi3jetpDJZddgXpXKsnu396V7wf33RMr',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'SJYZIZGBOLB6ZXJLFMS4BTIYZTYQEAHG75TQQIKX42XWHXCNWQURRFQ4O4',
        "m/44'/283'/1'/0'/0'": 'H4VRWXGNOGB4FSU57ADSL7JSU34O6GHIFKX6GWTIZSM6NVVFEMNUUYZKTM',
        "m/44'/283'/21234567'/0'/0'": 'I3GQRVU6YGQ77HYZMESFO5WLF4RDWTVPTCG67IIQIU6BFMBAQ654S56HDQ',
        "m/44'/283'/2147483646'/0'/0'":
          'YNYZOGGZLEPBDVY6H23Z3WYAZV3B7HWWEPHLBBVPUQXB4SSKKAXTQIRLKA',
        "m/44'/283'/2147483647'/0'/0'":
          '54ROSQKLFOBFSUHHUESXND7K3V66VQWH5WLWCWAYIGOTML5UJA35ZZG7SU',
      },
    },
    {
      method: 'tonGetAddress',
      name: 'tonGetAddress',
      params: {
        path: "m/44'/607'/$$INDEX$$'",
        walletVersion: 3,
        isBounceable: false,
        isTestnetOnly: false,
        workchain: 0,
        walletId: 698983191,
      },
      expectedAddress: {
        "m/44'/607'/0'": 'UQD4viGZDPMLAVcsbqFjNt17VnE__XjvjTHTUwhzW1Xs40Pe',
        "m/44'/607'/1'": 'UQAWwO9Z2WeYgLyiqKq9olLR1HnhqopWk-F6b5aWMrshREm5',
        "m/44'/607'/21234567'": 'UQD4Oyv3DCZ_6OrgaVccL0O2lzZw_orZiT5UiWVW_5psZJ4M',
        "m/44'/607'/2147483646'": 'UQAuiIZ2Qa3lw68UKxJehRYhjZifpg5FrGAe6VPqC0v017ri',
        "m/44'/607'/2147483647'": 'UQDvdifxncoweqDLnGWelByWAyGkHtkmRESzFjUot7p0defj',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
        network: 'ckb',
      },
      expectedAddress: {
        "m/44'/309'/0'/0/0": 'ckb1qyq0kkuzx2ant796l9uhypzclkena7gv0tnqkvm8p7',
        "m/44'/309'/1'/0/0": 'ckb1qyqx2wupc6an35rkajfl6euu2zyn3j80shmqvvr6c8',
        "m/44'/309'/21234567'/0/0": 'ckb1qyq046qgahnm70mh6qyc7ruz8zrg5jaqh0nq8aeurt',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyq8gl9wfnxk08ztwzsnwj07qk8clc6d7zcs4ckst6',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyqthu9mlqt3dtfvvkyrstjvlm0pzcu3z3jsrz2sp3',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5j4sz6x995kqmasu3q553f35d9sg4xn04v6ph6d3v',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5lr0x3p6uaqz8azt8u926q4zzxyyppl9vtxh4tq5s',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5y6ws5fu58ydqkv4kfargg23es5wuz4putcwvwzdq',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5azx276sjm2pqpjf8vralq0r07ef5mzvx22yfjze0',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g562c4uqcpmkjp8pyquzl2vldfleutuqek7z8rdeyz',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rLScVBmRTghjWoL99VJwKt5pnRfn7baKfb',
        "m/44'/144'/1'/0/0": 'rMAZFUcJQcZFTrWhjS7mEbcfudrDEYYWek',
        "m/44'/144'/21234567'/0/0": 'rEvKgTYJfLuaSzjvQhmFawacWzsKYghRDq',
        "m/44'/144'/2147483646'/0/0": 'rfKeVS3WPMgfQScrYZigKeWvavrzeuAd7y',
        "m/44'/144'/2147483647'/0/0": 'rGwiaRLNKWgw2oTzvcoDxrBvLeGim7uHL8',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S013bfb161a7d49bc3a473d13b7a04474b4d088b1',
        "m/44'/541'/1'/0/0": '1S0196e3033b96debdd33c515e0b9f5c300131e561',
        "m/44'/541'/21234567'/0/0": '1S019737fdadd1491397db451f8b3e352aefb94a21',
        "m/44'/541'/2147483646'/0/0": '1S01017cbdaecc7f5641f5dfe824390c81170011d1',
        "m/44'/541'/2147483647'/0/0": '1S01735e6c0386d2962d5c7a165ffd9050f1600421',
      },
    },
  ],
};
