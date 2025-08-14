import type { SLIP39TestCaseData } from '../../types';

export const count20ThreePassphrase2: SLIP39TestCaseData = {
  id: 'count20_three_passphrase_2',
  name: 'count20_three_passphrase_2',
  description: '16-of-16 (20 words each) + passphrase_2',
  passphrase: "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
  shares: [
    'platform helpful academic afraid custody blind shaft burning visual prune knit clay mason genuine march crisis smug wits woman taught',
    'platform helpful academic alto armed theory alpha paces welcome quick quiet device craft strike chemical ocean briefing space phantom legal',
    'platform helpful academic anxiety cage sympathy dramatic western acrobat transfer oral spew package style scroll pajamas curious grant center alto',
    'platform helpful academic award cards category salt guest pharmacy devote pistol focus identify infant evoke recall shaft empty hazard romantic',
    'platform helpful academic bike clogs estate duke thank bolt floral race phrase preach seafood strategy industry crowd length grant yield',
    'platform helpful academic bracelet clock daughter memory visitor result blanket garbage starting speak clay junction pitch ladybug jacket fluff ultimate',
    'platform helpful academic burning credit install sidewalk level museum evening permit duke cards findings aunt document improve woman general august',
    'platform helpful academic carve ajar edge similar glance darkness random envelope glen ancestor gums view venture wealthy learn ivory exotic',
    'platform helpful academic class depend gather story empty harvest overall craft leaves nuclear reject kernel that temple width presence speak',
    'platform helpful academic company adequate western resident dismiss mortgage emperor coastal sack example ancestor mason length mama timber rhythm buyer',
    'platform helpful academic crucial domain bedroom violence mental multiple language sympathy grin beaver salt excuse pants worthy vegan prepare unfold',
    'platform helpful academic deadline crush depart thank pregnant treat salon ambition miracle sidewalk speak practice taxi soldier scholar vitamins junk',
    'platform helpful academic deploy chemical afraid justice undergo deny excuse famous entrance scene early photo glance salon platform wildlife ladle',
    'platform helpful academic diploma cricket trend loud replace rapids payment paces theory easel spine cultural dictate hormone necklace blimp exact',
    'platform helpful academic dragon company true volume carve dough endorse force plot cinema remember skin transfer criminal hunting axle mayor',
    'platform helpful academic easel deadline evil museum spill funding muscle retreat smart timely oven transfer grownup deal armed merchant flash',
  ],
  data: [
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
      },
      expectedPublicKey: {
        "m/44'/0'/0'/0/0": '020c9dee4d495c89d75d0bfc15d45afe2cd1fa452dae3896c819a00262e92ea972',
        "m/44'/0'/1'/0/0": '03496cbf9b5dc98759780cd6090e183edaf90b1b68bc88e8a453330ba06aa13e8f',
        "m/44'/0'/21234567'/0/0":
          '037c60b18b53a8c3ea1a8bda97db7c2c1333b6626625b54b0979445a6e082c277d',
        "m/44'/0'/2147483646'/0/0":
          '03934878376e295b93d976f51ec0d9c05e6fa14e079a5e0aafe8e16c9b393bf507',
        "m/44'/0'/2147483647'/0/0":
          '03a6d0f96dfbb770061e9bd19acac90c3c4f866a2af206c0336060aedece58cdcf',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedPublicKey: {
        "m/49'/0'/0'/0/0": '031b4fe8a21b171436fe3ed748900efda81f1ecf1da345a76950a1b71d68195df5',
        "m/49'/0'/1'/0/0": '024085586306345eb6b4a415ce46f2ab46ca45283b9559ff60df1feb00bdba912a',
        "m/49'/0'/21234567'/0/0":
          '033b44b1d578541afd43267e3629d103b7346ad1387e510c1ae3d21f5f50e9c5bb',
        "m/49'/0'/2147483646'/0/0":
          '0374a682a2caa575bcadd0c291ca2cab9fa64cddb2155db8bc896cf351e84fbc13',
        "m/49'/0'/2147483647'/0/0":
          '034b25657c9a67d44344ac3a4edc01c27daa6e69b37a7a56b030d8694afa68d8e0',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDWITNESS',
      },
      expectedPublicKey: {
        "m/84'/0'/0'/0/0": '03f106ebcf555b55c2c65d99a372aeeb7dea72512d281874614fd5cd95f405e52f',
        "m/84'/0'/1'/0/0": '02aeb5c2981e76b93042b4b8671a602bc944c9868b7d95b3bd0e55e796420a047e',
        "m/84'/0'/21234567'/0/0":
          '0383ef87ef7ae419528c94a9852ffd1dadc078a11bc88ca04f1b3e8b9b77986d79',
        "m/84'/0'/2147483646'/0/0":
          '03cd1f1f61f092b7e08d0ad57752d1780a2bbe815eb831dc9c037f774dfcab3b7d',
        "m/84'/0'/2147483647'/0/0":
          '03eff712595762ca6bc98f4e3d44d6706c5ba8591ca80e68b89ae5ce8a0d7f2190',
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDTAPROOT',
      },
      expectedPublicKey: {
        "m/86'/0'/0'/0/0": '032f6fae57f323e65e1724874b39fb7fafbe3f2bc1a14515d5f14848ce36c02c5d',
        "m/86'/0'/1'/0/0": '02bb05ce9149e0f39fbd0b55fc91fdf527d0cff777b86203a802bddc937cecff67',
        "m/86'/0'/21234567'/0/0":
          '02babb522b38c8ff51ac21ccee345ece92a6b9a59e8db528f0d7387a257c616580',
        "m/86'/0'/2147483646'/0/0":
          '0389511cd5d544cd899d673cffed9fe07ab6492936414942212dc31fae476ed64d',
        "m/86'/0'/2147483647'/0/0":
          '02bcd4359f60ad2c9d86259b555b0ea856e1c01d9eae58687fd49b4d96eb755b3f',
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/60'/0'/0/0": '0x031a7d1769d515a9b826417d28a9f4d50a0b5bd1d6c139b718c194b6b20b142a74',
        "m/44'/60'/1'/0/0": '0x03e75de1a98ecfbb966ef4117075a08ed23753da088e33ad0eab5efc10767ae651',
        "m/44'/60'/21234567'/0/0":
          '0x026df021cb06a0409cdb647c6bc730b18b49dffb14592ed268ad2b9faa0d9d1222',
        "m/44'/60'/2147483646'/0/0":
          '0x022a5f06cf40e08946bb8c2c0f57f0a16f4f0463d9e90fe32a0438e28e01ab6ae2',
        "m/44'/60'/2147483647'/0/0":
          '0x037530572c1d9bff0588335b72c7f6cda265ec61d02b51978db258be028c58e2e9',
      },
    },
    {
      method: 'cosmosGetPublicKey',
      name: 'cosmosGetPublicKey-cosmos',
      params: {
        hrp: 'cosmos',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/118'/0'/0/0": '02b074394506254c9aa1e79b9e60ad4dd6d8e33c25da66237ecd8b502731bbe0f7',
        "m/44'/118'/1'/0/0": '026fe47d237674f521595ac3e4900fe58e1b3d285ac9ff786aabae8bae01fd6c74',
        "m/44'/118'/21234567'/0/0":
          '02f65e42ce2f7135cd03db759157fbad830c5b457c965d01b6e83d254dfef2106a',
        "m/44'/118'/2147483646'/0/0":
          '020670a441b0901f4fa145f39173c39f0145c708f012dcd63f52c2df272d35d40d',
        "m/44'/118'/2147483647'/0/0":
          '030c30df7805e66b47142a3a88a3964b737ff6815446c9f612531a442533275a8a',
      },
    },
    {
      method: 'suiGetPublicKey',
      name: 'suiGetPublicKey',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/784'/0'/0'/0'": '000e8b343cb76c61f2d38479d47ebc2bd47d30d1bd2c7a360fe6ce4d3a759f4b3c',
        "m/44'/784'/1'/0'/0'": '000f08766d6a5a9b2b9abb45c30dff12de33c094c86206356faacc777cf9c12803',
        "m/44'/784'/21234567'/0'/0'":
          '0088694e4b49522b9522d4f74744c5f8e4541f62966d85619e483c1cd443ca3121',
        "m/44'/784'/2147483646'/0'/0'":
          '005fffb9187810489d70e75f8b59bce5b94b7d1bd9541011aeaee544db6608ff8f',
        "m/44'/784'/2147483647'/0'/0'":
          '00d21f22271ec1b8f685c3f1ae44d8cf339e26a27024d7f04b8cc93c6e3e60c06a',
      },
    },
    {
      method: 'aptosGetPublicKey',
      name: 'aptosGetPublicKey',
      params: {
        path: "m/44'/637'/$$INDEX$$'/0'/0'",
      },
      expectedPublicKey: {
        "m/44'/637'/0'/0'/0'": '2ec54d71eedced9640fb8bb2fef7ec2fbcba63374d64347e73b7b4eb5d9f2d3c',
        "m/44'/637'/1'/0'/0'": '466f6c3673b9211efcd6ff50f233dbc34b69f2b8911b91105010151ebf0dd377',
        "m/44'/637'/21234567'/0'/0'":
          '8e18b3b040fdd8109efe5fcfc9f0ff51cd70d85ca293436fda194f74806a2343',
        "m/44'/637'/2147483646'/0'/0'":
          '2efb03364ddce4a45db3765cab9494d8257886e53b48a886e23de086d48cdcc0',
        "m/44'/637'/2147483647'/0'/0'":
          '0a4a972a80eca1305f3c0c68781d9c919f497715a567afe954794c052ecd29ae',
      },
    },
    {
      method: 'nostrGetPublicKey',
      name: 'nostrGetPublicKey',
      params: {
        path: "m/44'/1237'/$$INDEX$$'/0/0",
      },
      expectedPublicKey: {
        "m/44'/1237'/0'/0/0": '579fb90ab82a942835bc25e56563e296c643039d7a674a0335a717e219773fb0',
        "m/44'/1237'/1'/0/0": '1e707d8206b28aad31a4d2f1943162150fb4c9505321d973dad264f55fca3feb',
        "m/44'/1237'/21234567'/0/0":
          'af698cea5b1bbd57a53dbec75f615846a2c586ef94c880fc9f8baf3f797fdc5e',
        "m/44'/1237'/2147483646'/0/0":
          '96abc0685f231d22424b7bd80841df00fb384179f3861b9731486150d0ee66a6',
        "m/44'/1237'/2147483647'/0/0":
          '5fa6ac446273f988f0f01b5cc4be170bd3b80af478337fbfdeed9afef836c82b',
      },
    },
  ],
};
