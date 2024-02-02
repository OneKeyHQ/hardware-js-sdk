import type { AddressTestCaseData } from '../../data/types';

export default {
  name: 'three-passphrase12-密语1',
  passphrase: "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
  passphraseState: 'n3igG2n49CvSEt12j1jr4SKkp45oUWWmAT',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/432046239',
  data: [
    // {
    //   method: 'btcGetAddress',
    //   name: 'btcGetAddress-Legacy',
    //   params: {
    //     path: "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$",
    //   },
    //   expectedAddress: {
    //     '0/C1/A200': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
    //     '30/C0/A2': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
    //     '20/C1/A2': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
    //     '2147483646/C1/A2': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
    //   },
    // },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$",
      },
      expectedAddress: {
        '0/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '0/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '0/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '0/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '0/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        
        '2147483647/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '2147483647/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '2147483647/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '2147483647/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '2147483647/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '1/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '1/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '1/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '1/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '1/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '2147483646/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '2147483646/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '2147483646/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '2147483646/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '2147483646/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '8974594/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '8974594/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '8974594/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '8974594/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '8974594/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
      },
    },


    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$",
      },
      expectedAddress: {
        '0/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '0/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '0/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '0/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '0/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        
        '2147483647/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '2147483647/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '2147483647/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '2147483647/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '2147483647/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '1/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '1/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '1/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '1/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '1/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '2147483646/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '2147483646/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '2147483646/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '2147483646/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '2147483646/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '8974594/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '8974594/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '8974594/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '8974594/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '8974594/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
      },
    },

    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit"',
      params: {
        path: "m/84'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$",
      },
      expectedAddress: {
        '0/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '0/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '0/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '0/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '0/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        
        '2147483647/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '2147483647/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '2147483647/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '2147483647/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '2147483647/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '1/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '1/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '1/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '1/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '1/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '2147483646/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '2147483646/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '2147483646/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '2147483646/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '2147483646/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '8974594/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '8974594/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '8974594/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '8974594/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '8974594/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
      },
    },

    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot"',
      params: {
        path: "m/86'/0'/$$INDEX$$'/$$CHANGE$$/$$ADDRESS_INDEX$$",
      },
      expectedAddress: {
        '0/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '0/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '0/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '0/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '0/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        
        '2147483647/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '2147483647/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '2147483647/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '2147483647/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '2147483647/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '1/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '1/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '1/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '1/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '1/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '2147483646/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '2147483646/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '2147483646/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '2147483646/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '2147483646/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
  
        '8974594/0/0': '1G4suo2srsQArAeangYCU31cWtb8qTH5ZY',
        '8974594/0/2147483647': '19Pu9isUTWaFqA2JY3Mu1Lb85RjSw7xusz',
        '8974594/0/1': '1Cc9TYjGwWL2iuvZyZmpoE7o1R4JC5qouB',
        '8974594/0/2147483646': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
        '8974594/0/45656668': '1MnbeVTHPfv2Uuo6RA7SXfLDEQzzoWExE2',
      },
    },
  ],
} as AddressTestCaseData;
