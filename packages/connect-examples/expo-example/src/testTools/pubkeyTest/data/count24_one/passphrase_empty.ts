import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-empty',
  passphrase: '',
  passphraseState: 'mpZyZrARXurTXC6fhzHdQzs4xVNXCkCbxW',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162869',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: 'c432a6857a36ab8f11ad624915f6fd6ede8df2ecca17087ae263e54e9b302efbe52f81f11ff10bb6c0e76d71d83ac715b4c3646e673484d217d63633b6f32f5c',
        },
        '10': {
          xpub: '2c47e7b37835cf3741623aed4f4bcd8f9762227143b13a250fccef883e9afc76d5b2d0dfec25ced85d38a499443ebf9d5b4cd2848fdfcef67b1773ebd555144d',
        },
        '2147483647': {
          xpub: 'd9a0e25ee66cf2b7b6f46fcdc776803c0691c517e460007ec1faca3740785c758b0c39bf6541a54a0227af320b09ad999912f10e72675a646c8836e8bcf9138b',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'b5bb7077b85e580e9fbf5deeeb68d9f0e03ed4057b5b4f6be26c9825f4bf024b',
        },
        '10': {
          publicKey: 'e3f98a6fda8c16ce9b3d69a892ea0a3e25e6db556a7140363e314337aee55040',
        },
        '2147483647': {
          publicKey: '1aded9748472330f6e2319933ff5f07bbd760d6361ee8a465931846784a5be92',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '02a0681c7a2bcc3b576a8077fd062762b74d75b60c65d450364e126da8393032df',
          },
          xpub: 'xpub6FxmLDUWgApKoXYWUApdowrzq2Tq2RJPwoYHp3EQ855USAwuoGL1qjT2SUkCrehJquHunZtuSMRGk3E8B6aDz97X2AmGPrUpan9om8HK5pV',
        },
        '10': {
          node: {
            public_key: '037f6198c9211620cb86d92708f1a70f02a9be8b1ae07c11b46d9f24d6e8c61865',
          },
          xpub: 'xpub6FxmLDUWgApLDyvRtyMAm77vzcBAs4uu9g9b95EVuutL4fhSf7xYqtkVHb9wMzBLCzygzfdpsMSGpwcp5hBWhXL34RoeDNgJxV6GDLLz9ns',
        },
        '2147483647': {
          node: {
            public_key: '0304b6607238dc35dc62607f916781d9a86396d80ec286f9752e851d76d6575957',
          },
          xpub: 'xpub6FxmLDUf1qMHv7e9hTQ1XBkZeWPZwh7PpVuF3skAyXEgPoqZMhUdFGobxrxCHFSLownkzMKE6a8bNwukASZfk4YeUNRv8XdqS1YZ1hT8LeH',
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
            public_key: '0243db30827c74d973a160e4d30da0c4aae87d740edcf9c05eaabd62f7a0904713',
          },
          xpub: 'xpub6DGvuAqse3icyBCAaTDx38WmCpb3uMqZHDgXktnJnU78RSZVZxPqU4AzoWr4d6Rvdpm7VZbQUeFoNN3i888TaL6XbGsFM5QN4edQMuo1XRG',
        },
        '10': {
          node: {
            public_key: '03b810eb15882dae619364974cad65677466714e7a03833fb86cf3055d7f33d40d',
          },
          xpub: 'xpub6DGvuAqse3idQnY7Q4xqcW62N74Ra23aJEevM4qrbVgxzrgzcCfin8yW3VzBha8j6FXNkFZZ4A1NX3eKUZbnGPvFfH4fzMkijMhrTvgc2U4',
        },
        '2147483647': {
          node: {
            public_key: '036f0160c0a531e8bd983a590fe49e583bcb54e7a4844aee2ec88688d1bc5b8210',
          },
          xpub: 'xpub6DGvuAr1yiFb6Eb4J2wF8gjXb76Eih3cHFvmAibhET6xnRr3kyrZFmvmM4jN1KWBF97UeQhj9JDdXfefmtbzMtUT9VbVuq4NRaSKeRhbFmK',
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
            public_key: '022d1e6fcb68118ff40a4fcbee88cf7a8797b8d8d0af97e1557155126a8a1f7d98',
          },
          xpub: 'tpubDCWXsemC3UQp4kkH1QiQLkcsm46ZuuCmyizmeSpSr2tCGrwhkuZpxUEScZQN374n45uGQzTspSMcBLShj3qoVYfY8y9JV55xtG8nRDQnDLL',
        },
        '10': {
          node: {
            public_key: '03e2fadd729cd1f8238ca7b11a4e3c0e4eab0ff2cc8e1499aed09b7479a5bd2ff3',
          },
          xpub: 'tpubDCWXsemC3UQpXDcPezhZ4bQfit1JJLqzsx3FXAdxU16oihKb3UJHmqZpcxKT1r69Jo9vi6Ru7fg2kM8usR1YUQs4aHXPBVQqwNL79Da3i1v',
        },
        '2147483647': {
          node: {
            public_key: '02da9876876bf392580288dd5c166c91dea92507ec0469b9f4c035f17efe766424',
          },
          xpub: 'tpubDCWXsemLP8wnC8g8vpE9GWe7w2Dg6RuZ8VyYJoVvgkiEgKTELWihXdjiPK3JYXbn6tWjpTmz8jR1A4uGM9ws84aLeA86Armx4rbUpc4hTjE',
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
            public_key: '03ba8c9911731abb304c27fb79870b62989a73c9ab89e1cf607fa3f6a73fbc3104',
          },
          xpub: 'xpub6C3ExFYey6oPYsLqKTx3Uvi73ZjwuAA2WGPvPiBYfxcndX4qYq7LCj4icJRF6Gmmc6jPDkEVmzFZecJJKSqMWRHLyowFBUGBmSNv4KVv9fp',
        },
        '10': {
          node: {
            public_key: '0360a1bae12ed3a871c83be6c4b965a0b7054c6ca1cb9b824e256131767f5ac13d',
          },
          xpub: 'xpub6C3ExFYey6oPxyvQ6uvE15Mjn1ig6Yj5c7tYHmvjJV3EYxiw7ShdU6BLXJgEbTh7Rh6pQfZkxT1oJd9J8uos19UJTXNpohc7vVdVaij896Y',
        },
        '2147483647': {
          node: {
            public_key: '028a0c64a87c70d7f3ddfe1b4c8159f4490442c41cfba3db182dde46cbe0a5ef07',
          },
          xpub: 'xpub6C3ExFYoJmLMejjqrLcUmdBfAeJ4wsGQqEfTKqypAqnvVF6C99kXPBdrgsdkbT7TbJrjCBtmDakQihPptnQAdMx7mvPKBqGaQWqqCzBJTdT',
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
            public_key: '02dc4d7d21823bfcf2733ddcb02b3f18474719bd639836c34859e5694d42fb1a80',
          },
          xpub: 'ypub6Xdrn2AmU6gDwYgAHScRAaTbTuZauT4pvMHaWxDfCJvtj8NH3zuo5c4etTjspjm4zDZTiu6s3QGAPXdxY3M9ktTMu5ckaMdSCn2y2PdyLJa',
        },
        '10': {
          node: {
            public_key: '034dbbec0e2a75a6ba66d2f9a8bc89f7a9a0e887168c15877b7c737e7eae41d663',
          },
          xpub: 'ypub6Xdrn2AmU6gENR2U9yLztSe3XZ5LCdWniDsfyD1SPNZo9xRjj4tyJY6JLn334LKMgoKEEXUx7DYbmGfHBQgZcygMmoTUkUZT76R8oNRnKDk',
        },
        '2147483647': {
          node: {
            public_key: '03ebe3d5f3eaddeb3b59ea7d6d3333d96856fda3aecd2ca15b804fcdf0e24af80a',
          },
          xpub: 'ypub6Xdrn2AuomDC4vb4ghDdAzf6eQf3vPCypfLR1xWX5u9F7XWDdEj21335494LWHJpthucXR5xZB6D67Vib2AAL3Tw8bAK7mPEiF66Faw7587',
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
            public_key: '034b513c08885b48cf93ab567b6385d530794da5eacb459737098588302b2ac486',
          },
          xpub: 'zpub6rW2eK4Th1LCWWq5cXrCsVo9Xymr1M54VeJU5dEXvC2i9aZ886cUeUNzRBFcpoLWVVU9pzBy3cSVkQzJBzCASQv9LZW3sgeBYNASSn5zi54',
        },
        '10': {
          node: {
            public_key: '02279984c6510892902e34d52bd076263d59bc6f617bc40c0bf9f9498304b55403',
          },
          xpub: 'zpub6rW2eK4Th1LCx39AWGkMNxQho3c7DbZ4RU4GgAR2N6hdcDH19AYVkoX35YbZxerP1e4ZhzMeSUxXWWMjD8WJyEsTjdHjuaR6KCVunuRhrFK',
        },
        '2147483647': {
          node: {
            public_key: '024787fa6c9f61dc82befbf1bc46a5fdff1a4d86431e7512f9bef80bf7a245ee30',
          },
          xpub: 'zpub6rW2eK4c2fsAeGPWLiskwbmBeRvCsNUfVff3dRSPT5BbcJftR2FPG9xEKupg77L5AzJGfsyDc5bMPXZhSxgCwAeHmjnucxspgWVG2HHVwio',
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
            public_key: '02c769ba10b918637e46b101bfb4d3c35695e76195b98b570310db695671bc2c27',
          },
          xpub: 'xpub6BvdabSr9FM5BjyUgYB9nw6hAewjGRKoVWn4494SKGYEETCi9kokfsKwmqAVG2yboJyzgqE6yRpz35jnhkPBwfJhf7CwFDdfRgaRdrovKW4',
        },
        '10': {
          node: {
            public_key: '026e02ade50baccbbd074451118a20942ee3fff6e6c576bde4cf2b6b596ca93fb0',
          },
          xpub: 'xpub6BvdabSr9FM5ceaz67CrueezNFd3WyD53BzThU4PuQGvZuhUMnEQWAPmLP6jpHU1szGJ45xEkV7Pfz73WqPEfS66qfozzGJBRZsMRHNsHk8',
        },
        '2147483647': {
          node: {
            public_key: '036833e318aef9805b81c4b347ce9a0beaa0a035463b31d9ab560a68400038cab5',
          },
          xpub: 'xpub6BvdabSzUut3JiocmFos7gJqmTimsmz9TrZ6fhDTpkXojzE6j8j97jeYbE46qyYUxDoj3yiKpZGBCkyrMsVnM2tfTMf1A2kuZdi1haLif1a',
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
            public_key: '0315bf043952d6b0e6233d653bb2abc4c7d9e5558f236d9fde925e77832882c1b0',
          },
          xpub: 'Ltub2YY4ai44qYLBtz97XyR9uJDX28aFwmUAAYu3ncZqixujpvHec9CC5pKyJA76dYdhGQL7m2majvvBKa1Dg16sZu3U2JLRiwrKjWfHDUTUB8o',
        },
        '10': {
          node: {
            public_key: '03f93c837c52bfb897674e94d3fa29db3c0307bcb7be0d8b274c975fa0ae6bbf16',
          },
          xpub: 'Ltub2YY4ai44qYLCL2Drw62syX9UkTnSrxsguCbqpsMTpj3AqnLb5RUR1w7qbc9YZk4tEmCX8d9WvtV6C7n6p2QLepPYe4NHnTXNxVuwNKK2Ccn',
        },
        '2147483647': {
          node: {
            public_key: '02a5c4de286da7401b83d5ede0f0f931407e72d8ca0a8b45b56a5776d2d3c72611',
          },
          xpub: 'Ltub2YY4ai4DBCsA36EwQfRtUv2nLkDeBa5UPZfBMYs4WmoKwruy2sAUh3XVmwYkSwYAzRqjyM93mnuMipqbx1eJFj3bE4rKdojec13vdbk3sj9',
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
            public_key: '0251d214e0f8d190beff0a14efa38c234f99873213d9b61a515ef2d690a517645b',
          },
          xpub: 'Mtub2t3tQa1DskVd7UEmbEdXcBqoWk4duNbXWTpDwApcXYi6pecRBXPMNSRb87C1eHYE2HwxaxeNSHyce3f5CyYGSbbHneyfYhTszcwSdrmP8Em',
        },
        '10': {
          node: {
            public_key: '02a097972aa8ff12358274fb3ed9f2d017d33bc3595fae9448b0d92d910261def8',
          },
          xpub: 'Mtub2t3tQa1DskVdYqXT3rHBuvVMiDzXbNBPfNeCS1sed68comn1BS2kXAvA7EsfijibnEnzKRNgQs6h8AJmhsPV8FsS1CBXom5KYTy8YQZ2M3d',
        },
        '2147483647': {
          node: {
            public_key: '03eca39a871eb108596884fe2558fae4caccb68166e7c9f251af685e056464b5c6',
          },
          xpub: 'Mtub2t3tQa1NDR2bEZvzBPhAEbvz3fBQ3R6FVSmYgrSTFoYsneH8yoKygizRp1YM2azHDy6MmGr3Yq2G8jpHzZUePoiQrv1NRANqPouvQRMv6md',
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
            public_key: '03b7bf2923681f3d136ec886140063f6060860413a743e6fd2fe974cbe3e1a4597',
          },
          xpub: 'zpub6s8vBZzMTPGceihuSSEuQYoC8LeULNvotgrZkwrr6J9vApwBXXKtSTSwUkV8Vsbrp7YrKQFjoLmQTbdvSbGRGyyieiXy1swjZRxRTpWtaQb',
        },
        '10': {
          node: {
            public_key: '02b6f366c144afb27a79a707a58005b0a2bb72bfd8a8c9ee7af3b94affc5aed60f',
          },
          xpub: 'zpub6s8vBZzMTPGd6CqWxjvBBdhp3jsxNanyg3TvtChfoGDTaUHSLKFt75AcCaQ1WKSnAYnPtWJkZsNYKuoCm4UDAnvwd69528RCSZdMZouE6PN',
        },
        '2147483647': {
          node: {
            public_key: '038491862f5931ae25874c5cc60d229001d03c7ba7b5211499916bb577662b5cc4',
          },
          xpub: 'zpub6s8vBZzVo3oamfmU7iz9pxktnMkWEqyf9q3RPDD3QG8gnEy3SmoJhnGxzCHUqkgw5hA7LXBksomUNgvgUym1iuqQ18yWh8EZRYYsK25S6po',
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
            public_key: '02b926442bd95cdea0719d366164531a705d30b121aef9b1f4cfdb093623ff379f',
          },
          xpub: 'dgub8rW8HcjduZjGABFi3pngn5Fkr6Happ4kquCEXHxCZ8xTjWNaKkuBPjqhVHQszQqEFmPk72gHnhaWp3UsYHQczM8i9QGvG88aLiXjmXT6GZW',
        },
        '10': {
          node: {
            public_key: '0345ce64c1789780f0155647eb86e2fb0d7e6d1b5adf63d5f44f63ca849a424808',
          },
          xpub: 'dgub8rW8HcjduZjGbxm9DYkLCpFNrBiCdX96HPjKVi2DJCxituc9QW26DPkcMuj7hFKPvooxrVxNQjaezkxnznVeh84N4JqTQq9ZfuhvV73h9BW',
        },
        '2147483647': {
          node: {
            public_key: '0244c5bdfe2f2fbae9a5dcf7adb3dceea817b89c91b92450ed195cdb86a8e8ed57',
          },
          xpub: 'dgub8rW8HcjnFEGEHnBRWSJtyqTsKNPbEExpMdWAthupd3fonDRq3xMTgdJcb8K2mVjGQrybeinPjJrA9Xmz7w7EkUwCBJ4ZKLnzxmS5UqRKSvA',
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
            public_key: '021810f2d56ab5a7a42f5c4a9de6360c4faca1ae8adb190e8f5740520f1cd6b717',
          },
          xpub: 'dgub8rQyn81By4MMLHsnoXbPz924YqXpGN2XMRCDiqGXp1zxXuszBP3D8YGMLZJdh4wqjXj2nx7DdtE4w9Vbvx7uFou5xHmd3nrvfdF7MpkEkwQ',
        },
        '10': {
          node: {
            public_key: '0320eb1359f9baf4cf19f337f9c2506f257d0d8375f66ad7ba713cfb09cb249604',
          },
          xpub: 'dgub8rQyn81By4MMokeL6QbWjpGsaUna1AtyM4hCmBbspfRfSENAsJjv8bTgUCxpqowVyAPa8y6JLxEMLwRT84TqgU4PTEMCe3rYZYvtw9VcqkC',
        },
        '2147483647': {
          node: {
            public_key: '02302920aafa0c72b29b3ecb1538cb0155db582b9c6686f3bee213af70b4e9bcae',
          },
          xpub: 'dgub8rQyn81LJitKU1AL7vbgqJ1QGatB4AsWecMnv75mn5QzQeBJXxBiEQqKKQfLA3EP5jh7Dfk5RQJCXQjzWfLgLEYhaX6zgaoirpvno2PZD28',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '021e66b46796d6f24172d93095e9b2cc88018f86cdae1db3a7cffa456bbe17587b',
        },
        '10': {
          publicKey: '02273023d3d42154330e5764ee9316d9d3d6a2ef7ab1543449891d95d81c761ca0',
        },
        '2147483647': {
          publicKey: '02fbc87d5ddac492ed2420c191edb93aa98cfd06cc88dbc138cf8a84587e21e51e',
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
          xpub: 'xpub6CFhfNmUggugQNoMNjVb6zM9LU3K5znVrocZNUWNsdng2Ly3bH9375MzXERjRznrC7xSDN47EzKFPeZUB6zHx2QGNHiTQUEDxjgXu1KmtS8',
          publicKey: '0294f6604afc77dd56aacc9ee0b672ba3603fb86a420308e061e44705411086e98',
        },
        '10': {
          xpub: 'xpub6CFhfNmUggugqZkyYdf5TLPGa7KMQwWWxBoT3ZdtWB3x8yhN8yA87BsvfSftCCRCrBPa9SC4WMeWUrz711Rt5GiFNdEXHUman1cBQLK7Y96',
          publicKey: '029ea1744ce3d6806f1b4fcda144d16f163c73b90b218b8bb5f2c79912284c1b22',
        },
        '2147483647': {
          xpub: 'xpub6CFhfNmd2MSeYsG8p1SkmuRnzH81kC8sLDYyQgrfdmDfHhmGQDcYhG1vepTLJqXwWBnXXuTWdsv27xxNDQz86yKsdb6Sp7Ag8SLTceTDZnY',
          publicKey: '02346de861234888a0767bc68d1ead59c4d3701e2abef3d5305b359b75e9f9b6b4',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GgPGALJNisjXz4ZPkDSqxW21684Ziua8aJWvVPJLvrMXrK2h3BEJq9r11e6MNspgDB4G6W5iiUzgHUmXAggLmJ5ozt9USm1nCjt8KkeGzE',
          publicKey: '03d37d4b2cbc16b7d086521398119281e42ade5883732913ae0e47f9796f23ff56',
        },
        '10': {
          xpub: 'xpub6GgPGALJNisjx1fbyx6JhSVyPA47YvzCm8dNrLddt6s4KdfSPpi3YS1BJjeFsrosj9jgw8jw1V2fzA34gVB49JFJziBL1HvLn6CigxkdN3D',
          publicKey: '03e515eaa7e509b0ee44a57562ea64617f2affeb316ee0eb5f7c1a84835ebbe7ba',
        },
        '2147483647': {
          xpub: 'xpub6GgPGALSiPQhdvTSaF1aW76UGLv2aEcZbyTbRgYkeuwd5SVMTXaFzq5TELB3woJy8iDTjqJ3WucC7nXDqeuXf5J6GqE9wZJUwyN4D5uaFqC',
          publicKey: '032e31e31fc5ea5b16d9f0d3b0335e790c3ea7759e0ca4b7e59b1796bee0a03264',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1edn4fhtmu2k4cf9c4z6lf5kna7q8t2t7xwg63f7ng0sf5zzrw38s5dvwy4',
          publickey: 'cb6754dd7be2ad5c24b8a8b5f4d2d3ef8075a97e3391a8a7d343e09a0843744f',
        },
        '10': {
          npub: 'npub1mzykz9wqyuy93u0szc7kl7qz3yz57ptrugjc85xeyr8hs5x95wyslkn2wl',
          publickey: 'd8896115c0270858f1f0163d6ff80289054f0563e22583d0d920cf7850c5a389',
        },
        '2147483647': {
          npub: 'npub1562zks44ujl8a6slnl6txdn5509jwmu34t6w73wne66pfyvxwmasy8hwc9',
          publickey: 'a6942b42b5e4be7eea1f9ff4b33674a3cb276f91aaf4ef45d3ceb414918676fb',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xfe9d310b045b06a963aa9d955867d3483323576af054b589995151c6d50f593f',
        },
        '10': {
          publicKey: '0xec93e07b473038aec486e3f7f3eb204e7b77a877c8c71dddd2a47c2660b654db',
        },
        '2147483647': {
          publicKey: '0x21faeeab1f77ef04785325f365126773f0efb21affb5aa42003f40687bb6352f',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '02a05c6bb759de0ca57c0dbaf2727a0a8ced7b43972198be2f40f7f6987c0212ae',
        },
        '10': {
          publicKey: '034bed16fa979aab0847df1e83b60eec550fd8a66ba36a5dd52a7811b48be7fa82',
        },
        '2147483647': {
          publicKey: '02ba4e0dfb5144df80fca99b60bd4f25b04dcc7ab3aaa0827337f657a903c742bb',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '068221b7c674985c220c296f435133f56fc0ca459937e064db6e35f4613f9845',
        },
        '10': {
          publicKey: 'a1e54308a06d0143902b57bb4cd8586d3e7fd106d15c94790b0a25f45d73306f',
        },
        '2147483647': {
          publicKey: '6cbcc66bbe9e6de2c8b8cf0879933289559115b67df6f58b80c51e57d1938869',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
