import { TezosOperationType } from "@airgap/beacon-sdk";

import {
  buildSnetTransfer,
  parseXtzToMutez,
  SNET_TRANSFER_FEE_RESERVE_MUTEZ,
  submitSnetTransfer,
  verifySnetChain,
} from "./transfer";

const recipient = "tz1XUcXQLu95qqeCviF7rbxLUUWhkJmWyqsd";

test("parses XTZ exactly into mutez", () => {
  expect(parseXtzToMutez("10")).toBe(BigInt(10_000_000));
  expect(parseXtzToMutez("1.000001")).toBe(BigInt(1_000_001));
  expect(parseXtzToMutez("1.0000001")).toBeNull();
});

test("builds a simple Snet transfer in mutez", () => {
  expect(
    buildSnetTransfer({
      recipient,
      amountMutez: BigInt(10_000_000),
      balanceMutez: BigInt(20_000_000),
    })
  ).toEqual({
    kind: TezosOperationType.TRANSACTION,
    destination: recipient,
    amount: "10000000",
  });
});

test("rejects invalid destinations and balances without a fee reserve", () => {
  expect(() =>
    buildSnetTransfer({
      recipient: "not-a-tezos-address",
      amountMutez: BigInt(10_000_000),
      balanceMutez: BigInt(20_000_000),
    })
  ).toThrow("valid Tezos destination");

  expect(() =>
    buildSnetTransfer({
      recipient,
      amountMutez: BigInt(10_000_000),
      balanceMutez:
        BigInt(10_000_000) + SNET_TRANSFER_FEE_RESERVE_MUTEZ - BigInt(1),
    })
  ).toThrow("Leave at least 0.1 XTZ");
});

test("submits exactly one reviewed transfer operation", async () => {
  const requestOperation = jest
    .fn()
    .mockResolvedValue({ transactionHash: "operation-hash" });

  await expect(
    submitSnetTransfer({ requestOperation } as never, {
      recipient,
      amountMutez: BigInt(10_000_000),
      balanceMutez: BigInt(20_000_000),
    })
  ).resolves.toBe("operation-hash");

  expect(requestOperation).toHaveBeenCalledWith({
    operationDetails: [
      {
        kind: TezosOperationType.TRANSACTION,
        destination: recipient,
        amount: "10000000",
      },
    ],
  });
});

test("verifies the live chain id before asking the wallet to sign", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    // Octez serializes the chain ID as JSON and terminates the response with
    // a newline. Verify the exact wire shape rather than a cleaned fixture.
    text: async () => '"NetXVasgoZmPMLe"\n',
  });

  await expect(
    verifySnetChain("https://rpc.snet.teztnets.com/", "NetXVasgoZmPMLe")
  ).resolves.toBeUndefined();
  expect(global.fetch).toHaveBeenCalledWith(
    "https://rpc.snet.teztnets.com/chains/main/chain_id",
    { cache: "no-store" }
  );

  global.fetch = originalFetch;
});

test("rejects a different chain id", async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => '"NetWrongChain"\n',
  });

  await expect(
    verifySnetChain("https://rpc.snet.teztnets.com", "NetXVasgoZmPMLe")
  ).rejects.toThrow("not the expected Snet chain");

  global.fetch = originalFetch;
});
