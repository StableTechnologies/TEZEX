import { TezosOperationType } from "@airgap/beacon-sdk";

import { buildStezOperation } from "./transactions";

const contractHash = "KT1WCsbJx996ebZfutAitHYsZ8FUZFsTdaD7";
const redeemer = "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb";

test("encodes an exact-mutez sTEZ deposit", () => {
  expect(
    buildStezOperation({
      action: "Stake",
      amountUnits: BigInt(1_500_000),
      contractHash,
      redeemer,
    })
  ).toEqual({
    kind: TezosOperationType.TRANSACTION,
    destination: contractHash,
    amount: "1500000",
    parameters: { entrypoint: "deposit", value: { prim: "Unit" } },
  });
});

test("encodes sTEZ redemption in token units", () => {
  expect(
    buildStezOperation({
      action: "Redeem",
      amountUnits: BigInt(900_001),
      contractHash,
      redeemer,
    })
  ).toEqual({
    kind: TezosOperationType.TRANSACTION,
    destination: contractHash,
    amount: "0",
    parameters: { entrypoint: "redeem", value: { int: "900001" } },
  });
});

test("encodes finalization for the connected implicit account", () => {
  expect(
    buildStezOperation({
      action: "Finalize",
      amountUnits: BigInt(0),
      contractHash,
      redeemer,
    })
  ).toEqual({
    kind: TezosOperationType.TRANSACTION,
    destination: contractHash,
    amount: "0",
    parameters: {
      entrypoint: "finalize_redeem",
      value: { string: redeemer },
    },
  });
});

test("rejects non-positive stake and redeem requests", () => {
  expect(() =>
    buildStezOperation({
      action: "Stake",
      amountUnits: BigInt(0),
      contractHash,
      redeemer,
    })
  ).toThrow("Enter an amount greater than zero");
});
