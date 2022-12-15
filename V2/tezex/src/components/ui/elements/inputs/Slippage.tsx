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

export interface ISlippage {
	asset: TokenKind;
	walletInfo: WalletInfo | null;
	setSlippage: React.Dispatch<
		React.SetStateAction<BigNumber | number | null>
	>;
	slippage:  number | null;
	amountMantissa:  BigNumber ;
}

function addSlippage(slippage: BigNumber | number | null, tokenMantissa: BigNumber){
	if (slippage){

			return tokenMantissa.plus(
				tokenMantissa.multipliedBy(slippage).div(100)
			).integerValue(
					BigNumber.ROUND_DOWN
				);
	}else{ return tokenMantissa}
}
export const Slippage: FC<ISlippage> = (props) => {
	const [sufficientBalance, setSufficientBalance] = useState(true);
	const [inputString, setInputString] = useState("0");
	const net = useNetwork();
	const updateAmount = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputString(e.target.value);
		const num = tokenDecimalToMantissa(e.target.value, props.asset);

		num.isNaN() ? props.setSlippage(null) : props.setSlippage(num);
		if (props.walletInfo && num.gt(0) && !num.isNaN()) {
			setSufficientBalance(
				await hasSufficientBalance(
					addSlippage(new BigNumber(e.target.value), props.amountMantissa),
					props.walletInfo,
					net,
					props.asset,
					true
				)
			);
		} else {
			setSufficientBalance(true);
		}
	};

	return (
		<div>
			<input
				type="number"
				id="slippage"
				name="slippage"
				className="slippage-input"
				onChange={updateAmount}
				value={(props.slippage)? props.slippage : "0"}
			></input>


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
