import { KeyStore, KeyStoreType } from 'conseiljs';

export enum TokenKind {
  XTZ = "XTZ",
  TzBTC = "TzBTC",
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

