import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase12-密语1',
  passphrase: '12345',
  passphraseState: 'mwfiTkMnz8ed9txm7yybKCqRr4bndeTohm',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429195423',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            '67aae4955cb121a20e394c0a076ad31d64439cc6ce1e6ca2e3c7bfdc799d0a72db5299eb4a059798835bd161077c0c8130b0b89bd2e7be719fb9f7de47f1ff82',
        },
        '25': {
          publicKey:
            'd8e4f4a526b460fb26b04ee11dcdec74d97b33d9875934bd1a21a48cc83242ac26d1fe2ac9debcb11fce1e6ee72d56e4558e209f6b0dfafaeeb2dcc094c96824',
        },
        '2147483647': {
          publicKey:
            '4559c69f632048589d76f1185a8c7d759fe1a16d6cc0dcfc9e440a324d809cfe049d5d4a9eabdd9c3f42d22c944433b35289d05cf3d8d114c0dea9eddff99de4',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '4ccc65572193f4aeebdd45c5134c90d1f029eb7b9b6f35d9aaa8417e45a6a3ef',
        },
        '25': {
          publicKey: '3bea2e0818d6a8471c486323027a1da8551e834ffbe9a4cc6e979d52b3fc0033',
        },
        '2147483647': {
          publicKey: '7ff147aed7366eb369055a65742f769ba310bd3ddbb979c0f8ace587c5e3efc3',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03197d4a2e03520c037ef9cd8ec07202332875e462949aa583c8abd872609dc008',
          },
          xpub: 'xpub6Fn23hKjU3DzjcXTLY2dgHNV79dWjnwqyV85B8GeSJwJpZccPbzHLgrM8A3p5HofwyH1CKS93fC9AgG5SUe8iekN72LPZ8qtFZWjeFzekHp',
        },
        '25': {
          node: {
            public_key: '02f09b034940d5d149994ed76c383e668552547dd21fd32649e92821e5a38e2bb1',
          },
          xpub: 'xpub6Fn23hKjU3E1qA1TwD2NMVd91x6e27tV2AtaLGy6vvjAcVkNSQSD4qLy8SwqNKhdF9oezUEYNG5kHRxDd6oYGWX8eTiJNhewYqYnV3U16kQ',
        },
        '2147483647': {
          node: {
            public_key: '02707382a9381cb7982167e29a99cb5ee08f8d50bda6c9365026e2b771ce52f4bd',
          },
          xpub: 'xpub6Fn23hKsohkxr6KcrJ8n6myvNqkGui88K9CCXRXECpwBTeSAUnewo7J4LrFjXeeSvHd3yb3ivXrhhXFziEq7n3q2ajui4YF5hdJuPuRhGgR',
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
            public_key: '025f0e6c453b0becb4616355748e7a174fee6f1570e3f8f7e651048e7312320347',
          },
          xpub: 'xpub6C7LxiUzsgBctmrobMi6g6MsUpurnYdvUf7eydWRWtstW4QhAfwykhSbSQpowecy1A7j4Qutgb8rapviQW8hSQNVZWjxmJ1v2uRzpFd6vAs',
        },
        '25': {
          node: {
            public_key: '03c33979f2a4cf34175df487c85cd71d746c8687569eef18d10f222f7597b6d5fa',
          },
          xpub: 'xpub6C7LxiUzsgBe1ZMjGynuvQKviMVDr2cSc6CnufZ8JBbefTf1K4LhHT2Gp3djp76Vmr1vDzkxXmjsrEusdVKzS9DtatJF3jm2n87LcUnjDtt',
        },
        '2147483647': {
          node: {
            public_key: '030029ed89c98a81fd66282daa03fb348fcbc17a2480e5858caa7bf711960b8871',
          },
          xpub: 'xpub6C7LxiV9DLib3JecMwNx5TDm7YmoNRrpRvT4M9xfwhho6XeWHgGmMSqLH5XnvSzt6tCAd2wfJRNps17ynKnPXu3qYiFAc1gqMrBKYo7mhn6',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '027b192fd512029a943c65944da9fea7d326f66a02915d4d5b160abafe73f1e0b7',
        },
        '25': {
          publicKey: '037a6e3abc2710d465974bc2ee8fba8892c9b5da11dfdd66f21dc3eb7676719e93',
        },
        '2147483647': {
          publicKey: '0311769b3a4a3f48cf26c4eb9b0b328bf7c574007ce8c5ca8de324ad6e7cc7ccb5',
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
          xpub: 'xpub6CgfPJsEtANP65H5EePueeTrggA2GxDTmApAan9q4w1jFQ7QEg6dfawLrubdz5ttqHNW3srh2L3QyznoTQ9epGPsDhXSNpFucXXk38TrZmr',
          publicKey: '039279e99ba8f181cb4e09489a9f8c253db339bd70daafaa615576e359a6cc4163',
        },
        '25': {
          xpub: 'xpub6CgfPJsEtANQBxDxELrkgWJWjUQhEJ6iqYpaMusqXtVVGoeBxbuGwGy4GPQ7hGohWobbzSDFpwYmHNvjbV7Cd8qVpUG39fznaUf9po8rpCM',
          publicKey: '02d6de1d37acfd754b703e97fad91e7972f4a90cbe105c8a9ba8b2ec415691c508',
        },
        '2147483647': {
          xpub: 'xpub6CgfPJsPDpuMDFh9EVrQ6HWH73oRcUen7tfuvqFarrzdBzKyHLzovdNDXMcgpoiX3K7cWacr7eDBKXuzapn7WzYMDaLMcyAp2kJkzKSEpPm',
          publicKey: '03039715d75465c8c66f986ec19addc7b909ac232c2bfc96aa5b37a03bd9d82edb',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6G6YnjFBFTjwnm2bnDdAUB3TrhLzXzWeXBrLp7AuxGdZb1JHMXKS2rNu92Z9kAu6LfjnUA5uD4wKyHVZFD8fjyqA7rt8Ju5DhMzeneZ19te',
          publicKey: '03eb6660f1ebdcde474bf6669344742ed85185fe51bf80a0d474de50809e065ba0',
        },
        '25': {
          xpub: 'xpub6G6YnjFBFTjxsZqSiWgdbAQhLi9DMX5jxkbS252aJCGLik21E6Pmaz1DZJuTbJ7VUX9FofSrurWnepbwAMGxenp2Gzw8kb8fx76memzCcwT',
          publicKey: '03b0081d57e03a1e2925b22aa8883a0def90db279a9ee4503b5d2c3b410fc2eeac',
        },
        '2147483647': {
          xpub: 'xpub6G6YnjFKb8Guun5pjtLdCFvqwwemoGY8ZCnCj8QFZK22mMrakcpfgknNPUBqEGcNK1nFuwUCw5xHDb5NiJNbT4BzcdqW64neGodvaa9JuCF',
          publicKey: '02625cd90c90cb1a1504b5c51e462e66cb9121edf19643aeb809e048379b94c0c8',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1cjk9nrjuj5mgfdl84hxh8hvty2fwu9l0lh5awrt456wj5pnkf8csrxgftn',
          publickey: 'c4ac598e5c953684b7e7adcd73dd8b2292ee17effde9d70d75a69d2a067649f1',
        },
        '25': {
          npub: 'npub1c44rpc872swddhk9tvvu3pvxqt94u2eyeswead3p382tyv23gr5sdljlkf',
          publickey: 'c56a30e0fe541cd6dec55b19c8858602cb5e2b24cc1d9eb62189d4b2315140e9',
        },
        '2147483647': {
          npub: 'npub1sxwj947w0d0zqt69vsjmvhkhu2y05s0wlh3cgmm2cqkk03c5vessm669h7',
          publickey: '819d22d7ce7b5e202f456425b65ed7e288fa41eefde3846f6ac02d67c7146661',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x4138e0924aab10de727eac4243baa05a55be4abd4666034ced56effe4c03d1e7',
        },
        '25': {
          publicKey: '0xa4f4324852c6f9d5bf485d3ce7bd68f60909b1bd29656d318085012ded58cfce',
        },
        '2147483647': {
          publicKey: '0x34505c51d7502c1d2c946383114ba5b1521d2fd2a656ff0f968342391cc75601',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '0242a557cf4d7986967144d514ed894ef38cd20145afd075fb1061962b7ac89899',
        },
        '25': {
          publicKey: '026ae0302d1f71bb970d398a49d43773fc5894ea9928360b0e7e0506881169f2e2',
        },
        '2147483647': {
          publicKey: '03f8050028aaac41f316c022f0d1857dafc1cd667f4660a7dcd21478c01d58e55e',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'ea767b8dba2dfc0f7d912af04f348da28c332f0d33b704e19cab8c8ab8775573',
        },
        '25': {
          publicKey: 'bb5c524bd813e01f657c49c99ac96d003be84b36be42c26e6a9209fe341be8ee',
        },
        '2147483647': {
          publicKey: '7930898b4aeb3e4c7f05f72d95e436eafe3af7e2ed0ab9b08cb969a6ce5627b5',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
