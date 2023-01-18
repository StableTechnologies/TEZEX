export enum TokenKind {
  XTZ = "XTZ",
  TzBTC = "TzBTC",
  Sirius = "Sirius",
}

export interface Asset {
	name: TokenKind,
        label: string,
	logo: string,
}
