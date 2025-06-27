import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428802119',
  passphrase: '',
  passphraseState: 'mv8SRcYZ8vcfWnx1KjtHeEYpiuXweaHm9y',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '607f5c25837135ffd0c17870c665401b09c6c88c9458373defd80f289832c54781c9bfea44aba5a8b435aeb87f126ad07c35880eeedb748b0e149c669d0e571a',
        },
        '1': {
          xpub: '1212898f49cae2100d2279abfc6baa4b7562ab0ecf1834a4d9d8bd7d58857bba04ddc67831243e565883bfb6d7b302bbfab03bd4eeac3981240950f8282a82b7',
        },
        '10086': {
          xpub: 'fa39db27bc36ba165a6f5e450aeaccd4a9dc1970345a77265d03d02cb720c1bf4aaed02e826aa1b74eef2f1bbd539c02fdd7386eadf996a9f7ccba02457e0c86',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'd0f73de413e939396a0526a991b1187e62479c227872df7886bf3a0557e617af',
        },
        '1': {
          publicKey: '189818000b81d710348bf6009629ef1b9f4995c9958275129c487a21869a1345',
        },
        '10086': {
          publicKey: '05291e74b5885c82583a14dd5aa02af29b6c6a52e725d2ba13f84312c1fbe76a',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '038b390ff8aebf0633b56e64cf5be5eb7e407fb2d5471b6d895acbecd613e45f93',
          },
          xpub: 'xpub6GkHj1TzPzChPFtz7wNsQMHZKywMDqdNFaRkRWcpTKo4aMHykCrD4JoxUNCxph6rFCPRipshe4p9phhhhYCNz76jQNDy5zpkcasGV8jcnvS',
        },
        '1': {
          node: {
            public_key: '0322cb9d036e259ee3c1fcb0b2de235746a43364d93a49da6154db710f5a97a07a',
          },
          xpub: 'xpub6GkHj1TzPzChQAjHn7C76rAVngWunmVvHByzDhPEuvvYasCBDQG3tYPuy1rVDdYQ4yTsabQ5JbP76rSqrguCxyVp3MdB3Ww3MgvvAaSLT41',
        },
        '10086': {
          node: {
            public_key: '02f3a8e4bd93cb4e044c33a8ddac971aa19c5a2e8e4bf811e2efb797c44bea6426',
          },
          xpub: 'xpub6GkHj1TzPzLLZcMPfXgimNuqfZRLmabojXC5LohtUEcT55dRsRFFTBq1etYr1z5bemSthNkqTsHwZzgj2tEArYZiBCu2HtaA8uFF7mCF7mh',
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
            public_key: '02cbeeeb118d6328593eef8b7499ff9d86c4ea4d1354bf18d1672b1169db7d314a',
          },
          xpub: 'xpub6DJUKB138nx9cRBRD4kEtq4fjhtco1oQxA4CmmkS37PzRcVHXsTzkRJyiaCLg58EkLRoLhdhRRAFZ5xH1vqceScCEnn77jnZxsLt71jWyWX',
        },
        '1': {
          node: {
            public_key: '03e57cdd66b0bfd8d30bb7bc072992cc54d7ec2ed6c057db50c749b2932ed1ff0f',
          },
          xpub: 'xpub6DJUKB138nx9gQ1bMLFRd9f6KT4vZ5G1RoW298SQYZo37tCs6iKz9yAKD4dnS2MqRrEyt5sAd9S31H9wXvjomybQ4AbexiivQKfKB2zd2p4',
        },
        '10086': {
          node: {
            public_key: '0385f1ba21b91fbbac416b02f54243935b098a53920358e7f71ffef1703f0db532',
          },
          xpub: 'xpub6DJUKB138o5nqiRqPnj6zDUgqBQXUtgfc9vhsCAjD6jnRw3CpLCDNP5TCQz1CbQhvsd2Dgh8cvRyobMzhGMqG3cQK63VZAX5aiVptPigA7q',
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
            public_key: '03157378056c0593c8cd57c69068e005a744e5451f7e1083e002d54b0d0714c194',
          },
          xpub: 'tpubDCoW89vN61bwQjqs6oAP1Sz56x7fsnMFuYDDcGY2QcpVvRNjwuiWGEJTT8cUC3SWPmvLyKdDC8rk7EiXR571bgpAZFeW5V5HEiRhn5C2NJU',
        },
        '1': {
          node: {
            public_key: '02226cdc815e6fe5ebcbfd1c23799ab31cd0c83b573298ebd6f73668ce1ac3df43',
          },
          xpub: 'tpubDCoW89vN61bwTmeWXCwhhFq2sERjCxU2h6J4n6W1eM1HgZRgZFvFfjtrEWahQR1RPtrZFoZgP4EkWq3qs37EQ6nT7tzZdWFu5vJhVLSiuYb',
        },
        '2147483647': {
          node: {
            public_key: '0358109cffa09cfcbf00c8d43d96424cdb7e4480968e6c907681ad6f3186e4cca5',
          },
          xpub: 'tpubDCoW89vWRg8uZvyKnTLedpVSnahVBsZFBR12gF9PXrg4ZSVQaaar5WM2Ccwpy6PnpWE8wUYv3hjh5xHPj9oZBUM6bqtCywBjX99bjmPcJxZ',
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
            public_key: '039388bd3c49061badac89fb84b853eb4c9ca6a4dc83ffbb496ac9a3bc9633dc1a',
          },
          xpub: 'xpub6CTHjFr2D2CGzkDb6QFy6FZ1zPNVpaZhZwDCd4cwZXrhWfvp5PuxDpxW4UFUk9zmL24QLY3foBKkAZhh9HDLe6yaTWhUd98g7XRj9iTFhHV',
        },
        '1': {
          node: {
            public_key: '026cc4a0d103495e54d862996c11fa38993419fdbc8b57401ed0bf83a7b175c9e5',
          },
          xpub: 'xpub6CTHjFr2D2CH3NpgYnxwTJeT1EV4N2y1RAJaQfWAGx9PMYEfec53uK7zyGyxuwkRoHCXsPhCoMuQb4z4WuwdN2uNHfJypA3VNQFPMqgxYZU',
        },
        '2147483647': {
          node: {
            public_key: '030e37c67073cc376d80fe1dbd19911ee7f231ec71cd4654f2e9444458f4869a2d',
          },
          xpub: 'xpub6CTHjFrAYgjF9V57VjmGD3NBsJ7t2khL8RQGME9fTY5pTYvi4svuTcgVaag9QcpQNBfUgR3KRf3mcYPZ6QPcnpQsd3s6ynVrtChxA1G3Wom',
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
            public_key: '02524fa6b65f703099cc8b6f70ab68293f69ac7dde4a5ff9601582018e85e9da30',
          },
          xpub: 'ypub6XtR3Hm72TPcB9AUX48F7v4jNVnR1aY7DTgZ4q3cTUzpbaLzrYSidnpaBk3QvVbTPTRYU9tuBrZ5JxRNWDs6fK7Jqq29h7CrFeFauw1qwGp',
        },
        '1': {
          node: {
            public_key: '036f55cdcdc25fe728b4ba78ce7d91d7064e662d76090e3a31d6ac4a4d296c7bdd',
          },
          xpub: 'ypub6XtR3Hm72TPcCvaYqcgU6JSRNwoEWJufee5st9H3g6ur1EAwhmjYumnQah7xYCe57iY9wmugoG62Ntra7TtWK4V6GRUk5nhkGg27TMj4w3b',
        },
        '2147483647': {
          node: {
            public_key: '03744ebdfa06a34f2b3cfd116af59d3e4886dc81b6d575d40e93df232fa3da1dbb',
          },
          xpub: 'ypub6XtR3HmFN7vaJ7w2XoTQzDezzeJBbduAhShWcme9VrQQ9e19E5XoZ9DePNUrW1i5FgKwX4uqZjexwPBoTj8cutJj2TMMFqNQxdmpFD9beD4',
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
            public_key: '033276cc3bc3670aa3bb8d951f7586b4331c3092e6907070c5601a330aba1ae8ff',
          },
          xpub: 'zpub6qUpxyjWgqSzbPpBzvSJsRSssSy2inAjtVzrX127zKknE4zbXpn2vGQYxU4F1KFEadd2BuTSrs7T76hyYeSC3xtT528WiyLXpEyjHyEn4TF',
        },
        '1': {
          node: {
            public_key: '035df32666689819d445b8047aff0d9f97a8b16b718297862d473583304d49eb84',
          },
          xpub: 'zpub6qUpxyjWgqSzd3Jhp4c7CdemZY5VYqgo27fJVW8MuBnyrRBQLtfaUNyY3JGYKMWZWbpzSaW7jjjMsTWhinQxdRWYMVuN51PN7ftcR3BEvqS',
        },
        '2147483647': {
          node: {
            public_key: '036da4689be32cb72039ce7b98f09a20b8bd6b241897646e56fb8b3e04a3609943',
          },
          xpub: 'zpub6qUpxyjf2VyxhnvnbzSevVn4sR9cqCtqDms1Ve9WeU2oWyNFEpVfdBjsSJhxnybpKAjU2PN88rWcCpuMmTTg26GEhWwYBKy2tChVBnLLttF',
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
            public_key: '03e2e37a404f7a5c54c91b95ad8099a376635ebc6cfb107ca66181219ea16e41e8',
          },
          xpub: 'xpub6C95EidhYw5CNoGGJYYNe5Nbrc3Tc6RQDcaobmpeRhVV1xwxSpgJb6sw1aGCRPghPG76A4so1JXVDfG9jtg2JS8mgjFiYbKCjutgfdfzW4M',
        },
        '1': {
          node: {
            public_key: '0291e505fa1a855be360ba4bbcac44a434eb136c54ff5e9a201e8bccf63895e461',
          },
          xpub: 'xpub6C95EidhYw5CRcG2E3PqeSR7pGZQPc4d1PHBBUwUfGKCUnJ94qKZN8iDDX1uM5ni1YZW7woZrGHeyL5g21a25pcUNZ6wvAeJ1viWAoYPG8x',
        },
        '2147483647': {
          node: {
            public_key: '021a2531557a33aa19c609b0de8db62409a75e35d7d8cc579385d8b815ef06492a',
          },
          xpub: 'xpub6C95EidqtbcAW4iqeA8UWTxYixsnHkWF7pxwZPv9uHH9pDpiQqy8B4b5ZJth1pZkpWk8MdQ9GU1kop1wkzuc1jBgZqYSq71KNmQmo1Y5Kge',
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
            public_key: '02bf23baa3fcda320258714248933f3f7e8b8ce07de15687fe67411425560de555',
          },
          xpub: 'Ltub2YKHFLDo8rzwLkdtFzMjac7TM8sy47E423ZkLTHARTUY9GDzJScZyppBXCrJwVmEDrTGiy6oCyTnSP6L4wg4WBqiTRhcNAdLorccm5ucqbd',
        },
        '1': {
          node: {
            public_key: '02e6a191f3f55b44eed7b83e1dc4e6993cb0e5ec74f6351c8a9b455f66bb21693c',
          },
          xpub: 'Ltub2YKHFLDo8rzwNBExDp35eSypAf9nqk9gwdP2m1G1HybD6SzP5pCFbEbAgFj5pHtHqKuyNZavY36tF6gCJZg9MDepXDkhqcbqHu8M949hpka',
        },
        '2147483647': {
          node: {
            public_key: '02dfaf480094c9fe428928b4c0c2ffaccb6fe2d88a4565debf401d303d2792c809',
          },
          xpub: 'Ltub2YKHFLDwUXXuTZxpQd6FCzbuoMdE9X1fREwseztpVmtkau8qmyV8yB7VSqKH2asnWL1yWCos6Ypw8J7Tdk2XZ2ChNzG1f6wNLs3hoh5VWj4',
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
            public_key: '0214e69b3df3b101292e69310a8e5a7ed962566b28d2582dd68d489e0734e3f1b3',
          },
          xpub: 'Mtub2sZVpHpdVa71T3GNFNt4LLXHZA9TA49FGez3me1y9BCMZ4oJSK6pmFSpNgNsTbAD4ogR3y6rGt5QmookcWqBhx9p5SexTBYipAa25FX1ugh',
        },
        '1': {
          node: {
            public_key: '027b71631d0ee5045562813690b63dec6512ff37d11dd628d89fb9f221b6e70293',
          },
          xpub: 'Mtub2sZVpHpdVa71W91qFdQV6rrgSFYLmZuRdJWQCXnJDd1pVYB7xXWcJy4Mqsb7j8EcpQWy1dTY5gpkxMvohT8ywY9fadHKwNcxsYtdxavUpRv',
        },
        '2147483647': {
          node: {
            public_key: '035102131a934815b0347fef8b6626054e752c8823365d2f5b06a04bd7bdd66bd5',
          },
          xpub: 'Mtub2sZVpHpmqEdyc7wPSVpjaBY1ATko7pfpKwgsRh1MDb2WAFE68GRUqJ2BjmCK9x1oQVTsRqMouaUFPebxnbbnnk6XLxXbMPa5uBnLr4zvhVB',
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
            public_key: '023404e3849689274f31dda67e2db757331b6af174ef9ea32f654227634abd0434',
          },
          xpub: 'zpub6qLABMfrCizEKFXhHGXFXMUMhFhdLMmtGbXGc4tGB3Q25zfBCKU61CWXRNMbSmSG3aK9i9iZ83ib6diU3HkCNohyuRbyzSd54sExp8QSWRD',
        },
        '1': {
          node: {
            public_key: '03b2ce22e94f0ad3c80fa0fce27a498309cf6cc0e00947c513ae4b8d2916ac0bdc',
          },
          xpub: 'zpub6qLABMfrCizEMVaABH4NAJWtBgrExJ4i9pbNRH9vRuuZdSudiNb5VCdcHb994TJWWwXWFsZbZ2iLUawMe8sXkQ58Z36tv3f574CHNJTAq3D',
        },
        '2147483647': {
          node: {
            public_key: '02fc085e6c1bfc0fc563cfa4805605ae7011f62e6b2e5ccb1dc1885db4f0efdf38',
          },
          xpub: 'zpub6qLABMfzYPXCSp3MzuU8SUfEbaV4KZCBpuGKhi4TB5a7iZUSKPVUkNRGQaR7EMi3QNxtZgupKebCxjLes88YUMq1zePBPZafgTYGUwtboCV',
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
            public_key: '028d79cace198283bd1b5d6605de109863ef9e6407e5171dbb0457adc6e9c3f56c',
          },
          xpub: 'dgub8suCUnMHUiWR9vs3ERFFhGkhE94sNrVKuvro1pEMQU5qRYsGjsWCUcAqoR681LEtputvm5rkcvGwSqyoVmsVTco4TbJe15QwmwiKGvQsR4W',
        },
        '1': {
          node: {
            public_key: '03cc6a4f9572b16ff9dc485f60599dec60bc5bddb8e6c0670b3982425f6930362e',
          },
          xpub: 'dgub8suCUnMHUiWRBSjv64pRmWz7L8yZ5MYduBkesZ1RsjgSzRwxvah1jvSUTkfVibwuJ1UuzQVXkwmFXDGsdUtA4JWafJQQM5fjCLjEMVxWHgP',
        },
        '2147483647': {
          node: {
            public_key: '0293c0e85a3f34ae004aa8335c0d4cf58904c9a68eba00ecdd05ebb770e66d45bc',
          },
          xpub: 'dgub8suCUnMRpP3PHpSAKu1DSs9WM6VM1upzbiAhQcwRcWDLDkVVdckzQ3hRGb2Nq9LQMLJojUJ6ht9bbgU7crz5hCfUnFRzN5cY1zd52PWbi5n',
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
            public_key: '0321f2b09f2acf8a130c818a56bfc94caa3c8d24ef9dfa0f869ece03907f797d3c',
          },
          xpub: 'dgub8sHAB62X5fYNFH4zU9m5VPGBgKRfcJqFvLbh5mS3RHkUPeMg7FA3VybAVYcz994pE1wAqpteGoYLe1WJwB7d9RJHXwdyYzVyNMn5MY3RAB5',
        },
        '1': {
          node: {
            public_key: '02bef600f0f011791dde84cbc98e49d239a37b41326763c3d4146a7358cee535f2',
          },
          xpub: 'dgub8sHAB62X5fYNJKjM7FB1HBHQXK7i37JKsRQxiW5Jo3DvVpfP2d9x2i8Z96FTQoBs9pbdDcL1Hy6WUng7sCneN574Ngp1qgsHP2ARj21gJ2s',
        },
        '2147483647': {
          node: {
            public_key: '02f7f36e6aec1133280413a145e02e9e100107fde086915976860b09ae8681bec0',
          },
          xpub: 'dgub8sHAB62fRL5LQpSsHha5a5hpUJFD7PDebZkLLASrHUjQfPTB9vrLmTCb8c9j5NEucD6xw7vKSk1GBet7QrpHJg1FgBSEw8ph1WxPBv1fQF6',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '02231bd76f9b96844e80c2e0cf96da8a50405e039de780ab5d7b030f848ef15a11',
        },
        '1': {
          publicKey: '02eb9483edd2f5b5bce337333d1077be165d4349c3e700f64b8c1a1c74443c051d',
        },
        '10086': {
          publicKey: '02f64da58630e265032affd41b7b7fe47fd5fdf51857258443439b8575497a1258',
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
          xpub: 'xpub6Chv7qb5RQSTWF9S9qXv2PV1VBxZAnewbmPpUahpJMonrccFdezR1cErQFWyi7ui1KcnNmtH1ReVGC7F9SGF6FpJ9dAcdWmETRzWrYzz8mH',
          publicKey: '03ff88fb639a94ebf5db4990747199778e102ce291083bb58a6de8545899b5baae',
        },
        '1': {
          xpub: 'xpub6Chv7qb5RQSTaKzYHiyh1efuSd4CY8XxzSGhiTnFxxygqKVD5Tj466mGifrZThXyjkbs7eCe1pjCaCCC8nQFptYST7GjSkwWHrcUSkTkzbH',
          publicKey: '035b558b765dda6bc3e9f235d95d07750b025deb6e5590ae9898add750071c0339',
        },
        '10086': {
          xpub: 'xpub6Chv7qb5RQa6jmeLjLFLV1jnSPgXMJZt3ZNGV5vF1TYXpXjXivPbwY4PLgLBzfi5YAje1MkDSPv4VKPuFTExJYwD1nkvAJQf61n9qQQWAhm',
          publicKey: '02da7eea86bdd71704bef8ba352e78d0ec94a2e2f376d8e1e1dd18e6b2706db03d',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GmYq9daz8J6FXSshRzyqXyPvTahkGXk3eU6xnHzRjSWkZUnsgXvH9PsKiWcVF9AghTrnpjTtWXeoydKXChpXEJEqPsbdsaQBneV8in8NXJ',
          publicKey: '036a3d5101b38e1e69b41fb324653a7cf4d2c116d36e7c16f4b409a9e9335577fd',
        },
        '1': {
          xpub: 'xpub6GmYq9daz8J6Hj3xFDr8GE6aRigLTB6YRDkHRPPing5biNAabPFMYmBsFvUhLzoEURn3Q3M1e3upKp1vh8vbQhoXb49S4dJpfvLhMQQbK9S',
          publicKey: '03635fc88b672e20057d080c9d5daad64c358dfa24371d244ffa366508c5980994',
        },
        '10086': {
          xpub: 'xpub6GmYq9daz8RjUM5pPSGECwP7mjPRLLWkmVdHmABHAU5d47mSKTiEnbqGC4KMnMUKHc8exxevfWBbUDL8HHUz9cCZdcp2hHG2M3efj4LMint',
          publicKey: '033829c5b833b1195520cce94f21a62aff207741a806c8051c7c9e26a8ba84a9d2',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1kw5utct9t2e2qmgp60evx47u8gmmnkg46vtz3jnmu3gdlyx4djwq5wa4xf',
          publickey: 'b3a9c5e1655ab2a06d01d3f2c357dc3a37b9d915d31628ca7be450df90d56c9c',
        },
        '1': {
          npub: 'npub18f9687cf7peljpt33a2naqacxesxjcr60rtc3sz65q50uh7zmjlqjjypnv',
          publickey: '3a4ba3fb09f073f905718f553e83b8366069607a78d788c05aa028fe5fc2dcbe',
        },
        '10086': {
          npub: 'npub1zxayv89s9mc799kvwdge69rf9htv0sa74kqerr6l3yg4pxjvfeyqslx2nv',
          publickey: '11ba461cb02ef1e296cc73519d14692dd6c7c3bead81918f5f8911509a4c4e48',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x709ae284be2dfb343182909ac76f7cb1f689b33c4e168278aac1ad2a03e7bca0',
        },
        '1': {
          publicKey: '0xf1043ee690b3e6627acc91f8790700852ad181258dea3a232934e6e7aebddd56',
        },
        '10086': {
          publicKey: '0x0c9f84a0d0767cba81abb3cd5a6adb12a0c73eebc5e4e00f22203ca4cdac78b0',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02305fcef470a160750185af6b1ba7e8ad42ba2b31a04cb107f79961463c1eb536',
        },
        '1': {
          publicKey: '02c2a202d2b62ea827678b775f2ccc632512ce5f243e9b5bf599543254a76d68c7',
        },
        '10086': {
          publicKey: '03faac1f6a0a3b95666456742e82997e4132361ad6fc16d2963bf6b3a015993f0b',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '45ea3fa9563bcf8db6d2609e0c6638ce5185b29cbe3567697722a2ca15fa43a2',
        },
        '1': {
          publicKey: '2e6a98890543540f0e8151d1ed1bdb613178f11cf85af97370cd5060552ba6a0',
        },
        '10086': {
          publicKey: '39918fd650bd20659ac1c52bc73da3543cee9e7686854e5ee143fe8ac1417fbf',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
