import { BigNumber } from "bignumber.js";

import { LiquidityBakingStorageXTZ } from "../types/general";

import {
  Transaction,
  Token,
  Asset,
  Balance,
  TransactingComponent,
  Amount,
  AssetOrAssetPair,
} from "../types/general";

import { TezosToolkit } from "@taquito/taquito";
import { balanceBuilder } from "./util";
import {
  estimateTokensFromXtz,
  estimateXtzFromToken,
  estimateShares,
  lqtOutput,
} from "./liquidityBaking";

export function estimate(
  transaction: Transaction,
  lbContractStorage: LiquidityBakingStorageXTZ
): Transaction {
  const { sendAmount, sendAsset, receiveAsset } = transaction;
  switch (transaction.component) {
    case TransactingComponent.SWAP:
      return {
        ...transaction,
        receiveAmount: [
          estimateTokensReceivedSwap(
            sendAsset[0],
            sendAmount[0],
            receiveAsset[0],
            lbContractStorage
          ),
        ] as Amount,
      };
    case TransactingComponent.ADD_LIQUIDITY:
      if (sendAsset[1]) {
        const tokenEstimate: Balance = estimateTokensReceivedSwap(
          sendAsset[0],
          sendAmount[0],
          sendAsset[1],
          lbContractStorage
        );
        const shares: Balance = estimateSharesReceivedAddLiqudity(
          sendAsset,
          receiveAsset,
          [sendAmount[0], tokenEstimate],
          lbContractStorage
        );
        return {
          ...transaction,
          sendAmount: [transaction.sendAmount[0], tokenEstimate] as Amount,
          receiveAmount: [shares] as Amount,
        };
      } else throw Error("second asset not supplied for Add Liquidity");
    case TransactingComponent.REMOVE_LIQUIDITY:
      return {
        ...transaction,
        receiveAmount: estimateSharesToTokensRemoveLiquidity(
          sendAsset,
          receiveAsset,
          sendAmount,
          lbContractStorage
        ) as Amount,
      };
  }
}

export const estimateTokensReceivedSwap = (
  sendToken: Asset,
  sendAmount: Balance,
  receive: Asset,
  lbContractStorage: LiquidityBakingStorageXTZ
): Balance => {
  switch (sendToken.name) {
    case Token.XTZ:
      return balanceBuilder(
        estimateTokensFromXtz(sendAmount.mantissa, lbContractStorage),
        receive,
        true
      );
    case Token.TzBTC:
      return balanceBuilder(
        estimateXtzFromToken(sendAmount.mantissa, lbContractStorage),
        receive,
        true
      );
    default:
      throw Error("unimplemented swap estimate");
  }
};

export const estimateSharesToTokensRemoveLiquidity = (
  sendAsset: AssetOrAssetPair,
  receive: AssetOrAssetPair,
  sendAmount: Amount,
  lbContractStorage: LiquidityBakingStorageXTZ
): [Balance, Balance] => {
  if (receive[0] && receive[1]) {
    switch ([receive[0].name as string, receive[1].name as string].join(" ")) {
      case [Token.XTZ as string, Token.TzBTC as string].join(" "):
        return [
          balanceBuilder(
            lqtOutput(sendAmount[0].mantissa, lbContractStorage).xtz,
            receive[0],
            true
          ) as Balance,
          balanceBuilder(
            lqtOutput(sendAmount[0].mantissa, lbContractStorage).tzbtc,
            receive[1],
            true
          ) as Balance,
        ] as [Balance, Balance];
      default:
        throw Error("unimplemented swap estimate");
    }
  } else
    throw Error(
      "Asset Pair required for Adding liquidity , recieved single asset"
    );
};
export const estimateSharesReceivedAddLiqudity = (
  sendAsset: AssetOrAssetPair,
  receive: AssetOrAssetPair,
  sendAmount: Amount,
  lbContractStorage: LiquidityBakingStorageXTZ
): Balance => {
  if (sendAsset[0] && sendAmount[1] && sendAsset[1]) {
    switch (
      [sendAsset[0].name as string, sendAsset[1].name as string].join(" ")
    ) {
      case [Token.XTZ as string, Token.TzBTC as string].join(" "):
        return balanceBuilder(
          estimateShares(
            sendAmount[0].mantissa,
            sendAmount[1].mantissa,
            lbContractStorage
          ),
          receive[0],
          true
        );
      case [Token.TzBTC as string, Token.XTZ as string].join(" "):
        return balanceBuilder(
          estimateShares(
            sendAmount[1].mantissa,
            sendAmount[0].mantissa,
            lbContractStorage
          ),
          receive[0],
          true
        );
      default:
        throw Error("unimplemented swap estimate");
    }
  } else
    throw Error(
      "Asset Pair required for Adding liquidity , recieved single asset"
    );
};
