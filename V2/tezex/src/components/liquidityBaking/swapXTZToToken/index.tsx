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
	const [inputAmountMantissa, setInputAmountMantissa] = useState<BigNumber | null>(null);
	const [outputAmountMantissa, setOutputAmountMantissa] = useState<number>(0);
	const [swapFields, setSwapFields] = useState<boolean>(false);
	const walletInfo = useWallet();
	const networkInfo = useNetwork();

	const transact = async () => {
		if (inputAmountMantissa && walletInfo) {
			await xtzToToken(
				inputAmountMantissa,
				networkInfo.addresses.tzbtc.dex.sirius,
				walletInfo
			);
		}
	};
	useEffect(() => {
		const estimateTokens = async () => {
			if (inputAmountMantissa) {
				console.log(
					"\n",
					"inputAmountMantissa : ",
					inputAmountMantissa.toString(),
					"\n"
				);
			}
			if (inputAmountMantissa && walletInfo) {
				setOutputAmountMantissa(
					await estimateTokensFromXtz(
						inputAmountMantissa,
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
	}, [inputAmountMantissa, walletInfo, networkInfo]);
	return (
		<div>
			<h3>{"Swap xtz for tzbtc"}</h3>
			<TokenAmountInput asset={TokenKind.XTZ} walletInfo={walletInfo} setMantissa={setInputAmountMantissa} mantissa={inputAmountMantissa}>
				{"xtz"}
			</TokenAmountInput>
			<TokenAmountOutput asset={TokenKind.XTZ}>
				{outputAmountMantissa}
			</TokenAmountOutput>
			<Transact callback={transact}>
				{"Buy TzBtc"}
			</Transact>
		</div>
	);
};
