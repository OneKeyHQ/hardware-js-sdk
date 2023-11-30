import type { TestCase } from './types';

export default {
  name: 'normal-24',
  description: '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/218726488',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: 'VRMB4WUEC3DN7UBHYE3EY7ZT3OKUWERNQQJ4CBOJTOPXXAWX5Z4JAMS6JE',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/0'/0'/0/0",
      },
      expectedAddress: '1HBYRoZx6b5MVkSWksCRWCFtesHHne1gHw',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '39JT4Yrt4SjXGr6PpmJ1jfGEWyFZHj5oRV',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/0'/0'/0/0",
      },
      expectedAddress: 'bc1qx74p4wvqfm9r8r6p7luwlmkajxx3mjxle2c5u4',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/86'/0'/0'/0/0",
      },
      expectedAddress: 'bc1ps4fk5rx26xx9990qs88q3je5dypwqguhz2s87l4dczfgan3cvass3jvuvm',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/3'/0'/0/0",
        coin: 'doge',
      },
      expectedAddress: 'D5Cvu2NfFg9v4hEV2Rsh5be6j4JRFjyk3H',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/145'/0'/0/0",
        coin: 'bch',
      },
      expectedAddress: 'bitcoincash:qpr0x2gewm6tm20h8f33hmw075pxzqvn8ukqe6g3yj',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/44'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'LSmKDhScBC7taRgxHfw91Vaz2z4YUDVb9e',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'MPuBPxv8RNofxph4bRonoPQhVWEi3TMTHC',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/84'/2'/0'/0/0",
        coin: 'ltc',
      },
      expectedAddress: 'ltc1qjklsl739wedrxqdpg0x4uta6hq3n7y5w7zwz4j',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1qy5ms8ls63ku9zp8qpuysvp4j3f7ddenfkeg0rdxgxraracjeesya9qwyfpjsthls3nq3696l4s8m4vp83urz4tdjsjqdpum9g',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aamx2u6f3g2dr5gef108wkkeew72n0dzjuxc7t5vkw',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos1aj3yvyzgv3shp5fq4rzyrhn0dte7uz6zwyul4l',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'akash',
      },
      expectedAddress: 'akash1aj3yvyzgv3shp5fq4rzyrhn0dte7uz6zrl3cv9',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'cro',
      },
      expectedAddress: 'cro1aj3yvyzgv3shp5fq4rzyrhn0dte7uz6zkl5xfw',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: 'fetch1aj3yvyzgv3shp5fq4rzyrhn0dte7uz6zae4mhg',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: 'osmo1aj3yvyzgv3shp5fq4rzyrhn0dte7uz6zxl00rd',
    },
    {
      method: 'cosmosGetAddress',
      params: {
        hrp: 'juno',
      },
      expectedAddress: 'juno1aj3yvyzgv3shp5fq4rzyrhn0dte7uz6zcklyjr',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0xcfD7A4B84cFf0b9717Dbd8930720492bFC4484Ce',
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: 'f1nql7bfoqm4jcamyacxeyyd6qtgrprvsq2mhjezy',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: '',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '98f7b5e1ef7a89703ba463195c3ebee3e455bbbaf98b87e7996067c71d668e58',
    },
    {
      method: 'nemGetAddress',
      expectedAddress: '',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g5jnvz8kws04uhrdhvy64fksj3ef0njqggxc5n2ggu',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '16fP6kx3FxmYAE562zZSEtxqcF3pRDorizjb6mDY5RBmnohB',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: 'JEhck2r2YWzULt1r4KUzhVguDLQXb4u6sqrL8W918NkMXHZ',
    },
    {
      method: 'polkadotGetAddress',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: 'bbgPif4BR9AwX6QZexZ8QHxqfmHh8xTfhWFBBS3PhADCMZf',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rpUi73yswog42p7bR71vRp4G74nzZMvaqA',
    },
    {
      method: 'solGetAddress',
      expectedAddress: '5MvgnYA7dmXaqdte918SL31asso7zCDx4XuvSDLdkYAH',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '',
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: '',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0xa5fce96feea80e90276f5e59669cf4c91d22d90d04d303abc6d0285675ebee65',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: '',
    },
  ],
} as TestCase;
