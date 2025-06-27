import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-密语2',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428802119',
  passphrase: "ADxvB0383*3*%^%~./,';L",
  passphraseState: 'n1Kg8udanaFFE48Y8im6GmgCSzSUmGHxV4',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: 'd6caa5a3f04f0136a492c6e38ccd9c1fcf40ca7e91a64f6e465d637b20dae1249f6dd650fffe5679aa569a8752f53d92a73eea64bdf077ef6129eb4a2d607d0e',
        },
        '1': {
          xpub: '595356ee87d49cdd76d0d674fb09c050938278b120c95fb0c5476ec94000b649dab39e150055d2c92331d60c1fe4764b5b679560aa1b88b370e32607f64c3c3a',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'f838ff9649076055e6ede9bba31fbda28549993c4d528ee0d209ab904ca23f75',
        },
        '1': {
          publicKey: 'a765892c0064a0a0776e6c41c91539a9053532baa5f2118f71c93db78d2170a5',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '024a43683f552ad96f427dd89e3b9fc6f2e1cddfed54bd5d3cd462bbd051b75168',
          },
          xpub: 'xpub6FgtREk4bZvRgx9SHwEBjA2xWcWcZp9xnVJeoGK9Gy2rXeAUd2txkgwQvvyPHQnRKt3thZMUw7mLeeCqdBDDREyfJdKogokttPngaatCDu6',
        },
        '1': {
          node: {
            public_key: '0317aa6694008741fdab9e5f47671e338e455b9e3bd94b65f93f5a1ee0ed13242d',
          },
          xpub: 'xpub6FgtREk4bZvRk8VfrZq9F1YnjDfoQEFqajnwNAWy1vMBamTESg2tMmC8dRk8JHJEqZnhumRAbaUCXJqrxcNFEJivNpduF9un9fiAh2rsX6L',
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
            public_key: '02984f09df06742c136323b345b7a8a6c09237f622eeee75c1da48be45e2d943e0',
          },
          xpub: 'xpub6Bm1FFrRh7DVuAKzFVphX1twsAVnHxsVWrBj3S8jTSt8zHtuGqizyf2cFMCY2C6dBcm7F3PA8WkEvxB1NWY8thb7b29mkqrfp3CTMnrLAwt',
        },
        '1': {
          node: {
            public_key: '03ea6b9a98850fb97863892ec8eae82f5757d53eb91a11f06a8fec49bad3a0aa40',
          },
          xpub: 'xpub6Bm1FFrRh7DVw7y5FJ71rcr5Jx7js8rXnGXv4hxd93GhSQSXyfu4JVfqGk3ssLHpjQZswUB44cx5mXRfvJQ2p7LNFPR2CWqDa1EsZiMmqbo',
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
            public_key: '020424fe13e81079d4c48a1280286e364ebb5d95de24a75506ac9b702afd2af409',
          },
          xpub: 'tpubDDkkeoDP35VtKSRq5479mkisZnuRvygbmLQBKLSdedU8fjbFVkF9ykqnHgpP88QomYyFeFDpmnJEESqg7p4HnUciU9MC7yqKv8DUTxBw3xq',
        },
        '1': {
          node: {
            public_key: '03b7b0ad7d867b8295d5ce7c84888f14e8b263a81e17dcc767eca1ec5835ff1484',
          },
          xpub: 'tpubDDkkeoDP35VtMXSLkjRe6hLgKe8HPXNc4TSkJLLzA8FmSuKqp4LXnptYQwEU7rcarNCxhV8MHTG3SdaS5b4wxa8Wu6SK4FaGBeNSbQBfAit',
        },
        '2147483647': {
          node: {
            public_key: '02ee479b133a36527f78f89ecf92e3db3d200dec03d0a521e852cc9a4f0978aa56',
          },
          xpub: 'tpubDDkkeoDXNk2rRz3eY31arJHP6XEDeuKUcMxoozQLKh7nJ8gWv2MjuqQ1VDUsqcuGo2fXZKiCdxLKjpkCHzQE2mf6TysqvdZszsvBHZsyQea',
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
            public_key: '028bcdcb942eeb36a8d063c09143530f6e9b00840f5a6e9d18a906cb2f8663ce55',
          },
          xpub: 'xpub6CpULHdgTv5p3LCcAhtoPFtbp3so2QwrZjXkBJKisPr7ESJ35KCMPTk6opsckHJ6uFYaDAgdsEVJUUxtvsjS2qTL4ncVMt91ZCvots6KTPf',
        },
        '1': {
          node: {
            public_key: '028ac346140fadf12d0f89e79edbc2c8350f98b7daac1a3b3fc83e525513325b53',
          },
          xpub: 'xpub6CpULHdgTv5p4EXjbp1rTTitbxguEWcc22jhvUF8nCLzgLgbw2p7ojMENdBxiv9uxvzL22z4gBzxVCxm8W8PGRdoL4jvc3M81JTHje2JXQE',
        },
        '2147483647': {
          node: {
            public_key: '032d8a2ddc20142e633230d9a5857bdebb75077fc8b47a67e2dc49bfbf4f116383',
          },
          xpub: 'xpub6CpULHdpoacnA3zy7gGhXgytJD5Jp5Wrr1ZFgFeCWdBwFLzcbQu5sKtieCGqct3GwERDoDe9359M2nVM82yvdy8eTg35FmsiFQ2c7Dd1Ekp',
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
            public_key: '03beeefa9bdd24f7f51f3545e3cf96a9d00815c05ff2f2bc6104cf3dfd4f225aa9',
          },
          xpub: 'ypub6Xsiy8VKekpEtMQVS4qjiBfaML2L774AzZp2zTbgYXT6Rjo7tt98a4fG9yoFY5yFk8HNJK1xfAsFuetUVMrqbZwnwvxFNKxYEkkX88hVocZ',
        },
        '1': {
          node: {
            public_key: '02e9418d0882031cd48e9ff0b65bc7447b2c76838457834444f35f97d07b8961aa',
          },
          xpub: 'ypub6Xsiy8VKekpEttigHgTxe8PfnhUWvq7a8eFdkFrbZD6ghGzFzmWbSjnc1XLzsJDV3o7Q7zdopn3xSDEmtWSaGdLzNfyMd1bSFrEvBDnb7ud',
        },
        '2147483647': {
          node: {
            public_key: '02095a0ed7b33672aabe753fa609d3ce1eaad3c503f67a15331e6403de8ca77f44',
          },
          xpub: 'ypub6Xsiy8VTzRMD18UNsD9uSsSbjP3LKzMbaZkWjsJTbFa2vAQK2cHVysPAyEuCdaxkdH66sXh6Yf8KHMEiZBKNApGB1PyQBFYvVeSWQzqyfhd',
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
            public_key: '0336fd4f0a91ebb6e266500a75c469ff2e8fd9495a04ac41e251baf6fb73efb238',
          },
          xpub: 'zpub6qu6gqTeJaw1bQt29qqNZMpgBzKiUNSGo816XxRcrA5xWwRm6RnCPzA1TCBT1MHXdRkaYXz9DodDZ2RBmZqDs6zH2UxSZNiaWMJkB83eqw7',
        },
        '1': {
          node: {
            public_key: '02b1b3fe247678a7e1036b925724114e9aa64d09106f1accddc2f044498d3c3753',
          },
          xpub: 'zpub6qu6gqTeJaw1euUZH8GzwoEUmAEVdeobkYrSKJHBY5gKo9vz2iUznG1JpySQXLzmUn5uvrw2vYAnsiJmYDB8TNip6Kj6Cg7BwTmXnmZXFgh',
        },
        '2147483647': {
          node: {
            public_key: '02720bac85ebd4509adab7a6a4c591c3b888075becd8a6a09a504a10df78a7aff6',
          },
          xpub: 'zpub6qu6gqTneFTyiT1WPW4xppLkhCLVaMffsVc7Lxq2xyuyPnsRkLatJ6KQb2dZKwECYS2gvrdgPYUzpi9v6NeFekBuTxHiZW4HtbcrPDqwnEU',
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
            public_key: '0204057d02aaac642837a1d6d2b3db5e1a72c362e6bfec4a12d7a90644036179e4',
          },
          xpub: 'xpub6Cn8CKuewESxndaAhSSjYXb8NR7yTSFFGcyUqk7oLNkiBKYyJrzNoEe5RRp1jUX1ctj4XjM9LDEg6RdteXC9k5hezB174qi7TFc2XdtRLMp',
        },
        '1': {
          node: {
            public_key: '027fe9ebb7cb4c369d09f89dea7410ac1aab038c506f77db822de33e26d70bc750',
          },
          xpub: 'xpub6Cn8CKuewESxr2VMdUAD1kzGerBaWrrPFpCspUgPSMxVsSXLTC4EYUidztz6XU4uRuuJCzgMusD7DAaLqWMKnYuNUwVJsPMod6uYTeU3J1j',
        },
        '2147483647': {
          node: {
            public_key: '0223562af56244466466b72d6588a6a6f841355ee6ef3e1cab185d9ca1fc8b7e77',
          },
          xpub: 'xpub6Cn8CKuoGtyvwE5NDvyMqQjYYaSnLrdy3okCerNWJ7EdCEjjQFog6DFiCjUGQmQEn8mswGdAPC2rHjtPnKYtyrTa2qeVvSMK9L5gWPWtNNV',
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
            public_key: '02f1025aec7eb0a39bf175a69135ecd65b186f0cd2ae713f27f55d613503dc42e6',
          },
          xpub: 'Ltub2YvLyQp5ZitmrAKt4VsPQvx1nHCiwQ347DHJqY4NCVkVBhKSEf85BcrLTc6fvEZjpbvkSwacRSstFpYeFtQJPNBUCMb9SVhB8gtyaRhoVnX',
        },
        '1': {
          node: {
            public_key: '023ffa67ad36b623d9a534c8be58299166b7ef498e7397c6eafd7c545b367a9dd5',
          },
          xpub: 'Ltub2YvLyQp5ZitmsBtSm7NkMTF1mAk6deSYF42M94XQTRbmvmDXNUNL8Yn3SUc79QheynPF6eEAD79RSwrxU1ToeerWNyRxmRTMX83C6pKkebd',
        },
        '2147483647': {
          node: {
            public_key: '02336fbdcd0e2fcda4cab4168f0e5aca821fa92ab6807179f077ef4b7a51ae0b37',
          },
          xpub: 'Ltub2YvLyQpDuPRjzM7QLFixzn75VrrtSw28hREWaZ8ZTuwsvR44BEUD97iAEFz9f1SFzaVsufdDamdL56e8YYE4fV5bzpTdejEU7ikNCHjPWWA',
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
            public_key: '035f5603ae0f468529de60152c369bbf19a16cb6d013963d26dc9381145a880bc7',
          },
          xpub: 'Mtub2tfpVYTnRvX2j6CW1qi4HxyG7roSWtaGthjJLwYw2t3jb1ga22vyXpuyXPD1JKwGmFtaZwKkTsP9LsTs8zhWoAdu5A5WLH6hWnaj2DWa6x2',
        },
        '1': {
          node: {
            public_key: '03c327ef954abbee4664bc7a68059e96b63ad5f4dad393c4d01542fffc01109d86',
          },
          xpub: 'Mtub2tfpVYTnRvX2kHz9CqBT3th3ChkaRqpeBcFAy1ujhAuLD4zcbBXCTJ1c6yZrght4WiDUCije173A9iZ6GDnuMrVAHkxzjh19hFG26APQNMF',
        },
        '2147483647': {
          node: {
            public_key: '0240bbc97ac75727dec17091ef0f612597e361556f25d42b14e932dd270b57af3c',
          },
          xpub: 'Mtub2tfpVYTvmb3zsNfaBDXZbxsN1EAQbvzDPgYzoamfaywvx4gCfVDZ9JQA9r6bdTcLssKrA1TUARA8gFAV385H3QpB6NiCQgdqEZXKC2M5xvf',
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
            public_key: '03b2722c534946ad5e610ca9fd030f815be96b5cbd2f1b90e2f969bef3c3e75a9e',
          },
          xpub: 'zpub6rmv1cgNkkCopb3yARQQqCzgLWa4nt4xQ4xMPM8KkYZrXpzCo4LVfUBoz7xrGTWTThaUCnexKWC839fuE1F8AyMVTwPwkJVoP5m4y1Et7bP',
        },
        '1': {
          node: {
            public_key: '02656a7e1c04bd392b1c264f64e03c8451e3b908e9136b2157c5fd78738870ebda',
          },
          xpub: 'zpub6rmv1cgNkkCosbPe3iQBPEmCAupr9qQ8tUnbetxJhDrhbLuxJKa29Ct8k7LoazpQUsbunuPSroo1nxupv2E4Lq732RMBFWCQuwyszcXZwgf',
        },
        '2147483647': {
          node: {
            public_key: '03dd13fe733438173467e5b62c76bab7d93c29de1bdce275fee7e5b54543ecf023',
          },
          xpub: 'zpub6rmv1cgX6QjmyN7Rf3GXgsLGMsT9XHYS5Qv54yay8Nt9FGe4kY7RoaAscFurMqvxsps5Tr7swQ8FKhCjcw9YPVEkkbUGnZLmbugz9itDr5u',
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
            public_key: '03d1b5e185df54db781625c7b1ebbf0121f56d72697c0497276eafed8080faf702',
          },
          xpub: 'dgub8sVuwiw4FRSyQbf6aK351sc1jGvnUmv5nbSYgq5oitps45ba5546gfPqQer77tYZaVwkcfe3A1KLCft9fVJVU5ZoSm5MNJVwXbiepgYQL7Y',
        },
        '1': {
          node: {
            public_key: '036b1ec2ef7eb04a4a9a42c1a79b063ffbbacf828b917ab88d0f463515c1378aa9',
          },
          xpub: 'dgub8sVuwiw4FRSyVRwbhtUbUDyHUt3xapLECUafZLugcPJWp39nFd4ZNWdKMRbTUN3qdkdkt3mnuU5q4c2CoNAf993W32SQnr6VozfQR5vWScj',
        },
        '2147483647': {
          node: {
            public_key: '03ac65e12a9709f68cc15294191f3870840751515270aa3d292fce8bc2ad9bbe77',
          },
          xpub: 'dgub8sVuwiwCb5ywYyFJ3oKL3WqGM18o7HNAPwHTc9KoZE5cErpguT941NYsRQbzhATcmzPrYV31QppFncG6hWZT6J4eQ23jwpmyMrZ5wMtYsJx',
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
            public_key: '02216528ee307d698da02a290eb4093f7b884cc725053813f567f2b74e3033deb5',
          },
          xpub: 'dgub8rLNysSvpHjxHEwjMXYxBxmwRtNptB1HB44gCW8bGRCacNVyjLwA6LacTXPLvTb3Ku3MVUDtbNNzyZJxzKJTomkLqyWpdw2fnaDEo5CcLrL',
        },
        '1': {
          node: {
            public_key: '026bf4c1bcdba20e710e3c420a1dbec5bbedb2c22b0fd4bac28b1e27389568515e',
          },
          xpub: 'dgub8rLNysSvpHjxLD526J9oBLGxiJ4MVzM38jemdZ4ntwvSugGCLufh4cG4LwBKMjeisZqMhwggduFk9sGfTghn46wR7ryRBtCnzHSqkh3vuRH',
        },
        '2147483647': {
          node: {
            public_key: '02ed1bc7302be678e970d0045c749dc5339577b7d4c1a32e93f713fb0e9fdbd8a7',
          },
          xpub: 'dgub8rLNysT59xGvSSRAVuk4aSyhDusRK94YuDG1B6m1n2TTF2iM4GeywT2v946oSrZxTrfFESt4Ho3A4dP5pvri3QeKf1hNkPcGu4Egvu76sYe',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '0366522264344fbe5b6b24d6a6a643d58e40ffcfada7d55ccef42bba742b063a8b',
        },
        '1': {
          publicKey: '02941f27a608ee07cd0ab89ba77a280cd5875264b0e5f3763c049dd48a48601bb3',
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
          xpub: 'xpub6ByjrPQBmHTWV8dEesZ6jqLy6sjCL4FCXLv5TNP98xanmA1ZhXGmKe4h4TkCxayhaYLxtXB6osEiS2TKT2ikU7ujATrZWMYot8VXbJur9Ac',
          publicKey: '036217fc28bbfa8bb419b1d3d9d1a74ef5d71902bc763cb6f31511f12624e7a5c0',
        },
        '1': {
          xpub: 'xpub6ByjrPQBmHTWXzRwpMu15BxifNcVPLqDygykUzKK24oQ6Pm21GjdFLK28vXBU63ZoYNwJ5z8hj46yeow1qbwLF3cro9wzYm3F49rENazVAf',
          publicKey: '0295357d9da40afb3097c591711d43a253c7827dceffaafb31f5dfe92a033a7a66',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6FybcaNQnTJkMqvKA7TN4KSc85yAqXU4AukVLozEubgjKVSMKhZZ1V1KpHEAhUgZpjkAzQzBAPNFCkHLBc6aqgxHFeszP6aDwtGPFN8kyKM',
          publicKey: '0295c1c956ca1eb3deba10cbf6e0658156b1ea0ea7f8ee8cd9546507a7ae2a3c6b',
        },
        '1': {
          xpub: 'xpub6FybcaNQnTJkRtumeWyVHyQuoH75dMNmB5xxDLby9csaDRhiv3mHnwMPLaTmSKFvZijXgUJJoGF5gcGB3jtGihDvPv5VQbUwFFGHz6usLH9',
          publicKey: '0285f005b8c2b6a7ab7ceff39e72e4c2d6aba25f776ee056603deae4d44da4d509',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1hm6q7m3uexc8j4ggfz6sfldmn3ygj8qmzwr6709agp8398tfm03q2t5hcm',
          publickey: 'bef40f6e3cc9b079550848b504fdbb9c48891c1b1387af3cbd404f129d69dbe2',
        },
        '1': {
          npub: 'npub1mufl08kxe0fe2g78cvq3hlwxc0lsdflt0jhr2d9ygr590wvzfx5s4pvllr',
          publickey: 'df13f79ec6cbd39523c7c3011bfdc6c3ff06a7eb7cae3534a440e857b98249a9',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x0917a85ba27d39a41301ea0a66305ee39a26e2f3de7bb2d80d33e625af5cf6d4',
        },
        '1': {
          publicKey: '0x6b29edf152ebe9ba3ffb318379ce0335074860d4af5a2ae0fa895d33d1ca0b3f',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03287b8d50a8576b4d7789b5e8059bba8849855b8e1238b1116a0a3694b5cad4a5',
        },
        '1': {
          publicKey: '03b2071b1a4766fef2aae513f25a204b21bb7f5d77346722e0eb06f0d0bf1d1897',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '9abd059d2d572766dcc38ffd0efa8bdcd15bfe5263d7b64e437d7f71338f2f96',
        },
        '1': {
          publicKey: '61127c2948a5f61e99e92a596d8724f8642a17c56306fac3a804c693a925dac1',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
