import type { SLIP39TestCaseData } from '../../types';

export const count33TwoPassphrase2: SLIP39TestCaseData = {
  id: 'count33_two_passphrase_2',
  name: 'count33_two_passphrase_2',
  description: '2-of-3 (33 words each) + passphrase_2',
  passphrase: "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
  shares: [
    'yoga racism academic acid average silent year kind package pitch bracelet desert aide guilt render belong density forbid spark benefit trend junior fake dough silver spray adequate western liberty hearing strike prepare various',
    'yoga racism academic agency antenna aircraft nervous biology buyer invasion satoshi angry darkness skin guilt market fatal violence item platform painting width involve marathon parking duration pancake wildlife should execute silver metric oven',
  ],
  data: [
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
      },
      expectedPublicKey: {
        "m/44'/0'/0'/0/0": '02ba1f9d3d03767c55f567cc3aa8160b14148683fce336c357acfb8620240e68ef',
        "m/44'/0'/1'/0/0": '03116435a07e618a81d50f0b216e5c582f9270a8a3e7d84c59d9f2a4fbb6b34dbb',
        "m/44'/0'/21234567'/0/0":
          '032557e2c2fa698000b79f46c740a77a7561c92361ab511a10d015f33d885489f8',
        "m/44'/0'/2147483646'/0/0":
          '022f21581505063781dddbc26546b327d440f02dbc5dcf9f5a4c6fb60f4742d639',
        "m/44'/0'/2147483647'/0/0":
          '03d7fde364d0b4f9f792c3a8e8b519f297d9136b0ea6ac7fdfe9b6cf59bdd7a02f',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedPublicKey: {
        "m/49'/0'/0'/0/0": '0211441cf49550e286194290a8f6129f09ce19cba3a130142304a6606b8b46de19',
        "m/49'/0'/1'/0/0": '02d05177fb3900eb194912f4c139d8a983830979c09971dbb18eb12cd881f24ad0',
        "m/49'/0'/21234567'/0/0":
          '02b52667e027572013d2d0c196e66da742428792505b920863fb083dea8f865150',
        "m/49'/0'/2147483646'/0/0":
          '032e374f580b249c090ecbc3af8b0a76519bef94f553836f1c181df3d74932ea6d',
        "m/49'/0'/2147483647'/0/0":
          '02c36f19c4b1f9c40bd3c13a63402b3bd4e6024ba7debe018131a6ce04d9412d2e',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDWITNESS',
      },
      expectedPublicKey: {
        "m/84'/0'/0'/0/0": '02d8421685abf49a5aae2c84775470a41390465b14f68e8241cd88303593b808f4',
        "m/84'/0'/1'/0/0": '029c0d07df38e98a076bd36cd767ee93d40ee92f392afb935be4e23876fa37cb9d',
        "m/84'/0'/21234567'/0/0":
          '02695bedeb8d4fe54b8a8f973c45cc3e04383a193361a75e06351fc983bd0a82d7',
        "m/84'/0'/2147483646'/0/0":
          '03f9db74fe432ae08a18085a0539cb4bf7656470108a83f2382693c3290a7e2c03',
        "m/84'/0'/2147483647'/0/0":
          '02225038499f83c83370be5633f8c28b9cdda98a124f73b606d66bf3e98d7e3b8f',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDTAPROOT',
      },
      expectedPublicKey: {
        "m/86'/0'/0'/0/0": '0209d0b7845991aa326fd3d703dc5ff0da05b92d20b57d6da58e39ea9426974488',
        "m/86'/0'/1'/0/0": '03f03086c5e6b4abadfd848a5144ce865f178afc5469defc5d19adc84f8952225b',
        "m/86'/0'/21234567'/0/0":
          '03892b15bba5ca05a35cc32841115123c2de387a7825b3335762083be568459706',
        "m/86'/0'/2147483646'/0/0":
          '02ef54a576ef54316c2919824e20ad0482da7fe660f42fff73f6f88dc8d01369fb',
        "m/86'/0'/2147483647'/0/0":
          '03c31f1c0d7f2b713bd89b88c7b29ac2e004fe3ec8b67ca30318c06d325c1c1684',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x03b520ddf9f36bfb0149c1a6cf9316d55b060d0eeb368d2a74411b93f578141380',
        "m/44'/60'/1'/0/0": '0x03840f87734bd382f6d09a8a1001428871247e38dd9b8d8c3f38d39ecfc0df2f71',
        "m/44'/60'/21234567'/0/0":
          '0x02faca8f2b09f10a16b7ff9df92dab11fab43ab0c2a33f79bd9052c85bec6f070c',
        "m/44'/60'/2147483646'/0/0":
          '0x03d4912aee7553c9014438b07f465f331b4e3f42054426052a17263f11aac720a2',
        "m/44'/60'/2147483647'/0/0":
          '0x03d274729cfb54f88002d4ec3b6d907389188fea2fb9149bcac69f2c2b0ced0386',
      },
    },
    {
      method: 'cosmosGetPublicKey',
      name: 'cosmosGetPublicKey-cosmos',
      params: {
        hrp: 'cosmos',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/118'/0'/0/0": '025a2f6fe5d8c487b824bc7fbd47dd86da4957e9a4dbba362de176263f739432d8',
        "m/44'/118'/1'/0/0": '03226b673fec7b63b51c8c1058da911efd9ec4ef6169216438522d50498431e4a5',
        "m/44'/118'/21234567'/0/0":
          '02fa5afe1e7943af3992f99f91b99778b4e79686acc4857bf766153ed828c21383',
        "m/44'/118'/2147483646'/0/0":
          '0348ec7d338d4b02c87caff156010401bdbb4cb567421f3bfab53f0021070fad94',
        "m/44'/118'/2147483647'/0/0":
          '02602d10892d439d97abb70b043bcdc7aa0e96038bb627cc080788a5647f2c62ad',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '0065ffff6ebdbed8cb16bc802e56fc73e04649660b151de146ec34e5f4bcfefeb8',
        "m/44'/784'/1'/0'/0'": '00196e64b6087e3598220991d68329c31de0a1ab6b811bf122d709f8ee39d9f3da',
        "m/44'/784'/21234567'/0'/0'":
          '00526e4ce5db5281d03e71e23d28403a841b2eb5fe295d5cd48d2c55ab1fc613bc',
        "m/44'/784'/2147483646'/0'/0'":
          '00a9813eda0f2a85f65a838de030302eae256553d67440423e5244e78b32583906',
        "m/44'/784'/2147483647'/0'/0'":
          '00d40e62024d762e0a22821cf48f7f3170483ca41384fb11eca7274468437ad780',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '6efd0336ec39f654dbd9326ba0237bc0865cf7f8cab2a25465cb5aa7bc25c546',
        "m/44'/637'/1'/0'/0'": '008f18c5b60d3d41782c5cc7a287818eac19009c825f6ab3995b1beb965e9873',
        "m/44'/637'/21234567'/0'/0'":
          '5836fbb3d95c59dc05cdf8e2e9f8792aeeed5be92d192ec0e4fd373415962b44',
        "m/44'/637'/2147483646'/0'/0'":
          'af79969fa7aecd1f5bbca1cebdb38e1cabc39b619a48eb4d858c6affac9d5620',
        "m/44'/637'/2147483647'/0'/0'":
          '5e8d61969bab70ca5157e75c46c09596a174d064f33d7c5f317dbf0308e1483b',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": 'cccf9df61d687f819b4d32244b34bd52b4a7a23d04e0c6284e350599b4801efe',
        "m/44'/1237'/1'/0/0": 'b8ac24abff798f8d30ccddfdceeba4264f8e3ce114677e612d5f20873a4981d2',
        "m/44'/1237'/21234567'/0/0":
          'b177b914b436b0541b2b1d736f70f1c1eca8f37f92167cd0ea940bd97addd755',
        "m/44'/1237'/2147483646'/0/0":
          'f37fe74c12f892f3fa65481cc664bc9203fcd2122e118a4ecfb30b2faf789344',
        "m/44'/1237'/2147483647'/0/0":
          'ffe502520f95aaa71ca68a09ac3349fe25ab0d7fdae862b93a87b81b42d6c913',
      },
    },
  ],
};
