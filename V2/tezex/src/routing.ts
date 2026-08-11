import {
  DEFAULT_LIQUIDITY_PATH,
  DEFAULT_REMOVE_LIQUIDITY_PATH,
  DEFAULT_SWAP_PATH,
} from "./tradeRouting";

export const STEZ_HOSTNAME = "stez.tezex.io";
export const CANONICAL_TEZEX_ORIGIN = "https://tezex.io";

export const isStezOnlyHost = (hostname: string) =>
  hostname.trim().toLowerCase() === STEZ_HOSTNAME;

export const homePathForHost = (hostname: string) => {
  void hostname;
  return DEFAULT_SWAP_PATH;
};

export const canonicalPath = (pathname: string) => {
  switch (pathname) {
    case "/":
    case "/home/swap":
    case "/swap":
      return DEFAULT_SWAP_PATH;
    case "/home/add":
    case "/liquidity":
      return DEFAULT_LIQUIDITY_PATH;
    case "/home/remove":
    case "/liquidity/remove":
      return DEFAULT_REMOVE_LIQUIDITY_PATH;
    default:
      return pathname || "/";
  }
};

export const canonicalTezexUrl = (pathname: string, search = "") =>
  `${CANONICAL_TEZEX_ORIGIN}${canonicalPath(pathname)}${search}`;

export const routeFromLegacyHash = (hash: string) => {
  const route = hash.replace(/^#/, "");

  if (!route || !route.startsWith("/")) return null;

  const queryIndex = route.indexOf("?");
  const pathname = queryIndex === -1 ? route : route.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : route.slice(queryIndex);

  return `${canonicalPath(pathname)}${search}`;
};

export const stezRouteFromHash = (hash: string) => {
  const route = hash.replace(/^#/, "");

  if (!route || route === "/" || route === "/stez") {
    return "/stez";
  }

  return route.startsWith("/") ? route : `/${route}`;
};
