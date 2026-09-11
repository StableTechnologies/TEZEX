import { NetworkType, TezosOperationType } from "@airgap/beacon-dapp";
import BigNumber from "bignumber.js";

import {
  Asset,
  Token,
  TokenType,
  Transaction,
  TransactionStatus,
  TransactingComponent,
} from "../types/general";
import { PoolConfig, PoolType } from "../types/pools";
import {
  assertOperationRequestMatchesSubmission,
  createOperationRequestPolicy,
  WalletIdentityError,
} from "./walletIdentity";

const OWNER = "tz1-token-pool-user";
const POOL = "KT1-token-pool";
const USDt = "KT1-usdt";
const TZBTC = "KT1-tzbtc";

const pool: PoolConfig = {
  id: "usdt-tzbtc-tezex",
  name: "TEZEX",
  type: PoolType.TEZEX_TOKEN,
  address: POOL,
  tokenA: Token.USDt,
  tokenB: Token.TzBTC,
  lpToken: Token.LP_USDtTzBTC,
};

const asset = (
  name: Token,
  address: string,
  type: TokenType,
  tokenId?: number
): Asset => ({
  name,
  label: name,
  logo: "",
  address,
  decimals: name === Token.TzBTC ? 8 : name === Token.LP_USDtTzBTC ? 7 : 6,
  type,
  tokenId,
});

const usdt = asset(Token.USDt, USDt, TokenType.FA2, 0);
const tzbtc = asset(Token.TzBTC, TZBTC, TokenType.FA12);
const lp = asset(Token.LP_USDtTzBTC, "KT1-lp", TokenType.FA12);
const balance = (value: string) =>
  ({ mantissa: new BigNumber(value) } as never);
const submission = {
  owner: OWNER,
  accountIdentifier: "account",
  recipient: POOL,
  networkType: NetworkType.MAINNET,
  chainId: "NetX",
  rpcUrl: "https://rpc.example",
  connectionRevision: 1,
};

const transaction = (
  component: TransactingComponent,
  fields: Partial<Transaction>
): Transaction =>
  ({
    id: "token-pool-transaction",
    network: NetworkType.MAINNET,
    component,
    poolId: pool.id,
    sendAsset: [usdt],
    sendAmount: [balance("1000000")],
    sendAssetBalance: [balance("10000000")],
    receiveAsset: [tzbtc],
    receiveAmount: [balance("1200")],
    receiveAssetBalance: [balance("0")],
    slippage: 0.5,
    transactionStatus: TransactionStatus.PENDING,
    submissionContext: submission,
    lastModified: new Date(),
    locked: false,
    ...fields,
  } as Transaction);

describe("token-pair wallet operation policy", () => {
  it("matches the FA2 operator lifecycle and exact swap direction", () => {
    const policy = createOperationRequestPolicy(
      transaction(TransactingComponent.SWAP, {}),
      pool
    );

    expect(policy.operations.map((operation) => operation.entrypoint)).toEqual([
      "update_operators",
      "swap",
      "update_operators",
    ]);
    expect(policy.operations[1]).toMatchObject({
      parameterValues: ["1000000", "1194", OWNER],
      tokenSwapDirection: "a_to_b",
    });
  });

  it("matches both approval lifecycles for adding liquidity", () => {
    const policy = createOperationRequestPolicy(
      transaction(TransactingComponent.ADD_LIQUIDITY, {
        sendAsset: [usdt, tzbtc],
        sendAmount: [balance("10000000"), balance("12801")],
        sendAssetBalance: [balance("10000000"), balance("12801")],
        receiveAsset: [lp],
        receiveAmount: [balance("357771")],
        receiveAssetBalance: [balance("0")],
      }),
      pool
    );

    expect(policy.operations.map((operation) => operation.entrypoint)).toEqual([
      "approve",
      "update_operators",
      "approve",
      "add_liquidity",
      "update_operators",
      "approve",
    ]);
    expect(policy.operations[3]).toMatchObject({
      parameterValues: ["10000000", "12801", "355982", OWNER],
    });
  });

  it("matches bounded token-pair removal", () => {
    const policy = createOperationRequestPolicy(
      transaction(TransactingComponent.REMOVE_LIQUIDITY, {
        sendAsset: [lp],
        sendAmount: [balance("100000")],
        sendAssetBalance: [balance("100000")],
        receiveAsset: [usdt, tzbtc],
        receiveAmount: [balance("2795078"), balance("3577")],
        receiveAssetBalance: [balance("0"), balance("0")],
      }),
      pool
    );

    expect(policy.operations).toEqual([
      expect.objectContaining({
        entrypoint: "remove_liquidity",
        parameterValues: ["100000", "2781102", "3559", OWNER],
      }),
    ]);
  });

  it("rejects a wallet request that reverses the prepared swap direction", () => {
    const expected = {
      destination: POOL,
      entrypoint: "swap",
      amount: "0",
      parameterValues: ["1000000", "1194", OWNER],
      hasDeadline: true,
      tokenSwapDirection: "a_to_b" as const,
    };
    const request = {
      operationDetails: [
        {
          kind: TezosOperationType.TRANSACTION,
          destination: POOL,
          amount: "0",
          parameters: {
            entrypoint: "swap",
            value: {
              direction: { b_to_a: undefined },
              amount_in: "1000000",
              min_amount_out: "1194",
              receiver: OWNER,
              deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
            },
          },
        },
      ],
    } as never;

    expect(() =>
      assertOperationRequestMatchesSubmission(request, submission, {
        recipient: POOL,
        allowedDestinations: [POOL],
        operations: [expected],
      })
    ).toThrow(WalletIdentityError);
  });
});
