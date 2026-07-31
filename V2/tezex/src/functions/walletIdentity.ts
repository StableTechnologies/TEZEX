import {
  AccountInfo,
  DAppClient,
  NetworkType,
  RequestOperationInput,
  TezosOperationType,
} from "@airgap/beacon-dapp";

import type { TransactionSubmissionContext } from "../types/general";

const IMPLICIT_ADDRESS_PREFIX = /^tz[1-4]/;
const CONTRACT_ADDRESS_PREFIX = /^KT1/;

export class WalletIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletIdentityError";
  }
}

export interface ConfiguredNetworkIdentity {
  type: NetworkType;
  chainId: string;
  primaryRpcUrl: string;
  allowedRpcUrls: string[];
}

export interface WalletSubmissionRuntime {
  address: string | null;
  accountIdentifier: string | null;
  connectionRevision: number;
  network: ConfiguredNetworkIdentity;
  rpcUrl: string;
  readChainId: () => Promise<string>;
}

export interface GuardedClientOptions {
  client: DAppClient;
  submission: TransactionSubmissionContext;
  transactionNetwork: NetworkType;
  allowedDestinations: string[];
  getRuntime: () => WalletSubmissionRuntime;
  onMismatch?: (error: WalletIdentityError) => void;
}

export function canonicalizeRpcUrl(rpcUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rpcUrl);
  } catch {
    throw new WalletIdentityError("The configured wallet RPC URL is invalid.");
  }

  parsed.hash = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.searchParams.sort();
  return parsed.toString().replace(/\/?$/, "");
}

export function createConfiguredNetworkIdentity(input: {
  type: NetworkType;
  chainId: string;
  primaryRpcUrl: string;
  fallbackRpcUrls?: string[];
}): ConfiguredNetworkIdentity {
  const primaryRpcUrl = canonicalizeRpcUrl(input.primaryRpcUrl);
  const allowedRpcUrls = Array.from(
    new Set(
      [input.primaryRpcUrl, ...(input.fallbackRpcUrls ?? [])].map(
        canonicalizeRpcUrl
      )
    )
  );

  return {
    type: input.type,
    chainId: input.chainId,
    primaryRpcUrl,
    allowedRpcUrls,
  };
}

export function networkIdentityFingerprint(
  identity: ConfiguredNetworkIdentity
): string {
  return [
    identity.type,
    identity.chainId,
    identity.primaryRpcUrl,
    ...identity.allowedRpcUrls,
  ].join("|");
}

export function accountMatchesConfiguredNetwork(
  account: AccountInfo,
  configuredNetwork: ConfiguredNetworkIdentity
): boolean {
  if (account.network.type !== configuredNetwork.type) return false;

  try {
    const accountRpcUrl = account.network.rpcUrl;
    if (configuredNetwork.type === NetworkType.CUSTOM) {
      return Boolean(
        accountRpcUrl &&
          canonicalizeRpcUrl(accountRpcUrl) === configuredNetwork.primaryRpcUrl
      );
    }

    return (
      !accountRpcUrl ||
      configuredNetwork.allowedRpcUrls.includes(
        canonicalizeRpcUrl(accountRpcUrl)
      )
    );
  } catch {
    return false;
  }
}

function assertSubmissionMatchesRuntime(
  submission: TransactionSubmissionContext,
  transactionNetwork: NetworkType,
  runtime: WalletSubmissionRuntime
): void {
  if (!runtime.address || runtime.address !== submission.owner) {
    throw new WalletIdentityError(
      "The active wallet owner changed after this transaction was prepared."
    );
  }
  if (
    !runtime.accountIdentifier ||
    runtime.accountIdentifier !== submission.accountIdentifier
  ) {
    throw new WalletIdentityError(
      "The active wallet connection changed after this transaction was prepared."
    );
  }
  if (runtime.connectionRevision !== submission.connectionRevision) {
    throw new WalletIdentityError(
      "The wallet reconnected after this transaction was prepared."
    );
  }
  if (
    transactionNetwork !== runtime.network.type ||
    submission.networkType !== runtime.network.type ||
    submission.chainId !== runtime.network.chainId ||
    canonicalizeRpcUrl(submission.rpcUrl) !== runtime.network.primaryRpcUrl
  ) {
    throw new WalletIdentityError(
      "The active network changed after this transaction was prepared."
    );
  }

  const runtimeRpcUrl = canonicalizeRpcUrl(runtime.rpcUrl);
  if (!runtime.network.allowedRpcUrls.includes(runtimeRpcUrl)) {
    throw new WalletIdentityError(
      "The active RPC is not part of the configured network."
    );
  }
}

function assertActiveAccount(
  account: AccountInfo | undefined,
  submission: TransactionSubmissionContext,
  runtime: WalletSubmissionRuntime
): asserts account is AccountInfo {
  if (!account) {
    throw new WalletIdentityError("No active Beacon account is available.");
  }
  if (
    account.address !== submission.owner ||
    account.accountIdentifier !== submission.accountIdentifier
  ) {
    throw new WalletIdentityError(
      "Beacon's active signing account does not match the transaction owner."
    );
  }
  if (!accountMatchesConfiguredNetwork(account, runtime.network)) {
    throw new WalletIdentityError(
      "Beacon's active network does not match the configured network."
    );
  }
}

function collectEmbeddedAddresses(
  value: unknown,
  addresses: Set<string>
): void {
  if (typeof value === "string") {
    if (
      IMPLICIT_ADDRESS_PREFIX.test(value) ||
      CONTRACT_ADDRESS_PREFIX.test(value)
    ) {
      addresses.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectEmbeddedAddresses(entry, addresses));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) =>
      collectEmbeddedAddresses(entry, addresses)
    );
  }
}

export function assertOperationRequestMatchesSubmission(
  request: RequestOperationInput,
  submission: TransactionSubmissionContext,
  allowedDestinations: string[]
): void {
  const allowed = new Set(allowedDestinations);
  if (!allowed.has(submission.recipient)) {
    throw new WalletIdentityError(
      "The transaction recipient is not part of the active pool configuration."
    );
  }

  let foundRecipient = false;
  let foundOwnerOrRecipient = false;

  request.operationDetails.forEach((operation) => {
    if (operation.kind !== TezosOperationType.TRANSACTION) {
      throw new WalletIdentityError(
        "TEZEX refused an unexpected non-transaction wallet operation."
      );
    }
    if (!allowed.has(operation.destination)) {
      throw new WalletIdentityError(
        "A wallet operation targets an unexpected contract recipient."
      );
    }
    if (operation.destination === submission.recipient) {
      foundRecipient = true;
    }

    const embeddedAddresses = new Set<string>();
    collectEmbeddedAddresses(operation.parameters, embeddedAddresses);
    embeddedAddresses.forEach((address) => {
      if (IMPLICIT_ADDRESS_PREFIX.test(address)) {
        if (address !== submission.owner) {
          throw new WalletIdentityError(
            "A transaction recipient or approval owner does not match the active account."
          );
        }
        foundOwnerOrRecipient = true;
      } else if (!allowed.has(address)) {
        throw new WalletIdentityError(
          "A transaction parameter contains an unexpected contract address."
        );
      }
    });
  });

  if (!foundRecipient) {
    throw new WalletIdentityError(
      "The operation batch does not target the expected pool recipient."
    );
  }
  if (!foundOwnerOrRecipient) {
    throw new WalletIdentityError(
      "The operation batch does not identify the validated wallet owner or recipient."
    );
  }
}

function runtimeFingerprint(runtime: WalletSubmissionRuntime): string {
  return [
    runtime.address,
    runtime.accountIdentifier,
    runtime.connectionRevision,
    networkIdentityFingerprint(runtime.network),
    canonicalizeRpcUrl(runtime.rpcUrl),
  ].join("|");
}

export function createGuardedDAppClient({
  client,
  submission,
  transactionNetwork,
  allowedDestinations,
  getRuntime,
  onMismatch,
}: GuardedClientOptions): DAppClient {
  const guardedClient = Object.create(client) as DAppClient;

  guardedClient.requestOperation = async (request) => {
    try {
      const runtimeBefore = getRuntime();
      assertSubmissionMatchesRuntime(
        submission,
        transactionNetwork,
        runtimeBefore
      );

      const accountBefore = await client.getActiveAccount();
      assertActiveAccount(accountBefore, submission, runtimeBefore);

      const chainId = await runtimeBefore.readChainId();
      if (chainId !== runtimeBefore.network.chainId) {
        throw new WalletIdentityError(
          "The configured RPC returned an unexpected chain ID."
        );
      }

      const accountImmediatelyBeforeRequest = await client.getActiveAccount();
      const runtimeImmediatelyBeforeRequest = getRuntime();
      if (
        runtimeFingerprint(runtimeImmediatelyBeforeRequest) !==
        runtimeFingerprint(runtimeBefore)
      ) {
        throw new WalletIdentityError(
          "The wallet account or network changed during transaction preparation."
        );
      }
      assertSubmissionMatchesRuntime(
        submission,
        transactionNetwork,
        runtimeImmediatelyBeforeRequest
      );
      assertActiveAccount(
        accountImmediatelyBeforeRequest,
        submission,
        runtimeImmediatelyBeforeRequest
      );
      assertOperationRequestMatchesSubmission(
        request,
        submission,
        allowedDestinations
      );

      return await client.requestOperation(request);
    } catch (error) {
      if (error instanceof WalletIdentityError) onMismatch?.(error);
      throw error;
    }
  };

  return guardedClient;
}
