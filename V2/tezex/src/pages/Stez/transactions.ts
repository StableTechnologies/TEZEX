import {
  DAppClient,
  PartialTezosTransactionOperation,
  TezosOperationType,
} from "@airgap/beacon-sdk";

export type StezTransactionAction = "Stake" | "Redeem" | "Finalize";

interface BuildStezOperationOptions {
  action: StezTransactionAction;
  amountUnits: bigint;
  contractHash: string;
  redeemer: string;
}

export const buildStezOperation = ({
  action,
  amountUnits,
  contractHash,
  redeemer,
}: BuildStezOperationOptions): PartialTezosTransactionOperation => {
  if (!contractHash.startsWith("KT1")) {
    throw new Error("The native sTEZ contract could not be verified");
  }

  if (action !== "Finalize" && amountUnits <= BigInt(0)) {
    throw new Error("Enter an amount greater than zero");
  }

  if (action === "Stake") {
    return {
      kind: TezosOperationType.TRANSACTION,
      destination: contractHash,
      amount: amountUnits.toString(),
      parameters: { entrypoint: "deposit", value: { prim: "Unit" } },
    };
  }

  if (action === "Redeem") {
    return {
      kind: TezosOperationType.TRANSACTION,
      destination: contractHash,
      amount: "0",
      parameters: {
        entrypoint: "redeem",
        value: { int: amountUnits.toString() },
      },
    };
  }

  if (!/^tz[1-4][1-9A-HJ-NP-Za-km-z]{33}$/.test(redeemer)) {
    throw new Error("A valid implicit Tezos account is required to finalize");
  }

  return {
    kind: TezosOperationType.TRANSACTION,
    destination: contractHash,
    amount: "0",
    parameters: {
      entrypoint: "finalize_redeem",
      value: { string: redeemer },
    },
  };
};

export const submitStezOperation = async (
  client: DAppClient,
  options: BuildStezOperationOptions
) => {
  const operation = buildStezOperation(options);
  const response = await client.requestOperation({
    operationDetails: [operation],
  });
  return response.transactionHash;
};

export const readableStezError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "The operation was not submitted. Review the request in your wallet and try again.";
};
