import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语2',
  passphrase: '$`%@@`&^~$',
  passphraseState: 'moP2GcZKGrjTk35r8BSRD4JTeQagvuKzzS',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162869',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '9ddcff3963f782c807706fcc65b01ccb8c2755b42732bd287d0ec8f02e0d6cdce84c41b1d3205e2c764dc737104caf9d9d9101d683dfe822cf787cd7db45d3d5',
        },
        '10': {
          publicKey:
            '9f93c0c340f9c9b82c34fb840061e88440fad72825256e496d2729955c52d06fd4a3e07fce49c6af2f2c616b302d93a295774ebf7678237df3b51a974e8d8af0',
        },
        '2147483647': {
          publicKey:
            '709f09b1e1660f77b7b69b56c98b49d08afe9844b3681cce39ebcee8f89fcaf0872a92b743cedc26bff8d66f4af1e68b66ab59ee11e1e73fe594d6805dbc3bc4',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'e476b08becf246d24cacc7a674869f24885f7c875af60fccfd4d03e3445fff82',
        },
        '10': {
          publicKey: 'e820b6ec1f1d1cddb6ced9a7137900a05267de715435be06cf633ce359c02168',
        },
        '2147483647': {
          publicKey: 'fb38b33d771056dd3d2d44162ba56276b9b7afa100b95ede925503ab8bf93f77',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '023ea7c7281f039cda5fb6ff974a83bd185e6935b61ea13c213ca1452d01d135d4',
          },
          xpub: 'xpub6FrJE1Ee18cerzGWNRZQ4Hjemb4c49cKxDMb3BrvLWrKdRwNfAK7EpUBXRRjLvu1Qxr6ifYp7xbc6gXQwCSykAgs2RN91q3A9XFrA7awyZw',
        },
        '10': {
          node: {
            public_key: '022bd8367a49be62c208b18e5ddbcce7306fb6cedb41d358c2ed88a66459271d85',
          },
          xpub: 'xpub6FrJE1Ee18cfJ4bQ9Kcpq6nUzS5ZiSpbLay5TLsn1atmxykVCkNLjPoeXQDEVYNaNwXJ3UJLRjCU3BVM6kvhrurmdSRXMnaT6fiKrh5gPXV',
        },
        '2147483647': {
          node: {
            public_key: '03367b5a75352a6a5d6da81eb54920afdf836e1b333e04a5178e984ffdf0fd7b17',
          },
          xpub: 'xpub6FrJE1EnLo9czb31FK98QSJNKeWK1J7T1vhjV61zQAGHAoR5GQ8ZEygMqCrwgH9ocufEiFpzcsgKbwNr2FDCVrycvDwboqN6Nc1FSFbzbmm',
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
            public_key: '033c689284b057b525b11a053ae2b1dbe9d9cf38856eb7606a0a87779496361b17',
          },
          xpub: 'xpub6CXexMdW6pZJGZnqMfLDiqMiKMDMwvzeLppdpSScedW1VejwfqxHsFcQXfMQ559GXGQVoKnK69tNW5AtFCHnUrq3T6YWRXFPpkaapYBkDe3',
        },
        '10': {
          node: {
            public_key: '0219b44ee55231020f23a967bcd4d5faedd303f50868e11bdd378ca4059df675f3',
          },
          xpub: 'xpub6CXexMdW6pZJhZHLLyAt41tXNudBH9fnJ2M1RL3AuYvNFtK38CEL7zrNVN2S7Vjom2YAxX2qxaj3gXRQB72H988CdJNqKbFw7QDVQLQ33bi',
        },
        '2147483647': {
          node: {
            public_key: '03375cae23bbf9d7863f111015c3feaf7dc67e6468fbeabbab6caaf62590804b52',
          },
          xpub: 'xpub6CXexMdeSV6GQu3koAcgbyMMEHSey8dNGJ8sLtFyY1Dc1snQT9ySpGbqmHCAC2uFuNc36xvYHGfurgVSHXS44afBv4HjXGBx58XFy8v5eyG',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '026541dbc69cdb6fcbd7076aeaf77d4113ca345091b68688a13051df27925a6644',
        },
        '10': {
          publicKey: '03aa722ca123f0f7167f38e86a74c444346839e922521114a387dae17edc768aa9',
        },
        '2147483647': {
          publicKey: '02ef5042bdc1950715a0eb308157a66ad619e2f942f134781fef8d7d5bc8cd4088',
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
          xpub: 'xpub6CJWam4mosZVsAxdYEJXQEAzbE2Qgb2Ufv5CrzfM23aohtLpvtTyRKRCNWvkiuVFT5n6auErLbeQEf4H53QZXQffK23xT2hCoXNU3NheAqj',
          publicKey: '03bc0cc833db22626c457375696fe7055fbee5183ad397b365fef39655ea9793b4',
        },
        '10': {
          xpub: 'xpub6CJWam4mosZWLAdBvSNJYNBJC1eqQMetFAFBcKzbRBCQE5xPYJEjtPREprBg61Ra3MzNoWUknritFpoqiFZvoeCW1oUgQuZH1XhLdGyLqqA',
          publicKey: '03303cc03794b357c6c6e7e8c651ca119194e76c76bec40ec64ec104a3257287a4',
        },
        '2147483647': {
          xpub: 'xpub6CJWam4v9Y6U1BKNZ76w7roBV4T7e2776iPFRBT4dNnTmVo1mkSoX6o8V6Wa5nTksQckmxLZaGn3Wmu6r46RMrfgph9skN4dmyQXJTFYWym',
          publicKey: '02010407378923110983b0155b0604ceef7d74fdd04c1c48e7f0283b93c22a6bea',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GEsxAWEvQayQHdwBSFDXsBZHDjwbgUm3W4vsuUTYMGjsVWymF6AEgwCZgrMb5uS2tu4XQNwR3DfSnhc9X3MHdzxRFi2syrrJDpRjZPEPyp',
          publicKey: '033581c90f2ad07a67393b6471732d1968107588d382e453cad97b6ff1354f3ec8',
        },
        '10': {
          xpub: 'xpub6GEsxAWEvQaypP7WRiNBcuhjqmBMLMfTj9wK1tFySFwBYf6KafNZeEGtY3zY3b6K4ynVDQ3ELf1fgTBFbKnoafEgJDKwHJLt2mqnxBRNDww',
          publicKey: '037f12c3b6d7ac411213241c8c2aca43e132fa84804626e1b1bff4d549da38a424',
        },
        '2147483647': {
          xpub: 'xpub6GEsxAWPG57wXr7V7xxtco6i6DoqDJ6RSSXPb47RzSgrqTxoVT5RXeRpdqbQ5as4jcuJbEnYc8P52Ynnp5o6EC22P4GewMcm5tvodEwuZBU',
          publicKey: '0261c3e6a3245a854ad244adab94ed8536688b0a6e9365376299b3bfbbc43cf5b6',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1e868f2h0erradt0uawh5jv82rjeh92tqwu4887ef9fq2aryk9yzqcux2rc',
          publickey: 'c9f474aaefc8c7d6adfcebaf4930ea1cb372a960772a73fb292a40ae8c962904',
        },
        '10': {
          npub: 'npub17rmryazqr25u0ssx34zhj74tvuadf9ehd2myq6fll24pdxrtulcq29u57v',
          publickey: 'f0f63274401aa9c7c2068d45797aab673ad497376ab640693ffaaa16986be7f0',
        },
        '2147483647': {
          npub: 'npub149stpclzcsvgu8ns95vwg9ks6yxfldkquk5h9w9vfk5q7adsc78q4p3uj0',
          publickey: 'a960b0e3e2c4188e1e702d18e416d0d10c9fb6c0e5a972b8ac4da80f75b0c78e',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xf8a77117a3d8aab04850bd510780c956b4fe714349736ec79e865afbff766066',
        },
        '10': {
          publicKey: '0x8e1cf6cac90681357c50d6c5bd561f2711d6f110ab858cd9aaa2fd7e94e726c6',
        },
        '2147483647': {
          publicKey: '0xa8310f8d188254158ea09902019f7d4066b0c5e23f605c573b39c2ff36a5ae0f',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0394112e81b9142e4e1f9855b4e8f7fe72f00aee1aa0aaf50e24de106c6ebc2195',
        },
        '10': {
          publicKey: '032d0b0c248957e7e2e5250ac6d414ce7e2506f7919e0e789db350d60ffe36efc6',
        },
        '2147483647': {
          publicKey: '0348b4df4b39ccb98953f6f5c5cf1a7ffd8ee2bce4ff34af9b02e10dab65245262',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '73ad40311046e1d545a9156d073a29650eef2f132de55c116e54375049a4f2cd',
        },
        '10': {
          publicKey: 'dbab78ab0068d1d89f911bb1a2eace77d7948f7227da8f1ab64f27ab438b1598',
        },
        '2147483647': {
          publicKey: '032be5844f70515b30e98ee6de66b2e22e0f23a04b7d32b15f4ef6017337f930',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
