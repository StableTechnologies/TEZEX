import { TezosToolkit, OpKind, ParamsWithKind } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";
import {
  Errors,
  LiquidityBakingStorageXTZ,
  SuccessRecord,
} from "../types/general";

/**
 * Reduces the amount of tokens by a given slippage percentage.
 * The function calculates the new token amount by subtracting
 * the specified slippage amount from the original token amount.
 * If the slippage is not provided (null or undefined), the original
 * token amount is returned without any changes.
 *
 * @param {BigNumber|number|string|null} slippage - The slippage percentage to be removed.
 *                                                  Can be a BigNumber, number, string, or null.
 *                                                  If null, no slippage is applied.
 * @param {BigNumber} tokenMantissa - The original amount of tokens, represented as a BigNumber.
 *
 * @returns {BigNumber} - The new token amount after subtracting the slippage.
 *                        The result is rounded down to the nearest integer.
 */
export function removeSlippage(
  slippage: BigNumber | number | string | null,
  tokenMantissa: BigNumber
): BigNumber {
  if (slippage) {
    return tokenMantissa
      .minus(tokenMantissa.multipliedBy(slippage).div(100))
      .integerValue(BigNumber.ROUND_DOWN);
  } else {
    return tokenMantissa;
  }
}

/**
 * Increases the amount of tokens by a given slippage percentage.
 * The function calculates the new token amount by adding
 * the specified slippage amount to the original token amount.
 * If the slippage is not provided (null or undefined), the original
 * token amount is returned without any changes.
 *
 * @param {BigNumber|number|string|null} slippage - The slippage percentage to be added.
 *                                                  Can be a BigNumber, number, string, or null.
 *                                                  If null, no slippage is applied.
 * @param {BigNumber} tokenMantissa - The original amount of tokens, represented as a BigNumber.
 *
 * @returns {BigNumber} - The new token amount after adding the slippage.
 *                        The result is rounded down to the nearest integer.
 */
export function addSlippage(
  slippage: BigNumber | number | string | null,
  tokenMantissa: BigNumber
): BigNumber {
  if (slippage) {
    return tokenMantissa
      .plus(tokenMantissa.multipliedBy(slippage).div(100))
      .integerValue(BigNumber.ROUND_DOWN);
  } else {
    return tokenMantissa;
  }
}

/**
 * Calculates and credits a subsidy to a given liquidity pool.
 * The function adds a predefined subsidy amount (LIQUIDITY_BAKING_SUBSIDY)
 * to the current size of the liquidity pool (xtzPool). The subsidy amount is set to 2.5 tez (2500000 microtez),
 *
 * @param {BigNumber|number} xtzPool - The current size of the liquidity pool. Can be a BigNumber or a number.
 *
 * @returns {BigNumber} - The new size of the liquidity pool after adding the subsidy.
 *                        The result is a BigNumber regardless of the input type.
 *
 * @note There is an ongoing investigation regarding the accurate subsidy amount as there
 *       is a discrepancy between official examples and Tezos documentation.
 */
const creditSubsidy = (xtzPool: BigNumber | number): BigNumber => {
  const LIQUIDITY_BAKING_SUBSIDY = 2500000;
  if (BigNumber.isBigNumber(xtzPool)) {
    return xtzPool.plus(new BigNumber(LIQUIDITY_BAKING_SUBSIDY));
  } else {
    return new BigNumber(xtzPool).plus(new BigNumber(LIQUIDITY_BAKING_SUBSIDY));
  }
};

/**
 * Calculates the equivalent amount of XTZ (Tezos) for a given token amount using specific pool sizes.
 * The function uses the token amount to be swapped (`tokenIn`), the current XTZ pool size (`xtzPool`),
 * and the current token pool size (`tokenPool`) to calculate the equivalent XTZ amount.
 * It incorporates the liquidity baking subsidy in the calculation by adjusting the XTZ pool size.
 * Additionally, it accounts for a 0.1% fee and a 0.1% burn rate in the swap calculation.
 *
 * @param {Object} p - An object containing the parameters for the calculation.
 * @param {BigNumber|number} p.tokenIn - The amount of tokens to be swapped.
 * @param {BigNumber|number} p.xtzPool - The current size of the XTZ pool, before subsidy adjustment.
 * @param {BigNumber|number} p.tokenPool - The current size of the token pool.
 *
 * @returns {BigNumber|null} - The calculated equivalent XTZ amount as a BigNumber, or null if any input is invalid
 *                             or the calculation is not feasible (e.g., zero or negative values).
 *
 * @example
 * // Calculate the XTZ equivalent for 100 tokens, with current pool sizes:
 * _calcTokenToXtz({ tokenIn: 100, xtzPool: 5000, tokenPool: 10000 });
 */
const _calcTokenToXtz = (p: {
  tokenIn: BigNumber | number;
  xtzPool: BigNumber | number;
  tokenPool: BigNumber | number;
}): BigNumber | null => {
  const { tokenIn, xtzPool: _xtzPool, tokenPool } = p;
  const xtzPool = creditSubsidy(_xtzPool);
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
    const numerator = new BigNumber(tokenIn)
      .times(new BigNumber(xtzPool))
      .times(new BigNumber(998001));
    const denominator = new BigNumber(tokenPool)
      .times(new BigNumber(1000000))
      .plus(new BigNumber(tokenIn).times(new BigNumber(999000)));
    return numerator.dividedBy(denominator);
  } else {
    return null;
  }
};

/**
 * Calculates the equivalent amount of tzBTC tokens for a given amount of XTZ.
 * The function uses the amount of XTZ to be swapped (`xtzIn`), the current XTZ pool size (`xtzPool`),
 * and the current token pool size (`tokenPool`) to calculate the equivalent tzBTC token amount.
 * It incorporates the liquidity baking subsidy in the calculation by adjusting the XTZ pool size.
 * The calculation also accounts for a 0.1% fee and a 0.1% burn rate.
 *
 * @param {Object} p - An object containing the parameters for the calculation.
 * @param {BigNumber|number} p.xtzIn - The amount of XTZ to be swapped.
 * @param {BigNumber|number} p.xtzPool - The current size of the XTZ pool, before subsidy adjustment.
 * @param {BigNumber|number} p.tokenPool - The current size of the token pool.
 *
 * @returns {BigNumber|null} - The calculated equivalent tzBTC token amount as a BigNumber, or null if any input is invalid
 *                             or the calculation is not feasible (e.g., zero or negative values).
 *
 * @example
 * // Calculate the tzBTC tokens equivalent for 50 XTZ, with current pool sizes:
 * _calcXtzToToken({ xtzIn: 50, xtzPool: 5000, tokenPool: 10000 });
 */
const _calcXtzToToken = (p: {
  xtzIn: BigNumber | number;
  xtzPool: BigNumber | number;
  tokenPool: BigNumber | number;
}): BigNumber | null => {
  const { xtzIn, xtzPool: _xtzPool, tokenPool } = p;

  const xtzPool = creditSubsidy(_xtzPool);
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

/**
 * Asynchronously retrieves the storage of a specified smart contract on the Tezos blockchain.
 * This function takes a TezosToolkit instance and a contract address, uses the toolkit to access
 * the contract at the given address, and then retrieves the storage of that contract.
 * The function is asynchronous and returns a promise that resolves to the storage of the contract.
 *
 * @param {TezosToolkit} tezosToolkit - An instance of the TezosToolkit, used to interact with the Tezos blockchain.
 * @param {string} contractAddress - The address of the smart contract on the Tezos blockchain from which
 *                                   the storage is to be retrieved.
 *
 * @returns {Promise<any>} - A promise that resolves to the storage of the specified contract.
 *                           The type of the storage is not specified and hence returned as `any`.
 *
 * @example
 * // Retrieve storage from a contract using TezosToolkit instance and a contract address:
 * const storage = await getStorage(tezosToolkitInstance, 'KT1...');
 */
export async function getStorage(
  tezosToolkit: TezosToolkit,
  contractAddress: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const contract = await tezosToolkit.wallet.at(contractAddress);
  // eslint-disable-next-line
  const storage = await contract.storage<any>();
  return storage;
}
/**
 * Asynchronously retrieves the storage state of a specified Liquidity Baking (LB) contract
 * from the Tezos blockchain. This function utilizes the TezosToolkit instance to access the contract
 * at the given address and fetches its storage. It then extracts and returns the XTZ pool,
 * token pool, and total liquidity tokens (lqtTotal) from the storage, each converted to BigNumber format.
 * In case the storage is not accessible or the contract does not exist, it returns default values of zero for each property.
 *
 * @param {TezosToolkit} tezosToolkit - An instance of TezosToolkit, used to interact with the Tezos blockchain.
 * @param {string} lbContractAddress - The address of the Liquidity Baking contract on the Tezos blockchain.
 *
 * @returns {Promise<LiquidityBakingStorageXTZ>} - A promise that resolves to an object representing the
 *                                                 storage state of the LB contract. This object contains
 *                                                 `xtzPool`, `tokenPool`, and `lqtTotal` as properties,
 *                                                 all formatted as BigNumber instances.
 *
 * @example
 * // Fetch and display the storage of a Liquidity Baking contract:
 * getLbContractStorage(tezosToolkit, 'KT1...').then(storage => console.log(storage));
 */
export async function getLbContractStorage(
  tezosToolkit: TezosToolkit,
  lbContractAddress: string
): Promise<LiquidityBakingStorageXTZ> {
  const contract = await tezosToolkit.wallet.at(lbContractAddress);
  // eslint-disable-next-line
  const storage = await contract.storage<any>();

  if (storage) {
    const xtzPool = new BigNumber(storage.xtzPool);
    const tokenPool = new BigNumber(storage.tokenPool);
    const lqtTotal = new BigNumber(storage.lqtTotal);
    return { xtzPool, tokenPool, lqtTotal };
  } else {
    const xtzPool = new BigNumber(0);
    const tokenPool = new BigNumber(0);
    const lqtTotal = new BigNumber(0);
    return { xtzPool, tokenPool, lqtTotal };
  }
}

/**
 * Estimates the amount of XTZ that can be obtained from a given amount of tokens
 * using the current state of a liquidity baking contract. The function utilizes the
 * `_calcTokenToXtz` helper function to perform the conversion calculation based on the
 * liquidity pool sizes contained within the liquidity baking contract's storage.
 * The result is rounded to the nearest integer.
 *
 * @param {BigNumber} tokenAmountMantissa - The amount of tokens for which the XTZ equivalent is to be estimated.
 * @param {LiquidityBakingStorageXTZ} lbContractStorage - An object representing the current state of the liquidity
 *                                                        baking contract's storage, including the XTZ and token pools.
 *
 * @returns {number} - The estimated amount of XTZ that can be obtained, rounded to the nearest integer.
 *                     Returns 0 if the calculation is not feasible or if `minTokensBought` is null.
 *
 * @example
 * // Estimate the amount of XTZ for a given token amount using contract storage data:
 * const xtzAmount = estimateXtzFromToken(new BigNumber(100), lbContractStorage);
 */
export function estimateXtzFromToken(
  tokenAmountMantissa: BigNumber,
  lbContractStorage: LiquidityBakingStorageXTZ
): number {
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
}

/**
 * Performs a token-to-XTZ swap operation on the Tezos blockchain using a liquidity baking contract.
 * The function first approves the transfer of tokens from the user's address to the liquidity baking contract.
 * It then calculates the minimum amount of XTZ to be bought, accounting for the specified slippage.
 * A transaction is set up to execute the swap, and a batch of operations (including approvals and the swap itself)
 * is sent to the blockchain. The function is asynchronous and returns a promise that resolves to an object containing the
 * operation hash of the successful transaction batch.
 *
 * @param {BigNumber} tokenMantissa - The amount of tokens to swap, represented as a BigNumber.
 * @param {BigNumber} xtzAmountInMutez - The amount of XTZ expected from the swap, in Mutez, before slippage is accounted for.
 * @param {string} userAddress - The address of the user initiating the swap.
 * @param {string} lbContractAddress - The address of the liquidity baking contract on the Tezos blockchain.
 * @param {string} tzbtcContractAddress - The address of the tzBTC contract on the Tezos blockchain.
 * @param {TezosToolkit} toolkit - An instance of TezosToolkit, used to interact with the Tezos blockchain.
 * @param {number|BigNumber|string} [slippage=0] - The slippage percentage tolerated in the swap, defaulting to 0.
 *
 * @returns {Promise<SuccessRecord>} - A promise that resolves to a success record containing the operation hash
 *                                     (`opHash`) of the transaction batch. The promise rejects if the gas estimation
 *                                     fails or the transaction fails to send or confirm.
 *
 * @throws {Errors.TRANSACTION_FAILED} - Thrown if the transaction batch fails to send or confirm.
 * @throws {Errors.GAS_ESTIMATION} - Thrown if the gas estimation for the batch fails.
 *
 * @example
 * // Swap tokens for XTZ using the liquidity baking contract:
 * tokenToXtz(new BigNumber(100), new BigNumber(50000), 'tz1...', 'KT1...', 'KT1...', tezosToolkit, 0.5)
 *   .then(record => console.log(record.opHash))
 *   .catch(error => console.error(error));
 */
export async function tokenToXtz(
  tokenMantissa: BigNumber,
  xtzAmountInMutez: BigNumber,
  userAddress: string,
  lbContractAddress: string,
  tzbtcContractAddress: string,
  toolkit: TezosToolkit,
  slippage: number | BigNumber | string = 0
): Promise<SuccessRecord> {
  const lbContract = await toolkit.wallet.at(lbContractAddress);
  // the deadline value is arbitrary and can be changed
  const tzBtcContract = await toolkit.wallet.at(tzbtcContractAddress);
  const approve0 = tzBtcContract.methods.approve(lbContractAddress, 0);
  const approve = tzBtcContract.methods.approve(
    lbContractAddress,
    tokenMantissa.integerValue(BigNumber.ROUND_DOWN)
  );
  const minXtzBought = removeSlippage(slippage, xtzAmountInMutez);
  const transfer = lbContract.methods.tokenToXtz(
    userAddress,
    tokenMantissa.integerValue(BigNumber.ROUND_DOWN),
    minXtzBought,
    new Date(Date.now() + 60000).toISOString()
  );
  const est = async () => {
    try {
      const estimate = await toolkit.estimate.batch([
        {
          kind: OpKind.TRANSACTION,
          ...approve0.toTransferParams({}),
        },
        {
          kind: OpKind.TRANSACTION,
          ...approve.toTransferParams({}),
        },
        {
          kind: OpKind.TRANSACTION,
          ...transfer.toTransferParams({}),
        },
      ]);

      return estimate;
    } catch (err) {
      console.log(`failed in estimating gas tokenToXtz ${JSON.stringify(err)}`);
    }
  };
  const estimate = await est();

  if (estimate) {
    const batch = toolkit.wallet.batch().with([
      {
        kind: OpKind.TRANSACTION,
        ...approve0.toTransferParams({
          fee: estimate[0].suggestedFeeMutez,
          gasLimit: estimate[0].gasLimit,
          storageLimit: estimate[0].storageLimit,
        }),
      },
      {
        kind: OpKind.TRANSACTION,
        ...approve.toTransferParams({
          fee: estimate[1].suggestedFeeMutez,
          gasLimit: estimate[1].gasLimit,
          storageLimit: estimate[1].storageLimit,
        }),
      },
      {
        kind: OpKind.TRANSACTION,
        ...transfer.toTransferParams({
          fee: estimate[2].suggestedFeeMutez,
          gasLimit: estimate[2].gasLimit,
          storageLimit: estimate[2].storageLimit,
        }),
      },
    ]);

    const batchOp = await batch.send().catch((err) => {
      console.log(`failed in tokenToXtz ${JSON.stringify(err)}`);
      throw Errors.TRANSACTION_FAILED;
    });

    return {
      opHash: await batchOp
        .confirmation()
        .then(() => {
          return batchOp.opHash;
        })
        .catch(() => {
          throw Errors.TRANSACTION_FAILED;
        }),
    };
  } else throw Errors.GAS_ESTIMATION;
}

/**
 * Estimates the amount of tokens that can be obtained from a given amount of XTZ (Tezos)
 * using the current state of a liquidity baking contract. This function uses the `_calcXtzToToken`
 * helper function to perform the conversion calculation based on the liquidity pool sizes contained
 * within the liquidity baking contract's storage. The estimated amount of tokens is then rounded
 * to the nearest integer and returned.
 *
 * @param {BigNumber} xtzAmountInMutez - The amount of XTZ, in Mutez, for which the token equivalent is to be estimated.
 * @param {LiquidityBakingStorageXTZ} lbContractStorage - An object representing the current state of the liquidity
 *                                                        baking contract's storage, including the XTZ and token pools.
 *
 * @returns {number} - The estimated amount of tokens that can be obtained, rounded to the nearest integer.
 *                     Returns 0 if the calculation is not feasible or if `minTokensBought` is null.
 *
 * @example
 * // Estimate the amount of tokens for a given XTZ amount using contract storage data:
 * const tokenAmount = estimateTokensFromXtz(new BigNumber(50000), lbContractStorage);
 */
export function estimateTokensFromXtz(
  xtzAmountInMutez: BigNumber,
  lbContractStorage: LiquidityBakingStorageXTZ
): number {
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
}

/**
 * Executes a transaction to swap XTZ for tokens using a liquidity baking contract on the Tezos blockchain.
 * This asynchronous function first estimates the transaction costs and then sends a transaction to swap
 * a specified amount of XTZ for tokens. The function ensures that at least a minimum number of tokens
 * (`minTokensBought`) are bought, considers a deadline for the transaction, and utilizes the provided
 * TezosToolkit for blockchain interactions. If successful, the function returns a record with the operation hash.
 *
 * @param {BigNumber} xtzAmountInMutez - The amount of XTZ, in Mutez, to be swapped for tokens.
 * @param {BigNumber} minTokensBought - The minimum amount of tokens that must be bought in the swap.
 * @param {string} userAddress - The address of the user initiating the swap.
 * @param {string} lbContractAddress - The address of the liquidity baking contract on the Tezos blockchain.
 * @param {TezosToolkit} toolkit - An instance of TezosToolkit, used to interact with the Tezos blockchain.
 *
 * @returns {Promise<SuccessRecord>} - A promise that resolves to a success record containing the operation hash
 *                                     (`opHash`) of the transaction. The promise rejects if the gas estimation
 *                                     fails or the transaction fails to send or confirm.
 *
 * @throws {Errors.TRANSACTION_FAILED} - Thrown if the transaction fails to send or confirm.
 * @throws {Errors.GAS_ESTIMATION} - Thrown if the gas estimation for the transaction fails.
 *
 * @example
 * // Swap XTZ for tokens using the liquidity baking contract:
 * xtzToToken(new BigNumber(50000), new BigNumber(100), 'tz1...', 'KT1...', tezosToolkit)
 *   .then(record => console.log(record.opHash))
 *   .catch(error => console.error(error));
 */
export async function xtzToToken(
  xtzAmountInMutez: BigNumber,
  minTokensBought: BigNumber,
  userAddress: string,
  lbContractAddress: string,
  toolkit: TezosToolkit
): Promise<SuccessRecord> {
  const deadline = new Date(Date.now() + 60000).toISOString();

  const estimate = await toolkit.wallet
    .at(lbContractAddress)
    .then((contract) => {
      return contract.methods
        .xtzToToken(userAddress, minTokensBought, deadline)
        .toTransferParams({
          amount: xtzAmountInMutez.toNumber(),
          mutez: true,
        });
    })
    .then((op) => {
      return toolkit.estimate.transfer(op);
    })
    .then((est) => {
      return est;
    })
    .catch((error) =>
      console.table(`Error: ${JSON.stringify(error, null, 2)}`)
    );

  if (estimate) {
    const lbContract = await toolkit.wallet.at(lbContractAddress);
    const op = await lbContract.methods
      .xtzToToken(userAddress, minTokensBought, deadline)
      .send({
        amount: xtzAmountInMutez.toNumber(),
        mutez: true,
        fee: estimate.suggestedFeeMutez,
        gasLimit: estimate.gasLimit,
        storageLimit: estimate.storageLimit,
      })
      .catch((err) => {
        console.log(`failed in xtzToToken ${JSON.stringify(err)}`);
        throw Errors.TRANSACTION_FAILED;
      });

    return {
      opHash: await op
        .confirmation()
        .then(() => {
          return op.opHash;
        })
        .catch(() => {
          throw Errors.TRANSACTION_FAILED;
        }),
    };
  } else throw Errors.GAS_ESTIMATION;
}

/**
 * Estimates the number of liquidity shares that can be obtained by providing liquidity
 * in the form of XTZ and tokens to a decentralized exchange (DEX). This function calculates
 * the number of shares based on the amounts of XTZ and tokens provided, as well as the current
 * state of the DEX's liquidity pool. It uses helper functions `estimateSharesFromXtz` and
 * `estimateSharesFromToken` to calculate the shares from each asset separately, then returns
 * the lesser of the two values, as the actual number of shares obtained is limited by the
 * 'scarcer' asset in the liquidity provision.
 *
 * @param {BigNumber} xtzAmountInMutez - The amount of XTZ, in Mutez, intended to be provided as liquidity.
 * @param {BigNumber} tokenMantissa - The amount of tokens intended to be provided as liquidity.
 * @param {LiquidityBakingStorageXTZ} dexStorage - An object representing the current state of the DEX's liquidity pool.
 *
 * @returns {BigNumber} - The estimated number of liquidity shares that can be obtained, represented as a BigNumber.
 *
 * @example
 * // Estimate the liquidity shares for given amounts of XTZ and tokens:
 * const shares = estimateShares(new BigNumber(50000), new BigNumber(100), dexStorage);
 */
export function estimateShares(
  xtzAmountInMutez: BigNumber,
  tokenMantissa: BigNumber,
  dexStorage: LiquidityBakingStorageXTZ
): BigNumber {
  const sharesFromXtz = estimateSharesFromXtz(xtzAmountInMutez, dexStorage);
  const sharesFromToken = estimateSharesFromToken(tokenMantissa, dexStorage);
  const shares = BigNumber.min(sharesFromXtz, sharesFromToken);
  return shares;
}

/**
 * Estimates the number of liquidity shares a user can obtain by contributing a specified amount of XTZ to a DEX (Decentralized Exchange) liquidity pool.
 * The function calculates the shares based on the current total liquidity tokens (lqtTotal) in the pool and the current XTZ pool size.
 * It ensures that the calculated shares are rounded down to the nearest integer for precision.
 *
 * @param {BigNumber} xtzAmountInMutez - The amount of XTZ, in Mutez, that the user intends to contribute to the liquidity pool.
 * @param {LiquidityBakingStorageXTZ} dexStorage - An object representing the current state of the DEX's liquidity pool,
 *                                                 including the total liquidity tokens and the XTZ pool size.
 *
 * @returns {BigNumber} - The estimated number of liquidity shares that can be obtained, represented as a BigNumber.
 *                        The result is rounded down to the nearest integer value.
 *
 * @example
 * // Estimate the liquidity shares for a given amount of XTZ:
 * const shares = estimateSharesFromXtz(new BigNumber(50000), dexStorage);
 */
export function estimateSharesFromXtz(
  xtzAmountInMutez: BigNumber,
  dexStorage: LiquidityBakingStorageXTZ
): BigNumber {
  return xtzAmountInMutez
    .integerValue(BigNumber.ROUND_DOWN)
    .times(dexStorage.lqtTotal)
    .div(dexStorage.xtzPool)
    .integerValue(BigNumber.ROUND_DOWN);
}

/**
 * Estimates the number of liquidity shares a user can obtain by contributing a specified amount of tokens to a DEX (Decentralized Exchange) liquidity pool.
 * This calculation is based on the current total liquidity tokens (lqtTotal) in the pool and the current size of the token pool.
 * The function ensures that the estimated number of shares is rounded down to the nearest integer for precision.
 *
 * @param {BigNumber} tokenMantissa - The amount of tokens that the user intends to contribute to the liquidity pool.
 * @param {LiquidityBakingStorageXTZ} dexStorage - An object representing the current state of the DEX's liquidity pool,
 *                                                 including the total liquidity tokens and the token pool size.
 *
 * @returns {BigNumber} - The estimated number of liquidity shares that can be obtained, represented as a BigNumber.
 *                        The result is rounded down to the nearest integer value.
 *
 * @example
 * // Estimate the liquidity shares for a given amount of tokens:
 * const shares = estimateSharesFromToken(new BigNumber(100), dexStorage);
 */
export function estimateSharesFromToken(
  tokenMantissa: BigNumber,
  dexStorage: LiquidityBakingStorageXTZ
): BigNumber {
  return tokenMantissa
    .integerValue(BigNumber.ROUND_DOWN)
    .times(dexStorage.lqtTotal)
    .div(dexStorage.tokenPool)
    .integerValue(BigNumber.ROUND_DOWN);
}

/**
 * Executes a transaction to buy liquidity shares in a liquidity baking contract on the Tezos blockchain.
 * This asynchronous function facilitates the purchase of liquidity shares by sending XTZ and tokens to the liquidity pool.
 * It accounts for slippage in the token contribution and ensures that the minimum amount of liquidity tokens (`lqtMinted`) is minted.
 * The function first estimates the gas cost for the transaction and then executes a batch of operations,
 * including token approvals and the liquidity addition. If successful, it returns a record containing the operation hash.
 *
 * @param {BigNumber} xtzAmountInMutez - The amount of XTZ, in Mutez, to be contributed to the liquidity pool.
 * @param {BigNumber} tokenMantissa - The amount of tokens to be contributed to the liquidity pool.
 * @param {BigNumber} lqtMinted - The minimum amount of liquidity tokens to be minted from the transaction.
 * @param {BigNumber} slippage - The slippage percentage to account for in the token contribution.
 * @param {string} userAddress - The address of the user initiating the liquidity addition.
 * @param {string} lbContractAddress - The address of the liquidity baking contract on the Tezos blockchain.
 * @param {string} tzbtcContractAddress - The address of the tzBTC contract on the Tezos blockchain.
 * @param {TezosToolkit} toolkit - An instance of TezosToolkit, used to interact with the Tezos blockchain.
 *
 * @returns {Promise<SuccessRecord>} - A promise that resolves to a success record containing the operation hash
 *                                     (`opHash`) of the transaction. The promise rejects if the gas estimation
 *                                     fails or the transaction fails to send or confirm.
 *
 * @throws {Errors.TRANSACTION_FAILED} - Thrown if the transaction fails to send or confirm.
 * @throws {Errors.GAS_ESTIMATION} - Thrown if the gas estimation for the transaction fails.
 *
 * @example
 * // Buy liquidity shares using XTZ and tokens:
 * buyLiquidityShares(new BigNumber(50000), new BigNumber(100), new BigNumber(50), new BigNumber(0.5),
 * 'tz1...', 'KT1...', 'KT1...', tezosToolkit)
 *   .then(record => console.log(record.opHash))
 *   .catch(error => console.error(error));
 */
export async function buyLiquidityShares(
  xtzAmountInMutez: BigNumber,
  tokenMantissa: BigNumber,
  lqtMinted: BigNumber,
  slipage: BigNumber,
  userAddress: string,
  lbContractAddress: string,
  tzbtcContractAddress: string,
  toolkit: TezosToolkit
): Promise<SuccessRecord> {
  const deadline = new Date(Date.now() + 60000).toISOString();

  const lbContract = await toolkit.wallet.at(lbContractAddress);
  const tzBtcContract = await toolkit.wallet.at(tzbtcContractAddress);

  const maxTokensSold: BigNumber = addSlippage(slipage, tokenMantissa);
  const minLqtMinted: BigNumber = lqtMinted;

  const addLiquidity = lbContract.methods.addLiquidity(
    userAddress,
    minLqtMinted.integerValue(BigNumber.ROUND_DOWN).toNumber(),
    maxTokensSold.toNumber(),
    deadline
  );
  const approve0 = tzBtcContract.methods.approve(lbContractAddress, 0);
  const approve1 = tzBtcContract.methods.approve(
    lbContractAddress,
    maxTokensSold
  );

  const est = async () => {
    try {
      const ops: ParamsWithKind[] = [
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
        {
          kind: OpKind.TRANSACTION,
          ...approve0.toTransferParams(),
        },
      ];
      const estimate = await toolkit.estimate.batch(ops);
      return estimate;
    } catch (err) {
      console.log(
        `failed in estimating gas for buyLiquidityShares ${JSON.stringify(err)}`
      );
    }
  };
  const estimate = await est();

  if (estimate) {
    const batch = toolkit.wallet.batch().with([
      {
        kind: OpKind.TRANSACTION,
        ...approve0.toTransferParams({
          fee: estimate[0].suggestedFeeMutez,
          gasLimit: estimate[0].gasLimit,
          storageLimit: estimate[0].storageLimit,
        }),
      },
      {
        kind: OpKind.TRANSACTION,
        ...approve1.toTransferParams({
          fee: estimate[1].suggestedFeeMutez,
          gasLimit: estimate[1].gasLimit,
          storageLimit: estimate[1].storageLimit,
        }),
      },
      {
        kind: OpKind.TRANSACTION,
        ...addLiquidity.toTransferParams({
          fee: estimate[2].suggestedFeeMutez,
          gasLimit: estimate[2].gasLimit,
          storageLimit: estimate[2].storageLimit,
        }),

        amount: xtzAmountInMutez.toNumber(),
        mutez: true,
      },
      {
        kind: OpKind.TRANSACTION,
        ...approve0.toTransferParams({
          fee: estimate[3].suggestedFeeMutez,
          gasLimit: estimate[3].gasLimit,
          storageLimit: estimate[3].storageLimit,
        }),
      },
    ]);

    const batchOp = await batch.send().catch((err) => {
      console.log(`failed in xtzToToken ${JSON.stringify(err)}`);
      throw Errors.TRANSACTION_FAILED;
    });
    return {
      opHash: await batchOp
        .confirmation()
        .then(() => {
          return batchOp.opHash;
        })
        .catch(() => {
          throw Errors.TRANSACTION_FAILED;
        }),
    };
  } else throw Errors.GAS_ESTIMATION;
}

/**
 * Calculates the expected output in XTZ and tzBTC tokens when a specified amount of liquidity tokens is removed from the liquidity pool.
 * This function uses the current pool sizes (XTZ and tzBTC) and the total liquidity tokens to proportionally determine the amount of each token.
 *
 * @param {BigNumber} lqTokens - The amount of liquidity tokens being removed.
 * @param {BigNumber|number} xtzPool - The current size of the XTZ pool.
 * @param {BigNumber|number} tzbtcPool - The current size of the tzBTC token pool.
 * @param {BigNumber|number} lqtTotal - The total amount of liquidity tokens in the pool.
 *
 * @returns {{ xtz: BigNumber; tzbtc: BigNumber }} - An object containing the calculated amount of XTZ and tzBTC tokens.
 *
 * @example
 * // Calculate the output for a given amount of liquidity tokens:
 * const output = _calcLqtOutput(new BigNumber(100), 50000, 10000, 1000);
 * console.log(output.xtz, output.tzbtc);
 */
export function _calcLqtOutput(
  lqTokens: BigNumber,
  xtzPool: BigNumber | number,
  tzbtcPool: BigNumber | number,
  lqtTotal: BigNumber | number
): { xtz: BigNumber; tzbtc: BigNumber } {
  const xtzOut = lqTokens.multipliedBy(xtzPool).dividedBy(lqtTotal);
  const tzbtcOut = lqTokens.multipliedBy(tzbtcPool).dividedBy(lqtTotal);
  return {
    xtz: xtzOut,
    tzbtc: tzbtcOut,
  };
}

/**
 * Calculates the expected output in XTZ and tzBTC tokens for a given amount of liquidity tokens using the current state of a liquidity baking contract.
 * This function acts as a wrapper for `_calcLqtOutput`, converting the pool sizes and total liquidity tokens from the contract storage into BigNumber format.
 *
 * @param {BigNumber} lqTokens - The amount of liquidity tokens for which the output is to be calculated.
 * @param {LiquidityBakingStorageXTZ} lbContractStorage - An object representing the current state of the liquidity baking contract's storage.
 *
 * @returns {{ xtz: BigNumber; tzbtc: BigNumber }} - An object containing the calculated amount of XTZ and tzBTC tokens.
 *
 * @example
 * // Calculate the output for a given amount of liquidity tokens using contract storage:
 * const output = lqtOutput(new BigNumber(100), lbContractStorage);
 * console.log(output.xtz, output.tzbtc);
 */
export function lqtOutput(
  lqTokens: BigNumber,
  lbContractStorage: LiquidityBakingStorageXTZ
): { xtz: BigNumber; tzbtc: BigNumber } {
  return _calcLqtOutput(
    lqTokens,
    new BigNumber(lbContractStorage.xtzPool),
    new BigNumber(lbContractStorage.tokenPool),
    new BigNumber(lbContractStorage.lqtTotal)
  );
}

/**
 * Executes a transaction to remove liquidity from a liquidity baking contract on the Tezos blockchain.
 * The function calculates the expected XTZ and tzBTC tokens to be received in exchange for the provided liquidity tokens.
 * It first fetches the current state of the liquidity baking contract's storage, then estimates the transaction cost,
 * and finally sends a transaction to remove the specified amount of liquidity. If successful, it returns a record containing the operation hash.
 *
 * @param {BigNumber} lqTokens - The amount of liquidity tokens to be removed from the liquidity pool.
 * @param {string} userAddress - The address of the user initiating the liquidity removal.
 * @param {string} lbContractAddress - The address of the liquidity baking contract on the Tezos blockchain.
 * @param {TezosToolkit} toolkit - An instance of TezosToolkit, used to interact with the Tezos blockchain.
 *
 * @returns {Promise<SuccessRecord>} - A promise that resolves to a success record containing the operation hash (`opHash`) of the transaction.
 *                                     The promise rejects if the gas estimation fails or the transaction fails to send or confirm.
 *
 * @throws {Errors.TRANSACTION_FAILED} - Thrown if the transaction fails to send or confirm.
 * @throws {Errors.GAS_ESTIMATION} - Thrown if the gas estimation for the transaction fails.
 *
 * @example
 * // Remove liquidity from the liquidity baking contract:
 * removeLiquidity(new BigNumber(100), 'tz1...', 'KT1...', tezosToolkit)
 *   .then(record => console.log(record.opHash))
 *   .catch(error => console.error(error));
 */
export async function removeLiquidity(
  lqTokens: BigNumber,
  userAddress: string,
  lbContractAddress: string,
  toolkit: TezosToolkit
): Promise<SuccessRecord> {
  const deadline = new Date(Date.now() + 60000).toISOString();

  const lbContractStorage = await getLbContractStorage(
    toolkit,
    lbContractAddress
  );
  const { xtz, tzbtc } = _calcLqtOutput(
    lqTokens,
    new BigNumber(lbContractStorage.xtzPool),
    new BigNumber(lbContractStorage.tokenPool),
    new BigNumber(lbContractStorage.lqtTotal)
  );

  const estimate = await toolkit.wallet
    .at(lbContractAddress)
    .then((contract) => {
      return contract.methods
        .removeLiquidity(
          userAddress,
          lqTokens,
          xtz.integerValue(BigNumber.ROUND_DOWN),
          tzbtc.integerValue(BigNumber.ROUND_DOWN),
          deadline
        )
        .toTransferParams();
    })
    .then((op) => {
      console.log(`Estimating the smart contract call : `);
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
      console.table(`Error: ${JSON.stringify(error, null, 2)}`)
    );

  if (estimate) {
    const lbContract = await toolkit.wallet.at(lbContractAddress);
    const op = await lbContract.methods
      .removeLiquidity(
        userAddress,
        lqTokens,
        xtz.integerValue(BigNumber.ROUND_DOWN),
        tzbtc.integerValue(BigNumber.ROUND_DOWN),
        deadline
      )
      .send({
        fee: estimate.suggestedFeeMutez,
        gasLimit: estimate.gasLimit,
        storageLimit: estimate.storageLimit,
      });

    return {
      opHash: await op
        .confirmation()
        .then(() => {
          return op.opHash;
        })
        .catch((err) => {
          console.log(`failed in xtzToToken ${JSON.stringify(err)}`);
          throw Errors.TRANSACTION_FAILED;
        }),
    };
  } else throw Errors.GAS_ESTIMATION;
}
