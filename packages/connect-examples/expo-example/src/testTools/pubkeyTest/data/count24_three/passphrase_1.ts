import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-密语1',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428802119',
  passphrase: '0987654321QWERtyuioplkjhgfdsamnbvcxz@!###$$$%%%^&*',
  passphraseState: 'msnViVktp8SWFH4hjf5EYmXzTAiD6J89AB',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '728212578025aafacb3a7934fb3cfa2298bedb9f60fa982f52d51954cfff8e2df82875505fdb56fbc5c59261cd4e3bfc8403e29729d594c06ac5a263632ec883',
        },
        '1': {
          xpub: 'b26ed7115341b7dad0870c3895c989b3d6e8890454f88e41fb884c6f4c1ef59ca0ee9904c2f663e7b0eb65456008a24f373679678b8d6fcb0f54e48bee232ad8',
        },
        '10086': {
          xpub: '2283867dc9c5838369de29cb207890291b093677fb6e8ebf8a86cba2dd5ea0fb1f60cdfab847fbc05412b7702449b5736efd441a0c9eb83a4b27309d068cc3f4',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '3c349b844564086903b06406ad8e37481466525d128ad16acbd9b9b574752e2f',
        },
        '1': {
          publicKey: 'ec190d6d8abe9af421c112bfb3d8858b5bab2158c1367b20c18a4607f4129441',
        },
        '10086': {
          publicKey: '34aa71101a38401c4a524a6e3b12263d63772b3800b236e75f3505e4ef17e5c2',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03e15b135f5a9a2c254311c227fe4498879883748f00e8e943a01f079d3c92dabc',
          },
          xpub: 'xpub6GEWayvzcn1ndWJ4aocJxZdDM1XzHJmwvckPbZmZRzysLCuNtuieChXd2YwUsQaT5MwWEEKLHpvQTn1yh53HGPjQoMjXC865R5gMW7wtus6',
        },
        '1': {
          node: {
            public_key: '02244e0027592fa67d92c18fb2584370d4c4c71c93dbf660ee5513b5023e1b85a8',
          },
          xpub: 'xpub6GEWayvzcn1ndpVSmfCHN1Dox1gRTn6ChVe3tXSeXM6LKkTVnWXZRngZANSRLW7GBhFpJHWARjQy23sREdM2NSJ3nHJNgk6fc6HdYmpQXL8',
        },
        '10086': {
          node: {
            public_key: '02c2e7cba3ce5b6189e50aae6b26f109f6b662f3116c534a74aee714c798ec4c5e',
          },
          xpub: 'xpub6GEWayvzcn9Rq3R5jpiRyNaRA3cCtMfKvkrLNrCBDbYUN1TqQwXVZdGqdrX5x4Wuc4wMb39WvWE8pwMoiEeBZT2A5RThuaAkAaosp2KQMHp',
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
            public_key: '03eaf42c52df25e58f3a028a6a1eee1c610db3cfccab9a4c72e39850b9502e633d',
          },
          xpub: 'xpub6D92FmE3jSuoLoNLrGgypqsCPxmP3SJHhSaFwGkK93VJytFe3CgbhUbhYgdxT2NyBB5riUVmU8a9KuU4v6RasYnUsQhMkan5HaoZbEi51en',
        },
        '1': {
          node: {
            public_key: '023be3578415a19601bbda418f6e12c04c0000f3b5b8f3ca66eefe0abc5351cdab',
          },
          xpub: 'xpub6D92FmE3jSuoMDfH15piJXVoJsTPXTnP5rRni4oJibXJ9YwzWK4hGvUoCsBkSew9LYbW2QjvzcRGcMTQKgbpEFziiEAMpwSD3X1NQhHPELJ',
        },
        '10086': {
          node: {
            public_key: '0249165f488eedede077e44fda37c57b2220e86640205b150d24dbe0306a38ddb4',
          },
          xpub: 'xpub6D92FmE3jT3SX3hSNvbD3xZdgfm5fG46dC1Jk8pUHYXrkHMKkWwJMNvoFnzHuYZWpHwyjVLvvjrEo7rVFvnhXoq8J6BUHH8TfT2WyiXYJGW',
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
            public_key: '0266f44a79e07f4ae4d985e15b35f463b400fc7ffd798fd741801ffe326e074153',
          },
          xpub: 'tpubDD3fCctjUbZoRDLTF3UMzUUC7Fvsfqca4Kg965o5QGCJXh92gd3zbUmnWKvvUCVQjb8bBEQ4QEN3CNwKZi8VXg8Wr3VjG2dmnC5SiNPY7PW',
        },
        '1': {
          node: {
            public_key: '02ed304b9fc5fc9211adacc266aded98a3aec2cb078c3b62feccd033bde0465e15',
          },
          xpub: 'tpubDD3fCctjUbZoTv5C6ZhUFHXqhxRxNsqVfjNWBrSKDVdxnzcxGovhjScsgV8jK6FnHMvBYRMWu41GKL5ydhyb1JAFmkcmJQ6U8b1AwgKW4ah',
        },
        '2147483647': {
          node: {
            public_key: '02309107cb796a9ab78106608455ecbacb93ce82199a880edd232c819c8f70ff37',
          },
          xpub: 'tpubDD3fCctspG6madm9bYuZetWTQt8ZgotaR8Ytp8jwRWAvHusnNmacpBZCKBram8uLYrXr7CjbJ4TWEPe99dHxb3eRtSJ8mdmDmwSP6vTFMzT',
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
            public_key: '03b2429d3785970b5b04a89041a79fd93000ab61c4521a9a3a83e2938a07e30808',
          },
          xpub: 'xpub6CS4o8gBtL6FD6gFdd8mx4K3N8s3f7tCsr1fZbEzi9Aj7V2FGNZQczqTE6r5jV19Q9EC2qXLBMxJowJawDkqZWmkea8qySfTaxTVPNMNfTY',
        },
        '1': {
          node: {
            public_key: '02cabb6f3a6d43468eded8cd32b239a63033eb072c380106c026d3213c0f74fd61',
          },
          xpub: 'xpub6CS4o8gBtL6FEdpEvsrsV1me9WAA65xqSZSXPSBLCwtFYpPqJArSNqt7Pg8qVeymUGS6Vzd1Li6UTjaCFHa3F2jPVYaX2AeH6qgjjjrf6jv',
        },
        '2147483647': {
          node: {
            public_key: '02bf4c2c18141b7f3ed30c7e4d3e80c20e8e39d595404acb5a61f1ccb234dcc3b7',
          },
          xpub: 'xpub6CS4o8gLDzdDK6vi3iap4YUXVyfBn8SrK5fApHz5YQhsafXvpk8vGAWHB8Dn5eSJ9gdMKLEyGjqmn8Yy6rU7i6KCMtR8ouHp1UUYDURVPFp',
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
            public_key: '03ead06bef57ced19ecb8122b3b24bb80a541a584ff0c5f06e631aad284c0b1eaf',
          },
          xpub: 'ypub6XpW62rFferYhu2ctacCM5SZS3LLPp552xaMmyMoXnQnfyk62rfEc9zuNH18PKzP3CFU8xWfLo38qyK6huCJMDyvCLVpken1SNmWp4pFvhu',
        },
        '1': {
          node: {
            public_key: '022939a4c20ae53ee9b726d9336761f2a4ae3a7c09eaabec3d94a37ce4445e8264',
          },
          xpub: 'ypub6XpW62rFferYkzg9JwiNvZnos3qg8AzPCM5JLDEZV7mnDZ2SinccvrpSJ27U6hZEioejH9cmSVwyj5MkF3WGk6txCdW4A3aNXcr5ghPamfL',
        },
        '2147483647': {
          node: {
            public_key: '03e378e45b95db92be0b78659d682da6afbd9c81e6e11e297cdb367635d809a527',
          },
          xpub: 'ypub6XpW62rQ1KPWqX4mCXfYCXvkjdtiPXmz7wMLWFLXKzbcvat6rS2WQgFxsFLL4sw1CCK6SUAPhzJcTGvYNJoBVuWfwZGohTCy3zpSc3p8yCZ',
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
            public_key: '0385233447bcd9be740e689c81bc09c960d32fbd29691ebf89f8a80e74b97f0e76',
          },
          xpub: 'zpub6rwSLCcMmALuM66L336nz2HJHtDL1CJAKnhZtDW14qbVzxwo6Kiny1CAoUfdqv3yAtuNxpBF7c6JVxoUsHgBQ7LE6msZhZ2RZgbaDbS7r8j',
        },
        '1': {
          node: {
            public_key: '022ba6260380f33fcf68650292acb9b341a5cc7a87312c76aecb380f101b1356fd',
          },
          xpub: 'zpub6rwSLCcMmALuQhdsiXA13swww4pqQyCrEZDSpid6KjwTLREkiad3MReTf4Esa7zzJNZA8Mmw5We7yyokTR22LTV6FJhyGog9NbB3iduD1d1',
        },
        '2147483647': {
          node: {
            public_key: '02ab446e363f6141dcd7a2d40be8fcb780d025ba51258457263579975ebbb95d87',
          },
          xpub: 'zpub6rwSLCcW6pssTpnhkVvrPceAug8s8ycuFbxpHJnEtMnDjWZnffCrDwTq4YKpANhFjSjf3StnB3TiLfSnffujq5uowV4LhXYRXiRKUnmtTkT',
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
            public_key: '027707498c615b607d807132472383b15b5e3f7f950601e07d7e7790666f85cdb1',
          },
          xpub: 'xpub6DBKXGhbj1bWR6kFoS6QUKQBJt2Lut8E8f3ViqaXaAtk256eiChqY2LUQrYbP76Qz26oi9BWNv2bcrBKPyU17LJWGmfxkgeyvFeomzKahy5',
        },
        '1': {
          node: {
            public_key: '03093d462de1c1ecd1ad86d6b37e7fc34eaa52843f0ea174e7a6c1150fa43bcf13',
          },
          xpub: 'xpub6DBKXGhbj1bWSWG9UrtZrs4iZ2dqBs7C932oMGQ2RM2XLJU8LitcE3KJdrZfKJZs6iV1fm6iKGbuGpwkWQZhykLrns89jKfkdFZmZzVBU2K',
        },
        '2147483647': {
          node: {
            public_key: '028fc4e116187ef6d63f3680e14c362689f484dd85061afdaed7956003e01b97be',
          },
          xpub: 'xpub6DBKXGhk4g8UXJ9zFCheVyk4V2vaAexzwLkcXtJ2TJDThgfhdohSCngAfqkKmxfswafSNTedq92MmkQ8k24yZTCRCFQJFhYHAosR1FTr6Ei',
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
            public_key: '035ed56bd9ef4c1740cbb372424049af4a4cc5c2465070e5009e1d37ee1c53263b',
          },
          xpub: 'Ltub2YiY1CVrGc9hBDpniMHGyjwypCGyAEU23WsydxcHT5U2ZX5QXFSjkt8TrapdjebqNsteVBFFyd7RZCxeFRoohtvudbhtGwy5fB4mq6W8WMj',
        },
        '1': {
          node: {
            public_key: '03abbce760bc3e82cec06c160f70266aef395eb3796f0eba246bc3b80d30df3751',
          },
          xpub: 'Ltub2YiY1CVrGc9hFR8NVpsp8VUoGTzzeBSY91qwwwDmtgDd4SBYfbBAEpY7hwrMrDxchbgNgRywaKxNTGwwRAhqurnb7FHYrepDeVbmPFZ3w6o',
        },
        '2147483647': {
          node: {
            public_key: '03cc1d927249782e77e6081ee2b301b8c8452270d3bb7ad0db4870e46e811f528c',
          },
          xpub: 'Ltub2YiY1CVzcGgfMAPYzHrXD4EYbmU1UhiLEoBDh7Sth7pqycyhBMLhUxEkWAKrarJbewxbzgrBmNEE284AYxB2yNdVZu7cg6u5rBkCPQJziay',
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
            public_key: '037ad4074890312baef1d4453840a8be188bc8e7edcd989b051e34a12c31ff1d72',
          },
          xpub: 'Mtub2rx2iwHQXb17MmfkeMAQ2d8W5KqiNgXiKA8GF9sbXS4oKbmhcT8Q4Nbwro8iBRdpNkRkV1sfTyziAN21kFWFtuLuMgTN78rc4LVqr4ueX9C',
        },
        '1': {
          node: {
            public_key: '03ca36971d5a8a19383122e5d6bf0c2e894d761cff66427dd2aaf39a37cf140af4',
          },
          xpub: 'Mtub2rx2iwHQXb17RSo8Vxk1d9ABZSHBRkTMMj1KidmSVwquNGZ8Zr9tC3DBhMBPKuH7jjvsS41VUdhsMpKZSSpYiWLgpfGHXFM4UhQhCniVp8e',
        },
        '2147483647': {
          node: {
            public_key: '032401081d1b722dc89614b1d66d88e5ad55063d01b61bc16ef71c84b86fb980f9',
          },
          xpub: 'Mtub2rx2iwHYsFY5VrUESdWDt1rSvvDqaUzkcqmvDRHVLUpkwD1ywpQQi3yzA3uArP2EYebzNMKUL87aHU6oTfjL5P7UQxwjhicv9LGiGeoCJLy',
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
            public_key: '03967a262202f4e2251c2414146a6d63c2160f6f94b693e5311a3c1f55d5727c8d',
          },
          xpub: 'zpub6qLWPhB6Em9QRKrrQCf8NZU72mroZzhgBL5u7bW5v1Xgc1BMbdkDtrAnGzVYvZ9prssMPaoBjPGGQLNV7hN9fmtnok4N9k8fiBBMrg2gH7S',
        },
        '1': {
          node: {
            public_key: '02bea69034f0de804e5e7963fa91d172d4e08fcc74ad8803cb17f5d1c9453b403d',
          },
          xpub: 'zpub6qLWPhB6Em9QVUETQx2uhrK1QbjF9imj1ZVurqLzt6fdRR9hMshTX382xAok4Mv73c7nPuDXEdUwdqPMfFGpCuS9nrayJnCPzzraCLPQxJL',
        },
        '2147483647': {
          node: {
            public_key: '02e0cf88ad6af16359e596fa80615875166f582efdd4547a6df73cccf872d7f8c8',
          },
          xpub: 'zpub6qLWPhBEaRgNZqhFPJxcT9WdfTR1SUJi2KqEaV2bEzPVG76RAcaVFpz7r1D63Xsk65PYmvKozUqJBahg67amWvh5AK7nUHDaBfmfapQHJ1J',
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
            public_key: '038e05e0cad1698f1028004cd1157261389b067c0e30779c1d8b08bfdbeac2744a',
          },
          xpub: 'dgub8rbuYJgStGD9vBCvXbKTHdHYqYE4ajTJDoBzPqeWxKDhKtd9dA7JHgQEPwck2tgj3GcR96zBTJ57trkpwgaVmKFgFgQftosAhvUscii5ZDm',
        },
        '1': {
          node: {
            public_key: '025a21808980f02a7ec1ba8ec11e96852aaae9ddeac039b395a054f76e5a5a4399',
          },
          xpub: 'dgub8rbuYJgStGD9zbGXAfpkMNx86F8ux1M7Ga69RmEPevfkSaUCqeZCtDoewKMdNUvHJzB3vYycufkfaJuUdke6egSkwXhZqcjBFwKNidVdJwt',
        },
        '2147483647': {
          node: {
            public_key: '02b21390ee576807e266348282ecd0229636d4591b661ce9c2dbfe686cd0a17f19',
          },
          xpub: 'dgub8rbuYJgbDvk85CbLwNoG3x2zSUjeNNbwbLLpg5GNrJvYJPAQuFw9aR7bF7FbdXxqvaeLKsrkv7JU67b65XJmuVXwuurpKx8uELPcDQ2r9JJ',
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
            public_key: '032db7fd61224a9699643be00ed32d16afbe040b2b667478f99cef1d6819ae35a4',
          },
          xpub: 'dgub8sHN8fef1yr3o3YFSQmViUNoptPmyoJxPo32CxT82H96JTjpheQKyQsxJYv85e7HWD4x6TceE83hBhyMZutkyJRVHLaHSSWiWW2T6vXWy6T',
        },
        '1': {
          node: {
            public_key: '0236c767e955c1816d06d607dba3c5365cb8ba96fcb5f1009ae7b1cb2fdab17b6d',
          },
          xpub: 'dgub8sHN8fef1yr3pbXBkDb13ryuyis9176ofcb1ivDyiPoZMEL4W1F99z53JwboXJv1mirgjKiyQiDRVJTxB9uM3MoHHNER3QSvrGJtMvA2EYh',
        },
        '2147483647': {
          node: {
            public_key: '0395b477323128196a1aad0a08e4a492802001f71a2afca7046fe187b1ea6b745a',
          },
          xpub: 'dgub8sHN8feoMeP1uezDG6hwgcaBDgEjWQ8Gdo9thXCUn4AriCdKyKf7dervzZtU4JvMf7FTnmWiYbqAXT5qfS5LbXUk2yFWyzA5uFRz4P6nkZd',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '02591d296e150b7385b7b0327c1c05c75d131e25e1316c5df9324388cf8e57da6d',
        },
        '1': {
          publicKey: '027fda6b4afdb48917843a0423988c44078abdd8cac1ebd11bcec7f2419c183c00',
        },
        '10086': {
          publicKey: '03ad338c29711de58948fa483ef88368c5cfbc379564d700dc031f6c1fdd07c7b0',
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
          xpub: 'xpub6CYaRsXLZyKqKLF3K9p3Ggffp5kvrWHgjDe9ZmD6b4hrvaPoLLS7MSVnWFAXtPcJA8mQNWaqkynCxGjCX69sG6DfnB6KD9Y7YFU3vVNwT8p',
          publicKey: '03e3112518bebeb7fe0b802a7d645dc5331721c83873bfb66d37b8528a529b5527',
        },
        '1': {
          xpub: 'xpub6CYaRsXLZyKqPVhE3NPJrdWrJc5JX1ebAAnPoZhCfC75pBX3uWwJMYrcUnfY1c89EViaUj8Mq8Fu4y1txFxpfjYHfsWtuCLBe7kMmfa5dPc',
          publicKey: '02a7b58cdc08a9c890b5aef494c3a6d068dc6eef6c06f5d09a0b6282b1f63076ec',
        },
        '10086': {
          xpub: 'xpub6CYaRsXLZyTUZxK8ZSf8Q9GSz1ajNANG4JQtLmHTyT1JnE3pRLubRjHXndsGS7pyHaYQLJiS9bR4whDbfgYfJ8nxE9Cz3sZBvSnEu3kSqyz',
          publicKey: '0260213cc7706848fb749073e3967836189a721f46b0128c92b482d24b710e3c7b',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6G3LHDWj7Lm4BcZrN7D4sbLh9Na6ghfrPNeWytE9VkFa9TGW5oguBXSdb5N8VtyaNGuJEWe9wkjddC5wJUxFezu8MkeouPVduFy8HLTx6W6',
          publicKey: '038e186d9cf928aa1444c4c5a2fe0d4c08a7318bbc230d743e129fb4861a04ae63',
        },
        '1': {
          xpub: 'xpub6G3LHDWj7Lm4CzAv5AnTjwY8JQsH67fHpULPW3GDv4gxTLN4FVoATJ6d8zLoQvhiDbUZHczi7Mqz5AHbNYx4ePHGcY9XKXWGg2RYMZLMeEz',
          publicKey: '03012d19076da10af336a226637ad09e2ead56ad0ada4e737a599008c365f4bd07',
        },
        '10086': {
          xpub: 'xpub6G3LHDWj7LthPGHUy6JyxKoLjpshVwof6fN7veKNziLFj26XjGL489gEjtfPsQk3pmJvHtta1Nc532mYVft7nmiqQtw2WtSSpJDZT2Sig65',
          publicKey: '02c01c5dba32a5b562ec0a20d486530b84493d417d3bdbdd9c2c76dfe052e31cc0',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1hzgjtp22xf0s0e5aslavf3pr5qd4mlk4qr2mhvkg73v00sd3z00qjkgcng',
          publickey: 'b89125854a325f07e69d87fac4c423a01b5dfed500d5bbb2c8f458f7c1b113de',
        },
        '1': {
          npub: 'npub19wfu8fpd9n7sks2d7dk9tzvkq7t3sr67gn2kjtd7ara5wwgfj6dsm3cjyy',
          publickey: '2b93c3a42d2cfd0b414df36c5589960797180f5e44d5692dbee8fb473909969b',
        },
        '10086': {
          npub: 'npub14m2g83qtp7tw3p7medqmry8zjnc3xt43z20j4m4285nwtnlw3jmqr2zgwd',
          publickey: 'aed483c40b0f96e887dbcb41b190e294f1132eb1129f2aeeaa3d26e5cfee8cb6',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xd426a95f07a737e68a800659fff92474d98249a39bc5e405879c8099cdcb0b3c',
        },
        '1': {
          publicKey: '0xc627f673c95e39979609c35f2c3f2d6c1f8c9fcd5787c9cb25f06d33febb5cb2',
        },
        '10086': {
          publicKey: '0xa90928936bd32ae84e20d8f6a253cb7f692012036a132e791dba96031059cfb7',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02e999151126713c00cba166dd6710ae2cd4c2880b4063052ba1ce439510d402d5',
        },
        '1': {
          publicKey: '024da538b6180d33629da199f3963757f477d5ede017141ce45d8256497a6391f9',
        },
        '10086': {
          publicKey: '02ebf0919252ac1cbe8c9ced49b19a1315ec59ad20bb6c296ce6950169e0bac99b',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'bdb5f377712ea392136b434cf6427c9ed4e862546684fc4c8fe7562d37589364',
        },
        '1': {
          publicKey: '0055da10447db10873c954c5ebe3b077393e76e751ef5a9a5cf3d127e061148d',
        },
        '10086': {
          publicKey: '4026952fca4289969566408ebeda58e1909642d055ada45a9e291eca5e0d39d6',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
