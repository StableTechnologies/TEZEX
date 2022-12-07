import { TezosToolkit, OpKind } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

import { WalletInfo } from "../contexts/wallet";
const creditSubsidy = (xtzPool: BigNumber | number): BigNumber => {
	const LIQUIDITY_BAKING_SUBSIDY = 2500000;
	if (BigNumber.isBigNumber(xtzPool)) {
		return xtzPool.plus(new BigNumber(LIQUIDITY_BAKING_SUBSIDY));
	} else {
		return new BigNumber(xtzPool).plus(
			new BigNumber(LIQUIDITY_BAKING_SUBSIDY)
		);
	}
};


const _calcTokenToXtz= (p: {
    tokenIn: BigNumber | number;
    xtzPool: BigNumber | number;
    tokenPool: BigNumber | number;
  }): BigNumber | null => {
    const { tokenIn, xtzPool: _xtzPool, tokenPool } = p;
    let xtzPool = creditSubsidy(_xtzPool);
    let tokenIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      tokenIn_.isGreaterThan(0) &&
      xtzPool_.isGreaterThan(0) &&
      tokenPool_.isGreaterThan(0)
    ) {
      // Includes 0.1% fee and 0.1% burn calculated separatedly: 
      // 999/1000 * 999/1000 = 998001/1000000
      let numerator = new BigNumber(tokenIn)
        .times(new BigNumber(xtzPool))
        .times(new BigNumber(998001));
      let denominator = new BigNumber(tokenPool)
        .times(new BigNumber(1000000))
        .plus(new BigNumber(tokenIn).times(new BigNumber(999000)));
      return numerator.dividedBy(denominator);
    } else {
      return null;
    }
};
// outputs the amount of tzBTC tokens for a given amount of XTZ
const _calcXtzToToken= (p: {
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
		const numerator = xtzIn_
			.times(tokenPool_)
			.times(new BigNumber(998001));
		const denominator = xtzPool_
			.times(new BigNumber(1000000))
			.plus(xtzIn_.times(new BigNumber(998001)));
		return numerator.dividedBy(denominator);
	} else {
		return null;
	}
};

export async function getStorage(
	tezosToolkit: TezosToolkit,
	contractAddress: string
) {
	const contract = await tezosToolkit.wallet.at(contractAddress);
	const storage = await contract.storage<any>();
	return storage;
}

export async function getLbContractStorage(
	tezosToolkit: TezosToolkit,
	lbContractAddress: string
) {
	const contract = await tezosToolkit.wallet.at(lbContractAddress);
	const storage = await contract.storage<any>();
	if (storage) {
		const xtzPool = new BigNumber(storage.xtzPool);
		const tokenPool = new BigNumber(storage.tokenPool);
		return { xtzPool, tokenPool };
	} else {
		const xtzPool = new BigNumber(0);
		const tokenPool = new BigNumber(0);
		return { xtzPool, tokenPool };
	}
}

export async function estimateXtzFromToken(
	tokenAmountMantissa: BigNumber,
	lbContractAddress: string,
	walletInfo: WalletInfo
): Promise<number> {
	if (walletInfo.toolkit) {

		const lbContractStorage = await getLbContractStorage(
			walletInfo.toolkit,
			lbContractAddress
		);

		console.log(
			"\n",
			"lbContractStorage : ",
			lbContractStorage,
			"\n"
		);
		console.log(
			"\n",
			"typeof lbContractStorage : ",
			typeof lbContractStorage.xtzPool,
			"\n"
		);
		const minTokensBought = _calcTokenToXtz({
			tokenIn: tokenAmountMantissa,
			xtzPool: lbContractStorage.xtzPool,
			tokenPool: lbContractStorage.tokenPool,
		});

		if (minTokensBought) {
			return minTokensBought.decimalPlaces(0, 1).toNumber();
		} else {
			return 0;
		}
	} else {
		return 0;
	}
}

/*
export async function tokenToXtz(
	xtzAmountInMutez: BigNumber,
	lbContractAddress: string,
	walletInfo: WalletInfo
) {
	try {
		if (walletInfo.toolkit) {
			const toolkit = walletInfo.toolkit;
			const deadline = new Date(
				Date.now() + 60000
			).toISOString();
			const minTokensBought = await estimateTokensFromXtz(
				xtzAmountInMutez,
				lbContractAddress,
				walletInfo
			);
			console.log(
				"\n",
				"xtzAmountInMutez.toNumber() : ",
				xtzAmountInMutez.toNumber(),
				"\n"
			);

const tokenToXtz= (p: {
    tokenIn: BigNumber | number;
    xtzPool: BigNumber | number;
    tokenPool: BigNumber | number;
  }): BigNumber | null => {
    const { tokenIn, xtzPool: _xtzPool, tokenPool } = p;
    let xtzPool = creditSubsidy(_xtzPool);
    let tokenIn_ = new BigNumber(0);
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      tokenIn_.isGreaterThan(0) &&
      xtzPool_.isGreaterThan(0) &&
      tokenPool_.isGreaterThan(0)
    ) {
      // Includes 0.1% fee and 0.1% burn calculated separatedly: 
      // 999/1000 * 999/1000 = 998001/1000000
      let numerator = new BigNumber(tokenIn)
        .times(new BigNumber(xtzPool))
        .times(new BigNumber(998001));
      let denominator = new BigNumber(tokenPool)
        .times(new BigNumber(1000000))
        .plus(new BigNumber(tokenIn).times(new BigNumber(999000)));
      return numerator.dividedBy(denominator);
    } else {
      return null;
    }
};


const lbContract = await Tezos.wallet.at(LB_CONTRACT_ADDRESS);
// the deadline value is arbitrary and can be changed
const deadline = new Date(Date.now() + 60000).toISOString();
const tzBtcContract = await Tezos.wallet.at(TZBTC_ADDRESS);
const tokensSold = AMOUNT_IN_TZBTC;
const minXtzBought = tokenToXtz({
    tokenIn: tokensSold,
    xtzPool,
    tokenPool
  }).toNumber();

let batch =.wallet.batch()              
    .withContractCall(tzBtcContract.methods.approve(lbContractAddress, 0))
    .withContractCall(
        tzBtcContract.methods.approve(lbContractAddress, tokensSold)
    )
    .withContractCall(
        lbContract.methods.tokenToXtz(
            USERADDRESS,
            tokensSold,
            minXtzBought,
            deadline
        )
    );
const batchOp = await batch.send();
await batchOp.confirmation();

			const estimate = await walletInfo.toolkit.wallet
				.at(lbContractAddress)
				.then((contract) => {
					return contract.methods
						.xtzToToken(
							walletInfo.address,
							minTokensBought,
							deadline
						)
						.toTransferParams({
							amount: xtzAmountInMutez.toNumber(),
							mutez: true,
						});
				})
				.then((op) => {
					console.log(
						`Estimating the smart contract call : `
					);
					return toolkit.estimate.transfer(op);
				})
				.then((est) => {
					console.log(`burnFeeMutez : ${est.burnFeeMutez}, 
    gasLimit : ${est.gasLimit}, 
    minimalFeeMutez : ${est.minimalFeeMutez}, 
    storageLimit : ${est.storageLimit}, 
    suggestedFeeMutez : ${est.suggestedFeeMutez}, 
    totalCost : ${est.totalCost}, 
    usingBaseFeeMutez : ${est.usingBaseFeeMutez}`);
					return est;
				})
				.catch((error) =>
					console.table(
						`Error: ${JSON.stringify(
							error,
							null,
							2
						)}`
					)
				);

			if (estimate) {
				const lbContract =
					await walletInfo.toolkit.wallet.at(
						lbContractAddress
					);
				const op = await lbContract.methods
					.xtzToToken(
						walletInfo.address,
						minTokensBought,
						deadline
					)
					.send({
						source: "tz1cGAdcXYcDaNNH8fxzFvffPzbhWofgVT37",
						amount: xtzAmountInMutez.toNumber(),
						mutez: true,
						fee: estimate.suggestedFeeMutez,
						gasLimit: estimate.gasLimit,
						storageLimit:
							estimate.storageLimit,
					});

				await op.confirmation();
			}
		}
	} catch (err) {
		console.log(`failed in sendDexterBuy ${JSON.stringify(err)}}`);
	}
}
*/

export async function estimateTokensFromXtz(
	xtzAmountInMutez: BigNumber,
	lbContractAddress: string,
	walletInfo: WalletInfo
): Promise<number> {
	if (walletInfo.toolkit) {
		const lbContractStorage = await getLbContractStorage(
			walletInfo.toolkit,
			lbContractAddress
		);

		console.log(
			"\n",
			"lbContractStorage : ",
			lbContractStorage,
			"\n"
		);
		console.log(
			"\n",
			"typeof lbContractStorage : ",
			typeof lbContractStorage.xtzPool,
			"\n"
		);
		const minTokensBought = _calcXtzToToken({
			xtzIn: xtzAmountInMutez,
			xtzPool: lbContractStorage.xtzPool,
			tokenPool: lbContractStorage.tokenPool,
		});

		if (minTokensBought) {
			return minTokensBought.decimalPlaces(0, 1).toNumber();
		} else {
			return 0;
		}
	} else {
		return 0;
	}
}
export async function xtzToToken(
	xtzAmountInMutez: BigNumber,
	lbContractAddress: string,
	walletInfo: WalletInfo
) {
	try {
		if (walletInfo.toolkit) {
			const toolkit = walletInfo.toolkit;
			const deadline = new Date(
				Date.now() + 60000
			).toISOString();
			const minTokensBought = await estimateTokensFromXtz(
				xtzAmountInMutez,
				lbContractAddress,
				walletInfo
			);
			console.log(
				"\n",
				"xtzAmountInMutez.toNumber() : ",
				xtzAmountInMutez.toNumber(),
				"\n"
			);

			const estimate = await walletInfo.toolkit.wallet
				.at(lbContractAddress)
				.then((contract) => {
					return contract.methods
						.xtzToToken(
							walletInfo.address,
							minTokensBought,
							deadline
						)
						.toTransferParams({
							amount: xtzAmountInMutez.toNumber(),
							mutez: true,
						});
				})
				.then((op) => {
					console.log(
						`Estimating the smart contract call : `
					);
					return toolkit.estimate.transfer(op);
				})
				.then((est) => {
					console.log(`burnFeeMutez : ${est.burnFeeMutez}, 
    gasLimit : ${est.gasLimit}, 
    minimalFeeMutez : ${est.minimalFeeMutez}, 
    storageLimit : ${est.storageLimit}, 
    suggestedFeeMutez : ${est.suggestedFeeMutez}, 
    totalCost : ${est.totalCost}, 
    usingBaseFeeMutez : ${est.usingBaseFeeMutez}`);
					return est;
				})
				.catch((error) =>
					console.table(
						`Error: ${JSON.stringify(
							error,
							null,
							2
						)}`
					)
				);

			if (estimate) {
				const lbContract =
					await walletInfo.toolkit.wallet.at(
						lbContractAddress
					);
				const op = await lbContract.methods
					.xtzToToken(
						walletInfo.address,
						minTokensBought,
						deadline
					)
					.send({
						source: "tz1cGAdcXYcDaNNH8fxzFvffPzbhWofgVT37",
						amount: xtzAmountInMutez.toNumber(),
						mutez: true,
						fee: estimate.suggestedFeeMutez,
						gasLimit: estimate.gasLimit,
						storageLimit:
							estimate.storageLimit,
					});

				await op.confirmation();
			}
		}
	} catch (err) {
		console.log(`failed in sendDexterBuy ${JSON.stringify(err)}}`);
	}
}
