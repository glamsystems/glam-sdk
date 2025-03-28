/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/glam_protocol.json`.
 */
export type GlamProtocol = {
  "address": "GLAMbTqav9N9witRjswJ8enwp9vv5G8bsSJ2kPJ4rcyc",
  "metadata": {
    "name": "glamProtocol",
    "version": "0.4.11",
    "spec": "0.1.0",
    "description": "Glam Protocol"
  },
  "instructions": [
    {
      "name": "addMint",
      "docs": [
        "Adds a new mint.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `mint_model`: An instance of `MintModel` containing the metadata for the new mint.",
        "",
        "# Permission required",
        "- Owner only, delegates not allowed"
      ],
      "discriminator": [
        171,
        222,
        111,
        37,
        60,
        166,
        208,
        108
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
          "name": "newMint",
          "writable": true
        },
        {
          "name": "extraMetasAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "openfundsMetadata",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "transferHookProgram",
          "address": "hookVGUczspowK3A8KX5hqdMFKeZwKGMWDuvPjLvgLy"
        }
      ],
      "args": [
        {
          "name": "mintModel",
          "type": {
            "defined": {
              "name": "mintModel"
            }
          }
        }
      ]
    },
    {
      "name": "burnTokens",
      "docs": [
        "Burns a specified amount of tokens for the given mint.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `mint_id`: The id of the mint to burn tokens for.",
        "- `amount`: The amount of tokens to burn.",
        "",
        "# Permission required",
        "- Permission::BurnTokens",
        "",
        "# Integration required",
        "- Integration::Mint"
      ],
      "discriminator": [
        76,
        15,
        51,
        254,
        229,
        215,
        121,
        66
      ],
      "accounts": [
        {
          "name": "glamState"
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "fromAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "from"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "from"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamEscrow",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
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
          "name": "asset"
        },
        {
          "name": "signerAssetAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "asset"
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
          "name": "escrowAssetAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamEscrow"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "asset"
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        }
      ]
    },
    {
      "name": "closeMint",
      "docs": [
        "Closes a mint and releases its resources.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `mint_id`: The id of the mint to be closed.",
        "",
        "# Permission required",
        "- Owner only, delegates not allowed"
      ],
      "discriminator": [
        149,
        251,
        157,
        212,
        65,
        181,
        235,
        129
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
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "metadata",
          "docs": [
            "FIXME: close transfer hook extra metas account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
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
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        }
      ]
    },
    {
      "name": "closeState",
      "docs": [
        "Closes a state account and releases its resources.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Owner only, delegates not allowed"
      ],
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
          "name": "metadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "crystallizeFees",
      "discriminator": [
        78,
        0,
        111,
        26,
        7,
        12,
        41,
        249
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamEscrow",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
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
          "name": "escrowMintAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamEscrow"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        }
      ]
    },
    {
      "name": "driftBalanceValueUsd",
      "docs": [
        "Gets the balance value of a user's positions in USD.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        152,
        248,
        238,
        80,
        92,
        122,
        40,
        131
      ],
      "accounts": [
        {
          "name": "glamState"
        },
        {
          "name": "glamVault"
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "state"
        },
        {
          "name": "user"
        },
        {
          "name": "userStats"
        }
      ],
      "args": []
    },
    {
      "name": "driftCancelOrders",
      "docs": [
        "Cancels drift orders.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `market_type`: The type of market (spot or perp) to cancel orders for.",
        "- `market_index`: The index of the market to cancel orders for.",
        "- `direction`: The direction of orders to cancel (long or short).",
        "",
        "# Permission required",
        "- Permission::DriftCancelOrders",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        98,
        107,
        48,
        79,
        97,
        60,
        99,
        58
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "state"
        },
        {
          "name": "user",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "marketType",
          "type": {
            "option": {
              "defined": {
                "name": "marketType"
              }
            }
          }
        },
        {
          "name": "marketIndex",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "direction",
          "type": {
            "option": {
              "defined": {
                "name": "positionDirection"
              }
            }
          }
        }
      ]
    },
    {
      "name": "driftCancelOrdersByIds",
      "docs": [
        "Cancels drift orders by order IDs.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `order_ids`: A list of order IDs.",
        "",
        "# Permission required",
        "- Permission::DriftCancelOrders",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        172,
        99,
        108,
        14,
        81,
        89,
        228,
        183
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "state"
        },
        {
          "name": "user",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "orderIds",
          "type": {
            "vec": "u32"
          }
        }
      ]
    },
    {
      "name": "driftDeleteUser",
      "docs": [
        "Deletes a drift user (sub account).",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::DriftDeleteUser",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        179,
        118,
        20,
        212,
        145,
        146,
        49,
        130
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
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "userStats",
          "writable": true
        },
        {
          "name": "state",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "driftDeposit",
      "docs": [
        "Deposits to drift.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `market_index`: Index of the drift spot market.",
        "- `amount`: Amount of asset to deposit.",
        "",
        "# Permission required",
        "- Permission::DriftDeposit",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        252,
        63,
        250,
        201,
        98,
        55,
        130,
        12
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
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "state"
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "userStats",
          "writable": true
        },
        {
          "name": "spotMarketVault",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "marketIndex",
          "type": "u16"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "reduceOnly",
          "type": "bool"
        }
      ]
    },
    {
      "name": "driftInitializeUser",
      "discriminator": [
        107,
        244,
        158,
        15,
        225,
        239,
        98,
        245
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "userStats",
          "writable": true
        },
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
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
      "args": [
        {
          "name": "subAccountId",
          "type": "u16"
        },
        {
          "name": "name",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "driftInitializeUserStats",
      "docs": [
        "Initializes a drift account owned by vault and creates a subaccount.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::DriftInitialize",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        133,
        185,
        103,
        162,
        90,
        161,
        78,
        143
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "userStats",
          "writable": true
        },
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
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
      "name": "driftModifyOrder",
      "docs": [
        "Modifies an existing drift order.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `order_id`: The ID of the order to modify.",
        "- `modify_order_params`: The parameters to modify the order with.",
        "",
        "# Permission required",
        "- Permission::DriftModifyOrder",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        235,
        245,
        222,
        58,
        245,
        128,
        19,
        202
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "state"
        },
        {
          "name": "user",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "orderId",
          "type": {
            "option": "u32"
          }
        },
        {
          "name": "modifyOrderParams",
          "type": {
            "defined": {
              "name": "modifyOrderParams"
            }
          }
        }
      ]
    },
    {
      "name": "driftPlaceOrders",
      "docs": [
        "Places orders on drift.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `params`: A list of orders.",
        "",
        "# Permissions required",
        "- Permission::DriftPlaceOrders",
        "- Additional permission Permission::DriftSpotMarket or Permission::DriftPerpMarket is required depending on market type.",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        117,
        18,
        210,
        6,
        238,
        174,
        135,
        167
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
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "state"
        },
        {
          "name": "user",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "vec": {
              "defined": {
                "name": "orderParams"
              }
            }
          }
        }
      ]
    },
    {
      "name": "driftUpdateUserCustomMarginRatio",
      "docs": [
        "Updates custom margin ratio.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `sub_account_id`: Sub account.",
        "- `margin_ratio`: Margin ratio.",
        "",
        "# Permission required",
        "- Permission::DriftUpdateUser",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        4,
        47,
        193,
        177,
        128,
        62,
        228,
        14
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "user",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "subAccountId",
          "type": "u16"
        },
        {
          "name": "marginRatio",
          "type": "u32"
        }
      ]
    },
    {
      "name": "driftUpdateUserDelegate",
      "docs": [
        "Sets a delegate on the specified sub account.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `sub_account_id`: Sub account.",
        "- `delegate`: Delegate's wallet address.",
        "",
        "# Permission required",
        "- Permission::DriftUpdateUser",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        36,
        181,
        34,
        31,
        22,
        77,
        36,
        154
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "user",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "subAccountId",
          "type": "u16"
        },
        {
          "name": "delegate",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "driftUpdateUserMarginTradingEnabled",
      "docs": [
        "Enables/Disables margin trading.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `sub_account_id`: Sub account.",
        "- `margin_trading_enabled`: Whether to enable or disable margin trading.",
        "",
        "# Permission required",
        "- Permission::DriftUpdateUser",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        157,
        175,
        12,
        19,
        202,
        114,
        17,
        36
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "user",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "subAccountId",
          "type": "u16"
        },
        {
          "name": "marginTradingEnabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "driftWithdraw",
      "docs": [
        "Withdraws from drift.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `market_index`: Index of the drift spot market.",
        "- `amount`: Amount to withdraw.",
        "",
        "# Permission required",
        "- Permission::DriftWithdraw",
        "",
        "# Integration required",
        "- Integration::Drift"
      ],
      "discriminator": [
        86,
        59,
        186,
        123,
        183,
        181,
        234,
        137
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
          "address": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
        },
        {
          "name": "state"
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "userStats",
          "writable": true
        },
        {
          "name": "spotMarketVault",
          "writable": true
        },
        {
          "name": "driftSigner"
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "marketIndex",
          "type": "u16"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "reduceOnly",
          "type": "bool"
        }
      ]
    },
    {
      "name": "forceTransferTokens",
      "docs": [
        "Forcefully transfers a specified amount of tokens from one account to another.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `mint_id`: The id of the mint to transfer tokens for.",
        "- `amount`: The amount of tokens to transfer.",
        "",
        "# Permission required",
        "- Permission::ForceTransferTokens",
        "",
        "# Integration required",
        "- Integration::Mint"
      ],
      "discriminator": [
        185,
        34,
        78,
        211,
        192,
        13,
        160,
        37
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
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "fromAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "from"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "toAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "to"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "from"
        },
        {
          "name": "to"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "fulfill",
      "discriminator": [
        143,
        2,
        52,
        206,
        174,
        164,
        247,
        72
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
          "name": "glamEscrow",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
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
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrowMintAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamEscrow"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "asset"
        },
        {
          "name": "vaultAssetAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "asset"
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
          "name": "escrowAssetAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamEscrow"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "asset"
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initializeState",
      "docs": [
        "Initializes a state account from the provided StateModel instance.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `state`: An instance of `StateModel` containing the details of the state to be initialized.",
        "",
        "# Permission required",
        "- Owner only, delegates not allowed"
      ],
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
          "name": "openfundsMetadata",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "name": "jupiterGovNewVote",
      "docs": [
        "Creates a new vote.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::VoteOnProposal",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        235,
        179,
        170,
        64,
        64,
        57,
        17,
        69
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "GovaE4iu227srtG2s3tZzB4RmWBzw8sTwrCLZz7kN7rY"
        },
        {
          "name": "proposal"
        },
        {
          "name": "vote",
          "writable": true
        },
        {
          "name": "payer",
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
          "name": "voter",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "jupiterSetMaxSwapSlippage",
      "docs": [
        "Sets the max swap slippage.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `slippage`: The maximum allowed slippage in basis points.",
        "",
        "# Permission required",
        "- Owner only, delegates not allowed"
      ],
      "discriminator": [
        110,
        79,
        13,
        71,
        208,
        111,
        56,
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
          "name": "slippage",
          "type": "u64"
        }
      ]
    },
    {
      "name": "jupiterSwap",
      "docs": [
        "Swaps assets using Jupiter.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `data`: The serialized Jupiter route data containing swap instructions and parameters.",
        "",
        "# Permission required",
        "- Any of",
        "- Permission::JupiterSwapAny: no restrictions.",
        "- Permission::JupiterSwapAllowlisted: input and output are in the assets allowlist.",
        "- Permission::JupiterSwapLst: input and output assets are both LST.",
        "",
        "# Integration required",
        "- Integration::JupiterSwap"
      ],
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
      "name": "jupiterVoteCastVote",
      "docs": [
        "Casts a vote.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `side`: The side to vote for.",
        "",
        "# Permission required",
        "- Permission::VoteOnProposal",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        11,
        197,
        234,
        57,
        164,
        74,
        181,
        239
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
        },
        {
          "name": "locker"
        },
        {
          "name": "escrow"
        },
        {
          "name": "proposal",
          "writable": true
        },
        {
          "name": "vote",
          "writable": true
        },
        {
          "name": "governor"
        },
        {
          "name": "governProgram"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": "u8"
        }
      ]
    },
    {
      "name": "jupiterVoteCastVoteChecked",
      "docs": [
        "Casts a vote, only if expected_side is already recorded.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `side`: The side to vote for.",
        "- `expected_side`: The expected side to check in the Vote account.",
        "",
        "# Permission required",
        "- Permission::VoteOnProposal",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        247,
        3,
        146,
        233,
        35,
        189,
        192,
        187
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
        },
        {
          "name": "locker"
        },
        {
          "name": "escrow"
        },
        {
          "name": "proposal",
          "writable": true
        },
        {
          "name": "vote",
          "writable": true
        },
        {
          "name": "governor"
        },
        {
          "name": "governProgram"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": "u8"
        },
        {
          "name": "expectedSide",
          "type": "u8"
        }
      ]
    },
    {
      "name": "jupiterVoteIncreaseLockedAmount",
      "docs": [
        "Increases the locked amount (aka stakes JUP).",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `amount`: The amount of JUP to stake.",
        "",
        "# Permission required",
        "- Permission::StakeJup",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        225,
        38,
        201,
        123,
        148,
        23,
        47,
        128
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
          "address": "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
        },
        {
          "name": "locker",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "escrowTokens",
          "writable": true
        },
        {
          "name": "sourceTokens",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "jupiterVoteMergePartialUnstaking",
      "docs": [
        "Merges partial unstaking.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::UnstakeJup",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        93,
        226,
        122,
        120,
        130,
        35,
        189,
        208
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
        },
        {
          "name": "locker",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "partialUnstake",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "jupiterVoteNewEscrow",
      "docs": [
        "Initializes a locked voter escrow.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::StakeJup",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        255,
        87,
        157,
        219,
        61,
        178,
        144,
        159
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
        },
        {
          "name": "locker",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "payer",
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
      "name": "jupiterVoteOpenPartialUnstaking",
      "docs": [
        "Partially unstakes JUP.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `amount`: The amount of JUP to partially unstake.",
        "- `memo`: The memo for the partial unstaking.",
        "",
        "# Permission required",
        "- Permission::UnstakeJup",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        84,
        7,
        113,
        220,
        212,
        63,
        237,
        218
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
        },
        {
          "name": "locker",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "partialUnstake",
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
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "memo",
          "type": "string"
        }
      ]
    },
    {
      "name": "jupiterVoteToggleMaxLock",
      "docs": [
        "Toggles max lock.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `is_max_lock`: true to allow staking, false to initiate full unstaking.",
        "",
        "# Permission required",
        "- Permission::StakeJup (if is_max_lock == true)",
        "- Permission::UnstakeJup (if is_max_lock == false)",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        204,
        158,
        192,
        21,
        219,
        25,
        154,
        87
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
        },
        {
          "name": "locker"
        },
        {
          "name": "escrow",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "isMaxLock",
          "type": "bool"
        }
      ]
    },
    {
      "name": "jupiterVoteWithdraw",
      "docs": [
        "Withdraws all unstaked JUP.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::UnstakeJup",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        195,
        172,
        184,
        195,
        23,
        178,
        145,
        191
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
          "address": "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
        },
        {
          "name": "locker",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "escrowTokens",
          "writable": true
        },
        {
          "name": "destinationTokens",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "jupiterVoteWithdrawPartialUnstaking",
      "docs": [
        "Withdraws JUP from partial unstaking.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::UnstakeJup",
        "",
        "# Integration required",
        "- Integration::JupiterVote"
      ],
      "discriminator": [
        109,
        98,
        65,
        252,
        184,
        0,
        216,
        240
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
          "address": "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj"
        },
        {
          "name": "locker",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "partialUnstake",
          "writable": true
        },
        {
          "name": "escrowTokens",
          "writable": true
        },
        {
          "name": "destinationTokens",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "kaminoLendingBorrowObligationLiquidityV2",
      "discriminator": [
        175,
        198,
        39,
        162,
        103,
        76,
        51,
        121
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
          "address": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "borrowReserve",
          "writable": true
        },
        {
          "name": "borrowReserveLiquidityMint"
        },
        {
          "name": "reserveSourceLiquidity",
          "writable": true
        },
        {
          "name": "borrowReserveLiquidityFeeReceiver",
          "writable": true
        },
        {
          "name": "userDestinationLiquidity",
          "writable": true
        },
        {
          "name": "referrerTokenState",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        },
        {
          "name": "obligationFarmUserState",
          "writable": true
        },
        {
          "name": "reserveFarmState",
          "writable": true
        },
        {
          "name": "farmsProgram"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "kaminoLendingDepositReserveLiquidityAndObligationCollateralV2",
      "discriminator": [
        93,
        120,
        106,
        112,
        40,
        45,
        84,
        32
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
          "address": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint"
        },
        {
          "name": "reserveLiquiditySupply",
          "writable": true
        },
        {
          "name": "reserveCollateralMint",
          "writable": true
        },
        {
          "name": "reserveDestinationDepositCollateral",
          "writable": true
        },
        {
          "name": "userSourceLiquidity",
          "writable": true
        },
        {
          "name": "placeholderUserDestinationCollateral"
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "liquidityTokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        },
        {
          "name": "obligationFarmUserState",
          "writable": true
        },
        {
          "name": "reserveFarmState",
          "writable": true
        },
        {
          "name": "farmsProgram"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "kaminoLendingInitObligation",
      "discriminator": [
        219,
        210,
        134,
        64,
        155,
        49,
        137,
        174
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "seed1Account"
        },
        {
          "name": "seed2Account"
        },
        {
          "name": "ownerUserMetadata"
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
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initObligationArgs"
            }
          }
        }
      ]
    },
    {
      "name": "kaminoLendingInitObligationFarmsForReserve",
      "discriminator": [
        227,
        61,
        130,
        2,
        117,
        226,
        78,
        1
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "reserveFarmState",
          "writable": true
        },
        {
          "name": "obligationFarm",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "farmsProgram"
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
      "args": [
        {
          "name": "mode",
          "type": "u8"
        }
      ]
    },
    {
      "name": "kaminoLendingInitUserMetadata",
      "discriminator": [
        200,
        95,
        140,
        132,
        190,
        65,
        17,
        161
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
        },
        {
          "name": "feePayer",
          "writable": true,
          "signer": true
        },
        {
          "name": "userMetadata",
          "writable": true
        },
        {
          "name": "referrerUserMetadata"
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
      "args": [
        {
          "name": "userLookupTable",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "kaminoLendingRepayObligationLiquidityV2",
      "discriminator": [
        135,
        57,
        236,
        69,
        153,
        77,
        15,
        88
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
          "address": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "repayReserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint"
        },
        {
          "name": "reserveDestinationLiquidity",
          "writable": true
        },
        {
          "name": "userSourceLiquidity",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        },
        {
          "name": "obligationFarmUserState",
          "writable": true
        },
        {
          "name": "reserveFarmState",
          "writable": true
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "farmsProgram"
        }
      ],
      "args": [
        {
          "name": "liquidityAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "kaminoLendingWithdrawObligationCollateralAndRedeemReserveCollateralV2",
      "discriminator": [
        249,
        60,
        252,
        239,
        136,
        53,
        181,
        3
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
          "address": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD"
        },
        {
          "name": "obligation",
          "writable": true
        },
        {
          "name": "lendingMarket"
        },
        {
          "name": "lendingMarketAuthority"
        },
        {
          "name": "withdrawReserve",
          "writable": true
        },
        {
          "name": "reserveLiquidityMint"
        },
        {
          "name": "reserveSourceCollateral",
          "writable": true
        },
        {
          "name": "reserveCollateralMint",
          "writable": true
        },
        {
          "name": "reserveLiquiditySupply",
          "writable": true
        },
        {
          "name": "userDestinationLiquidity",
          "writable": true
        },
        {
          "name": "placeholderUserDestinationCollateral"
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "liquidityTokenProgram"
        },
        {
          "name": "instructionSysvarAccount"
        },
        {
          "name": "obligationFarmUserState",
          "writable": true
        },
        {
          "name": "reserveFarmState",
          "writable": true
        },
        {
          "name": "farmsProgram"
        }
      ],
      "args": [
        {
          "name": "collateralAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "marinadeClaim",
      "docs": [
        "Claims tickets that were unstaked in the previous epoch to get SOL.",
        "",
        "# Parameters",
        "- `ctx`: The context containing the required accounts.",
        "",
        "# Permission required",
        "- Permission::Unstake",
        "",
        "# Integration required",
        "- Integration::Marinade"
      ],
      "discriminator": [
        54,
        44,
        48,
        204,
        218,
        141,
        36,
        5
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
          "address": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"
        },
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "reservePda",
          "writable": true
        },
        {
          "name": "ticketAccount",
          "writable": true
        },
        {
          "name": "clock"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "marinadeDeposit",
      "docs": [
        "Deposits SOL to get mSOL.",
        "",
        "# Parameters",
        "- `ctx`: The context containing the required accounts.",
        "- `lamports`: The amount of SOL (in lamports) to deposit.",
        "",
        "# Permission required",
        "- Permission::Stake",
        "",
        "# Integration required",
        "- Integration::Marinade"
      ],
      "discriminator": [
        62,
        236,
        248,
        28,
        222,
        232,
        182,
        73
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
          "address": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"
        },
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "msolMint",
          "writable": true
        },
        {
          "name": "liqPoolSolLegPda",
          "writable": true
        },
        {
          "name": "liqPoolMsolLeg",
          "writable": true
        },
        {
          "name": "liqPoolMsolLegAuthority"
        },
        {
          "name": "reservePda",
          "writable": true
        },
        {
          "name": "mintTo",
          "writable": true
        },
        {
          "name": "msolMintAuthority"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
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
      "name": "marinadeDepositStakeAccount",
      "docs": [
        "Deposits a stake account to get mSOL.",
        "",
        "# Parameters",
        "- `ctx`: The context containing the required accounts.",
        "- `validator_idx`: Validator index in Marinade's validator list.",
        "",
        "# Permission required",
        "- Permission::Stake",
        "",
        "# Integration required",
        "- Integration::Marinade"
      ],
      "discriminator": [
        141,
        230,
        58,
        103,
        56,
        205,
        159,
        138
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
          "address": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"
        },
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "validatorList",
          "writable": true
        },
        {
          "name": "stakeList",
          "writable": true
        },
        {
          "name": "stakeAccount",
          "writable": true
        },
        {
          "name": "duplicationFlag",
          "writable": true
        },
        {
          "name": "msolMint",
          "writable": true
        },
        {
          "name": "mintTo",
          "writable": true
        },
        {
          "name": "msolMintAuthority"
        },
        {
          "name": "clock"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "stakeProgram"
        }
      ],
      "args": [
        {
          "name": "validatorIdx",
          "type": "u32"
        }
      ]
    },
    {
      "name": "marinadeLiquidUnstake",
      "docs": [
        "Unstakes mSOL to get SOL immediately with a small fee.",
        "",
        "# Parameters",
        "- `ctx`: The context containing the required accounts.",
        "- `msol_amount`: Amount of mSOL to unstake.",
        "",
        "# Permission required",
        "- Permission::Unstake",
        "",
        "# Integration required",
        "- Integration::Marinade"
      ],
      "discriminator": [
        29,
        146,
        34,
        21,
        26,
        68,
        141,
        161
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
          "address": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"
        },
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "msolMint",
          "writable": true
        },
        {
          "name": "liqPoolSolLegPda",
          "writable": true
        },
        {
          "name": "liqPoolMsolLeg",
          "writable": true
        },
        {
          "name": "treasuryMsolAccount",
          "writable": true
        },
        {
          "name": "getMsolFrom",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "msolAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "marinadeOrderUnstake",
      "docs": [
        "Unstakes mSOL to get a ticket that can be claimed at the next epoch.",
        "",
        "# Parameters",
        "- `ctx`: The context containing the required accounts.",
        "- `msol_amount`: Amount of mSOL to unstake.",
        "",
        "# Permission required",
        "- Permission::Unstake",
        "",
        "# Integration required",
        "- Integration::Marinade"
      ],
      "discriminator": [
        202,
        3,
        33,
        27,
        183,
        156,
        57,
        231
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
          "address": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"
        },
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "msolMint",
          "writable": true
        },
        {
          "name": "burnMsolFrom",
          "writable": true
        },
        {
          "name": "newTicketAccount",
          "writable": true
        },
        {
          "name": "clock"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "msolAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "meteoraDlmmAddLiquidity",
      "discriminator": [
        214,
        108,
        176,
        68,
        92,
        135,
        32,
        35
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "lbPair",
          "writable": true
        },
        {
          "name": "binArrayBitmapExtension",
          "writable": true
        },
        {
          "name": "userTokenX",
          "writable": true
        },
        {
          "name": "userTokenY",
          "writable": true
        },
        {
          "name": "reserveX",
          "writable": true
        },
        {
          "name": "reserveY",
          "writable": true
        },
        {
          "name": "tokenXMint"
        },
        {
          "name": "tokenYMint"
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "tokenXProgram"
        },
        {
          "name": "tokenYProgram"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "liquidityParameter",
          "type": {
            "defined": {
              "name": "liquidityParameter"
            }
          }
        }
      ]
    },
    {
      "name": "meteoraDlmmAddLiquidityByStrategy",
      "discriminator": [
        81,
        139,
        59,
        146,
        176,
        196,
        240,
        216
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "lbPair",
          "writable": true
        },
        {
          "name": "binArrayBitmapExtension",
          "writable": true
        },
        {
          "name": "userTokenX",
          "writable": true
        },
        {
          "name": "userTokenY",
          "writable": true
        },
        {
          "name": "reserveX",
          "writable": true
        },
        {
          "name": "reserveY",
          "writable": true
        },
        {
          "name": "tokenXMint"
        },
        {
          "name": "tokenYMint"
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "tokenXProgram"
        },
        {
          "name": "tokenYProgram"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "liquidityParameter",
          "type": {
            "defined": {
              "name": "liquidityParameterByStrategy"
            }
          }
        }
      ]
    },
    {
      "name": "meteoraDlmmAddLiquidityOneSidePrecise",
      "discriminator": [
        244,
        187,
        200,
        82,
        30,
        179,
        154,
        224
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "lbPair",
          "writable": true
        },
        {
          "name": "binArrayBitmapExtension",
          "writable": true
        },
        {
          "name": "userToken",
          "writable": true
        },
        {
          "name": "reserve",
          "writable": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "parameter",
          "type": {
            "defined": {
              "name": "addLiquiditySingleSidePreciseParameter"
            }
          }
        }
      ]
    },
    {
      "name": "meteoraDlmmClaimFee",
      "discriminator": [
        78,
        116,
        98,
        78,
        50,
        82,
        72,
        37
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "lbPair",
          "writable": true
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "reserveX",
          "writable": true
        },
        {
          "name": "reserveY",
          "writable": true
        },
        {
          "name": "userTokenX",
          "writable": true
        },
        {
          "name": "userTokenY",
          "writable": true
        },
        {
          "name": "tokenXMint"
        },
        {
          "name": "tokenYMint"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "meteoraDlmmClaimReward",
      "discriminator": [
        107,
        160,
        137,
        17,
        162,
        0,
        24,
        234
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "lbPair",
          "writable": true
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "rewardVault",
          "writable": true
        },
        {
          "name": "rewardMint"
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "rewardIndex",
          "type": "u64"
        }
      ]
    },
    {
      "name": "meteoraDlmmClosePosition",
      "discriminator": [
        186,
        117,
        42,
        24,
        221,
        194,
        34,
        143
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "lbPair",
          "writable": true
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "rentReceiver",
          "writable": true
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "meteoraDlmmInitializePosition",
      "discriminator": [
        223,
        94,
        215,
        96,
        175,
        181,
        195,
        204
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "position",
          "writable": true,
          "signer": true
        },
        {
          "name": "lbPair"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "lowerBinId",
          "type": "i32"
        },
        {
          "name": "width",
          "type": "i32"
        }
      ]
    },
    {
      "name": "meteoraDlmmRemoveLiquidity",
      "discriminator": [
        185,
        228,
        248,
        124,
        57,
        133,
        19,
        192
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "lbPair",
          "writable": true
        },
        {
          "name": "binArrayBitmapExtension",
          "writable": true
        },
        {
          "name": "userTokenX",
          "writable": true
        },
        {
          "name": "userTokenY",
          "writable": true
        },
        {
          "name": "reserveX",
          "writable": true
        },
        {
          "name": "reserveY",
          "writable": true
        },
        {
          "name": "tokenXMint"
        },
        {
          "name": "tokenYMint"
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "tokenXProgram"
        },
        {
          "name": "tokenYProgram"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "binLiquidityRemoval",
          "type": {
            "vec": {
              "defined": {
                "name": "binLiquidityReduction"
              }
            }
          }
        }
      ]
    },
    {
      "name": "meteoraDlmmRemoveLiquidityByRange",
      "discriminator": [
        223,
        12,
        177,
        181,
        96,
        109,
        60,
        124
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "lbPair",
          "writable": true
        },
        {
          "name": "binArrayBitmapExtension",
          "writable": true
        },
        {
          "name": "userTokenX",
          "writable": true
        },
        {
          "name": "userTokenY",
          "writable": true
        },
        {
          "name": "reserveX",
          "writable": true
        },
        {
          "name": "reserveY",
          "writable": true
        },
        {
          "name": "tokenXMint"
        },
        {
          "name": "tokenYMint"
        },
        {
          "name": "binArrayLower",
          "writable": true
        },
        {
          "name": "binArrayUpper",
          "writable": true
        },
        {
          "name": "tokenXProgram"
        },
        {
          "name": "tokenYProgram"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "fromBinId",
          "type": "i32"
        },
        {
          "name": "toBinId",
          "type": "i32"
        },
        {
          "name": "bpsToRemove",
          "type": "u16"
        }
      ]
    },
    {
      "name": "meteoraDlmmSwap",
      "discriminator": [
        127,
        64,
        37,
        138,
        173,
        243,
        207,
        84
      ],
      "accounts": [
        {
          "name": "glamState"
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "cpiProgram",
          "address": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
        },
        {
          "name": "lbPair",
          "writable": true
        },
        {
          "name": "binArrayBitmapExtension"
        },
        {
          "name": "reserveX",
          "writable": true
        },
        {
          "name": "reserveY",
          "writable": true
        },
        {
          "name": "userTokenIn",
          "writable": true
        },
        {
          "name": "userTokenOut",
          "writable": true
        },
        {
          "name": "tokenXMint"
        },
        {
          "name": "tokenYMint"
        },
        {
          "name": "oracle",
          "writable": true
        },
        {
          "name": "hostFeeIn",
          "writable": true
        },
        {
          "name": "tokenXProgram"
        },
        {
          "name": "tokenYProgram"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "minAmountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "mintTokens",
      "docs": [
        "Mints a specified amount of tokens for the given mint.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `mint_id`: The id of the mint to mint tokens for.",
        "- `amount`: The amount of tokens to mint.",
        "",
        "# Permission required",
        "- Permission::MintTokens",
        "",
        "# Integration required",
        "- Integration::Mint"
      ],
      "discriminator": [
        59,
        132,
        24,
        246,
        122,
        39,
        8,
        243
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
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "mintTo",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipient"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "recipient"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "priceStakes",
      "discriminator": [
        0,
        60,
        60,
        103,
        201,
        94,
        72,
        223
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "priceTickets",
      "discriminator": [
        253,
        18,
        224,
        98,
        226,
        43,
        65,
        76
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "priceVault",
      "discriminator": [
        47,
        213,
        36,
        17,
        183,
        5,
        141,
        45
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "redeemQueued",
      "discriminator": [
        3,
        43,
        239,
        213,
        40,
        225,
        179,
        28
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamEscrow",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
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
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signerMintAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "escrowMintAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamEscrow"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        },
        {
          "name": "sharesIn",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setSubscribeRedeemEnabled",
      "docs": [
        "Enables or disables the subscribe and redeem functionality.",
        "",
        "This allows the owner to pause/unpause subscription and redemption of a fund.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `enabled`: A boolean indicating whether to enable or disable the subscribe and redeem functionality.",
        "",
        "# Permission required",
        "- Owner only, delegates not allowed"
      ],
      "discriminator": [
        189,
        56,
        205,
        172,
        201,
        185,
        34,
        92
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
          "name": "enabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setTokenAccountsStates",
      "docs": [
        "Sets the frozen state of the token accounts for the specified mint.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `mint_id`: The id of the mint to set the frozen state for.",
        "- `frozen`: The new frozen state.",
        "",
        "# Permission required",
        "- Permission::SetTokenAccountState",
        "",
        "# Integration required",
        "- Integration::Mint"
      ],
      "discriminator": [
        50,
        133,
        45,
        86,
        117,
        66,
        115,
        195
      ],
      "accounts": [
        {
          "name": "glamState"
        },
        {
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        },
        {
          "name": "frozen",
          "type": "bool"
        }
      ]
    },
    {
      "name": "stakeAuthorize",
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
          "name": "stakerWithWithdrawer",
          "type": "u32"
        }
      ]
    },
    {
      "name": "stakeDeactivate",
      "docs": [
        "Deactivates stake accounts.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::Unstake",
        "",
        "# Integration required",
        "- Integration::NativeStaking"
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
        "Delegates stake account to a validator.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::Stake",
        "",
        "# Integration required",
        "- Integration::NativeStaking"
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
        "Initializes a stake account",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `lamports`: The amount of SOL to initialize the stake account with.",
        "",
        "# Permission required",
        "- Permission::Stake",
        "",
        "# Integration required",
        "- Integration::NativeStaking"
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
        "Merges two stake accounts.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::Stake",
        "",
        "# Integration required",
        "- Integration::NativeStaking"
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
      "name": "stakeMoveLamports",
      "discriminator": [
        21,
        85,
        218,
        122,
        182,
        189,
        82,
        200
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
          "name": "sourceStake",
          "writable": true
        },
        {
          "name": "destinationStake",
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
      "name": "stakeMoveStake",
      "discriminator": [
        9,
        190,
        67,
        62,
        46,
        251,
        144,
        186
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
          "name": "sourceStake",
          "writable": true
        },
        {
          "name": "destinationStake",
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
      "name": "stakePoolDepositSol",
      "docs": [
        "Deposits SOL to a stake pool to get pool token.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `lamports_in`: The amount of SOL to deposit.",
        "",
        "# Permission required",
        "- Permission::Stake",
        "",
        "# Integration required",
        "- Integration::SplStakePool or Integration::SanctumStakePool, depending on the stake pool program used."
      ],
      "discriminator": [
        147,
        187,
        91,
        151,
        158,
        187,
        247,
        79
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
          "name": "stakePool",
          "writable": true
        },
        {
          "name": "stakePoolWithdrawAuthority"
        },
        {
          "name": "reserveStake",
          "writable": true
        },
        {
          "name": "poolTokensTo",
          "writable": true
        },
        {
          "name": "feeAccount",
          "writable": true
        },
        {
          "name": "referrerPoolTokensAccount",
          "writable": true
        },
        {
          "name": "poolMint",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "lamportsIn",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakePoolDepositSolWithSlippage",
      "discriminator": [
        57,
        21,
        43,
        19,
        86,
        36,
        25,
        172
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
          "name": "stakePool",
          "writable": true
        },
        {
          "name": "stakePoolWithdrawAuthority"
        },
        {
          "name": "reserveStake",
          "writable": true
        },
        {
          "name": "poolTokensTo",
          "writable": true
        },
        {
          "name": "feeAccount",
          "writable": true
        },
        {
          "name": "referrerPoolTokensAccount",
          "writable": true
        },
        {
          "name": "poolMint",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "lamportsIn",
          "type": "u64"
        },
        {
          "name": "minimumPoolTokensOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakePoolDepositStake",
      "docs": [
        "Deposits a stake account to a stake pool to get pool token.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::Stake",
        "",
        "# Integration required",
        "- Integration::SplStakePool or Integration::SanctumStakePool, depending on the stake pool program used."
      ],
      "discriminator": [
        212,
        158,
        195,
        174,
        179,
        105,
        9,
        97
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
          "name": "stakePool",
          "writable": true
        },
        {
          "name": "validatorList",
          "writable": true
        },
        {
          "name": "stakePoolWithdrawAuthority"
        },
        {
          "name": "depositStake",
          "writable": true
        },
        {
          "name": "validatorStakeAccount",
          "writable": true
        },
        {
          "name": "reserveStakeAccount",
          "writable": true
        },
        {
          "name": "poolTokensTo",
          "writable": true
        },
        {
          "name": "feeAccount",
          "writable": true
        },
        {
          "name": "referrerPoolTokensAccount",
          "writable": true
        },
        {
          "name": "poolMint",
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
          "name": "tokenProgram"
        },
        {
          "name": "stakeProgram",
          "address": "Stake11111111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "stakePoolDepositStakeWithSlippage",
      "discriminator": [
        185,
        104,
        64,
        97,
        108,
        243,
        239,
        165
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
          "name": "stakePool",
          "writable": true
        },
        {
          "name": "validatorList",
          "writable": true
        },
        {
          "name": "stakePoolWithdrawAuthority"
        },
        {
          "name": "depositStake",
          "writable": true
        },
        {
          "name": "validatorStakeAccount",
          "writable": true
        },
        {
          "name": "reserveStakeAccount",
          "writable": true
        },
        {
          "name": "poolTokensTo",
          "writable": true
        },
        {
          "name": "feeAccount",
          "writable": true
        },
        {
          "name": "referrerPoolTokensAccount",
          "writable": true
        },
        {
          "name": "poolMint",
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
          "name": "tokenProgram"
        },
        {
          "name": "stakeProgram",
          "address": "Stake11111111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "minimumPoolTokensOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakePoolWithdrawSol",
      "docs": [
        "Unstakes from pool token to get SOL immediately.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `pool_token_amount`: Amount of pool token to unstake.",
        "",
        "# Permission required",
        "- Permission::LiquidUnstake",
        "",
        "# Integration required",
        "- Integration::SplStakePool or Integration::SanctumStakePool, depending on the stake pool program used."
      ],
      "discriminator": [
        179,
        100,
        204,
        0,
        192,
        46,
        233,
        181
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
          "name": "cpiProgram"
        },
        {
          "name": "stakePool",
          "writable": true
        },
        {
          "name": "stakePoolWithdrawAuthority"
        },
        {
          "name": "poolTokensFrom",
          "writable": true
        },
        {
          "name": "reserveStake",
          "writable": true
        },
        {
          "name": "feeAccount",
          "writable": true
        },
        {
          "name": "poolMint",
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
          "name": "stakeProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "poolTokensIn",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakePoolWithdrawSolWithSlippage",
      "discriminator": [
        210,
        92,
        86,
        93,
        123,
        17,
        117,
        89
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
          "name": "cpiProgram"
        },
        {
          "name": "stakePool",
          "writable": true
        },
        {
          "name": "stakePoolWithdrawAuthority"
        },
        {
          "name": "poolTokensFrom",
          "writable": true
        },
        {
          "name": "reserveStake",
          "writable": true
        },
        {
          "name": "feeAccount",
          "writable": true
        },
        {
          "name": "poolMint",
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
          "name": "stakeProgram",
          "address": "Stake11111111111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "poolTokensIn",
          "type": "u64"
        },
        {
          "name": "minimumLamportsOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakePoolWithdrawStake",
      "docs": [
        "Unstakes from pool token into a stake account.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `pool_token_amount`: Amount of pool token to unstake.",
        "",
        "# Permission required",
        "- Permission::Unstake",
        "",
        "# Integration required",
        "- Integration::SplStakePool or Integration::SanctumStakePool, depending on the stake pool program used."
      ],
      "discriminator": [
        7,
        70,
        250,
        22,
        49,
        1,
        143,
        1
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
          "name": "stakePool",
          "writable": true
        },
        {
          "name": "validatorList",
          "writable": true
        },
        {
          "name": "stakePoolWithdrawAuthority"
        },
        {
          "name": "validatorStakeAccount",
          "writable": true
        },
        {
          "name": "stake",
          "writable": true
        },
        {
          "name": "poolTokensFrom",
          "writable": true
        },
        {
          "name": "feeAccount",
          "writable": true
        },
        {
          "name": "poolMint",
          "writable": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "stakeProgram",
          "address": "Stake11111111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "poolTokensIn",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakePoolWithdrawStakeWithSlippage",
      "discriminator": [
        74,
        83,
        151,
        22,
        32,
        149,
        154,
        141
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
          "name": "stakePool",
          "writable": true
        },
        {
          "name": "validatorList",
          "writable": true
        },
        {
          "name": "stakePoolWithdrawAuthority"
        },
        {
          "name": "validatorStakeAccount",
          "writable": true
        },
        {
          "name": "stake",
          "writable": true
        },
        {
          "name": "poolTokensFrom",
          "writable": true
        },
        {
          "name": "feeAccount",
          "writable": true
        },
        {
          "name": "poolMint",
          "writable": true
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "stakeProgram",
          "address": "Stake11111111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "poolTokensIn",
          "type": "u64"
        },
        {
          "name": "minimumLamportsOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakeRedelegate",
      "docs": [
        "Redelegates an existing stake account to a new validator (a new stake account will be created).",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "",
        "# Permission required",
        "- Permission::Unstake",
        "",
        "# Integration required",
        "- Integration::NativeStaking"
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
        "Splits from an existing stake account to get a new stake account.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `lamports`: The amount of SOL to split.",
        "",
        "# Permission required",
        "- Permission::Unstake",
        "",
        "# Integration required",
        "- Integration::NativeStaking"
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
        "Withdraws SOL from stake accounts.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `lamports`: The amount of SOL to withdraw.",
        "",
        "# Permission required",
        "- Permission::Unstake",
        "",
        "# Integration required",
        "- Integration::NativeStaking"
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
      "name": "subscribeInstant",
      "discriminator": [
        191,
        239,
        146,
        220,
        75,
        86,
        193,
        152
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "glamEscrow",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
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
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signerMintAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "escrowMintAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamEscrow"
              },
              {
                "kind": "account",
                "path": "token2022Program"
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "depositAsset"
        },
        {
          "name": "vaultDepositAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "depositAsset"
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
          "name": "signerDepositAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "depositAsset"
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
          "name": "signerPolicy",
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "transferHookProgram",
          "address": "hookVGUczspowK3A8KX5hqdMFKeZwKGMWDuvPjLvgLy"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        },
        {
          "name": "amountIn",
          "type": "u64"
        }
      ]
    },
    {
      "name": "systemTransfer",
      "docs": [
        "Transfer vault SOL to wSOL token account or allowlisted addresses.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `lamports`: The amount of SOL to transfer.",
        "",
        "# Permission required",
        "- Permission::WSolWrap if transfer to same vault's wSOL token account",
        "- Permission::TransferToAllowlisted if transfer to allowlisted addresses"
      ],
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
      "name": "tokenCloseAccount",
      "discriminator": [
        240,
        32,
        179,
        154,
        96,
        110,
        43,
        79
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
          "name": "cpiProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenAccount",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "tokenTransfer",
      "discriminator": [
        210,
        16,
        52,
        5,
        247,
        164,
        59,
        18
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
          "name": "cpiProgram"
        },
        {
          "name": "from",
          "writable": true
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
      "name": "tokenTransferChecked",
      "discriminator": [
        169,
        178,
        117,
        156,
        169,
        191,
        199,
        116
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
          "name": "cpiProgram"
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "mint"
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
        },
        {
          "name": "decimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "updateMint",
      "docs": [
        "Updates an existing mint with new metadata.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `mint_id`: The id of the mint to be updated.",
        "- `mint_model`: An instance of `MintModel` containing the updated metadata for the new mint.",
        "",
        "# Permission required",
        "- Owner only, delegates not allowed"
      ],
      "discriminator": [
        212,
        203,
        57,
        78,
        75,
        245,
        222,
        5
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
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "mintId",
          "type": "u8"
        },
        {
          "name": "mintModel",
          "type": {
            "defined": {
              "name": "mintModel"
            }
          }
        }
      ]
    },
    {
      "name": "updateState",
      "docs": [
        "Updates an existing state account with new parameters.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `state`: An instance of `StateModel` containing the updated details of the state.",
        "",
        "# Permission required",
        "- Owner only, delegates not allowed"
      ],
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
      "name": "withdraw",
      "docs": [
        "Withdraw asset from vault into owner's wallet.",
        "",
        "# Parameters",
        "- `ctx`: The context for the instruction.",
        "- `amount`: The amount to withdraw.",
        "",
        "# Permission required",
        "- Owner only, delegates not allowed"
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
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
          "name": "asset"
        },
        {
          "name": "vaultAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamVault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "asset"
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
          "name": "signerAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamSigner"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "asset"
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
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "openfundsMetadataAccount",
      "discriminator": [
        5,
        89,
        20,
        76,
        255,
        158,
        209,
        219
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
      "name": "notAuthorized",
      "msg": "Signer is not authorized"
    },
    {
      "code": 48001,
      "name": "integrationDisabled",
      "msg": "Integration is disabled"
    },
    {
      "code": 48002,
      "name": "stateAccountDisabled",
      "msg": "State account is disabled"
    },
    {
      "code": 48003,
      "name": "invalidSignerAccount",
      "msg": "Invalid signer ata"
    },
    {
      "code": 49000,
      "name": "invalidAccountType",
      "msg": "Invalid account type"
    },
    {
      "code": 49001,
      "name": "invalidName",
      "msg": "Name too long: max 64 chars"
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
      "name": "mintsNotClosed",
      "msg": "Mints must be closed before closing Glam state account"
    },
    {
      "code": 49007,
      "name": "invalidMintId",
      "msg": "Invalid mint id"
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
      "name": "invalidSwap",
      "msg": "Swap failed"
    },
    {
      "code": 50003,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 50004,
      "name": "invalidVoteSide",
      "msg": "Invalid vote side"
    },
    {
      "code": 50005,
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
      "code": 51002,
      "name": "subscribeRedeemDisabled",
      "msg": "Subscription and redemption disabled"
    },
    {
      "code": 51003,
      "name": "invalidAssetSubscribe",
      "msg": "Asset not allowed to subscribe"
    },
    {
      "code": 51004,
      "name": "ledgerNotFound",
      "msg": "Ledger not found"
    },
    {
      "code": 51005,
      "name": "invalidLedgerEntry",
      "msg": "Invalid ledger entry"
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
      "name": "unpricedExternalAccounts",
      "msg": "Not all external vault accounts are priced"
    },
    {
      "code": 51104,
      "name": "vaultNotPriced",
      "msg": "No priced assets found"
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
            "name": "mint"
          },
          {
            "name": "fund"
          }
        ]
      }
    },
    {
      "name": "accumulatedFees",
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
            "name": "highWaterMark",
            "type": "u64"
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
            "name": "lastProtocolBaseFeeCrystallized",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "addLiquiditySingleSidePreciseParameter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bins",
            "type": {
              "vec": {
                "defined": {
                  "name": "compressedBinDepositAmount"
                }
              }
            }
          },
          {
            "name": "decompressMultiplier",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "binLiquidityDistribution",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "binId",
            "type": "i32"
          },
          {
            "name": "distributionX",
            "type": "u16"
          },
          {
            "name": "distributionY",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "binLiquidityReduction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "binId",
            "type": "i32"
          },
          {
            "name": "bpsToRemove",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "companyField",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "defined": {
                "name": "companyFieldName"
              }
            }
          },
          {
            "name": "value",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "companyFieldName",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "fundGroupName"
          },
          {
            "name": "manCo"
          },
          {
            "name": "domicileOfManCo"
          },
          {
            "name": "bicOfCustodian"
          },
          {
            "name": "collateralManagerName"
          },
          {
            "name": "custodianBankName"
          },
          {
            "name": "domicileOfCustodianBank"
          },
          {
            "name": "fundAdministratorName"
          },
          {
            "name": "fundAdvisorName"
          },
          {
            "name": "fundPromoterName"
          },
          {
            "name": "isSelfManagedInvestmentCompany"
          },
          {
            "name": "leiOfCustodianBank"
          },
          {
            "name": "leiOfManCo"
          },
          {
            "name": "portfolioManagingCompanyName"
          },
          {
            "name": "securitiesLendingCounterpartyName"
          },
          {
            "name": "swapCounterpartyName"
          },
          {
            "name": "addressofManCo"
          },
          {
            "name": "auditorName"
          },
          {
            "name": "cityofManCo"
          },
          {
            "name": "emailAddressOfManCo"
          },
          {
            "name": "fundWebsiteOfManCo"
          },
          {
            "name": "isUnpriSignatory"
          },
          {
            "name": "phoneCountryCodeofManCo"
          },
          {
            "name": "phoneNumberofManCo"
          },
          {
            "name": "subInvestmentAdvisorName"
          },
          {
            "name": "zipCodeofManCo"
          },
          {
            "name": "domicileOfUmbrella"
          },
          {
            "name": "hasUmbrella"
          },
          {
            "name": "leiOfUmbrella"
          },
          {
            "name": "umbrella"
          },
          {
            "name": "globalIntermediaryIdentificationNumberOfUmbrella"
          }
        ]
      }
    },
    {
      "name": "companyModel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fundGroupName",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "manCo",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "domicileOfManCo",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "emailAddressOfManCo",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "fundWebsiteOfManCo",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "compressedBinDepositAmount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "binId",
            "type": "i32"
          },
          {
            "name": "amount",
            "type": "u32"
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
            "name": "permissions",
            "type": {
              "vec": {
                "defined": {
                  "name": "permission"
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
            "name": "allowlist"
          },
          {
            "name": "blocklist"
          },
          {
            "name": "externalVaultAccounts"
          },
          {
            "name": "lockUp"
          },
          {
            "name": "driftMarketIndexesPerp"
          },
          {
            "name": "driftMarketIndexesSpot"
          },
          {
            "name": "driftOrderTypes"
          },
          {
            "name": "maxSwapSlippageBps"
          },
          {
            "name": "transferToAllowlist"
          },
          {
            "name": "pricedAssets"
          },
          {
            "name": "ledger"
          },
          {
            "name": "feeStructure"
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
            "name": "date",
            "fields": [
              {
                "name": "val",
                "type": "string"
              }
            ]
          },
          {
            "name": "double",
            "fields": [
              {
                "name": "val",
                "type": "i64"
              }
            ]
          },
          {
            "name": "integer",
            "fields": [
              {
                "name": "val",
                "type": "i32"
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
            "name": "time",
            "fields": [
              {
                "name": "val",
                "type": "string"
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
            "name": "u64",
            "fields": [
              {
                "name": "val",
                "type": "u64"
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
            "name": "percentage",
            "fields": [
              {
                "name": "val",
                "type": "u32"
              }
            ]
          },
          {
            "name": "uri",
            "fields": [
              {
                "name": "val",
                "type": "string"
              }
            ]
          },
          {
            "name": "timestamp",
            "fields": [
              {
                "name": "val",
                "type": "i64"
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
            "name": "vecPricedAssets",
            "fields": [
              {
                "name": "val",
                "type": {
                  "vec": {
                    "defined": {
                      "name": "pricedAssets"
                    }
                  }
                }
              }
            ]
          },
          {
            "name": "ledger",
            "fields": [
              {
                "name": "val",
                "type": {
                  "vec": {
                    "defined": {
                      "name": "ledgerEntry"
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
            "name": "accumulatedFees",
            "fields": [
              {
                "name": "val",
                "type": {
                  "defined": {
                    "name": "accumulatedFees"
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
      "name": "feeStructure",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vaultFees",
            "type": {
              "defined": {
                "name": "entryExitFees"
              }
            }
          },
          {
            "name": "managerFees",
            "type": {
              "defined": {
                "name": "entryExitFees"
              }
            }
          },
          {
            "name": "managementFee",
            "type": {
              "defined": {
                "name": "managementFee"
              }
            }
          },
          {
            "name": "performanceFee",
            "type": {
              "defined": {
                "name": "performanceFee"
              }
            }
          },
          {
            "name": "protocolFees",
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
      "name": "fundField",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "defined": {
                "name": "fundFieldName"
              }
            }
          },
          {
            "name": "value",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "fundFieldName",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "fundDomicileAlpha2"
          },
          {
            "name": "fundDomicileAlpha3"
          },
          {
            "name": "legalFundNameIncludingUmbrella"
          },
          {
            "name": "fiscalYearEnd"
          },
          {
            "name": "fundCurrency"
          },
          {
            "name": "fundLaunchDate"
          },
          {
            "name": "investmentObjective"
          },
          {
            "name": "isEtc"
          },
          {
            "name": "isEuDirectiveRelevant"
          },
          {
            "name": "isFundOfFunds"
          },
          {
            "name": "isPassiveFund"
          },
          {
            "name": "isReit"
          },
          {
            "name": "legalForm"
          },
          {
            "name": "legalFundNameOnly"
          },
          {
            "name": "openEndedOrClosedEndedFundStructure"
          },
          {
            "name": "typeOfEuDirective"
          },
          {
            "name": "ucitsVersion"
          },
          {
            "name": "currencyHedgePortfolio"
          },
          {
            "name": "depositoryName"
          },
          {
            "name": "fundValuationPoint"
          },
          {
            "name": "fundValuationPointTimeZone"
          },
          {
            "name": "fundValuationPointTimeZoneUsingTzDatabase"
          },
          {
            "name": "hasCollateralManager"
          },
          {
            "name": "hasEmbeddedDerivatives"
          },
          {
            "name": "hasSecuritiesLending"
          },
          {
            "name": "hasSwap"
          },
          {
            "name": "isLeveraged"
          },
          {
            "name": "isShariaCompliant"
          },
          {
            "name": "isShort"
          },
          {
            "name": "leIofDepositoryBank"
          },
          {
            "name": "leiOfFund"
          },
          {
            "name": "locationOfBearerShare"
          },
          {
            "name": "locationOfShareRegister"
          },
          {
            "name": "maximumLeverageInFund"
          },
          {
            "name": "miFidSecuritiesClassification"
          },
          {
            "name": "moneyMarketTypeOfFund"
          },
          {
            "name": "trusteeName"
          },
          {
            "name": "auMFund"
          },
          {
            "name": "auMFundDate"
          },
          {
            "name": "noSFund"
          },
          {
            "name": "noSFundDate"
          }
        ]
      }
    },
    {
      "name": "fundManagerField",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "defined": {
                "name": "fundManagerFieldName"
              }
            }
          },
          {
            "name": "value",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "fundManagerFieldName",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "portfolioManagerForename"
          },
          {
            "name": "portfolioManagerName"
          },
          {
            "name": "portfolioManagerYearOfBirth"
          },
          {
            "name": "portfolioManagerYearOfExperienceStart"
          },
          {
            "name": "portfolioManagerBriefBiography"
          },
          {
            "name": "portfolioManagerType"
          },
          {
            "name": "portfolioManagerRoleStartingDate"
          },
          {
            "name": "portfolioManagerRoleEndDate"
          }
        ]
      }
    },
    {
      "name": "fundOpenfundsModel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fundDomicileAlpha2",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "legalFundNameIncludingUmbrella",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "fiscalYearEnd",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "fundCurrency",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "fundLaunchDate",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "investmentObjective",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "isEtc",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "isEuDirectiveRelevant",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "isFundOfFunds",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "isPassiveFund",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "isReit",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "legalForm",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "legalFundNameOnly",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "openEndedOrClosedEndedFundStructure",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "typeOfEuDirective",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "ucitsVersion",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "initObligationArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tag",
            "type": "u8"
          },
          {
            "name": "id",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "integration",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "drift"
          },
          {
            "name": "splStakePool"
          },
          {
            "name": "sanctumStakePool"
          },
          {
            "name": "nativeStaking"
          },
          {
            "name": "marinade"
          },
          {
            "name": "jupiterSwap"
          },
          {
            "name": "jupiterVote"
          },
          {
            "name": "kaminoLending"
          },
          {
            "name": "meteoraDlmm"
          }
        ]
      }
    },
    {
      "name": "ledgerEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "kind",
            "type": {
              "defined": {
                "name": "ledgerEntryKind"
              }
            }
          },
          {
            "name": "incoming",
            "type": {
              "defined": {
                "name": "pubkeyAmount"
              }
            }
          },
          {
            "name": "value",
            "type": "u64"
          },
          {
            "name": "outgoing",
            "type": {
              "option": {
                "defined": {
                  "name": "pubkeyAmount"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "ledgerEntryKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "subscription"
          },
          {
            "name": "redemption"
          }
        ]
      }
    },
    {
      "name": "liquidityParameter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountX",
            "type": "u64"
          },
          {
            "name": "amountY",
            "type": "u64"
          },
          {
            "name": "binLiquidityDist",
            "type": {
              "vec": {
                "defined": {
                  "name": "binLiquidityDistribution"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "liquidityParameterByStrategy",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountX",
            "type": "u64"
          },
          {
            "name": "amountY",
            "type": "u64"
          },
          {
            "name": "activeId",
            "type": "i32"
          },
          {
            "name": "maxActiveBinSlippage",
            "type": "i32"
          },
          {
            "name": "strategyParameters",
            "type": {
              "defined": {
                "name": "strategyParameters"
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
      "name": "managerKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "wallet"
          },
          {
            "name": "squads"
          }
        ]
      }
    },
    {
      "name": "managerModel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "portfolioManagerName",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "pubkey",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "kind",
            "type": {
              "option": {
                "defined": {
                  "name": "managerKind"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "marketType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "spot"
          },
          {
            "name": "perp"
          }
        ]
      }
    },
    {
      "name": "metadata",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "template",
            "type": {
              "defined": {
                "name": "metadataTemplate"
              }
            }
          },
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "metadataTemplate",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "openfunds"
          }
        ]
      }
    },
    {
      "name": "mintModel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "symbol",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "name",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "uri",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "statePubkey",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "asset",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "imageUri",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "allowlist",
            "type": {
              "option": {
                "vec": "pubkey"
              }
            }
          },
          {
            "name": "blocklist",
            "type": {
              "option": {
                "vec": "pubkey"
              }
            }
          },
          {
            "name": "lockUpPeriodInSeconds",
            "type": {
              "option": "i32"
            }
          },
          {
            "name": "permanentDelegate",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "defaultAccountStateFrozen",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "feeStructure",
            "type": {
              "option": {
                "defined": {
                  "name": "feeStructure"
                }
              }
            }
          },
          {
            "name": "isRawOpenfunds",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "rawOpenfunds",
            "type": {
              "option": {
                "defined": {
                  "name": "mintOpenfundsModel"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "mintOpenfundsModel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isin",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "shareClassCurrency",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "currencyOfMinimalSubscription",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "fullShareClassName",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "investmentStatus",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "minimalInitialSubscriptionCategory",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "minimalInitialSubscriptionInAmount",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "minimalInitialSubscriptionInShares",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "shareClassDistributionPolicy",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "shareClassExtension",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "shareClassLaunchDate",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "shareClassLifecycle",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "launchPrice",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "launchPriceCurrency",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "launchPriceDate",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "currencyOfMinimalOrMaximumRedemption",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "hasLockUpForRedemption",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "isValidIsin",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "lockUpComment",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "lockUpPeriodInDays",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "maximumInitialRedemptionInAmount",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "maximumInitialRedemptionInShares",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "minimalInitialRedemptionInAmount",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "minimalInitialRedemptionInShares",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "minimalRedemptionCategory",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "shareClassDividendType",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "cusip",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "valor",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "modifyOrderParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "direction",
            "type": {
              "option": {
                "defined": {
                  "name": "positionDirection"
                }
              }
            }
          },
          {
            "name": "baseAssetAmount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "price",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "reduceOnly",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "postOnly",
            "type": {
              "option": {
                "defined": {
                  "name": "postOnlyParam"
                }
              }
            }
          },
          {
            "name": "immediateOrCancel",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "maxTs",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "triggerPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "triggerCondition",
            "type": {
              "option": {
                "defined": {
                  "name": "orderTriggerCondition"
                }
              }
            }
          },
          {
            "name": "oraclePriceOffset",
            "type": {
              "option": "i32"
            }
          },
          {
            "name": "auctionDuration",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "auctionStartPrice",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "auctionEndPrice",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "policy",
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "openfundsMetadataAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fundId",
            "type": "pubkey"
          },
          {
            "name": "company",
            "type": {
              "vec": {
                "defined": {
                  "name": "companyField"
                }
              }
            }
          },
          {
            "name": "fund",
            "type": {
              "vec": {
                "defined": {
                  "name": "fundField"
                }
              }
            }
          },
          {
            "name": "shareClasses",
            "type": {
              "vec": {
                "vec": {
                  "defined": {
                    "name": "shareClassField"
                  }
                }
              }
            }
          },
          {
            "name": "fundManagers",
            "type": {
              "vec": {
                "vec": {
                  "defined": {
                    "name": "fundManagerField"
                  }
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "orderParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "orderType"
              }
            }
          },
          {
            "name": "marketType",
            "type": {
              "defined": {
                "name": "marketType"
              }
            }
          },
          {
            "name": "direction",
            "type": {
              "defined": {
                "name": "positionDirection"
              }
            }
          },
          {
            "name": "userOrderId",
            "type": "u8"
          },
          {
            "name": "baseAssetAmount",
            "type": "u64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "marketIndex",
            "type": "u16"
          },
          {
            "name": "reduceOnly",
            "type": "bool"
          },
          {
            "name": "postOnly",
            "type": {
              "defined": {
                "name": "postOnlyParam"
              }
            }
          },
          {
            "name": "immediateOrCancel",
            "type": "bool"
          },
          {
            "name": "maxTs",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "triggerPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "triggerCondition",
            "type": {
              "defined": {
                "name": "orderTriggerCondition"
              }
            }
          },
          {
            "name": "oraclePriceOffset",
            "type": {
              "option": "i32"
            }
          },
          {
            "name": "auctionDuration",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "auctionStartPrice",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "auctionEndPrice",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "orderTriggerCondition",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "above"
          },
          {
            "name": "below"
          },
          {
            "name": "triggeredAbove"
          },
          {
            "name": "triggeredBelow"
          }
        ]
      }
    },
    {
      "name": "orderType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "market"
          },
          {
            "name": "limit"
          },
          {
            "name": "triggerMarket"
          },
          {
            "name": "triggerLimit"
          },
          {
            "name": "oracle"
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
          }
        ]
      }
    },
    {
      "name": "permission",
      "docs": [
        "* Delegate ACL"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "driftInitialize"
          },
          {
            "name": "driftUpdateUser"
          },
          {
            "name": "driftDeleteUser"
          },
          {
            "name": "driftDeposit"
          },
          {
            "name": "driftWithdraw"
          },
          {
            "name": "driftPlaceOrders"
          },
          {
            "name": "driftCancelOrders"
          },
          {
            "name": "driftPerpMarket"
          },
          {
            "name": "driftSpotMarket"
          },
          {
            "name": "stake"
          },
          {
            "name": "unstake"
          },
          {
            "name": "liquidUnstake"
          },
          {
            "name": "jupiterSwapAllowlisted"
          },
          {
            "name": "jupiterSwapAny"
          },
          {
            "name": "wSolWrap"
          },
          {
            "name": "wSolUnwrap"
          },
          {
            "name": "mintTokens"
          },
          {
            "name": "burnTokens"
          },
          {
            "name": "forceTransferTokens"
          },
          {
            "name": "setTokenAccountState"
          },
          {
            "name": "stakeJup"
          },
          {
            "name": "voteOnProposal"
          },
          {
            "name": "unstakeJup"
          },
          {
            "name": "jupiterSwapLst"
          },
          {
            "name": "kaminoInit"
          },
          {
            "name": "kaminoDeposit"
          },
          {
            "name": "kaminoBorrow"
          },
          {
            "name": "kaminoRepay"
          },
          {
            "name": "kaminoWithdraw"
          },
          {
            "name": "driftModifyOrders"
          },
          {
            "name": "meteoraDlmmInitPosition"
          },
          {
            "name": "meteoraDlmmClosePosition"
          },
          {
            "name": "meteoraDlmmAddLiquidity"
          },
          {
            "name": "meteoraDlmmRemoveLiquidity"
          },
          {
            "name": "meteoraDlmmClaimFee"
          },
          {
            "name": "meteoraDlmmClaimReward"
          },
          {
            "name": "meteoraDlmmSwap"
          },
          {
            "name": "transferToAllowlisted"
          }
        ]
      }
    },
    {
      "name": "positionDirection",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "long"
          },
          {
            "name": "short"
          }
        ]
      }
    },
    {
      "name": "postOnlyParam",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "none"
          },
          {
            "name": "mustPostOnly"
          },
          {
            "name": "tryPostOnly"
          },
          {
            "name": "slide"
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
          }
        ]
      }
    },
    {
      "name": "pricedAssets",
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
            "name": "accounts",
            "type": {
              "vec": "pubkey"
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
            "name": "integration",
            "type": {
              "option": {
                "defined": {
                  "name": "integration"
                }
              }
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
      "name": "pubkeyAmount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "shareClassField",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "defined": {
                "name": "shareClassFieldName"
              }
            }
          },
          {
            "name": "value",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "shareClassFieldName",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "isin"
          },
          {
            "name": "shareClassCurrency"
          },
          {
            "name": "appliedSubscriptionFeeInFavourOfDistributor"
          },
          {
            "name": "appliedSubscriptionFeeInFavourOfDistributorReferenceDate"
          },
          {
            "name": "currencyOfMinimalSubscription"
          },
          {
            "name": "fullShareClassName"
          },
          {
            "name": "hasPerformanceFee"
          },
          {
            "name": "hasSubscriptionFeeInFavourOfDistributor"
          },
          {
            "name": "investmentStatus"
          },
          {
            "name": "managementFeeApplied"
          },
          {
            "name": "managementFeeAppliedReferenceDate"
          },
          {
            "name": "managementFeeMaximum"
          },
          {
            "name": "maximumSubscriptionFeeInFavourOfDistributor"
          },
          {
            "name": "minimalInitialSubscriptionCategory"
          },
          {
            "name": "minimalInitialSubscriptionInAmount"
          },
          {
            "name": "minimalInitialSubscriptionInShares"
          },
          {
            "name": "minimalSubsequentSubscriptionCategory"
          },
          {
            "name": "minimalSubsequentSubscriptionInAmount"
          },
          {
            "name": "minimalSubsequentSubscriptionInShares"
          },
          {
            "name": "minimumSubscriptionFeeInFavourOfDistributor"
          },
          {
            "name": "shareClassDistributionPolicy"
          },
          {
            "name": "shareClassExtension"
          },
          {
            "name": "shareClassLaunchDate"
          },
          {
            "name": "shareClassLifecycle"
          },
          {
            "name": "srri"
          },
          {
            "name": "launchPrice"
          },
          {
            "name": "launchPriceCurrency"
          },
          {
            "name": "launchPriceDate"
          },
          {
            "name": "hasAppliedSubscriptionFeeInFavourOfFund"
          },
          {
            "name": "appliedSubscriptionFeeInFavourOfFund"
          },
          {
            "name": "appliedSubscriptionFeeInFavourOfFundReferenceDate"
          },
          {
            "name": "maximumSubscriptionFeeInFavourOfFund"
          },
          {
            "name": "hasAppliedRedemptionFeeInFavourOfFund"
          },
          {
            "name": "appliedRedemptionFeeInFavourOfFund"
          },
          {
            "name": "appliedRedemptionFeeInFavourOfFundReferenceDate"
          },
          {
            "name": "maximumRedemptionFeeInFavourOfFund"
          },
          {
            "name": "appliedRedemptionFeeInFavourOfDistributor"
          },
          {
            "name": "appliedRedemptionFeeInFavourOfDistributorReferenceDate"
          },
          {
            "name": "currencyOfMinimalOrMaximumRedemption"
          },
          {
            "name": "cutOffDateOffsetForRedemption"
          },
          {
            "name": "cutOffDateOffsetForSubscription"
          },
          {
            "name": "cutOffTimeForRedemption"
          },
          {
            "name": "cutOffTimeForSubscription"
          },
          {
            "name": "hasLockUpForRedemption"
          },
          {
            "name": "hasRedemptionFeeInFavourOfDistributor"
          },
          {
            "name": "isValidIsin"
          },
          {
            "name": "lockUpComment"
          },
          {
            "name": "lockUpPeriodInDays"
          },
          {
            "name": "managementFeeMinimum"
          },
          {
            "name": "maximalNumberOfPossibleDecimalsAmount"
          },
          {
            "name": "maximalNumberOfPossibleDecimalsNav"
          },
          {
            "name": "maximalNumberOfPossibleDecimalsShares"
          },
          {
            "name": "maximumInitialRedemptionInAmount"
          },
          {
            "name": "maximumInitialRedemptionInShares"
          },
          {
            "name": "maximumRedemptionFeeInFavourOfDistributor"
          },
          {
            "name": "maximumSubsequentRedemptionInAmount"
          },
          {
            "name": "maximumSubsequentRedemptionInShares"
          },
          {
            "name": "minimalInitialRedemptionInAmount"
          },
          {
            "name": "minimalInitialRedemptionInShares"
          },
          {
            "name": "minimalRedemptionCategory"
          },
          {
            "name": "minimalSubsequentRedemptionInAmount"
          },
          {
            "name": "minimalSubsequentRedemptionInShares"
          },
          {
            "name": "minimumRedemptionFeeInFavourOfDistributor"
          },
          {
            "name": "minimumRedemptionFeeInFavourOfFund"
          },
          {
            "name": "minimumSubscriptionFeeInFavourOfFund"
          },
          {
            "name": "performanceFeeMinimum"
          },
          {
            "name": "roundingMethodForPrices"
          },
          {
            "name": "roundingMethodForRedemptionInAmount"
          },
          {
            "name": "roundingMethodForRedemptionInShares"
          },
          {
            "name": "roundingMethodForSubscriptionInAmount"
          },
          {
            "name": "roundingMethodForSubscriptionInShares"
          },
          {
            "name": "shareClassDividendType"
          },
          {
            "name": "cusip"
          },
          {
            "name": "valor"
          },
          {
            "name": "fundId"
          },
          {
            "name": "imageUri"
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
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "enabled",
            "type": "bool"
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
            "name": "engine",
            "type": "pubkey"
          },
          {
            "name": "mints",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "metadata",
            "type": {
              "option": {
                "defined": {
                  "name": "metadata"
                }
              }
            }
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "assets",
            "type": {
              "vec": "pubkey"
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
            "name": "integrations",
            "type": {
              "vec": {
                "defined": {
                  "name": "integration"
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
            "name": "id",
            "type": {
              "option": "pubkey"
            }
          },
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
              "option": "string"
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
            "name": "externalVaultAccounts",
            "type": {
              "option": {
                "vec": "pubkey"
              }
            }
          },
          {
            "name": "mints",
            "type": {
              "option": {
                "vec": {
                  "defined": {
                    "name": "mintModel"
                  }
                }
              }
            }
          },
          {
            "name": "company",
            "type": {
              "option": {
                "defined": {
                  "name": "companyModel"
                }
              }
            }
          },
          {
            "name": "owner",
            "type": {
              "option": {
                "defined": {
                  "name": "managerModel"
                }
              }
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
          },
          {
            "name": "integrations",
            "type": {
              "option": {
                "vec": {
                  "defined": {
                    "name": "integration"
                  }
                }
              }
            }
          },
          {
            "name": "driftMarketIndexesPerp",
            "type": {
              "option": {
                "vec": "u32"
              }
            }
          },
          {
            "name": "driftMarketIndexesSpot",
            "type": {
              "option": {
                "vec": "u32"
              }
            }
          },
          {
            "name": "driftOrderTypes",
            "type": {
              "option": {
                "vec": "u32"
              }
            }
          },
          {
            "name": "metadata",
            "type": {
              "option": {
                "defined": {
                  "name": "metadata"
                }
              }
            }
          },
          {
            "name": "rawOpenfunds",
            "type": {
              "option": {
                "defined": {
                  "name": "fundOpenfundsModel"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "strategyParameters",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minBinId",
            "type": "i32"
          },
          {
            "name": "maxBinId",
            "type": "i32"
          },
          {
            "name": "strategyType",
            "type": {
              "defined": {
                "name": "strategyType"
              }
            }
          },
          {
            "name": "parameteres",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "strategyType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "spotOneSide"
          },
          {
            "name": "curveOneSide"
          },
          {
            "name": "bidAskOneSide"
          },
          {
            "name": "spotBalanced"
          },
          {
            "name": "curveBalanced"
          },
          {
            "name": "bidAskBalanced"
          },
          {
            "name": "spotImBalanced"
          },
          {
            "name": "curveImBalanced"
          },
          {
            "name": "bidAskImBalanced"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "seedAccountPolicy",
      "type": "string",
      "value": "\"account-policy\""
    },
    {
      "name": "seedEscrow",
      "type": "string",
      "value": "\"escrow\""
    },
    {
      "name": "seedMetadata",
      "type": "string",
      "value": "\"metadata\""
    },
    {
      "name": "seedMint",
      "type": "string",
      "value": "\"mint\""
    },
    {
      "name": "seedState",
      "type": "string",
      "value": "\"state\""
    },
    {
      "name": "seedVault",
      "type": "string",
      "value": "\"vault\""
    }
  ]
};
