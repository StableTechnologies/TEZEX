import { FC, useState, useEffect } from "react";

import { BigNumber } from "bignumber.js";
import {
	TokenAmountInput,
	Slippage,
} from "../../components/ui/elements/inputs";
import { TokenAmountOutput } from "../../components/ui/elements/Labels";
import { useWallet } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";
import {
	estimateTokensFromXtz,
	estimateXtzFromToken,
	buyLiquidityShares,
	lqtOutput,
	removeLiquidity,
} from "../../functions/liquidityBaking";
import { Transact } from "../../components/ui/elements/Buttons";
import { Toggle } from "../../components/ui/elements/Toggles";

import { TokenKind } from "../../types/general";

export interface IRemoveLiquidity {
	children: null;
}
export const RemoveLiquidity: FC = (props) => {
	const [inputAmountMantissa, setInputAmountMantissa] = useState<
		BigNumber | number | null
	>(null);
	const [slippage, setSlippage] = useState<BigNumber | number | null>(
		0.5
	);
	const [outputAmountMantissa, setOutputAmountMantissa] =
		useState<number>(0);
	const [xtzMantissa, setXtzMantissa] = useState<number>(0);
	const [tzbtcMantissa, setTzbtcMantissa] = useState<number>(0);
	const [outToken, setOutToken] = useState(TokenKind.TzBTC);
	const [inToken, setInToken] = useState(TokenKind.XTZ);
	const [swapFields, setSwapFields] = useState<boolean>(true);
	const walletInfo = useWallet();
	const networkInfo = useNetwork();

	const transact = async () => {
		if (inputAmountMantissa && walletInfo) {
			await removeLiquidity(
				new BigNumber(inputAmountMantissa),
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
				const { xtz, tzbtc } = await lqtOutput(
					new BigNumber(inputAmountMantissa),
					networkInfo.addresses.tzbtc.dex.sirius,
					walletInfo
				);
				setTzbtcMantissa(tzbtc.toNumber());
				setXtzMantissa(xtz.toNumber());
			}
		};

		estimateTokens();
		return () => {
			//unmount code
		};
	}, [inputAmountMantissa, inToken, walletInfo, networkInfo]);
	return (
		<div>
			<h3>{"Remove Liquidity"}</h3>
			<TokenAmountInput
				asset={TokenKind.Sirius}
				walletInfo={walletInfo}
				setMantissa={setInputAmountMantissa}
				mantissa={inputAmountMantissa}
			/>
			<TokenAmountOutput
				asset={TokenKind.XTZ}
				checkBalance={false}
			>
				{xtzMantissa}
			</TokenAmountOutput>
			<TokenAmountOutput
				asset={TokenKind.TzBTC}
				checkBalance={false}
			>
				{tzbtcMantissa}
			</TokenAmountOutput>
			<Transact callback={transact}>{"Sell Shares"}</Transact>
		</div>
	);
};
