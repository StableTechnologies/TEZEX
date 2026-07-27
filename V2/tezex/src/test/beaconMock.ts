export const NetworkType = {
  MAINNET: "mainnet",
  SHADOWNET: "shadownet",
  CUSTOM: "custom",
} as const;

export const TezosOperationType = {
  TRANSACTION: "transaction",
} as const;

export const BeaconEvent = {
  ACTIVE_ACCOUNT_SET: "ACTIVE_ACCOUNT_SET",
} as const;

export class DAppClient {
  async getActiveAccount() {
    return undefined;
  }

  async clearActiveAccount() {
    return undefined;
  }

  async destroy() {
    return undefined;
  }

  async requestPermissions() {
    return undefined;
  }

  async subscribeToEvent() {
    return undefined;
  }

  async requestOperation() {
    return { transactionHash: "test-operation-hash" };
  }
}
