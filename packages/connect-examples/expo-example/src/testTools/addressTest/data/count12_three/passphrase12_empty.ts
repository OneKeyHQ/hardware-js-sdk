import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase12-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649',
  passphrase: '',
  passphraseState: 'mpERhxif9Eaovvh3PfStVMDKrwCc8ELwS9',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qxcmtg5ynpglewg99tazga5ldg8meev65udzq8ytkknsp2ehs88lvux5enct3grg69z74jw626apjnscc8gqpxr7f2xqh4q87w',
        '1': 'addr1q9h2kd4dlc9q8hu7y4jwp7rr23eawk4knt5nam4n992afh03mht73lfx4c72f56z4zdn0up7sm09sf4kt7e7cdcycw0qzwc7h2',
        '21234567':
          'addr1q8uyt3e2md8vh5eye4q3gj4x65ggr0tzyf57m5yehry8ap358uwt309jwqvkwcz4uqz2tvacrdrg98zaw9szawqwgdhqrxcfnw',
        '2147483646':
          'addr1qxwy370mz7jqxvkjxp9wguk7pve4av0hzjda5fr2986qz3mv2yk6cn2mtzjth5ycunlh3ctwr2rzvjfm67nmdkzl6rfqm52j7c',
        '2147483647':
          'addr1qyx9q0zgdcehccxgxh03p3kxx36ztjzlr60jyd3azryxqava2rd44jvvzpgyarrkuuqudr6fwpwj39xvt8ww30u7s90sepqyvr',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'H2YV7OSMNOGAE4ZZDE27SIPAV27AH6TMCTMEPKEOP23ACJHCXHFFFSQDKQ',
        '1': 'SHBPGWIQA2K5EA2YWZA5C3DMLDDWF3X4SI6H6OHC3EJMHF7GY3F5WBUPTE',
        '21234567': '3M2SQXO5AGV66GGZQN746XM3JWUKCLAD7RYAZ562KRTYAG63KM3AVGJ77M',
        '2147483646': '2FIXEDEICFG6C3473NCLLVSIVZBOUKB3Y32EZ5XVJO7BA3HGMA6QGSMQV4',
        '2147483647': 'WUPGUY3H3TZFM3SJ5CLWRYCCZ74S7GXEJENDCXQPLQUKAOJXHKJDEF7DPE',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xd5fe41294bfcc0a75d4ccfff0e9f0edfeb55655f55ab63709b2d574d685df896',
        '1': '0x836121416600e37846b420dbcaf518d4b5c91a0fad0fbf17d65c01346e7289f5',
        '21234567': '0x0c107100308b99ac1b8f9d8780e8d255afc8c7971581debde424834085a29928',
        '2147483646': '0x28a8f087dcefa8f22a21881436582c7549d74651d8e2b415478b7ecc91eac857',
        '2147483647': '0xc06f2c5e3c52e72c740b13de736c84f89bd371e34cf602448e52e641b806cbb8',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1BwB5Ccg2bpiaeDZVGe4C9ZfEaKsAdo5QP',
        '1': '1A9PrrHTndPdmU95eF3GF96s7oeUFDsNN9',
        '21234567': '1JzbviWVaEynHMT4n3DYZQ2SG96mECBipA',
        '2147483646': '18HzSL75YJs7zgC3ZCEmR4cwMFyjH2qotR',
        '2147483647': '1EqY6m3c6ufnuKkq436esBdbGwxUxeV9LS',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3ABPiv2fTPqfxZ8FFGc9RwKVAqRHrLdGtq',
        '1': '3BzeLyighXkD1h1rnjUG5iphFDSFaAFxfX',
        '21234567': '3DXa73m9cF85P6bWuSpB4Sd6HorBWSHrtz',
        '2147483646': '3MkYJFb3Sz9a1eihoogjh5ovubv9PjkABB',
        '2147483647': '3KvghrJbi6Lj6qhBkcPyd7bSMM47jZ8EW9',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qcaj8l36vx0hlc8j74kpdrkxue8t4ljf75cfxfe',
        '1': 'bc1qa6sz3kz7xgrk3uhmhhpd729wssd0xv8h395sxu',
        '21234567': 'bc1qn7zl3aucn2vsptc539z2vt9zcg2z8jm0jxus9n',
        '2147483646': 'bc1q09weu5w8564ne9tqfm0vwlwe93gprmyvna6rar',
        '2147483647': 'bc1q89fwsdt9369e02w4nxhnszfne328elykkund09',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pzqwafdyrw23ugksee8y509rkst4qjhzqqw8zmjdt6asx59y5amdsx53up4',
        '1': 'bc1pzvu58wyvsalnrj0v5dla7vgpg4su9xa4c4khncdjmmu49v2zv09snd5unu',
        '21234567': 'bc1pm9jm69ruus7lm3rl4nqt7vvm2eqgtlvklzy4k2lpavzsmz3zlrwqm8qyfj',
        '2147483646': 'bc1p2fc3rv0wt6g8swk43794w0crea64yjstcrf2dewqxgrfmzy9gylsuu69t2',
        '2147483647': 'bc1pxlurkdrej39k3kp5ye7zm6djc00755wkuh4anwhc7472n68mx4gqgu66pe',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'/0/0",
        coin: 'doge',
      },
      expectedAddress: {
        '0': 'DHHsFpmTCA2EpKhNRygBvgUmfm93m7Bank',
        '1': 'DQnGi5jAZZD24y1XV1aEPomeEAxgaochvB',
        '21234567': 'D9mjGPnGArjZHa2VGCZAwH3xF5jwmcPpVf',
        '2147483646': 'DEPwZSC6v2U5cVBJASCS1jEWSK81tzfhye',
        '2147483647': 'DLohpr6pcsLFcQNDvEB55xLQDMKM5AW7t3',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: "m/44'/145'/$$INDEX$$'/0/0",
        coin: 'bch',
      },
      expectedAddress: {
        '0': 'bitcoincash:qztls2ggkjl85xkk5u7y7g3qdkeqzceum5g295yxyw',
        '1': 'bitcoincash:qqkh3rpecqewewlukwulw52ecprfwt5nd5astx8hz3',
        '21234567': 'bitcoincash:qzdrklatn8pm349y4um3mdy4ks7skgch9u4rl8rlzq',
        '2147483646': 'bitcoincash:qrfcxv66p2sprq6c3kc768px6k3lr864rycqjvda7s',
        '2147483647': 'bitcoincash:qqvmyksrkke3ud709h2atare7eplyt3jgulkd988zc',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: "m/44'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'LWy9rHqqhzTm3Cr5S3K9zP1pFYeq6b8zkM',
        '1': 'Lb1BVsiownwH2uYQ7A75qX3oG7aViNizVJ',
        '21234567': 'LSrevtJXrrAxmAJ6oKjCDpGVmbVheKR9CZ',
        '2147483646': 'LaimiEBgWCfEFsCLktR6QKL4ztPVqHHGBG',
        '2147483647': 'Li3T9NG29uVhmQ51kRJoR928Whw9bmdkks',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'M8urAAuYSQRvziAo5CXnwGfpW3k5NZVnTT',
        '1': 'MDWL3esB1iFQJpqJ18dvL6U1hoHSfQ5LTn',
        '21234567': 'MCmtxz9n2Hxhey166xeC4MEXWZLcQ6Ked5',
        '2147483646': 'MFfLQx1weUn7Q49uPWQrJkWhsuDBg8pfq5',
        '2147483647': 'M7woQQLK64qdSRDr9MHhdeZo64U2g6BG8C',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'ltc1qlsqhvkw8y65xuv089t8e7s0h2vny4cmuvte0p4',
        '1': 'ltc1qq3484hw7dtgen8qf47ekz736spndnrlryl4e3y',
        '21234567': 'ltc1qahj5qgs8376cmz8sfr76xxd0w22x0g69c8tdnu',
        '2147483646': 'ltc1qj24a4fsw829dhh8xcexyplqv9lfxfc3ezuwp5n',
        '2147483647': 'ltc1qrx0563lressa6565vtk2n4fmpdjllglhgk3fs6',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Neurai',
      params: {
        path: "m/44'/1900'/$$INDEX$$'/0/0",
        coin: 'neurai',
      },
      expectedAddress: {
        '0': 'NbjoBMoWDP4M5grz3ndeD7g2j6eSaDQjCM',
        '1': 'Nd5XdEkBeLkZuJ4dPDk5RAYpdskLCGxRn5',
        '21234567': 'Ne9EGm17unVKyxMq7bHNSiuUd2xxsS9KXH',
        '2147483646': 'NXhSXjgr6Mxk7JTwpv5bwUx2E5J7W8zvQm',
        '2147483647': 'Ng6FjctM1PiQJgwii5c9yfk63aQzdpdwjn',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aat74vz8k8f6m9mues4cfgd3785hmswjvu6jgbnh47',
        '1': 'cfx:aan4mfmvpnszpdew9kz88v6mjvvwd39twuw92z8hag',
        '21234567': 'cfx:aan10wk4xfsnr4tbgwswgm2ppxpu99xbepvx6h6cg3',
        '2147483646': 'cfx:aaj0uy96d755cw50srw7drhv886vz779yed9j5cttr',
        '2147483647': 'cfx:aaj4srkmepkfrnyvb63zvv7h449jc3jjkjg3fjer1p',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1k786mn207hngdhena6zzcz9uvastmzu6dv4xfa',
        '1': 'cosmos1934m0rl4y7wgv35hc20drfc7ytac5ufedzr0hs',
        '21234567': 'cosmos159kee8ezhvuzxs2uv29t2wtxjddtzqqrx2dvac',
        '2147483646': 'cosmos1ly54huuyc7c29z7lpd5cqte77sr6ql378zv8u3',
        '2147483647': 'cosmos1ukdcm8utkcglyept4wqxjswrlpvqu2x6vw9rel',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1k786mn207hngdhena6zzcz9uvastmzu6qhcps8',
        '1': 'akash1934m0rl4y7wgv35hc20drfc7ytac5ufeqewgw2',
        '21234567': 'akash159kee8ezhvuzxs2uv29t2wtxjddtzqqrt3qtyz',
        '2147483646': 'akash1ly54huuyc7c29z7lpd5cqte77sr6ql372epq9t',
        '2147483647': 'akash1ukdcm8utkcglyept4wqxjswrlpvqu2x6p4gyq9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1k786mn207hngdhena6zzcz9uvastmzu64hal4v',
        '1': 'cro1934m0rl4y7wgv35hc20drfc7ytac5ufe4etktp',
        '21234567': 'cro159kee8ezhvuzxs2uv29t2wtxjddtzqqr7394pf',
        '2147483646': 'cro1ly54huuyc7c29z7lpd5cqte77sr6ql37ley7qq',
        '2147483647': 'cro1ukdcm8utkcglyept4wqxjswrlpvqu2x654d69w',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1k786mn207hngdhena6zzcz9uvastmzu673uzt2',
        '1': 'fetch1934m0rl4y7wgv35hc20drfc7ytac5ufe7l2t48',
        '21234567': 'fetch159kee8ezhvuzxs2uv29t2wtxjddtzqqr4hygl0',
        '2147483646': 'fetch1ly54huuyc7c29z7lpd5cqte77sr6ql375l9r7x',
        '2147483647': 'fetch1ukdcm8utkcglyept4wqxjswrlpvqu2x6lnv8mg',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1k786mn207hngdhena6zzcz9uvastmzu69hxkl0',
        '1': 'osmo1934m0rl4y7wgv35hc20drfc7ytac5ufe9eslpz',
        '21234567': 'osmo159kee8ezhvuzxs2uv29t2wtxjddtzqqrw37ut2',
        '2147483646': 'osmo1ly54huuyc7c29z7lpd5cqte77sr6ql370elh2r',
        '2147483647': 'osmo1ukdcm8utkcglyept4wqxjswrlpvqu2x6y4kn0d',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1k786mn207hngdhena6zzcz9uvastmzu6m7kawp',
        '1': 'juno1934m0rl4y7wgv35hc20drfc7ytac5ufemsq5sv',
        '21234567': 'juno159kee8ezhvuzxs2uv29t2wtxjddtzqqrscwh6y',
        '2147483646': 'juno1ly54huuyc7c29z7lpd5cqte77sr6ql373s0umd',
        '2147483647': 'juno1ukdcm8utkcglyept4wqxjswrlpvqu2x66uxc7r',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1k786mn207hngdhena6zzcz9uvastmzu6tg0xta',
        '1': 'terra1934m0rl4y7wgv35hc20drfc7ytac5ufetxe04s',
        '21234567': 'terra159kee8ezhvuzxs2uv29t2wtxjddtzqqrqwhvlc',
        '2147483646': 'terra1ly54huuyc7c29z7lpd5cqte77sr6ql37pxk873',
        '2147483647': 'terra1ukdcm8utkcglyept4wqxjswrlpvqu2x622lrml',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1k786mn207hngdhena6zzcz9uvastmzu60fp05p',
        '1': 'secret1934m0rl4y7wgv35hc20drfc7ytac5ufe08hx2v',
        '21234567': 'secret159kee8ezhvuzxs2uv29t2wtxjddtzqqry0e9qy',
        '2147483646': 'secret1ly54huuyc7c29z7lpd5cqte77sr6ql3798cwpd',
        '2147483647': 'secret1ukdcm8utkcglyept4wqxjswrlpvqu2x6wt32yr',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1k786mn207hngdhena6zzcz9uvastmzu6uxykns',
        '1': 'celestia1934m0rl4y7wgv35hc20drfc7ytac5ufeugjlda',
        '21234567': 'celestia159kee8ezhvuzxs2uv29t2wtxjddtzqqrhquu84',
        '2147483646': 'celestia1ly54huuyc7c29z7lpd5cqte77sr6ql37kgahxu',
        '2147483647': 'celestia1ukdcm8utkcglyept4wqxjswrlpvqu2x6ay5nrj',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwmhfgKRa9hVoFwJecMjLbdbiMqpfF2iNh8399p2woNfMxCBwrNXhPNSeA3iFnu1by6W8aQW4cBTpR6Ei2Yzeo5E2dM83Fup9',
        '1': 'XwoAYNi5zG688F7CuvDagqRVzTmCuFrbx7T3q5VMmEVWcSWzfbGKT5FT1CLr3P61W4dvKSXM7aGvWe5XTCnYGZ7E2URYeu3gn',
        '21234567':
          'Xwn1nF1ase4KmoxoeGrHMGRDuQjuMhRQyhCptptHc26NACxNGLsobX5izDRFWkJgftguaYYf9737WZtHEdT9xk2133N3iMoPz',
        '2147483646':
          'XwoLRVeyCaA1VwvXtxrzLeHYYqUEGSqcMYKwiBqCavwu6LKVCVfSZssGEMgizWcTZGQfTbKHmJxfr6PhoYJ2u7ZT34Rpk7MAe',
        '2147483647':
          'Xwn3e8x7NDtE6dSMnx7i5PFbZAbDJP7C51YDS7b1G2VLLjL8s3Y3T1vTENkbVdvUTPQA7r4UJvwre5bCnMqdzqdW2htr6XJ4H',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x6b0d57bF95EaBC628c4F75787F6C34E1557636A0',
        '1': '0x0A37CfC3b4BceB44F2FCD203B1F6Cd1F2F47503B',
        '21234567': '0x4e0Fd09e49955f72BfD552f2f4B3c7540F5320B0',
        '2147483646': '0x32DF03E5c1a2b418B9ddb11B998D59AEE9fAFE11',
        '2147483647': '0x59D991ec03f23C1c722E4D9Fdd9ceD6728226825',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x9ADe1Cc93E9d4314ba5CBbe5B18aBa8E12c343Ca',
        '1': '0x7eb5B989f6F082D8B1718aE37334612Ea5275A78',
        '21234567': '0xcc47d9a3519aC8702344c775db89D60e07c91736',
        '2147483646': '0x22343a1f54680F0b171d370B2b3E19f2032251D1',
        '2147483647': '0x178C62ecD8aE69324a2A5d8d02Ea4d502DfF986F',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x9ADe1Cc93E9d4314ba5CBbe5B18aBa8E12c343Ca',
        '1': '0xE5F2Fad605F4FB38225a56A03062aB34cCb92EF7',
        '21234567': '0x685903FED9f519508B4408f487dE6c4B05f3c860',
        '2147483646': '0x12e3898524Aec24DC434110Cd75637cef13Ff366',
        '2147483647': '0xD52ED13E1230BF7a62b30c1b4bcD0a462Ed54FEF',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1awicce5q2wcromgudhsyjasfeigefak2cy2hb6q',
        '1': 'f1ttafmbemigfz4fgttm52sc7qafpy6qhlhdbuuuq',
        '21234567': 'f1xysdhv66u6e246q73r6dfqskuns7uetehos23ii',
        '2147483646': 'f1holivr2i3jdbvlhhfcspihzcnlyduuu6do6yjdy',
        '2147483647': 'f1hcoabzif4jsdl5bdudknhwemj6ahf4kslivbuxy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qza30x4puc9cdcrraeysextzjqdsfymvnw7cqq6gr6qps67yasg5ypgu85evv',
        '1': 'kaspa:qpsdm6590wz9av5snxcy7ukagv49zaawz826waftu23ktum8e83425n80dntr',
        '21234567': 'kaspa:qp9v43qksyzas2070fkhrj4ly5wleqqttewz3tkajhkehgu7ugu2y0htevafx',
        '2147483646': 'kaspa:qpqwahmpje3p977kunfl9nk8axmlpp5atp2lq57kswgqjrg9u30tw9nmzlrex',
        '2147483647': 'kaspa:qpxd40l8k6p8jay6r7w2txs8fmk38w30knyz629k2eud8h6magzhv2vqg3mhf',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '6ec13fd902ec7a5889306f11f9271016944f6fade5ee5c4f82a7b183e1d2afb3',
        '1': '1708142a0e85217f657089267e29c37d6984212451c0b22c4b06f69d85838afb',
        '21234567': '18a9b5ddf683dcc077fc6e0830e5fed427cec9e4ec5cf381180356209687dec3',
        '2147483646': '64fde9b8503ff1025480d9e2d9c9931a4e8db3e6bc31423c480c1b0443f28a4a',
        '2147483647': 'd4ffe6849ab37380a61c9d9dab257a2f53d65eea19f3ed2fadd576bf0847a68d',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqf58jge3wegt05fmzmwnumuxumd0ymeahsjgtaak',
        '1': 'ckb1qyqqas92c04gmyg499lt07cx9k98w3ftzk8s8kxqm8',
        '21234567': 'ckb1qyq2fzdzc4ccru3y259gh4rx8vnys5mra70shq7rqt',
        '2147483646': 'ckb1qyqq2epdccu2w49rhsvlrxj86cyrkuyzfvrqj4t3a2',
        '2147483647': 'ckb1qyq92u677834cladxksgtv662pz3n0ze496s7w0xrr',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NANC2VUEPALSK5M3QURNHWBOFJ7HNVRDAG7HJXJC',
        '1': 'NDMO7J4ADICHDGLMY323MGJBBNV6VKZWV634UVFO',
        '21234567': 'NBTOULQADT64NNWQ55CSIDPNONSVTME322Q3NLJ4',
        '2147483646': 'ND5SKZW3QDEHPN7HWIFFQLAWOIWILLTJELT5ZE6J',
        '2147483647': 'NC3WAQ4IS4SQRL5RQJVNZZGCQ6S4OBU3CFN7RNSU',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5efrq0d0gp9s3zatjcrpcesvawxm588arnywwkley',
        '1': 'nexa:nqtsq5g58glsng8eyx6e07va07fz70dgwzg8gafz08mvvm92',
        '21234567': 'nexa:nqtsq5g5e47x002n7xu07tan6awr7m3c3zx4uas7ut6pujr8',
        '2147483646': 'nexa:nqtsq5g5fdnddq6rt4v6h62ze26grhhaegfhq29ejq4e74t0',
        '2147483647': 'nexa:nqtsq5g5n9zn6aq79asj582d8wgtk8pq5qyvl6jk075kqs9l',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15UazL3RuRbu9CQX55hZ74K2kQtKZwBoi1YPQTWPv5n7QxLE',
        '1': '13XQPTm53kzTjWcxSh8kbhkDbBbWndoaRCfZvAiGFFbt2NZT',
        '21234567': '16n19najJGFCuoS1YTCHGyhvVN7ijAvgxAXrhMDPHeEWPAtF',
        '2147483646': '15d8UttM2xUPsAmHpDYs5VQNrv3muGDmQPPCTd9xfVUnmf4n',
        '2147483647': '16gnFQYTerzQ3yaNwW9wpptMB6LXG1Vu7JZrY5oNcpyFHrm',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-astar',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: {
        '0': 'aQtHHkSpsyXvVRqbk6fzZe9yqbnqrLQeiK3UsiuEMkYpM88',
        '1': 'YThgRU5yDN6WoeGyMXsVD5LpcJz4YxBMuSDzavmZXaKS6hP',
        '21234567': 'biJSkHkDicqh6TL57bQAV33inqC165HtsJWmmRtbvCwnppe',
        '2147483646': 'aZRmrbMxQr2eTncLswyxzjW6LmFBBNNM69rY3NTymTEBKUy',
        '2147483647': 'W2z5D7ZP7EdBLztubuGqLA1aboooBA6qp5DvxJJgtoQeeRi',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-kusama',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: {
        '0': 'H3uWK8Eg1MMTKDSt9Tbrrqt3PAugJSr5teedpnzqny5yaVv',
        '1': 'F6iuSqspLjv3dRtFktoMWH4t9t6u14co5mq9XzsAxnrawnn',
        '21234567': 'JMKfmfY4qzfDvEwMWxL2nEmnLQJqYBjL3e7viVzDMRUwu3F',
        '2147483646': 'HCSzsy9oYDrBHaDdHJuqHwE9tLN1dUonGVTgzSZbCfmLFH6',
        '2147483647': 'Cg1JEVMEEcSiAnWC1GChdMje9NvddGYGzQq5uNQJL1woi9L',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-joystream',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: {
        '0': 'j4VoCR32KvMqTYGqkPR6Ep4BsRAyFNXCqMTSLciZMo4uDsp9K',
        '1': 'j4Tr1pAjy4hE28b4Bm2XSJhd4FwgSbDpc4eZX8RmE8EizVHKy',
        '21234567': 'j4X6caVZdKCUmJssErnaxyyamA8CeXkwibcRoucGMAdMcr3ts',
        '2147483646': 'j4VwjubsF3thxGFCX8YwYnVHDXg8hhrEo3qH9ftCvYUbuEigF',
        '2147483647': 'j4RRJCxPSUb6Yo8QohGtqephj1wBGKr2XYZCX4o8mFbx5iMSr',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-manta',
      params: {
        prefix: '77',
        network: 'manta',
      },
      expectedAddress: {
        '0': 'dfb2boq5xfy67kCAz1nHke6BGdWX7FnaZon8bFFj9mYC5Jp8v',
        '1': 'dfZ5RCxobpJUgLWPRPPix8jcTUHEJUVCLWyFmkxw26i1qv5RW',
        '21234567': 'dfcL1yHdG4ojRWoCUV9nUp1aANTkWR2KT3w84Y9S996eUGxhP',
        '2147483646': 'dfbB9JPvsoVxcUAXkkv94cXGck1gZb7cXW9yQJRNiWwtkfLCk',
        '2147483647': 'dfWehbkT5ECMD13k3Ke6MUrh8EGj8D7QFzstmhLJZE5Ew8wRP',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rGnrDDju6H3JGP8PAcnMs1JKioEba8iWs1',
        '1': 'rf2PXE1fxTStgUjFiiUKXVeS1jCa6v1JuY',
        '21234567': 'rJuQwCde7kH9xhGqpMR4C9qfyRVQtsaoXd',
        '2147483646': 'r9LCZbvPcEZ5ZqeAGB6HZ32uQEaiTDSWNP',
        '2147483647': 'rhpEptH1iKKpJcAqsS4nRX2eVvAGKVTp9y',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'B5tqDNGk8kfdVwv3BMui6bSKnGwAe4hUchc86fjkfNTX',
        '1': '38s2HV7P7nCu3C8abU2yqjUhK2GS7bVjzLEc6RTwhhgm',
        '21234567': 'CotU3hFb85h4yHJRysTZLExuo1wMmm351YXqzCfse1sW',
        '2147483646': '2riwETshQ7cKvX7XFaWvdREqAMnzi64wKVEC3QnHn2k9',
        '2147483647': '3XC3J1ZMudUhcWW395YoonQs3CjJpZrUUA3f7FcRWTL5',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x98c4cb28bb180d213799f01dc6568113',
        '1': '0x8bdb61e0a53d6747380fd60587d45e31',
        '21234567': '0x013666bb35fb019fbc699612ce62da37',
        '2147483646': '0x983da53a21774f4515b5944d80914641',
        '2147483647': '0x4433fbdfb8692e475cb4ba5071868580',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GD6SWO2KIJS2K5PCA5EAYL2JHOCTGNPVPTLZAM4XGOAGXN7VCBHPZ543',
        '1': 'GBO7RNYUDJNRKY3G5TTJIPDXK2DJ2K5T6TWUWNBHH2AZPL4T4ZEX6XIZ',
        '21234567': 'GDE6Y3EO2E4Q7ZUYGWRYJ2OG2WBW2VFKKV3ZPTSVPEG32OJSRKQ3V5FW',
        '2147483646': 'GDIY7AFU4DGER6D4K57GNMSTCN7FVYQMGATZ2TNSZRQ6VAX5V2QFWPA7',
        '2147483647': 'GCHL47SAYYMLVDTWIT32SE2HSETI2ZV54NKFEMI2PY3F4INNVT6QCUAP',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x16edeeb71fc7dfb39a83c36df4db6972112ebdd9d09a6e082938d01d9bb65e90',
        '1': '0xd59b70f522fbf09f6c4a5bb36ad2dddd30dda50b5261405745ff2452390d7e3b',
        '21234567': '0xf207b44270b3fb2fcb23e31a00fa895b54bf56b329009d1c9eb4a0aec950e248',
        '2147483646': '0x295c3d0dce7ef597d6a974178180fc6a5c275f4c773a8b10b23ec87f7ab02557',
        '2147483647': '0xc1694ad7e7147b41cc32f7dad99f9993cd9ab313e28d969bda47f5e25fc435b9',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TVaY1kz1gqbyGETTaLTnrdhusVuiFCUNfR',
        '1': 'TYxrJuywFChf4HzXjmQE1FPmBrAx7ZKGJH',
        '21234567': 'TBVYUi1CJT6PqznPo28yeqoky6UBie4mQ1',
        '2147483646': 'TUNpFwNBypUDkcEPoS9pooR6YkSTnuvKo9',
        '2147483647': 'TZGDfP18VzGXFseZzF4LAgKrEXXBvhmbXb',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC9a7a4db1fa7347ad924fdce215badaef6f0d03717a3c0dc68e85a006fb137aea325d',
        '1': 'BFC97c73d847bc5d544988e5f5667d86d42660111f1ade5606b2453d19f57fbda1142b7',
        '21234567': 'BFC5fad91679c71ef7e4514164bef941bfc042034b479c980cf480eb71f3edef66c5d36',
        '2147483646': 'BFC1208c96e3a449aa4c2d704152d08df20b75d6e1c27750f4d9dc69dc1d7298b18ffbf',
        '2147483647': 'BFCa893f9639eb206c4631e2edbcb23e24a1d3cf0ff5f9391c821c59e99129262a79052',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NehsxL4SZWWzg9z17Nh5PHJDwoB7qRTbri',
        '1': 'NdTzVd87Rz1zpsL7Mso439fxpGAdvNLSbx',
        '21234567': 'NeAf4EyFoaoE6cmfbm6eYCA8RnN1okDzhP',
        '2147483646': 'Nak5aigAoB5bwTujK8GN3k2WuYczZoCskR',
        '2147483647': 'NSJkfKZnLMpU7tpzuXQPi9dawoLv3phXKC',
      },
    },
  ],
} as AddressTestCaseData;
