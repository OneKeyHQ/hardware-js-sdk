import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'passphrase12-密语2',
  passphrase: '12345y67890ABc4',
  passphraseState: 'mkeNhHFDxRQue8scCqLUgwwomia6FgnR3C',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        0: {
          publicKey:
            '4ddb1ed9309fbeb2380b3db9fb12f401edaae8211d535d8c2d233b44599818e000abaa4a6f0a1da6e835fa9c379fbc52be5dea38048f5146744becd3bc2b02a3',
        },
        1: {
          publicKey:
            'b95bbd52efc45bae2797a93f9ac997d5bde2da5318cf3df071d69d29fa73488e299b9bc182f731aa136b67d02469534b2435444177afcdef1404090ab969145c',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        0: { publicKey: '8ab14db1087752f6c8273a5b679795082aa2e30c479e4199eae2c44a8eae6967' },
        1: { publicKey: '64dfcd52e5e8a6c71bad799da4e66c4360434212697158242bc9342026ae06cc' },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        0: {
          node: {
            public_key: '02ac677297d20914dd2ea65eb536c29cd65d1195e8c441f377ec52d8a92fb6fee1',
          },
          xpub: 'xpub6GskoDGrEMqci7PkzjZJtmsREs1VL6ofZus9yzEADq5rR2FSPMgQwyK8Xva878fREEyiLLiLZZEt1MmnBEkDGkxrm7xvgVGwdcc3VmAnsxt',
        },
        1: {
          node: {
            public_key: '03267504a1f9f9e85d6fd09e048a4f881a31182a0360da083e7f6bcaab94027384',
          },
          xpub: 'xpub6GskoDGrEMqckTrkdacLYZ3ZASEh9vqdYpQ6diTVj5jxixcdToZGAkc6Ds6wmCQZHA92t2stHVCnomDSyiS8zdpcaEMH3bTyvp4TquxKWpy',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'`,
        coin: 'btc',
      },
      result: {
        0: {
          node: {
            public_key: '02f0a05422ab322b783414feed3cf5d994d0054f2869183fbb360f1df32f9a6d54',
          },
          xpub: 'xpub6BiGKCEX5oJBrUPPDXZJcPqUAuEGZ7DS5BMjPNDSVDpBmTJPjugG5k4sYHmx9F8EjBq1Q3yUydxje537dyvdDXsWnghk87Xprh8cfGGDj1n',
        },
        1: {
          node: {
            public_key: '0367f2a99fc910a17c50d5ddee11d814df1ff13679dcf24ba96aba6ed7a2b62e08',
          },
          xpub: 'xpub6BiGKCEX5oJBsx2pNRu7RGbPsRESZzNMVGfzy5xyndNR965B6ciAYt6eVUqzu66PH69LZJN3kGGZkMi7PdRaG5aYqwxQHKxcP9F3HiRxUD8',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        0: { publicKey: '02e0e3ecb07fc801cb331e41204a00c55314139162a5ee5edc73b246d057160265' },
        1: { publicKey: '03662537298a0b9112144711d06b39baf006bb726ae542af38bf8062291ca03459' },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-xpub',
      params: {
        path: `m/44'/60'/${INDEX_MARK}'`,
      },
      result: {
        0: {
          xpub: 'xpub6CN6gfsLShvDEWVMPrHoz94TTCnxcUBsGmqfQmhBPU5x2bGswN6PgrpKnxX2Gb9oeXByve7z5xgXaTA3ZvAC6maYZJFKpKPikQob9ueL3kh',
          publicKey: '03acac93d44485b89d5dc6843fe382511e495648ffb47e2e0935832eaf2050dbd4',
        },
        1: {
          xpub: 'xpub6CN6gfsLShvDJd2CSxm8cbjGb5FGYotouZSbnXp3orvqinGLkQ68qYKX4ULKZfHYZ8ir5LTxmqUmJ2ZQkQiXPfYRctdDGHR77EijXNBnrtj',
          publicKey: '028fac70d69ff3ddb12c7d68fb18e84d4f65f000924d3eebf0b90c4092d3d1477c',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        0: {
          xpub: 'xpub6FXNHZQzpWJSphbCCbtgxaEyR67Q8faz2BrdvrnVoz5H575HDrRQoBXgTopG9UPfJWTu6bAEfUpnwwaXE3Hm3pK6CvrjgA9YCqCLAKhxNgQ',
          publicKey: '023f09e843d2217943c4da1f7c318913a3ff670ff2458814340b38743059a648fa',
        },
        1: {
          xpub: 'xpub6FXNHZQzpWJStdyMxwWb85GuSCcZkQEfkr7sDk46bqRRXkyzYLbtyC57bKpnvmESX5aC27EAq91hRuCAZkBy5nvvtRniNAY286g3uM7so3c',
          publicKey: '02e07f4ace45f87d38aec8b3ce6283e65661bc6ad9d5cb295f70a896df71543f88',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        0: {
          npub: 'npub1sxdl3mm9x0js55td3dmfee2s4r460l8sc3elthxa5sk7kqkufzaqesllrf',
          publickey: '819bf8ef6533e50a516d8b769ce550a8eba7fcf0c473f5dcdda42deb02dc48ba',
        },
        1: {
          npub: 'npub1jsu47mgtlxvkfytkphulxuuk8mr83tyngc6383awqfmv9cnnxluqkyv5v0',
          publickey: '94395f6d0bf9996491760df9f373963ec678ac93463513c7ae0276c2e27337f8',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        0: { publicKey: '0xef20fd619be01dbcb42b2ea284ffac0a6e29bdb77108eba2380e774c23d0db5a' },
        1: { publicKey: '0x7d4da0bc6b225df4abad341f0f77c5e799e7e3dbef557caf6572000fc5d8bcf7' },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        0: { publicKey: '032ce4a60d6a6b10fbae110a335043565b8985b5edb93fa418998c1c20a0b25293' },
        1: { publicKey: '03f79e4c37766431fb8a220d9022020a90859fc8f2a58cb90f973edc374193ca85' },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        0: { publicKey: '07786de5a41e9fcf3d52cd3cdbba89c50ad4309a00dc711ed13355e5ccd42929' },
        1: { publicKey: 'c33602e89644c090f814f19e07e5da24fdb6093a1ab09fe68b03d60b909b7c69' },
      },
    },
  ],
} as PubkeyTestCaseData;
