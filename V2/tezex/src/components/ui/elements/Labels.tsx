import { FC } from "react";
import { BigNumber } from "bignumber.js";

import { TokenKind } from "../../../types/general";
import { tokenMantissaToDecimal } from "../../../functions/scaling";

export interface ITokenAmountOutput {
	asset: TokenKind;
	children: number | BigNumber | null;
}

export const TokenAmountOutput: FC<ITokenAmountOutput> = (props) => {
	return (
		<div>
			<label className="output-currency">
				{props.children
					? tokenMantissaToDecimal(props.children, props.asset).toString()
					: "0"}
			</label>
			<label className="output-currency-label">
				{props.asset as string}
			</label>
		</div>
	);
};
