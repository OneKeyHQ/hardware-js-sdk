import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase12-密语2',
  passphrase: '12345y67890ABc4',
  passphraseState: 'mkeNhHFDxRQue8scCqLUgwwomia6FgnR3C',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/427983033',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        0: {
          xpub: '4ddb1ed9309fbeb2380b3db9fb12f401edaae8211d535d8c2d233b44599818e000abaa4a6f0a1da6e835fa9c379fbc52be5dea38048f5146744becd3bc2b02a3',
        },
        1: {
          xpub: 'b95bbd52efc45bae2797a93f9ac997d5bde2da5318cf3df071d69d29fa73488e299b9bc182f731aa136b67d02469534b2435444177afcdef1404090ab969145c',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        0: { publicKey: '8ab14db1087752f6c8273a5b679795082aa2e30c479e4199eae2c44a8eae6967' },
        1: { publicKey: '64dfcd52e5e8a6c71bad799da4e66c4360434212697158242bc9342026ae06cc' },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        0: {
          node: {
            public_key: '02ac677297d20914dd2ea65eb536c29cd65d1195e8c441f377ec52d8a92fb6fee1',
          },
          xpub: 'xpub6GskoDGrEMqci7PkzjZJtmsREs1VL6ofZus9yzEADq5rR2FSPMgQwyK8Xva878fREEyiLLiLZZEt1MmnBEkDGkxrm7xvgVGwdcc3VmAnsxt',
        },
        1: {
          node: {
            public_key: '03267504a1f9f9e85d6fd09e048a4f881a31182a0360da083e7f6bcaab94027384',
          },
          xpub: 'xpub6GskoDGrEMqckTrkdacLYZ3ZASEh9vqdYpQ6diTVj5jxixcdToZGAkc6Ds6wmCQZHA92t2stHVCnomDSyiS8zdpcaEMH3bTyvp4TquxKWpy',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'`,
        coin: 'btc',
      },
      result: {
        0: {
          node: {
            public_key: '02f0a05422ab322b783414feed3cf5d994d0054f2869183fbb360f1df32f9a6d54',
          },
          xpub: 'xpub6BiGKCEX5oJBrUPPDXZJcPqUAuEGZ7DS5BMjPNDSVDpBmTJPjugG5k4sYHmx9F8EjBq1Q3yUydxje537dyvdDXsWnghk87Xprh8cfGGDj1n',
        },
        1: {
          node: {
            public_key: '0367f2a99fc910a17c50d5ddee11d814df1ff13679dcf24ba96aba6ed7a2b62e08',
          },
          xpub: 'xpub6BiGKCEX5oJBsx2pNRu7RGbPsRESZzNMVGfzy5xyndNR965B6ciAYt6eVUqzu66PH69LZJN3kGGZkMi7PdRaG5aYqwxQHKxcP9F3HiRxUD8',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-48',
      params: {
        path: "m/48'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03d7020f064ff4b77575a176025127aa3677a6f68bfa1f06646dd2ef1433a7c230',
          },
          xpub: 'xpub6D2cNDSZbRNVv7ABT7pjg8kKGQMo1RA3X1KAu6qiaNkLDQkAwpUZrfu7xvWvBL16ZC428z5c5CGLzP22qhGCYYe5U7Vb5sUzCZ4DjGPWjyB',
        },
        '1': {
          node: {
            public_key: '0298fa814cf9296c991f63e53bffe3a38bc229f2ed419189ec93562e3aa46f8743',
          },
          xpub: 'xpub6D2cNDSZbRNVyxRpy9ASRuR2kApgJUVSDoHQxUCdiXRDWyi4xzuJRpghBUQCDCngCEnFySSYQyryCnt2tq7tm21Bhqfvsb1UGoESEpLNWJM',
        },
        '10086': {
          node: {
            public_key: '03f84c055759ba49682d1d5942763d4d64306bb74cc5450f82c4be71fe94cb9919',
          },
          xpub: 'xpub6D2cNDSZbRW98gxZGX77kQJ2DC2TAwxLKKiNPwWoHfVEagGBMm1mEVWykf7GfkTiGuZQ8kdZZLa1nuANfbkTdhFbWHT15msTFfr8MUdNszt',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-49',
      params: {
        path: "m/49'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '033a648d380fc338aefdeccb8aafbdad2f6ddd388f1b5377683e3c8c8a0d006dbb',
          },
          xpub: 'ypub6Y6w72Z4L3iR4bBCKVgviU8jQhCcFroJqGAV18QJYi9Wvegj4zYG6UMSmsePP1TiSDUx9eqo1VGVQ5bSjgY5QjLtuHdnk939e6e6AgLqQVQ',
        },
        '1': {
          node: {
            public_key: '03443f4b9fbd1e256bf9f87456baa068644391b7dbec66f417958257894df827bd',
          },
          xpub: 'ypub6Y6w72Z4L3iR6AKxpXZp8kXpbGxtspb8pxuixCFsch7QiPrLjPaMsLYxdoK3FJVt4g8XkW5M99XBeWwJAjk77ZJJBYh2ETByagVTNizRmYr',
        },
        '10086': {
          node: {
            public_key: '028df549086921f2949d167c253fabd486af896287174b3f3aacb221438f7578f0',
          },
          xpub: 'ypub6Y6w72Z4L3r4GNT5H8vnAeYnE1iqwL9w3bsLBEwJLNVao8GEvdau9TScsarFVzQpVEJYQZoP4y23SXZVJ5VJaCsRy6T3fSNXBW6hiVQn2bk',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-84',
      params: {
        path: "m/84'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '02adb8b625365c15f57e1b6125dc6df78533b403355a4c4c96831cbe0dcc6b3fb5',
          },
          xpub: 'zpub6qhToAZuVuDPt1njbbnKZGRyy8zX4sP8pDQgR58ZLM7AgvwFn97wR5vUYPCGB4QVsVnqkwYRv2DgL9hX4aQpTLLEw8viRFPRreAm7iZeuns',
        },
        '1': {
          node: {
            public_key: '023240a2c5203f98ee4b2838c1528d60edf1efbd71e07392f35a211fe5f7365ab5',
          },
          xpub: 'zpub6qhToAZuVuDPvotUknUUHVevDLNLjhJH1QoavVqc6hWTdpCXqdjyAd9DFaBfhoy1uvVqyAk769Hx8e6k5ZspMyUEWNcGd83rQJm29MJkLEq',
        },
        '10086': {
          node: {
            public_key: '029c064bc2ed9981658b2c0cf45dc1a0d67c1d2030a705b70b81dffcf59bebac18',
          },
          xpub: 'zpub6qhToAZuVuM38ydjAL4ezQ1RPcyCASWs5qUo58GLAMu3sipXUYxP26sZgPmWyygKkiLTknuQKKCvrRyYhrwJx6rJ7PWMsPzhRSwR1r9EBqP',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-86',
      params: {
        path: "m/86'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '02f57df22e9ea6bd8f608d1d680683ede262fef067cedf1020c6a6ca731d168dc0',
          },
          xpub: 'xpub6C3QbrS49Z1UshrdJkGviqzJiJ9KpaGApkFwGWKsoSbztf1XQDRELboKigC4sbVzLGdwEZKEUB5De5Xf2BnnbW4N1nEVm8zyExANPk6TnGg',
        },
        '1': {
          node: {
            public_key: '039bb9b06c4cc8a4af265a3e249fcaba1c24f85373436b93b1cb1ed23102fa1d36',
          },
          xpub: 'xpub6C3QbrS49Z1Utjq2PgbonMsa8KyqWbi4a4txZez66DHXHQAkLXadpLtfGLEpSYbtxaZF2xvvfHJcZNro3LTMXyGoER2UUbZcGks7RxpTXwF',
        },
        '10086': {
          node: {
            public_key: '02829479cf050b03420f56d6e2be43e88edd56ed5981a3eb28e649458fe4402996',
          },
          xpub: 'xpub6C3QbrS49Z985aHyHV69ooVpam3YYaZhFk8h8HH8D42KQoHsLnZ1pFSaN5i6Nq62s3Wt1xihH3eUKwRiGfF5voPXjXbdmNKNXbDXLab3i1q',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-44-ltc',
      params: {
        path: "m/44'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '038b7ea827595b28e11a1cc18b206995d9752c632890075fd1c39bb5dc81d20d21',
          },
          xpub: 'Ltub2Z6C82316MT4dMao43oqppYvSJV8hSAMJ97cFoBtNygDkxmYRmMqApbYPwtDEush1j9akZZ7pyvZswHwQAWio9dFKzkAnDDn1tupLAbUN3j',
        },
        '1': {
          node: {
            public_key: '026dfcb2eddf651ad139e3028648ae5faffd3886d1ebc79f8c53135f6dda6d47bf',
          },
          xpub: 'Ltub2Z6C82316MT4hdBZV2J1zmxAn28boyCcDNSjw6HHoqwagALkdw2ipoFLrKoV15r8Uqp3X7J82niKHZzthJXimEDqGgfcyxUZsbrtLd2AULZ',
        },
        '10086': {
          node: {
            public_key: '03ee97edc2d49b2cdc63891c716e587abd47de9b4ad065c2f35e4901d8655a2c3a',
          },
          xpub: 'Ltub2Z6C82316MahsTECrbzJDghpJWXFUSgk71eRmqM3hijwZb2yZubiLKvFT2VhV3VTGTWMXsPrukwPHoLe7wkj6H54NcnMcTJaBgN6HTWJaUF',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-49-ltc',
      params: {
        path: "m/49'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '022f91779d56893f0a36d39088bf7b6c7c5abc37a6d7afc5f57d1c901ef9adbdb4',
          },
          xpub: 'Mtub2ssbRYhXWgnYUuaMBASSccZaBWp4TympFjSG66Gn3ZiYU7GQV4vDQWJTMS1ujHbPQex1TGumoJ6dp5yAPgP2PbhHCSM9DWpeUSnFzsc5gCd',
        },
        '1': {
          node: {
            public_key: '03cdfe4c6e7763442a135a4c795bf475a4f361ecb3dbfb0e0d9207ea727fffc99b',
          },
          xpub: 'Mtub2ssbRYhXWgnYVWhoLA3Bn6ZKHiBny5TxAvuCUdSAKnFsu3RjFVuU265BxrhudC9ukC93RurnSXqJ5iXqqchGcgtKJi5mAq92Vj8GZcEcYnP',
        },
        '10086': {
          node: {
            public_key: '03cd1c4d51b7639f9e5fcd87e065a18c11d3d8210f167ec62e434bbed503c9dee7',
          },
          xpub: 'Mtub2ssbRYhXWgvBfaqGhjzCrFdWFNXMxc6EmDpcZ1oZV5rjz9fdTkFgZeWXqCi32rsFzWwPuWrDhTBh9qNEGNYSXrrEFgGk6UynPn2twFuARgA',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-84-ltc',
      params: {
        path: "m/84'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '02e78be84dd2f3c9f4b09f9a1c863903a8adc51c8fb3f2785de350d02870b1c035',
          },
          xpub: 'zpub6sB7bebUWfSskzyQrUZCvWkjevHebbieUGcoE8CR8fmYBvVV7ycZpGM1DNUuibCtPyEWVHteSNbG5oKRzuhXC9dvGPyqbKnUawDpLWD5XLu',
        },
        '1': {
          node: {
            public_key: '0338a78ccbe366a33a3f6b9b806e11aedd6f7859307fbe91ac9b3255010dcc2da1',
          },
          xpub: 'zpub6sB7bebUWfSsncC5pfTT2p1RtosLLh2oTyGekHCk7eFUaKCyRaFVMDsfHjAodS2axLUWKXQTBLUejHs1gHkHmDWiJSxKai3praf8kJsGLQh',
        },
        '10086': {
          node: {
            public_key: '03372652051cb485734c7011f03b512b42b01709d79f204ea3d3f4ea945a44ea7c',
          },
          xpub: 'zpub6sB7bebUWfaWzjns9RpBY4Kpxv1NkQBFmbuduPQEq9sQF6ofS62ShU1nu8NBM1J9zp2iFwnjHbGQ53APqmjU4BY7EwjcnBP8b7cM1CvMYuw',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-44-doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'",
        coin: 'doge',
      },
      result: {
        '0': {
          node: {
            public_key: '02a711952825e52c46f7b35ff11c6a3cd71702d4c1d53ab5204d117aa67362f10b',
          },
          xpub: 'dgub8sQKoHLH8PxwTbFEEnErdxUTNvZBmwNGwB7MwmtuSetG5CnN7kpFps8rGYYCmLEDQWKbAJQow3mnZurhPgrE3DeHLqFVnj3ZbKniqD34cKu',
        },
        '1': {
          node: {
            public_key: '0226e4eb2b9217a77d5ccb2a7466059b81bc38ad6962709b69c4cb317ce8fe001f',
          },
          xpub: 'dgub8sQKoHLH8PxwTjd3NK2fwbF9GAqtvsfYJ5ePNoKR8hPh3URs433LopfTTS6CrYaRpbZNakwFfcJy9YHFPFqmiG7iqHmJ6cnLipze6RsKBTz',
        },
        '10086': {
          node: {
            public_key: '0330765b29ac0b04e20b8cb5a7e9a2f4d8251352cc83acb2ebd9ee0b8a8c55085d',
          },
          xpub: 'dgub8sQKoHLH8Q6adzX9GzjDCtq5zH6rcLXodkqeoEsjfTxXsmTkG6hqzTkFvTyZY4jYXL94AG4AWFQGNsr5Vy3porCSrV9GxM3Qyn4fTMwRRGG',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-48-doge',
      params: {
        path: "m/48'/3'/$$INDEX$$'",
        coin: 'doge',
      },
      result: {
        '0': {
          node: {
            public_key: '024bea2704259b995b824cef8c99e5fc59040925e04475c243b4c561feb0a2f81b',
          },
          xpub: 'dgub8sVKJsPLHcSsGLF7Nh9UhSRF5YnYqgYwqgrdGd9SSUJCxo5M6HiEdpwE5fiQDPgnqTC1sQGuYf3LiCvoo2P2E3ECvgj6CNcL1KsL9yG1wJm',
        },
        '1': {
          node: {
            public_key: '0370fe0c20a8364f4fb37e921df21300b54c833de61455b88a0ca46317d3e919c1',
          },
          xpub: 'dgub8sVKJsPLHcSsH83MbUHD3UFXmgw9nDTFr55BHtuYpbBRopkbAkukD93yZSydKB3fow7h8DRdwth5JVSTFndzj7zSoccSTQjUsYzFuhrGdZk',
        },
        '10086': {
          node: {
            public_key: '0313c80ff33f2389da884acebabd55b1998b3f35acbaf241b246f9b148050b4428',
          },
          xpub: 'dgub8sVKJsPLHcaWVGSP2bE7C1faAjuF77HFotDdhWkxkPrA4BXkz1Y5LLK1gXo4TFQGoPbhXAfYyRvvc44FoSEQvpRT96cVdUAzynqr3DwspZV',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        0: { publicKey: '02e0e3ecb07fc801cb331e41204a00c55314139162a5ee5edc73b246d057160265' },
        1: { publicKey: '03662537298a0b9112144711d06b39baf006bb726ae542af38bf8062291ca03459' },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-xpub',
      params: {
        path: `m/44'/60'/${INDEX_MARK}'`,
      },
      result: {
        0: {
          xpub: 'xpub6CN6gfsLShvDEWVMPrHoz94TTCnxcUBsGmqfQmhBPU5x2bGswN6PgrpKnxX2Gb9oeXByve7z5xgXaTA3ZvAC6maYZJFKpKPikQob9ueL3kh',
          publicKey: '03acac93d44485b89d5dc6843fe382511e495648ffb47e2e0935832eaf2050dbd4',
        },
        1: {
          xpub: 'xpub6CN6gfsLShvDJd2CSxm8cbjGb5FGYotouZSbnXp3orvqinGLkQ68qYKX4ULKZfHYZ8ir5LTxmqUmJ2ZQkQiXPfYRctdDGHR77EijXNBnrtj',
          publicKey: '028fac70d69ff3ddb12c7d68fb18e84d4f65f000924d3eebf0b90c4092d3d1477c',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        0: {
          xpub: 'xpub6FXNHZQzpWJSphbCCbtgxaEyR67Q8faz2BrdvrnVoz5H575HDrRQoBXgTopG9UPfJWTu6bAEfUpnwwaXE3Hm3pK6CvrjgA9YCqCLAKhxNgQ',
          publicKey: '023f09e843d2217943c4da1f7c318913a3ff670ff2458814340b38743059a648fa',
        },
        1: {
          xpub: 'xpub6FXNHZQzpWJStdyMxwWb85GuSCcZkQEfkr7sDk46bqRRXkyzYLbtyC57bKpnvmESX5aC27EAq91hRuCAZkBy5nvvtRniNAY286g3uM7so3c',
          publicKey: '02e07f4ace45f87d38aec8b3ce6283e65661bc6ad9d5cb295f70a896df71543f88',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        0: {
          npub: 'npub1sxdl3mm9x0js55td3dmfee2s4r460l8sc3elthxa5sk7kqkufzaqesllrf',
          publickey: '819bf8ef6533e50a516d8b769ce550a8eba7fcf0c473f5dcdda42deb02dc48ba',
        },
        1: {
          npub: 'npub1jsu47mgtlxvkfytkphulxuuk8mr83tyngc6383awqfmv9cnnxluqkyv5v0',
          publickey: '94395f6d0bf9996491760df9f373963ec678ac93463513c7ae0276c2e27337f8',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        0: { publicKey: '0xef20fd619be01dbcb42b2ea284ffac0a6e29bdb77108eba2380e774c23d0db5a' },
        1: { publicKey: '0x7d4da0bc6b225df4abad341f0f77c5e799e7e3dbef557caf6572000fc5d8bcf7' },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        0: { publicKey: '032ce4a60d6a6b10fbae110a335043565b8985b5edb93fa418998c1c20a0b25293' },
        1: { publicKey: '03f79e4c37766431fb8a220d9022020a90859fc8f2a58cb90f973edc374193ca85' },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        0: { publicKey: '07786de5a41e9fcf3d52cd3cdbba89c50ad4309a00dc711ed13355e5ccd42929' },
        1: { publicKey: 'c33602e89644c090f814f19e07e5da24fdb6093a1ab09fe68b03d60b909b7c69' },
      },
    },
  ],
} as PubkeyTestCaseData;
