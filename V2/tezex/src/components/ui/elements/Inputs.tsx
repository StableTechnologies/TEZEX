import { FC, useState } from "react";
import { BigNumber } from "bignumber.js";

import { WalletInfo } from "../../../contexts/wallet";

import { TokenKind } from "../../../types/general";
import { hasSufficientBalance } from "../../../functions/beacon";

export interface ITokenAmountInput {
	asset: TokenKind;
	walletInfo: WalletInfo | null;
	setAmount: React.Dispatch<React.SetStateAction<BigNumber | null>>;
	children: string | never[];
}

export const TokenAmountInput: FC<ITokenAmountInput> = (props) => {
	const [sufficientBalance, setSufficientBalance] = useState(true);

	const updateAmount = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const num = new BigNumber(e.target.value).times(
			new BigNumber(1000000)
		);
		num.isNaN() ? props.setAmount(null) : props.setAmount(num);
		if (props.walletInfo){
		setSufficientBalance(
			await hasSufficientBalance(
				new BigNumber(e.target.value),
				props.walletInfo,
				props.asset
			)
		);
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
				{props.children}
			</label>
		</div>
	);
};
