import { FC, useState, useEffect } from "react";

import { BigNumber } from "bignumber.js";
import { TokenAmountInput } from "../../ui/elements/Inputs";
import { TokenAmountOutput } from "../../ui/elements/Labels";
import { useWallet } from "../../../hooks/wallet";
import { useNetwork } from "../../../hooks/network";
import { estimateTokensFromXtz } from "../../../functions/liquidityBaking";
import { Transact } from "../../ui/elements/Buttons";

export interface ISwapToken {
	children: null;
}
export const SwapXTZToToken: FC = (props) => {
	const [amountOfXTZ, setAmountOfXTZ] = useState<BigNumber | null>(null);
	const [amountOfToken, setAmountOfToken] = useState<number>(0);
	const walletInfo = useWallet();
	const networkInfo = useNetwork();

	useEffect(() => {
		const estimateTokens = async () => {
			if (amountOfXTZ && walletInfo) {
				setAmountOfToken(await estimateTokensFromXtz(
					amountOfXTZ,
					networkInfo.addresses.tzbtc.dex.sirius,
					walletInfo
				));
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
			<TokenAmountInput setAmount={setAmountOfXTZ}>
				{"xtz"}
			</TokenAmountInput>
			<TokenAmountOutput denomination="tzbtc">
				{amountOfToken}
			</TokenAmountOutput>
		</div>
	);
};
