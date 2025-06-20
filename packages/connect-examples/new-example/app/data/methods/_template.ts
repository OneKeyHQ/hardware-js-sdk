import type { UnifiedMethodConfig } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'algoGetAddress',
    description: 'Get address',
    presets: [
      {
        title: 'Get address',
        parameters: [

          {

            name: 'path',

            type: 'string',

            required: true,

            label: 'Path',

            value: 'm/44'/283'/0'/0'/0'',

          },

          {

            name: 'showOnOneKey',

            type: 'boolean',

            label: 'Show On One Key',

            value: false,

          },

        ],,
      },
      {
        title: 'Batch Get Address',
        parameters: [],,
            {
              path: "m/44'/283'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/283'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
];

export default api;
