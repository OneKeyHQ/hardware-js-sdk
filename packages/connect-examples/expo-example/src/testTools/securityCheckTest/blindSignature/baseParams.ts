export const COINTYPE_MARK = '$$COINTYPE$$';

export const baseParams = {
  alephiumSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    rawTx:
      '00010080004e20c1174876e80001f3bf9d774d87e65e79a72d5482da5ef35aac8d0b930b394bdd67586930f6ae7b4fd8362b0003f6bd3137b3cadbad59a73527c3b8e26429bba093722a59639f22af9d2adb477302c40de0b6b3a7640000001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac00000000000000000000c43c7a13049ed60800001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac00000000000000000000',
  },
  algoSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'/0'`,
    rawTx:
      '545889a3616d74cd03e8a3666565cd03e8a26676ce0241b3aea367656eac6d61696e6e65742d76312e30a26768c420c061c4d8fc1dbdded2d7604be4568e3f6d041987ac37bde4b620b5ab39248adfa26c76ce0241b796a3726376c4202c8ff1f3e02a31dae356ac1f5c450113d76323153bbb867ff88a3f8c1a3ae7cda3736e64c4208974657d5aa8b02503725d444c0bee69daf0f66d9d7ad14e9cf6d495aafe3467a474797065a3706179',
  },
  aptosSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'/0'`,
    rawTx:
      '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
  },
  cardanoSignTransaction: {
    signingMode: 0,
    inputs: [
      {
        path: `m/1852'/${COINTYPE_MARK}'/0'/0'/0'`,
        prev_hash: '311940642e2f1ee1029a59c05f83c78fc27cc8a52bfd1e65721800dd8b026dec',
        prev_index: 0,
      },
    ],
    outputs: [
      {
        address:
          'addr1qxfzjswzujgvn70cwpkxdal5dddtasjrljmx8upgzlaehqa2vx9039emchclmwwfmwtar32lp4x558nr8wa3f26rkn7qwne3ad',
        amount: '2613231',
      },
      {
        addressParameters: {
          path: `m/1852'/1815'/0'/0'/0'`,
          addressType: 0,
          stakingPath: "m/1852'/1815'/0'/2/0",
        },
        amount: '1222487',
        tokenBundle: [
          {
            policyId: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6',
            tokenAmounts: [{ assetNameBytes: '4d494e', amount: '27828472' }],
          },
        ],
      },
    ],
    fee: '177513',
    protocolMagic: 764824073,
    networkId: 1,
    derivationType: 2,
  },
  confluxSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    transaction: {
      to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
      value: '0xf4240',
      data: '0x01',
      chainId: 1,
      nonce: '0x00',
      epochHeight: '0x00',
      gasLimit: '0x5208',
      storageLimit: '0x5208',
      gasPrice: '0xbebc200',
    },
  },
  cosmosSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    rawTx:
      '7b226163636f756e745f6e756d626572223a2231343136383538222c22636861696e5f6964223a22636f736d6f736875622d34222c22666565223a7b22616d6f756e74223a5b7b22616d6f756e74223a2232313737222c2264656e6f6d223a227561746f6d227d5d2c22676173223a223837303733227d2c226d656d6f223a22222c226d736773223a5b7b2274797065223a22636f736d6f732d73646b2f4d736753656e64222c2276616c7565223a7b22616d6f756e74223a5b7b22616d6f756e74223a2231303030222c2264656e6f6d223a227561746f6d227d5d2c2266726f6d5f61646472657373223a22636f736d6f73313963326d333563666165356c6a38397839303235706c6b6e686a6c68653672616a336d613974222c22746f5f61646472657373223a22636f736d6f73316c387661367364376361786b676b3476736e617a61786176716e363434617971636e39737374227d7d5d2c2273657175656e6365223a223233227d',
  },
  dnxSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'/0'`,
    inputs: [
      {
        prevIndex: 0,
        globalIndex: 323,
        prevOutPubkey: 'ff4df9a9fc83e48f2c0242c4d94f3906546a889950bccd8ba4392f3e7886c3a1',
        txPubkey: '0d708b68003ae5fee4c9f9aad56a8cfdb0a5dcbcdd2e3fc18eb813349457a78c',
        amount: '1300000000',
      },
    ],
    toAddress:
      'XwmxTF8FxAy2s5cvtS62oSGxY3fzvDcgo2CiJ6rrpz9te68sApSDs3LQihubFtpsfT5z6NYHZzMKUjavNpTkW46i2dYgHBULG',
    amount: '13000000',
    fee: '10000',
  },
  filecoinSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    rawTx:
      '8a0055015a2fd22d821d5855e401118fef6ea0373dadbde355018ae51a9d6c9fe1872fd31b10c96df89106790297004900016345785d8a00001a0009354445001730ee6e440001865e0040',
  },
  kaspaSignTransaction: {
    subNetworkID: '00000000000000000000000000000000',
    prefix: 'kaspa',
    scheme: 'schnorr',
    version: 0,
    lockTime: '0',
    sigHashType: 0x1,
    sigOpCount: 1,
    inputs: [
      {
        outputIndex: 1,
        path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
        prevTxId: '1f226507807ff7dc5a7f8f2dec353fffc9dacc2645d8aecd02e5046907e3e2b2',
        sequenceNumber: '0',
        sigOpCount: 1,
        output: {
          satoshis: '990096458',
          script: '207afdae557e69c0040fd4135adffc60f9486fb21f4cbae233fd6db3e84ba47c55ac',
        },
      },
    ],
    outputs: [
      {
        satoshis: '100000000',
        script: '205ca3a7530284e5c5e472544edd6002c3afeb8c8f84d3a728fad255a4872753fbac',
        scriptVersion: 0,
      },
      {
        satoshis: '890094182',
        script: '207afdae557e69c0040fd4135adffc60f9486fb21f4cbae233fd6db3e84ba47c55ac',
        scriptVersion: 0,
      },
    ],
  },
  nearSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'`,
    rawTx:
      '400000003630323130393034396561313633656561326634386365616238303634363932373538323730323938333863666163303865633463363330303431353639613600602109049ea163eea2f48ceab806469275827029838cfac08ec4c630041569a644255eea2d4200004000000034376464643364346536393632343535386266313135643438313763336566303861386264393864313832666466666637373465353065643937626637626437d2a5c8e15cadc0476f5f07a02b2a3b9c1699847996b1bc55142b881a3ff1accd010000000301000000000000000000000000000000',
  },
  nemSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'`,
    transaction: {
      amount: 2000000,
      recipient: 'TALICE2GMA34CXHD7XLJQ536NM5UNKQHTORNNT2J',
      timeStamp: 74649215,
      type: 257,
      fee: 2000000,
      deadline: 74735615,
      version: -1744830464,
    },
    message: {
      payload: '746573745f6e656d5f7472616e73616374696f6e5f7472616e73666572',
      type: 1,
    },
  },
  nexaSignTransaction: {
    inputs: [
      {
        path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
        message:
          '000578c6c76f10156fbc7ee4a8faa7a4e92b6adadc978abf66ae70f13a03b75d36cd7a6acc0967cc9f2f632f585cb7b4297873858c23233792767fd4ae662ec1093bb13029ce7b1f559ef5e747fcac439f1455a2ec7c5f09b72290795e70665044026cad0dba749a112e0d2ea420fa68e0218453db6bb0744e44eb51edc76af8bb6871190000000000',
        prefix: 'nexa',
      },
    ],
  },
  nervosSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    network: 'ckb',
    rawTx:
      'b00100001c000000200000006e00000072000000ce0000009c010000000000000200000071a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c0000000001c7813f6a415144643970c2e88e0bb6ca6a8edc5dd7c1022746f628284a9936d50000000000000000000200000000000000000000003ccb539e56ce1acaeb53db6a6ce939132c5f462e7eb686556f3ba308b4c402080100000000000000000000004f4803ed365e368fb6ac0048961883edf1a98daf20a3d73a54d26e4aa601d7d300000000ce0000000c0000006d000000610000001000000018000000610000000002648901000000490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce801140000006655cba91b01e4f8e3ecb40d1fb6241a9033115a610000001000000018000000610000009651104802000000490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce80114000000fb36a5944e2626089db2f37e9a5cb4a6eff55c82140000000c000000100000000000000000000000',
    witnessHex:
      '55000000100000005500000055000000410000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  },
  nostrSignSchnorr: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    hash: '2118c65161c7d68b4bdbe1374f658532670057ab1bb0c99937d0ff7cff45cb5e',
  },
  polkadotSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'/0'`,
    network: 'polkadot',
    rawTx:
      '050000950ca256090ba9a4cd520e1d891081207e112b1353bbe8da0cd8a910d684481a025a6202c500040000154a0f001a00000091b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3e7f75975e0a90fd10ab432c76d9a0eb2b140732e4d7748c813d3d787909edfb300',
  },
  scdoSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    nonce: '0x0',
    gasPrice: '0xbebc200',
    gasLimit: '0x5208',
    to: '1S0118a02f993fc7a4348fd36b7f7a596948f02b31',
    value: '0xf4240',
    timestamp: '0',
  },
  solSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'`,
    rawTx:
      '0100010376655f5ed1653f0882195b265edd2149775b197f64a21a283337abb53ae80db2eb08fa3adfd0ff75382ba8cb3b08bb165addc780f6adc2937be8ee36a9f44adc00000000000000000000000000000000000000000000000000000000000000000cd9e955d5c0cdfba7f0ccf4c51000bc5e219adec51f4e0bc98f6d8649bc0cd801020200010c0200000040420f0000000000',
  },
  starcoinSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'/0'`,
    rawTx:
      '3b967f5ed62f0773d5f96ae5ceb55a2d780100000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f7632010700000000000000000000000000000001035354430353544300021068e843ca9b370dd84a8b567ed60afe691000e1f5050000000000000000000000004b9c01000000000001000000000000000d3078313a3a5354433a3a53544315bb48650000000001',
  },
  stellarSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'`,
    networkPassphrase: 'Test SDF Network ; September 2015',
    transaction: {
      source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
      fee: 100,
      sequence: 4294967296,
      timebounds: {
        minTime: 111,
        maxTime: 222,
      },
      memo: {
        type: 0,
      },
      operations: [
        {
          type: 'payment',
          source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
          destination: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
          amount: '10000',
          asset: {
            type: 'NATIVE',
          },
        },
      ],
    },
  },
  suiSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'/0'`,
    rawTx:
      '0x000000000002000800e1f505000000000020e40a5a0133cac4e9059f58f9d2074a3386d631390e40eadb43d2606e8975f3eb02020001010000010102000001010020bc56200b85adb47bed5f4b66c31d7789809f2b87130090fd7a6e8b936be07601023deddea8b27d169f70d9309601fe3a4aa2425acbc1f03bfcc7618dfdc9d385e70c1d02000000002090a0284e4451fc1d476e42faea6eb92ae7b01cf54ef21d762558d25563af44be20bc56200b85adb47bed5f4b66c31d7789809f2b87130090fd7a6e8b936be076ee02000000000000200a35000000000000',
  },
  xrpSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/1'/0/0`,
    transaction: {
      fee: '12',
      flags: 0,
      sequence: 32841006,
      maxLedgerVersion: 32841630,
      payment: {
        amount: 1000000,
        destination: 'rwgumKP89VhMrJ4dRkGVS4tafRfAmZmKf8',
      },
    },
  },
  tronSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    transaction: {
      refBlockBytes: 'ddf1',
      refBlockHash: 'd04764f22469a0b8',
      data: '0x0',
      feeLimit: 0,
      expiration: 1655692140000,
      timestamp: 1655692083406,
      contract: {
        transferContract: {
          toAddress: 'TXrs7yxQLNzig7J9EbKhoEiUp6kWpdWKnD',
          amount: 100,
        },
      },
    },
  },
  neoSignTransaction: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    rawTx:
      '006108a1fd000000000000000070930000000000004d2169000120f4258023fc60fba495bcaa5d7148529734e93101005a0b02809698000c1420f4258023fc60fba495bcaa5d7148529734e9310c1420f4258023fc60fba495bcaa5d7148529734e93114c01f0c087472616e736665720c14cf76e28bd0062c4a478ee35561011319f3cfa4d241627d5b52',
    magicNumber: 860_833_102,
  },

  // ======= signMessage =======
  alephiumSignMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    messageHex: '010203',
    messageType: 'alephium',
  },
  aptosSignMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'/0'`,
    payload: {
      address: '0x1234',
      chainId: '0x1',
      application: 'OneKey Apps',
      nonce: '12345',
      message: 'hello',
    },
  },
  cardanoSignMessage: {
    path: `m/1852'/${COINTYPE_MARK}'/0'`,
    message: 'Hello World',
    derivationType: 1,
    networkId: 1,
  },
  confluxSignMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    messageHex: '0x6578616d706c65206d657373616765',
  },
  confluxSignMessageCIP23: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    domainHash: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
    messageHash: '0x07bc1c4f3268fc74b60587e9bb7e01e38a7d8a9a3f51202bf25332aa2c75c644',
  },
  scdoSignMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    messageHex: Buffer.from('hello', 'utf8').toString('hex'),
  },
  tonSignMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'`,
    destination: 'UQBYkuShkZzRYAWX_HrK3kFpeAixiRKd-K7QBXYxl9OBXM0_',
    tonAmount: 100,
    seqno: 0,
    expireAt: Date.now() + 1000 * 60 * 60 * 24,
    walletVersion: 3,
    isBounceable: false,
    isTestnetOnly: false,
  },
  starcoinSignMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'/0'`,
    messageHex: '6578616d706c65206d657373616765',
  },
  suiSignMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'/0'`,
    messageHex: '010203',
  },
  solSignMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'`,
    messageHex: '48656c6c6f',
  },
  solSignOffchainMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0'`,
    messageHex: '48656c6c6f',
  },
  tronSignMessage: {
    path: `m/44'/${COINTYPE_MARK}'/0'/0/0`,
    messageHex: '0x6578616d706c65206d657373616765',
    messageType: 'V2',
  },
  tonSignProof: {
    path: `m/44'/${COINTYPE_MARK}'/0'`,
    appdomain: 'onekey.so',
    comment: '48656c6c6f204f6e654b6579',
    expireAt: Date.now() + 1000 * 60 * 60 * 24,
    walletVersion: 3,
    isBounceable: false,
    isTestnetOnly: false,
  },
};
