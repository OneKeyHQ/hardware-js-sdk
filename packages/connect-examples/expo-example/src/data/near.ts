import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'nearGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/397'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/397'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/397'/1'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/397'/2'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'nearSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/397'/0'",
          rawTx:
            '400000003630323130393034396561313633656561326634386365616238303634363932373538323730323938333863666163303865633463363330303431353639613600602109049ea163eea2f48ceab806469275827029838cfac08ec4c630041569a644255eea2d4200004000000034376464643364346536393632343535386266313135643438313763336566303861386264393864313832666466666637373465353065643937626637626437d2a5c8e15cadc0476f5f07a02b2a3b9c1699847996b1bc55142b881a3ff1accd010000000301000000000000000000000000000000',
        },
      },
    ],
  },
];

export default api;
