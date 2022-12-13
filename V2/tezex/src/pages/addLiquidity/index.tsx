import { FC, useState, useEffect } from "react";

import { BigNumber } from "bignumber.js";
import { TokenAmountInput } from "../../components/ui/elements/Inputs";
import { TokenAmountOutput } from "../../components/ui/elements/Labels";
import { useWallet } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";
import {
	estimateTokensFromXtz,
	estimateXtzFromToken,
	xtzToToken,
	tokenToXtz
} from "../../functions/liquidityBaking";
import { Transact } from "../../components/ui/elements/Buttons";
import { Toggle } from "../../components/ui/elements/Toggles";

import { TokenKind } from "../../types/general";

export interface ISwapToken {
	children: null;
}
export const AddLiquidity: FC = (props) => {
	const [tokenMantissa, setTokenMantissa] = useState<
		BigNumber | number | null
	>(null);
	const [xtzMantissa, setXtzMantissa] = useState<
		BigNumber | number | null
	>(null);
	const [inputAmountMantissa, setInputAmountMantissa] = useState<
		BigNumber | number | null
	>(null);
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
					await xtzToToken(
						new BigNumber(
							inputAmountMantissa
						),
						networkInfo.addresses.tzbtc.dex
							.sirius,
						walletInfo
					);
				break;
				case TokenKind.TzBTC: 
			                await tokenToXtz(new BigNumber(inputAmountMantissa), new BigNumber(outputAmountMantissa), networkInfo.addresses.tzbtc.dex.sirius, networkInfo.addresses.tzbtc.address, walletInfo)
			}
		}
	};


	useEffect(() => {
		const estimateTokens = async () => {
			if (xtzMantissa) {
				console.log(
					"\n",
					"xtzMantissa : ",
					xtzMantissa.toString(),
					"\n"
				);
			}
			if (xtzMantissa && walletInfo) {
				switch (inToken) {
					case TokenKind.XTZ:
						setOutputAmountMantissa(
							await estimateTokensFromXtz(
								new BigNumber(
									xtzMantissa
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
	}, [xtzMantissa, inToken, walletInfo, networkInfo]);

	useEffect(() => {
		const estimateTokens = async () => {
			if (tokenMantissa) {
				console.log(
					"\n",
					"xtzMantissa : ",
					tokenMantissa.toString(),
					"\n"
				);
			}
			if (tokenMantissa && walletInfo) {
				switch (inToken) {
					case TokenKind.TzBTC:
						setOutputAmountMantissa(
							await estimateXtzFromToken(
								new BigNumber(
									tokenMantissa.toString()
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
	}, [tokenMantissa, inToken, walletInfo, networkInfo]);
	return (
		<div>
			<h3>{"Add Liquidity" }</h3>
			<TokenAmountInput
				asset={TokenKind.XTZ}
				walletInfo={walletInfo}
				setMantissa={setInputAmountMantissa}
				mantissa={inputAmountMantissa}
				/>
			<TokenAmountInput
				asset={TokenKind.TzBTC}
				walletInfo={walletInfo}
				setMantissa={setInputAmountMantissa}
				mantissa={inputAmountMantissa}
				/>
			<Transact callback={transact}>{"Buy " + outToken as string}</Transact>
		</div>
	);
};
