import { NetworkInfo } from "../../contexts/network";

export const TEZTNETS_DIRECTORY_URL = "https://teztnets.com/teztnets.json";

const WEEKLYNET_CACHE_KEY = "tezex:weeklynet";

interface TeztnetDirectoryEntry {
  activated_on?: string;
  faucet_url?: string;
  human_name?: string;
  rpc_url?: string;
}

type TeztnetDirectory = Record<string, TeztnetDirectoryEntry>;

interface CachedWeeklynet {
  key: string;
  rpcUrl: string;
  faucetUrl: string;
  chainId: string;
  activatedOn: string;
  resolvedAt: number;
}

export interface WeeklynetNetwork {
  key: string;
  name: "Weeklynet";
  rpcUrl: string;
  faucetUrl: string;
  chainId: string;
  activatedOn: string;
  info: NetworkInfo;
}

const normalizeEndpoint = (endpoint: string) => endpoint.replace(/\/+$/, "");

const readJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
};

const mostRecentWeeklynet = (directory: TeztnetDirectory) => {
  const candidates = Object.entries(directory)
    .filter(([, entry]) => entry.human_name === "Weeklynet")
    .filter(([, entry]) => Boolean(entry.rpc_url && entry.faucet_url))
    .sort(([, a], [, b]) =>
      String(b.activated_on ?? "").localeCompare(String(a.activated_on ?? ""))
    );

  if (!candidates.length) {
    throw new Error("The Teztnets directory does not list an active Weeklynet");
  }

  return candidates[0];
};

const toWeeklynet = (cached: CachedWeeklynet): WeeklynetNetwork => ({
  key: cached.key,
  name: "Weeklynet",
  rpcUrl: cached.rpcUrl,
  faucetUrl: cached.faucetUrl,
  chainId: cached.chainId,
  activatedOn: cached.activatedOn,
  info: {
    tezosServer: cached.rpcUrl,
    rpcFallbacks: [],
    chainId: cached.chainId,
    pools: [],
    assets: [],
  },
});

const readCachedWeeklynet = (): CachedWeeklynet | null => {
  try {
    const value = window.localStorage.getItem(WEEKLYNET_CACHE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as CachedWeeklynet;
    return parsed.rpcUrl && parsed.faucetUrl && parsed.chainId ? parsed : null;
  } catch {
    return null;
  }
};

const writeCachedWeeklynet = (network: CachedWeeklynet) => {
  try {
    window.localStorage.setItem(WEEKLYNET_CACHE_KEY, JSON.stringify(network));
  } catch {
    // Weeklynet discovery still works when storage is blocked.
  }
};

export const resolveCurrentWeeklynet = async (
  signal?: AbortSignal
): Promise<WeeklynetNetwork> => {
  try {
    const directory = await readJson<TeztnetDirectory>(
      TEZTNETS_DIRECTORY_URL,
      signal
    );
    const [key, entry] = mostRecentWeeklynet(directory);
    const rpcUrl = normalizeEndpoint(entry.rpc_url as string);
    const chainId = await readJson<string>(
      `${rpcUrl}/chains/main/chain_id`,
      signal
    );
    const resolved: CachedWeeklynet = {
      key,
      rpcUrl,
      faucetUrl: normalizeEndpoint(entry.faucet_url as string),
      chainId,
      activatedOn: entry.activated_on ?? key.replace("weeklynet-", ""),
      resolvedAt: Date.now(),
    };
    writeCachedWeeklynet(resolved);
    return toWeeklynet(resolved);
  } catch (error) {
    if (signal?.aborted) throw error;
    const cached = readCachedWeeklynet();
    if (cached) return toWeeklynet(cached);
    throw error;
  }
};

export const isWeeklynetAccount = (
  account: { network?: { type?: string; rpcUrl?: string } } | null | undefined,
  network: WeeklynetNetwork
) =>
  account?.network?.type === "custom" &&
  normalizeEndpoint(account.network.rpcUrl ?? "") ===
    normalizeEndpoint(network.rpcUrl);
