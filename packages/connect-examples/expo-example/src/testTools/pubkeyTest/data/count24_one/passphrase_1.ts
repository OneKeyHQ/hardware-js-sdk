import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语1',
  passphrase: 'asdfg7890',
  passphraseState: 'msySLzWLsiGnZVfcQCNBeLV4LaTxeoHFZj',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162869',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'd0e757aaa95e35226662d2a6b4c4a28f9f75273bd81c379ae25d86f7fa666f94361b94f534cf9828a0e37c0d6e3327bd58217d95c7f82bbbc211fc04de79585c',
        },
        '10': {
          publicKey:
            '40871e17a87b82482cd0f17b924ebd7b0426e206b21966b5b4ca16cd43a3ba46c42d82cf55debed67e815d97084bdcaed0306638d8c528eca08c293139a29d3b',
        },
        '2147483647': {
          publicKey:
            '55ea973252095486f64dd321bc868ab0c3704be28b361cefc925b1f203d602b801e7d069b4b0440445040765bf30135884691946b2c578fb0d90a00852dafd8d',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'f68ec768678746a5f0614b35107548445028fef076d4f18ac096c697c9569c6f',
        },
        '10': {
          publicKey: '65aab7443571b31b3c39ab09a08c207a57465ef2dfbaa6318c04f2913289887e',
        },
        '2147483647': {
          publicKey: '5b3821fa3874d325b093ce8f557a3675d600cd9276e77c7180beb8636498990f',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '02ad4d8be28fc6f90f2f5cfa5b64a44116bfac0e0fa8d9edf74471884d5dfa1bbc',
          },
          xpub: 'xpub6Gr3B5snEXeTdpoLg1wxfZVRuRq8EUDtdAZ8TXFSJjvXyWcM8TBsANVruxr6Yxig7mmhn5o5AaNpZkf9iH2ZhKMLAn2EJQL1pMXxp5ht8jw',
        },
        '10': {
          node: {
            public_key: '038c0425d654f4b91a97aae7e702ae4685eee2684b4a8211526bc04f593279068e',
          },
          xpub: 'xpub6Gr3B5snEXeU5Qm83GpMSomEigizcE9hdj829rZebpHr6XMLZPBs2N68zyWN66PGdqjjZsGkHnzwZ7dv9hkf1WCvEQxu4rzkkLW69B4h2vz',
        },
        '2147483647': {
          node: {
            public_key: '02d6aa582fa44e960eceea6cac2b4754040d2040f34f1ededbf788b53a71ab8150',
          },
          xpub: 'xpub6Gr3B5svaCBRksW6tRKMb4Su7HS7VaDkJqZkQexSy8MpsEzidkRVdC8tkDVe1ATw7tzSL7NL6ZK9rWEhK9hhYx2sRkzKDTBbBjdczsCSeKc',
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
            public_key: '021f1a063ab5e34f842b46dedc0248704447f95d5b79be61e204eb996d0167b573',
          },
          xpub: 'xpub6CwnaJC89YFntKwA9JQ9d2v3CyZaHQjhu7wNqwC8PvsSZ2GFCuqtYEWXYdVdgUNZTWkYpEE1cu2tAgDsUirus1WYW9hZaZRiqTSGuimr3fp',
        },
        '10': {
          node: {
            public_key: '03c55a12f04e1fdb126fe6be93858ead8093a74b97a34766d492510f047129a835',
          },
          xpub: 'xpub6CwnaJC89YFoLumfwTX4ecCDcB3DsFodEodjneJbYtWW7ov2JS4Rxy6nkyi7H1LuozuEfXXAmFZ8AbxH8VSDoak53CkyguiHA8BhS4SyC8D',
        },
        '2147483647': {
          node: {
            public_key: '0222fb4b5fad3dba95a0adceae87f5ef732c60872656b71d7d639c1684766b11a4',
          },
          xpub: 'xpub6CwnaJCGVCnm2UyTsFizApwFTE7nXBYakc9E8h74Kk4H3DpJjhnyZRHMnuHptSKenBRN2bGfiHiES85XytygWc2pzzQLFz8GQw9cy7bwtJL',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '028a92a9ceb7620faa58d5e89b7279999a8811077d674813adefae555f8366a71d',
        },
        '10': {
          publicKey: '02d820ce729e264d112ea743a77243b7f81161e74a786619b86117cc348f6d36a5',
        },
        '2147483647': {
          publicKey: '028773c8908a3d62097643a81ef651cccef7d9cb70da914f19b3d04b112e7fcd42',
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
          xpub: 'xpub6CJodMWk1rSjR2a4qVG3bLz5RPeMMr3F48xefM2nDrrkkv3H3dvphrN53BFn43xQQhVwXs9MgwQ7wJHCkxpjyVR1gSNid4khukeGJfJqT77',
          publicKey: '03a0f1c16212529db1b79f7743085207911128e4340370382c05c91281ddeceb58',
        },
        '10': {
          xpub: 'xpub6CJodMWk1rSjrBtbJdR2cWuTwUFaKFWTLnXQEWZ8PRTJ5yjNyzUobC51XT75uzJxby2VtoJHgzSHDyLBpFVpaeNNjrNpepzbeQ4DtGF9hyC',
          publicKey: '0222753a3a3243723a2b2c1ed76c3410bb4445ba5a3e1aa2e399bfa2083d0639ad',
        },
        '2147483647': {
          xpub: 'xpub6CJodMWtMWyhYPhoQ962VzkyNWTp3bjWfCGV1xYiaBkXSw1cobtLkruHYgWp8tgVRKcnZ8ZAZHWug52Jzx2stmpuW79oLe5hBjmVcG9rzqM',
          publicKey: '03b4ed7ccae3c7148e40835576c923601925114ffa41b92713fc91f02ebafbecac',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6HG1Jb9bmPhV7e25YfHpGbABYqHwxqXRZKZqnGJ45R9LBgmEU3VpNcfbZepWcz4u63QkQ9xH6jf2gTFN5uLxE56aMZpKy7Tp5eEeMpD1vZL',
          publicKey: '029ecfc2cfdd1f675f2b682c8399277909b95027ccde9e89559e4a7214eb85f918',
        },
        '10': {
          xpub: 'xpub6HG1Jb9bmPhVZREZ8jssxWYpAqNhkYgBjdiWgNzv5Tf7FxkknarRa9qvm1ZskAkSratDjNeftYzdRDcYqJEqyiYtnBMHJ1bfEuJpN4eVT5H',
          publicKey: '036d3ef8d5ebf2729e839649d8449c84f09e6665c31c3d778d14f2351ff0790311',
        },
        '2147483647': {
          xpub: 'xpub6HG1Jb9k74ETHJE9r2HgWUrxz36FhQhKCv4CddUXuNPqMwd65yREyqVjSazX32SxeJnDbCyXoXWDTd6mnki7x4gQhtGTZ7GsfXJD2bFvx2P',
          publicKey: '0360c6c7efb3dd4a96226bb03b556bf272165c5c06dcf50a6f05b717b2b75e30e9',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1hc2cgmyudrvh38ds3chtcpwwh98s9ezp2aw4fsmcu2j2kgkr3xxsfw0k7y',
          publickey: 'be15846c9c68d9789db08e2ebc05ceb94f02e441575d54c378e2a4ab22c3898d',
        },
        '10': {
          npub: 'npub10ctpcnlcwve8m4kauv5lk5862unnh7qh7f6sm76ljerhecqylnysplutr0',
          publickey: '7e161c4ff873327dd6dde329fb50fa57273bf817f2750dfb5f96477ce004fcc9',
        },
        '2147483647': {
          npub: 'npub1anerpzn75ggk3cth3dq2vnrngxpz6turumt7rt2nfwaqlr92y5gqpejchk',
          publickey: 'ecf2308a7ea21168e1778b40a64c7341822d2f83e6d7e1ad534bba0f8caa2510',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xe4cf40c3d87e515da14c1127513ab445c1533cc1534c0f28b29bb7593c8eb218',
        },
        '10': {
          publicKey: '0x45c618a0fa1bc8907d108d7bff8748fd34420f04441a440321e854a8c2b37780',
        },
        '2147483647': {
          publicKey: '0x47d503dfaebff2c485d2b3d761ed19ae390a81a03207b8a810b81e35c639d96c',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '030751e54e2b1294af35cb130bf67fd97b533fbd8e7f17bf80da679ec4f4b6b106',
        },
        '10': {
          publicKey: '037c53d73fd05e44e288a74cb3d5e43ff07ea91ef4f89400d1f3de1eb1030e2fb5',
        },
        '2147483647': {
          publicKey: '02b48990bf8f6bf5fc16b665bcd423de1eeb1333eb90cad5bdc4ffb88a10a567d4',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '94ab3d6a64d6d432697c622726409152cffc0da6460d34ceb3ac56b3ebb73ca1',
        },
        '10': {
          publicKey: '298deb405e3158ee35b88c4a3888e14e69af26d748cfd90f92bbaa17751cac82',
        },
        '2147483647': {
          publicKey: 'ce44c30c73e7aaa1d24bcf23c5d43eb43b6356ab61e1b4cf385d8a5d1c3eb601',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
