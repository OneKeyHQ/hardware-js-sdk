import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'two-passphrase24-empty',
  passphrase: '',
  passphraseState: 'n2XDwPTRoTrLUxu25L6XDnyDBuDeXhjmoz',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490457',
  data: [
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$",
      },
      expectedAddress: {
        '0/C1/A200': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '30/C0/A2': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '20/C1/A2': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '2147483646/C1/A2': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
      },
    },
  ],
} as AddressTestCaseData;
