import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-密语1',
  passphrase: 'asdfg7890',
  passphraseState: 'n4kk9unKaT8HBt5CgnarZLZSMyhk2SrsQE',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392156',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qypdet84ugmny0sdzpsdwdr4kc3uc6j782k6svx9hxuvs6xre0p0flc6v59xk2dmr5e75ulws84fx7j8h6x4cuxcw5gs2z59pq',
        '1': 'addr1qx02amemgqg44m9kpyxfx6npderack6pqh9uhfq9jq3h4kxk8jjvgh4lwumtvun6m3qxfl6nvac0xgdyf0wlakt7a8yqgkjt7c',
        '10': 'addr1q8gr2y862sk7cncv7vsjfpv46h4xw66az8fqlwvg05a7k8tcfgvnuwr0ccwddmxzj9u8ujv05fa5pvz95q3l69w500hq7jyshe',
        '2147483646':
          'addr1qxcgma30tz0h2evcp5unwz8n95daeel3az5hy9nd2yjnw7phpz2jvjv2gg7tx64wxye67jnl2jukph3rz7930l2dy2vqde5zf5',
        '2147483647':
          'addr1q9mmjl7wnugta9jq2m3ytxplav6hs8ntptrvl932vf0hgautdtyje3s83dcsu6kt2trmgal57f9yhh7xa8g6492cqlas0894nr',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'TVZ75EMTXNAHMITXYUWYGNDESAZJJPC4WKPVT5VKMJPLEHOZ2HGWCGWDZY',
        '1': 'FT7MMUBIUSR77JRUJVOPAPNWBUVUHPPZPSXHMHA7IAT7CTDWPFU5442POA',
        '10': 'QHDKR3VWLLGTK5TP5AT63EQ5QWHODPBP4NIXIT6G3EM3XUPU62FJBTKQFQ',
        '2147483646': 'ID5VHS4NAL7QUI2TQNNPIB6WOQ6WXWORBISPOSB2II6HJPSTJWGPOCIBY4',
        '2147483647': 'BXGWNAJ5AS4FG7Y3NNLUBA55CM7R6AB323N45SDJNCHVFO4ARQTODM7P6M',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x097c1bdf151e7fd82bc22fcf3ee7c7556c52e20c64cea7f05e697a779a3c0f44',
        '1': '0x4877b8f040be05d51232f6dbcb7719e4e6b9326b14fd0e8dae8b9192a04ff592',
        '10': '0xe8c52e170f1d29ac62420db6cef39139e8df51f4d191b3b5b910b11853e58da4',
        '2147483646': '0x131ca863b64c0d5a2a0a80d7d6ef8e18dbc290c7c1c8afbc89288bebc06efca3',
        '2147483647': '0xcc1955570a1dcf13fc7b66bf93fb98206435f13829667a7faf74b83aeadf0ed3',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1HbEUb5CpwnjPbQsfKGXvr3SRofqczsj3o',
        '1': '1LVVTQ9FoBQg2UJHJGkcZzvVVnun9ErExE',
        '10': '1BSC9mwLz9X1JzX21vUDFHV4fKLr2qvzZi',
        '2147483646': '1Kh2ZHeKXJSA62r9TGGU6tSNvSfeGKvqW7',
        '2147483647': '15QYq49GU1HTFeRpbEz6kKP1nWb2kaQNYH',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3Lb1ALnWnGex2WAgHxGh8knzWcRNSDZg7d',
        '1': '3Daukht9kv2nMZaU7BNgdGt2hV6ztBAhS4',
        '10': '3DN6bq4iHWjqQUSXPg4TkaSNBHihCX9cfL',
        '2147483646': '35eGQeecUyecXjBScdCKLRPm7zEeUXwGnG',
        '2147483647': '3PGBPD8hxtGPQpVrfkAMe6GFt9F1VeHK6c',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qryxs2tnymvy6hlkcydzdunfp992jne9chrj6jf',
        '1': 'bc1q399xljy7accp2whd4ekvfj0q6e4x90aucqr29j',
        '10': 'bc1qchueg7es29k663vaj0dehv9duwar92axuwev4x',
        '2147483646': 'bc1qa9pxklru6lustf6ahtw22wr4d4cxazvcnzh7h6',
        '2147483647': 'bc1qlsd3qjnus804mpy3xkhg8yumfx4ydx820zrpxp',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1psqfx6c5h0xwcejdnewmmhygc8tkuwe6e504yt4vwudwtewg66gcq38fjz7',
        '1': 'bc1p97ywmz2c787mfwccpd520hx2l482f3szczmjx0kmgxlyg05c77csvlfn3k',
        '10': 'bc1pjuwjtvqfjunk0m6xv4gq50anl443ny2sxlhtsr7qcffs6pmdeyqq9kw3p2',
        '2147483646': 'bc1p8rj6rwgncmfle4cehj7jvksfqe3m628njg7gv4kaw62j3m6e272q2yxyfn',
        '2147483647': 'bc1ppqhxcs5k5tywc7f87dqfr5lpyxgqlaq3cpk4pz0qrwwwuhpmaxlq0v45ss',
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
        '0': 'D7nFGWDCb3fpt6W5TH2AtNCr2SjeJ4q4GU',
        '1': 'D9g1PM6vZfyPVDzNkPeGR69RoyVeuXKKVP',
        '10': 'D9eUH1fjRZTR9rhZuVTY6nWCPFXjPGpbFD',
        '2147483646': 'D6hhqLKtrw3AyNZgQVWicoNVVzM2qhduuM',
        '2147483647': 'DSd9uNhCuRyMnB2tk1hKe6i9fR9FAgZZ4V',
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
        '0': 'bitcoincash:qz0nckkws6h3fj6jjmkwuvxaf7avecxnnqnl2nxpfk',
        '1': 'bitcoincash:qpfky8vhns2mzz52l9nfezrff57f63ncjvpcc4hrmy',
        '10': 'bitcoincash:qrj9em5296duq9qd2gyesxegad8wmp264v45hvtqw9',
        '2147483646': 'bitcoincash:qq7gnhwgy88a9k3v9e8uxp5mmdzu99sz6qjqr6kt73',
        '2147483647': 'bitcoincash:qpzyqxfzeffders2zec3xfmsulh8aectev9l6r5p62',
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
        '0': 'LfvcMyH9y9rQBWRqCVSQX2BEVRpVFMXTu5',
        '1': 'LgHaKwQSrKZLj89C6tkhCxXWLDv9CguwoC',
        '10': 'LLqy3j8mw2xijxTRnmbdZQBPFq6a3rULCw',
        '2147483646': 'LZbJm2FP81cg6Zd54r5dukioKx8x8C2nAV',
        '2147483647': 'LeYPFfkJJRui6nuH62rfGbWtHoNEBWBxBu',
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
        '0': 'MHHtsRXn7mm2L4XTcys5ZPPfwAzaTyxZa5',
        '1': 'MBVoHrYJwXk5wPAFKKy6x9gFbeD5DkA5P9',
        '10': 'MV25f3JKJLokudfZskpi1CVXJTeUpGDNzZ',
        '2147483646': 'MKbiKycio4isvKfd5KkvszTQZPkEqpg4Uw',
        '2147483647': 'ML9Dyk6hVJrEJxwLq544csX7F3RFLqsXYd',
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
        '0': 'ltc1q2zpnrr0xqk5dg83fwmzu77qavaq8svt7k7u2n6',
        '1': 'ltc1q3ztcvggl97nca6t8t35uly0jt4ns6sdx94m882',
        '10': 'ltc1qm6j3rpx6m2ycffm6dq5lvg8t4gwxynydemkljt',
        '2147483646': 'ltc1q2wdlanwneuv65074sxtypt89mgrw8ucstqekn5',
        '2147483647': 'ltc1qe5k59dcg5fnyu4nm66t5nr74h4e82nvsu9ag35',
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
        '0': 'NP7xZRZv8JXnDyuTgF3dfDPcjiaufVehLn',
        '1': 'NbZ2YmvpKzLqaDZTEMLnQzQnFMPiMxf4yW',
        '10': 'NU75hA5ykZR7Fn7GauEzANs5QzMoDa5k8z',
        '2147483646': 'NNWApMqvfWJ7QJRUWA3Ktww1TJ7qqepEcB',
        '2147483647': 'NfA7kZbHnThXQP5LxguY2MvZhJsQvB3nga',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqvr9jysg449gjq93rnsvsh4eyeyfzsstssrj0gu5',
        '1': 'ckb1qyqy8v07qu8gp4us39cvrqs3c645kynfflpstaajfz',
        '10': 'ckb1qyqznu8kh455wpejd2nq7swkxexax79mjjuqrczdt2',
        '2147483646': 'ckb1qyqgxzss0sd3v5qt9ep5qukfmtf9ht0mat3qu9eusg',
        '2147483647': 'ckb1qyqt4czu06h346xg5l9qqpyhn28tel29lqrsc96vzm',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aaj9wghevk7vhnp4jgyjgmrb2tb0df229e5ppf670f',
        '1': 'cfx:aanmtfae2hcwd2bvx3twsueht5b3654h3ub893h795',
        '10': 'cfx:aaj4tjkk05a27mdn877zn74e1v31rkjyf6hvfyfnr2',
        '2147483646': 'cfx:aap7d64r8k0kbzyw04tsg599xkffun7w36uyk607j2',
        '2147483647': 'cfx:aasufc3xr812a32eydck7r13vrv28csxfyghcabdp7',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1t9cxffmcwpyvjdgaqgrl6h2pxym7v80zvh75fe',
        '1': 'cosmos1ep5n2quvvawn0smzyvme3efq4uslgwxpzaq4rv',
        '10': 'cosmos1nc2qs5rql8ujcqce72hz5gnkjhnme27v62hly8',
        '2147483646': 'cosmos1dz3udjcp6zujl0mu6zmgvz9frt7egp4cg0vmve',
        '2147483647': 'cosmos147ljaxjpc0axmer3nzkweyxwnpa2dctjdeqvg2',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1t9cxffmcwpyvjdgaqgrl6h2pxym7v80zpvnnsr',
        '1': 'akash1ep5n2quvvawn0smzyvme3efq4uslgwxp0xdj6k',
        '10': 'akash1nc2qs5rql8ujcqce72hz5gnkjhnme27vh36caa',
        '2147483646': 'akash1dz3udjcp6zujl0mu6zmgvz9frt7egp4c95pu4r',
        '2147483647': 'akash147ljaxjpc0axmer3nzkweyxwnpa2dctjqzdt3s',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1t9cxffmcwpyvjdgaqgrl6h2pxym7v80z5vkd4g',
        '1': 'cro1ep5n2quvvawn0smzyvme3efq4uslgwxp6xgvla',
        '10': 'cro1nc2qs5rql8ujcqce72hz5gnkjhnme27vz3lxck',
        '2147483646': 'cro1dz3udjcp6zujl0mu6zmgvz9frt7egp4cs5yzsg',
        '2147483647': 'cro147ljaxjpc0axmer3nzkweyxwnpa2dctj4zg45m',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1t9cxffmcwpyvjdgaqgrl6h2pxym7v80zl2hstw',
        '1': 'fetch1ep5n2quvvawn0smzyvme3efq4uslgwxp3qf3pm',
        '10': 'fetch1nc2qs5rql8ujcqce72hz5gnkjhnme27vfh7mxs',
        '2147483646': 'fetch1dz3udjcp6zujl0mu6zmgvz9frt7egp4cmj9lww',
        '2147483647': 'fetch147ljaxjpc0axmer3nzkweyxwnpa2dctj7yfg2a',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1t9cxffmcwpyvjdgaqgrl6h2pxym7v80zyvdylt',
        '1': 'osmo1ep5n2quvvawn0smzyvme3efq4uslgwxp2xn947',
        '10': 'osmo1nc2qs5rql8ujcqce72hz5gnkjhnme27vj3y0j4',
        '2147483646': 'osmo1dz3udjcp6zujl0mu6zmgvz9frt7egp4cq5lt6t',
        '2147483647': 'osmo147ljaxjpc0axmer3nzkweyxwnpa2dctj9znu7c',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1t9cxffmcwpyvjdgaqgrl6h2pxym7v80z69a0w9',
        '1': 'juno1ep5n2quvvawn0smzyvme3efq4uslgwxp50rwys',
        '10': 'juno1nc2qs5rql8ujcqce72hz5gnkjhnme27vvc5yrm',
        '2147483646': 'juno1dz3udjcp6zujl0mu6zmgvz9frt7egp4c7a0qt9',
        '2147483647': 'juno147ljaxjpc0axmer3nzkweyxwnpa2dctjmtrh0k',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1t9cxffmcwpyvjdgaqgrl6h2pxym7v80z2ny5te',
        '1': 'terra1ep5n2quvvawn0smzyvme3efq4uslgwxpye64pv',
        '10': 'terra1nc2qs5rql8ujcqce72hz5gnkjhnme27vuwdlx8',
        '2147483646': 'terra1dz3udjcp6zujl0mu6zmgvz9frt7egp4cwtkmwe',
        '2147483647': 'terra147ljaxjpc0axmer3nzkweyxwnpa2dctjta6v22',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1t9cxffmcwpyvjdgaqgrl6h2pxym7v80zwj2a59',
        '1': 'secret1ep5n2quvvawn0smzyvme3efq4uslgwxpqc5u7s',
        '10': 'secret1nc2qs5rql8ujcqce72hz5gnkjhnme27vc0rkem',
        '2147483646': 'secret1dz3udjcp6zujl0mu6zmgvz9frt7egp4c22cj39',
        '2147483647': 'secret147ljaxjpc0axmer3nzkweyxwnpa2dctj0u594k',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1t9cxffmcwpyvjdgaqgrl6h2pxym7v80zaa0yn5',
        '1': 'celestia1ep5n2quvvawn0smzyvme3efq4uslgwxpnh39ep',
        '10': 'celestia1nc2qs5rql8ujcqce72hz5gnkjhnme27vtqx072',
        '2147483646': 'celestia1dz3udjcp6zujl0mu6zmgvz9frt7egp4ce9atk5',
        '2147483647': 'celestia147ljaxjpc0axmer3nzkweyxwnpa2dctjun3uj8',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwoQzYvcPfVcgP89mW55MSK9qWeQzaeVa8E63SefwKyS53kdPMdFmqHFQty9faZthkNG2trmhrF7vAYNyRRBAJDv2Q2meXHrY',
        '1': 'XwnhFd8aaj43vJncCUNqMacH1hAQhR3ZZiiwQ1edGvodYc7ULxo3A9TfBHfQBt8m5EdP58Y13RoVeYUcLbuCzxbt2jXEoinmm',
        '10': 'XwnZwopDNGeSa6tDhDiPwB5Pmoi9DikiEZBjBp3adc3w46M5M3CKg3BgonRA97GZxAFZKomxKTr2oVFMhpnVhe3t17rNxwzux',
        '2147483646':
          'XwoXGafbK4i2qm6saM8beB3ex2jyHhnUbPpASewN9Df13vUtiZxHks2H5tV7HsADwQ9LDE25hnvbuctqvkzfgpwC39PXoq4Uj',
        '2147483647':
          'XwmidxQ9Tgd844B2nsWt9nTPo96pVVJyn9L1TmqM2N2NSV3b62cz9bLfMAGuiuLTdfEWvKz5MtgozhPJZJZ3H1Y427v9MH3Z4',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xEeBA38fdC145e09BB892fecB2f302Cb21880060F',
        '1': '0x1B5bBE8adBBA8F4083da0340222cB63e93598230',
        '10': '0xA501a57703a131E2f60B10872952067b2D6A61A5',
        '2147483646': '0xc3Dec09B30d42b1f0C7632CFB4C32785b35C441E',
        '2147483647': '0x27132D7169C1902c3A77FAA2302f9008F8174a29',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x45Aa8516857524AE2D83C336A858Dee0a2B6e559',
        '1': '0xA14B1159130056a0aFb969EE5B338BD69cc2E1AA',
        '10': '0xf83884ED3fc6021EB1f19CBc86731EF297bB1f0A',
        '2147483646': '0x4B6129589b04cc8c573693525D65d16EE675c743',
        '2147483647': '0x4BDcAF08611A38F9AB52ab9ce64aCf02c9199710',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x45Aa8516857524AE2D83C336A858Dee0a2B6e559',
        '1': '0xF888fd70A7e0eF4C6ce7a558dEABD638a71C4Cc8',
        '10': '0x611c2345dAF78A77e7a2697C326f3f023b268dc4',
        '2147483646': '0x51134839547948E84dd05C301fF9982C0C50181E',
        '2147483647': '0x76620322e6531CccA9Df8Ae6895343D4c22E9C83',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1besvdgisbdq4rbezkxqaqb5dfly7fxd2y4showq',
        '1': 'f1lc52zjtapsjiwza6cqpavhfpg3fux7z42nogkta',
        '10': 'f13hqsf35s4csngw7xvbg5quq7p6pdqnvqcp4flgy',
        '2147483646': 'f1bcm6y2qgnoxzitbauvbz7b4y7dihyuuhhvcq62q',
        '2147483647': 'f175e34dtetxwbg4h2wqhwvx7aiot3jpsrw7wuajq',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qqf8x4dqxatqs89v3lvnap9xe3wmhrn93uwgt7mrhlp2geqkxnexg0jshm9tf',
        '1': 'kaspa:qpg6ery0ve79m0gdzyrr6lxw7sra4px7ag5nfq5wyeet5wtqnf6k58e472d5u',
        '10': 'kaspa:qzzl2v70nt48r74mst508a0tu74ypk93dyes2ke7h2dyqv4ks6s4qgy25rglx',
        '2147483646': 'kaspa:qz5r22zhtkwv86ls4tpmnv4s9s9u2mfu3ffl3fdyh4tgufgk2s9s55j4je840',
        '2147483647': 'kaspa:qqd9anmuc7jtgveds6kcslsezztay74myh049eeqpn28pme3nqghzdsqq5tev',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': 'cda5e5a5cc6a9aa779347e7b2f8cbfefe111504c99a158b023aea683e753c269',
        '1': '46c6003af9a18a7c9da422fcc0505dbe31b2de4d717e7aaf96f346b9f1cbf365',
        '10': '2c5ebdd400ee2d9e1aa0fee143807e7a5187e8e8c6faaf9adff3e972d2eebebf',
        '2147483646': 'e9785864670bad7f745de23d686b18123a1657f0047abad0132e1add9895066e',
        '2147483647': 'd4c0bb71888c4b8e654af673e710e0833dd488a5d832f2c7b54763ad0c88294f',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NC7PL5E56AVGU5W5NAXQTBNHMVVEYLRIQ6OLPP66',
        '1': 'NA3HH6IQKGG6ZF34KLXCECVRCWVOKXN6FRW6BDIX',
        '10': 'NAGDTEKJQI3RFI7GI3HR63MND3Y4LCSIZ5TMBUXP',
        '2147483646': 'NBXDSC33DWEIHGYKQWO7VBRLIDTV4MSCQZZRYL7L',
        '2147483647': 'NDWJAL2PEBZEME5L33BP7XWYFHZ7622T4HSWXJJS',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5hnej4cqnj7xqnnagl64q90gqjvhfdt3n5ug2wjex',
        '1': 'nexa:nqtsq5g5jreflm70llscvtjaldjl3ulgrfnt6nkjgpn2jydq',
        '10': 'nexa:nqtsq5g5eauqtytll4pv5n2wq47st9qy0rtz5apju43g3zjq',
        '2147483646': 'nexa:nqtsq5g58hpa6q0fl7f97nuqscd45snsyhcy9ws0v8qevnqc',
        '2147483647': 'nexa:nqtsq5g5mt7syj2jjuyswv79dpkdga2mm5u4ltvwechgtx0g',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16LewqqFizXy8EnKCojupGmxRCppfDksmoJj9VNWUWDwoA3i',
        '1': '1pwEoRAYu74GZueGKYyLsSMqvJ3gYEvaEcNw8FMcsHuQMMa',
        '10': '14PPYchrrHDwBnLFR6dPYdo5GDx9Cwh8Ljfhi1Xc4WipKAHP',
        '2147483646': '12NhaYLyfw22aHHfKGk6hDWWiwvLvtJMEurXhxsmPLepPwXM',
        '2147483647': '16AjNEJxV8N2pvH41BsWinwq5Zjrkc5B54b6xSm9UxKhnqfu',
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
        '0': 'bGxEoYGeSubuXodjU92hn75edYHw8uUiW5PDub1nnCPCgKc',
        '1': 'WmEXm8BUMUh3rvxnyx6ENmV5M1WxTPXWwP31YTrw9GLoiK5',
        '10': 'ZKgqaQsmjbZy5MZwm2WS98CVefcUrqjHSSMnRk7NnhFijqF',
        '2147483646': 'XJzsW3zbPPfMaJyqw9DaiqdxNdpCoSxBcdBnP6GhcdFoX8v',
        '2147483647': 'b72fC1yQajfcDJNXrGdcJGxJzTL2XDn1mMm2ryeoEJ9Cdn1',
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
        '0': 'HuyTpv4VaHRSMbF1sVxa5JoiB7Qmb1v9gQzNrf7QDQvMceM',
        '1': 'DQFknVyKUrWagia5PK26fyD8tadnuVxx7ieAVXxYaUsxieP',
        '10': 'Fxi4bnfcryPVu9BEAPSJSKvZCEjKJxAicmxwNpCzDunspFe',
        '2147483646': 'Dx26XRnSWmUtQ6b8LW9T23N1vCw3FZPcnxnwLANK3qnxaUo',
        '2147483647': 'Hk3tDPmFi7V935ypFdZUbUgNY2SryLDSwhNBp3kQfWgMX3P',
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
        '0': 'j4WfGNYp9jvmXXKDYX98bXGeo5xukTomuRFCgMkRUMVM4G7HA',
        '1': 'j4S9YfWQ4ZqLcfeLsaewf3sKCWgNyV8FxDgWL9PJKVrR1sM5B',
        '10': 'j4UhzyKgksDTVarmUjS25Fdfuvz351Xi9zBZevGaZwVqvnAFt',
        '2147483646': 'j4ShK1FKsgsFayMitdc8nQDPMPi1GjUKNtMkUvDvjGKmvs4P5',
        '2147483647': 'j4WVLnwHrW4bbDziHKXGCRnpfkKpnZC6CiWV4Ahp7MwSpG3VM',
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
        '0': 'dfbtfmLsnVY2BjEYn9WL7MJeCJJTcM59dsZtvzHbGKxdugsGo',
        '1': 'dfXNx4JThKSbGsZg7D29AsuJbj1vqNPdgg1CamvU7UKhsHsym',
        '10': 'dfZwQN7kPcpi9nn6iMoDb5ffK9Kavto5tSWFuYokMuy8nCy5D',
        '2147483646': 'dfXviQ3PWSUWFBH48FyLJEFNkc3Z8cjh7LgSjYm6XEo4nHgWq',
        '2147483647': 'dfbikBjMVFfrFRv3WwtTiFpp4xfNeSTTwAqBJoEyuLQjfgkZX',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'r9aUNxqNv1botZ96owwtJMzUWk4WJ1SrMC',
        '1': 'r4eEFuSoQKNvYRc7ybHTMHf8xLYdfeC2hg',
        '10': 'rnw68c81EBk61HHfUND6EABQSbrEtf1mHE',
        '2147483646': 'rHguQs5wGEkNZ3uBf4rRd3ERVKy5wyTvJ',
        '2147483647': 'rhbXHdMJfNdebZw5MQzfvf2H8aFLagB932',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'Gutgwm97HtnoTuKBTJynaitDwoN1KGpe78ssc7J6WMw6',
        '1': '4WLqR8o2gJksv6PcRAZYb77uucy8uBCW1HGVUqhKjDis',
        '10': '7KdTTPyRMgcQwg6WKyL6X6qVf81fvyUDavsJBTzpksku',
        '2147483646': 'F5fdmn186KJga35TG9L7qyAJVccxy2k5mcM3Vfq65MNP',
        '2147483647': '9iDVhxy4zcgTDkziytaK37cztU9F3KxhNmJBc6bnw9WP',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xec768826705976b4f2a4bd8d4fa3c1fa',
        '1': '0x25fd4b17939a790a0f5d9a11b08d61e0',
        '10': '0x731eeb670ba4a5162a427448a142ca0c',
        '2147483646': '0xd0545c2e637bb12e109509d0a14e3801',
        '2147483647': '0xb283e9f82ffd66418538d36343a0001b',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GCYHEI32YHQ6PHQBSMF2UNO6XCXIOSOCSZZABEAA6GDOMKDONQSTOFXX',
        '1': 'GCJN3IFOLFNNIE57XQMAQ4G5CY54JIP7A6W6TPQTIM3V4MZS32HK2RUJ',
        '10': 'GAN5ERTQBYW6ROIPU4UCM35D6MYDOGVBKZGG5DR2HC5EELAYUP4Y5B56',
        '2147483646': 'GC4U3VPRU72OGQTZWOF6EDDY5ARQEWNE3Q352MZ7CW6HBVCZR3SF7ZOO',
        '2147483647': 'GCFUCPIO4JXKLI6YBXZB5FICIRHTNV45ZVLNBAWTMMQJSOH64OQCSAHL',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x7f5019be1c3fbd470c26b138e9d010ed943c35e692b6588737f0142948a1059b',
        '1': '0x51711e1194f155b8627a51d8836ece40cfbbe8c976e071af63c540a0e72953d8',
        '10': '0xc821748540b53a281f9e096199d2e5afcc0a80b28f5a9a15cd79ac42de24748c',
        '2147483646': '0xa1a33906e635eb069a130821f49b7c3b8e8dab3a91240c5a6b54021135c9d603',
        '2147483647': '0x59cab9bdde0b8ccd092c5b100e6145ad1f90b07074405acb6d63bbd96f33e180',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'THdM7uiwo81Ridq3WTfBBKmJSC9teEWU1Q',
        '1': 'TJv4tPQMGTg6cTLRR7os7p1f3zqBYvDwQH',
        '10': 'TG8HQh8tnHXvpeQYC6PTTdRPPir1a9vQkd',
        '2147483646': 'TW4YJ9Bo72ZNaHbEjCD7xsNvkPfhFwjYx1',
        '2147483647': 'TSwbjougp8YbQj68kNFRdtnsXcwmc3GZmp',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFCf7180c8ab5c320dfce5d3632782035120af4f841071acccebb38e35bbf8c583f5ca6',
        '1': 'BFCee22a51a0c4ee53c595b198baba1338e56035873eb9459db39dc26ba4fd0de8877c7',
        '10': 'BFC24c71ca4ad2263f0be2ae79c64992536c47bfb0198126df543f1870b7a4f93845c2d',
        '2147483646': 'BFCb1a7b539b6f92be4b0f6905a63bcf3d6ab84b244503528cfe33cbf164bcc7fe646f3',
        '2147483647': 'BFCf3c6f566a5fc4bde7674bd9cbfd6cdd5c7e199fa1cbe65e461a21ef6a68df76a3ff5',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NZHcYMqdhieRYCzbsdB3hhWU3vx9rR3ktw',
        '1': 'NZFRTRm9BR3s8cdxryMBk5DLQYhKNi4eoJ',
        '10': 'Nj7b7iVh6QecxFcutVV8txNpswshxAmuK7',
        '2147483646': 'NYYJXwvtAsW1HFf8t6BjP5sNMLwCbmYQ3i',
        '2147483647': 'NecVAFqyVcHhdCnvXFoENbcsbvMCPwvs5m',
      },
    },
  ],
} as AddressTestCaseData;
