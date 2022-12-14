import { FC, useEffect, useState } from "react";
import { BigNumber } from "bignumber.js";

import { TokenKind } from "../../../types/general";
import { tokenMantissaToDecimal } from "../../../functions/scaling";

import { hasSufficientBalance } from "../../../functions/beacon";
import { useWallet } from "../../../hooks/wallet";
import { useNetwork } from "../../../hooks/network";

export interface ITokenAmountOutput {
	asset: TokenKind;
	checkBalance?: boolean;
	children: number | BigNumber | null;
}

export const TokenAmountOutput: FC<ITokenAmountOutput> = (props) => {
	const [sufficientBalance, setSufficientBalance] = useState(true);

	const walletInfo = useWallet();
	const net = useNetwork();
	useEffect(() => {
		const checkBalance = async () => {
			if (props.checkBalance) {
				if (walletInfo && props.children) {
					setSufficientBalance(
						await hasSufficientBalance(
							new BigNumber(
								props.children
							),
							walletInfo,
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

		checkBalance();
		return () => {
			//unmount code
		};
	}, [props, walletInfo, net]);

	return (
		<div>
			<label className="output-currency">
				{props.children
					? tokenMantissaToDecimal(
							props.children,
							props.asset
					  ).toString()
					: "0"}
			</label>
			<label className="output-currency-label">
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
