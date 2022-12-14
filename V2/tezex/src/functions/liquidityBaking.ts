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

const _calcTokenToXtz = (p: {
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
			.plus(
				new BigNumber(tokenIn).times(
					new BigNumber(999000)
				)
			);
		return numerator.dividedBy(denominator);
	} else {
		return null;
	}
};
// outputs the amount of tzBTC tokens for a given amount of XTZ
const _calcXtzToToken = (p: {
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

export async function tokenToXtz(
	tokenMantissa: BigNumber,
	xtzAmountInMutez: BigNumber,
	lbContractAddress: string,
	tzbtcContractAddress: string,
	walletInfo: WalletInfo
) {
	try {
		if (walletInfo.toolkit) {
			const toolkit = walletInfo.toolkit;
			const deadline = new Date(
				Date.now() + 60000
			).toISOString();

			const lbContract = await toolkit.wallet.at(
				lbContractAddress
			);
			// the deadline value is arbitrary and can be changed
			const tzBtcContract = await toolkit.wallet.at(
				tzbtcContractAddress
			);
			let approve = tzBtcContract.methods.approve(
				lbContractAddress,
				tokenMantissa
			);
			let minXtzBought = await estimateXtzFromToken(
				tokenMantissa,
				lbContractAddress,
				walletInfo
			);
			console.log(
				"\n",
				"tokenMantissa.toString() : ",
				tokenMantissa.toString(),
				"\n"
			);
			console.log(
				"\n",
				"tokenMantissa.toString() : ",
				xtzAmountInMutez.toString(),
				"\n"
			);
			let transfer = lbContract.methods.tokenToXtz(
				walletInfo.address,
				tokenMantissa.integerValue(
					BigNumber.ROUND_DOWN
				),
				minXtzBought,
				new Date(Date.now() + 12000000).toISOString()
			);
			let est = async () => {
				try {
					let estimate =
						await toolkit.estimate.batch([
							{
								kind: OpKind.TRANSACTION,
								...approve.toTransferParams(
									{}
								),
							},
							{
								kind: OpKind.TRANSACTION,
								...transfer.toTransferParams(
									{}
								),
							},
						]);
					console.log(
						"\n",
						"estimate1 : ",
						estimate,
						"\n"
					);
					return estimate;
				} catch (err) {
					console.log(
						`failed in estimating tokenToXtz ${JSON.stringify(
							err
						)}}`
					);
				}
			};
			let estimate = await est();

			/*
						const estimate2 = await walletInfo.toolkit.wallet
							.at(lbContractAddress)
							.then((contract) => {
								return contract.methods
									.tokenToXtz(
										walletInfo.address,
										1170,
										toolkit.format("tz","mutez", xtzAmountInMutez) as any, 
										deadline
									)
									.toTransferParams({});
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
			*/
			if (estimate) {
				let batch = toolkit.wallet.batch().with([
					{
						kind: OpKind.TRANSACTION,
						...approve.toTransferParams({
							fee: estimate[0]
								.suggestedFeeMutez,
							gasLimit: estimate[0]
								.gasLimit,
							storageLimit:
								estimate[0]
									.storageLimit,
						}),
					},
					{
						kind: OpKind.TRANSACTION,
						...transfer.toTransferParams({
							fee: estimate[1]
								.suggestedFeeMutez,
							gasLimit: estimate[1]
								.gasLimit,
							storageLimit:
								estimate[1]
									.storageLimit,
						}),
					},
				]);

				let batchOp = await batch.send();
				await batchOp.confirmation();
			}

			/*
let batch =toolkit.wallet.batch()              
    .withContractCall(tzBtcContract.methods.approve(lbContractAddress, 0))
    .withContractCall(
	tzBtcContract.methods.approve(lbContractAddress, tokenMantissa)
    )
    .withContractCall(
	lbContract.methods.tokenToXtz(
	    walletInfo.address,
	    tokenMantissa,
	    xtzAmountInMutez,
	    deadline
	)
    );
*/

			/*
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
			*/
		}
	} catch (err) {
		console.log(`failed in sendDexterBuy ${JSON.stringify(err)}}`);
	}
}

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

// add Liquidity

export function estimateShares(
	xtzAmountInMutez: BigNumber,
	tokenMantissa: BigNumber,
	dexStorage: any
) {
	const shares = BigNumber.max(
		BigNumber.min(
			estimateSharesFromXtz(xtzAmountInMutez, dexStorage),
			estimateSharesFromToken(tokenMantissa, dexStorage)
		),
		1
	);
	return shares;
}

export function estimateSharesFromXtz(
	xtzAmountInMutez: BigNumber,
	dexStorage: any
) {
	return xtzAmountInMutez
		.integerValue(BigNumber.ROUND_DOWN)
		.times(dexStorage.totalSupply)
		.div(dexStorage.tezPool)
		.integerValue(BigNumber.ROUND_DOWN);
}

export function estimateSharesFromToken(
	tokenMantissa: BigNumber,
	dexStorage: any
) {
	return tokenMantissa
		.integerValue(BigNumber.ROUND_DOWN)
		.times(dexStorage.totalSupply)
		.div(dexStorage.tezPool)
		.integerValue(BigNumber.ROUND_DOWN);
}

export async function buyLiquidityShares(
	tokenMantissa: BigNumber,
	xtzAmountInMutez: BigNumber,
	slipage: BigNumber,
	lbContractAddress: string,
	tzbtcContractAddress: string,
	walletInfo: WalletInfo
) {
	try {
		if (walletInfo.toolkit) {
			const toolkit = walletInfo.toolkit;
			const deadline = new Date(
				Date.now() + 60000
			).toISOString();

			const lbContract = await toolkit.wallet.at(
				lbContractAddress
			);
			// the deadline value is arbitrary and can be changed
			const tzBtcContract = await toolkit.wallet.at(
				tzbtcContractAddress
			);

			const maxTokensSold = tokenMantissa.plus(
				tokenMantissa.multipliedBy(slipage).div(100)
			);

			const lbContractStorage = await getLbContractStorage(
				walletInfo.toolkit,
				lbContractAddress
			);

			const minLqtMinted = estimateShares(
				xtzAmountInMutez,
				tokenMantissa,
				lbContractStorage
			);

			let approve = tzBtcContract.methods.approve(
				lbContractAddress,
				tokenMantissa
			);
			let minXtzBought = await estimateXtzFromToken(
				tokenMantissa,
				lbContractAddress,
				walletInfo
			);
			console.log(
				"\n",
				"tokenMantissa.toString() : ",
				tokenMantissa.toString(),
				"\n"
			);
			console.log(
				"\n",
				"tokenMantissa.toString() : ",
				xtzAmountInMutez.toString(),
				"\n"
			);
			let transfer = lbContract.methods.tokenToXtz(
				walletInfo.address,
				tokenMantissa.integerValue(
					BigNumber.ROUND_DOWN
				),
				minXtzBought,
				new Date(Date.now() + 12000000).toISOString()
			);

			const addLiquidity = lbContract.methods.addLiquidity(
				walletInfo.address,
				minLqtMinted.minus(3),
				maxTokensSold,
				deadline
			);
			const approve0 = tzBtcContract.methods.approve(
				lbContractAddress,
				0
			);
			const approve1 = tzBtcContract.methods.approve(
				lbContractAddress,
				maxTokensSold
			);

			let est = async () => {
				try {
					let estimate =
						await toolkit.estimate.batch([
							{
								kind: OpKind.TRANSACTION,
								...approve0.toTransferParams(),
							},
							{
								kind: OpKind.TRANSACTION,
								...approve1.toTransferParams(),
							},
							{
								kind: OpKind.TRANSACTION,
								...addLiquidity.toTransferParams(),
								amount: xtzAmountInMutez.toNumber(),
								mutez: true,
							},
						]);
					console.log(
						"\n",
						"estimate1 : ",
						estimate,
						"\n"
					);
					return estimate;
				} catch (err) {
					console.log(
						`failed in estimating tokenToXtz ${JSON.stringify(
							err
						)}}`
					);
				}
			};
			let estimate = await est();

			console.log("\n", "estimate : ", estimate, "\n");

			/*
			const batchOp = await Tezos.wallet
			.batch([
			    {
			        kind: OpKind.TRANSACTION,
			        ...approve0.toTransferParams()
			    },
			    {
			        kind: OpKind.TRANSACTION,
			        ...approve1.toTransferParams()
			    },
			    {
			        kind: OpKind.TRANSACTION,
			        ...addLiquidity.toTransferParams(),
			        amount: xtzAmountInMutez,
			        mutez: true
			    },
			])
			.send();
			
			await batchOp.confirmation();
			*/
		}
	} catch (err) {}
}
