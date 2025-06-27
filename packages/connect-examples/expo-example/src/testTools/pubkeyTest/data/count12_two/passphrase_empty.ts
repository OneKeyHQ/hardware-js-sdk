import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase12-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429457507',
  passphrase: '',
  passphraseState: 'n1wHog59hyJ8aABwa5hU5UCBjrgE5TWYSa',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '0b61b7421596ff95c730a8ebf65387de538b9a941b4027655d896039a4cfcef7fc88fb4add2c1fe02003ee7f4a1829ccc4030d54c3bf21d190214280e3181c62',
        },
        '35': {
          xpub: '6996458d2f8fdf65858383ef1319e8b2862179520da8d755265050c55bb1e022fdb0812fb626fcb1267ce426bfd357deaf7cbdc4ab49aa29e99b189a6d2f2478',
        },
        '2147483647': {
          xpub: '7f533307829b29ef44870811dc283bc8672bbe0f648ac05469de9c40bf2e82255e74d70cd2163f33b5128b123bddb4d75a21362cb6e2458dd40cd6232c983dc2',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '276a214c366d708f0a6c31f28eb9029beef073e94070489c3efcc8e3188da689',
        },
        '35': {
          publicKey: 'a2776ea87272a2a660e848c864afc602241cc75608f9a32c2a77e091e654a60e',
        },
        '2147483647': {
          publicKey: '81157f77a868e2cdd0554db705bbfc108fe414451e1f6fe3dbc503b1f533864d',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '0281ffad4a5996196aa4f2f5a38f91936ec72b6873d48082428444fa6e9ab77099',
          },
          xpub: 'xpub6Gi74SKxws4tcH7z9ycL5cXdjua5ATexc2EUTcgV7y3XBemyRgW7DuTxsQhcZTv63NeN2v2aeMDawQP6rWgyGnQGZ7udFLSNQAMrET5YD6f',
        },
        '35': {
          node: {
            public_key: '03d12ba3bf337c6b94daad4735fc7e4466be7bd41fd8890b3eee7ea2bad109650c',
          },
          xpub: 'xpub6Gi74SKxws4vBAz6F2RRjy5ebWVExTpXuLcTG6xZpK6Sopp6d6gQt8cFS8DJFf5oVtF5LGYg59mnmdBzSggtMX1MxTyvcAWnKWAkFBEX52q',
        },
        '2147483647': {
          node: {
            public_key: '022e80f16c9410e724af2ee823c2f5e272d94cf90357adf66d0e875c3d58ccb31b',
          },
          xpub: 'xpub6Gi74SL7HXbrkA48oQ6p7iW44VefaPgmE9LBHKSC3bsHwokjZhXWitdNJvituvRTpuAegMbNL9APpMuNzbi9hQsebfebf52FKdEMitjsRKQ',
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
            public_key: '0358625a225f363e2aaf43d1537f110575d7beba34ae256812adc1f050665722ea',
          },
          xpub: 'xpub6D94UzK7omqy2dzcnhV7ogpPzMvW7ynF8oqM4ypSZbLQFTv7KdgAF3QK4wRGewUUGWp9VDnJay6WQZf5jRyVFbHCYqJx35HQHwbUzqjC2NY',
        },
        '35': {
          node: {
            public_key: '02b6d2599ac2e1e13f96c278ca14cc504dca16d380b68c12ff303657d0cf183815',
          },
          xpub: 'xpub6D94UzK7omqzZMaJiULMcs1mdMDZwK8V2BEF9mDYt6EnGP7w1mxoKNGbKiATwSZpupq9ikmyh5VuxqzaWuT5mgRd3awuq6Bu41xNzTSLRMa',
        },
        '2147483647': {
          node: {
            public_key: '02d2e60afe9bbea4730f591efa3bf8669e5a36eac9a9ae422b82259100b8344df4',
          },
          xpub: 'xpub6D94UzKG9SNw9PzJVyACT1GVgWw35WgAbaHXBpg5oNHDzkUMfWEDJCfNwLMpVoGFXvRFFMgq2qZ8TruyDMoy1ZjbMwtZo47McBPjc2B4DJh',
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
            public_key: '024e85509e07353267d15f4657f677fc31593d384b57d37dff74ee5e7ff7546d0f',
          },
          xpub: 'xpub6CrSJMRZQ5shhsRQ8CCeUgaBxWpA2YJfG1NY1qCxwuyoh8NcHR2dRCj2SL3VGHT7swyLS3HoQgnRNXo8EYzYMfbZv3zhnDJyFbYHh5LnU2k',
        },
        '35': {
          node: {
            public_key: '02e1e9f281418965cc3b1d7cd6748c8a6c00ac677b48a2eae96c31bed04428bd17',
          },
          xpub: 'xpub6CrSJMRZQ5sjEj1VQL3rCfhgCPC51Gw2j5Dz5tAdQ4HEpbJXf4XUCstWeWZ7A6WwYC4Fa5cFbj8oLWnx2fBCLyF3FMmpNYtLWbJNZ92L6NB',
        },
        '2147483647': {
          node: {
            public_key: '024dba85bc610f85072db3d75ba99bc20b432bba48d503c791690d42a7cbdb683a',
          },
          xpub: 'xpub6CrSJMRhjkQfoUT17cmQ2Mmed8F4QiiKFbKcuLwAkWnaxRocXPqovL8v5pT69SxtA1QhWnaVKDn2iWvWJ85Un5iPoakuNKMrofgp8YEC6bd',
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
            public_key: '02ec63ef6804a527257d0ca6ebd9177bdc98cd3c8ed471f336527cdb5340d87eb1',
          },
          xpub: 'ypub6Xgudg6rksG5rG2mmv54rAdw6GGPjDZqHYCZAskSn2s7EGw1irsDcRjEprYy4yKjDGi7V4Ek2Pizv2JXdUZB43WPRwHKsWgExEhBy1xUhQb',
        },
        '35': {
          node: {
            public_key: '033ef6fa6d40c4bc97cec853234d85c8d7ca8a0886606e3a9ebd4b9ee2d1e6cb51',
          },
          xpub: 'ypub6Xgudg6rksG7NoP8Xu3KrWtFP4yN9H8cMyQrSCS4JJAJba5xmXM5ij4bRRoNDHAA8kumA36kegtSsXiTmpFq5mKst4MQgZrvYnzhX1JpfrW',
        },
        '2147483647': {
          node: {
            public_key: '031e6b49c6434a393c2c7fd20363bcb46baa43fca662e153000e45d6018dda236a',
          },
          xpub: 'ypub6Xgudg716Xo3ykzTucNXs5i6bfGsfqtenxt85dqsQAFActntKiZ2iCh1nwkq3fuxR5x3ueF3X4vkagQGsfcD6KUjoEThLg5pfQyxo6yc2iG',
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
            public_key: '02615410380a3ddb699ebfe20c001cca8906d0fb2d5cb4354628ea660db07de652',
          },
          xpub: 'zpub6rN6mKMUx2Zxk476hdMNsgHSyAyh74Hb9ZSQgPc9WFbLvScSDatjNMMyC5J8vQVyxPBPphLdLTJxrU7f3BYECtko8ARG3pE7JUmW9nKzLy5',
        },
        '35': {
          node: {
            public_key: '0263d7427bc94d71cb9af9298def1bd98aba261a56af7dd31621554432faa80dfa',
          },
          xpub: 'zpub6rN6mKMUx2ZzJFTDsUVZHhKwYUKW3UZqBTh63a5ntGHa9QGwoi4xpchzbWENSL5SS18sPjDh3qvCTxv1cZfyLDkoEw9Q6VkxnkmaPEPnPPs',
        },
        '2147483647': {
          node: {
            public_key: '02ffeab6c9a23bd813a5331c0e0ffb1dcf054123bc422b357be5a35562599c67b1',
          },
          xpub: 'zpub6rN6mKMdHh6vssRGrP3yA97BAM3CfQUZQcAMwdNzJgC96f6J6CRik9DpRm35G2ZhupYqmfxvedmTmFGaB8ooLhWJCGkjSx3BpbKak76sKAa',
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
            public_key: '03eff4927dff4a971a6947c18d371c642c56c13ccb7fc6a2c235b3a89b97c8d053',
          },
          xpub: 'xpub6DAUnAEDnP5P9Si92zeEh77rbdckmrHiXjMYWmLXnQQ9QRT8bLQGJ2sQhfBJ2ics1FgpMa8YTR3gwgHBPKrW6E2xL3vDfskKP6GiTHSehLX',
        },
        '35': {
          node: {
            public_key: '030c384e494a4cf6a3e8591bad2ca17e7a2c3ae96e8eb3644536207809fc54a56b',
          },
          xpub: 'xpub6DAUnAEDnP5QhDkWmgMwcssVhR9wjEPciE3sG2gcvKVz3RyvPnA4MHS2T4PixeoiTiGrP363dKaTtSGABZP3FGa3YAUocHnnnBjZXw7rpvX',
        },
        '2147483647': {
          node: {
            public_key: '02beb1bc027588944b54afb2a9e4bc9b73d6d677b29234b6bf29d3e43b016e496d',
          },
          xpub: 'xpub6DAUnAEN83cMJaDUDc1syFZxQXEufoNWTjbaUwrv21cMwupVq128hN5Jd3mNu86vhPayQXrbEcpNVLT4oBhreNJnJJqbt2TLTtGB8t1RYtT',
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
            public_key: '025f68f935b8b48eae84f8177b5f71a55c1a95454aa4ea0d7bb94ac1258bc18948',
          },
          xpub: 'Ltub2YJm7uPdw6HkG19ichJJfpw6W4sWGBKbrUYUF7G9KJV1ZWUmzHnjMh4pp4uSkr5N8kVdFFBefj3cjeJMrRbHfHMKpYVsFxt1ng5MDng7cDT',
        },
        '35': {
          node: {
            public_key: '031ac63cbc20c08971f44a4e58a326e09f8c443231ff01c14b5d811671e7d69226',
          },
          xpub: 'Ltub2YJm7uPdw6HmpRNezMDSNqdHjGpjHqikeQUTLtrgu6NTznY6c34Ybf1jERHVxnioxP7qLNSZD3U28YVUnJbH8pNU38x5rWcTxtQWwHYC7x2',
        },
        '2147483647': {
          node: {
            public_key: '026c3851e7bdf0da67e616e313d2c00a94736e1805c33193012126a5dc01398c16',
          },
          xpub: 'Ltub2YJm7uPnGkpiQmS7A64ANuYAgrZsYCMYCXuZo11qdqaVsLWtiuY6tsZMCBU8ZsQ2pRdZAnfWaxeSShjktkwirvUqbErwcD7fmNBMquWa16c',
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
            public_key: '03186c390c57fd79fe2e8fdbd4f89c96ae3ddb188e7d721734adf05bc7f9da994e',
          },
          xpub: 'Mtub2tL2LTVi3PgCv787H4bEXWbWqWkcC7dMWui5Q9MoRXfx2qe3qRjdqSaBmNd7MEAZyUXFQBr7a6FTTcaaUWUDAHsYGXUsUX8R1MzgykVEBwQ',
        },
        '35': {
          node: {
            public_key: '02d557cebf40c5c353514f3f78e916919d992e6ea58bfc9119d8b1396228ffbd98',
          },
          xpub: 'Mtub2tL2LTVi3PgERUdiSmaX5BNJs19ivbX463vs2of41JjvnmsUwNyG2wYH2KoAagqsjhERLggngHPJmNC1UJ1bDVDFBi9Zj5SYyQBLQ2np399',
        },
        '2147483647': {
          node: {
            public_key: '02614d9e2d8853f73b0a607d1790d6f5c59f55b15b1bcb938b214a1a69afdcd885',
          },
          xpub: 'Mtub2tL2LTVrP4DB3Ds15hEdPL2ECCPzZBQrothKEk6yT69iW4xYnXHNLjV7ph8FvnAX9JXzj44ckUhMWBE5AjNvG6M7M11dcZUMDBEL2FxZArH',
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
            public_key: '023969ca8308b239e7fbad0efb2d01eab519f98c2854543dcc4ff4fcdc06f21359',
          },
          xpub: 'zpub6r86sYdPNahPKcwgXscS9PvA638xtKmKCmcSG7gATcTXNfbzWipHkxVEZhRQf8B1ma7sJkUykY4mtKEa7aGit8crRVfr2pFJgxM696CsgFa',
        },
        '35': {
          node: {
            public_key: '035c1a2103f115dba8d0e361c0cf67ca5b5296ee2e5f3b5ea438f6ac04a4c15bb0',
          },
          xpub: 'zpub6r86sYdPNahQsZNJpPiE2oVPAPF9C5D38x2BapRztMpMjw788yhRrY1S3Rs8zaxav9SxNZmueb5HFtLh7jQwtUKW2GrFW55nuiHg5wkP5iS',
        },
        '2147483647': {
          node: {
            public_key: '02de2318958a6d0a0ab4f9fd3010225baf6deb460798f65b9ac90634a4558abbf0',
          },
          xpub: 'zpub6r86sYdXiFEMV8uknEFPrkF2D11TK8kgCgVoXW42s4JrsoeMJZRYkH1WseaNrK37eexZKqww6RzBFcogYbtp9gQQGHahKVWDR2RDRomFQpL',
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
            public_key: '037b1fcf61a2a3d339e921dee8be6925292486f21e791c1f248936a1f7dd3a93bc',
          },
          xpub: 'dgub8rcvwa4p1fyquVapDARzcyaS5oQctHk1LfFPSie11Jxdczyspj31kHNM5pbo4sVr14fLcXedj2aiPsuFWqnT8dJoWSMEfjrWjr38VjYmT3Z',
        },
        '35': {
          node: {
            public_key: '03fd7912e7ca5159123a1ae255b2f03297fe8afd323ac9869f661b35d248472b99',
          },
          xpub: 'dgub8rcvwa4p1fysSSsmpWG5fhGtVPq4w6NhecEc8CHptqwYyhXhJ7wpBY9vkvAsZj52KPXF1ffkv3ohEHu1DTijnaKzs46iHAdLLRGPYdeTyoS',
        },
        '2147483647': {
          node: {
            public_key: '03d88436bc2f8e0230b2e0ea0450f376e7c5d4badb981aa5e6f6e3a30af1dd86ce',
          },
          xpub: 'dgub8rcvwa4xMLWp31bbJGLcLCvar6wqLHWyWNouiPzQFVmodbNczKuGKiGZatZ1Qc8MhnEKQhuWAguMNZtJmKt2ktwNHvJfiT1aPHVDZYULeH4',
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
            public_key: '0339049c2670c26019c4778a9fc0fb3689e4ee697cd8d2901ea674ca3f3bd50788',
          },
          xpub: 'dgub8sfCbcySdJdhRZhMXjxkpcPVrHT6RPEphVDN4eM1pHg28KX2ggmJ3F6Bqze29BQ5RsXj6vPyqS9mvTCbvBEMeZZiFSYCL8BrZQ1KxsbfEzK',
        },
        '35': {
          node: {
            public_key: '03739e1039187f1bc7c29676080e1be2991ec15b021438ec6e0df00ee590d661a0',
          },
          xpub: 'dgub8sfCbcySdJdiwu5vmDrZMTkJ7U6f1YDBb9qCr7VRtyrR2W5SzAHx1KEy2puhgCBxVGMCDZkF3iUWK2oRdNBxKxigvGtGpK5hd9e2xv3y9Pu',
        },
        '2147483647': {
          node: {
            public_key: '034d36594ba9753ba58021345dfb21f4f5df3acfe754ae23cf72782de6f1a8971f',
          },
          xpub: 'dgub8sfCbcyaxyAfYiXf8TGJGJwtKUJLtv1Rm6bg1HMx3cmWjXz5zzEH8XZerbXbCYWJP5oNLdHXwaGavEkUKSd2jb7EPof7uAdwUaXRaBK9Zvr',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '033fd29cb69131b8aeef4abbe3366bc4f6113cee9eadc9e554142d931ff80b73af',
        },
        '35': {
          publicKey: '032c551ebb4d63b502069ad01dcd0cf6402e4d034b3d9f6b88ae8ef39575cf752f',
        },
        '2147483647': {
          publicKey: '03a881030f38f5b691820d9f592f839bc27dcc78159d85f0d7e9a9cd24ac7c041b',
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
          xpub: 'xpub6BzDxeqec9Q48mwC8RnmFdD3ZpbtA7SV75w9yps9EFMJ2DaML7jX3aMhciiBJDSU5oadpqxYv5KSQvc9aFzWiNyNzPEDKwRGVSXhdQkTVYy',
          publicKey: '02ff7037ec434ea3b0410935540f1d2524b9be7389a10a39210ade116e40aebe0a',
        },
        '35': {
          xpub: 'xpub6BzDxeqec9Q5fd3Z1tLatrNG8oJA7UkAx1u48Ayw3SGW61rGuYyoJwesvru6ZPK3x7V2CHMoxGHb4Nag5AL8w8fGoMuctTcmQY2MQeAepWz',
          publicKey: '03b6b1885eaac01cb3669481c538443851449eebb5564b543ac4898307f07030fb',
        },
        '2147483647': {
          xpub: 'xpub6BzDxeqnwow2HfCpmvDE6cVQwugwQfhw1ZFa1BA6drLkgNJYLtmTcFiND3rw55JU7hCUGyL9QK29gSxmeyxWjYy5ucmiJUYXhFzBPd4VXy7',
          publicKey: '025649d75ac188810a131120be822bff19f311af75ac57164d3658b09c573a32b8',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GpgqWjak2G796MLbgBXB9PwDWLo1K2Kf3KmtgRknowfgxdeSCVWysWDzxsQjXyEdPKxiTz3Gan7YPALtEpZXNkNTmWu9rzm5yQbuzacHC6',
          publicKey: '02a07c5d2876fee191dcc3f6efa6b89d4656e44f46d4bc850ba56a041e51bb87da',
        },
        '35': {
          xpub: 'xpub6GpgqWjak2G8gmiJHYtNoePGDJsgHPPvNqfi6pd7PutJAgYru56LwL1k1kXPrvKA6BNoHsKNmmmes38RrdnmrGjkcCwzo6vupzqVGzu7JEv',
          publicKey: '0343f653fe834b7e5dbdae7bc055ea2fe9461ce8d74ad00018cd76eff0311ddf40',
        },
        '2147483647': {
          xpub: 'xpub6GpgqWjj5go5JLfkGU51TyLyRh4ZjTyJV6hxZVeBbSBrxab77RqkWaFdtrxQ7qN1mrB7hA9qbgUmGBDVa22LiUcMgovoU4DdmtJUhG8WME2',
          publicKey: '022c52ff0ca97511df2fc849e9f917e4833bd76f418ec12acc2142c6320e403b49',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1y7uejj5y02j7mx9khd6p70a86q4d2w8appf2aagyef6s4qv2g70qr9tar2',
          publickey: '27b9994a847aa5ed98b6bb741f3fa7d02ad538fd0852aef504ca750a818a479e',
        },
        '35': {
          npub: 'npub1yjt22r3jdsldm54gn6mvx3meezw8eefz8wmpcmh0qn7paufftqmsa4aw50',
          publickey: '2496a50e326c3eddd2a89eb6c34779c89c7ce5223bb61c6eef04fc1ef1295837',
        },
        '2147483647': {
          npub: 'npub1f2y5q04zkvzsp3lgv3z46q99gj3cjev06t9gtgg63m25dr3m978svh323v',
          publickey: '4a89403ea2b30500c7e864455d00a544a389658fd2ca85a11a8ed5468e3b2f8f',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xc422897397266e937e69545f58069be3639fba9531538673641c6395bbf7a8f4',
        },
        '35': {
          publicKey: '0x53a57b9e77021694973160d3e79fd78b8dcd8d8224a9b031abdce02e94d6087c',
        },
        '2147483647': {
          publicKey: '0x61ef2b938984d9067181fa74e91df964d00e630b4910314da3807c59156fb24d',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '027a62b61df6a3f7bc45695773e67777778ae4d1cbf9aedf35cd86ae4b8ca19661',
        },
        '35': {
          publicKey: '02aac4befc5244ab1fd77e7e946c681249d90975e745036d54aead6911382ea25a',
        },
        '2147483647': {
          publicKey: '03a7fa1e67a31842f011172044665baf9b77951a54e72922b75afdae145cf97487',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'b963cc4d1733b2ddced8acb61898546dceca9e2559cc6d8a749a5a339f77bd2a',
        },
        '35': {
          publicKey: '05bcb692edf658177863e45bdf0805900485780c8b3c9349cc94a5390d0a71da',
        },
        '2147483647': {
          publicKey: '4ac76156b05b875b80816f974d79850829223ccd35ab2cb06708eefbdbb1c036',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
