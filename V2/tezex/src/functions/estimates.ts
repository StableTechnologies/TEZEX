import { BigNumber } from "bignumber.js";

import { lqtOutput } from "./liquidityBaking";
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
import { balanceBuilder } from "../functions/util";
import {
  estimateTokensFromXtz,
  estimateXtzFromToken,
  estimateShares,
} from "../functions/liquidityBaking";

export async function estimate(
  transaction: Transaction,
  dex: string,
  toolkit: TezosToolkit
): Promise<Transaction> {
  const { sendAmount, sendAsset, receiveAsset } = transaction;
  switch (transaction.component) {
    case TransactingComponent.SWAP:
      return await estimateTokensReceivedSwap(
        sendAsset[0],
        sendAmount[0],
        receiveAsset[0],
        dex,
        toolkit
      )
        .then((balance: Balance) => {
          return {
            ...transaction,
            receiveAmount: [balance] as Amount,
          };
        })
        .catch((e) => {
          throw e;
        });
    case TransactingComponent.ADD_LIQUIDITY:
      if (sendAsset[1]) {
        return await estimateTokensReceivedSwap(
          sendAsset[0],
          sendAmount[0],
          sendAsset[1],
          dex,
          toolkit
        )
          .then(async (secondTokenEstimate: Balance) => {
            const shares: Balance = await estimateSharesReceivedAddLiqudity(
              sendAsset,
              receiveAsset,
              [sendAmount[0], secondTokenEstimate],
              dex,
              toolkit
            );
            return [secondTokenEstimate, shares] as [Balance, Balance];
          })
          .then((balances: [Balance, Balance]) => {
            return {
              ...transaction,
              sendAmount: [transaction.sendAmount[0], balances[0]] as Amount,
              receiveAmount: [balances[1]] as Amount,
            };
          })
          .catch((e) => {
            throw e;
          });
      } else throw Error("second asset not supplied for Add Liquidity");
    case TransactingComponent.REMOVE_LIQUIDITY:
      return await estimateSharesToTokensRemoveLiquidity(
        sendAsset,
        receiveAsset,
        sendAmount,
        dex,
        toolkit
      )
        .then((balances: [Balance, Balance]) => {
          return {
            ...transaction,
            receiveAmount: [balances[0], balances[1]] as Amount,
          };
        })
        .catch((e) => {
          throw e;
        });
  }
}

export const estimateTokensReceivedSwap = async (
  sendToken: Asset,
  sendAmount: Balance,
  receive: Asset,
  dex: string,
  toolkit: TezosToolkit
): Promise<Balance> => {
  switch (sendToken.name) {
    case Token.XTZ:
      return await estimateTokensFromXtz(sendAmount.mantissa, dex, toolkit)
        .then((amt: number) => {
          return balanceBuilder(amt, receive, true);
        })
        .catch((e) => {
          throw e;
        });
    case Token.TzBTC:
      return await estimateXtzFromToken(sendAmount.mantissa, dex, toolkit)
        .then((amt: number) => {
          return balanceBuilder(amt, receive, true);
        })
        .catch((e) => {
          throw e;
        });
    default:
      throw Error("unimplemented swap estimate");
  }
};

export const estimateSharesToTokensRemoveLiquidity = async (
  sendAsset: AssetOrAssetPair,
  receive: AssetOrAssetPair,
  sendAmount: Amount,
  dex: string,
  toolkit: TezosToolkit
): Promise<[Balance, Balance]> => {
  if (receive[0] && receive[1]) {
    switch ([receive[0].name as string, receive[1].name as string].join(" ")) {
      case [Token.XTZ as string, Token.TzBTC as string].join(" "):
        return await lqtOutput(sendAmount[0].mantissa, dex, toolkit)
          .then((obj: { xtz: BigNumber; tzbtc: BigNumber }) => {
            if (receive[1]) {
              return [
                balanceBuilder(obj.xtz, receive[0], true) as Balance,
                balanceBuilder(obj.tzbtc, receive[1], true) as Balance,
              ] as [Balance, Balance];
            } else throw Error("");
          })
          .catch((e) => {
            throw e;
          });
      default:
        throw Error("unimplemented swap estimate");
    }
  } else
    throw Error(
      "Asset Pair required for Adding liquidity , recieved single asset"
    );
};
export const estimateSharesReceivedAddLiqudity = async (
  sendAsset: AssetOrAssetPair,
  receive: AssetOrAssetPair,
  sendAmount: Amount,
  dex: string,
  toolkit: TezosToolkit
): Promise<Balance> => {
  if (sendAsset[0] && sendAmount[1] && sendAsset[1]) {
    switch (
      [sendAsset[0].name as string, sendAsset[1].name as string].join(" ")
    ) {
      case [Token.XTZ as string, Token.TzBTC as string].join(" "):
        return await estimateShares(
          sendAmount[0].mantissa,
          sendAmount[1].mantissa,
          dex,
          toolkit
        )
          .then((amt: BigNumber) => {
            return balanceBuilder(amt, receive[0], true);
          })
          .catch((e) => {
            throw e;
          });
      case [Token.TzBTC as string, Token.XTZ as string].join(" "):
        return await estimateShares(
          sendAmount[1].mantissa,
          sendAmount[0].mantissa,
          dex,
          toolkit
        )
          .then((amt: BigNumber) => {
            return balanceBuilder(amt, receive[0], true);
          })
          .catch((e) => {
            throw e;
          });
      default:
        throw Error("unimplemented swap estimate");
    }
  } else
    throw Error(
      "Asset Pair required for Adding liquidity , recieved single asset"
    );
};
