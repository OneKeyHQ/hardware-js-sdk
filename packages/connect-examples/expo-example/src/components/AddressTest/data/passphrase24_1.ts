import type { TestCase } from './types';

export default {
  name: 'passphrase24-1',
  passphrase: '0987654321QWERtyuioplkjhgfdsamnbvcxz@!###$$$%%%^&*',
  passphraseState: 'msnViVktp8SWFH4hjf5EYmXzTAiD6J89AB',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/394297355/passphrase-24',
  data: [
    {
      method: 'algoGetAddress',
      expectedAddress: '6CUPQI562HW2QJZKL3J4CGDWGGUXP63GXLEK3WDW6OZR6LXCLK45XBC3AQ',
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: '0xf78d0fd8cf979446c9b4f7764b47dcc7bea189ea61dae6a4ec1e314702d4e8fc',
    },
    {
      method: 'btcGetAddress',
      params: {
        path: "m/49'/0'/0'/0/0",
      },
      expectedAddress: '3FmHVmJUngzT6da4dnXfLPdV9JZxLqrVPa',
    },
    {
      method: 'cardanoGetAddress',
      expectedAddress:
        'addr1q9zd2w0crrz3lh2p86l8eddu78fk5qfjpkxl4pv29nxsltwdsjkkjvvvyl5du32egvxh3734r224ldkz5eak50q6jecsjd2rea',
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: 'cfx:aam84jxcugujedp4v3h3xzk9g7n5bzfdhpe89yw543',
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: 'cosmos18q7nk2h07meddk9pxxdyye00rjru0xngs5yw2z',
    },
    {
      method: 'evmGetAddress',
      expectedAddress: '0xC97cc00B8c7D082792c61Da5865fe61e67A92b53',
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: 'kaspa:qq97t8trju0a6s35rnzg2e35t5ar4gv08la9ktkqzxpsmanfrhz72ajf6s8q0',
    },
    {
      method: 'nearGetAddress',
      expectedAddress: '741dddd0ca63cf16b31a9d4177d960d871080689bf16820cfba57e543c404129',
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: 'nexa:nqtsq5g59tfd29uyzsj7r032cyew7yep6x7rdjhs2w96re2s',
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: '15oAdv2h7nKXgsJe38S6aVYmVy7i6g52Szg4CnxNUJhabWh8',
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: 'rP52k9jtCWmzifPe7x7o7L4EtNWSgEAVED',
    },
    {
      method: 'solGetAddress',
      expectedAddress: 'skkrKcA2nRX3Dv7sqjpFNqkmU4E9rAEJ8KrcUa8Pxgj',
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: '0x43ce36cb291a46e885a8b1508b6f7604',
    },
    {
      method: 'suiGetAddress',
      expectedAddress: '0x43aac93a4c8c7396cd948c3b4e0cbe65bce0d0c2c1b7e8bf0bc468f18c240a6f',
    },
    {
      method: 'tronGetAddress',
      expectedAddress: 'TPYoBKf3TKfjKLWy3zKhZtcYRc827HHpVW',
    },
  ],
} as TestCase;
