// 此文件由 generate:multisig-fixtures 自动生成，请勿手工修改。
// 仅包含公开、离线且不可广播的测试数据。

export const GENERATED_MULTISIG_FIXTURES = {
  "version": 1,
  "eth": [
    {
      "id": "standard",
      "title": "Safe EIP-712 三签标准交易",
      "description": "由三个环境变量助记词生成的离线 Safe EIP-712 测试向量。",
      "parameters": {
        "path": "m/44'/60'/0'/0/0",
        "data": {
          "types": {
            "SafeTx": [
              {
                "name": "to",
                "type": "address"
              },
              {
                "name": "value",
                "type": "uint256"
              },
              {
                "name": "data",
                "type": "bytes"
              },
              {
                "name": "operation",
                "type": "uint8"
              },
              {
                "name": "safeTxGas",
                "type": "uint256"
              },
              {
                "name": "baseGas",
                "type": "uint256"
              },
              {
                "name": "gasPrice",
                "type": "uint256"
              },
              {
                "name": "gasToken",
                "type": "address"
              },
              {
                "name": "refundReceiver",
                "type": "address"
              },
              {
                "name": "nonce",
                "type": "uint256"
              }
            ],
            "EIP712Domain": [
              {
                "name": "chainId",
                "type": "uint256"
              },
              {
                "name": "verifyingContract",
                "type": "address"
              }
            ]
          },
          "domain": {
            "chainId": "0x1",
            "verifyingContract": "0x673f21761c5400531a37554a602fe0407addd0dd"
          },
          "primaryType": "SafeTx",
          "message": {
            "to": "0x5618207d27d78f09f61a5d92190d58c453feb4b7",
            "value": "10000000000000",
            "data": "0x",
            "operation": "0",
            "safeTxGas": "0",
            "baseGas": "0",
            "gasPrice": "0",
            "gasToken": "0x0000000000000000000000000000000000000000",
            "refundReceiver": "0x0000000000000000000000000000000000000000",
            "nonce": "0"
          }
        }
      },
      "expectedDeviceChecks": [
        "Safe 地址",
        "目标地址",
        "金额",
        "operation 与 nonce"
      ],
      "reference": {
        "broadcastable": false,
        "digest": "0x3967ec90437ee9540ac2bf7e47546986487b2d7c1b31ca81d2e085a59deb5165",
        "signerAddresses": [
          "0x5618207d27D78F09f61A5D92190d58c453feB4b7",
          "0x30be964E2b0ab050fB9358BED3d31bdF2C4f391E",
          "0x55F453190B934d38b622e1C6e3CE165017034177"
        ],
        "expectedSignatures": [
          "0x24217cc62f4935f0c906adf523180d0b4fc820a5e547fc9b311bb8f7e8f9613f2a6c608f39a878d35528429224091628fcc21cd0960ae529d7957e5d4d7caef91b",
          "0x70bf44396a5380549cbbdbfe20aed82be66fecbbbb9035c622abf82a89af158c593901c7fcfd1083f8f7e3a49b5ebf863261e62d4246d47c7e33288dee6698fd1c",
          "0x162a200c27fa26fac41901e9c4111109397b7aa2b4f594da8127eeb6318926493e91362e183a7d00d003e74d1ef7658e7763414610643172e72f45c754cc36f91c"
        ],
        "aggregatedSignatures2Of3": "0x70bf44396a5380549cbbdbfe20aed82be66fecbbbb9035c622abf82a89af158c593901c7fcfd1083f8f7e3a49b5ebf863261e62d4246d47c7e33288dee6698fd1c162a200c27fa26fac41901e9c4111109397b7aa2b4f594da8127eeb6318926493e91362e183a7d00d003e74d1ef7658e7763414610643172e72f45c754cc36f91c",
        "aggregatedSignatures3Of3": "0x70bf44396a5380549cbbdbfe20aed82be66fecbbbb9035c622abf82a89af158c593901c7fcfd1083f8f7e3a49b5ebf863261e62d4246d47c7e33288dee6698fd1c162a200c27fa26fac41901e9c4111109397b7aa2b4f594da8127eeb6318926493e91362e183a7d00d003e74d1ef7658e7763414610643172e72f45c754cc36f91c24217cc62f4935f0c906adf523180d0b4fc820a5e547fc9b311bb8f7e8f9613f2a6c608f39a878d35528429224091628fcc21cd0960ae529d7957e5d4d7caef91b"
      }
    },
    {
      "id": "delegate-call",
      "title": "Safe EIP-712 三签 DelegateCall 风险",
      "description": "由三个环境变量助记词生成的离线 DelegateCall 风险测试向量。",
      "parameters": {
        "path": "m/44'/60'/0'/0/0",
        "data": {
          "types": {
            "SafeTx": [
              {
                "name": "to",
                "type": "address"
              },
              {
                "name": "value",
                "type": "uint256"
              },
              {
                "name": "data",
                "type": "bytes"
              },
              {
                "name": "operation",
                "type": "uint8"
              },
              {
                "name": "safeTxGas",
                "type": "uint256"
              },
              {
                "name": "baseGas",
                "type": "uint256"
              },
              {
                "name": "gasPrice",
                "type": "uint256"
              },
              {
                "name": "gasToken",
                "type": "address"
              },
              {
                "name": "refundReceiver",
                "type": "address"
              },
              {
                "name": "nonce",
                "type": "uint256"
              }
            ],
            "EIP712Domain": [
              {
                "name": "chainId",
                "type": "uint256"
              },
              {
                "name": "verifyingContract",
                "type": "address"
              }
            ]
          },
          "domain": {
            "chainId": "0x1",
            "verifyingContract": "0x673f21761c5400531a37554a602fe0407addd0dd"
          },
          "primaryType": "SafeTx",
          "message": {
            "to": "0x5618207d27d78f09f61a5d92190d58c453feb4b7",
            "value": "10000000000000",
            "data": "0x",
            "operation": "1",
            "safeTxGas": "0",
            "baseGas": "0",
            "gasPrice": "0",
            "gasToken": "0x0000000000000000000000000000000000000000",
            "refundReceiver": "0x0000000000000000000000000000000000000000",
            "nonce": "0"
          }
        }
      },
      "expectedDeviceChecks": [
        "Safe 地址",
        "目标地址",
        "金额",
        "operation 与 nonce"
      ],
      "reference": {
        "broadcastable": false,
        "digest": "0x12911c58eea24da886c866acca164117f3751c85335ed5c90d0ce30d60a54a52",
        "signerAddresses": [
          "0x5618207d27D78F09f61A5D92190d58c453feB4b7",
          "0x30be964E2b0ab050fB9358BED3d31bdF2C4f391E",
          "0x55F453190B934d38b622e1C6e3CE165017034177"
        ],
        "expectedSignatures": [
          "0x5ec0bf0dd7e022b6570d1395f6a0ecfbe4b3fd77cf62c92536e17b312269196628466d8a385f89b180fd52a8092d65e7acaaf7957428f69e71161433be4f6fe81b",
          "0xb383c6d68d89f98df33167c4c847cf13588f5b29f40bdddcd4cac345aa00bb0b1953b77cc6145380b0ebed8d9537a23c40e44fcce10e306278f98ff07678ebbf1b",
          "0x8e345f9f441f8578ab552dfd4d32d9f0ee0afa08fe277818dfccd6522134d2a6582bfa98515c9c65f4e3ed1268da6c0bdd5d3655e3ed15a6054ff33978162aae1c"
        ],
        "aggregatedSignatures2Of3": "0xb383c6d68d89f98df33167c4c847cf13588f5b29f40bdddcd4cac345aa00bb0b1953b77cc6145380b0ebed8d9537a23c40e44fcce10e306278f98ff07678ebbf1b8e345f9f441f8578ab552dfd4d32d9f0ee0afa08fe277818dfccd6522134d2a6582bfa98515c9c65f4e3ed1268da6c0bdd5d3655e3ed15a6054ff33978162aae1c",
        "aggregatedSignatures3Of3": "0xb383c6d68d89f98df33167c4c847cf13588f5b29f40bdddcd4cac345aa00bb0b1953b77cc6145380b0ebed8d9537a23c40e44fcce10e306278f98ff07678ebbf1b8e345f9f441f8578ab552dfd4d32d9f0ee0afa08fe277818dfccd6522134d2a6582bfa98515c9c65f4e3ed1268da6c0bdd5d3655e3ed15a6054ff33978162aae1c5ec0bf0dd7e022b6570d1395f6a0ecfbe4b3fd77cf62c92536e17b312269196628466d8a385f89b180fd52a8092d65e7acaaf7957428f69e71161433be4f6fe81b"
      }
    }
  ],
  "btc": [
    {
      "id": "p2sh",
      "title": "P2SH",
      "path": "m/48'/0'/0'/0'/0/0",
      "scriptType": "SPENDMULTISIG",
      "address": "3PsKgyPTAp9uik25v1ntqGUtAb76jS5z7t",
      "addressParameters": {
        "path": "m/48'/0'/0'/0'/0/0",
        "coin": "btc",
        "showOnOneKey": true,
        "scriptType": "SPENDMULTISIG",
        "multisig": {
          "pubkeys": [
            {
              "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
              "address_n": [
                0,
                0
              ]
            }
          ],
          "signatures": [
            "",
            "",
            ""
          ],
          "m": 2
        }
      },
      "signParameters": {
        "coin": "btc",
        "inputs": [
          {
            "address_n": "m/48'/0'/0'/0'/0/0",
            "prev_hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDMULTISIG",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "",
                "",
                ""
              ],
              "m": 2
            }
          }
        ],
        "outputs": [
          {
            "address": "1BitcoinEaterAddressDontSendf59kuE",
            "amount": "190000",
            "script_type": "PAYTOADDRESS"
          }
        ],
        "refTxs": [
          {
            "hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
            "version": 2,
            "inputs": [
              {
                "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                "prev_index": 4294967295,
                "script_sig": "6f66666c696e652d6d756c74697369672d70327368",
                "sequence": 4294967295
              }
            ],
            "bin_outputs": [
              {
                "amount": 200000,
                "script_pubkey": "a914f345c1d72368680b03db19a107a0defb9560fb0d87"
              }
            ],
            "lock_time": 0
          }
        ]
      },
      "partialSignParameters": {
        "coin": "btc",
        "inputs": [
          {
            "address_n": "m/48'/0'/0'/0'/0/0",
            "prev_hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDMULTISIG",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "3045022100e4437b7cc66b5342d24c50e1d3f0b9213aa6a8eb5b7a495ff2a16d257c45524d022060b873c66eda37531cae41d797969c7224acbfde48c498c5f5a59d9b1cbca3c601",
                "",
                ""
              ],
              "m": 2
            }
          }
        ],
        "outputs": [
          {
            "address": "1BitcoinEaterAddressDontSendf59kuE",
            "amount": "190000",
            "script_type": "PAYTOADDRESS"
          }
        ],
        "refTxs": [
          {
            "hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
            "version": 2,
            "inputs": [
              {
                "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                "prev_index": 4294967295,
                "script_sig": "6f66666c696e652d6d756c74697369672d70327368",
                "sequence": 4294967295
              }
            ],
            "bin_outputs": [
              {
                "amount": 200000,
                "script_pubkey": "a914f345c1d72368680b03db19a107a0defb9560fb0d87"
              }
            ],
            "lock_time": 0
          }
        ]
      },
      "signerScenarios": [
        {
          "signerIndex": 0,
          "signerEnvKey": "MULTISIG_MNEMONIC_1",
          "signerAddress": "1ANeBQ73RZCH3yzFVEBXHF3ScKzdTukVGa",
          "expectedSignature": "3045022100e4437b7cc66b5342d24c50e1d3f0b9213aa6a8eb5b7a495ff2a16d257c45524d022060b873c66eda37531cae41d797969c7224acbfde48c498c5f5a59d9b1cbca3c601",
          "prefilledSignerIndex": 1,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/0'/0/0",
                "prev_hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d70327368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a914f345c1d72368680b03db19a107a0defb9560fb0d87"
                  }
                ],
                "lock_time": 0
              }
            ]
          },
          "continueSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/0'/0/0",
                "prev_hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "304402202627df914fe672edfecd0917e66c726aacb21ea0b3258c7ead1d32a801301b8202201b9578cca5e2efc0b515981319f8840daf407e6c34ccb96269694d88175249d901",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d70327368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a914f345c1d72368680b03db19a107a0defb9560fb0d87"
                  }
                ],
                "lock_time": 0
              }
            ]
          }
        },
        {
          "signerIndex": 1,
          "signerEnvKey": "MULTISIG_MNEMONIC_2",
          "signerAddress": "1DHWpRvGsZVXHvYSZ8HTSdEwPVwRHT8K5b",
          "expectedSignature": "304402202627df914fe672edfecd0917e66c726aacb21ea0b3258c7ead1d32a801301b8202201b9578cca5e2efc0b515981319f8840daf407e6c34ccb96269694d88175249d901",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/0'/0/0",
                "prev_hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d70327368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a914f345c1d72368680b03db19a107a0defb9560fb0d87"
                  }
                ],
                "lock_time": 0
              }
            ]
          },
          "continueSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/0'/0/0",
                "prev_hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "3045022100e4437b7cc66b5342d24c50e1d3f0b9213aa6a8eb5b7a495ff2a16d257c45524d022060b873c66eda37531cae41d797969c7224acbfde48c498c5f5a59d9b1cbca3c601",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d70327368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a914f345c1d72368680b03db19a107a0defb9560fb0d87"
                  }
                ],
                "lock_time": 0
              }
            ]
          }
        },
        {
          "signerIndex": 2,
          "signerEnvKey": "MULTISIG_MNEMONIC_3",
          "signerAddress": "1M7zKgW79oPRnLB9B9Wjx4Kf4vfeHyJ5bR",
          "expectedSignature": "3044022055f8a79a84e8df17b3ec4e459e2f9cd3f6e06bb7fde37f4e1a6b1292c14157c502207bfd3d6d12541f405f949a34a2e6e36915e5398d07107352fc1d20688ae35eb501",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/0'/0/0",
                "prev_hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d70327368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a914f345c1d72368680b03db19a107a0defb9560fb0d87"
                  }
                ],
                "lock_time": 0
              }
            ]
          },
          "continueSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/0'/0/0",
                "prev_hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "3045022100e4437b7cc66b5342d24c50e1d3f0b9213aa6a8eb5b7a495ff2a16d257c45524d022060b873c66eda37531cae41d797969c7224acbfde48c498c5f5a59d9b1cbca3c601",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d70327368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a914f345c1d72368680b03db19a107a0defb9560fb0d87"
                  }
                ],
                "lock_time": 0
              }
            ]
          }
        }
      ],
      "expectedDeviceChecks": [
        "Bitcoin 网络",
        "P2SH",
        "2 / 3 阈值",
        "发送 190000 sats",
        "手续费 10000 sats"
      ],
      "reference": {
        "broadcastable": false,
        "signerAddresses": [
          "1ANeBQ73RZCH3yzFVEBXHF3ScKzdTukVGa",
          "1DHWpRvGsZVXHvYSZ8HTSdEwPVwRHT8K5b",
          "1M7zKgW79oPRnLB9B9Wjx4Kf4vfeHyJ5bR"
        ],
        "expectedSignatures": [
          "3045022100e4437b7cc66b5342d24c50e1d3f0b9213aa6a8eb5b7a495ff2a16d257c45524d022060b873c66eda37531cae41d797969c7224acbfde48c498c5f5a59d9b1cbca3c601",
          "304402202627df914fe672edfecd0917e66c726aacb21ea0b3258c7ead1d32a801301b8202201b9578cca5e2efc0b515981319f8840daf407e6c34ccb96269694d88175249d901",
          "3044022055f8a79a84e8df17b3ec4e459e2f9cd3f6e06bb7fde37f4e1a6b1292c14157c502207bfd3d6d12541f405f949a34a2e6e36915e5398d07107352fc1d20688ae35eb501"
        ],
        "accountXpubs": [
          "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
          "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
          "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y"
        ],
        "childPublicKeys": [
          "03e9d4cb98d222846ccca9c515f83970de83a15cc3360e03d8fb8ff75c062cc772",
          "0351a93ab1e787fb9d9fd02f3bf9209b01326c5fd52d203652cf95d5fddf856330",
          "03bc38a82130537fe661ad74af59116b5b7523d177e9a2dab1226550985ca68fe2"
        ],
        "sighash": "80106fe8a785c1479d1eca3c6eb58d8876f2db0ecf5ad879ccc518153cfbcff7",
        "scriptPubKey": "a914f345c1d72368680b03db19a107a0defb9560fb0d87",
        "redeemScript": "522103e9d4cb98d222846ccca9c515f83970de83a15cc3360e03d8fb8ff75c062cc772210351a93ab1e787fb9d9fd02f3bf9209b01326c5fd52d203652cf95d5fddf8563302103bc38a82130537fe661ad74af59116b5b7523d177e9a2dab1226550985ca68fe253ae",
        "fundingTxHex": "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff156f66666c696e652d6d756c74697369672d70327368ffffffff01400d03000000000017a914f345c1d72368680b03db19a107a0defb9560fb0d8700000000",
        "spendingTxHex": "0200000001802271cbe219928240fc15ff6df7e2fd170e5519e2b107d58d6acca18248ebbd0000000000fdffffff0130e60200000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac00000000",
        "prevHash": "bdeb4882a1cc6a8dd507b1e219550e17fde2f76dff15fc40829219e2cb712280",
        "doubleSignatures": [
          "3045022100e4437b7cc66b5342d24c50e1d3f0b9213aa6a8eb5b7a495ff2a16d257c45524d022060b873c66eda37531cae41d797969c7224acbfde48c498c5f5a59d9b1cbca3c601",
          "304402202627df914fe672edfecd0917e66c726aacb21ea0b3258c7ead1d32a801301b8202201b9578cca5e2efc0b515981319f8840daf407e6c34ccb96269694d88175249d901",
          ""
        ]
      }
    },
    {
      "id": "p2sh-p2wsh",
      "title": "P2SH-P2WSH",
      "path": "m/48'/0'/0'/1'/0/0",
      "scriptType": "SPENDP2SHWITNESS",
      "address": "36fumWiYVDbQhDzrmDZgZwb6pssKfNpXti",
      "addressParameters": {
        "path": "m/48'/0'/0'/1'/0/0",
        "coin": "btc",
        "showOnOneKey": true,
        "scriptType": "SPENDP2SHWITNESS",
        "multisig": {
          "pubkeys": [
            {
              "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
              "address_n": [
                0,
                0
              ]
            }
          ],
          "signatures": [
            "",
            "",
            ""
          ],
          "m": 2
        }
      },
      "signParameters": {
        "coin": "btc",
        "inputs": [
          {
            "address_n": "m/48'/0'/0'/1'/0/0",
            "prev_hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDP2SHWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "",
                "",
                ""
              ],
              "m": 2
            }
          }
        ],
        "outputs": [
          {
            "address": "1BitcoinEaterAddressDontSendf59kuE",
            "amount": "190000",
            "script_type": "PAYTOADDRESS"
          }
        ],
        "refTxs": [
          {
            "hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
            "version": 2,
            "inputs": [
              {
                "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                "prev_index": 4294967295,
                "script_sig": "6f66666c696e652d6d756c74697369672d703273682d7032777368",
                "sequence": 4294967295
              }
            ],
            "bin_outputs": [
              {
                "amount": 200000,
                "script_pubkey": "a91436a3130e592829dfe0aa45c9f4c924b0d875d01a87"
              }
            ],
            "lock_time": 0
          }
        ]
      },
      "partialSignParameters": {
        "coin": "btc",
        "inputs": [
          {
            "address_n": "m/48'/0'/0'/1'/0/0",
            "prev_hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDP2SHWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "304402207103ac87e9129e9d01884367191728f3cfb7c908baad30b44c0d6b21baa80b220220697df386e1b8b1b37cf9428c391296aa3c26409a5a858d563498e724f700181101",
                "",
                ""
              ],
              "m": 2
            }
          }
        ],
        "outputs": [
          {
            "address": "1BitcoinEaterAddressDontSendf59kuE",
            "amount": "190000",
            "script_type": "PAYTOADDRESS"
          }
        ],
        "refTxs": [
          {
            "hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
            "version": 2,
            "inputs": [
              {
                "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                "prev_index": 4294967295,
                "script_sig": "6f66666c696e652d6d756c74697369672d703273682d7032777368",
                "sequence": 4294967295
              }
            ],
            "bin_outputs": [
              {
                "amount": 200000,
                "script_pubkey": "a91436a3130e592829dfe0aa45c9f4c924b0d875d01a87"
              }
            ],
            "lock_time": 0
          }
        ]
      },
      "signerScenarios": [
        {
          "signerIndex": 0,
          "signerEnvKey": "MULTISIG_MNEMONIC_1",
          "signerAddress": "13qfQe71Qu5vknpor2KUvU4GQiM5yqdUqF",
          "expectedSignature": "304402207103ac87e9129e9d01884367191728f3cfb7c908baad30b44c0d6b21baa80b220220697df386e1b8b1b37cf9428c391296aa3c26409a5a858d563498e724f700181101",
          "prefilledSignerIndex": 1,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/1'/0/0",
                "prev_hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d703273682d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a91436a3130e592829dfe0aa45c9f4c924b0d875d01a87"
                  }
                ],
                "lock_time": 0
              }
            ]
          },
          "continueSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/1'/0/0",
                "prev_hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "30440220727947fc48d5b77066c7435c094ba961cbc8687b53554840474f43dfecd43fff02200e5297485c8588e8431f363d76b254a6fc2b3c58bb0433a4740f9d63d0decc0c01",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d703273682d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a91436a3130e592829dfe0aa45c9f4c924b0d875d01a87"
                  }
                ],
                "lock_time": 0
              }
            ]
          }
        },
        {
          "signerIndex": 1,
          "signerEnvKey": "MULTISIG_MNEMONIC_2",
          "signerAddress": "1NvkdBRcTgAzAdw6nF8M1B1Yy2okftwPUH",
          "expectedSignature": "30440220727947fc48d5b77066c7435c094ba961cbc8687b53554840474f43dfecd43fff02200e5297485c8588e8431f363d76b254a6fc2b3c58bb0433a4740f9d63d0decc0c01",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/1'/0/0",
                "prev_hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d703273682d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a91436a3130e592829dfe0aa45c9f4c924b0d875d01a87"
                  }
                ],
                "lock_time": 0
              }
            ]
          },
          "continueSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/1'/0/0",
                "prev_hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "304402207103ac87e9129e9d01884367191728f3cfb7c908baad30b44c0d6b21baa80b220220697df386e1b8b1b37cf9428c391296aa3c26409a5a858d563498e724f700181101",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d703273682d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a91436a3130e592829dfe0aa45c9f4c924b0d875d01a87"
                  }
                ],
                "lock_time": 0
              }
            ]
          }
        },
        {
          "signerIndex": 2,
          "signerEnvKey": "MULTISIG_MNEMONIC_3",
          "signerAddress": "14jgk24j8hjtDq61EaMRjrLpseQy687iR8",
          "expectedSignature": "304402205830b183abbcb9b04443a4bd2da5c7363f818e6f0f9a144c821b208490a7151502200ae891cec4b72505bd52f2febab4427bbe159a3f8e504224277a28577b0dafb901",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/1'/0/0",
                "prev_hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d703273682d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a91436a3130e592829dfe0aa45c9f4c924b0d875d01a87"
                  }
                ],
                "lock_time": 0
              }
            ]
          },
          "continueSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/1'/0/0",
                "prev_hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "304402207103ac87e9129e9d01884367191728f3cfb7c908baad30b44c0d6b21baa80b220220697df386e1b8b1b37cf9428c391296aa3c26409a5a858d563498e724f700181101",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d703273682d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "a91436a3130e592829dfe0aa45c9f4c924b0d875d01a87"
                  }
                ],
                "lock_time": 0
              }
            ]
          }
        }
      ],
      "expectedDeviceChecks": [
        "Bitcoin 网络",
        "P2SH-P2WSH",
        "2 / 3 阈值",
        "发送 190000 sats",
        "手续费 10000 sats"
      ],
      "reference": {
        "broadcastable": false,
        "signerAddresses": [
          "13qfQe71Qu5vknpor2KUvU4GQiM5yqdUqF",
          "1NvkdBRcTgAzAdw6nF8M1B1Yy2okftwPUH",
          "14jgk24j8hjtDq61EaMRjrLpseQy687iR8"
        ],
        "expectedSignatures": [
          "304402207103ac87e9129e9d01884367191728f3cfb7c908baad30b44c0d6b21baa80b220220697df386e1b8b1b37cf9428c391296aa3c26409a5a858d563498e724f700181101",
          "30440220727947fc48d5b77066c7435c094ba961cbc8687b53554840474f43dfecd43fff02200e5297485c8588e8431f363d76b254a6fc2b3c58bb0433a4740f9d63d0decc0c01",
          "304402205830b183abbcb9b04443a4bd2da5c7363f818e6f0f9a144c821b208490a7151502200ae891cec4b72505bd52f2febab4427bbe159a3f8e504224277a28577b0dafb901"
        ],
        "accountXpubs": [
          "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
          "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
          "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt"
        ],
        "childPublicKeys": [
          "024acfbd4a607484ec3094d784fb55850213848e8be10985ad8763b4ed6e0971a5",
          "035e66718a1898a5e81ddfca6a230925aa3ee74f08c173cf0fc2c7166cb0d0e573",
          "038ee6cf0286908ea5d3713ac7172070fc8b9c7fa9099018db0ddc521c5de0d835"
        ],
        "sighash": "b02092d59b63b1feeb39ac00dd6991e21e611386bf3df9aebd94b5e08304ab84",
        "scriptPubKey": "a91436a3130e592829dfe0aa45c9f4c924b0d875d01a87",
        "redeemScript": "002015a924fee7ddc4c7be559e70881036c7c1214a449519f72e2a3d4a34817aed67",
        "witnessScript": "5221024acfbd4a607484ec3094d784fb55850213848e8be10985ad8763b4ed6e0971a521035e66718a1898a5e81ddfca6a230925aa3ee74f08c173cf0fc2c7166cb0d0e57321038ee6cf0286908ea5d3713ac7172070fc8b9c7fa9099018db0ddc521c5de0d83553ae",
        "fundingTxHex": "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1b6f66666c696e652d6d756c74697369672d703273682d7032777368ffffffff01400d03000000000017a91436a3130e592829dfe0aa45c9f4c924b0d875d01a8700000000",
        "spendingTxHex": "0200000001da71406d286c3175edfae8cd362b8f58b3f0a52ab554cbc0d5bf0ddce642b3250000000000fdffffff0130e60200000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac00000000",
        "prevHash": "25b342e6dc0dbfd5c0cb54b52aa5f0b3588f2b36cde8faed75316c286d4071da",
        "doubleSignatures": [
          "304402207103ac87e9129e9d01884367191728f3cfb7c908baad30b44c0d6b21baa80b220220697df386e1b8b1b37cf9428c391296aa3c26409a5a858d563498e724f700181101",
          "30440220727947fc48d5b77066c7435c094ba961cbc8687b53554840474f43dfecd43fff02200e5297485c8588e8431f363d76b254a6fc2b3c58bb0433a4740f9d63d0decc0c01",
          ""
        ]
      }
    },
    {
      "id": "p2wsh",
      "title": "P2WSH",
      "path": "m/48'/0'/0'/2'/0/0",
      "scriptType": "SPENDWITNESS",
      "address": "bc1qk5uucs2elngju9tyku4qd7x3msg3g8r9hfs4cq9e2yyayeqsv64suskh6u",
      "addressParameters": {
        "path": "m/48'/0'/0'/2'/0/0",
        "coin": "btc",
        "showOnOneKey": true,
        "scriptType": "SPENDWITNESS",
        "multisig": {
          "pubkeys": [
            {
              "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
              "address_n": [
                0,
                0
              ]
            }
          ],
          "signatures": [
            "",
            "",
            ""
          ],
          "m": 2
        }
      },
      "signParameters": {
        "coin": "btc",
        "inputs": [
          {
            "address_n": "m/48'/0'/0'/2'/0/0",
            "prev_hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "",
                "",
                ""
              ],
              "m": 2
            }
          }
        ],
        "outputs": [
          {
            "address": "1BitcoinEaterAddressDontSendf59kuE",
            "amount": "190000",
            "script_type": "PAYTOADDRESS"
          }
        ],
        "refTxs": [
          {
            "hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
            "version": 2,
            "inputs": [
              {
                "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                "prev_index": 4294967295,
                "script_sig": "6f66666c696e652d6d756c74697369672d7032777368",
                "sequence": 4294967295
              }
            ],
            "bin_outputs": [
              {
                "amount": 200000,
                "script_pubkey": "0020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab"
              }
            ],
            "lock_time": 0
          }
        ]
      },
      "partialSignParameters": {
        "coin": "btc",
        "inputs": [
          {
            "address_n": "m/48'/0'/0'/2'/0/0",
            "prev_hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "3045022100ba32087c1a650360b87bbfcac1189bcadb055f1848a99039f192b309d8768cd10220197c17652286b649297311a5b536bf4e345a0fcfe92f7ba1db1c33d9495a245601",
                "",
                ""
              ],
              "m": 2
            }
          }
        ],
        "outputs": [
          {
            "address": "1BitcoinEaterAddressDontSendf59kuE",
            "amount": "190000",
            "script_type": "PAYTOADDRESS"
          }
        ],
        "refTxs": [
          {
            "hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
            "version": 2,
            "inputs": [
              {
                "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                "prev_index": 4294967295,
                "script_sig": "6f66666c696e652d6d756c74697369672d7032777368",
                "sequence": 4294967295
              }
            ],
            "bin_outputs": [
              {
                "amount": 200000,
                "script_pubkey": "0020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab"
              }
            ],
            "lock_time": 0
          }
        ]
      },
      "signerScenarios": [
        {
          "signerIndex": 0,
          "signerEnvKey": "MULTISIG_MNEMONIC_1",
          "signerAddress": "1AAddbBESPN4dRXJRj2DANq1yanaW15aMG",
          "expectedSignature": "3045022100ba32087c1a650360b87bbfcac1189bcadb055f1848a99039f192b309d8768cd10220197c17652286b649297311a5b536bf4e345a0fcfe92f7ba1db1c33d9495a245601",
          "prefilledSignerIndex": 1,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/2'/0/0",
                "prev_hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "0020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab"
                  }
                ],
                "lock_time": 0
              }
            ]
          },
          "continueSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/2'/0/0",
                "prev_hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "304402201638a414bf8b864f7970de7e2806e88c31186c97ffed5e67bc4f52c1a684e88d022074de8423205fe09a68fc973d0847b994839e22055c6d137a38afa3c6fff1692301",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "0020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab"
                  }
                ],
                "lock_time": 0
              }
            ]
          }
        },
        {
          "signerIndex": 1,
          "signerEnvKey": "MULTISIG_MNEMONIC_2",
          "signerAddress": "1Bvx5N5Fyayf2iFJ21HwpAsqSJi8exRpyt",
          "expectedSignature": "304402201638a414bf8b864f7970de7e2806e88c31186c97ffed5e67bc4f52c1a684e88d022074de8423205fe09a68fc973d0847b994839e22055c6d137a38afa3c6fff1692301",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/2'/0/0",
                "prev_hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "0020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab"
                  }
                ],
                "lock_time": 0
              }
            ]
          },
          "continueSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/2'/0/0",
                "prev_hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "3045022100ba32087c1a650360b87bbfcac1189bcadb055f1848a99039f192b309d8768cd10220197c17652286b649297311a5b536bf4e345a0fcfe92f7ba1db1c33d9495a245601",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "0020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab"
                  }
                ],
                "lock_time": 0
              }
            ]
          }
        },
        {
          "signerIndex": 2,
          "signerEnvKey": "MULTISIG_MNEMONIC_3",
          "signerAddress": "1PgbkE8cFZghFrZ2E5e7QtoqQmsq9Cxqv6",
          "expectedSignature": "3045022100dcecfb09ec4336b404f505a1699d1ce1999231ab6f1fc302978ac38799dae07f02206716c637c1534c5820ab8e0602056943b7f9016e3567d911a7575bb818682b2b01",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/2'/0/0",
                "prev_hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "0020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab"
                  }
                ],
                "lock_time": 0
              }
            ]
          },
          "continueSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/2'/0/0",
                "prev_hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
                      "address_n": [
                        0,
                        0
                      ]
                    },
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "3045022100ba32087c1a650360b87bbfcac1189bcadb055f1848a99039f192b309d8768cd10220197c17652286b649297311a5b536bf4e345a0fcfe92f7ba1db1c33d9495a245601",
                    "",
                    ""
                  ],
                  "m": 2
                }
              }
            ],
            "outputs": [
              {
                "address": "1BitcoinEaterAddressDontSendf59kuE",
                "amount": "190000",
                "script_type": "PAYTOADDRESS"
              }
            ],
            "refTxs": [
              {
                "hash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
                "version": 2,
                "inputs": [
                  {
                    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "prev_index": 4294967295,
                    "script_sig": "6f66666c696e652d6d756c74697369672d7032777368",
                    "sequence": 4294967295
                  }
                ],
                "bin_outputs": [
                  {
                    "amount": 200000,
                    "script_pubkey": "0020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab"
                  }
                ],
                "lock_time": 0
              }
            ]
          }
        }
      ],
      "expectedDeviceChecks": [
        "Bitcoin 网络",
        "P2WSH",
        "2 / 3 阈值",
        "发送 190000 sats",
        "手续费 10000 sats"
      ],
      "reference": {
        "broadcastable": false,
        "signerAddresses": [
          "1AAddbBESPN4dRXJRj2DANq1yanaW15aMG",
          "1Bvx5N5Fyayf2iFJ21HwpAsqSJi8exRpyt",
          "1PgbkE8cFZghFrZ2E5e7QtoqQmsq9Cxqv6"
        ],
        "expectedSignatures": [
          "3045022100ba32087c1a650360b87bbfcac1189bcadb055f1848a99039f192b309d8768cd10220197c17652286b649297311a5b536bf4e345a0fcfe92f7ba1db1c33d9495a245601",
          "304402201638a414bf8b864f7970de7e2806e88c31186c97ffed5e67bc4f52c1a684e88d022074de8423205fe09a68fc973d0847b994839e22055c6d137a38afa3c6fff1692301",
          "3045022100dcecfb09ec4336b404f505a1699d1ce1999231ab6f1fc302978ac38799dae07f02206716c637c1534c5820ab8e0602056943b7f9016e3567d911a7575bb818682b2b01"
        ],
        "accountXpubs": [
          "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
          "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
          "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2"
        ],
        "childPublicKeys": [
          "03b55face2b4ac27f309805c4981bbce4cc029d63cac4477e117f9ef1bddb3e8d1",
          "03242265037fee8f18cca525c319b0e001ca08010d7b2a7f7e9da5ff35bcf9b3b1",
          "02fcc70d03ca38f1bd4199a52c23e5c60dbfe74c4ed45f73be34d3f56b5a213452"
        ],
        "sighash": "ad486c5f53375026613fa8c295b8f6fc41c59eaf5c100e02916c5ac33a738039",
        "scriptPubKey": "0020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab",
        "redeemScript": "522103b55face2b4ac27f309805c4981bbce4cc029d63cac4477e117f9ef1bddb3e8d12103242265037fee8f18cca525c319b0e001ca08010d7b2a7f7e9da5ff35bcf9b3b12102fcc70d03ca38f1bd4199a52c23e5c60dbfe74c4ed45f73be34d3f56b5a21345253ae",
        "witnessScript": "522103b55face2b4ac27f309805c4981bbce4cc029d63cac4477e117f9ef1bddb3e8d12103242265037fee8f18cca525c319b0e001ca08010d7b2a7f7e9da5ff35bcf9b3b12102fcc70d03ca38f1bd4199a52c23e5c60dbfe74c4ed45f73be34d3f56b5a21345253ae",
        "fundingTxHex": "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff166f66666c696e652d6d756c74697369672d7032777368ffffffff01400d030000000000220020b539cc4159fcd12e1564b72a06f8d1dc11141c65ba615c00b95109d2641066ab00000000",
        "spendingTxHex": "020000000119cf863d4ab13ceddd401d59ef8c838c9223153494b5a656deb3a4a428a497180000000000fdffffff0130e60200000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac00000000",
        "prevHash": "1897a428a4a4b3de56a6b594341523928c838cef591d40dded3cb14a3d86cf19",
        "doubleSignatures": [
          "3045022100ba32087c1a650360b87bbfcac1189bcadb055f1848a99039f192b309d8768cd10220197c17652286b649297311a5b536bf4e345a0fcfe92f7ba1db1c33d9495a245601",
          "304402201638a414bf8b864f7970de7e2806e88c31186c97ffed5e67bc4f52c1a684e88d022074de8423205fe09a68fc973d0847b994839e22055c6d137a38afa3c6fff1692301",
          ""
        ]
      }
    }
  ]
} as const;
