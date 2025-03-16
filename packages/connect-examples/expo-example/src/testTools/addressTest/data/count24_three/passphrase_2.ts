import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-密语2',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736557',
  passphrase: "ADxvB0383*3*%^%~./,';L",
  passphraseState: 'n1Kg8udanaFFE48Y8im6GmgCSzSUmGHxV4',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q840pns0w6rmpe2h4lh8tltx7tt7cayzk9ymnm8w4v6gqk7r5pepx5ryse9gs42hytmschdjmv0qsrv4rs8lllysqccqxfx2zk',
        '1': 'addr1qyq0n76ahdfqajpmjdhg8vfevr2s03p8h5lqh758e5ahwkr3uck6m6y9xx7k5av2r3lfjqpga5erturxv5aruhgj79tqk6wklh',
        '50': 'addr1qyvwvgztzhnusmm3r7xsclrne6fgl6qrz86qafwt6r8pwvy7h3hrxysk4w67jskxzrej56cuuzk2d3hkmx0aer8fdj4sx337hm',
        '2147483646':
          'addr1qyg4t8u0ggspc69s9rurnc05m3qad78cjcwwlrg8qdqhz9l6hdkv2wk0wt3le0u9ldsxd2sf7479tkf93hd0pynsgadqgf9w0q',
        '2147483647':
          'addr1q9emde7qjex5qrv3t8gvjejjz7zhg25qvm2gwah0n8d422d9xwdefxk6va65sdp4ztqhcqcpea32s36r3az54mzw3a4sr4em2g',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'DW6ZSEO3BYTPGFGWLAWIWK5CHHS74XMDIDK4C4WC6NZ7EHPN5HBMU2ILGA',
        '1': 'GGCFBD2WLEHFXC4I3IXJMZU7FJZMLGTVP3DYMIFZCH7IBJ4W43DVPUZQTQ',
        '50': 'QUNESM2WN52O5T726QCRIR46GYAVZUH5FK23YCDO6HMOR4BSQPIZFV4JOU',
        '2147483646': 'PHS44GJAZME3ZJTD3TDZJMI3G7HQOLKCWZW4XR2I2243CR2Z74GDVMHLT4',
        '2147483647': 'IOE2WXLZ57OVVEEQQCVA2MP5YDCBL5QINSUQJSSQPBLTINDOIZXS6ED5IA',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x2381cf671ac742b5459abf1b4d5b54e09bfd3b050b99a3a379de3479c2a5733a',
        '1': '0xd7b6446aa68ca30b2910b59caa20c70627999900ce94dfe24d765fec863abfa3',
        '50': '0xe01074ce91b89cfc493146f74fd77606c3b0babfe35652f28bc2f926504b0b3b',
        '2147483646': '0x307950f8b1181d350cb73ae13e1c7260514b8afc6b7b76e395fd164058e8501b',
        '2147483647': '0xb348133d9430a94c9c88c602f47aa3ab589aae3e6dda1bcb87087ecf877b96ef',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '12mX8CbpusXunASe5h3gtrSENEeEMFvgrE',
        '1': '16LzhFrDieTWzYkQE4GBMLcapFjNQWPQWU',
        '50': '1ETJGZkTykM89JoMCwNQB322D9T63n5X8A',
        '2147483646': '1Jms9mX5xdTAHVMFrk1b7JSKhbQB7R5PAC',
        '2147483647': '16t7pfApbUEGyweNf76cZ8gErqwgtmvAoE',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3EXCE7hMQTxS67QXhukEcruGBWStrga89L',
        '1': '35NuDHELqrHH5YYsSC1xUGMzQMGUYydRcw',
        '50': '3GfUcWWpnpM3hVVQSvSKB81Tm1PnfFwGn1',
        '2147483646': '373kCycSW4Nb3seWB6NgyrejenN8NW8fdf',
        '2147483647': '3P5ZmQBWPQNhJoMnjJghHr67QRASPCKKY8',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q372wlk367ulgmvsgr86g9zhpgcxhhqhqdnvm7k',
        '1': 'bc1q440wxw77rfrr0hqquq9649quwcrq9d0kkflw2z',
        '50': 'bc1qlagkjumdq20hptqld3lafzz5f6vq2pfc7kyf9x',
        '2147483646': 'bc1qym8qvcdrqr64c3lsg0cm78r6peyx76vvasl0a6',
        '2147483647': 'bc1qny4twcmyseqe4fdd2jjg0dvjc008q7nedt6thn',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pzuah6y8lsxyttjgkywtzjrh5t05sjvl8l8p2uur4u2tnhrr69mrqpn2e9c',
        '1': 'bc1plskeexhe93yxjm4u7cue4vw8qxnucgwcnk63as7aagul28n6td8q98qu0p',
        '50': 'bc1pta9aq7kxl3c09ryaryhg68g2pskvfm0w855xtxyfsv73xw7gmxdq6nghye',
        '2147483646': 'bc1ppf2hag24f3gxajdyr6ywe0emdm8qxxka5aa4kdd3dfvjsxlkp3kslua5jy',
        '2147483647': 'bc1ppzvqy9ve3dvvwxzhrsantknn8glh9xtvt29kqtes0cg6ezpck9hs57cydc',
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
        '0': 'DTVh18oaTsu1AETCUzcBAHTTmzG8fmFPs4',
        '1': 'DUDNQgfyzxQkk7Yct6TnmFKi5WJ2z9pZrn',
        '50': 'DR76ksSJLfx7SjzCxcZhK9fhkYHgYu6F9R',
        '2147483646': 'DJu77nAUNZM2PHXi1KMytrhWuka4UBRTRv',
        '2147483647': 'DBTyD96Y5XPVRnXY1e5xmLdnKEqWCStvrE',
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
        '0': 'bitcoincash:qrc5lj5nzf86637qrnaq399u0e7qzxshk5cclvxh43',
        '1': 'bitcoincash:qr89tgtr228cdprjce4spn8uy2thtns4wvsd7yqefc',
        '50': 'bitcoincash:qrdwl3uk7m2nem7nvwzdzc3lwu8yxwqjhcghz0aa9e',
        '2147483646': 'bitcoincash:qqlrt8lu26ydwumfcgpaaxql7unul39ctv0nq4ae6f',
        '2147483647': 'bitcoincash:qrq87f4lt3wwu7g7sqvn2zgtc2gsnjusksyz8nl7a3',
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
        '0': 'LKHAzJHumyXJNdM7ZTiH9XyLu44WU1bYro',
        '1': 'LSqg7nBz3h1yE8uxdgNHaKJtdtzDdBqydk',
        '50': 'LVZWBD1aS8GcEoHZ1dkFWm53mErew7EBjf',
        '2147483646': 'Li7bxbfLFqiA6iaGm76w79LSCCwus7Ebma',
        '2147483647': 'LKWhJkWwjxQneBySMfPncB1WFe7yxRWd3R',
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
        '0': 'MTzJUUXTwGLaoXHjvn9g8w9gB31qjJSnet',
        '1': 'MFYzQC6LonaQVLjwErqywRXTp24uabMtei',
        '50': 'MPrTvrFyQGuLq1Pg8su2DnEfmbYuT1jE2Y',
        '2147483646': 'M857kjRdNnnyG6xAQZgBZAXfENNQ589is1',
        '2147483647': 'MAzrr7Y1vtAbSy31TUHA7ugv1WK619VnBb',
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
        '0': 'ltc1qskgn9ug30w7xcjqf255ex6myapv9gng6t7jw7j',
        '1': 'ltc1qkmsug449rgrzxl8ataruw0mcjyamyesj5pkp6x',
        '50': 'ltc1qnpywrq3hqz49yy2fannwq85llspt37hu5mzhqv',
        '2147483646': 'ltc1qmmpgn53whfpkzpegjku6taw7wl8k4496nwzevp',
        '2147483647': 'ltc1q5aydkzv5guf8ff93pnjxqppddyy56sjg4fav80',
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
        '0': 'NSaTsJXHsRTNQJG5iYRcnoXzjVwsthvkBy',
        '1': 'NZPsMZYCjupaikjSikA6TeJPxiKDL5XPiE',
        '50': 'NPM2EuCtXAx5ZLDmtB2ia6LH3T6Uy3BWaU',
        '2147483646': 'NUVoraSed2DaVu6g9EY1rD21aDLFmyf3pq',
        '2147483647': 'NaYzj27P4AHc9zsD5QJDahTtjrrSkfxidi',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqzpr4hpa25ja9u2cwftk4usw79wg6td8as8wstdu',
        '1': 'ckb1qyqfq8e8rw0velkc0terzwxuhvmgc3nlnc4svzg3pw',
        '50': 'ckb1qyqtgyclw9g44kuhlgkf3s7a7w6fy5lgng6qenf3e6',
        '2147483646': 'ckb1qyqtsutwpesvaq00yqxfwv7n5fvhjlpe04fq47h5es',
        '2147483647': 'ckb1qyq8tjd2ljrvjq9ztzdzhgrc5fjsx0enh9wqr55h44',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aam9b3vpzvj0v6hhrfnd214gfesvk8dbv2d8jnj2xx',
        '1': 'cfx:aajr24fksbg2tscfaesm7bacfhdu4zfvja8306yry7',
        '50': 'cfx:aajmhn4rjwaj3zfxprefp740nex5ayxrgpzfc0pr54',
        '2147483646': 'cfx:aajdb307z2bs5560y60d2vj0m1vndn1wguxaa6v0kw',
        '2147483647': 'cfx:aathd38z9hyy7yznsvwsmd9pu6vb53t5mjnccfkpej',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1frk93uca7jadua23au8mfqfhhez2nt565mg75k',
        '1': 'cosmos1v74gnvvp0hzm2eqmzc382675m3m7sjt7eclk0k',
        '50': 'cosmos1pfwzjdpxd7f64t9687jsmx3gvhy79xfd8ky7c5',
        '2147483646': 'cosmos1qmh0t3kpk0nygwhz0d3cuu2hh5nz6raqc2hrxx',
        '2147483647': 'cosmos15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeukh97hjj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1frk93uca7jadua23au8mfqfhhez2nt56eq9edv',
        '1': 'akash1v74gnvvp0hzm2eqmzc382675m3m7sjt75rj3kv',
        '50': 'akash1pfwzjdpxd7f64t9687jsmx3gvhy79xfd2dfepw',
        '2147483646': 'akash1qmh0t3kpk0nygwhz0d3cuu2hh5nz6raq436ylu',
        '2147483647': 'akash15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeuk67nstg',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1frk93uca7jadua23au8mfqfhhez2nt56vqq8g8',
        '1': 'cro1v74gnvvp0hzm2eqmzc382675m3m7sjt7prh0n8',
        '50': 'cro1pfwzjdpxd7f64t9687jsmx3gvhy79xfdldv8y9',
        '2147483646': 'cro1qmh0t3kpk0nygwhz0d3cuu2hh5nz6raqq3l66h',
        '2147483647': 'cro15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeuk07kwwr',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1frk93uca7jadua23au8mfqfhhez2nt568xp6kp',
        '1': 'fetch1v74gnvvp0hzm2eqmzc382675m3m7sjt729kjdp',
        '50': 'fetch1pfwzjdpxd7f64t9687jsmx3gvhy79xfd5td66r',
        '2147483646': 'fetch1qmh0t3kpk0nygwhz0d3cuu2hh5nz6raqth78y3',
        '2147483647': 'fetch15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeukychns9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1frk93uca7jadua23au8mfqfhhez2nt56uqmwzy',
        '1': 'osmo1v74gnvvp0hzm2eqmzc382675m3m7sjt73rvxey',
        '50': 'osmo1pfwzjdpxd7f64t9687jsmx3gvhy79xfd0dhwwx',
        '2147483646': 'osmo1qmh0t3kpk0nygwhz0d3cuu2hh5nz6raqs3yns5',
        '2147483647': 'osmo15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeukl7d8yq',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1frk93uca7jadua23au8mfqfhhez2nt56zft9n2',
        '1': 'juno1v74gnvvp0hzm2eqmzc382675m3m7sjt702udg2',
        '50': 'juno1pfwzjdpxd7f64t9687jsmx3gvhy79xfd3y89lg',
        '2147483646': 'juno1qmh0t3kpk0nygwhz0d3cuu2hh5nz6raqwc5cp6',
        '2147483647': 'juno15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeukphav4w',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1frk93uca7jadua23au8mfqfhhez2nt56jlj7kk',
        '1': 'terra1v74gnvvp0hzm2eqmzc382675m3m7sjt7lu9kdk',
        '50': 'terra1pfwzjdpxd7f64t9687jsmx3gvhy79xfdpj7765',
        '2147483646': 'terra1qmh0t3kpk0nygwhz0d3cuu2hh5nz6raq7wdryx',
        '2147483647': 'terra15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeuk3pyhsj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1frk93uca7jadua23au8mfqfhhez2nt56k7uhf2',
        '1': 'secret1v74gnvvp0hzm2eqmzc382675m3m7sjt7matlj2',
        '50': 'secret1pfwzjdpxd7f64t9687jsmx3gvhy79xfd9nsh9g',
        '2147483646': 'secret1qmh0t3kpk0nygwhz0d3cuu2hh5nz6raq60r2m6',
        '2147483647': 'secret15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeuk4q270w',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1frk93uca7jadua23au8mfqfhhez2nt5693ewwm',
        '1': 'celestia1v74gnvvp0hzm2eqmzc382675m3m7sjt7gjwx4m',
        '50': 'celestia1pfwzjdpxd7f64t9687jsmx3gvhy79xfdku4wze',
        '2147483646': 'celestia1qmh0t3kpk0nygwhz0d3cuu2hh5nz6raqfqxnut',
        '2147483647': 'celestia15e4x5v0wjcr5nhfjjyz7qwhv0wjlyeukx008gl',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'Xwnttck52LY1neNaLCx5UyV4kr38RF99WgrFvcoR9GA7Rz3MUmziviXPmugN4yaevXedZ3UwtAEnKSJayonbQGsN1iv5WCp5r',
        '1': 'XwoMGUVKhedibSScyEtGg5R3ZU1KeKTDC281sV9n2jxbF4xt3y5PJP68L5a4EUboRRNsebdGYdtLaGCsK9wJRWEN2pi6hiK1s',
        '50': 'XwnmLZvq8C4Qn7ubDHPQmKYfB9o3TiWBnAcWHt9E2AgKYcqBbPVgTZ8cUeSxVmb3nT5EAvod6DrHBdjzFTNt3XPx1wMShwM8K',
        '2147483646':
          'XwnPFcmob2iGYvbQXzazq3ZNoeWJEtwh3dohegRJ34ZtdtLTKFKULrDckECM5DE93hX8crhT3JopAJ7MWueNswVV1UFHp8RR3',
        '2147483647':
          'XwmjJ6Z2aemcTtmYk72g8sF28QGHPiA9HdauEjLcJSWDTjXHCWs5yrYDh4vpMUCD3TbGsoxbgB75jW95KSm8WK1o1KGg5NEXm',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xf80A597559eE9c6b03aED9c3774554f10E468898',
        '1': '0x6e45Cb0B4182132C5Cf9388e5f3F341A0858B2F3',
        '50': '0x088D9870B957620099F89cf7305eA19B5b9eBC97',
        '2147483646': '0x3c149826205d1E508d1cF999400057830f5d0eef',
        '2147483647': '0xF2d161cd89CD33A064236dD4a91Db5b480F7c9c9',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x67129178F69B5C390D83f7E420A61520ac26c50b',
        '1': '0xbDB4c81C9F6e11cbD4F965a4F0d19ACe37Df5C5e',
        '50': '0x9D1bB57dcFd2E28395B76066fAF83dFEf1A5417D',
        '2147483646': '0xfD39fE832789470f446faA9b19e96c246D6848BA',
        '2147483647': '0x9A3DaecEE8f26F040369FF9da34837896617714b',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x67129178F69B5C390D83f7E420A61520ac26c50b',
        '1': '0xa750F97dDF9698815F007B1Aa7653AE254304ed4',
        '50': '0x3d5cBf2cc7a23bea9813628B63D061372d8b0840',
        '2147483646': '0x3F46d0D1896b555d55E5752F18a5B05c390AF35d',
        '2147483647': '0xbF8A37643440667f4B0831c62678c1d1E4aC38D5',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1rvbe5oiljcf4udexhmbeacfxxv6lbnwr3j2crrq',
        '1': 'f1zw35pimp2bmqs3vdnb5x7adzzgdmtjhmqujmp2q',
        '50': 'f1djei3emeisl6yrx2aismeccvwh3ezxgyqcg6wri',
        '2147483646': 'f15bhxwyo3irkj2cu23du26y24g4tj3p4g2coxi6a',
        '2147483647': 'f1u3kec7sv7nur7xpjm6g6zey2pgxnlqaztlqmb4q',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qqz98vv7rkl00vmss76mcn45t62zjnd2xpr67xf9xnhtr0dez3qs5t0tk8mkr',
        '1': 'kaspa:qrja5xjd2wvvf8k64jzzp36606u6mkt8kz546h3duq0aqvu4f22qyrnmsmfwe',
        '50': 'kaspa:qz96jtwn40jqwhj57hxpl2s2432xxvlmd0kumk0fvee459x89vz86jh83f4v7',
        '2147483646': 'kaspa:qp5ya8cv4rx9j0xkvwap7mrw3w25wlpg7n955u5u5r57t6xcn2vtkdmnxdg5q',
        '2147483647': 'kaspa:qp6lrsrg4z2m6emlxdtes5xmp7d4cgjq35myypdqnyrklq8d3uk4wxdh8nncd',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'efcdf7b580f627e1215e08855855f092f835c5ce83098fefa12ee8f0b6406044',
        '1': '50439586749a2aff75aa4c0278a56eff60ab67837c825642aaf2fcb7f6b436db',
        '50': '47d1ca0a5f78a2f56b49419afaa2d2e5c408d6b1587a5cb91f2d192085c5432e',
        '2147483646': '39cf6f73823ab38f0678cf41248a2c0f6fa080456c587bbd55ffec466eebe5fa',
        '2147483647': '61eb03eddf593b4abcd8bded6f27496868e0cac2e87fef93cd1675c2f5c781c7',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NAMHFUFEXIIFK25757XISKKKOWTEAZIEGH3AISYK',
        '1': 'NAMNOOHSCH734FHL63BGR66YHQWLXEWQRC4ZL2AI',
        '50': 'NAD6P3KO5BUNCPUVMF4THKKB4IKTBYNOH3G4IUNK',
        '2147483646': 'NCESSCL66FLYZZQA6JDY2LDUUWCOEWVW5IDS5HRP',
        '2147483647': 'NA6CGHNSA5BZRFRHFVLY4HAZLXFDE2SI5EQXCYBN',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g58dlygh5excmtxp2w6q33xlfpdkg6muthulw2w94f',
        '1': 'nexa:nqtsq5g5cu2pt5hcedwr9apzw4theld5wk0l43duarhrnwvn',
        '50': 'nexa:nqtsq5g569j6s65ur377hzrcqh2n63e35t84hu5gwgaqmy3y',
        '2147483646': 'nexa:nqtsq5g5c9c2rwnkh57sq7h5tq406qe37rznr7xc5mt8knze',
        '2147483647': 'nexa:nqtsq5g540u42fgtwdhyapzsqwztqfcyvdxukrdph8lrm0qw',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '1CvTcEz5oaUTQqC2S57LvsBegkEjh2BqoRqWjixyZhxq2bS',
        '1': '13RWabpTfFj1ZkbFQxLisXDfZ9547H1vUT2JYXTkPtqtQScU',
        '50': '16bqwFE1hSELXasQEEpyVsRQ4k2Ceiy4ETPmX3ZWijreWZbb',
        '2147483646': '12ukKHF3Y3uE6txYBEcUQLaNwsyw23AGZLsai8ofRUTb1rTz',
        '2147483647': '12fBHwNBWve1Fprw9UnDtiQMU8gAefKNuzhR5KfsKMQmaS9T',
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
        '0': 'W9DkZx11Fx7EhrWZ6UEESCJt7Ti1cAnnWCVb9wUHqgQEW2p',
        '1': 'YMosZXUai6eM3cZwcjqm2YnnZnXPCAXR9nxcwgFiApKp8dm',
        '50': 'bY9ECw2ctbyJstikuE6PNkXJAjfve7fBAARbTn231q5uxo9',
        '2147483646': 'Xr3cEx4TWGrtByrhu1bHquWBJhQHxJsW3eEnZ2AjkS2RJNA',
        '2147483647': 'XbUau5CSP1e37tFg9BLnDjUhZPdvaTyrhU59jtNddPCzCYW',
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
        '0': 'CnEybKnrPKvmXe7qVqA6jQ2wf2pr4HEDgY6k71ZuGtwPmdK',
        '1': 'Ezq6auGRqUTssQBE26mdKkWr7MeDeGxrL8ZmtkMKc2ry85z',
        '50': 'JBATEJpU1ynqhgL3Jb2FfxFMiJnm6E6cLW2kQr7eT3d59gL',
        '2147483646': 'EV4qGKrJdegR1mTzJNXA97EErGX8QRJwDyqwW6GMBeZaZi9',
        '2147483647': 'EEVovSzHWPTZwfrxYYGeWwCm6xkm2aRHsogJgxUF4bk8weX',
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
        '0': 'j4RXXtKDt6jp2rVGRLmTo3vk2KSqAYH3DVFKnizmvrYq5J6jX',
        '1': 'j4Tk81JoMgBxZxq2UjHjQaX6WDu9yus2x7tvFknWiGsxzsSgm',
        '50': 'j4WvTMxCuiNTtvfJdYaDfCsJEjW78TJz5suHijJcUbiykyfVw',
        '2147483646': 'j4TEMjzDwYz8nVyPmVa1A7LTDce4rpdBJCnmXvPrdJTahUkxi',
        '2147483647': 'j4SynieM5XrsZeuJATpAubiHC8tm6TFLQZSbNHaiqCLXt3Rhf',
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
        '0': 'dfWkwH7HWrM4h4Qbey8fJsxjRXnP2RYQwwa23MXwiq27vim2V',
        '1': 'dfYyXQ6rzRoDEAkMiMevvQZ5uSEhqo8QgaDcWPKgWFMFrJ2JY',
        '50': 'dfc9rkkGYTyiZ8adsAwRB2uHdwqezLaMpLDyyMqnGaCGcQEhZ',
        '2147483646': 'dfYTm8nHaJbPShtj17wCfwNScpycihtZ2f7TnYw2RGvsYuaPx',
        '2147483647': 'dfYDC7SQiHU8DrpdQ6BNRRkGbMEJxLWi91mHcv7tdAopjU6fw',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rNohzjkx1ZuMoV9J9DSUWSvskp8rKG5cUF',
        '1': 'rPbZdr2XPNLSr1t1Fhph9HtN34VLEQkoWu',
        '50': 'rfDiVxyEGtGtnsaY4rjP1nP74PUxd1ehGc',
        '2147483646': 'rnnB8fQeJxojrW6FuaUx9S5U5pfNq5QNn6',
        '2147483647': 'rhC6oaFzwpAD8bpy8NdK6mbUwG6NzyRV5S',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'Fhh3QwnzYg3npyBkpD1Li1GYKJH9yRj9Lp5MsX8emfEH',
        '1': 'HRwLuDrUX1Jmzd1JSMhFN9Xwmmk91FWns97eNgyurVCE',
        '50': '8d1WjSv4gKW9uHrUntocudGhwYZNPbLDBC8SxEHuYN4f',
        '2147483646': '9U9tPG6vWitdZcjV5Mz4Mitf4UhojEA5DHDLJKyEmiWS',
        '2147483647': '4JaLyB592gV6Ga53h13Fbn1fd77DcAcFfqpCrsePUrZC',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xb76507bcb761ea6946e71b7fc229d94e',
        '1': '0x9b45c2c6eb274fa5a400f209701eba1e',
        '50': '0x87da7037db2663defdc92f3e985bdf83',
        '2147483646': '0xfa16e2ae4c29c39417fd00ef104a6f54',
        '2147483647': '0xca09280c6f3e74daa8d46e3efe302290',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GAXF4JH32VIIZISCFVQO3PMGSCLTOYWOSZT655SFMV34YOPWNSUJIPR6',
        '1': 'GCSXMXJFLXMG2KEE2CGO7VFJWH367XEA6BUQYQSBLMWMTTWE7YB57K4P',
        '50': 'GCO2JNVGQ5CCXD47OWGNXHTT677J3HNRRAJDDYO4WNUSDX4ENNTG7SAD',
        '2147483646': 'GCWQSWD3ZVP7P7BJ2KG5KV4VZGBQKFXZOGB3OVCKQU4I5FZLAWLQ5BIG',
        '2147483647': 'GCBTPV5PZQMISTBA762TNBEBDEUXEH245O7RG6RPFRORGL65NKGFY6FG',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x110760c5e1b016330ee3bd809fe07e7ade05a6f6b0c0aca8e89779d5e52ef6b0',
        '1': '0x2039e63e97245e31c6778632d747aea77be216d5e61e3a8d710b73ed91b0c0d3',
        '50': '0x514a4fa27f63af7f6edce8047717d8d4ac49d61d9cb7024d2cb71a6cb19d831f',
        '2147483646': '0xa219e601907f6c02ce66d21df662f7d7210a9c5df68b77ba4f37a43aba2d7f8f',
        '2147483647': '0x726383d1c621335b9f530d720028e30d195a5e0f841d9646da3506f43b0b6212',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TWVsCKw4fB59qdf1pUUKU3gCrkf6nNy5xr',
        '1': 'TExWR3r3vUCupRkfodVRsUVNt8GatjfDsp',
        '50': 'TJWM1EvngBVfdixsqcmwnH98XfmXw8dGne',
        '2147483646': 'TJrbnnqN6SncLmFD4sNC82jTZJP8cL5zKc',
        '2147483647': 'TLLpBsrj1uuLtQZTPWfqBm2zLX5Nqt3rkK',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC3292ff0343a6f2e4a7a250192614ff3cb873c53304f96641b7f00fea93324b0d8849',
        '1': 'BFC1a04bc27d5aa745d777fe296f292735b18b23893c1c70028b492e70efc68aeb84a44',
        '50': 'BFCdea5cb9a0bb5a8397072c188b7cdeb5d62795a6424e8b95f64b0f4a8320925fdb587',
        '2147483646': 'BFCe2ea2aa744d5cc9ba7bef4753348fb70058674155914ebace7fbf8795b94d60fd227',
        '2147483647': 'BFC87d56413307c7c309573ea8b49ad9e2bfbd27d456c4e52eba3859f8af2c994fe5388',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NVYmcqrrjhTM3r6LVT1qKfjkEpZWJ5Ubu1',
        '1': 'NcwgyWvhfkyTtfdtadV3r8pCrt96h7mjuP',
        '50': 'NhWwevm4KMdUpnCYuWSph2iy3rmyUBej82',
        '2147483646': 'NgsEc7YVwcQ9pPD6Mqej3rh9qVZyxXssbF',
        '2147483647': 'NRRGyTMhyA6YvWrLAi3ZLSVdbuEANYsDMp',
      },
    },
  ],
} as AddressTestCaseData;
