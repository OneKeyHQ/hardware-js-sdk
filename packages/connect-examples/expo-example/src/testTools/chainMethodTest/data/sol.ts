import { type PlaygroundProps } from '../../../components/Playground';

const solData: PlaygroundProps[] = [
  {
    method: 'solGetAddress',
    description: 'Get a Solana address for your account.',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/501'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/501'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/501'/1'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/501'/2'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'solSignTransaction',
    description: 'Sign a Solana transaction.',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/501'/0'/0'",
          rawTx:
            '0100010376655f5ed1653f0882195b265edd2149775b197f64a21a283337abb53ae80db2eb08fa3adfd0ff75382ba8cb3b08bb165addc780f6adc2937be8ee36a9f44adc00000000000000000000000000000000000000000000000000000000000000000cd9e955d5c0cdfba7f0ccf4c51000bc5e219adec51f4e0bc98f6d8649bc0cd801020200010c0200000040420f0000000000',
        },
      },
      {
        title: 'Sign Transaction Special Case',
        value: {
          path: "m/44'/501'/0'/0'",
          rawTx:
            '80020102060dfb6fcece9a7e53fb18b151ab6931bd1d04309ea8b606f3e97104bf8c8b965176655f5ed1653f0882195b265edd2149775b197f64a21a283337abb53ae80db2e409aa0f0b420939d0c991c8d75ba53e3cf7548b1a9286651f5d3e0c027b8307525b38e475902dc10628968507284b2514bcb1bbaf4477845675475f5fc7c512079416ce881d9a7c80ac9c7758ff6548817e4a910e0cc3ebd9d28bc54ceeff0d0306466fe5211732ffecadba72c39be7bc8ce5bbc5f7126b2c439b3a40000000870025b5287040ad66b056a354920bd1c42fea745bb4295fde57a923328c464b03040b000102070806090a0b0c0391033ec6d6c1d59f6cd2009435770000000002130000008e90158097b587293efe9568f95c82c68f7f7e9cd49eb3cfc84a19815011aa8f76e21721d31cc62fa1f5062e2ca92273f5b41f467f6e5eadb1aef61f65ba12687a21d151a18f09ed7e39809c645aeca0b2c3b52e02a8d27fb0304c2ba06c028cbe63abfeaeb27e3bdb5994aa6cde6f42721864d588f9c967eff17c82b8a29fb4817bf7bc6d0468ee8ef31ba6d586b97ad685a2c78ab1ccdb26074afdf73d43ce6b9efca820da640a346e9dea91bfe9b80e52e76c3a6fe0d5b31142128472d5e57574919237cb92c1d8ef1ddea534af870a8e3f544b1d76d80d927e000197a210512932309f88030e73d11cf6f3910087f89f12ab098a17246afd96326743175295738e2b8cc94931686c75111d367bad2c567aa1542973352952768fac3c8556390c0ad3485d4ddb6a82c23c04f17c7ee37e4220e7d7dc7dd3f5d106ad1cecf330bbce937e6d585141fa216a4d622141fccfaa96ea0a14dad669862a229a9dc3c1018506cc5664e9c2706e355364fd58f7c7b8ac1e1db2a778858c8805000502ea410100050009033f420f000000000001e1499d1e398659d2004e4e57dda895edfb942f960aab01ce01dc81fd00251eeb011006000102030405',
        },
      },
    ],
  },
  {
    method: 'solSignOffchainMessage',
    description: 'Sign Offchain Message',
    presupposes: [
      {
        title: 'Sign Offchain Message',
        value: {
          path: "m/44'/501'/0'/0'",
          messageHex: '48656c6c6f',
        },
      },
    ],
  },
  {
    method: 'solSignMessage',
    description: 'Sign a Solana message.',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/501'/0'/0'",
          messageHex: '48656c6c6f',
        },
      },
    ],
  },
];

export default solData;
