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
  tokenPool: string;
  xtzPool: string;
  lqtTotal: string;
  active?: boolean; // Modified pools only
  paused?: boolean; // Modified pools only
  activationPending?: boolean; // Modified pools only
  tokenAddress: string;
  lqtAddress: string;
  selfIsUpdatingTokenPool: boolean;
  freezeBaker: boolean;
  manager: string;
  pending_manager?: string | null; // Modified pools only
  tokenId?: string; // Only for FA2
  protocol_fee_recipient?: string; // Modified pools only
  pending_protocol_fee_recipient?: string | null; // Modified pools only
  accumulated_protocol_fee_xtz?: string; // Modified pools only
  accumulated_protocol_fee_token?: string; // Modified pools only
}

export type TokenInfo = MichelsonMap<string, string>; // Map<string, bytes>

export interface TokenMetadataValue {
  token_id: number;
  token_info: TokenInfo;
}

export type TokenMetadata = MichelsonMap<number, TokenMetadataValue>;

export interface LqtStorage {
  tokens: MichelsonMap<string, string>;
  allowances: MichelsonMap<string, MichelsonMap<string, number>>;
  admin: string;
  total_supply: string;
  metadata: MichelsonMap<string, string>;
  token_metadata: TokenMetadata;
}

export type NetworkName = "testnet" | "mainnet" | "previewnet";

/** Immutable mod-pool fees (must match dexter_mod.mligo). */
export const MOD_LP_FEE_BP = 25;
export const MOD_PROTOCOL_FEE_BP = 5;
export const MOD_TOTAL_FEE_BP = MOD_LP_FEE_BP + MOD_PROTOCOL_FEE_BP;

export type TransferParams = {
  from: string;
  to: string;
  amount: string;
  tokenId?: string; // For FA2 tokens
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

type MichelsonType = {
  prim: string;
  args?: MichelsonType[];
  annots?: string[];
};

function combPair(...fields: MichelsonType[]): MichelsonType {
  if (fields.length < 2) {
    throw new Error("A comb pair requires at least two fields");
  }
  return fields.slice(0, -1).reduceRight<MichelsonType>(
    (right, left) => ({ prim: 'pair', args: [left, right] }),
    fields.at(-1)!
  );
}

const pendingManagerType: MichelsonType = {
  prim: 'option',
  args: [{ prim: 'address' }],
  annots: ['%pending_manager'],
};
const pendingProtocolFeeRecipientType: MichelsonType = {
  prim: 'option',
  args: [{ prim: 'address' }],
  annots: ['%pending_protocol_fee_recipient'],
};

export const dexStorageTypeMod = combPair(
  { prim: 'nat', annots: ['%tokenPool'] },
  { prim: 'mutez', annots: ['%xtzPool'] },
  { prim: 'nat', annots: ['%lqtTotal'] },
  { prim: 'bool', annots: ['%active'] },
  { prim: 'bool', annots: ['%paused'] },
  { prim: 'bool', annots: ['%activationPending'] },
  { prim: 'bool', annots: ['%selfIsUpdatingTokenPool'] },
  { prim: 'bool', annots: ['%freezeBaker'] },
  { prim: 'address', annots: ['%manager'] },
  pendingManagerType,
  { prim: 'address', annots: ['%tokenAddress'] },
  { prim: 'address', annots: ['%lqtAddress'] },
  { prim: 'address', annots: ['%protocol_fee_recipient'] },
  pendingProtocolFeeRecipientType,
  { prim: 'mutez', annots: ['%accumulated_protocol_fee_xtz'] },
  { prim: 'nat', annots: ['%accumulated_protocol_fee_token'] }
);

export const dexStorageTypeFA2Mod = combPair(
  { prim: 'nat', annots: ['%tokenPool'] },
  { prim: 'mutez', annots: ['%xtzPool'] },
  { prim: 'nat', annots: ['%lqtTotal'] },
  { prim: 'bool', annots: ['%active'] },
  { prim: 'bool', annots: ['%paused'] },
  { prim: 'bool', annots: ['%activationPending'] },
  { prim: 'bool', annots: ['%selfIsUpdatingTokenPool'] },
  { prim: 'bool', annots: ['%freezeBaker'] },
  { prim: 'address', annots: ['%manager'] },
  pendingManagerType,
  { prim: 'address', annots: ['%tokenAddress'] },
  { prim: 'nat', annots: ['%tokenId'] },
  { prim: 'address', annots: ['%lqtAddress'] },
  { prim: 'address', annots: ['%protocol_fee_recipient'] },
  pendingProtocolFeeRecipientType,
  { prim: 'mutez', annots: ['%accumulated_protocol_fee_xtz'] },
  { prim: 'nat', annots: ['%accumulated_protocol_fee_token'] }
);
