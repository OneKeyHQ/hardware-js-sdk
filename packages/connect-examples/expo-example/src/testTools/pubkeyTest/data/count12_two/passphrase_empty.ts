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
          publicKey:
            '0b61b7421596ff95c730a8ebf65387de538b9a941b4027655d896039a4cfcef7fc88fb4add2c1fe02003ee7f4a1829ccc4030d54c3bf21d190214280e3181c62',
        },
        '35': {
          publicKey:
            '6996458d2f8fdf65858383ef1319e8b2862179520da8d755265050c55bb1e022fdb0812fb626fcb1267ce426bfd357deaf7cbdc4ab49aa29e99b189a6d2f2478',
        },
        '2147483647': {
          publicKey:
            '7f533307829b29ef44870811dc283bc8672bbe0f648ac05469de9c40bf2e82255e74d70cd2163f33b5128b123bddb4d75a21362cb6e2458dd40cd6232c983dc2',
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
