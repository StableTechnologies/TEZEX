import { FC, useState } from "react";
import { BigNumber } from "bignumber.js";

import { WalletInfo } from "../../../contexts/wallet";

import { TokenKind } from "../../../types/general";
import { hasSufficientBalance } from "../../../functions/beacon";
import {
	tokenDecimalToMantissa,
	tokenMantissaToDecimal,
} from "../../../functions/scaling";

export interface ITokenAmountInput {
	asset: TokenKind;
	walletInfo: WalletInfo | null;
	setMantissa: React.Dispatch<React.SetStateAction<BigNumber | null>>;
	children: string | never[];
	mantissa?: BigNumber | null;
}

export const TokenAmountInput: FC<ITokenAmountInput> = (props) => {
	const [sufficientBalance, setSufficientBalance] = useState(true);

	const updateAmount = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const num = tokenDecimalToMantissa(e.target.value, props.asset);
		num.isNaN() ? props.setMantissa(null) : props.setMantissa(num);
		if (props.walletInfo && num.gt(0) && !num.isNaN()) {
			setSufficientBalance(
				await hasSufficientBalance(
					new BigNumber(e.target.value),
					props.walletInfo,
					props.asset
				)
			);
		} else {
			setSufficientBalance(true)
		}
		
	};

	return (
		<div>
			<input
				type="number"
				id="amountOfCurrency"
				name="amountOfCurrency"
				className="input-currency"
				onChange={updateAmount}
				value={
					props.mantissa
						? tokenMantissaToDecimal(
								props.mantissa,
								props.asset
						  ).toString()
						: "0"
				}
			></input>

			<label
				htmlFor="amountOfCurrency"
				className="balance-warning"
				hidden={sufficientBalance}
			>
				{"Insufficient Balance"}
			</label>
			<label
				htmlFor="amountOfCurrency"
				className="input-currency"
			>
				{props.asset as string}
			</label>
		</div>
	);
};
