import { Transaction, TransactingComponent, Amount } from "../types/general";
import { balanceBuilder } from "./util";
import { TezosToolkit } from "@taquito/taquito";
import { IPoolAdapter } from "../types/pools";

export async function estimateWithAdapter(
  transaction: Transaction,
  toolkit: TezosToolkit,
  adapter: IPoolAdapter
): Promise<Transaction> {
  const { sendAmount, sendAsset, receiveAsset, component } = transaction;

  switch (component) {
    case TransactingComponent.SWAP: {
      const estimate = await adapter.estimateSwap(
        toolkit,
        sendAsset[0].name,
        sendAmount[0].mantissa
      );

      return {
        ...transaction,
        receiveAmount: [
          balanceBuilder(estimate.outputAmount, receiveAsset[0], true),
        ] as Amount,
      };
    }

    case TransactingComponent.ADD_LIQUIDITY: {
      if (!sendAsset[1]) throw Error("second asset not supplied");

      // Step 1: Calculate required second token
      const requiredTokenB = await adapter.calculateRequiredTokenForLiquidity(
        toolkit,
        sendAsset[0].name,
        sendAmount[0].mantissa
      );

      // Step 2: Estimate LP tokens
      const liquidityEstimate = await adapter.estimateAddLiquidity(
        toolkit,
        sendAsset[0].name,
        sendAmount[0].mantissa,
        requiredTokenB
      );

      return {
        ...transaction,
        sendAmount: [
          sendAmount[0],
          balanceBuilder(requiredTokenB, sendAsset[1], true),
        ] as Amount,
        receiveAmount: [
          balanceBuilder(
            liquidityEstimate.lpTokenAmount,
            receiveAsset[0],
            true
          ),
        ] as Amount,
      };
    }

    case TransactingComponent.REMOVE_LIQUIDITY: {
      if (!receiveAsset[1]) throw Error("second receive asset not supplied");

      const estimate = await adapter.estimateRemoveLiquidity(
        toolkit,
        sendAmount[0].mantissa
      );

      return {
        ...transaction,
        receiveAmount: [
          balanceBuilder(estimate.tokenAAmount, receiveAsset[0], true),
          balanceBuilder(estimate.tokenBAmount, receiveAsset[1], true),
        ] as Amount,
      };
    }
  }
}
