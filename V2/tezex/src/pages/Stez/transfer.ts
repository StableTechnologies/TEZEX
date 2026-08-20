import {
  DAppClient,
  PartialTezosTransactionOperation,
  TezosOperationType,
} from "@airgap/beacon-sdk";
import { validateAddress, ValidationResult } from "@taquito/utils";

export const SNET_TRANSFER_FEE_RESERVE_MUTEZ = BigInt(100_000);

interface BuildSnetTransferOptions {
  recipient: string;
  amountMutez: bigint;
  balanceMutez: bigint | null;
}

export const parseXtzToMutez = (value: string) => {
  if (!value || !/^\d+(?:\.\d{0,6})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * BigInt(1_000_000) +
    BigInt((fraction + "000000").slice(0, 6))
  );
};

export const buildSnetTransfer = ({
  recipient,
  amountMutez,
  balanceMutez,
}: BuildSnetTransferOptions): PartialTezosTransactionOperation => {
  const destination = recipient.trim();

  if (validateAddress(destination) !== ValidationResult.VALID) {
    throw new Error("Enter a valid Tezos destination address");
  }
  if (amountMutez <= BigInt(0)) {
    throw new Error("Enter an amount greater than zero");
  }
  if (
    balanceMutez !== null &&
    amountMutez + SNET_TRANSFER_FEE_RESERVE_MUTEZ > balanceMutez
  ) {
    throw new Error("Leave at least 0.1 XTZ in the wallet for network fees");
  }

  return {
    kind: TezosOperationType.TRANSACTION,
    destination,
    amount: amountMutez.toString(),
  };
};

export const verifySnetChain = async (
  rpcUrl: string,
  expectedChainId: string
) => {
  const response = await fetch(
    `${rpcUrl.replace(/\/+$/, "")}/chains/main/chain_id`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error("Snet could not be verified before sending");
  }
  const payload = (await response.text()).trim();
  let chainId: unknown;
  try {
    chainId = JSON.parse(payload);
  } catch {
    chainId = payload;
  }
  if (chainId !== expectedChainId) {
    throw new Error("The connected RPC is not the expected Snet chain");
  }
};

export const submitSnetTransfer = async (
  client: DAppClient,
  options: BuildSnetTransferOptions
) => {
  const operation = buildSnetTransfer(options);
  const response = await client.requestOperation({
    operationDetails: [operation],
  });
  return response.transactionHash;
};
