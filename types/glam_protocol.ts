/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/glam_protocol.json`.
 */
export type GlamProtocol = {
  "address": "GLAMpaME8wdTEzxtiYEAa5yD8fZbxZiz2hNtV58RZiEz",
  "metadata": {
    "name": "glamProtocol",
    "version": "0.4.36",
    "spec": "0.1.0",
    "description": "Glam Protocol"
  },
  "instructions": [
    {
      "name": "closeState",
      "discriminator": [
        25,
        1,
        184,
        101,
        200,
        245,
        210,
        246
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "cpiProxy",
      "docs": [
        "Only accessible by integration programs"
      ],
      "discriminator": [
        65,
        134,
        48,
        2,
        7,
        232,
        199,
        46
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram"
        },
        {
          "name": "integrationAuthority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "data",
          "type": "bytes"
        },
        {
          "name": "extraParams",
          "type": {
            "vec": {
              "defined": {
                "name": "extraParams"
              }
            }
          }
        }
      ]
    },
    {
      "name": "emergencyUpdateState",
      "docs": [
        "Bypasses the timelock for emergency updates on access control. Allowed operations:",
        "- removing an integration program",
        "- removing a delegate",
        "- enabling/disabling glam state"
      ],
      "discriminator": [
        156,
        211,
        55,
        70,
        92,
        37,
        190,
        66
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "emergencyAccessUpdateArgs"
            }
          }
        }
      ]
    },
    {
      "name": "enableDisableProtocols",
      "discriminator": [
        222,
        198,
        164,
        163,
        194,
        161,
        11,
        171
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "integrationProgram",
          "type": "pubkey"
        },
        {
          "name": "protocolsBitmask",
          "type": "u16"
        },
        {
          "name": "setEnabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "extendState",
      "discriminator": [
        34,
        147,
        151,
        206,
        134,
        128,
        82,
        228
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bytes",
          "type": "u32"
        }
      ]
    },
    {
      "name": "grantRevokeDelegatePermissions",
      "discriminator": [
        162,
        21,
        218,
        157,
        218,
        86,
        114,
        171
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "delegate",
          "type": "pubkey"
        },
        {
          "name": "integrationProgram",
          "type": "pubkey"
        },
        {
          "name": "protocolBitflag",
          "type": "u16"
        },
        {
          "name": "permissionsBitmask",
          "type": "u64"
        },
        {
          "name": "setGranted",
          "type": "bool"
        }
      ]
    },
    {
      "name": "initializeState",
      "discriminator": [
        190,
        171,
        224,
        219,
        217,
        72,
        199,
        176
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "glamSigner"
              },
              {
                "kind": "arg",
                "path": "state_model.created"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "baseAssetMint"
        }
      ],
      "args": [
        {
          "name": "state",
          "type": {
            "defined": {
              "name": "stateModel"
            }
          }
        }
      ]
    },
    {
      "name": "jupiterSwap",
      "discriminator": [
        116,
        207,
        0,
        196,
        252,
        120,
        243,
        18
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
        },
        {
          "name": "inputVaultAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamVault"
              },
              {
                "kind": "account",
                "path": "inputTokenProgram"
              },
              {
                "kind": "account",
                "path": "inputMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "outputVaultAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamVault"
              },
              {
                "kind": "account",
                "path": "outputTokenProgram"
              },
              {
                "kind": "account",
                "path": "outputMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "inputMint"
        },
        {
          "name": "outputMint"
        },
        {
          "name": "inputStakePool",
          "optional": true
        },
        {
          "name": "outputStakePool",
          "optional": true
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "inputTokenProgram"
        },
        {
          "name": "outputTokenProgram"
        }
      ],
      "args": [
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "linkUnlinkMint",
      "docs": [
        "For glam mint program's use only"
      ],
      "discriminator": [
        237,
        235,
        138,
        232,
        220,
        182,
        115,
        14
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "glamMintAuthority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "link",
          "type": "bool"
        }
      ]
    },
    {
      "name": "priceDriftUsers",
      "docs": [
        "Extra accounts for pricing N drift users under the same user stats:",
        "- user_stats x 1",
        "- drift_user x N",
        "- markets and oracles used by all drift users (no specific order)"
      ],
      "discriminator": [
        12,
        5,
        143,
        51,
        101,
        81,
        200,
        150
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "solOracle"
        },
        {
          "name": "glamConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                10,
                11,
                0,
                83,
                72,
                16,
                46,
                144,
                46,
                42,
                79,
                22,
                157,
                123,
                21,
                242,
                192,
                146,
                1,
                78,
                88,
                59,
                102,
                9,
                190,
                226,
                92,
                189,
                187,
                232,
                83,
                220
              ]
            }
          }
        }
      ],
      "args": [
        {
          "name": "denom",
          "type": {
            "defined": {
              "name": "priceDenom"
            }
          }
        },
        {
          "name": "numUsers",
          "type": "u8"
        }
      ]
    },
    {
      "name": "priceDriftVaultDepositors",
      "docs": [
        "Extra accounts for pricing N vault depositors:",
        "- (vault_depositor, drift_vault, drift_user) x N",
        "- spot_market used by drift users of vaults (no specific order)",
        "- perp markets used by drift users of vaults (no specific order)",
        "- oracles of spot markets and perp markets (no specific order)"
      ],
      "discriminator": [
        234,
        16,
        238,
        70,
        189,
        23,
        98,
        160
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "solOracle"
        },
        {
          "name": "glamConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                10,
                11,
                0,
                83,
                72,
                16,
                46,
                144,
                46,
                42,
                79,
                22,
                157,
                123,
                21,
                242,
                192,
                146,
                1,
                78,
                88,
                59,
                102,
                9,
                190,
                226,
                92,
                189,
                187,
                232,
                83,
                220
              ]
            }
          }
        }
      ],
      "args": [
        {
          "name": "denom",
          "type": {
            "defined": {
              "name": "priceDenom"
            }
          }
        },
        {
          "name": "numVaultDepositors",
          "type": "u8"
        },
        {
          "name": "numSpotMarkets",
          "type": "u8"
        },
        {
          "name": "numPerpMarkets",
          "type": "u8"
        }
      ]
    },
    {
      "name": "priceKaminoObligations",
      "discriminator": [
        166,
        110,
        234,
        179,
        240,
        179,
        69,
        246
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "kaminoLendingProgram",
          "address": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
        },
        {
          "name": "solOracle"
        },
        {
          "name": "glamConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                10,
                11,
                0,
                83,
                72,
                16,
                46,
                144,
                46,
                42,
                79,
                22,
                157,
                123,
                21,
                242,
                192,
                146,
                1,
                78,
                88,
                59,
                102,
                9,
                190,
                226,
                92,
                189,
                187,
                232,
                83,
                220
              ]
            }
          }
        },
        {
          "name": "pythOracle",
          "optional": true
        },
        {
          "name": "switchboardPriceOracle",
          "optional": true
        },
        {
          "name": "switchboardTwapOracle",
          "optional": true
        },
        {
          "name": "scopePrices",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "denom",
          "type": {
            "defined": {
              "name": "priceDenom"
            }
          }
        }
      ]
    },
    {
      "name": "priceKaminoVaultShares",
      "docs": [
        "Price Kamino vault shares.",
        "- `num_vaults` Number of kamino vaults to price.",
        "",
        "Extra accounts for pricing N kamino vault shares:",
        "- (kvault_share_ata, kvault_share_mint, kvault_state, kvault_deposit_token_oracle) x N",
        "- reserve x M",
        "- M = number of reserves used by all kvaults' allocations",
        "- reserve pubkeys must follow the same order of reserves used by each allocation"
      ],
      "discriminator": [
        112,
        92,
        238,
        224,
        145,
        105,
        38,
        249
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "solOracle"
        },
        {
          "name": "glamConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                10,
                11,
                0,
                83,
                72,
                16,
                46,
                144,
                46,
                42,
                79,
                22,
                157,
                123,
                21,
                242,
                192,
                146,
                1,
                78,
                88,
                59,
                102,
                9,
                190,
                226,
                92,
                189,
                187,
                232,
                83,
                220
              ]
            }
          }
        }
      ],
      "args": [
        {
          "name": "denom",
          "type": {
            "defined": {
              "name": "priceDenom"
            }
          }
        },
        {
          "name": "numVaults",
          "type": "u8"
        }
      ]
    },
    {
      "name": "priceStakeAccounts",
      "discriminator": [
        119,
        137,
        9,
        15,
        196,
        73,
        30,
        27
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "solOracle"
        },
        {
          "name": "glamConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                10,
                11,
                0,
                83,
                72,
                16,
                46,
                144,
                46,
                42,
                79,
                22,
                157,
                123,
                21,
                242,
                192,
                146,
                1,
                78,
                88,
                59,
                102,
                9,
                190,
                226,
                92,
                189,
                187,
                232,
                83,
                220
              ]
            }
          }
        }
      ],
      "args": [
        {
          "name": "denom",
          "type": {
            "defined": {
              "name": "priceDenom"
            }
          }
        }
      ]
    },
    {
      "name": "priceVaultTokens",
      "docs": [
        "Price vault SOL balance and tokens it holds.",
        "",
        "Extra accounts for pricing N tokens:",
        "- (ata, mint, oracle) x N"
      ],
      "discriminator": [
        54,
        42,
        16,
        199,
        20,
        183,
        50,
        137
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "solOracle"
        },
        {
          "name": "glamConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                10,
                11,
                0,
                83,
                72,
                16,
                46,
                144,
                46,
                42,
                79,
                22,
                157,
                123,
                21,
                242,
                192,
                146,
                1,
                78,
                88,
                59,
                102,
                9,
                190,
                226,
                92,
                189,
                187,
                232,
                83,
                220
              ]
            }
          }
        }
      ],
      "args": [
        {
          "name": "denom",
          "type": {
            "defined": {
              "name": "priceDenom"
            }
          }
        }
      ]
    },
    {
      "name": "setJupiterSwapPolicy",
      "discriminator": [
        189,
        182,
        227,
        165,
        127,
        148,
        246,
        189
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "policy",
          "type": {
            "defined": {
              "name": "jupiterSwapPolicy"
            }
          }
        }
      ]
    },
    {
      "name": "setProtocolPolicy",
      "discriminator": [
        37,
        99,
        61,
        122,
        227,
        102,
        182,
        180
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "integrationProgram",
          "type": "pubkey"
        },
        {
          "name": "protocolBitflag",
          "type": "u16"
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "stakeAuthorize",
      "docs": [
        "Out-of-scope for audit"
      ],
      "discriminator": [
        127,
        247,
        88,
        164,
        201,
        0,
        79,
        7
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "stake",
          "writable": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        },
        {
          "name": "stakerOrWithdrawer",
          "type": "u32"
        }
      ]
    },
    {
      "name": "stakeDeactivate",
      "docs": [
        "Out-of-scope for audit"
      ],
      "discriminator": [
        224,
        10,
        93,
        175,
        175,
        145,
        237,
        169
      ],
      "accounts": [
        {
          "name": "glamState"
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "stake",
          "writable": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "stakeDelegateStake",
      "docs": [
        "Out-of-scope for audit"
      ],
      "discriminator": [
        202,
        40,
        152,
        239,
        175,
        251,
        66,
        228
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "stake",
          "writable": true
        },
        {
          "name": "vote"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "stakeHistory",
          "address": "SysvarStakeHistory1111111111111111111111111"
        },
        {
          "name": "stakeConfig"
        }
      ],
      "args": []
    },
    {
      "name": "stakeInitialize",
      "docs": [
        "Out-of-scope for audit"
      ],
      "discriminator": [
        68,
        66,
        118,
        79,
        15,
        144,
        190,
        190
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "stake",
          "writable": true
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "stakeMerge",
      "docs": [
        "Out-of-scope for audit"
      ],
      "discriminator": [
        46,
        181,
        125,
        12,
        51,
        179,
        134,
        176
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "destinationStake",
          "writable": true
        },
        {
          "name": "sourceStake",
          "writable": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "stakeHistory",
          "address": "SysvarStakeHistory1111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "stakeRedelegate",
      "docs": [
        "Out-of-scope for audit"
      ],
      "discriminator": [
        134,
        227,
        164,
        247,
        120,
        0,
        225,
        174
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "stake",
          "writable": true
        },
        {
          "name": "newStake",
          "writable": true
        },
        {
          "name": "vote"
        },
        {
          "name": "stakeConfig"
        }
      ],
      "args": []
    },
    {
      "name": "stakeSplit",
      "docs": [
        "Out-of-scope for audit"
      ],
      "discriminator": [
        63,
        128,
        169,
        206,
        158,
        60,
        135,
        48
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "stake",
          "writable": true
        },
        {
          "name": "splitStake",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakeWithdraw",
      "docs": [
        "Out-of-scope for audit"
      ],
      "discriminator": [
        199,
        13,
        168,
        20,
        92,
        151,
        29,
        56
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "stake",
          "writable": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "stakeHistory",
          "address": "SysvarStakeHistory1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "systemTransfer",
      "discriminator": [
        167,
        164,
        195,
        155,
        219,
        152,
        191,
        230
      ],
      "accounts": [
        {
          "name": "glamState"
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "to",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "tokenTransferCheckedByMintAuthority",
      "docs": [
        "For glam mint program's use only"
      ],
      "discriminator": [
        37,
        131,
        188,
        85,
        45,
        183,
        8,
        81
      ],
      "accounts": [
        {
          "name": "glamState"
        },
        {
          "name": "glamVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "glamState"
              }
            ]
          }
        },
        {
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "glamMintAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "to",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "decimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "updateMintParams",
      "discriminator": [
        45,
        42,
        115,
        25,
        179,
        27,
        57,
        191
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "vec": {
              "defined": {
                "name": "engineField"
              }
            }
          }
        }
      ]
    },
    {
      "name": "updateMintParamsByMintAuthority",
      "docs": [
        "For glam mint program's use only"
      ],
      "discriminator": [
        94,
        160,
        55,
        53,
        175,
        225,
        62,
        118
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "glamMintAuthority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "vec": {
              "defined": {
                "name": "engineField"
              }
            }
          }
        }
      ]
    },
    {
      "name": "updateState",
      "discriminator": [
        135,
        112,
        215,
        75,
        247,
        185,
        53,
        176
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "state",
          "type": {
            "defined": {
              "name": "stateModel"
            }
          }
        }
      ]
    },
    {
      "name": "updateStateApplyTimelock",
      "discriminator": [
        66,
        12,
        138,
        80,
        133,
        85,
        46,
        220
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "globalConfig",
      "discriminator": [
        149,
        8,
        156,
        202,
        160,
        252,
        176,
        217
      ]
    },
    {
      "name": "stateAccount",
      "discriminator": [
        142,
        247,
        54,
        95,
        85,
        133,
        249,
        103
      ]
    }
  ],
  "errors": [
    {
      "code": 48000,
      "name": "unauthorizedSigner",
      "msg": "Signer is not authorized"
    },
    {
      "code": 48001,
      "name": "unauthorizedIntegrationProgram",
      "msg": "Integration program is not authorized"
    },
    {
      "code": 48002,
      "name": "integrationDisabled",
      "msg": "Integration is disabled"
    },
    {
      "code": 48003,
      "name": "glamStateDisabled",
      "msg": "GLAM state is disabled"
    },
    {
      "code": 48004,
      "name": "invalidSignerAccount",
      "msg": "Invalid signer token account"
    },
    {
      "code": 48005,
      "name": "emergencyUpdateDenied",
      "msg": "Emergency update denied"
    },
    {
      "code": 48006,
      "name": "timelockStillActive",
      "msg": "Timelock still active"
    },
    {
      "code": 48007,
      "name": "cannotApplyChanges",
      "msg": "Pending changes cannot be applied due to unfulfilled subscriptions or redemptions"
    },
    {
      "code": 48008,
      "name": "assetNotBorrowable",
      "msg": "Asset is not allowed to borrow"
    },
    {
      "code": 48009,
      "name": "invalidAccountOwner",
      "msg": "Account owned by an invalid program"
    },
    {
      "code": 48010,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 49000,
      "name": "invalidAccountType",
      "msg": "Invalid account type"
    },
    {
      "code": 49001,
      "name": "invalidName",
      "msg": "Invalid name"
    },
    {
      "code": 49002,
      "name": "invalidSymbol",
      "msg": "Symbol too long: max 32 chars"
    },
    {
      "code": 49003,
      "name": "invalidUri",
      "msg": "Uri too long: max 128 chars"
    },
    {
      "code": 49004,
      "name": "invalidAssetsLen",
      "msg": "Too many assets: max 100"
    },
    {
      "code": 49005,
      "name": "glamMintNotFound",
      "msg": "Glam mint not found"
    },
    {
      "code": 49006,
      "name": "cannotCloseState",
      "msg": "Glam state cannot be closed, all mints must be closed first"
    },
    {
      "code": 49007,
      "name": "invalidMintParams",
      "msg": "Invalid mint params"
    },
    {
      "code": 49008,
      "name": "invalidRemainingAccounts",
      "msg": "Invalid accounts: the transaction is malformed"
    },
    {
      "code": 49009,
      "name": "invalidVaultTokenAccount",
      "msg": "Invalid vault ata"
    },
    {
      "code": 49010,
      "name": "nonZeroSupply",
      "msg": "Glam mint supply not zero"
    },
    {
      "code": 49011,
      "name": "missingAccount",
      "msg": "An account required by the instruction is missing"
    },
    {
      "code": 49012,
      "name": "invalidTimestamp",
      "msg": "Invalid timestamp"
    },
    {
      "code": 49013,
      "name": "engineFieldNotFound",
      "msg": "Engine field not found"
    },
    {
      "code": 49014,
      "name": "invalidBaseAsset",
      "msg": "Invalid base asset"
    },
    {
      "code": 49015,
      "name": "invalidProtocolBits",
      "msg": "Invalid protocol bits"
    },
    {
      "code": 50000,
      "name": "withdrawDenied",
      "msg": "Withdraw denied. Only vaults allow withdraws (funds and mints don't)"
    },
    {
      "code": 50001,
      "name": "invalidAssetForSwap",
      "msg": "Asset cannot be swapped"
    },
    {
      "code": 50002,
      "name": "unsupportedSwapIx",
      "msg": "Unsupported swap instruction"
    },
    {
      "code": 50003,
      "name": "slippageLimitExceeded",
      "msg": "Max slippage exceeded"
    },
    {
      "code": 50004,
      "name": "invalidPlatformFeeForSwap",
      "msg": "Invalid platform fee"
    },
    {
      "code": 50005,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 50006,
      "name": "invalidVoteSide",
      "msg": "Invalid vote side"
    },
    {
      "code": 50007,
      "name": "multipleStakeAccountsDisallowed",
      "msg": "Multiple stake accounts disallowed"
    },
    {
      "code": 51000,
      "name": "invalidAssetPrice",
      "msg": "Invalid asset price"
    },
    {
      "code": 51001,
      "name": "invalidStableCoinPriceForSubscribe",
      "msg": "Subscription not allowed: invalid stable coin price"
    },
    {
      "code": 51100,
      "name": "invalidPricingOracle",
      "msg": "Invalid oracle for asset price"
    },
    {
      "code": 51101,
      "name": "pricingError",
      "msg": "Pricing error"
    },
    {
      "code": 51102,
      "name": "priceTooOld",
      "msg": "Price is too old"
    },
    {
      "code": 51103,
      "name": "externalPositionsNotPriced",
      "msg": "Not all external vault accounts are priced"
    },
    {
      "code": 51104,
      "name": "vaultAssetsNotPriced",
      "msg": "Not all vault assets are priced"
    },
    {
      "code": 51105,
      "name": "vaultNotPriced",
      "msg": "No priced assets found"
    },
    {
      "code": 51106,
      "name": "positiveAumRequired",
      "msg": "AUM must be positive"
    },
    {
      "code": 51107,
      "name": "mathError",
      "msg": "Math error"
    },
    {
      "code": 51108,
      "name": "typeCastingError",
      "msg": "Type casting error"
    },
    {
      "code": 51109,
      "name": "baseAssetNotSupported",
      "msg": "Base asset must have 6 decimals."
    },
    {
      "code": 51110,
      "name": "invalidQuoteSpotMarket",
      "msg": "Unsupported spot market for perp quotes"
    },
    {
      "code": 51111,
      "name": "unknownExternalVaultAsset",
      "msg": "Unknown external vault account"
    },
    {
      "code": 51112,
      "name": "invalidPriceDenom",
      "msg": "Invalid price denom"
    },
    {
      "code": 51113,
      "name": "unexpectedDiscriminator",
      "msg": "Invalid account: discriminator mismatch"
    },
    {
      "code": 52000,
      "name": "transfersDisabled",
      "msg": "Policy violation: transfers disabled"
    },
    {
      "code": 52001,
      "name": "invalidPolicyAccount",
      "msg": "Policy account is mandatory"
    },
    {
      "code": 52002,
      "name": "amountTooBig",
      "msg": "Policy violation: amount too big"
    },
    {
      "code": 52003,
      "name": "lockUp",
      "msg": "Policy violation: lock-up has not expired"
    }
  ],
  "types": [
    {
      "name": "accountType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "vault"
          },
          {
            "name": "tokenizedVault"
          },
          {
            "name": "mint"
          }
        ]
      }
    },
    {
      "name": "accruedFees",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vaultSubscriptionFee",
            "type": "u128"
          },
          {
            "name": "vaultRedemptionFee",
            "type": "u128"
          },
          {
            "name": "managerSubscriptionFee",
            "type": "u128"
          },
          {
            "name": "managerRedemptionFee",
            "type": "u128"
          },
          {
            "name": "managementFee",
            "type": "u128"
          },
          {
            "name": "performanceFee",
            "type": "u128"
          },
          {
            "name": "protocolBaseFee",
            "type": "u128"
          },
          {
            "name": "protocolFlowFee",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "actionType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "addExternalAccount"
          },
          {
            "name": "deleteExternalAccount"
          },
          {
            "name": "addAsset"
          },
          {
            "name": "deleteAsset"
          },
          {
            "name": "refund"
          }
        ]
      }
    },
    {
      "name": "assetMeta",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "asset",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "oracle",
            "type": "pubkey"
          },
          {
            "name": "oracleSource",
            "type": {
              "defined": {
                "name": "oracleSource"
              }
            }
          },
          {
            "name": "maxAgeSeconds",
            "type": "u16"
          },
          {
            "name": "priority",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "createdModel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "createdBy",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "delegateAcl",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "integrationPermissions",
            "type": {
              "vec": {
                "defined": {
                  "name": "integrationPermissions"
                }
              }
            }
          },
          {
            "name": "expiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "emergencyAccessUpdateArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "disabledIntegrations",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "disabledDelegates",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "stateEnabled",
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "engineField",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "defined": {
                "name": "engineFieldName"
              }
            }
          },
          {
            "name": "value",
            "type": {
              "defined": {
                "name": "engineFieldValue"
              }
            }
          }
        ]
      }
    },
    {
      "name": "engineFieldName",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "owner"
          },
          {
            "name": "portfolioManagerName"
          },
          {
            "name": "name"
          },
          {
            "name": "uri"
          },
          {
            "name": "assets"
          },
          {
            "name": "delegateAcls"
          },
          {
            "name": "integrationAcls"
          },
          {
            "name": "timelockDuration"
          },
          {
            "name": "borrowable"
          },
          {
            "name": "defaultAccountStateFrozen"
          },
          {
            "name": "permanentDelegate"
          },
          {
            "name": "notifyAndSettle"
          },
          {
            "name": "feeStructure"
          },
          {
            "name": "feeParams"
          },
          {
            "name": "claimableFees"
          },
          {
            "name": "claimedFees"
          }
        ]
      }
    },
    {
      "name": "engineFieldValue",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "boolean",
            "fields": [
              {
                "name": "val",
                "type": "bool"
              }
            ]
          },
          {
            "name": "u8",
            "fields": [
              {
                "name": "val",
                "type": "u8"
              }
            ]
          },
          {
            "name": "u32",
            "fields": [
              {
                "name": "val",
                "type": "u32"
              }
            ]
          },
          {
            "name": "u64",
            "fields": [
              {
                "name": "val",
                "type": "u64"
              }
            ]
          },
          {
            "name": "string",
            "fields": [
              {
                "name": "val",
                "type": "string"
              }
            ]
          },
          {
            "name": "pubkey",
            "fields": [
              {
                "name": "val",
                "type": "pubkey"
              }
            ]
          },
          {
            "name": "vecPubkey",
            "fields": [
              {
                "name": "val",
                "type": {
                  "vec": "pubkey"
                }
              }
            ]
          },
          {
            "name": "vecU8",
            "fields": [
              {
                "name": "val",
                "type": "bytes"
              }
            ]
          },
          {
            "name": "vecU32",
            "fields": [
              {
                "name": "val",
                "type": {
                  "vec": "u32"
                }
              }
            ]
          },
          {
            "name": "vecDelegateAcl",
            "fields": [
              {
                "name": "val",
                "type": {
                  "vec": {
                    "defined": {
                      "name": "delegateAcl"
                    }
                  }
                }
              }
            ]
          },
          {
            "name": "vecIntegrationAcl",
            "fields": [
              {
                "name": "val",
                "type": {
                  "vec": {
                    "defined": {
                      "name": "integrationAcl"
                    }
                  }
                }
              }
            ]
          },
          {
            "name": "feeStructure",
            "fields": [
              {
                "name": "val",
                "type": {
                  "defined": {
                    "name": "feeStructure"
                  }
                }
              }
            ]
          },
          {
            "name": "feeParams",
            "fields": [
              {
                "name": "val",
                "type": {
                  "defined": {
                    "name": "feeParams"
                  }
                }
              }
            ]
          },
          {
            "name": "accruedFees",
            "fields": [
              {
                "name": "val",
                "type": {
                  "defined": {
                    "name": "accruedFees"
                  }
                }
              }
            ]
          },
          {
            "name": "notifyAndSettle",
            "fields": [
              {
                "name": "val",
                "type": {
                  "defined": {
                    "name": "notifyAndSettle"
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "entryExitFees",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subscriptionFeeBps",
            "type": "u16"
          },
          {
            "name": "redemptionFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "extraParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "actionType",
            "type": {
              "defined": {
                "name": "actionType"
              }
            }
          },
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "feeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "yearInSeconds",
            "type": "u32"
          },
          {
            "name": "paHighWaterMark",
            "type": "i128"
          },
          {
            "name": "paLastNav",
            "type": "i128"
          },
          {
            "name": "lastAum",
            "type": "i128"
          },
          {
            "name": "lastPerformanceFeeCrystallized",
            "type": "i64"
          },
          {
            "name": "lastManagementFeeCrystallized",
            "type": "i64"
          },
          {
            "name": "lastProtocolFeeCrystallized",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "feeStructure",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": {
              "defined": {
                "name": "entryExitFees"
              }
            }
          },
          {
            "name": "manager",
            "type": {
              "defined": {
                "name": "entryExitFees"
              }
            }
          },
          {
            "name": "management",
            "type": {
              "defined": {
                "name": "managementFee"
              }
            }
          },
          {
            "name": "performance",
            "type": {
              "defined": {
                "name": "performanceFee"
              }
            }
          },
          {
            "name": "protocol",
            "type": {
              "defined": {
                "name": "protocolFees"
              }
            }
          }
        ]
      }
    },
    {
      "name": "globalConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "The authority that can modify the config"
            ],
            "type": "pubkey"
          },
          {
            "name": "feeAuthority",
            "docs": [
              "The authority that can modify fee structure of individual glam state and claim protocol fees"
            ],
            "type": "pubkey"
          },
          {
            "name": "referrer",
            "type": "pubkey"
          },
          {
            "name": "baseFeeBps",
            "type": "u16"
          },
          {
            "name": "flowFeeBps",
            "type": "u16"
          },
          {
            "name": "assetMetas",
            "type": {
              "vec": {
                "defined": {
                  "name": "assetMeta"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "hurdleType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "hard"
          },
          {
            "name": "soft"
          }
        ]
      }
    },
    {
      "name": "integrationAcl",
      "docs": [
        "An integration program can have multiple protocols supported.",
        "Enabled protocols are stored in a bitmask, and each protocol can have its own policy."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "integrationProgram",
            "type": "pubkey"
          },
          {
            "name": "protocolsBitmask",
            "type": "u16"
          },
          {
            "name": "protocolPolicies",
            "type": {
              "vec": {
                "defined": {
                  "name": "protocolPolicy"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "integrationPermissions",
      "docs": [
        "Stores delegate permissions for an integration program."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "integrationProgram",
            "type": "pubkey"
          },
          {
            "name": "protocolPermissions",
            "type": {
              "vec": {
                "defined": {
                  "name": "protocolPermissions"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "jupiterSwapPolicy",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maxSlippageBps",
            "type": "u16"
          },
          {
            "name": "swapAllowlist",
            "type": {
              "option": {
                "vec": "pubkey"
              }
            }
          }
        ]
      }
    },
    {
      "name": "managementFee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "noticePeriodType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "hard"
          },
          {
            "name": "soft"
          }
        ]
      }
    },
    {
      "name": "notifyAndSettle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "model",
            "type": {
              "defined": {
                "name": "valuationModel"
              }
            }
          },
          {
            "name": "permissionlessFulfillment",
            "type": "bool"
          },
          {
            "name": "subscribeNoticePeriodType",
            "type": {
              "defined": {
                "name": "noticePeriodType"
              }
            }
          },
          {
            "name": "subscribeNoticePeriod",
            "type": "u64"
          },
          {
            "name": "subscribeSettlementPeriod",
            "type": "u64"
          },
          {
            "name": "subscribeCancellationWindow",
            "type": "u64"
          },
          {
            "name": "redeemNoticePeriodType",
            "type": {
              "defined": {
                "name": "noticePeriodType"
              }
            }
          },
          {
            "name": "redeemNoticePeriod",
            "type": "u64"
          },
          {
            "name": "redeemSettlementPeriod",
            "type": "u64"
          },
          {
            "name": "redeemCancellationWindow",
            "type": "u64"
          },
          {
            "name": "timeUnit",
            "type": {
              "defined": {
                "name": "timeUnit"
              }
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "oracleSource",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pyth"
          },
          {
            "name": "switchboard"
          },
          {
            "name": "quoteAsset"
          },
          {
            "name": "pyth1K"
          },
          {
            "name": "pyth1M"
          },
          {
            "name": "pythStableCoin"
          },
          {
            "name": "prelaunch"
          },
          {
            "name": "pythPull"
          },
          {
            "name": "pyth1KPull"
          },
          {
            "name": "pyth1MPull"
          },
          {
            "name": "pythStableCoinPull"
          },
          {
            "name": "switchboardOnDemand"
          },
          {
            "name": "pythLazer"
          },
          {
            "name": "pythLazer1K"
          },
          {
            "name": "pythLazer1M"
          },
          {
            "name": "pythLazerStableCoin"
          },
          {
            "name": "notSet"
          },
          {
            "name": "lstPoolState"
          },
          {
            "name": "marinadeState"
          },
          {
            "name": "baseAsset"
          },
          {
            "name": "chainlinkRwa"
          }
        ]
      }
    },
    {
      "name": "performanceFee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "hurdleRateBps",
            "type": "u16"
          },
          {
            "name": "hurdleType",
            "type": {
              "defined": {
                "name": "hurdleType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "priceDenom",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "sol"
          },
          {
            "name": "usd"
          },
          {
            "name": "asset6"
          }
        ]
      }
    },
    {
      "name": "pricedProtocol",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "denom",
            "type": {
              "defined": {
                "name": "priceDenom"
              }
            }
          },
          {
            "name": "rent",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "i128"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "lastUpdatedSlot",
            "type": "u64"
          },
          {
            "name": "integrationProgram",
            "type": "pubkey"
          },
          {
            "name": "protocolBitflag",
            "type": "u16"
          },
          {
            "name": "positions",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "protocolFees",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseFeeBps",
            "type": "u16"
          },
          {
            "name": "flowFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "protocolPermissions",
      "docs": [
        "Represents a delegate's permissions for a specific protocol"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "protocolBitflag",
            "type": "u16"
          },
          {
            "name": "permissionsBitmask",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "protocolPolicy",
      "docs": [
        "Stores policy data for an integrated protocol.",
        "Integration programs serialize/deserialize this data."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "protocolBitflag",
            "type": "u16"
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "stateAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountType",
            "type": {
              "defined": {
                "name": "accountType"
              }
            }
          },
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "portfolioManagerName",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "created",
            "type": {
              "defined": {
                "name": "createdModel"
              }
            }
          },
          {
            "name": "baseAssetMint",
            "type": "pubkey"
          },
          {
            "name": "baseAssetTokenProgram",
            "type": "u8"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "timelockDuration",
            "type": "u32"
          },
          {
            "name": "timelockExpiresAt",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "assets",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "borrowable",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "integrationAcls",
            "type": {
              "vec": {
                "defined": {
                  "name": "integrationAcl"
                }
              }
            }
          },
          {
            "name": "delegateAcls",
            "type": {
              "vec": {
                "defined": {
                  "name": "delegateAcl"
                }
              }
            }
          },
          {
            "name": "externalPositions",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "pricedProtocols",
            "type": {
              "vec": {
                "defined": {
                  "name": "pricedProtocol"
                }
              }
            }
          },
          {
            "name": "params",
            "type": {
              "vec": {
                "vec": {
                  "defined": {
                    "name": "engineField"
                  }
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "stateModel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountType",
            "type": {
              "option": {
                "defined": {
                  "name": "accountType"
                }
              }
            }
          },
          {
            "name": "name",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "uri",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "enabled",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "assets",
            "type": {
              "option": {
                "vec": "pubkey"
              }
            }
          },
          {
            "name": "baseAssetMint",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "baseAssetTokenProgram",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "created",
            "type": {
              "option": {
                "defined": {
                  "name": "createdModel"
                }
              }
            }
          },
          {
            "name": "owner",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "portfolioManagerName",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "borrowable",
            "type": {
              "option": {
                "vec": "pubkey"
              }
            }
          },
          {
            "name": "timelockDuration",
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "integrationAcls",
            "type": {
              "option": {
                "vec": {
                  "defined": {
                    "name": "integrationAcl"
                  }
                }
              }
            }
          },
          {
            "name": "delegateAcls",
            "type": {
              "option": {
                "vec": {
                  "defined": {
                    "name": "delegateAcl"
                  }
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "timeUnit",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "second"
          },
          {
            "name": "slot"
          }
        ]
      }
    },
    {
      "name": "valuationModel",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "continuous"
          },
          {
            "name": "periodic"
          }
        ]
      }
    }
  ]
};
