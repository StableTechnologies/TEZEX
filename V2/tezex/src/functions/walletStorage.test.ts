import { StorageKey } from "@ecadlabs/beacon-dapp";

jest.mock("@ecadlabs/beacon-dapp", () =>
  jest.requireActual("@ecadlabs/beacon-types")
);

const revisionKey = "tezex:wallet-storage-revision";
let requests: Array<{
  onsuccess?: () => void;
  onblocked?: () => void;
  onerror?: () => void;
  error?: Error;
}>;

const load = (): typeof import("./walletStorage") => {
  jest.resetModules();
  return require("./walletStorage");
};

beforeEach(() => {
  localStorage.clear();
  requests = [];
  let pending = Promise.resolve();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: jest.fn((_name: string, work: () => Promise<void>) => {
        const next = pending.then(work);
        pending = next.catch(() => undefined);
        return next;
      }),
    },
  });
  Object.defineProperty(window, "indexedDB", {
    configurable: true,
    value: {
      deleteDatabase: jest.fn(() => {
        const request = {};
        requests.push(request);
        return request;
      }),
    },
  });
});

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

test("finishes both databases before clearing SDK state and preserves application preferences", async () => {
  Object.values(StorageKey).forEach((key) => localStorage.setItem(key, "old"));
  localStorage.setItem("wc@2:core:0.3:custom-session", "old");
  localStorage.setItem("color-mode", "dark");
  const work = load().prepareWalletStorage();
  await flush();
  expect(localStorage.getItem(StorageKey.ACTIVE_ACCOUNT)).toBe("old");
  expect(localStorage.getItem(revisionKey)).toBeNull();
  requests[0].onsuccess?.();
  await flush();
  expect(localStorage.getItem(revisionKey)).toBeNull();
  requests[1].onsuccess?.();
  await work;
  expect(window.indexedDB.deleteDatabase).toHaveBeenNthCalledWith(1, "beacon");
  expect(window.indexedDB.deleteDatabase).toHaveBeenNthCalledWith(
    2,
    "WALLET_CONNECT_V2_INDEXED_DB"
  );
  Object.values(StorageKey).forEach((key) =>
    expect(localStorage.getItem(key)).toBeNull()
  );
  expect(localStorage.getItem("wc@2:core:0.3:custom-session")).toBeNull();
  expect(localStorage.getItem("color-mode")).toBe("dark");
  expect(localStorage.getItem(revisionKey)).toBe("2");
});

test("a blocked database fails closed and allows a later retry", async () => {
  const runtime = load();
  const first = runtime.prepareWalletStorage();
  const failure = expect(first).rejects.toThrow("Close other TEZEX tabs");
  await flush();
  requests[0].onblocked?.();
  await failure;
  expect(localStorage.getItem(revisionKey)).toBeNull();
  const retry = runtime.prepareWalletStorage();
  await flush();
  requests[1].onsuccess?.();
  await flush();
  requests[2].onsuccess?.();
  await retry;
  expect(localStorage.getItem(revisionKey)).toBe("2");
});

test("a storage error cannot mark the transition complete", async () => {
  const work = load().prepareWalletStorage();
  const failure = expect(work).rejects.toThrow("storage unavailable");
  await flush();
  requests[0].error = new Error("storage unavailable");
  requests[0].onerror?.();
  await failure;
  expect(localStorage.getItem(revisionKey)).toBeNull();
});

test("a second tab waits, then preserves the first tab's new connection", async () => {
  const tabA = load();
  const tabB = load();
  const a = tabA.prepareWalletStorage();
  const b = tabB.prepareWalletStorage();
  await flush();
  expect(requests).toHaveLength(1);
  requests[0].onsuccess?.();
  await flush();
  requests[1].onsuccess?.();
  await a;
  localStorage.setItem(StorageKey.ACTIVE_ACCOUNT, "new-account");
  await b;
  expect(requests).toHaveLength(2);
  expect(localStorage.getItem(StorageKey.ACTIVE_ACCOUNT)).toBe("new-account");
});

test("reload preserves a migrated session without reopening databases", async () => {
  localStorage.setItem(revisionKey, "2");
  localStorage.setItem(StorageKey.ACTIVE_ACCOUNT, "new-account");
  await load().prepareWalletStorage();
  expect(requests).toHaveLength(0);
  expect(localStorage.getItem(StorageKey.ACTIVE_ACCOUNT)).toBe("new-account");
});

test("concurrent calls in the same page share preparation", async () => {
  const runtime = load();
  const a = runtime.prepareWalletStorage();
  expect(runtime.prepareWalletStorage()).toBe(a);
  await flush();
  requests[0].onsuccess?.();
  await flush();
  requests[1].onsuccess?.();
  await a;
});

test("an unsupported browser does not erase state or proceed", async () => {
  Object.defineProperty(navigator, "locks", { value: undefined });
  localStorage.setItem(StorageKey.ACTIVE_ACCOUNT, "old-account");
  await expect(load().prepareWalletStorage()).rejects.toThrow(
    "updated browser"
  );
  expect(localStorage.getItem(StorageKey.ACTIVE_ACCOUNT)).toBe("old-account");
  expect(localStorage.getItem(revisionKey)).toBeNull();
});
