import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "alephium",
  name: "Alephium",
  description: "Alephium blockchain operations",
  icon: ``,
  color: "#FF6B35",
  category: "alephium" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: 'alephiumGetAddress',
    description: 'Get address',
    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/1234'/0'/0/0",
          includePublicKey: true,
          showOnOneKey: false,
          group: 0,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            {
              path: "m/44'/1234'/0'/0/0",
              includePublicKey: true,
              showOnOneKey: false,
              group: 0,
            },
            {
              path: "m/44'/1234'/0'/0/1",
              includePublicKey: true,
              showOnOneKey: false,
              group: 0,
            },
            {
              path: "m/44'/1234'/0'/0/2",
              showOnOneKey: false,
              group: 0,
            },
          ],
        },
      },
    ],
  },
  {
    method: 'alephiumSignMessage',
    description: 'Sign Message',
    presupposes: [
      {
        title: 'Sign Alephium',
        value: {
          path: "m/44'/1234'/0'/0/0",
          messageHex: '68656c6c6f',
          messageType: 'alephium',
        },
      },
      {
        title: 'Sign Sha256 (不支持)',
        value: {
          path: "m/44'/1234'/0'/0/0",
          messageHex: '68656c6c6f',
          messageType: 'sha256',
        },
      },
      {
        title: 'Sign Blake2b (不支持)',
        value: {
          path: "m/44'/1234'/0'/0/0",
          messageHex: '68656c6c6f',
          messageType: 'blake2b',
        },
      },
      {
        title: 'Sign Identity (不支持)',
        value: {
          path: "m/44'/1234'/0'/0/0",
          messageHex: '68656c6c6f',
          messageType: 'identity',
        },
      },
    ],
  },
  {
    method: 'alephiumSignTransaction',
    description: 'Sign Transaction',
    presupposes: [
      {
        title: 'Native Transfer',
        value: {
          path: "m/44'/1234'/0'/0/0",
          rawTx:
            '00010080004e20c1174876e80001f3bf9d774d87e65e79a72d5482da5ef35aac8d0b930b394bdd67586930f6ae7b4fd8362b0003f6bd3137b3cadbad59a73527c3b8e26429bba093722a59639f22af9d2adb477302c40de0b6b3a7640000001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac00000000000000000000c43c7a13049ed60800001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac00000000000000000000',
        },
      },
      {
        title: 'Token Transfer',
        value: {
          path: "m/44'/1234'/0'/0/0",
          rawTx:
            '00010080005050c1174876e80002f3bf9d770518c6e0c809c7076a7ec87cb8a03b962e4b9c9fb53635fd6b0d4e46dad0d0af0003f6bd3137b3cadbad59a73527c3b8e26429bba093722a59639f22af9d2adb4773f3bf9d775e7419367d75b0e6e7a53975d58cf7d442f3b97e9f8014c6e2f6a0290e5f752f0303c3038d7ea4c68000001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac000000000000000001638b022292ea665dc9c946eec02ef9602926dc0e6db17143baebce898e34a3020a00c3038d7ea4c68000001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac000000000000000001638b022292ea665dc9c946eec02ef9602926dc0e6db17143baebce898e34a302d30a70c3c40a64e6c51999090b65f67d923ffffffffffff600c44767f3ed57ce0800001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac00000000000000000000',
        },
      },
      {
        title: 'Depoly Contract',
        value: {
          path: "m/44'/1234'/0'/0/0",
          rawTx:
            '0001010101030000000815001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac13c4016345785d8a0000a2141a000117010100000004d362d46012b413c40de0b6b3a7640000a9140100140100ad188000dee0c1174876e80001f3bf9d77ee919ac6f5c58fe78f26e17fcb90f4d0219e780d4c4c367875f1c801f925772c0003f6bd3137b3cadbad59a73527c3b8e26429bba093722a59639f22af9d2adb477301c44772cf57ca3d0800001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac00000000000000000000',
          scriptOpt:
            '0101030000000815001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac13c4016345785d8a0000a2141a000117010100000004d362d46012b413c40de0b6b3a7640000a9140100140100ad18',
        },
      },
      {
        title: 'Depoly Contract',
        value: {
          path: "m/44'/1234'/0'/0/0",
          rawTx:
            '00010101010300000007b413c40de0b6b3a7640000a20c0c1440206c3b1f6262ffad9a4cb1e78f03f17f3593837505a69edbc18a59cf23c1f1c402010080007e5dc1174876e80001f3bf9d77ee919ac6f5c58fe78f26e17fcb90f4d0219e780d4c4c367875f1c801f925772c0003f6bd3137b3cadbad59a73527c3b8e26429bba093722a59639f22af9d2adb477301c448dedbe6d39fc000001e98167f559360e002c3f3ceb3cc95c1dad848403f0296c76439093d2b9879ac00000000000000000000',
          scriptOpt:
            '01010300000007b413c40de0b6b3a7640000a20c0c1440206c3b1f6262ffad9a4cb1e78f03f17f3593837505a69edbc18a59cf23c1f1c4020100',
        },
      },
    ],
  },
];


// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
