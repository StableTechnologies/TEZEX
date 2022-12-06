import { FC, useState, useEffect } from "react";

import { BigNumber } from "bignumber.js";
import { TokenAmountInput } from "../../ui/elements/Inputs";
import { TokenAmountOutput } from "../../ui/elements/Labels";
import { useWallet } from "../../../hooks/wallet";
import { useNetwork } from "../../../hooks/network";
import {
	estimateTokensFromXtz,
	xtzToToken,
} from "../../../functions/liquidityBaking";
import { Transact } from "../../ui/elements/Buttons";

import { TokenKind } from "../../../types/general";

export interface ISwapToken {
	children: null;
}
export const SwapXTZToToken: FC = (props) => {
	const [amountOfXTZ, setAmountOfXTZ] = useState<BigNumber | null>(null);
	const [amountOfToken, setAmountOfToken] = useState<number>(0);
	const walletInfo = useWallet();
	const networkInfo = useNetwork();

	const transact = async () => {
		if (amountOfXTZ && walletInfo) {
			await xtzToToken(
				amountOfXTZ,
				networkInfo.addresses.tzbtc.dex.sirius,
				walletInfo
			);
		}
	};
	useEffect(() => {
		const estimateTokens = async () => {
			if (amountOfXTZ) {
				console.log(
					"\n",
					"amountOfXTZ : ",
					amountOfXTZ.toString(),
					"\n"
				);
			}
			if (amountOfXTZ && walletInfo) {
				setAmountOfToken(
					await estimateTokensFromXtz(
						amountOfXTZ,
						networkInfo.addresses.tzbtc.dex
							.sirius,
						walletInfo
					)
				);
			}
		};

		estimateTokens();
		return () => {
			//unmount code
		};
	}, [amountOfXTZ, walletInfo, networkInfo]);
	return (
		<div>
			<h3>{"Swap xtz for tzbtc"}</h3>
			<TokenAmountInput asset={TokenKind.XTZ} walletInfo={walletInfo} setAmount={setAmountOfXTZ}>
				{"xtz"}
			</TokenAmountInput>
			<TokenAmountOutput denomination="tzbtc">
				{amountOfToken}
			</TokenAmountOutput>
			<Transact callback={transact}>
				{"Buy TzBtc"}
			</Transact>
		</div>
	);
};
