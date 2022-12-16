import { FC, useState, useEffect } from "react";

import { BigNumber } from "bignumber.js";
import { TokenAmountInput, Slippage} from "../../components/ui/elements/inputs";
import { TokenAmountOutput } from "../../components/ui/elements/Labels";
import { useWallet } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";
import {
	estimateTokensFromXtz,
	estimateXtzFromToken,
	buyLiquidityShares
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
	const [slippage, setSlippage] =
		useState<BigNumber | number | null>(0.5);
	const [outputAmountMantissa, setOutputAmountMantissa] =
		useState<number>(0);
	const [outToken, setOutToken] = useState(TokenKind.TzBTC);
	const [inToken, setInToken] = useState(TokenKind.XTZ);
	const [swapFields, setSwapFields] = useState<boolean>(true);
	const walletInfo = useWallet();
	const networkInfo = useNetwork();

	const transact = async () => {
		if (inputAmountMantissa && walletInfo) {
			switch (inToken) {
				case TokenKind.XTZ:
					await buyLiquidityShares(
						new BigNumber(
							outputAmountMantissa
						),
						new BigNumber(
							inputAmountMantissa
						),
						new BigNumber(
							(slippage)? slippage: 0
						),
						networkInfo.addresses.tzbtc.dex
							.sirius,
						networkInfo.addresses.tzbtc.address,
						walletInfo
					);
				break;
				case TokenKind.TzBTC: 
					await buyLiquidityShares(
						new BigNumber(
							inputAmountMantissa
						),
						new BigNumber(
							outputAmountMantissa
						),
						new BigNumber(
							(slippage)? slippage: 0
						),
						networkInfo.addresses.tzbtc.dex
							.sirius,
						networkInfo.addresses.tzbtc.address,
						walletInfo
					);
			}
		}
	};

	useEffect(() => {
		if (swapFields) {
			if (inToken === TokenKind.XTZ) {
				setInputAmountMantissa(outputAmountMantissa)
			}
			setInToken(TokenKind.TzBTC);
			setOutToken(TokenKind.XTZ);
		} else {

			if (inToken === TokenKind.TzBTC) {
				setInputAmountMantissa(outputAmountMantissa)
			}
			setInToken(TokenKind.XTZ);
			setOutToken(TokenKind.TzBTC);
		}
	}, [inToken,outToken,swapFields, outputAmountMantissa]);

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
				switch (inToken) {
					case TokenKind.XTZ:
						setOutputAmountMantissa(
							await estimateTokensFromXtz(
								new BigNumber(
									inputAmountMantissa
								),
								networkInfo
									.addresses
									.tzbtc
									.dex
									.sirius,
								walletInfo
							)
						);
						break;
					case TokenKind.TzBTC:
						setOutputAmountMantissa(
							await estimateXtzFromToken(
								new BigNumber(
									inputAmountMantissa
								),
								networkInfo
									.addresses
									.tzbtc
									.dex
									.sirius,
								walletInfo
							)
						);
						break;
				}
			}
		};

		estimateTokens();
		return () => {
			//unmount code
		};
	}, [inputAmountMantissa, inToken, walletInfo, networkInfo]);
	return (
		<div>
			<h3>{"Remove Liquidity" }</h3>
			<TokenAmountInput
				asset={TokenKind.Sirius}
				walletInfo={walletInfo}
				setMantissa={setInputAmountMantissa}
				mantissa={inputAmountMantissa}
				/>
			<Toggle toggle={swapFields} setToggle={setSwapFields}>
				{"swap fields"}
			</Toggle>
			<TokenAmountOutput asset={outToken} checkBalance={false}>
				{outputAmountMantissa}
			</TokenAmountOutput>
			<TokenAmountOutput asset={outToken} checkBalance={false}>
				{outputAmountMantissa}
			</TokenAmountOutput>
			<Slippage
				asset={TokenKind.TzBTC}
				walletInfo={walletInfo}
				setSlippage={setSlippage}
				slippage={slippage}
				amountMantissa={new BigNumber(outputAmountMantissa)}
				/>
			<Transact callback={transact}>{"Buy Shares"}</Transact>
		</div>
	);
};
