import { FC, useState } from "react";
import { BigNumber } from "bignumber.js";

import { WalletInfo } from "../../../../contexts/wallet";

import { useNetwork } from "../../../../hooks/network";
import { TokenKind } from "../../../../types/general";
import { hasSufficientBalance } from "../../../../functions/beacon";
import {
	tokenDecimalToMantissa,
	tokenMantissaToDecimal,
} from "../../../../functions/scaling";

export interface ITokenAmountInput {
	asset: TokenKind;
	walletInfo: WalletInfo | null;
	setMantissa: React.Dispatch<
		React.SetStateAction<BigNumber | number | null>
	>;
	mantissa?: BigNumber | number | null;
}

export const TokenAmountInput: FC<ITokenAmountInput> = (props) => {
	const [sufficientBalance, setSufficientBalance] = useState(true);
	const [inputString, setInputString] = useState("0");
	const net = useNetwork();
	const updateAmount = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputString(e.target.value);
		const num = tokenDecimalToMantissa(e.target.value, props.asset);

		num.isNaN() ? props.setMantissa(null) : props.setMantissa(num);
		if (props.walletInfo && num.gt(0) && !num.isNaN()) {
			setSufficientBalance(
				await hasSufficientBalance(
					new BigNumber(e.target.value),
					props.walletInfo,
					net,
					props.asset
				)
			);
		} else {
			setSufficientBalance(true);
		}
	};
	const setValue = () => {
		if (props.mantissa) {
			if (
				new BigNumber(props.mantissa).isEqualTo(
					tokenDecimalToMantissa(
						new BigNumber(inputString),
						props.asset
					)
				)
			) {
				return inputString;
			} else {
				console.log(
					"\n",
					"props.mantissa, inputString : ",
					props.mantissa.toString(),
					inputString,
					"\n"
				);
				return tokenMantissaToDecimal(
					props.mantissa,
					props.asset
				).toString();
			}
		} else {
			return "";
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
				value={setValue()}
			></input>

			<label
				htmlFor="amountOfCurrency"
				className="input-currency"
			>
				{props.asset as string}
			</label>

			<label
				style={{ color: "red" }}
				className="balance-warning"
				hidden={sufficientBalance}
			>
				{"  Insufficient Balance"}
			</label>
		</div>
	);
};
