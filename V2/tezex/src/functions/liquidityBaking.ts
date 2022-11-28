import { TezosToolkit, OpKind } from "@taquito/taquito"
import { BigNumber } from 'bignumber.js' ;

import { WalletInfo } from "../contexts/wallet";
const creditSubsidy = (xtzPool: BigNumber | number): BigNumber => {
    const LIQUIDITY_BAKING_SUBSIDY = 2500000;
    if (BigNumber.isBigNumber(xtzPool)) {
      return xtzPool.plus(new BigNumber(LIQUIDITY_BAKING_SUBSIDY));
    } else {
      return new BigNumber(xtzPool).plus(new BigNumber(LIQUIDITY_BAKING_SUBSIDY));
    }
  };

// outputs the amount of tzBTC tokens for a given amount of XTZ
const xtzToTokenTokenOutput = (p: {
    xtzIn: BigNumber | number;
    xtzPool: BigNumber | number;
    tokenPool: BigNumber | number;
}): BigNumber | null => {
    let { xtzIn, xtzPool: _xtzPool, tokenPool } = p;

    let xtzPool = creditSubsidy(_xtzPool);
    let xtzIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      xtzIn_.isGreaterThan(0) &&
      xtzPool_.isGreaterThan(0) &&
      tokenPool_.isGreaterThan(0)
    ) {
      // Includes 0.1% fee and 0.1% burn calculated separatedly: 999/1000 * 999/1000 = 998100/1000000
      // (xtzIn_ * tokenPool_ * 999 * 999) / (tokenPool * 1000 - tokenOut * 999 * 999)
      const numerator = xtzIn_.times(tokenPool_).times(new BigNumber(998001));
      const denominator = xtzPool_
        .times(new BigNumber(1000000))
        .plus(xtzIn_.times(new BigNumber(998001)));
      return numerator.dividedBy(denominator);
    } else {
      return null;
    }
  };
export function estimateTokensFromXtz(xtzAmountInMutez, walletInfo: WalletInfo): number {
	const minTokensBought = xtzToTokenTokenOutput({
	    xtzIn: xtzAmountInMutez,
	    xtzPool,
	    tokenPool
	}) ;

	if (minTokensBought){ 
		return	minTokensBought.toNumber()} else { return 0; }
}
export async function xtzToToken(walletInfo: WalletInfo, lbContractAddress: string, xtzAmountInMutez: BigNumber){

	try {
		if (walletInfo.toolkit) {
			const lbContract = await walletInfo.toolkit.wallet.at(
				lbContractAddress
			);

			const deadline = new Date(Date.now() + 60000).toISOString();
			const minTokensBought = estimateTokensFromXtz(xtzAmountInMutez, walletInfo);
			const op = await lbContract.methods.xtzToToken(
			    USER_ADDRESS, minTokensBought, deadline
			).send();
			await op.confirmation();
		}

	} catch (err) {
		console.log(`failed in sendDexterBuy ${JSON.stringify(err)}}`);
	}
}
