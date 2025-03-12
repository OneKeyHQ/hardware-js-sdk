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
        '1': 'addr1q9hmf5mkf64pqlhz46n0spmkedrav6g8m3gucrac3f29hzjz49cha034gv9yn5k4523yh9yk6jdd6ura55xwc7550k9suzmgau',
        '30': 'addr1qyj6ed7pp5l3udd70u4pfh4g4s208w5gpp86ww7drf702drwpfkh9rxqsx42uytxlttpr5wd9u7chv52r6al0hllk3jsjmk640',
        '2147483646':
          'addr1qyjpshlhp6hecvfp43n708qx8h2snmq7yyxy8azeeqqklg27kr4xf6r698sc2ywjxcmruac8tkpukqpuuvrjw305wclq57m37y',
        '2147483647':
          'addr1qxe272v3trrwc9e8du5za29rztuev60yyzu9ncntsuzt39gayu7yw80cgefc9qncq0p2j4m3pa7gac03x55972pwevgscm7kgu',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'VYUX7FNRXAIRZWG26BSGAHOIJLBN4RSLZHHCR5YFWK2IWVCC4AVDDXBUT4',
        '1': '7PFNADKGK43YSCJDFXCF7KRDSUUOMCH4JPRNHZOBU6ZTBFJRZFP7BUSKYQ',
        '30': 'ELEXTKYWMERRXB7WUSJC363LXKFDQVL6BCDMT2YH7S656U7XBIVCQUG2YU',
        '2147483646': 'GXIZS6WBLVZEXQMWTIRWUC3BA3SSFHYFQIFNCLQJBHKXJWPLP6T4W5KI2Y',
        '2147483647': 'PL2QMQMMX7O7FQQOQ3AEAEALR4SMFD2TAO6AK2BWAWZP4JBEUEU4C52OHA',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x526f2afda75ff732a913e8b04e0034916d15b47fbc54631e57af915ec5aab140',
        '1': '0x4baa2e3e51583c2cbcd43a9456c7cf6422df31ab6f3db9929271745c6e7e8a1c',
        '30': '0xc0ec686cd42b7c0cdf4b7c590cf33fdfbdccfab22ba1fbbe3a4feab6c793045b',
        '2147483646': '0x73d092763de064f251114463c2ed41097b819b7b8613ae29928abefb2554439a',
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
        '1': '14MxM1ZencQZacphAcCXdVZ6ZrArXCEXQt',
        '30': '16V1z5qSXF3mP3Lb33qNhrg1Ce5BWtjJmV',
        '2147483646': '1MHpKF8YJhVvTxQ1XsdgspY5S1WTd7Ais7',
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
        '1': '3GgBjDEoQyzSYrw1BtzRSaWH9aKofkWJEH',
        '30': '3GkZYpBnQXhX5z6kV6Ya8BzZY2KbPEkeFh',
        '2147483646': '35VFeTZhz1RPSUJDwCZgwqThM6JAzpnU7D',
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
        '1': 'bc1qq3lf74hjxafwwtmy2y9857nrwnj2ed3q5d0gwz',
        '30': 'bc1qnngykpt2uxu9mj9f47lnatlf0a4wksfhca8rhd',
        '2147483646': 'bc1q3jthvvu0u9hmpk4ttdmy64vag9r4gxhfdjpjc7',
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
        '1': 'bc1perf92efkgjxpjspsagm4rzelz75jktxtw3tlhjx5pyvhyahmgpfs0dy0xe',
        '30': 'bc1pkkyld0q0zhd3j7c3emduxvk4mt3wd48xhe4wafcf4al7jf67ty5sjw0c0n',
        '2147483646': 'bc1pshlfg8seyulyzuw6ump7qsswtvrf4mweam8gw796re7ta7ud36mq8xw3ug',
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
        '1': 'DMeaYe8b4XpLJr2pC4B36QA5eeM91rETiN',
        '30': 'D9Jg3Hy1cBoULt5f7kQdjugP8KnCsMY8Tf',
        '2147483646': 'DMGpFsZtwiSCTZbBo3Jp6t6WYS1rpwX2N6',
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
        '1': 'bitcoincash:qrrzk3ku0pvrnx8rh090z6r6jna5rp33758s7hjql9',
        '30': 'bitcoincash:qr4fcdl737kk5maz0d8xqmpm3uq2gzplgc5dm2le9m',
        '2147483646': 'bitcoincash:qzysvslwynd4qt25y5duylhf7ce7rt2gyqztlqk0yt',
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
        '1': 'LhMneM3aHV6JW4qvsoddbqvbYFbhifN8Mp',
        '30': 'LfbjqYYekict2vix3mfTwmKmsjovztC7rk',
        '2147483646': 'LhgbRxkuzMzXJtUfHxXKGrAWkrFQ1XbwMN',
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
        '1': 'MGGKriWEYCtbsVKHMauwxqTjoC6DFu8G2u',
        '30': 'MCtgfo3EoyLWnDe626BJ4sFXUPPXF2VuS4',
        '2147483646': 'MS6sZUWZTJbYCSM2c1zEKw2NAxBHrazFGJ',
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
        '1': 'ltc1q46l9cn786phhghwacnf4pg3xmvhta9m72ssy0t',
        '30': 'ltc1qnvhr84e0353mvemnhyq6xf0ckun67zw2ntqc70',
        '2147483646': 'ltc1q4a47u58merdjq8dg447q3lte2698hq7wqh6vk2',
        '2147483647': 'ltc1q4ju72vtqszyts29sfqfm57jajsf4grzyhyfcaz',
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
        '0': 'NUG8tcSdrUtPmVdZUn7tT83SWnf2EUp2fM',
        '1': 'NVy2s63TB9NvozDkn1ABre4mCcqLdQhEAJ',
        '30': 'NZs7X6Lzy9jCqMPw8WE4P2otZHupNvdWqi',
        '2147483646': 'NiLojpXmuLJX9v5uRWDvVaGsuWnyEg1Qv4',
        '2147483647': 'NRc2z8u3XXQ1XYoEomPq1mterSmudZ5fNg',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqdh6jtrh4rys6n28qq9puhz0skq5qwhmds9l63ur',
        '1': 'ckb1qyqg8xtjm66mty2a45krshgjms7d4dmqlm5ssj250y',
        '30': 'ckb1qyqzlsnwk5m6q7ncuqrfmhjll9daw9stuurssjfyds',
        '2147483646': 'ckb1qyq0lefphc7xxd46m0ppzmrpwul3kfpx4dxq7300va',
        '2147483647': 'ckb1qyqqxl3yekrvxjk2h6h8ps2kqqmdyglk9gss3sm8t4',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aamwx09g5tzufc3xxzp28jwu6csx3d9frpxvr7k3p3',
        '1': 'cfx:aann3knrfmffapkyvr5nnttxssp44hbnu2976awjxe',
        '30': 'cfx:aajer6ffyw1f65mc0mtter0xn6d1p9gx820gapgxts',
        '2147483646': 'cfx:aarmh3mmyan8wk813t5kvz2ma616tmrms20eusgff6',
        '2147483647': 'cfx:aarjgct1g67gr38ady8e4751mkzh6fccfe2r95wt3v',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos15p67hc5ps0hvmvr9gjug68970vqhujuc378ny9',
        '1': 'cosmos1csjwcxwcsadqlyh2p5qzccws7sstrw9xxpnln0',
        '30': 'cosmos162vcd2w3s7ft9ratkuj8v2kyp8kswm3p9z5atc',
        '2147483646': 'cosmos1aexjy7l7kve5q4yyu42gyrrnza2rv6cv8a4awz',
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
        '1': 'akash1csjwcxwcsadqlyh2p5qzccws7sstrw9xt67c24',
        '30': 'akash162vcd2w3s7ft9ratkuj8v2kyp8kswm3pgee6jz',
        '2147483646': 'akash1aexjy7l7kve5q4yyu42gyrrnza2rv6cv2xc6hc',
        '2147483647': 'akash1rsu7nc072zv0cnfgyv9qct0cd5x3tddy5unjfc',
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
        '1': 'cro1csjwcxwcsadqlyh2p5qzccws7sstrw9x76mx07',
        '30': 'cro162vcd2w3s7ft9ratkuj8v2kyp8kswm3paeuyhf',
        '2147483646': 'cro1aexjy7l7kve5q4yyu42gyrrnza2rv6cvlxayjn',
        '2147483647': 'cro1rsu7nc072zv0cnfgyv9qct0cd5x3tddypukvvn',
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
        '1': 'fetch1csjwcxwcsadqlyh2p5qzccws7sstrw9x4u6m3c',
        '30': 'fetch162vcd2w3s7ft9ratkuj8v2kyp8kswm3pklaef0',
        '2147483646': 'fetch1aexjy7l7kve5q4yyu42gyrrnza2rv6cv5quev4',
        '2147483647': 'fetch1rsu7nc072zv0cnfgyv9qct0cd5x3tddy26h3j4',
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
        '1': 'osmo1csjwcxwcsadqlyh2p5qzccws7sstrw9xw6q09a',
        '30': 'osmo162vcd2w3s7ft9ratkuj8v2kyp8kswm3pde8da2',
        '2147483646': 'osmo1aexjy7l7kve5q4yyu42gyrrnza2rv6cv0xxdcs',
        '2147483647': 'osmo1rsu7nc072zv0cnfgyv9qct0cd5x3tddy3ud9xs',
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
        '1': 'juno1csjwcxwcsadqlyh2p5qzccws7sstrw9xsnsy5n',
        '30': 'juno162vcd2w3s7ft9ratkuj8v2kyp8kswm3pnshxvy',
        '2147483646': 'juno1aexjy7l7kve5q4yyu42gyrrnza2rv6cv30kxf7',
        '2147483647': 'juno1rsu7nc072zv0cnfgyv9qct0cd5x3tddy04awh7',
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
        '1': 'terra1csjwcxwcsadqlyh2p5qzccws7sstrw9xq9fl30',
        '30': 'terra162vcd2w3s7ft9ratkuj8v2kyp8kswm3prxwafc',
        '2147483646': 'terra1aexjy7l7kve5q4yyu42gyrrnza2rv6cvpe0avz',
        '2147483647': 'terra1rsu7nc072zv0cnfgyv9qct0cd5x3tddylry4jz',
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
        '1': 'secret1csjwcxwcsadqlyh2p5qzccws7sstrw9xyy8kwn',
        '30': 'secret162vcd2w3s7ft9ratkuj8v2kyp8kswm3p88q5ky',
        '2147483646': 'secret1aexjy7l7kve5q4yyu42gyrrnza2rv6cv9cp5n7',
        '2147483647': 'secret1rsu7nc072zv0cnfgyv9qct0cd5x3tddymz2ud7',
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
        '1': 'celestia1csjwcxwcsadqlyh2p5qzccws7sstrw9xhtz0fz',
        '30': 'celestia162vcd2w3s7ft9ratkuj8v2kyp8kswm3p5g9d34',
        '2147483646': 'celestia1aexjy7l7kve5q4yyu42gyrrnza2rv6cvkhyd50',
        '2147483647': 'celestia1rsu7nc072zv0cnfgyv9qct0cd5x3tddygd0920',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'Xwohx162XNWgJSnqMHRzrr2Gh62bMzEGGSZaAYt4GhbWPn7haKqeeQ2ccBBXa6Q3PEBe7XRnTmrahSo11v4KCbZY1QAtbp4gk',
        '1': 'XwnY2mgitZ96CGXj2caPJpUK3STdJph8xT4W7E7DA89wKTfFHsmC3CYdcHuK8i9FNrC8VUdNvCAFqaCmCPszoB2421PEoExfk',
        '30': 'XwokuMGbKPs1jT779SyLoV6Cy6csaDgtjRcqNK3MEYQANcRhN9QmkSJXSHWhPZKYeDM7VtJVNPFak3meFnVwQRK428Ve1dikh',
        '2147483646':
          'XwnD2tVZczVgm5W3ixxkoMD6AzGtFduf1cx2eYdNsULsQ4gVvbNGSAKbJQuQAqNQUv4RZQ7xMURWDQAbnLJs1HX534Y3hG2Y6',
        '2147483647':
          'Xwn1hC429WzGCat1kCM4bNiE1djdAM8ZuMDuMeLH1K892FyQjFD37Md1iEEzLJpEf2frZjN5MNxHdNPBoEnk2jAn1isY1nWAz',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x5D7c79cDE8Cc9DaDee8B9d10609c3b55E5eEfBc7',
        '1': '0x5c69BF35Fa40F0750f6F11dd14afDFF3E29C7f47',
        '30': '0xBef8C24C4DA612227B44053cbd44e4575b00D448',
        '2147483646': '0x553aA75373A41bD7fd9afa43e65cfA61f463Fe33',
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
        '1': '0x78Edf9e435fd7f99279757Aa97d87FB8A49e1707',
        '30': '0xC2b6D079351d224Ab6f918053a003176b5FBAf3E',
        '2147483646': '0x6B17641A94692692066A5f6068e841beE413EDD5',
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
        '1': '0x0af63C0BBd583991FBE4af1E87A082fD92115885',
        '30': '0xB0707fb808238D61Ab88DF1299575DBAA1Be5A5c',
        '2147483646': '0x284F3EDCbd9c2575623291489b7A0bC44d968576',
        '2147483647': '0xFCF2038D2A2FC4A41Cae635d33e5c07220b6D90F',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1dylzozh2higmboduefysphflyrr6gpd2hthf3vy',
        '1': 'f15he6ckckbnsrtryhscs5e5m63omxltt4oa75zza',
        '30': 'f1lzepksmyz2b4opricw3qxpzq4wues5x5xfqjrni',
        '2147483646': 'f1lwfhbibnkxlu7lm334itaase3p5kho5nkkxacvy',
        '2147483647': 'f1ge6i5kjzruh7afaccwfzg5ch56qsywpti6kzsxy',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpwzwmy4lqp7xnaszegmtytjq2cawje202zty22ammx6mmqm72fc56y9gqkle',
        '1': 'kaspa:qpxsn2j40crm6995jxks2fdwksdjnaa3wnfnlw30027gfplwdn8c6443vlt0j',
        '30': 'kaspa:qplvl0jpgsk3mmv6d340cwul03du5g4ynv2dsh58n066j92yqfnwvhulq0fal',
        '2147483646': 'kaspa:qq5xgfc0z72gkr79r98kg004uaj4xxutlwhua4tymhych58wstyf77q66a3rk',
        '2147483647': 'kaspa:qpzsd5vhna6yyk25lx4289c9wj7neekp9tmhtsxxyppu3djmlgxdqhnpettct',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '08fb061bb5839d0cdf51572fc247d3295fb7b99fbf73c79df931fb317333d0ef',
        '1': 'f3fe6a8b7a2b096be9a945f4cf37da9a57d181c490ce6d96c26fb304a0256563',
        '30': '255f0ec41bee2fcf18fcb358c5650e2b436b137f4f262d4ea3405a8f527e05a9',
        '2147483646': 'dce9e95463d6d3defb6b0600d50e4181fd4e01e5f05502c81f1e1a7f8f057cb2',
        '2147483647': '26124244397ea4a8431d37d53c5be6a6dba85796cfcd87be64f8197252d65b87',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDAVRG4MKQOX4VA7CNLKZHMF3OVYE76H7CDI43V6',
        '1': 'NAERDTV6SIQGBNSE4XM3BYUEYKVRWPNCZQJ2IWEJ',
        '30': 'NCBQEA3LEPBSL7733XGV2IBDTDKP6TAJPLHX2JUS',
        '2147483646': 'NCKYBFUSGKSEOMEYR7NEI7EN2IU3KP76TV5SXD77',
        '2147483647': 'NATNLENDS73Q2KZWBXI7RUZ6AJ5YKS52G6DHZEOR',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5msph6pt5yt0cysyjlyw9089f07w0sqchynmxyq7g',
        '1': 'nexa:nqtsq5g5rx4fuem2s0kpz3xwud7vuk6cpdssuq20fh33u8jn',
        '30': 'nexa:nqtsq5g5mtxxcyz757w3n2ydqrk5ydgqtwhdlq8v4n8e4kr6',
        '2147483646': 'nexa:nqtsq5g5usj2h6tpntug5qexv02c2cf6vnr7ytvtvuuvltzl',
        '2147483647': 'nexa:nqtsq5g5u5trj5psu6gg82rf6p2u8emawekunlw0q06hjeuk',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15RTqN4v7qJyssVXcbQEkn2XbrHUjNCECmM7gQwLiaxMzbT8',
        '1': '1412MwYCb37BSSbCrwb46LWkMW3hXq9mwd5rNn6q8A5Ai3a9',
        '30': '15pi1xtyZCja5h61iKnkcNKCnyDzykAAPbR4wPw4YM8vnvh',
        '2147483646': '1383GEYSXs4aAXhWVyEQeoNWvS2VFTErKhxcqCQQTCnRzCNj',
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
        '1': 'YwKeuFDWVUpDjcXPbzAyqqsavmAokJNtKrWTCKLSS3c7gJz',
        '30': 'W27zyfuu1aNMNiQYNiue7hSSDghGttm76N59McSNpKaLGrS',
        '2147483646': 'Y4LZCFTTKSCwpiq2ddXYJhe9rjxXNPTGQjGuccumUksPzug',
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
        '1': 'FaLsvd1McrdkZQ8g1M6r93beULHeCQpKWC7c9PS3sG9GfE9',
        '30': 'Cf9E13hk8xBtCW1pn5qWQuAVmFp7M1CYGhgJJgXzFY7VJQ8',
        '2147483646': 'EhMnDdFJSp2UeWSK2zTQbuNDQK5MpVthb4t4Zh1NuyQYozq',
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
        '1': 'j4UKdneX6byLjqX2SBGyjoLPb2G8dLRAob4yob39o19CHB2Qk',
        '30': 'j4RQS8iwnzVSHyA8KL3iUTcF9sZ49oZmBoqVNHCStwXUFPqMp',
        '2147483646': 'j4TSegwXLYoJ8Zc8jpJd6MoFMbC7R43Fsy9ra3TTNLBuYTDyr',
        '2147483647': 'j4RgBKwxDYXFGdRW19LqyHLFKivX6LfWYQ1oFLUr7roG6Lips',
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
        '0': 'dfayUes7StNoCUsFzZHzSHotmUwvGRDazJXwKXDA6a3NKtRsc',
        '1': 'dfZZ3BSajMabQ3SMfoeBFdNNzEbgVDgYY3Pg4DaKaycV8bsi5',
        '30': 'dfWdqXX1Rk6gxB5TYxQuzHeEZ5tc1gq8vGABcujcguzm6pKju',
        '2147483646': 'dfYg45jayJQYnmXTySfpcBqEkoXfGwJdcRUYpfzdAJfCPswJf',
        '2147483647': 'dfWuaik1rJ8VvqLqEmi3V7NEiwG4xDvtGrLVVy21uqGYwmhNH',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rwjBAQutyqzwLJqoQJn8dkiY235ZwbSchr',
        '1': 'rE5rkh6GGkULPJhq3wKZUSDYWjgv8qR44q',
        '30': 'rfYTTANKrq59VavaayzNmFZLUGdDmES2Su',
        '2147483646': 'r9whvs2nfkYgjyYfR4oAbM5npm6wD5h7L4',
        '2147483647': 'r9Hd5hiQLqd8SH9Jkw47eTan2ZGuoqRnwU',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '8KQ4TzzSBGrgczesbfH8NKirBaTRQkhygVLSAtBVE47a',
        '1': '2Vmry2wrRydtJ28rxmYSxK3R9E6Y6kafhAxmLMjxRULr',
        '30': '79sQBin44FWz86hdJaKiyxcEnnv5yX2tc7CjXB7fHWjX',
        '2147483646': '8TXx9ccpbQq9NhJn1FYdfSUFrpQkSaEbHToxcCTafu5B',
        '2147483647': '2zjXEirR2je3qZmr96HjKaS7gW2XrmusULCf7ctjfqDs',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xda94a5284a22ad692aa40180e050f1fb',
        '1': '0xf0dd4112b6d23d26b55fd29cffd2baeb',
        '30': '0x2586df8793e6fe98d35d39b32e15d92e',
        '2147483646': '0x7f1000c9b374ab6fddcc449e3da8ce77',
        '2147483647': '0xf9e8037b9818bb3999a83f0fbdeb6b90',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GBPPG5QEFHTCLOBZEZFROUOENAUMTVHNABZVEYSDGADC2IVWNPDNCAZN',
        '1': 'GAKB3YGN6EVN3QOOQPPPDUXJYRSEJ6PJ4PGDPKB4QVLEOBWUHC3CCMAM',
        '30': 'GDQ7KTVYQ4VGMDML5JS4KLE3ICGWKMBURF4YYQQDUR7E23WISLCZAUU3',
        '2147483646': 'GCV4A3SSRPFEKPTPBVANIBBEMJWYBHNWSTISB233Y3OT4CWHWPPVQX7B',
        '2147483647': 'GDSEEZHFGB3UORM5PM6MC24VWB76V57ZJQQOZEAIGSKVY3ZOIDRHUGKI',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x945cf103bf3b665b85a5e44c6a394294e5f7296a89881ada295c58ae0cd6a36f',
        '1': '0x49bfa4e7e8cb5d5a4519fbdb268f0fe27d490fc3a3ce936116a54f404b110e78',
        '30': '0x39cebc64ee703b1114c2c207f6114b69959df5e775d990e9092527d78c0bf53c',
        '2147483646': '0x1bcc98f26cfa5877aff57cdc57f2d746ccc9a40ca3be4e4058132231de79de7d',
        '2147483647': '0x16c0efd47015147191c409d7b5a898a7f4ac8ab647b540487d0ea712f614e6aa',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TY1onQCsKxvQSbF2pwJqBrSykzAe64oYUe',
        '1': 'TQ3WF7Zxi43Wz3KT6LAxYefmyyi3xvKYES',
        '30': 'TNsYYsJ3MXpAwmcygC4sKYfswN69ayCnKJ',
        '2147483646': 'THZ42MzGDuQyRkByQMG92dBopm8vSwaM2B',
        '2147483647': 'TCMV5P7heGwMHpNVkog4Lp2nuAaLLaWN7m',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCa75c4c5ddcd017834182027275c26fca46352656c90728420d28572c95230a4ca657',
        '1': 'BFC9b4847215d382925f86f3b7267938d6c8b758cbc88b2508863ac15bcfb1af7697dcf',
        '30': 'BFCa01b41114a135a7052e3b864f74e1a2adf83cc20ce07ab5a2cc0e966a0d746687bd3',
        '2147483646': 'BFC54bc2f7d6d9786700bd2f70aeb2124cb4fae317a4753e191a55a72678995b728edc9',
        '2147483647': 'BFC7331a87c101f58a34570795119d21d12458fe41dd33be20c12568c0fcaa1cf14fc60',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NcxLoNwtUA51jr6FLPoNvBfUYkrsbsjrq5',
        '1': 'NZAjXkNuFVAStBHz1yKdJ8k6ivLCWmbFFK',
        '30': 'NVrxS2yQuduif5phGXame1k8Gbxoz8QyhR',
        '2147483646': 'NfG3hdpVnwRdmvvJjfi4MXQMFQS6nsRC1p',
        '2147483647': 'Nh13uYdoShwtkWTEavT6KEMSjjWs6m2TwX',
      },
    },
  ],
} as AddressTestCaseData;
