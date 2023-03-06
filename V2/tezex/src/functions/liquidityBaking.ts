import { TezosToolkit, OpKind } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

export function removeSlippage(
  slippage: BigNumber | number | string | null,
  tokenMantissa: BigNumber
) {
  if (slippage) {
    return tokenMantissa
      .minus(tokenMantissa.multipliedBy(slippage).div(100))
      .integerValue(BigNumber.ROUND_DOWN);
  } else {
    return tokenMantissa;
  }
}
export function addSlippage(
  slippage: BigNumber | number | string | null,
  tokenMantissa: BigNumber
) {
  if (slippage) {
    return tokenMantissa
      .plus(tokenMantissa.multipliedBy(slippage).div(100))
      .integerValue(BigNumber.ROUND_DOWN);
  } else {
    return tokenMantissa;
  }
}
const creditSubsidy = (xtzPool: BigNumber | number): BigNumber => {
  const LIQUIDITY_BAKING_SUBSIDY = 2500000;
  if (BigNumber.isBigNumber(xtzPool)) {
    return xtzPool.plus(new BigNumber(LIQUIDITY_BAKING_SUBSIDY));
  } else {
    return new BigNumber(xtzPool).plus(new BigNumber(LIQUIDITY_BAKING_SUBSIDY));
  }
};

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
// outputs the amount of tzBTC tokens for a given amount of XTZ
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

export async function getStorage(
  tezosToolkit: TezosToolkit,
  contractAddress: string
) {
  const contract = await tezosToolkit.wallet.at(contractAddress);
  // eslint-disable-next-line
  const storage = await contract.storage<any>();
  return storage;
}

export async function getLbContractStorage(
  tezosToolkit: TezosToolkit,
  lbContractAddress: string
) {
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

export async function estimateXtzFromToken(
  tokenAmountMantissa: BigNumber,
  lbContractAddress: string,
  toolkit: TezosToolkit
): Promise<number> {
  const lbContractStorage = await getLbContractStorage(
    toolkit,
    lbContractAddress
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
}

export async function tokenToXtz(
  tokenMantissa: BigNumber,
  xtzAmountInMutez: BigNumber,
  userAddress: string,
  lbContractAddress: string,
  tzbtcContractAddress: string,
  toolkit: TezosToolkit,
  slippage: number | BigNumber | string = 0
) {
  try {
    const lbContract = await toolkit.wallet.at(lbContractAddress);
    // the deadline value is arbitrary and can be changed
    const tzBtcContract = await toolkit.wallet.at(tzbtcContractAddress);
    const approve = tzBtcContract.methods.approve(
      lbContractAddress,
      tokenMantissa
    );
    const minXtzBought = removeSlippage(slippage, xtzAmountInMutez);
    const transfer = lbContract.methods.tokenToXtz(
      userAddress,
      tokenMantissa.integerValue(BigNumber.ROUND_DOWN),
      minXtzBought,
      new Date(Date.now() + 12000000).toISOString()
    );
    const est = async () => {
      try {
        const estimate = await toolkit.estimate.batch([
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
        console.log(`failed in estimating tokenToXtz ${JSON.stringify(err)}}`);
      }
    };
    const estimate = await est();

    if (estimate) {
      const batch = toolkit.wallet.batch().with([
        {
          kind: OpKind.TRANSACTION,
          ...approve.toTransferParams({
            fee: estimate[0].suggestedFeeMutez,
            gasLimit: estimate[0].gasLimit,
            storageLimit: estimate[0].storageLimit,
          }),
        },
        {
          kind: OpKind.TRANSACTION,
          ...transfer.toTransferParams({
            fee: estimate[1].suggestedFeeMutez,
            gasLimit: estimate[1].gasLimit,
            storageLimit: estimate[1].storageLimit,
          }),
        },
      ]);

      const batchOp = await batch.send();
      await batchOp.confirmation();
    }
  } catch (err) {
    console.log(`failed in sendDexterBuy ${JSON.stringify(err)}}`);
  }
}

export async function estimateTokensFromXtz(
  xtzAmountInMutez: BigNumber,
  lbContractAddress: string,
  toolkit: TezosToolkit
): Promise<number> {
  const lbContractStorage = await getLbContractStorage(
    toolkit,
    lbContractAddress
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
}
export async function xtzToToken(
  xtzAmountInMutez: BigNumber,
  minTokensBought: BigNumber,
  userAddress: string,
  lbContractAddress: string,
  toolkit: TezosToolkit
) {
  try {
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
        });

      return await op.confirmation();
    }
  } catch (err) {
    console.log(`failed in sendDexterBuy ${JSON.stringify(err)}}`);
  }
}

// add Liquidity

export async function estimateShares(
  xtzAmountInMutez: BigNumber,
  tokenMantissa: BigNumber,
  lbContractAddress: string,
  toolkit: TezosToolkit
) {
  const dexStorage = await getLbContractStorage(toolkit, lbContractAddress);
  const sharesFromXtz = estimateSharesFromXtz(xtzAmountInMutez, dexStorage);
  const sharesFromToken = estimateSharesFromToken(tokenMantissa, dexStorage);
  const shares = BigNumber.min(sharesFromXtz, sharesFromToken);
  return shares;
  //else return new BigNumber(0);
}
export function _estimateShares(
  xtzAmountInMutez: BigNumber,
  tokenMantissa: BigNumber,
  dexStorage: any
) {
  if (xtzAmountInMutez.eq(0)) return new BigNumber(0);
  const sharesFromXtz = estimateSharesFromXtz(xtzAmountInMutez, dexStorage);
  const sharesFromToken = estimateSharesFromToken(tokenMantissa, dexStorage);
  const shares = BigNumber.min(sharesFromXtz, sharesFromToken);
  return shares;
}

export function estimateSharesFromXtz(
  xtzAmountInMutez: BigNumber,
  dexStorage: any
) {
  return xtzAmountInMutez
    .integerValue(BigNumber.ROUND_DOWN)
    .times(dexStorage.lqtTotal)
    .div(dexStorage.xtzPool)
    .integerValue(BigNumber.ROUND_DOWN);
}

export function estimateSharesFromToken(
  tokenMantissa: BigNumber,
  dexStorage: any
) {
  return tokenMantissa
    .integerValue(BigNumber.ROUND_DOWN)
    .times(dexStorage.lqtTotal)
    .div(dexStorage.tokenPool)
    .integerValue(BigNumber.ROUND_DOWN);
}

export async function buyLiquidityShares(
  xtzAmountInMutez: BigNumber,
  tokenMantissa: BigNumber,
  lqtMinted: BigNumber,
  slipage: BigNumber,
  userAddress: string,
  lbContractAddress: string,
  tzbtcContractAddress: string,
  toolkit: TezosToolkit
) {
  try {
    const deadline = new Date(Date.now() + 60000).toISOString();

    const lbContract = await toolkit.wallet.at(lbContractAddress);
    // the deadline value is arbitrary and can be changed
    const tzBtcContract = await toolkit.wallet.at(tzbtcContractAddress);

    const maxTokensSold: BigNumber = addSlippage(slipage, tokenMantissa);

    const minLqtMinted: BigNumber = lqtMinted; //

    const addLiquidity = lbContract.methods.addLiquidity(
      userAddress,
      minLqtMinted.minus(3).integerValue(BigNumber.ROUND_DOWN),
      maxTokensSold,
      deadline
    );
    const approve0 = tzBtcContract.methods.approve(lbContractAddress, 0);
    const approve1 = tzBtcContract.methods.approve(
      lbContractAddress,
      maxTokensSold
    );

    const est = async () => {
      try {
        const estimate = await toolkit.estimate.batch([
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
        return estimate;
      } catch (err) {
        console.log(`failed in estimating tokenToXtz ${JSON.stringify(err)}}`);
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
            storageLimit: estimate[1].storageLimit,
          }),

          amount: xtzAmountInMutez.toNumber(),
          mutez: true,
        },
      ]);

      const batchOp = await batch.send();
      await batchOp.confirmation();
    }
  } catch (err) {
    console.table(`Error: ${JSON.stringify(err, null, 2)}`);
  }
}

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

export async function lqtOutput(
  lqTokens: BigNumber,
  lbContractAddress: string,
  toolkit: TezosToolkit
) {
  const lbContractStorage = await getLbContractStorage(
    toolkit,
    lbContractAddress
  );
  return _calcLqtOutput(
    lqTokens,
    new BigNumber(lbContractStorage.xtzPool),
    new BigNumber(lbContractStorage.tokenPool),
    new BigNumber(lbContractStorage.lqtTotal)
  );
}

export async function removeLiquidity(
  lqTokens: BigNumber,
  userAddress: string,
  lbContractAddress: string,
  toolkit: TezosToolkit
) {
  try {
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

      await op.confirmation();
    }
  } catch (err) {
    console.log(`failed in removeLiquidity ${JSON.stringify(err)}}`);
  }
}
