import {
  ContractAbstraction,
  ContractProvider,
  TransferParams,
} from "@taquito/taquito";

import { Asset, Token, TokenType } from "../types/general";
import {
  buildApproveOp,
  toExactNat,
  transferParamsToBeaconOp,
  withExactMutezAmount,
} from "./transactions";

const makeTokenContract = () => {
  const approve = jest.fn((value) => ({
    toTransferParams: () => ({
      to: "KT1-token",
      amount: 0,
      parameter: { entrypoint: "approve", value },
    }),
  }));
  const updateOperators = jest.fn((value) => ({
    toTransferParams: () => ({
      to: "KT1-token",
      amount: 0,
      parameter: { entrypoint: "update_operators", value },
    }),
  }));

  return {
    contract: {
      methodsObject: {
        approve,
        update_operators: updateOperators,
      },
    } as unknown as ContractAbstraction<ContractProvider>,
    approve,
    updateOperators,
  };
};

const fa12Asset: Asset = {
  name: Token.USDtz,
  label: "USDtz",
  logo: "",
  address: "KT1-token",
  decimals: 18,
  type: TokenType.FA12,
};

const fa2Asset: Asset = {
  name: Token.USDt,
  label: "USDt",
  logo: "",
  address: "KT1-token",
  decimals: 6,
  type: TokenType.FA2,
  tokenId: 7,
};

describe("exact transaction encoding", () => {
  it("preserves mutez values above Number.MAX_SAFE_INTEGER", () => {
    const params = withExactMutezAmount(
      { to: "KT1-pool", amount: 0 },
      "9007199254740993"
    );

    expect(transferParamsToBeaconOp(params).amount).toBe("9007199254740993");
  });

  it("rejects unsafe JavaScript numbers before precision is lost", () => {
    expect(() => toExactNat(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      /safe integer/i
    );

    expect(() =>
      transferParamsToBeaconOp({
        to: "KT1-pool",
        amount: Number.MAX_SAFE_INTEGER + 1,
        mutez: true,
      })
    ).toThrow(/safe integer/i);
  });

  it("accepts the safe-number boundary and exact strings beyond it", () => {
    expect(toExactNat(Number.MAX_SAFE_INTEGER)).toBe("9007199254740991");
    expect(toExactNat("9007199254740993")).toBe("9007199254740993");
  });

  it("converts tez to mutez without JavaScript number arithmetic", () => {
    const params = {
      to: "KT1-pool",
      amount: "9007199254.740993" as unknown as number,
    } satisfies TransferParams;

    expect(transferParamsToBeaconOp(params).amount).toBe("9007199254740993");
  });

  it.each(["-1", "1.5", "NaN", "Infinity"])(
    "rejects an invalid contract integer: %s",
    (value) => {
      expect(() => toExactNat(value)).toThrow(/non-negative integer/i);
    }
  );

  it("rejects sub-mutez attached amounts instead of rounding", () => {
    const params = {
      to: "KT1-pool",
      amount: "0.0000001" as unknown as number,
    } satisfies TransferParams;

    expect(() => transferParamsToBeaconOp(params)).toThrow(
      /transaction amount must be a non-negative integer/i
    );
  });

  it("passes an 18-decimal FA1.2 amount as an exact string", () => {
    const { contract, approve } = makeTokenContract();

    buildApproveOp({
      tokenContract: contract,
      token: fa12Asset,
      ownerAddress: "tz1-user",
      spenderAddress: "KT1-pool",
      amount: "1000000000000000001",
    });

    expect(approve).toHaveBeenCalledWith({
      spender: "KT1-pool",
      value: "1000000000000000001",
    });
  });

  it("uses exact zero/nonzero semantics for FA2 operator changes", () => {
    const { contract, updateOperators } = makeTokenContract();

    buildApproveOp({
      tokenContract: contract,
      token: fa2Asset,
      ownerAddress: "tz1-user",
      spenderAddress: "KT1-pool",
      amount: "9007199254740993",
    });
    buildApproveOp({
      tokenContract: contract,
      token: fa2Asset,
      ownerAddress: "tz1-user",
      spenderAddress: "KT1-pool",
      amount: 0,
    });

    expect(updateOperators).toHaveBeenNthCalledWith(1, [
      {
        add_operator: {
          owner: "tz1-user",
          operator: "KT1-pool",
          token_id: 7,
        },
      },
    ]);
    expect(updateOperators).toHaveBeenNthCalledWith(2, [
      {
        remove_operator: {
          owner: "tz1-user",
          operator: "KT1-pool",
          token_id: 7,
        },
      },
    ]);
  });

  it("uses token ID zero for an FA2 asset without an explicit ID", () => {
    const { contract, updateOperators } = makeTokenContract();

    buildApproveOp({
      tokenContract: contract,
      token: { ...fa2Asset, tokenId: undefined },
      ownerAddress: "tz1-user",
      spenderAddress: "KT1-pool",
      amount: 1,
    });

    expect(updateOperators).toHaveBeenCalledWith([
      {
        add_operator: {
          owner: "tz1-user",
          operator: "KT1-pool",
          token_id: 0,
        },
      },
    ]);
  });
});
