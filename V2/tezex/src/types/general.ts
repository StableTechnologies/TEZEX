
import { BigNumber } from "bignumber.js";


export enum TokenKind {
  XTZ = "XTZ",
  TzBTC = "TzBTC",
  Sirius = "Sirius",
}

export interface Balance {
	decimal: BigNumber,
	mantissa: BigNumber,
}
export interface Asset {
	name: TokenKind,
        label: string,
	logo: string,
	address: string,
}
