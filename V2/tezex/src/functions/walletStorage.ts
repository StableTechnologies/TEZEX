import { StorageKey } from "@ecadlabs/beacon-dapp";

const STORAGE_REVISION_KEY = "tezex:wallet-storage-revision";
const STORAGE_REVISION = "2";
const WALLET_DATABASES = ["beacon", "WALLET_CONNECT_V2_INDEXED_DB"];

const deleteWalletDatabase = (name: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(
        new Error("Close other TEZEX tabs before refreshing your connection.")
      );
  });

let preparation: Promise<void> | undefined;

/** Complete the wallet storage transition before mounting any wallet provider. */
export function prepareWalletStorage(): Promise<void> {
  if (preparation) return preparation;

  const prepare = async () => {
    const storage = window.localStorage;
    if (storage.getItem(STORAGE_REVISION_KEY) === STORAGE_REVISION) return;

    // Serialize the transition across tabs, including the asynchronous DB work.
    // A browser without Web Locks must not race another tab's new connection.
    if (!navigator.locks) {
      throw new Error("Please open TEZEX in an updated browser to reconnect.");
    }
    await navigator.locks.request("tezex-wallet-storage", async () => {
      if (storage.getItem(STORAGE_REVISION_KEY) === STORAGE_REVISION) return;

      // These databases belong to the wallet SDK; leave application data alone.
      // Finish deletion before touching localStorage or recording completion.
      for (const name of WALLET_DATABASES) await deleteWalletDatabase(name);

      const keys = new Set<string>(Object.values(StorageKey));
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (key?.startsWith("wc@2:")) keys.add(key);
      }
      keys.forEach((key) => storage.removeItem(key));
      storage.setItem(STORAGE_REVISION_KEY, STORAGE_REVISION);
    });
  };

  preparation = prepare().catch((error) => {
    preparation = undefined;
    throw error;
  });
  return preparation;
}
