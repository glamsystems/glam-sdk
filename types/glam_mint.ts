/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/glam_mint.json`.
 */
export type GlamMint = {
  "address": "GM1NtvvnSXUptTrMCqbogAdZJydZSNv98DoU5AZVLmGh",
  "metadata": {
    "name": "glamMint",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "GLAM mint program"
  },
  "instructions": [
    {
      "name": "burnTokens",
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
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancel",
      "discriminator": [
        232,
        219,
        223,
        41,
        219,
        236,
        220,
        190
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
                "path": "glamMint"
              }
            ]
          }
        },
        {
          "name": "requestQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116,
                  45,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "recoverTokenMint"
        },
        {
          "name": "signerAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "recoverTokenProgram"
              },
              {
                "kind": "account",
                "path": "recoverTokenMint"
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
          "name": "escrowAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamEscrow"
              },
              {
                "kind": "account",
                "path": "recoverTokenProgram"
              },
              {
                "kind": "account",
                "path": "recoverTokenMint"
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
          "name": "recoverTokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
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
          "name": "glamState"
        },
        {
          "name": "glamMint",
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
                "path": "glamMint"
              }
            ]
          }
        },
        {
          "name": "requestQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116,
                  45,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "claimTokenMint"
        },
        {
          "name": "signerAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "claimTokenProgram"
              },
              {
                "kind": "account",
                "path": "claimTokenMint"
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
          "name": "escrowAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamEscrow"
              },
              {
                "kind": "account",
                "path": "claimTokenProgram"
              },
              {
                "kind": "account",
                "path": "claimTokenMint"
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
          "name": "claimTokenProgram"
        },
        {
          "name": "glamPoliciesProgram",
          "address": "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": []
    },
    {
      "name": "closeMint",
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
          "name": "glamSigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "glamMint",
          "writable": true
        },
        {
          "name": "extraMetasAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "policiesProgram",
          "address": "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
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
                "path": "glamMint"
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
          "name": "glamProtocolProgram",
          "address": "Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "disburseFees",
      "discriminator": [
        205,
        56,
        198,
        40,
        225,
        103,
        141,
        219
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
            ],
            "program": {
              "kind": "const",
              "value": [
                232,
                10,
                169,
                27,
                254,
                250,
                63,
                12,
                15,
                241,
                59,
                235,
                9,
                141,
                77,
                107,
                139,
                4,
                36,
                112,
                155,
                14,
                140,
                189,
                31,
                2,
                245,
                179,
                185,
                182,
                12,
                199
              ]
            }
          }
        },
        {
          "name": "glamMint",
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
                "path": "glamMint"
              }
            ]
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
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "depositAsset"
        },
        {
          "name": "vaultDepositAta",
          "docs": [
            "To pay out fees"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamVault"
              },
              {
                "kind": "account",
                "path": "depositTokenProgram"
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
          "name": "protocolFeeAuthority",
          "docs": [
            "To receive protocol fee"
          ]
        },
        {
          "name": "protocolFeeAuthorityAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "protocolFeeAuthority"
              },
              {
                "kind": "account",
                "path": "depositTokenProgram"
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
          "name": "managerFeeAuthority",
          "docs": [
            "To receive manager fee"
          ]
        },
        {
          "name": "managerFeeAuthorityAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "managerFeeAuthority"
              },
              {
                "kind": "account",
                "path": "depositTokenProgram"
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
                  95,
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
          "name": "glamProtocolProgram",
          "address": "Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "depositTokenProgram"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "emergencyUpdateMint",
      "discriminator": [
        141,
        210,
        26,
        160,
        120,
        140,
        28,
        239
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "policiesProgram",
          "address": "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY"
        },
        {
          "name": "glamProtocol",
          "address": "Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc"
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
      "name": "forceTransferTokens",
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
          "name": "toPolicyAccount",
          "writable": true,
          "optional": true
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
          "name": "policiesProgram",
          "address": "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY"
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
            ],
            "program": {
              "kind": "const",
              "value": [
                232,
                10,
                169,
                27,
                254,
                250,
                63,
                12,
                15,
                241,
                59,
                235,
                9,
                141,
                77,
                107,
                139,
                4,
                36,
                112,
                155,
                14,
                140,
                189,
                31,
                2,
                245,
                179,
                185,
                182,
                12,
                199
              ]
            }
          }
        },
        {
          "name": "glamMint",
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
                "path": "glamMint"
              }
            ]
          }
        },
        {
          "name": "requestQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116,
                  45,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "glamMint"
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
                "kind": "account",
                "path": "depositTokenProgram"
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
                "kind": "account",
                "path": "depositTokenProgram"
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
          "name": "depositTokenProgram"
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
          "name": "glamProtocolProgram",
          "address": "Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc"
        }
      ],
      "args": []
    },
    {
      "name": "initializeMint",
      "docs": [
        "Initialize a new GLAM mint with extensions and metadata.",
        "",
        "* `mint_model` - Configuration model containing mint parameters and metadata",
        "* `created_key` - 8-byte key used in the GLAM state PDA derivation",
        "* `account_type` - Fund (for tokenized vault mint) or Mint",
        "* `decimals` - Decimals of new mint"
      ],
      "discriminator": [
        209,
        42,
        195,
        4,
        129,
        85,
        209,
        44
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "newMint",
          "writable": true
        },
        {
          "name": "requestQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116,
                  45,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "newMint"
              }
            ]
          }
        },
        {
          "name": "extraMetasAccount",
          "writable": true
        },
        {
          "name": "baseAssetMint",
          "optional": true
        },
        {
          "name": "baseAssetTokenProgram",
          "optional": true
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
          "name": "policiesProgram",
          "address": "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY"
        },
        {
          "name": "glamProtocol",
          "address": "Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc"
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
        },
        {
          "name": "createdKey",
          "type": {
            "array": [
              "u8",
              8
            ]
          }
        },
        {
          "name": "accountType",
          "type": {
            "defined": {
              "name": "accountType"
            }
          }
        },
        {
          "name": "decimals",
          "type": {
            "option": "u8"
          }
        }
      ]
    },
    {
      "name": "mintTokens",
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
          "name": "recipient",
          "writable": true
        },
        {
          "name": "policyAccount",
          "writable": true,
          "optional": true
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
          "name": "policiesProgram",
          "address": "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY"
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
      "name": "queuedRedeem",
      "discriminator": [
        82,
        242,
        202,
        93,
        170,
        196,
        215,
        113
      ],
      "accounts": [
        {
          "name": "glamState"
        },
        {
          "name": "glamMint",
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
                "path": "glamMint"
              }
            ]
          }
        },
        {
          "name": "requestQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116,
                  45,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "amountIn",
          "type": "u64"
        }
      ]
    },
    {
      "name": "queuedSubscribe",
      "discriminator": [
        107,
        180,
        212,
        63,
        146,
        0,
        159,
        255
      ],
      "accounts": [
        {
          "name": "glamState"
        },
        {
          "name": "glamMint",
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
                "path": "glamMint"
              }
            ]
          }
        },
        {
          "name": "requestQueue",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116,
                  45,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "glamMint"
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
          "name": "depositAsset"
        },
        {
          "name": "escrowDepositAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "glamEscrow"
              },
              {
                "kind": "account",
                "path": "depositTokenProgram"
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
                "kind": "account",
                "path": "depositTokenProgram"
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "depositTokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setProtocolFees",
      "discriminator": [
        49,
        143,
        189,
        18,
        56,
        206,
        158,
        226
      ],
      "accounts": [
        {
          "name": "glamState",
          "writable": true
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
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
                  95,
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
          "name": "glamProtocolProgram",
          "address": "Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc"
        }
      ],
      "args": [
        {
          "name": "baseFeeBps",
          "type": "u16"
        },
        {
          "name": "flowFeeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setTokenAccountsStates",
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
          "name": "frozen",
          "type": "bool"
        }
      ]
    },
    {
      "name": "subscribe",
      "discriminator": [
        254,
        28,
        191,
        138,
        156,
        179,
        183,
        53
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
            ],
            "program": {
              "kind": "const",
              "value": [
                232,
                10,
                169,
                27,
                254,
                250,
                63,
                12,
                15,
                241,
                59,
                235,
                9,
                141,
                77,
                107,
                139,
                4,
                36,
                112,
                155,
                14,
                140,
                189,
                31,
                2,
                245,
                179,
                185,
                182,
                12,
                199
              ]
            }
          }
        },
        {
          "name": "glamMint",
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
                "path": "glamMint"
              }
            ]
          }
        },
        {
          "name": "requestQueue",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116,
                  45,
                  113,
                  117,
                  101,
                  117,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "glamMint"
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
                "kind": "account",
                "path": "depositTokenProgram"
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
                "kind": "account",
                "path": "depositTokenProgram"
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
          "name": "depositTokenProgram"
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
          "name": "policiesProgram",
          "address": "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY"
        },
        {
          "name": "glamProtocolProgram",
          "address": "Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc"
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateMint",
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "policiesProgram",
          "address": "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY"
        },
        {
          "name": "glamProtocol",
          "address": "Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc"
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
      "name": "updateMintApplyTimelock",
      "discriminator": [
        223,
        241,
        80,
        24,
        120,
        25,
        82,
        134
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "policiesProgram",
          "address": "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY"
        },
        {
          "name": "glamProtocol",
          "address": "Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc"
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
      "name": "requestQueue",
      "discriminator": [
        172,
        124,
        172,
        253,
        233,
        63,
        70,
        234
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
      "code": 6000,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6001,
      "name": "notAuthorized",
      "msg": "Signer is not authorized"
    },
    {
      "code": 6002,
      "name": "actionPaused",
      "msg": "Requested action is paused"
    },
    {
      "code": 6003,
      "name": "invalidAsset",
      "msg": "Asset not allowed to subscribe"
    },
    {
      "code": 6004,
      "name": "maxCapExceeded",
      "msg": "Max cap exceeded"
    },
    {
      "code": 6005,
      "name": "invalidAmount",
      "msg": "Invalid amount for subscription or redemption"
    },
    {
      "code": 6006,
      "name": "newRequestNotAllowed",
      "msg": "New request is not allowed"
    },
    {
      "code": 6007,
      "name": "requestNotClaimable",
      "msg": "Request is not claimable"
    },
    {
      "code": 6008,
      "name": "requestNotCancellable",
      "msg": "Request is not cancellable"
    },
    {
      "code": 6009,
      "name": "requestNotFound",
      "msg": "Request not found"
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
            "name": "lockUpPeriod"
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
            "name": "maxCap"
          },
          {
            "name": "minSubscription"
          },
          {
            "name": "minRedemption"
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
          },
          {
            "name": "subscriptionPaused"
          },
          {
            "name": "redemptionPaused"
          },
          {
            "name": "owner"
          },
          {
            "name": "enabled"
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
            "name": "integrations"
          },
          {
            "name": "updateTimelock"
          },
          {
            "name": "timelockExpiresAt"
          },
          {
            "name": "defaultAccountStateFrozen"
          },
          {
            "name": "permanentDelegate"
          },
          {
            "name": "timeUnit"
          },
          {
            "name": "kaminoLendingMarkets"
          },
          {
            "name": "meteoraDlmmPools"
          },
          {
            "name": "borrowableAssets"
          },
          {
            "name": "driftVaultsAllowlist"
          },
          {
            "name": "kaminoVaultsAllowlist"
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
            "name": "u32",
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
            "name": "vecIntegration",
            "fields": [
              {
                "name": "val",
                "type": {
                  "vec": {
                    "defined": {
                      "name": "integration"
                    }
                  }
                }
              }
            ]
          },
          {
            "name": "timeUnit",
            "fields": [
              {
                "name": "val",
                "type": {
                  "defined": {
                    "name": "timeUnit"
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
              "The authority that can modify fee structure of individual glam state",
              "and claim protocol fees"
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
          },
          {
            "name": "driftVaults"
          },
          {
            "name": "kaminoVaults"
          },
          {
            "name": "validator"
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
            "name": "lockUpPeriod",
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "yearInSeconds",
            "type": {
              "option": "u32"
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
            "name": "notifyAndSettle",
            "type": {
              "option": {
                "defined": {
                  "name": "notifyAndSettle"
                }
              }
            }
          },
          {
            "name": "maxCap",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "minSubscription",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "minRedemption",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "subscriptionPaused",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "redemptionPaused",
            "type": {
              "option": "bool"
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
            "name": "fullShareClassName",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "hasPerformanceFee",
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "investmentStatus",
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
            "name": "minimalSubsequentSubscriptionInAmount",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "minimalSubsequentSubscriptionInShares",
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
            "name": "hasLockUpForRedemption",
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
            "name": "minimalSubsequentRedemptionInAmount",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "minimalSubsequentRedemptionInShares",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "roundingMethodForPrices",
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
            "name": "padding",
            "type": {
              "array": [
                "u8",
                4
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
            "name": "lstPoolState"
          },
          {
            "name": "marinadeState"
          },
          {
            "name": "baseAsset"
          }
        ]
      }
    },
    {
      "name": "pendingRequest",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "incoming",
            "type": "u64"
          },
          {
            "name": "outgoing",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "u64"
          },
          {
            "name": "fulfilledAt",
            "type": "u64"
          },
          {
            "name": "timeUnit",
            "type": "u8"
          },
          {
            "name": "requestType",
            "type": {
              "defined": {
                "name": "requestType"
              }
            }
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
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
      "name": "permission",
      "docs": [
        "* Delegate ACL"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "driftInit"
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
            "name": "driftOrders"
          },
          {
            "name": "driftBorrow"
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
            "name": "driftCancelOrders"
          },
          {
            "name": "jupiterSwapAllowlisted"
          },
          {
            "name": "jupiterSwapAny"
          },
          {
            "name": "wSol"
          },
          {
            "name": "driftClaim"
          },
          {
            "name": "mintMintTokens"
          },
          {
            "name": "mintBurnTokens"
          },
          {
            "name": "mintForceTransferTokens"
          },
          {
            "name": "mintSetTokenAccountState"
          },
          {
            "name": "jupiterGovStake"
          },
          {
            "name": "jupiterGovVoteOnProposal"
          },
          {
            "name": "jupiterGovUnstake"
          },
          {
            "name": "jupiterSwapLst"
          },
          {
            "name": "jupiterSwapPriceable"
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
            "name": "kaminoWithdraw"
          },
          {
            "name": "kaminoClaim"
          },
          {
            "name": "meteoraDlmmPosition"
          },
          {
            "name": "meteoraDlmmLiquidity"
          },
          {
            "name": "meteoraDlmmClaim"
          },
          {
            "name": "meteoraDlmmSwap"
          },
          {
            "name": "transferToAllowlisted"
          },
          {
            "name": "jupiterGovWithdraw"
          },
          {
            "name": "jupiterGovClaim"
          },
          {
            "name": "emergencyUpdate"
          },
          {
            "name": "driftVaultsDeposit"
          },
          {
            "name": "driftVaultsWithdraw"
          },
          {
            "name": "kaminoVaultsDeposit"
          },
          {
            "name": "kaminoVaultsWithdraw"
          },
          {
            "name": "validatorAdmin"
          },
          {
            "name": "validatorWithdraw"
          },
          {
            "name": "validatorWithdrawToAny"
          },
          {
            "name": "validatorWithdrawToIdentity"
          },
          {
            "name": "fulfill"
          },
          {
            "name": "claimFees"
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
      "name": "requestQueue",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "glamState",
            "type": "pubkey"
          },
          {
            "name": "glamMint",
            "type": "pubkey"
          },
          {
            "name": "data",
            "type": {
              "vec": {
                "defined": {
                  "name": "pendingRequest"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "requestType",
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
            "name": "baseAssetMint",
            "type": "pubkey"
          },
          {
            "name": "baseAssetTokenProgram",
            "type": "u8"
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
