import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase18-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736640',
  passphrase: '',
  passphraseState: 'n2BKLUzeWAiE1WTVWoLgshKW3sqdiaECWE',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: 'cbc72dcd81f7e4fa6e467d99b61621ec00036581f33656b2fac0f9062766f6239177af3e13a9c3f1f14384575d25215ab28e1859b6e88f1b98c567ef949eeb85',
        },
        '1': {
          xpub: 'b12ccf631c4b924047ff021c50c5f259e3438665e112c660be72ec15871ab5b9c79b5f9bd46a118f0e6fe6d7c027cc66ccc9bc72e94b235c57e5d4760b80abe4',
        },
        '2147483647': {
          xpub: '08867a5a074f44eab0d29554312b0a554a06b267385ff7c37f8e80c1ba86e978c893d31f42ef950ba49cf28cd5991d9229d2e54f45bcba3ddf8abb8ada8348ad',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'cd6bbb7a853f591913d0fd63baf8f1422c50c2bf45dd734ad15cad76f3e56342',
        },
        '1': {
          publicKey: '679ad5c2333a90b50c60010f469262cd7b80f50544837f730266e40ce2e1cdd3',
        },
        '2147483647': {
          publicKey: '022eaf6358ea373b098f747186f67fee0e4e0c1a4002f76c35fca3662abaa9e1',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '02a0d1649758c8fa8db0141482d884d90ba60913306e4ac495b825646396ea20da',
          },
          xpub: 'xpub6GNSThbAQa3UqVgpdUA9F61vgvdKxQHVYpd2Yi2GEkLjLuzXud9h7uUssHThL9rF342TG81Qso6S7qzDj1RmKBYBHYFZdWbWALAsBbVfXpn',
        },
        '1': {
          node: {
            public_key: '03886812b74f2a9e8ca620049bb744a0c1edfc0c6b08dad869f18e201d748ed17f',
          },
          xpub: 'xpub6GNSThbAQa3Utcbxdp87p4J6gCXQSe4MqwwtcEPsjJPvhcQYTCnFjMBwzX6fRwud3xCfyKjJzz8owQ4AG27KSixpg7fCSxWYGxPwX5GABcQ',
        },
        '2147483647': {
          node: {
            public_key: '03c88e2e0222e761531dc5c7b2c2cb9d87dac7e86044df260277baeca6d017ecef',
          },
          xpub: 'xpub6GNSThbJkEaSyVQj9vpDYCWVgsRMWUuhd5rffzJNnyPBDo3BRFzdQMZXWJyxnXdFmLedFUz5RhQwaPJke363roJp36mfrmXHfThUCqn38Uc',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub',
      params: {
        path: "m/44'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03b2ea9a67e0a7bc0efa7dc6ae707c45624de5ec25d1e431e5e733b70906dc7a2e',
          },
          xpub: 'xpub6BkMfgrFfiYEs8tXoBGemPCzDS5qMrHEyC5LDQGJTBLmCSpgVZEjiDUhLYjaF7mSKMH6HRSwN2rMfi7Cm23qUZ41zoTxQK5a5STMkja3Xod',
        },
        '1': {
          node: {
            public_key: '03ab6a75931f1bde547810a87b8a778dcd5c96defa239347c32fecbf802ff6787e',
          },
          xpub: 'xpub6BkMfgrFfiYEvkbXSc8BerTw9yn3Eq9TuPnRtye7UKqrFtquTqGW8TDniUa9z5PYEQckDspwXETVFhSk7YdHJn4Nd3JE4LmR7U9nmBtVW9D',
        },
        '2147483647': {
          node: {
            public_key: '027d77caadea0bda525cf5b283a6f36f3c8843aaf80203d9f5066520cb9a0e4451',
          },
          xpub: 'xpub6BkMfgrQ1P5D1UpMKLTfnnuTSACSw5ewZiixs98aJiX2KZYhpMg9bPZaq5zwu3vAUkXTCUsYzHCBV2xVDQKh3GMYPn7GYfGf2SKerpHiCXw',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-test-xpub',
      params: {
        path: "m/44'/1'/$$INDEX$$'",
        coin: 'test',
      },
      result: {
        '0': {
          node: {
            public_key: '02488324b146c091ab8a8da3c1d6f2f0225973c6917105179f5819b7e16a3287a8',
          },
          xpub: 'tpubDCSraveZiGLPwYVD7soWwuiHcPP7H5bGS3p3LB3k64dkvDm8rHHJvLaXxTiCEmawRf7xXAzHCobGgRGD8CQB3GX2ZCSHEWMjN4D1SWwAcs3',
        },
        '1': {
          node: {
            public_key: '02e2f665879d087e338d45e352e1141c2692c2d5dd9e817fda4dd607d132480393',
          },
          xpub: 'tpubDCSraveZiGLQ1qKBdt8w7TA4fiAP5k6henREfAq34mfVLXgcBCZzjGyzJqR7bgtmPEm7ZJJMnHsGbLNxBbNPp1h7NEhUAueaxWdpfz6un8V',
        },
        '2147483647': {
          node: {
            public_key: '025ebc34ee1e125f32f38f254072798366a8e011ef8df86feb6a0312746d24c150',
          },
          xpub: 'tpubDCSravei3vsN5TRFX86LvZnG1t99Ec2oatLxAXo9VQhcZEjRjqAcQ6xYZDxYAdc7GNEFy9kJZothSHfpcw7kQXCNdkEMVEAH76HGq7KEgQu',
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
            public_key: '0366d94253c154b64f6994fa399ea0dde2da104fd10d813be9d3c0314f11d91e34',
          },
          xpub: 'xpub6CXHJynT8GZr8AuLYPrraZSun6EBaU5UfXznyuBkJoxrojESxUcXLiQmza43CoUHZHi5zhLyJpGtEvFSSBc2yVCb9timYbDTA4RbaitPDRe',
        },
        '1': {
          node: {
            public_key: '0331de1a4c2d6f25ad359c99e79e675edd02529c97f6331dc5b41200b16db242dc',
          },
          xpub: 'xpub6CXHJynT8GZrAJCo45JLWTVcU5kHbe3o9RNuSnVGhzYgp2pqVGV2mpqpbnmQn6mstNnJmZCKm3EiAnjJkpmBdnXehDMLxXSmUH8BFhjp2QU',
        },
        '2147483647': {
          node: {
            public_key: '03ee70627095a5afb92edda9b114c2c8c13c4452315de729396b05a8987a82c19f',
          },
          xpub: 'xpub6CXHJynbTw6pF4ddcpofJo6TJx2HUNK2MjXQoWLVEc9pVPDRTjm6Ka1MeeY7MQ5M1jLX5erfsd79xacRZyBKFf583vHSMio8onJcGGxdjMx',
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
            public_key: '032492418f919d8ca2d2928224663f18d9257b96cbbbeebda9edaa1232945ae8d2',
          },
          xpub: 'ypub6Xj8AybLZMJNwRLZ51Q2q7k9jfPmD1eXnuyikAuTXVAzV4i6hzCiCLDXH32NG2oH1HySzpmvvEXLeJSsWSzLhMxZARx5Dv7d6WmYCgnQt8z',
        },
        '1': {
          node: {
            public_key: '03b544f3df952fad71a5c248fdff1328926eb8f0fe567a2b3aa7bbaa1b5f48f6eb',
          },
          xpub: 'ypub6Xj8AybLZMJNzSYNLMsDD5Y8gdckooRngg2YagmzPqZZBuU3wzrAiAeCMzw2swjL9xzBhmMBXzF73vMoUkM2iUAjeKswPp1BqBnN8r2CFxh',
        },
        '2147483647': {
          node: {
            public_key: '02ad07979d9b5ec548831f10fbc27102ac73671359ff843390bff3b6e3319df977',
          },
          xpub: 'ypub6Xj8AybUu1qM5kaJxPvVodR3niuG2ZBNLo8sgXbUMiuDsgjbCvMMdGVqmk9QuoM6SEvnv5HjaHbw3kYNBsWtZYFEiSREvAUy8mMTVFieQp8',
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
            public_key: '036a65134e0c54f73ac13a638cc88143b33af2a5451acccd42b9013ba285f9378d',
          },
          xpub: 'zpub6rLd5dmGYPbsaNFvVX1Zg9MHPwSyG7zfN7RNor5cqw1SfZNH4ZUWXMmqSGv7Pv7VVfXXzQTRbvPHUT8Wh6DV8aW9MkYuLeQFuPDsWgwkutC',
        },
        '1': {
          node: {
            public_key: '03dd580182f6dc09590e0d32fd6ea0e8b83ca8b6fe8796a7ce31ffc78796e1e798',
          },
          xpub: 'zpub6rLd5dmGYPbsdeH7qJsvLNX3p77koTnDeadAvxJxBkeSwF2Css733FQ2xYdAfm3zoUQG1pdE6cYVDBV5df2ppnZ6QjVvj8cMWCLzufVsGTo',
        },
        '2147483647': {
          node: {
            public_key: '03f746f06a9c6c9f2c500740f0b3aa7f6d202f57e5f8ba8fb13133039089aa85c2',
          },
          xpub: 'zpub6rLd5dmQt48qj1nA6q34LzqnYoGfX3YKpvBGyKTCyV7HbdrL5Udd2fpzsuekRWS4C16UzBwx3hc8F9SgEQ6DXYcFUJcJnicq92MB5PRcqtw',
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
            public_key: '0288014f1af9b03f2fa7f6cfc2b1987ff381535c108480af03db4116fa52f396e3',
          },
          xpub: 'xpub6DHyyeud8qgJn6F38eyTthysn9AfzujHWLR2jaHS8ac2cp4S2VYF995uZW7RhfBGdaRZr9oxqSo4G6MX8szcgtgkV9DuHos83Hvyebe4Edh',
        },
        '1': {
          node: {
            public_key: '03c86d69213ba618759f26557e520c980afc1f96df42fc9d267995b4bf59e89db1',
          },
          xpub: 'xpub6DHyyeud8qgJqeHJA1zcZP9FnmpjB9cZFJ5gCmkdoCKzvkE1oNtjFFaQYjKrL5TRsYmViuP7RLCGLtkZpcL4Rdo8PMy2fLyR1cDGj91fehZ',
        },
        '2147483647': {
          node: {
            public_key: '02052267e1f77c38272762a9bbf0eca4f6b52b80f2cce542f51742042761d4ab9c',
          },
          xpub: 'xpub6DHyyeumUWDGv7d2vSjHBXayySee2ZvkpEqedsfRLM4cvpf7HxaUUnEgi7vaQMf39mMddTssSG6Jm7NiSs5xR81jiiH3jRSKThEqsAyKt5r',
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
            public_key: '02bd5e9d3d0da6f218f207b296358b70c09dd8657083117f39e00bc9c4101f0420',
          },
          xpub: 'Ltub2YcMESBeBJpfkDC9cuPX4ayP3HxS7Wggp2MKXkWp1BXfSHXTaTs9uR381q1wZCub88Jsukw8Q7GV7xK6xAjuHhW53UVhC7LoHHe4FiDgx3c',
        },
        '1': {
          node: {
            public_key: '020058c9776be71a480d9b6aa4535cc4502a57086b77fe337f67caca2eb51071dd',
          },
          xpub: 'Ltub2YcMESBeBJpfp57SxjPMnboWJ3udb24wMruhWaGfytHWD3KooZ1qPuDVh7CEJ6Xb1qV53YgXmu2N1ZyKmnBMGwSJ2p4APA5p3XJmAMp6goc',
        },
        '2147483647': {
          node: {
            public_key: '02df96cf347841f66709c6b67e4d96d3aee96e6d6fbfef2df7b96b7a8473b04031',
          },
          xpub: 'Ltub2YcMESBnWyMdtUJpPnXdHoLVQf5nLhGdd8FXoobVLzy9JsWemZGZ19JZK92FPbUfkj1hKKGTQ96knymY5T3UqFBWHCTRsD5aeQULXXHMZF8',
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
            public_key: '022e84d85f6c07a098e8fe21a1b1801910561e35c523381fe412d4873fa7869656',
          },
          xpub: 'Mtub2tnywVguwjs7nRJ6HVcVBuKg3nz5QKVqtGPevLt2MbNRgTXFownT8b13Sa7LVBpdY2RhT1jiiTp3RTPoD7FWU7bEM6h7NZAqFR8mgwqXxFk',
        },
        '1': {
          node: {
            public_key: '037ba68ac500a1567bbd93424f7f7927fe6ebb83cadb022b861085180ece11f15e',
          },
          xpub: 'Mtub2tnywVguwjs7qxEXEXAo1sUZqcGMdHE94REpQWt3YZKauKHsKWEmJehK9PXmURC1BYNir2xQhp8vLMwYuh1EQkLCJq8UHsLCw4XLLueuMm9',
        },
        '2147483647': {
          node: {
            public_key: '035afaaf63eed82e7b0009aa9d6e780ca68a5dfc6e36837f0395672f89cee3c055',
          },
          xpub: 'Mtub2tnywVh4HQQ5vZuKokX8qxU7dYzVmVGAxS9hKo9y16Zxoo4hvAkMteRwDqUPga18WL67UNpbhbSpY5RvUwUNnV3PShNLygCCgdmBQ5ZNLZi',
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
            public_key: '02c8cd1eba7a046d00d95c54767ee30896852baab16ec9f735ae46af3b6999d1de',
          },
          xpub: 'zpub6rkHChwLDfW3PYuAmUVjx8URRzuDmnjz7ziq2Reo6xBoEiz7FSZTZCgUAjtzh4Q4tMnxqBeU5J2YwDhMs8CAjL9j183R2sUHdmt4pvfYzkr',
        },
        '1': {
          node: {
            public_key: '02b8d35e3e156f1aea4265e6bcede11ced8c64ccc9137f94f5dc835e5e1bf00ce9',
          },
          xpub: 'zpub6rkHChwLDfW3SpTq3jdVMdYuuW8XmApyqcz3eCEEkMFoEeh69MFNVS1sB8eU1gYeLrxpZwRLu5psd2duQ7pBKm9Kfa14Pn2B7LZxv17G61W',
        },
        '2147483647': {
          node: {
            public_key: '02dbdcdb1a03d8fecbb8e7e3045d4ebbf22eaac3bc4bb87bcbb0d2cf5eb941acbc',
          },
          xpub: 'zpub6rkHChwUZL31YcieBfTcMmWdT6Pkayw4vGZo74EedLzXyGhxk9aDWfmHxCzPCh8atAhKXCYY6tRVQuLcb9fQAS3RxasykPAG1JSCtESuVbt',
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
            public_key: '03b99afd49fd90ee33e418a4d7ec3a421fde491e92f52f0b93bc18e3f35333cc61',
          },
          xpub: 'dgub8rFskTvvf3MipXrMPeFj6YXbqiqMDDEq4tBrbNCWagPn3idbR53oAMhfKw7TgAZkjiod9kvctWdRSow2YBuHwmZdcAyQwVmt2tcACtWYnxy',
        },
        '1': {
          node: {
            public_key: '0228f077463c6cf05e26be7e60df7ff461481684a5a4566cc2b9cae38b567360c8',
          },
          xpub: 'dgub8rFskTvvf3MirVD4KFTTrXhzMXZd6kauD33NB2xp94UfrnrT7gr4WBNABMUPhDd5uvL2Pt7CUQwewn8CePGByZDgkJ4Y2HDWBK5ajLsnZos',
        },
        '2147483647': {
          node: {
            public_key: '03d7e770693f4b04c4878c5828239d06ce318cd77cc7b5ee3134adaffd1d217bca',
          },
          xpub: 'dgub8rFskTw4zhtgx1uowp3RocKBfmEmkwmTVeFKBi2uzLn8nfrf4FwHti8GraBQvdPQa3vkWyZchrKnXnQY963EBL9L4rncEbCTvX2Ltu6KMf1',
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
            public_key: '02b0b88fe1adbd7ba9daf7821312f64e723d23cd80dd31c3d53194a53e97f28d7f',
          },
          xpub: 'dgub8rMFZ4Wb5Dsu3AozFbYUHASY8qxzqC98QWHZ8ED4CTNwRFpdywNrdJWhq5gFvJiLcFDRvN61WczSrsbhWNZ3TwyDbHVXUQ2Y718CEUFntT9',
        },
        '1': {
          node: {
            public_key: '033d86eac0699c6e908bb39ddd6736b79868b3f382639425229023761d689edeb0',
          },
          xpub: 'dgub8rMFZ4Wb5Dsu5YQPMktKvfxVbUNXH4ojgzqWxx1Sni7gQ6whmXchiQeuueo16zUko5Nx9hJ1joxnQn6QLELJbNPRyTZ98JnXgYjQtsA5d3e',
        },
        '2147483647': {
          node: {
            public_key: '02c693f79b294d9f80ae3747d09f732731aba59547b6f3ddb49d1d6c143059ed61',
          },
          xpub: 'dgub8rMFZ4WjQtQsBvNjQ6yjSheAu8gmSn9agwLemRukuujRK34k7tgaWuDhfTkQx2aHU7TXUxiZFiJssr9RMNjgxbMVuaQxPteeLghTSYR2rCk',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '03541da939cf61eddda176e70a2bfd30a734a9a9ae6ea9376b6068b6a401d72b70',
        },
        '1': {
          publicKey: '03fc6ba35a1354a36e64e95bcb6100e36c852fd69c2b2185abd3548835cca1d15c',
        },
        '2147483647': {
          publicKey: '022fd78d026366f4f60535fe680a698a92c15385320b124c9e6621604f8f3328d3',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-xpub',
      params: {
        path: "m/44'/60'/$$INDEX$$'",
      },
      result: {
        '0': {
          xpub: 'xpub6DXfWiqKp2q7BAeEQ7ryWxcNeRTxyzNsTaXuf1Y1zbrhy7jAMdSEJmd6Cnj1D866xshGqPcVByUvwNVuf6jXJxWwsoqQPEWNtiBLcCqNmwD',
          publicKey: '028aecd7dcca97a69f45b5a36b544848b951ece356ef1836546e3d719a75a9a39c',
        },
        '1': {
          xpub: 'xpub6DXfWiqKp2q7ECw9p2Yf4qLwP3wsBSm4KcUGHZbFNcAbkrbbb2AHoJqTZJKPzW55DRe8QRqmd77NBsEX6MbpKsbapcLVd7npYUywhb2tMek',
          publicKey: '025bd0b93f42eabb30b34b1758ed1d330ad3b686b75416ceb5c01f04c283303e6f',
        },
        '2147483647': {
          xpub: 'xpub6DXfWiqU9hN5KM2MscgSvwkY8csDQtB1SZLoqeVSkkLAcRysJZQuGyTQ1Ue9DcFjANR4CYXrrakC4KdwQ3JTtwwC9RdAnSbVrojyeHaUYxs',
          publicKey: '0276a2cdb8d411f1480391a37d7ce0d5da5f12cbe14c227b41a88fb009ebd6f794',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GzYcxS4q4CzBT3aaxyfB1ZZkrXrSuGxz3kuiuN6hP1oyRBTYuRFtVKnVhsz4Q4xi9tcFayK9h9KbCsybFTa7hRtdytmA6wssSUNd3PDWuP',
          publicKey: '03458e58d04bcdd99f086ac79c613371076c652c22ca057724455e53b96b1ecafa',
        },
        '1': {
          xpub: 'xpub6GzYcxS4q4CzDYtR43P5j51tAERuctE4776AuJDEYFW6NQyk5xrvNk5XwKv3bTsrXCQEMLqrhDMeTtVZzDoz7wQTuDkHfniB1BsrMM1oYk4',
          publicKey: '03828cfc1230fd9b88a4e23f2873b7904295c72eeec3db4004dca6b5c911d7da2b',
        },
        '2147483647': {
          xpub: 'xpub6GzYcxSDAijxJUTdZ2wDYEM2Vr29WTBWUmegUCAGoUFBH17Ut5zu19mSR1CVjcS153ZEVEedqv4Dw7DJwGe9Rqq4fFoS3Ut76P5wRoGmRHs',
          publicKey: '0348781dc8f9b68267fa5c51202f79cb8740e69954e0bcb651cce8c33d900779c6',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1rtucg57p9hq4r4lqdevx4ltjx8g7j27d0xe6t77x3x42f725d65qpheghr',
          publickey: '1af98453c12dc151d7e06e586afd7231d1e92bcd79b3a5fbc689aaa4f9546ea8',
        },
        '1': {
          npub: 'npub1zvtnf0env5s8tyhkv5hdfc5qvhr6wr4plvh7kmcme4rn6lu2m27qwmrsjf',
          publickey: '131734bf3365207592f6652ed4e28065c7a70ea1fb2feb6f1bcd473d7f8adabc',
        },
        '2147483647': {
          npub: 'npub19exm3gzl37pqahm4p0eqyhga5mppyzq0w0nxqxzdd5edwl4tyrwqjaceaw',
          publickey: '2e4db8a05f8f820edf750bf2025d1da6c212080f73e660184d6d32d77eab20dc',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xe43efd6aa0a3fc839a9b79c1b4570dc3147d342cce6995ba72be27f3a4cc79c1',
        },
        '1': {
          publicKey: '0x1174df6906434135a922e703becb672c4e7ab08a30ab5f98a625c62704c699a1',
        },
        '2147483647': {
          publicKey: '0xc66e97004a932986eabb088e03157db2767337a4d1312408ec24dc4c5632ba75',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0372b6b33435cfd315cf00dff83ee5078e3d2d0aecd2030e1868c3dce5c5f04f59',
        },
        '1': {
          publicKey: '037d8e6cd5065133b8308c4d18ec532d853897105b4ebe64f414dd5dccfba3eeed',
        },
        '2147483647': {
          publicKey: '03db3bdf161490ac10378cad0ec16511343467e2dab0efb717bb01619a207ccb09',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '287c8982abf31b4d6822879c2db5a662f05996113d99ca5345fb6b32a19c1765',
        },
        '1': {
          publicKey: '1543e5ad2cdb07b6f100e8f73351d08bd0fb3bb3a27b96c9b1d203337636c287',
        },
        '2147483647': {
          publicKey: '064817cde2fceb8b12496e63f332990c9d8d60853af7d404d6b25b65ae5c90f1',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
