import type { SLIP39TestCaseData } from '../../types';

export const count20TwoPassphrase1: SLIP39TestCaseData = {
  id: 'count20_two_passphrase_1',
  name: 'count20_two_passphrase_1',
  description: '2-of-3 (20 words each) + passphrase_1',
  passphrase: '12345',
  shares: [
    'network vexed academic acid alive forbid database equation average advocate golden careful exhaust dance texture satisfy lair negative earth flash',
    'network vexed academic agency calcium memory elegant merchant welcome oral evidence bulb union company suitable spend loud miracle story withdraw',
  ],
  data: [
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
      },
      expectedAddress: {
        "m/44'/0'/0'/0/0": '14SGE6NHJduhFW38GwKADNSdQLYZW5zwzR',
        "m/44'/0'/1'/0/0": '1Mgp4rmsiQwkFakHpQA6gXRRjoRu6LBVQi',
        "m/44'/0'/21234567'/0/0": '1N9bCmD3i63vuNWNd5ox4ZakgkjHY9SdFP',
        "m/44'/0'/2147483646'/0/0": '1317d6Eh9ibNNUWvNTN2xjmNPLW99pf3ER',
        "m/44'/0'/2147483647'/0/0": '16ZSqJdoHoSoahQfdUmnkoCEEKn6LgBUa5',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/0'/0'/0/0": '3MpmqkihxmCWuMuuyJNgTs1qEs5wzZw2cw',
        "m/49'/0'/1'/0/0": '39x7o2F7okMdEBPKsUATLJwPNfeMFwfeUF',
        "m/49'/0'/21234567'/0/0": '3HtGgtjaLQeAEQ1E3qUxBpNmmnSMa7yKez',
        "m/49'/0'/2147483646'/0/0": '3FwG29UC4S3CDSVabjmpYFFkbTMoseodse',
        "m/49'/0'/2147483647'/0/0": '3KNgMrHEfGqd6zs5g4L4YtmZpFpCmKYL8c',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/0'/0'/0/0": 'bc1q42thauv4skl3ytgn7zzh0f6q7wjplct6pcn2s2',
        "m/84'/0'/1'/0/0": 'bc1quejcy6asmmelgc7273fga8ngxvsajyjrp5q278',
        "m/84'/0'/21234567'/0/0": 'bc1qwdqljx6msxuuh2rtn3n8am4vsnfppaxylkd0gw',
        "m/84'/0'/2147483646'/0/0": 'bc1qnk0hkk88rmsqpg5k8zwlw4el3ynkgv82l09394',
        "m/84'/0'/2147483647'/0/0": 'bc1qlq6t306gyeu4dkjswrns2ltkf7grzjhyw2m6kc',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDTAPROOT',
      },
      expectedAddress: {
        "m/86'/0'/0'/0/0": 'bc1p8kmsc3punuth88cnetfgzkys95hqdulmn4wms3wq3t27xpn6paksv9sfu6',
        "m/86'/0'/1'/0/0": 'bc1pvz0rykaww642uyf8hmht6vlfpashj4k0e69gqass90m295ac7jmqe9fhp7',
        "m/86'/0'/21234567'/0/0": 'bc1pwcce8afgz7sxq96m2x9na9xg3uqeknhh44qfs5m7aesv5eg5tvkq2hckru',
        "m/86'/0'/2147483646'/0/0":
          'bc1pryyf7q4wjm7eted2ssqxvnjz8tg7az0dt9jqvc2a87h80ttc3hcsw9rlyk',
        "m/86'/0'/2147483647'/0/0":
          'bc1ptz3f6rjgmahheaesfqd5ytxj7870ky5psjas27pwa0ej6pay3sjqrh7ejy',
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
        "m/44'/3'/0'/0/0": 'D7nz1f8PXMkws2R69fsn85EuuoEKUg8JRo',
        "m/44'/3'/1'/0/0": 'D868AAVsNtvXSAFiCHJgyEp5VMJYHjg1Mt',
        "m/44'/3'/21234567'/0/0": 'DJD1bsiG5nM7SCePXywESnnnhCExQGVTQN',
        "m/44'/3'/2147483646'/0/0": 'DAcoWiYAiS8TBa3aobM1xtYbVUaHoTFk3r',
        "m/44'/3'/2147483647'/0/0": 'DE2Vd9qugaoa8izqVm2pKD6dgZdw87PczR',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qrtcuqwz2232q8nrc22e03l5grfsp5wspvfhctt3jl',
        "m/44'/145'/1'/0/0": 'bitcoincash:qrak2trpj5n3xmy8y97ud4vz5yvjtq0qxckr3pu3kf',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qq06w20pcev8vapcg6yppgwtasnlv4tjqg9vraqnp0',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qr3n8mg0kjmmeuh8hsx7h9w5ymswfc8kjvvma7njr4',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qz0evpl02ux5qjaegv8fstrfzxdu43cmfq700aam6f',
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
        "m/44'/2'/0'/0/0": 'LUXqWLPXZbkxXoCPpt9RxLt3HrG37Wmwt9',
        "m/44'/2'/1'/0/0": 'LaPJ7JrUAyy2sjWmgm1LdqZEbhqZoY1N2d',
        "m/44'/2'/21234567'/0/0": 'LaUjcdCf7arTYGTPNowvn8HQEjHJzX7xH8',
        "m/44'/2'/2147483646'/0/0": 'LhHb24GH3AijunAT1GPY4vxQ7k57rxcmFo',
        "m/44'/2'/2147483647'/0/0": 'LLFxubxe76nJ9Zi2xT7Ajo3uFxxQbbQN9U',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/2'/0'/0/0": 'M8A1dzHZT4VETg8REhSsSpn2oaaqPGNw63',
        "m/49'/2'/1'/0/0": 'MBoSqYYVU5vRy4NqrsWMouAngajbJqTVVs',
        "m/49'/2'/21234567'/0/0": 'MTdK3FzDqEz5Sn18ms8f1oskoaLnDLQzXM',
        "m/49'/2'/2147483646'/0/0": 'MAXiFH3oXkmbzwKTG2GavNqnDT847pEfdQ',
        "m/49'/2'/2147483647'/0/0": 'MP2LzfwUYuqHWBmXZVJvhcZSGjCZmguEs7',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/2'/0'/0/0": 'ltc1qgawguz3hlx47yttwp9fnt8zuhy2tyklp7afxnt',
        "m/84'/2'/1'/0/0": 'ltc1qkzydy9s4nas338efu2tplwqa972mh5hzv38z6f',
        "m/84'/2'/21234567'/0/0": 'ltc1qh4ynedut83fyy6uyxlg0zk3uwpgph9su892nr0',
        "m/84'/2'/2147483646'/0/0": 'ltc1qwh68yjk5xak6sp73k273smsr04sgjacdqnqdns',
        "m/84'/2'/2147483647'/0/0": 'ltc1qe25y9stl87pq2wrygl9l06rxf4wh6cy3r5sjed',
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
        "m/44'/1900'/0'/0/0": 'NQoxqRKc3yLYkGcz4jaZ6yAzkQxD2NR7Uc',
        "m/44'/1900'/1'/0/0": 'NizB9U3zckgPQyAiioc86L9Lgjm1QPeMtR',
        "m/44'/1900'/21234567'/0/0": 'NiZvdDrU6Zbz9qJFwemKbjF2FvivSPjAy4',
        "m/44'/1900'/2147483646'/0/0": 'NgZYxgHGtqpYTpGA7kysAdnVroGvCdfWNX',
        "m/44'/1900'/2147483647'/0/0": 'NUiFVF8dRPLaxehSxi5PhEjBjqp1BE21na',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0x436fFFa927139a3e06226b01127E040706ae89E9',
        "m/44'/60'/1'/0/0": '0x9F683AD921Aee885A2E76c2dE990F434084e2E4A',
        "m/44'/60'/21234567'/0/0": '0x1c825B7beDd1a2fb5ED981d1c01eB67c468Cf1e0',
        "m/44'/60'/2147483646'/0/0": '0x5913fB1051667C2f8dbFeA77545222a63CEC04e8',
        "m/44'/60'/2147483647'/0/0": '0x52Cfc2DA82d3853E55Df7dA4587e349A0C53360B',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0xA56653cb2C51bcddBac7435A7E2Fb8ff9bB6Ab99',
        "m/44'/61'/1'/0/0": '0x8313fB1FC88F2aEA1154503E895b3d203827B7B7',
        "m/44'/61'/21234567'/0/0": '0xD86B3002c491eD4Fa4c06fA25E68379F8c632AEe',
        "m/44'/61'/2147483646'/0/0": '0x2924176453d69CecBDA7e166B4A018fb12300C0b',
        "m/44'/61'/2147483647'/0/0": '0xa88bA0C50B3b5550015970d355eB48A79CCAaBA8',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-cosmos',
      params: {
        hrp: 'cosmos',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cosmos12anjq2yc76qhfgq9wavuqjce2zhfyj0t7dqrxz',
        "m/44'/118'/1'/0/0": 'cosmos1he9xm88jg7l53x4n9cj3yxaxmwwjhv2l6dqdrn',
        "m/44'/118'/21234567'/0/0": 'cosmos1cutmtwjrc9mmrs9gzalxpm7qjnn243qs7pyxju',
        "m/44'/118'/2147483646'/0/0": 'cosmos1puqtd64ms9r6ekslx9cz5wgfucef3cm8vqzr6z',
        "m/44'/118'/2147483647'/0/0": 'cosmos1vmtll2ye4llnr7ydkmxscg7pa928kr3k6a48wf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'akash12anjq2yc76qhfgq9wavuqjce2zhfyj0tnkdylc',
        "m/44'/118'/1'/0/0": 'akash1he9xm88jg7l53x4n9cj3yxaxmwwjhv2lhkd26f',
        "m/44'/118'/21234567'/0/0": 'akash1cutmtwjrc9mmrs9gzalxpm7qjnn243qsn6fptx',
        "m/44'/118'/2147483646'/0/0": 'akash1puqtd64ms9r6ekslx9cz5wgfucef3cm8pm0yrc',
        "m/44'/118'/2147483647'/0/0": 'akash1vmtll2ye4llnr7ydkmxscg7pa928kr3khxcqhn',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cro12anjq2yc76qhfgq9wavuqjce2zhfyj0txkg66n',
        "m/44'/118'/1'/0/0": 'cro1he9xm88jg7l53x4n9cj3yxaxmwwjhv2lzkg5lz',
        "m/44'/118'/21234567'/0/0": 'cro1cutmtwjrc9mmrs9gzalxpm7qjnn243qsx6vlwd',
        "m/44'/118'/2147483646'/0/0": 'cro1puqtd64ms9r6ekslx9cz5wgfucef3cm85m26xn',
        "m/44'/118'/2147483647'/0/0": 'cro1vmtll2ye4llnr7ydkmxscg7pa928kr3kzxa7jc',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'fetch12anjq2yc76qhfgq9wavuqjce2zhfyj0tdsf8y4',
        "m/44'/118'/1'/0/0": 'fetch1he9xm88jg7l53x4n9cj3yxaxmwwjhv2lfsffpy',
        "m/44'/118'/21234567'/0/0": 'fetch1cutmtwjrc9mmrs9gzalxpm7qjnn243qsdudzst',
        "m/44'/118'/2147483646'/0/0": 'fetch1puqtd64ms9r6ekslx9cz5wgfucef3cm8lat8c4',
        "m/44'/118'/2147483647'/0/0": 'fetch1vmtll2ye4llnr7ydkmxscg7pa928kr3kfqurv7',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'osmo12anjq2yc76qhfgq9wavuqjce2zhfyj0tkknnss',
        "m/44'/118'/1'/0/0": 'osmo1he9xm88jg7l53x4n9cj3yxaxmwwjhv2ljkna4p',
        "m/44'/118'/21234567'/0/0": 'osmo1cutmtwjrc9mmrs9gzalxpm7qjnn243qsk6hkyw',
        "m/44'/118'/2147483646'/0/0": 'osmo1puqtd64ms9r6ekslx9cz5wgfucef3cm8ym3nvs',
        "m/44'/118'/2147483647'/0/0": 'osmo1vmtll2ye4llnr7ydkmxscg7pa928kr3kjxxhcm',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'juno12anjq2yc76qhfgq9wavuqjce2zhfyj0tglrcp7',
        "m/44'/118'/1'/0/0": 'juno1he9xm88jg7l53x4n9cj3yxaxmwwjhv2lvlrky0',
        "m/44'/118'/21234567'/0/0": 'juno1cutmtwjrc9mmrs9gzalxpm7qjnn243qsgn8a4q',
        "m/44'/118'/2147483646'/0/0": 'juno1puqtd64ms9r6ekslx9cz5wgfucef3cm86jpca7',
        "m/44'/118'/2147483647'/0/0": 'juno1vmtll2ye4llnr7ydkmxscg7pa928kr3kv0kuf4',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'terra12anjq2yc76qhfgq9wavuqjce2zhfyj0tcf6ryz',
        "m/44'/118'/1'/0/0": 'terra1he9xm88jg7l53x4n9cj3yxaxmwwjhv2luf6dpn',
        "m/44'/118'/21234567'/0/0": 'terra1cutmtwjrc9mmrs9gzalxpm7qjnn243qsc97xsu',
        "m/44'/118'/2147483646'/0/0": 'terra1puqtd64ms9r6ekslx9cz5wgfucef3cm82ycrcz',
        "m/44'/118'/2147483647'/0/0": 'terra1vmtll2ye4llnr7ydkmxscg7pa928kr3kue08vf',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'secret12anjq2yc76qhfgq9wavuqjce2zhfyj0tug52m7',
        "m/44'/118'/1'/0/0": 'secret1he9xm88jg7l53x4n9cj3yxaxmwwjhv2lcg5y70',
        "m/44'/118'/21234567'/0/0": 'secret1cutmtwjrc9mmrs9gzalxpm7qjnn243qsuys00q',
        "m/44'/118'/2147483646'/0/0": 'secret1puqtd64ms9r6ekslx9cz5wgfucef3cm8w9k287',
        "m/44'/118'/2147483647'/0/0": 'secret1vmtll2ye4llnr7ydkmxscg7pa928kr3kccpwn4',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'celestia12anjq2yc76qhfgq9wavuqjce2zhfyj0t083nu0',
        "m/44'/118'/1'/0/0": 'celestia1he9xm88jg7l53x4n9cj3yxaxmwwjhv2lt83ae7',
        "m/44'/118'/21234567'/0/0": 'celestia1cutmtwjrc9mmrs9gzalxpm7qjnn243qs0t4kg3',
        "m/44'/118'/2147483646'/0/0": 'celestia1puqtd64ms9r6ekslx9cz5wgfucef3cm8a2nnq0',
        "m/44'/118'/2147483647'/0/0": 'celestia1vmtll2ye4llnr7ydkmxscg7pa928kr3kthyh5y',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0x833f4157c176981083ac0e83e563addcb931f2a33c6ec2bced499671e329bde4',
        "m/44'/784'/1'/0'/0'": '0xa1891583027be6d9dcbe4031a8723a7b8db036634844e926c31f9bff4cffb224',
        "m/44'/784'/21234567'/0'/0'":
          '0xc90707d4e88bb43c9b9599f4892caf9d42590c24f5d5dd06874d5dd104023fcc',
        "m/44'/784'/2147483646'/0'/0'":
          '0xdfac543758bc6ea2f7601498ac614f14feeb2b5aa172b50a1f61ed562d7f604c',
        "m/44'/784'/2147483647'/0'/0'":
          '0x6f69225f39a9ffd483a12ba0ee4ed4518872d14061ed4bea9cc499a2323a232a',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rHiYRUQhjox9unEQaVyvdMMBUQ8qLzwnx5',
        "m/44'/144'/1'/0/0": 'rKpgNySCeKxceS5vcZNcibVuk2K5huKHZY',
        "m/44'/144'/21234567'/0/0": 'rQhw4nf1AGR4gZux97eD63N9YqaD3otHkg',
        "m/44'/144'/2147483646'/0/0": 'rwTH8My7ZYveBodHH9jWwZX7XJsoR5EAYF',
        "m/44'/144'/2147483647'/0/0": 'rLmKhJcQfp6s4KrgwsdNWdVTSUB2wwCACx',
      },
    },
    {
      method: 'benfenGetAddress',
      name: 'benfenGetAddress',
      params: {
        path: "m/44'/728'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/728'/0'/0'/0'":
          'BFC521d631543a937cf3be6c6087076be8403a14aa7e6c10a82e8bd24842ef8cef98771',
        "m/44'/728'/1'/0'/0'":
          'BFC18aa5be0fdc852669a9359a9bcd7d17c0b8d57ac1d3e9fd2ee19b16f4da47f5be4c5',
        "m/44'/728'/21234567'/0'/0'":
          'BFCa31bb445a5a264a89a8321dfe670e6ec226669a474ee84f7cd88b5850e3b87b808cd',
        "m/44'/728'/2147483646'/0'/0'":
          'BFCa4a937e726bdefc4bd9250f2e6b92fdc7b763774561bfc44f62be8c70c0b756f61a8',
        "m/44'/728'/2147483647'/0'/0'":
          'BFC4015a30596fa8c079fd75c317d02347faa105b1fcd1fdbcce86090299795706782bf',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '15i8B9GuidEKKqaWU6T952bSqwkxazSHxFr4oFfwQcdZ9',
        "m/44'/1234'/1'/0/0": '18VeRyeLA6nVv5CJNiM7DLN3B9UWTSHvKYctD1BLEBj4Y',
        "m/44'/1234'/21234567'/0/0": '1B4ierzU29tcCD6tqSnuu5Y3AY1ZWBLRWwuWTaMDJZGXH',
        "m/44'/1234'/2147483646'/0/0": '12UUG8rtwoLCGVEX4RZdJ3VSxQv4bGHgHhcaJwX3M5YYw',
        "m/44'/1234'/2147483647'/0/0": '17icbsJojpVozxizB8K3RKsdgShJVhoV1rdN1LByF5mmn',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'UYLVT2TGANCUILCRJKMLAIAIOKVGA77SRRLTF5YIBQA7AI2ZE5CULJ6S2E',
        "m/44'/283'/1'/0'/0'": '4GQG6FUH3WR3JQ7W7WXYH6NJHMHG4GOMB7MMER4HGI7YFIFLOOINWQFJHE',
        "m/44'/283'/21234567'/0'/0'": 'AU674KD2RL4NIB6PHZSWXUACOWFWLB4PFUGDCRUI4IMFXIG367DIAIDPBI',
        "m/44'/283'/2147483646'/0'/0'":
          '4N2B6DZJ2CHPIBZDQH4I6JIMEY5UNMBESQ7PWGRMAO324M5C2XJWH5ILE4',
        "m/44'/283'/2147483647'/0'/0'":
          'D2SCD2LUJ5PNGM4QN2BTVRVP6SJFKXZL22TVLVRY7GI5IFNBMWOUJPWCMQ',
      },
    },
    {
      method: 'tonGetAddress',
      name: 'tonGetAddress',
      params: {
        path: "m/44'/607'/$$INDEX$$'",
        walletVersion: 3,
        isBounceable: false,
        isTestnetOnly: false,
        workchain: 0,
        walletId: 698983191,
      },
      expectedAddress: {
        "m/44'/607'/0'": 'UQBLdyjOkdveuyyZ9Xnj5aU8Azp3s1qknlO5rzUvCDEWch6F',
        "m/44'/607'/1'": 'UQADhtl7p35d71aNfWM6zgEzxdNFa49NgMkrXo8mDu_bXYBO',
        "m/44'/607'/21234567'": 'UQDO5Evk6JnbotB9Z4X_Cg0fXLCzUQje1KeD1xGxUvWLQV4h',
        "m/44'/607'/2147483646'": 'UQBtsY5dQ_WJ7wKW33SXWU2UJjhaFdUoBvvC-X3A8VeORDnP',
        "m/44'/607'/2147483647'": 'UQC2XADghAWAmL_q5TitP0RP97ihC7bCZwC5TrIiIUXObs10',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
        network: 'ckb',
      },
      expectedAddress: {
        "m/44'/309'/0'/0/0": 'ckb1qyqtq0mfnv8j5rg8ajwa8uc2y8zaq4ngvcqq8p78gt',
        "m/44'/309'/1'/0/0": 'ckb1qyqwuw9hhpyqf0ue4ejacy7k4q2hglg7nd2syp9ltj',
        "m/44'/309'/21234567'/0/0": 'ckb1qyqp0z80wlegm3hmjhctlw3tt9m7n53uecaqknxev3',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqtc6afezrt48lql2q77zw4vx8ca0yvvdyq9zncm2',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyqpa4e5m4r2nqkcxqjk00q349qr9un7cfhss4h4w8',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5xrwjpfse9s7h5vpu2gpp0kf5dlmm9ws7ax34xatt',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5dnhtcu7j3czj9zdtyzl98a69qtlulr4maa4wra0k',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g596r23hvlauv886626yp40vw2f8zqyrn6c6r3shn5',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5uxn6vf9dync53fm6hl7tmxp2t8tjts9spqeae45q',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g5fe852twzp8rezlkmsxc6ee6u35ujla8skej3zrkj',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rHiYRUQhjox9unEQaVyvdMMBUQ8qLzwnx5',
        "m/44'/144'/1'/0/0": 'rKpgNySCeKxceS5vcZNcibVuk2K5huKHZY',
        "m/44'/144'/21234567'/0/0": 'rQhw4nf1AGR4gZux97eD63N9YqaD3otHkg',
        "m/44'/144'/2147483646'/0/0": 'rwTH8My7ZYveBodHH9jWwZX7XJsoR5EAYF',
        "m/44'/144'/2147483647'/0/0": 'rLmKhJcQfp6s4KrgwsdNWdVTSUB2wwCACx',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S01f8ce9f6a6232eb2bf6ce29fe1887b6c22f7b11',
        "m/44'/541'/1'/0/0": '1S01e11496f5bf20f295a04171db1536d0ab48f4a1',
        "m/44'/541'/21234567'/0/0": '1S01365c3f0cc91d6444ea47e4556d152f0283be71',
        "m/44'/541'/2147483646'/0/0": '1S01ef8725bc43ceb64c11b9e2f5a27e892bd970e1',
        "m/44'/541'/2147483647'/0/0": '1S0192dbee2a7e1e9a5df345b2015ccaec31e843b1',
      },
    },
  ],
};
