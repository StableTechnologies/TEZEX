export const STEZ_HOSTNAME = "stez.tezex.io";
export const CANONICAL_TEZEX_ORIGIN = "https://tezex.io";

export const isStezOnlyHost = (hostname: string) =>
  hostname.trim().toLowerCase() === STEZ_HOSTNAME;

export const homePathForHost = (hostname: string) =>
  isStezOnlyHost(hostname) ? "/swap" : "/";

export const canonicalPath = (pathname: string) => {
  switch (pathname) {
    case "/home/swap":
    case "/swap":
      return "/";
    case "/home/add":
      return "/liquidity";
    case "/home/remove":
      return "/liquidity/remove";
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
