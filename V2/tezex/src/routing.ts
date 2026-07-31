export const STEZ_HOSTNAME = "stez.tezex.io";
export const CANONICAL_TEZEX_ORIGIN = "https://tezex.io";

export const isStezOnlyHost = (hostname: string) =>
  hostname.trim().toLowerCase() === STEZ_HOSTNAME;

export const canonicalTezexUrl = (pathname: string, search = "") =>
  `${CANONICAL_TEZEX_ORIGIN}/#${pathname}${search}`;

export const stezRouteFromHash = (hash: string) => {
  const route = hash.replace(/^#/, "");

  if (!route || route === "/" || route === "/stez") {
    return "/stez";
  }

  return route.startsWith("/") ? route : `/${route}`;
};
