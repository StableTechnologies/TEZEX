import { MichelsonMap } from "@taquito/michelson-encoder";

export interface NetworkConfig {
  name: string;
  rpc: string;
  privateKey: string;
  gasLimit: number;
  storageLimit: number;
}

export interface DeploymentInfo {
  network: string;
  timestamp: string;
  contracts: {
    dex: string;
    lqt: string;
    token: string;
  };
}

export interface DexStorage {
  tokenPool: number;
  xtzPool: number;
  lqtTotal: number;
  tokenAddress: string;
  lqtAddress: string;
  selfIsUpdatingTokenPool: boolean;
  freezeBaker: boolean;
  manager: string;
  tokenId?: number; // Only for FA2
}

export type TokenInfo = MichelsonMap<string, string>; // Map<string, bytes>

export interface TokenMetadataValue {
  token_id: number;
  token_info: TokenInfo;
}

export type TokenMetadata = MichelsonMap<number, TokenMetadataValue>;

export interface LqtStorage {
  tokens: MichelsonMap<string, number>;
  allowances: MichelsonMap<string, MichelsonMap<string, number>>;
  admin: string;
  total_supply: number;
  metadata: MichelsonMap<string, string>;
  token_metadata: TokenMetadata;
}

export type NetworkName = "testnet" | "mainnet";

export type TransferParams = {
  from: string;
  to: string;
  amount: number;
  tokenId?: number; // For FA2 tokens
};


export const dexStorageType = {
  prim: 'pair',
  args: [
    { prim: 'nat', annots: ['%tokenPool'] },
    {
      prim: 'pair',
      args: [
        { prim: 'mutez', annots: ['%xtzPool'] },
        {
          prim: 'pair',
          args: [
            { prim: 'nat', annots: ['%lqtTotal'] },
            {
              prim: 'pair',
              args: [
                { prim: 'bool', annots: ['%selfIsUpdatingTokenPool'] },
                {
                  prim: 'pair',
                  args: [
                    { prim: 'bool', annots: ['%freezeBaker'] },
                    {
                      prim: 'pair',
                      args: [
                        { prim: 'address', annots: ['%manager'] },
                        {
                          prim: 'pair',
                          args: [
                            { prim: 'address', annots: ['%tokenAddress'] },
                            { prim: 'address', annots: ['%lqtAddress'] }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export const dexStorageTypeFA2 = {
  prim: 'pair',
  args: [
    { prim: 'nat', annots: ['%tokenPool'] },
    {
      prim: 'pair',
      args: [
        { prim: 'mutez', annots: ['%xtzPool'] },
        {
          prim: 'pair',
          args: [
            { prim: 'nat', annots: ['%lqtTotal'] },
            {
              prim: 'pair',
              args: [
                { prim: 'bool', annots: ['%selfIsUpdatingTokenPool'] },
                {
                  prim: 'pair',
                  args: [
                    { prim: 'bool', annots: ['%freezeBaker'] },
                    {
                      prim: 'pair',
                      args: [
                        { prim: 'address', annots: ['%manager'] },
                        {
                          prim: 'pair',
                          args: [
                            { prim: 'address', annots: ['%tokenAddress'] },
                            {
                              prim: 'pair',
                              args: [
                                { prim: 'nat', annots: ['%tokenId'] },
                                { prim: 'address', annots: ['%lqtAddress'] }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export const lqtStorageType = {
  prim: 'pair',
  args: [
    { prim: 'big_map', args: [{ prim: 'address' }, { prim: 'nat' }], annots: ['%tokens'] },
    {
      prim: 'pair',
      args: [
        { prim: 'big_map', args: [{ prim: 'pair', args: [{ prim: 'address', annots: ['%owner'] }, { prim: 'address', annots: ['%spender'] }] }, { prim: 'nat' }], annots: ['%allowances'] },
        {
          prim: 'pair',
          args: [
            { prim: 'address', annots: ['%admin'] },
            {
              prim: 'pair',
              args: [
                { prim: 'nat', annots: ['%total_supply'] },
                {
                  prim: 'pair',
                  args: [
                    { prim: 'big_map', args: [{ prim: 'string' }, { prim: 'bytes' }], annots: ['%metadata'] },
                    { prim: 'big_map', args: [{ prim: 'nat' }, { prim: 'pair', args: [{ prim: 'nat', annots: ['%token_id'] }, { prim: 'map', args: [{ prim: 'string' }, { prim: 'bytes' }], annots: ['%token_info'] }] }], annots: ['%token_metadata'] }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export const dexStorageTypeMod = {
  prim: 'pair',
  args: [
    { prim: 'nat', annots: ['%tokenPool'] },
    {
      prim: 'pair',
      args: [
        { prim: 'mutez', annots: ['%xtzPool'] },
        {
          prim: 'pair',
          args: [
            { prim: 'nat', annots: ['%lqtTotal'] },
            {
              prim: 'pair',
              args: [
                { prim: 'bool', annots: ['%selfIsUpdatingTokenPool'] },
                {
                  prim: 'pair',
                  args: [
                    { prim: 'bool', annots: ['%freezeBaker'] },
                    {
                      prim: 'pair',
                      args: [
                        { prim: 'address', annots: ['%manager'] },
                        {
                          prim: 'pair',
                          args: [
                            { prim: 'address', annots: ['%tokenAddress'] },
                            {
                              prim: 'pair',
                              args: [
                                { prim: 'address', annots: ['%lqtAddress'] },
                                {
                                  prim: 'pair',
                                  args: [
                                    { prim: 'nat', annots: ['%protocol_fee_bp'] },
                                    {
                                      prim: 'pair',
                                      args: [
                                        { prim: 'address', annots: ['%protocol_fee_recipient'] },
                                        {
                                          prim: 'pair',
                                          args: [
                                            { prim: 'mutez', annots: ['%accumulated_protocol_fee_xtz'] },
                                            { prim: 'nat', annots: ['%accumulated_protocol_fee_token'] }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export const dexStorageTypeFA2Mod = {
  prim: 'pair',
  args: [
    { prim: 'nat', annots: ['%tokenPool'] },
    {
      prim: 'pair',
      args: [
        { prim: 'mutez', annots: ['%xtzPool'] },
        {
          prim: 'pair',
          args: [
            { prim: 'nat', annots: ['%lqtTotal'] },
            {
              prim: 'pair',
              args: [
                { prim: 'bool', annots: ['%selfIsUpdatingTokenPool'] },
                {
                  prim: 'pair',
                  args: [
                    { prim: 'bool', annots: ['%freezeBaker'] },
                    {
                      prim: 'pair',
                      args: [
                        { prim: 'address', annots: ['%manager'] },
                        {
                          prim: 'pair',
                          args: [
                            { prim: 'address', annots: ['%tokenAddress'] },
                            {
                              prim: 'pair',
                              args: [
                                { prim: 'nat', annots: ['%tokenId'] },
                                {
                                  prim: 'pair',
                                  args: [
                                    { prim: 'address', annots: ['%lqtAddress'] },
                                    {
                                      prim: 'pair',
                                      args: [
                                        { prim: 'nat', annots: ['%protocol_fee_bp'] },
                                        {
                                          prim: 'pair',
                                          args: [
                                            { prim: 'address', annots: ['%protocol_fee_recipient'] },
                                            {
                                              prim: 'pair',
                                              args: [
                                                { prim: 'mutez', annots: ['%accumulated_protocol_fee_xtz'] },
                                                { prim: 'nat', annots: ['%accumulated_protocol_fee_token'] }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
