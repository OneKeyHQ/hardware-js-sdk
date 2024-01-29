import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase18-密语2',
  passphrase: 'E4j4fjFFA~',
  passphraseState: 'mssaQmy8Mt5LoZQaEdqJQbQ4RwUojJGjwL',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429817885',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qxvqdqzux8e98s6rpwhwunf3g7u27uwqh6du2hss9rtv2k5r9r67fmwxzvtcrvp96tlv0tkzezfsnhkkwyxn0vcy704qccgn32',
        '30': 'addr1qyj6ed7pp5l3udd70u4pfh4g4s208w5gpp86ww7drf702drwpfkh9rxqsx42uytxlttpr5wd9u7chv52r6al0hllk3jsjmk640',
        '2147483647':
          'addr1qxe272v3trrwc9e8du5za29rztuev60yyzu9ncntsuzt39gayu7yw80cgefc9qncq0p2j4m3pa7gac03x55972pwevgscm7kgu',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'VYUX7FNRXAIRZWG26BSGAHOIJLBN4RSLZHHCR5YFWK2IWVCC4AVDDXBUT4',
        '30': 'ELEXTKYWMERRXB7WUSJC363LXKFDQVL6BCDMT2YH7S656U7XBIVCQUG2YU',
        '2147483647': 'PL2QMQMMX7O7FQQOQ3AEAEALR4SMFD2TAO6AK2BWAWZP4JBEUEU4C52OHA',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x526f2afda75ff732a913e8b04e0034916d15b47fbc54631e57af915ec5aab140',
        '30': '0xc0ec686cd42b7c0cdf4b7c590cf33fdfbdccfab22ba1fbbe3a4feab6c793045b',
        '2147483647': '0xaf43717b0f33191ccf513bb5e3365c8866258078ca38a9a212096d25b71b7d6a',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1aMKedvT86qpVz58osnto1ag1baHBRm76',
        '30': '16V1z5qSXF3mP3Lb33qNhrg1Ce5BWtjJmV',
        '2147483647': '157TXNVbvjzW32yQVyeTScSSpxC7RUTAAF',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3F3ZLCqrJURbpqkqxC6NgqvPzWPaqyyz85',
        '30': '3GkZYpBnQXhX5z6kV6Ya8BzZY2KbPEkeFh',
        '2147483647': '32WY191WteTKMHXRG4bMYUN8V9Z54NtpBY',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q7sfdjkvzfv6c6euvtee06vfshzpjycefcjel22',
        '30': 'bc1qnngykpt2uxu9mj9f47lnatlf0a4wksfhca8rhd',
        '2147483647': 'bc1qwqctqmlda3c62uauk5hqsaylnjparecxdg2ckq',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1p7ac38cfyuex0zr2v9cyqv5fc6hzth3d9jvgau0uh858ewnyzjmjsy82tl8',
        '30': 'bc1pkkyld0q0zhd3j7c3emduxvk4mt3wd48xhe4wafcf4al7jf67ty5sjw0c0n',
        '2147483647': 'bc1phwfeyzzv62dnx06fywwkmn0wyuhr8kxt27dp2qlxt5kpld4u2hrsmttu75',
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
        '0': 'D9Fm96foohftZggjarGonf1UM7JMVW7fn5',
        '30': 'D9Jg3Hy1cBoULt5f7kQdjugP8KnCsMY8Tf',
        '2147483647': 'DDXBBWterwz5WHpbYgpVEiNzUzBJHJ66oL',
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
        '0': 'bitcoincash:qpky93dsgyh9kgndrkvcnsvr3r33erqmf5yghh9445',
        '30': 'bitcoincash:qr4fcdl737kk5maz0d8xqmpm3uq2gzplgc5dm2le9m',
        '2147483647': 'bitcoincash:qr03ypqs0klpf7pk0xc9243qwyg38gwlsus2w9ek72',
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
        '0': 'LTBWQdTbvtWaupZybhfQ6ZfSpaEfsqiH8F',
        '30': 'LfbjqYYekict2vix3mfTwmKmsjovztC7rk',
        '2147483647': 'LWvDhJMA4jnv4CsgYrG2Lx1ww62Jg8AbJs',
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
        '0': 'MPyGLd5kq1Xbhg4hd69xdJzhkxEFjwy4yN',
        '30': 'MCtgfo3EoyLWnDe626BJ4sFXUPPXF2VuS4',
        '2147483647': 'M8BBhwAnn8vAxizjvC2JZRKVDptzxxU7vk',
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
        '0': 'ltc1qt8k8z83qe7my30l536sqt6722jagsh84e88073',
        '30': 'ltc1qnvhr84e0353mvemnhyq6xf0ckun67zw2ntqc70',
        '2147483647': 'ltc1q4ju72vtqszyts29sfqfm57jajsf4grzyhyfcaz',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aamwx09g5tzufc3xxzp28jwu6csx3d9frpxvr7k3p3',
        '30': 'cfx:aajer6ffyw1f65mc0mtter0xn6d1p9gx820gapgxts',
        '2147483647': 'cfx:aarjgct1g67gr38ady8e4751mkzh6fccfe2r95wt3v',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos15p67hc5ps0hvmvr9gjug68970vqhujuc378ny9',
        '30': 'cosmos162vcd2w3s7ft9ratkuj8v2kyp8kswm3p9z5atc',
        '2147483647': 'cosmos1rsu7nc072zv0cnfgyv9qct0cd5x3tddye874sz',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash15p67hc5ps0hvmvr9gjug68970vqhujucu925al',
        '30': 'akash162vcd2w3s7ft9ratkuj8v2kyp8kswm3pgee6jz',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro15p67hc5ps0hvmvr9gjug68970vqhujucf902c5',
        '30': 'cro162vcd2w3s7ft9ratkuj8v2kyp8kswm3paeuyhf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch15p67hc5ps0hvmvr9gjug68970vqhujuczrwhxj',
        '30': 'fetch162vcd2w3s7ft9ratkuj8v2kyp8kswm3pklaef0',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo15p67hc5ps0hvmvr9gjug68970vqhujuce95rjh',
        '30': 'osmo162vcd2w3s7ft9ratkuj8v2kyp8kswm3pde8da2',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno15p67hc5ps0hvmvr9gjug68970vqhujuc8vygre',
        '30': 'juno162vcd2w3s7ft9ratkuj8v2kyp8kswm3pnshxvy',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra15p67hc5ps0hvmvr9gjug68970vqhujuch6anx9',
        '30': 'terra162vcd2w3s7ft9ratkuj8v2kyp8kswm3prxwafc',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret15p67hc5ps0hvmvr9gjug68970vqhujucnmn6ee',
        '30': 'secret162vcd2w3s7ft9ratkuj8v2kyp8kswm3p88q5ky',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia15p67hc5ps0hvmvr9gjug68970vqhujucq5kr7g',
        '30': 'celestia162vcd2w3s7ft9ratkuj8v2kyp8kswm3p5g9d34',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x5D7c79cDE8Cc9DaDee8B9d10609c3b55E5eEfBc7',
        '30': '0xBef8C24C4DA612227B44053cbd44e4575b00D448',
        '2147483647': '0x0945e49c91acDdb0DAa3899Da0E48f3f83c5bB12',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x5e25bf75548fc33402D85DeD445c02AF158D49Ee',
        '2147483647': '0x81b8EE46b101230E5630750E775197b16dCa4D21',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x5e25bf75548fc33402D85DeD445c02AF158D49Ee',
        '2147483647': '0xFCF2038D2A2FC4A41Cae635d33e5c07220b6D90F',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1dylzozh2higmboduefysphflyrr6gpd2hthf3vy',
        '30': 'f1lzepksmyz2b4opricw3qxpzq4wues5x5xfqjrni',
        '2147483647': 'f1ge6i5kjzruh7afaccwfzg5ch56qsywpti6kzsxy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpwzwmy4lqp7xnaszegmtytjq2cawje202zty22ammx6mmqm72fc56y9gqkle',
        '30': 'kaspa:qplvl0jpgsk3mmv6d340cwul03du5g4ynv2dsh58n066j92yqfnwvhulq0fal',
        '2147483647': 'kaspa:qpzsd5vhna6yyk25lx4289c9wj7neekp9tmhtsxxyppu3djmlgxdqhnpettct',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '08fb061bb5839d0cdf51572fc247d3295fb7b99fbf73c79df931fb317333d0ef',
        '30': '255f0ec41bee2fcf18fcb358c5650e2b436b137f4f262d4ea3405a8f527e05a9',
        '2147483647': '26124244397ea4a8431d37d53c5be6a6dba85796cfcd87be64f8197252d65b87',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDAVRG4MKQOX4VA7CNLKZHMF3OVYE76H7CDI43V6',
        '30': 'NCBQEA3LEPBSL7733XGV2IBDTDKP6TAJPLHX2JUS',
        '2147483647': 'NATNLENDS73Q2KZWBXI7RUZ6AJ5YKS52G6DHZEOR',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5msph6pt5yt0cysyjlyw9089f07w0sqchynmxyq7g',
        '30': 'nexa:nqtsq5g5mtxxcyz757w3n2ydqrk5ydgqtwhdlq8v4n8e4kr6',
        '2147483647': 'nexa:nqtsq5g5u5trj5psu6gg82rf6p2u8emawekunlw0q06hjeuk',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15RTqN4v7qJyssVXcbQEkn2XbrHUjNCECmM7gQwLiaxMzbT8',
        '30': '15pi1xtyZCja5h61iKnkcNKCnyDzykAAPbR4wPw4YM8vnvh',
        '2147483647': '1MZuEyKXb1iEM4mq1THaLNV4ASAY5VWkZuJ8Do9yp8ysmMt',
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
        '0': 'aMm8Kmw3HgcfAWr9FoMeHMeqGzx1HLq9U7mkq9r2rvoQJya',
        '2147483647': 'WHsCCgLT3PM1e66MfrQTqhcHb9doze7hGfxCe1fJ67RHWnm',
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
        '0': 'GznMM9itR4SBzJTRfAHWaZNtpa4qjTGaeTNunDweJ9LZHgW',
        '2147483647': 'CvtRE48JAmAYTshe5DLL8uLM8ikeSkZ8T1ZMb5kuXKxSS6G',
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
        '0': 'j4Vk5G53p8mYYGwvkvvnvTmuNGcNQXxDFrDF4tfzJba5UTe9G',
        '2147483647': 'j4RgBKwxDYXFGdRW19LqyHLFKivX6LfWYQ1oFLUr7roG6Lips',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rwjBAQutyqzwLJqoQJn8dkiY235ZwbSchr',
        '2147483647': 'r9Hd5hiQLqd8SH9Jkw47eTan2ZGuoqRnwU',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '8KQ4TzzSBGrgczesbfH8NKirBaTRQkhygVLSAtBVE47a',
        '30': '79sQBin44FWz86hdJaKiyxcEnnv5yX2tc7CjXB7fHWjX',
        '2147483647': '2zjXEirR2je3qZmr96HjKaS7gW2XrmusULCf7ctjfqDs',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xda94a5284a22ad692aa40180e050f1fb',
        '30': '0x2586df8793e6fe98d35d39b32e15d92e',
        '2147483647': '0xf9e8037b9818bb3999a83f0fbdeb6b90',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GBPPG5QEFHTCLOBZEZFROUOENAUMTVHNABZVEYSDGADC2IVWNPDNCAZN',
        '30': 'GDQ7KTVYQ4VGMDML5JS4KLE3ICGWKMBURF4YYQQDUR7E23WISLCZAUU3',
        '2147483647': 'GDSEEZHFGB3UORM5PM6MC24VWB76V57ZJQQOZEAIGSKVY3ZOIDRHUGKI',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x945cf103bf3b665b85a5e44c6a394294e5f7296a89881ada295c58ae0cd6a36f',
        '30': '0x39cebc64ee703b1114c2c207f6114b69959df5e775d990e9092527d78c0bf53c',
        '2147483647': '0x16c0efd47015147191c409d7b5a898a7f4ac8ab647b540487d0ea712f614e6aa',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TY1onQCsKxvQSbF2pwJqBrSykzAe64oYUe',
        '30': 'TNsYYsJ3MXpAwmcygC4sKYfswN69ayCnKJ',
        '2147483647': 'TCMV5P7heGwMHpNVkog4Lp2nuAaLLaWN7m',
      },
    },
  ],
} as AddressTestCaseData;
