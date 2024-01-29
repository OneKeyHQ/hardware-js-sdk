import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase24-密语1',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428736557',
  passphrase: '0987654321QWERtyuioplkjhgfdsamnbvcxz@!###$$$%%%^&*',
  passphraseState: 'msnViVktp8SWFH4hjf5EYmXzTAiD6J89AB',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q9zd2w0crrz3lh2p86l8eddu78fk5qfjpkxl4pv29nxsltwdsjkkjvvvyl5du32egvxh3734r224ldkz5eak50q6jecsjd2rea',
        '50': 'addr1qx08epcaanaswwn0jy24zzcsgr2tuxkf0663lmcaj6mjfj3hjjv8nfclf7g0d8w8kw3y2slx36ljsvcvdjm0dtw8gahqee728d',
        '2147483647':
          'addr1q8jmkk5uhvu0mrs7dxvrt9fkwmtxfyycuksq0a7v3ck6aa2r3fw4uzzcseugk4vst68dpvj64yxzu9dt30j5nejx6uqs97gkp4',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '6CUPQI562HW2QJZKL3J4CGDWGGUXP63GXLEK3WDW6OZR6LXCLK45XBC3AQ',
        '50': 'C5V23SXU442DUPPYEBGTT5MX2WRGBD6PW2RMY5NHWBMSR3K3NCESOCFTAA',
        '2147483647': 'LK7FELHCTAP27YPHAYQKS7OM7DVUB4XPERLBOVCMV7SQYRX5LKCUK7WDYY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xf78d0fd8cf979446c9b4f7764b47dcc7bea189ea61dae6a4ec1e314702d4e8fc',
        '50': '0x31f5ef02cf7aa9521460e67ef221bc9545c27c44be8a02c70e674859b60c217d',
        '2147483647': '0xf7820b6913575974298251a8e7c3cc2770aa874abbcd07446949ff64953074d7',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '18WVQA7ndtSpiVi5JpdBWWeM8n1FbMCNQV',
        '50': '1EhwtKbwaEVPR3RE8J4VCzjxaYzDh1rDKg',
        '2147483647': '1HQH63hBp6TdYKJwG8isBVHz1uFgmPjVpH',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3FmHVmJUngzT6da4dnXfLPdV9JZxLqrVPa',
        '50': '3PhAsvVP5VQaqZYcjAXVQhyERqaSUqsTdD',
        '2147483647': '3QEexa3ZGKR4PQPCcqcnWBMQ62DtmzFgsA',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q76k9luedd4tftccks0qfavzfsyxt0dw968qd6q',
        '50': 'bc1qenuh95f0sm3244qucnplqt2fa06zhwj9rszx2y',
        '2147483647': 'bc1qml9t369jwjpjqv62x7kcscdq8m7jltjt6c2l2f',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pc0jlqs8mzeaz2tyms6rspjca9nw9gc6q6ln3tcvc8ueztcappwsqp2cdz0',
        '50': 'bc1p875sa6d7l9d7c8y4d53p526m4lm2tz969cfl4dy9y03t88uklqcqvyw3vd',
        '2147483647': 'bc1pzt5jx904jpag9043mtk5xq0w6d8kl45kkflyrumk9xg8nutjq0fq05n3h9',
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
        '0': 'DCWBy4GK5gX9RdntYYQwGK1nQGocfcvYQp',
        '50': 'DNZsvhPMT3L3weAWRCkzgS8uDWNsxsVEmZ',
        '2147483647': 'DPoo3jWZgA34wRRyxxERpABSkSVcUNnW2q',
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
        '0': 'bitcoincash:qqzg7g9wlsvz63aen4cacsvgty5wwcd9zcqd4lqlez',
        '50': 'bitcoincash:qzt0xa80pwlgyn0fg05gc24ccy3lqzn8fczx9zy6gg',
        '2147483647': 'bitcoincash:qpafzwkulz2vvu0r8w3keq5xt959leuykccrhfzh44',
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
        '0': 'LX32fttXiW8Yk5SeaTsbWkKJYJbqqAVVH4',
        '50': 'LebtYF6ojEL5Jf8wE5osLUrSfoF6kXywtd',
        '2147483647': 'LhVJyYjL21uotrqNervrvLeZa7vRcRQsyf',
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
        '0': 'MQsLaPPnPpQ9Ua8x2Xe1FGBUuSAAiRMgjU',
        '50': 'MNVrrHGpREmKLwBRUGTbNPAEP72qfEDU7e',
        '2147483647': 'MULMgZ2hupTXxBoEc6JcCFThsJBrXkPPGz',
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
        '0': 'ltc1qerdnlv90pyfp9j2xc58273muqu3uhsannjg5n9',
        '50': 'ltc1q9gxrgtm5yhcfg2jp0dpdsgjrmnldx9mev8kzr9',
        '2147483647': 'ltc1q9qe70896lxwjvl7852zwzzdxnx05mthkk470sp',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aam84jxcugujedp4v3h3xzk9g7n5bzfdhpe89yw543',
        '50': 'cfx:aanp1a7fsp66atsept41gkjrjyubypbbd254j4aaen',
        '2147483647': 'cfx:aasw209syjr47z4254tem69tbanv1r6rgav9983hn2',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos18q7nk2h07meddk9pxxdyye00rjru0xngs5yw2z',
        '50': 'cosmos123emrjuh7r66hlz34jft0d2u28dy8nfkkn9aur',
        '2147483647': 'cosmos1y2q8pd3hw89kny7d03efmraqyamx74h3vuezr7',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash18q7nk2h07meddk9pxxdyye00rjru0xnga0ffnc',
        '50': 'akash123emrjuh7r66hlz34jft0d2u28dy8nfkmgg69e',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro18q7nk2h07meddk9pxxdyye00rjru0xngg0vhkn',
        '50': 'cro123emrjuh7r66hlz34jft0d2u28dy8nfkwgdyqj',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch18q7nk2h07meddk9pxxdyye00rjru0xngrfd2g4',
        '50': 'fetch123emrjuh7r66hlz34jft0d2u28dy8nfk9wve75',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo18q7nk2h07meddk9pxxdyye00rjru0xngc0h7us',
        '50': 'osmo123emrjuh7r66hlz34jft0d2u28dy8nfk7gkd23',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno18q7nk2h07meddk9pxxdyye00rjru0xngxx84d7',
        '50': 'juno123emrjuh7r66hlz34jft0d2u28dy8nfkqpxxml',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra18q7nk2h07meddk9pxxdyye00rjru0xngks7wgz',
        '50': 'terra123emrjuh7r66hlz34jft0d2u28dy8nfkshla7r',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret18q7nk2h07meddk9pxxdyye00rjru0xngj3s8h7',
        '50': 'secret123emrjuh7r66hlz34jft0d2u28dy8nfk5k35pl',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia18q7nk2h07meddk9pxxdyye00rjru0xngp747s0',
        '50': 'celestia123emrjuh7r66hlz34jft0d2u28dy8nfk8e5dxw',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xC97cc00B8c7D082792c61Da5865fe61e67A92b53',
        '50': '0x4C12b97B2a46262cd4d164c1F683EFa8FB616A23',
        '2147483647': '0x18f0cF7510daeb98151AF89e778145a0CD24BEe0',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x2D472fA47a6f525b48398642a5923F5D4951eEf2',
        '2147483647': '0xA6f189D0dFE4d5F7969E2C6C366F23C7b2CABe81',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x2D472fA47a6f525b48398642a5923F5D4951eEf2',
        '2147483647': '0x176728DdA5d505473ce66F10555d7dD1f835968e',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f12ovuht4unnjsess6eupowswcqhtxagl2efrv26q',
        '50': 'f1xfajwjwul4ui3r26xmlxv6ec5ibrh46agt6nw2q',
        '2147483647': 'f1lgvaiql43bealb4t4j3hipqffffqaxoxz475xhq',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qq97t8trju0a6s35rnzg2e35t5ar4gv08la9ktkqzxpsmanfrhz72ajf6s8q0',
        '50': 'kaspa:qr46ea22e6xyppgn5zzh5c3kejkqzcf3yqcrmug975jnl5g76uyrqzuw7039n',
        '2147483647': 'kaspa:qzej0lcupmlk976y078fncv65av8tu522tc7dttz989n4ufzr8mwj4v4s5fxd',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '741dddd0ca63cf16b31a9d4177d960d871080689bf16820cfba57e543c404129',
        '50': '3a3f4c2889c2880b05b25bff2174a2910ac43dae68929cac56f570cf504274d2',
        '2147483647': '81e499d12b49bc0a28651799a60d5c1e54cd356efeab3b144b4f033ef88e3f2e',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDBJ3NWGI443E4WUVIUD3QRPI2ECYP5F5F5PQX4T',
        '50': 'NBQDAH3K24KD4VVVEKSQ23RY3W7O5DTX5E4UCM2N',
        '2147483647': 'NDSPT3RTWCPTSBQKO26FWYWRW34AM6PNPF2KTN3O',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g59tfd29uyzsj7r032cyew7yep6x7rdjhs2w96re2s',
        '50': 'nexa:nqtsq5g5qwerr3204nerzhrjlw4nk7m7qyhpep5shhfz8zu3',
        '2147483647': 'nexa:nqtsq5g5an5fajsjudu5jm084qdwqxwnaew5m5tt4slyfnhc',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15oAdv2h7nKXgsJe38S6aVYmVy7i6g52Szg4CnxNUJhabWh8',
        '50': '1QvGuBcXCxdX5Q7orZfmc8ejGue1jn3KYsmtD5DzRycV931',
        '2147483647': '15jJkAajxRauxWAET9oxcAAzZMWj4HJMB1Ymu7sXR8XbbvDJ',
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
        '0': 'ajTvsji3EhAUAKxZnqDTzstjPqBNbDdPhSiHDAsnag21Bpx',
        '2147483647': 'afc38HkssxYjoBYypD5VfW7nnECLCSx7iKRyY62jQW31adY',
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
        '0': 'HNV9u7VtN4yzz7ZrCC9LJ5cnwQJD3L4psnKSAEyQ1tZADLn',
        '2147483647': 'HJdG9fYj1LNGcyAGDa1MxhqrKoKAeZPYtf38VA8LqiaAjz9',
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
        '0': 'j4W7n4d1b8iZ65wjsMTpnHVRcAjCduG646Sa1R41LMHph4exg',
        '2147483647': 'j4W3vAsZdyMpUMabTmVCeKA3qE7bersKNpTSj7NvVJ7ei5Caj',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rP52k9jtCWmzifPe7x7o7L4EtNWSgEAVED',
        '2147483647': 'rBqqjSQSLGFeaGyNa5e74ukMXS7QsQH21B',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'skkrKcA2nRX3Dv7sqjpFNqkmU4E9rAEJ8KrcUa8Pxgj',
        '50': '8dJZR8F1gq1Wm1gWRWoaJU7sgKiGtynr9bTVoiHnD1yQ',
        '2147483647': '12KAPJwxLFqu5LbXHbGAiGo7ooXdqeidqbUEzc1TcPt3',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x43ce36cb291a46e885a8b1508b6f7604',
        '50': '0xb43132f9b6ecac3a061226cce1c70ccd',
        '2147483647': '0x5ccde7447860b2a46aa6189be2da3cac',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDPLYLV37KUV37RK3DE6WOU4OVCHOOVIUJGYSDKXXXGDYIYBCW6SOMPH',
        '50': 'GAFLS2W43577B2Y5BAQC4HZ7WI2JFIZEJMPO2NL24SGQMN2NWA4XR42O',
        '2147483647': 'GCPI3U5QRXJBK76RZKP4JF22H5OI7ANCNAP3V6XV4LZTB5GXKGXU3FOK',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0x43aac93a4c8c7396cd948c3b4e0cbe65bce0d0c2c1b7e8bf0bc468f18c240a6f',
        '50': '0x15944cadfa55cc8c8239d574454af2a3ae49324ba4bfe6c5086a70f2810bd89b',
        '2147483647': '0xfbd5d5ed5bda79dd29c44a8d123c4c2f6a66d1756ca6469e6b30c67f925c5e53',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TPYoBKf3TKfjKLWy3zKhZtcYRc827HHpVW',
        '50': 'THvN33kXXDNf8Rwu8TLToNKoupzBQ4ogvo',
        '2147483647': 'TZBvNVzxT5vVH9HPMYS9XBBTaH8qJZnDv1',
      },
    },
  ],
} as AddressTestCaseData;
