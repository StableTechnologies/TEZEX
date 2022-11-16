import { KeyStore, KeyStoreType } from 'conseiljs';

export interface TokenTransaction {
    amount: number;
    block_level: string;
    destination: string;
    fee: number;
    kind: string;
    status: string;
    source: string;
    timestamp: number;
    parameters: string;
    operation_group_hash: string;
    entryPoint?: string;
}

export enum TokenKind {
    tzip7 = 'tzip7',
    usdtz = 'usdtz',
    tzbtc = 'tzbtc',
    wxtz = 'wxtz',
    ethtz = 'ethtz',
    kusd = 'kusd',
    blnd = 'blnd',
    objkt = 'objkt',
    stkr = 'stkr',
    tzip12 = 'tzip12',
    plenty = 'plenty',
}

export interface TokenDefinition {
    network: string;
    address: string;
    displayName: string;
    symbol: string;
    mapid: number;
    kind: TokenKind;
    scale: number;
    administrator?: string;
    icon?: string;
    tokenIndex?: number; // FA2/tzip12 tokens have an index, frequently 0
    balancePath?: string; // JSON path to the element inside the ledger bigmap value
    helpLink?: string;
}

export interface Token extends TokenDefinition {
    balance: number;
    transactions: TokenTransaction[];
    activeTab?: string;
    details?: any;
    precision?: number;
    round?: number;
    transactionFeeFloor?: number;
    displayHelpLink?: string;
    hideOnLanding?: boolean;
}

/**
 * A special token which is generated through locking XTZ in "vaults"
 */
export interface VaultToken extends Token {
    // Address of a contract which can originate Ovens
    vaultCoreAddress: string;

    // ID of a BigMap that contains the Oven Registry
    vaultRegistryMapId: number;

    // A list of Ovens owned by the user.
    vaultList: Vault[];
}

export interface ArtToken extends Token {
    marketAddress: string;
    nftMetadataMap: number;
    holderLocation?: 'key' | 'value'; // used for parsing map content for address of the holder, either in key or in the value
    provider?: string;
}

/**
 * Data about an Vault.
 */
export interface Vault {
    // TODO(keefertaylor): rename these vars

    /** Contract address of the Oven contract. */
    ovenAddress: string;

    /** Account of the Oven's owner. */
    ovenOwner: string;

    /** Balance of the Oven, in Mutez. */
    ovenBalance: number;

    /** Baker for the oven. */
    baker: string | undefined;
}

