/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/glam_config.json`.
 */
export type GlamConfig = {
  "address": "gConFzxKL9USmwTdJoeQJvfKmqhJ2CyUaXTyQ8v9TGX",
  "metadata": {
    "name": "glamConfig",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Configuration program for GLAM protocol"
  },
  "instructions": [
    {
      "name": "addAssetMeta",
      "discriminator": [
        36,
        10,
        172,
        139,
        10,
        221,
        102,
        77
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
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
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
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
    },
    {
      "name": "deleteAssetMeta",
      "discriminator": [
        108,
        173,
        149,
        99,
        144,
        203,
        21,
        115
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
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
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "asset",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
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
            ]
          }
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
          "name": "admin",
          "type": "pubkey"
        },
        {
          "name": "feeAuthority",
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
        }
      ]
    },
    {
      "name": "updateAdmin",
      "discriminator": [
        161,
        176,
        40,
        213,
        60,
        184,
        179,
        228
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
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
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateAssetMeta",
      "discriminator": [
        223,
        61,
        171,
        60,
        126,
        37,
        49,
        45
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
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
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "asset",
          "type": "pubkey"
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
    },
    {
      "name": "updateProtocolFees",
      "discriminator": [
        158,
        219,
        253,
        143,
        54,
        45,
        113,
        182
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
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
            ]
          }
        },
        {
          "name": "feeAuthority",
          "signer": true,
          "relations": [
            "globalConfig"
          ]
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
      "name": "updateReferrer",
      "discriminator": [
        208,
        225,
        56,
        15,
        244,
        21,
        195,
        34
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
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
            ]
          }
        },
        {
          "name": "feeAuthority",
          "signer": true,
          "relations": [
            "globalConfig"
          ]
        }
      ],
      "args": [
        {
          "name": "referrer",
          "type": "pubkey"
        }
      ]
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
      "name": "invalidAssetMeta",
      "msg": "Invalid asset meta"
    },
    {
      "code": 6002,
      "name": "invalidParameters",
      "msg": "Invalid parameters"
    }
  ],
  "types": [
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
          }
        ]
      }
    }
  ]
};
