import { FC, useState } from "react";
import { BigNumber } from "bignumber.js";

import { WalletInfo } from "../../../../contexts/wallet";

import { useNetwork } from "../../../../hooks/network";
import { TokenKind } from "../../../../types/general";
import { hasSufficientBalance } from "../../../../functions/beacon";
import { addSlippage } from "../../../../functions/liquidityBaking";
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
	slippage: BigNumber | number | null;
	amountMantissa: BigNumber;
	inverse?: boolean;
	balanceCheck?: boolean;
}

export const Slippage: FC<ISlippage> = (props) => {
	const [sufficientBalance, setSufficientBalance] = useState(true);
	const [inputString, setInputString] = useState("0");
	const net = useNetwork();
	const updateAmount = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputString(e.target.value);
		const num = props.inverse
			? new BigNumber(e.target.value).multipliedBy(-1)
			: new BigNumber(e.target.value);

		num.isNaN() ? props.setSlippage(null) : props.setSlippage(num);
		if (props.balanceCheck) {
			if (props.walletInfo && num.gt(0) && !num.isNaN()) {
				setSufficientBalance(
					await hasSufficientBalance(
						addSlippage(
							new BigNumber(
								e.target.value
							),
							props.amountMantissa
						),
						props.walletInfo,
						net,
						props.asset,
						true
					)
				);
			} else {
				setSufficientBalance(true);
			}
		}
	};

	const view = (): string => {
		if (props.slippage) {
			return( props.inverse ) ? new BigNumber(props.slippage).multipliedBy(-1).toString() :  new BigNumber(props.slippage).toString()
		} else return "0"
	}
	return (
		<div>
			<label style={{}} className="slippage-label">
				{"slippage "}
			</label>
			<input
				type="number"
				id="slippage"
				name="slippage"
				className="slippage-input"
				onChange={updateAmount}
				value={view()}
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
