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
          "0x55F453190B934d38b622e1C6e3CE165017034177",
          "0x30be964E2b0ab050fB9358BED3d31bdF2C4f391E",
          "0x5618207d27D78F09f61A5D92190d58c453feB4b7"
        ],
        "expectedSignatures": [
          "0x162a200c27fa26fac41901e9c4111109397b7aa2b4f594da8127eeb6318926493e91362e183a7d00d003e74d1ef7658e7763414610643172e72f45c754cc36f91c",
          "0x70bf44396a5380549cbbdbfe20aed82be66fecbbbb9035c622abf82a89af158c593901c7fcfd1083f8f7e3a49b5ebf863261e62d4246d47c7e33288dee6698fd1c",
          "0x24217cc62f4935f0c906adf523180d0b4fc820a5e547fc9b311bb8f7e8f9613f2a6c608f39a878d35528429224091628fcc21cd0960ae529d7957e5d4d7caef91b"
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
          "0x55F453190B934d38b622e1C6e3CE165017034177",
          "0x30be964E2b0ab050fB9358BED3d31bdF2C4f391E",
          "0x5618207d27D78F09f61A5D92190d58c453feB4b7"
        ],
        "expectedSignatures": [
          "0x8e345f9f441f8578ab552dfd4d32d9f0ee0afa08fe277818dfccd6522134d2a6582bfa98515c9c65f4e3ed1268da6c0bdd5d3655e3ed15a6054ff33978162aae1c",
          "0xb383c6d68d89f98df33167c4c847cf13588f5b29f40bdddcd4cac345aa00bb0b1953b77cc6145380b0ebed8d9537a23c40e44fcce10e306278f98ff07678ebbf1b",
          "0x5ec0bf0dd7e022b6570d1395f6a0ecfbe4b3fd77cf62c92536e17b312269196628466d8a385f89b180fd52a8092d65e7acaaf7957428f69e71161433be4f6fe81b"
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
      "address": "34UmbgoBQQgqLaXLKsVFrgWHtMYAiZiqUr",
      "addressParameters": {
        "path": "m/48'/0'/0'/0'/0/0",
        "coin": "btc",
        "showOnOneKey": true,
        "scriptType": "SPENDMULTISIG",
        "multisig": {
          "pubkeys": [
            {
              "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
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
              "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
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
            "prev_hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDMULTISIG",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
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
                  "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
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
            "hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
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
                "script_pubkey": "a9141e976d84944d17349160d95a9057340b310d89e287"
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
            "prev_hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDMULTISIG",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
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
                  "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "3045022100e1f96d34327278e043a5abbfed63d69855690cfbbdd386dfe20149ca90d64f7f02202a024ab3a7bc6d57f6b447e75f8552730c8ab2e0f71c7d64b02f632ac2d5fcb401",
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
            "hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
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
                "script_pubkey": "a9141e976d84944d17349160d95a9057340b310d89e287"
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
          "signerAddress": "1M7zKgW79oPRnLB9B9Wjx4Kf4vfeHyJ5bR",
          "expectedSignature": "3045022100e1f96d34327278e043a5abbfed63d69855690cfbbdd386dfe20149ca90d64f7f02202a024ab3a7bc6d57f6b447e75f8552730c8ab2e0f71c7d64b02f632ac2d5fcb401",
          "prefilledSignerIndex": 1,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/0'/0/0",
                "prev_hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
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
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
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
                "hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
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
                    "script_pubkey": "a9141e976d84944d17349160d95a9057340b310d89e287"
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
                "prev_hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
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
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "3045022100f805eefd639ab71690816ba6db109375452a43dba88b5793fa04581cf8d97de50220487a01105eb2338209aad951ea228f4c873a5551c0009d5c4c57a77c698e985501",
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
                "hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
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
                    "script_pubkey": "a9141e976d84944d17349160d95a9057340b310d89e287"
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
          "expectedSignature": "3045022100f805eefd639ab71690816ba6db109375452a43dba88b5793fa04581cf8d97de50220487a01105eb2338209aad951ea228f4c873a5551c0009d5c4c57a77c698e985501",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/0'/0/0",
                "prev_hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
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
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
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
                "hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
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
                    "script_pubkey": "a9141e976d84944d17349160d95a9057340b310d89e287"
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
                "prev_hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
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
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "3045022100e1f96d34327278e043a5abbfed63d69855690cfbbdd386dfe20149ca90d64f7f02202a024ab3a7bc6d57f6b447e75f8552730c8ab2e0f71c7d64b02f632ac2d5fcb401",
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
                "hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
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
                    "script_pubkey": "a9141e976d84944d17349160d95a9057340b310d89e287"
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
          "signerAddress": "1ANeBQ73RZCH3yzFVEBXHF3ScKzdTukVGa",
          "expectedSignature": "304402202bf2250c64314d8c8fb900494d03fad716f6ec9ef923f6228aa8d624c61e991102201d19988248c8b2c00bdf05e1b92c545fbd480c3f50fe6817b3fe7ff1d1b1f73e01",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/0'/0/0",
                "prev_hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
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
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
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
                "hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
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
                    "script_pubkey": "a9141e976d84944d17349160d95a9057340b310d89e287"
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
                "prev_hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDMULTISIG",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
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
                      "node": "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "3045022100e1f96d34327278e043a5abbfed63d69855690cfbbdd386dfe20149ca90d64f7f02202a024ab3a7bc6d57f6b447e75f8552730c8ab2e0f71c7d64b02f632ac2d5fcb401",
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
                "hash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
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
                    "script_pubkey": "a9141e976d84944d17349160d95a9057340b310d89e287"
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
          "1M7zKgW79oPRnLB9B9Wjx4Kf4vfeHyJ5bR",
          "1DHWpRvGsZVXHvYSZ8HTSdEwPVwRHT8K5b",
          "1ANeBQ73RZCH3yzFVEBXHF3ScKzdTukVGa"
        ],
        "expectedSignatures": [
          "3045022100e1f96d34327278e043a5abbfed63d69855690cfbbdd386dfe20149ca90d64f7f02202a024ab3a7bc6d57f6b447e75f8552730c8ab2e0f71c7d64b02f632ac2d5fcb401",
          "3045022100f805eefd639ab71690816ba6db109375452a43dba88b5793fa04581cf8d97de50220487a01105eb2338209aad951ea228f4c873a5551c0009d5c4c57a77c698e985501",
          "304402202bf2250c64314d8c8fb900494d03fad716f6ec9ef923f6228aa8d624c61e991102201d19988248c8b2c00bdf05e1b92c545fbd480c3f50fe6817b3fe7ff1d1b1f73e01"
        ],
        "accountXpubs": [
          "xpub6F9Qm2hmXhoSwh9CGn5eNKtaP4TjaSddXQTi4nao2cumxRTcbaHtwK3FewV4DZZuCAp3nZRLiurihDgBcLAX3HMePmi7yhKgx91NftyEv6Y",
          "xpub6DhD3vKCogoPyy7NhHnvDeMUafsWpVokXVo9PGAGbuN1SMpMuWz8hvx5p9VGbJ3Q7PCAw5DTiwbVdFiaLfSvxxvHKgVDm24nDQKBcNyz7nv",
          "xpub6DpFgSNFWXCnjD9yDh1YoSFbWmDEmA29Gp1GauaNEbQUc5rvPAECvxqxRHb3239g9D9DNmk3y8vVe7K93RfS4tZAyCQTEjyRC1aHcNyDWNk"
        ],
        "childPublicKeys": [
          "03bc38a82130537fe661ad74af59116b5b7523d177e9a2dab1226550985ca68fe2",
          "0351a93ab1e787fb9d9fd02f3bf9209b01326c5fd52d203652cf95d5fddf856330",
          "03e9d4cb98d222846ccca9c515f83970de83a15cc3360e03d8fb8ff75c062cc772"
        ],
        "sighash": "f445ba8156a23c0d5e51363d3df3c0e93635f10788bb9de0a19257d92943dbbd",
        "scriptPubKey": "a9141e976d84944d17349160d95a9057340b310d89e287",
        "redeemScript": "522103bc38a82130537fe661ad74af59116b5b7523d177e9a2dab1226550985ca68fe2210351a93ab1e787fb9d9fd02f3bf9209b01326c5fd52d203652cf95d5fddf8563302103e9d4cb98d222846ccca9c515f83970de83a15cc3360e03d8fb8ff75c062cc77253ae",
        "fundingTxHex": "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff156f66666c696e652d6d756c74697369672d70327368ffffffff01400d03000000000017a9141e976d84944d17349160d95a9057340b310d89e28700000000",
        "spendingTxHex": "02000000013f08e26b33337398f022bc24b85eec58119e561fde9d78a942da9ebca748991b0000000000fdffffff0130e60200000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac00000000",
        "prevHash": "1b9948a7bc9eda42a9789dde1f569e1158ec5eb824bc22f0987333336be2083f",
        "doubleSignatures": [
          "3045022100e1f96d34327278e043a5abbfed63d69855690cfbbdd386dfe20149ca90d64f7f02202a024ab3a7bc6d57f6b447e75f8552730c8ab2e0f71c7d64b02f632ac2d5fcb401",
          "3045022100f805eefd639ab71690816ba6db109375452a43dba88b5793fa04581cf8d97de50220487a01105eb2338209aad951ea228f4c873a5551c0009d5c4c57a77c698e985501",
          ""
        ]
      }
    },
    {
      "id": "p2sh-p2wsh",
      "title": "P2SH-P2WSH",
      "path": "m/48'/0'/0'/1'/0/0",
      "scriptType": "SPENDP2SHWITNESS",
      "address": "37EqqQYGiFgo9tASYBUsv2EzxvUk4Bwwpp",
      "addressParameters": {
        "path": "m/48'/0'/0'/1'/0/0",
        "coin": "btc",
        "showOnOneKey": true,
        "scriptType": "SPENDP2SHWITNESS",
        "multisig": {
          "pubkeys": [
            {
              "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
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
              "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
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
            "prev_hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDP2SHWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
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
                  "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
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
            "hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
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
                "script_pubkey": "a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf87"
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
            "prev_hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDP2SHWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
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
                  "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "3045022100ff5924c88375b4107152e7a8b4d5e3f6c1fc8c273adf8554d1ae10b4ceb89a870220117c813652b81612ff4010ed819ba980b0d4798ca26958e7b083af4176ab241901",
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
            "hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
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
                "script_pubkey": "a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf87"
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
          "signerAddress": "14jgk24j8hjtDq61EaMRjrLpseQy687iR8",
          "expectedSignature": "3045022100ff5924c88375b4107152e7a8b4d5e3f6c1fc8c273adf8554d1ae10b4ceb89a870220117c813652b81612ff4010ed819ba980b0d4798ca26958e7b083af4176ab241901",
          "prefilledSignerIndex": 1,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/1'/0/0",
                "prev_hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
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
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
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
                "hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
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
                    "script_pubkey": "a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf87"
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
                "prev_hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
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
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "30440220102c50ef52ec25d08c17064d6aae416f531802f8d2b48aa32631a7fca87eabb202205a630c297093ecf3f67ea8c29074d092e9bb71a3660c711f05250292bb244f7601",
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
                "hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
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
                    "script_pubkey": "a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf87"
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
          "expectedSignature": "30440220102c50ef52ec25d08c17064d6aae416f531802f8d2b48aa32631a7fca87eabb202205a630c297093ecf3f67ea8c29074d092e9bb71a3660c711f05250292bb244f7601",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/1'/0/0",
                "prev_hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
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
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
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
                "hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
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
                    "script_pubkey": "a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf87"
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
                "prev_hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
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
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "3045022100ff5924c88375b4107152e7a8b4d5e3f6c1fc8c273adf8554d1ae10b4ceb89a870220117c813652b81612ff4010ed819ba980b0d4798ca26958e7b083af4176ab241901",
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
                "hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
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
                    "script_pubkey": "a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf87"
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
          "signerAddress": "13qfQe71Qu5vknpor2KUvU4GQiM5yqdUqF",
          "expectedSignature": "3045022100b8f94064fc063285e1b5c03616b181830c4cd3cdb015d1fae6c436be9cde935b02207065492d6f24871d5a9f614c73a34e8ed5d15676c97bd4c1130970dcb420ee9501",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/1'/0/0",
                "prev_hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
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
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
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
                "hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
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
                    "script_pubkey": "a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf87"
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
                "prev_hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDP2SHWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
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
                      "node": "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "3045022100ff5924c88375b4107152e7a8b4d5e3f6c1fc8c273adf8554d1ae10b4ceb89a870220117c813652b81612ff4010ed819ba980b0d4798ca26958e7b083af4176ab241901",
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
                "hash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
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
                    "script_pubkey": "a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf87"
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
          "14jgk24j8hjtDq61EaMRjrLpseQy687iR8",
          "1NvkdBRcTgAzAdw6nF8M1B1Yy2okftwPUH",
          "13qfQe71Qu5vknpor2KUvU4GQiM5yqdUqF"
        ],
        "expectedSignatures": [
          "3045022100ff5924c88375b4107152e7a8b4d5e3f6c1fc8c273adf8554d1ae10b4ceb89a870220117c813652b81612ff4010ed819ba980b0d4798ca26958e7b083af4176ab241901",
          "30440220102c50ef52ec25d08c17064d6aae416f531802f8d2b48aa32631a7fca87eabb202205a630c297093ecf3f67ea8c29074d092e9bb71a3660c711f05250292bb244f7601",
          "3045022100b8f94064fc063285e1b5c03616b181830c4cd3cdb015d1fae6c436be9cde935b02207065492d6f24871d5a9f614c73a34e8ed5d15676c97bd4c1130970dcb420ee9501"
        ],
        "accountXpubs": [
          "xpub6F9Qm2hmXhoSyRpBpwDQ22zw1Gya5w9YC1y8edxmXaM7zceMhDSALAHC3kpwjgFSSYTWcrf7yurs6eywsGxLYrhGNGfTqzXymr7jdokHYdt",
          "xpub6DhD3vKCogoQ48ra51MgxJiUTLYKWhZh6RxaXvVT2gDrQQiXeVDuyA65X3fSPLJfR5t7neTK5cMWHm36Z2qnwAXivQZ2vhN3WM2CytmRVFp",
          "xpub6DpFgSNFWXCnkq2qJQwa1TNdav4M7grAvN73Ui8HhX43xaapqQ4u2Ci7agEhA8b7JL2cwK2rUtJJrJENtKXvBNSpLMrmRVu95AGdZQSnsgS"
        ],
        "childPublicKeys": [
          "038ee6cf0286908ea5d3713ac7172070fc8b9c7fa9099018db0ddc521c5de0d835",
          "035e66718a1898a5e81ddfca6a230925aa3ee74f08c173cf0fc2c7166cb0d0e573",
          "024acfbd4a607484ec3094d784fb55850213848e8be10985ad8763b4ed6e0971a5"
        ],
        "sighash": "0e4cbfbe67b4abade9dd18f47bd878b5362d97420c3ef5716300eb851116da08",
        "scriptPubKey": "a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf87",
        "redeemScript": "00207324910f101b4d1939e62a237d764dd031249cf322f92d254bb7ef653f4f5e11",
        "witnessScript": "5221038ee6cf0286908ea5d3713ac7172070fc8b9c7fa9099018db0ddc521c5de0d83521035e66718a1898a5e81ddfca6a230925aa3ee74f08c173cf0fc2c7166cb0d0e57321024acfbd4a607484ec3094d784fb55850213848e8be10985ad8763b4ed6e0971a553ae",
        "fundingTxHex": "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1b6f66666c696e652d6d756c74697369672d703273682d7032777368ffffffff01400d03000000000017a9143cdd84a78c664435af7fdeb2f6d1422c97cd55bf8700000000",
        "spendingTxHex": "0200000001739a354e05eaf14d5ce46a30fbc4f7983a0f913c618d2fb0ae6a10100c3f81df0000000000fdffffff0130e60200000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac00000000",
        "prevHash": "df813f0c10106aaeb02f8d613c910f3a98f7c4fb306ae45c4df1ea054e359a73",
        "doubleSignatures": [
          "3045022100ff5924c88375b4107152e7a8b4d5e3f6c1fc8c273adf8554d1ae10b4ceb89a870220117c813652b81612ff4010ed819ba980b0d4798ca26958e7b083af4176ab241901",
          "30440220102c50ef52ec25d08c17064d6aae416f531802f8d2b48aa32631a7fca87eabb202205a630c297093ecf3f67ea8c29074d092e9bb71a3660c711f05250292bb244f7601",
          ""
        ]
      }
    },
    {
      "id": "p2wsh",
      "title": "P2WSH",
      "path": "m/48'/0'/0'/2'/0/0",
      "scriptType": "SPENDWITNESS",
      "address": "bc1qhpw2gudvr5nvze69y5432g62kgr7sagjwtvp76sgqskxxswqx6us6napwc",
      "addressParameters": {
        "path": "m/48'/0'/0'/2'/0/0",
        "coin": "btc",
        "showOnOneKey": true,
        "scriptType": "SPENDWITNESS",
        "multisig": {
          "pubkeys": [
            {
              "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
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
              "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
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
            "prev_hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
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
                  "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
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
            "hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
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
                "script_pubkey": "0020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b9"
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
            "prev_hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
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
                  "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "30440220460de5411772877f6c9205d38c26d080047601f44ce4533c7ce8affc0ea8cfc2022017976ab16cd66a424e600f784577be2c44835edf1e67f1790b7f1bcb087d25cf01",
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
            "hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
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
                "script_pubkey": "0020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b9"
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
          "signerAddress": "1PgbkE8cFZghFrZ2E5e7QtoqQmsq9Cxqv6",
          "expectedSignature": "30440220460de5411772877f6c9205d38c26d080047601f44ce4533c7ce8affc0ea8cfc2022017976ab16cd66a424e600f784577be2c44835edf1e67f1790b7f1bcb087d25cf01",
          "prefilledSignerIndex": 1,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/2'/0/0",
                "prev_hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
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
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
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
                "hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
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
                    "script_pubkey": "0020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b9"
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
                "prev_hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
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
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "",
                    "304402204672c7cee7941d9ed7d9aabf73c6659edeaaab01beac75d990a0cf951f2e13b30220611e57e61163b459660ac0c51c4d61f384d4abaacd50c2450d3afc156dd26c1101",
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
                "hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
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
                    "script_pubkey": "0020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b9"
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
          "expectedSignature": "304402204672c7cee7941d9ed7d9aabf73c6659edeaaab01beac75d990a0cf951f2e13b30220611e57e61163b459660ac0c51c4d61f384d4abaacd50c2450d3afc156dd26c1101",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/2'/0/0",
                "prev_hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
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
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
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
                "hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
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
                    "script_pubkey": "0020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b9"
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
                "prev_hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
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
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "30440220460de5411772877f6c9205d38c26d080047601f44ce4533c7ce8affc0ea8cfc2022017976ab16cd66a424e600f784577be2c44835edf1e67f1790b7f1bcb087d25cf01",
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
                "hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
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
                    "script_pubkey": "0020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b9"
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
          "signerAddress": "1AAddbBESPN4dRXJRj2DANq1yanaW15aMG",
          "expectedSignature": "3045022100ee9de97242e8e4162056eb1f8c7ffa5f8131cdf1673a1bca7c90de1ea1ba0ddd0220085ee1ab4f22cac6bf8cac292c6c7be359ac01e059cb9099e4d585701736683401",
          "prefilledSignerIndex": 0,
          "firstSignParameters": {
            "coin": "btc",
            "inputs": [
              {
                "address_n": "m/48'/0'/0'/2'/0/0",
                "prev_hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
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
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
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
                "hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
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
                    "script_pubkey": "0020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b9"
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
                "prev_hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
                "prev_index": 0,
                "amount": "200000",
                "script_type": "SPENDWITNESS",
                "multisig": {
                  "pubkeys": [
                    {
                      "node": "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
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
                      "node": "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6",
                      "address_n": [
                        0,
                        0
                      ]
                    }
                  ],
                  "signatures": [
                    "30440220460de5411772877f6c9205d38c26d080047601f44ce4533c7ce8affc0ea8cfc2022017976ab16cd66a424e600f784577be2c44835edf1e67f1790b7f1bcb087d25cf01",
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
                "hash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
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
                    "script_pubkey": "0020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b9"
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
          "1PgbkE8cFZghFrZ2E5e7QtoqQmsq9Cxqv6",
          "1Bvx5N5Fyayf2iFJ21HwpAsqSJi8exRpyt",
          "1AAddbBESPN4dRXJRj2DANq1yanaW15aMG"
        ],
        "expectedSignatures": [
          "30440220460de5411772877f6c9205d38c26d080047601f44ce4533c7ce8affc0ea8cfc2022017976ab16cd66a424e600f784577be2c44835edf1e67f1790b7f1bcb087d25cf01",
          "304402204672c7cee7941d9ed7d9aabf73c6659edeaaab01beac75d990a0cf951f2e13b30220611e57e61163b459660ac0c51c4d61f384d4abaacd50c2450d3afc156dd26c1101",
          "3045022100ee9de97242e8e4162056eb1f8c7ffa5f8131cdf1673a1bca7c90de1ea1ba0ddd0220085ee1ab4f22cac6bf8cac292c6c7be359ac01e059cb9099e4d585701736683401"
        ],
        "accountXpubs": [
          "xpub6F9Qm2hmXhoT1MBLpk8mP8ku8Bh2Bq2cD2Wj3eEZbJp7fZa4QGmH8o2fvjmVctv8MU4kkTHakniGvKZ69cUJa9LAbx8GhpMJH7LAktoSHU2",
          "xpub6DhD3vKCogoQ57x4mnaQFcCzbBgmYFcspSQR2BsaGRRxYNPD3rk5zFB8cfzFbis4uCFyqTXF7vXhsoA5cJuvuv2ozyNsF2fGKNGnnmNUhkp",
          "xpub6DpFgSNFWXCnokam8hNgmouiu3ZXkDynKU1Y5pDazGkya2dPcHqesnFwUDvwhRemK9ekTpFsH6xjduqz8wc8REQWWBgx8RfGSUN7f3mWzf6"
        ],
        "childPublicKeys": [
          "02fcc70d03ca38f1bd4199a52c23e5c60dbfe74c4ed45f73be34d3f56b5a213452",
          "03242265037fee8f18cca525c319b0e001ca08010d7b2a7f7e9da5ff35bcf9b3b1",
          "03b55face2b4ac27f309805c4981bbce4cc029d63cac4477e117f9ef1bddb3e8d1"
        ],
        "sighash": "c4bb54913e517900d2a7a560694db6002d8da23495bd668fb8d2a28af3561d1b",
        "scriptPubKey": "0020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b9",
        "redeemScript": "522102fcc70d03ca38f1bd4199a52c23e5c60dbfe74c4ed45f73be34d3f56b5a2134522103242265037fee8f18cca525c319b0e001ca08010d7b2a7f7e9da5ff35bcf9b3b12103b55face2b4ac27f309805c4981bbce4cc029d63cac4477e117f9ef1bddb3e8d153ae",
        "witnessScript": "522102fcc70d03ca38f1bd4199a52c23e5c60dbfe74c4ed45f73be34d3f56b5a2134522103242265037fee8f18cca525c319b0e001ca08010d7b2a7f7e9da5ff35bcf9b3b12103b55face2b4ac27f309805c4981bbce4cc029d63cac4477e117f9ef1bddb3e8d153ae",
        "fundingTxHex": "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff166f66666c696e652d6d756c74697369672d7032777368ffffffff01400d030000000000220020b85ca471ac1d26c16745252b15234ab207e8751272d81f6a08042c6341c036b900000000",
        "spendingTxHex": "0200000001ce3fe69cebda4e9e888067f9ddc22596dec00a20834ac3a839ec363fc957fbac0000000000fdffffff0130e60200000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac00000000",
        "prevHash": "acfb57c93f36ec39a8c34a83200ac0de9625c2ddf96780889e4edaeb9ce63fce",
        "doubleSignatures": [
          "30440220460de5411772877f6c9205d38c26d080047601f44ce4533c7ce8affc0ea8cfc2022017976ab16cd66a424e600f784577be2c44835edf1e67f1790b7f1bcb087d25cf01",
          "304402204672c7cee7941d9ed7d9aabf73c6659edeaaab01beac75d990a0cf951f2e13b30220611e57e61163b459660ac0c51c4d61f384d4abaacd50c2450d3afc156dd26c1101",
          ""
        ]
      }
    }
  ]
} as const;
