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
          "0x9858EfFD232B4033E47d90003D41EC34EcaEda94",
          "0x58A57ed9d8d624cBD12e2C467D34787555bB1b25",
          "0x3061750d3dF69ef7B8d4407CB7f3F879Fd9d2398"
        ],
        "expectedSignatures": [
          "0x4763549468898de6cbd64af634b6cb811d684fe4f328d58b121984e5cd878c5c5d8c80afd80d700461f267a72ffc63b7c5b7e443de606485fef5cd6dbd280eb41c",
          "0x1e18f52d6a84cf9741aab94db48b98d43fa87033b3616feebacac780e91641262ed4f6fe9dfd48699404f49fa7fc22abcc74632a962e1db0fac6dbb63a1b78141c",
          "0x565ccf4e458d4690780e21bf5b0bbf1221c364bed0195544f3ecccca465efb925fba86bd2e1ae67808a5f064b45093cdd984ebf7991304a05f520fa198d8af411c"
        ],
        "aggregatedSignatures2Of3": "0x565ccf4e458d4690780e21bf5b0bbf1221c364bed0195544f3ecccca465efb925fba86bd2e1ae67808a5f064b45093cdd984ebf7991304a05f520fa198d8af411c1e18f52d6a84cf9741aab94db48b98d43fa87033b3616feebacac780e91641262ed4f6fe9dfd48699404f49fa7fc22abcc74632a962e1db0fac6dbb63a1b78141c",
        "aggregatedSignatures3Of3": "0x565ccf4e458d4690780e21bf5b0bbf1221c364bed0195544f3ecccca465efb925fba86bd2e1ae67808a5f064b45093cdd984ebf7991304a05f520fa198d8af411c1e18f52d6a84cf9741aab94db48b98d43fa87033b3616feebacac780e91641262ed4f6fe9dfd48699404f49fa7fc22abcc74632a962e1db0fac6dbb63a1b78141c4763549468898de6cbd64af634b6cb811d684fe4f328d58b121984e5cd878c5c5d8c80afd80d700461f267a72ffc63b7c5b7e443de606485fef5cd6dbd280eb41c"
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
          "0x9858EfFD232B4033E47d90003D41EC34EcaEda94",
          "0x58A57ed9d8d624cBD12e2C467D34787555bB1b25",
          "0x3061750d3dF69ef7B8d4407CB7f3F879Fd9d2398"
        ],
        "expectedSignatures": [
          "0x156e07ea2b1d916b4739b8b8f3f647b7c28180837bbf68ef100d3415b7a5659a44c6cb3c4e0dae7b13d57d889037888f6222e775205d63dd174fc1f2085fd6ce1b",
          "0x94db19f6c787399035cfc3b7642a58739cd3d83ad4850c468b1e6b42c323fdf720165d714d2c851f4bc949d282ec4dcc07b2c55cc3563f814a5ff1e9ec8c5b7f1c",
          "0xbc9dccd68f9d40d643c2d0a0a7e917fe5ee9d620c8a201a4f18fdc7facc0beb8305f3e08eeb677950162eb5b5921c0afaa16391df5e78949a40b14c9dd0ec92b1b"
        ],
        "aggregatedSignatures2Of3": "0xbc9dccd68f9d40d643c2d0a0a7e917fe5ee9d620c8a201a4f18fdc7facc0beb8305f3e08eeb677950162eb5b5921c0afaa16391df5e78949a40b14c9dd0ec92b1b94db19f6c787399035cfc3b7642a58739cd3d83ad4850c468b1e6b42c323fdf720165d714d2c851f4bc949d282ec4dcc07b2c55cc3563f814a5ff1e9ec8c5b7f1c",
        "aggregatedSignatures3Of3": "0xbc9dccd68f9d40d643c2d0a0a7e917fe5ee9d620c8a201a4f18fdc7facc0beb8305f3e08eeb677950162eb5b5921c0afaa16391df5e78949a40b14c9dd0ec92b1b94db19f6c787399035cfc3b7642a58739cd3d83ad4850c468b1e6b42c323fdf720165d714d2c851f4bc949d282ec4dcc07b2c55cc3563f814a5ff1e9ec8c5b7f1c156e07ea2b1d916b4739b8b8f3f647b7c28180837bbf68ef100d3415b7a5659a44c6cb3c4e0dae7b13d57d889037888f6222e775205d63dd174fc1f2085fd6ce1b"
      }
    }
  ],
  "btc": [
    {
      "id": "p2sh",
      "title": "P2SH",
      "path": "m/48'/0'/0'/0'/0/0",
      "scriptType": "SPENDMULTISIG",
      "address": "3FTNvfjxMQchDMdhT3ELE7nHyRdWhd1yMu",
      "addressParameters": {
        "path": "m/48'/0'/0'/0'/0/0",
        "coin": "btc",
        "showOnOneKey": true,
        "scriptType": "SPENDMULTISIG",
        "multisig": {
          "pubkeys": [
            {
              "node": "xpub6DkFAXWQ2dHxkZU4qtXWMUGXJ71JvpUUBua4KZsYe8gK7iVx8AKiiMYbdHaiSqjuTfJgnfegvcxFniuxBvLSTrGmaFCGQ2rD9bN4f246pcb",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6FQya7zGhR92g3JoPPmWWh3bxv6D2Q9dHsm9quWR9vTAD2Vhup52AKWwDvx4834RqC3VxjQPZ6L6RuBeHxBc7goUeecdWVDEm2xPQ9QTxhp",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6DnEBNkSJKBYL2LdAjVb3qK8rYs4t7H6gfJHhW4P25nzAsRBrwuyiCqw3uTURVXPuh3Cm7Q4o1bqVzkh8R77nosvUkUSaQd8MfoQYEZrPv3",
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
            "prev_hash": "2e46ae2c2aa057b244410b7122cfff390624af4800ff6a86c3b5e75f345627e3",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDMULTISIG",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DkFAXWQ2dHxkZU4qtXWMUGXJ71JvpUUBua4KZsYe8gK7iVx8AKiiMYbdHaiSqjuTfJgnfegvcxFniuxBvLSTrGmaFCGQ2rD9bN4f246pcb",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6FQya7zGhR92g3JoPPmWWh3bxv6D2Q9dHsm9quWR9vTAD2Vhup52AKWwDvx4834RqC3VxjQPZ6L6RuBeHxBc7goUeecdWVDEm2xPQ9QTxhp",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DnEBNkSJKBYL2LdAjVb3qK8rYs4t7H6gfJHhW4P25nzAsRBrwuyiCqw3uTURVXPuh3Cm7Q4o1bqVzkh8R77nosvUkUSaQd8MfoQYEZrPv3",
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
            "hash": "2e46ae2c2aa057b244410b7122cfff390624af4800ff6a86c3b5e75f345627e3",
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
                "script_pubkey": "a91496fd781f12cc667ae77de15bacf4759ae3cd8e6387"
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
            "prev_hash": "2e46ae2c2aa057b244410b7122cfff390624af4800ff6a86c3b5e75f345627e3",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDMULTISIG",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DkFAXWQ2dHxkZU4qtXWMUGXJ71JvpUUBua4KZsYe8gK7iVx8AKiiMYbdHaiSqjuTfJgnfegvcxFniuxBvLSTrGmaFCGQ2rD9bN4f246pcb",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6FQya7zGhR92g3JoPPmWWh3bxv6D2Q9dHsm9quWR9vTAD2Vhup52AKWwDvx4834RqC3VxjQPZ6L6RuBeHxBc7goUeecdWVDEm2xPQ9QTxhp",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DnEBNkSJKBYL2LdAjVb3qK8rYs4t7H6gfJHhW4P25nzAsRBrwuyiCqw3uTURVXPuh3Cm7Q4o1bqVzkh8R77nosvUkUSaQd8MfoQYEZrPv3",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "304502210094afb2090f06a676ced142fe6d37c8292246940e0c6e4a4cdfb6fbe7eca2295c02203a5914a6e6983748aa8a8239212d496b931d23c357f9293d3ce1f48f6fb74da601",
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
            "hash": "2e46ae2c2aa057b244410b7122cfff390624af4800ff6a86c3b5e75f345627e3",
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
                "script_pubkey": "a91496fd781f12cc667ae77de15bacf4759ae3cd8e6387"
              }
            ],
            "lock_time": 0
          }
        ]
      },
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
          "1AG9SFUXpNKMEdTxdvT5moKz3NjrSihYE8",
          "1HpKzRDSHhSgjvuDbr2pjBUczZ4dMaSfrZ",
          "1NPSoGeyGzcWrDtcH6LggG4FnmmJ6TfUSA"
        ],
        "expectedSignatures": [
          "304502210094afb2090f06a676ced142fe6d37c8292246940e0c6e4a4cdfb6fbe7eca2295c02203a5914a6e6983748aa8a8239212d496b931d23c357f9293d3ce1f48f6fb74da601",
          "30450221009f3d3785ee6db97865cafd256d7c41274142254f9f0490d457780ca65c6fda610220555babb48e3855d3f9c42b27ae3bf6eb55fd70511aa2143285cd305448d4ae3a01",
          "30440220231061595ed465518e1a1b6dfcb597def644461f2d8cc3545794410fbeb5dcbb02205597251e91864ba41b695c78f74858aaa51fb494942f3df037b32c940cedfe7301"
        ],
        "accountXpubs": [
          "xpub6DkFAXWQ2dHxkZU4qtXWMUGXJ71JvpUUBua4KZsYe8gK7iVx8AKiiMYbdHaiSqjuTfJgnfegvcxFniuxBvLSTrGmaFCGQ2rD9bN4f246pcb",
          "xpub6FQya7zGhR92g3JoPPmWWh3bxv6D2Q9dHsm9quWR9vTAD2Vhup52AKWwDvx4834RqC3VxjQPZ6L6RuBeHxBc7goUeecdWVDEm2xPQ9QTxhp",
          "xpub6DnEBNkSJKBYL2LdAjVb3qK8rYs4t7H6gfJHhW4P25nzAsRBrwuyiCqw3uTURVXPuh3Cm7Q4o1bqVzkh8R77nosvUkUSaQd8MfoQYEZrPv3"
        ],
        "childPublicKeys": [
          "026f3858ff885756a5ec7a346506de086ff68dfa034ee049f494640c681a3e2b30",
          "03de25babf2d8ca6ff319f8c641bc7fbcff451900a2ee16ee63f57827bc42aede0",
          "026fc785df5e278eef7df89add527023e9fff166fb8e9353241e60adf3e55bdd68"
        ],
        "sighash": "e3bf78ba2ceea08ebf698f3a27d4100b04773f7ab0bf6bcb6cf02d34d44fd6cb",
        "scriptPubKey": "a91496fd781f12cc667ae77de15bacf4759ae3cd8e6387",
        "redeemScript": "5221026f3858ff885756a5ec7a346506de086ff68dfa034ee049f494640c681a3e2b302103de25babf2d8ca6ff319f8c641bc7fbcff451900a2ee16ee63f57827bc42aede021026fc785df5e278eef7df89add527023e9fff166fb8e9353241e60adf3e55bdd6853ae",
        "fundingTxHex": "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff156f66666c696e652d6d756c74697369672d70327368ffffffff01400d03000000000017a91496fd781f12cc667ae77de15bacf4759ae3cd8e638700000000",
        "spendingTxHex": "0200000001e32756345fe7b5c3866aff0048af240639ffcf22710b4144b257a02a2cae462e0000000000fdffffff0130e60200000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac00000000",
        "prevHash": "2e46ae2c2aa057b244410b7122cfff390624af4800ff6a86c3b5e75f345627e3",
        "doubleSignatures": [
          "304502210094afb2090f06a676ced142fe6d37c8292246940e0c6e4a4cdfb6fbe7eca2295c02203a5914a6e6983748aa8a8239212d496b931d23c357f9293d3ce1f48f6fb74da601",
          "30450221009f3d3785ee6db97865cafd256d7c41274142254f9f0490d457780ca65c6fda610220555babb48e3855d3f9c42b27ae3bf6eb55fd70511aa2143285cd305448d4ae3a01",
          ""
        ]
      }
    },
    {
      "id": "p2sh-p2wsh",
      "title": "P2SH-P2WSH",
      "path": "m/48'/0'/0'/1'/0/0",
      "scriptType": "SPENDP2SHWITNESS",
      "address": "39rxzBe1hQhcEHXCSo14jjvB9ELzNArnLU",
      "addressParameters": {
        "path": "m/48'/0'/0'/1'/0/0",
        "coin": "btc",
        "showOnOneKey": true,
        "scriptType": "SPENDP2SHWITNESS",
        "multisig": {
          "pubkeys": [
            {
              "node": "xpub6DkFAXWQ2dHxnMKoSBogHrw1rgNJKR4umdbnNVNTYeCGcduxWnNUHgGptqEQWPKRmeW4Zn4FHSbLMBKEWYaMDYu47Ytg6DdFnPNt8hwn5mE",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6FQya7zGhR92giSkXpPgPHpq85nUnqabbbNuJiae1zndR3B6Nq2QCoSWBkdLF7bkifSYSNvyTfhg4KBvKyJ94HXuEaeWZsabMnTyJiPz21N",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6DnEBNkSJKBYPrWx37y4g5aeMWTdvqzpRqjkVZcif1qn76MbLC6ppoPJywRy99vFMYJCdVRbfpqaDHEvvkHan99G3UVVpFsXepeVXn79dHm",
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
            "prev_hash": "73d553667d32812dbc8e5b08314eee3615d7769d61e823d12d34f0c2fcd4a89f",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDP2SHWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DkFAXWQ2dHxnMKoSBogHrw1rgNJKR4umdbnNVNTYeCGcduxWnNUHgGptqEQWPKRmeW4Zn4FHSbLMBKEWYaMDYu47Ytg6DdFnPNt8hwn5mE",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6FQya7zGhR92giSkXpPgPHpq85nUnqabbbNuJiae1zndR3B6Nq2QCoSWBkdLF7bkifSYSNvyTfhg4KBvKyJ94HXuEaeWZsabMnTyJiPz21N",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DnEBNkSJKBYPrWx37y4g5aeMWTdvqzpRqjkVZcif1qn76MbLC6ppoPJywRy99vFMYJCdVRbfpqaDHEvvkHan99G3UVVpFsXepeVXn79dHm",
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
            "hash": "73d553667d32812dbc8e5b08314eee3615d7769d61e823d12d34f0c2fcd4a89f",
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
                "script_pubkey": "a91459a2b6c9519bb4b8b6fdadfbaaa79b4d875fcfeb87"
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
            "prev_hash": "73d553667d32812dbc8e5b08314eee3615d7769d61e823d12d34f0c2fcd4a89f",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDP2SHWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DkFAXWQ2dHxnMKoSBogHrw1rgNJKR4umdbnNVNTYeCGcduxWnNUHgGptqEQWPKRmeW4Zn4FHSbLMBKEWYaMDYu47Ytg6DdFnPNt8hwn5mE",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6FQya7zGhR92giSkXpPgPHpq85nUnqabbbNuJiae1zndR3B6Nq2QCoSWBkdLF7bkifSYSNvyTfhg4KBvKyJ94HXuEaeWZsabMnTyJiPz21N",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DnEBNkSJKBYPrWx37y4g5aeMWTdvqzpRqjkVZcif1qn76MbLC6ppoPJywRy99vFMYJCdVRbfpqaDHEvvkHan99G3UVVpFsXepeVXn79dHm",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "3045022100bff9a6719eaa383d8f6215aa0b8e5d0fc942de29afb9cd2237eea2a2276f8e5602205990f57681b2ada8469609e0917709dc899c21d805b57cb0425946ae63d5e8cd01",
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
            "hash": "73d553667d32812dbc8e5b08314eee3615d7769d61e823d12d34f0c2fcd4a89f",
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
                "script_pubkey": "a91459a2b6c9519bb4b8b6fdadfbaaa79b4d875fcfeb87"
              }
            ],
            "lock_time": 0
          }
        ]
      },
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
          "1F95bxppEcefBxwiGcke3fTPVcTSVguQsJ",
          "1Fjwx7LEHNzsDswPFuBm6yQjbzFdxTZgj8",
          "13hbqRBHbrYfnfenueSLQmeAbvYiS3WMsX"
        ],
        "expectedSignatures": [
          "3045022100bff9a6719eaa383d8f6215aa0b8e5d0fc942de29afb9cd2237eea2a2276f8e5602205990f57681b2ada8469609e0917709dc899c21d805b57cb0425946ae63d5e8cd01",
          "3044022000c1c32d7a38486cabd32469d7c8bc71cb16ec29978645607b7777c0a8e356200220583d042212d8624b36a316761a08df9291f17a05ffb018d9209fb6bef83b18cf01",
          "3045022100a0d1774efd6a9f925dd665975aa07feec6fbb142c6e3edadf0230f4206cd083402206a7046e09e6df903676460b8b5ed7d812f56a8da16605bd42f19746740d12ea701"
        ],
        "accountXpubs": [
          "xpub6DkFAXWQ2dHxnMKoSBogHrw1rgNJKR4umdbnNVNTYeCGcduxWnNUHgGptqEQWPKRmeW4Zn4FHSbLMBKEWYaMDYu47Ytg6DdFnPNt8hwn5mE",
          "xpub6FQya7zGhR92giSkXpPgPHpq85nUnqabbbNuJiae1zndR3B6Nq2QCoSWBkdLF7bkifSYSNvyTfhg4KBvKyJ94HXuEaeWZsabMnTyJiPz21N",
          "xpub6DnEBNkSJKBYPrWx37y4g5aeMWTdvqzpRqjkVZcif1qn76MbLC6ppoPJywRy99vFMYJCdVRbfpqaDHEvvkHan99G3UVVpFsXepeVXn79dHm"
        ],
        "childPublicKeys": [
          "03abe5ccc0a6ddf20e02e27ca4829a4bcf288849f5d137db19559dd2ab23236dbe",
          "03e08f6cdd489c655b3e60bd22cdad3567f803f58840aa4f7c3195504e6c8adc55",
          "02967c1f3fa6b5da09ed01af82f8ec826df1bf2e7a113d087063a96f1a7e1b2e19"
        ],
        "sighash": "53b7e17d935115db953e23de8d4c1a70a102a79b5f9972434e29fb7b6bf0a011",
        "scriptPubKey": "a91459a2b6c9519bb4b8b6fdadfbaaa79b4d875fcfeb87",
        "redeemScript": "0020222b22eb9777e7a90624682fb5c16f6d63aebb83081e7b754a2fe59142f16a81",
        "witnessScript": "522103abe5ccc0a6ddf20e02e27ca4829a4bcf288849f5d137db19559dd2ab23236dbe2103e08f6cdd489c655b3e60bd22cdad3567f803f58840aa4f7c3195504e6c8adc552102967c1f3fa6b5da09ed01af82f8ec826df1bf2e7a113d087063a96f1a7e1b2e1953ae",
        "fundingTxHex": "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1b6f66666c696e652d6d756c74697369672d703273682d7032777368ffffffff01400d03000000000017a91459a2b6c9519bb4b8b6fdadfbaaa79b4d875fcfeb8700000000",
        "spendingTxHex": "02000000019fa8d4fcc2f0342dd123e8619d76d71536ee4e31085b8ebc2d81327d6653d5730000000000fdffffff0130e60200000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac00000000",
        "prevHash": "73d553667d32812dbc8e5b08314eee3615d7769d61e823d12d34f0c2fcd4a89f",
        "doubleSignatures": [
          "3045022100bff9a6719eaa383d8f6215aa0b8e5d0fc942de29afb9cd2237eea2a2276f8e5602205990f57681b2ada8469609e0917709dc899c21d805b57cb0425946ae63d5e8cd01",
          "3044022000c1c32d7a38486cabd32469d7c8bc71cb16ec29978645607b7777c0a8e356200220583d042212d8624b36a316761a08df9291f17a05ffb018d9209fb6bef83b18cf01",
          ""
        ]
      }
    },
    {
      "id": "p2wsh",
      "title": "P2WSH",
      "path": "m/48'/0'/0'/2'/0/0",
      "scriptType": "SPENDWITNESS",
      "address": "bc1qp38kn2cpud9u5z8px3ga9vtuwdp3n0cc6xly6td45u5g6nsgcl9sagut92",
      "addressParameters": {
        "path": "m/48'/0'/0'/2'/0/0",
        "coin": "btc",
        "showOnOneKey": true,
        "scriptType": "SPENDWITNESS",
        "multisig": {
          "pubkeys": [
            {
              "node": "xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX",
              "address_n": [
                0,
                0
              ]
            },
            {
              "node": "xpub6DnEBNkSJKBYQmsbhS1sP9cNdtU5c9PLFGCjTJmxicxc13WB8zNNGQazabQpyFAGW5bV9tMko4uBxDxjUKL6dSAcx1tEbgEHtgSqyRsekh6",
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
            "prev_hash": "ae4fd90d8046ba01abc4b846dc5227c28b045500fb8bda8145ef53896276929b",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DnEBNkSJKBYQmsbhS1sP9cNdtU5c9PLFGCjTJmxicxc13WB8zNNGQazabQpyFAGW5bV9tMko4uBxDxjUKL6dSAcx1tEbgEHtgSqyRsekh6",
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
            "hash": "ae4fd90d8046ba01abc4b846dc5227c28b045500fb8bda8145ef53896276929b",
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
                "script_pubkey": "00200c4f69ab01e34bca08e13451d2b17c734319bf18d1be4d2db5a7288d4e08c7cb"
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
            "prev_hash": "ae4fd90d8046ba01abc4b846dc5227c28b045500fb8bda8145ef53896276929b",
            "prev_index": 0,
            "amount": "200000",
            "script_type": "SPENDWITNESS",
            "multisig": {
              "pubkeys": [
                {
                  "node": "xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX",
                  "address_n": [
                    0,
                    0
                  ]
                },
                {
                  "node": "xpub6DnEBNkSJKBYQmsbhS1sP9cNdtU5c9PLFGCjTJmxicxc13WB8zNNGQazabQpyFAGW5bV9tMko4uBxDxjUKL6dSAcx1tEbgEHtgSqyRsekh6",
                  "address_n": [
                    0,
                    0
                  ]
                }
              ],
              "signatures": [
                "3045022100f0fa4ee5d462fa9f95ec6faf8bc9be85673bbdede4c4bf5b6301ad0f27ea3f0102202d24a4df617acf082434b3e25f4588beb072137fd2ec0377fa891d9b1b30157401",
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
            "hash": "ae4fd90d8046ba01abc4b846dc5227c28b045500fb8bda8145ef53896276929b",
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
                "script_pubkey": "00200c4f69ab01e34bca08e13451d2b17c734319bf18d1be4d2db5a7288d4e08c7cb"
              }
            ],
            "lock_time": 0
          }
        ]
      },
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
          "19UR2SuvBxrYgTodozcD7hhxwekkskMQGc",
          "16reYF5jLgD85wjHSk3Pp8VLiyRcHdKnh1",
          "1KV3YCyrD7mHTP4DBwm1iVRQuJjwb72XMK"
        ],
        "expectedSignatures": [
          "3045022100f0fa4ee5d462fa9f95ec6faf8bc9be85673bbdede4c4bf5b6301ad0f27ea3f0102202d24a4df617acf082434b3e25f4588beb072137fd2ec0377fa891d9b1b30157401",
          "3045022100a5e094cb0dea0aaaf0d3c535ae7d9c5bd534b8a94f59325ea55e395bb34bfb6c022046d6abd668111aca857ae25f907793b9125c66850584d3df4ec1071989dc515701",
          "3045022100928e693fd64235cb799e13d7a091bce78f135009494be46e7489d559aa731b3f022006883d81fb751cee2451ba50fb718c6049d92d57ecc2a8fe3f5df24d29969f8501"
        ],
        "accountXpubs": [
          "xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf",
          "xpub6FQya7zGhR92kacYsNnjreouvnHJMpXYsUXnW6NJJAJRCKsa26TzDy4LdnGhEurr3d6y1J8PJ7EEMKQp74XTqYvmGJNogYXSKDszYHtF8mX",
          "xpub6DnEBNkSJKBYQmsbhS1sP9cNdtU5c9PLFGCjTJmxicxc13WB8zNNGQazabQpyFAGW5bV9tMko4uBxDxjUKL6dSAcx1tEbgEHtgSqyRsekh6"
        ],
        "childPublicKeys": [
          "03dc1953c2756c7c58d4f48ca1bbba767f414fd236bf4d662b67721ac626c514e0",
          "028e818df63d6f2dce9308d7455fd4c85cbb39d703608b8fbed647d75e262322d8",
          "03229cb34fe3eb1af43b6dd2a2e1b31681039b71d9303ded36b3128ef359e379bd"
        ],
        "sighash": "542c8491fec4f8ca1d0e32e584bd6a0d69c49d0da520f4ac88f04c2a9a4f00b4",
        "scriptPubKey": "00200c4f69ab01e34bca08e13451d2b17c734319bf18d1be4d2db5a7288d4e08c7cb",
        "redeemScript": "522103dc1953c2756c7c58d4f48ca1bbba767f414fd236bf4d662b67721ac626c514e021028e818df63d6f2dce9308d7455fd4c85cbb39d703608b8fbed647d75e262322d82103229cb34fe3eb1af43b6dd2a2e1b31681039b71d9303ded36b3128ef359e379bd53ae",
        "witnessScript": "522103dc1953c2756c7c58d4f48ca1bbba767f414fd236bf4d662b67721ac626c514e021028e818df63d6f2dce9308d7455fd4c85cbb39d703608b8fbed647d75e262322d82103229cb34fe3eb1af43b6dd2a2e1b31681039b71d9303ded36b3128ef359e379bd53ae",
        "fundingTxHex": "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff166f66666c696e652d6d756c74697369672d7032777368ffffffff01400d0300000000002200200c4f69ab01e34bca08e13451d2b17c734319bf18d1be4d2db5a7288d4e08c7cb00000000",
        "spendingTxHex": "02000000019b9276628953ef4581da8bfb0055048bc22752dc46b8c4ab01ba46800dd94fae0000000000fdffffff0130e60200000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac00000000",
        "prevHash": "ae4fd90d8046ba01abc4b846dc5227c28b045500fb8bda8145ef53896276929b",
        "doubleSignatures": [
          "3045022100f0fa4ee5d462fa9f95ec6faf8bc9be85673bbdede4c4bf5b6301ad0f27ea3f0102202d24a4df617acf082434b3e25f4588beb072137fd2ec0377fa891d9b1b30157401",
          "3045022100a5e094cb0dea0aaaf0d3c535ae7d9c5bd534b8a94f59325ea55e395bb34bfb6c022046d6abd668111aca857ae25f907793b9125c66850584d3df4ec1071989dc515701",
          ""
        ]
      }
    }
  ]
} as const;
